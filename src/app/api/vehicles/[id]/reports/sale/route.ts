// POST /api/vehicles/{vehicleId}/reports/sale
// Génération serveur du rapport de vente PDF.
// Pipeline (cahier des charges §6) :
//   1. vérification identité et droits  → authorizeReportAccess
//   2. récupération des données          → instantané fourni (mode démo) / Supabase (étape 6)
//   3. instantané cohérent               → validation Zod + recomposition
//   4. anomalies et totaux               → recalculés côté serveur (jamais crus sur parole)
//   5. confidentialité                    → applyPrivacy AVANT mise en page
//   6. génération et validation du PDF   → generateSaleReportPdf
//   7. renvoi sécurisé du fichier        → flux application/pdf, sans archivage permanent

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reportOptionsSchema } from '@/lib/report/options'
import { applyPrivacy } from '@/lib/report/privacy'
import { generateSaleReportPdf } from '@/lib/report/pdf/generate'
import type { ReportSnapshot } from '@/lib/report/snapshot'
import { detectAnomalies } from '@/lib/domain/anomalies'
import { computeExpenseTotals } from '@/lib/domain/totals'
import type { AppDatabase, Anomaly } from '@/lib/domain/types'
import { authorizeReportAccess } from '@/lib/server/authorize'

export const runtime = 'nodejs'

const bodySchema = z
  .object({
    snapshot: z.object({
      schemaVersion: z.literal(1),
      generatedAt: z.string(),
      vehicle: z.object({ id: z.string() }).passthrough(),
      expenses: z.array(z.object({}).passthrough()),
      // Le reste de l'instantané est contrôlé par le pipeline ci-dessous.
    }).passthrough(),
    options: reportOptionsSchema,
  })
  .strict()

const MAX_BODY_BYTES = 5 * 1024 * 1024

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: vehicleId } = await context.params

    // Limitation de taille
    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Charge utile trop volumineuse (maximum 5 Mo).' },
        { status: 413 },
      )
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requête JSON invalide.' }, { status: 400 })
    }

    // 3. Validation stricte des options et de la forme de l'instantané
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const snapshot = parsed.data.snapshot as unknown as ReportSnapshot
    const options = parsed.data.options

    // 1. Contrôle d'accès
    const auth = await authorizeReportAccess(vehicleId, snapshot, request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason ?? 'Accès refusé.' }, { status: 403 })
    }

    // 4. Recalcul serveur des anomalies et totaux (indépendant du client)
    const pseudoDb: AppDatabase = {
      profile: { id: auth.userId, nom: '', email: '', createdAt: '' },
      vehicles: [snapshot.vehicle as AppDatabase['vehicles'][number]],
      odometerReadings: snapshot.odometerReadings ?? [],
      maintenanceTasks: [],
      serviceRecords: (snapshot.serviceRecords ?? []).map((s) => s.record),
      serviceRecordItems: (snapshot.serviceRecords ?? []).flatMap((s) => s.items ?? []),
      faults: snapshot.faults ?? [],
      purchases: snapshot.purchases ?? [],
      documents: snapshot.documents ?? [],
      expenses: snapshot.expenses as AppDatabase['expenses'],
      reminders: [],
      reportExports: [],
    }
    const serverAnomalies: Anomaly[] = detectAnomalies(pseudoDb, vehicleId)
    snapshot.anomalies = serverAnomalies
    snapshot.totals = computeExpenseTotals(pseudoDb.expenses, {
      from: options.period.from ?? undefined,
      to: options.period.to ?? undefined,
    })

    // 5. Confidentialité — appliquée AVANT la mise en page
    const { snapshot: safeSnapshot, notices } = applyPrivacy(snapshot, options)
    safeSnapshot.privacyNotices = notices

    // 6. Génération + validation du PDF
    const pdf = await generateSaleReportPdf(safeSnapshot, options)

    // 7. Renvoi sécurisé — aucun archivage permanent du PDF sur le serveur.
    //    Seules les métadonnées minimales sont retournées (en-têtes) pour que
    //    le client les consigne dans report_exports (traçabilité de l'export).
    const filename = `rapport-vente-${snapshot.vehicle.id}-${new Date().toISOString().slice(0, 10)}.pdf`
    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Report-Pages': String(pdf.pageCount),
      'X-Report-Bytes': String(pdf.byteLength),
      'X-Report-Anomalies': String(serverAnomalies.length),
      'X-Report-Generated-At': new Date().toISOString(),
      'Cache-Control': 'no-store',
    })

    return new Response(new Uint8Array(pdf.buffer), { status: 200, headers })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne de génération.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
