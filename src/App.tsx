import { useState } from 'react'
import {
  CalendarDays,
  Car,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  Wrench,
  X,
} from 'lucide-react'
import { StoreProvider, useStore } from './store'
import { Dashboard } from './components/Dashboard'
import { VehiclesPage } from './components/VehiclesPage'
import { RecordsPage } from './components/RecordsPage'
import { CalendarPage } from './components/CalendarPage'
import { SettingsPage } from './components/SettingsPage'
import { Modal } from './components/ui'
import { RecordForm } from './components/RecordForm'
import { classNames } from './lib/utils'

type Tab = 'dashboard' | 'vehicules' | 'entretiens' | 'calendrier' | 'reglages'

const NAV: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'vehicules', label: 'Mes véhicules', icon: Car },
  { id: 'entretiens', label: 'Entretiens', icon: Wrench },
  { id: 'calendrier', label: 'Calendrier des révisions', icon: CalendarDays },
  { id: 'reglages', label: 'Réglages', icon: Settings },
]

function Sidebar({
  tab,
  onTab,
  open,
  onClose,
}: {
  tab: Tab
  onTab: (t: Tab) => void
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={classNames(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-white transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">AutoCarnet</p>
            <p className="text-xs text-slate-400">Carnet d'entretien numérique</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTab(item.id)
                  onClose()
                }}
                className={classNames(
                  'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                  active
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-4">
          <div className="rounded-2xl bg-slate-800/80 p-4">
            <p className="text-xs font-medium text-slate-300">💡 Le saviez-vous ?</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Une vidange régulière tous les 15 000 km ou 1 an protège votre moteur et prolonge la
              durée de vie de votre véhicule.
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}

function AppShell() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [recordModal, setRecordModal] = useState(false)
  const { data, addRecord } = useStore()

  const pageTitle: Record<Tab, string> = {
    dashboard: 'Tableau de bord',
    vehicules: 'Mes véhicules',
    entretiens: 'Entretiens',
    calendrier: 'Calendrier des révisions',
    reglages: 'Réglages',
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar tab={tab} onTab={setTab} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre supérieure */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-4 px-4 py-3.5 sm:px-8">
            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="hidden text-sm font-semibold text-slate-700 sm:block">
              {pageTitle[tab]}
            </h1>
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={() => setRecordModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Ajouter un entretien</span>
                <span className="sm:hidden">Entretien</span>
              </button>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl">
            {tab === 'dashboard' && (
              <Dashboard
                onNavigate={(t) => setTab(t as Tab)}
                onAddRecord={() => setRecordModal(true)}
              />
            )}
            {tab === 'vehicules' && <VehiclesPage />}
            {tab === 'entretiens' && <RecordsPage />}
            {tab === 'calendrier' && <CalendarPage />}
            {tab === 'reglages' && <SettingsPage />}
          </div>
        </main>

        {/* Pied de page */}
        <footer className="border-t border-slate-200 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <p>
              <span className="font-semibold text-slate-500">AutoCarnet</span> — Gestion de la
              maintenance de votre véhicule · Licence GPL-3.0
            </p>
            <p>Données stockées localement dans votre navigateur.</p>
          </div>
        </footer>
      </div>

      {/* Modale d'ajout rapide d'entretien (global) */}
      <Modal
        open={recordModal}
        onClose={() => setRecordModal(false)}
        title="Ajouter un entretien"
        wide
      >
        {data.vehicles.length === 0 ? (
          <p className="text-sm text-slate-600">
            Ajoutez d'abord un véhicule depuis l'onglet « Mes véhicules » pour enregistrer des
            entretiens.
          </p>
        ) : (
          <RecordForm
            vehicles={data.vehicles}
            onSubmit={(values) => {
              addRecord({
                vehicleId: values.vehicleId,
                type: values.type,
                libelle: values.libelle,
                date: values.date,
                kilometrage: values.kilometrage,
                cout: values.cout ? Number(values.cout) : undefined,
                garage: values.garage || undefined,
                notes: values.notes || undefined,
              })
              setRecordModal(false)
              setTab('entretiens')
            }}
            onCancel={() => setRecordModal(false)}
          />
        )}
      </Modal>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  )
}
