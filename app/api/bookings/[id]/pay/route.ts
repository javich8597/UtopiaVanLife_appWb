import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateRedsysOrderId, createRedsysPaymentForm, isRedsysLocale } from '@/lib/redsys'
import { appendPreviousOrder, MAX_PAYMENT_RETRIES, ownProvisionalSessions, previousOrderIds } from '@/lib/redsysNotification'
import { isBookingRangeFree } from '@/lib/booking/calendarLogic'
import { hasPaymentAlert } from '@/lib/admin/bookingStatus'

/**
 * Reintenta el pago de una reserva propia que quedó pendiente (el cliente cerró Redsys,
 * la tarjeta falló…). Cobra el importe ya calculado de la reserva, sin crear otra.
 * Redsys no admite repetir un número de pedido, así que cada intento genera uno nuevo. El pedido
 * anterior queda en las notas: si aún se cobra, el webhook encuentra la reserva y avisa al admin.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
      .select('id, user_id, camper_id, start_date, end_date, pickup_time, dropoff_time, status, payment_status, payment_intent_id, notes, total_price, customer_name, campers (name, slug)')
      .eq('id', id)
      .maybeSingle()

    if (!booking || booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }
    if (booking.status !== 'pending' || booking.payment_status === 'paid') {
      return NextResponse.json({ error: 'Esta reserva no tiene ningún pago pendiente' }, { status: 409 })
    }
    // Un aviso [PAGO A REVISAR] sin revisar puede ser dinero ya cobrado (importe distinto, pedido
    // anterior…): no se cobra otra vez hasta que el admin lo revise. No basta con ocultar el botón
    if (hasPaymentAlert(booking)) {
      return NextResponse.json(
        { error: 'Estamos revisando un pago de esta reserva. Escríbenos antes de volver a pagar.' },
        { status: 409 }
      )
    }

    if (previousOrderIds(booking.notes).length >= MAX_PAYMENT_RETRIES) {
      console.error(`Retry payment: la reserva ${booking.id} ha agotado los ${MAX_PAYMENT_RETRIES} reintentos de pago`)
      return NextResponse.json(
        { error: 'Has superado el número de intentos de pago de esta reserva. Escríbenos por WhatsApp y te ayudamos a completarla.' },
        { status: 409 }
      )
    }

    const amount = Number(booking.total_price) || 0
    if (amount <= 0) {
      return NextResponse.json({ error: 'La reserva no tiene un importe válido' }, { status: 400 })
    }

    // Las fechas pueden haberse ocupado mientras la reserva estaba sin pagar
    const [{ data: clash, error: clashErr }, { data: blocks, error: blocksErr }] = await Promise.all([
      db.from('bookings')
        .select('id, start_date, end_date, pickup_time, dropoff_time')
        .eq('camper_id', booking.camper_id)
        .in('status', ['confirmed', 'active'])
        .neq('id', booking.id)
        .lte('start_date', booking.end_date)
        .gte('end_date', booking.start_date),
      db.from('blocked_dates')
        .select('id, start_date, end_date, session_id, expires_at')
        .eq('camper_id', booking.camper_id)
        .lte('start_date', booking.end_date)
        .gte('end_date', booking.start_date),
    ])
    if (clashErr || blocksErr) throw new Error((clashErr || blocksErr)!.message)

    const now = new Date()
    // Los bloqueos provisionales de esta misma reserva, de cualquier intento, no la dejan sin fechas
    const ownHolds = ownProvisionalSessions(booking)
    const activeBlocks = (blocks || []).filter(b =>
      !ownHolds.includes(b.session_id ?? '') && (!b.expires_at || new Date(b.expires_at) > now)
    )
    if (!isBookingRangeFree(booking, clash || [], activeBlocks)) {
      return NextResponse.json(
        { error: 'Las fechas de esta reserva ya no están disponibles. Haz una reserva nueva.' },
        { status: 409 }
      )
    }

    // Antes de escribir: si Redsys no está bien configurado, la reserva conserva su pedido
    const { locale } = await request.json().catch(() => ({}))
    const orderId = generateRedsysOrderId()
    const camper: any = Array.isArray(booking.campers) ? booking.campers[0] : booking.campers
    const form = createRedsysPaymentForm({
      amount,
      orderId,
      description: `1x Camper ${camper?.name || 'Utopia'} - Utopia Van Life`,
      customerName: booking.customer_name || 'Cliente Utopia',
      locale: isRedsysLocale(locale) ? locale : 'es',
    })

    // Una sola escritura condicionada a lo que se leyó, para que gane solo uno:
    // - sin pagar: el webhook puede haber entrado después de leer la reserva;
    // - mismo pedido: dos reintentos a la vez perderían el rastro de uno;
    // - mismas notas: el webhook pudo añadir un aviso [PAGO A REVISAR] o el registro de un cobro,
    //   y estas notas se escriben enteras.
    const updateBase = db
      .from('bookings')
      .update({
        payment_intent_id: orderId,
        payment_status: 'pending',
        notes: appendPreviousOrder(booking.notes, booking.payment_intent_id),
        updated_at: now.toISOString(),
      })
      .eq('id', booking.id)
      .eq('status', 'pending')
    const sameOrder = booking.payment_intent_id
      ? updateBase.eq('payment_intent_id', booking.payment_intent_id)
      : updateBase.is('payment_intent_id', null)
    const sameNotes = booking.notes === null || booking.notes === undefined
      ? sameOrder.is('notes', null)
      : sameOrder.eq('notes', booking.notes)
    const { data: updated, error: updateErr } = await (booking.payment_status === null
      ? sameNotes.is('payment_status', null)
      : sameNotes.neq('payment_status', 'paid')
    ).select('id')

    if (updateErr) throw new Error(updateErr.message)
    if (!updated || updated.length === 0) {
      // Otro reintento o una notificación del banco la cambió entre la lectura y la escritura
      return NextResponse.json(
        { error: 'La reserva acaba de cambiar mientras preparábamos el pago. Recarga la página y vuelve a intentarlo.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, orderId, form })
  } catch (error: any) {
    console.error('Retry payment error:', error)
    return NextResponse.json({ error: 'No se pudo preparar el pago' }, { status: 500 })
  }
}
