import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'

async function checkAdminAuth() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAuthorized = isAdminUser({
    id: user.id,
    email: user.email,
    role: profile?.role,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
  })

  if (!isAuthorized) {
    return { authorized: false, response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }

  return { authorized: true, user, clientToUse: getAdminClientOrSession(supabase) }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Cambia el rol de una cuenta (admin ↔ customer). No permite quitarse el rol a uno mismo. */
export async function PATCH(request: Request) {
  try {
    const auth = await checkAdminAuth()
    if (!auth.authorized) return auth.response!
    const db = auth.clientToUse!

    const { userId, role } = await request.json()
    if (!userId || !['admin', 'customer'].includes(role)) {
      return NextResponse.json({ error: 'Parámetros no válidos' }, { status: 400 })
    }
    if (userId === auth.user!.id && role !== 'admin') {
      return NextResponse.json({ error: 'No puedes quitarte el rol de administrador a ti mismo' }, { status: 400 })
    }

    const { data, error } = await db.from('users').update({ role }).eq('id', userId).select('id, role')
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No se pudo cambiar el rol (sin permiso o usuario inexistente)' }, { status: 403 })
    }

    return NextResponse.json({ success: true, user: data[0] })
  } catch (error: any) {
    console.error('Change role error:', error)
    return NextResponse.json({ error: error.message || 'No se pudo cambiar el rol' }, { status: 500 })
  }
}
