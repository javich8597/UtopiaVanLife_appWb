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
  const datesQuery = initialFrom && initialTo
    ? `?from=${initialFrom}&to=${initialTo}&step=1`
    : '?step=1'

  return (
    <aside className="sticky-booking-bar" aria-label="Barra de reserva flotante">
      <div className="bar-container">
        {/* Left: Price and flexible cancellation */}
        <div className="price-meta-block">
          <div className="price-tag-row">
            <span className="price-from">desde</span>
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
            <span>150 km/día incluidos</span>
          </div>
          <div className="guarantee-item">
            <Headphones size={16} className="text-gold" />
            <span>Asistencia 16h</span>
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
          padding-bottom: calc(14px + env(safe-area-inset-bottom, 16px));
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
        }
        .price-from {
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.45);
          font-weight: 500;
          text-transform: lowercase;
          letter-spacing: 0.02em;
          margin-right: 9px;
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
          margin-left: 3px;
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
          justify-content: center;
          gap: 6px;
          min-height: 44px;
          padding: 10px 18px;
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
          justify-content: center;
          gap: 8px;
          min-height: 44px;
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

        :global(html[data-theme="light"]) .sticky-booking-bar {
          background: rgba(250, 250, 247, 0.96);
          border-top-color: rgba(26, 23, 20, 0.14);
          box-shadow: 0 -8px 28px rgba(26, 23, 20, 0.12);
        }
        :global(html[data-theme="light"]) .price-from,
        :global(html[data-theme="light"]) .price-unit,
        :global(html[data-theme="light"]) .cancellation-badge {
          color: #5C554C;
        }
        :global(html[data-theme="light"]) .price-number {
          color: #6B5514;
        }
        :global(html[data-theme="light"]) .guarantees-list {
          border-left-color: rgba(26, 23, 20, 0.12);
        }
        :global(html[data-theme="light"]) .guarantee-item {
          color: #1F1B17;
        }
        :global(html[data-theme="light"] .text-gold) {
          color: #82681A;
        }
        :global(html[data-theme="light"]) .calc-trigger-btn {
          background: #F4EFE4;
          border-color: rgba(26, 23, 20, 0.18);
          color: #1A1714;
        }
        :global(html[data-theme="light"]) .calc-trigger-btn:hover {
          background: #EAE2D2;
          color: #1A1714;
        }
        :global(html[data-theme="light"] .reserve-primary-btn) {
          background: #1A1714;
          color: #FAF9F6 !important;
          box-shadow: 0 4px 14px rgba(26, 23, 20, 0.18);
        }
        :global(html[data-theme="light"] .reserve-primary-btn:hover) {
          background: #2E2923;
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
            padding: 12px 16px;
            padding-bottom: calc(12px + env(safe-area-inset-bottom, 16px));
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
            display: grid;
            grid-template-columns: 1fr 1.6fr;
            gap: 8px;
          }
          .calc-trigger-btn {
            width: 100%;
            padding: 0 10px;
            font-size: 12px;
          }
          :global(.reserve-primary-btn) {
            width: 100%;
            font-size: 12px;
            padding: 0 12px;
          }
        }
      `}</style>
    </aside>
  )
}
