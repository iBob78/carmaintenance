// Plans d'entretien constructeur par famille de motorisation.
//
// Philosophie : chaque périodicité est SOURCÉE (URL + date de consultation) —
// jamais inventée. En cas de divergence entre sources, la préconisation
// constructeur (plan officiel / note technique) est retenue et la divergence
// est reportée dans `notes`. L'app présente toujours ces valeurs comme
// « à vérifier sur votre carnet d'entretien ».
//
// Les plans sont regroupés par FAMILLE MOTEUR : les intervalles dépendent
// surtout de la motorisation (vidange, distribution, filtres moteur), et non
// de la carrosserie. Chaque entrée liste donc les modèles couverts.

import type { Carburant, ServiceCategory } from '@/lib/domain/types'

export interface ScheduleOperation {
  categorie: ServiceCategory
  libelle: string
  intervalleKm?: number | null
  intervalleMois?: number | null
  /** Gravité si l'échéance est dépassée (distribution = critique). */
  gravite?: 'critique' | 'importante' | 'normale'
}

export interface ScheduleSource {
  label: string
  url: string
  /** Date de consultation (ISO). */
  consulte: string
}

export interface VehicleSchedule {
  id: string
  /** Marques couvertes (une même famille moteur équipe plusieurs marques). */
  marques: string[]
  /** Modèles couverts (« Clio IV », « 208 »…), normalisés à l'appariement. */
  modeles: string[]
  /** Libellés de motorisation couverts (telles que sur la carte grise). */
  motorisations: string[]
  /** Codes moteur couverts (préfixes acceptés : « H5FT » ↔ « H5F »). */
  codesMoteur?: string[]
  carburant?: Carburant
  operations: ScheduleOperation[]
  sources: ScheduleSource[]
  /** Divergences de sources, rappels constructeur, conditions sévères… */
  notes?: string
}

const CONSULTE = '2026-10-22'

