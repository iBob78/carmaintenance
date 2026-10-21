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

// ---------------------------------------------------------------------------
// Cas réel : spécimen officiel de carte grise (format SIV 2009), photographié.
// Reproduit les erreurs OCR observées : repères regroupés sur une ligne,
// « B » lu « 8. », valeur E bruitée (« â ; ») alors que le vrai VIN figure
// dans le coupon détachable, bande MRZ en bas de page.
// ---------------------------------------------------------------------------

const OCR_SPECIMEN = `
CERTIFICAT D'IMMATRICULATION
N° d'immatriculation Date de 1ère immatriculation 25/07/2008 V1 0000257
A. AB-123-CD 8. 05/01/1998
C.1 DUPONT
YVES
C.4a EST LE PROPRIETAIRE DU VEHICULE
C.41 2 DELAROCHE
C.3 27 RUE DES ROITELETS
59169 FERIN LES BAINS
FRANCE
D.1 MERSSAIDESS
D.2 X18E
D.2.1 MCT5432PY315 E. â ;
D.3 SR220TD
F.1 1915 F.2 1915 F.3 1915
G 3030 G.1 1307
J M1 J.1 VP J.2 CI J.3 CI
K e2*2001/116*0317*02
P.1 1900 P.2 90 P.3 GO P.6 6
Q 0,06 S.1 5 S.2 U.1 77
U.2 3000 V.7 155 V.9
X.1 VISITE AVANT LE 06/07/2011
Y.1 178,35 Y.2 Y.3 Y.4
Y.5 Y.6 178,35
H
I 04/12/2009
Z.1
Z.2
Z.3
Z.4
Certificat d'immatriculation
AB-123-CD 04/12/2009
98TN036623
VF7X18E00018E8472
MERSSAIDESS
DUPONT
YVES
CRFRAAB123CD0VF7X18E00018E847219801059VP<<<<
CI<<MERSSAIDESS<<SR220TD<<<<<98TN036623<38
`

describe('parseCarteGrise — spécimen officiel (photo réelle)', () => {
  const scan = parseCarteGrise(OCR_SPECIMEN)
  const parCode = Object.fromEntries(scan.fields.map((f) => [f.code, f]))

  it('plusieurs repères sur une même ligne : A et B séparés', () => {
    expect(parCode['A'].normalized).toBe('AB-123-CD')
    expect(parCode['A'].confidence).toBe('haute')
    expect(parCode['D.2.1'].value).toBe('MCT5432PY315') // pas avalé par E
  })

  it('B récupéré depuis la ligne de A (« B » lu « 8. »)', () => {
    expect(parCode['B'].normalized).toBe('1998-01-05')
    expect(parCode['B'].note).toMatch(/ligne du repère A/)
  })

  it('E bruité (« â ; ») remplacé par le VIN du document', () => {
    expect(parCode['E'].normalized).toBe('VF7X18E00018E8472')
    expect(parCode['E'].confidence).toBe('moyenne')
    expect(parCode['E'].note).toMatch(/MRZ|retrouvée/)
  })

  it('la bande MRZ ne produit aucun faux VIN', () => {
    const vins = scan.fields.filter((f) => f.code === 'E')
    expect(vins).toHaveLength(1)
    expect(vins[0].normalized).toBe('VF7X18E00018E8472')
    expect(vins[0].normalized).not.toContain('CRFR')
  })

  it('repères techniques du spécimen lus', () => {
    expect(parCode['D.1'].value).toBe('MERSSAIDESS')
    expect(parCode['D.2'].value).toBe('X18E')
    expect(parCode['D.3'].value).toBe('SR220TD')
    expect(parCode['P.1'].normalized).toBe('1900')
    expect(parCode['P.3'].normalized).toBe('diesel') // code GO
    expect(parCode['P.6'].normalized).toBe('6')
    expect(parCode['X.1'].normalized).toBe('2011-07-06') // « VISITE AVANT LE »
    expect(parCode['I'].normalized).toBe('2009-12-04')
    expect(parCode['K'].value).toBe('e2*2001/116*0317*02')
    expect(parCode['Y.6'].normalized).toBe('178.35')
  })

  it('pré-remplissage véhicule complet à partir du spécimen', () => {
    const prefill = toVehiclePrefill(scan.fields)
    expect(prefill).toMatchObject({
      immatriculation: 'AB-123-CD',
      premiereImmatriculation: '1998-01-05',
      annee: 1998,
      marque: 'MERSSAIDESS',
      modele: 'SR220TD',
      vin: 'VF7X18E00018E8472',
      cylindreeCm3: 1900,
      carburant: 'diesel',
    })
  })

  it('données personnelles signalées', () => {
    expect(parCode['C.1'].sensitive).toBe(true)
    expect(parCode['C.3'].sensitive).toBe(true)
  })
})

