import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import BookingWizardClient from './BookingWizardClient'
import { WizardCamper, WizardExtraItem } from './types'

export const dynamicParams = true

const DEMO_CAMPERS: Record<string, any> = {
    neo: {
        id: 'demo-1',
        slug: 'neo',
        name: 'NEO',
        description_es: 'La camper más polivalente y con 2.230L de maletero. Separación total de cabina, 540Ah litio Victron y aire acondicionado 12V.',
        specs: {
            beds: 3,
            seats: 3,
            length_m: 5.99,
            width_m: 2.05,
            height_m: 2.58,
            year: 2025,
            engine: 'Diésel 2.2L Multijet (140 CV)',
            transmission: 'Manual / Automático',
        },
        base_price_per_night: 110,
        price_per_night: 110,
        deposit_amount: 1000,
        images: [
            '/images/campers/neo/neo-ext.png',
            '/images/campers/neo/neo-interior.png',
            '/images/campers/neo/blueprints/floorplan-closed.webp',
        ],
        is_available: true,
    },
    space: {
        id: 'demo-2',
        slug: 'space',
        name: 'SPACE',
        description_es: 'SPACE redefine el confort con distribución abierta de 7m², cama elevable eléctrica sobre salón en U y 160L de agua limpia.',
        specs: {
            beds: 2,
            seats: 2,
            length_m: 5.99,
            width_m: 2.05,
            height_m: 2.58,
            year: 2025,
            engine: 'Diésel 2.2L Multijet (140 CV)',
            transmission: 'Manual / Automático',
        },
        base_price_per_night: 135,
        price_per_night: 135,
        deposit_amount: 1000,
        images: [
            '/images/campers/space/space-ext.png',
            '/images/campers/space/space-interior.png',
        ],
        is_available: true,
    },
}

export async function generateStaticParams() {
    try {
        const supabase = await createClient()
        const { data: campers } = await supabase
            .from('campers')
            .select('slug')
            .eq('is_active', true)

        if (campers && campers.length > 0) {
            return campers.map((c: any) => ({ slug: c.slug }))
        }
    } catch { }

    return Object.keys(DEMO_CAMPERS).map((slug) => ({ slug }))
}

interface PageProps {
    params: Promise<{ locale: string; slug: string }>
    searchParams: Promise<{
        from?: string
        to?: string
        startSlot?: 'morning' | 'afternoon'
        endSlot?: 'morning' | 'afternoon'
        pickup_time?: string
        dropoff_time?: string
        pax?: string
        km?: 'included_150' | 'unlimited'
        cancellation?: 'standard' | 'flexible'
    }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const camperName = slug.toUpperCase()
    return {
        title: `Reserva ${camperName} · Wizard Multi-Paso | Utopia Van Life`,
        description: `Configura tu reserva en 5 sencillos pasos para tu camper ${camperName} en Mallorca: fechas, kilometraje, políticas y extras.`,
    }
}

export default async function ReservaWizardPage({ params, searchParams }: PageProps) {
    const { locale, slug } = await params
    const search = await searchParams

    let camperData: any = null

    try {
        const supabase = await createClient()
        const { data } = await supabase
            .from('campers')
            .select('*')
            .eq('slug', slug)
            .maybeSingle()

        if (data) camperData = data
    } catch (e) {
        console.warn('Could not fetch camper from Supabase, using fallback:', e)
    }

    if (!camperData) {
        camperData = DEMO_CAMPERS[slug]
    }

    if (!camperData) {
        notFound()
    }

    const effectiveCamper: WizardCamper = {
        id: camperData.id,
        slug: camperData.slug,
        name: camperData.name || slug.toUpperCase(),
        description_es: camperData.description_es,
        specs: camperData.specs,
        base_price_per_night: Number(camperData.base_price_per_night || camperData.price_per_night || 110),
        price_per_night: Number(camperData.price_per_night || camperData.base_price_per_night || 110),
        deposit_amount: Number(camperData.deposit_amount) || 1000,
        images: camperData.images || [],
    }

    // Fetch seasons, periods, duration discounts & extras
    let seasonsV2: any[] = []
    let seasonPeriods: any[] = []
    let durationDiscounts: any[] = []
    let availableExtras: WizardExtraItem[] = []

    try {
        const supabase = await createClient()
        const [sV2Res, pRes, dRes, eRes] = await Promise.all([
            supabase.from('seasons_v2').select('*'),
            supabase.from('season_periods').select('*'),
            supabase.from('duration_discounts').select('*').eq('is_active', true),
            supabase.from('extras').select('*').eq('is_active', true),
        ])

        if (sV2Res.data) seasonsV2 = sV2Res.data
        if (pRes.data) seasonPeriods = pRes.data
        if (dRes.data) durationDiscounts = dRes.data
        if (eRes.data) {
            availableExtras = eRes.data.map((item: any) => ({
                id: item.id,
                name_es: item.name_es || item.name || 'Extra',
                name: item.name || item.name_es || 'Extra',
                price: Number(item.price) || 0,
                price_type: item.price_type === 'per_day' ? 'per_day' : 'per_rental',
                category: item.category || 'Equipamiento',
                description: item.description || item.description_es || '',
                icon: item.icon,
            }))
        }
    } catch (e) {
        console.warn('Error fetching supplemental wizard data:', e)
    }

    // Parse initial slots
    let parsedStartSlot: 'morning' | 'afternoon' = 'morning'
    if (search.startSlot === 'afternoon' || search.pickup_time === '15:00') {
        parsedStartSlot = 'afternoon'
    }

    let parsedEndSlot: 'morning' | 'afternoon' = 'afternoon'
    if (search.endSlot === 'morning' || search.dropoff_time === '12:00' || search.dropoff_time === '09:00') {
        parsedEndSlot = 'morning'
    }

    return (
        <Suspense fallback={<div style={{ minHeight: '80vh', background: '#F5F5F3' }} />}>
            <BookingWizardClient
                camper={effectiveCamper}
                availableExtras={availableExtras}
                seasonsV2={seasonsV2}
                seasonPeriods={seasonPeriods}
                durationDiscounts={durationDiscounts}
                initialFrom={search.from || ''}
                initialTo={search.to || ''}
                initialStartSlot={parsedStartSlot}
                initialEndSlot={parsedEndSlot}
                initialPax={Number(search.pax) || 2}
                initialKmPackage={search.km === 'unlimited' ? 'unlimited' : 'included_150'}
                initialCancellationPolicy={search.cancellation === 'flexible' ? 'flexible' : 'standard'}
                locale={locale}
            />
        </Suspense>
    )
}
