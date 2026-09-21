import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CamperDetailClient from './CamperDetailClient'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'

export const dynamicParams = true

// Real Nomade Nation images (used with permission)
const DEMO_CAMPERS: Record<string, any> = {
    neo: {
        id: 'demo-1', slug: 'neo', name: 'NEO',
        description_es: 'La camper más polivalente y con 2.230L de maletero. Separación total de cabina, 540Ah litio Victron y aire acondicionado 12V.',
        specs: { beds: 3, seats: 3, length_m: 5.99, width_m: 2.05, height_m: 2.58, year: 2025, engine: 'Diésel 2.2L Multijet (140 CV)', transmission: 'Manual / Automático' },
        deposit_amount: 1000,
        images: [
            '/images/campers/neo/neo-ext.png',
            '/images/campers/neo/neo-interior.png',
            '/images/campers/neo/neo-top.webp',
        ],
        is_available: true,
    },
    space: {
        id: 'demo-2', slug: 'space', name: 'SPACE',
        description_es: 'SPACE redefine el confort con distribución abierta de 7m², cama elevable eléctrica sobre salón en U y 160L de agua limpia.',
        specs: { beds: 2, seats: 2, length_m: 5.99, width_m: 2.05, height_m: 2.58, year: 2025, engine: 'Diésel 2.2L Multijet (140 CV)', transmission: 'Manual / Automático' },
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

    return Object.keys(DEMO_CAMPERS).map(slug => ({ slug }))
}

interface PageProps {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ from?: string; to?: string; pax?: string }>
}

export default async function CamperDetailPage({ params, searchParams }: PageProps) {
    const { slug } = await params
    const { from, to } = await searchParams

    let camper = null

    try {
        const supabase = await createClient()
        const { data } = await supabase
            .from('campers')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .maybeSingle()

        if (data) camper = data
    } catch { }

    // Fall back to demo
    if (!camper) camper = DEMO_CAMPERS[slug]
    if (!camper) notFound()

    // Safely retrieve translations for fallback if needed, but ALWAYS prioritize DB values
    let fallbackName = slug.toUpperCase()
    let fallbackDesc = ''
    let fallbackEngine = 'Diésel 2.2L Multijet (140 CV)'
    let fallbackTrans = 'Manual / Automático'

    try {
        const t = await getTranslations('Campers.' + slug)
        fallbackName = t('name') || fallbackName
        fallbackDesc = t('description') || fallbackDesc
        fallbackEngine = t('engine') || fallbackEngine
        fallbackTrans = t('transmission') || fallbackTrans
    } catch {
        // Safe: custom slug not in static i18n
    }

    const effectiveCamper = {
        ...camper,
        name: camper.name || fallbackName,
        description_es: camper.description_es || fallbackDesc,
        specs: {
            ...camper.specs,
            engine: camper.specs?.engine || fallbackEngine,
            transmission: camper.specs?.transmission || fallbackTrans,
        }
    }

    // Fetch seasons
    let seasons: any[] = []
    let seasonsV2: any[] = []
    let seasonPeriods: any[] = []
    let durationDiscounts: any[] = []

    try {
        const supabase = await createClient()
        const [sLegacyRes, sV2Res, pRes, dRes] = await Promise.all([
            supabase.from('seasons').select('*'),
            supabase.from('seasons_v2').select('*'),
            supabase.from('season_periods').select('*'),
            supabase.from('duration_discounts').select('*').eq('is_active', true)
        ])
        if (sLegacyRes.data) seasons = sLegacyRes.data
        if (sV2Res.data) seasonsV2 = sV2Res.data
        if (pRes.data) seasonPeriods = pRes.data
        if (dRes.data) durationDiscounts = dRes.data
    } catch { }

    // Fetch extras
    let extras: any[] = []
    try {
        const supabase = await createClient()
        const { data } = await supabase.from('extras').select('*').eq('is_active', true)
        if (data) extras = data
    } catch { }

    return (
        <>
            <Navbar />
            <main style={{ paddingTop: 72 }}>
                <Suspense fallback={<div style={{ height: '50vh' }} />}>
                    <CamperDetailClient
                        camper={effectiveCamper}
                        seasons={seasons}
                        extras={extras}
                        initialFrom={from}
                        initialTo={to}
                        seasonsV2={seasonsV2}
                        seasonPeriods={seasonPeriods}
                        durationDiscounts={durationDiscounts}
                    />
                </Suspense>
            </main>
            <Footer />
        </>
    )
}
