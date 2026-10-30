'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Fuel, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Modal, Select } from '@/components/ui'
import { useStore } from '@/lib/data/store'
import { fuelStatistics } from '@/lib/domain/fuel'
import { formatDateShort, formatKm, formatMonthYear, todayISO } from '@/lib/domain/format'
import type { FuelEntry } from '@/lib/domain/types'

type FuelValues = Omit<FuelEntry, 'id' | 'createdAt'>
const number = (n: number, digits = 2) => n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const euro = (n: number) => `${number(n)} €`
const FUEL_OPTIONS = ['Gasoil', 'Gasoil premium', 'SP98', 'SP95-E10', 'SP95', 'E85'] as const

function FuelForm({ vehicleId, initial, onSave, onCancel }: { vehicleId: string; initial?: FuelEntry; onSave: (value: FuelValues) => void; onCancel: () => void }) {
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [km, setKm] = useState(initial ? String(initial.kilometrage) : '')
  const [litres, setLitres] = useState(initial ? String(initial.litres) : '')
  const [amount, setAmount] = useState(initial ? String(initial.montant) : '')
  const [fuel, setFuel] = useState(initial?.carburant ?? '')
  const [full, setFull] = useState(initial?.pleinComplet ?? false)
  const [continuous, setContinuous] = useState(initial?.suiviContinu ?? false)
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault()
      const k = Number(km), l = Number(litres), a = Number(amount)
      if (!date || !fuel.trim() || !Number.isInteger(k) || k < 0 || !Number.isFinite(l) || l <= 0 || !Number.isFinite(a) || a <= 0) return
      onSave({ vehicleId, date, kilometrage: k, litres: l, montant: a, carburant: fuel.trim(), pleinComplet: full, suiviContinu: continuous })
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" required><Input type="date" required value={date} onChange={(e) => { setDate(e.target.value); setContinuous(false) }} /></Field>
        <Field label="Kilométrage au compteur" required><Input type="number" required min="0" step="1" value={km} onChange={(e) => { setKm(e.target.value); setContinuous(false) }} /></Field>
        <Field label="Volume (litres)" required><Input type="number" required min="0.001" step="0.001" value={litres} onChange={(e) => setLitres(e.target.value)} /></Field>
        <Field label="Montant payé (€)" required><Input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Carburant" required>
          <Select required value={fuel} onChange={(e) => setFuel(e.target.value)}>
            <option value="">Sélectionnez un carburant</option>
            {initial?.carburant && !FUEL_OPTIONS.some((option) => option === initial.carburant) && (
              <option value={initial.carburant}>{initial.carburant} (valeur enregistrée)</option>
            )}
            {FUEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </Select>
        </Field>
        <div className="self-end pb-2 text-sm text-slate-600">{Number(litres) > 0 && Number(amount) > 0 ? `Prix calculé : ${number(Number(amount) / Number(litres), 3)} €/L` : 'Prix au litre calculé depuis le montant et le volume.'}</div>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} className="mt-1" /> Réservoir rempli complètement</label>
      <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={continuous} onChange={(e) => setContinuous(e.target.checked)} className="mt-1" /> Tous les ravitaillements depuis la saisie précédente sont enregistrés</label>
      <p className="text-xs text-slate-500">La consommation nécessite deux pleins complets et un suivi continu de tous les ravitaillements intermédiaires. Le kilométrage saisi ici ne modifie pas le compteur du véhicule. L’ajout ou la modification d’un plein invalide la continuité du ravitaillement suivant, à confirmer à nouveau.</p>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={onCancel}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
    </form>
  )
}

