// Options du rapport de vente — validées par Zod côté client ET côté serveur.
import { z } from 'zod'

export const reportSections = [
  'identification',
  'historique',
  'pannes',
  'justificatifs',
  'depenses',
  'travaux_prevoir',
  'methodologie',
] as const

export type ReportSection = (typeof reportSections)[number]

export const SECTION_LABELS: Record<ReportSection, string> = {
  identification: 'Identification du véhicule',
  historique: 'Historique complet des interventions',
  pannes: 'Pannes et réparations',
  justificatifs: 'Factures et justificatifs',
  depenses: 'Dépenses',
  travaux_prevoir: 'Travaux à prévoir',
  methodologie: 'Méthodologie et limites',
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ')

export const reportOptionsSchema = z
  .object({
    sections: z.object({
      identification: z.boolean(),
      historique: z.boolean(),
      pannes: z.boolean(),
      justificatifs: z.boolean(),
      depenses: z.boolean(),
      travaux_prevoir: z.boolean(),
      methodologie: z.boolean(),
    }),
    period: z
      .object({
        from: isoDate.nullable(),
        to: isoDate.nullable(),
      })
      .refine((p) => !p.from || !p.to || p.from <= p.to, {
        message: 'La date de début doit être antérieure à la date de fin',
      }),
    includeCosts: z.boolean(),
    includeAttachments: z.boolean(),
    attachmentIds: z.array(z.string()).max(20, 'Maximum 20 pièces jointes'),
    maskVin: z.boolean(),
    maskPlate: z.boolean(),
    maskOwner: z.boolean(),
  })
  .strict()

export type ReportOptions = z.infer<typeof reportOptionsSchema>

export const defaultReportOptions: ReportOptions = {
  sections: {
    identification: true,
    historique: true,
    pannes: true,
    justificatifs: true,
    depenses: true,
    travaux_prevoir: true,
    methodologie: true,
  },
  period: { from: null, to: null },
  includeCosts: true,
  includeAttachments: true,
  attachmentIds: [],
  maskVin: true,
  maskPlate: false,
  maskOwner: true,
}

export function parseReportOptions(input: unknown): ReportOptions {
  return reportOptionsSchema.parse(input)
}
