'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/routing'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CamperCard from '@/components/campers/CamperCard'
import { Shield, BatteryCharging, Coffee, MapPin } from 'lucide-react'
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
                    <Link href="/campers" className="catalog__search-reset">
                        {tCatalog('viewAll')}
                    </Link>
                </div>
            )}

            {/* Quick Fleet Model Filter Pills Centered */}
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

            {/* Centered Grid Container */}
            <div className="catalog__grid-container">
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
                                variant="dark"
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Signature Standard Micro-Pillars Centered */}
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
                    align-items: center;
                    width: 100%;
                }

                .catalog__search-info {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 24px;
                    background: #131518;
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
                    width: 100%;
                    max-width: 1020px;
                    margin-bottom: 32px;
                }

                .catalog__search-text {
                    font-weight: 500;
                    color: #FFFFFF;
                    font-size: 0.95rem;
                }

                :global(.catalog__search-reset) {
                    display: inline-flex;
                    align-items: center;
                    padding: 6px 16px;
                    border-radius: var(--radius-full);
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    color: #FFFFFF;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all var(--transition-fast);
                }
                :global(.catalog__search-reset:hover) {
                    background: #CCA053;
                    border-color: #CCA053;
                    color: #0B0C0E;
                }

                .catalog__filters {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-bottom: 40px;
                    width: 100%;
                }

                .catalog__filter-btn {
                    display: inline-flex;
                    align-items: center;
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 10px 20px;
                    border-radius: var(--radius-full);
                    font-size: 0.86rem;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    transition: all 180ms ease;
                }

                .catalog__filter-btn:hover {
                    border-color: rgba(204, 160, 83, 0.5);
                    background: rgba(255, 255, 255, 0.06);
                    color: #FFFFFF;
                }

                .catalog__filter-btn--active {
                    background: #CCA053;
                    border-color: #CCA053;
                    color: #0B0C0E;
                    font-weight: 700;
                    box-shadow: 0 4px 16px rgba(204, 160, 83, 0.3);
                }

                .catalog__grid-container {
                    display: flex;
                    justify-content: center;
                    width: 100%;
                }

                .catalog__grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 480px));
                    gap: 32px;
                    width: 100%;
                    max-width: 1020px;
                    justify-content: center;
                }

                .catalog__skeleton-card {
                    height: 520px;
                    border-radius: 20px;
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }

                /* Pillars */
                .catalog__pillars {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    width: 100%;
                    max-width: 1020px;
                    margin-top: 56px;
                    padding-top: 40px;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                }

                .catalog__pillar-item {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                    padding: 24px;
                    transition: transform var(--transition-fast), border-color var(--transition-fast);
                }
                .catalog__pillar-item:hover {
                    transform: translateY(-2px);
                    border-color: rgba(204, 160, 83, 0.3);
                }

                .catalog__pillar-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: rgba(204, 160, 83, 0.12);
                    color: #CCA053;
                }

                .catalog__pillar-text h4 {
                    font-size: 0.96rem;
                    font-weight: 700;
                    color: #FFFFFF;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.01em;
                }

                .catalog__pillar-text p {
                    font-size: 0.83rem;
                    color: rgba(255, 255, 255, 0.6);
                    line-height: 1.55;
                    margin: 0;
                }

                @media (max-width: 960px) {
                    .catalog__grid {
                        grid-template-columns: minmax(0, 500px);
                    }
                    .catalog__pillars {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 640px) {
                    .catalog__grid {
                        grid-template-columns: 1fr;
                        gap: 24px;
                    }
                    .catalog__filters {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .catalog__filter-btn {
                        justify-content: center;
                    }
                    .catalog__pillars {
                        grid-template-columns: 1fr;
                        gap: 16px;
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
                {/* Centered Header */}
                <section className="catalog-hero">
                    <div className="container catalog-hero__container">
                        <div className="catalog-hero__eyebrow">
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
                    background: #0B0C0E;
                }

                .catalog-hero {
                    background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(204, 160, 83, 0.12), transparent 70%), #0B0C0E;
                    padding: 5rem 0 3.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    color: white;
                    text-align: center;
                }

                .catalog-hero__container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    max-width: 760px;
                    margin: 0 auto;
                }

                .catalog-hero__eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    letter-spacing: 0.22em;
                    color: #CCA053;
                    text-transform: uppercase;
                    margin-bottom: 14px;
                    background: rgba(204, 160, 83, 0.1);
                    border: 1px solid rgba(204, 160, 83, 0.28);
                    padding: 5px 16px;
                    border-radius: 999px;
                }

                .catalog-hero__title {
                    font-family: var(--font-display, sans-serif);
                    font-size: clamp(2.4rem, 5vw, 3.6rem);
                    font-weight: 800;
                    color: #FFFFFF;
                    letter-spacing: -0.02em;
                    line-height: 1.1;
                    margin: 0 0 16px 0;
                    text-transform: uppercase;
                    text-align: center;
                }

                .catalog-hero__subtitle {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 1.05rem;
                    line-height: 1.6;
                    max-width: 620px;
                    margin: 0 auto;
                    text-align: center;
                }

                .catalog-section {
                    padding-block: 48px 80px;
                }

                .catalog__loading-skeleton {
                    height: 480px;
                    border-radius: 20px;
                    background: #131518;
                    max-width: 1020px;
                    margin: 0 auto;
                }

                @media (max-width: 640px) {
                    .catalog-hero {
                        padding: 3.5rem 0 2.5rem;
                    }
                    .catalog-section {
                        padding-block: 32px 56px;
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