export default function FuelPage() {
  const { db, ready, addFuelEntry, updateFuelEntry, removeFuelEntry } = useStore()
  const [selected, setSelected] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FuelEntry | undefined>()
  const [deleting, setDeleting] = useState<FuelEntry | undefined>()
  if (!ready) return <p className="text-sm text-slate-500">Chargement…</p>
  const vehicleId = db.vehicles.some((v) => v.id === selected) ? selected : db.vehicles[0]?.id ?? ''
  const entries = (db.fuelEntries ?? []).filter((entry) => entry.vehicleId === vehicleId)
  const stats = fuelStatistics(entries)
  const maxPrice = Math.max(...stats.map((m) => m.pricePerLitre), 0)
  const minPrice = Math.min(...stats.map((m) => m.pricePerLitre), maxPrice)
  const x = (i: number) => stats.length === 1 ? 300 : 30 + (i * 540) / (stats.length - 1)
  const y = (price: number) => maxPrice === minPrice ? 80 : 145 - ((price - minPrice) / (maxPrice - minPrice)) * 115

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Carburant</h1><p className="mt-1 text-sm text-slate-500">Suivez vos pleins, votre consommation et vos prix à la pompe.</p></div>
        {vehicleId && <Button onClick={() => { setEditing(undefined); setOpen(true) }}><Plus className="h-4 w-4" /> Ajouter un plein</Button>}
      </div>
      {!vehicleId ? <Card className="p-6 text-sm text-slate-600">Ajoutez d’abord un véhicule dans <Link className="text-brand-600 underline" href="/vehicules">Mes véhicules</Link>.</Card> : <>
        <Card className="p-4"><div className="max-w-sm"><Field label="Véhicule"><Select value={vehicleId} onChange={(e) => setSelected(e.target.value)}>{db.vehicles.map((v) => <option key={v.id} value={v.id}>{v.marque} {v.modele}{v.immatriculation ? ` · ${v.immatriculation}` : ''}</option>)}</Select></Field></div></Card>
        <p className="text-xs text-slate-500">Prix issus uniquement de vos saisies, pas des prix du marché. Les pleins ne sont pas ajoutés automatiquement aux dépenses ni au rapport de vente.</p>
        {entries.length === 0 ? <Card className="p-8 text-center"><Fuel className="mx-auto mb-3 h-7 w-7 text-slate-400" /><p className="font-medium text-slate-900">Aucun plein enregistré</p><p className="mt-1 text-sm text-slate-500">Ajoutez votre premier ravitaillement pour commencer le suivi.</p></Card> : <>
          <Card className="p-5"><h2 className="text-lg font-semibold">Évolution du prix au litre</h2><p className="mt-1 text-xs text-slate-500">Moyenne mensuelle pondérée par les litres, tous carburants saisis pour ce véhicule.</p>
            <svg viewBox="0 0 600 175" className="mt-4 h-44 w-full" role="img" aria-label="Courbe du prix moyen mensuel au litre ; les valeurs détaillées figurent dans le tableau mensuel">
              <line x1="30" y1="150" x2="570" y2="150" stroke="#cbd5e1" />
              {stats.length > 1 && <polyline points={stats.map((m, i) => `${x(i)},${y(m.pricePerLitre)}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="3" />}
              {stats.map((m, i) => <circle key={m.month} cx={x(i)} cy={y(m.pricePerLitre)} r="5" fill="#2563eb"><title>{formatMonthYear(`${m.month}-01`)} : {number(m.pricePerLitre, 3)} €/L</title></circle>)}
              <text x="30" y="170" fontSize="11" fill="#64748b">{formatMonthYear(`${stats[0].month}-01`)}</text>
              {stats.length > 1 && <text x="570" y="170" fontSize="11" fill="#64748b" textAnchor="end">{formatMonthYear(`${stats[stats.length - 1].month}-01`)}</text>}
            </svg>
          </Card>
          <Card className="overflow-x-auto"><div className="p-5 pb-2"><h2 className="text-lg font-semibold">Statistiques mensuelles</h2><p className="mt-1 text-xs text-slate-500">La consommation est calculée entre pleins complets avec suivi continu, puis attribuée au mois du plein final. Les valeurs ne couvrent pas nécessairement tout le mois.</p></div>
            <div className="space-y-3 p-4 sm:hidden">{[...stats].reverse().map((m) => <div key={m.month} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-900">{formatMonthYear(`${m.month}-01`)}</p><dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm"><div><dt className="text-xs text-slate-500">Pleins</dt><dd>{m.count}</dd></div><div><dt className="text-xs text-slate-500">Volume acheté</dt><dd>{number(m.litres)} L</dd></div><div><dt className="text-xs text-slate-500">Montant</dt><dd>{euro(m.amount)}</dd></div><div><dt className="text-xs text-slate-500">Prix moyen</dt><dd>{number(m.pricePerLitre, 3)} €/L</dd></div><div className="col-span-2"><dt className="text-xs text-slate-500">Consommation mesurée</dt><dd>{m.consumption == null ? 'Données insuffisantes' : `${number(m.consumption)} L/100 km (${formatKm(m.distance)})`}</dd></div></dl></div>)}</div>
            <table className="hidden w-full min-w-[650px] text-left text-sm sm:table"><thead className="text-xs text-slate-500"><tr>{['Mois', 'Pleins', 'Litres achetés', 'Montant', 'Prix moyen', 'Consommation mesurée'].map((h) => <th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody>{[...stats].reverse().map((m) => <tr className="border-t border-slate-100" key={m.month}><td className="px-5 py-3">{formatMonthYear(`${m.month}-01`)}</td><td className="px-5 py-3">{m.count}</td><td className="px-5 py-3">{number(m.litres)} L</td><td className="px-5 py-3">{euro(m.amount)}</td><td className="px-5 py-3">{number(m.pricePerLitre, 3)} €/L</td><td className="px-5 py-3">{m.consumption == null ? 'Données insuffisantes' : `${number(m.consumption)} L/100 km (${formatKm(m.distance)})`}</td></tr>)}</tbody></table>
          </Card>
          <Card className="overflow-hidden"><h2 className="p-5 text-lg font-semibold">Historique des ravitaillements</h2><ul className="divide-y divide-slate-100">{[...entries].sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).map((entry) => <li key={entry.id} className="flex flex-wrap items-center gap-3 px-5 py-4"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{formatDateShort(entry.date)} · {entry.carburant} · {formatKm(entry.kilometrage)}</p><p className="mt-1 text-xs text-slate-500">{number(entry.litres, 3)} L · {euro(entry.montant)} · {number(entry.montant / entry.litres, 3)} €/L</p><div className="mt-2 flex flex-wrap gap-2"><Badge tone={entry.pleinComplet ? 'green' : 'slate'}>{entry.pleinComplet ? 'Plein complet' : 'Partiel'}</Badge><Badge tone={entry.suiviContinu ? 'brand' : 'amber'}>{entry.suiviContinu ? 'Suivi continu déclaré' : 'Suivi non confirmé'}</Badge></div></div><Button variant="ghost" aria-label="Modifier le plein" onClick={() => { setEditing(entry); setOpen(true) }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" aria-label="Supprimer le plein" onClick={() => setDeleting(entry)}><Trash2 className="h-4 w-4" /></Button></li>)}</ul></Card>
        </>}
      </>}
      {open && <Modal open title={editing ? 'Modifier le plein' : 'Ajouter un plein'} onClose={() => setOpen(false)}><FuelForm key={editing?.id ?? 'new'} vehicleId={vehicleId} initial={editing} onCancel={() => setOpen(false)} onSave={(value) => { if (editing) updateFuelEntry({ ...editing, ...value }); else addFuelEntry(value); setOpen(false) }} /></Modal>}
      {deleting && <Modal open title="Supprimer ce plein ?" onClose={() => setDeleting(undefined)}><p className="text-sm text-slate-600">Cette action est irréversible. Le suivi du ravitaillement suivant devra être confirmé à nouveau.</p><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleting(undefined)}>Annuler</Button><Button variant="danger" onClick={() => { removeFuelEntry(deleting.id); setDeleting(undefined) }}>Supprimer</Button></div></Modal>}
    </div>
  )
}