export const MAINTENANCE_SCHEDULES: VehicleSchedule[] = [
  {
    id: 'renault-h5f-tce',
    marques: ['Renault'],
    modeles: ['Clio IV', 'Captur'],
    motorisations: ['1.2 TCe 120', '1.2 TCe', 'TCe 120'],
    codesMoteur: ['H5FT', 'H5F'],
    carburant: 'essence',
    operations: [
      { categorie: 'vidange', libelle: 'Vidange + filtre à huile', intervalleKm: 15000, intervalleMois: 12, gravite: 'importante' },
      { categorie: 'filtres', libelle: "Filtre d'habitacle", intervalleKm: 30000, intervalleMois: null },
      { categorie: 'filtres', libelle: 'Filtre à air', intervalleKm: 60000, intervalleMois: null },
      { categorie: 'bougies', libelle: "Bougies d'allumage", intervalleKm: 60000, intervalleMois: null },
      { categorie: 'freins', libelle: 'Liquide de frein', intervalleKm: null, intervalleMois: 36, gravite: 'importante' },
      { categorie: 'liquides', libelle: 'Liquide de refroidissement', intervalleKm: 150000, intervalleMois: 60 },
    ],
    sources: [
      {
        label: 'Feu Vert — intervalles Clio IV 1.2 TCe 120 (vidange, distribution)',
        url: 'https://www.feuvert.fr/forfait-vidange-3009/renault-93/clio-iv-10852',
        consulte: CONSULTE,
      },
      {
        label: 'Norauto — plan d’entretien préconisé par le constructeur (Clio IV)',
        url: 'https://www.norauto.fr/-cms-revision-renault-clio-iv-1-2-16v-73cv-2012.html',
        consulte: CONSULTE,
      },
    ],
    notes:
      'Distribution : le 1.2 TCe 120 (H5F) est à CHAÎNE — pas de remplacement périodique prévu, contrôle à chaque vidange (bruit de tendeur = symptôme). ' +
      'Vidange : les spécialistes (Feu Vert, AUTODOC) retiennent 15 000 km / 1 an sur ce moteur (consommation d’huile connue) alors que certains carnets annoncent 30 000 km.',
  },
  {
    id: 'renault-k9k-dci',
    marques: ['Renault'],
    modeles: ['Clio IV', 'Captur', 'Mégane IV', 'Scénic IV'],
    motorisations: ['1.5 dCi 75', '1.5 dCi 90', '1.5 dCi 110', '1.5 dCi', 'dCi 90', 'dCi 110'],
    codesMoteur: ['K9K'],
    carburant: 'diesel',
    operations: [
      { categorie: 'vidange', libelle: 'Révision (vidange + filtre à huile)', intervalleKm: 30000, intervalleMois: 12, gravite: 'importante' },
      { categorie: 'filtres', libelle: "Filtre d'habitacle", intervalleKm: 30000, intervalleMois: null },
      { categorie: 'filtres', libelle: 'Filtre à air', intervalleKm: 60000, intervalleMois: null },
      { categorie: 'filtres', libelle: 'Filtre à carburant', intervalleKm: 60000, intervalleMois: null },
      { categorie: 'freins', libelle: 'Liquide de frein', intervalleKm: 120000, intervalleMois: 36, gravite: 'importante' },
      { categorie: 'liquides', libelle: 'Liquide de refroidissement', intervalleKm: 150000, intervalleMois: 60 },
      { categorie: 'distribution', libelle: 'Kit courroie de distribution', intervalleKm: 150000, intervalleMois: 72, gravite: 'critique' },
    ],
    sources: [
      {
        label: 'Norauto — plan d’entretien préconisé par le constructeur (Clio IV 1.5 dCi)',
        url: 'https://www.norauto.fr/e/revision-renault-clio-iv-1-5-dci-75-75cv-2012.html',
        consulte: CONSULTE,
      },
      {
        label: 'ad.fr — courroie de distribution Clio 4 1.5 dCi (150 000 km / 6 ans)',
        url: 'https://www.ad.fr/guides/guide-conseil/distribution/courroie-de-distribution-clio-4-a-quel-kilometrage-la-changer',
        consulte: CONSULTE,
      },
    ],
    notes:
      'Vidange : le plan constructeur (Norauto) annonce 30 000 km / 1 an ; Feu Vert retient 15 000 km / 1 an — en usage urbain / trajets courts, 15 000 km est plus prudent. ' +
      'Distribution : 150 000 km ou 6 ans (première échéance) sur moteurs K9K de Clio IV.',
  },
  {
    id: 'peugeot-dv5rc-bluehdi130',
    marques: ['Peugeot'],
    modeles: ['3008 II', '3008', '508 II', '3008 II SUV'],
    motorisations: ['1.5 BlueHDi 130', 'BlueHDi 130', '1.5 BlueHDi'],
    codesMoteur: ['DV5RC', 'DV5'],
    carburant: 'diesel',
    operations: [
      { categorie: 'vidange', libelle: 'Révision (vidange + filtre à huile)', intervalleKm: 30000, intervalleMois: 12, gravite: 'importante' },
      { categorie: 'filtres', libelle: "Filtre d'habitacle", intervalleKm: 30000, intervalleMois: 12 },
      { categorie: 'filtres', libelle: 'Filtre à air + filtre à gazole', intervalleKm: 60000, intervalleMois: 48 },
      { categorie: 'freins', libelle: 'Liquide de frein', intervalleKm: null, intervalleMois: 24, gravite: 'importante' },
      { categorie: 'distribution', libelle: 'Kit distribution + pompe à eau', intervalleKm: 180000, intervalleMois: 120, gravite: 'critique' },
      { categorie: 'distribution', libelle: "Courroie d'entraînement des accessoires", intervalleKm: 180000, intervalleMois: 120 },
    ],
    sources: [
      {
        label: 'Peugeot — plan d’entretien officiel 3008 HDi/BlueHDi 130 EAT8 (PDF)',
        url: 'https://www.forum-peugeot.com/wp-content/uploads/2016/06/planentretien3008hdi130eat8.pdf',
        consulte: CONSULTE,
      },
      {
        label: 'Garage Raymond — plan d’entretien 3008 1.5 BlueHDi 130 (révision renforcée)',
        url: 'https://www.garageraymond.fr/Blog/plan-entretien-peugeot-3008-1-5-bluehdi',
        consulte: CONSULTE,
      },
    ],
    notes:
      'RAPPEL CONSTRUCTEUR (Stellantis, code MXL / SR/02658/25) : chaîne de distribution des 1.5 BlueHDi 130 produits d’oct. 2017 à janv. 2023 — extension de garantie 7 ans / 180 000 km. ' +
      'Révision renforcée (filtres + purge frein) tous les 60 000 km. FAP : contrôle du colmatage à 180 000 km puis tous les 30 000 km.',
  },
  {
    id: 'stellantis-puretech-eb2',
    marques: ['Peugeot', 'Citroën'],
    modeles: ['208', '2008', '3008 II', '308 III', 'C3', 'C3 Aircross', 'C4 Cactus'],
    motorisations: ['1.2 PureTech 82', '1.2 PureTech 100', '1.2 PureTech 110', '1.2 PureTech 130', 'PureTech', '1.2 TCe'],
    codesMoteur: ['EB2', 'EB2D', 'EB2DT', 'HN05'],
    carburant: 'essence',
    operations: [
      { categorie: 'vidange', libelle: 'Vidange + filtre à huile', intervalleKm: 15000, intervalleMois: 12, gravite: 'importante' },
      { categorie: 'filtres', libelle: "Filtre d'habitacle", intervalleKm: 25000, intervalleMois: 24 },
      { categorie: 'filtres', libelle: 'Filtre à air', intervalleKm: 50000, intervalleMois: 48 },
      { categorie: 'bougies', libelle: "Bougies d'allumage", intervalleKm: 50000, intervalleMois: 48 },
      { categorie: 'freins', libelle: 'Liquide de frein', intervalleKm: null, intervalleMois: 24, gravite: 'importante' },
      { categorie: 'distribution', libelle: 'Kit courroie de distribution (+ pompe à eau)', intervalleKm: 100000, intervalleMois: 72, gravite: 'critique' },
    ],
    sources: [
      {
        label: 'L’Argus — note technique Stellantis 4006/V2 (distribution PureTech : 100 000 km / 6 ans)',
        url: 'https://www.largus.fr/actualite-automobile/moteur-12-puretech-psa-quand-remplacer-la-courroie-de-distribution-10590390.html',
        consulte: CONSULTE,
      },
      {
        label: 'Peugeot — plan d’entretien officiel 208 1.2 PureTech 110 (PDF)',
        url: 'https://www.forum-peugeot.com/wp-content/uploads/2016/08/planentretien208puretech110bvm6.pdf',
        consulte: CONSULTE,
      },
    ],
    notes:
      'Courroie IMMERGÉE (« wet belt ») : l’ancienne préconisation 175 000 km / 10 ans a été remplacée par Stellantis (note 4006/V2, déc. 2022) par 100 000 km ou 6 ans — rappels sur les motorisations PureTech, contrôles renforcés. ' +
      'Vidange : le plan officiel annonce 25 000 km (conditions normales) / 15 000 km (conditions sévères) — 15 000 km retenu. Intervalles de la famille moteur EB2 : vérifier sur le carnet (filtres variables selon carrosserie).',
  },
  {
    id: 'vw-golf7-16tdi',
    marques: ['Volkswagen'],
    modeles: ['Golf VII', 'Golf 7', 'Golf'],
    motorisations: ['1.6 TDI 90', '1.6 TDI 105', '1.6 TDI 110', '1.6 TDI 115', '1.6 TDI'],
    codesMoteur: ['CXXA', 'CXXB', 'CLHA', 'CUUA'],
    carburant: 'diesel',
    operations: [
      { categorie: 'vidange', libelle: 'Vidange + filtre à huile', intervalleKm: 15000, intervalleMois: 12, gravite: 'importante' },
      { categorie: 'filtres', libelle: 'Filtre à gazole', intervalleKm: 60000, intervalleMois: null },
      { categorie: 'filtres', libelle: 'Filtre à pollen', intervalleKm: 30000, intervalleMois: 24 },
      { categorie: 'freins', libelle: 'Liquide de frein', intervalleKm: null, intervalleMois: 24, gravite: 'importante' },
      { categorie: 'distribution', libelle: 'Kit courroie de distribution', intervalleKm: 210000, intervalleMois: 84, gravite: 'critique' },
    ],
    sources: [
      {
        label: 'Haynes — carnet d’entretien Golf VII 1.6 TDI (vidange 15 000 km / 12 mois)',
        url: 'https://fr-rta.haynes.com/pages/carnet-entretien-auto-volkswagen-golf-vii-2013-2021',
        consulte: CONSULTE,
      },
      {
        label: 'odopass — plan d’entretien Golf 7 (distribution 1.6 TDI : 210 000 km)',
        url: 'https://www.odopass.fr/blog/plan-entretien-volkswagen-golf-7-carnet-programme-guide-complet',
        consulte: CONSULTE,
      },
    ],
    notes:
      'Vidange : régime fixe 15 000 km / 1 an, OU régime LongLife 30 000 km / 2 ans avec huile VW 507.00 impérative. ' +
      'Distribution : 210 000 km ; la limite temporelle diverge selon les sources (4 à 14 ans) — 7 ans retenu, contrôle visuel à chaque vidange, vérifier le carnet.',
  },
  {
    id: 'dacia-k9k-dci',
    marques: ['Dacia'],
    modeles: ['Duster', 'Duster II', 'Sandero', 'Sandero Stepway', 'Logan'],
    motorisations: ['1.5 dCi 85', '1.5 dCi 90', '1.5 dCi 110', '1.5 dCi 115', '1.5 Blue dCi 115', '1.5 dCi'],
    codesMoteur: ['K9K'],
    carburant: 'diesel',
    operations: [
      { categorie: 'vidange', libelle: 'Vidange + filtre à huile (OCS)', intervalleKm: 30000, intervalleMois: 24, gravite: 'importante' },
      { categorie: 'filtres', libelle: "Filtre d'habitacle", intervalleKm: 30000, intervalleMois: null },
      { categorie: 'filtres', libelle: 'Filtre à air', intervalleKm: 60000, intervalleMois: 48 },
      { categorie: 'filtres', libelle: 'Filtre à gazole', intervalleKm: 30000, intervalleMois: null },
      { categorie: 'freins', libelle: 'Liquide de frein', intervalleKm: null, intervalleMois: 24, gravite: 'importante' },
      { categorie: 'liquides', libelle: 'Liquide de refroidissement', intervalleKm: null, intervalleMois: 60 },
      { categorie: 'distribution', libelle: 'Kit distribution + pompe à eau', intervalleKm: 160000, intervalleMois: 72, gravite: 'critique' },
    ],
    sources: [
      {
        label: 'odopass — programme d’entretien Dacia Duster (1.5 dCi, distribution 120 000 km / 6 ans)',
        url: 'https://www.odopass.fr/blog/programme-entretien-dacia-duster-carnet-plan-guide',
        consulte: CONSULTE,
      },
      {
        label: 'Feu Vert — intervalles distribution Duster 1.5 dCi (160 000 km / 6 ans)',
        url: 'https://www.feuvert.fr/prestation-courroie-distribution-4288/dacia-139/duster-38462',
        consulte: CONSULTE,
      },
    ],
    notes:
      'Vidange : système OCS adaptatif (max 30 000 km / 2 ans) ; certains réseaux conseillent 15 000 km / 1 an selon usage. ' +
      'Distribution : sources divergentes (120 000 km ou 160 000 km, 6 ans) — 160 000 km / 6 ans retenu (Feu Vert, consensus K9K après 2006), à vérifier sur le carnet.',
  },
]
