// Confidentialité : le masquage est appliqué aux données AVANT mise en page.
import { describe, expect, it } from 'vitest'
import { applyPrivacy, MASK } from '@/lib/report/privacy'
import { buildReportSnapshot } from '@/lib/report/snapshot'
import { defaultReportOptions, parseReportOptions } from '@/lib/report/options'
import { buildSeedDatabase } from '@/lib/data/demo/seed'

describe('applyPrivacy', () => {
  const db = buildSeedDatabase()
  const options = { ...defaultReportOptions, maskVin: true, maskPlate: true, maskOwner: true }
  const snapshot = buildReportSnapshot(db, 'veh-clio-demo', options)

  it('masque le VIN, l\'immatriculation et le propriétaire dans les données', () => {
    const { snapshot: safe } = applyPrivacy(snapshot, options)
    expect(safe.vehicle.vin).toBe(MASK)
    expect(safe.vehicle.immatriculation).toBe(MASK)
    expect(safe.vehicle.ownerName).toBe(MASK)
    // Les données d'origine ne sont pas modifiées (instantané reproductible)
    expect(snapshot.vehicle.vin).not.toBe(MASK)
  })

  it('exclut les factures lorsque les données personnelles sont masquées, avec motif explicite', () => {
    // Sélectionne explicitement les factures pour bien tester l'exclusion
    const invoiceIds = db.documents.filter((d) => d.kind === 'facture' && d.vehicleId === 'veh-clio-demo').map((d) => d.id)
    const opts = { ...options, includeAttachments: true, attachmentIds: invoiceIds }
    const snap = buildReportSnapshot(db, 'veh-clio-demo', opts)
    const { snapshot: safe, notices } = applyPrivacy(snap, opts)
    const invoices = safe.attachments.filter((a) => opts.attachmentIds.includes(a.document.id))
    expect(invoices.length).toBeGreaterThan(0)
    for (const inv of invoices) {
      expect(inv.included).toBe(false)
      expect(inv.reason).toContain('confidentialité')
    }
    expect(notices.some((n) => n.code === 'piece_jointe_exclue_confidentialite')).toBe(true)
  })

  it('conserve les factures lorsque le masquage des données personnelles est désactivé', () => {
    const opts = { ...defaultReportOptions, maskVin: true, maskPlate: true, maskOwner: false, includeAttachments: true }
    const snap = buildReportSnapshot(db, 'veh-clio-demo', {
      ...opts,
      attachmentIds: db.documents.filter((d) => d.kind === 'facture').map((d) => d.id).slice(0, 1),
    })
    const { snapshot: safe } = applyPrivacy(snap, opts)
    const someInvoice = safe.attachments.find((a) => a.document.kind === 'facture' && opts.attachmentIds.includes(a.document.id))
    if (someInvoice) {
      // Disponible=false en démo → inclus=false mais pour cause de fichier manquant, pas de confidentialité
      expect(someInvoice.reason).not.toContain('confidentialité')
    }
  })

  it('laisse les champs non renseignés tels quels (pas de valeur inventée)', () => {
    const opts = { ...defaultReportOptions, maskVin: true, maskPlate: true, maskOwner: true }
    const partial = { ...db, vehicles: [{ ...db.vehicles[1], vin: undefined, immatriculation: undefined }] }
    const snap = buildReportSnapshot(partial as typeof db, 'veh-3008-demo', opts)
    const { snapshot: safe } = applyPrivacy(snap, opts)
    expect(safe.vehicle.vin).toBeUndefined()
    expect(safe.vehicle.immatriculation).toBeUndefined()
  })
})

describe('parseReportOptions (Zod)', () => {
  it('accepte les options par défaut', () => {
    expect(() => parseReportOptions(defaultReportOptions)).not.toThrow()
  })

  it('refuse une période incohérente', () => {
    expect(() =>
      parseReportOptions({
        ...defaultReportOptions,
        period: { from: '2026-05-01', to: '2026-01-01' },
      }),
    ).toThrow()
  })

  it('refuse plus de 20 pièces jointes', () => {
    expect(() =>
      parseReportOptions({
        ...defaultReportOptions,
        attachmentIds: Array.from({ length: 21 }, (_, i) => `doc-${i}`),
      }),
    ).toThrow()
  })

  it('refuse un champ inconnu', () => {
    expect(() => parseReportOptions({ ...defaultReportOptions, pirate: true })).toThrow()
  })
})
