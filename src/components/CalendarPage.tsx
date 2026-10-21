import { useMemo, useState } from 'react'
import { CalendarDays, CalendarRange, Gauge, Info, MapPin, Plus, Timer } from 'lucide-react'
import { useStore } from '../store'
import {
  SERVICE_CATALOG,
  SERVICE_TYPES,
  buildCalendar,
  describeDue,
  duesForVehicle,
  formatDueTitle,
  relativeDate,
  vehicleLabel,
  type CalendarEvent,
} from '../lib/maintenance'
import { Badge, Button, Card, EmptyState, Modal, SectionTitle, Select } from './ui'
import { ServiceIcon } from './ServiceIcon'
import { RecordForm } from './RecordForm'
import {
  formatDateShort,
  formatKm,
  formatMonthYear,
  parseISO,
  todayISO,
} from '../lib/utils'

const HORIZONS = [
  { value: 6, label: '6 mois' },
  { value: 12, label: '12 mois' },
  { value: 24, label: '24 mois' },
]

export function CalendarPage() {
  const { data, addRecord } = useStore()
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [horizon, setHorizon] = useState(12)
  const [quickRecord, setQuickRecord] = useState<CalendarEvent | null>(null)

  const events = useMemo(() => {
    const all = buildCalendar(data, horizon)
    return vehicleFilter ? all.filter((e) => e.vehicle.id === vehicleFilter) : all
  }, [data, horizon, vehicleFilter])

  const withinHorizon = useMemo(() => {
    const today = new Date(todayISO())
    return events.filter((e) => {
      const d = parseISO(e.date)
      return d <= new Date(today.getFullYear(), today.getMonth() + horizon, today.getDate())
    })
  }, [events, horizon])

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of withinHorizon) {
      const key = e.date.slice(0, 7) // yyyy-mm
      const list = map.get(key) ?? []
      list.push(e)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [withinHorizon])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Calendrier de révisions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Échéancier prévisionnel de vos révisions périodiques, calculé depuis votre historique et votre rythme de conduite.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="w-auto">
            <option value="">Tous les véhicules</option>
            {data.vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {vehicleLabel(v)}
              </option>
            ))}
          </Select>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {HORIZONS.map((h) => (
              <button
                key={h.value}
                onClick={() => setHorizon(h.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  horizon === h.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Légende */}
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Déjà dépassé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Dans les 3 mois
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Plus tard
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-slate-400" /> Déclenché par le kilométrage (date estimée)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Timer className="h-3.5 w-3.5 text-slate-400" /> Déclenché par la date
        </span>
      </Card>

      {/* Agenda groupé par mois */}
      {grouped.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="Aucune révision prévue sur la période"
          description="Vérifiez vos intervalles d'entretien ou enregistrez de nouveaux relevés pour affiner les estimations."
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(([monthKey, items]) => (
            <section key={monthKey}>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <CalendarRange className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {formatMonthYear(`${monthKey}-01`)}
                </h2>
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-sm text-slate-400">
                  {items.length} intervention{items.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {items.map((event) => (
                  <AgendaRow
                    key={`${event.vehicle.id}-${event.due.type}`}
                    event={event}
                    showVehicle={!vehicleFilter || data.vehicles.length > 1}
                    onQuickRecord={() => setQuickRecord(event)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Plan de révision périodique (intervalles) */}
      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <Info className="h-5 w-5 text-slate-400" />
            Plan de révision périodique
          </span>
        </SectionTitle>
        {data.vehicles.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="Aucun véhicule"
            description="Ajoutez un véhicule pour consulter son plan de révision."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {data.vehicles
              .filter((v) => !vehicleFilter || v.id === vehicleFilter)
              .map((v) => (
                <RevisionPlanCard key={v.id} vehicleId={v.id} />
              ))}
          </div>
        )}
      </section>

      {/* Saisie rapide à partir d'un événement */}
      <Modal
        open={quickRecord != null}
        onClose={() => setQuickRecord(null)}
        title={
          quickRecord
            ? `Enregistrer : ${formatDueTitle(quickRecord.due)} — ${vehicleLabel(quickRecord.vehicle)}`
            : ''
        }
        wide
      >
        {quickRecord && (
          <RecordForm
            vehicles={data.vehicles}
            defaultVehicleId={quickRecord.vehicle.id}
            defaultType={quickRecord.due.type}
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
              setQuickRecord(null)
            }}
            onCancel={() => setQuickRecord(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function AgendaRow({
  event,
  showVehicle,
  onQuickRecord,
}: {
  event: CalendarEvent
  showVehicle: boolean
  onQuickRecord: () => void
}) {
  const { due, vehicle, date, source } = event
  const today = todayISO()
  const overdue = due.kmRemaining !== null && due.kmRemaining <= 0
  const days = Math.round((parseISO(date).getTime() - parseISO(today).getTime()) / 86_400_000)
  const within3Months = days <= 90

  const dotColor = overdue
    ? 'bg-rose-500 ring-rose-100'
    : within3Months
      ? 'bg-amber-500 ring-amber-100'
      : 'bg-emerald-500 ring-emerald-100'

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col items-center gap-1.5">
        <span className={`h-3 w-3 rounded-full ring-4 ${dotColor}`} />
        <div className="text-center">
          <p className="text-sm font-bold text-slate-900">{parseISO(date).getDate()}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            {parseISO(date).toLocaleDateString('fr-FR', { month: 'short' })}
          </p>
        </div>
      </div>

      <div className="h-12 w-px bg-slate-100" />

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
        <ServiceIcon type={due.type} className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{formatDueTitle(due)}</p>
          {showVehicle && <Badge tone="slate">{vehicleLabel(vehicle)}</Badge>}
          <Badge tone={overdue ? 'rose' : within3Months ? 'amber' : 'green'}>
            {overdue ? 'En retard' : relativeDate(date)}
          </Badge>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            {source.includes('km') ? (
              <Gauge className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <Timer className="h-3.5 w-3.5 text-slate-400" />
            )}
            {source === 'km+date'
              ? 'Kilométrage + date'
              : source === 'km'
                ? 'Selon le kilométrage'
                : 'Selon la date'}
          </span>
          <span>· {formatDateShort(date)}</span>
          <span>· {describeDue(due)}</span>
          {due.lastRecord?.garage && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-300" />
              {due.lastRecord.garage}
            </span>
          )}
        </p>
      </div>

      <Button variant="outline" className="hidden sm:inline-flex" onClick={onQuickRecord}>
        <Plus className="h-4 w-4" />
        Enregistrer
      </Button>
    </div>
  )
}

function RevisionPlanCard({ vehicleId }: { vehicleId: string }) {
  const { data, updateInterval } = useStore()
  const vehicle = data.vehicles.find((v) => v.id === vehicleId)
  if (!vehicle) return null

  const dues = duesForVehicle(vehicle, data)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: vehicle.couleur }}
        >
          <CalendarDays className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{vehicleLabel(vehicle)}</p>
          <p className="text-xs text-slate-500">
            Intervalles de révision · {formatKm(vehicle.kilometrage)} au compteur
          </p>
        </div>
      </div>

      <ul className="divide-y divide-slate-50">
        {SERVICE_TYPES.map((type) => {
          const interval = data.intervals.find((i) => i.vehicleId === vehicleId && i.type === type)
          const due = dues.find((d) => d.type === type)
          const meta = SERVICE_CATALOG[type]
          return (
            <li key={type} className="flex items-center gap-3 px-5 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <ServiceIcon type={type} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{meta.short}</p>
                <p className="text-xs text-slate-400">
                  {interval?.actif === false
                    ? 'Désactivé'
                    : [
                        interval?.intervalleKm ? formatKm(interval.intervalleKm) : null,
                        interval?.intervalleMois ? `tous les ${interval.intervalleMois} mois` : null,
                      ]
                        .filter(Boolean)
                        .join(' ou ') || '—'}
                </p>
              </div>
              {interval && (
                <label className="flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={interval.actif}
                    onChange={(e) => updateInterval({ ...interval, actif: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </label>
              )}
              <div className="w-24 text-right">
                {interval?.actif && due ? (
                  <Badge
                    tone={
                      due.urgency === 'urgent' ? 'rose' : due.urgency === 'soon' ? 'amber' : 'green'
                    }
                  >
                    {due.kmRemaining != null
                      ? due.kmRemaining > 0
                        ? `+${formatKm(due.kmRemaining)}`
                        : 'dépassé'
                      : due.daysRemaining != null
                        ? due.daysRemaining > 0
                          ? `${due.daysRemaining} j`
                          : 'dépassé'
                        : '—'}
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
