// Helpers génériques

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const euroPrecis = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const number = new Intl.NumberFormat('fr-FR')

export function formatEuro(value: number, precise = false): string {
  return (precise ? euroPrecis : euro).format(value)
}

export function formatKm(value: number): string {
  return `${number.format(Math.round(value))} km`
}

export function formatDate(iso: string): string {
  const d = parseISO(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateShort(iso: string): string {
  const d = parseISO(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatMonthYear(iso: string): string {
  const d = parseISO(iso)
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Parse yyyy-mm-dd en date locale (minuit local, pas de décalage UTC) */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addMonthsISO(iso: string, months: number): string {
  const d = parseISO(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  // Clamp sur le dernier jour du mois cible
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return toISODate(d)
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms = parseISO(toISO).getTime() - parseISO(fromISO).getTime()
  return Math.round(ms / 86_400_000)
}

export function monthsBetween(fromISO: string, toISO: string): number {
  return daysBetween(fromISO, toISO) / 30.44
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
