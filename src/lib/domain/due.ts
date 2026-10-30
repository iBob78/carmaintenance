// Calcul des échéances d'entretien (prochains km / dates) à partir des
// enregistrements réels. Règle de transparence : un entretien jamais
// enregistré planifie la prochaine occurrence du cycle, il n'est pas
// déclaré « en retard » sans preuve.

import type {
  AppDatabase,
  MaintenanceTask,
  Reminder,
  ServiceCategory,
  ServiceDue,
  ServiceRecord,
  Vehicle,
} from './types'
import { addMonthsISO, daysBetween, monthsBetween, parseISO, toISODate, todayISO } from './format'

export function lastRecordFor(
  records: ServiceRecord[],
  vehicleId: string,
  categorie: ServiceCategory,
): ServiceRecord | null {
  const list = records.filter(
    (r) => r.vehicleId === vehicleId && r.categorie === categorie && r.statut === 'effectue',
  )
  if (list.length === 0) return null
  return list
    .slice()
    .sort((a, b) => (a.date === b.date ? b.kilometrage - a.kilometrage : a.date < b.date ? 1 : -1))[0]
}

/** Rythme déclaré, ou calculé sur des interventions réelles si disponibles. */
export function avgKmPerMonth(vehicle: Vehicle, records: ServiceRecord[]): number | null {
  if (vehicle.kilometrageAnnuel != null && Number.isFinite(vehicle.kilometrageAnnuel) && vehicle.kilometrageAnnuel > 0) {
    return vehicle.kilometrageAnnuel / 12
  }
  const list = records
    .filter((r) => r.vehicleId === vehicle.id && r.statut === 'effectue')
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
  if (list.length >= 2) {
    const first = list[0]
    const last = list[list.length - 1]
    const months = monthsBetween(first.date, last.date)
    const km = last.kilometrage - first.kilometrage
    if (months >= 1 && km > 0) return km / months
  }
  return null
}

