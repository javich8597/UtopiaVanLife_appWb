'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/routing'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CamperCard from '@/components/campers/CamperCard'
import { Sparkles, Shield, BatteryCharging, Coffee, MapPin, Check } from 'lucide-react'
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
    const [filterModel, setFilterModel] = useState<'all' | 'space' | 'neo'>('all')

    const getDemoCampers = () => [
        {
            id: '1',
            slug: 'space',
            name: tCampers('space.name'),
            description_es: tCampers('space.description'),
            thumbnail_url: '/images/campers/uploads/1790382530493-2k_space_landscape_door_closed.jpeg',
            specs: { beds: 2, seats: 2, length_m: 6.0 },
            deposit_amount: 1000,
            pricePerNight: 150,
            seasonName: 'Temporada Media',
            isAvailable: true,
        },
        {
            id: '2',
            slug: 'neo',
            name: tCampers('neo.name'),
            description_es: tCampers('neo.description'),
            thumbnail_url: '/images/campers/neo/neo-ext.png',
            specs: { beds: 3, seats: 3, length_m: 6.0 },
            deposit_amount: 1000,
            pricePerNight: 130,
            seasonName: 'Temporada Media',
            isAvailable: true,
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

    const filteredCampers = useMemo(() => {
        if (filterModel === 'all') return sorted
        return sorted.filter(c => c.slug === filterModel)
    }, [sorted, filterModel])

    return (
        <div className="catalog__content">
            {/* Search summary banner if dates selected */}
            {from && to && (
                <div className="catalog__search-info">
                    <span className="catalog__search-text">
                        {Number(pax) !== 1
                            ? tCatalog('showingAvailability', { from: formatDate(from), to: formatDate(to), pax })
                            : tCatalog('showingAvailabilitySingular', { from: formatDate(from), to: formatDate(to), pax })}
                    </span>
                    <Link href="/campers" className="btn btn-ghost btn-sm">
                        {tCatalog('viewAll')}
                    </Link>
                </div>
            )}

            {/* Quick Fleet Model Filter Pills */}
            <div className="catalog__filters">
                <button
                    type="button"
                    onClick={() => setFilterModel('all')}
                    className={`catalog__filter-btn ${filterModel === 'all' ? 'catalog__filter-btn--active' : ''}`}
                >
                    <span>Toda la flota (2)</span>
                </button>
                <button
                    type="button"
                    onClick={() => setFilterModel('space')}
                    className={`catalog__filter-btn ${filterModel === 'space' ? 'catalog__filter-btn--active' : ''}`}
                >
                    <span>SPACE · Suite Diáfana & Cine (2 Pax)</span>
                </button>
                <button
                    type="button"
                    onClick={() => setFilterModel('neo')}
                    className={`catalog__filter-btn ${filterModel === 'neo' ? 'catalog__filter-btn--active' : ''}`}
                >
                    <span>NEO · Gran Maletero & Polivalencia (3 Pax)</span>
                </button>
            </div>

            {loading ? (
                <div className="catalog__grid">
                    {[1, 2].map(i => (
                        <div key={i} className="skeleton catalog__skeleton-card" />
                    ))}
                </div>
            ) : (
                <div className="catalog__grid">
                    {filteredCampers.map(c => (
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

            {/* Signature Standard Micro-Pillars */}
            <div className="catalog__pillars">
                <div className="catalog__pillar-item">
                    <div className="catalog__pillar-icon">
                        <BatteryCharging size={20} />
                    </div>
                    <div className="catalog__pillar-text">
                        <h4>Autonomía Off-Grid 100%</h4>
                        <p>Baterías Victron Litio y placas solares. Libertad real sin pisar campings.</p>
                    </div>
                </div>

                <div className="catalog__pillar-item">
                    <div className="catalog__pillar-icon">
                        <Shield size={20} />
                    </div>
                    <div className="catalog__pillar-text">
                        <h4>Seguro a Todo Riesgo</h4>
                        <p>Cobertura integral europea y asistencia personalizada 24h incluida.</p>
                    </div>
                </div>

                <div className="catalog__pillar-item">
                    <div className="catalog__pillar-icon">
                        <Coffee size={20} />
                    </div>
                    <div className="catalog__pillar-text">
                        <h4>Pack Confort Completo</h4>
                        <p>Sábanas de lino, toallas, menaje completo y mesa exterior de cortesía.</p>
                    </div>
                </div>

                <div className="catalog__pillar-item">
                    <div className="catalog__pillar-icon">
                        <MapPin size={20} />
                    </div>
                    <div className="catalog__pillar-text">
                        <h4>Discreción Total</h4>
                        <p>Diseño exterior limpio y sobrio, sin pegatinas publicitarias invasivas.</p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .catalog__content {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-8);
                }

                .catalog__search-info {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--space-4) var(--space-6);
                    background: white;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--gray-200);
                }

                .catalog__search-text {
                    font-weight: 500;
                    color: var(--black-matte);
                    font-size: 0.95rem;
                }

                .catalog__filters {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .catalog__filter-btn {
                    display: inline-flex;
                    align-items: center;
                    background: white;
                    border: 1px solid var(--gray-200);
                    padding: 8px 16px;
                    border-radius: 999px;
                    font-size: 0.84rem;
                    font-weight: 500;
                    color: var(--gray-700);
                    cursor: pointer;
                    transition: all 180ms ease;
                }

                .catalog__filter-btn:hover {
                    border-color: var(--forest-green);
                    color: var(--forest-green);
                }

                .catalog__filter-btn--active {
                    background: var(--forest-green);
                    border-color: var(--forest-green);
                    color: white;
                    font-weight: 600;
                    box-shadow: 0 4px 12px rgba(45, 58, 45, 0.2);
                }

                .catalog__grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: var(--space-8);
                }

                .catalog__skeleton-card {
                    height: 480px;
                    border-radius: var(--radius-xl);
                }

                /* Pillars */
                .catalog__pillars {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: var(--space-6);
                    margin-top: var(--space-12);
                    padding-top: var(--space-10);
                    border-top: 1px solid var(--gray-200);
                }

                .catalog__pillar-item {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .catalog__pillar-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: rgba(45, 58, 45, 0.08);
                    color: var(--forest-green);
                }

                .catalog__pillar-text h4 {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: var(--black-matte);
                    margin-bottom: 4px;
                }

                .catalog__pillar-text p {
                    font-size: 0.82rem;
                    color: var(--gray-600);
                    line-height: 1.5;
                    margin: 0;
                }

                @media (max-width: 860px) {
                    .catalog__pillars {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 640px) {
                    .catalog__grid {
                        grid-template-columns: 1fr;
                        gap: var(--space-6);
                    }
                    .catalog__pillars {
                        grid-template-columns: 1fr;
                        gap: var(--space-6);
                    }
                    .catalog__search-info {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                    }
                }
            `}</style>
        </div>
    )
}

export default function CampersPage() {
    const t = useTranslations('CampersPage')

    return (
        <>
            <Navbar />
            <main className="catalog-page">
                {/* Header */}
                <section className="catalog-hero">
                    <div className="container">
                        <div className="catalog-hero__eyebrow">
                            <Sparkles size={13} className="text-sand" />
                            <span>{t('flota')} · BOUTIQUE CAMPERS MALLORCA</span>
                        </div>
                        <h1 className="catalog-hero__title">
                            {t('title')}
                        </h1>
                        <p className="catalog-hero__subtitle">
                            {t('subtitle')}
                        </p>
                    </div>
                </section>

                {/* Catalog Section */}
                <section className="catalog-section">
                    <div className="container">
                        <Suspense fallback={<div className="skeleton catalog__loading-skeleton" />}>
                            <CatalogContent />
                        </Suspense>
                    </div>
                </section>
            </main>
            <Footer />

            <style jsx>{`
                .catalog-page {
                    min-height: 100vh;
                    padding-top: 72px;
                    background: var(--white-broken);
                }

                .catalog-hero {
                    background: linear-gradient(135deg, #151d17 0%, #0d120f 100%);
                    padding: var(--space-16) 0 var(--space-14);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    color: white;
                }

                .catalog-hero__eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    letter-spacing: 0.08em;
                    color: var(--sand);
                    text-transform: uppercase;
                    margin-bottom: var(--space-3);
                }

                .catalog-hero__title {
                    font-family: var(--font-serif, serif);
                    font-size: clamp(2.2rem, 4vw, 3.25rem);
                    font-weight: 400;
                    color: white;
                    letter-spacing: -0.02em;
                    line-height: 1.15;
                    margin-bottom: var(--space-3);
                }

                .catalog-hero__subtitle {
                    color: rgba(255, 255, 255, 0.72);
                    font-size: 1.05rem;
                    line-height: 1.65;
                    max-width: 580px;
                    margin: 0;
                }

                .catalog-section {
                    padding-block: var(--space-16);
                }

                .catalog__loading-skeleton {
                    height: 480px;
                    border-radius: var(--radius-xl);
                }

                @media (max-width: 640px) {
                    .catalog-hero {
                        padding: var(--space-10) 0;
                    }
                    .catalog-section {
                        padding-block: var(--space-8);
                    }
                }
            `}</style>
        </>
    )
}

function formatDate(d: string) {
    try {
        const [y, m, day] = d.split('-').map(Number)
        return new Date(y, m - 1, day).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    } catch {
        return d
    }
}
