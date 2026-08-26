'use client'

import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { Users, Moon, MapPin, Zap, ArrowRight } from 'lucide-react'

interface CamperCardProps {
    id: string
    slug: string
    name: string
    description_es?: string
    thumbnail_url: string
    specs: {
        beds?: number
        seats?: number
        length_m?: number
        year?: number
    }
    deposit_amount: number
    pricePerNight: number
    seasonName?: string
    isAvailable?: boolean
    searchParams?: string
}

export default function CamperCard({
    slug,
    name,
    description_es,
    thumbnail_url,
    specs,
    pricePerNight,
    seasonName,
    isAvailable = true,
    searchParams = '',
}: CamperCardProps) {
    const href = `/campers/${slug}${searchParams ? `?${searchParams}` : ''}`

    return (
        <article className={`camper-card ${!isAvailable ? 'camper-card--unavailable' : ''}`}>
            {/* Image */}
            <div className="camper-card__img-wrap">
                <Image
                    src={thumbnail_url || '/images/campers/neo/neo-ext.png'}
                    alt={name}
                    fill
                    className="camper-card__img"
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority
                />
                <div className="camper-card__overlay-gradient" />

                {!isAvailable && (
                    <div className="camper-card__unavailable-badge">
                        <span className="badge badge-gray">No disponible</span>
                    </div>
                )}
                {isAvailable && (
                    <div className="camper-card__top-badges">
                        {seasonName && (
                            <span className="camper-card__badge camper-card__badge--season">{seasonName}</span>
                        )}
                        <span className="camper-card__badge camper-card__badge--eco">
                            <Zap size={11} /> Autonomía 100%
                        </span>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="camper-card__body">
                <div className="camper-card__header">
                    <div>
                        <span className="text-label" style={{ color: 'var(--sand-dark)', fontSize: '0.7rem' }}>NOMADE NATION</span>
                        <h3 className="text-h3 camper-card__name" style={{ marginTop: 2 }}>{name}</h3>
                    </div>
                    <div className="camper-card__price">
                        <span className="camper-card__price-amount">{pricePerNight}€</span>
                        <span className="camper-card__price-label">/ noche</span>
                    </div>
                </div>

                {description_es && (
                    <p className="camper-card__desc text-small">{description_es}</p>
                )}

                {/* Specs */}
                <div className="camper-card__specs">
                    {specs.beds && (
                        <div className="camper-card__spec">
                            <Moon size={14} style={{ color: 'var(--forest-green)' }} />
                            <span>{specs.beds} camas</span>
                        </div>
                    )}
                    {specs.seats && (
                        <div className="camper-card__spec">
                            <Users size={14} style={{ color: 'var(--forest-green)' }} />
                            <span>{specs.seats} plazas</span>
                        </div>
                    )}
                    {specs.length_m && (
                        <div className="camper-card__spec">
                            <MapPin size={14} style={{ color: 'var(--forest-green)' }} />
                            <span>{specs.length_m}m largo</span>
                        </div>
                    )}
                </div>

                {/* CTA */}
                <Link
                    href={isAvailable ? (href as any) : '#'}
                    className={`btn ${isAvailable ? 'btn-forest' : 'btn-outline'} camper-card__btn ${!isAvailable ? 'btn--disabled' : ''}`}
                    style={{ width: '100%', marginTop: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                    aria-disabled={!isAvailable}
                    tabIndex={isAvailable ? 0 : -1}
                >
                    <span>{isAvailable ? 'Explorar Camper' : 'No disponible'}</span>
                    {isAvailable && <ArrowRight size={16} />}
                </Link>
            </div>

            <style jsx>{`
        .camper-card {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .camper-card:hover { 
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(45, 58, 45, 0.10);
          border-color: rgba(45, 58, 45, 0.25);
        }
        .camper-card--unavailable {
          filter: grayscale(100%);
          opacity: 0.65;
        }
        .camper-card--unavailable:hover { transform: none; box-shadow: var(--shadow-sm); }
        .camper-card__img-wrap {
          position: relative;
          aspect-ratio: 16/11;
          overflow: hidden;
          background: var(--gray-100);
        }
        .camper-card__img {
          transition: transform 0.4s ease;
        }
        .camper-card:hover .camper-card__img {
          transform: scale(1.03);
        }
        .camper-card__overlay-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%);
          pointer-events: none;
        }
        .camper-card__top-badges {
          position: absolute;
          top: var(--space-3);
          left: var(--space-3);
          right: var(--space-3);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-2);
          z-index: 1;
        }
        .camper-card__badge {
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .camper-card__badge--season {
          background: rgba(245, 245, 243, 0.95);
          color: var(--black-matte);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }
        .camper-card__badge--eco {
          background: var(--forest-green);
          color: var(--sand);
        }
        .camper-card__unavailable-badge {
          position: absolute;
          top: var(--space-3);
          left: var(--space-3);
          z-index: 1;
        }
        .camper-card__body {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: var(--space-6);
          gap: var(--space-4);
        }
        .camper-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-2);
        }
        .camper-card__name {
          font-weight: 500;
          color: var(--black-matte);
        }
        .camper-card__price {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .camper-card__price-amount {
          font-family: var(--font-display);
          font-size: 1.65rem;
          font-weight: 600;
          color: var(--forest-green);
          line-height: 1;
        }
        .camper-card__price-label {
          font-size: 0.72rem;
          color: var(--gray-500);
          font-weight: 500;
        }
        .camper-card__desc {
          color: var(--gray-600);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.6;
        }
        .camper-card__specs {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
          padding: var(--space-3) 0;
          border-top: 1px solid var(--gray-100);
          border-bottom: 1px solid var(--gray-100);
        }
        .camper-card__spec {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--gray-700);
          background: var(--gray-50);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
        }
        .btn--disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
      `}</style>
        </article>
    )
}
