import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseBlockedSlots, parseBlockedRanges } from '@/lib/booking/availability'

interface RouteParams {
    params: Promise<{ slug: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { slug } = await params
        const supabase = await createClient()

        // 1. Obtener camper id
        const { data: camper, error: camperError } = await supabase
            .from('campers')
            .select('id')
            .eq('slug', slug)
            .single()

        if (camperError || !camper) {
            return NextResponse.json({ blockedSlots: [], blockedRanges: [] })
        }

        const todayIso = new Date().toISOString().split('T')[0]

        // 2. Obtener reservas confirmadas/activas futuras o en curso con sus horas
        const { data: bookings } = await supabase
            .from('bookings')
            .select('start_date, pickup_time, end_date, dropoff_time')
            .eq('camper_id', camper.id)
            .in('status', ['confirmed', 'active'])
            .gte('end_date', todayIso)

        // 3. Obtener fechas expresamente bloqueadas
        const { data: blocked } = await supabase
            .from('blocked_dates')
            .select('start_date, end_date')
            .eq('camper_id', camper.id)
            .gte('end_date', todayIso)

        const rawBookings = bookings || []
        const rawBlocked = blocked || []

        const blockedSlots = parseBlockedSlots(rawBookings, rawBlocked)
        const blockedRanges = parseBlockedRanges(rawBookings, rawBlocked)

        return NextResponse.json({ blockedSlots, blockedRanges })
    } catch {
        return NextResponse.json({ blockedSlots: [], blockedRanges: [] })
    }
}
