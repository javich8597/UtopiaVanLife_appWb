import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const DEMO_CAMPERS = [
    {
        id: '1', slug: 'neo', name: 'NEO',
        description_es: 'La camper más polivalente de nuestra flota. Diseñada para viajar y dormir hasta 3 personas con la máxima comodidad.',
        thumbnail_url: '/images/campers/neo/neo-ext.png',
        specs: { beds: 3, seats: 3, length_m: 5.4 },
        deposit_amount: 500,
        pricePerNight: 120,
        seasonName: 'Temporada Media',
        isAvailable: true,
    },
    {
        id: '2', slug: 'space', name: 'SPACE',
        description_es: 'SPACE representa la máxima amplitud y libertad de movimiento. Pensada para quienes buscan una experiencia espaciosa.',
        thumbnail_url: '/images/campers/space/space-ext.png',
        specs: { beds: 3, seats: 4, length_m: 6.0 },
        deposit_amount: 600,
        pricePerNight: 140,
        seasonName: 'Temporada Media',
        isAvailable: true,
    },
]

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

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

        if (error || !campers || campers.length === 0) {
            return NextResponse.json({ campers: DEMO_CAMPERS })
        }

        // Fetch pricing for active seasons
        const { data: pricing } = await supabase
            .from('camper_pricing')
            .select('camper_id, price_per_night, seasons (name, start_date, end_date)')

        const campersWithPricing = campers.map(c => {
            const camperPrices = pricing?.filter((p: any) => p.camper_id === c.id) || []
            const defaultPrice = camperPrices[0]?.price_per_night || (c.slug === 'neo' ? 120 : 140)
            const defaultSeason = (camperPrices[0] as any)?.seasons?.name || 'Temporada Media'

            return {
                ...c,
                pricePerNight: defaultPrice,
                seasonName: defaultSeason,
                isAvailable: true,
            }
        })

        if (!from || !to) {
            return NextResponse.json({ campers: campersWithPricing })
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
            campers: campersWithPricing.map(c => ({
                ...c,
                isAvailable: !unavailableIds.has(c.id),
            })),
        })
    } catch {
        return NextResponse.json({ campers: DEMO_CAMPERS })
    }
}
