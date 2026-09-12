import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
            return NextResponse.json({ blockedRanges: [] })
        }

        const todayIso = new Date().toISOString().split('T')[0]

        // 2. Obtener reservas confirmadas/activas futuras o en curso
        const { data: bookings } = await supabase
            .from('bookings')
            .select('start_date, end_date')
            .eq('camper_id', camper.id)
            .in('status', ['confirmed', 'active'])
            .gte('end_date', todayIso)

        // 3. Obtener fechas expresamente bloqueadas
        const { data: blocked } = await supabase
            .from('blocked_dates')
            .select('start_date, end_date')
            .eq('camper_id', camper.id)
            .gte('end_date', todayIso)

        const blockedRanges = [
            ...(bookings || []).map((b: { start_date: string; end_date: string }) => ({
                start: b.start_date.split('T')[0],
                end: b.end_date.split('T')[0],
            })),
            ...(blocked || []).map((b: { start_date: string; end_date: string }) => ({
                start: b.start_date.split('T')[0],
                end: b.end_date.split('T')[0],
            })),
        ]

        return NextResponse.json({ blockedRanges })
    } catch {
        return NextResponse.json({ blockedRanges: [] })
    }
}
