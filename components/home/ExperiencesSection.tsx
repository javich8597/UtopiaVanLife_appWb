'use client'

import { useRef, useEffect } from 'react'
import { Coffee, Compass, Utensils, Moon, Sparkles, Play } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function ExperiencesSection() {
  const t = useTranslations('HomePage.Experiences')

  const experiences = [
    {
      id: 'sunrise',
      icon: Coffee,
      title: t('exp1_title'),
      desc: t('exp1_desc'),
      video: '/videos/lifestyle/lifestyle-coffee-morning-sea.mp4',
      poster: '/images/campers/space/space-ext.png',
      tag: 'Amaneceres Íntimos',
      highlight: 'Despertar en primera línea',
    },
    {
      id: 'tramuntana',
      icon: Compass,
      title: t('exp2_title'),
      desc: t('exp2_desc'),
      video: '/videos/lifestyle/lifestyle-driving-mallorca-coastal.mp4',
      poster: '/images/campers/neo/neo-ext.png',
      tag: 'Serra de Tramuntana',
      highlight: 'Curvas y acantilados',
    },
    {
      id: 'cooking',
      icon: Utensils,
      title: t('exp3_title'),
      desc: t('exp3_desc'),
      video: '/videos/lifestyle/lifestyle-cooking-sea-views.mp4',
      poster: '/images/campers/space/space-ext.png',
      tag: 'Gastronomía para Dos',
      highlight: 'Cenas frente al mar',
    },
    {
      id: 'sunset',
      icon: Moon,
      title: t('exp4_title'),
      desc: t('exp4_desc'),
      video: '/videos/lifestyle/lifestyle-sunset-relax-window.mp4',
      poster: '/images/campers/neo/neo-ext.png',
      tag: 'Noches Estrelladas',
      highlight: 'Calma absoluta',
    },
  ]

  return (
    <section className="experiences" id="experiencias">
      <div className="experiences__ambient-bg" />
      
      <div className="container experiences__inner">
        {/* Header Editorial */}
        <div className="experiences__header">
          <div className="experiences__eyebrow-badge">
            <Sparkles size={12} className="experiences__eyebrow-icon" />
            <span>Mallorca en Pareja</span>
          </div>
          <h2 className="experiences__title text-display">
            Momentos que no caben{' '}
            <br className="experiences__title-break" />
            <em>en una habitación de hotel</em>
          </h2>
          <p className="experiences__subtitle">
            La intimidad de una suite de lujo combinada con la libertad de despertar cada mañana con vistas a una cala virgen diferente.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="experiences__grid">
          {experiences.map((exp, index) => (
            <article key={exp.id} className={`exp-card exp-card--${index + 1}`}>
              <div className="exp-card__media-wrap">
                <video
                  className="exp-card__video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={exp.poster}
                  suppressHydrationWarning
                >
                  <source src={exp.video} type="video/mp4" />
                </video>
                <div className="exp-card__media-scrim" />
                
                {/* Floating Highlight Pill */}
                <div className="exp-card__highlight-pill">
                  <span className="exp-card__live-dot" />
                  <span>{exp.highlight}</span>
                </div>
              </div>

              <div className="exp-card__body">
                <div className="exp-card__meta">
                  <span className="exp-card__tag">{exp.tag}</span>
                  <div className="exp-card__icon-badge">
                    <exp.icon size={15} strokeWidth={2} />
                  </div>
                </div>

                <h3 className="exp-card__title">{exp.title}</h3>
                <p className="exp-card__desc">{exp.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <style jsx>{`
        .experiences {
          position: relative;
          background-color: var(--forest-green);
          padding-block: var(--space-24);
          color: white;
          overflow: hidden;
        }

        .experiences__ambient-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 80% 20%, 
            rgba(61, 80, 64, 0.45) 0%, 
            rgba(34, 46, 35, 0.8) 60%,
            var(--forest-green) 100%
          );
          pointer-events: none;
        }

        .experiences__inner {
          position: relative;
          z-index: 1;
        }

        .experiences__header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 720px;
          margin-inline: auto;
          margin-bottom: var(--space-16);
          gap: var(--space-3);
        }

        .experiences__eyebrow-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          background: rgba(226, 209, 195, 0.12);
          border: 1px solid rgba(226, 209, 195, 0.25);
          color: var(--sand);
          font-size: 0.76rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .experiences__eyebrow-icon {
          color: var(--sand);
        }

        .experiences__title {
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.15;
          color: white;
          text-wrap: balance;
        }

        .experiences__title em {
          font-style: italic;
          color: var(--sand);
          font-weight: 600;
        }

        .experiences__subtitle {
          font-size: clamp(0.95rem, 1.5vw, 1.08rem);
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.65;
          max-width: 600px;
          text-wrap: balance;
        }

        /* Bento Grid */
        .experiences__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-8);
        }

        /* Card Container */
        .exp-card {
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: transform 260ms cubic-bezier(0.23, 1, 0.32, 1),
                      border-color 260ms ease,
                      box-shadow 260ms ease;
        }

        .exp-card:hover {
          transform: translateY(-4px);
          border-color: rgba(226, 209, 195, 0.35);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
        }

        .exp-card:active {
          transform: translateY(-1px) scale(0.99);
        }

        /* Media / Video Container */
        .exp-card__media-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16/10;
          overflow: hidden;
          background-color: rgba(0, 0, 0, 0.3);
        }

        .exp-card__video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 450ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        .exp-card:hover .exp-card__video {
          transform: scale(1.03);
        }

        .exp-card__media-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.15) 0%,
            transparent 50%,
            rgba(20, 26, 20, 0.6) 100%
          );
          pointer-events: none;
        }

        /* Highlight Pill */
        .exp-card__highlight-pill {
          position: absolute;
          top: 14px;
          left: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background: rgba(20, 26, 20, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          font-size: 0.72rem;
          font-weight: 600;
          color: white;
          letter-spacing: 0.02em;
        }

        .exp-card__live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ADE80;
          box-shadow: 0 0 8px #4ADE80;
        }

        /* Card Content */
        .exp-card__body {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-6);
        }

        .exp-card__meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-1);
        }

        .exp-card__tag {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--sand);
        }

        .exp-card__icon-badge {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          background: rgba(226, 209, 195, 0.15);
          border: 1px solid rgba(226, 209, 195, 0.25);
          color: var(--sand);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .exp-card__title {
          font-size: 1.25rem;
          font-weight: 600;
          color: white;
          line-height: 1.3;
        }

        .exp-card__desc {
          font-size: 0.92rem;
          color: rgba(255, 255, 255, 0.76);
          line-height: 1.6;
        }

        /* Responsive Breakpoints */
        @media (max-width: 860px) {
          .experiences {
            padding-block: var(--space-16);
          }
          .experiences__grid {
            grid-template-columns: 1fr;
            gap: var(--space-6);
          }
          .experiences__header {
            margin-bottom: var(--space-10);
          }
        }

        @media (max-width: 640px) {
          .experiences__title-break {
            display: none;
          }
          .exp-card__body {
            padding: var(--space-5);
          }
          .exp-card__title {
            font-size: 1.15rem;
          }
          .exp-card__desc {
            font-size: 0.88rem;
          }
        }
      `}</style>
    </section>
  )
}
