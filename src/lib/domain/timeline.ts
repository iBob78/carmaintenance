/**
 * Chronologie « entretiens faits / à faire » pour la fiche véhicule.
 *
 * Fusionne deux sources enregistrées — jamais d'estimation inventée :
 *  - les `ServiceRecord` réalisés (statut `effectue`) et planifiés (`prevu`) ;
 *  - les échéances calculées (`duesForVehicle` : tâches de maintenance + rappels).
 *
 * Les dates sont stockées en ISO (modèle de données) mais **affichées en
 * JJ/MM/AAAA** via `formatDate` — règle d'affichage du projet.
 */

import { duesForVehicle } from './due'
import { formatDate, formatKm, todayISO } from './format'
import type { AppDatabase, DueUrgency, ServiceCategory, ServiceRecord } from './types'

export type TimelineEtat = 'effectue' | 'prevu' | DueUrgency

export interface TimelineEntry {
  id: string
  sens: 'fait' | 'a_faire'
  /** Date ISO du fait, ou échéance/estimation pour l'avenir — null si inconnue */
  date: string | null
  /** Kilométrage réalisé ou ciblé — null si inconnu */
  km: number | null
  libelle: string
  categorie: ServiceCategory
  /** Ligne de contexte déjà prête à afficher (toujours en français) */
  detail: string
  etat: TimelineEtat
}

function detailFait(r: ServiceRecord): string {
  const qui =
    r.realisateur === 'garage'
      ? r.garage
        ? `Garage ${r.garage}`
        : 'Garage'
      : r.realisateur === 'professionnel'
        ? 'Professionnel'
        : 'Propriétaire'
  return `Réalisé par ${qui}`
}

function detailPrevu(r: ServiceRecord): string {
  return `Intervention planifiée · ${formatDate(r.date)}`
}

function detailAFaire(d: {
  dueKm?: number
  dueDate?: string
  urgency: DueUrgency
  lastRecord?: ServiceRecord
}): string {
  const bits: string[] = []
  if (d.urgency === 'retard') bits.push('En retard')
  else if (d.urgency === 'urgent') bits.push('À prévoir très bientôt')
  else if (d.urgency === 'bientot') bits.push('Échéance proche')
  if (d.dueDate) bits.push(`Échéance : ${formatDate(d.dueDate)}`)
  if (d.dueKm != null) bits.push(`Cible : ${formatKm(d.dueKm)}`)
  if (bits.length === 0) bits.push('À planifier')
  return bits.join(' · ')
}

/** Date de tri : les faits sans date en tête, l'avenir sans date en queue. */
function sortKeyDate(e: TimelineEntry): string {
  if (e.date) return e.date
  return e.sens === 'fait' ? '0000-00-00' : '9999-99-99'
}

export function timelineForVehicle(db: AppDatabase, vehicleId: string): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  for (const r of db.serviceRecords) {
    if (r.vehicleId !== vehicleId) continue
    if (r.statut === 'effectue') {
      entries.push({
        id: r.id,
        sens: 'fait',
        date: r.date,
        km: r.kilometrage,
        libelle: r.titre,
        categorie: r.categorie,
        detail: detailFait(r),
        etat: 'effectue',
      })
    } else if (r.statut === 'prevu') {
      entries.push({
        id: r.id,
        sens: 'a_faire',
        date: r.date,
        km: r.kilometrage,
        libelle: r.titre,
        categorie: r.categorie,
        detail: detailPrevu(r),
        etat: 'prevu',
      })
    }
  }

  const dues = duesForVehicle(db, vehicleId)
  dues.forEach((d, i) => {
    entries.push({
      id: `due-${i}-${d.categorie}`,
      sens: 'a_faire',
      date: d.dueDate ?? d.projectedDate ?? null,
      km: d.dueKm ?? null,
      libelle: d.libelle,
      categorie: d.categorie,
      detail: detailAFaire(d),
      etat: d.urgency,
    })
  })

  entries.sort((a, b) => {
    const da = sortKeyDate(a)
    const dbKey = sortKeyDate(b)
    if (da !== dbKey) return da < dbKey ? -1 : 1
    if (a.sens !== b.sens) return a.sens === 'fait' ? -1 : 1
    return (a.km ?? 0) - (b.km ?? 0)
  })

  return entries
}

/**
 * Position (index d'insertion) du séparateur « Aujourd'hui » : juste avant la
 * première entrée strictement future. Retourne `entries.length` si tout est
 * passé (ou vide), `0` si tout est à venir.
 */
export function todaySplitIndex(entries: TimelineEntry[], today = todayISO()): number {
  const first = entries.findIndex((e) => {
    const d = e.date ?? (e.sens === 'fait' ? '0000-00-00' : '9999-99-99')
    return d > today
  })
  return first === -1 ? entries.length : first
}
