import { describe, it, expect } from 'vitest'
import { fuelStatistics } from '@/lib/domain/fuel'
import type { FuelEntry } from '@/lib/domain/types'

function entry(id: string, date: string, kilometrage: number, litres: number, montant: number, pleinComplet: boolean, suiviContinu: boolean): FuelEntry {
  return { id, vehicleId: 'v', date, kilometrage, litres, montant, pleinComplet, suiviContinu, carburant: 'SP95', createdAt: date }
}

describe('statistiques carburant', () => {
  const a = entry('a', '2026-01-01', 10000, 40, 60, true, false)
  const b = entry('b', '2026-01-15', 10200, 10, 16, false, true)
  const c = entry('c', '2026-02-01', 10500, 20, 34, true, true)
  it('calcule la consommation entre pleins complets en incluant les ravitaillements partiels', () => {
    const months = fuelStatistics([c, a, b])
    expect(months[0].consumption).toBeNull()
    expect(months[1].consumption).toBe(6)
    expect(months[1].distance).toBe(500)
    expect(months[1].litres).toBe(20)
  })
  it('calcule le prix pondéré par le volume et les montants mensuels', () => {
    const jan = fuelStatistics([a, b])[0]
    expect(jan.litres).toBe(50)
    expect(jan.amount).toBe(76)
    expect(jan.pricePerLitre).toBeCloseTo(1.52)
    expect(jan.count).toBe(2)
  })
  it('ne calcule rien si le suivi ou un plein complet manque', () => {
    expect(fuelStatistics([a, { ...b, suiviContinu: false }, c])[1].consumption).toBeNull()
    expect(fuelStatistics([b, c])[1].consumption).toBeNull()
  })
  it('rejette les kilométrages incohérents et les dates identiques pour la consommation', () => {
    expect(fuelStatistics([a, { ...c, kilometrage: 9900 }])[1].consumption).toBeNull()
    expect(fuelStatistics([a, { ...c, date: a.date }])[0].consumption).toBeNull()
  })
  it('repart du plein complet après une interruption et pondère les intervalles valides', () => {
    const d = entry('d', '2026-02-15', 11000, 25, 42, true, true)
    const e = entry('e', '2026-02-25', 11250, 20, 34, true, true)
    const feb = fuelStatistics([a, { ...c, suiviContinu: false }, d, e])[1]
    expect(feb.consumption).toBe(6)
    expect(feb.distance).toBe(750)
  })
})
