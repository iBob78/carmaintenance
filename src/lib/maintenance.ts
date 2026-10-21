import type {
  AppData,
  Due,
  MaintenanceInterval,
  MaintenanceRecord,
  ServiceType,
  Vehicle,
} from '../types'
import {
  addMonthsISO,
  daysBetween,
  formatKm,
  monthsBetween,
  parseISO,
  todayISO,
  toISODate,
} from './utils'

// ---------------------------------------------------------------------------
// Catalogue des types d'entretien : libellé + intervalles par défaut
// (valeurs usuelles constructeur pour un véhicule essence/diesel récent)
// ---------------------------------------------------------------------------

export interface ServiceMeta {
  label: string
  short: string
  /** Icône lucide-react utilisée dans l'interface */
  icon: string
  defaultKm: number | null
  defaultMonths: number | null
  description: string
}

export const SERVICE_CATALOG: Record<ServiceType, ServiceMeta> = {
  vidange: {
    label: 'Vidange (huile moteur)',
    short: 'Vidange',
    icon: 'Droplets',
    defaultKm: 15000,
    defaultMonths: 12,
    description: 'Changement de l’huile moteur et du filtre à huile.',
  },
  filtre_habitacle: {
    label: 'Filtre à habitacle (pollen)',
    short: 'Filtre habitacle',
    icon: 'Wind',
    defaultKm: 15000,
    defaultMonths: 12,
    description: 'Renouvellement du filtre à pollen de la ventilation.',
  },
  filtre_air: {
    label: 'Filtre à air moteur',
    short: 'Filtre à air',
    icon: 'Wind',
    defaultKm: 30000,
    defaultMonths: 24,
    description: 'Renouvellement du filtre à air du moteur.',
  },
  freins: {
    label: 'Freins (plaquettes / disques)',
    short: 'Freins',
    icon: 'Disc3',
    defaultKm: 30000,
    defaultMonths: 24,
    description: 'Contrôle et remplacement des plaquettes et disques de frein.',
  },
  pneus: {
    label: 'Pneumatiques',
    short: 'Pneus',
    icon: 'CircleDot',
    defaultKm: 20000,
    defaultMonths: 24,
    description: 'Rotation, contrôle de l’usure et changement des pneus.',
  },
  distribution: {
    label: 'Distribution (courroie / chaîne)',
    short: 'Distribution',
    icon: 'Settings2',
    defaultKm: 90000,
    defaultMonths: 72,
    description: 'Remplacement de la courroie ou chaîne de distribution (selon préconisation).',
  },
  bougies: {
    label: 'Bougies d’allumage / préchauffage',
    short: 'Bougies',
    icon: 'Zap',
    defaultKm: 60000,
    defaultMonths: 48,
    description: 'Remplacement des bougies (essence) ou bougies de préchauffage (diesel).',
  },
  liquide_refroidissement: {
    label: 'Liquide de refroidissement',
    short: 'Liquide de refroid.',
    icon: 'Thermometer',
    defaultKm: 60000,
    defaultMonths: 48,
    description: 'Vidange et renouvellement du circuit de refroidissement.',
  },
  climatisation: {
    label: 'Climatisation',
    short: 'Climatisation',
    icon: 'Snowflake',
    defaultKm: null,
    defaultMonths: 24,
    description: 'Contrôle de la charge de gaz et désinfection du circuit.',
  },
  batterie: {
    label: 'Batterie',
    short: 'Batterie',
    icon: 'BatteryCharging',
    defaultKm: null,
    defaultMonths: 48,
    description: 'Contrôle de l’état de charge et remplacement de la batterie.',
  },
  controle_technique: {
    label: 'Contrôle technique',
    short: 'Contrôle technique',
    icon: 'ClipboardCheck',
    defaultKm: null,
    defaultMonths: 24,
    description: 'Contrôle technique périodique obligatoire (tous les 2 ans).',
  },
  boite_vitesses: {
    label: 'Boîte de vitesses',
    short: 'Boîte de vitesses',
    icon: 'Cog',
    defaultKm: 60000,
    defaultMonths: 60,
    description: 'Vidange de boîte automatique ou manuelle (selon préconisation).',
  },
  amortisseurs: {
    label: 'Amortisseurs',
    short: 'Amortisseurs',
    icon: 'MoveVertical',
    defaultKm: 80000,
    defaultMonths: 60,
    description: 'Contrôle et remplacement des amortisseurs.',
  },
  autre: {
    label: 'Autre entretien',
    short: 'Autre',
    icon: 'Wrench',
    defaultKm: null,
    defaultMonths: null,
    description: 'Entretien personnalisé : précisez le libellé.',
  },
}

