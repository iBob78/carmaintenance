/**
 * Conseils d'entretien généraux — contenu 100 % sourcé.
 *
 * Règle du projet : aucune valeur inventée. Chaque repère ci-dessous provient
 * d'une source citée (`sources`) avec sa date de consultation. Les jalons de
 * l'article CarGurus sont exprimés en miles ; ils sont convertis en kilomètres
 * (× 1,609) et cette conversion est rappelée dans la source. Les repères restent
 * des guides généraux : le carnet d'entretien du véhicule fait toujours foi
 * (« à vérifier sur votre carnet d'entretien »).
 */

export type AdviceCategory = 'controler' | 'remplacer' | 'rotation'

export interface AdviceItem {
  categorie: AdviceCategory
  libelle: string
  note?: string
}

export interface AdviceMilestone {
  id: string
  titre: string
  sousTitre: string
  items: AdviceItem[]
}

export interface AdviceTip {
  id: string
  titre: string
  texte: string
}

export interface AdviceSevere {
  titre: string
  texte: string
  criteres: string[]
  conseil: string
}

export interface AdviceSource {
  label: string
  url: string
  consulte: string
  note?: string
}

export const adviceCategories: Record<AdviceCategory, string> = {
  controler: 'Contrôler',
  remplacer: 'Remplacer',
  rotation: 'Rotation pneus',
}

/**
 * Jalons d'entretien par kilométrage, adaptés de l'article CarGurus
 * « The Car Maintenance Schedule You Should Follow » (sections « Very Regular
 * Maintenance », « Before 30,000 Miles », « Before 60,000 Miles »,
 * « Before 90,000 Miles »). Miles → km : × 1,609.
 */
export const adviceMilestones: AdviceMilestone[] = [
  {
    id: 'regulier',
    titre: 'Régulièrement',
    sousTitre: 'Les gestes à répéter toute l’année',
    items: [
      {
        categorie: 'controler',
        libelle: 'Niveau d’huile moteur',
        note: 'Tous les 15 jours et avant tout long trajet.',
      },
      {
        categorie: 'controler',
        libelle: 'Pression et usure des pneus',
        note: 'Gomme homogène sur toute la largeur, gonflage aux valeurs du constructeur.',
      },
      {
        categorie: 'remplacer',
        libelle: 'Huile moteur et filtre à huile',
        note: 'Huile synthétique : tous les 8 000 à 16 000 km selon le type (5 000 à 10 000 miles). Vérifier aussi le niveau régulièrement.',
      },
      {
        categorie: 'rotation',
        libelle: 'Rotation des pneus',
        note: 'Tous les 10 000 à 13 000 km (6 000 à 8 000 miles), ou selon le carnet.',
      },
    ],
  },
  {
    id: 'avant-48000',
    titre: 'Avant 48 000 km',
    sousTitre: 'Repère « avant 30 000 miles »',
    items: [
      {
        categorie: 'remplacer',
        libelle: 'Filtre à air',
        note: 'Tous les 24 000 à 48 000 km (15 000 à 30 000 miles) ; plutôt vers 24 000 km en environnement poussiéreux.',
      },
      {
        categorie: 'remplacer',
        libelle: 'Filtre à carburant',
        note: 'Dès 48 000 km (30 000 miles) selon les constructeurs — un test de pression renseigne sur son état.',
      },
    ],
  },
  {
    id: 'avant-96000',
    titre: 'Avant 96 000 km',
    sousTitre: 'Repère « avant 60 000 miles »',
    items: [
      {
        categorie: 'controler',
        libelle: 'Batterie',
        note: 'Durée de vie typique de 4 à 5 ans ; nettoyer les bornes et faire tester la charge en cas de doute.',
      },
      {
        categorie: 'remplacer',
        libelle: 'Liquide de frein',
        note: 'Purge recommandée tous les 32 000 à 72 000 km (20 000 à 45 000 miles) selon le constructeur.',
      },
      {
        categorie: 'controler',
        libelle: 'Plaquettes et disques de frein',
        note: 'Les plaquettes sifflent en fin de vie ; une bonne paire va jusqu’à 80 000 km. Disques : rectification ou remplacement vers 96 000 km (60 000 miles). Après un lavage, rouler quelques minutes pour sécher les disques.',
      },
      {
        categorie: 'remplacer',
        libelle: 'Liquide de refroidissement',
        note: 'Remplacement avec rinçage complet du circuit vers 96 000 km (60 000 miles).',
      },
      {
        categorie: 'remplacer',
        libelle: 'Huile de boîte de vitesses',
        note: 'Boîte manuelle : entre 48 000 et 96 000 km (30 000 à 60 000 miles), plus fréquent en cas de remorquage. Boîte automatique : selon le carnet, de 48 000 km à plus de 160 000 km.',
      },
    ],
  },
  {
    id: 'avant-145000',
    titre: 'Avant 145 000 km',
    sousTitre: 'Repère « avant 90 000 miles »',
    items: [
      {
        categorie: 'controler',
        libelle: 'Durites et flexibles',
        note: 'Refroidissement, direction, climatisation : le caoutchouc se craquelle avec l’âge — à faire contrôler en approchant des six chiffres au compteur.',
      },
      {
        categorie: 'remplacer',
        libelle: 'Liquide de direction assistée',
        note: 'Vidange du circuit vers 120 000 km (75 000 miles), ou dès qu’un bruit ou une dureté apparaît.',
      },
      {
        categorie: 'remplacer',
        libelle: 'Bougies d’allumage',
        note: 'Iridium ou titane : jusqu’à 160 000 km (100 000 miles). Cuivre : vers 48 000 km (30 000 miles).',
      },
      {
        categorie: 'remplacer',
        libelle: 'Courroie de distribution',
        note: 'Entre 120 000 et 145 000 km (75 000 à 90 000 miles), ou plus tôt si le carnet l’impose : une rupture peut détruire le moteur. En cas de chaîne, faire contrôler son état (les maillons s’allongent).',
      },
    ],
  },
]

