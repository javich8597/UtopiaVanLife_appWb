import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CamperDetailClient from './CamperDetailClient'
import { createClient } from '@/lib/supabase/server'

// Real Nomade Nation images (used with permission)
const DEMO_CAMPERS: Record<string, any> = {
    aurora: {
        id: 'demo-1', slug: 'aurora', name: 'Aurora',
        description_es: 'Aurora es la perfecta compañera para parejas que buscan la combinación ideal de confort y aventura. Con su diseño minimalista y materiales premium, cada rincón de Mallorca se convierte en tu hogar.\n\nEquipada con cama fija, cocina completa, ducha integrada, claraboya panorámica y todo lo que necesitas para tu ruta perfecta por la isla.',
        specs: { beds: 2, seats: 2, length_m: 5.4, width_m: 2.1, height_m: 2.8, year: 2023, engine: 'Diesel 2.0L', transmission: 'Automático' },
        deposit_amount: 500,
        images: [
            'https://nomade-nation.com/wp-content/uploads/2024/07/Comp-10-optimized.jpg',
            'https://nomade-nation.com/wp-content/uploads/2024/10/Dia-optimized.jpg',
            'https://nomade-nation.com/wp-content/uploads/2024/10/Oscuro-optimized.jpg',
            'https://nomade-nation.com/wp-content/uploads/2024/07/ducha-interior_neo-nomade-nation-e1732311318748-optimized.jpg',
            'https://nomade-nation.com/wp-content/uploads/2024/07/claraboya_nomade_nation_neo_van_camper-optimized.jpg',
        ],
        is_available: true,
    },
    solara: {
        id: 'demo-2', slug: 'solara', name: 'Solara',
        description_es: 'Solara es nuestra camper más espaciosa, diseñada para familias o grupos de amigos que no quieren renunciar a ninguna comodidad. Con su distribución inteligente y amplio almacenaje, es perfecta para estancias largas.\n\nSu diseño compacto y ágil te permite acceder a los lugares más escondidos de Mallorca sin sacrificar el confort.',
        specs: { beds: 2, seats: 4, length_m: 6.2, width_m: 2.2, height_m: 3.1, year: 2022, engine: 'Diesel 2.2L', transmission: 'Manual' },
        deposit_amount: 600,
        images: [
            'https://nomade-nation.com/wp-content/uploads/2025/01/campero-neo-s-puerta-cerrada0-optimized.jpg',
            'https://nomade-nation.com/wp-content/uploads/2025/01/Portadas-web-Neo-S-optimized.png',
            'https://nomade-nation.com/wp-content/uploads/2025/01/2-1-optimized.png',
            'https://nomade-nation.com/wp-content/uploads/2025/01/3-3-optimized.png',
            'https://nomade-nation.com/wp-content/uploads/2025/01/2-5-optimized.png',
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
                        camper={camper}
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
