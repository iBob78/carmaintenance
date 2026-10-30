// Instantané de rapport : périodes, comptages, plage kilométrique, totaux.
import { describe, expect, it } from 'vitest'
import { buildReportSnapshot } from '@/lib/report/snapshot'
import { defaultReportOptions } from '@/lib/report/options'
import { buildSeedDatabase } from '@/lib/data/demo/seed'

describe('buildReportSnapshot', () => {
  const db = buildSeedDatabase()

  it('reflète uniquement les données enregistrées', () => {
    const snap = buildReportSnapshot(db, 'veh-clio-demo', defaultReportOptions)
    expect(snap.vehicle.marque).toBe('Renault')
    expect(snap.counts.interventions).toBeGreaterThan(0)
    expect(snap.counts.releves).toBeGreaterThan(0)
    // Champs manquants listés, jamais inventés
    expect(Array.isArray(snap.missingFields)).toBe(true)
  })

  it('filtre l\'historique sur la période demandée', () => {
    const all = buildReportSnapshot(db, 'veh-clio-demo', defaultReportOptions)
    const filtered = buildReportSnapshot(db, 'veh-clio-demo', {
      ...defaultReportOptions,
      period: { from: '2026-01-01', to: '2026-12-31' },
    })
    expect(filtered.counts.interventions).toBeLessThan(all.counts.interventions)
    for (const entry of filtered.serviceRecords) {
      expect(entry.record.date >= '2026-01-01').toBe(true)
      expect(entry.record.date <= '2026-12-31').toBe(true)
    }
  })

  it('exclut les achats déjà comptés dans les dépenses (anti double comptage)', () => {
    const snap = buildReportSnapshot(db, 'veh-clio-demo', defaultReportOptions)
    // pur-01 et pur-02 sont liés à des dépenses → absents de la liste des achats
    const purchaseIds = snap.purchases.map((p) => p.id)
    expect(purchaseIds).not.toContain('pur-01')
    expect(purchaseIds).not.toContain('pur-02')
  })

  it('calcule une plage kilométrique cohérente avec les relevés', () => {
    const snap = buildReportSnapshot(db, 'veh-clio-demo', defaultReportOptions)
    expect(snap.kmRange.min).not.toBeNull()
    expect(snap.kmRange.max).toBeGreaterThanOrEqual(snap.kmRange.min as number)
    expect(snap.kmRange.source).toBe('releves')
  })

  it('reproduit des totaux identiques pour des options identiques', () => {
    const a = buildReportSnapshot(db, 'veh-3008-demo', defaultReportOptions)
    const b = buildReportSnapshot(db, 'veh-3008-demo', defaultReportOptions)
    expect(a.totals.net).toBe(b.totals.net)
    expect(a.counts.interventions).toBe(b.counts.interventions)
    // generatedAt diffère (horodatage) mais les données sont identiques
    expect(JSON.stringify({ ...a, generatedAt: '' })).toBe(JSON.stringify({ ...b, generatedAt: '' }))
  })

  it('marque explicitement les pièces jointes indisponibles sélectionnées', () => {
    const docIds = db.documents.filter((d) => d.vehicleId === 'veh-clio-demo').map((d) => d.id)
    const snap = buildReportSnapshot(db, 'veh-clio-demo', {
      ...defaultReportOptions,
      includeAttachments: true,
      attachmentIds: docIds,
    })
    for (const att of snap.attachments) {
      if (!att.document.disponible) {
        expect(att.included).toBe(false)
        expect(att.reason).toContain('inaccessible')
      }
    }
  })

  it('liste les travaux à prévoir (en retard / urgents / bientôt) sans en inventer', () => {
    const snap = buildReportSnapshot(db, 'veh-clio-demo', defaultReportOptions)
    for (const due of snap.dues) {
      expect(['retard', 'urgent', 'bientot']).toContain(due.urgency)
      expect(due.libelle.length).toBeGreaterThan(0)
    }
  })
})
