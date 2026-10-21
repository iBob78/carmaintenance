// Lecture de la carte grise (certificat d'immatriculation) à partir du texte
// extrait par OCR. Les repères lettrés suivent la nomenclature européenne
// (directive 1999/37/CE) : même lettre dans toute l'UE — par exemple
// E = numéro d'identification du véhicule (VIN).
//
// Philosophie du projet : l'OCR ne fait que PROPOSER. Chaque valeur est
// retournée avec son repère officiel et un niveau de confiance ; rien n'est
// jamais enregistré automatiquement, et les données personnelles (titulaire,
// adresse) sont signalées comme sensibles.

import type { Carburant } from '@/lib/domain/types'

// ---------------------------------------------------------------------------
// Champs cibles du formulaire véhicule (pré-remplissage possible)
// ---------------------------------------------------------------------------

export interface VehiclePrefill {
  marque?: string
  modele?: string
  generation?: string
  finition?: string
  annee?: number
  premiereImmatriculation?: string
  motorisation?: string
  codeMoteur?: string
  cylindreeCm3?: number
  carburant?: Carburant
  vin?: string
  immatriculation?: string
  ownerName?: string
}

export type PrefillKey = keyof VehiclePrefill

export interface ScanField {
  /** Repère officiel de la carte grise (« E », « P.3 »…) */
  code: string
  /** Libellé officiel du repère */
  label: string
  /** Valeur brute détectée dans le texte */
  value: string
  /** Valeur normalisée (date ISO, VIN en capitales…) quand applicable */
  normalized?: string
  /** Champ du formulaire véhicule correspondant, null = affiché seulement */
  target: PrefillKey | null
  /** Donnée personnelle (masquable dans les rapports) */
  sensitive?: boolean
  confidence: 'haute' | 'moyenne' | 'faible'
  note?: string
}

export interface CarteGriseScan {
  fields: ScanField[]
  /** Fragments du texte non interprétés — jamais cachés à l'utilisateur */
  nonInterpretes: string[]
}

// ---------------------------------------------------------------------------
// Registre des repères (sous-ensemnle utile à la fiche véhicule)
// ---------------------------------------------------------------------------

type FieldKind = 'texte' | 'date' | 'vin' | 'immatriculation' | 'nombre' | 'carburant'

interface FieldSpec {
  code: string
  label: string
  kind: FieldKind
  target: PrefillKey | null
  sensitive?: boolean
}

