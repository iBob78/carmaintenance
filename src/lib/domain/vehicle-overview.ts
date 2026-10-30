import { computeExpenseTotals } from './totals'
import { todayISO } from './format'
import type { AppDatabase, Vehicle } from './types'

/** Indicateurs calculés à partir des données enregistrées, sans extrapolation. */
export function buildVehicleOverview(db: AppDatabase, vehicle: Vehicle, today = todayISO()) {
  const records = db.serviceRecords.filter((r) => r.vehicleId === vehicle.id && r.statut === 'effectue')
    .slice().sort((a, b) => a.date.localeCompare(b.date) || a.kilometrage - b.kilometrage)
  const recordIds = new Set(records.map((r) => r.id))
  // Les lignes de pièces documentent des pièces associées à une intervention,
  // mais ne prouvent pas à elles seules qu'elles ont été remplacées.
  const pieces = db.serviceRecordItems.filter((item) => item.kind === 'piece' && recordIds.has(item.serviceRecordId)).length
  const expenses = db.expenses.filter((e) => e.vehicleId === vehicle.id)
  const totals = computeExpenseTotals(expenses)
  const readings = db.odometerReadings.filter((r) => r.vehicleId === vehicle.id && r.date <= today)
    .slice().sort((a, b) => a.date.localeCompare(b.date) || a.valeurKm - b.valeurKm)
  const acquisitionReadings = readings.filter((r) => r.date === vehicle.dateAcquisition)
  let distance: number | null = null
  let distanceDate: string | null = null
  if (vehicle.dateAcquisition && acquisitionReadings.length === 1) {
    const start = acquisitionReadings[0]
    const subsequent = readings.filter((r) => r.date > start.date)
    const sequence = [start, ...subsequent]
    const sameDate = sequence.some((r, i) => i > 0 && r.date === sequence[i - 1].date)
    const descending = sequence.some((r, i) => i > 0 && r.valeurKm < sequence[i - 1].valeurKm)
    if (subsequent.length && !sameDate && !descending) {
      const last = subsequent[subsequent.length - 1]
      distance = last.valeurKm - start.valeurKm
      distanceDate = last.date
    }
  }
  return { records, pieces, totals, hasExpenses: expenses.length > 0, distance, distanceDate }
}
