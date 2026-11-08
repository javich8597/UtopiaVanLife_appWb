import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/routing'
import DriverDataClient from './DriverDataClient'
import { getAdminClientOrSession } from '@/lib/admin/auth'
import { bookingSecondDriver, LIVE_BOOKING_STATUSES } from '@/lib/booking/secondDriver'

export const metadata = {
    title: 'Datos y carnet | Utopia Van Life',
    description: 'Tus datos de conductor y la documentación para formalizar el contrato de alquiler.'
}

export default async function DriverDataPage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect({ href: '/auth/login?redirect=/dashboard/datos', locale })
        return null
    }

    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    // Motivo del último rechazo del carnet, para que el cliente sepa qué corregir
    let rejectionReason: string | null = profile?.rejection_reason || null
    if (!rejectionReason && profile?.verification_status === 'rejected') {
        const { data: lastRejection } = await getAdminClientOrSession(supabase)
            .from('document_validations')
            .select('rejected_reason')
            .eq('user_id', user.id)
            .eq('status', 'rejected')
            .order('validated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        rejectionReason = lastRejection?.rejected_reason || null
    }

    // El 2º conductor pertenece a la RESERVA, no al perfil: el formulario refleja la reserva viva y
    // pagada que lo lleva. Antes el interruptor salía de `users.has_second_driver`, y un cliente con
    // ese dato antiguo recibía un 400 en cualquier guardado, también en el de sus propios documentos
    const { data: liveBookings } = await supabase
        .from('bookings')
        .select('id, status, payment_status, start_date, passengers, pricing_breakdown')
        .eq('user_id', user.id)
        .eq('payment_status', 'paid')
        .in('status', LIVE_BOOKING_STATUSES as unknown as string[])
        .order('start_date', { ascending: true })

    const authorized = (liveBookings || [])
        .map(booking => ({ booking, driver: bookingSecondDriver(booking) }))
        .find(({ driver }) => Boolean(driver?.document))

    const secondDriverBooking = authorized
        ? {
            bookingId: authorized.booking.id as string,
            startDate: (authorized.booking.start_date as string) || '',
            fullName: authorized.driver!.fullName,
            dniNie: authorized.driver!.document,
            licenseId: authorized.driver!.licenseId,
        }
        : null

    return (
        <DriverDataClient
            user={user}
            profile={profile}
            rejectionReason={rejectionReason}
            secondDriverBooking={secondDriverBooking}
        />
    )
}
