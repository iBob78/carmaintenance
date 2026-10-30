'use client'

import Link from 'next/link'
import { AlertTriangle, CalendarDays, CarFront, ChartNoAxesColumnIncreasing, CircleGauge, Coins, Donut, ShieldCheck, Wrench } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { buildVehicleOverview } from '@/lib/domain/vehicle-overview'
import { duesForVehicle } from '@/lib/domain/due'
import { buildVehicleSynthese } from '@/lib/domain/synthese'
import { formatDateShort, formatEuro, formatKm } from '@/lib/domain/format'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/domain/catalog'
import type { AppDatabase, DueUrgency, ExpenseCategory, Vehicle } from '@/lib/domain/types'

const COLORS = ['#3b82c4', '#60a974', '#f89a3b', '#8668bc', '#2fa8ab', '#ed6b75', '#b89062', '#7b8fa6']
const STATUS: Record<DueUrgency, { label: string; tone: 'green' | 'sky' | 'amber' | 'rose' }> = {
  ok: { label: 'À venir', tone: 'green' }, bientot: { label: 'Bientôt', tone: 'sky' },
  urgent: { label: 'Urgent', tone: 'amber' }, retard: { label: 'En retard', tone: 'rose' },
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Wrench; children: React.ReactNode }) {
  return <Card className="overflow-hidden border-sky-100"><div className="flex items-center gap-3 bg-sky-50 px-5 py-3 text-slate-800"><Icon className="h-5 w-5 text-sky-800" /><h2 className="text-lg font-bold">{title}</h2></div><div className="p-5">{children}</div></Card>
}

