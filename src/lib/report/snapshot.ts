// Construction de l'instantané de rapport : un état cohérent, figé et
// reproductible des données du véhicule au moment de la génération.
// RÈGLE : on ne recopie que des données réellement enregistrées.

import type {
  Anomaly,
  AppDatabase,
  DocumentEntry,
  ExpenseEntry,
  FaultAndTest,
  OdometerReading,
  PartPurchase,
  ServiceDue,
  ServiceRecord,
  ServiceRecordItem,
  Vehicle,
} from '../domain/types'
import type { ExpenseTotals } from '../domain/totals'
import { computeExpenseTotals, serviceRecordsCost, standalonePurchases } from '../domain/totals'
import { detectAnomalies, missingVehicleFields } from '../domain/anomalies'
import { duesForVehicle } from '../domain/due'
import { todayISO } from '../domain/format'
import type { ReportOptions } from './options'

export interface SnapshotAttachment {
  document: DocumentEntry
  included: boolean
  reason?: string
}

export interface SnapshotServiceRecord {
  record: ServiceRecord
  items: ServiceRecordItem[]
  documents: DocumentEntry[]
}

export interface ReportSnapshot {
  schemaVersion: 1
  generatedAt: string
  vehicle: Vehicle
  period: { from: string | null; to: string | null }
  counts: {
    interventions: number
    interventionsEffectuees: number
    pannes: number
    pannesOuvertes: number
    documents: number
    depenses: number
    releves: number
    achats: number
  }
  kmRange: { min: number | null; max: number | null; source: 'releves' | 'interventions' | 'aucune' }
  odometerReadings: OdometerReading[]
  serviceRecords: SnapshotServiceRecord[]
  faults: FaultAndTest[]
  purchases: PartPurchase[]
  expenses: ExpenseEntry[]
  documents: DocumentEntry[]
  attachments: SnapshotAttachment[]
  totals: ExpenseTotals
  serviceCostTotal: number
  dues: ServiceDue[]
  anomalies: Anomaly[]
  missingFields: string[]
  privacyNotices: Array<{ code: string; message: string }>
  dataOrigins: string[]
}

function inPeriod(date: string, period: { from: string | null; to: string | null }): boolean {
  if (period.from && date < period.from) return false
  if (period.to && date > period.to) return false
  return true
}

export function buildReportSnapshot(
  db: AppDatabase,
  vehicleId: string,
  options: ReportOptions,
): ReportSnapshot {
  const vehicle = db.vehicles.find((v) => v.id === vehicleId)
  if (!vehicle) throw new Error('Véhicule introuvable')

  const period = { from: options.period.from, to: options.period.to }

  const readings = db.odometerReadings
    .filter((r) => r.vehicleId === vehicleId)
    .slice()
    .sort((a, b) => (a.date === b.date ? a.valeurKm - b.valeurKm : a.date < b.date ? -1 : 1))

  const recordsAll = db.serviceRecords
    .filter((r) => r.vehicleId === vehicleId)
    .slice()
    .sort((a, b) => (a.date === b.date ? b.kilometrage - a.kilometrage : a.date < b.date ? 1 : -1))

  const recordsInPeriod = recordsAll.filter((r) => inPeriod(r.date, period))

  const serviceRecords: SnapshotServiceRecord[] = recordsInPeriod.map((record) => ({
    record,
    items: db.serviceRecordItems.filter((i) => i.serviceRecordId === record.id),
    documents: db.documents.filter((d) => d.serviceRecordId === record.id),
  }))

  const faults = db.faults
    .filter((f) => f.vehicleId === vehicleId && inPeriod(f.dateSignalement, period))
    .slice()
    .sort((a, b) => (a.dateSignalement < b.dateSignalement ? 1 : -1))

  const purchases = standalonePurchases(db, vehicleId).filter((p) => inPeriod(p.date, period))

  const documents = db.documents
    .filter((d) => d.vehicleId === vehicleId)
    .slice()
    .sort((a, b) => (a.dateDocument < b.dateDocument ? 1 : -1))

  const expenses = db.expenses
    .filter((e) => e.vehicleId === vehicleId && inPeriod(e.date, period))
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  // Pièces jointes sélectionnables (index complet, inclusion selon options)
  const attachments: SnapshotAttachment[] = documents.map((document) => {
    const selected = options.attachmentIds.includes(document.id)
    const included = options.includeAttachments && selected && document.disponible
    let reason: string | undefined
    if (options.includeAttachments && selected && !document.disponible) {
      reason =
        'Fichier inaccessible : la pièce jointe est référencée mais n’a pas pu être récupérée. Elle n’est pas omise silencieusement — son absence est signalée dans le rapport.'
    } else if (!options.includeAttachments && selected) {
      reason = 'Non incluse : l’intégration des pièces jointes est désactivée dans les options.'
    } else if (!selected) {
      reason = 'Non sélectionnée dans les options du rapport.'
    }
    return { document, included, reason }
  })

  const totals = computeExpenseTotals(expenses, { from: period.from ?? undefined, to: period.to ?? undefined })
  const anomalies = detectAnomalies(db, vehicleId)
  const dues = duesForVehicle(db, vehicleId).filter(
    (d) => d.urgency === 'retard' || d.urgency === 'urgent' || d.urgency === 'bientot',
  )

  // Plage kilométrique réellement couverte (jamais extrapolée)
  const kmCandidates: number[] = []
  for (const r of readings) kmCandidates.push(r.valeurKm)
  for (const r of recordsInPeriod) kmCandidates.push(r.kilometrage)
  const minKm = kmCandidates.length ? Math.min(...kmCandidates) : null
  const maxKm = kmCandidates.length ? Math.max(...kmCandidates, vehicle.kilometrageActuel) : null

  const kmSource: ReportSnapshot['kmRange']['source'] =
    readings.length > 0 ? 'releves' : recordsInPeriod.length > 0 ? 'interventions' : 'aucune'

  const origins = new Set<string>()
  for (const r of readings) origins.add(r.sourceInformation)
  for (const r of recordsInPeriod) origins.add(r.sourceInformation)
  for (const f of faults) origins.add(f.sourceInformation)

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    vehicle,
    period,
    counts: {
      interventions: recordsInPeriod.length,
      interventionsEffectuees: recordsInPeriod.filter((r) => r.statut === 'effectue').length,
      pannes: faults.length,
      pannesOuvertes: faults.filter(
        (f) => f.statut === 'ouvert' || f.statut === 'reapparu' || f.statut === 'resolution_non_confirmee',
      ).length,
      documents: documents.length,
      depenses: expenses.length,
      releves: readings.length,
      achats: purchases.length,
    },
    kmRange: { min: minKm, max: maxKm, source: kmSource },
    odometerReadings: readings,
    serviceRecords,
    faults,
    purchases,
    expenses,
    documents,
    attachments,
    totals,
    serviceCostTotal: serviceRecordsCost(db, vehicleId),
    dues,
    anomalies,
    missingFields: missingVehicleFields(vehicle),
    privacyNotices: [],
    dataOrigins: Array.from(origins),
  }
}

export function snapshotToExportRecord(
  vehicleId: string,
  options: ReportOptions,
  snapshot: ReportSnapshot,
): {
  vehicleId: string
  createdAt: string
  options: ReportOptions
  snapshot: ReportSnapshot
  anomalies: Anomaly[]
  generatedBy: string
} {
  return {
    vehicleId,
    createdAt: todayISO(),
    options,
    snapshot,
    anomalies: snapshot.anomalies,
    generatedBy: 'demo-user',
  }
}
