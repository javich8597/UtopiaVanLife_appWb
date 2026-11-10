import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/requireAdmin'
import { secondDriverPhotoPresence } from '@/lib/admin/secondDriverDocuments'

/**
 * Qué fotos del segundo conductor hay REALMENTE en Storage para una reserva.
 * GET ?bookingId=<uuid> -> { photos: { dniFrontUrl, dniBackUrl, licenseFrontUrl, licenseBackUrl } | null }
 *
 * `photos: null` significa «no se ha podido leer Storage»: el detalle de la reserva no debe afirmar
 * entonces que falte nada. Solo devuelve si existe cada foto, nunca una URL.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const bookingId = new URL(request.url).searchParams.get('bookingId')
    if (!bookingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
      return NextResponse.json({ error: 'Reserva no válida' }, { status: 400 })
    }

    const { data: booking, error } = await auth.db
      .from('bookings')
      .select('id, user_id')
      .eq('id', bookingId)
      .maybeSingle()
    if (error) {
      console.error('second-driver-docs: no se pudo leer la reserva', error.message)
      return NextResponse.json({ photos: null })
    }
    if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

    const photos = booking.user_id ? await secondDriverPhotoPresence(auth.db, booking.user_id, booking.id) : null
    return NextResponse.json({ photos })
  } catch (error) {
    console.error('second-driver-docs error:', error)
    return NextResponse.json({ error: 'No se pudo comprobar la documentación' }, { status: 500 })
  }
}
