# AutoCarnet — carmaintenance

Application web de **gestion de la maintenance de votre véhicule** : enregistrez vos vidanges avec date et kilométrage, visualisez les prochains kilométrages d'entretien prévus et consultez le calendrier de vos révisions périodiques.

## Fonctionnalités

- **🚗 Mes véhicules** — multi-véhicules : marque, modèle, immatriculation, carburant, kilométrage actuel.
- **🛢️ Vidanges & entretiens** — historique complet avec date, kilométrage, coût, garage et notes (vidange, filtres, freins, pneus, distribution, contrôle technique…).
- **⏰ Prochaines échéances** — calcul automatique du prochain kilométrage et/ou de la date de chaque entretien, avec alertes « Urgent / Bientôt / OK » et estimation de date selon votre rythme de conduite réel.
- **📅 Calendrier de révisions périodiques** — échéancier prévisionnel groupé par mois (horizon 6 / 12 / 24 mois), déclenché par le kilométrage ou la date, avec plan de révision personnalisable par véhicule.
- **💶 Budget** — dépenses des 12 derniers mois et coût total par véhicule.
- **💾 Sauvegarde** — export / import JSON, données stockées localement dans le navigateur (aucun serveur, aucune donnée envoyée).

## Démarrage

```bash
npm install
npm run dev        # serveur de développement → http://localhost:5173
```

Production :

```bash
npm run build      # build de production dans dist/
npm run preview    # prévisualisation du build
```

Test de rendu (smoke-test jsdom) :

```bash
npm run build && npm run smoke
```

## Stack technique

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [lucide-react](https://lucide.dev/) (icônes)
- Persistance via `localStorage`

## Structure

```
src/
├── types.ts                  # Modèle de données (véhicules, entretiens, intervalles)
├── store.tsx                 # État global + persistance localStorage
├── lib/
│   ├── maintenance.ts        # Catalogue des entretiens, calcul des échéances, calendrier
│   ├── storage.ts            # Chargement / sauvegarde / seed / import-export
│   └── utils.ts              # Dates ISO, formats fr-FR (km, €, dates)
└── components/               # Pages et composants d'interface
```

## Notes

- Les seuils par défaut (vidange tous les 15 000 km ou 12 mois, distribution 90 000 km / 6 ans…) sont personnalisables dans **Réglages** selon les préconisations de votre constructeur.
- AutoCarnet est un outil de suivi personnel : il ne remplace pas le carnet d'entretien officiel ni les préconisations de votre garage.

## Licence

[GPL-3.0-or-later](LICENSE)
