import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/routing'
import DriverDataClient from './DriverDataClient'
import { getAdminClientOrSession } from '@/lib/admin/auth'
import { LIVE_BOOKING_STATUSES } from '@/lib/booking/secondDriver'
import { upcomingSecondDriverBookings } from '@/lib/user/secondDriverBookings'

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

    // El 2º conductor pertenece a la RESERVA, no al perfil: el formulario refleja las reservas pagadas
    // y con viaje por delante que lo llevan. Antes se tomaba la más antigua que lo llevara, y un viaje
    // ya terminado tapaba a la reserva próxima: su documentación no se podía subir por ninguna pantalla.
    // Aquí solo se consulta; cuál se ofrece y en qué orden lo decide `upcomingSecondDriverBookings`.
    // `select('*')` como la ruta de subida: las columnas second_driver_* de bookings pueden no estar
    // aplicadas todavía, y a la pantalla solo llegan los campos que elige esa función
    const { data: liveBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .eq('payment_status', 'paid')
        .in('status', LIVE_BOOKING_STATUSES as unknown as string[])

    const secondDriverBookings = upcomingSecondDriverBookings(liveBookings || [])

    return (
        <DriverDataClient
            user={user}
            profile={profile}
            rejectionReason={rejectionReason}
            secondDriverBookings={secondDriverBookings}
        />
    )
}
