'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  FileText,
  Gauge,
  Pencil,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useStore } from '@/lib/data/store'
import {
  CARBURANT_LABELS,
  EXPENSE_CATEGORY_LABELS,
  FAULT_STATUS_LABELS,
  SERVICE_CATEGORIES,
  SERVICE_STATUS_LABELS,
  SOURCE_LABELS,
} from '@/lib/domain/catalog'
import { computeDue, duesForVehicle } from '@/lib/domain/due'
import { formatInterval, reminderForOperation, scheduleForVehicle } from '@/lib/domain/schedule'
import { computeExpenseTotals } from '@/lib/domain/totals'
import { detectAnomalies, missingVehicleFields } from '@/lib/domain/anomalies'
import { formatDateShort, formatEuro, formatKm, classNames } from '@/lib/domain/format'
import type { ExpenseEntry, FaultAndTest, ServiceRecord, Vehicle } from '@/lib/domain/types'
import { Badge, Button, Card, EmptyState, Modal, Progress, SectionTitle, Tabs } from '@/components/ui'
import {
  DocumentForm,
  ExpenseForm,
  FaultForm,
  ReadingForm,
  ReminderForm,
  ServiceRecordForm,
  type ServiceRecordFormValues,
} from '@/components/forms'
import { ScanPhotoButton, FactureReview } from '@/components/scan'
import { parseFacture, type FactureScan, type ServicePrefill } from '@/lib/ocr/facture'

