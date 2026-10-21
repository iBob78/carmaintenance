import { useMemo, useState } from 'react'
import { Car, Gauge, Pencil, Plus, Trash2, Wrench } from 'lucide-react'
import { useStore } from '../store'
import type { Vehicle } from '../types'
import {
  avgKmPerMonth,
  describeDue,
  duesForVehicle,
  formatDueTitle,
  totalCost,
  vehicleLabel,
} from '../lib/maintenance'
import { Badge, Button, Card, EmptyState, Modal, Progress, SectionTitle } from './ui'
import { VehicleForm, vehicleToForm, type VehicleFormValues } from './VehicleForm'
import { RecordForm } from './RecordForm'
import { formatEuro, formatKm } from '../lib/utils'

export function VehiclesPage() {
  const { data, addVehicle, updateVehicle, removeVehicle, addRecord } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [quickRecordFor, setQuickRecordFor] = useState<Vehicle | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Vehicle | null>(null)

  const vehicles = data.vehicles

  const handleFormSubmit = (values: VehicleFormValues) => {
    if (editing) {
      updateVehicle({ ...editing, ...values })
    } else {
      addVehicle(values)
    }
    setFormOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Ajouter un véhicule
          </Button>
        }
      >
        Mes véhicules
      </SectionTitle>

      {vehicles.length === 0 ? (
        <EmptyState
          icon={<Car className="h-6 w-6" />}
          title="Aucun véhicule pour l'instant"
          description="Ajoutez votre voiture pour suivre vidanges, révisions et échéances kilométriques."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Ajouter un véhicule
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onEdit={() => {
                setEditing(v)
                setFormOpen(true)
              }}
              onDelete={() => setConfirmDelete(v)}
              onQuickRecord={() => setQuickRecordFor(v)}
            />
          ))}
        </div>
      )}

      {/* Formulaire véhicule */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
        wide
      >
        <VehicleForm
          initial={editing ? vehicleToForm(editing) : undefined}
          submitLabel={editing ? 'Enregistrer les modifications' : 'Ajouter le véhicule'}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      </Modal>

      {/* Saisie rapide d'entretien */}
      <Modal
        open={quickRecordFor != null}
        onClose={() => setQuickRecordFor(null)}
        title={`Ajouter un entretien — ${quickRecordFor ? vehicleLabel(quickRecordFor) : ''}`}
        wide
      >
        {quickRecordFor && (
          <RecordForm
            vehicles={data.vehicles}
            defaultVehicleId={quickRecordFor.id}
            onSubmit={(values) => {
              addRecord({
                vehicleId: values.vehicleId,
                type: values.type,
                libelle: values.libelle,
                date: values.date,
                kilometrage: values.kilometrage,
                cout: values.cout ? Number(values.cout) : undefined,
                garage: values.garage || undefined,
                notes: values.notes || undefined,
              })
              setQuickRecordFor(null)
            }}
            onCancel={() => setQuickRecordFor(null)}
          />
        )}
      </Modal>

      {/* Confirmation de suppression */}
      <Modal
        open={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Supprimer ce véhicule ?"
      >
        <p className="text-sm text-slate-600">
          Cette action supprimera définitivement <strong>{confirmDelete ? vehicleLabel(confirmDelete) : ''}</strong>{' '}
          ainsi que tous ses entretiens et échéances. Cette opération est irréversible.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDelete) removeVehicle(confirmDelete.id)
              setConfirmDelete(null)
            }}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function VehicleCard({
  vehicle,
  onEdit,
  onDelete,
  onQuickRecord,
}: {
  vehicle: Vehicle
  onEdit: () => void
  onDelete: () => void
  onQuickRecord: () => void
}) {
  const { data } = useStore()
  const dues = useMemo(() => duesForVehicle(vehicle, data), [vehicle, data])
  const records = data.records.filter((r) => r.vehicleId === vehicle.id)
  const cost = totalCost(records)
  const rate = avgKmPerMonth(vehicle, records)
  const next = dues.find((d) => d.urgency !== 'ok') ?? dues[0]

  return (
    <Card className="flex flex-col overflow-hidden">
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: vehicle.couleur }}
      />
      <div className="flex-1 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: vehicle.couleur }}
            >
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{vehicleLabel(vehicle)}</h3>
              <p className="text-sm text-slate-500">
                {vehicle.marque} {vehicle.modele} · {vehicle.annee}
                {vehicle.immatriculation ? ` · ${vehicle.immatriculation}` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Gauge className="h-3.5 w-3.5" />
              Compteur
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatKm(vehicle.kilometrage)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Wrench className="h-3.5 w-3.5" />
              Entretiens
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{records.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Gauge className="h-3.5 w-3.5" />
              Dépenses
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatEuro(cost)}</p>
          </div>
        </div>

        {next && (
          <div className="mt-4 rounded-xl border border-slate-100 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-900">{formatDueTitle(next)}</p>
              <Badge tone={next.urgency === 'urgent' ? 'rose' : next.urgency === 'soon' ? 'amber' : 'green'}>
                {next.urgency === 'urgent' ? 'Urgent' : next.urgency === 'soon' ? 'Bientôt' : 'À prévoir'}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">{describeDue(next)}</p>
            {next.dueKm != null && next.lastRecord && (
              <div className="mt-2.5">
                <Progress
                  value={
                    ((vehicle.kilometrage - next.lastRecord.kilometrage) /
                      Math.max(1, next.dueKm - next.lastRecord.kilometrage)) *
                    100
                  }
                  tone={next.urgency === 'urgent' ? 'rose' : next.urgency === 'soon' ? 'amber' : 'green'}
                />
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-xs text-slate-400">Rythme estimé : ≈ {formatKm(rate)} par mois</p>
      </div>

      <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
        <Button variant="outline" className="flex-1" onClick={onQuickRecord}>
          <Plus className="h-4 w-4" />
          Ajouter un entretien
        </Button>
      </div>
    </Card>
  )
}
