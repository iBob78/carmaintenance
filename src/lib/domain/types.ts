// ---------------------------------------------------------------------------
// Modèle de données AutoCarnet
// Conforme au cahier des charges : profiles, vehicles, odometer_readings,
// maintenance_tasks, service_records, service_record_items, faults_and_tests,
// parts_and_purchases, documents, expense_entries, reminders, report_exports.
// Les mêmes entités sont créées en base par supabase/migrations/0001_init.sql.
// ---------------------------------------------------------------------------

/**
 * Origine d'une information :
 * - declare   : saisie par l'utilisateur, sans justificatif
 * - documente : justifiée par un document (facture, photo, PV…)
 * - verifie   : confirmée par un professionnel
 */
export type SourceInformation = 'declare' | 'documente' | 'verifie'

export type Carburant =
  | 'essence'
  | 'diesel'
  | 'hybride'
  | 'electrique'
  | 'gpl'
  | 'ethanol'
  | 'autre'

export type Transmission = 'manuelle' | 'automatique' | 'semi_automatique'

/** Statut d'une intervention dans le carnet */
export type ServiceStatus = 'effectue' | 'prevu' | 'annule' | 'non_realise'

/** Qui a réalisé l'intervention */
export type ServiceActor = 'proprietaire' | 'garage' | 'professionnel'

export type ServiceCategory =
  | 'vidange'
  | 'filtres'
  | 'freins'
  | 'pneus'
  | 'distribution'
  | 'bougies'
  | 'liquides'
  | 'climatisation'
  | 'batterie'
  | 'controle_technique'
  | 'transmission'
  | 'suspension'
  | 'carrosserie'
  | 'electricite'
  | 'autre'

export type ItemKind = 'piece' | 'consommable' | 'main_oeuvre' | 'prestation' | 'autre'

export type FaultStatus = 'ouvert' | 'resolu' | 'reapparu' | 'resolution_non_confirmee'

export type ExpenseCategory =
  | 'pieces'
  | 'consommables'
  | 'main_oeuvre'
  | 'prestations'
  | 'assurance'
  | 'controle_technique'
  | 'carburant'
  | 'autre'

/** Lien d'une dépense : évite le double comptage facture + interventions */
export type ExpenseLink = 'aucun' | 'service_record' | 'purchase'

export type DocumentKind = 'facture' | 'photo' | 'pv_controle' | 'autre'

export type ReminderTrigger = 'km' | 'date' | 'km_et_date'

export type ReminderStatus = 'a_faire' | 'en_retard' | 'fait' | 'annule'

export type OdometerSource = 'utilisateur' | 'facture' | 'professionnel' | 'controle'

// ---------------------------------------------------------------------------
// Entités
// ---------------------------------------------------------------------------

export interface Profile {
  id: string
  nom: string
  email: string
  telephone?: string
  adresse?: string
  createdAt: string
}

