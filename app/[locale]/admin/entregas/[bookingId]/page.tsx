import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminClientOrSession } from '@/lib/admin/auth'
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

  const { data: booking } = await db
    .from('bookings')
    .select('id, user_id, start_date, end_date, status, customer_name, customer_email, num_nights, km_package, campers (name, slug)')
    .eq('id', bookingId)
    .maybeSingle()
  if (!booking) notFound()

  const [{ data: handovers }, { data: customer }] = await Promise.all([
    db.from('handovers').select('*').eq('booking_id', bookingId),
    booking.user_id
      ? db.from('users').select('full_name, dni_nie, driver_license_id, driver_license_expiry_date, verification_status').eq('id', booking.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Fotos del carnet subidas por el cliente, para comprobarlas con el carnet físico
  const licensePhotos: string[] = []
  if (booking.user_id) {
    const { data: files } = await db.storage.from('documents').list(booking.user_id)
    const latest = (prefix: string) =>
      (files || []).filter((f: any) => f.name.startsWith(prefix)).sort((a: any, b: any) => b.name.localeCompare(a.name))[0]
    for (const prefix of ['front_', 'back_', 'license_front', 'license_back']) {
      const f = latest(prefix)
      if (f) {
        const { data } = await db.storage.from('documents').createSignedUrl(`${booking.user_id}/${f.name}`, 3600)
        if (data?.signedUrl) licensePhotos.push(data.signedUrl)
      }
    }
  }

  const current = (handovers || []).find((h: any) => h.kind === kind) || null
  const pickup = (handovers || []).find((h: any) => h.kind === 'pickup') || null

  return (
    <HandoverClient
      kind={kind}
      booking={booking}
      customer={customer}
      licensePhotos={licensePhotos.slice(0, 2)}
      initial={await signHandoverMedia(db, current)}
      pickupKm={pickup?.km ?? null}
    />
  )
}