export const adviceTips: AdviceTip[] = [
  {
    id: 'carnet',
    titre: 'Le carnet d’entretien fait foi',
    texte: 'Les jalons de cette page sont des repères généraux. Le carnet de votre véhicule donne le calendrier précis : c’est lui qui reste la référence.',
  },
  {
    id: 'fluides',
    titre: 'Surveillez les fluides',
    texte: 'Familiarisez-vous avec les jauges d’huile et de boîte : un niveau bas ou un liquide contaminé (sombre, odeur de brûlé) cause des dégâts rapides et coûteux.',
  },
  {
    id: 'consommables',
    titre: 'Pièces d’usure : l’œil suffit parfois',
    texte: 'Joints, essuie-glaces, pneus s’usent de façon irrégulière : une inspection visuelle régulière, chez vous ou chez votre garagiste, complète le calendrier.',
  },
  {
    id: 'ville',
    titre: 'La ville use plus que la route',
    texte: 'Une conduite agressive ou très urbaine use les pièces plus vite qu’un usage mixte ou autoroutier : dans le doute, faites intervenir plus tôt.',
  },
  {
    id: 'lavage',
    titre: 'Après le lavage',
    texte: 'Roulez quelques minutes après un lavage pour sécher les disques de frein et éviter l’apparition de corrosion.',
  },
  {
    id: 'historique',
    titre: 'Un historique entretenu valorise la voiture',
    texte: 'Conserver factures et attestations d’entretien améliore la valeur de revente et facilite la vie de la voiture.',
  },
]

export const adviceSevere: AdviceSevere = {
  titre: 'Conditions d’usage difficiles : intervenez plus tôt',
  texte: 'Certains usages fatiguent la voiture bien plus vite que la moyenne. Les constructeurs prévoient alors un calendrier « conditions sévères » aux intervalles raccourcis — souvent jusqu’à diviser par deux les repères standard (réduction généralement évaluée entre 30 et 50 %).',
  criteres: [
    'Trajets courts répétés (moins de 8 à 10 km), moteur jamais vraiment chaud',
    'Conduite urbaine intensive avec arrêts et redémarrages fréquents',
    'Remorquage régulier ou transport de charges lourdes',
    'Routes poussiéreuses, pistes non revêtues, environnements boueux',
    'Températures extrêmes : grand froid ou forte chaleur',
    'Ralenti prolongé (livraisons, taxi, véhicules de service)',
    'Conduite très sportive avec montées en régime répétées',
  ],
  conseil: 'Dans ces cas, référez-vous au programme « conditions sévères » de votre carnet d’entretien s’il existe — sinon, anticipez : par exemple une vidange vers la moitié de l’intervalle annoncé.',
}

export const adviceSources: AdviceSource[] = [
  {
    label: 'CarGurus — The Car Maintenance Schedule You Should Follow (Scott Sowers, 2023)',
    url: 'https://www.cargurus.com/research/articles/the-car-maintenance-schedule-you-should-follow',
    consulte: '2026-10-22',
    note: 'Source principale des jalons ; valeurs d’origine en miles, converties en km (× 1,609). L’article précise lui-même que ces jalons sont des guides et que le carnet du véhicule prime.',
  },
  {
    label: 'Haynes France — Carnet d’entretien auto',
    url: 'https://fr-rta.haynes.com/pages/carnet-entretien-auto',
    consulte: '2026-10-22',
    note: 'Distinction usage normal / conditions sévères : les intervalles sont raccourcis en usage difficile (trajets courts, ville, remorquage, climat extrême).',
  },
  {
    label: 'PiecesEtPneus — Fréquence de vidange selon votre utilisation',
    url: 'https://blog.piecesetpneus.com/frequence-de-vidange-recommandations-selon-votre-utilisation-et-votre-motorisation/',
    consulte: '2026-10-22',
    note: 'Conditions sévères : « certaines situations imposent de diviser par deux l’intervalle standard ».',
  },
  {
    label: 'Full Meca Services — Tous les combien de kilomètres faire la vidange',
    url: 'https://full-meca-services.com/qa/duree-vidange/',
    consulte: '2026-10-22',
    note: 'Conditions d’usage difficiles : réduction de l’intervalle de 30 à 50 % (diviser par 1,5 à 2).',
  },
]