export function VehicleOverview({ vehicle, db, onShowDues, onShowHistory }: { vehicle: Vehicle; db: AppDatabase; onShowDues: () => void; onShowHistory: () => void }) {
  const overview = buildVehicleOverview(db, vehicle)
  const synthesis = buildVehicleSynthese(db, vehicle)
  const dues = duesForVehicle(db, vehicle.id).slice(0, 6)
  const latest = overview.records[overview.records.length - 1]
  const years = Object.entries(overview.totals.parAnnee).sort(([a], [b]) => a.localeCompare(b))
  const maxYear = Math.max(0, ...years.map(([, value]) => Math.abs(value.net)))
  const categories = Object.entries(overview.totals.parCategorie).sort((a, b) => b[1] - a[1])
  const hasNegative = categories.some(([, amount]) => amount < 0)
  const positiveTotal = categories.reduce((sum, [, amount]) => sum + Math.max(0, amount), 0)
  const circumference = 2 * Math.PI * 50
  let offset = 0

  return <div className="space-y-5">
    <header className="rounded-xl bg-gradient-to-r from-[#183b64] to-[#294e79] px-6 py-6 text-white sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4"><CarFront className="hidden h-12 w-12 shrink-0 text-white sm:block" /><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-200">Carnet de bord</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Suivi d’entretien du véhicule</h1><p className="mt-1 text-sm text-sky-100">Interventions, dépenses et prochaines échéances</p></div></div>
        <div className="border-l border-white/30 pl-5 text-sm"><p className="font-bold">{vehicle.marque} {vehicle.modele}</p><p className="mt-1 text-sky-100">{vehicle.motorisation || 'Motorisation non renseignée'}</p><p className="mt-1 text-sky-100">Immatriculation : {vehicle.immatriculation || 'Non renseignée'}</p><p className="mt-1 text-sky-100">Kilométrage enregistré : {formatKm(vehicle.kilometrageActuel)}</p></div>
      </div>
    </header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-sky-100 bg-sky-50 p-5"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3b82c4] text-white"><Wrench className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-sky-900">Entretiens réalisés</p><p className="mt-2 text-3xl font-bold text-sky-900">{overview.records.length}</p><p className="mt-3 border-t border-sky-200 pt-3 text-xs leading-relaxed text-slate-600">{latest ? `Dernier : ${formatDateShort(latest.date)} · ${formatKm(latest.kilometrage)}` : 'Aucune intervention effectuée enregistrée.'}</p></Card>
      <Card className="border-emerald-100 bg-emerald-50 p-5"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#60a974] text-white"><ShieldCheck className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-emerald-900">Lignes de pièces enregistrées</p><p className="mt-2 text-3xl font-bold text-emerald-900">{overview.pieces}</p><p className="mt-3 border-t border-emerald-200 pt-3 text-xs leading-relaxed text-slate-600">Associées aux interventions effectuées, sans présumer d’un remplacement.</p></Card>
      <Card className="border-orange-100 bg-orange-50 p-5"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f89a3b] text-white"><Coins className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-orange-900">Dépenses enregistrées</p><p className="mt-2 text-3xl font-bold text-orange-900">{overview.hasExpenses ? formatEuro(overview.totals.net, true) : '—'}</p><p className="mt-3 border-t border-orange-200 pt-3 text-xs leading-relaxed text-slate-600">Montant net, remboursements déduits. Les pleins sont suivis séparément.</p></Card>
      <Card className="border-violet-100 bg-violet-50 p-5"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8668bc] text-white"><CircleGauge className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-violet-900">Parcours depuis l’achat</p><p className="mt-2 text-3xl font-bold text-violet-900">{overview.distance != null ? formatKm(overview.distance) : '—'}</p><p className="mt-3 border-t border-violet-200 pt-3 text-xs leading-relaxed text-slate-600">{overview.distanceDate ? `Entre le relevé d’achat et celui du ${formatDateShort(overview.distanceDate)}.` : 'Relevés datés cohérents à l’achat et après nécessaires.'}</p></Card>
    </div>
    {(synthesis.resume.anomalies.length > 0 || synthesis.resume.missing.length > 0) && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{synthesis.resume.anomalies.length} anomalie(s) détectée(s), {synthesis.resume.missing.length} champ(s) manquant(s). Consultez la synthèse détaillée ou le rapport pour les vérifier.</span></div>}
    <Panel title="Frise chronologique des entretiens" icon={CalendarDays}>
      {overview.records.length === 0 ? <p className="text-sm text-slate-500">Aucun entretien effectué enregistré.</p> : <><div className="overflow-x-auto pb-2"><ol className="flex min-w-max items-start">{overview.records.map((record, i) => <li key={record.id} className="relative w-36 shrink-0 text-center"><div className="text-xs font-semibold text-sky-800">{formatDateShort(record.date)}</div><div className="mt-1 text-xs text-slate-500">{formatKm(record.kilometrage)}</div><div className="relative mt-3 flex justify-center before:absolute before:left-0 before:right-0 before:top-1/2 before:h-px before:bg-sky-200"><span className="relative flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ backgroundColor: COLORS[i % COLORS.length] }}><Wrench className="h-5 w-5" /></span></div><p className="mx-auto mt-2 max-w-32 text-xs leading-relaxed text-slate-700">{record.titre}</p></li>)}</ol></div><button onClick={onShowHistory} className="mt-3 text-xs font-semibold text-sky-700 underline">Voir le carnet d’entretien</button></>}
    </Panel>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Dépenses par année" icon={ChartNoAxesColumnIncreasing}>
        {years.length === 0 ? <p className="text-sm text-slate-500">Aucune dépense enregistrée.</p> : <><p className="mb-3 text-xs text-slate-500">Dépenses nettes enregistrées, remboursements déduits.</p><div className="space-y-3">{years.map(([year, amounts], i) => <div key={year} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-xs"><span className="font-medium text-slate-700">{year}</span><div className="h-6 overflow-hidden rounded bg-slate-100"><div className="h-full rounded" style={{ width: `${maxYear ? Math.abs(amounts.net) / maxYear * 100 : 0}%`, backgroundColor: COLORS[i % COLORS.length] }} /></div><span className="min-w-20 text-right font-semibold text-slate-800">{formatEuro(amounts.net, true)}</span></div>)}</div></>}
      </Panel>
      <Panel title="Répartition des dépenses" icon={Donut}>
        {categories.length === 0 ? <p className="text-sm text-slate-500">Aucune dépense enregistrée.</p> : <><div className="flex flex-wrap items-center justify-center gap-5">{!hasNegative && positiveTotal > 0 && <div className="relative h-40 w-40 shrink-0"><svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="18" />{categories.map(([name, amount], i) => { const length = amount / positiveTotal * circumference; const current = offset; offset += length; return <circle key={name} cx="60" cy="60" r="50" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="18" strokeDasharray={`${length} ${circumference}`} strokeDashoffset={-current} transform="rotate(-90 60 60)" /> })}</svg><div className="absolute inset-0 flex flex-col items-center justify-center text-center"><strong className="text-base text-slate-900">{formatEuro(overview.totals.net)}</strong><span className="text-xs text-slate-500">au total</span></div></div>}<ul className="min-w-44 flex-1 space-y-2">{categories.map(([category, amount], i) => <li key={category} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{category === 'inconnu' ? 'Non catégorisées' : EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] ?? category}</span><span className="whitespace-nowrap font-semibold text-slate-800">{formatEuro(amount, true)}{!hasNegative && positiveTotal > 0 ? ` (${Math.round(amount / positiveTotal * 100)} %)` : ''}</span></li>)}</ul></div>{hasNegative && <p className="mt-3 text-xs text-slate-500">Graphique non affiché : certaines catégories ont un solde négatif après remboursement.</p>}</>}
      </Panel>
    </div>
    <Panel title="Prochaines échéances" icon={CalendarDays}>
      {dues.length === 0 ? <p className="text-sm text-slate-500">Aucune échéance enregistrée ou calculée.</p> : <div><ul className="space-y-3 sm:hidden">{dues.map((due, i) => <li key={`${due.libelle}-${i}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-start justify-between gap-2"><p className="min-w-0 text-sm font-semibold text-slate-800">{due.libelle}</p><Badge tone={STATUS[due.urgency].tone}>{STATUS[due.urgency].label}</Badge></div><p className="mt-2 text-xs text-slate-600">{due.dueDate ? formatDateShort(due.dueDate) : 'Date non renseignée'}{due.dueKm != null && ` · ${formatKm(due.dueKm)}`}</p>{due.projectedDate && <p className="mt-1 text-xs text-slate-500">Km estimés vers le {formatDateShort(due.projectedDate)}</p>}</li>)}</ul><div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[570px] text-left text-sm"><thead><tr className="border-b border-sky-100 text-xs text-slate-500"><th className="pb-3 pr-3">Échéance</th><th className="pb-3 pr-3">Intervention</th><th className="pb-3 pr-3">Kilométrage</th><th className="pb-3">Statut</th></tr></thead><tbody>{dues.map((due, i) => <tr key={`${due.libelle}-${i}`} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-3 text-slate-700">{due.dueDate ? formatDateShort(due.dueDate) : 'Non renseignée'}{due.projectedDate && <span className="mt-1 block text-xs text-slate-500">Km estimés vers le {formatDateShort(due.projectedDate)}</span>}</td><td className="py-3 pr-3 font-medium text-slate-800">{due.libelle}</td><td className="py-3 pr-3 text-slate-700">{due.dueKm != null ? formatKm(due.dueKm) : '—'}</td><td className="py-3"><Badge tone={STATUS[due.urgency].tone}>{STATUS[due.urgency].label}</Badge></td></tr>)}</tbody></table></div></div>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Échéances calculées à partir des données enregistrées ; à vérifier sur votre carnet d’entretien.</p><Button variant="outline" onClick={onShowDues}>Voir les échéances</Button></div>
    </Panel>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500"><p>Informations enregistrées uniquement · ne constitue pas une expertise mécanique.</p><Link href={`/vehicules/${vehicle.id}/rapport`} className="font-semibold text-sky-700 underline">Générer un rapport de vente</Link></div>
  </div>
}
