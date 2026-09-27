'use client'

import { Zap, Bed, Flame, Compass, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function WhyUtopia() {
  const t = useTranslations('HomePage.WhyUtopia')

  const pillars = [
    {
      icon: Zap,
      title: 'Autonomía Off-Grid 100%',
      desc: 'Baterías de litio Victron 540Ah y placas solares para vivir y dormir en plena naturaleza sin depender de campings ni cables.',
      tag: 'Sin cables',
    },
    {
      icon: Bed,
      title: 'Confort Suite Boutique',
      desc: 'Colchones viscoelásticos de máxima densidad, sábanas de algodón percal, almohadas de pluma y oscurecedores térmicos para un descanso absoluto.',
      tag: 'Descanso real',
    },
    {
      icon: Flame,
      title: 'Ducha Caliente & Cocina',
      desc: 'Ducha interior de agua caliente a presión y cocina de diseño totalmente equipada con nevera de compresor y vajilla de cerámica.',
      tag: 'Equipamiento top',
    },
    {
      icon: Compass,
      title: 'Concierge Local 24/7',
      desc: 'Entrega personalizada en Palma, atención continua por WhatsApp y guía exclusiva de calas secretas no masificadas.',
      tag: 'Atención directa',
    },
  ]

  return (
    <section className="why" id="por-que-utopia">
      <div className="container">
        {/* Editorial Header */}
        <div className="why__header">
          <div className="why__header-left">
            <div className="why__eyebrow-badge">
              <Sparkles size={12} className="why__eyebrow-icon" />
              <span>Quiet Luxury Sobre Ruedas</span>
            </div>
            <h2 className="why__title text-display">
              Tu hotel boutique privado{' '}
              <br className="why__title-break" />
              <em>con vistas que cambian cada día</em>
            </h2>
          </div>
          <p className="why__subtitle">
            Diseñamos cada camper pensando en el descanso, la intimidad y la elegancia. Olvídate de los campings masificados y explora los rincones más puros de Mallorca a tu ritmo.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="why__grid">
          {pillars.map((pillar, i) => (
            <div key={i} className="why__card">
              <div className="why__card-top">
                <div className="why__icon-wrap">
                  <pillar.icon size={20} strokeWidth={1.8} />
                </div>
                <span className="why__card-tag">{pillar.tag}</span>
              </div>
              <h3 className="why__card-title">{pillar.title}</h3>
              <p className="why__card-desc">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .why {
          background: #FAF8F5;
          padding-block: var(--space-24);
          position: relative;
        }

        .why__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: var(--space-8);
          margin-bottom: var(--space-16);
          flex-wrap: wrap;
        }

        .why__header-left {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          max-width: 620px;
        }

        .why__eyebrow-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          background: rgba(200, 168, 130, 0.15);
          border: 1px solid rgba(200, 168, 130, 0.35);
          color: var(--gray-800);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          width: fit-content;
        }

        .why__eyebrow-icon {
          color: var(--sand-dark);
        }

        .why__title {
          font-size: clamp(2rem, 3.8vw, 3rem);
          font-weight: 600;
          color: var(--black-matte);
          letter-spacing: -0.02em;
          line-height: 1.15;
          text-wrap: balance;
        }

        .why__title em {
          font-style: italic;
          color: var(--forest-green);
          font-weight: 500;
        }

        .why__subtitle {
          max-width: 440px;
          color: var(--gray-600);
          line-height: 1.7;
          font-size: 1rem;
          text-wrap: balance;
        }

        /* Grid */
        .why__grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-6);
        }

        .why__card {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding: var(--space-8);
          background: white;
          border-radius: var(--radius-xl);
          border: 1px solid var(--gray-200);
          box-shadow: 0 4px 16px rgba(26, 26, 26, 0.03);
          transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1),
                      box-shadow 220ms cubic-bezier(0.23, 1, 0.32, 1),
                      border-color 220ms ease;
        }

        .why__card:hover {
          box-shadow: 0 16px 36px rgba(45, 58, 45, 0.09);
          transform: translateY(-4px);
          border-color: rgba(45, 58, 45, 0.25);
        }

        .why__card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-2);
        }

        .why__icon-wrap {
          width: 44px;
          height: 44px;
          background: rgba(45, 58, 45, 0.06);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest-green);
          transition: background-color 180ms ease, color 180ms ease;
        }

        .why__card:hover .why__icon-wrap {
          background: var(--forest-green);
          color: #FAF8F5;
        }

        .why__card-tag {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--sand-dark);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .why__card-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--black-matte);
          line-height: 1.3;
        }

        .why__card-desc {
          font-size: 0.88rem;
          color: var(--gray-600);
          line-height: 1.62;
        }

        @media (max-width: 1024px) {
          .why__grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 860px) {
          .why {
            padding-block: var(--space-16);
          }
          .why__header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-4);
            margin-bottom: var(--space-10);
          }
        }

        @media (max-width: 640px) {
          .why__grid {
            grid-template-columns: 1fr;
            gap: var(--space-4);
          }
          .why__title-break {
            display: none;
          }
          .why__card {
            padding: var(--space-6);
          }
        }
      `}</style>
    </section>
  )
}
