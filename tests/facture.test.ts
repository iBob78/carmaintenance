import { describe, it, expect } from 'vitest'
import { parseFacture, toServicePrefill } from '@/lib/ocr/facture'

// Facture OCR réaliste (bruit typique compris)
const OCR_FACTURE = `
GARAGE DES LILAS SARL
12 AVENUE DE LA REPUBLIQUE 93200 SAINT-DENIS
SIRET 812 456 789 00021

FACTURE N° 2024-0847
Date : 12/03/2024

VIDANGE MOTEUR - FILTRE A HUILE       89,90
MAIN D'OEUVRE 2H                       110,00
FILTRE HUILE MANN W811/80              12,50

TOTAL HT                              183,74
TVA 20%                                36,75
TOTAL TTC                             220,49
Kilometrage : 84 900 km
`

describe('parseFacture', () => {
  const scan = parseFacture(OCR_FACTURE)

  it('extrait la date, le fournisseur et les montants', () => {
    expect(scan.date?.normalized).toBe('2024-03-12')
    expect(scan.fournisseur?.value).toMatch(/GARAGE DES LILAS/i)
    expect(scan.montantHT?.normalized).toBeCloseTo(183.74)
    expect(scan.tva?.normalized).toBeCloseTo(36.75)
    expect(scan.montantTTC?.normalized).toBeCloseTo(220.49)
  })

  it('extrait le kilométrage', () => {
    expect(scan.kilometrage?.normalized).toBe(84900)
  })

  it('extrait les lignes de facture et ignore les totaux', () => {
    expect(scan.lignes.length).toBe(3)
    expect(scan.lignes[0].libelle).toMatch(/VIDANGE/i)
    expect(scan.lignes.some((l) => /TOTAL/i.test(l.libelle))).toBe(false)
  })

  it('toServicePrefill pré-remplit la fiche d’intervention', () => {
    const prefill = toServicePrefill(scan)
    expect(prefill.date).toBe('2024-03-12')
    expect(prefill.kilometrage).toBe(84900)
    expect(prefill.coutTotal).toBeCloseTo(220.49)
    expect(prefill.garage).toMatch(/GARAGE DES LILAS/i)
    expect(prefill.categorie).toBe('vidange') // détecté sur les lignes
    expect(prefill.items?.length).toBe(3)
    expect(prefill.items?.some((i) => i.kind === 'main_oeuvre')).toBe(true)
    expect(prefill.items?.some((i) => i.kind === 'piece')).toBe(true)
  })

  it('signale les fragments non interprétés', () => {
    expect(Array.isArray(scan.nonInterpretes)).toBe(true)
  })

  it('n’invente rien sur un document illisible', () => {
    const vide = parseFacture('%%$ ??? !!!')
    expect(vide.date).toBeUndefined()
    expect(vide.montantTTC).toBeUndefined()
    expect(vide.lignes).toHaveLength(0)
  })

  it('sans mention TTC, propose le plus grand montant avec confiance moyenne', () => {
    const s = parseFacture('Facture du 02/01/2025\nPrestation 120,00')
    expect(s.montantTTC?.normalized).toBeCloseTo(120)
    expect(s.montantTTC?.confidence).toBe('moyenne')
  })
})
