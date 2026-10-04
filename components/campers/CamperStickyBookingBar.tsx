'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ShieldCheck, Infinity, Headphones, ArrowRight, Calendar } from 'lucide-react'

interface Props {
  slug: string
  pricePerNight: number
  initialFrom?: string
  initialTo?: string
  onScrollToCalculator: () => void
}

export default function CamperStickyBookingBar({
  slug,
  pricePerNight,
  initialFrom,
  initialTo,
  onScrollToCalculator
}: Props) {
  const locale = useLocale()
  const datesQuery = initialFrom && initialTo ? `?from=${initialFrom}&to=${initialTo}` : ''

  return (
    <aside className="sticky-booking-bar" aria-label="Barra de reserva flotante">
      <div className="bar-container">
        {/* Left: Price and flexible cancellation */}
        <div className="price-meta-block">
          <div className="price-tag-row">
            <span className="price-number">{pricePerNight}€</span>
            <span className="price-unit">/ noche</span>
          </div>
          <span className="cancellation-badge">
            <span className="live-dot" />
            Cancelación flexible hasta 14 días antes
          </span>
        </div>

        {/* Center Guarantees (hidden on mobile) */}
        <div className="guarantees-list">
          <div className="guarantee-item">
            <ShieldCheck size={16} className="text-gold" />
            <span>Seguro Todo Riesgo</span>
          </div>
          <div className="guarantee-item">
            <Infinity size={16} className="text-gold" />
            <span>Km Ilimitados</span>
          </div>
          <div className="guarantee-item">
            <Headphones size={16} className="text-gold" />
            <span>Asistencia 24h</span>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="cta-actions-group">
          <button
            onClick={onScrollToCalculator}
            className="calc-trigger-btn"
            aria-label="Calcular precio exacto"
          >
            <Calendar size={14} />
            <span>Calcular fechas</span>
          </button>

          <Link
            href={`/${locale}/reserva/${slug}${datesQuery}`}
            className="reserve-primary-btn"
          >
            <span>Reservar esta Camper</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <style jsx>{`
        .sticky-booking-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          background: rgba(19, 21, 24, 0.94);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 14px 24px;
          padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.6);
        }
        .bar-container {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .price-meta-block {
          display: flex;
          flex-direction: column;
        }
        .price-tag-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .price-number {
          font-size: 24px;
          font-weight: 900;
          color: #e6ca65;
          line-height: 1;
        }
        .price-unit {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 400;
        }
        .cancellation-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 3px;
        }
        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #34d399;
          display: inline-block;
        }
        .guarantees-list {
          display: flex;
          align-items: center;
          gap: 20px;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          padding-left: 24px;
        }
        .guarantee-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }
        :global(.text-gold) {
          color: #e6ca65;
        }
        .cta-actions-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .calc-trigger-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.85);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .calc-trigger-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }
        :global(.reserve-primary-btn) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 9999px;
          background: #e6ca65;
          color: #0b0c0e !important;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-decoration: none !important;
          box-shadow: 0 4px 14px rgba(230, 202, 101, 0.25);
          transition: all 0.25s ease;
          white-space: nowrap;
        }
        :global(.reserve-primary-btn:hover) {
          background: #d8bc59;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(230, 202, 101, 0.35);
        }

        /* Desktop: sidebar is visible, so hide bottom bar */
        @media (min-width: 861px) {
          .sticky-booking-bar {
            display: none !important;
          }
        }

        /* Mobile Rules per AGENTS.md */
        @media (max-width: 860px) {
          .guarantees-list {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .sticky-booking-bar {
            padding: 10px 16px;
            padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
          }
          .bar-container {
            flex-direction: column;
            gap: 10px;
          }
          .price-meta-block {
            width: 100%;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
          .cta-actions-group {
            width: 100%;
          }
          .calc-trigger-btn {
            display: none;
          }
          :global(.reserve-primary-btn) {
            width: 100%;
            justify-content: center;
            min-height: 44px; /* Touch target 44px per AGENTS.md */
            font-size: 13px;
          }
        }
      `}</style>
    </aside>
  )
}
