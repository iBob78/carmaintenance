'use client'

import { useState } from 'react'
import { Database, FileText, Info, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/data/store'
import { formatDateShort } from '@/lib/domain/format'
import { Badge, Button, Card, Modal, SectionTitle } from '@/components/ui'

export default function SettingsPage() {
  const { db, ready, resetToSeed, resetEmpty } = useStore()
  const [confirm, setConfirm] = useState<'seed' | 'empty' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!ready) return <p className="text-sm text-slate-500">Chargement…</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Réglages</h1>
        <p className="mt-1 text-sm text-slate-500">
          Données de démonstration, historique des exports et informations.
        </p>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          {message}
        </div>
      )}

      {/* Données */}
      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <Database className="h-5 w-5 text-slate-400" />
            Données de démonstration
          </span>
        </SectionTitle>
        <Card className="p-6">
          <p className="text-sm text-slate-600">
            L&apos;application fonctionne actuellement en <strong>mode démonstration</strong> : les
            données (véhicules fictifs, interventions, dépenses) sont stockées localement dans votre
            navigateur. La connexion à Supabase (PostgreSQL, Auth, Storage privé) est prévue à
            l&apos;étape 6 du plan de développement.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setConfirm('seed')}>
              <RefreshCw className="h-4 w-4" />
              Restaurer les données fictives
            </Button>
            <Button variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={() => setConfirm('empty')}>
              <Trash2 className="h-4 w-4" />
              Tout effacer (repartir à zéro)
            </Button>
          </div>
        </Card>
      </section>

      {/* Exports */}
      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            Historique des rapports générés
          </span>
        </SectionTitle>
        <Card className="overflow-hidden">
          {db.reportExports.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400">
              Aucun rapport de vente généré pour l&apos;instant. Chaque export conserve un instantané
              des données et des options pour garantir la reproductibilité.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {db.reportExports.map((e) => {
                const vehicle = db.vehicles.find((v) => v.id === e.vehicleId)
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {vehicle ? `${vehicle.marque} ${vehicle.modele}` : e.vehicleId}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateShort(e.createdAt)} · {e.anomalies.length} anomalie(s) signalée(s)
                        {e.pdfTailleOctets ? ` · ${(e.pdfTailleOctets / 1024).toFixed(0)} Ko` : ''}
                      </p>
                    </div>
                    <Badge tone="slate">Instantané conservé</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </section>

      {/* Infos */}
      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <Info className="h-5 w-5 text-slate-400" />
            À propos
          </span>
        </SectionTitle>
        <Card className="space-y-3 p-6 text-xs text-slate-500">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            En mode démonstration, aucune donnée n&apos;est envoyée sur Internet. Avec Supabase, les
            politiques RLS garantissent que chaque utilisateur n&apos;accède qu&apos;à ses véhicules et
            documents ; les fichiers sont stockés dans un espace privé.
          </p>
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            Le rapport de vente est un historique des opérations enregistrées : il n&apos;est ni une
            expertise, ni une certification de l&apos;état mécanique. Un hash de fichier ne constitue
            pas une preuve de véracité du contenu.
          </p>
          <p className="flex items-start gap-2">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            AutoCarnet — application open source sous licence GPL-3.0. Pensez à exporter vos données
            régulièrement (fonctionnalité prévue avec la connexion Supabase).
          </p>
        </Card>
      </section>

      {/* Confirmation */}
      <Modal open={confirm != null} onClose={() => setConfirm(null)} title="Confirmer l'opération">
        <p className="text-sm text-slate-600">
          {confirm === 'seed'
            ? 'Les données actuelles seront remplacées par le jeu de démonstration (véhicules fictifs). Cette action est irréversible.'
            : 'Toutes les données seront supprimées. Vous repartirez d’un compte vide. Cette action est irréversible.'}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm === 'seed') {
                resetToSeed()
                setMessage('Jeu de démonstration restauré.')
              } else {
                resetEmpty()
                setMessage('Toutes les données ont été supprimées.')
              }
              setConfirm(null)
            }}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </div>
  )
}
