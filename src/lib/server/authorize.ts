// Contrôle d'accès serveur aux rapports.
// Mode démonstration : pas d'authentification, contrôle de cohérence basique.
// Étape 6 (Supabase) : ce module devra vérifier la session utilisateur
// (auth.getUser) puis les droits RLS sur le véhicule et ses documents.

import type { ReportSnapshot } from '../report/snapshot'

export interface AuthResult {
  authorized: boolean
  reason?: string
  userId: string
}

export async function authorizeReportAccess(
  vehicleId: string,
  snapshot: ReportSnapshot,
  _request: Request,
): Promise<AuthResult> {
  // 1. L'instantané doit porter sur le véhicule demandé par l'URL.
  if (snapshot.vehicle.id !== vehicleId) {
    return {
      authorized: false,
      reason: "L'instantané fourni ne correspond pas au véhicule demandé.",
      userId: 'anonymous',
    }
  }

  // 2. TODO(étape 6 — Supabase) :
  //    const token = request.headers.get('Authorization')
  //    const { data: user } = await supabase.auth.getUser(token)
  //    if (!user) return { authorized: false, reason: 'Non authentifié', userId: 'anonymous' }
  //    const { data: vehicle } = await supabase.from('vehicles').select('id')
  //      .eq('id', vehicleId).eq('owner_id', user.id).single()
  //    if (!vehicle) return { authorized: false, reason: 'Accès refusé', userId: user.id }
  //    Appliquer les mêmes règles RLS pour chaque document accédé.

  return { authorized: true, userId: 'demo-user' }
}