const TABS = [
  { id: 'entretiens', label: 'Carnet d’entretien' },
  { id: 'pannes', label: 'Pannes & réparations' },
  { id: 'depenses', label: 'Dépenses' },
  { id: 'documents', label: 'Justificatifs' },
  { id: 'echeances', label: 'Échéances & relevés' },
]

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>()
  const vehicleId = params.id
  const store = useStore()
  const { db, ready } = store
  const [tab, setTab] = useState('entretiens')

  // Modales
  const [serviceModal, setServiceModal] = useState<{ open: boolean; editing?: ServiceRecord }>({ open: false })
  const [faultModal, setFaultModal] = useState<{ open: boolean; editing?: FaultAndTest }>({ open: false })
  const [expenseModal, setExpenseModal] = useState<{ open: boolean; editing?: ExpenseEntry }>({ open: false })
  const [documentModal, setDocumentModal] = useState(false)
  const [reminderModal, setReminderModal] = useState(false)
  const [readingModal, setReadingModal] = useState(false)
  const [factureScan, setFactureScan] = useState<FactureScan | null>(null)
  const [servicePrefill, setServicePrefill] = useState<{ values: ServicePrefill; token: number } | null>(null)
  const [confirm, setConfirm] = useState<{ kind: string; id: string; label: string } | null>(null)

  const vehicle = useMemo(
    () => db.vehicles.find((v) => v.id === vehicleId),
    [db.vehicles, vehicleId],
  )

  if (!ready) return <p className="text-sm text-slate-500">Chargement…</p>
  if (!vehicle) {
    return (
      <EmptyState
        icon={<Wrench className="h-6 w-6" />}
        title="Véhicule introuvable"
        description="Ce véhicule n'existe pas ou a été supprimé."
        action={
          <Link href="/vehicules">
            <Button variant="outline">Retour aux véhicules</Button>
          </Link>
        }
      />
    )
  }

  const records = db.serviceRecords
    .filter((r) => r.vehicleId === vehicleId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const faults = db.faults.filter((f) => f.vehicleId === vehicleId).sort((a, b) => (a.dateSignalement < b.dateSignalement ? 1 : -1))
  const expenses = db.expenses.filter((e) => e.vehicleId === vehicleId)
  const documents = db.documents.filter((d) => d.vehicleId === vehicleId)
  const readings = db.odometerReadings.filter((r) => r.vehicleId === vehicleId).sort((a, b) => (a.date < b.date ? 1 : -1))
  const reminders = db.reminders.filter((r) => r.vehicleId === vehicleId)
  const purchases = db.purchases.filter((p) => p.vehicleId === vehicleId)
  const totals = computeExpenseTotals(expenses)
  const dues = duesForVehicle(db, vehicleId)
  const anomalies = detectAnomalies(db, vehicleId)
  const missing = missingVehicleFields(vehicle)
  const plan = scheduleForVehicle(vehicle)

  return (
    <div className="space-y-6">
      {/* En-tête véhicule */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-brand-900 px-6 py-6 text-white sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-brand-200">
                Carnet d&apos;entretien
              </p>
              <h1 className="mt-1 text-2xl font-bold">
                {vehicle.marque} {vehicle.modele}
                {vehicle.finition ? ` — ${vehicle.finition}` : ''}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {vehicle.annee}
                {vehicle.motorisation ? ` · ${vehicle.motorisation}` : ''} · {CARBURANT_LABELS[vehicle.carburant]}
                {vehicle.immatriculation ? ` · ${vehicle.immatriculation}` : ''} · {formatKm(vehicle.kilometrageActuel)}
              </p>
            </div>
            <Link href={`/vehicules/${vehicleId}/rapport`}>
              <Button className="bg-white text-slate-900 hover:bg-brand-50">
                <Sparkles className="h-4 w-4" />
                Générer un rapport de vente
              </Button>
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-brand-100">Interventions</p>
              <p className="mt-1 text-xl font-bold">{records.length}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-brand-100">Dépenses nettes</p>
              <p className="mt-1 text-xl font-bold">{formatEuro(totals.net)}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-brand-100">Justificatifs</p>
              <p className="mt-1 text-xl font-bold">{documents.length}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-brand-100">Défauts non résolus</p>
              <p className="mt-1 text-xl font-bold">{faults.filter((f) => f.statut !== 'resolu').length}</p>
            </div>
          </div>
        </div>

        {/* Alerte anomalies / champs manquants */}
        {(anomalies.length > 0 || missing.length > 0) && (
          <div className="border-t border-amber-100 bg-amber-50 px-6 py-4 sm:px-8">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              Points d&apos;attention pour le rapport de vente
            </p>
            <ul className="mt-2 space-y-1 text-xs text-amber-800">
              {missing.map((m) => (
                <li key={m}>· Champ non renseigné : {m} (le rapport l&apos;indiquera comme absent).</li>
              ))}
              {anomalies.slice(0, 3).map((a) => (
                <li key={a.id}>· {a.message}</li>
              ))}
              {anomalies.length > 3 && <li>· … et {anomalies.length - 3} autre(s) anomalie(s).</li>}
            </ul>
          </div>
        )}
      </Card>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ---------------------------------------------------------------- */}
      {tab === 'entretiens' && (
        <section>
          <SectionTitle
            action={
              <Button
                onClick={() => {
                  setFactureScan(null)
                  setServicePrefill(null)
                  setServiceModal({ open: true })
                }}
              >
                <Plus className="h-4 w-4" />
                Ajouter une intervention
              </Button>
            }
          >
            <span className="inline-flex items-center gap-2">
              <Wrench className="h-5 w-5 text-slate-400" />
              Historique des interventions
            </span>
          </SectionTitle>
          {records.length === 0 ? (
            <EmptyState
              icon={<Wrench className="h-6 w-6" />}
              title="Aucune intervention enregistrée"
              description="Enregistrez vidanges, révisions et réparations pour constituer l'historique — matière première du rapport de vente."
              action={
                <Button
                  onClick={() => {
                    setFactureScan(null)
                    setServicePrefill(null)
                    setServiceModal({ open: true })
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une intervention
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {records.map((r) => {
                const items = db.serviceRecordItems.filter((i) => i.serviceRecordId === r.id)
                return (
                  <Card key={r.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{r.titre}</h3>
                          <Badge tone={r.statut === 'effectue' ? 'green' : r.statut === 'prevu' ? 'brand' : r.statut === 'annule' ? 'rose' : 'amber'}>
                            {SERVICE_STATUS_LABELS[r.statut]}
                          </Badge>
                          <Badge tone="slate">{SERVICE_CATEGORIES[r.categorie].short}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateShort(r.date)} · {formatKm(r.kilometrage)} ·{' '}
                          {r.realisateur === 'proprietaire' ? 'Propriétaire' : r.realisateur === 'garage' ? 'Garage' : 'Professionnel'}
                          {r.garage ? ` · ${r.garage}` : ''} · {SOURCE_LABELS[r.sourceInformation]}
                        </p>
                        {r.description && <p className="mt-2 text-sm text-slate-600">{r.description}</p>}
                        {r.notes && <p className="mt-1 text-xs italic text-slate-400">{r.notes}</p>}
                        {items.length > 0 && (
                          <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                            {items.map((it) => (
                              <li key={it.id}>
                                · {it.libelle}
                                {it.reference ? ` (${it.marque ? it.marque + ' ' : ''}${it.reference})` : ''} —{' '}
                                {it.quantite} × {it.prixTotal != null ? formatEuro(it.prixTotal, true) : '—'}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {r.coutTotal != null && <p className="text-sm font-semibold text-slate-900">{formatEuro(r.coutTotal, true)}</p>}
                        <button
                          onClick={() => setServiceModal({ open: true, editing: r })}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirm({ kind: 'service', id: r.id, label: r.titre })}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === 'pannes' && (
        <section>
          <SectionTitle
            action={
              <Button onClick={() => setFaultModal({ open: true })}>
                <Plus className="h-4 w-4" />
                Signaler une panne
              </Button>
            }
          >
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-slate-400" />
              Pannes, tests et réparations
            </span>
          </SectionTitle>
          {faults.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6" />}
              title="Aucune panne enregistrée"
              description="Symptômes, codes défaut, tests et pièces remplacées : documentez tout pour la transparence du rapport."
            />
          ) : (
            <div className="space-y-3">
              {faults.map((f) => (
                <Card key={f.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{f.symptomes}</h3>
                        <Badge tone={f.statut === 'resolu' ? 'green' : f.statut === 'resolution_non_confirmee' ? 'amber' : 'rose'}>
                          {FAULT_STATUS_LABELS[f.statut]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Signalé le {formatDateShort(f.dateSignalement)}
                        {f.dateResolution ? ` · Résolu le ${formatDateShort(f.dateResolution)}` : ''}
                      </p>
                      <dl className="mt-3 grid gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
                        {f.codesDefaut && <div><dt className="inline font-medium text-slate-700">Codes défaut : </dt><dd className="inline">{f.codesDefaut}</dd></div>}
                        {f.circonstances && <div><dt className="inline font-medium text-slate-700">Circonstances : </dt><dd className="inline">{f.circonstances}</dd></div>}
                        {f.hypothese && <div><dt className="inline font-medium text-slate-700">Hypothèses : </dt><dd className="inline">{f.hypothese}</dd></div>}
                        {f.testsRealises && <div><dt className="inline font-medium text-slate-700">Tests : </dt><dd className="inline">{f.testsRealises}</dd></div>}
                        {f.resultat && <div><dt className="inline font-medium text-slate-700">Résultat : </dt><dd className="inline">{f.resultat}</dd></div>}
                        {f.piecesRemplacees && <div><dt className="inline font-medium text-slate-700">Pièces remplacées : </dt><dd className="inline">{f.piecesRemplacees}</dd></div>}
                      </dl>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setFaultModal({ open: true, editing: f })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirm({ kind: 'fault', id: f.id, label: f.symptomes })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === 'depenses' && (
        <section>
          <SectionTitle
            action={
              <Button onClick={() => setExpenseModal({ open: true })}>
                <Plus className="h-4 w-4" />
                Ajouter une dépense
              </Button>
            }
          >
            <span className="inline-flex items-center gap-2">
              <Receipt className="h-5 w-5 text-slate-400" />
              Dépenses
            </span>
          </SectionTitle>

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-slate-500">Total brut</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatEuro(totals.brut, true)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Remboursements</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">{formatEuro(-totals.remboursements, true)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Total net</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatEuro(totals.net, true)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Nature inconnue</p>
              <p className={classNames('mt-1 text-xl font-bold', totals.inconnues > 0 ? 'text-amber-600' : 'text-slate-900')}>
                {formatEuro(totals.inconnues, true)}
              </p>
            </Card>
          </div>

          {expenses.length === 0 ? (
            <EmptyState icon={<Receipt className="h-6 w-6" />} title="Aucune dépense" description="Enregistrez achats de pièces, consommables et prestations." />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {expenses
                  .slice()
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {e.libelle}
                          {e.inconnu && <Badge tone="amber" className="ml-2">Nature inconnue</Badge>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateShort(e.date)} · {e.inconnu ? 'Non catégorisée' : EXPENSE_CATEGORY_LABELS[e.categorie]}
                          {e.link === 'service_record' ? ' · liée à une intervention' : e.link === 'purchase' ? ' · liée à un achat' : ''}
                          {e.remboursement ? ` · remboursé ${formatEuro(e.remboursement, true)}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatEuro(e.montant, true)}</p>
                      <button
                        onClick={() => setExpenseModal({ open: true, editing: e })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirm({ kind: 'expense', id: e.id, label: e.libelle })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
              </ul>
            </Card>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === 'documents' && (
        <section>
          <SectionTitle
            action={
              <Button onClick={() => setDocumentModal(true)}>
                <Plus className="h-4 w-4" />
                Ajouter un justificatif
              </Button>
            }
          >
            <span className="inline-flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              Index des justificatifs
            </span>
          </SectionTitle>
          {documents.length === 0 ? (
            <EmptyState icon={<FileText className="h-6 w-6" />} title="Aucun justificatif" description="Factures, photos et PV de contrôle rattachés aux interventions." />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <FileText className="h-4.5 w-4.5 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{d.filename}</p>
                      <p className="text-xs text-slate-500">
                        {d.id.slice(0, 12)} · {formatDateShort(d.dateDocument)} ·{' '}
                        {d.kind === 'facture' ? 'Facture' : d.kind === 'photo' ? 'Photo' : d.kind === 'pv_controle' ? 'PV de contrôle' : 'Autre'}
                        {d.serviceRecordId
                          ? ` · rattaché à « ${db.serviceRecords.find((r) => r.id === d.serviceRecordId)?.titre ?? '?'} »`
                          : ''}
                      </p>
                    </div>
                    <Badge tone={d.disponible ? 'green' : 'amber'}>
                      {d.disponible ? 'Fichier disponible' : 'Fichier non stocké (démo)'}
                    </Badge>
                    <button
                      onClick={() => setConfirm({ kind: 'document', id: d.id, label: d.filename })}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {tab === 'echeances' && (
        <section className="space-y-8">
          <div>
            <SectionTitle
              action={
                <Button onClick={() => setReminderModal(true)}>
                  <Plus className="h-4 w-4" />
                  Ajouter un rappel
                </Button>
              }
            >
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-slate-400" />
                Échéances calculées
              </span>
            </SectionTitle>
            <div className="space-y-3">
              {dues.map((d, i) => (
                <Card key={i} className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{d.libelle}</p>
                    <p className="text-xs text-slate-500">
                      {d.dueKm != null && `à ${formatKm(d.dueKm)}`}
                      {d.dueKm != null && d.dueDate != null && ' ou '}
                      {d.dueDate != null && formatDateShort(d.dueDate)}
                      {d.kmRemaining != null && ` · reste ${formatKm(Math.max(0, d.kmRemaining))}`}
                      {d.daysRemaining != null && ` · reste ${Math.max(0, d.daysRemaining)} j`}
                    </p>
                    {d.kmRemaining != null && d.dueKm != null && (
                      <div className="mt-2 max-w-md">
                        <Progress
                          value={100 - Math.min(100, (Math.max(0, d.kmRemaining) / Math.max(1, d.dueKm)) * 100)}
                          tone={d.urgency === 'retard' || d.urgency === 'urgent' ? 'rose' : d.urgency === 'bientot' ? 'amber' : 'green'}
                        />
                      </div>
                    )}
                  </div>
                  <Badge tone={d.urgency === 'retard' ? 'rose' : d.urgency === 'urgent' ? 'rose' : d.urgency === 'bientot' ? 'amber' : 'green'}>
                    {d.urgency === 'retard' ? 'En retard' : d.urgency === 'urgent' ? 'Urgent' : d.urgency === 'bientot' ? 'Bientôt' : 'OK'}
                  </Badge>
                </Card>
              ))}
            </div>

            {reminders.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Rappels personnels</h3>
                <div className="space-y-2">
                  {reminders.map((r) => (
                    <Card key={r.id} className="flex items-center gap-3 p-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{r.libelle}</p>
                        <p className="text-xs text-slate-500">
                          {r.seuilKm != null && `à ${formatKm(r.seuilKm)}`}
                          {r.seuilKm != null && r.dateCible != null && ' ou '}
                          {r.dateCible != null && formatDateShort(r.dateCible)}
                        </p>
                      </div>
                      <Badge tone={r.statut === 'en_retard' ? 'rose' : r.statut === 'fait' ? 'green' : 'slate'}>
                        {r.statut === 'a_faire' ? 'À faire' : r.statut === 'en_retard' ? 'En retard' : r.statut === 'fait' ? 'Fait' : 'Annulé'}
                      </Badge>
                      <button
                        onClick={() => setConfirm({ kind: 'reminder', id: r.id, label: r.libelle })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {plan && (
            <div>
              <SectionTitle>
                <span className="inline-flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-slate-400" />
                  Planning d’entretien — {plan.marques.join(' / ')} {plan.modeles[0]}
                </span>
              </SectionTitle>
              <p className="mb-3 text-xs text-slate-500">
                Périodités du constructeur pour cette motorisation
                {vehicle.motorisation ? ` (${vehicle.motorisation}` : ''}
                {vehicle.codeMoteur ? ` · ${vehicle.codeMoteur}` : ''}
                {vehicle.motorisation ? ')' : ''} — à vérifier sur votre carnet d’entretien.
              </p>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {plan.operations.map((op) => {
                    const due = computeDue(
                      vehicle,
                      {
                        categorie: op.categorie,
                        libelle: op.libelle,
                        intervalleKm: op.intervalleKm ?? null,
                        intervalleMois: op.intervalleMois ?? null,
                        actif: true,
                      },
                      records,
                    )
                    const rappelActif = reminders.find(
                      (r) => r.libelle === op.libelle && (r.statut === 'a_faire' || r.statut === 'en_retard'),
                    )
                    return (
                      <li key={op.libelle} className="flex flex-wrap items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">{op.libelle}</p>
                          <p className="text-xs text-slate-500">
                            {formatInterval(op)}
                            {due && (
                              <>
                                {' · prochain : '}
                                {due.dueKm != null ? formatKm(due.dueKm) : ''}
                                {due.dueKm != null && due.dueDate != null ? ' ou ' : ''}
                                {due.dueDate != null ? formatDateShort(due.dueDate) : ''}
                              </>
                            )}
                          </p>
                        </div>
                        {op.gravite === 'critique' && <Badge tone="rose">critique</Badge>}
                        {rappelActif ? (
                          <Button variant="outline" onClick={() => store.removeReminder(rappelActif.id)}>
                            Rappel actif — retirer
                          </Button>
                        ) : due ? (
                          <Button
                            variant="outline"
                            onClick={() => store.addReminder(reminderForOperation(vehicleId, op, due))}
                          >
                            Activer le rappel
                          </Button>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </Card>
              <p className="mt-2 text-xs text-slate-400">
                Sources :{' '}
                {plan.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 ? ' · ' : ''}
                    <a className="underline hover:text-slate-600" href={s.url} target="_blank" rel="noreferrer">
                      {s.label}
                    </a>
                  </span>
                ))}
              </p>
              {plan.notes && <p className="mt-1 text-xs text-amber-700">{plan.notes}</p>}
            </div>
          )}

          <div>
            <SectionTitle
              action={
                <Button variant="outline" onClick={() => setReadingModal(true)}>
                  <Plus className="h-4 w-4" />
                  Ajouter un relevé
                </Button>
              }
            >
              <span className="inline-flex items-center gap-2">
                <Gauge className="h-5 w-5 text-slate-400" />
                Relevés kilométriques
              </span>
            </SectionTitle>
            <Card className="overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {readings.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <p className="w-28 text-sm text-slate-600">{formatDateShort(r.date)}</p>
                    <p className="w-32 text-sm font-semibold text-slate-900">{formatKm(r.valeurKm)}</p>
                    <p className="flex-1 text-xs text-slate-500">{SOURCE_LABELS[r.sourceInformation]}</p>
                    {r.note && <p className="text-xs italic text-slate-400">{r.note}</p>}
                  </li>
                ))}
                {readings.length === 0 && (
                  <li className="px-5 py-4 text-sm text-slate-400">Aucun relevé kilométrique enregistré.</li>
                )}
              </ul>
            </Card>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Modales */}
      <Modal
        open={serviceModal.open}
        onClose={() => setServiceModal({ open: false })}
        title={serviceModal.editing ? 'Modifier l’intervention' : 'Ajouter une intervention'}
        wide
      >
        <div className="space-y-4">
          {!serviceModal.editing &&
            (factureScan ? (
              <FactureReview
                scan={factureScan}
                onIntegrate={(prefill) => {
                  setServicePrefill({ values: prefill, token: Date.now() })
                  setFactureScan(null)
                }}
                onCancel={() => setFactureScan(null)}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-3">
                <p className="mb-2 text-xs text-slate-600">
                  Photographiez la <strong>facture</strong> : date, garage, montant TTC, kilométrage et lignes de facture
                  sont proposés à votre validation. Traitement 100 % local.
                </p>
                <ScanPhotoButton
                  label="Scanner la facture (photo)"
                  onText={(r) => setFactureScan(parseFacture(r.text))}
                />
              </div>
            ))}
          <ServiceRecordForm
            vehicleId={vehicleId}
            initial={serviceModal.editing}
            initialItems={serviceModal.editing ? db.serviceRecordItems.filter((i) => i.serviceRecordId === serviceModal.editing!.id) : undefined}
            prefill={servicePrefill?.values}
            prefillToken={servicePrefill?.token}
            onSubmit={(v: ServiceRecordFormValues) => {
              if (serviceModal.editing) {
                store.updateServiceRecord({ ...serviceModal.editing, ...v.record }, v.items)
              } else {
                store.addServiceRecord({ ...v.record, vehicleId }, v.items)
              }
              setServiceModal({ open: false })
            }}
            onCancel={() => setServiceModal({ open: false })}
          />
        </div>
      </Modal>

      <Modal open={faultModal.open} onClose={() => setFaultModal({ open: false })} title={faultModal.editing ? 'Modifier la panne' : 'Signaler une panne'} wide>
        <FaultForm
          vehicleId={vehicleId}
          initial={faultModal.editing}
          onSubmit={(f) => {
            if (faultModal.editing) {
              store.updateFault({ ...faultModal.editing, ...f })
            } else {
              store.addFault({ ...f, vehicleId })
            }
            setFaultModal({ open: false })
          }}
          onCancel={() => setFaultModal({ open: false })}
        />
      </Modal>

      <Modal open={expenseModal.open} onClose={() => setExpenseModal({ open: false })} title={expenseModal.editing ? 'Modifier la dépense' : 'Ajouter une dépense'} wide>
        <ExpenseForm
          vehicleId={vehicleId}
          initial={expenseModal.editing}
          serviceRecordOptions={records}
          purchaseOptions={purchases}
          onSubmit={(e) => {
            if (expenseModal.editing) {
              store.updateExpense({ ...expenseModal.editing, ...e })
            } else {
              store.addExpense({ ...e, vehicleId })
            }
            setExpenseModal({ open: false })
          }}
          onCancel={() => setExpenseModal({ open: false })}
        />
      </Modal>

      <Modal open={documentModal} onClose={() => setDocumentModal(false)} title="Ajouter un justificatif" wide>
        <DocumentForm
          vehicleId={vehicleId}
          serviceRecordOptions={records}
          onSubmit={(d) => {
            store.addDocument({ ...d, vehicleId })
            setDocumentModal(false)
          }}
          onCancel={() => setDocumentModal(false)}
        />
      </Modal>

      <Modal open={reminderModal} onClose={() => setReminderModal(false)} title="Ajouter un rappel">
        <ReminderForm
          vehicleId={vehicleId}
          onSubmit={(r) => {
            store.addReminder({ ...r, vehicleId })
            setReminderModal(false)
          }}
          onCancel={() => setReminderModal(false)}
        />
      </Modal>

      <Modal open={readingModal} onClose={() => setReadingModal(false)} title="Ajouter un relevé kilométrique">
        <ReadingForm
          vehicleId={vehicleId}
          onSubmit={(r) => {
            store.addOdometerReading({ ...r, vehicleId })
            setReadingModal(false)
          }}
          onCancel={() => setReadingModal(false)}
        />
      </Modal>

      <Modal open={confirm != null} onClose={() => setConfirm(null)} title="Confirmer la suppression">
        <p className="text-sm text-slate-600">
          «&nbsp;<strong>{confirm?.label}</strong>&nbsp;» sera définitivement supprimé.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm) {
                if (confirm.kind === 'service') store.removeServiceRecord(confirm.id)
                if (confirm.kind === 'fault') store.removeFault(confirm.id)
                if (confirm.kind === 'expense') store.removeExpense(confirm.id)
                if (confirm.kind === 'document') store.removeDocument(confirm.id)
                if (confirm.kind === 'reminder') store.removeReminder(confirm.id)
              }
              setConfirm(null)
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
