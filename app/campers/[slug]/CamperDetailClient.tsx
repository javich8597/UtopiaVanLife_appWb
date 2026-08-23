'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Moon, Users, Ruler, Fuel, Calendar, Settings } from 'lucide-react'
import PriceCalculator from '@/components/booking/PriceCalculator'
import MapboxExperiences from '@/components/map/MapboxExperiences'

interface Props {
    camper: any
    seasons: any[]
    extras: any[]
    initialFrom?: string
    initialTo?: string
}

export default function CamperDetailClient({ camper, seasons, extras, initialFrom, initialTo }: Props) {
    const [currentImg, setCurrentImg] = useState(0)
    const images = camper.images?.length ? camper.images : [camper.thumbnail_url]

    const prevImg = () => setCurrentImg(i => (i - 1 + images.length) % images.length)
    const nextImg = () => setCurrentImg(i => (i + 1) % images.length)

    const specs = camper.specs || {}

    const specsItems = [
        { icon: Moon, label: 'Camas', value: specs.beds ? `${specs.beds} camas` : '-' },
        { icon: Users, label: 'Plazas', value: specs.seats ? `${specs.seats} plazas` : '-' },
        { icon: Ruler, label: 'Longitud', value: specs.length_m ? `${specs.length_m}m` : '-' },
        { icon: Fuel, label: 'Motor', value: specs.engine ?? '-' },
        { icon: Settings, label: 'Cambio', value: specs.transmission ?? '-' },
        { icon: Calendar, label: 'Año', value: specs.year ?? '-' },
    ]

    // Use demo seasons if none from DB
    const effectiveSeasons = seasons.length > 0 ? seasons : [
        { id: 's1', name: 'Temporada Alta', start_date: '2025-06-15', end_date: '2025-09-15', price_per_night: 175, discount_7days_pct: 10 },
        { id: 's2', name: 'Temporada Media', start_date: '2025-04-01', end_date: '2025-06-14', price_per_night: 130, discount_7days_pct: 8 },
        { id: 's3', name: 'Temporada Baja', start_date: '2025-11-01', end_date: '2026-03-31', price_per_night: 95, discount_7days_pct: 5 },
        { id: 's4', name: 'Temporada Media', start_date: '2026-04-01', end_date: '2026-06-14', price_per_night: 135, discount_7days_pct: 8 },
        { id: 's5', name: 'Temporada Alta', start_date: '2026-06-15', end_date: '2026-09-15', price_per_night: 180, discount_7days_pct: 10 },
    ]

    const effectiveExtras = extras.length > 0 ? extras : [
        { id: 'e1', name_es: 'Kit de Limpieza', price: 75, icon: 'sparkles' },
        { id: 'e2', name_es: 'Kit Snorkel', price: 25, icon: 'waves' },
        { id: 'e3', name_es: 'Silla de Camping', price: 15, icon: 'armchair' },
        { id: 'e4', name_es: 'Wi-Fi Portátil', price: 20, icon: 'wifi' },
    ]

    return (
        <div className="camper-detail">
            {/* Gallery */}
            <div className="camper-detail__gallery">
                <div className="camper-detail__img-wrap">
                    <Image
                        src={images[currentImg] || 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=1200&q=85'}
                        alt={`${camper.name} - foto ${currentImg + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        priority
                        sizes="(max-width: 768px) 100vw, 65vw"
                    />
                    {images.length > 1 && (
                        <>
                            <button className="gallery-btn gallery-btn--prev" onClick={prevImg} aria-label="Foto anterior">
                                <ChevronLeft size={20} />
                            </button>
                            <button className="gallery-btn gallery-btn--next" onClick={nextImg} aria-label="Foto siguiente">
                                <ChevronRight size={20} />
                            </button>
                            <div className="gallery-dots">
                                {images.map((_: any, i: number) => (
                                    <button
                                        key={i}
                                        className={`gallery-dot ${i === currentImg ? 'gallery-dot--active' : ''}`}
                                        onClick={() => setCurrentImg(i)}
                                        aria-label={`Foto ${i + 1}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="container">
                <div className="camper-detail__layout">
                    {/* Main content */}
                    <div className="camper-detail__main">
                        {/* Header */}
                        <div className="camper-detail__header">
                            <div>
                                <span className="text-label" style={{ color: 'var(--sand-dark)' }}>Utopia Van Life</span>
                                <h1 className="text-h1" style={{ marginTop: 'var(--space-1)' }}>{camper.name}</h1>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="camper-detail__desc">
                            {(camper.description_es || '').split('\n\n').map((para: string, i: number) => (
                                <p key={i} className="text-body" style={{ color: 'var(--gray-600)' }}>{para}</p>
                            ))}
                        </div>

                        {/* Specs */}
                        <div>
                            <h2 className="text-h4" style={{ marginBottom: 'var(--space-4)' }}>Especificaciones</h2>
                            <div className="camper-detail__specs">
                                {specsItems.map((s, i) => (
                                    <div key={i} className="spec-item">
                                        <div className="spec-item__icon">
                                            <s.icon size={18} strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <div className="spec-item__label text-xs" style={{ color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                                            <div className="spec-item__value text-small" style={{ fontWeight: 500 }}>{s.value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Map */}
                        <div>
                            <h2 className="text-h4" style={{ marginBottom: 'var(--space-2)' }}>Mapa de Experiencias</h2>
                            <p className="text-small" style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-4)' }}>
                                Lugares destacados para tu ruta por Mallorca con esta camper.
                            </p>
                            <MapboxExperiences />
                        </div>
                    </div>

                    {/* Sticky Calculator */}
                    <div className="camper-detail__sidebar">
                        <PriceCalculator
                            camperSlug={camper.slug}
                            depositAmount={camper.deposit_amount}
                            seasons={effectiveSeasons}
                            availableExtras={effectiveExtras}
                            initialFrom={initialFrom}
                            initialTo={initialTo}
                        />
                    </div>
                </div>
            </div>

            <style jsx>{`
        .camper-detail__gallery {
          width: 100%;
          background: var(--gray-100);
        }
        .camper-detail__img-wrap {
          position: relative;
          height: 60vh;
          min-height: 400px;
          max-height: 640px;
          overflow: hidden;
        }
        .gallery-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px; height: 44px;
          background: rgba(245,245,243,0.85);
          backdrop-filter: blur(8px);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          transition: background var(--transition-fast);
          z-index: 5;
        }
        .gallery-btn:hover { background: white; }
        .gallery-btn--prev { left: var(--space-4); }
        .gallery-btn--next { right: var(--space-4); }
        .gallery-dots {
          position: absolute;
          bottom: var(--space-4);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: var(--space-2);
        }
        .gallery-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.5);
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .gallery-dot--active {
          background: white;
          width: 24px;
          border-radius: 4px;
        }
        .camper-detail__layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: var(--space-12);
          padding-block: var(--space-12);
          align-items: start;
        }
        .camper-detail__main {
          display: flex;
          flex-direction: column;
          gap: var(--space-10);
        }
        .camper-detail__header {
          border-bottom: 1px solid var(--gray-200);
          padding-bottom: var(--space-6);
        }
        .camper-detail__desc {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .camper-detail__specs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-3);
        }
        .spec-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          background: var(--cream);
          border-radius: var(--radius-md);
        }
        .spec-item__icon {
          width: 38px; height: 38px;
          background: white;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest-green);
          flex-shrink: 0;
        }
        @media (max-width: 960px) {
          .camper-detail__layout {
            grid-template-columns: 1fr;
          }
          .camper-detail__sidebar { order: -1; }
        }
        @media (max-width: 640px) {
          .camper-detail__specs {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
        </div>
    )
}
