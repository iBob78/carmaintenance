'use client'

// Formulaires de saisie (véhicule, intervention, panne, dépense, justificatif,
// rappel, relevé kilométrique).

import React, { useState } from 'react'
import type {
  Carburant,
  DocumentEntry,
  ExpenseEntry,
  ExpenseCategory,
  FaultAndTest,
  FaultStatus,
  ItemKind,
  OdometerReading,
  OdometerSource,
  PartPurchase,
  Reminder,
  ReminderStatus,
  ReminderTrigger,
  ServiceActor,
  ServiceCategory,
  ServiceRecord,
  ServiceRecordItem,
  ServiceStatus,
  Transmission,
  Vehicle,
  SourceInformation,
} from '@/lib/domain/types'
import { Button, Field, Input, Select, Textarea } from './ui'
import { SERVICE_CATEGORY_KEYS, SERVICE_CATEGORIES, CARBURANT_LABELS, EXPENSE_CATEGORY_LABELS, FAULT_STATUS_LABELS, SERVICE_STATUS_LABELS } from '@/lib/domain/catalog'
import { todayISO } from '@/lib/domain/format'

export function FormActions({ onCancel, submitLabel = 'Enregistrer' }: { onCancel: () => void; submitLabel?: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <Button variant="outline" onClick={onCancel}>
        Annuler
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Véhicule
// ---------------------------------------------------------------------------

export type VehicleFormValues = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>

const emptyVehicle: VehicleFormValues = {
  ownerId: 'profile-demo',
  ownerName: 'Jean Dupont',
  marque: '',
  modele: '',
  annee: new Date().getFullYear(),
  carburant: 'essence',
  kilometrageActuel: 0,
}

export function VehicleForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: VehicleFormValues
  onSubmit: (v: VehicleFormValues) => void
  onCancel: () => void
}) {
  const [v, setV] = useState<VehicleFormValues>(initial ?? emptyVehicle)
  const set = <K extends keyof VehicleFormValues>(k: K, val: VehicleFormValues[K]) => setV((x) => ({ ...x, [k]: val }))
  const valid = v.marque.trim() && v.modele.trim()

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit(v)
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Marque" required>
          <Input value={v.marque} onChange={(e) => set('marque', e.target.value)} required placeholder="Renault" />
        </Field>
        <Field label="Modèle" required>
          <Input value={v.modele} onChange={(e) => set('modele', e.target.value)} required placeholder="Clio IV" />
        </Field>
        <Field label="Génération">
          <Input value={v.generation ?? ''} onChange={(e) => set('generation', e.target.value)} placeholder="IV (2012–2019)" />
        </Field>
        <Field label="Finition">
          <Input value={v.finition ?? ''} onChange={(e) => set('finition', e.target.value)} placeholder="Intens" />
        </Field>
        <Field label="Année" required>
          <Input type="number" min={1950} max={2100} value={v.annee} onChange={(e) => set('annee', Number(e.target.value))} required />
        </Field>
        <Field label="Première immatriculation">
          <Input type="date" value={v.premiereImmatriculation ?? ''} onChange={(e) => set('premiereImmatriculation', e.target.value)} />
        </Field>
        <Field label="Motorisation">
          <Input value={v.motorisation ?? ''} onChange={(e) => set('motorisation', e.target.value)} placeholder="1.2 TCe 120" />
        </Field>
        <Field label="Code moteur">
          <Input value={v.codeMoteur ?? ''} onChange={(e) => set('codeMoteur', e.target.value)} placeholder="H5FT" />
        </Field>
        <Field label="Cylindrée (cm³)">
          <Input type="number" min={0} value={v.cylindreeCm3 ?? ''} onChange={(e) => set('cylindreeCm3', e.target.value ? Number(e.target.value) : undefined)} />
        </Field>
        <Field label="Carburant" required>
          <Select value={v.carburant} onChange={(e) => set('carburant', e.target.value as Carburant)}>
            {Object.entries(CARBURANT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Transmission">
          <Select value={v.transmission ?? ''} onChange={(e) => set('transmission', (e.target.value || undefined) as Transmission | undefined)}>
            <option value="">—</option>
            <option value="manuelle">Manuelle</option>
            <option value="automatique">Automatique</option>
            <option value="semi_automatique">Semi-automatique</option>
          </Select>
        </Field>
        <Field label="VIN (17 caractères)">
          <Input value={v.vin ?? ''} onChange={(e) => set('vin', e.target.value.toUpperCase())} maxLength={17} placeholder="VF1..." className="uppercase" />
        </Field>
        <Field label="Immatriculation">
          <Input value={v.immatriculation ?? ''} onChange={(e) => set('immatriculation', e.target.value.toUpperCase())} placeholder="AB-123-CD" className="uppercase" />
        </Field>
        <Field label="Date d'acquisition">
          <Input type="date" value={v.dateAcquisition ?? ''} onChange={(e) => set('dateAcquisition', e.target.value)} />
        </Field>
        <Field label="Kilométrage actuel (km)" required>
          <Input type="number" min={0} value={v.kilometrageActuel} onChange={(e) => set('kilometrageActuel', Math.max(0, Number(e.target.value)))} required />
        </Field>
        <Field label="Couleur">
          <Input value={v.couleur ?? ''} onChange={(e) => set('couleur', e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea rows={2} value={v.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </Field>
      <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer les modifications' : 'Ajouter le véhicule'} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Intervention (carnet d'entretien)
// ---------------------------------------------------------------------------

export interface ServiceRecordFormValues {
  record: Omit<ServiceRecord, 'id' | 'createdAt' | 'updatedAt'>
  items: Array<Omit<ServiceRecordItem, 'id' | 'serviceRecordId'>>
}

export function ServiceRecordForm({
  vehicleId,
  initial,
  initialItems,
  onSubmit,
  onCancel,
}: {
  vehicleId: string
  initial?: ServiceRecord
  initialItems?: ServiceRecordItem[]
  onSubmit: (v: ServiceRecordFormValues) => void
  onCancel: () => void
}) {
  const [r, setR] = useState<Omit<ServiceRecord, 'id' | 'createdAt' | 'updatedAt'>>(
    initial
      ? { ...initial }
      : {
          vehicleId,
          date: todayISO(),
          kilometrage: 0,
          categorie: 'vidange',
          titre: '',
          statut: 'effectue',
          realisateur: 'proprietaire',
          sourceInformation: 'declare',
        },
  )
  const [items, setItems] = useState<Array<Omit<ServiceRecordItem, 'id' | 'serviceRecordId'>>>(
    initialItems?.map((i) => ({ kind: i.kind, libelle: i.libelle, reference: i.reference, marque: i.marque, quantite: i.quantite, prixUnitaire: i.prixUnitaire, prixTotal: i.prixTotal })) ?? [],
  )
  const set = <K extends keyof typeof r>(k: K, val: (typeof r)[K]) => setR((x) => ({ ...x, [k]: val }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (r.titre.trim()) onSubmit({ record: r, items })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Intitulé" required>
          <Input value={r.titre} onChange={(e) => set('titre', e.target.value)} required placeholder="Vidange moteur" />
        </Field>
        <Field label="Catégorie" required>
          <Select value={r.categorie} onChange={(e) => set('categorie', e.target.value as ServiceCategory)}>
            {SERVICE_CATEGORY_KEYS.map((c) => (
              <option key={c} value={c}>
                {SERVICE_CATEGORIES[c].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" required>
          <Input type="date" value={r.date} onChange={(e) => set('date', e.target.value)} required />
        </Field>
        <Field label="Kilométrage (km)" required>
          <Input type="number" min={0} value={r.kilometrage} onChange={(e) => set('kilometrage', Math.max(0, Number(e.target.value)))} required />
        </Field>
        <Field label="Statut" required>
          <Select value={r.statut} onChange={(e) => set('statut', e.target.value as ServiceStatus)}>
            {Object.entries(SERVICE_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Réalisé par" required>
          <Select value={r.realisateur} onChange={(e) => set('realisateur', e.target.value as ServiceActor)}>
            <option value="proprietaire">Propriétaire</option>
            <option value="garage">Garage</option>
            <option value="professionnel">Professionnel</option>
          </Select>
        </Field>
        <Field label="Garage / atelier">
          <Input value={r.garage ?? ''} onChange={(e) => set('garage', e.target.value)} />
        </Field>
        <Field label="Coût total (€)" hint="Facultatif — laisser vide si inconnu">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={r.coutTotal ?? ''}
            onChange={(e) => set('coutTotal', e.target.value ? Number(e.target.value) : undefined)}
          />
        </Field>
        <Field label="Origine de l'information">
          <Select value={r.sourceInformation} onChange={(e) => set('sourceInformation', e.target.value as SourceInformation)}>
            <option value="declare">Déclaré (sans justificatif)</option>
            <option value="documente">Justifié par un document</option>
            <option value="verifie">Vérifié par un professionnel</option>
          </Select>
        </Field>
      </div>
      <Field label="Description">
        <Textarea rows={2} value={r.description ?? ''} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea rows={2} value={r.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </Field>

      {/* Lignes : pièces, consommables, main-d'œuvre */}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Pièces, consommables, main-d&apos;œuvre</p>
          <Button
            variant="outline"
            onClick={() =>
              setItems((x) => [...x, { kind: 'piece', libelle: '', quantite: 1 }])
            }
          >
            + Ligne
          </Button>
        </div>
        {items.length === 0 && <p className="text-xs text-slate-400">Aucune ligne pour l&apos;instant.</p>}
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-3">
                <Select
                  value={it.kind}
                  onChange={(e) =>
                    setItems((x) => x.map((v, i) => (i === idx ? { ...v, kind: e.target.value as ItemKind } : v)))
                  }
                >
                  <option value="piece">Pièce</option>
                  <option value="consommable">Consommable</option>
                  <option value="main_oeuvre">Main-d&apos;œuvre</option>
                  <option value="prestation">Prestation</option>
                  <option value="autre">Autre</option>
                </Select>
              </div>
              <div className="col-span-4">
                <Input
                  placeholder="Désignation"
                  value={it.libelle}
                  onChange={(e) => setItems((x) => x.map((v, i) => (i === idx ? { ...v, libelle: e.target.value } : v)))}
                />
              </div>
              <div className="col-span-2">
                <Input
                  placeholder="Réf."
                  value={it.reference ?? ''}
                  onChange={(e) => setItems((x) => x.map((v, i) => (i === idx ? { ...v, reference: e.target.value } : v)))}
                />
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  min={1}
                  value={it.quantite}
                  onChange={(e) => setItems((x) => x.map((v, i) => (i === idx ? { ...v, quantite: Number(e.target.value) } : v)))}
                />
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="€"
                  value={it.prixTotal ?? ''}
                  onChange={(e) => setItems((x) => x.map((v, i) => (i === idx ? { ...v, prixTotal: e.target.value ? Number(e.target.value) : undefined } : v)))}
                />
              </div>
              <div className="col-span-1">
                <Button
                  variant="ghost"
                  className="px-2"
                  onClick={() => setItems((x) => x.filter((_, i) => i !== idx))}
                  aria-label="Supprimer la ligne"
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer les modifications' : "Ajouter l'intervention"} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Panne
// ---------------------------------------------------------------------------

export function FaultForm({
  vehicleId,
  initial,
  onSubmit,
  onCancel,
}: {
  vehicleId: string
  initial?: FaultAndTest
  onSubmit: (f: Omit<FaultAndTest, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}) {
  const [f, setF] = useState<Omit<FaultAndTest, 'id' | 'createdAt' | 'updatedAt'>>(
    initial
      ? { ...initial }
      : {
          vehicleId,
          symptomes: '',
          dateSignalement: todayISO(),
          statut: 'ouvert',
          sourceInformation: 'declare',
        },
  )
  const set = <K extends keyof typeof f>(k: K, val: (typeof f)[K]) => setF((x) => ({ ...x, [k]: val }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (f.symptomes.trim()) onSubmit(f)
      }}
    >
      <Field label="Symptômes" required>
        <Textarea rows={2} value={f.symptomes} onChange={(e) => set('symptomes', e.target.value)} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date de signalement" required>
          <Input type="date" value={f.dateSignalement} onChange={(e) => set('dateSignalement', e.target.value)} required />
        </Field>
        <Field label="Date de résolution">
          <Input type="date" value={f.dateResolution ?? ''} onChange={(e) => set('dateResolution', e.target.value)} />
        </Field>
        <Field label="Statut" required>
          <Select value={f.statut} onChange={(e) => set('statut', e.target.value as FaultStatus)}>
            {Object.entries(FAULT_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Codes défaut">
          <Input value={f.codesDefaut ?? ''} onChange={(e) => set('codesDefaut', e.target.value)} placeholder="P0301" />
        </Field>
      </div>
      <Field label="Circonstances d'apparition">
        <Textarea rows={2} value={f.circonstances ?? ''} onChange={(e) => set('circonstances', e.target.value)} />
      </Field>
      <Field label="Hypothèses">
        <Textarea rows={2} value={f.hypothese ?? ''} onChange={(e) => set('hypothese', e.target.value)} />
      </Field>
      <Field label="Tests réalisés">
        <Textarea rows={2} value={f.testsRealises ?? ''} onChange={(e) => set('testsRealises', e.target.value)} />
      </Field>
      <Field label="Résultats">
        <Textarea rows={2} value={f.resultat ?? ''} onChange={(e) => set('resultat', e.target.value)} />
      </Field>
      <Field label="Pièces remplacées">
        <Textarea rows={2} value={f.piecesRemplacees ?? ''} onChange={(e) => set('piecesRemplacees', e.target.value)} />
      </Field>
      <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer les modifications' : 'Ajouter la panne'} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Dépense
// ---------------------------------------------------------------------------

export function ExpenseForm({
  vehicleId,
  initial,
  onSubmit,
  onCancel,
  serviceRecordOptions,
  purchaseOptions,
}: {
  vehicleId: string
  initial?: ExpenseEntry
  onSubmit: (e: Omit<ExpenseEntry, 'id' | 'createdAt'>) => void
  onCancel: () => void
  serviceRecordOptions: ServiceRecord[]
  purchaseOptions: PartPurchase[]
}) {
  const [e, setE] = useState<Omit<ExpenseEntry, 'id' | 'createdAt'>>(
    initial
      ? { ...initial }
      : {
          vehicleId,
          date: todayISO(),
          categorie: 'pieces',
          libelle: '',
          montant: 0,
          inconnu: false,
          link: 'aucun',
        },
  )
  const set = <K extends keyof typeof e>(k: K, val: (typeof e)[K]) => setE((x) => ({ ...x, [k]: val }))

  return (
    <form
      className="space-y-4"
      onSubmit={(ev) => {
        ev.preventDefault()
        if (e.libelle.trim()) onSubmit(e)
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Libellé" required>
          <Input value={e.libelle} onChange={(ev) => set('libelle', ev.target.value)} required />
        </Field>
        <Field label="Date" required>
          <Input type="date" value={e.date} onChange={(ev) => set('date', ev.target.value)} required />
        </Field>
        <Field label="Montant (€)" required>
          <Input type="number" min={0} step={0.01} value={e.montant} onChange={(ev) => set('montant', Number(ev.target.value))} required />
        </Field>
        <Field label="Remboursement (€)">
          <Input type="number" min={0} step={0.01} value={e.remboursement ?? ''} onChange={(ev) => set('remboursement', ev.target.value ? Number(ev.target.value) : undefined)} />
        </Field>
        <Field label="Catégorie">
          <Select value={e.categorie} onChange={(ev) => set('categorie', ev.target.value as ExpenseCategory)} disabled={e.inconnu}>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lien avec une intervention" hint="Évite le double comptage">
          <Select value={e.link} onChange={(ev) => set('link', ev.target.value as ExpenseEntry['link'])}>
            <option value="aucun">Aucun</option>
            <option value="service_record">Intervention enregistrée</option>
            <option value="purchase">Achat de pièces</option>
          </Select>
        </Field>
        {e.link === 'service_record' && (
          <Field label="Intervention concernée">
            <Select value={e.serviceRecordId ?? ''} onChange={(ev) => set('serviceRecordId', ev.target.value || undefined)}>
              <option value="">—</option>
              {serviceRecordOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.date} · {r.titre}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {e.link === 'purchase' && (
          <Field label="Achat concerné">
            <Select value={e.purchaseId ?? ''} onChange={(ev) => set('purchaseId', ev.target.value || undefined)}>
              <option value="">—</option>
              {purchaseOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.date} · {p.libelle}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={e.inconnu} onChange={(ev) => set('inconnu', ev.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
        <span className="text-sm text-slate-700">Nature de la dépense inconnue (non catégorisée)</span>
      </label>
      <Field label="Notes">
        <Textarea rows={2} value={e.notes ?? ''} onChange={(ev) => set('notes', ev.target.value)} />
      </Field>
      <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer les modifications' : 'Ajouter la dépense'} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Justificatif (métadonnées — le fichier est géré par le stockage privé)
// ---------------------------------------------------------------------------

export function DocumentForm({
  vehicleId,
  serviceRecordOptions,
  onSubmit,
  onCancel,
}: {
  vehicleId: string
  serviceRecordOptions: ServiceRecord[]
  onSubmit: (d: Omit<DocumentEntry, 'id' | 'createdAt'>) => void
  onCancel: () => void
}) {
  const [d, setD] = useState<Omit<DocumentEntry, 'id' | 'createdAt'>>({
    vehicleId,
    filename: '',
    mimeType: 'application/pdf',
    tailleOctets: 0,
    dateDocument: todayISO(),
    kind: 'facture',
    disponible: false,
  })
  const set = <K extends keyof typeof d>(k: K, val: (typeof d)[K]) => setD((x) => ({ ...x, [k]: val }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (d.filename.trim()) onSubmit(d)
      }}
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Mode démonstration : seule la fiche du justificatif est enregistrée. Le stockage privé des
        fichiers (Supabase Storage) sera activé à l&apos;étape 6 — les rapports signalent
        explicitement les fichiers non accessibles.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du fichier" required>
          <Input value={d.filename} onChange={(e) => set('filename', e.target.value)} required placeholder="facture-vidange.pdf" />
        </Field>
        <Field label="Type">
          <Select value={d.kind} onChange={(e) => set('kind', e.target.value as DocumentEntry['kind'])}>
            <option value="facture">Facture</option>
            <option value="photo">Photo</option>
            <option value="pv_controle">PV de contrôle</option>
            <option value="autre">Autre</option>
          </Select>
        </Field>
        <Field label="Date du document">
          <Input type="date" value={d.dateDocument} onChange={(e) => set('dateDocument', e.target.value)} />
        </Field>
        <Field label="Taille (octets)">
          <Input type="number" min={0} value={d.tailleOctets} onChange={(e) => set('tailleOctets', Number(e.target.value))} />
        </Field>
        <Field label="Intervention associée">
          <Select value={d.serviceRecordId ?? ''} onChange={(e) => set('serviceRecordId', e.target.value || undefined)}>
            <option value="">—</option>
            {serviceRecordOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.date} · {r.titre}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <FormActions onCancel={onCancel} submitLabel="Ajouter le justificatif" />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Rappel & relevé kilométrique
// ---------------------------------------------------------------------------

export function ReminderForm({
  vehicleId,
  onSubmit,
  onCancel,
}: {
  vehicleId: string
  onSubmit: (r: Omit<Reminder, 'id' | 'createdAt'>) => void
  onCancel: () => void
}) {
  const [r, setR] = useState<Omit<Reminder, 'id' | 'createdAt'>>({
    vehicleId,
    categorie: 'vidange',
    libelle: '',
    declencheur: 'km',
    statut: 'a_faire',
  })
  const set = <K extends keyof typeof r>(k: K, val: (typeof r)[K]) => setR((x) => ({ ...x, [k]: val }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (r.libelle.trim()) onSubmit(r)
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Libellé" required>
          <Input value={r.libelle} onChange={(e) => set('libelle', e.target.value)} required placeholder="Prochaine vidange" />
        </Field>
        <Field label="Catégorie">
          <Select value={r.categorie} onChange={(e) => set('categorie', e.target.value as ServiceCategory)}>
            {SERVICE_CATEGORY_KEYS.map((c) => (
              <option key={c} value={c}>
                {SERVICE_CATEGORIES[c].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Déclencheur">
          <Select value={r.declencheur} onChange={(e) => set('declencheur', e.target.value as ReminderTrigger)}>
            <option value="km">Kilométrage</option>
            <option value="date">Date</option>
            <option value="km_et_date">Kilométrage et date</option>
          </Select>
        </Field>
        <Field label="Statut">
          <Select value={r.statut} onChange={(e) => set('statut', e.target.value as ReminderStatus)}>
            <option value="a_faire">À faire</option>
            <option value="en_retard">En retard</option>
            <option value="fait">Fait</option>
            <option value="annule">Annulé</option>
          </Select>
        </Field>
        {r.declencheur !== 'date' && (
          <Field label="Seuil kilométrique (km)">
            <Input type="number" min={0} value={r.seuilKm ?? ''} onChange={(e) => set('seuilKm', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
        )}
        {r.declencheur !== 'km' && (
          <Field label="Date cible">
            <Input type="date" value={r.dateCible ?? ''} onChange={(e) => set('dateCible', e.target.value)} />
          </Field>
        )}
      </div>
      <FormActions onCancel={onCancel} submitLabel="Ajouter le rappel" />
    </form>
  )
}

export function ReadingForm({
  vehicleId,
  onSubmit,
  onCancel,
}: {
  vehicleId: string
  onSubmit: (r: Omit<OdometerReading, 'id' | 'createdAt'>) => void
  onCancel: () => void
}) {
  const [r, setR] = useState<Omit<OdometerReading, 'id' | 'createdAt'>>({
    vehicleId,
    date: todayISO(),
    valeurKm: 0,
    source: 'utilisateur',
    sourceInformation: 'declare',
  })
  const set = <K extends keyof typeof r>(k: K, val: (typeof r)[K]) => setR((x) => ({ ...x, [k]: val }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(r)
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" required>
          <Input type="date" value={r.date} onChange={(e) => set('date', e.target.value)} required />
        </Field>
        <Field label="Kilométrage (km)" required>
          <Input type="number" min={0} value={r.valeurKm} onChange={(e) => set('valeurKm', Math.max(0, Number(e.target.value)))} required />
        </Field>
        <Field label="Source">
          <Select value={r.source} onChange={(e) => set('source', e.target.value as OdometerSource)}>
            <option value="utilisateur">Utilisateur</option>
            <option value="facture">Facture</option>
            <option value="professionnel">Professionnel</option>
            <option value="controle">Contrôle technique</option>
          </Select>
        </Field>
        <Field label="Origine de l'information">
          <Select value={r.sourceInformation} onChange={(e) => set('sourceInformation', e.target.value as SourceInformation)}>
            <option value="declare">Déclaré</option>
            <option value="documente">Documenté</option>
            <option value="verifie">Vérifié</option>
          </Select>
        </Field>
      </div>
      <FormActions onCancel={onCancel} submitLabel="Ajouter le relevé" />
    </form>
  )
}
