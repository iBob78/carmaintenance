import type { AppData, MaintenanceInterval, MaintenanceRecord, ServiceType, Vehicle } from '../types'
import { SERVICE_TYPES, defaultInterval } from './maintenance'
import { uid } from './utils'

const STORAGE_KEY = 'autocarnet.data.v1'

export const EMPTY_DATA: AppData = {
  vehicles: [],
  records: [],
  intervals: [],
  version: 1,
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_DATA }
    const parsed = JSON.parse(raw) as AppData
    return {
      vehicles: parsed.vehicles ?? [],
      records: parsed.records ?? [],
      intervals: parsed.intervals ?? [],
      version: 1,
    }
  } catch {
    return { ...EMPTY_DATA }
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Génère les intervalles par défaut pour un nouveau véhicule */
export function buildDefaultIntervals(vehicleId: string, carburant: Vehicle['carburant']): MaintenanceInterval[] {
  return SERVICE_TYPES.map((type) => {
    const { km, mois } = defaultInterval(type, carburant)
    return {
      vehicleId,
      type,
      intervalleKm: km,
      intervalleMois: mois,
      // Pas de vidange moteur sur un véhicule électrique
      actif: !(type === 'autre' || (type === 'vidange' && carburant === 'electrique')),
    }
  })
}

// ---------------------------------------------------------------------------
// Import / Export JSON
// ---------------------------------------------------------------------------

export function exportJSON(data: AppData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)
}

export function importJSON(raw: string): AppData {
  const parsed = JSON.parse(raw) as AppData
  if (!Array.isArray(parsed.vehicles) || !Array.isArray(parsed.records)) {
    throw new Error('Format de fichier invalide')
  }
  return {
    vehicles: parsed.vehicles,
    records: parsed.records,
    intervals: parsed.intervals ?? [],
    version: 1,
  }
}

// ---------------------------------------------------------------------------
// Données de démonstration (premier lancement)
// ---------------------------------------------------------------------------

export function seedData(): AppData {
  const v1: Vehicle = {
    id: uid(),
    nom: 'Ma Clio',
    marque: 'Renault',
    modele: 'Clio IV 1.2 TCe',
    annee: 2018,
    immatriculation: 'AB-123-CD',
    carburant: 'essence',
    kilometrage: 87400,
    dateCirculation: '2018-06-12',
    couleur: '#4f46e5',
  }
  const v2: Vehicle = {
    id: uid(),
    nom: 'Le 3008',
    marque: 'Peugeot',
    modele: '3008 BlueHDi 130',
    annee: 2020,
    immatriculation: 'EF-456-GH',
    carburant: 'diesel',
    kilometrage: 62150,
    dateCirculation: '2020-03-02',
    couleur: '#0d9488',
  }

  const r = (
    vehicleId: string,
    type: ServiceType,
    date: string,
    kilometrage: number,
    cout: number,
    garage: string,
    notes = '',
  ): MaintenanceRecord => ({
    id: uid(),
    vehicleId,
    type,
    libelle: '',
    date,
    kilometrage,
    cout,
    garage,
    notes,
  })

  const records: MaintenanceRecord[] = [
    // Clio
    r(v1.id, 'vidange', '2024-04-18', 62300, 89, 'Garage AutoPlus', 'Huile 5W30 + filtre'),
    r(v1.id, 'freins', '2024-08-05', 68100, 180, 'Garage AutoPlus', 'Plaquettes avant'),
    r(v1.id, 'vidange', '2025-03-22', 75800, 95, 'Garage AutoPlus', 'Huile 5W30 + filtre'),
    r(v1.id, 'filtre_habitacle', '2025-03-22', 75800, 25, 'Garage AutoPlus'),
    r(v1.id, 'controle_technique', '2025-06-14', 80200, 85, 'Centre CT Saint-Ouen', 'Sans contre-visite'),
    r(v1.id, 'vidange', '2026-02-10', 84900, 95, 'Garage AutoPlus', 'Huile 5W30 + filtre'),
    r(v1.id, 'pneus', '2026-02-10', 84900, 420, 'Pneus Express', '4 pneus Michelin'),
    // 3008
    r(v2.id, 'vidange', '2024-11-08', 41200, 120, 'Concession Peugeot', 'Révision 40 000 km'),
    r(v2.id, 'filtre_air', '2024-11-08', 41200, 45, 'Concession Peugeot'),
    r(v2.id, 'controle_technique', '2025-09-30', 52800, 85, 'Centre CT Boulogne', 'RAS'),
    r(v2.id, 'vidange', '2026-01-25', 58400, 125, 'Concession Peugeot', 'Révision 60 000 km anticipée'),
    r(v2.id, 'freins', '2026-01-25', 58400, 240, 'Concession Peugeot', 'Plaquettes + disques avant'),
    r(v2.id, 'climatisation', '2026-04-02', 60300, 90, 'Clim Auto Paris', 'Recharge gaz'),
  ]

  const intervals: MaintenanceInterval[] = [
    ...buildDefaultIntervals(v1.id, v1.carburant),
    ...buildDefaultIntervals(v2.id, v2.carburant),
  ]

  return { vehicles: [v1, v2], records, intervals, version: 1 }
}