export interface Vehicle {
  id: string
  /** Propriétaire (donnée personnelle — masquable dans le rapport) */
  ownerId: string
  ownerName: string
  marque: string
  modele: string
  generation?: string
  finition?: string
  annee: number
  premiereImmatriculation?: string
  motorisation?: string
  codeMoteur?: string
  cylindreeCm3?: number
  carburant: Carburant
  transmission?: Transmission
  /** Numéro VIN (17 caractères) — masquable dans le rapport */
  vin?: string
  /** Immatriculation — masquable dans le rapport */
  immatriculation?: string
  dateAcquisition?: string
  kilometrageActuel: number
  couleur?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface OdometerReading {
  id: string
  vehicleId: string
  date: string
  valeurKm: number
  source: OdometerSource
  sourceInformation: SourceInformation
  documentId?: string
  note?: string
  createdAt: string
}

/** Opération planifiée / intervalle de révision du véhicule */
export interface MaintenanceTask {
  id: string
  vehicleId: string
  categorie: ServiceCategory
  libelle: string
  description?: string
  intervalleKm?: number | null
  intervalleMois?: number | null
  actif: boolean
  createdAt: string
}

export interface ServiceRecord {
  id: string
  vehicleId: string
  date: string
  kilometrage: number
  categorie: ServiceCategory
  titre: string
  description?: string
  statut: ServiceStatus
  realisateur: ServiceActor
  garage?: string
  coutTotal?: number
  notes?: string
  sourceInformation: SourceInformation
  documentId?: string
  createdAt: string
  updatedAt: string
}

export interface ServiceRecordItem {
  id: string
  serviceRecordId: string
  kind: ItemKind
  libelle: string
  reference?: string
  marque?: string
  quantite: number
  prixUnitaire?: number
  prixTotal?: number
}

export interface FaultAndTest {
  id: string
  vehicleId: string
  symptomes: string
  circonstances?: string
  codesDefaut?: string
  hypothese?: string
  testsRealises?: string
  resultat?: string
  piecesRemplacees?: string
  dateSignalement: string
  dateResolution?: string
  statut: FaultStatus
  serviceRecordId?: string
  sourceInformation: SourceInformation
  createdAt: string
  updatedAt: string
}

export interface PartPurchase {
  id: string
  vehicleId: string
  date: string
  libelle: string
  reference?: string
  marque?: string
  quantite: number
  prixTotal: number
  fournisseur?: string
  documentId?: string
  /** Intervention associée (si la pièce a été posée lors d'un enregistré) */
  serviceRecordId?: string
  notes?: string
  createdAt: string
}

export interface DocumentEntry {
  id: string
  vehicleId: string
  serviceRecordId?: string
  filename: string
  mimeType: string
  tailleOctets: number
  dateDocument: string
  kind: DocumentKind
  /** Chemin Supabase Storage (privé) — vide en mode démonstration */
  storagePath?: string
  sha256?: string
  /** En démonstration, le fichier lui-même n'est pas stocké : on l'annonce explicitement */
  disponible: boolean
  createdAt: string
}

export interface ExpenseEntry {
  id: string
  vehicleId: string
  date: string
  categorie: ExpenseCategory
  libelle: string
  montant: number
  remboursement?: number
  remboursementDate?: string
  /** Dépense dont la nature exacte n'est pas connue */
  inconnu?: boolean
  link: ExpenseLink
  serviceRecordId?: string
  purchaseId?: string
  documentId?: string
  notes?: string
  createdAt: string
}

export interface Reminder {
  id: string
  vehicleId: string
  categorie: ServiceCategory
  libelle: string
  declencheur: ReminderTrigger
  seuilKm?: number
  dateCible?: string
  statut: ReminderStatus
  faitServiceRecordId?: string
  createdAt: string
}

export interface ReportExport {
  id: string
  vehicleId: string
  createdAt: string
  options: unknown
  /** Instantané des données utilisées (reproductibilité) */
  snapshot: unknown
  anomalies: Anomaly[]
  pdfSha256?: string
  pdfTailleOctets?: number
  generatedBy: string
}

// ---------------------------------------------------------------------------
// Anomalies & échéances
// ---------------------------------------------------------------------------

export type AnomalySeverity = 'avertissement' | 'incoherence'

export interface Anomaly {
  id: string
  severity: AnomalySeverity
  code:
    | 'km_diminue'
    | 'km_hors_plage'
    | 'date_future'
    | 'cout_incoherent'
    | 'doublon_possible'
    | 'document_manquant'
    | 'donnee_manquante'
    | 'remboursement_superieur'
  message: string
  /** Références implicites (ids) pour retrouver l'élément en cause */
  context?: Record<string, string | number>
}

export type DueUrgency = 'ok' | 'bientot' | 'urgent' | 'retard'

export interface ServiceDue {
  categorie: ServiceCategory
  libelle: string
  dueKm?: number
  dueDate?: string
  kmRemaining?: number
  daysRemaining?: number
  projectedDate?: string
  urgency: DueUrgency
  lastRecord?: ServiceRecord
  fromReminder?: Reminder
}

/** Registre complet de l'application (miroir du modèle SQL) */
export interface AppDatabase {
  profile: Profile
  vehicles: Vehicle[]
  odometerReadings: OdometerReading[]
  maintenanceTasks: MaintenanceTask[]
  serviceRecords: ServiceRecord[]
  serviceRecordItems: ServiceRecordItem[]
  faults: FaultAndTest[]
  purchases: PartPurchase[]
  documents: DocumentEntry[]
  expenses: ExpenseEntry[]
  reminders: Reminder[]
  reportExports: ReportExport[]
}
