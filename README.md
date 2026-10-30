# AutoCarnet — carnet d'entretien automobile libre et transparent

Projet open-source (licence **GPL-3.0**) pour les passionnés et les mécaniciens
DIY : un carnet d'entretien automobile **gratuit, moderne, transparent, sécurisé
et exploitable**, sur desktop comme sur mobile.

Deux priorités absolues structurent le projet :

1. un **carnet d'entretien fiable** (historique daté, sourcé, vérifiable) ;
2. un **rapport de vente PDF professionnel** : chaque donnée affichée est
   traçable, chaque manque est signalé, et le document précise explicitement
   qu'il **ne constitue pas une expertise** de l'état mécanique du véhicule.

---

## Fonctionnalités

### Parc de véhicules (multi-véhicules par compte)

Identité complète : marque, modèle, génération, finition, année, date de
1<sup>re</sup> immatriculation, motorisation, code moteur, cylindrée, carburant,
transmission, VIN, photos, date d'acquisition — et relevés kilométriques
**datés et sourcés**.

### Carnet d'entretien

- Interventions : date, kilométrage, catégorie (vidange, freins, distribution…),
  description, notes ;
- pièces (références, marques), consommables, main-d'œuvre, coûts ;
- réalisé par : propriétaire, garage, professionnel ;
- factures et photos jointes ;
- statuts : `effectué`, `prévu`, `annulé`, `non réalisé`.

### Pannes, réparations et dépenses

- Pannes : symptômes, circonstances, codes défaut, hypothèses, tests,
  pièces remplacées ; statuts `ouverte`, `résolue`, `réapparue`,
  `résolution non confirmée` ;
- dépenses : pièces et prestations, totaux par année et catégorie,
  remboursements, dépenses inconnues ; déduplication stricte facture /
  intervention liée (aucun double comptage) ;
- documents privés liés aux interventions, indexés (nom, date, intervention
  liée) ;
- rappels : échéances par date ou par kilométrage, entretiens en retard ;
- kilométrage annuel facultatif : estimation de la date de franchissement des
  seuils kilométriques depuis le dernier kilométrage daté, à titre indicatif.
  Pour un ancien véhicule sans date de référence, ajouter un relevé kilométrique.

### Suivi des pleins de carburant

- page **`/carburant`** : ajout, modification et suppression de ravitaillements par véhicule (date, compteur, litres, montant, carburant et plein complet) ;
- dépenses et volumes mensuels, prix moyen pondéré au litre et courbe historique des prix saisis ;
- consommation en L/100 km uniquement entre deux pleins complets, lorsque tous les ravitaillements intermédiaires ont été enregistrés et confirmés. L'intervalle est attribué au mois du plein final, pas réparti sur les mois traversés ;
- les pleins sont stockés localement, sans mettre à jour automatiquement le compteur du véhicule ni créer de dépense ou d'entrée dans le rapport PDF. Modifier l'historique peut nécessiter de reconfirmer le suivi du ravitaillement suivant.

### Entretien préventif : planning par modèle

- **catalogue de plans d'entretien sourcés** par famille moteur (Clio IV 1.2 TCe,
  1.5 dCi, 3008 II BlueHDi 130, PureTech EB2, Golf VII 1.6 TDI, Duster 1.5 dCi…) :
  chaque périodicité porte ses **URL sources et sa date de consultation** ; les
  divergences de sources et rappels constructeurs sont signalés, jamais lissés ;
- **appariement par code moteur** (carte grise) > motorisation > modèle + carburant ;
  sans plan connu, **aucune valeur n'est inventée** (saisie manuelle) ;
