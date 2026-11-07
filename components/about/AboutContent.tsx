'use client'

import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Compass, CheckCircle2, ArrowRight, Heart, MapPin, Feather, Layers, ShieldCheck } from 'lucide-react'

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
      <section id="quienes-somos" className="section about-who-section">
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
          EDITORIAL PHOTO TRIPTYCH: LA EXPERIENCIA UTOPIA
          ============================================================ */}
      <section className="about-gallery-strip" aria-label="Galería visual Utopia Van Life">
        <div className="container">
          <div className="about-gallery-header">
            <span className="about-gallery-tagline">LA EXPERIENCIA VISUAL</span>
            <h3 className="about-gallery-title">Naturaleza, calma y arquitectura sobre ruedas</h3>
          </div>

          <div className="about-gallery-grid">
            <motion.div
              className="about-gallery-item"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.05 }}
            >
              <div className="about-gallery-img-wrap">
                <Image
                  src="/images/hero/hero-breakfast-sea-horizon.webp"
                  alt="Despertar frente al mar en cala virgen"
                  fill
                  className="about-gallery-img"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="about-gallery-scrim" />
                <div className="about-gallery-caption">
                  <span className="about-gallery-badge">Amanecer</span>
                  <p>Despertar con vistas al mar en calas secretas de Mallorca</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="about-gallery-item"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <div className="about-gallery-img-wrap">
                <Image
                  src="/images/campers/space/interior/space-saloon-rear-doors-open.webp"
                  alt="Salón panorámico en U abierto al océano"
                  fill
                  className="about-gallery-img"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="about-gallery-scrim" />
                <div className="about-gallery-caption">
                  <span className="about-gallery-badge">Confort 5★</span>
                  <p>Salón diáfano de 7m² abierto a la brisa marina</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="about-gallery-item"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <div className="about-gallery-img-wrap">
                <Image
                  src="/images/campers/neo/interior/neo-salon-daylight.webp"
                  alt="Salón nórdico con luz natural y calidez de roble"
                  fill
                  className="about-gallery-img"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="about-gallery-scrim" />
                <div className="about-gallery-caption">
                  <span className="about-gallery-badge">Artesanía</span>
                  <p>Maderas nobles, luz natural y desconexión absoluta</p>
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
                  <Layers size={18} />
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
      <section className="section about-philosophy-section">
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
                    src="/images/campers/uploads/1790382530493-2k_space_landscape_door_closed.jpeg"
                    alt="Camper Utopia Van Life al atardecer frente al mar"
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
        .about-content {
          background: #0B0C0E;
          color: #FFFFFF;
        }

        /* ============================================================
           SHARED LAYOUT & GRID
           ============================================================ */
        .about-who-section,
        .about-philosophy-section {
          padding: 6rem 0;
          background: #0B0C0E;
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
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.35);
          border-radius: var(--radius-full);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #CCA053;
          margin-bottom: 1.25rem;
        }

        .about-pill-label--center {
          margin-left: auto;
          margin-right: auto;
        }

        .about-pill-icon {
          color: #CCA053;
        }

        .about-eyebrow {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #CCA053;
          margin-bottom: 0.5rem;
        }

        .about-section-title {
          font-family: var(--font-display, sans-serif);
          font-size: clamp(2.4rem, 4.5vw, 3.6rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.1;
          color: #FFFFFF;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
        }

        .about-lead-text {
          font-size: 1.15rem;
          line-height: 1.7;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 1.75rem;
        }

        .about-body-text {
          font-size: 1rem;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.65);
        }

        /* Manifesto Staccato Box */
        .about-manifesto-box {
          position: relative;
          display: flex;
          gap: 1.25rem;
          padding: 1.5rem 1.75rem;
          background: #131518;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 1.75rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }

        .about-manifesto-accent {
          width: 3px;
          background: #CCA053;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .about-manifesto-items {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .about-manifesto-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.95rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .about-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #CCA053;
          flex-shrink: 0;
        }

        /* Image Card */
        .about-image-card {
          border-radius: 20px;
          overflow: hidden;
          background: #131518;
          padding: 0.6rem;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
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
          background: rgba(14, 16, 15, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
          color: #ffffff;
          letter-spacing: 0.03em;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          z-index: 2;
        }

        .about-badge-pin {
          color: #CCA053;
        }

        .about-badge-heart {
          color: #CCA053;
        }

        /* ============================================================
           GALLERY TRIPTYCH STRIP
           ============================================================ */
        .about-gallery-strip {
          background: #0E1013;
          padding: 5.5rem 0 6rem;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .about-gallery-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .about-gallery-tagline {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: #CCA053;
          text-transform: uppercase;
          margin-bottom: 0.6rem;
        }

        .about-gallery-title {
          font-family: var(--font-display, sans-serif);
          font-size: clamp(1.8rem, 3.2vw, 2.5rem);
          font-weight: 800;
          color: #FFFFFF;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }

        .about-gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.75rem;
        }

        .about-gallery-item {
          border-radius: 20px;
          overflow: hidden;
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
          transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1), border-color 240ms ease;
        }

        .about-gallery-item:hover {
          transform: translateY(-4px);
          border-color: rgba(204, 160, 83, 0.4);
        }

        .about-gallery-img-wrap {
          position: relative;
          width: 100%;
          height: 300px;
          overflow: hidden;
        }

        :global(.about-gallery-img) {
          transition: transform 450ms cubic-bezier(0.23, 1, 0.32, 1);
          object-fit: cover;
        }

        .about-gallery-item:hover :global(.about-gallery-img) {
          transform: scale(1.05);
        }

        .about-gallery-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(11, 12, 14, 0.92) 0%,
            rgba(11, 12, 14, 0.4) 45%,
            transparent 75%
          );
          z-index: 1;
        }

        .about-gallery-caption {
          position: absolute;
          bottom: 1.25rem;
          left: 1.25rem;
          right: 1.25rem;
          z-index: 2;
          color: white;
        }

        .about-gallery-badge {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: rgba(204, 160, 83, 0.18);
          border: 1px solid rgba(204, 160, 83, 0.4);
          color: #CCA053;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 3px 9px;
          border-radius: 6px;
          margin-bottom: 0.4rem;
        }

        .about-gallery-caption p {
          font-size: 0.88rem;
          font-weight: 500;
          line-height: 1.4;
          margin: 0;
          color: rgba(255, 255, 255, 0.95);
        }

        /* ============================================================
           SECTION 2: METHOD & QUOTE
           ============================================================ */
        .about-method-section {
          background: #0B0C0E;
          padding: 6.5rem 0;
        }

        .about-method-container {
          text-align: center;
          max-width: 860px;
          margin: 0 auto;
        }

        .about-method-title {
          font-family: var(--font-display, sans-serif);
          font-size: clamp(2.2rem, 3.8vw, 3.2rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #FFFFFF;
          margin-bottom: 1.75rem;
          text-transform: uppercase;
        }

        .about-quote-box {
          position: relative;
          padding: 1.5rem 0;
          margin-bottom: 1.5rem;
        }

        .about-quote-text {
          font-family: var(--font-display, sans-serif);
          font-size: clamp(1.6rem, 2.75vw, 2.35rem);
          line-height: 1.25;
          font-style: italic;
          font-weight: 400;
          color: #CCA053;
          max-width: 680px;
          margin: 0 auto;
        }

        .about-method-body {
          font-size: 1.075rem;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.65);
          max-width: 720px;
          margin: 0 auto 3.5rem;
        }

        .about-pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.75rem;
          text-align: left;
        }

        .about-pillar-card {
          background: #131518;
          border-radius: 20px;
          padding: 2rem 1.75rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms ease;
        }

        @media (hover: hover) and (pointer: fine) {
          .about-pillar-card:hover {
            transform: translateY(-3px);
            border-color: rgba(204, 160, 83, 0.35);
          }
        }

        .about-pillar-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(204, 160, 83, 0.12);
          color: #CCA053;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }

        .about-pillar-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #FFFFFF;
          margin-bottom: 0.5rem;
          letter-spacing: -0.01em;
        }

        .about-pillar-desc {
          font-size: 0.9rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        /* ============================================================
           SECTION 3: PHILOSOPHY STEPS
           ============================================================ */
        .about-steps-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        .about-step-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .about-step-marker {
          color: #CCA053;
          margin-top: 0.2rem;
          flex-shrink: 0;
        }

        .about-step-content p {
          font-size: 1.025rem;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.85);
          margin: 0;
        }

        .about-philosophy-conclusion {
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .about-philosophy-conclusion p {
          font-family: var(--font-display, sans-serif);
          font-size: 1.3rem;
          font-style: italic;
          color: #CCA053;
          font-weight: 500;
          margin: 0;
        }

        /* ============================================================
           SECTION 4: CTA SECTION
           ============================================================ */
        .about-cta-section {
          padding: 5rem 0 6.5rem;
          background: #0B0C0E;
        }

        .about-cta-card {
          position: relative;
          border-radius: 28px;
          background: radial-gradient(ellipse 70% 60% at 50% 0%, rgba(204, 160, 83, 0.16), transparent 70%), #131518;
          padding: 5rem 2.5rem;
          text-align: center;
          color: #ffffff;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(204, 160, 83, 0.25);
        }

        .about-cta-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1.15rem;
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.35);
          backdrop-filter: blur(12px);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          color: #CCA053;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
        }

        .about-cta-badge-icon {
          color: #CCA053;
        }

        .about-cta-title {
          font-family: var(--font-display, sans-serif);
          font-size: clamp(2.4rem, 4.5vw, 3.6rem);
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
          margin-bottom: 1.25rem;
          text-transform: uppercase;
        }

        .about-cta-subtitle {
          font-size: clamp(1rem, 1.8vw, 1.15rem);
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.7);
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

        :global(.about-btn-primary) {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.95rem 2.2rem;
          background: #CCA053;
          color: #0B0C0E;
          font-weight: 700;
          font-size: 0.92rem;
          letter-spacing: 0.02em;
          border-radius: var(--radius-full);
          text-decoration: none;
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease, box-shadow 160ms ease;
          box-shadow: 0 6px 20px rgba(204, 160, 83, 0.35);
        }

        @media (hover: hover) and (pointer: fine) {
          :global(.about-btn-primary:hover) {
            background: #d8ad5e;
            transform: translateY(-2px);
            box-shadow: 0 8px 26px rgba(204, 160, 83, 0.45);
          }
          :global(.about-btn-primary:hover) :global(.about-btn-arrow) {
            transform: translateX(3px);
          }
        }

        :global(.about-btn-primary:active) {
          transform: scale(0.97);
        }

        :global(.about-btn-arrow) {
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        :global(.about-btn-secondary) {
          display: inline-flex;
          align-items: center;
          padding: 0.95rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          font-weight: 600;
          font-size: 0.92rem;
          border-radius: var(--radius-full);
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-decoration: none;
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms ease, background-color 160ms ease;
        }

        @media (hover: hover) and (pointer: fine) {
          :global(.about-btn-secondary:hover) {
            border-color: rgba(204, 160, 83, 0.5);
            background: rgba(255, 255, 255, 0.09);
            transform: translateY(-2px);
          }
        }

        :global(.about-btn-secondary:active) {
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
            gap: 1.25rem;
          }
          .about-gallery-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
          .about-gallery-img-wrap {
            height: 240px;
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
          .about-gallery-strip {
            padding: 3.5rem 0;
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
          :global(.about-btn-primary),
          :global(.about-btn-secondary) {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
