'use client'

import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Compass, CheckCircle2, ArrowRight, Heart, Sparkles, MapPin, Feather, Layers, ShieldCheck } from 'lucide-react'

export default function AboutContent() {
  const t = useTranslations('AboutPage')

  const fadeInView = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.55, ease: [0.23, 1, 0.32, 1] as const },
  }

  return (
    <div className="about-content">
      {/* ============================================================
          SECTION 1: QUIÉNES SOMOS
          ============================================================ */}
      <section id="quienes-somos" className="section bg-white about-who-section">
        <div className="container">
          <div className="about-grid">
            {/* Text Column */}
            <motion.div className="about-col-text" {...fadeInView}>
              <div className="about-pill-label">
                <Compass size={13} className="about-pill-icon" />
                <span>{t('whoBadge')}</span>
              </div>

              <span className="about-eyebrow">{t('whoTitle')}</span>
              <h2 className="about-section-title">{t('whoHeading')}</h2>

              <p className="about-lead-text">
                {t('whoText1')}
              </p>

              {/* Manifesto Staccato Lines */}
              <div className="about-manifesto-box">
                <div className="about-manifesto-accent" />
                <div className="about-manifesto-items">
                  <div className="about-manifesto-item">
                    <span className="about-dot" />
                    <span>{t('whoBullet1')}</span>
                  </div>
                  <div className="about-manifesto-item">
                    <span className="about-dot" />
                    <span>{t('whoBullet2')}</span>
                  </div>
                  <div className="about-manifesto-item">
                    <span className="about-dot" />
                    <span>{t('whoBullet3')}</span>
                  </div>
                </div>
              </div>

              <p className="about-body-text">
                {t('whoText3')}
              </p>
            </motion.div>

            {/* Visual Column */}
            <motion.div
              className="about-col-visual"
              initial={{ opacity: 0, scale: 0.98, y: 16 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="about-image-card">
                <div className="about-image-wrap">
                  <Image
                    src="/images/about/transit.jpg"
                    alt="Utopia Van Life Ford Transit clásica camper"
                    fill
                    className="about-img"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                  <div className="about-img-glass-badge">
                    <MapPin size={13} className="about-badge-pin" />
                    <span>{t('whoImgBadge')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: NUESTRA FORMA DE HACERLO
          ============================================================ */}
      <section className="section about-method-section">
        <div className="container">
          <motion.div className="about-method-container" {...fadeInView}>
            <div className="about-pill-label about-pill-label--center">
              <Feather size={13} className="about-pill-icon" />
              <span>{t('methodBadge')}</span>
            </div>

            <h2 className="about-method-title">{t('methodTitle')}</h2>

            <div className="about-quote-box">
              <p className="about-quote-text">
                &ldquo;{t('methodText1')}&rdquo;
              </p>
            </div>

            <p className="about-method-body">
              {t('methodText2')}
            </p>

            {/* 3 Pillars of Craft */}
            <div className="about-pillars-grid">
              <motion.div
                className="about-pillar-card"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="about-pillar-icon-wrap">
                  <Layers size={18} />
                </div>
                <h3 className="about-pillar-title">{t('pillar1Title')}</h3>
                <p className="about-pillar-desc">{t('pillar1Desc')}</p>
              </motion.div>

              <motion.div
                className="about-pillar-card"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="about-pillar-icon-wrap">
                  <Sparkles size={18} />
                </div>
                <h3 className="about-pillar-title">{t('pillar2Title')}</h3>
                <p className="about-pillar-desc">{t('pillar2Desc')}</p>
              </motion.div>

              <motion.div
                className="about-pillar-card"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.19, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="about-pillar-icon-wrap">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="about-pillar-title">{t('pillar3Title')}</h3>
                <p className="about-pillar-desc">{t('pillar3Desc')}</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: NUESTRA FILOSOFÍA
          ============================================================ */}
      <section className="section bg-white about-philosophy-section">
        <div className="container">
          <div className="about-grid about-grid--reverse">
            {/* Visual Column */}
            <motion.div
              className="about-col-visual"
              initial={{ opacity: 0, scale: 0.98, y: 16 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="about-image-card">
                <div className="about-image-wrap">
                  <Image
                    src="/images/about/interior-about.png"
                    alt="Interior acogedor camper Utopia Van Life"
                    fill
                    className="about-img"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="about-img-glass-badge">
                    <Heart size={13} className="about-badge-heart" />
                    <span>{t('philosophyImgBadge')}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Text Column */}
            <motion.div className="about-col-text" {...fadeInView}>
              <div className="about-pill-label">
                <Compass size={13} className="about-pill-icon" />
                <span>{t('philosophyBadge')}</span>
              </div>

              <span className="about-eyebrow">{t('philosophyTitle')}</span>
              <h2 className="about-section-title">{t('philosophyTitle')}</h2>

              <p className="about-lead-text">
                {t('philosophyText1')}
              </p>

              <div className="about-steps-list">
                <div className="about-step-item">
                  <div className="about-step-marker">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="about-step-content">
                    <p>{t('philosophyText2')}</p>
                  </div>
                </div>

                <div className="about-step-item">
                  <div className="about-step-marker">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="about-step-content">
                    <p>{t('philosophyText3')}</p>
                  </div>
                </div>
              </div>

              <div className="about-philosophy-conclusion">
                <p>{t('philosophyText4')}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: CTA FINAL BOUTIQUE
          ============================================================ */}
      <section className="about-cta-section">
        <div className="container">
          <motion.div
            className="about-cta-card"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="about-cta-badge">
              <Sparkles size={13} className="about-cta-badge-icon" />
              <span>{t('ctaBadge')}</span>
            </div>

            <h2 className="about-cta-title">{t('ctaTitle')}</h2>
            <p className="about-cta-subtitle">{t('ctaSubtitle')}</p>

            <div className="about-cta-actions">
              <Link href="/campers" className="about-btn-primary">
                <span>{t('ctaFleetBtn')}</span>
                <ArrowRight size={16} className="about-btn-arrow" />
              </Link>
              <Link href="/contacto" className="about-btn-secondary">
                <span>{t('ctaContactBtn')}</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <style jsx>{`
        /* ============================================================
           SHARED LAYOUT & GRID
           ============================================================ */
        .about-who-section,
        .about-philosophy-section {
          padding: 5.5rem 0;
        }

        .about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4.5rem;
          align-items: center;
        }

        .about-grid--reverse {
          grid-template-columns: 1fr 1fr;
        }

        /* Responsive Pills */
        .about-pill-label {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.35rem 0.95rem;
          background: rgba(200, 168, 130, 0.12);
          border: 1px solid rgba(200, 168, 130, 0.25);
          border-radius: var(--radius-full);
          font-size: 0.775rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--sand-dark);
          margin-bottom: 1.25rem;
        }

        .about-pill-label--center {
          margin-left: auto;
          margin-right: auto;
        }

        .about-pill-icon {
          color: var(--sand-dark);
        }

        .about-eyebrow {
          display: block;
          font-size: 0.825rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--sand-dark);
          margin-bottom: 0.5rem;
        }

        .about-section-title {
          font-family: var(--font-display);
          font-size: clamp(2.2rem, 3.8vw, 3.25rem);
          font-weight: 400;
          letter-spacing: -0.02em;
          line-height: 1.15;
          color: var(--black-matte);
          margin-bottom: 1.5rem;
        }

        .about-lead-text {
          font-size: 1.15rem;
          line-height: 1.7;
          font-weight: 500;
          color: var(--black-matte);
          margin-bottom: 1.75rem;
        }

        .about-body-text {
          font-size: 1rem;
          line-height: 1.75;
          color: var(--gray-600);
        }

        /* Manifesto Staccato Box */
        .about-manifesto-box {
          position: relative;
          display: flex;
          gap: 1.25rem;
          padding: 1.25rem 1.5rem;
          background: var(--cream);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(0, 0, 0, 0.04);
          margin-bottom: 1.75rem;
        }

        .about-manifesto-accent {
          width: 3px;
          background: var(--sand-dark);
          border-radius: 999px;
          flex-shrink: 0;
        }

        .about-manifesto-items {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .about-manifesto-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 1.025rem;
          font-weight: 600;
          color: var(--forest-green);
          letter-spacing: -0.01em;
        }

        .about-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--sand-dark);
          flex-shrink: 0;
        }

        /* Visual Card Frame */
        .about-image-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          background: #ffffff;
          padding: 0.6rem;
          box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .about-image-wrap {
          position: relative;
          height: 520px;
          border-radius: 16px;
          overflow: hidden;
        }

        .about-img {
          object-fit: cover;
          transition: transform 600ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        @media (hover: hover) and (pointer: fine) {
          .about-image-card:hover .about-img {
            transform: scale(1.03);
          }
        }

        .about-img-glass-badge {
          position: absolute;
          bottom: 1.25rem;
          left: 1.25rem;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 1rem;
          background: rgba(26, 26, 26, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
          color: #ffffff;
          letter-spacing: 0.03em;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
          z-index: 2;
        }

        .about-badge-pin {
          color: var(--sand);
        }

        .about-badge-heart {
          color: #f28b82;
        }

        /* ============================================================
           SECTION 2: METHOD & QUOTE
           ============================================================ */
        .about-method-section {
          background: var(--cream);
          padding: 6.5rem 0;
          border-top: 1px solid rgba(0, 0, 0, 0.03);
          border-bottom: 1px solid rgba(0, 0, 0, 0.03);
        }

        .about-method-container {
          text-align: center;
          max-width: 860px;
          margin: 0 auto;
        }

        .about-method-title {
          font-family: var(--font-display);
          font-size: clamp(2.1rem, 3.5vw, 3rem);
          font-weight: 400;
          letter-spacing: -0.02em;
          color: var(--black-matte);
          margin-bottom: 1.75rem;
        }

        .about-quote-box {
          position: relative;
          padding: 1.5rem 0;
          margin-bottom: 1.5rem;
        }

        .about-quote-text {
          font-family: var(--font-display);
          font-size: clamp(1.6rem, 2.75vw, 2.35rem);
          line-height: 1.25;
          font-style: italic;
          font-weight: 400;
          color: var(--forest-green);
          max-width: 680px;
          margin: 0 auto;
        }

        .about-method-body {
          font-size: 1.075rem;
          line-height: 1.8;
          color: var(--gray-600);
          max-width: 720px;
          margin: 0 auto 3.5rem;
        }

        .about-pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          text-align: left;
        }

        .about-pillar-card {
          background: #ffffff;
          border-radius: var(--radius-lg);
          padding: 1.75rem 1.5rem;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 200ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        @media (hover: hover) and (pointer: fine) {
          .about-pillar-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
          }
        }

        .about-pillar-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--cream);
          color: var(--forest-green);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .about-pillar-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--black-matte);
          margin-bottom: 0.4rem;
        }

        .about-pillar-desc {
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--gray-600);
        }

        /* ============================================================
           SECTION 3: PHILOSOPHY STEPS
           ============================================================ */
        .about-steps-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.75rem;
        }

        .about-step-item {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
        }

        .about-step-marker {
          color: var(--sand-dark);
          margin-top: 0.2rem;
          flex-shrink: 0;
        }

        .about-step-content p {
          font-size: 1.025rem;
          line-height: 1.65;
          color: var(--gray-800);
        }

        .about-philosophy-conclusion {
          padding-top: 1.25rem;
          border-top: 1px solid var(--gray-200);
        }

        .about-philosophy-conclusion p {
          font-family: var(--font-display);
          font-size: 1.3rem;
          font-style: italic;
          color: var(--forest-green);
          font-weight: 500;
        }

        /* ============================================================
           SECTION 4: CTA SECTION
           ============================================================ */
        .about-cta-section {
          padding: 4.5rem 0 6rem;
          background: var(--white-broken);
        }

        .about-cta-card {
          position: relative;
          border-radius: 24px;
          background: linear-gradient(135deg, #242f24 0%, #1c241c 100%);
          padding: 4.5rem 2.5rem;
          text-align: center;
          color: #ffffff;
          overflow: hidden;
          box-shadow: 0 24px 48px -12px rgba(26, 36, 26, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .about-cta-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.4rem 1.05rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(12px);
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--sand);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 1.25rem;
        }

        .about-cta-badge-icon {
          color: var(--sand);
        }

        .about-cta-title {
          font-family: var(--font-display);
          font-size: clamp(2.2rem, 4vw, 3.25rem);
          font-weight: 400;
          color: #ffffff;
          letter-spacing: -0.02em;
          margin-bottom: 1rem;
        }

        .about-cta-subtitle {
          font-size: clamp(1rem, 1.8vw, 1.15rem);
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
          max-width: 580px;
          margin: 0 auto 2.5rem;
        }

        .about-cta-actions {
          display: inline-flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .about-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.95rem 2rem;
          background: var(--sand);
          color: var(--forest-green);
          font-weight: 600;
          font-size: 0.95rem;
          border-radius: var(--radius-full);
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        }

        @media (hover: hover) and (pointer: fine) {
          .about-btn-primary:hover {
            background: #eddcd0;
            transform: translateY(-2px);
          }
          .about-btn-primary:hover .about-btn-arrow {
            transform: translateX(3px);
          }
        }

        .about-btn-primary:active {
          transform: scale(0.97);
        }

        .about-btn-arrow {
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        .about-btn-secondary {
          display: inline-flex;
          align-items: center;
          padding: 0.95rem 1.85rem;
          background: transparent;
          color: #ffffff;
          font-weight: 500;
          font-size: 0.95rem;
          border-radius: var(--radius-full);
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms ease, background-color 160ms ease;
        }

        @media (hover: hover) and (pointer: fine) {
          .about-btn-secondary:hover {
            border-color: rgba(255, 255, 255, 0.7);
            background: rgba(255, 255, 255, 0.06);
            transform: translateY(-2px);
          }
        }

        .about-btn-secondary:active {
          transform: scale(0.97);
        }

        /* ============================================================
           RESPONSIVE DESIGN
           ============================================================ */
        @media (max-width: 960px) {
          .about-grid {
            grid-template-columns: 1fr;
            gap: 3rem;
          }
          .about-grid--reverse {
            display: flex;
            flex-direction: column-reverse;
          }
          .about-image-wrap {
            height: 380px;
          }
          .about-pillars-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        @media (max-width: 640px) {
          .about-who-section,
          .about-philosophy-section {
            padding: 4rem 0;
          }
          .about-method-section {
            padding: 4.5rem 0;
          }
          .about-cta-card {
            padding: 3rem 1.5rem;
          }
          .about-image-wrap {
            height: 300px;
          }
          .about-cta-actions {
            flex-direction: column;
            width: 100%;
          }
          .about-btn-primary,
          .about-btn-secondary {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
