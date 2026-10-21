// Interface d'accès aux données.
// Implémentation A : dépôt local de démonstration (localStorage).
// Implémentation B (étape 6) : Supabase (PostgreSQL + RLS + Storage privé).
// L'interface reste identique : le jour où Supabase est branché, seuls
// les adaptateurs changent.

import type { AppDatabase } from '../domain/types'

export interface DataRepository {
  readonly mode: 'demo' | 'supabase'
  load(): Promise<AppDatabase>
  save(db: AppDatabase): Promise<void>
  clear(): Promise<void>
}