export const SERVICE_TYPES = Object.keys(SERVICE_CATALOG) as ServiceType[]

export function serviceLabel(type: ServiceType, custom?: string): string {
  if (type === 'autre' && custom && custom.trim()) return custom.trim()
  return SERVICE_CATALOG[type].label
}

/** Intervalle par défaut pour un type, adapté au carburant */
export function defaultInterval(type: ServiceType, carburant: Vehicle['carburant']): { km: number | null; mois: number | null } {
  const meta = SERVICE_CATALOG[type]
  let km = meta.defaultKm
  const mois = meta.defaultMonths
  if (type === 'vidange') {
    if (carburant === 'diesel') km = 15000
    if (carburant === 'electrique') km = null // pas de vidange moteur
    if (carburant === 'hybride') km = 15000
  }
  return { km, mois }
}

// ---------------------------------------------------------------------------
// Calculs d'échéances
// ---------------------------------------------------------------------------

/** Dernière prestation d'un type pour un véhicule */
export function lastRecordFor(records: MaintenanceRecord[], vehicleId: string, type: ServiceType): MaintenanceRecord | null {
  const list = records.filter((r) => r.vehicleId === vehicleId && r.type === type)
  if (list.length === 0) return null
  return list.slice().sort((a, b) => (a.date === b.date ? b.kilometrage - a.kilometrage : a.date < b.date ? 1 : -1))[0]
}

/** Rythme moyen mensuel estimé (km/mois) à partir de l'historique du véhicule */
export function avgKmPerMonth(vehicle: Vehicle, records: MaintenanceRecord[]): number {
  const list = records
    .filter((r) => r.vehicleId === vehicle.id)
    .slice()
    .sort((a, b) => (a.date === b.date ? a.kilometrage - b.kilometrage : a.date < b.date ? -1 : 1))
  if (list.length >= 2) {
    const first = list[0]
    const last = list[list.length - 1]
    const months = monthsBetween(first.date, last.date)
    const km = last.kilometrage - first.kilometrage
    if (months >= 1 && km > 0) return Math.max(50, Math.round(km / months))
  }
  // Repli : estimation standard 1 000 km/mois
  return 1000
}

function urgencyOf(kmRemaining: number | null, daysRemaining: number | null): Due['urgency'] {
  const kmUrgent = kmRemaining !== null && kmRemaining <= 500
  const kmSoon = kmRemaining !== null && kmRemaining <= 1500
  const dayUrgent = daysRemaining !== null && daysRemaining <= 15
  const daySoon = daysRemaining !== null && daysRemaining <= 30
  if (kmUrgent || dayUrgent) return 'urgent'
  if (kmSoon || daySoon) return 'soon'
  return 'ok'
}

