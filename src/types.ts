// Modèle de données AutoCarnet

export type Carburant = 'essence' | 'diesel' | 'hybride' | 'electrique' | 'gpl' | 'autre'

export type ServiceType =
  | 'vidange'
  | 'filtre_habitacle'
  | 'filtre_air'
  | 'freins'
  | 'pneus'
  | 'distribution'
  | 'bougies'
  | 'liquide_refroidissement'
  | 'climatisation'
  | 'batterie'
  | 'controle_technique'
  | 'boite_vitesses'
  | 'amortisseurs'
  | 'autre'

export interface Vehicle {
  id: string
  nom: string
  marque: string
  modele: string
  annee: number
  immatriculation: string
  carburant: Carburant
  /** Kilométrage actuel affiché au compteur */
  kilometrage: number
  /** Date de mise en circulation (optionnel) */
  dateCirculation?: string
  /** Couleur d'accent du véhicule dans l'interface */
  couleur: string
}

export interface MaintenanceRecord {
  id: string
  vehicleId: string
  type: ServiceType
  /** Libellé personnalisé (surtout pour le type « autre ») */
  libelle: string
  /** Date ISO yyyy-mm-dd */
  date: string
  kilometrage: number
  cout?: number
  garage?: string
  notes?: string
}

/** Intervalle de révision périodique pour un type d'entretien d'un véhicule */
export interface MaintenanceInterval {
  vehicleId: string
  type: ServiceType
  /** Intervalle en km (null = pas de déclencheur kilométrique) */
  intervalleKm: number | null
  /** Intervalle en mois (null = pas de déclencheur temporel) */
  intervalleMois: number | null
  /** Inclure ce type dans le plan de révision du véhicule */
  actif: boolean
}

export interface AppData {
  vehicles: Vehicle[]
  records: MaintenanceRecord[]
  intervals: MaintenanceInterval[]
  /** Version du schéma pour migrations futures */
  version: 1
}

/** Échéance calculée pour un type d'entretien */
export interface Due {
  type: ServiceType
  label: string
  vehicleId: string
  /** Date à laquelle l'échéance est dépassée (km OU date, la plus proche) */
  dueDate: string | null
  dueKm: number | null
  /** Reste à parcourir (km) — négatif si dépassé */
  kmRemaining: number | null
  /** Jours restants — négatif si dépassé */
  daysRemaining: number | null
  /** Date estimée d'atteinte du seuil km (selon la consommation mensuelle) */
  projectedDate: string | null
  /** 'ok' | 'soon' (dans moins de 30 jours ou 1 500 km) | 'urgent' (dépassé ou < 15 j / 500 km) */
  urgency: 'ok' | 'soon' | 'urgent'
  lastRecord: MaintenanceRecord | null
}
