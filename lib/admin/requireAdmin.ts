import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'

/** Comprueba que la petición viene de un admin y devuelve el cliente con privilegios. */
export async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
  if (!isAdminUser({ id: user.id, role: profile?.role, app_metadata: user.app_metadata })) {
    return { ok: false as const, response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }
  return { ok: true as const, user, db: getAdminClientOrSession(supabase) }
}
