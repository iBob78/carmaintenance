/**
 * Synthèse « tableau de bord » de la fiche véhicule (vue en haut de page).
 *
 * Rassemble, à partir des seules données enregistrées, les blocs d'une
 * synthèse d'entretien : identification, kilométrage connu, historique,
 * pannes, dépenses par poste, travaux à prévoir, résumé + anomalies.
 * Aucune valeur n'est inventée ni inférée : ce qui est absent reste absent.
 */

import { detectAnomalies, missingVehicleFields } from './anomalies'
import { CARBURANT_LABELS, EXPENSE_CATEGORY_LABELS, FAULT_STATUS_LABELS } from './catalog'
import { duesForVehicle } from './due'
import { formatDateShort, formatKm } from './format'
import { computeExpenseTotals } from './totals'
import type {
  Anomaly,
  AppDatabase,
  ExpenseCategory,
  OdometerReading,
  ServiceDue,
  ServiceRecord,
  Vehicle,
} from './types'

export interface SyntheseRow {
  label: string
  /** Valeur affichée — null = non renseigné (jamais deviné) */
  valeur: string | null
}

export interface SyntheseDepensePart {
  cle: string
  label: string
  montant: number
  /** Part du total net, en % (arrondie à 0,1) */
  part: number
}

export interface VehicleSynthese {
  identification: SyntheseRow[]
  relevés: OdometerReading[]
  plage: { min: number; max: number } | null
  interventions: {
    total: number
    effectuees: number
    prevues: number
    autres: number
    recentes: ServiceRecord[]
  }
  pannes: {
    ouvertes: Array<{ id: string; symptomes: string; statut: string; date: string }>
    resolues: number
  }
  depenses: {
    total: number
    parts: SyntheseDepensePart[]
  }
  prochaines: ServiceDue[]
  resume: {
    anomalies: Anomaly[]
    missing: string[]
    nbReleves: number
  }
}

const TRANSMISSION_LABELS: Record<string, string> = {
  manuelle: 'Manuelle',
  automatique: 'Automatique',
  semi_automatique: 'Semi-automatique',
}

function orNull(value: string | number | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

export function buildVehicleSynthese(db: AppDatabase, vehicle: Vehicle): VehicleSynthese {
  const vehicleId = vehicle.id

  const identification: SyntheseRow[] = [
    { label: 'Marque / modèle', valeur: orNull(`${vehicle.marque} ${vehicle.modele}`) },
    { label: 'Finition', valeur: orNull(vehicle.finition) },
    { label: 'Année', valeur: orNull(vehicle.annee) },
    {
      label: '1ère immatriculation',
      valeur: vehicle.premiereImmatriculation ? formatDateShort(vehicle.premiereImmatriculation) : null,
    },
    { label: 'Motorisation', valeur: orNull(vehicle.motorisation) },
    { label: 'Code moteur', valeur: orNull(vehicle.codeMoteur) },
    {
      label: 'Cylindrée',
      valeur: vehicle.cylindreeCm3 != null ? `${vehicle.cylindreeCm3} cm³` : null,
    },
    { label: 'Carburant', valeur: CARBURANT_LABELS[vehicle.carburant] ?? orNull(vehicle.carburant) },
    {
      label: 'Transmission',
      valeur: vehicle.transmission ? (TRANSMISSION_LABELS[vehicle.transmission] ?? orNull(vehicle.transmission)) : null,
    },
    { label: 'VIN', valeur: orNull(vehicle.vin) },
    { label: 'Immatriculation', valeur: orNull(vehicle.immatriculation) },
    {
      label: 'Date d’acquisition',
      valeur: vehicle.dateAcquisition ? formatDateShort(vehicle.dateAcquisition) : null,
    },
    { label: 'Couleur', valeur: orNull(vehicle.couleur) },
  ]

  const relevés = db.odometerReadings
    .filter((r) => r.vehicleId === vehicleId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const plage =
    relevés.length >= 2
      ? {
          min: Math.min(...relevés.map((r) => r.valeurKm)),
          max: Math.max(...relevés.map((r) => r.valeurKm)),
        }
      : null

  const records = db.serviceRecords
    .filter((r) => r.vehicleId === vehicleId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const effectuees = records.filter((r) => r.statut === 'effectue').length
  const prevues = records.filter((r) => r.statut === 'prevu').length

  const pannesToutes = db.faults.filter((f) => f.vehicleId === vehicleId)
  const pannesOuvertes = pannesToutes
    .filter((f) => f.statut !== 'resolu')
    .sort((a, b) => (a.dateSignalement < b.dateSignalement ? 1 : -1))
    .map((f) => ({
      id: f.id,
      symptomes: f.symptomes,
      statut: FAULT_STATUS_LABELS[f.statut] ?? f.statut,
      date: formatDateShort(f.dateSignalement),
    }))

  const expenses = db.expenses.filter((e) => e.vehicleId === vehicleId)
  const totals = computeExpenseTotals(expenses)
  const parts: SyntheseDepensePart[] = Object.entries(totals.parCategorie)
    .map(([cle, montant]) => ({
      cle,
      label: cle === 'inconnu' ? 'Non catégorisées' : (EXPENSE_CATEGORY_LABELS[cle as ExpenseCategory] ?? cle),
      montant,
      part: totals.net > 0 ? Math.round((montant / totals.net) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.montant - a.montant)

  const prochaines = duesForVehicle(db, vehicleId).slice(0, 3)

  return {
    identification,
    relevés,
    plage,
    interventions: {
      total: records.length,
      effectuees,
      prevues,
      autres: records.length - effectuees - prevues,
      recentes: records.slice(0, 6),
    },
    pannes: {
      ouvertes: pannesOuvertes,
      resolues: pannesToutes.length - pannesOuvertes.length,
    },
    depenses: {
      total: totals.net,
      parts,
    },
    prochaines,
    resume: {
      anomalies: detectAnomalies(db, vehicleId),
      missing: missingVehicleFields(vehicle),
      nbReleves: relevés.length,
    },
  }
}

/** Libellé d'une ligne de relevé : « Source justifiée par document » ou non. */
export function releveJustifie(r: OdometerReading): boolean {
  return r.sourceInformation !== 'declare'
}

/** Texte d'une prochaine échéance : « Prévu le 30/09/2026 (88 500 km) ». */
export function echeanceTexte(d: ServiceDue): string {
  const bits: string[] = []
  if (d.dueDate) bits.push(`Prévu le ${formatDateShort(d.dueDate)}`)
  if (d.dueKm != null) bits.push(formatKm(d.dueKm))
  return bits.length > 0 ? bits.join(' · ') : 'Échéance à définir'
}
