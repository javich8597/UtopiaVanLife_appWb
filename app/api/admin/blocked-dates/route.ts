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

  return { authorized: true, clientToUse: getAdminClientOrSession(supabase) }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Crea un bloqueo manual de fechas (taller, mantenimiento, uso propio) */
export async function POST(request: Request) {
  try {
    const auth = await checkAdminAuth()
    if (!auth.authorized) return auth.response!
    const db = auth.clientToUse!

    const { camperId, startDate, endDate, reason } = await request.json()

    if (!camperId) return NextResponse.json({ error: 'Elige un camper' }, { status: 400 })
    if (!DATE_RE.test(startDate || '') || !DATE_RE.test(endDate || '')) {
      return NextResponse.json({ error: 'Fechas no válidas' }, { status: 400 })
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'La fecha final es anterior a la inicial' }, { status: 400 })
    }

    // No bloquear encima de una reserva confirmada o en curso
    const { data: clash } = await db
      .from('bookings')
      .select('id, customer_name, start_date, end_date')
      .eq('camper_id', camperId)
      .in('status', ['confirmed', 'active'])
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .limit(1)

    if (clash && clash.length > 0) {
      const c = clash[0]
      return NextResponse.json(
        { error: `Se solapa con la reserva de ${c.customer_name || 'un cliente'} (${c.start_date} – ${c.end_date})` },
        { status: 409 }
      )
    }

    const { data, error } = await db
      .from('blocked_dates')
      .insert({
        camper_id: camperId,
        start_date: startDate,
        end_date: endDate,
        reason: (reason || '').trim() || 'Mantenimiento',
        expires_at: null,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, blockedDate: data })
  } catch (error: any) {
    console.error('Create blocked date error:', error)
    return NextResponse.json({ error: error.message || 'No se pudo guardar el bloqueo' }, { status: 500 })
  }
}

/** Elimina un bloqueo manual. Los bloqueos automáticos de Redsys no se tocan desde aquí. */
export async function DELETE(request: Request) {
  try {
    const auth = await checkAdminAuth()
    if (!auth.authorized) return auth.response!
    const db = auth.clientToUse!

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Falta el bloqueo' }, { status: 400 })

    const { data: block } = await db.from('blocked_dates').select('id, session_id').eq('id', id).maybeSingle()
    if (!block) return NextResponse.json({ error: 'Bloqueo no encontrado' }, { status: 404 })
    if (block.session_id && String(block.session_id).startsWith('redsys_')) {
      return NextResponse.json({ error: 'Los bloqueos de pagos Redsys se liberan cancelando la reserva' }, { status: 400 })
    }

    const { error } = await db.from('blocked_dates').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete blocked date error:', error)
    return NextResponse.json({ error: error.message || 'No se pudo eliminar el bloqueo' }, { status: 500 })
  }
}
