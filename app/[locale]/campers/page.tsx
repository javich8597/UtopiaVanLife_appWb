'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CamperCard from '@/components/campers/CamperCard'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'

const SEASON_PRICES: Record<string, number> = {
    'Temporada Alta': 175,
    'Temporada Media': 130,
    'Temporada Baja': 95,
}

function CatalogContent() {
    const tCatalog = useTranslations('CampersPage')
    const tCampers = useTranslations('Campers')
    
    const searchParams = useSearchParams()
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const pax = searchParams.get('pax') || '2'

    const [campers, setCampers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const getDemoCampers = () => [
        {
            id: '1', slug: 'neo', name: tCampers('neo.name'),
            description_es: tCampers('neo.description'),
            thumbnail_url: '/images/campers/neo/neo-ext.png',
            specs: { beds: 3, seats: 3, length_m: 5.4 },
            deposit_amount: 500, pricePerNight: 130,
            seasonName: 'Temporada Media', isAvailable: true,
        },
        {
            id: '2', slug: 'space', name: tCampers('space.name'),
            description_es: tCampers('space.description'),
            thumbnail_url: '/images/campers/space/space-ext.png',
            specs: { beds: 3, seats: 4, length_m: 6.0 },
            deposit_amount: 600, pricePerNight: 150,
            seasonName: 'Temporada Media', isAvailable: true,
        },
    ]

    useEffect(() => {
        setLoading(true)
        const params = new URLSearchParams()
        if (from) params.set('from', from)
        if (to) params.set('to', to)

        fetch(`/api/availability?${params.toString()}`)
            .then(r => r.json())
            .then(data => {
                // If no campers in DB yet, show demo
                if (!data.campers || data.campers.length === 0) {
                    setCampers(getDemoCampers())
                } else {
                    setCampers(data.campers)
                }
            })
            .catch(() => setCampers(getDemoCampers()))
            .finally(() => setLoading(false))
    }, [from, to])

    const available = campers.filter(c => c.isAvailable)
    const unavailable = campers.filter(c => !c.isAvailable)
    const sorted = [...available, ...unavailable]

    return (
        <div className="catalog__content">
            {/* Search summary banner */}
            {from && to && (
                <div className="catalog__search-info">
                    <span>
                        {Number(pax) !== 1 ? 
                            tCatalog('showingAvailability', { from: formatDate(from), to: formatDate(to), pax }) :
                            tCatalog('showingAvailabilitySingular', { from: formatDate(from), to: formatDate(to), pax })}
                    </span>
                    <a href="/campers" className="btn btn-ghost btn-sm">{tCatalog('viewAll')}</a>
                </div>
            )}

            {loading ? (
                <div className="catalog__grid">
                    {[1, 2].map(i => (
                        <div key={i} className="skeleton" style={{ height: 420, borderRadius: 'var(--radius-lg)' }} />
                    ))}
                </div>
            ) : (
                <div className="catalog__grid">
                    {sorted.map(c => (
                        <CamperCard
                            key={c.id}
                            {...c}
                            pricePerNight={c.pricePerNight ?? SEASON_PRICES['Temporada Media']}
                            seasonName={c.seasonName ?? 'Temporada Media'}
                            searchParams={from && to ? `from=${from}&to=${to}&pax=${pax}` : ''}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function CampersPage() {
    const t = useTranslations('CampersPage')

    return (
        <>
            <Navbar />
            <main style={{ paddingTop: 72 }}>
                {/* Header */}
                <section className="catalog-header" style={{ background: 'var(--black-matte)', padding: 'var(--space-16) 0' }}>
                    <div className="container">
                        <span className="text-label" style={{ color: 'var(--sand)' }}>{t('flota')}</span>
                        <h1 className="text-h1" style={{ color: 'white', marginTop: 'var(--space-2)' }}>
                            {t('title')}
                        </h1>
                        <p className="text-body" style={{ color: 'rgba(255,255,255,0.65)', marginTop: 'var(--space-4)', maxWidth: 500 }}>
                            {t('subtitle')}
                        </p>
                    </div>
                </section>

                {/* Catalog */}
                <section className="section">
                    <div className="container">
                        <Suspense fallback={<div className="skeleton" style={{ height: 420 }} />}>
                            <CatalogContent />
                        </Suspense>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    )
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