describe('normalisations — cas de la photo réelle', () => {
  it('plaque avec valeur parasite collée', () => {
    expect(normalizePlate('AB-123-CD 8. 05/01/1998')).toBe('AB-123-CD')
    expect(normalizePlate('AB 123 CD')).toBe('AB-123-CD')
  })

  it('VIN : faux positifs refusés (suite MRZ, texte)', () => {
    expect(normalizeVin('CRFRAAB123CD0VF7X18E00018E847219801059VP<<<<')).toBeUndefined()
    expect(normalizeVin('LE PROPRIETAIRE DU VEHICULE EST CONNU')).toBeUndefined()
    expect(normalizeVin('â ;')).toBeUndefined()
    expect(normalizeVin('VF7X 18E 000 18E 8472')).toBe('VF7X18E00018E8472') // séparateurs OCR
  })

  it('valeur illisible → jamais présentée comme fiable', () => {
    const s = parseCarteGrise('K =.')
    const k = s.fields.find((f) => f.code === 'K')
    expect(k?.confidence).toBe('faible')
    expect(k?.note).toMatch(/illisible/)
  })
})

// ---------------------------------------------------------------------------
// Vraie sortie OCR de la photo réelle (Tesseract fra, passes PSM 3 + PSM 6
// fusionnées comme dans src/lib/ocr/scan.ts). Bruit réel compris :
// « B » lu « 8. », ligne E en « Æ VF7X1BE00011 », D.1 illisible, G fusionné…
// ---------------------------------------------------------------------------

const OCR_REEL = `
CERTIFICAT D'INMATRICULATION
N° {immatriculation         Date de 1 immatriculation 25/07/2008 V1 0000257

A AB-123-CD     B. 05/01/1998
©.1 DUPONT

vves

CAe EST LE PROPRIETAIRE DU VEHICULE
CA1 2 DELAROCHE
.

RUE        DES ROITELETS

FERIN LES BAINS

D.24 MCTS432PY315.
Æ VF7X1BE00011
F2 1915      F3 1915
6.1 1307
vi ve       v2 ci        43 c
+116+0317*02
P290       P3 Go       P&6
815          s2           u1 T7
V7 155       va
ANT LE 06/07/2011 "Fe

vi 178,35 V2

vs                  va
vs.          Y6 178,35
#

04/12/2009

CRFRAAB123CDOVF7X18E00018E847219801059VP<<<<
CI<<MERSSAIDESS<<<SR22OTD<<<<<98TN036623<38

CERTIFICAT D'IMMATRICULATION
Himmatsiaistion Dmede *immaticistion 25/07/2008 V1 0000257
A AB-123-CD      8. 05/01/1998
€.1 DUPONT
vves
C4a EST LE PROPRIETAIRE DU VEHICULE              =
CA1 2 DÉLAROCHE                   =.
“Tr      RUE     DES ROITELETS           = |
> 9169 FERIN LES BAINS                 E à ;
{DA MERSSAIDESS                            É —— ,
panier                                                      =
Ë                D21 MCTS432PY315 |
D3 SR220TD                       E VF7X18e00018E84m2
TÉt rais    F2 1915      F3 1915                 =’
& 3030     64 1307                           É——
su       14 ve       V2 c1        33 C1       ="
(K e242001/11640317402                es 3
ef 1900  P290       Ps co       P&6       =
a 006. sss      s2       (Es 2
u23000 V7 155     va             =)
X1 VISITE AVANT LE 06/07/2011 ee
vd aze,ss v2                  —…u. .
vs       va             |      dei =  =
vs    Y6 178,35      2e 155524
                            AOME UE 2
1 04/12/2009                             PE
un.                MEN     —
=                   p£ @                     se.
2e 5,                     se =
5                                            :,.: 5
ss              55
FAB-125-D 04/12/2009          =  mr K. =.
2e aoceters   P €                    ce.
puot                                           :
CRFRAAB123CDOVF7X18E00018E847219801059VP<<<<
CI<<MERSSAIDESS<<<SR2ZOTD<<<<<98TND36623<38
`

