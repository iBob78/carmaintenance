// Service de génération du PDF de vente (côté serveur).
// Pipeline : données → instantané → anomalies/totaux → confidentialité →
// mise en page → validation du PDF → octets.

import React from 'react'
import { Document, Page, renderToBuffer, StyleSheet, View } from '@react-pdf/renderer'
import type { ReportOptions, ReportSection } from '../options'
import type { ReportSnapshot } from '../snapshot'
import { SaleReportDocument, SectionContent, sectionList } from './sale-report'

export interface GeneratedPdf {
  buffer: Buffer
  pageCount: number
  tocPages: Partial<Record<ReportSection, number | null>>
  byteLength: number
}

const probeStyles = StyleSheet.create({ page: { fontFamily: 'Helvetica', fontSize: 9, paddingVertical: 56, paddingHorizontal: 48, lineHeight: 1.45 } })

/** Compte les pages d'un flux PDF produit par pdfkit (react-pdf). */
function countPdfPages(buffer: Buffer): number {
  const raw = buffer.toString('latin1')
  const matches = raw.match(/\/Type\s*\/Page[^s]/g)
  return matches ? matches.length : 1
}

/**
 * Mesure le nombre de pages de chaque section (même contenu que le document
 * final) pour renseigner le sommaire : couverture (1) + sommaire (1) + sections.
 * En cas d'échec, le sommaire est fourni SANS numéros de page — jamais de
 * numéro inventé.
 */
async function measureTocPages(
  snapshot: ReportSnapshot,
  options: ReportOptions,
): Promise<Partial<Record<ReportSection, number | null>>> {
  const tocPages: Partial<Record<ReportSection, number | null>> = {}
  try {
    let page = 2 // couverture + sommaire
    for (const sec of sectionList(options)) {
      const probe = React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: 'A4', style: probeStyles },
          React.createElement(SectionContent, { section: sec, snapshot, options }),
        ),
      )
      const buffer = await renderToBuffer(probe as never)
      const pageCount = countPdfPages(buffer)
      tocPages[sec] = page + 1
      page += pageCount
    }
    return tocPages
  } catch {
    return {}
  }
}

/** Valide qu'un buffer est un PDF lisible et non vide. */
export function validatePdf(buffer: Buffer): { valid: boolean; pageCount: number; errors: string[] } {
  const errors: string[] = []
  const raw = buffer.toString('latin1')
  if (!raw.startsWith('%PDF-')) errors.push('En-tête PDF absent')
  if (!raw.includes('%%EOF')) errors.push('Fin de fichier PDF (%%EOF) absente')
  const pageCount = countPdfPages(buffer)
  if (pageCount < 1) errors.push('Aucune page détectée')
  if (buffer.byteLength < 1000) errors.push('Fichier PDF trop petit pour être valide')
  return { valid: errors.length === 0, pageCount, errors }
}

export async function generateSaleReportPdf(
  snapshot: ReportSnapshot,
  options: ReportOptions,
): Promise<GeneratedPdf> {
  const tocPages = await measureTocPages(snapshot, options)
  const document = React.createElement(SaleReportDocument, { snapshot, options, tocPages })
  const buffer = await renderToBuffer(document as never)

  const validation = validatePdf(buffer)
  if (!validation.valid) {
    throw new Error(`PDF généré invalide : ${validation.errors.join(', ')}`)
  }

  return {
    buffer,
    pageCount: validation.pageCount,
    tocPages,
    byteLength: buffer.byteLength,
  }
}