- fiche véhicule, onglet « Échéances » : tableau du planning (prochaine échéance
  calculée depuis l'historique, gravité « critique » pour la distribution) et boutons
  **« Activer le rappel »** (km et/ou date) ;
- mention permanente « à vérifier sur votre carnet d'entretien ».

### Conseils d'entretien

- page **`/conseils`** : jalons par kilométrage en cartes (contrôler / remplacer /
  rotation pneus), bons réflexes du quotidien, encart « conditions d'usage difficiles »
  (usage sévère : intervenir plus tôt) ;
- contenu **100 % sourcé** (guide CarGurus converti miles → km, sources FR), même
  discipline de traçabilité que le planning.

### Scan de documents par OCR (100 % local)

- **Carte grise → fiche véhicule** : photographiez le certificat
  d'immatriculation ; les repères officiels lettrés sont détectés avec leur
  correspondance exacte — **A** = immatriculation, **B** = 1re immatriculation,
  **D.1** = marque, **D.3** = modèle, **E = VIN (17 caractères)**, **P.1** =
  cylindrée, **P.3** = carburant (nomenclature européenne 1999/37/CE) ;
- **Facture → fiche d'intervention** : date, garage, montant TTC, kilométrage
  et lignes de facture sont proposés à l'intégration ;
- principe de transparence : **l'OCR propose, l'utilisateur valide** — chaque
  valeur est présentée avec son repère officiel, son niveau de confiance et la
  mention « à vérifier » ; les données personnelles (titulaire, adresse) sont
  désélectionnées par défaut ; les fragments non interprétés sont affichés,
  jamais masqués ;
- **confidentialité** : reconnaissance réalisée dans le navigateur
  (`tesseract.js`, français) — la photo **ne quitte jamais l'appareil**
  (essentiel pour la carte grise et les factures). Les données linguistiques
  sont téléchargées à la première utilisation puis mises en cache.

### Rapport de vente PDF (serveur, `@react-pdf/renderer`)

Parcours : **Véhicule → Générer un rapport de vente → Vérifier les données →
Options → Prévisualiser → Générer et télécharger**.

- **A4 portrait**, paginé, table des matières automatique, date de génération,
  identité du véhicule en pied de page ;
- **8 sections** : ① couverture et synthèse, ② identification, ③ historique
  complet, ④ pannes et réparations, ⑤ factures et justificatifs (+ pièces
  jointes sélectionnées), ⑥ dépenses par catégorie et période, ⑦ travaux à
  venir (retards + pannes non résolues), ⑧ méthodologie et limites ;
- **options** : sélection des sections, période de l'historique, inclusion des
  coûts, factures/photos sélectionnées, **masquage VIN / plaque / données
  personnelles** ;
- le contenu reflète **uniquement les données enregistrées** : jamais d'invention,
  jamais d'inférence de réparation à partir d'un achat de pièce, et l'absence de
  panne enregistrée est explicitement signalée comme n'étant pas la preuve d'un
  bon état ;
- **anomalies signalées, jamais corrigées** : données manquantes, incohérences
  de kilométrage ou de dates, pièces jointes inaccessibles ;
- totaux exacts (achats, interventions, remboursements déduits), accents et
  pagination soignés ;
- chaque export conserve un **instantané données + options** reproductible.

---

## Technologies

| Domaine | Choix |
|---|---|
| Application | **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** |
| Validation | **Zod** (schéma strict du rapport) |
| PDF | **@react-pdf/renderer** (génération **côté serveur**) |
| OCR | **tesseract.js** (lecture de carte grise / factures **dans le navigateur**, sans serveur ni clé API) |
| Données | Mode **démo local** (localStorage) ; intégration **Supabase** (Auth, PostgreSQL, Storage privé) à développer |
| Tests | **Vitest** (144 tests unitaires et d'intégration) |
| Licence | **GPL-3.0** |

> Le mode **démo** est actif par défaut : aucune configuration n'est nécessaire,
> un jeu de données fictif (Renault Clio, Peugeot 3008 — comprenant volontairement
> des anomalies) est utilisé localement.

---

## Installation

Prérequis : **Node.js ≥ 18** et npm.

```bash
git clone https://github.com/iBob78/carmaintenance.git
cd carmaintenance
npm install
npm run dev        # http://localhost:3000
```

Autres commandes :

```bash
npm run build      # build de production
npm start          # serveur de production
npm test           # 144 tests Vitest
npm run typecheck  # vérification TypeScript
npm run dev:clean  # dev avec purge du cache (si « Cannot find module './xxx.js' »)
```

> **Dépannage** : si le serveur de développement affiche une erreur
> « Cannot find module './…js' » (cache webpack périmé après une mise à jour
> des dépendances), lancez `npm run dev:clean` — le cache `.next` est régénéré.

### Variables d'environnement (mode Supabase)

À renseigner dans `.env.local` (copier `.env.example`) — **uniquement** quand le
mode Supabase sera activé :

| Variable | Rôle |
|---|---|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé publique (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur (génération PDF uniquement, jamais exposée au navigateur) |

### Base de données Supabase

La migration SQL complète est fournie dans
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) :
12 tables (`profiles`, `vehicles`, `odometer_readings`, `maintenance_tasks`,
`service_records`, `service_record_items`, `faults_and_tests`,
`parts_and_purchases`, `documents`, `expense_entries`, `reminders`,
`report_exports`), contraintes de cohérence, **RLS** (chaque ligne liée à un
véhicule possédé), fonctions `owns_vehicle` et `delete_user_data` (RGPD), et
**bucket de stockage privé** pour les pièces jointes.

À appliquer via `psql` ou l'éditeur SQL de Supabase :

```bash
psql "$SUPABASE_DATABASE_URL" -f supabase/migrations/0001_init.sql
```

---

## Endpoint de rapport de vente

```
POST /api/vehicles/{vehicleId}/reports/sale
```

- corps JSON : `{ "snapshot": { "schemaVersion": 1, … }, "options": { … } }`
  (5 Mo max, validé par Zod) ;
- le serveur **revalide les droits d'accès**, recalcule totaux et anomalies,
  applique la **confidentialité avant la mise en page**, puis génère et valide
  le PDF ;
- réponse : flux PDF (`Content-Disposition: attachment`) avec en-têtes
  `X-Report-Pages`, `X-Report-Bytes`, `X-Report-Anomalies`, `X-Report-Generated-At`
  et `Cache-Control: no-store` ;
- erreur JSON `{ "error": … }` : `400/403/413/422/500` ;
- aucune archive permanente du PDF : seul un **metadonnées minimal** d'export
  est conservé (reproductibilité).

---

## Tests

```bash
npm test
```

144 tests couvrant notamment : présence/absence des sections sélectionnées,
pagination d'un historique volumineux (60 interventions), gestion des
kilométrages inconnus ou incohérents, exactitude des totaux et
remboursements, masquage des données personnelles (y compris factures),
signalement des pièces jointes manquantes, validation et reproductibilité du
PDF, lecture OCR de la carte grise (repères A/B/D.1/D.3/**E=VIN**/P.3, dates,
immatriculations, données personnelles signalées) et des factures (montants
TTC/HT/TVA, kilométrage, lignes) sans jamais inventer de donnée.

Des suites dédiées couvrent aussi le **planning d'entretien par modèle**
(intégrité du catalogue sourcé, appariement par code moteur) et les **conseils**
(intégrité des sources consultées).

---

## Feuille de route

- ✅ Carnet d'entretien complet (interventions, pièces, coûts, documents)
- ✅ Pannes, réparations, dépenses, rappels
- ✅ Suivi local des pleins et statistiques mensuelles de carburant
- ✅ Scan OCR local : carte grise → fiche véhicule, facture → intervention
- ✅ Rapport de vente PDF 8 sections + confidentialité + anomalies + instantané
- ✅ Migration SQL Supabase (RLS, storage privé, suppression RGPD)
- ✅ Planning d'entretien par modèle (catalogue sourcé) + rappels activables
- ✅ Page « Conseils » : jalons d'entretien, bons réflexes, conditions sévères
- ⬜ Activation de l'adaptateur Supabase (Auth + données réelles)
- ⬜ Application mobile associée

## Reprise du projet (contributeurs & IA)

Le dossier complet de reprise — architecture, modèle de données, politiques métier
(VIN, dates JJ/MM/AAAA, données sourcées), boucle de vérification, **pièges connus**
et méthode de travail — est maintenu dans [`AGENTS.md`](AGENTS.md). C'est le point
d'entrée à lire en premier pour toute reprise du développement, en particulier par
une intelligence artificielle travaillant sans autre contexte.

## Licence

[GPL-3.0](LICENSE)
