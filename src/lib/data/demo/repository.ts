// Dépôt local de démonstration : persistance navigateur (localStorage).
// Aucune donnée ne quitte l'appareil.

import type { AppDatabase } from '../../domain/types'
import type { DataRepository } from '../repository'
import { buildSeedDatabase } from './seed'

const STORAGE_KEY = 'autocarnet.db.v2'

export function emptyDatabase(): AppDatabase {
  const now = new Date().toISOString()
  return {
    profile: {
      id: 'profile-demo',
      nom: 'Utilisateur local',
      email: '',
      createdAt: now,
    },
    vehicles: [],
    odometerReadings: [],
    maintenanceTasks: [],
    serviceRecords: [],
    serviceRecordItems: [],
    faults: [],
    purchases: [],
    documents: [],
    expenses: [],
    reminders: [],
    reportExports: [],
  }
}

export const demoRepository: DataRepository = {
  mode: 'demo',
  async load(): Promise<AppDatabase> {
    if (typeof window === 'undefined') return emptyDatabase()
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        // Premier lancement : jeu de démonstration
        const seeded = buildSeedDatabase()
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
        return seeded
      }
      return JSON.parse(raw) as AppDatabase
    } catch {
      return emptyDatabase()
    }
  },
  async save(db: AppDatabase): Promise<void> {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  },
  async clear(): Promise<void> {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(STORAGE_KEY)
  },
}
