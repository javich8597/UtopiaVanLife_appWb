'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'

interface Props {
  currentSlug: string
}

export default function CamperModelSwitcher({ currentSlug }: Props) {
  const locale = useLocale()
  const searchParams = useSearchParams()
  const queryString = searchParams?.toString() ? `?${searchParams.toString()}` : ''

  const isNeo = currentSlug.toLowerCase() === 'neo'
  const isSpace = currentSlug.toLowerCase() === 'space'

  return (
    <div className="camper-model-switcher">
      <Link
        href={`/${locale}/campers/neo${queryString}`}
        className={`model-pill ${isNeo ? 'model-pill--active' : ''}`}
        aria-label="Ver Camper NEO"
      >
        <span>NEO · 2-3 Plazas</span>
      </Link>

      <Link
        href={`/${locale}/campers/space${queryString}`}
        className={`model-pill ${isSpace ? 'model-pill--active' : ''}`}
        aria-label="Ver Camper SPACE"
      >
        <span>SPACE · 2 Plazas</span>
      </Link>

      <style jsx>{`
        .camper-model-switcher {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #131518;
          padding: 6px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }
        :global(.model-pill) {
          display: inline-flex;
          align-items: center;
          padding: 8px 18px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.65);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none !important;
          white-space: nowrap;
        }
        :global(.model-pill:hover) {
          color: #ffffff;
        }
        :global(.model-pill--active) {
          background: #e6ca65;
          color: #0b0c0e !important;
          box-shadow: 0 4px 14px rgba(230, 202, 101, 0.35);
        }

        :global(html[data-theme="light"]) .camper-model-switcher {
          background: #F4EFE4;
          border-color: rgba(26, 23, 20, 0.14);
          box-shadow: 0 4px 14px rgba(26, 23, 20, 0.08);
        }
        :global(html[data-theme="light"] .model-pill) {
          color: #5C554C;
        }
        :global(html[data-theme="light"] .model-pill:hover) {
          color: #1A1714;
        }
        :global(html[data-theme="light"] .model-pill--active) {
          background: #1A1714;
          color: #FAF9F6 !important;
          box-shadow: 0 4px 12px rgba(26, 23, 20, 0.2);
        }

        @media (max-width: 640px) {
          :global(.model-pill) {
            padding: 6px 14px;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  )
}
