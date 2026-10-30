# AGENTS.md — dossier de reprise du projet AutoCarnet

> **Destinataires** : tout contributeur — humain ou agent IA — qui reprend ce dépôt
> sans autre contexte. Ce document complète le [`README.md`](README.md) (présentation
> produit) avec tout ce qu'il faut savoir pour **comprendre, modifier et vérifier** le
> code sans rien casser. En cas de divergence entre ce document et le code, **le code
> fait foi** : relisez les sources citées ici.
>
> Dernière mise à jour : **2026-10-30**.

---

## 1. Mission et principes non négociables

**AutoCarnet** : carnet d'entretien automobile open source (GPL-3.0), avec stockage
local par défaut, scan OCR dans le navigateur et génération serveur d'un **rapport de
vente PDF**. Pour générer ce rapport, un instantané est transmis au serveur applicatif.

Deux principes structurent tout le code — ils ne se négocient pas lors d'une reprise :

1. **Aucune donnée inventée, jamais.** Une valeur affichée ou imprimée est soit
   enregistrée par l'utilisateur, soit lue dans un document scanné, soit issue d'une
   source citée (URL + date de consultation). Les incohérences sont **signalées,
   jamais corrigées automatiquement**. Un planning inconnu → `null` → saisie manuelle.
2. **Traçabilité et transparence.** Chaque valeur OCR porte son repère officiel et son
   niveau de confiance ; chaque export PDF reflète uniquement les données enregistrées
   et conserve un instantané reproductible ; l'absence de panne n'est jamais présentée
   comme une preuve de bon état.

Règles d'affichage et de conception dérivées (demandes explicites du propriétaire) :

| Règle | Détail | Où c'est appliqué |
|---|---|---|
| **Dates françaises** | Affichage **JJ/MM/AAAA** uniquement — jamais ISO (« 05/01/1998 », pas « 1998-01-05 »). | `src/lib/domain/format.ts` (`formatDate`, `formatDateShort`, `formatMonthYear`), `afficheChamp` dans `src/lib/ocr/carte-grise.ts` |
| **VIN** | Le **champ E imprimé** sur la carte grise fait foi. Si la bande MRZ diverge, on note la divergence (« à vérifier ») mais on **ne substitue jamais**. Jamais de VIN fusionné/inventé. Un VIN 17 caractères valide mais contenant I/O/Q → confiance « moyenne » (pas « faible »). | `src/lib/ocr/carte-grise.ts` (tests : « le champ E imprimé prime sur la bande MRZ divergente ») |
| **Libellés ≠ valeurs** | Un mot-libellé du formulaire (« CARTE GRISE », « SIGNATURE »…) n'est jamais pris pour une valeur de champ. | `estLibelle()` + garde `interdits` dans `parseCarteGrise` |
| **Données personnelles (C.1 titulaire, C.3 adresse)** | Toujours **opt-in** : désélectionnées par défaut dans le scan ; masquage du PDF appliqué **avant** la mise en page (`MASK = '••••••••'`). | `src/lib/ocr/carte-grise.ts`, `src/lib/report/privacy.ts` |
| **Données sourcées** | Tout planning/conseil vient d'un catalogue sourcé (`sources: [{label, url, consulte}]`) ; les divergences entre sources sont notées ; mention permanente « à vérifier sur votre carnet d'entretien ». | `src/lib/data/maintenance-schedules.ts`, `src/lib/data/advice.ts` |
| **PDF de test** | Toujours tester le PDF avec des **données fictives** (le jeu de démo sert à ça) avant toute connexion à des données réelles. | `src/lib/data/demo/seed.ts` |
| **Ne pas écraser l'existant** | Pas de réécriture inutile ; patchs ciblés ; conserver les éléments présents (README, styles, tests). | — |
| **Variables d'environnement** | **Ne jamais inventer** de nom de variable ni d'identifiant secret. Seules celles de `.env.example` existent. | `.env.example` |

---

## 2. Stack et versions

