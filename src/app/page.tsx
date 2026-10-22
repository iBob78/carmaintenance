'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Car,
  Clock,
  FileText,
  Receipt,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useStore } from '@/lib/data/store'
import { nextDues } from '@/lib/domain/due'
import { computeExpenseTotals } from '@/lib/domain/totals'
import { SERVICE_CATEGORIES } from '@/lib/domain/catalog'
import { formatEuro, formatKm, formatDateShort, todayISO, addMonthsISO, classNames } from '@/lib/domain/format'
import { Badge, Card, EmptyState, Progress, SectionTitle } from '@/components/ui'
import type { DueUrgency } from '@/lib/domain/types'

const URGENCY_TONE: Record<DueUrgency, { badge: 'rose' | 'amber' | 'green' | 'slate'; dot: string; bar: 'rose' | 'amber' | 'green' | 'brand' }> = {
  retard: { badge: 'rose', dot: 'bg-rose-500', bar: 'rose' },
  urgent: { badge: 'rose', dot: 'bg-rose-500', bar: 'rose' },
  bientot: { badge: 'amber', dot: 'bg-amber-500', bar: 'amber' },
  ok: { badge: 'green', dot: 'bg-emerald-500', bar: 'green' },
}

const URGENCY_LABEL: Record<DueUrgency, string> = {
  retard: 'En retard',
  urgent: 'Urgent',
  bientot: 'Bientôt',
  ok: 'OK',
}

export default function DashboardPage() {
  const { db, ready } = useStore()

  if (!ready) {
    return <p className="text-sm text-slate-500">Chargement…</p>
  }

  const dues = nextDues(db, 6)
  const yearAgo = addMonthsISO(todayISO(), -12)
  const recentExpenses = db.expenses.filter((e) => e.date >= yearAgo)
  const totals = computeExpenseTotals(recentExpenses)
  const records12m = db.serviceRecords.filter((r) => r.date >= yearAgo && r.statut === 'effectue').length
  const openFaults = db.faults.filter((f) => f.statut !== 'resolu').length

  const stats = [
    { label: 'Véhicules suivis', value: String(db.vehicles.length), icon: Car, tone: 'text-brand-600 bg-brand-50' },
    { label: 'Interventions (12 mois)', value: String(records12m), icon: Wrench, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Défauts non résolus', value: String(openFaults), icon: AlertTriangle, tone: openFaults > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-100' },
    { label: 'Dépenses nettes (12 mois)', value: formatEuro(totals.net), icon: Receipt, tone: 'text-amber-600 bg-amber-50' },
  ]

  return (
    <div className="space-y-8">
      {/* Bandeau */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 px-6 py-8 text-white sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-brand-200">Carnet d&apos;entretien numérique</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              L&apos;historique complet de vos véhicules
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Entretiens, pannes, dépenses et justificatifs — et générez un{' '}
              <strong className="font-semibold text-white">rapport de vente PDF</strong> professionnel
              et transparent à remettre à un acheteur.
            </p>
          </div>
          <Link
            href="/vehicules"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-brand-50"
          >
            <Sparkles className="h-4 w-4" />
            Générer un rapport de vente
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <div className={classNames('flex h-9 w-9 items-center justify-center rounded-xl', s.tone)}>
                <s.icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Échéances */}
        <section className="lg:col-span-3">
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" />
              Prochaines échéances
            </span>
          </SectionTitle>
          {dues.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-6 w-6" />}
              title="Aucune échéance calculée"
              description="Ajoutez des interventions pour alimenter les calculs d'échéances."
            />
          ) : (
            <div className="space-y-3">
              {dues.map((due, i) => {
                const vehicle = db.vehicles.find((v) => v.id === due.vehicleId)
                const tone = URGENCY_TONE[due.urgency]
                return (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3.5 transition hover:border-slate-200 hover:shadow-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{due.libelle}</p>
                        {vehicle && <Badge tone="slate">{vehicle.marque} {vehicle.modele}</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {due.kmRemaining != null && `reste ${formatKm(Math.max(0, due.kmRemaining))}`}
                        {due.kmRemaining != null && due.daysRemaining != null && ' · '}
                        {due.daysRemaining != null && `reste ${Math.max(0, due.daysRemaining)} j`}
                        {due.dueKm != null && ` · échéance ${formatKm(due.dueKm)}`}
                        {due.dueDate != null && ` · ${formatDateShort(due.dueDate)}`}
                      </p>
                      {(due.kmRemaining != null || due.daysRemaining != null) && (
                        <div className="mt-2 max-w-md">
                          <Progress
                            value={
                              due.kmRemaining != null && due.kmRemaining > 0
                                ? 100 - Math.min(100, (due.kmRemaining / (due.dueKm ?? 1)) * 100)
                                : 100
                            }
                            tone={tone.bar}
                          />
                        </div>
                      )}
                    </div>
                    <Badge tone={tone.badge}>
                      <span className={classNames('h-1.5 w-1.5 rounded-full', tone.dot)} />
                      {URGENCY_LABEL[due.urgency]}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Véhicules */}
        <section className="lg:col-span-2">
          <SectionTitle
            action={
              <Link href="/vehicules" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                Tout voir
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            <span className="inline-flex items-center gap-2">
              <Car className="h-5 w-5 text-slate-400" />
              Mes véhicules
            </span>
          </SectionTitle>
          <div className="space-y-3">
            {db.vehicles.length === 0 && (
              <EmptyState icon={<Car className="h-6 w-6" />} title="Aucun véhicule" description="Ajoutez votre premier véhicule." />
            )}
            {db.vehicles.map((v) => {
              const records = db.serviceRecords.filter((r) => r.vehicleId === v.id)
              return (
                <Link key={v.id} href={`/vehicules/${v.id}`}>
                  <Card className="p-4 transition hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <Car className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">
                          {v.marque} {v.modele}
                        </p>
                        <p className="text-xs text-slate-500">
                          {v.annee} · {formatKm(v.kilometrageActuel)} · {records.length} intervention
                          {records.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      </div>

      {/* Dernières interventions */}
      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            Dernières interventions enregistrées
          </span>
        </SectionTitle>
        {db.serviceRecords.length === 0 ? (
          <EmptyState icon={<Wrench className="h-6 w-6" />} title="Historique vide" description="Enregistrez vos vidanges et révisions." />
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {db.serviceRecords
                .slice()
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .slice(0, 6)
                .map((r) => {
                  const vehicle = db.vehicles.find((v) => v.id === r.vehicleId)
                  return (
                    <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{r.titre}</p>
                        <p className="text-xs text-slate-500">
                          {vehicle ? `${vehicle.marque} ${vehicle.modele}` : ''} · {formatDateShort(r.date)} ·{' '}
                          {formatKm(r.kilometrage)} · {SERVICE_CATEGORIES[r.categorie].short}
                        </p>
                      </div>
                      <Badge tone={r.statut === 'effectue' ? 'green' : r.statut === 'prevu' ? 'brand' : 'slate'}>
                        {r.statut === 'effectue' ? 'Effectué' : r.statut === 'prevu' ? 'Prévu' : r.statut === 'annule' ? 'Annulé' : 'Non réalisé'}
                      </Badge>
                      {r.coutTotal != null && r.coutTotal > 0 && (
                        <p className="text-sm font-semibold text-slate-900">{formatEuro(r.coutTotal, true)}</p>
                      )}
                    </li>
                  )
                })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  )
}
