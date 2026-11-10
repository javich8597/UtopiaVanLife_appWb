import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminClientOrSession } from '@/lib/admin/auth'
import { DOCUMENT_LIST_OPTIONS, latestLicensePhotoNames } from '@/lib/admin/documents'
import {
  buildSecondDriverGroups,
  handoverSecondDriverDocs,
  resolveSecondDriverDocuments,
  secondDriverDocsNotices,
  secondDriverPhotoPresence,
} from '@/lib/admin/secondDriverDocuments'
import { secondDriverStepInput } from '@/lib/handover/secondDriverStep'
import { signHandoverMedia } from '@/lib/handover/signedMedia'
import HandoverClient from './HandoverClient'

export const metadata = { title: 'Entrega de la camper | Backoffice Utopia Van Life' }

export default async function HandoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>
  searchParams: Promise<{ tipo?: string }>
}) {
  const { bookingId } = await params
  const { tipo } = await searchParams
  const kind = tipo === 'devolucion' ? 'return' : 'pickup'
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) notFound()

  const supabase = await createClient()
  const db = getAdminClientOrSession(supabase)

  // `*` porque las columnas second_driver_* de bookings pueden no estar aplicadas todavía; al cliente
  // solo se le pasa lo que la hoja de entrega necesita (más abajo)
  const { data: bookingRow } = await db
    .from('bookings')
    .select('*, campers (name, slug)')
    .eq('id', bookingId)
    .maybeSingle()
  if (!bookingRow) notFound()
  const booking = {
    id: bookingRow.id,
    user_id: bookingRow.user_id,
    start_date: bookingRow.start_date,
    end_date: bookingRow.end_date,
    status: bookingRow.status,
    customer_name: bookingRow.customer_name,
    customer_email: bookingRow.customer_email,
    num_nights: bookingRow.num_nights,
    km_package: bookingRow.km_package,
    campers: bookingRow.campers,
  }

  const [{ data: handovers }, { data: customer }] = await Promise.all([
    db.from('handovers').select('*').eq('booking_id', bookingId),
    booking.user_id
      ? db.from('users').select('full_name, dni_nie, driver_license_id, driver_license_expiry_date, verification_status').eq('id', booking.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Fotos del carnet subidas por el cliente, para comprobarlas con el carnet físico
  const licensePhotos: string[] = []
  if (booking.user_id) {
    const { data: files } = await db.storage.from('documents').list(booking.user_id, DOCUMENT_LIST_OPTIONS)
    // Anverso y reverso más recientes (por created_at de Storage), con el nombre real de la subida
    for (const name of latestLicensePhotoNames(files || [])) {
      const { data } = await db.storage.from('documents').createSignedUrl(`${booking.user_id}/${name}`, 3600)
      if (data?.signedUrl) licensePhotos.push(data.signedUrl)
    }
  }

  // Segundo conductor de ESTA reserva y sus fotos (documents/<cliente>/<reserva>/second_*), junto a las del titular.
  // Las fotos sueltas de una subida anterior NO son de esta reserva (pueden ser de otra persona): van aparte
  const secondDriverDocs = booking.user_id
    ? await resolveSecondDriverDocuments(db, booking.user_id, [bookingRow], { onlyBookingId: booking.id })
    : null
  const { thisBooking: secondDriverGroups, earlierUpload: earlierSecondDriverUpload } = secondDriverDocs
    ? handoverSecondDriverDocs(secondDriverDocs.folders, bookingRow)
    : { thisBooking: [], earlierUpload: null }
  const secondDriverNotices = secondDriverDocs ? secondDriverDocsNotices(secondDriverDocs) : []

  // Paso «Segundo conductor» de la entrega de recogida: solo si ESTA reserva lleva uno. La ficha y
  // las fotos se leen con las mismas funciones que usa la ruta que cierra la entrega
  const hasSecondDriver = kind === 'pickup' && secondDriverStepInput(bookingRow, null) !== null
  const secondDriverStep = hasSecondDriver
    ? secondDriverStepInput(
        bookingRow,
        booking.user_id ? await secondDriverPhotoPresence(db, booking.user_id, booking.id) : null
      )
    : null

  const current = (handovers || []).find((h: any) => h.kind === kind) || null
  const pickup = (handovers || []).find((h: any) => h.kind === 'pickup') || null

  return (
    <HandoverClient
      kind={kind}
      booking={booking}
      customer={customer}
      licensePhotos={licensePhotos.slice(0, 2)}
      secondDriverGroups={secondDriverGroups}
      earlierSecondDriverUpload={earlierSecondDriverUpload}
      secondDriverNotices={secondDriverNotices}
      secondDriverStep={secondDriverStep}
      initial={await signHandoverMedia(db, current)}
      pickupKm={pickup?.km ?? null}
    />
  )
}
