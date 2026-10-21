// Chronologie fiche véhicule : faits / à faire, tri, séparateur « Aujourd'hui ».
import { describe, expect, it } from 'vitest'
import { buildSeedDatabase } from '@/lib/data/demo/seed'
import { timelineForVehicle, todaySplitIndex } from '@/lib/domain/timeline'
import type { AppDatabase, Reminder } from '@/lib/domain/types'

describe('timelineForVehicle', () => {
  it('mélange interventions réalisées et échéances dans l’ordre chronologique', () => {
    const db = buildSeedDatabase()
    const entries = timelineForVehicle(db, 'veh-clio-demo')
    expect(entries.length).toBeGreaterThan(3)

    const faits = entries.filter((e) => e.sens === 'fait')
    const afaire = entries.filter((e) => e.sens === 'a_faire')
    expect(faits.length).toBeGreaterThan(0)
    expect(afaire.length).toBeGreaterThan(0)

    // tri : clé date non décroissante (faits sans date en tête, avenir sans date en queue)
    const key = (e: (typeof entries)[number]) =>
      e.date ?? (e.sens === 'fait' ? '0000-00-00' : '9999-99-99')
    for (let i = 1; i < entries.length; i++) {
      expect(key(entries[i]) >= key(entries[i - 1])).toBe(true)
    }
  })

  it('chaque entrée réalisée porte son contexte d’affichage (jamais de date ISO brute)', () => {
    const db = buildSeedDatabase()
    const entries = timelineForVehicle(db, 'veh-clio-demo')
    for (const e of entries) {
      expect(e.libelle.length).toBeGreaterThan(0)
      expect(e.detail.length).toBeGreaterThan(0)
    }
    const faits = entries.filter((e) => e.sens === 'fait')
    for (const e of faits) {
      expect(e.etat).toBe('effectue')
      expect(e.detail).toMatch(/^Réalisé par /)
    }
  })

  it('exclut les interventions annulées ou non réalisées', () => {
    const db = buildSeedDatabase()
    const clone: AppDatabase = {
      ...db,
      serviceRecords: [
        ...db.serviceRecords,
        {
          id: 'srv-annule',
          vehicleId: 'veh-clio-demo',
          date: '2026-03-01',
          kilometrage: 85000,
          categorie: 'freins',
          titre: 'Plaquettes annulées',
          statut: 'annule',
          realisateur: 'proprietaire',
          sourceInformation: 'declare',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
        },
        {
          id: 'srv-non-realise',
          vehicleId: 'veh-clio-demo',
          date: '2026-04-01',
          kilometrage: 85500,
          categorie: 'freins',
          titre: 'Purge non réalisée',
          statut: 'non_realise',
          realisateur: 'garage',
          sourceInformation: 'declare',
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T10:00:00.000Z',
        },
      ],
    }
    const entries = timelineForVehicle(clone, 'veh-clio-demo')
    expect(entries.some((e) => e.id === 'srv-annule')).toBe(false)
    expect(entries.some((e) => e.id === 'srv-non-realise')).toBe(false)
  })

  it('marque en « retard » une échéance dépassée (rappel enregistré)', () => {
    const db = buildSeedDatabase()
    const late: Reminder = {
      id: 'rappel-retard',
      vehicleId: 'veh-clio-demo',
      categorie: 'pneus',
      libelle: 'Rotation des pneus',
      declencheur: 'date',
      dateCible: '2026-01-15',
      statut: 'a_faire',
      createdAt: '2026-01-01T10:00:00.000Z',
    }
    const clone: AppDatabase = { ...db, reminders: [...db.reminders, late] }
    const entries = timelineForVehicle(clone, 'veh-clio-demo')
    const entry = entries.find((e) => e.libelle === 'Rotation des pneus')
    expect(entry).toBeTruthy()
    expect(entry!.sens).toBe('a_faire')
    expect(entry!.etat).toBe('retard')
    expect(entry!.detail).toMatch(/En retard/)
  })

  it('une intervention planifiée (statut « prévu ») apparaît côté « à faire »', () => {
    const db = buildSeedDatabase()
    const clone: AppDatabase = {
      ...db,
      serviceRecords: [
        ...db.serviceRecords,
        {
          id: 'srv-prevu',
          vehicleId: 'veh-clio-demo',
          date: '2027-01-10',
          kilometrage: 95000,
          categorie: 'climatisation',
          titre: 'Recharge de climatisation',
          statut: 'prevu',
          realisateur: 'garage',
          garage: 'Duval',
          sourceInformation: 'declare',
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-01T10:00:00.000Z',
        },
      ],
    }
    const entries = timelineForVehicle(clone, 'veh-clio-demo')
    const entry = entries.find((e) => e.id === 'srv-prevu')
    expect(entry).toBeTruthy()
    expect(entry!.sens).toBe('a_faire')
    expect(entry!.etat).toBe('prevu')
    expect(entry!.detail).toMatch(/planifiée/)
  })

  it('renvoie une liste vide pour un véhicule sans historique ni échéances', () => {
    const db = buildSeedDatabase()
    expect(timelineForVehicle(db, 'veh-inconnu')).toEqual([])
  })
})

describe('todaySplitIndex', () => {
  it('place le séparateur « Aujourd’hui » entre le passé et l’avenir', () => {
    const db = buildSeedDatabase()
    const entries = timelineForVehicle(db, 'veh-clio-demo')
    const split = todaySplitIndex(entries, '2026-10-22')
    expect(split).toBeGreaterThan(0)
    expect(split).toBeLessThan(entries.length)
    for (let i = 0; i < split; i++) {
      expect((entries[i].date ?? '0000-00-00') <= '2026-10-22').toBe(true)
    }
    for (let i = split; i < entries.length; i++) {
      expect((entries[i].date ?? '9999-99-99') > '2026-10-22').toBe(true)
    }
  })

  it('séparateur en fin si tout est passé, en tête si tout est à venir', () => {
    expect(todaySplitIndex([], '2026-10-22')).toBe(0)
    const db = buildSeedDatabase()
    const entries = timelineForVehicle(db, 'veh-clio-demo')
    const futur = entries.map((e) => ({ ...e, date: '2099-01-01', sens: 'a_faire' as const }))
    expect(todaySplitIndex(futur, '2026-10-22')).toBe(0)
    const passe = entries.map((e) => ({ ...e, date: '2020-01-01', sens: 'fait' as const }))
    expect(todaySplitIndex(passe, '2026-10-22')).toBe(passe.length)
  })
})
