import type { FuelEntry } from './types'

export interface FuelMonth {
  month: string
  litres: number
  amount: number
  count: number
  distance: number
  measuredLitres: number
  consumption: number | null
  pricePerLitre: number
}

/** Chaque intervalle est attribué au mois du plein final, pas réparti artificiellement. */
export function fuelStatistics(entries: FuelEntry[]): FuelMonth[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  const months = new Map<string, FuelMonth>()
  let start: FuelEntry | undefined
  let previous: FuelEntry | undefined
  let litresSinceFull = 0
  let continuous = true
  for (const entry of sorted) {
    const month = entry.date.slice(0, 7)
    const stats = months.get(month) ?? { month, litres: 0, amount: 0, count: 0, distance: 0, measuredLitres: 0, consumption: null, pricePerLitre: 0 }
    stats.litres += entry.litres
    stats.amount += entry.montant
    stats.count++
    if (start && previous) {
      // Les pleins le même jour sont ambigus et les kilométrages doivent progresser.
      continuous = continuous && entry.suiviContinu && entry.date > previous.date && entry.kilometrage > previous.kilometrage
      litresSinceFull += entry.litres
      if (entry.pleinComplet && continuous) {
        stats.distance += entry.kilometrage - start.kilometrage
        stats.measuredLitres += litresSinceFull
      }
    }
    if (entry.pleinComplet) {
      start = entry
      litresSinceFull = 0
      continuous = true
    }
    previous = entry
    months.set(month, stats)
  }
  return [...months.values()].map((m) => ({ ...m, pricePerLitre: m.amount / m.litres, consumption: m.distance > 0 ? m.measuredLitres / m.distance * 100 : null }))
}
