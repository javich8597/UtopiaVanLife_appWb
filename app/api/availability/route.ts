import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { resolveSeasonForDate, SeasonV2, SeasonPeriod } from '@/lib/pricing/engine'

const DEMO_CAMPERS = [
    {
        id: '1', slug: 'neo', name: 'NEO',
        description_es: 'La camper más polivalente y con 2.230L de maletero. Separación total de cabina, 540Ah litio Victron y aire acondicionado 12V.',
        thumbnail_url: '/images/campers/neo/neo-ext.png',
        specs: { beds: 3, seats: 3, length_m: 6.0 },
        deposit_amount: 1000,
        pricePerNight: 120,
        seasonName: 'Temporada Media',
        isAvailable: true,
    },
    {
        id: '2', slug: 'space', name: 'SPACE',
        description_es: 'SPACE redefine el confort con distribución abierta de 7m², cama elevable eléctrica sobre salón en U y 160L de agua limpia.',
        thumbnail_url: '/images/campers/space/space-ext.png',
        specs: { beds: 2, seats: 2, length_m: 6.0 },
        deposit_amount: 1000,
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
        // Fetch all active campers with their base price
        const { data: campers, error } = await supabase
            .from('campers')
            .select('id, slug, name, description_es, thumbnail_url, specs, deposit_amount, base_price_per_night')
            .eq('is_active', true)

        if (error || !campers || campers.length === 0) {
            return NextResponse.json({ campers: DEMO_CAMPERS })
        }

        // Fetch seasons_v2 and season_periods for dynamic pricing
        const [seasonsV2Res, periodsRes] = await Promise.all([
            supabase.from('seasons_v2').select('*'),
            supabase.from('season_periods').select('*')
        ])

        const seasonsV2: SeasonV2[] = seasonsV2Res.data || []
        const periods: SeasonPeriod[] = periodsRes.data || []

        const dateToResolve = from ? from : new Date()
        const activeSeason = resolveSeasonForDate(dateToResolve, seasonsV2, periods)

        const campersWithPricing = campers.map(c => {
            const basePrice = Number(c.base_price_per_night) || (c.slug === 'space' ? 135 : 110)
            const supplement = Number(activeSeason.supplement_per_night) || 0
            const calculatedPrice = basePrice + supplement

            return {
                ...c,
                pricePerNight: calculatedPrice,
                seasonName: activeSeason.name,
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
