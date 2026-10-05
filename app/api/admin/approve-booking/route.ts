import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verify admin privileges
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
            app_metadata: user.app_metadata
    })

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { bookingId, action } = await request.json()

    if (!bookingId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Parámetros de reserva inválidos' }, { status: 400 })
    }

    // Use the authenticated supabase client or admin client with SUPABASE_SERVICE_ROLE_KEY
    const clientToUse = getAdminClientOrSession(supabase)

    const { data: booking } = await clientToUse
      .from('bookings')
      .select('id, camper_id, start_date, end_date, status, payment_intent_id')
      .eq('id', bookingId)
      .maybeSingle()

    if (!booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }
    if (booking.status !== 'pending') {
      return NextResponse.json({ error: 'Solo se pueden aceptar o rechazar reservas pendientes' }, { status: 409 })
    }

    // Dos clientes pueden pagar las mismas fechas a la vez: no confirmar encima de otra reserva
    if (action === 'approve') {
      const { data: clash } = await clientToUse
        .from('bookings')
        .select('id, customer_name, start_date, end_date')
        .eq('camper_id', booking.camper_id)
        .in('status', ['confirmed', 'active'])
        .neq('id', booking.id)
        .lte('start_date', booking.end_date)
        .gte('end_date', booking.start_date)
        .limit(1)

      if (clash && clash.length > 0) {
        const c = clash[0]
        return NextResponse.json(
          { error: `Se solapa con la reserva confirmada de ${c.customer_name || 'otro cliente'} (${c.start_date} – ${c.end_date})` },
          { status: 409 }
        )
      }
    }

    const targetStatus = action === 'approve' ? 'confirmed' : 'cancelled'

    // Solo se aprueban o rechazan reservas pendientes (nunca reabrir una cancelada o reembolsada)
    const { data: updated, error: updateErr } = await clientToUse
      .from('bookings')
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .eq('status', 'pending')
      .select('id')

    if (updateErr) {
      throw new Error(`Error al actualizar la reserva: ${updateErr.message}`)
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'La reserva ya no está pendiente. Recarga la página.' }, { status: 409 })
    }

    // Al rechazar, liberar las fechas que bloqueó el pago
    if (action === 'reject' && booking.payment_intent_id) {
      await clientToUse
        .from('blocked_dates')
        .delete()
        .eq('session_id', `redsys_${booking.payment_intent_id}`)
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status: targetStatus,
      message: action === 'approve'
        ? 'Reserva aprobada y confirmada con éxito. El contrato dinámico ha sido emitido.'
        : 'Reserva rechazada.'
    })
  } catch (error: any) {
    console.error('Approve Booking API Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
