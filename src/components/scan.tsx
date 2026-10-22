'use client'

// Scan de documents (carte grise, facture) par OCR navigateur.
// Principe : l'OCR PROPOSE, l'utilisateur VALIDE. Chaque valeur extraite est
// présentée avec son repère officiel (ex. « E — VIN ») et un niveau de
// confiance ; les données personnelles sont désélectionnées par défaut.

import React, { useRef, useState } from 'react'
import { Badge, Button, Card, Checkbox, Progress } from './ui'
import { recognizeImage, type RecognizeResult } from '@/lib/ocr/scan'
import { toVehiclePrefill, type CarteGriseScan, type ScanField, type VehiclePrefill, afficheChamp } from '@/lib/ocr/carte-grise'
import { toServicePrefill, type FactureScan, type ServicePrefill } from '@/lib/ocr/facture'

// ---------------------------------------------------------------------------
// Bouton photo → OCR
// ---------------------------------------------------------------------------

export function ScanPhotoButton({
  label = 'Scanner un document (photo)',
  onText,
}: {
  label?: string
  onText: (r: RecognizeResult) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [statut, setStatut] = useState<'idle' | 'ocr' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setStatut('ocr')
    setMessage('Lecture du document en cours… (100 % local, la photo ne quitte pas votre appareil)')
    try {
      const result = await recognizeImage(file)
      setStatut('idle')
      setMessage('')
      onText(result)
    } catch (e) {
      setStatut('error')
      setMessage(e instanceof Error ? e.message : 'Échec de la reconnaissance du texte')
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
        {label}
      </Button>
      {statut === 'ocr' && (
        <div className="space-y-1">
          <Progress value={60} />
          <p className="text-xs text-slate-500">{message}</p>
        </div>
      )}
      {statut === 'error' && <p className="text-xs text-rose-600">{message}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Révision des résultats
// ---------------------------------------------------------------------------

const confianceTone: Record<ScanField['confidence'], 'brand' | 'amber' | 'rose'> = {
  haute: 'brand',
  moyenne: 'amber',
  faible: 'rose',
}

export function CarteGriseReview({
  scan,
  onIntegrate,
  onCancel,
}: {
  scan: CarteGriseScan
  onIntegrate: (prefill: VehiclePrefill, selected: ScanField[]) => void
  onCancel: () => void
}) {
  // Sélection par défaut : uniquement les valeurs « haute » confiance,
  // exploitables et non sensibles — le reste demande un clic explicite.
  const [selection, setSelection] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      scan.fields.map((f) => [f.code + f.label, Boolean(f.target) && !f.sensitive && f.confidence === 'haute']),
    ),
  )
  const selectedFields = scan.fields.filter((f) => selection[f.code + f.label])

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Vérifier les données extraites de la carte grise</h3>
        <p className="mt-1 text-xs text-slate-500">
          Chaque valeur est proposée avec son repère officiel (lettre de la carte grise). Rien n’est enregistré tant que
          vous ne l’avez pas validé — l’OCR peut se tromper. La photo n’a pas quitté votre appareil.
        </p>
      </div>

      <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {scan.fields.map((f) => (
          <label key={f.code + f.label} className="flex items-start gap-3 px-3 py-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={Boolean(selection[f.code + f.label])}
              disabled={!f.target}
              onChange={(e) => setSelection((s) => ({ ...s, [f.code + f.label]: e.target.checked }))}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{f.code}</Badge>
                <span className="text-xs font-medium text-slate-700">{f.label}</span>
                <Badge tone={confianceTone[f.confidence]}>confiance : {f.confidence}</Badge>
                {f.sensitive && <Badge tone="rose">donnée personnelle</Badge>}
                {!f.target && <Badge tone="amber">affichage seul</Badge>}
              </div>
              <p className="mt-0.5 break-words text-sm text-slate-900">
                {(() => {
                  const aff = afficheChamp(f)
                  return aff.droite !== undefined ? (
                    <>
                      <span className="text-slate-500 line-through">{aff.gauche}</span> → <strong>{aff.droite}</strong>
                    </>
                  ) : (
                    <strong>{aff.gauche}</strong>
                  )
                })()}
              </p>
              {f.note && <p className="mt-0.5 text-xs text-amber-700">{f.note}</p>}
            </div>
          </label>
        ))}
      </div>

      {scan.nonInterpretes.length > 0 && (
        <details className="rounded-md border border-slate-200 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-600">
            {scan.nonInterpretes.length} fragment(s) non interprété(s) — afficher
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {scan.nonInterpretes.map((l, i) => (
              <li key={i}>« {l} »</li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="button"
          disabled={selectedFields.length === 0}
          onClick={() => onIntegrate(toVehiclePrefill(selectedFields), selectedFields)}
        >
          Intégrer la sélection ({selectedFields.length})
        </Button>
      </div>
    </Card>
  )
}

export function FactureReview({
  scan,
  onIntegrate,
  onCancel,
}: {
  scan: FactureScan
  onIntegrate: (prefill: ServicePrefill) => void
  onCancel: () => void
}) {
  const prefill = toServicePrefill(scan)
  const [selection, setSelection] = useState<Record<string, boolean>>({
    date: Boolean(scan.date),
    fournisseur: Boolean(scan.fournisseur),
    montantTTC: Boolean(scan.montantTTC),
    kilometrage: Boolean(scan.kilometrage),
    lignes: scan.lignes.length > 0,
  })

  const construit = (): ServicePrefill => {
    const out: ServicePrefill = {}
    if (selection.date && prefill.date) out.date = prefill.date
    if (selection.fournisseur && prefill.garage) out.garage = prefill.garage
    if (selection.montantTTC && prefill.coutTotal !== undefined) out.coutTotal = prefill.coutTotal
    if (selection.kilometrage && prefill.kilometrage !== undefined) out.kilometrage = prefill.kilometrage
    if (selection.lignes) {
      if (prefill.titre) out.titre = prefill.titre
      if (prefill.description) out.description = prefill.description
      if (prefill.items) out.items = prefill.items
      if (prefill.categorie) out.categorie = prefill.categorie
    }
    return out
  }

  const cases: Array<[string, string]> = [
    ['date', 'Date'],
    ['fournisseur', 'Garage / fournisseur'],
    ['montantTTC', 'Montant TTC'],
    ['kilometrage', 'Kilométrage'],
    ['lignes', `Lignes de facture (${scan.lignes.length})`],
  ]

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Vérifier les données extraites de la facture</h3>
        <p className="mt-1 text-xs text-slate-500">
          Proposé par OCR — vérifiez chaque valeur sur le document original avant intégration. La photo n’a pas quitté
          votre appareil.
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-slate-200 p-3">
        {cases.map(([cle, libelle]) => (
          <div key={cle} className="flex items-center justify-between gap-3">
            <Checkbox label={libelle} checked={Boolean(selection[cle])} onChange={(v) => setSelection((s) => ({ ...s, [cle]: v }))} />
            <span className="text-right text-sm text-slate-900">
              {cle === 'date' && (scan.date ? (afficheChamp(scan.date).droite ?? afficheChamp(scan.date).gauche) : '—')}
              {cle === 'fournisseur' && (scan.fournisseur?.value ?? '—')}
              {cle === 'montantTTC' && (scan.montantTTC ? `${scan.montantTTC.normalized} €` : '—')}
              {cle === 'kilometrage' && (scan.kilometrage ? `${scan.kilometrage.normalized} km` : '—')}
              {cle === 'lignes' && (scan.lignes.length > 0 ? scan.lignes.map((l) => l.libelle).join(' · ') : '—')}
            </span>
          </div>
        ))}
      </div>

      {scan.nonInterpretes.length > 0 && (
        <details className="rounded-md border border-slate-200 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-600">
            {scan.nonInterpretes.length} fragment(s) non interprété(s) — afficher
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {scan.nonInterpretes.map((l, i) => (
              <li key={i}>« {l} »</li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="button" onClick={() => onIntegrate(construit())}>
          Intégrer la sélection
        </Button>
      </div>
    </Card>
  )
}