| Domaine | Choix | Note |
|---|---|---|
| Application | **Next.js `^14.2.33`** (App Router) + **React `18.3.1`** + **TypeScript `^5.6.3`** | Pas de Pages Router ; serveur de dev obligatoirement lancé sur `0.0.0.0` |
| Styles | **Tailwind CSS `^4`** (PostCSS) | `postcss.config.mjs`, classes utilitaires |
| Validation | **Zod `^3.24`** | schéma strict des options de rapport |
| PDF serveur | **`@react-pdf/renderer` `3.4.4` — version exacte, sans `^`** | **ne pas upgrader** : seule cette version a été vérifiée compatible avec Next 14.2.x |
| OCR navigateur | **`tesseract.js` `^7`** (+ données FR `@tesseract.js-data/fra`) | reconnaissance **dans le navigateur**, la photo ne quitte jamais l'appareil |
| Données | Mode **démo localStorage** (défaut) + adaptateur **Supabase `^2.47`** (non activé) | voir §6 |
| Icônes | `lucide-react` | |
| Tests | **Vitest `^2.1`**, environnement `node`, fichiers `tests/**/*.test.ts`, alias `@` → `src` | |
| Licence | **GPL-3.0-or-later** (`LICENSE`) | toute dérivative reste GPL |

Prérequis : **Node.js ≥ 18**, npm.

---

## 3. Commandes et boucle de vérification

```bash
npm install
npm run dev          # serveur de dev http://localhost:3000 (bind 0.0.0.0)
npm run dev:clean    # idem APRÈS purge de .next  ← utiliser dès qu'un 500 / module manquant apparaît
npm test             # vitest run — 144 tests (voir §9)
npm run test:watch   # vitest en veille
npm run typecheck    # tsc --noEmit
npm run build        # build de production
npm start            # serveur de production
```

**Boucle obligatoire avant chaque commit** :

```bash
npm run typecheck && npm test && npm run build
```

### Smoke test manuel du PDF (API)

Le corps de requête se fabrique depuis le jeu de démo (les IDs sont `veh-clio-demo` et
`veh-3008-demo`) :

```ts
// recette Node (fichier jetable, ex. /tmp/snap.mjs)
import { buildReportSnapshot } from './src/lib/report/snapshot'
import { applyPrivacy } from './src/lib/report/privacy'
import { defaultReportOptions } from './src/lib/report/options'
// ... charger le db démo (demo/seed) puis :
const snap = applyPrivacy(buildReportSnapshot(db, 'veh-clio-demo', defaultReportOptions), defaultReportOptions).snapshot
console.log(JSON.stringify({ snapshot: snap, options: defaultReportOptions }))
```

```bash
curl -X POST http://localhost:3000/api/vehicles/veh-clio-demo/reports/sale \
  -H 'Content-Type: application/json' -d @/tmp/snap.json -o /tmp/out.pdf
# attendu : %PDF-1.3, quelques dizaines de Ko
```

---

## 4. Architecture

```
src/
├── app/                          # routes Next.js (App Router)
│   ├── page.tsx                  # tableau de bord (échéances, rappels)
│   ├── layout.tsx / globals.css  # AppShell + styles
│   ├── vehicules/                # liste, fiche [id] (onglets : infos / échéances / …), rapport [id]
│   ├── documents/                # justificatifs indexés
│   ├── carburant/                # pleins, prix et statistiques mensuelles
│   ├── conseils/                 # page « Jalons d'entretien » (contenu sourcé)
│   ├── rapport-guide/            # guide du rapport de vente
│   ├── reglages/                 # réglages + mode
│   └── api/vehicles/[id]/reports/sale/route.ts   # POST → PDF (Zod, droits, privacy)
├── components/
│   ├── AppShell.tsx              # navigation latérale (NAV) + coquille
│   ├── ui.tsx                    # Button, Card, SectionTitle, Badge, Field, Tabs, Modal… ('use client')
│   ├── forms.tsx                 # formulaires métier
│   └── scan.tsx                  # assistant de scan OCR
└── lib/
    ├── domain/                   # logique pure (sans React, sans I/O) — testée en priorité
    │   ├── types.ts              # TOUT le modèle de données (§5)
    │   ├── fuel.ts               # statistiques carburant et consommation fiable
    │   ├── format.ts             # formats FR : dates JJ/MM/AAAA, km, euros, uid()
    │   ├── catalog.ts            # libellés (catégories, carburants, statuts…), defaultInterval
    │   ├── due.ts                # échéances : computeDue, duesForVehicle, nextDues, TaskLike
    │   ├── schedule.ts           # appariement véhicule ↔ planning constructeur (§7)
    │   ├── anomalies.ts          # detectAnomalies, missingVehicleFields
    │   └── totals.ts             # computeExpenseTotals, déduplication factures
    ├── ocr/
    │   ├── scan.ts               # tesseract.js côté navigateur (recognizeImage, terminateOcr)
    │   ├── carte-grise.ts        # parseur carte grise UE 1999/37/CE (§7 « VIN »)
    │   └── facture.ts            # parseur facture → intervention (TTC/HT/TVA, lignes)
    ├── data/
    │   ├── store.tsx             # contexte React : base applicative, mode démo/supabase
    │   ├── repository.ts         # interface persistance (+ demo/repository.ts localStorage)
    │   ├── maintenance-schedules.ts  # catalogue sourcé de plans d'entretien (§8)
    │   ├── advice.ts             # conseils sourcés (jalons, réflexes, conditions sévères)
    │   └── demo/seed.ts          # jeu de démo fictif (anomalies volontaires)
    ├── report/
    │   ├── options.ts            # reportSections, reportOptionsSchema (Zod), defaultReportOptions
    │   ├── snapshot.ts           # buildReportSnapshot, snapshotToExportRecord
    │   ├── privacy.ts            # applyPrivacy (masquage AVANT mise en page), MASK
    │   └── pdf/                  # generate.ts (validatePdf, generateSaleReportPdf),
    │                             # sale-report.tsx (rendu @react-pdf), labels.ts
    └── server/authorize.ts       # contrôle d'accès API (démo : cohérence ; Supabase : TODO étape 6)

tests/                            # Vitest — voir §9
supabase/migrations/0001_init.sql # schéma SQL complet (12 tables, RLS, storage privé)
.env.example                      # variables Supabase (copier → .env.local si activation)
```

