import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CamperDetailClient from './CamperDetailClient'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'

// Real Nomade Nation images (used with permission)
const DEMO_CAMPERS: Record<string, any> = {
    neo: {
        id: 'demo-1', slug: 'neo', name: 'NEO',
        description_es: '',
        specs: { beds: 3, seats: 3, length_m: 5.4, width_m: 2.05, height_m: 2.65, year: 2024, engine: 'Diésel 2.0L (140 CV)', transmission: 'Manual/Automático' },
        deposit_amount: 500,
        images: [
            '/images/campers/neo/neo-ext.png',
            '/images/campers/neo/neo-interior.png',
            '/images/campers/neo/neo-top.webp',
        ],
        is_available: true,
    },
    space: {
        id: 'demo-2', slug: 'space', name: 'SPACE',
        description_es: '',
        specs: { beds: 3, seats: 4, length_m: 6.0, width_m: 2.05, height_m: 2.65, year: 2024, engine: 'Diésel 2.2L (140 CV)', transmission: 'Manual/Automático' },
        deposit_amount: 600,
        images: [
            '/images/campers/space/space-ext.png',
            '/images/campers/space/space-interior.png',
        ],
        is_available: true,
    },
}

export async function generateStaticParams() {
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
            .single()

        if (data) camper = data
    } catch { }

    // Fall back to demo
    if (!camper) camper = DEMO_CAMPERS[slug]
    if (!camper) notFound()

    // Fetch translations
    const t = await getTranslations('Campers.' + slug);
    const translatedCamper = {
        ...camper,
        name: t('name'),
        description_es: t('description'),
        specs: {
            ...camper.specs,
            engine: t('engine'),
            transmission: t('transmission'),
        }
    }

    // Fetch seasons
    let seasons: any[] = []
    try {
        const supabase = await createClient()
        const { data } = await supabase.from('seasons').select('*')
        if (data) seasons = data
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
                        camper={translatedCamper}
                        seasons={seasons}
                        extras={extras}
                        initialFrom={from}
                        initialTo={to}
                    />
                </Suspense>
            </main>
            <Footer />
        </>
    )
}
