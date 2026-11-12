'use client'

import { useEffect, useState } from 'react'
import CamperCard from '@/components/campers/CamperCard'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useSiteTheme } from '@/lib/theme/siteThemeContext'

const CAMPER_IMAGES = [
  '/images/campers/neo/neo-ext.png',
  '/images/campers/uploads/1790382530493-2k_space_landscape_door_closed.jpeg',
]

// Static fallback campers
const demoCampers = [
  {
    id: '1', slug: 'neo', name: 'NEO',
    description_es: 'Camper ideal para dos personas, que se adapta de forma perfecta para 3. Gran maletero, cama doble fija + auxiliar, sistema eléctrico Pro (540Ah litio, 400W solar, Victron 2.000W) y aire acondicionado 12V Dometic.',
    thumbnail_url: CAMPER_IMAGES[0],
    specs: { beds: 3, seats: 3, length_m: 5.99 },
    deposit_amount: 1000,
    pricePerNight: 120,
    seasonName: 'Temporada Media',
    isAvailable: true,
  },
  {
    id: '2', slug: 'space', name: 'SPACE',
    description_es: 'Camper diseñada para dos personas, primando el máximo confort en todo momento. Cama elevable + interbanco, sistema eléctrico Pro (540Ah litio, 400W solar, Victron 2.000W) y aire acondicionado 12V Dometic.',
    thumbnail_url: CAMPER_IMAGES[1],
    specs: { beds: 2, seats: 2, length_m: 5.99 },
    deposit_amount: 1000,
    pricePerNight: 140,
    seasonName: 'Temporada Media',
    isAvailable: true,
  },
]

export default function FeaturedCampers() {
  const t = useTranslations('HomePage.FeaturedCampers')
  const { theme } = useSiteTheme()
  const [campers, setCampers] = useState(demoCampers)

  useEffect(() => {
    fetch('/api/availability', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (data.campers?.length > 0) setCampers(data.campers) })
      .catch(() => { })
  }, [])

  return (
    <section className="featured section" id="campers">
      <div className="container">
        {/* Centered Editorial Header */}
        <div className="featured__header">
          <div className="featured__eyebrow-pill">
            <span>{t('eyebrow')}</span>
          </div>
          <h2 className="featured__title">
            {t('title')}
          </h2>
          <p className="featured__subtitle">
            {t('subtitle')}
          </p>
        </div>

        {/* Centered 2-Column Grid */}
        <div className="featured__grid-container">
          <div className="featured__grid">
            {campers.map(c => (
              <CamperCard key={c.id} {...c as any} variant={theme === 'light' ? 'light' : 'dark'} />
            ))}
          </div>
        </div>

        {/* Bottom Centered Link */}
        <div className="featured__cta">
          <Link href="/campers" className="featured__view-all-btn">
            <span>{t('viewAll')}</span>
            <ArrowRight size={16} className="featured__btn-arrow" />
          </Link>
        </div>
      </div>

      <style jsx>{`
        .featured {
          position: relative;
          background-color: #0E1013;
          background-image:
            linear-gradient(180deg, rgba(14, 16, 19, 0.85) 0%, rgba(14, 16, 19, 0.89) 100%),
            url('/images/backgrounds/mallorca-bg-dark.webp');
          background-position: center center;
          background-size: cover;
          background-repeat: no-repeat;
          padding-block: 104px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .featured__header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 680px;
          margin-inline: auto;
          margin-bottom: 56px;
          gap: 14px;
        }
        .featured__eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-radius: 999px;
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.35);
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #E8CA7C;
        }
        .featured__eyebrow-icon {
          color: #CCA053;
        }
        .featured__title {
          font-family: var(--font-display, inherit);
          font-size: clamp(2.6rem, 4.8vw, 3.65rem);
          font-weight: 500;
          color: #FFFFFF;
          letter-spacing: -0.02em;
          line-height: 1.08;
          margin: 0;
        }
        .featured__subtitle {
          color: #94A3B8;
          line-height: 1.68;
          font-size: 1.05rem;
          margin: 0;
          text-wrap: balance;
        }

        /* Grid Centered */
        .featured__grid-container {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .featured__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 32px;
          width: 100%;
        }

        /* CTA */
        .featured__cta {
          margin-top: 56px;
          display: flex;
          justify-content: center;
        }
        .featured__cta :global(.featured__view-all-btn) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 13px 30px;
          font-size: 0.94rem;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.08);
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .featured__cta :global(.featured__view-all-btn:hover) {
          background: rgba(255, 255, 255, 0.16);
          border-color: rgba(255, 255, 255, 0.45);
          color: #FFFFFF;
          transform: translateY(-2px);
        }
        .featured__cta :global(.featured__view-all-btn:hover .featured__btn-arrow) {
          transform: translateX(4px);
        }
        .featured__cta :global(.featured__view-all-btn:active) {
          transform: scale(0.97);
        }
        .featured__cta :global(.featured__btn-arrow) {
          transition: transform 180ms ease-out;
        }

        @media (max-width: 860px) {
          .featured {
            padding-block: 60px;
          }
          .featured__grid {
            grid-template-columns: minmax(0, 500px);
            gap: 24px;
          }
          .featured__header {
            margin-bottom: 40px;
          }
        }
      `}</style>
    </section>
  )
}
