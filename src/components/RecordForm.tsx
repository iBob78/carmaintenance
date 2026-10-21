import { useState } from 'react'
import type { MaintenanceRecord, ServiceType, Vehicle } from '../types'
import { SERVICE_CATALOG, SERVICE_TYPES } from '../lib/maintenance'
import { Button, Field, Input, Select, Textarea } from './ui'
import { todayISO } from '../lib/utils'

export interface RecordFormValues {
  vehicleId: string
  type: ServiceType
  libelle: string
  date: string
  kilometrage: number
  cout: string
  garage: string
  notes: string
}

export function RecordForm({
  vehicles,
  initial,
  defaultVehicleId,
  defaultType,
  submitLabel = 'Enregistrer',
  onSubmit,
  onCancel,
}: {
  vehicles: Vehicle[]
  initial?: MaintenanceRecord
  defaultVehicleId?: string
  defaultType?: ServiceType
  submitLabel?: string
  onSubmit: (values: RecordFormValues) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<RecordFormValues>(() => {
    if (initial) {
      return {
        vehicleId: initial.vehicleId,
        type: initial.type,
        libelle: initial.libelle,
        date: initial.date,
        kilometrage: initial.kilometrage,
        cout: initial.cout != null ? String(initial.cout) : '',
        garage: initial.garage ?? '',
        notes: initial.notes ?? '',
      }
    }
    const vehicleId = defaultVehicleId ?? vehicles[0]?.id ?? ''
    const vehicle = vehicles.find((v) => v.id === vehicleId)
    return {
      vehicleId,
      type: defaultType ?? 'vidange',
      libelle: '',
      date: todayISO(),
      kilometrage: vehicle?.kilometrage ?? 0,
      cout: '',
      garage: '',
      notes: '',
    }
  })

  const set = <K extends keyof RecordFormValues>(key: K, value: RecordFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const vehicle = vehicles.find((v) => v.id === values.vehicleId)
  const valid = values.vehicleId && values.date && values.kilometrage >= 0

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSubmit(values)
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Véhicule" required>
          <Select value={values.vehicleId} onChange={(e) => set('vehicleId', e.target.value)} required>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nom || `${v.marque} ${v.modele}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type d'entretien" required>
          <Select value={values.type} onChange={(e) => set('type', e.target.value as ServiceType)}>
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {SERVICE_CATALOG[t].label}
              </option>
            ))}
          </Select>
        </Field>

        {values.type === 'autre' && (
          <Field label="Libellé personnalisé" required>
            <Input
              value={values.libelle}
              onChange={(e) => set('libelle', e.target.value)}
              placeholder="Ex. : réparation vitre conducteur"
              required
            />
          </Field>
        )}

        <Field label="Date" required>
          <Input
            type="date"
            max={todayISO()}
            value={values.date}
            onChange={(e) => set('date', e.target.value)}
            required
          />
        </Field>
        <Field
          label="Kilométrage (km)"
          hint={vehicle ? `Compteur actuel : ${vehicle.kilometrage.toLocaleString('fr-FR')} km` : undefined}
          required
        >
          <Input
            type="number"
            min={0}
            step={100}
            value={values.kilometrage}
            onChange={(e) => set('kilometrage', Math.max(0, Number(e.target.value)))}
            required
          />
        </Field>
        <Field label="Coût (€)" hint="Facultatif">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={values.cout}
            onChange={(e) => set('cout', e.target.value)}
            placeholder="120"
          />
        </Field>
        <Field label="Garage / atelier" hint="Facultatif">
          <Input
            value={values.garage}
            onChange={(e) => set('garage', e.target.value)}
            placeholder="Garage AutoPlus"
          />
        </Field>
      </div>

      <Field label="Notes" hint="Facultatif — pièces changées, prochaines remarques…">
        <Textarea
          rows={3}
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Huile 5W30 + filtre à huile remplacés…"
        />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={!valid}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
