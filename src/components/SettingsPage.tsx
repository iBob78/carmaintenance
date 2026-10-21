import { useRef, useState } from 'react'
import {
  Database,
  Download,
  HardDriveDownload,
  Info,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { useStore } from '../store'
import { SERVICE_CATALOG, SERVICE_TYPES, vehicleLabel } from '../lib/maintenance'
import { exportJSON, importJSON } from '../lib/storage'
import { Button, Card, Input, Modal, SectionTitle, Select } from './ui'
import { ServiceIcon } from './ServiceIcon'

export function SettingsPage() {
  const { data, replaceAll, resetAll, updateInterval } = useStore()
  const [vehicleId, setVehicleId] = useState(data.vehicles[0]?.id ?? '')
  const [confirmReset, setConfirmReset] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const vehicle = data.vehicles.find((v) => v.id === vehicleId) ?? data.vehicles[0]

  const handleExport = () => {
    const json = exportJSON(data)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `autocarnet-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ tone: 'ok', text: 'Sauvegarde exportée avec succès.' })
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const next = importJSON(text)
      replaceAll(next)
      setVehicleId(next.vehicles[0]?.id ?? '')
      setMessage({ tone: 'ok', text: `Import réussi : ${next.vehicles.length} véhicule(s), ${next.records.length} entretien(s).` })
    } catch {
      setMessage({ tone: 'err', text: 'Fichier invalide : impossible d’importer cette sauvegarde.' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Réglages</h1>
        <p className="mt-1 text-sm text-slate-500">
          Intervalles de révision, sauvegarde des données et préférences.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.tone === 'ok'
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
              : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Intervalles de révision */}
      <section>
        <SectionTitle
          action={
            data.vehicles.length > 1 ? (
              <Select
                value={vehicle?.id ?? ''}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-auto"
              >
                {data.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {vehicleLabel(v)}
                  </option>
                ))}
              </Select>
            ) : undefined
          }
        >
          Intervalles de révision périodique
        </SectionTitle>

        {vehicle ? (
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
              <p className="text-sm text-slate-600">
                Personnalisez les seuils de <strong>{vehicleLabel(vehicle)}</strong> selon le carnet
                d'entretien du constructeur. Laissez vide pour ignorer un déclencheur.
              </p>
            </div>
            <ul className="divide-y divide-slate-50">
              {SERVICE_TYPES.map((type) => {
                const interval = data.intervals.find(
                  (i) => i.vehicleId === vehicle.id && i.type === type,
                )
                if (!interval) return null
                return (
                  <li key={type} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                      <ServiceIcon type={type} className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{SERVICE_CATALOG[type].label}</p>
                      <p className="text-xs text-slate-400">{SERVICE_CATALOG[type].description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-500">
                        Tous les
                        <Input
                          type="number"
                          min={0}
                          step={500}
                          value={interval.intervalleKm ?? ''}
                          onChange={(e) =>
                            updateInterval({
                              ...interval,
                              intervalleKm: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="w-24 text-right"
                        />
                        km
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-500">
                        ou
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={interval.intervalleMois ?? ''}
                          onChange={(e) =>
                            updateInterval({
                              ...interval,
                              intervalleMois: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="w-16 text-right"
                        />
                        mois
                      </label>
                      <label className="ml-2 flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={interval.actif}
                          onChange={(e) => updateInterval({ ...interval, actif: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-xs text-slate-500">Actif</span>
                      </label>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        ) : (
          <Card className="p-6 text-sm text-slate-500">
            Ajoutez un véhicule pour configurer ses intervalles d'entretien.
          </Card>
        )}
      </section>

      {/* Données */}
      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <Database className="h-5 w-5 text-slate-400" />
            Données & sauvegarde
          </span>
        </SectionTitle>
        <Card className="p-6">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exporter en JSON
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Importer une sauvegarde
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImport(file)
                e.target.value = ''
              }}
            />
            <Button variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={() => setConfirmReset(true)}>
              <RefreshCw className="h-4 w-4" />
              Réinitialiser
            </Button>
          </div>

          <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <p className="flex items-start gap-2">
              <HardDriveDownload className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              Vos données sont stockées <strong>localement dans votre navigateur</strong> (localStorage) :
              rien n'est envoyé sur Internet. Pensez à exporter une sauvegarde régulièrement.
            </p>
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              Effacer les données de navigation ou utiliser un autre appareil efface également votre
              carnet : l'export JSON est votre file de sécurité.
            </p>
            <p className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              AutoCarnet est un outil de suivi personnel. Il ne remplace pas le carnet d'entretien
              officiel du constructeur ni les préconisations du garage.
            </p>
          </div>
        </Card>
      </section>

      {/* Confirmation reset */}
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Réinitialiser toutes les données ?">
        <p className="text-sm text-slate-600">
          Tous vos véhicules, entretiens et réglages seront supprimés de ce navigateur. Vous pouvez
          exporter une sauvegarde avant de continuer.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmReset(false)}>
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              handleExport()
            }}
          >
            <Download className="h-4 w-4" />
            Exporter d'abord
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetAll(false)
              setVehicleId('')
              setConfirmReset(false)
              setMessage({ tone: 'ok', text: 'Toutes les données ont été supprimées.' })
            }}
          >
            <Trash2 className="h-4 w-4" />
            Tout supprimer
          </Button>
        </div>
      </Modal>
    </div>
  )
}
