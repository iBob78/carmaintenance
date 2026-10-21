import type { Carburant, ExpenseCategory, FaultStatus, ServiceCategory, ServiceStatus } from './types'

// ---------------------------------------------------------------------------
// Catalogues de l'interface (libellés FR) + intervalles par défaut
// ---------------------------------------------------------------------------

export interface CategoryMeta {
  label: string
  short: string
  defaultKm: number | null
  defaultMonths: number | null
}

export const SERVICE_CATEGORIES: Record<ServiceCategory, CategoryMeta> = {
  vidange: { label: 'Vidange (huile moteur)', short: 'Vidange', defaultKm: 15000, defaultMonths: 12 },
  filtres: { label: 'Filtres (air, habitacle, carburant)', short: 'Filtres', defaultKm: 15000, defaultMonths: 12 },
  freins: { label: 'Freins (plaquettes / disques)', short: 'Freins', defaultKm: 30000, defaultMonths: 24 },
  pneus: { label: 'Pneumatiques', short: 'Pneus', defaultKm: 20000, defaultMonths: 24 },
  distribution: { label: 'Distribution (courroie / chaîne)', short: 'Distribution', defaultKm: 90000, defaultMonths: 72 },
  bougies: { label: 'Bougies d’allumage / préchauffage', short: 'Bougies', defaultKm: 60000, defaultMonths: 48 },
  liquides: { label: 'Liquides (refroidissement, frein, direction)', short: 'Liquides', defaultKm: 60000, defaultMonths: 48 },
  climatisation: { label: 'Climatisation', short: 'Climatisation', defaultKm: null, defaultMonths: 24 },
  batterie: { label: 'Batterie', short: 'Batterie', defaultKm: null, defaultMonths: 48 },
  controle_technique: { label: 'Contrôle technique', short: 'Contrôle technique', defaultKm: null, defaultMonths: 24 },
  transmission: { label: 'Boîte de vitesses / embrayage', short: 'Transmission', defaultKm: 60000, defaultMonths: 60 },
  suspension: { label: 'Suspension / amortisseurs', short: 'Suspension', defaultKm: 80000, defaultMonths: 60 },
  carrosserie: { label: 'Carrosserie', short: 'Carrosserie', defaultKm: null, defaultMonths: null },
  electricite: { label: 'Électricité / électronique', short: 'Électricité', defaultKm: null, defaultMonths: null },
  autre: { label: 'Autre entretien', short: 'Autre', defaultKm: null, defaultMonths: null },
}

export const SERVICE_CATEGORY_KEYS = Object.keys(SERVICE_CATEGORIES) as ServiceCategory[]

export const CARBURANT_LABELS: Record<Carburant, string> = {
  essence: 'Essence',
  diesel: 'Diesel',
  hybride: 'Hybride',
  electrique: 'Électrique',
  gpl: 'GPL',
  ethanol: 'Éthanol (E85)',
  autre: 'Autre',
}

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  effectue: 'Effectué',
  prevu: 'Prévu',
  annule: 'Annulé',
  non_realise: 'Non réalisé',
}

export const FAULT_STATUS_LABELS: Record<FaultStatus, string> = {
  ouvert: 'Ouvert',
  resolu: 'Résolu',
  reapparu: 'Réapparu',
  resolution_non_confirmee: 'Résolution non confirmée',
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  pieces: 'Pièces',
  consommables: 'Consommables',
  main_oeuvre: 'Main-d’œuvre',
  prestations: 'Prestations',
  assurance: 'Assurance',
  controle_technique: 'Contrôle technique',
  carburant: 'Carburant',
  autre: 'Autre',
}

export const SOURCE_LABELS = {
  declare: 'Déclaré par l’utilisateur',
  documente: 'Justifié par un document',
  verifie: 'Vérifié par un professionnel',
} as const

/** Intervalle par défaut adapté au carburant */
export function defaultInterval(
  categorie: ServiceCategory,
  carburant: Carburant,
): { km: number | null; mois: number | null } {
  const meta = SERVICE_CATEGORIES[categorie]
  let km = meta.defaultKm
  if (categorie === 'vidange' && carburant === 'electrique') km = null
  return { km, mois: meta.defaultMonths }
}
