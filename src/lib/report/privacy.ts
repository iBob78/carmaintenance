// Confidentialité — appliquée AVANT la mise en page (jamais seulement visuelle).
// Les champs masqués sont retirés des données transmises au générateur PDF :
// il est donc impossible qu'ils apparaissent dans le document final.

import type { ReportOptions } from './options'
import type { ReportSnapshot } from './snapshot'

export const MASK = '••••••••'

export interface PrivacyNotice {
  code: 'vin_masque' | 'plaque_masquee' | 'proprietaire_masque' | 'piece_jointe_exclue_confidentialite'
  message: string
}

export interface AppliedPrivacy {
  snapshot: ReportSnapshot
  notices: PrivacyNotice[]
}

/**
 * Règles :
 * - VIN / immatriculation / propriétaire : remplacés par un masque dans les données.
 * - Pièces jointes (factures, photos) : en cas de masquage des données
 *   personnelles, les factures sont EXCLUES de l'intégration au PDF car elles
 *   peuvent contenir nom, adresse ou coordonnées — et cette exclusion est
 *   explicitement signalée dans le rapport (jamais d'omission silencieuse).
 */
export function applyPrivacy(snapshot: ReportSnapshot, options: ReportOptions): AppliedPrivacy {
  const notices: PrivacyNotice[] = []
  const next: ReportSnapshot = JSON.parse(JSON.stringify(snapshot)) as ReportSnapshot

  if (options.maskVin && next.vehicle.vin) {
    next.vehicle.vin = MASK
    notices.push({
      code: 'vin_masque',
      message: 'Le numéro VIN a été masqué dans le rapport à la demande de l’utilisateur.',
    })
  }
  if (options.maskPlate && next.vehicle.immatriculation) {
    next.vehicle.immatriculation = MASK
    notices.push({
      code: 'plaque_masquee',
      message: 'L’immatriculation a été masquée dans le rapport à la demande de l’utilisateur.',
    })
  }
  if (options.maskOwner) {
    if (next.vehicle.ownerName) {
      next.vehicle.ownerName = MASK
      notices.push({
        code: 'proprietaire_masque',
        message:
          'Les données personnelles du propriétaire ont été masquées dans le rapport à la demande de l’utilisateur.',
      })
    }

    for (const att of next.attachments) {
      const selected = options.attachmentIds.includes(att.document.id)
      if (selected && att.document.kind === 'facture') {
        const inaccessible = !att.document.disponible
        att.included = false
        att.reason = inaccessible
          ? 'Exclue pour confidentialité : facture potentiellement porteuse de données personnelles (masquage actif) et fichier inaccessible — absence signalée, jamais omise silencieusement.'
          : 'Exclue pour confidentialité : les factures peuvent contenir des données personnelles (nom, adresse, coordonnées) et le masquage des données personnelles est actif.'
        notices.push({
          code: 'piece_jointe_exclue_confidentialite',
          message: `Pièce jointe « ${att.document.filename} » exclue pour confidentialité (facture).`,
        })
      }
    }
  }

  // Le PDF ne doit jamais contenir de données brutes dans ses métadonnées.
  next.privacyNotices = notices
  return { snapshot: next, notices }
}
