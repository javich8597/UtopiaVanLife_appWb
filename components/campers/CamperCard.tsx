'use client'

import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { Users, Moon, Ruler, Zap, ArrowRight } from 'lucide-react'

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

    const subtitleTagline = slug === 'neo' 
        ? 'Máxima polivalencia y maletero de 2.230L'
        : 'Salón panorámico en U y distribución diáfana 7m²'

    return (
        <article className={`camper-card ${!isAvailable ? 'camper-card--unavailable' : ''}`}>
            {/* Image Wrap */}
            <div className="camper-card__img-wrap">
                <Image
                    src={thumbnail_url || '/images/campers/neo/neo-ext.png'}
                    alt={name}
                    fill
                    className="camper-card__img"
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, 520px"
                    priority
                />
                <div className="camper-card__overlay-gradient" />

                {/* Floating Top Badges */}
                <div className="camper-card__top-badges">
                    <span className="camper-card__badge camper-card__badge--brand">
                        Nomade Nation
                    </span>
                    {isAvailable ? (
                        <span className="camper-card__badge camper-card__badge--eco">
                            <Zap size={11} /> Autonomía 100%
                        </span>
                    ) : (
                        <span className="camper-card__badge camper-card__badge--unavailable">
                            No disponible
                        </span>
                    )}
                </div>

                {/* Subtle Season Tag */}
                {seasonName && isAvailable && (
                    <div className="camper-card__season-tag">
                        <span>{seasonName}</span>
                    </div>
                )}
            </div>

            {/* Card Body */}
            <div className="camper-card__body">
                {/* Header: Name + Price */}
                <div className="camper-card__header">
                    <div className="camper-card__title-group">
                        <h3 className="camper-card__name text-display">{name}</h3>
                        <p className="camper-card__tagline">{subtitleTagline}</p>
                    </div>
                    <div className="camper-card__price">
                        <span className="camper-card__price-amount">{pricePerNight}€</span>
                        <span className="camper-card__price-label">/ noche</span>
                    </div>
                </div>

                {/* Description */}
                {description_es && (
                    <p className="camper-card__desc text-small">{description_es}</p>
                )}

                {/* Specs Chips */}
                <div className="camper-card__specs">
                    {specs.seats && (
                        <div className="camper-card__spec">
                            <Users size={14} className="camper-card__spec-icon" />
                            <span>{specs.seats} plazas</span>
                        </div>
                    )}
                    {specs.beds && (
                        <div className="camper-card__spec">
                            <Moon size={14} className="camper-card__spec-icon" />
                            <span>{specs.beds} camas</span>
                        </div>
                    )}
                    {specs.length_m && (
                        <div className="camper-card__spec">
                            <Ruler size={14} className="camper-card__spec-icon" />
                            <span>{specs.length_m}m</span>
                        </div>
                    )}
                </div>

                {/* Interactive CTA */}
                <Link
                    href={isAvailable ? (href as any) : '#'}
                    className={`btn ${isAvailable ? 'btn-forest' : 'btn-outline'} camper-card__btn ${!isAvailable ? 'btn--disabled' : ''}`}
                    aria-disabled={!isAvailable}
                    tabIndex={isAvailable ? 0 : -1}
                >
                    <span>{isAvailable ? 'Explorar Camper' : 'No disponible'}</span>
                    {isAvailable && <ArrowRight size={15} className="camper-card__btn-arrow" />}
                </Link>
            </div>

            <style jsx>{`
        .camper-card {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: var(--radius-xl);
          border: 1px solid var(--gray-200);
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(26, 26, 26, 0.04);
          transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1), 
                      box-shadow 220ms cubic-bezier(0.23, 1, 0.32, 1), 
                      border-color 220ms ease;
          position: relative;
        }
        .camper-card:hover { 
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(45, 58, 45, 0.12);
          border-color: rgba(45, 58, 45, 0.28);
        }
        .camper-card:active {
          transform: translateY(-1px) scale(0.99);
          transition-duration: 100ms;
        }
        .camper-card--unavailable {
          filter: grayscale(85%);
          opacity: 0.7;
        }
        .camper-card--unavailable:hover { 
          transform: none; 
          box-shadow: 0 4px 16px rgba(26, 26, 26, 0.04);
        }

        /* Image Wrap */
        .camper-card__img-wrap {
          position: relative;
          aspect-ratio: 16/10;
          overflow: hidden;
          background: var(--gray-100);
        }
        .camper-card__img {
          transition: transform 350ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .camper-card:hover .camper-card__img {
          transform: scale(1.04);
        }
        .camper-card__overlay-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top, 
            rgba(26, 26, 26, 0.35) 0%, 
            rgba(26, 26, 26, 0.05) 45%, 
            transparent 70%
          );
          pointer-events: none;
        }

        /* Floating Top Badges */
        .camper-card__top-badges {
          position: absolute;
          top: 14px;
          left: 14px;
          right: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-2);
          z-index: 2;
        }
        .camper-card__badge {
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .camper-card__badge--brand {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: var(--black-matte);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.65rem;
        }
        .camper-card__badge--eco {
          background: rgba(45, 58, 45, 0.92);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: var(--sand);
          border: 1px solid rgba(226, 209, 195, 0.25);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }
        .camper-card__badge--unavailable {
          background: rgba(26, 26, 26, 0.85);
          color: var(--white-broken);
        }

        /* Bottom Season Pill */
        .camper-card__season-tag {
          position: absolute;
          bottom: 12px;
          left: 14px;
          z-index: 2;
          background: rgba(250, 248, 245, 0.9);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          padding: 3px 9px;
          border-radius: var(--radius-sm);
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--gray-800);
          letter-spacing: 0.02em;
        }

        /* Body */
        .camper-card__body {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: var(--space-6);
          gap: var(--space-4);
          background: white;
        }

        /* Header */
        .camper-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-3);
        }
        .camper-card__title-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .camper-card__name {
          font-size: 1.85rem;
          font-weight: 500;
          color: var(--black-matte);
          line-height: 1.1;
          letter-spacing: -0.01em;
        }
        .camper-card__tagline {
          font-size: 0.78rem;
          color: var(--gray-600);
          font-weight: 500;
        }

        /* Price */
        .camper-card__price {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
          padding: 4px 10px;
          background: #FAF8F5;
          border-radius: var(--radius-md);
          border: 1px solid var(--gray-100);
        }
        .camper-card__price-amount {
          font-family: var(--font-display);
          font-size: 1.65rem;
          font-weight: 600;
          color: var(--forest-green);
          line-height: 1;
        }
        .camper-card__price-label {
          font-size: 0.7rem;
          color: var(--gray-600);
          font-weight: 500;
          margin-top: 2px;
        }

        /* Description */
        .camper-card__desc {
          color: var(--gray-600);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.6;
          font-size: 0.88rem;
        }

        /* Specs */
        .camper-card__specs {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
          padding-top: var(--space-2);
        }
        .camper-card__spec {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--gray-800);
          background: #FAF8F5;
          border: 1px solid var(--gray-200);
          padding: 5px 10px;
          border-radius: var(--radius-full);
        }
        .camper-card__spec-icon {
          color: var(--forest-green);
        }

        /* CTA Button */
        .camper-card__btn {
          width: 100%;
          margin-top: auto;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: var(--radius-full);
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 180ms ease-out;
        }
        .camper-card__btn:hover .camper-card__btn-arrow {
          transform: translateX(3px);
        }
        .camper-card__btn-arrow {
          transition: transform 180ms ease-out;
        }
        .camper-card__btn:active {
          transform: scale(0.97);
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
