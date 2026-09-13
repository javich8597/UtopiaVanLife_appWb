'use client'

import { motion } from 'framer-motion'
import { Sparkles, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function AboutHero() {
  const t = useTranslations('AboutPage')

  const handleScrollDown = () => {
    const nextSection = document.getElementById('quienes-somos')
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="about-hero" aria-label="Introducción Utopia Van Life">
      <div className="about-hero__video-wrap">
        <video
          className="about-hero__video"
          autoPlay
          muted
          loop
          playsInline
          suppressHydrationWarning
          poster="/images/about/transit.jpg"
        >
          <source src="/videos/video_noche_min.mp4" type="video/mp4" />
        </video>
        <div className="about-hero__overlay" />
      </div>

      <div className="container about-hero__content">
        {/* Floating Capsule Badge */}
        <motion.div
          className="about-hero__badge-wrap"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="about-hero__badge">
            <Sparkles size={14} className="about-hero__badge-icon" />
            <span>{t('heroBadge')}</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="about-hero__title"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
        >
          Más que campers.
          <span className="about-hero__title-italic">Una forma de viajar.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="about-hero__subtitle"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          {t('heroSubtitle')}
        </motion.p>

        {/* Scroll down indicator */}
        <motion.button
          type="button"
          onClick={handleScrollDown}
          className="about-hero__scroll-btn"
          aria-label="Desplazarse a la siguiente sección"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.23, 1, 0.32, 1] }}
        >
          <span className="about-hero__scroll-text">Descubre nuestra historia</span>
          <div className="about-hero__scroll-pill">
            <ChevronDown size={15} />
          </div>
        </motion.button>
      </div>

      <style jsx>{`
        .about-hero {
          position: relative;
          min-height: 82vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 8rem 0 4.5rem;
          color: #ffffff;
        }

        .about-hero__video-wrap {
          position: absolute;
          inset: 0;
          z-index: 1;
          overflow: hidden;
        }

        .about-hero__video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.02);
        }

        .about-hero__overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(20, 26, 20, 0.52) 0%,
            rgba(18, 22, 18, 0.65) 50%,
            rgba(18, 22, 18, 0.88) 100%
          );
          backdrop-filter: blur(1px);
        }

        .about-hero__content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 860px;
        }

        .about-hero__badge-wrap {
          margin-bottom: 1.5rem;
        }

        .about-hero__badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 1.15rem;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: var(--radius-full);
          font-size: 0.825rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.95);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }

        .about-hero__badge-icon {
          color: var(--sand);
        }

        .about-hero__title {
          font-family: var(--font-display);
          font-size: clamp(2.85rem, 6.5vw, 5rem);
          line-height: 1.08;
          font-weight: 300;
          letter-spacing: -0.025em;
          color: #ffffff;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-shadow: 0 2px 16px rgba(0, 0, 0, 0.4);
        }

        .about-hero__title-italic {
          font-style: italic;
          font-weight: 400;
          color: #f7efe6;
          margin-top: 0.2rem;
        }

        .about-hero__subtitle {
          font-size: clamp(1.05rem, 2vw, 1.25rem);
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.88);
          max-width: 620px;
          margin: 0 auto 2.5rem;
          font-weight: 400;
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.3);
        }

        .about-hero__scroll-btn {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.75);
          transition: color 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        @media (hover: hover) and (pointer: fine) {
          .about-hero__scroll-btn:hover {
            color: #ffffff;
            transform: translateY(2px);
          }
        }

        .about-hero__scroll-btn:active {
          transform: scale(0.97) translateY(2px);
        }

        .about-hero__scroll-text {
          font-size: 0.775rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .about-hero__scroll-pill {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          animation: floatSlow 2.5s ease-in-out infinite;
        }

        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(5px);
          }
        }

        @media (max-width: 768px) {
          .about-hero {
            min-height: 75vh;
            padding: 7rem 0 3.5rem;
          }
          .about-hero__title {
            gap: 0.15rem;
          }
          .about-hero__subtitle {
            margin-bottom: 2rem;
          }
        }
      `}</style>
    </section>
  )
}
