// Détection d'anomalies : incohérences km, dates futures, totaux, documents.
import { describe, expect, it } from 'vitest'
import { detectAnomalies, missingVehicleFields } from '@/lib/domain/anomalies'
import { buildSeedDatabase } from '@/lib/data/demo/seed'
import type { AppDatabase } from '@/lib/domain/types'

describe('detectAnomalies', () => {
  it("signale un kilométrage qui diminue entre deux relevés", () => {
    const db = buildSeedDatabase()
    db.odometerReadings.push({
      id: 'odo-x', vehicleId: 'veh-clio-demo', date: '2026-10-01', valeurKm: 80000,
      source: 'utilisateur', sourceInformation: 'declare', createdAt: '',
    })
    const anomalies = detectAnomalies(db, 'veh-clio-demo')
    expect(anomalies.some((a) => a.code === 'km_diminue' && a.severity === 'incoherence')).toBe(true)
  })

  it('signale une intervention datée dans le futur', () => {
    const db = buildSeedDatabase()
    db.serviceRecords.push({
      id: 'srv-x', vehicleId: 'veh-clio-demo', date: '2099-01-01', kilometrage: 87500,
      categorie: 'vidange', titre: 'Vidange future', statut: 'effectue', realisateur: 'garage',
      sourceInformation: 'declare', createdAt: '', updatedAt: '',
    })
    const anomalies = detectAnomalies(db, 'veh-clio-demo')
    expect(anomalies.some((a) => a.code === 'date_future')).toBe(true)
  })

  it('signale un coût dont la somme des lignes diffère du total déclaré', () => {
    const db = buildSeedDatabase()
    // srv-01 : total 89.9 mais lignes 45.9 + 12 + 32 = 89.9 → cohérent.
    // On modifie le total pour créer l'incohérence.
    db.serviceRecords = db.serviceRecords.map((r) =>
      r.id === 'srv-01' ? { ...r, coutTotal: 200 } : r,
    )
    const anomalies = detectAnomalies(db, 'veh-clio-demo')
    expect(anomalies.some((a) => a.code === 'cout_incoherent')).toBe(true)
  })

  it('signale un remboursement supérieur au montant payé', () => {
    const db = buildSeedDatabase()
    db.expenses.push({
      id: 'exp-x', vehicleId: 'veh-clio-demo', date: '2026-05-01', categorie: 'autre',
      libelle: 'Erreur de saisie', montant: 50, remboursement: 80, inconnu: false, link: 'aucun', createdAt: '',
    })
    const anomalies = detectAnomalies(db, 'veh-clio-demo')
    expect(anomalies.some((a) => a.code === 'remboursement_superieur')).toBe(true)
  })

  it('signale les justificatifs dont le fichier est inaccessible (agrégé)', () => {
    const db = buildSeedDatabase()
    const anomalies = detectAnomalies(db, 'veh-clio-demo')
    const docAnomaly = anomalies.find((a) => a.code === 'document_manquant')
    expect(docAnomaly).toBeDefined()
    expect(docAnomaly!.message).toContain('justificatif')
  })

  it('signale une intervention dont le km dépasse le dernier relevé connu', () => {
    const db = buildSeedDatabase()
    // srv-12 (64 800 km le 2026-07-18) est au-delà du dernier relevé 3008 (62 150 le 2026-09-15)
    const anomalies = detectAnomalies(db, 'veh-3008-demo')
    expect(anomalies.some((a) => a.code === 'km_hors_plage')).toBe(true)
  })

  it("n'invente aucune anomalie sur des données cohérentes", () => {
    const db = buildSeedDatabase()
    // Normalise le jeu de démonstration : retire l'incohérence volontaire,
    // aligne les coûts déclarés sur la somme des lignes, fichiers accessibles.
    db.serviceRecords = db.serviceRecords
      .filter((r) => r.id !== 'srv-12')
      .map((r) => {
        const sum = db.serviceRecordItems
          .filter((i) => i.serviceRecordId === r.id)
          .reduce((s, i) => s + (i.prixTotal ?? 0), 0)
        return sum > 0 ? { ...r, coutTotal: sum } : r
      })
    db.documents = db.documents.map((d) => ({ ...d, disponible: true }))
    const anomalies = detectAnomalies(db, 'veh-clio-demo')
    expect(anomalies.filter((a) => a.severity === 'incoherence')).toHaveLength(0)
  })
})

describe('missingVehicleFields', () => {
  it('liste les champs non renseignés sans les inventer', () => {
    const db = buildSeedDatabase()
    const complete = db.vehicles[0]
    expect(missingVehicleFields(complete)).toHaveLength(0)

    const partial = { ...complete, vin: undefined, motorisation: undefined }
    const missing = missingVehicleFields(partial as AppDatabase['vehicles'][number])
    expect(missing).toContain('VIN')
    expect(missing).toContain('motorisation')
    expect(missing).not.toContain('immatriculation')
  })
})
