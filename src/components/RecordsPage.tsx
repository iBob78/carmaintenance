import { useEffect, useMemo, useState } from 'react'
import { Filter, Pencil, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { useStore } from '../store'
import type { MaintenanceRecord, ServiceType } from '../types'
import { SERVICE_CATALOG, SERVICE_TYPES, serviceLabel, totalCost, vehicleLabel } from '../lib/maintenance'
import { Badge, Button, Card, EmptyState, Input, Modal, Select } from './ui'
import { ServiceIcon } from './ServiceIcon'
import { RecordForm, type RecordFormValues } from './RecordForm'
import { formatEuro, formatDateShort, formatKm } from '../lib/utils'

export function RecordsPage({ openSignal }: { openSignal?: number }) {
  const { data, addRecord, updateRecord, removeRecord } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<MaintenanceRecord | null>(null)
  const [search, setSearch] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterType, setFilterType] = useState<'all' | ServiceType>('all')

  // Ouvre le formulaire quand le signal change (bouton global « Ajouter »)
  useEffect(() => {
    if (openSignal && openSignal > 0) {
      setEditing(null)
      setFormOpen(true)
    }
  }, [openSignal])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.records
      .filter((r) => {
        if (filterVehicle && r.vehicleId !== filterVehicle) return false
        if (filterType !== 'all' && r.type !== filterType) return false
        if (!q) return true
        const vehicle = data.vehicles.find((v) => v.id === r.vehicleId)
        const haystack = [
          serviceLabel(r.type, r.libelle),
          r.garage ?? '',
          r.notes ?? '',
          vehicle ? vehicleLabel(vehicle) : '',
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.kilometrage - a.kilometrage))
  }, [data.records, data.vehicles, search, filterVehicle, filterType])

  const totalShown = totalCost(filtered)

  const handleSubmit = (values: RecordFormValues) => {
    const payload = {
      vehicleId: values.vehicleId,
      type: values.type,
      libelle: values.libelle,
      date: values.date,
      kilometrage: values.kilometrage,
      cout: values.cout ? Number(values.cout) : undefined,
      garage: values.garage || undefined,
      notes: values.notes || undefined,
    }
    if (editing) {
      updateRecord({ ...editing, ...payload })
    } else {
      addRecord(payload)
    }
    setFormOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Historique des entretiens</h1>
          <p className="mt-1 text-sm text-slate-500">
            Toutes vos vidanges, révisions et prestations enregistrées.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Ajouter un entretien
        </Button>
      </div>

      {/* Filtres */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (vidange, garage, notes…)"
            className="pl-9"
          />
        </div>
        <Select
          value={filterVehicle}
          onChange={(e) => setFilterVehicle(e.target.value)}
          className="w-auto min-w-44"
        >
          <option value="">Tous les véhicules</option>
          {data.vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {vehicleLabel(v)}
            </option>
          ))}
        </Select>
        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | ServiceType)}
          className="w-auto min-w-48"
        >
          <option value="all">Tous les types</option>
          {SERVICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {SERVICE_CATALOG[t].label}
            </option>
          ))}
        </Select>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
          <Filter className="h-4 w-4" />
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''} · {formatEuro(totalShown)}
        </div>
      </Card>

      {/* Liste */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-6 w-6" />}
          title="Aucun entretien trouvé"
          description={
            data.records.length === 0
              ? 'Enregistrez votre première vidange ou révision pour constituer l’historique.'
              : 'Aucun entretien ne correspond à ces filtres. Essayez de les élargir.'
          }
          action={
            data.records.length === 0 ? (
              <Button
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Ajouter un entretien
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const vehicle = data.vehicles.find((v) => v.id === r.vehicleId)
              return (
                <li
                  key={r.id}
                  className="group flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-slate-50/70"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 group-hover:bg-white">
                    <ServiceIcon type={r.type} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{serviceLabel(r.type, r.libelle)}</p>
                      {vehicle && <Badge tone="slate">{vehicleLabel(vehicle)}</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateShort(r.date)} · {formatKm(r.kilometrage)}
                      {r.garage ? ` · ${r.garage}` : ''}
                    </p>
                    {r.notes && <p className="mt-1 text-xs italic text-slate-400">{r.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {r.cout != null && r.cout > 0 && (
                      <p className="text-sm font-semibold text-slate-900">{formatEuro(r.cout, true)}</p>
                    )}
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setEditing(r)
                          setFormOpen(true)
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {/* Formulaire */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        title={editing ? "Modifier l'entretien" : 'Ajouter un entretien'}
        wide
      >
        {data.vehicles.length === 0 ? (
          <p className="text-sm text-slate-600">
            Ajoutez d'abord un véhicule pour enregistrer des entretiens.
          </p>
        ) : (
          <RecordForm
            vehicles={data.vehicles}
            initial={editing ?? undefined}
            submitLabel={editing ? 'Enregistrer les modifications' : 'Enregistrer'}
            onSubmit={handleSubmit}
            onCancel={() => {
              setFormOpen(false)
              setEditing(null)
            }}
          />
        )}
      </Modal>

      {/* Confirmation suppression */}
      <Modal open={confirmDelete != null} onClose={() => setConfirmDelete(null)} title="Supprimer cet entretien ?">
        <p className="text-sm text-slate-600">
          L'entretien «&nbsp;
          <strong>{confirmDelete ? serviceLabel(confirmDelete.type, confirmDelete.libelle) : ''}</strong>
          &nbsp;» sera définitivement supprimé de l'historique.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDelete) removeRecord(confirmDelete.id)
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