/** Calcule l'échéance d'un type pour un véhicule */
export function computeDue(
  vehicle: Vehicle,
  interval: MaintenanceInterval,
  records: MaintenanceRecord[],
): Due | null {
  if (!interval.actif) return null
  const today = todayISO()
  const last = lastRecordFor(records, vehicle.id, interval.type)

  let dueKm: number | null = null
  let dueDate: string | null = null

  if (interval.intervalleKm != null) {
    const base = last ? last.kilometrage : 0
    dueKm = base + interval.intervalleKm
    // Jamais enregistré et seuil déjà dépassé : on planifie la prochaine
    // occurrence du cycle (révision périodique) au lieu d'afficher « en retard ».
    if (!last && vehicle.kilometrage > dueKm) {
      dueKm = Math.ceil(vehicle.kilometrage / interval.intervalleKm) * interval.intervalleKm
    }
  }
  if (interval.intervalleMois != null) {
    const base = last ? last.date : vehicle.dateCirculation ?? today
    dueDate = addMonthsISO(base, interval.intervalleMois)
    if (!last && dueDate < today) {
      const elapsed = monthsBetween(base, today)
      const cycles = Math.ceil(elapsed / interval.intervalleMois)
      dueDate = addMonthsISO(base, cycles * interval.intervalleMois)
    }
  }

  // Aucun déclencheur → pas d'échéance utile
  if (dueKm == null && dueDate == null) return null

  const kmRemaining = dueKm != null ? dueKm - vehicle.kilometrage : null
  const daysRemaining = dueDate != null ? daysBetween(today, dueDate) : null

  // Date estimée d'atteinte du seuil km
  let projectedDate: string | null = null
  if (dueKm != null && kmRemaining != null && kmRemaining > 0) {
    const rate = avgKmPerMonth(vehicle, records)
    const months = kmRemaining / rate
    projectedDate = addMonthsISO(today, Math.round(months))
  } else if (dueKm != null && (kmRemaining ?? 0) <= 0) {
    projectedDate = today
  }

  const urgency = urgencyOf(kmRemaining, daysRemaining)

  return {
    type: interval.type,
    label: serviceLabel(interval.type, last?.libelle),
    vehicleId: vehicle.id,
    dueDate,
    dueKm,
    kmRemaining,
    daysRemaining,
    projectedDate,
    urgency,
    lastRecord: last,
  }
}

/** Toutes les échéances d'un véhicule, triées par urgence puis par proximité */
export function duesForVehicle(vehicle: Vehicle, data: AppData): Due[] {
  const intervals = data.intervals.filter((i) => i.vehicleId === vehicle.id)
  const dues: Due[] = []
  for (const interval of intervals) {
    const due = computeDue(vehicle, interval, data.records)
    if (due) dues.push(due)
  }
  return dues.sort((a, b) => {
    const order = { urgent: 0, soon: 1, ok: 2 }
    if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency]
    const aKey = a.kmRemaining ?? Number.MAX_SAFE_INTEGER
    const bKey = b.kmRemaining ?? Number.MAX_SAFE_INTEGER
    return aKey - bKey
  })
}

/** Prochaine échéance tous véhicules confondus */
export function nextDues(data: AppData, limit = 6): Due[] {
  const all: Due[] = []
  for (const vehicle of data.vehicles) {
    all.push(...duesForVehicle(vehicle, data))
  }
  return all.sort((a, b) => {
    const score = (d: Due) => {
      const kmScore = d.kmRemaining != null ? d.kmRemaining / 50 : Number.MAX_SAFE_INTEGER / 2
      const dayScore = d.daysRemaining != null ? d.daysRemaining : Number.MAX_SAFE_INTEGER / 2
      return Math.min(kmScore, dayScore)
    }
    return score(a) - score(b)
  }).slice(0, limit)
}

// ---------------------------------------------------------------------------
// Calendrier de révisions périodiques (agenda projeté)
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  due: Due
  vehicle: Vehicle
  /** Date retenue pour l'agenda : la plus contraignante (km estimé OU date) */
  date: string
  source: 'km' | 'date' | 'km+date'
}

/**
 * Construit l'agenda des prochaines révisions, sur `horizonMonths` mois.
 * Pour chaque échéance, on retient la contrainte la plus proche :
 * la date prévue (intervalle de mois) ou la date estimée d'atteinte du seuil km.
 */