/** Projection depuis la date du relevé, jamais depuis un kilométrage fictif. */
function projectedKmDate(vehicle: Vehicle, dueKm: number | undefined, records: ServiceRecord[]): string | undefined {
  const rate = avgKmPerMonth(vehicle, records)
  const anchor = vehicle.dateKilometrageActuel
  if (dueKm == null || !anchor || !rate) return undefined
  const days = Math.max(0, Math.round((dueKm - vehicle.kilometrageActuel) / (rate * 12) * 365.25))
  const date = parseISO(anchor)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

function urgencyOf(kmRemaining: number | null, daysRemaining: number | null): ServiceDue['urgency'] {
  const overdue = (kmRemaining !== null && kmRemaining <= 0) || (daysRemaining !== null && daysRemaining <= 0)
  if (overdue) return 'retard'
  if (
    (kmRemaining !== null && kmRemaining <= 500) ||
    (daysRemaining !== null && daysRemaining <= 15)
  ) {
    return 'urgent'
  }
  if (
    (kmRemaining !== null && kmRemaining <= 1500) ||
    (daysRemaining !== null && daysRemaining <= 30)
  ) {
    return 'bientot'
  }
  return 'ok'
}

export interface TaskLike {
  categorie: ServiceCategory
  libelle: string
  intervalleKm?: number | null
  intervalleMois?: number | null
  actif: boolean
}

export function computeDue(vehicle: Vehicle, task: TaskLike, records: ServiceRecord[]): ServiceDue | null {
  if (!task.actif) return null
  const today = todayISO()
  const last = lastRecordFor(records, vehicle.id, task.categorie)

  let dueKm: number | undefined
  let dueDate: string | undefined

  if (task.intervalleKm != null) {
    const base = last ? last.kilometrage : 0
    dueKm = base + task.intervalleKm
    if (!last && vehicle.kilometrageActuel > dueKm) {
      dueKm =
        Math.ceil(vehicle.kilometrageActuel / task.intervalleKm) * task.intervalleKm
    }
  }
  if (task.intervalleMois != null) {
    const base = last ? last.date : vehicle.premiereImmatriculation ?? today
    dueDate = addMonthsISO(base, task.intervalleMois)
    if (!last && dueDate < today) {
      const cycles = Math.ceil(monthsBetween(base, today) / task.intervalleMois)
      dueDate = addMonthsISO(base, cycles * task.intervalleMois)
    }
  }
  if (dueKm === undefined && dueDate === undefined) return null

  const kmRemaining = dueKm !== undefined ? dueKm - vehicle.kilometrageActuel : null
  const daysRemaining = dueDate !== undefined ? daysBetween(today, dueDate) : null

  const projectedDate = projectedKmDate(vehicle, dueKm, records)

  return {
    categorie: task.categorie,
    libelle: task.libelle,
    dueKm,
    dueDate,
    kmRemaining: kmRemaining ?? undefined,
    daysRemaining: daysRemaining ?? undefined,
    projectedDate,
    urgency: urgencyOf(kmRemaining, daysRemaining),
    lastRecord: last ?? undefined,
  }
}

/** Échéances issues des rappels explicites de l'utilisateur */
export function dueFromReminder(vehicle: Vehicle, reminder: Reminder, records: ServiceRecord[] = []): ServiceDue {
  const today = todayISO()
  const kmRemaining =
    reminder.seuilKm !== undefined ? reminder.seuilKm - vehicle.kilometrageActuel : null
  const daysRemaining = reminder.dateCible ? daysBetween(today, reminder.dateCible) : null
  return {
    categorie: reminder.categorie,
    libelle: reminder.libelle,
    dueKm: reminder.seuilKm,
    dueDate: reminder.dateCible,
    kmRemaining: kmRemaining ?? undefined,
    daysRemaining: daysRemaining ?? undefined,
    urgency: urgencyOf(kmRemaining, daysRemaining),
    projectedDate: projectedKmDate(vehicle, reminder.seuilKm, records),
    fromReminder: reminder,
  }
}

export function duesForVehicle(db: AppDatabase, vehicleId: string): ServiceDue[] {
  const vehicle = db.vehicles.find((v) => v.id === vehicleId)
  if (!vehicle) return []
  const dues: ServiceDue[] = []
  for (const task of db.maintenanceTasks.filter((t) => t.vehicleId === vehicleId)) {
    const due = computeDue(vehicle, task, db.serviceRecords)
    if (due) dues.push(due)
  }
  for (const reminder of db.reminders.filter(
    (r) => r.vehicleId === vehicleId && (r.statut === 'a_faire' || r.statut === 'en_retard'),
  )) {
    dues.push(dueFromReminder(vehicle, reminder, db.serviceRecords))
  }
  return dues.sort((a, b) => {
    const order = { retard: 0, urgent: 1, bientot: 2, ok: 3 }
    if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency]
    return (a.kmRemaining ?? Number.MAX_SAFE_INTEGER) - (b.kmRemaining ?? Number.MAX_SAFE_INTEGER)
  })
}

export function nextDues(db: AppDatabase, limit = 6): Array<ServiceDue & { vehicleId: string }> {
  const all: Array<ServiceDue & { vehicleId: string }> = []
  for (const v of db.vehicles) {
    for (const d of duesForVehicle(db, v.id)) all.push({ ...d, vehicleId: v.id })
  }
  return all
    .sort((a, b) => {
      const score = (d: ServiceDue) => {
        const kmScore = d.kmRemaining != null ? d.kmRemaining / 50 : Number.MAX_SAFE_INTEGER / 2
        const dayScore = d.daysRemaining != null ? d.daysRemaining : Number.MAX_SAFE_INTEGER / 2
        return Math.min(kmScore, dayScore)
      }
      return score(a) - score(b)
    })
    .slice(0, limit)
}

/** Intervalle par défaut sous forme de MaintenanceTask */
export function defaultTask(
  vehicleId: string,
  categorie: ServiceCategory,
  label: string,
  intervalleKm: number | null,
  intervalleMois: number | null,
): MaintenanceTask {
  return {
    id: `task-${vehicleId}-${categorie}`,
    vehicleId,
    categorie,
    libelle: label,
    intervalleKm,
    intervalleMois,
    actif: categorie !== 'autre',
    createdAt: new Date().toISOString(),
  }
}
