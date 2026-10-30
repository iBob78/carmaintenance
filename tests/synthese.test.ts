// Synthèse fiche véhicule : blocs assemblés depuis les données enregistrées.
import { describe, expect, it } from 'vitest'
import { buildSeedDatabase } from '@/lib/data/demo/seed'
import {
  buildVehicleSynthese,
  echeanceTexte,
  releveJustifie,
} from '@/lib/domain/synthese'
import type { AppDatabase, ServiceDue, Vehicle } from '@/lib/domain/types'

function clioOf(db: AppDatabase): Vehicle {
  return db.vehicles.find((v) => v.id === 'veh-clio-demo') as Vehicle
}

describe('buildVehicleSynthese', () => {
  it('porte l’identification du véhicule sans inventer les champs absents', () => {
    const db = buildSeedDatabase()
    const s = buildVehicleSynthese(db, clioOf(db))
    const byLabel = Object.fromEntries(s.identification.map((r) => [r.label, r.valeur]))
    expect(byLabel['Marque / modèle']).toBe('Renault Clio IV')
    expect(byLabel['Code moteur']).toBe('H5FT')
    expect(byLabel['Finition']).toBe('Intens')
    expect(byLabel['VIN']).toBe('VF1R9800167234567')
    // dates affichées en JJ/MM/AAAA, jamais en ISO
    expect(byLabel['1ère immatriculation']).toBe('12/06/2018')
    expect(byLabel['Date d’acquisition']).toBe('15/03/2021')

    // véhicule dépourvu de champs optionnels → null, jamais de valeur devinée
    const nu: Vehicle = {
      ...clioOf(db),
      id: 'veh-nu',
      finition: undefined,
      motorisation: undefined,
      codeMoteur: undefined,
      cylindreeCm3: undefined,
      transmission: undefined,
      vin: undefined,
      immatriculation: undefined,
      dateAcquisition: undefined,
      couleur: undefined,
      premiereImmatriculation: undefined,
    }
    const sn = buildVehicleSynthese(db, nu)
    const nuByLabel = Object.fromEntries(sn.identification.map((r) => [r.label, r.valeur]))
    expect(nuByLabel['Finition']).toBeNull()
    expect(nuByLabel['VIN']).toBeNull()
    expect(nuByLabel['Code moteur']).toBeNull()
  })

  it('trie les relevés du plus récent au plus ancien et reconstitue la plage', () => {
    const db = buildSeedDatabase()
    const s = buildVehicleSynthese(db, clioOf(db))
    expect(s.relevés.length).toBe(6)
    for (let i = 1; i < s.relevés.length; i++) {
      expect(s.relevés[i - 1].date >= s.relevés[i].date).toBe(true)
    }
    expect(s.plage).toEqual({ min: 41200, max: 87400 })
  })

  it('compte les interventions par statut de façon cohérente', () => {
    const db = buildSeedDatabase()
    const s = buildVehicleSynthese(db, clioOf(db))
    expect(s.interventions.total).toBeGreaterThan(0)
    expect(s.interventions.total).toBe(
      s.interventions.effectuees + s.interventions.prevues + s.interventions.autres,
    )
    expect(s.interventions.recentes.length).toBeLessThanOrEqual(6)
  })

  it('répartit les dépenses par poste : parts = total, somme ≈ 100 %', () => {
    const db = buildSeedDatabase()
    const s = buildVehicleSynthese(db, clioOf(db))
    expect(s.depenses.total).toBeGreaterThan(0)
    expect(s.depenses.parts.length).toBeGreaterThan(0)
    const sommeMontants = s.depenses.parts.reduce((acc, p) => acc + p.montant, 0)
    expect(Math.round(sommeMontants)).toBe(Math.round(s.depenses.total))
    const sommeParts = s.depenses.parts.reduce((acc, p) => acc + p.part, 0)
    expect(sommeParts).toBeGreaterThan(95)
    expect(sommeParts).toBeLessThan(105)
    // tri décroissant
    for (let i = 1; i < s.depenses.parts.length; i++) {
      expect(s.depenses.parts[i - 1].montant).toBeGreaterThanOrEqual(s.depenses.parts[i].montant)
    }
  })

  it('limite les prochaines échéances à 3 et résume anomalies + champs manquants', () => {
    const db = buildSeedDatabase()
    const s = buildVehicleSynthese(db, clioOf(db))
    expect(s.prochaines.length).toBeLessThanOrEqual(3)
    expect(Array.isArray(s.resume.anomalies)).toBe(true)
    expect(Array.isArray(s.resume.missing)).toBe(true)
    expect(s.resume.nbReleves).toBe(6)
  })

  it('reste honnête pour un véhicule sans données (tout vide, rien d’inventé)', () => {
    const db = buildSeedDatabase()
    const vide: Vehicle = { ...clioOf(db), id: 'veh-vide' }
    const s = buildVehicleSynthese(db, vide)
    expect(s.relevés).toEqual([])
    expect(s.plage).toBeNull()
    expect(s.interventions.total).toBe(0)
    expect(s.depenses.total).toBe(0)
    expect(s.depenses.parts).toEqual([])
  })
})

describe('releveJustifie', () => {
  it('distingue les relevés documentés des simples déclarations', () => {
    const db = buildSeedDatabase()
    const s = buildVehicleSynthese(db, clioOf(db))
    const justifies = s.relevés.filter(releveJustifie)
    expect(justifies.length).toBe(4)
    for (const r of s.relevés) {
      expect(releveJustifie(r)).toBe(r.sourceInformation !== 'declare')
    }
  })
})

describe('echeanceTexte', () => {
  it('affiche une date JJ/MM/AAAA — jamais ISO', () => {
    const due: ServiceDue = {
      categorie: 'vidange',
      libelle: 'Vidange',
      dueKm: 99900,
      dueDate: '2027-02-10',
      urgency: 'ok',
    }
    expect(echeanceTexte(due)).toContain('Prévu le 10/02/2027')
    expect(echeanceTexte(due)).not.toContain('2027-02-10')
    expect(echeanceTexte({ ...due, dueDate: undefined, dueKm: undefined })).toBe('Échéance à définir')
  })
})
