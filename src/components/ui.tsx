'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { classNames } from '@/lib/domain/format'

// ---------------------------------------------------------------------------
// Boutons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'

export function Button({
  children,
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20 focus-visible:outline-brand-600',
    secondary: 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900 dark:bg-[#334155] dark:hover:bg-[#475569]',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-slate-400',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600',
  }
  return (
    <button
      type="button"
      className={classNames(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Cartes, titres, badges
// ---------------------------------------------------------------------------

export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames('rounded-2xl border border-slate-200 bg-white shadow-sm', className)} {...props}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={classNames('mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4', className)}>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{children}</h2>
      {action}
    </div>
  )
}

export function Badge({
  children,
  tone = 'slate',
  className,
}: {
  children: React.ReactNode
  tone?: 'slate' | 'brand' | 'green' | 'amber' | 'rose' | 'sky'
  className?: string
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  }
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Champs de formulaire
// ---------------------------------------------------------------------------

export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'block min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 sm:text-sm ' +
  'focus:border-brand-500 focus:outline-2 focus:outline-brand-500/20 disabled:bg-slate-50 disabled:text-slate-400'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={classNames(inputClass, props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={classNames(inputClass, props.className)} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={classNames(inputClass, 'resize-y', props.className)} />
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

// ---------------------------------------------------------------------------
// Modale
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/50 p-0 backdrop-blur-sm dark:bg-black/60 sm:items-center sm:p-6">
      <div
        className={classNames(
          'flex max-h-[min(92dvh,100%)] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-5">{children}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// État vide & progression
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Progress({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'amber' | 'rose' | 'green' }) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={classNames('h-full rounded-full transition-all', tones[tone])}
        style={{ width: `${Math.max(3, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div aria-label="Sections" className="flex max-w-full gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={active === t.id}
          onClick={() => onChange(t.id)}
          className={classNames(
            'min-h-11 shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition',
            active === t.id ? 'bg-slate-900 text-white dark:bg-[#334155]' : 'text-slate-600 hover:bg-slate-50',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
