// Appariement véhicule → plan d'entretien constructeur.
//
// Le plan dépend surtout de la MOTORISATION : l'appariement privilégie le code
// moteur, puis le libellé de motorisation, puis le modèle + carburant.
// Aucune valeur n'est inventée : sans plan connu, `null` est renvoyé et l'app
// propose la saisie manuelle du carnet d'entretien.

import type { TaskLike } from './due'
import type { Reminder, ServiceDue, Vehicle } from './types'
import {
  MAINTENANCE_SCHEDULES,
  type ScheduleOperation,
  type VehicleSchedule,
} from '@/lib/data/maintenance-schedules'

/** Minuscules, sans accents, chiffres romains normalisés (« Clio IV » → « clio 4 »). */
export function normalizeModelKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(iv|iii|ii|vii|vi|v|i)\b/g, (m) => {
      const romains: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7' }
      return romains[m] ?? m
    })
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const inclut = (grand: string, petit: string): boolean =>
  petit.length > 0 && (grand === petit || grand.includes(petit) || petit.includes(grand))

/**
 * Score d'appariement (plus haut = meilleur) ; `null` si la marque ou le
 * modèle ne correspond pas. Le code moteur prime sur le libellé marketing.
 */
export function matchScore(plan: VehicleSchedule, v: Vehicle): number | null {
  const marqueV = normalizeModelKey(v.marque)
  if (!plan.marques.some((m) => normalizeModelKey(m) === marqueV)) return null

  const modeleV = normalizeModelKey(v.modele)
  const modeleOk = plan.modeles.some((m) => inclut(modeleV, normalizeModelKey(m)))
  if (!modeleOk) return null

  let score = 1
  if (plan.carburant && v.carburant === plan.carburant) score += 1

  const motorV = normalizeModelKey(v.motorisation ?? '')
  if (motorV && plan.motorisations.some((m) => inclut(motorV, normalizeModelKey(m)))) score += 3

  const codeV = (v.codeMoteur ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (codeV && (plan.codesMoteur ?? []).some((c) => codeV.startsWith(c) || c.startsWith(codeV))) score += 5

  return score
}

/** Tous les plans applicables, du plus spécifique au plus générique. */
export function schedulesForVehicle(v: Vehicle): VehicleSchedule[] {
  return MAINTENANCE_SCHEDULES.map((plan) => ({ plan, score: matchScore(plan, v) }))
    .filter((x): x is { plan: VehicleSchedule; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.plan)
}

/** Le plan le plus spécifique trouvé, ou `null` (aucun plan = jamais inventé). */
export function scheduleForVehicle(v: Vehicle): VehicleSchedule | null {
  return schedulesForVehicle(v)[0] ?? null
}

/** Opérations du plan, prêtes pour `computeDue` (TaskLike). */
export function operationsForVehicle(v: Vehicle): TaskLike[] {
  const plan = scheduleForVehicle(v)
  if (!plan) return []
  return plan.operations.map((op: ScheduleOperation) => ({
    categorie: op.categorie,
    libelle: op.libelle,
    intervalleKm: op.intervalleKm ?? null,
    intervalleMois: op.intervalleMois ?? null,
    actif: true,
  }))
}

/** Périodicité lisible (« 30 000 km ou 12 mois »). */
export function formatInterval(op: ScheduleOperation): string {
  const parts: string[] = []
  if (op.intervalleKm) {
    const km = op.intervalleKm.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')
    parts.push(`${km} km`)
  }
  if (op.intervalleMois) {
    parts.push(op.intervalleMois % 12 === 0 && op.intervalleMois >= 24 ? `${op.intervalleMois / 12} an(s)` : `${op.intervalleMois} mois`)
  }
  return parts.length > 0 ? parts.join(' ou ') : '—'
}

/**
 * Fabrique le rappel à créer pour une opération du plan, à partir de
 * l'échéance calculée (km, date, ou les deux).
 */
export function reminderForOperation(
  vehicleId: string,
  op: ScheduleOperation,
  due: ServiceDue,
): Omit<Reminder, 'id' | 'createdAt'> {
  return {
    vehicleId,
    categorie: op.categorie,
    libelle: op.libelle,
    declencheur: due.dueKm != null && due.dueDate != null ? 'km_et_date' : due.dueKm != null ? 'km' : 'date',
    seuilKm: due.dueKm ?? undefined,
    dateCible: due.dueDate ?? undefined,
    statut: 'a_faire',
  }
}
