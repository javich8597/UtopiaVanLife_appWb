'use client'

import { useEffect, useState } from 'react'
import CamperCard from '@/components/campers/CamperCard'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

const CAMPER_IMAGES = [
    '/images/campers/neo/neo-ext.png',
    '/images/campers/space/space-ext.png',
]

// Static fallback campers
const demoCampers = [
    {
        id: '1', slug: 'neo', name: 'NEO',
        description_es: 'La camper más polivalente y con mayor almacenaje. 2.230L de maletero, separación de cabina, 540Ah litio Victron y aire acondicionado 12V.',
        thumbnail_url: CAMPER_IMAGES[0],
        specs: { beds: 3, seats: 3, length_m: 6.0 },
        deposit_amount: 1000,
        pricePerNight: 120,
        seasonName: 'Temporada Media',
        isAvailable: true,
    },
    {
        id: '2', slug: 'space', name: 'SPACE',
        description_es: 'Máximo confort y amplitud diáfana (7m² Open Concept). Cama elevable eléctrica sobre salón en U, 160L de agua limpia y Pack Cine con proyector.',
        thumbnail_url: CAMPER_IMAGES[1],
        specs: { beds: 2, seats: 2, length_m: 6.0 },
        deposit_amount: 1000,
        pricePerNight: 140,
        seasonName: 'Temporada Media',
        isAvailable: true,
    },
]

export default function FeaturedCampers() {
    const t = useTranslations('HomePage.FeaturedCampers')
    const [campers, setCampers] = useState(demoCampers)

    useEffect(() => {
        // Try to load from API — falls back to demo if fetch fails
        fetch('/api/availability')
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
                        <Sparkles size={12} className="featured__eyebrow-icon" />
                        <span>{t('eyebrow')}</span>
                    </div>
                    <h2 className="featured__title text-h2">
                        {t('title')}
                    </h2>
                    <p className="featured__subtitle text-body">
                        {t('subtitle')}
                    </p>
                </div>

                {/* Centered 2-Column Grid */}
                <div className="featured__grid-container">
                    <div className="featured__grid">
                        {campers.map(c => (
                            <CamperCard key={c.id} {...c as any} />
                        ))}
                    </div>
                </div>

                {/* Bottom Centered Link */}
                <div className="featured__cta">
                    <Link href="/campers" className="featured__view-all-btn btn btn-outline">
                        <span>{t('viewAll')}</span>
                        <ArrowRight size={16} className="featured__btn-arrow" />
                    </Link>
                </div>
            </div>

            <style jsx>{`
        .featured {
          background-color: var(--white-broken);
          padding-block: var(--space-20);
        }
        .featured__header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 680px;
          margin-inline: auto;
          margin-bottom: var(--space-12);
          gap: var(--space-3);
        }
        .featured__eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 14px;
          border-radius: var(--radius-full);
          background: rgba(200, 168, 130, 0.16);
          border: 1px solid rgba(200, 168, 130, 0.35);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gray-800);
        }
        .featured__eyebrow-icon {
          color: var(--sand-dark);
        }
        .featured__title {
          font-family: var(--font-display);
          font-size: clamp(2.4rem, 4.5vw, 3.4rem);
          font-weight: 500;
          color: var(--black-matte);
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .featured__subtitle {
          color: var(--gray-600);
          line-height: 1.68;
          font-size: 1.05rem;
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
          grid-template-columns: repeat(2, minmax(0, 480px));
          gap: var(--space-8);
          width: 100%;
          max-width: 1020px;
          justify-content: center;
        }

        /* CTA */
        .featured__cta {
          margin-top: var(--space-12);
          display: flex;
          justify-content: center;
        }
        .featured__view-all-btn {
          border-radius: var(--radius-full);
          padding: 12px 28px;
          font-size: 0.92rem;
          font-weight: 500;
          border-color: var(--gray-400);
          color: var(--black-matte);
          transition: all 180ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .featured__view-all-btn:hover {
          background: var(--forest-green);
          border-color: var(--forest-green);
          color: #FAF8F5;
        }
        .featured__view-all-btn:hover .featured__btn-arrow {
          transform: translateX(4px);
        }
        .featured__view-all-btn:active {
          transform: scale(0.97);
        }
        .featured__btn-arrow {
          transition: transform 180ms ease-out;
        }

        @media (max-width: 860px) {
          .featured__grid {
            grid-template-columns: minmax(0, 500px);
            gap: var(--space-6);
          }
          .featured__header {
            margin-bottom: var(--space-8);
          }
        }
      `}</style>
        </section>
    )
}
