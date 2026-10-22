'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  CalendarClock,
  Car,
  Check,
  CheckCircle2,
  FileText,
  Gauge,
  Info,
  Receipt,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import {
  buildVehicleSynthese,
  echeanceTexte,
  releveJustifie,
  type SyntheseDepensePart,
} from '@/lib/domain/synthese'
import { CARBURANT_LABELS, SERVICE_STATUS_LABELS, SOURCE_LABELS } from '@/lib/domain/catalog'
import { formatEuro, formatDateShort, formatKm, classNames } from '@/lib/domain/format'
import type { AppDatabase, ServiceRecord, Vehicle } from '@/lib/domain/types'

// ---------------------------------------------------------------------------
// Brique de mise en page : carte à en-tête numéroté (style « rapport »)
// ---------------------------------------------------------------------------

function SyntheseCard({
  numero,
  titre,
  icon,
  children,
  className,
}: {
  numero: number
  titre: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={classNames('overflow-hidden p-0', className)}>
      <div className="flex items-center gap-3 bg-slate-800 px-4 py-3 text-white dark:bg-[#334155]">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-sm font-bold text-slate-800">
          {numero}
        </span>
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {icon}
          {titre}
        </h2>
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Donut des dépenses (SVG pur, aucune dépendance)
// ---------------------------------------------------------------------------

const DONUT_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#94a3b8', '#06b6d4', '#e11d48', '#eab308']

function DonutDepenses({ parts, total }: { parts: SyntheseDepensePart[]; total: number }) {
  const R = 52
  const C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="relative h-44 w-44 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full">
        <circle cx="70" cy="70" r={R} fill="none" stroke="currentColor" strokeWidth="20" className="text-slate-100" />
        {total > 0 &&
          parts.map((p, i) => {
            const frac = p.montant / total
            const el = (
              <circle
                key={p.cle}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth="20"
                strokeDasharray={`${Math.max(frac * C - 1.5, 0.5)} ${C}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              />
            )
            offset += frac * C
            return el
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">Total dépensé</p>
        <p className="mt-0.5 text-lg font-bold text-slate-900">{formatEuro(total)}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rangée « intervention » (bloc 3)
// ---------------------------------------------------------------------------

function InterventionRow({ r }: { r: ServiceRecord }) {
  const tone = r.statut === 'effectue' ? 'green' : r.statut === 'prevu' ? 'amber' : r.statut === 'non_realise' ? 'rose' : 'slate'
  const dot = r.statut === 'effectue' ? 'bg-emerald-500' : r.statut === 'prevu' ? 'bg-amber-500' : 'bg-slate-400'
  return (
    <li className="flex gap-3 py-3">
      <span className={classNames('mt-0.5 h-7 w-7 shrink-0 rounded-full', dot)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-slate-900">{r.titre}</p>
          <div className="flex items-center gap-2">
            <Badge tone={tone}>{SERVICE_STATUS_LABELS[r.statut]}</Badge>
            {r.coutTotal != null && (
              <p className="text-sm font-semibold text-slate-900">{formatEuro(r.coutTotal, true)}</p>
            )}
          </div>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          {formatDateShort(r.date)} · {formatKm(r.kilometrage)}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {r.categorie}
          {r.garage ? ` · ${r.garage}` : ''}
        </p>
        {r.description && <p className="mt-1 text-xs text-slate-500">{r.description}</p>}
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Synthèse complète
// ---------------------------------------------------------------------------

export function VehicleSynthese({ vehicle, db }: { vehicle: Vehicle; db: AppDatabase }) {
  const s = buildVehicleSynthese(db, vehicle)

  const chips: Array<{ icon: React.ReactNode; valeur: string; legende: string }> = [
    {
      icon: <CalendarClock className="h-4 w-4" />,
      valeur: String(vehicle.annee),
      legende: vehicle.premiereImmatriculation
        ? `1ère immat. ${formatDateShort(vehicle.premiereImmatriculation)}`
        : 'Année',
    },
    {
      icon: <Car className="h-4 w-4" />,
      valeur: vehicle.motorisation ?? '—',
      legende: CARBURANT_LABELS[vehicle.carburant] ?? 'Carburant',
    },
    {
      icon: <Wrench className="h-4 w-4" />,
      valeur: vehicle.transmission ? (vehicle.transmission === 'manuelle' ? 'Manuelle' : vehicle.transmission === 'automatique' ? 'Automatique' : 'Semi-automatique') : '—',
      legende: 'Transmission',
    },
    {
      icon: <FileText className="h-4 w-4" />,
      valeur: vehicle.immatriculation ?? '—',
      legende: formatKm(vehicle.kilometrageActuel),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Bandeau d'en-tête */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-brand-900 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-6 sm:px-8">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-200">
              Synthèse d&apos;entretien
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {vehicle.marque} {vehicle.modele}
              {vehicle.finition ? ` – ${vehicle.finition}` : ''}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Historique de maintenance et d&apos;interventions
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden h-20 w-20 items-center justify-center rounded-2xl bg-white/10 sm:flex">
              <Car className="h-10 w-10 text-white/80" />
            </div>
            <Link href={`/vehicules/${vehicle.id}/rapport`}>
              <Button className="bg-white text-slate-900 hover:bg-brand-50">
                <Sparkles className="h-4 w-4" />
                Rapport de vente
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 px-6 pb-6 sm:grid-cols-4 sm:px-8">
          {chips.map((c) => (
            <div key={c.legende} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
              <span className="text-brand-100">{c.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.valeur}</p>
                <p className="truncate text-xs text-brand-100">{c.legende}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cartes numérotées */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* 1 — Identification */}
        <SyntheseCard numero={1} titre="Identification du véhicule" icon={<Car className="h-4 w-4" />}>
          <dl className="space-y-1.5">
            {s.identification.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-1.5 last:border-0">
                <dt className="text-xs text-slate-500">{row.label}</dt>
                <dd className="text-right text-sm font-medium text-slate-900">
                  {row.valeur ?? <span className="font-normal italic text-slate-400">Non renseigné</span>}
                </dd>
              </div>
            ))}
          </dl>
        </SyntheseCard>

        {/* 2 — Kilométrage */}
        <SyntheseCard numero={2} titre="Kilométrage" icon={<Gauge className="h-4 w-4" />}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Relevés connus</p>
          {s.relevés.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">Aucun relevé kilométrique enregistré.</p>
          ) : (
            <>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-400">
                      <th className="py-1.5 pr-3 font-medium">Date</th>
                      <th className="py-1.5 pr-3 font-medium">Kilométrage</th>
                      <th className="py-1.5 pr-3 font-medium">Source</th>
                      <th className="py-1.5 font-medium">Justificatif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.relevés.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 text-sm last:border-0">
                        <td className="py-1.5 pr-3 whitespace-nowrap text-slate-600">{formatDateShort(r.date)}</td>
                        <td className="py-1.5 pr-3 whitespace-nowrap font-semibold text-slate-900">{formatKm(r.valeurKm)}</td>
                        <td className="py-1.5 pr-3 text-xs text-slate-500">{SOURCE_LABELS[r.sourceInformation]}</td>
                        <td className="py-1.5">
                          {releveJustifie(r) ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {s.plage && (
                <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-sky-50 px-3.5 py-2.5">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <p className="text-xs text-sky-900">
                    <span className="font-semibold">Plage reconstituée par les données</span>
                    <br />
                    {formatKm(s.plage.min)} → {formatKm(s.plage.max)}
                    <span className="text-sky-700"> (données datées)</span>
                  </p>
                </div>
              )}
            </>
          )}
        </SyntheseCard>

        {/* 3 — Historique des interventions */}
        <SyntheseCard
          numero={3}
          titre="Historique des interventions"
          icon={<Wrench className="h-4 w-4" />}
          className="md:col-span-2 xl:col-span-1"
        >
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{s.interventions.total}</span> intervention(s)
            enregistrée(s)
          </p>
          {s.interventions.recentes.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">Aucune intervention enregistrée.</p>
          ) : (
            <>
              <ul className="mt-1 divide-y divide-slate-100">
                {s.interventions.recentes.map((r) => (
                  <InterventionRow key={r.id} r={r} />
                ))}
              </ul>
              {s.interventions.total > s.interventions.recentes.length && (
                <p className="mt-2 text-xs text-slate-400">
                  … l&apos;historique complet figure dans l&apos;onglet « Carnet d&apos;entretien ».
                </p>
              )}
            </>
          )}
        </SyntheseCard>

        {/* 4 — Pannes et réparations */}
        <SyntheseCard numero={4} titre="Pannes et réparations" icon={<AlertTriangle className="h-4 w-4" />}>
          {s.pannes.ouvertes.length === 0 ? (
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Aucune panne enregistrée</p>
                <p className="mt-0.5 text-xs text-emerald-800">
                  Les données disponibles ne font état d&apos;aucune panne sur la période couverte
                  {s.pannes.resolues > 0
                    ? ` (${s.pannes.resolues} historique(s) résolu(s)).`
                    : '.'}
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {s.pannes.ouvertes.map((f) => (
                <li key={f.id} className="flex items-start justify-between gap-3 rounded-xl bg-rose-50 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-rose-900">{f.symptomes}</p>
                    <p className="mt-0.5 text-xs text-rose-700">
                      Signalé le {f.date} · {f.statut}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {s.prochaines.length > 0 && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-sky-50 px-3.5 py-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <p className="text-xs text-sky-900">
                <span className="font-semibold">À noter</span>
                <br />
                {s.prochaines[0].libelle} est à prévoir ({echeanceTexte(s.prochaines[0])}).
              </p>
            </div>
          )}
        </SyntheseCard>

        {/* 5 — Dépenses */}
        <SyntheseCard numero={5} titre="Dépenses" icon={<Receipt className="h-4 w-4" />}>
          {s.depenses.total <= 0 ? (
            <p className="text-sm text-slate-400">Aucune dépense enregistrée.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-center gap-6">
                <DonutDepenses parts={s.depenses.parts} total={s.depenses.total} />
                <ul className="min-w-40 flex-1 space-y-1.5">
                  {s.depenses.parts.map((p, i) => (
                    <li key={p.cle} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        {p.label}
                      </span>
                      <span className="whitespace-nowrap text-slate-900">
                        {formatEuro(p.montant)} <span className="text-xs text-slate-400">({p.part} %)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 rounded-xl border border-slate-100">
                <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Détail par poste
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {s.depenses.parts.map((p) => (
                      <tr key={p.cle} className="border-b border-slate-50 last:border-0">
                        <td className="px-3 py-1.5 text-slate-600">{p.label}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-slate-900">{formatEuro(p.montant)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="px-3 py-2 font-semibold text-slate-900">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{formatEuro(s.depenses.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SyntheseCard>

        {/* 6 — Travaux à prévoir */}
        <SyntheseCard numero={6} titre="Travaux à prévoir" icon={<CalendarClock className="h-4 w-4" />}>
          <div className="rounded-xl bg-amber-50 px-3.5 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <CalendarClock className="h-4 w-4" />
              Prochaines échéances
            </p>
            {s.prochaines.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-800">
                Aucune échéance calculée à partir des données enregistrées.
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {s.prochaines.map((d, i) => (
                  <li key={`${d.categorie}-${i}`} className="text-xs text-amber-900">
                    · <span className="font-medium">{d.libelle}</span>
                    <br />
                    <span className="text-amber-800">{echeanceTexte(d)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-amber-800">
              Autres travaux : à prévoir selon les données actuelles —{' '}
              <Link href={`/vehicules/${vehicle.id}?tab=echeances`} className="underline decoration-amber-300 underline-offset-2">
                voir l&apos;onglet Échéances
              </Link>
              .
            </p>
          </div>
        </SyntheseCard>

        {/* 7 — Résumé */}
        <SyntheseCard numero={7} titre="Résumé" icon={<Check className="h-4 w-4" />}>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Historique bien renseigné</p>
                <p className="text-xs text-emerald-800">
                  {s.interventions.total} intervention(s) et {s.resume.nbReleves} relevé(s)
                  enregistrés{s.resume.anomalies.length === 0 ? ', aucune anomalie détectée.' : '.'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-sky-50 px-3.5 py-2.5">
              <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <div>
                <p className="text-sm font-semibold text-sky-900">
                  {s.interventions.total} intervention(s) enregistrée(s)
                </p>
                <p className="text-xs text-sky-800">
                  Dont {s.interventions.effectuees} effectuée(s) et {s.interventions.prevues} prévue(s).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-violet-50 px-3.5 py-2.5">
              <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              <div>
                <p className="text-sm font-semibold text-violet-900">Dépenses totales</p>
                <p className="text-xs text-violet-800">{formatEuro(s.depenses.total)} sur la période couverte.</p>
              </div>
            </div>
            {(s.resume.anomalies.length > 0 || s.resume.missing.length > 0) && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-3.5 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {s.resume.anomalies.length} anomalie(s) détectée(s) dans les données
                  </p>
                  <p className="text-xs text-amber-800">
                    {s.resume.missing.length > 0 &&
                      `${s.resume.missing.length} champ(s) non renseigné(s), `}
                    incohérences éventuelles ou données manquantes. Le détail figure dans le{' '}
                    <Link
                      href={`/vehicules/${vehicle.id}/rapport`}
                      className="underline decoration-amber-300 underline-offset-2"
                    >
                      rapport de vente
                    </Link>{' '}
                    (section « Méthodologie et limites »).
                  </p>
                </div>
              </div>
            )}
          </div>
        </SyntheseCard>
      </div>

      {/* Pied de synthèse */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-800 px-5 py-3 text-xs text-slate-300 dark:bg-[#334155]">
        <p className="font-medium text-white">
          {vehicle.marque} {vehicle.modele}
          {vehicle.immatriculation ? ` • ${vehicle.immatriculation}` : ''}
        </p>
        <p>Synthèse calculée uniquement à partir des données enregistrées — aucune valeur n&apos;est estimée.</p>
        <p className="text-slate-400">
          Ce document n&apos;est ni une expertise ni une certification mécanique.
        </p>
      </div>
    </div>
  )
}
