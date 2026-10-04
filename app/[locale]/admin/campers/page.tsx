import { createClient } from '@/lib/supabase/server'
import CampersClient from './CampersClient'
import { calculateFleetLiveStatus, calculateFleetOccupancy } from '@/lib/admin/dashboardMetrics'

export default async function AdminCampersPage() {
    const supabase = await createClient()

    const { data: campers } = await supabase
        .from('campers')
        .select('*')
        .order('name', { ascending: true })

    // Retrieve pricing for campers if available
    const { data: pricing } = await supabase
        .from('camper_pricing')
        .select('camper_id, price_per_night, season_id, seasons(name)')

    const campersWithPricing = (campers || []).map((camper: any) => {
        const camperPrices = pricing?.filter((p: any) => p.camper_id === camper.id) || []
        const mediaPrice = camperPrices.find((p: any) => p.seasons?.name?.toLowerCase().includes('media'))?.price_per_night
        const basePrice = mediaPrice || camperPrices[0]?.price_per_night || (camper.slug === 'neo' ? 120 : (camper.slug === 'space' ? 140 : 120))

        return {
            ...camper,
            price_per_night: Number(camper.price_per_night || basePrice),
        }
    })

    // Estado de hoy de cada vehículo (en viaje o libre) y próximas fechas
    const { data: liveBookings } = await supabase
        .from('bookings')
        .select('id, camper_id, start_date, end_date, total_price, status, customer_name')
        .in('status', ['confirmed', 'active'])

    const now = new Date()
    const occupancy = calculateFleetOccupancy(campers || [], liveBookings || [], now)
    const live = calculateFleetLiveStatus(campers || [], liveBookings || [], occupancy, now)
    const liveStatus = Object.fromEntries(live.map(l => [l.id, l]))

    return <CampersClient initialCampers={campersWithPricing} liveStatus={liveStatus} />
}
