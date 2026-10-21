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
  { code: 'B', label: 'Date de la 1re immatriculation', kind: 'date', target: 'premiereImmatriculation' },
  { code: 'C.1', label: 'Nom et prénom du titulaire', kind: 'texte', target: 'ownerName', sensitive: true },
  { code: 'C.3', label: 'Adresse du titulaire', kind: 'texte', target: null, sensitive: true },
  { code: 'C.4a', label: 'Mention (propriétaire / locataire)', kind: 'texte', target: null, sensitive: true },
  { code: 'D.1', label: 'Marque', kind: 'texte', target: 'marque' },
  { code: 'D.2', label: 'Type, variante, version', kind: 'texte', target: 'generation' },
  { code: 'D.2.1', label: 'Code national d’identification du type (CNIT)', kind: 'texte', target: null },
  { code: 'D.3', label: 'Dénomination commerciale (modèle)', kind: 'texte', target: 'modele' },
  { code: 'E', label: 'Numéro d’identification du véhicule (VIN)', kind: 'vin', target: 'vin' },
  { code: 'F.1', label: 'Masse en charge maximale (PTAC)', kind: 'nombre', target: null },
  { code: 'F.2', label: 'Masse en charge maximale en service', kind: 'nombre', target: null },
  { code: 'G', label: 'Poids à vide', kind: 'nombre', target: null },
  { code: 'H', label: 'Période de validité', kind: 'texte', target: null },
  { code: 'I', label: 'Date d’émission du certificat', kind: 'date', target: null },
  { code: 'J.1', label: 'Genre national (VP, CTTE…)', kind: 'texte', target: null },
  { code: 'J.3', label: 'Carrosserie', kind: 'texte', target: 'finition' },
  { code: 'K', label: 'Numéro de réception par type', kind: 'texte', target: null },
  { code: 'P.1', label: 'Cylindrée (cm³)', kind: 'nombre', target: 'cylindreeCm3' },
  { code: 'P.2', label: 'Puissance nette maximale (kW)', kind: 'nombre', target: null },
  { code: 'P.3', label: 'Type de carburant / source d’énergie', kind: 'carburant', target: 'carburant' },
  { code: 'P.6', label: 'Puissance administrative (CV fiscaux)', kind: 'nombre', target: null },
  { code: 'S.1', label: 'Places assises', kind: 'nombre', target: null },
  { code: 'U.1', label: 'Niveau sonore à l’arrêt (dB)', kind: 'nombre', target: null },
  { code: 'V.7', label: 'Émissions de CO₂ (g/km)', kind: 'nombre', target: null },
  { code: 'V.9', label: 'Classe environnementale', kind: 'texte', target: null },
  { code: 'X.1', label: 'Contrôle technique', kind: 'date', target: null },
  { code: 'Z', label: 'Mentions particulières', kind: 'texte', target: null },
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

/** VIN : 17 caractères alphanumériques (sans espaces, en capitales). */
export function normalizeVin(raw: string): string | undefined {
  const compact = raw.toUpperCase().replace(/[\s.\-]/g, '')
  const m = compact.match(/\b([A-HJ-NPR-Z0-9]{17})\b/) ?? compact.match(/([A-HJ-NPR-Z0-9]{17})/)
  return m ? m[1] : undefined
}

/** Immatriculation SIV (AB-123-CD) ou ancien format, en capitales. */
export function normalizePlate(raw: string): string | undefined {
  const s = raw.toUpperCase().replace(/\s/g, '')
  const siv = s.match(/\b([A-Z]{2})[-–]?(\d{3})[-–]?([A-Z]{2})\b/)
  if (siv) return `${siv[1]}-${siv[2]}-${siv[3]}`
  return undefined
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
      return vin
        ? { value, normalized: vin, confidence: vin === value.replace(/[\s.\-]/g, '').toUpperCase() ? 'haute' : 'moyenne' }
        : { value, confidence: 'faible', note: 'VIN attendu sur 17 caractères' }
    }
    case 'immatriculation': {
      const plate = normalizePlate(value)
      return plate
        ? { value, normalized: plate, confidence: 'haute' }
        : { value, confidence: 'moyenne', note: 'Format d’immatriculation non reconnu (SIV attendu : AB-123-CD)' }
    }
    case 'nombre': {
      const n = normalizeNumber(value)
      return n !== undefined
        ? { value, normalized: String(n), confidence: 'haute' }
        : { value, confidence: 'faible', note: 'Nombre non reconnu' }
    }
    case 'carburant': {
      const c = normalizeCarburant(value)
      return c
        ? { value, normalized: c, confidence: 'haute' }
        : { value, confidence: 'faible', note: 'Code énergie inconnu (attendu : ES, GO, EL, EE…)' }
    }
    default:
      return { value, confidence: value.length > 0 ? 'moyenne' : 'faible' }
  }
}

