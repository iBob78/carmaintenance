import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Car,
  Clock,
  Plus,
  Receipt,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import { useStore } from '../store'
import {
  avgKmPerMonth,
  describeDue,
  duesForVehicle,
  formatDueTitle,
  nextDues,
  serviceLabel,
  totalCost,
  vehicleLabel,
} from '../lib/maintenance'
import { Badge, Card, EmptyState, Progress, SectionTitle } from './ui'
import { ServiceIcon } from './ServiceIcon'
import { formatEuro, formatDateShort, formatKm, addMonthsISO, todayISO, formatDate } from '../lib/utils'
import type { Due } from '../types'

const URGENCY_TONE = {
  urgent: { badge: 'rose' as const, dot: 'bg-rose-500', text: 'text-rose-700', bar: 'rose' as const },
  soon: { badge: 'amber' as const, dot: 'bg-amber-500', text: 'text-amber-700', bar: 'amber' as const },
  ok: { badge: 'green' as const, dot: 'bg-emerald-500', text: 'text-emerald-700', bar: 'green' as const },
}

function DueRow({ due, showVehicle }: { due: Due; showVehicle: boolean }) {
  const { data } = useStore()
  const vehicle = data.vehicles.find((v) => v.id === due.vehicleId)
  const tone = URGENCY_TONE[due.urgency]
  const progress =
    due.dueKm != null && vehicle && due.lastRecord
      ? ((vehicle.kilometrage - due.lastRecord.kilometrage) /
          Math.max(1, due.dueKm - due.lastRecord.kilometrage)) *
        100
      : due.dueKm != null && vehicle
        ? (vehicle.kilometrage / Math.max(1, due.dueKm)) * 100
        : null

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3.5 transition hover:border-slate-200 hover:shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 ${tone.text}`}>
        <ServiceIcon type={due.type} className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-semibold text-slate-900">{formatDueTitle(due)}</p>
          {showVehicle && vehicle && (
            <Badge tone="slate">{vehicleLabel(vehicle)}</Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {describeDue(due)}
          {due.projectedDate && due.kmRemaining !== null && due.kmRemaining > 0 && (
            <> · estimé {formatDateShort(due.projectedDate)}</>
          )}
        </p>
        {progress !== null && (
          <div className="mt-2 max-w-md">
            <Progress value={progress} tone={tone.bar} />
          </div>
        )}
      </div>
      <Badge tone={tone.badge}>
        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
        {due.urgency === 'urgent' ? 'Urgent' : due.urgency === 'soon' ? 'Bientôt' : 'OK'}
      </Badge>
    </div>
  )
}

export function Dashboard({ onNavigate, onAddRecord }: { onNavigate: (tab: string) => void; onAddRecord: () => void }) {
  const { data } = useStore()
  const { vehicles, records } = data

  const dues = nextDues(data, 6)
  const yearAgo = addMonthsISO(todayISO(), -12)
  const cost12m = totalCost(records, yearAgo)
  const records12m = records.filter((r) => r.date >= yearAgo).length
  const overdueCount = vehicles
    .flatMap((v) => duesForVehicle(v, data))
    .filter((d) => (d.kmRemaining !== null && d.kmRemaining <= 0) || (d.daysRemaining !== null && d.daysRemaining <= 0)).length

  const recent = records.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5)

  const stats = [
    {
      label: 'Véhicules suivis',
      value: String(vehicles.length),
      icon: Car,
      tone: 'text-brand-600 bg-brand-50',
    },
    {
      label: 'Échéances à surveiller',
      value: String(overdueCount),
      icon: AlertTriangle,
      tone: overdueCount > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-100',
    },
    {
      label: 'Entretiens (12 mois)',
      value: String(records12m),
      icon: Wrench,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Dépenses (12 mois)',
      value: formatEuro(cost12m),
      icon: Receipt,
      tone: 'text-amber-600 bg-amber-50',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Bandeau de bienvenue */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 px-6 py-7 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-brand-200">
              {formatDate(todayISO())}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Votre carnet d'entretien à jour
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Suivez vos vidanges, anticipez vos prochaines révisions et gardez le contrôle du budget d'entretien de vos véhicules.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onAddRecord}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-brand-50"
            >
              <Plus className="h-4 w-4" />
              Ajouter un entretien
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.tone}`}>
                <s.icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Prochaines échéances */}
        <section className="lg:col-span-3">
          <SectionTitle
            action={
              <button
                onClick={() => onNavigate('calendrier')}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Calendrier complet
                <ArrowRight className="h-4 w-4" />
              </button>
            }
          >
            <span className="inline-flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" />
              Prochaines échéances
            </span>
          </SectionTitle>
          {dues.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="Aucune échéance planifiée"
              description="Ajoutez un véhicule et enregistrez un premier entretien pour voir apparaître vos prochaines échéances."
            />
          ) : (
            <div className="space-y-3">
              {dues.map((due) => (
                <DueRow
                  key={`${due.vehicleId}-${due.type}`}
                  due={due}
                  showVehicle={vehicles.length > 1}
                />
              ))}
            </div>
          )}
        </section>

        {/* Véhicules */}
        <section className="lg:col-span-2">
          <SectionTitle
            action={
              <button
                onClick={() => onNavigate('vehicules')}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Tout voir
                <ArrowRight className="h-4 w-4" />
              </button>
            }
          >
            <span className="inline-flex items-center gap-2">
              <Car className="h-5 w-5 text-slate-400" />
              Mes véhicules
            </span>
          </SectionTitle>
          <div className="space-y-3">
            {vehicles.length === 0 && (
              <EmptyState
                icon={<Car className="h-6 w-6" />}
                title="Aucun véhicule"
                description="Ajoutez votre premier véhicule pour démarrer le suivi."
              />
            )}
            {vehicles.map((v) => {
              const vDues = duesForVehicle(v, data)
              const next = vDues[0]
              const rate = avgKmPerMonth(v, records)
              return (
                <Card key={v.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: v.couleur }}
                    >
                      <Car className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{vehicleLabel(v)}</p>
                      <p className="text-xs text-slate-500">
                        {v.marque} {v.modele} · {v.annee}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-900">
                          <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                          {formatKm(v.kilometrage)}
                        </span>
                        <span className="text-slate-400">≈ {formatKm(rate)}/mois</span>
                      </div>
                      {next && (
                        <div className="mt-2.5">
                          <p className="text-xs text-slate-500">
                            Prochaine : <span className="font-medium text-slate-700">{formatDueTitle(next)}</span>{' '}
                            — {describeDue(next)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      </div>

      {/* Derniers entretiens */}
      <section>
        <SectionTitle
          action={
            <button
              onClick={() => onNavigate('entretiens')}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Historique complet
              <ArrowRight className="h-4 w-4" />
            </button>
          }
        >
          <span className="inline-flex items-center gap-2">
            <Wrench className="h-5 w-5 text-slate-400" />
            Derniers entretiens enregistrés
          </span>
        </SectionTitle>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-6 w-6" />}
            title="Historique vide"
            description="Enregistrez vos vidanges et révisions pour constituer l'historique de votre véhicule."
            action={
              <button
                onClick={onAddRecord}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                Ajouter un entretien
              </button>
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {recent.map((r) => {
                const vehicle = vehicles.find((v) => v.id === r.vehicleId)
                return (
                  <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                      <ServiceIcon type={r.type} className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {serviceLabel(r.type, r.libelle)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {vehicle ? vehicleLabel(vehicle) : '—'} · {formatDateShort(r.date)} · {formatKm(r.kilometrage)}
                        {r.garage ? ` · ${r.garage}` : ''}
                      </p>
                    </div>
                    {r.cout != null && r.cout > 0 && (
                      <p className="text-sm font-semibold text-slate-900">{formatEuro(r.cout, true)}</p>
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
