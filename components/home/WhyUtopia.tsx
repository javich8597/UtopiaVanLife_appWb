'use client'

import { Compass, Shield, Headphones, Leaf, Sparkles } from 'lucide-react'
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
                    <div>
                        <span className="text-label" style={{ color: 'var(--sand-dark)' }}>{t('eyebrow')}</span>
                        <h2 className="text-h2" style={{ marginTop: 'var(--space-2)', textWrap: 'balance' }}>
                            {t('title')}
                        </h2>
                    </div>
                    <p className="text-body" style={{ maxWidth: 480, color: 'var(--gray-600)', lineHeight: 1.7 }}>
                        {t('subtitle')}
                    </p>
                </div>

                <div className="why__grid">
                    {reasons.map((r, i) => (
                        <div key={i} className="why__card">
                            <div className="why__icon-wrap">
                                <r.icon size={22} strokeWidth={1.75} />
                            </div>
                            <h3 className="text-h4" style={{ marginTop: 'var(--space-1)' }}>{r.title}</h3>
                            <p className="text-small" style={{ color: 'var(--gray-600)', lineHeight: 1.6 }}>{r.desc}</p>
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
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: var(--space-8);
          margin-bottom: var(--space-16);
          flex-wrap: wrap;
        }
        .why__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: var(--space-6);
        }
        .why__card {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding: var(--space-8);
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          box-shadow: var(--shadow-sm);
          transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
        }
        .why__card:hover {
          box-shadow: 0 8px 24px rgba(45, 58, 45, 0.08);
          transform: translateY(-3px);
          border-color: rgba(45, 58, 45, 0.25);
        }
        .why__icon-wrap {
          width: 44px; height: 44px;
          background: rgba(45, 58, 45, 0.06);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest-green);
          transition: background 0.25s ease, color 0.25s ease;
          margin-bottom: var(--space-1);
        }
        .why__card:hover .why__icon-wrap {
          background: var(--forest-green);
          color: var(--sand);
        }
      `}</style>
        </section>
    )
}
