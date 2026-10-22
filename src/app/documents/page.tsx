'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, FolderOpen, Search } from 'lucide-react'
import { useStore } from '@/lib/data/store'
import { formatDateShort } from '@/lib/domain/format'
import { Badge, Card, EmptyState, Input, SectionTitle } from '@/components/ui'

export default function DocumentsPage() {
  const { db, ready } = useStore()
  const [search, setSearch] = useState('')

  if (!ready) return <p className="text-sm text-slate-500">Chargement…</p>

  const filtered = db.documents
    .filter((d) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return `${d.filename} ${d.id} ${d.kind}`.toLowerCase().includes(q)
    })
    .sort((a, b) => (a.dateDocument < b.dateDocument ? 1 : -1))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documents & justificatifs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Index des factures, photos et PV de contrôle — stockage privé, rattachement aux
          interventions.
        </p>
      </div>

      <Card className="flex items-center gap-3 p-4">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un justificatif…"
            className="pl-9"
          />
        </div>
        <div className="ml-auto text-sm text-slate-500">
          {filtered.length} document{filtered.length > 1 ? 's' : ''}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title="Aucun justificatif"
          description="Ajoutez des factures et photos depuis le carnet d'entretien de vos véhicules."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {filtered.map((d) => {
              const vehicle = db.vehicles.find((v) => v.id === d.vehicleId)
              const record = db.serviceRecords.find((r) => r.id === d.serviceRecordId)
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <FileText className="h-4.5 w-4.5 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{d.filename}</p>
                    <p className="text-xs text-slate-500">
                      ID {d.id.slice(0, 12)} · {formatDateShort(d.dateDocument)} ·{' '}
                      {d.kind === 'facture' ? 'Facture' : d.kind === 'photo' ? 'Photo' : d.kind === 'pv_controle' ? 'PV de contrôle' : 'Autre'}
                      {vehicle ? (
                        <>
                          {' · '}
                          <Link href={`/vehicules/${vehicle.id}`} className="text-brand-600 hover:underline">
                            {vehicle.marque} {vehicle.modele}
                          </Link>
                        </>
                      ) : null}
                      {record ? ` · « ${record.titre} »` : ''}
                    </p>
                  </div>
                  <Badge tone={d.disponible ? 'green' : 'amber'}>
                    {d.disponible ? 'Disponible' : 'Fichier non stocké (démo)'}
                  </Badge>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
