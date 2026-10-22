// Lecture d'une facture d'entretien à partir du texte extrait par OCR.
// Comme pour la carte grise : proposition uniquement, l'utilisateur valide
// chaque valeur avant intégration à la fiche d'intervention.

import { normalizeDate, normalizeNumber } from './carte-grise'
import type { ServiceCategory, ItemKind } from '@/lib/domain/types'

export interface ScanValue<T = string> {
  value: string
  normalized?: T
  confidence: 'haute' | 'moyenne' | 'faible'
  note?: string
}

export interface FactureLigne {
  libelle: string
  montant: string
}

export interface FactureScan {
  date?: ScanValue<string>
  fournisseur?: ScanValue<string>
  montantHT?: ScanValue<number>
  montantTTC?: ScanValue<number>
  tva?: ScanValue<number>
  kilometrage?: ScanValue<number>
  lignes: FactureLigne[]
  /** Fragments non interprétés — signalés, jamais masqués */
  nonInterpretes: string[]
}

// Montant : symbole monétaire OU forme avec centimes (« 220,49 »).
// Les entiers purs (« 84 900 km ») ne sont jamais des montants.
const MONEY = /(\d{1,3}(?:[\s\u00a0]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)/gi
const MONEY_SHAPE = /\b(\d{1,3}(?:[\s\u00a0]\d{3})*[.,]\d{2})\b/gi

function montants(texte: string): Array<{ brut: string; n: number; idx: number }> {
  const out: Array<{ brut: string; n: number; idx: number }> = []
  const vus = new Set<number>()
  // Montants avec symbole monétaire
  for (const m of texte.matchAll(MONEY)) {
    const n = normalizeNumber(m[1])
    if (n !== undefined) {
      out.push({ brut: m[1].trim(), n, idx: m.index ?? 0 })
      vus.add(m.index ?? 0)
    }
  }
  // Forme monétaire sans symbole (« 220,49 ») — jamais les entiers (« 84 900 km »)
  for (const m of texte.matchAll(MONEY_SHAPE)) {
    if (vus.has(m.index ?? 0)) continue
    const n = normalizeNumber(m[1])
    if (n !== undefined) out.push({ brut: m[1].trim(), n, idx: m.index ?? 0 })
  }
  return out.sort((a, b) => a.idx - b.idx)
}

const sansAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Dernier montant d'une ligne portant le mot-clé (HT, TVA, TTC…). */
function montantSurLigne(lignes: string[], motif: RegExp): { brut: string; n: number } | undefined {
  for (const ligne of lignes) {
    if (!motif.test(ligne)) continue
    const ms = [...ligne.matchAll(/(\d{1,3}(?:[\s\u00a0]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)?/gi)]
    const utiles = ms.filter((m) => /[.,]\d{2}|€|EUR/i.test(m[0]))
    const m = utiles[utiles.length - 1]
    if (!m) continue
    const n = normalizeNumber(m[1])
    if (n !== undefined) return { brut: m[1].trim(), n }
  }
  return undefined
}

const MOTS_MARQUE = /\b(sarl|eurl|sas|sasu|garage|garages|atelier|auto|autos|mécanique|mecanique|quick service|centre auto)\b/i

/** Analyse le texte OCR d'une facture d'entretien. */
export function parseFacture(text: string): FactureScan {
  const lignes = text.split(/\r?\n/).map((l) => l.trim())
  const lignesNonVides = lignes.filter((l) => l.length > 0)
  const result: FactureScan = { lignes: [], nonInterpretes: [] }

  // --- Date : près du mot « date », sinon la première date plausible
  const idxDate = sansAccents(text).indexOf('date')
  const dates: Array<{ brut: string; iso: string; idx: number }> = []
  for (const m of text.matchAll(/\b(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}|\d{1,2}\s+[a-zûé]+\s+\d{4})\b/gi)) {
    const iso = normalizeDate(m[1])
    if (iso) dates.push({ brut: m[1], iso, idx: m.index ?? 0 })
  }
  if (dates.length > 0) {
    let choisie = dates[0]
    if (idxDate !== -1) {
      let dMin = Infinity
      for (const d of dates) {
        const dist = Math.abs(d.idx - idxDate)
        if (dist < dMin && dist < 60) {
          dMin = dist
          choisie = d
        }
      }
    }
    result.date = { value: choisie.brut, normalized: choisie.iso, confidence: 'haute' }
  }

  // --- Montants HT / TVA / TTC (par ligne portant le mot-clé)
  const tous = montants(text)
  const ht = montantSurLigne(lignesNonVides, /\bht\b|hors[ -]?taxe/i)
  const tva = montantSurLigne(lignesNonVides, /\btva\b/i)
  const ttc =
    montantSurLigne(lignesNonVides, /\bttc\b/i) ??
    montantSurLigne(lignesNonVides, /net (a|à) payer|total (du |a |à )?payer|total general/i)
  if (ht) result.montantHT = { value: ht.brut, normalized: ht.n, confidence: 'haute' }
  if (tva) result.tva = { value: tva.brut, normalized: tva.n, confidence: 'haute' }
  if (ttc) result.montantTTC = { value: ttc.brut, normalized: ttc.n, confidence: 'haute' }
  else if (tous.length > 0) {
    const max = tous.reduce((a, b) => (b.n > a.n ? b : a))
    result.montantTTC = { value: max.brut, normalized: max.n, confidence: 'moyenne', note: 'Plus grand montant de la facture — vérifier qu’il s’agit bien du TTC' }
  }

  // --- Fournisseur : ligne contenant une forme sociale / « garage »…
  const ligneMarque = lignesNonVides.find((l) => MOTS_MARQUE.test(l))
  if (ligneMarque) {
    result.fournisseur = { value: ligneMarque, confidence: 'moyenne' }
  } else if (lignesNonVides.length > 0) {
    result.fournisseur = { value: lignesNonVides[0], confidence: 'faible', note: 'Première ligne du document — à vérifier' }
  }

  // --- Kilométrage
  const km = text.match(/(?:kilom[ée]trage|compteur|km)\s*[:.]?\s*(\d[\d\s\u00a0]{2,})\s*km?\b/i)
  if (km) {
    const n = normalizeNumber(km[1])
    if (n !== undefined) result.kilometrage = { value: km[1].trim(), normalized: n, confidence: 'haute' }
  }

  // --- Lignes de facture : texte + montant en fin de ligne
  const lignesVues = new Set<string>()
  for (const ligne of lignesNonVides) {
    const m = ligne.match(/^(.{3,}?)\s+(\d{1,3}(?:[\s\u00a0]\d{3})*(?:[.,]\d{1,2})?)\s*(?:€|EUR)?\s*$/)
    if (!m) continue
    const libelle = m[1].trim()
    // Éviter les lignes de totaux elles-mêmes
    if (/^(total|ttc|ht|tva|net a payer|montant)/i.test(libelle)) continue
    const cle = libelle.toLowerCase()
    if (lignesVues.has(cle)) continue
    lignesVues.add(cle)
    result.lignes.push({ libelle, montant: m[2] })
    if (result.lignes.length >= 20) break
  }

  // --- Non interprétés
  const connues = [
    result.date?.value, result.fournisseur?.value, result.montantTTC?.value, result.montantHT?.value, result.tva?.value,
    ...result.lignes.map((l) => l.libelle),
  ].filter(Boolean).map((s) => s!.toLowerCase())
  result.nonInterpretes = lignesNonVides
    .filter((l) => !connues.some((c) => l.toLowerCase().includes(c)))
    .filter((l) => l.length > 3)
    .slice(0, 20)

  return result
}

// ---------------------------------------------------------------------------
// Correspondance facture → fiche d'intervention (pré-remplissage)
// ---------------------------------------------------------------------------

export interface ServicePrefill {
  date?: string
  kilometrage?: number
  categorie?: ServiceCategory
  titre?: string
  garage?: string
  coutTotal?: number
  description?: string
  items?: Array<{ kind: ItemKind; libelle: string; prixTotal?: number }>
}

const CATEGORIES_FACTURE: Array<[RegExp, ServiceCategory]> = [
  [/vidange/i, 'vidange'],
  [/frein|plaquette|disque/i, 'freins'],
  [/pneu|pneumatique/i, 'pneus'],
  [/distribution/i, 'distribution'],
  [/embrayage|bo[îi]te de vitesse/i, 'transmission'],
  [/clim|climatisation/i, 'climatisation'],
  [/batterie/i, 'batterie'],
  [/amortisseur|suspension/i, 'suspension'],
  [/filtre/i, 'filtres'],
  [/bougie/i, 'bougies'],
  [/liquide|refroidissement|antigel/i, 'liquides'],
  [/controle technique/i, 'controle_technique'],
  [/eclairage|ampoule|feu/i, 'electricite'],
  [/carrosserie|peinture|pare-brise/i, 'carrosserie'],
]

/** Convertit une facture analysée en pré-remplissage d'intervention. */
export function toServicePrefill(scan: FactureScan): ServicePrefill {
  const prefill: ServicePrefill = {}
  if (scan.date?.normalized) prefill.date = scan.date.normalized
  if (scan.kilometrage?.normalized) prefill.kilometrage = scan.kilometrage.normalized
  if (scan.fournisseur?.value) prefill.garage = scan.fournisseur.value
  if (scan.montantTTC?.normalized !== undefined) prefill.coutTotal = scan.montantTTC.normalized

  const texte = [scan.fournisseur?.value, ...scan.lignes.map((l) => l.libelle)].filter(Boolean).join(' ')
  for (const [regex, cat] of CATEGORIES_FACTURE) {
    if (regex.test(texte)) {
      prefill.categorie = cat
      break
    }
  }

  const premiere = scan.lignes[0]
  if (premiere) {
    prefill.titre = premiere.libelle.slice(0, 80)
    prefill.description = scan.lignes.map((l) => `${l.libelle} : ${l.montant} €`).join('\n')
    prefill.items = scan.lignes.map((l) => {
      const n = normalizeNumber(l.montant)
      const kind: ItemKind = /main.?d.?oeuvre|\bmo\b|forfait/i.test(l.libelle)
        ? 'main_oeuvre'
        : /filtre|huile|plaquette|disque|pneu|courroie|bougie/i.test(l.libelle)
          ? 'piece'
          : 'prestation'
      return { kind, libelle: l.libelle, prixTotal: n }
    })
  }
  return prefill
}
