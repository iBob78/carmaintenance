'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useStore } from '@/lib/data/store'
import { buildReportSnapshot, type ReportSnapshot } from '@/lib/report/snapshot'
import {
  defaultReportOptions,
  reportOptionsSchema,
  SECTION_LABELS,
  type ReportOptions,
  type ReportSection,
} from '@/lib/report/options'
import { applyPrivacy } from '@/lib/report/privacy'
import { detectAnomalies, missingVehicleFields } from '@/lib/domain/anomalies'
import {
  CARBURANT_LABELS,
  EXPENSE_CATEGORY_LABELS,
  SERVICE_STATUS_LABELS,
} from '@/lib/domain/catalog'
import { formatDate, formatDateShort, formatEuro, formatKm, classNames, todayISO } from '@/lib/domain/format'
import { Badge, Button, Card, Checkbox, Field, Input, SectionTitle } from '@/components/ui'

type Step = 1 | 2 | 3 | 4

const STEPS: Array<{ id: Step; label: string; icon: typeof FileCheck2 }> = [
  { id: 1, label: 'Vérifier les données', icon: FileCheck2 },
  { id: 2, label: 'Choisir les options', icon: ShieldCheck },
  { id: 3, label: 'Prévisualiser', icon: Eye },
  { id: 4, label: 'Générer & télécharger', icon: Download },
]

const SECTION_KEYS: ReportSection[] = [
  'identification',
  'historique',
  'pannes',
  'justificatifs',
  'depenses',
  'travaux_prevoir',
  'methodologie',
]

