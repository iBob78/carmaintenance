// Totaux de dépenses : remboursements, double comptage, catégories.
import { describe, expect, it } from 'vitest'
import { computeExpenseTotals, standalonePurchases, serviceRecordsCost } from '@/lib/domain/totals'
import type { AppDatabase, ExpenseEntry } from '@/lib/domain/types'

function exp(partial: Partial<ExpenseEntry> & { montant: number }): ExpenseEntry {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    vehicleId: 'v1',
    date: '2026-01-15',
    categorie: 'pieces',
    libelle: 'Test',
    inconnu: false,
    link: 'aucun',
    createdAt: '',
    ...partial,
  }
}

describe('computeExpenseTotals', () => {
  it('calcule brut, remboursements et net', () => {
    const totals = computeExpenseTotals([
      exp({ montant: 100, remboursement: 30 }),
      exp({ montant: 50 }),
    ])
    expect(totals.brut).toBe(150)
    expect(totals.remboursements).toBe(30)
    expect(totals.net).toBe(120)
    expect(totals.nbDepenses).toBe(2)
  })

  it('ventile par catégorie (net) et par année', () => {
    const totals = computeExpenseTotals([
      exp({ montant: 100, categorie: 'pieces', date: '2025-06-01' }),
      exp({ montant: 40, categorie: 'main_oeuvre', date: '2026-02-01' }),
      exp({ montant: 20, categorie: 'autre', date: '2026-03-01', inconnu: true }),
    ])
    expect(totals.parCategorie['pieces']).toBe(100)
    expect(totals.parCategorie['main_oeuvre']).toBe(40)
    expect(totals.parCategorie['inconnu']).toBe(20)
    expect(totals.inconnues).toBe(20)
    expect(totals.parAnnee[2025].brut).toBe(100)
    expect(totals.parAnnee[2026].net).toBe(60)
  })

  it('filtre sur la période demandée', () => {
    const totals = computeExpenseTotals(
      [
        exp({ montant: 10, date: '2024-01-01' }),
        exp({ montant: 20, date: '2026-01-01' }),
      ],
      { from: '2025-01-01', to: '2026-12-31' },
    )
    expect(totals.brut).toBe(20)
    expect(totals.nbDepenses).toBe(1)
  })

  it('distingue les dépenses liées aux interventions et aux achats', () => {
    const totals = computeExpenseTotals([
      exp({ montant: 300, link: 'service_record', serviceRecordId: 'srv-1' }),
      exp({ montant: 50, link: 'purchase', purchaseId: 'pur-1' }),
    ])
    expect(totals.lieesInterventions).toBe(300)
    expect(totals.achatsPieces).toBe(50)
    // Le net total compte chaque dépense une seule fois
    expect(totals.net).toBe(350)
  })

  it('arrondit proprement les centimes', () => {
    const totals = computeExpenseTotals([
      exp({ montant: 10.1 }),
      exp({ montant: 10.2 }),
      exp({ montant: 10.3 }),
    ])
    expect(totals.brut).toBe(30.6)
    expect(totals.net).toBe(30.6)
  })
})

describe('anti double comptage', () => {
  const db = {
    vehicles: [],
    odometerReadings: [],
    maintenanceTasks: [],
    serviceRecords: [
      { id: 'srv-1', vehicleId: 'v1', date: '2026-01-01', kilometrage: 1000, categorie: 'vidange', titre: 'Vidange', statut: 'effectue', realisateur: 'garage', coutTotal: 90, sourceInformation: 'documente', createdAt: '', updatedAt: '' },
      { id: 'srv-2', vehicleId: 'v1', date: '2026-02-01', kilometrage: 2000, categorie: 'freins', titre: 'Freins', statut: 'annule', realisateur: 'garage', coutTotal: 200, sourceInformation: 'declare', createdAt: '', updatedAt: '' },
    ],
    serviceRecordItems: [],
    faults: [],
    purchases: [
      { id: 'pur-1', vehicleId: 'v1', date: '2026-01-05', libelle: 'Bougies', quantite: 4, prixTotal: 48, createdAt: '' },
      { id: 'pur-2', vehicleId: 'v1', date: '2026-01-06', libelle: 'Filtre', quantite: 1, prixTotal: 12, createdAt: '' },
    ],
    documents: [],
    expenses: [
      exp({ montant: 48, link: 'purchase', purchaseId: 'pur-1' }),
    ],
    reminders: [],
    reportExports: [],
  } as unknown as AppDatabase

  it('exclut les achats déjà portés par une dépense', () => {
    const standalone = standalonePurchases(db, 'v1')
    expect(standalone.map((p) => p.id)).toEqual(['pur-2'])
  })

  it('ne compte pas les interventions annulées dans le coût des interventions', () => {
    expect(serviceRecordsCost(db, 'v1')).toBe(90)
  })
})
