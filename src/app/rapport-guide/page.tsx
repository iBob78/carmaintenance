'use client'

import Link from 'next/link'
import { ArrowRight, FileText, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { useStore } from '@/lib/data/store'
import { Button, Card, SectionTitle } from '@/components/ui'

export default function ReportGuidePage() {
  const { db, ready } = useStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Le rapport de vente PDF
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Un dossier professionnel à remettre à un acheteur : historique complet, justificatifs,
          dépenses, travaux à prévoir — généré uniquement à partir de vos données réelles.
        </p>
      </div>

      <Card className="p-6">
        <SectionTitle>Le parcours</SectionTitle>
        <ol className="space-y-3">
          {[
            ['Vérifier les données', 'Les données manquantes et incohérences sont signalées avant génération — jamais corrigées automatiquement.'],
            ['Choisir les options', 'Sections, période, coûts, pièces jointes, masquage du VIN / immatriculation / données personnelles.'],
            ['Prévisualiser', 'Un aperçu fidèle du document final, y compris les mentions de confidentialité.'],
            ['Générer & télécharger', 'PDF A4 validé, paginé, avec sommaire automatique et pied de page identifiant le véhicule.'],
          ].map(([title, desc], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Transparence & confidentialité
            </span>
          </SectionTitle>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li>· Aucune donnée inventée : le rapport reflète uniquement ce qui est enregistré.</li>
            <li>· Une absence de panne enregistrée n&apos;est jamais présentée comme une preuve de bon état.</li>
            <li>· Une pièce jointe inaccessible est signalée, jamais omise silencieusement.</li>
            <li>· Le masquage est appliqué avant la mise en page : les champs masqués ne peuvent pas figurer dans le PDF.</li>
            <li>· Un instantané des données et des options est conservé pour la reproductibilité de chaque export.</li>
          </ul>
        </Card>

        <Card className="p-6">
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-amber-600" />
              Mentions importantes
            </span>
          </SectionTitle>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li>· Le rapport n&apos;est ni une expertise ni une certification de l&apos;état mécanique.</li>
            <li>· L&apos;acheteur est invité à faire vérifier le véhicule par un professionnel indépendant.</li>
            <li>· Les incohérences (kilométrages, chronologie) sont signalées dans le document, sans modification automatique.</li>
            <li>· Un hash de fichier ne constitue pas une preuve de véracité du contenu.</li>
          </ul>
        </Card>
      </div>

      {/* CTA par véhicule */}
      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-400" />
            Générer un rapport
          </span>
        </SectionTitle>
        {!ready || db.vehicles.length === 0 ? (
          <Card className="p-6 text-sm text-slate-500">
            Ajoutez un véhicule pour générer un rapport de vente.{' '}
            <Link href="/vehicules" className="font-medium text-brand-600 hover:underline">
              Mes véhicules →
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {db.vehicles.map((v) => (
              <Card key={v.id} className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {v.marque} {v.modele}
                  </p>
                  <p className="text-xs text-slate-500">
                    {db.serviceRecords.filter((r) => r.vehicleId === v.id).length} intervention(s) ·{' '}
                    {db.documents.filter((d) => d.vehicleId === v.id).length} justificatif(s)
                  </p>
                </div>
                <Link href={`/vehicules/${v.id}/rapport`}>
                  <Button>
                    Générer
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