export default function SaleReportPage() {
  const params = useParams<{ id: string }>()
  const vehicleId = params.id
  const { db, ready, addReportExport } = useStore()

  const [step, setStep] = useState<Step>(1)
  const [options, setOptions] = useState<ReportOptions>(defaultReportOptions)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastExport, setLastExport] = useState<{ pages: number; bytes: number; at: string } | null>(null)

  const vehicle = db.vehicles.find((v) => v.id === vehicleId)

  const snapshot: ReportSnapshot | null = useMemo(() => {
    if (!vehicle) return null
    try {
      return buildReportSnapshot(db, vehicleId, options)
    } catch {
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, vehicleId, JSON.stringify(options)])

  const anomalies = useMemo(() => (vehicle ? detectAnomalies(db, vehicleId) : []), [db, vehicleId, vehicle])
  const missing = vehicle ? missingVehicleFields(vehicle) : []
  const privacy = useMemo(
    () => (snapshot ? applyPrivacy(snapshot, options) : null),
    [snapshot, options],
  )

  if (!ready) return <p className="text-sm text-slate-500">Chargement…</p>
  if (!vehicle || !snapshot) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Véhicule introuvable.</p>
        <Link href="/vehicules">
          <Button variant="outline">Retour aux véhicules</Button>
        </Link>
      </div>
    )
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      // Validation client des options (le serveur revalide indépendamment)
      reportOptionsSchema.parse(options)

      const response = await fetch(`/api/vehicles/${vehicleId}/reports/sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot, options }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? `Erreur serveur (${response.status})`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = todayISO()
      a.href = url
      a.download = `rapport-vente-${vehicle.marque}-${vehicle.modele}-${date}.pdf`.replace(/\s+/g, '-')
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      const pages = Number(response.headers.get('X-Report-Pages') ?? 0)
      const bytes = Number(response.headers.get('X-Report-Bytes') ?? blob.size)
      const at = response.headers.get('X-Report-Generated-At') ?? new Date().toISOString()

      // Traçabilité de l'export : instantané + options conservés (reproductibilité)
      addReportExport({
        vehicleId,
        createdAt: at,
        options,
        snapshot,
        anomalies: snapshot.anomalies,
        pdfTailleOctets: bytes,
        generatedBy: 'demo-user',
      })

      setLastExport({ pages, bytes, at })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Link
          href={`/vehicules/${vehicleId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au carnet de {vehicle.marque} {vehicle.modele}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Générer un rapport de vente
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Un dossier PDF professionnel, traçable et transparent à remettre à un acheteur — uniquement
          à partir des données réellement enregistrées.
        </p>
      </div>

      {/* Étapes */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => {
          const active = step === s.id
          const done = step > s.id
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={classNames(
                'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition',
                active
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
              )}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              {s.id}. {s.label}
            </button>
          )
        })}
      </div>

      {/* ---------------------------------------------------------------- */}
      {step === 1 && (
        <div className="space-y-6">
          <Card className="p-6">
            <SectionTitle>État des données de {vehicle.marque} {vehicle.modele}</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Interventions enregistrées</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{snapshot.counts.interventions}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Pannes / réparations</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{snapshot.counts.pannes}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Justificatifs</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{snapshot.counts.documents}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Relevés kilométriques</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{snapshot.counts.releves}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Points vérifiés avant génération</h3>

              {missing.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Toutes les caractéristiques principales du véhicule sont renseignées.
                </p>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <AlertTriangle className="h-4 w-4" />
                    Données manquantes (elles apparaîtront comme « non renseigné »)
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-800">
                    {missing.map((m) => (
                      <li key={m}>· {m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {anomalies.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Aucune incohérence détectée dans les données.
                </p>
              ) : (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-rose-900">
                    <AlertTriangle className="h-4 w-4" />
                    {anomalies.length} anomalie(s) détectée(s) — aucune correction automatique ne sera
                    appliquée
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-rose-800">
                    {anomalies.map((a) => (
                      <li key={a.id}>
                        · [{a.severity === 'incoherence' ? 'Incohérence' : 'Avertissement'}] {a.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)}>
              Étape suivante : les options
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sections */}
            <Card className="p-6">
              <SectionTitle>Sections à inclure</SectionTitle>
              <div className="space-y-2">
                {SECTION_KEYS.map((sec) => (
                  <Checkbox
                    key={sec}
                    label={SECTION_LABELS[sec]}
                    checked={options.sections[sec]}
                    onChange={(v) => setOptions({ ...options, sections: { ...options.sections, [sec]: v } })}
                  />
                ))}
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Période de l&apos;historique</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Du">
                    <Input
                      type="date"
                      value={options.period.from ?? ''}
                      onChange={(e) =>
                        setOptions({ ...options, period: { ...options.period, from: e.target.value || null } })
                      }
                    />
                  </Field>
                  <Field label="Au">
                    <Input
                      type="date"
                      value={options.period.to ?? ''}
                      onChange={(e) =>
                        setOptions({ ...options, period: { ...options.period, to: e.target.value || null } })
                      }
                    />
                  </Field>
                </div>
                <p className="text-xs text-slate-400">
                  Vide = historique complet. Les sections identification et méthodologie restent
                  toujours basées sur l&apos;état complet du véhicule.
                </p>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Contenu financier</h3>
                <Checkbox
                  label="Inclure les montants et coûts détaillés"
                  checked={options.includeCosts}
                  onChange={(v) => setOptions({ ...options, includeCosts: v })}
                />
                <Checkbox
                  label="Inclure les pièces jointes sélectionnées (factures, photos)"
                  checked={options.includeAttachments}
                  onChange={(v) => setOptions({ ...options, includeAttachments: v })}
                />
              </div>
            </Card>

            {/* Confidentialité */}
            <Card className="p-6">
              <SectionTitle>Confidentialité</SectionTitle>
              <p className="mb-4 text-xs text-slate-500">
                Les champs masqués sont <strong>retirés des données</strong> avant la mise en page — ils
                ne peuvent pas apparaître dans le PDF, même dans les métadonnées.
              </p>
              <div className="space-y-2">
                <Checkbox
                  label="Masquer le numéro VIN"
                  checked={options.maskVin}
                  onChange={(v) => setOptions({ ...options, maskVin: v })}
                />
                <Checkbox
                  label="Masquer l'immatriculation"
                  checked={options.maskPlate}
                  onChange={(v) => setOptions({ ...options, maskPlate: v })}
                />
                <Checkbox
                  label="Masquer les données personnelles du propriétaire (nom, coordonnées) — exclut aussi les factures qui peuvent les contenir"
                  checked={options.maskOwner}
                  onChange={(v) => setOptions({ ...options, maskOwner: v })}
                />
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Eye className="h-4 w-4" />
                  Aperçu des informations sensibles
                </h3>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Propriétaire</dt>
                    <dd className={classNames('font-medium', options.maskOwner ? 'text-rose-600' : 'text-slate-800')}>
                      {options.maskOwner ? '•••••••• (masqué)' : vehicle.ownerName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">VIN</dt>
                    <dd className={classNames('font-medium', options.maskVin ? 'text-rose-600' : 'text-slate-800')}>
                      {options.maskVin ? '•••••••• (masqué)' : vehicle.vin ?? 'non renseigné'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Immatriculation</dt>
                    <dd className={classNames('font-medium', options.maskPlate ? 'text-rose-600' : 'text-slate-800')}>
                      {options.maskPlate ? '•••••••• (masqué)' : vehicle.immatriculation ?? 'non renseignée'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Pièces jointes */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">Pièces jointes à intégrer</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Sélectionnez les justificatifs à inclure. Une pièce jointe inaccessible n&apos;est
                  jamais omise silencieusement : son absence est signalée dans le rapport.
                </p>
                <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {snapshot.documents.length === 0 && (
                    <p className="text-xs text-slate-400">Aucun justificatif enregistré.</p>
                  )}
                  {snapshot.documents.map((d) => (
                    <label key={d.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={options.attachmentIds.includes(d.id)}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            attachmentIds: e.target.checked
                              ? [...options.attachmentIds, d.id]
                              : options.attachmentIds.filter((x) => x !== d.id),
                          })
                        }
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-slate-800">{d.filename}</span>
                        <span className="block text-[11px] text-slate-400">
                          {formatDateShort(d.dateDocument)} ·{' '}
                          {d.kind === 'facture' ? 'Facture' : d.kind === 'photo' ? 'Photo' : d.kind === 'pv_controle' ? 'PV contrôle' : 'Autre'}
                          {!d.disponible && ' · fichier non accessible (signalé dans le rapport)'}
                          {d.kind === 'facture' && options.maskOwner && ' · exclue si masquage propriétaire actif'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" />
              Étape précédente
            </Button>
            <Button onClick={() => setStep(3)}>
              Étape suivante : prévisualiser
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 3 && privacy && (
        <div className="space-y-6">
          <Card className="p-6">
            <SectionTitle
              action={
                <Badge tone="sky">
                  <Eye className="h-3.5 w-3.5" />
                  Aperçu fidèle du PDF
                </Badge>
              }
            >
              Prévisualisation du rapport
            </SectionTitle>

            {/* Aperçu HTML */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <div className="mx-auto max-w-3xl space-y-6 rounded-lg bg-white p-8 shadow-sm">
                {/* Couverture */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                    AutoCarnet · Rapport de vente
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    Historique d&apos;entretien et de maintenance du véhicule
                  </h2>
                  <div className="my-4 h-0.5 w-16 bg-slate-900" />
                  <p className="text-lg font-bold text-slate-900">
                    {privacy.snapshot.vehicle.marque} {privacy.snapshot.vehicle.modele}
                  </p>
                  <p className="text-sm text-slate-500">
                    {privacy.snapshot.vehicle.annee} · {CARBURANT_LABELS[privacy.snapshot.vehicle.carburant]}
                    {privacy.snapshot.vehicle.immatriculation ? ` · ${privacy.snapshot.vehicle.immatriculation}` : ''}
                    {privacy.snapshot.vehicle.vin ? ` · VIN ${privacy.snapshot.vehicle.vin}` : ''}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-lg font-bold text-slate-900">{snapshot.counts.interventionsEffectuees}</p>
                      <p className="text-[10px] uppercase text-slate-400">Interventions</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-lg font-bold text-slate-900">
                        {snapshot.kmRange.max != null ? formatKm(snapshot.kmRange.max) : '—'}
                      </p>
                      <p className="text-[10px] uppercase text-slate-400">Kilométrage connu</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-lg font-bold text-slate-900">{snapshot.counts.documents}</p>
                      <p className="text-[10px] uppercase text-slate-400">Justificatifs</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-lg font-bold text-slate-900">
                        {options.includeCosts ? formatEuro(snapshot.totals.net) : '—'}
                      </p>
                      <p className="text-[10px] uppercase text-slate-400">Dépenses nettes</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3 text-xs text-slate-700">
                    <strong>Avertissement :</strong> ce document n&apos;est ni une expertise ni une
                    certification de l&apos;état mécanique du véhicule.
                  </div>
                </div>

                {/* Sommaire */}
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="font-bold text-slate-900">Sommaire</h3>
                  <ol className="mt-2 space-y-1 text-sm text-slate-600">
                    {SECTION_KEYS.filter((sec) => options.sections[sec]).map((sec, i) => (
                      <li key={sec}>
                        {i + 1}. {SECTION_LABELS[sec]}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Extraits */}
                {options.sections.historique && (
                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="font-bold text-slate-900">Extrait — Historique</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {snapshot.serviceRecords.length} intervention(s) sur la période.
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                      {snapshot.serviceRecords.slice(0, 4).map((entry) => (
                        <li key={entry.record.id} className="rounded border border-slate-100 p-2">
                          <span className="font-medium text-slate-800">{entry.record.titre}</span> —{' '}
                          {formatDateShort(entry.record.date)} · {formatKm(entry.record.kilometrage)} ·{' '}
                          {SERVICE_STATUS_LABELS[entry.record.statut]}
                          {options.includeCosts && entry.record.coutTotal != null && (
                            <> · {formatEuro(entry.record.coutTotal, true)}</>
                          )}
                        </li>
                      ))}
                      {snapshot.serviceRecords.length > 4 && (
                        <li className="text-slate-400">… et {snapshot.serviceRecords.length - 4} autre(s).</li>
                      )}
                    </ul>
                  </div>
                )}

                {options.sections.depenses && (
                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="font-bold text-slate-900">Extrait — Dépenses</h3>
                    {options.includeCosts ? (
                      <p className="mt-1 text-xs text-slate-600">
                        Net : <strong>{formatEuro(snapshot.totals.net, true)}</strong> ·{' '}
                        {Object.entries(snapshot.totals.parCategorie)
                          .slice(0, 3)
                          .map(([c, v]) => `${EXPENSE_CATEGORY_LABELS[c as keyof typeof EXPENSE_CATEGORY_LABELS] ?? c}: ${formatEuro(v)}`)
                          .join(' · ')}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">Montants masqués dans les options.</p>
                    )}
                  </div>
                )}

                {options.sections.justificatifs && (
                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="font-bold text-slate-900">Extrait — Justificatifs</h3>
                    <p className="mt-1 text-xs text-slate-600">
                      {snapshot.documents.length} document(s) indexé(s).
                      {privacy.notices.some((n) => n.code === 'piece_jointe_exclue_confidentialite') && (
                        <span className="text-rose-600">
                          {' '}
                          Certaines factures sont exclues pour confidentialité (signalées dans le PDF).
                        </span>
                      )}
                      {snapshot.attachments.some((a) => a.reason?.includes('inaccessible')) && (
                        <span className="text-amber-600">
                          {' '}
                          Des pièces jointes sélectionnées sont inaccessibles : leur absence est
                          signalée dans le PDF.
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {options.sections.methodologie && (
                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="font-bold text-slate-900">Méthodologie et limites</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Données reprises telles quelles, sans invention ni correction automatique. Le
                      document n&apos;est ni une expertise ni une certification mécanique.
                      {privacy.notices.length > 0 && ` ${privacy.notices.length} règle(s) de confidentialité appliquée(s).`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" />
              Modifier les options
            </Button>
            <Button onClick={() => setStep(4)}>
              Étape suivante : générer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 4 && (
        <div className="space-y-6">
          <Card className="p-8">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">Le rapport est prêt à être généré</h2>
              <p className="mt-2 text-sm text-slate-500">
                Le PDF sera généré côté serveur, validé, puis téléchargé immédiatement. Aucune copie
                n&apos;est conservée sur le serveur : seules les métadonnées de l&apos;export
                (instantané + options) sont archivées localement pour garantir la reproductibilité.
              </p>

              <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left text-xs text-slate-600">
                <p>
                  <strong>Véhicule :</strong> {vehicle.marque} {vehicle.modele} ({vehicle.annee})
                </p>
                <p>
                  <strong>Sections :</strong>{' '}
                  {SECTION_KEYS.filter((s) => options.sections[s])
                    .map((s) => SECTION_LABELS[s])
                    .join(', ')}
                </p>
                <p>
                  <strong>Période :</strong>{' '}
                  {options.period.from || options.period.to
                    ? `${options.period.from ? formatDateShort(options.period.from) : 'début'} → ${options.period.to ? formatDateShort(options.period.to) : 'aujourd’hui'}`
                    : 'historique complet'}
                </p>
                <p>
                  <strong>Confidentialité :</strong>{' '}
                  {[
                    options.maskVin && 'VIN masqué',
                    options.maskPlate && 'immatriculation masquée',
                    options.maskOwner && 'données personnelles masquées',
                  ]
                    .filter(Boolean)
                    .join(', ') || 'aucun masquage'}
                </p>
                <p>
                  <strong>Coûts :</strong> {options.includeCosts ? 'inclus' : 'masqués'} ·{' '}
                  <strong>Pièces jointes :</strong> {options.includeAttachments ? `${options.attachmentIds.length} sélectionnée(s)` : 'désactivées'}
                </p>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-left text-sm text-rose-700">
                  <strong>Erreur :</strong> {error}
                </div>
              )}

              {lastExport && !error && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="flex items-center justify-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Rapport généré et téléchargé avec succès
                  </p>
                  <p className="mt-1 text-xs">
                    {lastExport.pages} page(s) · {(lastExport.bytes / 1024).toFixed(0)} Ko ·{' '}
                    {formatDate(lastExport.at.slice(0, 10))}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <Eye className="h-4 w-4" />
                  Retour à la prévisualisation
                </Button>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Génération en cours…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Générer et télécharger le PDF
                    </>
                  )}
                </Button>
              </div>

              <p className="mt-6 flex items-start justify-center gap-2 text-xs text-slate-400">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Le rapport reflète uniquement les informations enregistrées. Il n&apos;est ni une
                expertise ni une certification de l&apos;état mécanique.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
