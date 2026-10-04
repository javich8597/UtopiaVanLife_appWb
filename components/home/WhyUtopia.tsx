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
      desc: 'Colchones viscoelásticos de máxima densidad, ropa de cama completa, almohadas de pluma y oscurecedores térmicos para un descanso absoluto.',
      tag: 'Descanso real',
    },
    {
      icon: Flame,
      title: 'Ducha Caliente & Cocina',
      desc: 'Ducha interior de agua caliente a presión y cocina de diseño totalmente equipada con nevera de compresor y menaje completo.',
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
          background: #0E1013;
          padding-block: 100px;
          position: relative;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .why__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 32px;
          margin-bottom: 56px;
          flex-wrap: wrap;
        }

        .why__header-left {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 640px;
        }

        .why__eyebrow-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-radius: 999px;
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.35);
          color: #E8CA7C;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          width: fit-content;
        }

        .why__eyebrow-icon {
          color: #CCA053;
        }

        .why__title {
          font-size: clamp(2rem, 3.8vw, 3rem);
          font-weight: 800;
          color: #FFFFFF;
          letter-spacing: -0.02em;
          line-height: 1.15;
          margin: 0;
          text-wrap: balance;
        }

        .why__title em {
          font-style: italic;
          background: linear-gradient(135deg, #FFFFFF 20%, #E8CA7C 60%, #CCA053 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 600;
        }

        .why__subtitle {
          max-width: 440px;
          color: #94A3B8;
          line-height: 1.7;
          font-size: 1rem;
          margin: 0;
          text-wrap: balance;
        }

        /* Grid */
        .why__grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .why__card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 32px 28px;
          background: #131518;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
          transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1),
                      box-shadow 220ms cubic-bezier(0.23, 1, 0.32, 1),
                      border-color 220ms ease;
        }

        .why__card:hover {
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.6);
          transform: translateY(-4px);
          border-color: rgba(204, 160, 83, 0.4);
        }

        .why__card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .why__icon-wrap {
          width: 44px;
          height: 44px;
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.25);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CCA053;
          transition: background 180ms ease, color 180ms ease;
        }

        .why__card:hover .why__icon-wrap {
          background: linear-gradient(135deg, #CCA053 0%, #B2883B 100%);
          color: #0B0C0E;
        }

        .why__card-tag {
          font-size: 0.7rem;
          font-weight: 700;
          color: #E8CA7C;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .why__card-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #FFFFFF;
          line-height: 1.3;
          margin: 0;
        }

        .why__card-desc {
          font-size: 0.88rem;
          color: #94A3B8;
          line-height: 1.62;
          margin: 0;
        }

        @media (max-width: 1024px) {
          .why__grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 860px) {
          .why {
            padding-block: 64px;
          }
          .why__header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 36px;
          }
        }

        @media (max-width: 640px) {
          .why__grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .why__title-break {
            display: none;
          }
          .why__card {
            padding: 24px;
          }
        }
      `}</style>
    </section>
  )
}