**Routes publiques** : `/`, `/carburant`, `/vehicules`, `/vehicules/[id]`, `/vehicules/[id]/rapport`,
`/documents`, `/conseils`, `/rapport-guide`, `/reglages` — plus
`POST /api/vehicles/[id]/reports/sale` (corps `{ snapshot, options }`, 5 Mo max,
réponse PDF avec `X-Report-Pages`, `X-Report-Bytes`, `X-Report-Anomalies`).

---

## 5. Modèle de données

Tout est dans `src/lib/domain/types.ts` (source de vérité). `AppDatabase` regroupe des
collections :

- **`FuelEntry`** — ravitaillement local : litres, montant, compteur, plein complet et suivi continu ; collection facultative pour compatibilité avec les sauvegardes existantes.
- **`Profile`** — profil utilisateur.
- **`Vehicle`** — identité complète : marque, modèle, génération, finition, année,
  1re immatriculation, motorisation, **code moteur**, cylindrée, carburant, transmission,
  **VIN**, photos, acquisition, `sourceInformation` (`declare` | `documente` | `verifie`).
- **`OdometerReading`** — relevés km datés + source (`utilisateur` | `facture` |
  `professionnel` | `controle`) — la base des calculs d'échéances.
- **`MaintenanceTask`** — entretiens planifiés : `categorie`, `libelle`, `intervalleKm`,
  `intervalleMois`, `actif` → consommés par `computeDue`.
