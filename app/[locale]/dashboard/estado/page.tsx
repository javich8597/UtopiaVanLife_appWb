import { redirect } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { getAdminClientOrSession } from '@/lib/admin/auth'
import { signHandoverMedia } from '@/lib/handover/signedMedia'
import { pickCurrentBooking } from '@/lib/user/tripState'
import CamperStatusClient from './CamperStatusClient'

export const metadata = {
  title: 'Estado de la camper | Utopia Van Life',
  description: 'Vídeos, fotos y kilómetros de la entrega y la devolución de tu camper.',
}

export default async function CamperStatusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect({ href: '/auth/login?redirect=/dashboard/estado', locale })
    return null
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, user_id, status, payment_status, created_at, start_date, end_date, num_nights, km_package, campers (name, slug)')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  const list = bookings || []
  // La reserva en curso o próxima; si no hay, la última terminada (para consultar la devolución)
  const booking = pickCurrentBooking(list) || list.find(b => b.status === 'completed') || null

  let pickup = null
  let ret = null
  if (booking && booking.user_id === user.id) {
    // Las fotos y vídeos son privados: se firman en el servidor tras comprobar que la reserva es suya
    const db = getAdminClientOrSession(supabase)
    const { data: handovers } = await db.from('handovers').select('*').eq('booking_id', booking.id).not('completed_at', 'is', null)
    pickup = await signHandoverMedia(db, (handovers || []).find((h: any) => h.kind === 'pickup') || null)
    ret = await signHandoverMedia(db, (handovers || []).find((h: any) => h.kind === 'return') || null)
  }

  return <CamperStatusClient booking={booking} pickup={pickup} ret={ret} />
}
