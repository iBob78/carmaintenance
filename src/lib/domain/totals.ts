// Totaux de dépenses — règles anti double-comptage :
// 1. Une dépense liée à une intervention (link='service_record') est comptée
//    comme « dépense liée à une intervention » et n'est PAS re-comptée dans
//    les achats de pièces.
// 2. Un achat de pièce possédant sa propre dépense (link='purchase') n'est
//    compté qu'une fois.
// 3. Les remboursements sont déduits du net.

import type { AppDatabase, ExpenseCategory, ExpenseEntry } from './types'
import { roundMoney, yearOf } from './format'

export interface ExpenseTotals {
  brut: number
  remboursements: number
  net: number
  parCategorie: Record<string, number>
  parAnnee: Record<number, { brut: number; net: number }>
  inconnues: number
  lieesInterventions: number
  achatsPieces: number
  nbDepenses: number
}

export function computeExpenseTotals(
  expenses: ExpenseEntry[],
  opts?: { from?: string; to?: string },
): ExpenseTotals {
  const filtered = expenses.filter((e) => {
    if (opts?.from && e.date < opts.from) return false
    if (opts?.to && e.date > opts.to) return false
    return true
  })

  const parCategorie: Record<string, number> = {}
  const parAnnee: Record<number, { brut: number; net: number }> = {}
  let brut = 0
  let remboursements = 0
  let inconnues = 0
  let lieesInterventions = 0
  let achatsPieces = 0

  for (const e of filtered) {
    brut = roundMoney(brut + e.montant)
    remboursements = roundMoney(remboursements + (e.remboursement ?? 0))
    const net = roundMoney(e.montant - (e.remboursement ?? 0))

    const cat = e.inconnu ? 'inconnu' : e.categorie
    parCategorie[cat] = roundMoney((parCategorie[cat] ?? 0) + net)

    const year = yearOf(e.date)
    const bucket = parAnnee[year] ?? { brut: 0, net: 0 }
    bucket.brut = roundMoney(bucket.brut + e.montant)
    bucket.net = roundMoney(bucket.net + net)
    parAnnee[year] = bucket

    if (e.inconnu) inconnues = roundMoney(inconnues + net)
    if (e.link === 'service_record') lieesInterventions = roundMoney(lieesInterventions + net)
    if (e.link === 'purchase') achatsPieces = roundMoney(achatsPieces + net)
  }

  return {
    brut,
    remboursements,
    net: roundMoney(brut - remboursements),
    parCategorie,
    parAnnee,
    inconnues,
    lieesInterventions,
    achatsPieces,
    nbDepenses: filtered.length,
  }
}

export function categoryOfExpense(e: ExpenseEntry): ExpenseCategory | 'inconnu' {
  return e.inconnu ? 'inconnu' : e.categorie
}

/** Coût total des interventions effectuées (hors annulées / non réalisées) */
export function serviceRecordsCost(db: AppDatabase, vehicleId: string): number {
  return roundMoney(
    db.serviceRecords
      .filter((r) => r.vehicleId === vehicleId && r.statut === 'effectue')
      .reduce((s, r) => s + (r.coutTotal ?? 0), 0),
  )
}

/**
 * Achats de pièces à afficher dans le rapport : on exclut ceux déjà portés
 * par une dépense (link='purchase') pour éviter le double comptage.
 */
export function standalonePurchases(db: AppDatabase, vehicleId: string) {
  const expenses = db.expenses.filter((e) => e.vehicleId === vehicleId && e.link === 'purchase')
  const linkedPurchaseIds = new Set(expenses.map((e) => e.purchaseId))
  return db.purchases.filter((p) => p.vehicleId === vehicleId && !linkedPurchaseIds.has(p.id))
}
