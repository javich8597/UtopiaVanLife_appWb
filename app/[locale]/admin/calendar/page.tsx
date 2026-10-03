import { createClient } from '@/lib/supabase/server'
import { getAdminBookingStatus } from '@/lib/admin/bookingStatus'
import AdminPageHeader from '../AdminPageHeader'
import CalendarClient from './CalendarClient'

export default async function AdminCalendarPage() {
    const supabase = await createClient()

    const { data: campers } = await supabase
        .from('campers')
        .select('id, name, slug')
        .eq('is_active', true)

    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          campers (id, name, slug),
          users (id, email)
        `)
        // Filtramos solo reservas que no estén canceladas para el master calendar
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true })

    // Las reservas abandonadas en Redsys no ocupan fechas: fuera del calendario
    const now = new Date()
    const visibleBookings = (bookings || []).filter(b => getAdminBookingStatus(b, now) !== 'expired')

    const { data: blockedDates } = await supabase
        .from('blocked_dates')
        .select('*')
        .order('start_date', { ascending: true })

    // Los bloqueos temporales de pago que ya caducaron no ocupan fechas
    const activeBlocks = (blockedDates || []).filter(b => !b.expires_at || new Date(b.expires_at) > now)

    return (
        <div className="adm-page">
            <AdminPageHeader
                title="Calendario"
                description="Ocupación de la flota. Selecciona días libres para bloquearlos por taller o uso propio."
            />

            <CalendarClient
                bookings={visibleBookings}
                campers={campers || []}
                blockedDates={activeBlocks}
                blocked_dates={activeBlocks}
            />
        </div>
    )
}
