// Plans d'entretien par modèle : intégrité du jeu de données, appariement,
// intégration avec le calcul d'échéances.
import { describe, expect, it } from 'vitest'
import {
  formatInterval,
  matchScore,
  reminderForOperation,
  operationsForVehicle,
  scheduleForVehicle,
  schedulesForVehicle,
} from '@/lib/domain/schedule'
import { computeDue } from '@/lib/domain/due'
import { MAINTENANCE_SCHEDULES } from '@/lib/data/maintenance-schedules'
import { buildSeedDatabase } from '@/lib/data/demo/seed'
import type { Vehicle } from '@/lib/domain/types'

describe('jeu de données maintenance-schedules — intégrité', () => {
  it('chaque plan a un identifiant unique et au moins une opération', () => {
    const ids = new Set(MAINTENANCE_SCHEDULES.map((p) => p.id))
    expect(ids.size).toBe(MAINTENANCE_SCHEDULES.length)
    for (const plan of MAINTENANCE_SCHEDULES) {
      expect(plan.operations.length).toBeGreaterThan(0)
      expect(plan.marques.length).toBeGreaterThan(0)
      expect(plan.modeles.length).toBeGreaterThan(0)
      expect(plan.motorisations.length).toBeGreaterThan(0)
    }
  })

  it('chaque opération porte une périodicité positive et une catégorie connue', () => {
    const categories = new Set([
      'vidange', 'filtres', 'freins', 'pneus', 'distribution', 'bougies', 'liquides',
      'climatisation', 'batterie', 'controle_technique', 'transmission', 'suspension',
      'carrosserie', 'electricite', 'autre',
    ])
    for (const plan of MAINTENANCE_SCHEDULES) {
      for (const op of plan.operations) {
        expect(categories.has(op.categorie)).toBe(true)
        expect(op.libelle.length).toBeGreaterThan(0)
        const aKm = typeof op.intervalleKm === 'number' && op.intervalleKm > 0
        const aMois = typeof op.intervalleMois === 'number' && op.intervalleMois > 0
        expect(aKm || aMois).toBe(true)
      }
    }
  })

  it('chaque plan cite ses sources (URL consultées, jamais inventées)', () => {
    for (const plan of MAINTENANCE_SCHEDULES) {
      expect(plan.sources.length).toBeGreaterThan(0)
      for (const s of plan.sources) {
        expect(s.url).toMatch(/^https?:\/\//)
        expect(s.label.length).toBeGreaterThan(0)
        expect(s.consulte).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    }
  })

  it('formatInterval rend une périodicité lisible', () => {
    expect(formatInterval({ categorie: 'vidange', libelle: 'x', intervalleKm: 30000, intervalleMois: 12 })).toBe('30 000 km ou 12 mois')
    expect(formatInterval({ categorie: 'freins', libelle: 'x', intervalleKm: null, intervalleMois: 24 })).toBe('2 an(s)')
    expect(formatInterval({ categorie: 'autre', libelle: 'x' })).toBe('—')
  })
})

describe('appariement véhicule → plan', () => {
  const db = buildSeedDatabase()
  const clio = db.vehicles.find((v) => v.id === 'veh-clio-demo') as Vehicle
  const suv = db.vehicles.find((v) => v.id === 'veh-3008-demo') as Vehicle

  it('Clio IV de démo (1.2 TCe 120, H5FT) → plan Renault H5F', () => {
    const plan = scheduleForVehicle(clio)
    expect(plan?.id).toBe('renault-h5f-tce')
    const ops = operationsForVehicle(clio)
    expect(ops.some((o) => o.categorie === 'vidange' && o.intervalleKm === 15000)).toBe(true)
    expect(ops.some((o) => o.categorie === 'distribution')).toBe(false) // chaîne : pas de remplacement périodique
  })

  it('3008 II de démo (BlueHDi 130, DV5RC) → plan officiel Peugeot', () => {
    const plan = scheduleForVehicle(suv)
    expect(plan?.id).toBe('peugeot-dv5rc-bluehdi130')
    expect(plan?.notes).toMatch(/rappel/i) // rappel chaîne signalé
    const ops = operationsForVehicle(suv)
    expect(ops.some((o) => o.categorie === 'distribution' && o.intervalleKm === 180000)).toBe(true)
  })

  it('le code moteur prime sur le libellé de motorisation', () => {
    const v = { ...clio, motorisation: 'inconnu', codeMoteur: 'H5FT' } as Vehicle
    expect(scheduleForVehicle(v)?.id).toBe('renault-h5f-tce')
    const scoreCode = matchScore(
      MAINTENANCE_SCHEDULES.find((p) => p.id === 'renault-h5f-tce')!,
      v,
    )
    const scoreTexte = matchScore(
      MAINTENANCE_SCHEDULES.find((p) => p.id === 'renault-h5f-tce')!,
      { ...clio, motorisation: '1.2 TCe 120', codeMoteur: undefined } as Vehicle,
    )
    expect(scoreCode!).toBeGreaterThan(scoreTexte!)
  })

  it('les familles couvrent plusieurs modèles (K9K, PureTech)', () => {
    const megane = { ...clio, marque: 'Renault', modele: 'Mégane IV', motorisation: '1.5 dCi 110', codeMoteur: 'K9K', carburant: 'diesel' } as Vehicle
    expect(scheduleForVehicle(megane)?.id).toBe('renault-k9k-dci')
    const c3 = { ...clio, marque: 'Citroën', modele: 'C3', motorisation: '1.2 PureTech 83', codeMoteur: 'EB2', carburant: 'essence' } as Vehicle
    expect(scheduleForVehicle(c3)?.id).toBe('stellantis-puretech-eb2')
    const duster = { ...clio, marque: 'Dacia', modele: 'Duster', motorisation: '1.5 dCi 110', codeMoteur: 'K9K', carburant: 'diesel' } as Vehicle
    expect(scheduleForVehicle(duster)?.id).toBe('dacia-k9k-dci')
  })

  it('aucun plan connu → null (jamais inventé), pas de faux match', () => {
    const twingo = { ...clio, marque: 'Renault', modele: 'Twingo III', motorisation: '1.0 SCe', codeMoteur: 'B4D', carburant: 'essence' } as Vehicle
    expect(scheduleForVehicle(twingo)).toBeNull()
    expect(operationsForVehicle(twingo)).toEqual([])
    const inconnu = { ...clio, marque: 'Mazda', modele: 'MX-5' } as Vehicle
    expect(scheduleForVehicle(inconnu)).toBeNull()
  })

  it('un plan plus spécifique l’emporte sur le générique', () => {
    const ordre = schedulesForVehicle(suv).map((p) => p.id)
    expect(ordre[0]).toBe('peugeot-dv5rc-bluehdi130')
  })
})

describe('intégration échéances', () => {
  const db = buildSeedDatabase()
  const clio = db.vehicles.find((v) => v.id === 'veh-clio-demo') as Vehicle

  it('les opérations du plan alimentent computeDue', () => {
    const ops = operationsForVehicle(clio)
    const vidange = ops.find((o) => o.categorie === 'vidange')!
    const due = computeDue(clio, vidange, db.serviceRecords)
    expect(due).not.toBeNull()
    expect(due!.dueKm).toBeGreaterThan(0)
  })

  it('la distribution PureTech planifie une échéance critique à 100 000 km', () => {
    const puretech = {
      ...clio,
      marque: 'Peugeot',
      modele: '208',
      motorisation: '1.2 PureTech 100',
      codeMoteur: 'EB2',
      carburant: 'essence',
    } as Vehicle
    const dist = operationsForVehicle(puretech).find((o) => o.categorie === 'distribution')!
    expect(dist.intervalleKm).toBe(100000)
    expect(dist.intervalleMois).toBe(72)
  })
})

describe('rappel à activer', () => {
  const db = buildSeedDatabase()
  const clio = db.vehicles.find((v) => v.id === 'veh-clio-demo') as Vehicle

  it('fabrique un rappel km_et_date à partir de l’échéance calculée', () => {
    const op = operationsForVehicle(clio).find((o) => o.categorie === 'vidange')!
    const due = computeDue(clio, op, db.serviceRecords)!
    const rappel = reminderForOperation(clio.id, { ...op, gravite: 'importante' } as never, due)
    expect(rappel).toMatchObject({
      vehicleId: 'veh-clio-demo',
      categorie: 'vidange',
      statut: 'a_faire',
    })
    expect(['km', 'date', 'km_et_date']).toContain(rappel.declencheur)
    expect(rappel.seuilKm ?? rappel.dateCible).toBeTruthy()
  })
})