export function buildCalendar(data: AppData, horizonMonths = 12): CalendarEvent[] {
  const today = todayISO()
  const end = addMonthsISO(today, horizonMonths)
  const events: CalendarEvent[] = []

  for (const vehicle of data.vehicles) {
    for (const due of duesForVehicle(vehicle, data)) {
      const candidates: Array<{ date: string; source: CalendarEvent['source'] }> = []
      if (due.dueDate) candidates.push({ date: due.dueDate, source: 'date' })
      if (due.projectedDate) candidates.push({ date: due.projectedDate, source: 'km' })
      else if (due.dueKm != null && due.projectedDate === null && (due.kmRemaining ?? 0) <= 0) {
        candidates.push({ date: today, source: 'km' })
      }
      if (candidates.length === 0) continue

      // On retient la contrainte la plus proche (la première qui oblige à agir)
      candidates.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      const best = candidates[0]
      const source: CalendarEvent['source'] =
        candidates.length > 1 && candidates[0].date === candidates[1].date
          ? 'km+date'
          : best.source

      if (best.date < today) {
        events.push({ due, vehicle, date: today, source })
      } else if (best.date <= end) {
        events.push({ due, vehicle, date: best.date, source })
      } else {
        // Échéance plus lointaine : visible mais marquée hors horizon
        events.push({ due, vehicle, date: best.date, source })
      }
    }
  }

  return events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

// ---------------------------------------------------------------------------
// Statistiques
// ---------------------------------------------------------------------------

export function totalCost(records: MaintenanceRecord[], sinceISO?: string): number {
  return records
    .filter((r) => !sinceISO || r.date >= sinceISO)
    .reduce((sum, r) => sum + (r.cout ?? 0), 0)
}

export function vehicleLabel(v: Vehicle): string {
  return v.nom || `${v.marque} ${v.modele}`
}

/** Titre court pour une échéance : « Vidange — dans 2 100 km » */
export function formatDueTitle(due: Due): string {
  return due.label
}

export function describeDue(due: Due): string {
  const parts: string[] = []
  if (due.kmRemaining != null) {
    parts.push(
      due.kmRemaining > 0
        ? `dans ${formatKm(due.kmRemaining)}`
        : `dépassé de ${formatKm(Math.abs(due.kmRemaining))}`,
    )
  }
  if (due.daysRemaining != null) {
    parts.push(
      due.daysRemaining > 0
        ? `dans ${due.daysRemaining} jour${due.daysRemaining > 1 ? 's' : ''}`
        : `dépassé de ${Math.abs(due.daysRemaining)} jour${Math.abs(due.daysRemaining) > 1 ? 's' : ''}`,
    )
  }
  return parts.join(' · ')
}

/** « Dans 2 mois » / « Le 12 mars 2026 » pour une date ISO */
export function relativeDate(iso: string): string {
  const today = todayISO()
  const days = daysBetween(today, iso)
  if (days < 0) return `il y a ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`
  if (days === 0) return "aujourd'hui"
  if (days < 31) return `dans ${days} jour${days > 1 ? 's' : ''}`
  const months = Math.round(days / 30.44)
  if (months < 18) return `dans ${months} mois`
  const years = Math.round(months / 12)
  return `dans ${years} an${years > 1 ? 's' : ''}`
}

export function nextServiceDateForAgenda(events: CalendarEvent[], withinMonths = 3): CalendarEvent[] {
  const end = addMonthsISO(todayISO(), withinMonths)
  return events.filter((e) => e.date <= end)
}

export function isOverdue(due: Due): boolean {
  return (due.kmRemaining != null && due.kmRemaining <= 0) || (due.daysRemaining != null && due.daysRemaining <= 0)
}

export function upcomingDateLabel(iso: string): string {
  return toISODate(parseISO(iso))
}
