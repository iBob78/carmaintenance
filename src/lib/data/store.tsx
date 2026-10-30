'use client'

// Store React : charge la base depuis le dépôt, expose des actions typées.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type {
  AppDatabase,
  DocumentEntry,
  ExpenseEntry,
  FaultAndTest,
  FuelEntry,
  OdometerReading,
  PartPurchase,
  Reminder,
  ReportExport,
  ServiceRecord,
  ServiceRecordItem,
  Vehicle,
} from '../domain/types'
import { demoRepository } from './demo/repository'
import { buildSeedDatabase } from './demo/seed'
import { SERVICE_CATEGORY_KEYS, defaultInterval } from '../domain/catalog'
import { todayISO, uid } from '../domain/format'

interface StoreValue {
  ready: boolean
  db: AppDatabase
  mode: 'demo' | 'supabase'
  addFuelEntry: (entry: Omit<FuelEntry, 'id' | 'createdAt'>) => void
  updateFuelEntry: (entry: FuelEntry) => void
  removeFuelEntry: (id: string) => void
  addVehicle: (v: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateVehicle: (v: Vehicle) => void
  removeVehicle: (id: string) => void
  addOdometerReading: (r: Omit<OdometerReading, 'id' | 'createdAt'>) => void
  addServiceRecord: (r: Omit<ServiceRecord, 'id' | 'createdAt' | 'updatedAt'>, items: Omit<ServiceRecordItem, 'id' | 'serviceRecordId'>[]) => void
  updateServiceRecord: (r: ServiceRecord, items: Omit<ServiceRecordItem, 'id' | 'serviceRecordId'>[]) => void
  removeServiceRecord: (id: string) => void
  addFault: (f: Omit<FaultAndTest, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateFault: (f: FaultAndTest) => void
  removeFault: (id: string) => void
  addPurchase: (p: Omit<PartPurchase, 'id' | 'createdAt'>) => void
  removePurchase: (id: string) => void
  addDocument: (d: Omit<DocumentEntry, 'id' | 'createdAt'>) => void
  removeDocument: (id: string) => void
  addExpense: (e: Omit<ExpenseEntry, 'id' | 'createdAt'>) => void
  updateExpense: (e: ExpenseEntry) => void
  removeExpense: (id: string) => void
  addReminder: (r: Omit<Reminder, 'id' | 'createdAt'>) => void
  updateReminder: (r: Reminder) => void
  removeReminder: (id: string) => void
  addReportExport: (e: Omit<ReportExport, 'id'>) => string
  resetToSeed: () => void
  resetEmpty: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

function buildDefaultTasks(vehicleId: string, carburant: Vehicle['carburant'], now: string) {
  return SERVICE_CATEGORY_KEYS.map((categorie) => {
    const { km, mois } = defaultInterval(categorie, carburant)
    return {
      id: `task-${vehicleId}-${categorie}`,
      vehicleId,
      categorie,
      libelle: categorie,
      intervalleKm: km,
      intervalleMois: mois,
      actif: categorie !== 'autre' && !(categorie === 'vidange' && carburant === 'electrique'),
      createdAt: now,
    }
  })
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<AppDatabase | null>(null)

  useEffect(() => {
    let alive = true
    demoRepository.load().then((loaded) => {
      if (alive) setDb(loaded)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (db) void demoRepository.save(db)
  }, [db])

  const mutate = useCallback((fn: (d: AppDatabase) => AppDatabase) => {
    setDb((prev) => (prev ? fn(prev) : prev))
  }, [])

  const value = useMemo<StoreValue>(() => {
    const safe: AppDatabase = db ?? {
      profile: { id: 'profile-demo', nom: '', email: '', createdAt: '' },
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

    return {
      ready: db != null,
      db: safe,
      mode: demoRepository.mode,

      addFuelEntry: (entry) => mutate((d) => ({
        ...d,
        fuelEntries: [...invalidateFollowing(d.fuelEntries ?? [], entry.vehicleId, entry.date), { ...entry, id: uid(), createdAt: new Date().toISOString() }],
      })),
      updateFuelEntry: (entry) => mutate((d) => {
        const old = (d.fuelEntries ?? []).find((x) => x.id === entry.id)
        if (!old) return d
        let entries = invalidateFollowing(d.fuelEntries ?? [], old.vehicleId, old.date, entry.id)
        entries = invalidateFollowing(entries, entry.vehicleId, entry.date, entry.id)
        return { ...d, fuelEntries: entries.map((x) => x.id === entry.id ? entry : x) }
      }),
      removeFuelEntry: (id) => mutate((d) => {
        const old = (d.fuelEntries ?? []).find((x) => x.id === id)
        if (!old) return d
        return { ...d, fuelEntries: invalidateFollowing(d.fuelEntries ?? [], old.vehicleId, old.date, id).filter((x) => x.id !== id) }
      }),

      addVehicle: (input) =>
        mutate((d) => {
          const now = new Date().toISOString()
          const vehicle: Vehicle = { ...input, dateKilometrageActuel: todayISO(), id: uid(), createdAt: now, updatedAt: now }
          return {
            ...d,
            vehicles: [...d.vehicles, vehicle],
            maintenanceTasks: [...d.maintenanceTasks, ...buildDefaultTasks(vehicle.id, vehicle.carburant, now)],
          }
        }),
      updateVehicle: (v) =>
        mutate((d) => ({
          ...d,
          vehicles: d.vehicles.map((x) => (x.id === v.id ? { ...v, dateKilometrageActuel: x.kilometrageActuel !== v.kilometrageActuel ? todayISO() : x.dateKilometrageActuel, updatedAt: new Date().toISOString() } : x)),
        })),
      removeVehicle: (id) =>
        mutate((d) => ({
          ...d,
          vehicles: d.vehicles.filter((v) => v.id !== id),
          fuelEntries: (d.fuelEntries ?? []).filter((e) => e.vehicleId !== id),
          odometerReadings: d.odometerReadings.filter((r) => r.vehicleId !== id),
          maintenanceTasks: d.maintenanceTasks.filter((t) => t.vehicleId !== id),
          serviceRecords: d.serviceRecords.filter((r) => r.vehicleId !== id),
          faults: d.faults.filter((f) => f.vehicleId !== id),
          purchases: d.purchases.filter((p) => p.vehicleId !== id),
          documents: d.documents.filter((x) => x.vehicleId !== id),
          expenses: d.expenses.filter((e) => e.vehicleId !== id),
          reminders: d.reminders.filter((r) => r.vehicleId !== id),
        })),

      addOdometerReading: (r) =>
        mutate((d) => ({
          ...d,
          odometerReadings: [...d.odometerReadings, { ...r, id: uid(), createdAt: new Date().toISOString() }],
          vehicles: d.vehicles.map((v) =>
            v.id === r.vehicleId && (r.valeurKm > v.kilometrageActuel || (r.valeurKm === v.kilometrageActuel && (!v.dateKilometrageActuel || r.date > v.dateKilometrageActuel)))
              ? { ...v, kilometrageActuel: r.valeurKm, dateKilometrageActuel: r.date }
              : v,
          ),
        })),

      addServiceRecord: (r, items) =>
        mutate((d) => {
          const now = new Date().toISOString()
          const id = uid()
          return {
            ...d,
            serviceRecords: [...d.serviceRecords, { ...r, id, createdAt: now, updatedAt: now }],
            serviceRecordItems: [
              ...d.serviceRecordItems,
              ...items.map((it) => ({ ...it, id: uid(), serviceRecordId: id })),
            ],
            vehicles: d.vehicles.map((v) =>
              v.id === r.vehicleId && r.kilometrage > v.kilometrageActuel
                ? { ...v, kilometrageActuel: r.kilometrage, dateKilometrageActuel: r.date }
                : v,
            ),
          }
        }),
      updateServiceRecord: (r, items) =>
        mutate((d) => ({
          ...d,
          serviceRecords: d.serviceRecords.map((x) =>
            x.id === r.id ? { ...r, updatedAt: new Date().toISOString() } : x,
          ),
          serviceRecordItems: [
            ...d.serviceRecordItems.filter((it) => it.serviceRecordId !== r.id),
            ...items.map((it) => ({ ...it, id: uid(), serviceRecordId: r.id })),
          ],
        })),
      removeServiceRecord: (id) =>
        mutate((d) => ({
          ...d,
          serviceRecords: d.serviceRecords.filter((r) => r.id !== id),
          serviceRecordItems: d.serviceRecordItems.filter((i) => i.serviceRecordId !== id),
        })),

      addFault: (f) =>
        mutate((d) => {
          const now = new Date().toISOString()
          return { ...d, faults: [...d.faults, { ...f, id: uid(), createdAt: now, updatedAt: now }] }
        }),
      updateFault: (f) =>
        mutate((d) => ({
          ...d,
          faults: d.faults.map((x) => (x.id === f.id ? { ...f, updatedAt: new Date().toISOString() } : x)),
        })),
      removeFault: (id) => mutate((d) => ({ ...d, faults: d.faults.filter((f) => f.id !== id) })),

      addPurchase: (p) =>
        mutate((d) => ({
          ...d,
          purchases: [...d.purchases, { ...p, id: uid(), createdAt: new Date().toISOString() }],
        })),
      removePurchase: (id) => mutate((d) => ({ ...d, purchases: d.purchases.filter((p) => p.id !== id) })),

      addDocument: (doc) =>
        mutate((d) => ({
          ...d,
          documents: [...d.documents, { ...doc, id: uid(), createdAt: new Date().toISOString() }],
        })),
      removeDocument: (id) => mutate((d) => ({ ...d, documents: d.documents.filter((x) => x.id !== id) })),

      addExpense: (e) =>
        mutate((d) => ({
          ...d,
          expenses: [...d.expenses, { ...e, id: uid(), createdAt: new Date().toISOString() }],
        })),
      updateExpense: (e) =>
        mutate((d) => ({ ...d, expenses: d.expenses.map((x) => (x.id === e.id ? e : x)) })),
      removeExpense: (id) => mutate((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) })),

      addReminder: (r) =>
        mutate((d) => ({
          ...d,
          reminders: [...d.reminders, { ...r, id: uid(), createdAt: new Date().toISOString() }],
        })),
      updateReminder: (r) => mutate((d) => ({ ...d, reminders: d.reminders.map((x) => (x.id === r.id ? r : x)) })),
      removeReminder: (id) => mutate((d) => ({ ...d, reminders: d.reminders.filter((r) => r.id !== id) })),

      addReportExport: (e) => {
        const id = uid()
        mutate((d) => ({
          ...d,
          reportExports: [{ ...e, id }, ...d.reportExports].slice(0, 50),
        }))
        return id
      },

      resetToSeed: () => setDb(buildSeedDatabase()),
      resetEmpty: () => setDb(empty()),
    }
  }, [db, mutate])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// Une insertion, modification ou suppression rend incertain le suivi qui la suit.
function invalidateFollowing(entries: FuelEntry[], vehicleId: string, date: string, excludeId?: string): FuelEntry[] {
  const next = entries.filter((e) => e.vehicleId === vehicleId && e.id !== excludeId && e.date >= date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))[0]
  return entries.map((e) => e.id === next?.id ? { ...e, suiviContinu: false } : e)
}

function empty(): AppDatabase {
  return {
    profile: { id: 'profile-demo', nom: 'Utilisateur local', email: '', createdAt: new Date().toISOString() },
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

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return ctx
}
