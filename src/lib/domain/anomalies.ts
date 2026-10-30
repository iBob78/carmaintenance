// Détection d'anomalies et d'incohérences.
// RÈGLE FONDAMENTALE : on signale, on ne corrige JAMAIS automatiquement.
// L'utilisateur reste maître de ses données ; le rapport PDF affiche
// explicitement chaque anomalie détectée.

import type { Anomaly, AppDatabase } from './types'
import { todayISO } from './format'

// Identifiant DÉTERMINISTE : deux exécutions sur les mêmes données produisent
// les mêmes identifiants — indispensable à la reproductibilité des exports.
function anomaly(
  code: Anomaly['code'],
  severity: Anomaly['severity'],
  message: string,
  context?: Anomaly['context'],
): Anomaly {
  const ctxKey = context ? Object.values(context).join('-') : ''
  let hash = 0
  for (let i = 0; i < message.length; i++) {
    hash = (hash * 31 + message.charCodeAt(i)) >>> 0
  }
  return {
    id: `${code}-${ctxKey || hash.toString(36)}`,
    code,
    severity,
    message,
    context,
  }
}

export function detectAnomalies(db: AppDatabase, vehicleId: string): Anomaly[] {
  const out: Anomaly[] = []
  const vehicle = db.vehicles.find((v) => v.id === vehicleId)
  if (!vehicle) return out

  const today = todayISO()

  // --- Relevés kilométriques -------------------------------------------------
  const readings = db.odometerReadings
    .filter((r) => r.vehicleId === vehicleId)
    .slice()
    .sort((a, b) => (a.date === b.date ? a.valeurKm - b.valeurKm : a.date < b.date ? -1 : 1))

  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1]
    const cur = readings[i]
    if (cur.valeurKm < prev.valeurKm) {
      out.push(
        anomaly(
          'km_diminue',
          'incoherence',
          `Relevé kilométrique incohérent : ${cur.valeurKm.toLocaleString('fr-FR')} km le ${cur.date} est inférieur au relevé précédent (${prev.valeurKm.toLocaleString('fr-FR')} km le ${prev.date}). Donnée non corrigée.`,
          { readingId: cur.id, date: cur.date },
        ),
      )
    }
  }

  if (readings.length === 0) {
    out.push(
      anomaly(
        'donnee_manquante',
        'avertissement',
        'Aucun relevé kilométrique daté enregistré : les estimations d’échéances sont moins fiables.',
      ),
    )
  }

  // --- Interventions --------------------------------------------------------
  const records = db.serviceRecords.filter((r) => r.vehicleId === vehicleId)
  const minKm = readings.length > 0 ? readings[0].valeurKm : null
  const maxKm = readings.length > 0 ? readings[readings.length - 1].valeurKm : null

  for (const r of records) {
    if (r.date > today) {
      out.push(
        anomaly(
          'date_future',
          'avertissement',
          `L’intervention « ${r.titre} » est datée dans le futur (${r.date}).`,
          { serviceRecordId: r.id },
        ),
      )
    }
    if (minKm !== null && maxKm !== null && r.statut === 'effectue') {
      if (r.kilometrage > maxKm + 500) {
        out.push(
          anomaly(
            'km_hors_plage',
            'avertissement',
            `L’intervention « ${r.titre} » (${r.kilometrage.toLocaleString('fr-FR')} km) dépasse le dernier relevé kilométrique connu (${maxKm.toLocaleString('fr-FR')} km). Donnée non corrigée.`,
            { serviceRecordId: r.id },
          ),
        )
      }
      if (r.kilometrage < minKm - 500) {
        out.push(
          anomaly(
            'km_hors_plage',
            'avertissement',
            `L’intervention « ${r.titre} » (${r.kilometrage.toLocaleString('fr-FR')} km) est antérieure au premier relevé kilométrique connu (${minKm.toLocaleString('fr-FR')} km). Donnée non corrigée.`,
            { serviceRecordId: r.id },
          ),
        )
      }
    }
    if (r.coutTotal !== undefined && r.coutTotal < 0) {
      out.push(
        anomaly(
          'cout_incoherent',
          'incoherence',
          `L’intervention « ${r.titre} » a un coût négatif (${r.coutTotal} €).`,
          { serviceRecordId: r.id },
        ),
      )
    }
    // Cohérence coût déclaré vs somme des lignes
    const items = db.serviceRecordItems.filter((i) => i.serviceRecordId === r.id)
    if (items.length > 0 && r.coutTotal !== undefined) {
      const sum = items.reduce((s, i) => s + (i.prixTotal ?? 0), 0)
      if (Math.abs(sum - r.coutTotal) > 0.05) {
        out.push(
          anomaly(
            'cout_incoherent',
            'incoherence',
            `L’intervention « ${r.titre} » : la somme des lignes (${sum.toFixed(2)} €) diffère du coût total déclaré (${r.coutTotal.toFixed(2)} €). Données non corrigées.`,
            { serviceRecordId: r.id },
          ),
        )
      }
    }
    // Justificatif annoncé mais absent
    if (r.documentId) {
      const doc = db.documents.find((d) => d.id === r.documentId)
      if (!doc) {
        out.push(
          anomaly(
            'document_manquant',
            'incoherence',
            `Le justificatif référencé par l’intervention « ${r.titre} » est introuvable.`,
            { serviceRecordId: r.id },
          ),
        )
      }
    }
  }

  // --- Doublons possibles ---------------------------------------------------
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const a = records[i]
      const b = records[j]
      if (
        a.date === b.date &&
        a.kilometrage === b.kilometrage &&
        a.categorie === b.categorie &&
        a.titre.trim().toLowerCase() === b.titre.trim().toLowerCase()
      ) {
        out.push(
          anomaly(
            'doublon_possible',
            'avertissement',
            `Deux interventions semblent identiques (« ${a.titre} », ${a.date}, ${a.kilometrage} km). Vérifiez qu’il ne s’agit pas d’un doublon.`,
            { serviceRecordId: a.id },
          ),
        )
      }
    }
  }

  // --- Documents ------------------------------------------------------------
  const unavailable = db.documents.filter((x) => x.vehicleId === vehicleId && !x.disponible)
  if (unavailable.length > 0) {
    out.push(
      anomaly(
        'document_manquant',
        'avertissement',
        `${unavailable.length} justificatif(s) sont référencés mais leur fichier n’est pas accessible depuis cet environnement (stockage de démonstration). Les pièces jointes sélectionnées ne sont jamais omises silencieusement : leur absence est signalée dans le rapport.`,
        { count: unavailable.length },
      ),
    )
  }

  // --- Dépenses -------------------------------------------------------------
  for (const e of db.expenses.filter((x) => x.vehicleId === vehicleId)) {
    if (e.remboursement !== undefined && e.remboursement > e.montant) {
      out.push(
        anomaly(
          'remboursement_superieur',
          'incoherence',
          `La dépense « ${e.libelle} » a un remboursement (${e.remboursement.toFixed(2)} €) supérieur au montant payé (${e.montant.toFixed(2)} €).`,
          { expenseId: e.id },
        ),
      )
    }
  }

  return out
}

/** Champs obligatoires manquants pour le rapport (n'invente jamais de données) */
export function missingVehicleFields(vehicle: AppDatabase['vehicles'][number]): string[] {
  const missing: string[] = []
  if (!vehicle.vin) missing.push('VIN')
  if (!vehicle.immatriculation) missing.push('immatriculation')
  if (!vehicle.premiereImmatriculation) missing.push('date de première immatriculation')
  if (!vehicle.dateAcquisition) missing.push('date d’acquisition')
  if (!vehicle.motorisation) missing.push('motorisation')
  return missing
}
