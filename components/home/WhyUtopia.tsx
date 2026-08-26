'use client'

import { Compass, Shield, Headphones, Leaf } from 'lucide-react'
import { useTranslations } from 'next-intl';

export default function WhyUtopia() {
    const t = useTranslations('HomePage.WhyUtopia');

    const reasons = [
        {
            icon: Compass,
            title: t('reason1_title'),
            desc: t('reason1_desc'),
        },
        {
            icon: Shield,
            title: t('reason2_title'),
            desc: t('reason2_desc'),
        },
        {
            icon: Headphones,
            title: t('reason3_title'),
            desc: t('reason3_desc'),
        },
        {
            icon: Leaf,
            title: t('reason4_title'),
            desc: t('reason4_desc'),
        },
    ]

    return (
        <section className="why" id="experiences">
            <div className="container">
                <div className="why__header">
                    <span className="text-label" style={{ color: 'var(--sand-dark)' }}>{t('eyebrow')}</span>
                    <h2 className="text-h2" style={{ marginTop: 'var(--space-2)' }}>
                        {t('title')}
                    </h2>
                    <p className="text-body" style={{ maxWidth: 520, color: 'var(--gray-600)', marginTop: 'var(--space-4)' }}>
                        {t('subtitle')}
                    </p>
                </div>

                <div className="why__grid">
                    {reasons.map((r, i) => (
                        <div key={i} className="why__card">
                            <div className="why__icon-wrap">
                                <r.icon size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-h4">{r.title}</h3>
                            <p className="text-small" style={{ color: 'var(--gray-600)' }}>{r.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
        .why {
          background: var(--cream);
          padding-block: var(--space-24);
        }
        .why__header {
          margin-bottom: var(--space-16);
        }
        .why__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: var(--space-6);
        }
        .why__card {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-8);
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-100);
          transition: box-shadow var(--transition-base), transform var(--transition-base);
        }
        .why__card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }
        .why__icon-wrap {
          width: 48px; height: 48px;
          background: var(--gray-100);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest-green);
        }
      `}</style>
        </section>
    )
}
