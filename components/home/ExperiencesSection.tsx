'use client'

import { Map, Route, Utensils, Tent } from 'lucide-react'
import { useTranslations } from 'next-intl';

export default function ExperiencesSection() {
    const t = useTranslations('HomePage.Experiences');

    const experiences = [
        {
            icon: Map,
            title: t('exp1_title'),
            desc: t('exp1_desc'),
            img: '/images/campers/space/space-ext.png',
            tag: 'Ruta Costera',
        },
        {
            icon: Route,
            title: t('exp2_title'),
            desc: t('exp2_desc'),
            img: '/images/experiences/exp2.png',
            tag: 'Sierra de Tramuntana',
        },
        {
            icon: Utensils,
            title: t('exp3_title'),
            desc: t('exp3_desc'),
            img: '/images/experiences/exp3.png',
            tag: 'Gastronomía Local',
        },
        {
            icon: Tent,
            title: t('exp4_title'),
            desc: t('exp4_desc'),
            img: '/images/experiences/exp4.png',
            tag: 'Noche bajo las estrellas',
        },
    ]

    return (
        <section className="experiences section" style={{ background: 'var(--forest-green)', position: 'relative', overflow: 'hidden' }}>
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ marginBottom: 'var(--space-16)', color: 'white', maxWidth: 640 }}>
                    <span className="text-label" style={{ color: 'var(--sand)', opacity: 0.9 }}>{t('eyebrow')}</span>
                    <h2 className="text-h2" style={{ marginTop: 'var(--space-2)', color: 'white', textWrap: 'balance' }}>
                        {t('title')}
                    </h2>
                    <p className="text-body" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 'var(--space-4)', lineHeight: 1.7 }}>
                        {t('subtitle')}
                    </p>
                </div>

                <div className="experiences__grid">
                    {experiences.map((e, i) => (
                        <div key={i} className="experience-card">
                            <div className="experience-card__img-wrap">
                                <img src={e.img} alt={e.title} className="experience-card__img" />
                            </div>
                            <div className="experience-card__body">
                                <div className="experience-card__header-row">
                                    <span className="experience-card__tag">{e.tag}</span>
                                    <div className="experience-card__icon">
                                        <e.icon size={16} strokeWidth={1.75} />
                                    </div>
                                </div>
                                <h3 className="text-h4" style={{ color: 'white' }}>{e.title}</h3>
                                <p className="text-small" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>{e.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
        .experiences__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
          gap: var(--space-6);
        }
        .experience-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .experience-card:hover {
          transform: translateY(-4px);
          border-color: rgba(226, 209, 195, 0.35);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
        }
        .experience-card__img-wrap {
          position: relative;
          aspect-ratio: 16/10;
          overflow: hidden;
          background: rgba(0,0,0,0.2);
        }
        .experience-card__img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .experience-card:hover .experience-card__img {
          transform: scale(1.04);
        }
        .experience-card__body {
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .experience-card__header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-1);
        }
        .experience-card__tag {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--sand);
          text-transform: uppercase;
        }
        .experience-card__icon {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          background: rgba(226, 209, 195, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sand);
        }
      `}</style>
        </section>
    )
}
