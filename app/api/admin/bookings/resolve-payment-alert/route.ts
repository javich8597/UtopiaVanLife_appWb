import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/requireAdmin'
import { markPaymentAlertsReviewed } from '@/lib/admin/bookingStatus'

/**
 * Marca como revisados los avisos "[PAGO A REVISAR]" de una reserva.
 * Body: { bookingId }. No toca el estado ni el dinero: solo apunta en `notes` que el admin
 * ya revisó el cobro en el banco, para que la reserva deje de señalarse en el panel.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    const db = auth.db

    const { bookingId } = await request.json().catch(() => ({}))
    if (typeof bookingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(bookingId)) {
      return NextResponse.json({ error: 'Reserva no válida' }, { status: 400 })
    }

    const { data: booking, error: fetchError } = await db
      .from('bookings')
      .select('id, notes')
      .eq('id', bookingId)
      .maybeSingle()
    if (fetchError) throw new Error(fetchError.message)
    if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

    const nextNotes = markPaymentAlertsReviewed(booking.notes)
    if (nextNotes === null) {
      return NextResponse.json({ error: 'Esta reserva no tiene avisos de pago pendientes de revisar' }, { status: 409 })
    }

    // Solo escribe si las notas siguen igual: si Redsys añadió otro aviso entre medias, no se pisa
    const { data: updated, error: updateError } = await db
      .from('bookings')
      .update({ notes: nextNotes })
      .eq('id', bookingId)
      .eq('notes', booking.notes)
      .select('id, notes')
    if (updateError) throw new Error(updateError.message)
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'La reserva ha cambiado mientras la revisabas. Ábrela de nuevo y repite la acción.' }, { status: 409 })
    }

    return NextResponse.json({ success: true, notes: updated[0].notes })
  } catch (error: any) {
    console.error('Resolve payment alert error:', error)
    return NextResponse.json({ error: error.message || 'No se pudo marcar el aviso como revisado' }, { status: 500 })
  }
}