- **`ServiceRecord`** + **`ServiceRecordItem`** — interventions réalisées (date, km,
  catégorie, acteur, pièces/consommables/main-d'œuvre, coûts, statuts).
- **`FaultAndTest`** — pannes : symptômes, codes défaut, hypothèses, tests, statuts.
- **`PartPurchase`** — achats de pièces (dédupliqués face aux interventions).
- **`DocumentEntry`** — justificatifs (`facture` | `photo` | `pv_controle` | `autre`).
- **`ExpenseEntry`** — dépenses (catégories, remboursements, liens).
- **`Reminder`** — rappels : `declencheur` (`km` | `date` | `km_et_date`), `seuilKm`,
  `dateCible`, `statut`.
- **`ReportExport`** — métadonnées d'export (instantané pour reproductibilité).

Types calculés : `Anomaly` (`avertissement` | `incoherence`), `ServiceDue`
(urgence `ok` | `bientot` | `urgent` | `retard`), `DueUrgency`.

Les IDs du jeu de démo sont stables et utilisés dans les tests/smoke : **`veh-clio-demo`**
(Renault Clio IV 2018, 1.2 TCe 120 **H5FT**, essence) et **`veh-3008-demo`** (Peugeot 3008 II
2020, BlueHDi 130 **DV5RC**, diesel).

Équivalent SQL (mode futur Supabase) : `supabase/migrations/0001_init.sql` — 12 tables,
contraintes de cohérence, **RLS** (`owns_vehicle`), `delete_user_data` (RGPD), bucket
privé pour les pièces jointes. Commande : `psql "$SUPABASE_DATABASE_URL" -f supabase/migrations/0001_init.sql`.

---

## 6. Modes de données et variables d'environnement

- **Mode démo (défaut)** : tout est dans le `localStorage` via `src/lib/data/demo/`,
  jeu fictif avec anomalies volontaires. **Aucune configuration nécessaire.**
- **Mode Supabase (étape 6, non activé)** : une interface de dépôt et une migration existent, mais l'adaptateur, l'auth et la
  persistance réelle restent à câbler (`authorize.ts` contient le TODO marqué).

Variables — **celles-ci uniquement**, voir `.env.example` (jamais inventer d'autres noms) :
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` (secret serveur uniquement), `NEXT_PUBLIC_APP_URL`.

---

## 7. Politiques métier détaillées

### OCR carte grise (`src/lib/ocr/carte-grise.ts`)

- Registre des repères officiels UE **1999/37/CE** : A = immatriculation (SIV
  AA-123-AA), B = 1re immatriculation, C.1 = titulaire, C.3 = adresse, D.1 = marque,
  D.2 = type, D.3 = dénomination, **E = VIN 17 caractères** (ISO 3779, sans I/O/Q),
  F.1/F.2 = masses, G = poids vide, I = émission, J.1/J.3 = genre/carrosserie,
  K = réception, P.1 = cm³, P.2 = kW, P.3 = carburant, P.6 = CV, S.1 = places,
  U.1 = bruit, V.7 = CO₂, V.9 = Euro, X.1 = CT, Z = mentions.
- Lecture en **deux passes Tesseract (PSM 3 + PSM 6), fusion** — ne jamais utiliser
  PSM 4 seul.
- **Politique VIN (demande explicite)** : la valeur **imprimée dans le cartouche E**
  prime toujours. La bande MRZ (caractères `<`) n'est qu'un secours si E est vide/incomplet ;
  si elle diverge, **note explicite** affichée (« à vérifier ») mais **jamais de
  substitution ni de valeur fusionnée**. Les fenêtres « suspectes » ne sont tirées que
  des runs marqués `<`, avec garde des valeurs interdites (plaque + date compactes des
  deux côtés) et exigence de concordance entre lignes.
- Chaque champ proposé porte `confiance` (`haute` | `moyenne` | `faible`) et l'UI laisse
  **toujours** valider/corriger avant import.

### Carburant (`src/lib/domain/fuel.ts`)

- Consommation uniquement entre pleins complets avec tous les ravitaillements intermédiaires confirmés et compteurs/dates strictement croissants ; intervalle attribué au mois du plein final.
- Prix mensuel pondéré par les litres saisis, pas prix de marché. Les pleins ne créent ni dépense, ni relevé kilométrique, ni ligne du rapport PDF.
- Modifier, insérer ou supprimer un plein invalide la continuité du suivant, à reconfirmer. Données locales uniquement, Supabase non câblé.

### Échéances (`src/lib/domain/due.ts`)

- `computeDue(vehicle, task, records)` combine **km** (moyenne mensuelle estimée sur les
  relevés) et **date** : `TaskLike = { categorie, libelle, intervalleKm, intervalleMois, actif }`.
- `duesForVehicle(db, vehicleId)` agrège `maintenanceTasks` + `reminders`.
- La date de franchissement du seuil kilométrique est estimée depuis `dateKilometrageActuel`
  et le `kilometrageAnnuel` déclaré ; à défaut de rythme déclaré, un rythme peut être
  calculé depuis les interventions effectuées. Sans rythme ou relevé daté, pas de projection.
  Elle reste indicative et ne remplace ni le kilométrage réel ni la date calendaire.

### Planning par modèle (`src/lib/domain/schedule.ts` + `src/lib/data/maintenance-schedules.ts`)

- `matchScore` : porte de marque → modèle (clés normalisées accents + chiffres romains
  `Clio IV ≡ clio 4`), puis **code moteur (+5) > motorisation (+3) > carburant (+1)** ;
  le plan **le plus spécifique gagne**.
- `scheduleForVehicle` renvoie **`null` si rien de sourcé** → l'utilisateur saisit son
  carnet à la main (jamais de valeur devinée).
- `reminderForOperation(vehicleId, op, due)` fabrique un `Reminder` pour les boutons
  « Activer le rappel » de la fiche véhicule.

### Rapport PDF (`src/lib/report/`)

- Pipeline : `buildReportSnapshot` → `applyPrivacy` (masquage **avant** mise en page) →
  `generateSaleReportPdf` → `validatePdf`.
- 8 sections sélectionnables (`options.ts`, validation Zod stricte) ; totaux exacts ;
  anomalies listées dans le document ; mention « ne constitue pas une expertise ».
- L'API revalide les droits (`authorize.ts`), recalcule totaux/anomalies côté serveur et
  ne conserve **aucune archive du PDF** (métadonnées d'export uniquement).

### Conseils (`src/lib/data/advice.ts` + `src/app/conseils/page.tsx`)

- Jalons par kilométrage convertis de l'article CarGurus (miles → km × 1,609, conversion
  citée), bons réflexes, encart « conditions d'usage difficiles » (règle sourcée
  « intervenir plus tôt, jusqu'à diviser par deux » — **sans recalcul automatique**).
- Même règle de sourcing que les plans : URL + date de consultation dans `adviceSources`.

---

## 8. Étendre les données sourcées (plans & conseils)

**Ajouter un plan d'entretien** dans `src/lib/data/maintenance-schedules.ts` :

```ts
{
  id: 'marque-code-moteur',            // unique, kebab-case
  marques: ['Renault'],                // un plan peut couvrir plusieurs marques (ex. PureTech)
  modeles: ['Clio IV'],
  motorisations: ['1.2 TCe 120'],
  codesMoteur: ['H5F'],                // préfixes acceptés
  carburant: 'essence',                // optionnel, départage
  operations: [
    { categorie: 'vidange', libelle: 'Vidange moteur', intervalleKm: 15000, intervalleMois: 12, gravite: 'normale' },
  ],
  sources: [{ label: '…', url: 'https://…', consulte: '2026-10-22' }],
  notes: 'Divergences, rappels constructeurs, limites…',
}
```

Règles : ≥ 1 intervalle (km **ou** mois) par opération ; sources HTTPS avec date ;
**les divergences constructeur/médias vont dans `notes`**, jamais cachées ; test à ajouter
dans `tests/maintenance-schedules.test.ts` (intégrité + appariement).

**Ajouter un conseil** : `adviceMilestones` / `adviceTips` / `adviceSevere` dans
`advice.ts`, avec la source dans `adviceSources` — `tests/advice.test.ts` vérifie
l'intégrité (HTTPS, dates, mentions carnet).

---

## 9. Tests

`npm test` — **144 tests, 13 fichiers** (tout doit rester vert) :

| Fichier | Tests | Couvre |
|---|---|---|
| `tests/carte-grise.test.ts` | 50 | parseur OCR carte grise (repères UE, VIN/MRZ, dates, spécimens) |
| `tests/maintenance-schedules.test.ts` | 13 | catalogue de plans + appariement + rappels |
| `tests/advice.test.ts` | 8 | intégrité du contenu sourcé « Conseils » |
| `tests/anomalies.test.ts` | 8 | détection d'anomalies, champs manquants |
| `tests/privacy.test.ts` | 8 | masquage VIN/plaque/C.1/C.3, notices |
| `tests/snapshot.test.ts` | 7 | instantané de rapport, reproductibilité |
| `tests/totals.test.ts` | 7 | totaux, remboursements, déduplication |
| `tests/facture.test.ts` | 7 | parseur OCR factures |
| `tests/pdf.test.ts` | 6 | génération/validation PDF (le plus lent, ~12 s) |
| `tests/timeline.test.ts` | 8 | chronologie des événements |
| `tests/synthese.test.ts` | 8 | synthèse du véhicule |
| `tests/fuel.test.ts` | 5 | statistiques de carburant et suivi continu |
| `tests/due.test.ts` | 9 | calcul d'échéances |

Conventions : environnement `node` (pas de DOM) ; ajouter toute feature avec ses tests
dans le même commit ; les assertions sur dates doivent utiliser les formats FR (et
attention à l'espace fine insécable U+202F de `toLocaleString('fr-FR')` — voir §10).

---

## 10. Pièges connus (épargnés par l'expérience)

1. **Cache `.next` périmé** : symptômes = 500 sur certaines pages, `Cannot find module
   './NNN.js'` dans le serveur de dev (souvent après changement de dépendances ou
   hot-reload long). **Remède unique : `npm run dev:clean`** (reconstruit tout). Ne pas
   chercher plus loin.
2. **Données linguistiques Tesseract FR** : si l'OCR échoue au premier lancement,
   `npm install --no-save @tesseract.js-data/fra` (le CDN n'est pas toujours joignable).
   Fusionner **PSM 3 + PSM 6** ; ne jamais reconnaître une carte grise en PSM 4 seul.
3. **Apostrophes typographiques** : les remplacements de texte contenant `’` (U+2019) échouent parfois dans les outils d'édition → faire les patchs via un petit
   script Python (`str.replace`) avec les chaînes exactes du fichier.
4. **`toLocaleString('fr-FR')`** émet des espaces fines insécables (U+202F) : les tests ne
   doivent jamais assert du texte brut non normalisé ; `formatEuro`/`formatKm` gèrent
   l'affichage, `formatInterval` normalise les espaces.
5. **Contenu des onglets côté client** : un onglet React (ex. « Échéances ») n'apparaît
   **pas** dans le HTML SSR renvoyé par `curl`. Vérifier via le **chunk du build** :
   `grep` dans `.next/static/chunks/app/**/page-*.js` (après `npm run build`), ou smoke
   jsdom. Les chaînes avec accents y sont parfois échappées (`\u00e9`, `\u2019`).
6. **`@react-pdf/renderer` : rester à `3.4.4` exact.** Les versions suivantes cassent avec
   Next 14.2.x (vérifié). Idem React 18.3.1 : ne pas monter en React 19 sans re-test
   complet.
7. **Playwright indisponible** dans l'environnement de dev sandbox : smoke UI en jsdom
   uniquement. Attention : `globalThis.navigator` est en lecture seule sous Node 22.
8. **Jamais de force-push / de réécriture d'historique** ; ne jamais supprimer ou
   renommer la racine du dépôt ni `.git`.
9. **Strictement valide ≠ correct** (VIN notamment) : un VIN 17 caractères bien formé
   peut être la mauvaise valeur du document — la politique §7 prime sur la syntaxe.

---

## 11. Méthode de travail attendue (demandes explicites du propriétaire)

- **Avant chaque étape de développement** : annoncer les fichiers concernés et les
  changements prévus ; fournir le **contenu complet** de tout fichier créé/remplacé ;
  fournir les migrations SQL et commandes à exécuter quand il y en a.
- **Étape par étape** : ne pas tout développer d'un coup ; expliquer les décisions.
- **Une fonctionnalité n'est « finie » qu'après vérification** (boucle §3 + smoke réel).
- **Ne pas écraser** les éléments existants sans raison.
- **Ne jamais inventer** de variables d'env, d'identifiants secrets, ni de données métier.
- Valider les choix de périmètre avec le propriétaire quand plusieurs options existent.

---

## 12. État du projet au 2026-10-30

- La PR historique **#1** a été fusionnée dans `main`. La branche de travail dépend de la session en cours.
- Historique récent : `595e23a` refonte Next.js → `0bef5b5` OCR → `cfc34d7`/`0483e25`
  calibrage OCR réel → `2489910` libellés jamais valeurs → `33cc461` dates JJ/MM/AAAA →
  `8155946` VIN (E imprimé prime) → `cb6f183` planning par modèle + rappels →
  `7c9c7d8` page Conseils.
- **Livré** : carnet complet, scan OCR carte grise/facture (local), rapport de vente PDF
  8 sections + confidentialité + instantané, échéances/rappels, **planning d'entretien
  par modèle** (catalogue sourcé), **page Conseils** (jalons + conditions sévères),
  migration SQL Supabase, 144 tests.
- **Évolution** : gestion locale des pleins et statistiques mensuelles de carburant.
- **Évolution** : estimation facultative du kilométrage annuel et projection indicative
  des dates de franchissement des seuils depuis un kilométrage daté (mode démo).
- **Restant (feuille de route)** : activation de l'adaptateur Supabase (auth + persistance
  réelle, TODO dans `authorize.ts`), application mobile, extension du catalogue de plans
  à d'autres modèles au fil des besoins.

Quand vous ajoutez une fonctionnalité : **mettez à jour cette section et le README**
(nombres de tests, feuille de route) dans le même commit.
