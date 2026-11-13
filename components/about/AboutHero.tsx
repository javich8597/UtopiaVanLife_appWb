'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
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
          <source src="/videos/video_noche_loop.mp4" type="video/mp4" />
        </video>
        <div className="about-hero__overlay" />
      </div>

      <div className="about-hero__container">
        <div className="about-hero__content">
          {/* Logo en Grande en sustitución de la insignia anterior */}
          <motion.div
            className="about-hero__logo-wrap"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
          >
            <Image
              src="/images/logo-white.png"
              alt="Utopia Van Life"
              width={460}
              height={132}
              priority
              className="about-hero__logo-img"
            />
          </motion.div>

          {/* Headline - Tamaño título grande, acotado a la mitad izquierda de la pantalla */}
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

          {/* Scroll down indicator aligned to the left */}
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
      </div>

      <style jsx>{`
        .about-hero {
          position: relative;
          min-height: 92vh;
          display: flex;
          align-items: center;
          overflow: hidden;
          padding: 8.5rem 0 5rem;
          color: #ffffff;
          background: #0B0C0E;
          width: 100%;
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
          /* Strong gradient on the left half to give high contrast for large typography */
          background: linear-gradient(
            90deg,
            rgba(11, 12, 14, 0.96) 0%,
            rgba(11, 12, 14, 0.9) 36%,
            rgba(11, 12, 14, 0.52) 54%,
            rgba(11, 12, 14, 0.15) 85%,
            transparent 100%
          );
          box-shadow: inset 0 80px 90px -40px rgba(11, 12, 14, 0.9), inset 0 -60px 80px -30px rgba(11, 12, 14, 0.95);
        }

        .about-hero__container {
          position: relative;
          z-index: 2;
          width: 100%;
          padding: 0 clamp(24px, 5vw, 80px);
        }

        .about-hero__content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          max-width: 60%; /* Ample room for large typography on the left */
        }

        /* LOGO EN GRANDE BLANCO */
        .about-hero__logo-wrap {
          margin-bottom: 2.2rem;
          display: flex;
          align-items: center;
        }

        :global(.about-hero__logo-img) {
          width: clamp(280px, 32vw, 435px);
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 4px 28px rgba(0, 0, 0, 0.8));
          display: block;
        }

        /* TAMAÑO DEL TÍTULO PRINCIPAL DEL HERO */
        .about-hero__title {
          font-family: var(--font-display, serif);
          font-size: clamp(4.6rem, 8vw, 7.2rem);
          line-height: 0.98;
          font-weight: 300;
          letter-spacing: -0.035em;
          color: #ffffff;
          margin-bottom: 2rem;
          text-shadow: 0 4px 36px rgba(0, 0, 0, 0.85);
        }

        .about-hero__title-italic {
          display: block;
          font-style: italic;
          font-weight: 400;
          background: linear-gradient(135deg, #FFFFFF 20%, #E8CA7C 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-top: 0.45rem;
        }

        .about-hero__subtitle {
          font-size: clamp(1.32rem, 2.2vw, 1.65rem);
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.94);
          max-width: 100%;
          margin: 0 0 3.8rem;
          font-weight: 400;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.65);
        }

        .about-hero__scroll-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.6rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.28);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 9px 20px 9px 18px;
          border-radius: 9999px;
          cursor: pointer;
          color: #FFFFFF;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
          transition: all 220ms ease;
        }

        @media (hover: hover) and (pointer: fine) {
          .about-hero__scroll-btn:hover {
            color: #FFFFFF;
            border-color: rgba(255, 255, 255, 0.55);
            background: rgba(255, 255, 255, 0.16);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
            transform: translateY(2px);
          }
        }

        .about-hero__scroll-btn:active {
          transform: scale(0.98) translateY(2px);
        }

        .about-hero__scroll-text {
          font-size: 0.8rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 600;
          color: #FFFFFF;
        }

        .about-hero__scroll-pill {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(204, 160, 83, 0.18);
          color: #CCA053;
          animation: floatSlow 2.5s ease-in-out infinite;
        }

        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(4px);
          }
        }

        /* RESPONSIVE BREAKPOINTS (AGENTS.md) */
        @media (max-width: 860px) {
          .about-hero {
            min-height: 82vh;
            padding: 7.5rem 0 4rem;
          }
          .about-hero__container {
            padding: 0 20px;
          }
          .about-hero__content {
            max-width: 100%;
          }
          :global(.about-hero__logo-img) {
            width: clamp(230px, 58vw, 330px);
          }
          .about-hero__logo-wrap {
            margin-bottom: 1.6rem;
          }
          .about-hero__title {
            font-size: clamp(3.2rem, 9vw, 4.4rem);
          }
          .about-hero__subtitle {
            font-size: 1.2rem;
          }
          .about-hero__overlay {
            background: linear-gradient(
              180deg,
              rgba(11, 12, 14, 0.88) 0%,
              rgba(11, 12, 14, 0.8) 55%,
              rgba(11, 12, 14, 0.95) 100%
            );
          }
        }

        @media (max-width: 640px) {
          .about-hero {
            min-height: 76vh;
            padding: 6.5rem 0 3.5rem;
          }
          :global(.about-hero__logo-img) {
            width: clamp(200px, 64vw, 275px);
          }
          .about-hero__logo-wrap {
            margin-bottom: 1.35rem;
          }
          .about-hero__title {
            font-size: clamp(2.7rem, 9.8vw, 3.6rem);
          }
          .about-hero__subtitle {
            font-size: 1.12rem;
            margin-bottom: 1.8rem;
          }
        }
      `}</style>
    </section>
  )
}
