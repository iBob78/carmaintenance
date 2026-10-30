import { describe, expect, it } from 'vitest'
import {
  adviceCategories,
  adviceMilestones,
  adviceSevere,
  adviceSources,
  adviceTips,
  type AdviceCategory,
} from '../src/lib/data/advice'

describe('conseils d’entretien — intégrité du contenu sourcé', () => {
  it('chaque source est https, consultable et porte sa date de consultation', () => {
    expect(adviceSources.length).toBeGreaterThanOrEqual(2)
    for (const source of adviceSources) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.label.length).toBeGreaterThan(5)
      expect(source.consulte).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('la source principale CarGurus est présente et précise la conversion miles → km', () => {
    const main = adviceSources.find((s) => s.url.includes('cargurus.com'))
    expect(main).toBeTruthy()
    expect(main!.note).toMatch(/1,609/)
  })

  it('les jalons ont un titre, un sous-titre et au moins une opération', () => {
    expect(adviceMilestones.length).toBeGreaterThanOrEqual(3)
    for (const milestone of adviceMilestones) {
      expect(milestone.id).toMatch(/^[a-z0-9-]+$/)
      expect(milestone.titre.length).toBeGreaterThan(3)
      expect(milestone.sousTitre.length).toBeGreaterThan(3)
      expect(milestone.items.length).toBeGreaterThan(0)
    }
  })

  it('chaque opération porte une catégorie connue et un libellé', () => {
    const allowed = new Set<string>(Object.keys(adviceCategories))
    for (const milestone of adviceMilestones) {
      for (const item of milestone.items) {
        expect(allowed.has(item.categorie)).toBe(true)
        expect(item.libelle.length).toBeGreaterThan(3)
      }
    }
  })

  it('les catégories utilisées ont un libellé affichable', () => {
    const used = new Set<AdviceCategory>()
    for (const milestone of adviceMilestones) {
      for (const item of milestone.items) used.add(item.categorie)
    }
    expect(used.size).toBeGreaterThanOrEqual(2)
    for (const categorie of used) {
      expect(adviceCategories[categorie].length).toBeGreaterThan(3)
    }
  })

  it('les bons réflexes ont titre et texte', () => {
    expect(adviceTips.length).toBeGreaterThanOrEqual(4)
    for (const tip of adviceTips) {
      expect(tip.titre.length).toBeGreaterThan(3)
      expect(tip.texte.length).toBeGreaterThan(20)
    }
  })

  it('l’encart conditions difficiles liste des critères et un conseil', () => {
    expect(adviceSevere.titre.length).toBeGreaterThan(5)
    expect(adviceSevere.criteres.length).toBeGreaterThanOrEqual(4)
    expect(adviceSevere.conseil.length).toBeGreaterThan(20)
    // la règle « intervenir plus tôt » doit être explicite
    expect(adviceSevere.texte).toMatch(/divis|plus tôt|raccour/i)
    expect(adviceSevere.conseil).toMatch(/carnet|intervalle/i)
  })

  it('la mention carnet d’entretien est portée par les données (jamais de valeur absolue)', () => {
    const textes = [
      ...adviceTips.map((t) => `${t.titre} ${t.texte}`),
      adviceSevere.conseil,
      ...adviceSources.map((s) => `${s.label} ${s.note ?? ''}`),
    ].join(' ')
    expect(textes).toMatch(/carnet/i)
  })
})