describe('parseCarteGrise — vraie sortie OCR (photo réelle, PSM 3+6)', () => {
  const scan = parseCarteGrise(OCR_REEL)
  const parCode = Object.fromEntries(scan.fields.map((f) => [f.code, f]))

  it('A et B récupérés malgré le bruit', () => {
    expect(parCode['A'].normalized).toBe('AB-123-CD')
    expect(parCode['B'].normalized).toBe('1998-01-05')
  })

  it('E : VIN vrai depuis la bande MRZ (la ligne E est illisible)', () => {
    expect(parCode['E'].normalized).toBe('VF7X18E00018E8472')
    expect(parCode['E'].confidence).toBe('moyenne')
    expect(parCode['E'].note).toMatch(/MRZ/)
  })

  it('D.1 illisible → marque récupérée dans la bande MRZ', () => {
    expect(parCode['D.1'].normalized).toBe('MERSSAIDESS')
    expect(parCode['D.1'].note).toMatch(/MRZ/)
  })

  it('repères lisibles récupérés (points OCR optionnels : « P290 » = P.2 → 90)', () => {
    expect(parCode['D.3'].value).toBe('SR220TD')
    expect(parCode['D.2.1'].value).toBe('MCTS432PY315')
    expect(parCode['P.2'].normalized).toBe('90')
    expect(parCode['P.3'].normalized).toBe('diesel') // « P3 Go »
    expect(parCode['F.2'].normalized).toBe('1915')
    expect(parCode['F.3'].normalized).toBe('1915')
    expect(parCode['U.2'].normalized).toBe('3000')
    expect(parCode['V.7'].normalized).toBe('155')
    expect(parCode['X.1'].normalized).toBe('2011-07-06')
    expect(parCode['Y.6'].normalized).toBe('178.35')
    expect(parCode['K'].value).toContain('e242001/11640317402')
  })

  it('jamais inventé : P.1 illisible n’est pas rempli', () => {
    const prefill = toVehiclePrefill(scan.fields)
    expect(prefill.cylindreeCm3).toBeUndefined()
  })

  it('pré-remplissage fidèle au document réel', () => {
    const prefill = toVehiclePrefill(scan.fields)
    expect(prefill).toMatchObject({
      immatriculation: 'AB-123-CD',
      premiereImmatriculation: '1998-01-05',
      annee: 1998,
      marque: 'MERSSAIDESS',
      modele: 'SR220TD',
      vin: 'VF7X18E00018E8472',
      carburant: 'diesel',
    })
  })
})

describe('honnêteté des niveaux de confiance', () => {
  it('nombre bruité (« 30306.1.1307= ») jamais présenté comme validé', () => {
    const s = parseCarteGrise('G 30306.1.1307=')
    const g = s.fields.find((f) => f.code === 'G')
    expect(g?.confidence).toBe('faible')
    expect(g?.normalized).toBeUndefined()
    expect(g?.note).toMatch(/bruitée/)
  })

  it('nombre propre reste haute confiance', () => {
    const s = parseCarteGrise('F.1 1915')
    expect(s.fields.find((f) => f.code === 'F.1')?.confidence).toBe('haute')
  })
})
