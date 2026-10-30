import { describe, expect, it } from 'vitest'
import { buildSeedDatabase } from '@/lib/data/demo/seed'
import { buildVehicleOverview } from '@/lib/domain/vehicle-overview'

describe('résumé de la fiche véhicule', () => {
  it('compte uniquement les interventions effectuées et leurs lignes de pièces', () => {
    const db = buildSeedDatabase()
    const vehicle = db.vehicles[0]
    const s = buildVehicleOverview(db, vehicle, '2026-12-01')
    expect(s.records.every((r) => r.vehicleId === vehicle.id && r.statut === 'effectue')).toBe(true)
    const ids = new Set(s.records.map((r) => r.id))
    expect(s.pieces).toBe(db.serviceRecordItems.filter((i) => i.kind === 'piece' && ids.has(i.serviceRecordId)).length)
  })

  it('calcule les kilomètres entre le relevé daté à l’achat et le dernier relevé cohérent', () => {
    const db = buildSeedDatabase()
    const s = buildVehicleOverview(db, db.vehicles[0], '2026-12-01')
    expect(s.distance).toBe(87400 - 41200)
    expect(s.distanceDate).toBe('2026-09-28')
  })

  it('n’invente pas de distance en l’absence de relevé à l’achat ou en cas d’incohérence', () => {
    const db = buildSeedDatabase()
    const v = db.vehicles[0]
    expect(buildVehicleOverview(db, { ...v, dateAcquisition: '2021-03-16' }).distance).toBeNull()
    db.odometerReadings.push({ ...db.odometerReadings[0], id: 'incoherent', date: '2026-10-01', valeurKm: 1 })
    expect(buildVehicleOverview(db, v, '2026-12-01').distance).toBeNull()
  })

  it('ne confond pas une absence de dépenses avec un total enregistré à zéro', () => {
    const db = buildSeedDatabase()
    db.expenses = []
    const s = buildVehicleOverview(db, db.vehicles[0])
    expect(s.hasExpenses).toBe(false)
    expect(s.totals.net).toBe(0)
  })
})
