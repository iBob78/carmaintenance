// Données fictives de démonstration — AUCUNE donnée réelle.
// Objectif : construire et tester le rapport de vente PDF avant toute
// connexion à de vraies données (voir plan de développement, étape 5).
// Le jeu contient volontairement une incohérence kilométrique et des
// justificatifs sans fichier pour éprouver les systèmes de transparence.

import type { AppDatabase } from '../../domain/types'
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_KEYS, defaultInterval } from '../../domain/catalog'

function iso(date: string): string {
  return date
}

export function buildSeedDatabase(): AppDatabase {
  const profile = {
    id: 'profile-demo',
    nom: 'Jean Dupont',
    email: 'jean.dupont@example.fr',
    telephone: '06 00 00 00 00',
    createdAt: iso('2023-01-10T09:00:00Z'),
  }

  const vehicle1Id = 'veh-clio-demo'
  const vehicle2Id = 'veh-3008-demo'

  const vehicles: AppDatabase['vehicles'] = [
    {
      id: vehicle1Id,
      ownerId: profile.id,
      ownerName: profile.nom,
      marque: 'Renault',
      modele: 'Clio IV',
      generation: 'IV (2012–2019)',
      finition: 'Intens',
      annee: 2018,
      premiereImmatriculation: '2018-06-12',
      motorisation: '1.2 TCe 120',
      codeMoteur: 'H5FT',
      cylindreeCm3: 1197,
      carburant: 'essence',
      transmission: 'manuelle',
      vin: 'VF1R9800167234567',
      immatriculation: 'AB-123-CD',
      dateAcquisition: '2021-03-15',
      kilometrageActuel: 87400,
      couleur: 'Bleu Iron',
      notes: 'Véhicule suivi depuis l’acquisition. Entretiens réalisés pour la plupart au Garage AutoPlus.',
      createdAt: iso('2023-01-10T09:05:00Z'),
      updatedAt: iso('2026-10-01T10:00:00Z'),
    },
    {
      id: vehicle2Id,
      ownerId: profile.id,
      ownerName: profile.nom,
      marque: 'Peugeot',
      modele: '3008 II',
      generation: 'II (2016–2024)',
      finition: 'Allure',
      annee: 2020,
      premiereImmatriculation: '2020-03-02',
      motorisation: 'BlueHDi 130',
      codeMoteur: 'DV5RC',
      cylindreeCm3: 1499,
      carburant: 'diesel',
      transmission: 'automatique',
      vin: 'VF3LBHZTXHS123456',
      immatriculation: 'EF-456-GH',
      dateAcquisition: '2022-09-01',
      kilometrageActuel: 62150,
      couleur: 'Gris Platinium',
      createdAt: iso('2023-01-10T09:10:00Z'),
      updatedAt: iso('2026-09-15T10:00:00Z'),
    },
  ]

  // --- Relevés kilométriques ------------------------------------------------
  const odometerReadings: AppDatabase['odometerReadings'] = [
    { id: 'odo-01', vehicleId: vehicle1Id, date: '2021-03-15', valeurKm: 41200, source: 'utilisateur', sourceInformation: 'declare', note: 'Relevé à l’acquisition', createdAt: iso('2021-03-15T18:00:00Z') },
    { id: 'odo-02', vehicleId: vehicle1Id, date: '2024-04-18', valeurKm: 62300, source: 'facture', sourceInformation: 'documente', documentId: 'doc-01', createdAt: iso('2024-04-18T18:00:00Z') },
    { id: 'odo-03', vehicleId: vehicle1Id, date: '2025-03-22', valeurKm: 75800, source: 'facture', sourceInformation: 'documente', documentId: 'doc-03', createdAt: iso('2025-03-22T18:00:00Z') },
    { id: 'odo-04', vehicleId: vehicle1Id, date: '2025-06-14', valeurKm: 80200, source: 'controle', sourceInformation: 'documente', documentId: 'doc-04', createdAt: iso('2025-06-14T18:00:00Z') },
    { id: 'odo-05', vehicleId: vehicle1Id, date: '2026-02-10', valeurKm: 84900, source: 'facture', sourceInformation: 'documente', documentId: 'doc-05', createdAt: iso('2026-02-10T18:00:00Z') },
    { id: 'odo-06', vehicleId: vehicle1Id, date: '2026-09-28', valeurKm: 87400, source: 'utilisateur', sourceInformation: 'declare', createdAt: iso('2026-09-28T09:00:00Z') },
    { id: 'odo-07', vehicleId: vehicle2Id, date: '2022-09-01', valeurKm: 29800, source: 'utilisateur', sourceInformation: 'declare', note: 'Relevé à l’acquisition', createdAt: iso('2022-09-01T18:00:00Z') },
    { id: 'odo-08', vehicleId: vehicle2Id, date: '2024-11-08', valeurKm: 41200, source: 'facture', sourceInformation: 'documente', documentId: 'doc-08', createdAt: iso('2024-11-08T18:00:00Z') },
    { id: 'odo-09', vehicleId: vehicle2Id, date: '2025-09-30', valeurKm: 52800, source: 'controle', sourceInformation: 'documente', documentId: 'doc-09', createdAt: iso('2025-09-30T18:00:00Z') },
    { id: 'odo-10', vehicleId: vehicle2Id, date: '2026-01-25', valeurKm: 58400, source: 'facture', sourceInformation: 'documente', documentId: 'doc-11', createdAt: iso('2026-01-25T18:00:00Z') },
    { id: 'odo-11', vehicleId: vehicle2Id, date: '2026-09-15', valeurKm: 62150, source: 'utilisateur', sourceInformation: 'declare', createdAt: iso('2026-09-15T09:00:00Z') },
  ]

  // --- Interventions --------------------------------------------------------
  const serviceRecords: AppDatabase['serviceRecords'] = [
    {
      id: 'srv-01', vehicleId: vehicle1Id, date: '2024-04-18', kilometrage: 62300, categorie: 'vidange',
      titre: 'Vidange moteur + filtre à huile', description: 'Vidange complète avec huile 5W30 norme RN17, remplacement du filtre à huile.',
      statut: 'effectue', realisateur: 'garage', garage: 'Garage AutoPlus', coutTotal: 89.9,
      sourceInformation: 'documente', documentId: 'doc-01', createdAt: iso('2024-04-18T18:00:00Z'), updatedAt: iso('2024-04-18T18:00:00Z'),
    },
    {
      id: 'srv-02', vehicleId: vehicle1Id, date: '2024-08-05', kilometrage: 68100, categorie: 'freins',
      titre: 'Remplacement plaquettes avant', description: 'Plaquettes de frein avant remplacées, disques conformes (épaisseur mesurée).',
      statut: 'effectue', realisateur: 'garage', garage: 'Garage AutoPlus', coutTotal: 180,
      sourceInformation: 'documente', documentId: 'doc-02', createdAt: iso('2024-08-05T18:00:00Z'), updatedAt: iso('2024-08-05T18:00:00Z'),
    },
    {
      id: 'srv-03', vehicleId: vehicle1Id, date: '2025-03-22', kilometrage: 75800, categorie: 'vidange',
      titre: 'Vidange moteur + filtres', description: 'Vidange, filtre à huile et filtre à habitacle remplacés.',
      statut: 'effectue', realisateur: 'garage', garage: 'Garage AutoPlus', coutTotal: 120,
      sourceInformation: 'documente', documentId: 'doc-03', createdAt: iso('2025-03-22T18:00:00Z'), updatedAt: iso('2025-03-22T18:00:00Z'),
    },
    {
      id: 'srv-04', vehicleId: vehicle1Id, date: '2025-06-14', kilometrage: 80200, categorie: 'controle_technique',
      titre: 'Contrôle technique périodique', description: 'Contrôle technique favorable, sans contre-visite.',
      statut: 'effectue', realisateur: 'professionnel', garage: 'Centre CT Saint-Ouen', coutTotal: 85,
      sourceInformation: 'documente', documentId: 'doc-04', createdAt: iso('2025-06-14T18:00:00Z'), updatedAt: iso('2025-06-14T18:00:00Z'),
    },
    {
      id: 'srv-05', vehicleId: vehicle1Id, date: '2026-02-10', kilometrage: 84900, categorie: 'vidange',
      titre: 'Vidange moteur + jeu de pneus', description: 'Vidange (huile 5W30) et remplacement des 4 pneumatiques (Michelin Primacy 4).',
      statut: 'effectue', realisateur: 'garage', garage: 'Garage AutoPlus', coutTotal: 515,
      notes: 'Facture groupée vidange + pneus, documentée.',
      sourceInformation: 'documente', documentId: 'doc-05', createdAt: iso('2026-02-10T18:00:00Z'), updatedAt: iso('2026-02-10T18:00:00Z'),
    },
    {
      id: 'srv-06', vehicleId: vehicle1Id, date: '2026-09-30', kilometrage: 88500, categorie: 'distribution',
      titre: 'Remplacement kit de distribution (prévu)', description: 'Remplacement prévisionnel du kit de distribution et de la pompe à eau.',
      statut: 'prevu', realisateur: 'garage', garage: 'Garage AutoPlus',
      sourceInformation: 'declare', createdAt: iso('2026-10-01T10:00:00Z'), updatedAt: iso('2026-10-01T10:00:00Z'),
    },
    {
      id: 'srv-07', vehicleId: vehicle2Id, date: '2024-11-08', kilometrage: 41200, categorie: 'vidange',
      titre: 'Révision 40 000 km', description: 'Vidange moteur, filtre à huile, filtre à air, contrôle des niveaux.',
      statut: 'effectue', realisateur: 'professionnel', garage: 'Concession Peugeot', coutTotal: 285,
      sourceInformation: 'documente', documentId: 'doc-08', createdAt: iso('2024-11-08T18:00:00Z'), updatedAt: iso('2024-11-08T18:00:00Z'),
    },
    {
      id: 'srv-08', vehicleId: vehicle2Id, date: '2025-09-30', kilometrage: 52800, categorie: 'controle_technique',
      titre: 'Contrôle technique périodique', description: 'Contrôle technique favorable.',
      statut: 'effectue', realisateur: 'professionnel', garage: 'Centre CT Boulogne', coutTotal: 85,
      sourceInformation: 'documente', documentId: 'doc-09', createdAt: iso('2025-09-30T18:00:00Z'), updatedAt: iso('2025-09-30T18:00:00Z'),
    },
    {
      id: 'srv-09', vehicleId: vehicle2Id, date: '2026-01-25', kilometrage: 58400, categorie: 'freins',
      titre: 'Révision 60 000 km anticipée + freins', description: 'Vidange, plaquettes et disques avant remplacés, purge du liquide de frein.',
      statut: 'effectue', realisateur: 'professionnel', garage: 'Concession Peugeot', coutTotal: 365,
      sourceInformation: 'documente', documentId: 'doc-11', createdAt: iso('2026-01-25T18:00:00Z'), updatedAt: iso('2026-01-25T18:00:00Z'),
    },
    {
      id: 'srv-10', vehicleId: vehicle2Id, date: '2026-04-02', kilometrage: 60300, categorie: 'climatisation',
      titre: 'Recharge climatisation', description: 'Contrôle d’étanchéité et recharge de gaz R1234yf.',
      statut: 'effectue', realisateur: 'professionnel', garage: 'Clim Auto Paris', coutTotal: 90,
      sourceInformation: 'declare', createdAt: iso('2026-04-02T18:00:00Z'), updatedAt: iso('2026-04-02T18:00:00Z'),
    },
    {
      id: 'srv-11', vehicleId: vehicle2Id, date: '2026-03-12', kilometrage: 61000, categorie: 'pneus',
      titre: 'Rotation des pneumatiques', description: 'Rotation avant/arrière effectuée lors d’un passage atelier.',
      statut: 'non_realise', realisateur: 'proprietaire', notes: 'Reportée : pas le temps lors du passage.',
      sourceInformation: 'declare', createdAt: iso('2026-03-12T18:00:00Z'), updatedAt: iso('2026-03-12T18:00:00Z'),
    },
    {
      // Intervention volontairement incohérente (km > dernier relevé connu) pour tester le signalement.
      id: 'srv-12', vehicleId: vehicle2Id, date: '2026-07-18', kilometrage: 64800, categorie: 'filtres',
      titre: 'Remplacement filtre à carburant', description: 'Filtre à carburant remplacé par le propriétaire.',
      statut: 'effectue', realisateur: 'proprietaire', coutTotal: 42.5,
      notes: 'Kilométrage saisi de mémoire — à vérifier.',
      sourceInformation: 'declare', createdAt: iso('2026-07-18T18:00:00Z'), updatedAt: iso('2026-07-18T18:00:00Z'),
    },
  ]

  const serviceRecordItems: AppDatabase['serviceRecordItems'] = [
    { id: 'itm-01', serviceRecordId: 'srv-01', kind: 'consommable', libelle: 'Huile moteur 5W30 (4 L)', reference: 'RN17', marque: 'Elf', quantite: 1, prixUnitaire: 45.9, prixTotal: 45.9 },
    { id: 'itm-02', serviceRecordId: 'srv-01', kind: 'piece', libelle: 'Filtre à huile', reference: 'OX 388D', marque: 'Mann', quantite: 1, prixUnitaire: 12, prixTotal: 12 },
    { id: 'itm-03', serviceRecordId: 'srv-01', kind: 'main_oeuvre', libelle: 'Main-d’œuvre vidange (0,5 h)', quantite: 1, prixUnitaire: 32, prixTotal: 32 },
    { id: 'itm-04', serviceRecordId: 'srv-02', kind: 'piece', libelle: 'Jeu de plaquettes avant', reference: 'P 85 126', marque: 'Brembo', quantite: 1, prixUnitaire: 65, prixTotal: 65 },
    { id: 'itm-05', serviceRecordId: 'srv-02', kind: 'main_oeuvre', libelle: 'Main-d’œuvre plaquettes (1 h)', quantite: 1, prixUnitaire: 65, prixTotal: 65 },
    { id: 'itm-06', serviceRecordId: 'srv-03', kind: 'consommable', libelle: 'Huile moteur 5W30 (4 L)', marque: 'Elf', quantite: 1, prixTotal: 45.9 },
    { id: 'itm-07', serviceRecordId: 'srv-03', kind: 'piece', libelle: 'Filtre à habitacle', reference: 'CU 2939', marque: 'Mann', quantite: 1, prixTotal: 18 },
    { id: 'itm-08', serviceRecordId: 'srv-05', kind: 'piece', libelle: 'Pneumatiques Michelin Primacy 4 205/55 R16', reference: 'Primacy 4', marque: 'Michelin', quantite: 4, prixUnitaire: 98, prixTotal: 392 },
    { id: 'itm-09', serviceRecordId: 'srv-05', kind: 'consommable', libelle: 'Huile moteur 5W30 + filtre', quantite: 1, prixTotal: 58 },
    { id: 'itm-10', serviceRecordId: 'srv-07', kind: 'prestation', libelle: 'Forfait révision 40 000 km', quantite: 1, prixTotal: 285 },
    { id: 'itm-11', serviceRecordId: 'srv-09', kind: 'piece', libelle: 'Plaquettes + disques avant', quantite: 1, prixTotal: 240 },
    { id: 'itm-12', serviceRecordId: 'srv-12', kind: 'piece', libelle: 'Filtre à carburant', reference: 'WK 820/25', marque: 'Mann', quantite: 1, prixTotal: 42.5 },
  ]

  // --- Pannes ---------------------------------------------------------------
  const faults: AppDatabase['faults'] = [
    {
      id: 'flt-01', vehicleId: vehicle1Id,
      symptomes: 'Voyant moteur allumé intermittant, ralenti irrégulier à froid',
      circonstances: 'Apparu lors des démarrages matinaux par temps froid, disparaît après 2–3 minutes.',
      codesDefaut: 'P0301 (raté d’allumage cylindre 1)',
      hypothese: 'Bougies d’allumage usées ou bobine fatiguée.',
      testsRealises: 'Lecture valise (P0301), inversion bobines 1 et 2 (le défaut reste sur le cylindre 1), contrôle de l’état des bougies.',
      resultat: 'Raté confirmé sur le cylindre 1, indépendant de la bobine.',
      piecesRemplacees: 'Bougies d’allumage (jeu de 4) — remplacement réalisé par le propriétaire.',
      dateSignalement: '2025-11-02', dateResolution: '2025-11-16', statut: 'resolu',
      serviceRecordId: undefined, sourceInformation: 'declare',
      createdAt: iso('2025-11-02T18:00:00Z'), updatedAt: iso('2025-11-16T18:00:00Z'),
    },
    {
      id: 'flt-02', vehicleId: vehicle2Id,
      symptomes: 'Sifflement léger à la remise des gaz entre 1 500 et 2 500 tr/min',
      circonstances: 'Apparu progressivement depuis l’été 2026, plus audible fenêtres ouvertes.',
      codesDefaut: 'Aucun code défaut enregistré',
      hypothese: 'Possible prise d’air sur le circuit d’admission ou turbo fatigué — non confirmé.',
      testsRealises: 'Contrôle visuel des durites (rien de manifeste), lecture valise sans code.',
      resultat: 'Non concluant à ce stade.',
      piecesRemplacees: 'Aucune pièce remplacée à ce jour.',
      dateSignalement: '2026-08-20', statut: 'ouvert',
      sourceInformation: 'declare',
      createdAt: iso('2026-08-20T18:00:00Z'), updatedAt: iso('2026-08-20T18:00:00Z'),
    },
    {
      id: 'flt-03', vehicleId: vehicle1Id,
      symptomes: 'Climatisation peu efficace en ville',
      circonstances: 'Signalé pendant la canicule de juillet 2025.',
      hypothese: 'Charge de gaz insuffisante.',
      testsRealises: 'Contrôle de pression en atelier.',
      resultat: 'Recharge effectuée (cf. dépenses), efficacité jugée meilleure. Résolution non confirmée par une mesure.',
      piecesRemplacees: 'Aucune.',
      dateSignalement: '2025-07-12', dateResolution: '2025-07-20', statut: 'resolution_non_confirmee',
      sourceInformation: 'declare',
      createdAt: iso('2025-07-12T18:00:00Z'), updatedAt: iso('2025-07-20T18:00:00Z'),
    },
  ]

  // --- Achats ---------------------------------------------------------------
  const purchases: AppDatabase['purchases'] = [
    {
      id: 'pur-01', vehicleId: vehicle1Id, date: '2025-11-10', libelle: 'Jeu de bougies d’allumage',
      reference: 'ILZKR7B11', marque: 'NGK', quantite: 4, prixTotal: 48, fournisseur: 'Norauto',
      notes: 'Posées par le propriétaire le 16/11/2025 (voir panne flt-01).',
      createdAt: iso('2025-11-10T18:00:00Z'),
    },
    {
      id: 'pur-02', vehicleId: vehicle1Id, date: '2026-05-04', libelle: 'Balais d’essuie-glace avants',
      reference: 'EV18', marque: 'Bosch', quantite: 2, prixTotal: 34.5, fournisseur: 'Amazon',
      createdAt: iso('2026-05-04T18:00:00Z'),
    },
  ]

  // --- Documents ------------------------------------------------------------
  const documents: AppDatabase['documents'] = [
    { id: 'doc-01', vehicleId: vehicle1Id, serviceRecordId: 'srv-01', filename: 'facture-vidange-2024-04-18.pdf', mimeType: 'application/pdf', tailleOctets: 148230, dateDocument: '2024-04-18', kind: 'facture', disponible: false, createdAt: iso('2024-04-18T18:00:00Z') },
    { id: 'doc-02', vehicleId: vehicle1Id, serviceRecordId: 'srv-02', filename: 'facture-plaquettes-2024-08-05.pdf', mimeType: 'application/pdf', tailleOctets: 121450, dateDocument: '2024-08-05', kind: 'facture', disponible: false, createdAt: iso('2024-08-05T18:00:00Z') },
    { id: 'doc-03', vehicleId: vehicle1Id, serviceRecordId: 'srv-03', filename: 'facture-vidange-filtres-2025-03-22.pdf', mimeType: 'application/pdf', tailleOctets: 132800, dateDocument: '2025-03-22', kind: 'facture', disponible: false, createdAt: iso('2025-03-22T18:00:00Z') },
    { id: 'doc-04', vehicleId: vehicle1Id, serviceRecordId: 'srv-04', filename: 'pv-controle-technique-2025-06-14.pdf', mimeType: 'application/pdf', tailleOctets: 95200, dateDocument: '2025-06-14', kind: 'pv_controle', disponible: false, createdAt: iso('2025-06-14T18:00:00Z') },
    { id: 'doc-05', vehicleId: vehicle1Id, serviceRecordId: 'srv-05', filename: 'facture-vidange-pneus-2026-02-10.pdf', mimeType: 'application/pdf', tailleOctets: 187600, dateDocument: '2026-02-10', kind: 'facture', disponible: false, createdAt: iso('2026-02-10T18:00:00Z') },
    { id: 'doc-06', vehicleId: vehicle1Id, filename: 'photo-usure-disques-2025-08-05.jpg', mimeType: 'image/jpeg', tailleOctets: 842000, dateDocument: '2025-08-05', kind: 'photo', disponible: false, createdAt: iso('2025-08-05T18:00:00Z') },
    { id: 'doc-07', vehicleId: vehicle1Id, filename: 'carnet-entretien-scanne.pdf', mimeType: 'application/pdf', tailleOctets: 2140000, dateDocument: '2023-02-01', kind: 'autre', disponible: false, createdAt: iso('2023-02-01T18:00:00Z') },
    { id: 'doc-08', vehicleId: vehicle2Id, serviceRecordId: 'srv-07', filename: 'facture-revision-40000-2024-11-08.pdf', mimeType: 'application/pdf', tailleOctets: 156000, dateDocument: '2024-11-08', kind: 'facture', disponible: false, createdAt: iso('2024-11-08T18:00:00Z') },
    { id: 'doc-09', vehicleId: vehicle2Id, serviceRecordId: 'srv-08', filename: 'pv-controle-technique-2025-09-30.pdf', mimeType: 'application/pdf', tailleOctets: 91200, dateDocument: '2025-09-30', kind: 'pv_controle', disponible: false, createdAt: iso('2025-09-30T18:00:00Z') },
    { id: 'doc-11', vehicleId: vehicle2Id, serviceRecordId: 'srv-09', filename: 'facture-revision-60000-2026-01-25.pdf', mimeType: 'application/pdf', tailleOctets: 162300, dateDocument: '2026-01-25', kind: 'facture', disponible: false, createdAt: iso('2026-01-25T18:00:00Z') },
  ]

  // --- Dépenses -------------------------------------------------------------
  const expenses: AppDatabase['expenses'] = [
    { id: 'exp-01', vehicleId: vehicle1Id, date: '2024-04-18', categorie: 'main_oeuvre', libelle: 'Vidange — facture Garage AutoPlus', montant: 89.9, link: 'service_record', serviceRecordId: 'srv-01', documentId: 'doc-01', createdAt: iso('2024-04-18T18:00:00Z') },
    { id: 'exp-02', vehicleId: vehicle1Id, date: '2024-08-05', categorie: 'main_oeuvre', libelle: 'Plaquettes avant — facture Garage AutoPlus', montant: 180, link: 'service_record', serviceRecordId: 'srv-02', documentId: 'doc-02', createdAt: iso('2024-08-05T18:00:00Z') },
    { id: 'exp-03', vehicleId: vehicle1Id, date: '2025-03-22', categorie: 'main_oeuvre', libelle: 'Vidange + filtres — facture Garage AutoPlus', montant: 120, link: 'service_record', serviceRecordId: 'srv-03', documentId: 'doc-03', createdAt: iso('2025-03-22T18:00:00Z') },
    { id: 'exp-04', vehicleId: vehicle1Id, date: '2025-06-14', categorie: 'controle_technique', libelle: 'Contrôle technique', montant: 85, link: 'service_record', serviceRecordId: 'srv-04', documentId: 'doc-04', createdAt: iso('2025-06-14T18:00:00Z') },
    { id: 'exp-05', vehicleId: vehicle1Id, date: '2025-11-10', categorie: 'pieces', libelle: 'Bougies NGK (achat personnel)', montant: 48, link: 'purchase', purchaseId: 'pur-01', createdAt: iso('2025-11-10T18:00:00Z') },
    { id: 'exp-06', vehicleId: vehicle1Id, date: '2026-02-10', categorie: 'prestations', libelle: 'Vidange + 4 pneus — facture groupée', montant: 515, link: 'service_record', serviceRecordId: 'srv-05', documentId: 'doc-05', createdAt: iso('2026-02-10T18:00:00Z') },
    { id: 'exp-07', vehicleId: vehicle1Id, date: '2026-05-04', categorie: 'pieces', libelle: 'Balais d’essuie-glace', montant: 34.5, link: 'purchase', purchaseId: 'pur-02', createdAt: iso('2026-05-04T18:00:00Z') },
    { id: 'exp-08', vehicleId: vehicle1Id, date: '2025-07-20', categorie: 'autre', libelle: 'Recharge climatisation', montant: 75, inconnu: false, link: 'aucun', notes: 'Espèces, sans facture détaillée.', createdAt: iso('2025-07-20T18:00:00Z') },
    { id: 'exp-09', vehicleId: vehicle1Id, date: '2026-03-02', categorie: 'autre', libelle: 'Dépense non documentée', montant: 60, inconnu: true, link: 'aucun', notes: 'Nature exacte inconnue (retrait bancaire repéré).', createdAt: iso('2026-03-02T18:00:00Z') },
    { id: 'exp-10', vehicleId: vehicle2Id, date: '2024-11-08', categorie: 'prestations', libelle: 'Révision 40 000 km — Concession Peugeot', montant: 285, link: 'service_record', serviceRecordId: 'srv-07', documentId: 'doc-08', createdAt: iso('2024-11-08T18:00:00Z') },
    { id: 'exp-11', vehicleId: vehicle2Id, date: '2025-09-30', categorie: 'controle_technique', libelle: 'Contrôle technique', montant: 85, link: 'service_record', serviceRecordId: 'srv-08', documentId: 'doc-09', createdAt: iso('2025-09-30T18:00:00Z') },
    { id: 'exp-12', vehicleId: vehicle2Id, date: '2026-01-25', categorie: 'main_oeuvre', libelle: 'Révision 60 000 km + freins', montant: 365, link: 'service_record', serviceRecordId: 'srv-09', documentId: 'doc-11', createdAt: iso('2026-01-25T18:00:00Z') },
    { id: 'exp-13', vehicleId: vehicle2Id, date: '2026-04-02', categorie: 'prestations', libelle: 'Recharge climatisation', montant: 90, link: 'service_record', serviceRecordId: 'srv-10', createdAt: iso('2026-04-02T18:00:00Z') },
    { id: 'exp-14', vehicleId: vehicle2Id, date: '2026-07-18', categorie: 'pieces', libelle: 'Filtre à carburant', montant: 42.5, link: 'service_record', serviceRecordId: 'srv-12', createdAt: iso('2026-07-18T18:00:00Z') },
    {
      id: 'exp-15', vehicleId: vehicle2Id, date: '2025-12-05', categorie: 'autre', libelle: 'Réparation pare-choc arrière',
      montant: 320, remboursement: 320, remboursementDate: '2025-12-20', inconnu: false, link: 'aucun',
      notes: 'Prise en charge intégrale par l’assurance (remboursement enregistré).',
      createdAt: iso('2025-12-05T18:00:00Z'),
    },
  ]

  // --- Rappels ---------------------------------------------------------------
  const reminders: AppDatabase['reminders'] = [
    { id: 'rem-01', vehicleId: vehicle1Id, categorie: 'distribution', libelle: 'Kit de distribution (courroie + pompe à eau)', declencheur: 'km', seuilKm: 90000, statut: 'a_faire', createdAt: iso('2025-01-10T10:00:00Z') },
    { id: 'rem-02', vehicleId: vehicle1Id, categorie: 'controle_technique', libelle: 'Contrôle technique bisannuel', declencheur: 'date', dateCible: '2027-06-14', statut: 'a_faire', createdAt: iso('2025-06-14T18:00:00Z') },
    { id: 'rem-03', vehicleId: vehicle2Id, categorie: 'vidange', libelle: 'Prochaine vidange (60 000 km)', declencheur: 'km_et_date', seuilKm: 73400, dateCible: '2027-01-25', statut: 'a_faire', createdAt: iso('2026-01-25T18:00:00Z') },
    { id: 'rem-04', vehicleId: vehicle1Id, categorie: 'freins', libelle: 'Contrôle épaisseur disques arrière', declencheur: 'km', seuilKm: 88000, statut: 'en_retard', createdAt: iso('2025-09-01T10:00:00Z') },
  ]

  // --- Intervalles par défaut ------------------------------------------------
  const maintenanceTasks: AppDatabase['maintenanceTasks'] = []
  for (const vehicle of vehicles) {
    for (const categorie of SERVICE_CATEGORY_KEYS) {
      const { km, mois } = defaultInterval(categorie, vehicle.carburant)
      maintenanceTasks.push({
        id: `task-${vehicle.id}-${categorie}`,
        vehicleId: vehicle.id,
        categorie,
        libelle: SERVICE_CATEGORIES[categorie].label,
        intervalleKm: km,
        intervalleMois: mois,
        actif: categorie !== 'autre' && !(categorie === 'vidange' && vehicle.carburant === 'electrique'),
        createdAt: iso('2023-01-10T09:00:00Z'),
      })
    }
  }

  return {
    profile,
    vehicles,
    odometerReadings,
    maintenanceTasks,
    serviceRecords,
    serviceRecordItems,
    faults,
    purchases,
    documents,
    expenses,
    reminders,
    reportExports: [],
  }
}
