'use client'

import { useEffect, useState } from 'react'
import CamperCard from '@/components/campers/CamperCard'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

const CAMPER_IMAGES = [
    '/images/campers/neo/neo-ext.png',
    '/images/campers/uploads/1790382530493-2k_space_landscape_door_closed.jpeg',
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
                            <CamperCard key={c.id} {...c as any} variant="dark" />
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
          background-color: #0B0C0E;
          padding-block: 90px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
          font-size: clamp(2.4rem, 4.5vw, 3.4rem);
          font-weight: 800;
          color: #FFFFFF;
          letter-spacing: -0.025em;
          line-height: 1.12;
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
          grid-template-columns: repeat(2, minmax(0, 480px));
          gap: 32px;
          width: 100%;
          max-width: 1020px;
          justify-content: center;
        }

        /* CTA */
        .featured__cta {
          margin-top: 56px;
          display: flex;
          justify-content: center;
        }
        .featured__view-all-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 13px 30px;
          font-size: 0.94rem;
          font-weight: 700;
          border: 1px solid rgba(204, 160, 83, 0.4);
          color: #E8CA7C;
          background: rgba(204, 160, 83, 0.08);
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .featured__view-all-btn:hover {
          background: rgba(204, 160, 83, 0.18);
          border-color: #CCA053;
          color: #FFFFFF;
          transform: translateY(-2px);
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
