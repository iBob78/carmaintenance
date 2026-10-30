// Calcul des échéances : prochains km/dates, cycles sans historique.
import { describe, expect, it } from 'vitest'
import { computeDue, duesForVehicle, avgKmPerMonth } from '@/lib/domain/due'
import { buildSeedDatabase } from '@/lib/data/demo/seed'
import type { ServiceRecord, Vehicle } from '@/lib/domain/types'

describe('computeDue', () => {
  const db = buildSeedDatabase()
  const clio = db.vehicles.find((v) => v.id === 'veh-clio-demo') as Vehicle

  it('calcule la prochaine échéance à partir du dernier enregistrement', () => {
    const due = computeDue(
      clio,
      { categorie: 'vidange', libelle: 'Vidange', intervalleKm: 15000, intervalleMois: 12, actif: true },
      db.serviceRecords,
    )
    expect(due).not.toBeNull()
    // Dernière vidange connue : srv-05 le 2026-02-10 à 84 900 km
    expect(due!.dueKm).toBe(84900 + 15000)
    expect(due!.dueDate).toBe('2027-02-10')
    expect(due!.lastRecord?.id).toBe('srv-05')
  })

  it('planifie la prochaine occurrence du cycle quand l\'entretien n\'a jamais été fait', () => {
    const due = computeDue(
      clio,
      { categorie: 'bougies', libelle: 'Bougies', intervalleKm: 60000, intervalleMois: 48, actif: true },
      db.serviceRecords.filter((r) => r.id !== 'srv-05'), // aucune intervention de type bougies
    )
    expect(due).not.toBeNull()
    // Le véhicule a 87 400 km : la prochaine occurrence du cycle 60 000 est 120 000
    expect(due!.dueKm).toBe(120000)
    expect(due!.urgency).not.toBe('retard')
  })

  it('ignore une tâche inactive', () => {
    const due = computeDue(
      clio,
      { categorie: 'vidange', libelle: 'Vidange', intervalleKm: 15000, intervalleMois: 12, actif: false },
      db.serviceRecords,
    )
    expect(due).toBeNull()
  })

  it('classe les échéances par urgence', () => {
    const dues = duesForVehicle(db, 'veh-clio-demo')
    expect(dues.length).toBeGreaterThan(0)
    const order = { retard: 0, urgent: 1, bientot: 2, ok: 3 }
    for (let i = 1; i < dues.length; i++) {
      expect(order[dues[i].urgency]).toBeGreaterThanOrEqual(order[dues[i - 1].urgency])
    }
  })

  it('estime le rythme de conduite (km/mois) depuis l\'historique', () => {
    const rate = avgKmPerMonth(clio, db.serviceRecords)
    expect(rate).toBeGreaterThan(100)
    expect(rate).toBeLessThan(5000)
  })
})

describe('transparence des données', () => {
  it('ne déclare jamais une intervention « effectuée » sans enregistrement', () => {
    const db = buildSeedDatabase()
    const records: ServiceRecord[] = []
    const clio = db.vehicles[0]
    const due = computeDue(
      clio,
      { categorie: 'distribution', libelle: 'Distribution', intervalleKm: 90000, intervalleMois: 72, actif: true },
      records,
    )
    // Sans historique, on planifie le cycle — on n'affirme pas que la distribution a été faite
    expect(due!.lastRecord).toBeUndefined()
  })
})
