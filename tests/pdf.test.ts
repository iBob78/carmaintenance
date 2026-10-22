// Génération du PDF de vente : validité, pagination, sections, reproductibilité.
// Le masquage des données personnelles est garanti en amont (voir privacy.test.ts) :
// le document PDF ne reçoit que des données déjà anonymisées.
import { describe, expect, it } from 'vitest'
import { generateSaleReportPdf, validatePdf } from '@/lib/report/pdf/generate'
import { buildReportSnapshot } from '@/lib/report/snapshot'
import { applyPrivacy } from '@/lib/report/privacy'
import { defaultReportOptions, type ReportOptions } from '@/lib/report/options'
import { buildSeedDatabase } from '@/lib/data/demo/seed'
import type { ServiceRecord } from '@/lib/domain/types'

function snapshotFor(vehicleId: string, options: ReportOptions = defaultReportOptions) {
  const db = buildSeedDatabase()
  const snap = buildReportSnapshot(db, vehicleId, options)
  return applyPrivacy(snap, options).snapshot
}

describe('generateSaleReportPdf', () => {
  it('génère un PDF valide avec toutes les sections par défaut', async () => {
    const snapshot = snapshotFor('veh-clio-demo')
    const pdf = await generateSaleReportPdf(snapshot, defaultReportOptions)

    expect(pdf.buffer.toString('latin1').startsWith('%PDF-')).toBe(true)
    expect(pdf.byteLength).toBeGreaterThan(5000)
    // couverture + sommaire + 7 sections minimum
    expect(pdf.pageCount).toBeGreaterThanOrEqual(9)
    const validation = validatePdf(pdf.buffer)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  }, 60_000)

  it('retranche les sections désélectionnées (plus court que le rapport complet)', async () => {
    const options: ReportOptions = {
      ...defaultReportOptions,
      sections: {
        identification: true,
        historique: false,
        pannes: false,
        justificatifs: false,
        depenses: false,
        travaux_prevoir: false,
        methodologie: true,
      },
    }
    const snapshot = snapshotFor('veh-clio-demo', options)
    const pdf = await generateSaleReportPdf(snapshot, options)
    // couverture + sommaire + identification + méthodologie
    expect(pdf.pageCount).toBeGreaterThanOrEqual(4)
    expect(pdf.pageCount).toBeLessThan(9)
  }, 60_000)

  it('pagine correctement un historique volumineux', async () => {
    const db = buildSeedDatabase()
    const base = db.serviceRecords[0]
    for (let i = 0; i < 60; i++) {
      const record: ServiceRecord = {
        ...base,
        id: `srv-bulk-${i}`,
        vehicleId: 'veh-clio-demo',
        date: `2020-${String((i % 12) + 1).padStart(2, '0')}-15`,
        kilometrage: 10000 + i * 500,
        titre: `Intervention de test n°${i + 1}`,
        coutTotal: 40 + i,
      }
      db.serviceRecords.push(record)
    }
    const options = defaultReportOptions
    const snap = applyPrivacy(buildReportSnapshot(db, 'veh-clio-demo', options), options).snapshot
    const pdf = await generateSaleReportPdf(snap, options)

    expect(pdf.pageCount).toBeGreaterThan(15)
    expect(validatePdf(pdf.buffer).valid).toBe(true)
  }, 120_000)

  it('indique les pages de début de section dans le sommaire (ou reste silencieux, jamais inventé)', async () => {
    const snapshot = snapshotFor('veh-clio-demo')
    const pdf = await generateSaleReportPdf(snapshot, defaultReportOptions)
    const sections = Object.keys(defaultReportOptions.sections) as Array<keyof ReportOptions['sections']>
    for (const sec of sections) {
      const page = pdf.tocPages[sec]
      // Soit un numéro de page valide (>= 3), soit null/undefined — jamais un numéro faux
      if (page != null) {
        expect(page).toBeGreaterThanOrEqual(3)
        expect(page).toBeLessThanOrEqual(pdf.pageCount)
      }
    }
  }, 60_000)

  it('génère un PDF stable pour des options et des données identiques (hors horodatage)', async () => {
    const a = snapshotFor('veh-3008-demo')
    const b = snapshotFor('veh-3008-demo')
    a.generatedAt = '2026-10-21T10:00:00.000Z'
    b.generatedAt = '2026-10-21T10:00:00.000Z'
    const pdfA = await generateSaleReportPdf(a, defaultReportOptions)
    const pdfB = await generateSaleReportPdf(b, defaultReportOptions)
    expect(pdfA.pageCount).toBe(pdfB.pageCount)
    // Le contenu est déterministe : les deux PDF ont la même taille
    expect(pdfA.byteLength).toBe(pdfB.byteLength)
  }, 120_000)

  it('invalide un buffer qui n\'est pas un PDF', () => {
    const result = validatePdf(Buffer.from('pas un pdf'))
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
