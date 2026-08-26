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
            img: '/images/campers/neo-s.webp',
        },
        {
            icon: Route,
            title: t('exp2_title'),
            desc: t('exp2_desc'),
            img: '/images/campers/neo-s-b.jpg',
        },
        {
            icon: Utensils,
            title: t('exp3_title'),
            desc: t('exp3_desc'),
            img: '/images/campers/neo/neo-top.webp',
        },
        {
            icon: Tent,
            title: t('exp4_title'),
            desc: t('exp4_desc'),
            img: '/images/campers/neo-s-cutout.png',
        },
    ]

    return (
        <section className="experiences section" style={{ background: 'var(--forest-green)' }}>
            <div className="container">
                <div style={{ marginBottom: 'var(--space-16)', color: 'white' }}>
                    <span className="text-label" style={{ color: 'var(--sand)', opacity: 0.85 }}>{t('eyebrow')}</span>
                    <h2 className="text-h2" style={{ marginTop: 'var(--space-2)', color: 'white' }}>
                        {t('title')}
                    </h2>
                    <p className="text-body" style={{ maxWidth: 520, color: 'rgba(255,255,255,0.8)', marginTop: 'var(--space-4)' }}>
                        {t('subtitle')}
                    </p>
                </div>

                <div className="experiences__grid">
                    {experiences.map((e, i) => (
                        <div key={i} className="experience-card">
                            <div className="experience-card__img-wrap">
                                <img src={e.img} alt={e.title} className="experience-card__img" />
                                <div className="overlay" />
                                <div className="experience-card__icon">
                                    <e.icon size={22} strokeWidth={1.5} />
                                </div>
                            </div>
                            <div className="experience-card__body">
                                <h3 className="text-h4" style={{ color: 'white' }}>{e.title}</h3>
                                <p className="text-small" style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>{e.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
        .experiences__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: var(--space-5);
        }
        .experience-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: transform var(--transition-base);
        }
        .experience-card:hover { transform: translateY(-3px); }
        .experience-card__img-wrap {
          position: relative;
          aspect-ratio: 16/9;
          overflow: hidden;
        }
        .experience-card__img {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .experience-card:hover .experience-card__img { transform: scale(1.04); }
        .experience-card__icon {
          position: absolute;
          top: var(--space-4);
          left: var(--space-4);
          width: 40px; height: 40px;
          background: rgba(226,209,195,0.25);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sand);
          backdrop-filter: blur(8px);
        }
        .experience-card__body {
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
      `}</style>
        </section>
    )
}
