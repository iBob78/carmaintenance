import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppData, MaintenanceInterval, MaintenanceRecord, Vehicle } from './types'
import {
  EMPTY_DATA,
  buildDefaultIntervals,
  clearData,
  loadData,
  saveData,
  seedData,
} from './lib/storage'
import { uid } from './lib/utils'

interface StoreValue {
  data: AppData
  addVehicle: (v: Omit<Vehicle, 'id'>) => Vehicle
  updateVehicle: (v: Vehicle) => void
  removeVehicle: (id: string) => void
  addRecord: (r: Omit<MaintenanceRecord, 'id'>) => void
  updateRecord: (r: MaintenanceRecord) => void
  removeRecord: (id: string) => void
  updateInterval: (i: MaintenanceInterval) => void
  replaceAll: (data: AppData) => void
  resetAll: (withSeed?: boolean) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => {
    const loaded = loadData()
    if (loaded.vehicles.length === 0 && loaded.records.length === 0) {
      // Premier lancement : jeu de démonstration pour découvrir l'application
      const seeded = seedData()
      saveData(seeded)
      return seeded
    }
    return loaded
  })

  useEffect(() => {
    saveData(data)
  }, [data])

  const addVehicle = useCallback((input: Omit<Vehicle, 'id'>) => {
    const vehicle: Vehicle = { ...input, id: uid() }
    setData((d) => ({
      ...d,
      vehicles: [...d.vehicles, vehicle],
      intervals: [...d.intervals, ...buildDefaultIntervals(vehicle.id, vehicle.carburant)],
    }))
    return vehicle
  }, [])

  const updateVehicle = useCallback((vehicle: Vehicle) => {
    setData((d) => ({
      ...d,
      vehicles: d.vehicles.map((v) => (v.id === vehicle.id ? vehicle : v)),
    }))
  }, [])

  const removeVehicle = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      vehicles: d.vehicles.filter((v) => v.id !== id),
      records: d.records.filter((r) => r.vehicleId !== id),
      intervals: d.intervals.filter((i) => i.vehicleId !== id),
    }))
  }, [])

  const addRecord = useCallback((input: Omit<MaintenanceRecord, 'id'>) => {
    const record: MaintenanceRecord = { ...input, id: uid() }
    setData((d) => {
      const records = [...d.records, record]
      // Le kilométrage du véhicule suit le plus grand relevé connu
      const vehicles = d.vehicles.map((v) =>
        v.id === record.vehicleId && record.kilometrage > v.kilometrage
          ? { ...v, kilometrage: record.kilometrage }
          : v,
      )
      return { ...d, records, vehicles }
    })
  }, [])

  const updateRecord = useCallback((record: MaintenanceRecord) => {
    setData((d) => ({
      ...d,
      records: d.records.map((r) => (r.id === record.id ? record : r)),
    }))
  }, [])

  const removeRecord = useCallback((id: string) => {
    setData((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) }))
  }, [])

  const updateInterval = useCallback((interval: MaintenanceInterval) => {
    setData((d) => ({
      ...d,
      intervals: d.intervals.map((i) =>
        i.vehicleId === interval.vehicleId && i.type === interval.type ? interval : i,
      ),
    }))
  }, [])

  const replaceAll = useCallback((next: AppData) => {
    setData(next)
  }, [])

  const resetAll = useCallback((withSeed = false) => {
    clearData()
    const next = withSeed ? seedData() : { ...EMPTY_DATA }
    saveData(next)
    setData(next)
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      data,
      addVehicle,
      updateVehicle,
      removeVehicle,
      addRecord,
      updateRecord,
      removeRecord,
      updateInterval,
      replaceAll,
      resetAll,
    }),
    [data, addVehicle, updateVehicle, removeVehicle, addRecord, updateRecord, removeRecord, updateInterval, replaceAll, resetAll],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return ctx
}
