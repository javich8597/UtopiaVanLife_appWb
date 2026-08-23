import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const DEMO_CAMPERS = [
    {
        id: 'demo-1', slug: 'aurora', name: 'Aurora',
        description_es: 'La perfecta compañera para parejas. Elegante, cómoda y lista para explorar cada rincón de Mallorca.',
        thumbnail_url: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800&q=80',
        specs: { beds: 2, seats: 2, length_m: 5.4 },
        deposit_amount: 500, isAvailable: true,
    },
    {
        id: 'demo-2', slug: 'solara', name: 'Solara',
        description_es: 'Espaciosa y familiar. Para aventureros que no renuncian a ninguna comodidad.',
        thumbnail_url: 'https://images.unsplash.com/photo-1612865547334-09cb8cb455da?w=800&q=80',
        specs: { beds: 2, seats: 4, length_m: 6.2 },
        deposit_amount: 600, isAvailable: true,
    },
]

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Create a client using just the anon key — no cookies needed for public reads
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => [], setAll: () => { } } }
    )

    try {
        // Fetch all active campers
        const { data: campers, error } = await supabase
            .from('campers')
            .select('id, slug, name, description_es, thumbnail_url, specs, deposit_amount')
            .eq('is_active', true)

        // If DB empty, return demo data
        if (error || !campers || campers.length === 0) {
            return NextResponse.json({ campers: DEMO_CAMPERS })
        }

        if (!from || !to) {
            return NextResponse.json({ campers: campers.map(c => ({ ...c, isAvailable: true })) })
        }

        // Find booked camper IDs in that range
        const { data: bookings } = await supabase
            .from('bookings')
            .select('camper_id')
            .in('status', ['confirmed', 'active'])
            .lte('start_date', to)
            .gte('end_date', from)

        // Find blocked camper IDs in that range
        const { data: blocked } = await supabase
            .from('blocked_dates')
            .select('camper_id')
            .lte('start_date', to)
            .gte('end_date', from)

        const unavailableIds = new Set([
            ...(bookings?.map(b => b.camper_id) ?? []),
            ...(blocked?.map(b => b.camper_id) ?? []),
        ])

        return NextResponse.json({
            campers: campers.map(c => ({
                ...c,
                isAvailable: !unavailableIds.has(c.id),
            })),
        })
    } catch {
        // Fallback to demo data on any error
        return NextResponse.json({ campers: DEMO_CAMPERS })
    }
}
