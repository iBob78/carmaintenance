import { useState } from 'react'
import type { Carburant, Vehicle } from '../types'
import { Button, Field, Input, Select } from './ui'
import { todayISO } from '../lib/utils'

const CARBURANTS: Array<{ value: Carburant; label: string }> = [
  { value: 'essence', label: 'Essence' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'electrique', label: 'Électrique' },
  { value: 'gpl', label: 'GPL' },
  { value: 'autre', label: 'Autre' },
]

const COULEURS = ['#4f46e5', '#0d9488', '#e11d48', '#d97706', '#2563eb', '#7c3aed', '#059669', '#334155']

export interface VehicleFormValues {
  nom: string
  marque: string
  modele: string
  annee: number
  immatriculation: string
  carburant: Carburant
  kilometrage: number
  dateCirculation?: string
  couleur: string
}

export function vehicleToForm(v: Vehicle): VehicleFormValues {
  return {
    nom: v.nom,
    marque: v.marque,
    modele: v.modele,
    annee: v.annee,
    immatriculation: v.immatriculation,
    carburant: v.carburant,
    kilometrage: v.kilometrage,
    dateCirculation: v.dateCirculation ?? '',
    couleur: v.couleur,
  }
}

export function VehicleForm({
  initial,
  submitLabel = 'Enregistrer',
  onSubmit,
  onCancel,
}: {
  initial?: VehicleFormValues
  submitLabel?: string
  onSubmit: (values: VehicleFormValues) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<VehicleFormValues>(
    initial ?? {
      nom: '',
      marque: '',
      modele: '',
      annee: new Date().getFullYear(),
      immatriculation: '',
      carburant: 'essence',
      kilometrage: 0,
      dateCirculation: '',
      couleur: COULEURS[0],
    },
  )

  const set = <K extends keyof VehicleFormValues>(key: K, value: VehicleFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const valid = values.nom.trim() && values.marque.trim() && values.modele.trim()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSubmit({
          ...values,
          nom: values.nom.trim(),
          marque: values.marque.trim(),
          modele: values.modele.trim(),
          immatriculation: values.immatriculation.trim().toUpperCase(),
          dateCirculation: values.dateCirculation || undefined,
        })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du véhicule" hint="Ex. : « Ma Clio », « Le 3008 »" required>
          <Input
            value={values.nom}
            onChange={(e) => set('nom', e.target.value)}
            placeholder="Ma Clio"
            required
          />
        </Field>
        <Field label="Année">
          <Input
            type="number"
            min={1950}
            max={new Date().getFullYear() + 1}
            value={values.annee}
            onChange={(e) => set('annee', Number(e.target.value))}
          />
        </Field>
        <Field label="Marque" required>
          <Input value={values.marque} onChange={(e) => set('marque', e.target.value)} placeholder="Renault" required />
        </Field>
        <Field label="Modèle" required>
          <Input value={values.modele} onChange={(e) => set('modele', e.target.value)} placeholder="Clio IV 1.2 TCe" required />
        </Field>
        <Field label="Immatriculation">
          <Input
            value={values.immatriculation}
            onChange={(e) => set('immatriculation', e.target.value)}
            placeholder="AB-123-CD"
            className="uppercase"
          />
        </Field>
        <Field label="Carburant">
          <Select value={values.carburant} onChange={(e) => set('carburant', e.target.value as Carburant)}>
            {CARBURANTS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kilométrage actuel (km)" required>
          <Input
            type="number"
            min={0}
            step={100}
            value={values.kilometrage}
            onChange={(e) => set('kilometrage', Math.max(0, Number(e.target.value)))}
            required
          />
        </Field>
        <Field label="Mise en circulation">
          <Input
            type="date"
            max={todayISO()}
            value={values.dateCirculation ?? ''}
            onChange={(e) => set('dateCirculation', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Couleur">
        <div className="flex flex-wrap gap-2">
          {COULEURS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set('couleur', c)}
              aria-label={`Couleur ${c}`}
              className={`h-8 w-8 rounded-full ring-offset-2 transition ${
                values.couleur === c ? 'ring-2 ring-slate-900' : 'ring-1 ring-slate-200 hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
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
