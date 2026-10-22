'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  Battery,
  Calendar,
  CalendarCheck,
  CalendarClock,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Cog,
  Droplets,
  FileText,
  Filter,
  Fingerprint,
  Fuel,
  Gauge,
  Hash,
  Palette,
  Receipt,
  Settings,
  Snowflake,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import {
  buildVehicleSynthese,
  echeanceTexte,
  releveJustifie,
  type SyntheseDepensePart,
} from '@/lib/domain/synthese'
import { CARBURANT_LABELS, SERVICE_CATEGORIES, SERVICE_STATUS_LABELS, SOURCE_LABELS } from '@/lib/domain/catalog'
import { formatDateShort, formatEuro, formatKm, todayISO, classNames } from '@/lib/domain/format'
import type { AppDatabase, ServiceCategory, ServiceRecord, Vehicle } from '@/lib/domain/types'

// ---------------------------------------------------------------------------
// Carte à en-tête numéroté (style document)
// ---------------------------------------------------------------------------

function SyntheseCard({
  numero,
  titre,
  children,
}: {
  numero: number
  titre: string
  children: React.ReactNode
}) {
  return (
    <Card className="mb-6 break-inside-avoid overflow-hidden p-0">
      <div className="flex items-center gap-3 bg-slate-800 px-4 py-3 text-white dark:bg-[#334155]">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-sm font-bold text-slate-800">
          {numero}
        </span>
        <h2 className="text-base font-semibold tracking-tight">{titre}</h2>
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Donut des dépenses (SVG pur)
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
        <p className="mt-0.5 text-xl font-bold text-slate-900">{formatEuro(total)}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Historique : rangée en timeline avec pastille de catégorie
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<ServiceCategory, typeof Wrench> = {
  vidange: Droplets,
  filtres: Filter,
  freins: Wrench,
  pneus: Gauge,
  distribution: Cog,
  bougies: Zap,
  liquides: Droplets,
  climatisation: Snowflake,
  batterie: Battery,
  controle_technique: ClipboardCheck,
  transmission: Cog,
  suspension: Wrench,
  carrosserie: Car,
  electricite: Zap,
  autre: Wrench,
}

function InterventionRow({ r }: { r: ServiceRecord }) {
  const Icon = CATEGORY_ICONS[r.categorie] ?? Wrench
  const tone = r.statut === 'effectue' ? 'green' : r.statut === 'prevu' ? 'amber' : r.statut === 'non_realise' ? 'rose' : 'slate'
  return (
    <li className="relative pb-4 last:pb-0">
      <span className="absolute -left-[31px] top-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-white ring-4 ring-white dark:bg-[#334155] dark:ring-[#1e293b]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-slate-900">{r.titre}</p>
        <div className="flex items-center gap-2">
          <Badge tone={tone}>{SERVICE_STATUS_LABELS[r.statut]}</Badge>
          {r.coutTotal != null && <p className="text-sm font-bold text-slate-900">{formatEuro(r.coutTotal, true)}</p>}
        </div>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">
        {formatDateShort(r.date)} · {formatKm(r.kilometrage)}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        {SERVICE_CATEGORIES[r.categorie].label}
        {r.garage ? ` · ${r.garage}` : ''}
      </p>
      {r.description && <p className="mt-0.5 text-xs text-slate-500">{r.description}</p>}
    </li>
  )
}

// ---------------------------------------------------------------------------
// Synthèse complète — visuel « rapport d'entretien »
// ---------------------------------------------------------------------------

export function VehicleSynthese({ vehicle, db }: { vehicle: Vehicle; db: AppDatabase }) {
  const s = buildVehicleSynthese(db, vehicle)

  const identite = [
    {
      icon: <CalendarClock className="h-5 w-5 text-slate-300" />,
      valeur: String(vehicle.annee),
      legende: '1ère immatriculation',
    },
    {
      icon: <Cog className="h-5 w-5 text-slate-300" />,
      valeur: vehicle.motorisation ?? '—',
      legende: CARBURANT_LABELS[vehicle.carburant] ?? '',
    },
    {
      icon: <Settings className="h-5 w-5 text-slate-300" />,
      valeur: vehicle.transmission === 'manuelle' ? 'Manuelle' : vehicle.transmission === 'automatique' ? 'Automatique' : vehicle.transmission ? 'Semi-automatique' : '—',
      legende: '',
    },
    {
      icon: <FileText className="h-5 w-5 text-slate-300" />,
      valeur: vehicle.immatriculation ?? '—',
      legende: '',
    },
  ]

  const identificationIcons = [Car, Sparkles, Calendar, CalendarClock, Cog, Hash, Gauge, Fuel, Settings, Fingerprint, FileText, CalendarCheck, Palette]

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Bandeau : titre, véhicule, caractéristiques, visuel automobile    */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white">
        <img
          src="/banniere-vehicule.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-y-0 right-0 h-full w-full object-cover object-[70%_center] sm:w-[58%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900/25" />
        <div className="relative px-6 py-7 sm:px-9 sm:py-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Rapport d&apos;entretien
              </h1>
              <p className="mt-1.5 text-base text-slate-200 sm:text-lg">
                Historique de maintenance et d&apos;interventions
              </p>
            </div>
            <Link href={`/vehicules/${vehicle.id}/rapport`}>
              <Button className="bg-white text-slate-900 hover:bg-brand-50">
                <Sparkles className="h-4 w-4" />
                Rapport de vente
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-xl font-semibold sm:text-2xl">
            {vehicle.marque} {vehicle.modele}
            {vehicle.finition ? ` – ${vehicle.finition}` : ''}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            {identite.map((item, i) => (
              <div
                key={item.valeur + i}
                className={classNames(
                  'flex items-center gap-2.5',
                  i > 0 && 'sm:border-l sm:border-white/20 sm:pl-6',
                )}
              >
                {item.icon}
                <div>
                  <p className="text-sm font-semibold leading-tight">{item.valeur}</p>
                  {item.legende && <p className="text-[11px] text-slate-300">({item.legende})</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Mosaïque de cartes numérotées                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="columns-1 gap-6 md:columns-2 xl:columns-3">
        {/* 1 — Identification */}
        <SyntheseCard numero={1} titre="Identification du véhicule">
          <div>
            {s.identification.map((row, i) => {
              const Icon = identificationIcons[i] ?? Car
              return (
                <div
                  key={row.label}
                  className="flex items-center gap-3 border-b border-slate-100 py-2 first:pt-0 last:border-0 last:pb-0"
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <p className="text-sm text-slate-500">{row.label}</p>
                  <p className="ml-auto text-right text-sm font-semibold text-slate-900">
                    {row.valeur ?? <span className="font-normal italic text-slate-400">Non renseigné</span>}
                  </p>
                </div>
              )
            })}
          </div>
        </SyntheseCard>

        {/* 2 — Kilométrage */}
        <SyntheseCard numero={2} titre="Kilométrage">
          <p className="text-sm font-semibold text-slate-900">Relevés connus</p>
          {s.relevés.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">Aucun relevé kilométrique enregistré.</p>
          ) : (
            <>
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Kilométrage</th>
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">Justificatif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.relevés.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 text-sm last:border-0">
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDateShort(r.date)}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">{formatKm(r.valeurKm)}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{SOURCE_LABELS[r.sourceInformation]}</td>
                        <td className="px-3 py-2">
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
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-indigo-50 px-3.5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <Gauge className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-indigo-700">Plage reconstituée par les relevés</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatKm(s.plage.min)} → {formatKm(s.plage.max)}
                    </p>
                    <p className="text-xs text-slate-400">(données datées)</p>
                  </div>
                </div>
              )}
            </>
          )}
        </SyntheseCard>

        {/* 3 — Historique des interventions */}
        <SyntheseCard numero={3} titre="Historique des interventions">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-900">{s.interventions.total}</span> intervention(s) enregistrée(s)
          </p>
          {s.interventions.recentes.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">Aucune intervention enregistrée.</p>
          ) : (
            <>
              <ul className="relative mt-3 border-l border-slate-200 pl-6">
                {s.interventions.recentes.map((r) => (
                  <InterventionRow key={r.id} r={r} />
                ))}
              </ul>
              {s.interventions.total > s.interventions.recentes.length && (
                <p className="mt-1 text-xs text-slate-400">
                  … l&apos;historique complet figure dans l&apos;onglet « Carnet d&apos;entretien ».
                </p>
              )}
            </>
          )}
        </SyntheseCard>

        {/* 4 — Pannes et réparations */}
        <SyntheseCard numero={4} titre="Pannes et réparations">
          {s.pannes.ouvertes.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 px-3.5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Aucune panne enregistrée</p>
                <p className="mt-0.5 text-xs text-emerald-800">
                  Les données disponibles ne font état d&apos;aucune panne sur la période couverte
                  {s.pannes.resolues > 0 ? ` (${s.pannes.resolues} historique(s) résolu(s)).` : '.'}
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {s.pannes.ouvertes.map((f) => (
                <li key={f.id} className="flex items-start gap-3 rounded-xl bg-rose-50 px-3.5 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
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
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-sky-50 px-3.5 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <Wrench className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-sky-900">À noter</p>
              <p className="mt-0.5 text-xs text-sky-800">
                {s.prochaines.length > 0
                  ? `${s.prochaines[0].libelle} est à prévoir (${echeanceTexte(s.prochaines[0])}).`
                  : 'Aucun travail à prévoir selon les données actuelles.'}
              </p>
            </div>
          </div>
        </SyntheseCard>

        {/* 5 — Dépenses */}
        <SyntheseCard numero={5} titre="Dépenses">
          {s.depenses.total <= 0 ? (
            <p className="text-sm text-slate-400">Aucune dépense enregistrée.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-center gap-6">
                <DonutDepenses parts={s.depenses.parts} total={s.depenses.total} />
                <ul className="min-w-44 flex-1 space-y-1.5">
                  {s.depenses.parts.map((p, i) => (
                    <li key={p.cle} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        {p.label}
                      </span>
                      <span className="whitespace-nowrap font-medium text-slate-900">
                        {formatEuro(p.montant)} <span className="text-xs text-slate-400">({p.part} %)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                    <tr className="border-t border-slate-200">
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
        <SyntheseCard numero={6} titre="Travaux à prévoir">
          <div className="rounded-xl bg-amber-50 px-3.5 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <CalendarClock className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-amber-900">Prochaines échéances</p>
            </div>
            <ul className="mt-2 space-y-1.5">
              {s.prochaines.map((d, i) => (
                <li key={`${d.categorie}-${i}`} className="text-xs text-amber-900">
                  · <span className="font-medium">{d.libelle}</span>
                  <br />
                  <span className="text-amber-800">{echeanceTexte(d)}</span>
                </li>
              ))}
              <li className="text-xs text-amber-900">
                · <span className="font-medium">Autres travaux</span>
                <br />
                <span className="text-amber-800">
                  {s.prochaines.length > 0
                    ? 'Aucun autre travail à prévoir selon les données actuelles.'
                    : 'Aucun travail à prévoir selon les données actuelles.'}
                </span>
              </li>
            </ul>
            <p className="mt-2 text-[11px] text-amber-700">
              Détail dans l&apos;onglet{' '}
              <Link href={`/vehicules/${vehicle.id}?tab=echeances`} className="underline decoration-amber-300 underline-offset-2">
                Échéances & relevés
              </Link>
              .
            </p>
          </div>
        </SyntheseCard>

        {/* 7 — Résumé */}
        <SyntheseCard numero={7} titre="Résumé">
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Historique complet et cohérent</p>
                <p className="text-xs text-emerald-800">
                  Les données enregistrées sont complètes et cohérentes dans l&apos;ensemble.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-sky-50 px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <Wrench className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-sky-900">
                  {s.interventions.total} intervention(s) enregistrée(s)
                </p>
                <p className="text-xs text-sky-800">
                  Dont {s.interventions.effectuees} effectuée(s) et {s.interventions.prevues} prévue(s).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-violet-50 px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <Receipt className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-violet-900">Dépenses totales</p>
                <p className="text-xs text-violet-800">{formatEuro(s.depenses.total)} sur la période couverte.</p>
              </div>
            </div>
            {(s.resume.anomalies.length > 0 || s.resume.missing.length > 0) && (
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {s.resume.anomalies.length} anomalie(s) détectée(s) dans les données
                  </p>
                  <p className="text-xs text-amber-800">
                    {s.resume.missing.length > 0 && `${s.resume.missing.length} champ(s) non renseigné(s), `}
                    incohérences kilométriques ou chronologiques, données manquantes. Le détail figure en
                    section « Méthodologie et limites » du{' '}
                    <Link
                      href={`/vehicules/${vehicle.id}/rapport`}
                      className="underline decoration-amber-300 underline-offset-2"
                    >
                      rapport de vente
                    </Link>
                    .
                  </p>
                </div>
              </div>
            )}
          </div>
        </SyntheseCard>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Pied de page                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-t-2xl bg-slate-800 px-5 py-3 text-xs text-slate-300 dark:bg-[#334155]">
          <p className="font-semibold text-white">
            {vehicle.marque} {vehicle.modele}
            {vehicle.immatriculation ? ` • ${vehicle.immatriculation}` : ''}
          </p>
          <p>
            Synthèse calculée le {formatDateShort(todayISO())} • Propriétaire : {vehicle.ownerName || '—'}
          </p>
          <p className="text-slate-400">Données enregistrées</p>
        </div>
        <p className="rounded-b-2xl border border-t-0 border-slate-200 bg-white px-5 py-2.5 text-center text-[11px] leading-relaxed text-slate-400 dark:bg-[#1e293b] dark:text-slate-400">
          Ce document n&apos;est ni une expertise ni une certification mécanique de l&apos;état du véhicule.
          Il reprend uniquement les informations réellement enregistrées par son propriétaire.
        </p>
      </div>
    </div>
  )
}
