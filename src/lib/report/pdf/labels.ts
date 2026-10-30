// Libellés FR utilisés par le PDF (réexportés depuis le catalogue métier).
export {
  CARBURANT_LABELS,
  EXPENSE_CATEGORY_LABELS,
  FAULT_STATUS_LABELS,
  SERVICE_STATUS_LABELS,
  SOURCE_LABELS,
  SERVICE_CATEGORIES,
} from '../../domain/catalog'

import { SERVICE_CATEGORIES } from '../../domain/catalog'
import type { ServiceCategory } from '../../domain/types'

export function categoryLabel(categorie: ServiceCategory): string {
  return SERVICE_CATEGORIES[categorie]?.label ?? categorie
}
