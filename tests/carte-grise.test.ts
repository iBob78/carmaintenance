import { describe, it, expect } from 'vitest'
import {
  parseCarteGrise,
  toVehiclePrefill,
  normalizeDate,
  normalizeVin,
  normalizePlate,
  normalizeNumber,
  normalizeCarburant,
} from '@/lib/ocr/carte-grise'

// Texte OCR réaliste : bruit typique (espaces parasites, libellés collés)
const OCR_CARTE_GRISE = `
CERTIFICAT D'IMMATRICULATION
A AB-123-CD
B Date de la 1ère immatriculation : 15.03.2014
C.1 DUPONT Jean
C.3 12 RUE DE LA PAIX 75001 PARIS
C.4a EST LE PROPRIETAIRE
D.1 RENAULT
D.2 C001
D.3 CLIO
E VF1RFB00X56123456
F.1 1 615 kg
P.1 1 461 cm3
P.2 66 kW
P.3 ES
P.6 5 CV
S.1 5
X.1 12.03.2026
`

describe('normalisation des valeurs carte grise', () => {
  it('dates : formats français → ISO', () => {
    expect(normalizeDate('15.03.2014')).toBe('2014-03-15')
    expect(normalizeDate('15/03/2014')).toBe('2014-03-15')
    expect(normalizeDate('1er octobre 2026')).toBeUndefined() // jour ordinal non géré → jamais inventé
    expect(normalizeDate('3 mars 2020')).toBe('2020-03-03')
  })

  it('VIN : 17 caractères, capitales, sans séparateurs', () => {
    expect(normalizeVin('vf1 rfb 00x 56123456')).toBe('VF1RFB00X56123456')
    expect(normalizeVin('VF1RFB00X561234')).toBeUndefined() // trop court → refusé
  })

  it('immatriculation SIV normalisée', () => {
    expect(normalizePlate('ab 123 cd')).toBe('AB-123-CD')
    expect(normalizePlate('inconnu')).toBeUndefined()
  })

  it('nombres à la française', () => {
    expect(normalizeNumber('1 461')).toBe(1461)
    expect(normalizeNumber('1 234,56')).toBe(1234.56)
    expect(normalizeNumber('abc')).toBeUndefined()
  })

  it('carburant : codes carte grise P.3', () => {
    expect(normalizeCarburant('ES')).toBe('essence')
    expect(normalizeCarburant('GO')).toBe('diesel')
    expect(normalizeCarburant('EL')).toBe('electrique')
    expect(normalizeCarburant('EE')).toBe('hybride')
    expect(normalizeCarburant('GP')).toBe('gpl')
    expect(normalizeCarburant('??')).toBeUndefined()
  })
})

describe('parseCarteGrise', () => {
  const scan = parseCarteGrise(OCR_CARTE_GRISE)

  it('détecte les repères et leurs valeurs', () => {
    const parCode = Object.fromEntries(scan.fields.map((f) => [f.code, f]))
    expect(parCode['A'].normalized).toBe('AB-123-CD')
    expect(parCode['B'].normalized).toBe('2014-03-15')
    expect(parCode['D.1'].value).toBe('RENAULT')
    expect(parCode['D.3'].value).toBe('CLIO')
    expect(parCode['E'].normalized).toBe('VF1RFB00X56123456')
    expect(parCode['P.1'].normalized).toBe('1461')
    expect(parCode['P.3'].normalized).toBe('essence')
    expect(parCode['P.6'].value).toBe('5 CV')
  })

  it('mappe les repères vers les champs du formulaire (E = VIN)', () => {
    const champs = Object.fromEntries(scan.fields.map((f) => [f.code, f.target]))
    expect(champs['E']).toBe('vin')
    expect(champs['A']).toBe('immatriculation')
    expect(champs['B']).toBe('premiereImmatriculation')
    expect(champs['D.1']).toBe('marque')
    expect(champs['D.3']).toBe('modele')
    expect(champs['P.3']).toBe('carburant')
  })

  it('signale les données personnelles comme sensibles', () => {
    const sensibles = scan.fields.filter((f) => f.sensitive).map((f) => f.code)
    expect(sensibles).toContain('C.1')
    expect(sensibles).toContain('C.3')
  })

  it('toVehiclePrefill construit le pré-remplissage + année déduite de B', () => {
    const prefill = toVehiclePrefill(scan.fields)
    expect(prefill).toMatchObject({
      immatriculation: 'AB-123-CD',
      premiereImmatriculation: '2014-03-15',
      annee: 2014,
      marque: 'RENAULT',
      modele: 'CLIO',
      vin: 'VF1RFB00X56123456',
      cylindreeCm3: 1461,
      carburant: 'essence',
    })
  })

  it('trouve le VIN par sa forme même si le repère E n’a pas été lu', () => {
    const sansE = parseCarteGrise('D.1 PEUGEOT\nVF1RFB00X56123456\nB 01/06/2019')
    const vin = sansE.fields.find((f) => f.code === 'E')
    expect(vin?.normalized).toBe('VF1RFB00X56123456')
    expect(vin?.confidence).toBe('moyenne') // jamais présenté comme certain
    expect(vin?.note).toMatch(/Repère E non lu/)
  })

  it('affiche les fragments non interprétés au lieu de les masquer', () => {
    const scan2 = parseCarteGrise(`${OCR_CARTE_GRISE}\nZ mention illisible %%$ garbage`)
    expect(scan2.nonInterpretes.length).toBeGreaterThan(0)
  })

  it('n’invente rien : document vide → aucun champ', () => {
    const vide = parseCarteGrise('')
    expect(vide.fields).toHaveLength(0)
    expect(vide.nonInterpretes).toHaveLength(0)
  })
})
