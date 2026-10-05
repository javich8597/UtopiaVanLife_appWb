import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateRedsysOrderId, createRedsysPaymentForm } from '@/lib/redsys'

/**
 * Reintenta el pago de una reserva propia que quedó pendiente (el cliente cerró Redsys,
 * la tarjeta falló…). Cobra el importe ya calculado de la reserva, sin crear otra.
 * Redsys no admite repetir un número de pedido, así que cada intento genera uno nuevo.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para pagar' }, { status: 401 })
    }

    const db = getSupabaseAdmin()
    const { data: booking } = await db
      .from('bookings')
      .select('id, user_id, camper_id, start_date, end_date, status, payment_status, total_price, customer_name, campers (name, slug)')
      .eq('id', id)
      .maybeSingle()

    if (!booking || booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }
    if (booking.status !== 'pending' || booking.payment_status === 'paid') {
      return NextResponse.json({ error: 'Esta reserva no tiene ningún pago pendiente' }, { status: 409 })
    }

    const amount = Number(booking.total_price) || 0
    if (amount <= 0) {
      return NextResponse.json({ error: 'La reserva no tiene un importe válido' }, { status: 400 })
    }

    // Las fechas pueden haberse ocupado mientras la reserva estaba sin pagar
    const [{ data: clash }, { data: blocks }] = await Promise.all([
      db.from('bookings')
        .select('id')
        .eq('camper_id', booking.camper_id)
        .in('status', ['confirmed', 'active'])
        .lte('start_date', booking.end_date)
        .gte('end_date', booking.start_date)
        .limit(1),
      db.from('blocked_dates')
        .select('id, expires_at')
        .eq('camper_id', booking.camper_id)
        .lte('start_date', booking.end_date)
        .gte('end_date', booking.start_date),
    ])
    const now = new Date()
    const activeBlocks = (blocks || []).filter(b => !b.expires_at || new Date(b.expires_at) > now)
    if ((clash && clash.length > 0) || activeBlocks.length > 0) {
      return NextResponse.json(
        { error: 'Las fechas de esta reserva ya no están disponibles. Haz una reserva nueva.' },
        { status: 409 }
      )
    }

    const orderId = generateRedsysOrderId()
    const { error: updateErr } = await db
      .from('bookings')
      .update({ payment_intent_id: orderId, payment_status: 'pending', updated_at: now.toISOString() })
      .eq('id', booking.id)
      .eq('status', 'pending')

    if (updateErr) throw new Error(updateErr.message)

    const camper: any = Array.isArray(booking.campers) ? booking.campers[0] : booking.campers
    const form = createRedsysPaymentForm({
      amount,
      orderId,
      description: `1x Camper ${camper?.name || 'Utopia'} - Utopia Van Life`,
      customerName: booking.customer_name || 'Cliente Utopia',
    })

    return NextResponse.json({ success: true, orderId, form })
  } catch (error: any) {
    console.error('Retry payment error:', error)
    return NextResponse.json({ error: 'No se pudo preparar el pago' }, { status: 500 })
  }
}
