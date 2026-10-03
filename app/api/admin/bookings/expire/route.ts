import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'
import { isAbandonedPending } from '@/lib/admin/bookingStatus'

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

  return { authorized: true, clientToUse: getAdminClientOrSession(supabase) }
}

/**
 * Archiva reservas abandonadas: 'pending' sin pago y fuera del plazo de Redsys.
 * Body: { ids: string[] }. El servidor vuelve a comprobar cada una antes de cancelarla.
 */
export async function POST(request: Request) {
  try {
    const auth = await checkAdminAuth()
    if (!auth.authorized) return auth.response!
    const db = auth.clientToUse!

    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos una reserva' }, { status: 400 })
    }

    const { data: candidates, error: fetchErr } = await db
      .from('bookings')
      .select('id, status, payment_status, created_at, payment_intent_id')
      .in('id', ids)

    if (fetchErr) throw new Error(fetchErr.message)

    const now = new Date()
    const expirable = (candidates || []).filter((b: any) => isAbandonedPending(b, now))
    if (expirable.length === 0) {
      return NextResponse.json({ error: 'Ninguna de las reservas seleccionadas está caducada' }, { status: 400 })
    }

    const expirableIds = expirable.map((b: any) => b.id)
    const { error: updateErr } = await db
      .from('bookings')
      .update({ status: 'cancelled' })
      .in('id', expirableIds)
      .eq('status', 'pending')

    if (updateErr) throw new Error(updateErr.message)

    // Liberar los bloqueos de fechas que pudieran quedar de esas sesiones de pago
    const sessions = expirable.filter((b: any) => b.payment_intent_id).map((b: any) => `redsys_${b.payment_intent_id}`)
    if (sessions.length > 0) {
      await db.from('blocked_dates').delete().in('session_id', sessions)
    }

    return NextResponse.json({ success: true, archived: expirableIds.length, skipped: ids.length - expirableIds.length })
  } catch (error: any) {
    console.error('Expire bookings error:', error)
    return NextResponse.json({ error: error.message || 'No se pudieron archivar las reservas' }, { status: 500 })
  }
}
