'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarClock,
  Car,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Settings,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import { classNames } from '@/lib/domain/format'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useStore } from '@/lib/data/store'

const NAV = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/vehicules', label: 'Mes véhicules', icon: Car },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/conseils', label: 'Conseils', icon: Lightbulb },
  { href: '/reglages', label: 'Réglages', icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { ready, mode } = useStore()

  return (
    <div className="flex min-h-screen">
      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Barre latérale */}
      <aside
        className={classNames(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-white transition-transform duration-200 dark:bg-[#020617] lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">AutoCarnet</p>
            <p className="text-xs text-slate-400">Gestion automobile open source</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 dark:hover:bg-[#1e293b] lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={classNames(
                  'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                  active ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white dark:hover:bg-[#1e293b]',
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-3 p-4">
          <Link
            href="/rapport-guide"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-sm font-medium text-white transition hover:from-brand-500 hover:to-brand-700"
          >
            <Sparkles className="h-4.5 w-4.5 shrink-0" />
            <span>
              Rapport de vente PDF
              <span className="mt-0.5 block text-xs font-normal text-brand-100">
                Générez un dossier professionnel
              </span>
            </span>
          </Link>

          <div className="rounded-2xl bg-slate-800/80 p-3 text-xs text-slate-400 dark:bg-[#0f172a]">
            <p className="flex items-center gap-1.5 font-medium text-slate-300">
              <CalendarClock className="h-3.5 w-3.5" />
              {mode === 'demo' ? 'Mode démonstration' : 'Connecté à Supabase'}
            </p>
            <p className="mt-1 leading-relaxed">
              {ready
                ? mode === 'demo'
                  ? 'Données fictives stockées localement dans votre navigateur.'
                  : 'Données synchronisées avec votre projet.'
                : 'Chargement…'}
            </p>
          </div>
        </div>
      </aside>

      {/* Colonne principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-4 px-4 py-3.5 sm:px-8">
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Carnet d&apos;entretien · Pannes · Dépenses · Rapport de vente
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        <footer className="border-t border-slate-200 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <p>
              <span className="font-semibold text-slate-500">AutoCarnet</span> — application open
              source de gestion automobile · Licence GPL-3.0
            </p>
            <p>Le rapport de vente n&apos;est ni une expertise ni une certification mécanique.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
