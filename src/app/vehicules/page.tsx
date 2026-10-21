'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Car, FileText, Gauge, Pencil, Plus, Sparkles, Trash2, Wrench } from 'lucide-react'
import { useStore } from '@/lib/data/store'
import type { Vehicle } from '@/lib/domain/types'
import { CARBURANT_LABELS } from '@/lib/domain/catalog'
import { formatEuro, formatKm } from '@/lib/domain/format'
import { computeExpenseTotals } from '@/lib/domain/totals'
import { Badge, Button, Card, EmptyState, Modal, SectionTitle } from '@/components/ui'
import { VehicleForm, type VehicleFormValues } from '@/components/forms'

export default function VehiclesPage() {
  const { db, ready, addVehicle, updateVehicle, removeVehicle } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Vehicle | null>(null)

  if (!ready) return <p className="text-sm text-slate-500">Chargement…</p>

  const handleSubmit = (values: VehicleFormValues) => {
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mes véhicules</h1>
          <p className="mt-1 text-sm text-slate-500">
            Plusieurs véhicules par compte : identification complète, historique et rapport de vente.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Ajouter un véhicule
        </Button>
      </div>

      {db.vehicles.length === 0 ? (
        <EmptyState
          icon={<Car className="h-6 w-6" />}
          title="Aucun véhicule pour l'instant"
          description="Ajoutez votre voiture pour démarrer le carnet d'entretien et le rapport de vente."
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
          {db.vehicles.map((v) => {
            const records = db.serviceRecords.filter((r) => r.vehicleId === v.id)
            const expenses = computeExpenseTotals(db.expenses.filter((e) => e.vehicleId === v.id))
            const faultsOpen = db.faults.filter((f) => f.vehicleId === v.id && f.statut !== 'resolu').length
            return (
              <Card key={v.id} className="overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 to-brand-700" />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                        <Car className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {v.marque} {v.modele}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {v.annee}
                          {v.finition ? ` · ${v.finition}` : ''} · {CARBURANT_LABELS[v.carburant]}
                          {v.immatriculation ? ` · ${v.immatriculation}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditing(v)
                          setFormOpen(true)
                        }}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(v)}
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
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatKm(v.kilometrageActuel)}</p>
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
                        <FileText className="h-3.5 w-3.5" />
                        Dépenses
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatEuro(expenses.net)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {faultsOpen > 0 && <Badge tone="rose">{faultsOpen} défaut{faultsOpen > 1 ? 's' : ''} non résolu{faultsOpen > 1 ? 's' : ''}</Badge>}
                    {v.vin && <Badge tone="slate">VIN enregistré</Badge>}
                    <Badge tone="slate">{db.documents.filter((d) => d.vehicleId === v.id).length} justificatif(s)</Badge>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <Link href={`/vehicules/${v.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Ouvrir le carnet
                      </Button>
                    </Link>
                    <Link href={`/vehicules/${v.id}/rapport`} className="flex-1">
                      <Button className="w-full">
                        <Sparkles className="h-4 w-4" />
                        Rapport de vente
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
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
          initial={editing ? { ...editing } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      </Modal>

      {/* Confirmation suppression */}
      <Modal open={confirmDelete != null} onClose={() => setConfirmDelete(null)} title="Supprimer ce véhicule ?">
        <p className="text-sm text-slate-600">
          Cette action supprimera définitivement{' '}
          <strong>
            {confirmDelete ? `${confirmDelete.marque} ${confirmDelete.modele}` : ''}
          </strong>{' '}
          ainsi que tous ses entretiens, pannes, dépenses et justificatifs. Cette opération est
          irréversible.
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