export const CARTE_GRISE_FIELDS: FieldSpec[] = [
  { code: 'A', label: "Numéro d'immatriculation", kind: 'immatriculation', target: 'immatriculation' },
  { code: 'A.1', label: 'Immatriculation précédente', kind: 'texte', target: null },
  { code: 'B', label: 'Date de la 1re immatriculation', kind: 'date', target: 'premiereImmatriculation' },
  { code: 'C.1', label: 'Nom et prénom du titulaire', kind: 'texte', target: 'ownerName', sensitive: true },
  { code: 'C.3', label: 'Adresse du titulaire', kind: 'texte', target: null, sensitive: true },
  { code: 'C.4a', label: 'Mention (propriétaire / locataire)', kind: 'texte', target: null, sensitive: true },
  { code: 'C.4.1', label: 'Co-titulaire', kind: 'texte', target: null, sensitive: true },
  { code: 'D.1', label: 'Marque', kind: 'texte', target: 'marque' },
  { code: 'D.2', label: 'Type, variante, version', kind: 'texte', target: 'generation' },
  { code: 'D.2.1', label: 'Code national d’identification du type (CNIT)', kind: 'texte', target: null },
  { code: 'D.3', label: 'Dénomination commerciale (modèle)', kind: 'texte', target: 'modele' },
  { code: 'E', label: 'Numéro d’identification du véhicule (VIN)', kind: 'vin', target: 'vin' },
  { code: 'F.1', label: 'Masse en charge maximale (PTAC)', kind: 'nombre', target: null },
  { code: 'F.2', label: 'Masse en charge maximale en service', kind: 'nombre', target: null },
  { code: 'F.3', label: 'Poids total roulant autorisé (PTRA)', kind: 'nombre', target: null },
  { code: 'G', label: 'Poids à vide', kind: 'nombre', target: null },
  { code: 'G.1', label: 'Poids à vide national', kind: 'nombre', target: null },
  { code: 'H', label: 'Période de validité', kind: 'texte', target: null },
  { code: 'I', label: 'Date d’émission du certificat', kind: 'date', target: null },
  { code: 'J', label: 'Catégorie du véhicule', kind: 'texte', target: null },
  { code: 'J.1', label: 'Genre national (VP, CTTE…)', kind: 'texte', target: null },
  { code: 'J.2', label: 'Genre national (détail)', kind: 'texte', target: null },
  { code: 'J.3', label: 'Carrosserie', kind: 'texte', target: 'finition' },
  { code: 'K', label: 'Numéro de réception par type', kind: 'texte', target: null },
  { code: 'P.1', label: 'Cylindrée (cm³)', kind: 'nombre', target: 'cylindreeCm3' },
  { code: 'P.2', label: 'Puissance nette maximale (kW)', kind: 'nombre', target: null },
  { code: 'P.3', label: 'Type de carburant / source d’énergie', kind: 'carburant', target: 'carburant' },
  { code: 'P.6', label: 'Puissance administrative (CV fiscaux)', kind: 'nombre', target: null },
  { code: 'Q', label: 'Rapport puissance / masse (motos)', kind: 'nombre', target: null },
  { code: 'S.1', label: 'Places assises', kind: 'nombre', target: null },
  { code: 'S.2', label: 'Places debout', kind: 'nombre', target: null },
  { code: 'U.1', label: 'Niveau sonore à l’arrêt (dB)', kind: 'nombre', target: null },
  { code: 'U.2', label: 'Vitesse du moteur (tr/min)', kind: 'nombre', target: null },
  { code: 'V.7', label: 'Émissions de CO₂ (g/km)', kind: 'nombre', target: null },
  { code: 'V.9', label: 'Classe environnementale', kind: 'texte', target: null },
  { code: 'X.1', label: 'Contrôle technique', kind: 'date', target: null },
  { code: 'Y.1', label: 'Taxe régionale', kind: 'nombre', target: null },
  { code: 'Y.2', label: 'Taxe formation professionnelle', kind: 'nombre', target: null },
  { code: 'Y.3', label: 'Malus CO₂', kind: 'nombre', target: null },
  { code: 'Y.4', label: 'Taxe de gestion', kind: 'nombre', target: null },
  { code: 'Y.5', label: 'Redevance d’acheminement', kind: 'nombre', target: null },
  { code: 'Y.6', label: 'Total des taxes', kind: 'nombre', target: null },
  { code: 'Z', label: 'Mentions particulières', kind: 'texte', target: null },
  { code: 'Z.1', label: 'Mention particulière 1', kind: 'texte', target: null },
  { code: 'Z.2', label: 'Mention particulière 2', kind: 'texte', target: null },
  { code: 'Z.3', label: 'Mention particulière 3', kind: 'texte', target: null },
  { code: 'Z.4', label: 'Mention particulière 4', kind: 'texte', target: null },
]

// ---------------------------------------------------------------------------
// Normalisation des valeurs
// ---------------------------------------------------------------------------

const MOIS_FR: Record<string, number> = {
  janvier: 1, janv: 1, février: 2, fevrier: 2, févr: 2, fevr: 2, mars: 3,
  avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, aout: 8, septembre: 9,
  sept: 9, octobre: 10, oct: 10, novembre: 11, nov: 11, décembre: 12, decembre: 12, dec: 12,
}

