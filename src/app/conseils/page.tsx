import Link from 'next/link'
import { BookOpen, Lightbulb, TriangleAlert } from 'lucide-react'
import { Badge, Card, SectionTitle } from '@/components/ui'
import {
  adviceCategories,
  adviceMilestones,
  adviceSevere,
  adviceSources,
  adviceTips,
  type AdviceCategory,
  type AdviceItem,
} from '@/lib/data/advice'

const CATEGORY_ORDER: AdviceCategory[] = ['controler', 'remplacer', 'rotation']

function groupByCategory(items: AdviceItem[]): Array<{ categorie: AdviceCategory; items: AdviceItem[] }> {
  return CATEGORY_ORDER.map((categorie) => ({
    categorie,
    items: items.filter((item) => item.categorie === categorie),
  })).filter((group) => group.items.length > 0)
}

export default function ConseilsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Jalons d’entretien</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Des repères généraux pour anticiper l’entretien, inspirés du guide CarGurus « Manufacturer
          Recommended Maintenance », adaptés en kilomètres. Les valeurs de votre carnet d’entretien
          constructeur restent la seule référence pour votre véhicule.
        </p>
        <div className="mt-3">
          <Badge tone="amber">À vérifier sur votre carnet d’entretien</Badge>
        </div>
      </div>

      {/* Jalons par kilométrage */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {adviceMilestones.map((milestone) => (
          <Card key={milestone.id} className="flex flex-col overflow-hidden p-0">
            <div className="border-b border-slate-200 bg-slate-700 px-4 py-3 text-white dark:bg-[#334155]">
              <p className="text-lg font-bold tracking-tight">{milestone.titre}</p>
              <p className="mt-0.5 text-xs text-slate-300">{milestone.sousTitre}</p>
            </div>
            <div className="flex-1 space-y-4 px-4 py-4">
              {groupByCategory(milestone.items).map((group) => (
                <div key={group.categorie}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    {adviceCategories[group.categorie]}
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {group.items.map((item) => (
                      <li key={item.libelle} className="text-sm text-slate-600">
                        <span className="font-medium text-slate-800">· {item.libelle}</span>
                        {item.note && <p className="mt-0.5 pl-2 text-xs leading-relaxed text-slate-500">{item.note}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Conditions d'usage difficiles */}
      <Card className="border-amber-200 bg-amber-50 p-6">
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-amber-600" />
            {adviceSevere.titre}
          </span>
        </SectionTitle>
        <p className="max-w-3xl text-sm text-slate-700">{adviceSevere.texte}</p>
        <ul className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
          {adviceSevere.criteres.map((critere) => (
            <li key={critere} className="text-sm text-slate-700">
              · {critere}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-medium text-amber-800">{adviceSevere.conseil}</p>
      </Card>

      {/* Bons réflexes */}
      <Card className="p-6">
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-brand-600" />
            Les bons réflexes
          </span>
        </SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {adviceTips.map((tip) => (
            <div key={tip.id}>
              <p className="text-sm font-semibold text-slate-900">{tip.titre}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{tip.texte}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Sources */}
      <Card className="p-6">
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-slate-500" />
            Sources consultées
          </span>
        </SectionTitle>
        <ul className="space-y-2">
          {adviceSources.map((source) => (
            <li key={source.url} className="text-sm text-slate-600">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-600 underline decoration-brand-200 underline-offset-2 hover:text-brand-700"
              >
                {source.label}
              </a>
              <span className="text-xs text-slate-400"> — consulté le {source.consulte.split('-').reverse().join('/')}</span>
              {source.note && <p className="mt-0.5 text-xs text-slate-500">{source.note}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-400">
          Contenu informatif général, sans valeur contractuelle : il ne remplace pas le carnet
          d’entretien de votre véhicule.{' '}
          <Link href="/vehicules" className="text-brand-600 hover:text-brand-700">
            Voir mes véhicules
          </Link>
        </p>
      </Card>
    </div>
  )
}