/**
 * Analyse le texte OCR d'une carte grise.
 * Détecte les repères lettrés (A, B, D.1, E, P.3…) puis les valeurs par leur
 * forme (VIN 17 caractères, plaque, dates) lorsque les repères manquent.
 */
export function parseCarteGrise(text: string): CarteGriseScan {
  const lignes = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const fields: ScanField[] = []
  const codesVus = new Set<string>()
  const consomme = new Set<number>()

  // Les codes les plus longs d'abord (D.2.1 avant D.2, P.6 avant P…)
  const specs = [...CARTE_GRISE_FIELDS].sort((a, b) => b.code.length - a.code.length)

  lignes.forEach((ligne, i) => {
    for (const spec of specs) {
      if (codesVus.has(spec.code)) continue
      const escaped = spec.code.replace('.', '\\.')
      const m = ligne.match(new RegExp(`(?:^|\\s)${escaped}\\b[:.\\s]*([^\\s].*)?$`, 'i'))
      if (!m) continue

      let valeur = (m[1] ?? '').trim()
      if (!valeur) {
        // Valeur sur la ligne suivante
        for (let j = i + 1; j < Math.min(i + 3, lignes.length); j++) {
          if (consomme.has(j)) continue
          const prochaine = lignes[j]
          if (CARTE_GRISE_FIELDS.some((s) => new RegExp(`^(?:${s.code.replace('.', '\\.')})\\b`, 'i').test(prochaine))) break
          valeur = prochaine
          consomme.add(j)
          break
        }
      } else {
        valeur = stripLabel(valeur, spec.label)
      }
      if (!valeur) continue

      codesVus.add(spec.code)
      consomme.add(i)
      fields.push({ code: spec.code, label: spec.label, target: spec.target, sensitive: spec.sensitive, ...classify(spec, valeur) })
      return
    }
  })

  // Repli par forme de valeur : VIN, plaque, dates — si le repère n'a pas été lu
  const reste = lignes.filter((_, i) => !consomme.has(i))
  if (!codesVus.has('E')) {
    const vinLigne = reste.find((l) => normalizeVin(l))
    if (vinLigne) {
      const spec = CARTE_GRISE_FIELDS.find((s) => s.code === 'E')!
      fields.push({ code: 'E', label: spec.label, target: spec.target, ...classify(spec, vinLigne), confidence: 'moyenne', note: 'Repère E non lu — valeur détectée par sa forme (17 caractères)' })
    }
  }
  if (!codesVus.has('A')) {
    const plaqueLigne = reste.find((l) => normalizePlate(l) && !normalizeVin(l))
    if (plaqueLigne) {
      const spec = CARTE_GRISE_FIELDS.find((s) => s.code === 'A')!
      fields.push({ code: 'A', label: spec.label, target: spec.target, ...classify(spec, plaqueLigne), confidence: 'moyenne', note: 'Repère A non lu — valeur détectée par sa forme' })
    }
  }

  // Fragments non interprétés : signalés, jamais masqués
  const interpretees = new Set(fields.map((f) => f.value.toLowerCase()))
  const nonInterpretes = reste
    .filter((l) => ![...interpretees].some((v) => v && l.toLowerCase().includes(v)))
    .filter((l) => l.length > 2)
    .slice(0, 20)

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
