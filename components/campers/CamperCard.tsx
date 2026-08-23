'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Users, Moon, MapPin } from 'lucide-react'

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
        <article className={`camper-card card ${!isAvailable ? 'camper-card--unavailable' : ''}`}>
            {/* Image */}
            <div className="camper-card__img-wrap">
                <Image
                    src={thumbnail_url || 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800&q=80'}
                    alt={name}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                {!isAvailable && (
                    <div className="camper-card__unavailable-badge">
                        <span className="badge badge-gray">No disponible</span>
                    </div>
                )}
                {isAvailable && seasonName && (
                    <div className="camper-card__season-badge">
                        <span className="badge badge-sand">{seasonName}</span>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="camper-card__body card-body">
                <div className="camper-card__header">
                    <h3 className="text-h4 camper-card__name">{name}</h3>
                    <div className="camper-card__price">
                        <span className="camper-card__price-amount">{pricePerNight}€</span>
                        <span className="camper-card__price-label">/ noche</span>
                    </div>
                </div>

                {description_es && (
                    <p className="camper-card__desc text-small truncate-2">{description_es}</p>
                )}

                {/* Specs */}
                <div className="camper-card__specs">
                    {specs.beds && (
                        <div className="camper-card__spec">
                            <Moon size={14} />
                            <span>{specs.beds} camas</span>
                        </div>
                    )}
                    {specs.seats && (
                        <div className="camper-card__spec">
                            <Users size={14} />
                            <span>{specs.seats} plazas</span>
                        </div>
                    )}
                    {specs.length_m && (
                        <div className="camper-card__spec">
                            <MapPin size={14} />
                            <span>{specs.length_m}m</span>
                        </div>
                    )}
                </div>

                {/* CTA */}
                <Link
                    href={isAvailable ? href : '#'}
                    className={`btn btn-forest camper-card__btn ${!isAvailable ? 'btn--disabled' : ''}`}
                    style={{ width: '100%', marginTop: 'auto' }}
                    aria-disabled={!isAvailable}
                    tabIndex={isAvailable ? 0 : -1}
                >
                    {isAvailable ? 'Ver camper' : 'No disponible'}
                </Link>
            </div>

            <style jsx>{`
        .camper-card {
          display: flex;
          flex-direction: column;
          transition: transform var(--transition-base), box-shadow var(--transition-base);
        }
        .camper-card:hover { transform: translateY(-4px); }
        .camper-card--unavailable {
          filter: grayscale(100%);
          opacity: 0.68;
        }
        .camper-card--unavailable:hover { transform: none; box-shadow: var(--shadow-sm); }
        .camper-card__img-wrap {
          position: relative;
          aspect-ratio: 4/3;
          overflow: hidden;
          background: var(--gray-100);
        }
        .camper-card__unavailable-badge,
        .camper-card__season-badge {
          position: absolute;
          top: var(--space-3);
          left: var(--space-3);
          z-index: 1;
        }
        .camper-card__body {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: var(--space-3);
        }
        .camper-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-2);
        }
        .camper-card__name { flex: 1; }
        .camper-card__price {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .camper-card__price-amount {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 500;
          color: var(--forest-green);
          line-height: 1;
        }
        .camper-card__price-label {
          font-size: 0.7rem;
          color: var(--gray-400);
        }
        .camper-card__desc {
          color: var(--gray-600);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .camper-card__specs {
          display: flex;
          gap: var(--space-4);
          flex-wrap: wrap;
        }
        .camper-card__spec {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-size: 0.82rem;
          color: var(--gray-600);
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