/** Date française (JJ/MM/AAAA, JJ.MM.AAAA, JJ mois AAAA) → ISO AAAA-MM-JJ. */
export function normalizeDate(raw: string): string | undefined {
  const s = raw.trim().replace(/\s+/g, ' ')
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  let m = s.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b/)
  if (m) {
    const [, j, mm, a] = m
    const mois = Number(mm)
    const jour = Number(j)
    if (mois >= 1 && mois <= 12 && jour >= 1 && jour <= 31) {
      return `${a}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
    }
  }
  m = s.match(/\b(\d{1,2})\s+([a-zûé]+)\s+(\d{4})\b/i)
  if (m) {
    const mois = MOIS_FR[m[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] ?? MOIS_FR[m[2].toLowerCase()]
    if (mois) {
      return `${m[3]}-${String(mois).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`
    }
  }
  return undefined
}

/** VIN : 17 caractères alphanumériques (ISO 3779, sans I/O/Q), séparateurs OCR possibles. */
export function normalizeVin(raw: string): string | undefined {
  const vinValide = (vin: string) => /[A-HJ-NPR-Z]/.test(vin) && /[0-9]/.test(vin)
  const haut = raw.toUpperCase()
  // 1. Suite continue de 17 caractères (cas courant) — les bords de mot
  //    évitent les faux positifs sur la bande MRZ (longue suite alphanumérique).
  const strict = haut.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)
  if (strict && vinValide(strict[1])) return strict[1]
  // 2. Séparateurs OCR possibles (espaces internes, tirets, points) — jamais
  //    à cheval sur plusieurs lignes, et nombre de séparateurs limité pour
  //    éviter l'enchaînement « D.3 SR220TD F.1 1915 » en faux VIN.
  for (const m of haut.matchAll(/\b([A-HJ-NPR-Z0-9](?:[ \t.\-]?[A-HJ-NPR-Z0-9]){16})\b/g)) {
    const brut = m[1]
    const seps = (brut.match(/[ \t.\-]/g) ?? []).length
    if (seps > 4) continue
    const vin = brut.replace(/[ \t.\-]/g, '')
    if (vinValide(vin)) return vin
  }
  return undefined
}

/** Immatriculation SIV (AB-123-CD) ou ancien format, en capitales. */
export function normalizePlate(raw: string): string | undefined {
  // Ne pas supprimer les espaces : « AB-123-CD 8. 05/01/1998 » doit rester
  // découvrable, la valeur parasite ne doit pas casser les bords de mot.
  const siv = raw.toUpperCase().match(/\b([A-Z]{2})[-–\s]?(\d{3})[-–\s]?([A-Z]{2})\b/)
  return siv ? `${siv[1]}-${siv[2]}-${siv[3]}` : undefined
}

/** Nombre à la française (« 1 461 » ou « 1461,5 ») → Number. */
export function normalizeNumber(raw: string): number | undefined {
  const m = raw.match(/-?\d[\d\s\u00a0]*(?:[.,]\d+)?/)
  if (!m) return undefined
  const n = Number(m[0].replace(/[\s\u00a0]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/** Code ou libellé de carburant carte grise (P.3) → Carburant applicatif. */
export function normalizeCarburant(raw: string): Carburant | undefined {
  const s = raw.toUpperCase().replace(/[^A-ZÀ-ÿ]/g, '')
  const parCode: Array<[string, Carburant]> = [
    ['EE', 'hybride'], ['EH', 'hybride'], ['GH', 'hybride'], ['ES', 'essence'],
    ['EL', 'electrique'], ['GO', 'diesel'], ['GP', 'gpl'], ['GL', 'gpl'], ['GN', 'autre'],
  ]
  for (const [code, val] of parCode) {
    if (s.includes(code)) return val
  }
  const parMot: Array<[string, Carburant]> = [
    ['HYBRIDE', 'hybride'], ['ELECTRIQUE', 'electrique'], ['ÉLECTRIQUE', 'electrique'],
    ['ESSENCE', 'essence'], ['SUPER', 'essence'], ['DIESEL', 'diesel'], ['GAZOLE', 'diesel'],
    ['GPL', 'gpl'], ['ETHANOL', 'ethanol'], ['E85', 'ethanol'], ['GNV', 'autre'],
  ]
  for (const [mot, val] of parMot) {
    if (s.includes(mot)) return val
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Parseur principal
// ---------------------------------------------------------------------------

const sansAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Retire le libellé officiel du début d'une valeur OCR (« E VIN VF1… » → « VF1… »). */
function stripLabel(rest: string, label: string): string {
  let s = rest.replace(/^[:.\-\s]+/, '')
  const mots = sansAccents(label).split(/[^a-z0-9]+/).filter((w) => w.length >= 3)
  for (const mot of mots) {
    const ref = sansAccents(s)
    if (ref.startsWith(mot)) s = s.slice(mot.length)
    else break
  }
  return s.replace(/^[:.\-\s]+/, '').trim()
}

function classify(spec: FieldSpec, raw: string): Pick<ScanField, 'value' | 'normalized' | 'confidence' | 'note'> {
  const value = raw.trim()
  switch (spec.kind) {
    case 'date': {
      const iso = normalizeDate(value)
      return iso
        ? { value, normalized: iso, confidence: 'haute' }
        : { value, confidence: 'faible', note: 'Date non reconnue — vérifier le format' }
    }
    case 'vin': {
      const vin = normalizeVin(value)
      if (vin) {
        return { value, normalized: vin, confidence: vin === value.replace(/[\s.\-]/g, '').toUpperCase() ? 'haute' : 'moyenne' }
      }
      const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
      const note = /^[A-HJ-NPR-Z0-9]{17}$/.test(compact)
        ? '17 caractères, mais lettres interdites dans un VIN (I, O, Q) — illisible ou hors norme'
        : 'VIN attendu sur 17 caractères'
      return { value, confidence: 'faible', note }
    }
    case 'immatriculation': {
      const plate = normalizePlate(value)
      return plate
        ? { value, normalized: plate, confidence: 'haute' }
        : { value, confidence: 'moyenne', note: 'Format d’immatriculation non reconnu (SIV attendu : AB-123-CD)' }
    }
    case 'nombre': {
      // Un nombre n'est « haute » confiance que si la valeur est propre
      // (nombre seul ou avec une unité courte). Un nombre suivi de texte
      // parasite court reste proposable en « moyenne ». « 30306.1.1307= »
      // (nombres fusionnés) n'est jamais présenté comme un nombre validé.
      const propre = /^(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)([.,]\d+)?\s*(kg|cm3|cm³|kW|kw|CV|cv|dB|db|g\/km|tr\/min|%)?$/i.test(value)
      const n = normalizeNumber(value)
      if (propre && n !== undefined) {
        return { value, normalized: String(n), confidence: 'haute' }
      }
      const avecParasite = /^(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)([.,]\d+)?\s{2,}\D{1,6}$/.exec(value)
      if (avecParasite) {
        const n2 = normalizeNumber(avecParasite[1] + (avecParasite[2] ?? ''))
        if (n2 !== undefined) {
          return {
            value,
            normalized: String(n2),
            confidence: 'moyenne',
            note: 'Nombre suivi de texte parasite — vérifier sur le document',
          }
        }
      }
      return {
        value,
        confidence: 'faible',
        note: 'Valeur bruitée autour du nombre — saisir ou vérifier sur le document',
      }
    }
    case 'carburant': {
      const c = normalizeCarburant(value)
      return c
        ? { value, normalized: c, confidence: 'haute' }
        : { value, confidence: 'faible', note: 'Code énergie inconnu (attendu : ES, GO, EL, EE…)' }
    }
    default: {
      // Valeur texte illisible (bruit OCR pur : « â ; », « =. ») → jamais fiable
      const alnum = (value.match(/[A-Za-zÀ-ÿ0-9]/g) ?? []).length
      if (alnum < 2) {
        return { value, confidence: 'faible', note: 'Valeur illisible sur le document' }
      }
      return { value, confidence: 'moyenne' }
    }
  }
}

/**
 * Analyse le texte OCR d'une carte grise.
 * - les repères lettrés (A, B, D.1, E, P.3…) sont détectés même regroupés
 *   sur une même ligne (« A. AB-123-CD   B. 05/01/1998 ») ;
 * - les valeurs retrouvées par leur forme (VIN 17 caractères, plaque SIV)
 *   complètent ou remplacent une valeur bruitée — jamais inventées ;
 * - les fragments non interprétés restent affichés.
 */
export function parseCarteGrise(text: string): CarteGriseScan {
  const lignes = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const fields: ScanField[] = []
  const codesVus = new Set<string>()
  const consomme = new Set<number>()

  // Codes les plus longs d'abord (D.2.1 avant D.2, Z.1 avant Z…)
  const specs = [...CARTE_GRISE_FIELDS].sort((a, b) => b.code.length - a.code.length)
  const codeKey = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '')
  // Points optionnels : l'OCR écrit « P3 » ou « F2 » sans le point.
  // Limite droite adaptée : les codes « nombre » peuvent être collés à leur
  // valeur (« P290 » = P.2 → 90) — jamais pour les autres (sécurité « AB-123 »).
  const motifCode = (s: FieldSpec) => {
    const pointe = s.code
      .split('.')
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\.?')
    return s.kind === 'nombre' ? `${pointe}(?![A-Za-zÀ-ÿ])` : `${pointe}\\b`
  }
  const codeAlt = specs.map(motifCode).join('|')
  // Limite gauche en lookbehind : aucun caractère consommé avant le repère,
  // sinon « Y.5 Y.6 » perdrait Y.6 (l'espace avalé par le match précédent).
  const tokenRe = new RegExp(`(?<![A-Za-zÀ-ÿ0-9])(${codeAlt})[\\s.:]*`, 'gi')

  /** Découpe une ligne en segments [repère → valeur] : plusieurs repères par ligne possibles. */
  const segments = (ligne: string): Array<{ code: string; valeur: string }> => {
    const out: Array<{ code: string; valeur: string }> = []
    const matches = [...ligne.matchAll(tokenRe)]
    matches.forEach((m, i) => {
      const debut = (m.index ?? 0) + m[0].length
      const fin = i + 1 < matches.length ? (matches[i + 1].index ?? ligne.length) : ligne.length
      const brut = ligne.slice(debut, fin).trim().replace(/[|»«•]+\s*$/, '').trim()
      out.push({ code: codeKey(m[1]), valeur: brut })
    })
    return out
  }

  // --- 1. Repères lettrés
  lignes.forEach((ligne, i) => {
    if (consomme.has(i)) return
    const segs = segments(ligne)
    for (const { code, valeur } of segs) {
      if (codesVus.has(code)) continue
      const spec = specs.find((s) => codeKey(s.code) === code)
      if (!spec) continue
      let val = valeur
      if (!val) {
        // Valeur sur la ligne suivante
        for (let j = i + 1; j < Math.min(i + 3, lignes.length); j++) {
          if (consomme.has(j)) continue
          if (segments(lignes[j]).length > 0) break
          val = lignes[j]
          consomme.add(j)
          break
        }
      } else {
        val = stripLabel(val, spec.label)
      }
      if (!val) continue
      codesVus.add(code)
      consomme.add(i)
      fields.push({ code: spec.code, label: spec.label, target: spec.target, sensitive: spec.sensitive, ...classify(spec, val) })
    }
  })

  // --- 2. Valeurs collées à un autre repère (« A. AB-123-CD 8. 05/01/1998 »
  //     où le « B » a été mal lu) : la partie résiduelle est ré-analysée.
  for (const f of [...fields]) {
    const reste = f.value.replace(f.normalized ?? '\u0000', '').trim()
    if (!reste || reste === f.value) continue
    const secours: Array<[string, (v: string) => string | undefined]> = [
      ['B', normalizeDate],
      ['E', normalizeVin],
      ['A', normalizePlate],
    ]
    for (const [code, finder] of secours) {
      if (codesVus.has(code)) continue
      const trouve = finder(reste)
      if (!trouve) continue
      const spec = specs.find((s) => s.code === code)!
      fields.push({
        code,
        label: spec.label,
        target: spec.target,
        sensitive: spec.sensitive,
        value: trouve,
        normalized: trouve,
        confidence: 'moyenne',
        note: `Repère ${code} mal lu — valeur détectée dans la ligne du repère ${f.code}`,
      })
      codesVus.add(code)
      break
    }
  }

  // --- 2bis. Bande MRZ (BIS, en bas de carte grise) : imprimée en OCR-B,
  //     elle reste lisible quand le reste est bruité. Le VIN est extrait de
  //     façon positionnelle — juste après l'immatriculation connue — jamais
  //     deviné. Marque et type proviennent de la ligne structurée « CI<<…<<… ».
  const vinCharset = (c: string) => /^[A-HJ-NPR-Z0-9]$/.test(c)
  const vinValide = (s: string) =>
    s.length === 17 && [...s].every(vinCharset) && /[A-HJ-NPR-Z]/.test(s) && /[0-9]/.test(s)
  const ancre = (fields.find((f) => f.code === 'A' && f.normalized)?.normalized ?? '')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
  const runs = lignes.filter((l) => l.replace(/[^A-Z0-9]/gi, '').length >= 30)

  let mrzVin: string | undefined
  if (ancre) {
    for (const l of runs) {
      const compact = l.toUpperCase().replace(/[^A-Z0-9]/g, '')
      const idxAncre = compact.indexOf(ancre)
      if (idxAncre === -1) continue
      // Le format BIS place un séparateur (0/O/check) entre l'immatriculation
      // et le VIN : on essaie les positions 0 à 3 et on privilégie un VIN
      // commençant par une lettre (cas réel), le plus proche de l'ancre.
      const candidats: Array<{ suite: string; priorite: number }> = []
      for (let skip = 0; skip <= 3; skip++) {
        const suite = compact.slice(idxAncre + ancre.length + skip, idxAncre + ancre.length + skip + 17)
        if (vinValide(suite)) {
          candidats.push({ suite, priorite: /^[A-HJ-NPR-Z]/.test(suite) ? skip : 10 + skip })
        }
      }
      candidats.sort((a, b) => a.priorite - b.priorite)
      if (candidats.length > 0) {
        mrzVin = candidats[0].suite
        break
      }
    }
  }
  if (!mrzVin) {
    // Sans ancre : uniquement si UN SEUL VIN plausible figure dans les bandes
    const candidats = new Set<string>()
    for (const l of runs) {
      const compact = l.toUpperCase().replace(/[^A-Z0-9]/g, '')
      for (let i = 0; i + 17 <= compact.length; i++) {
        const w = compact.slice(i, i + 17)
        if (vinValide(w)) candidats.add(w)
      }
    }
    if (candidats.size === 1) mrzVin = [...candidats][0]
  }

  const noteMrz = 'Extrait de la bande MRZ (caractères ambigus possibles : O/0, I/1) — à vérifier'
  if (mrzVin) {
    const existant = fields.find((f) => f.code === 'E')
    const base = {
      code: 'E',
      label: specs.find((s) => s.code === 'E')!.label,
      target: specs.find((s) => s.code === 'E')!.target,
      value: mrzVin,
      normalized: mrzVin,
      confidence: 'moyenne' as const,
      note: noteMrz,
    }
    if (existant) {
      if (existant.normalized !== mrzVin) Object.assign(existant, base)
    } else {
      fields.push(base)
      codesVus.add('E')
    }
  }

  // Marque / type depuis la ligne 2 de la bande : « CI<<MERSSAIDESS<<SR22OTD<<… »
  for (const l of lignes) {
    if (!l.includes('<<')) continue
    const parts = l.toUpperCase().split(/<+/).map((s) => s.trim()).filter(Boolean)
    if (parts.length < 3 || !/^[A-Z]{2}$/.test(parts[0])) continue
    const depuisMrz = (code: string, valeur: string, forme: RegExp) => {
      if (!forme.test(valeur)) return
      const spec = specs.find((s) => s.code === code)
      if (!spec) return
      const existant = fields.find((f) => f.code === code)
      // Une lecture directe de la carte (même « moyenne ») prime sur le MRZ
      if (existant && existant.confidence !== 'faible') return
      const base = {
        code,
        label: spec.label,
        target: spec.target,
        sensitive: spec.sensitive,
        value: valeur,
        normalized: valeur,
        confidence: 'moyenne' as const,
        note: noteMrz,
      }
      if (existant) Object.assign(existant, base)
      else {
        fields.push(base)
        codesVus.add(codeKey(code))
      }
    }
    depuisMrz('D.1', parts[1], /^[A-Z]{3,}$/)
    depuisMrz('D.3', parts[2], /^[A-Z0-9]{3,}$/)
    break
  }

  // --- 3. Secours par forme : même si le repère a été vu avec une valeur
  //     bruitée, une valeur bien formée du document est proposée à sa place.
  const secoursGlobal: Array<[string, (t: string) => string | undefined, FieldSpec['kind']]> = [
    ['E', normalizeVin, 'vin'],
    ['A', normalizePlate, 'immatriculation'],
  ]
  for (const [code, finder, kind] of secoursGlobal) {
    const trouve = finder(text)
    if (!trouve) continue
    const existant = fields.find((f) => f.code === code)
    const spec = specs.find((s) => s.code === code)!
    if (existant && existant.normalized) continue
    if (existant) {
      existant.value = trouve
      existant.normalized = trouve
      existant.confidence = 'moyenne'
      existant.note = `Repère ${code} mal lu — valeur retrouvée ailleurs dans le document`
    } else {
      fields.push({
        code,
        label: spec.label,
        target: spec.target,
        sensitive: spec.sensitive,
        value: trouve,
        normalized: trouve,
        confidence: 'moyenne',
        note: `Repère ${code} non lu — valeur détectée par sa forme`,
      })
      codesVus.add(code)
    }
  }

  // --- 4. Repère B : uniquement si UNE SEULE date figure au document
  if (!codesVus.has('B')) {
    const dates = new Set<string>()
    for (const m of text.matchAll(/\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}\b/g)) {
      const iso = normalizeDate(m[0])
      if (iso) dates.add(iso)
    }
    if (dates.size === 1) {
      const iso = [...dates][0]
      const spec = specs.find((s) => s.code === 'B')!
      fields.push({
        code: 'B',
        label: spec.label,
        target: spec.target,
        ...classify(spec, iso),
        confidence: 'moyenne',
        note: 'Repère B non lu — date unique présente sur le document',
      })
      codesVus.add('B')
    }
  }

  // --- Fragments non interprétés : signalés, jamais masqués
  const interpretees = new Set(fields.map((f) => f.value.toLowerCase()))
  const nonInterpretes = [...new Set(
    lignes
      .filter((_, i) => !consomme.has(i))
      .filter((l) => ![...interpretees].some((v) => v && l.toLowerCase().includes(v)))
      .filter((l) => l.length > 2),
  )].slice(0, 20)

  return { fields, nonInterpretes }
}

/** Construit le pré-remplissage véhicule à partir des champs sélectionnés. */
export function toVehiclePrefill(fields: ScanField[]): VehiclePrefill {
  const prefill: VehiclePrefill = {}
  for (const f of fields) {
    if (!f.target) continue
    const val = f.normalized ?? f.value
    if (!val) continue
    switch (f.target) {
      case 'annee':
        break
      case 'cylindreeCm3': {
        const n = Number(val)
        if (Number.isFinite(n)) prefill.cylindreeCm3 = n
        break
      }
      case 'carburant':
        prefill.carburant = val as Carburant
        break
      default:
        ;(prefill as Record<string, unknown>)[f.target] = val
    }
  }
  // Année déduite de la date de 1re immatriculation (repère B)
  const b = fields.find((f) => f.code === 'B' && f.normalized)
  if (b?.normalized) {
    const an = Number(b.normalized.slice(0, 4))
    if (an >= 1900 && an <= 2100) prefill.annee = an
  }
  return prefill
}
