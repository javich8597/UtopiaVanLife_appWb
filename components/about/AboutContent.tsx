'use client'

import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Compass, Check, ArrowRight, Layers } from 'lucide-react'

export default function AboutContent() {
  const t = useTranslations('AboutPage')

  const fadeInView = {
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.55, ease: [0.23, 1, 0.32, 1] as const },
  }

  return (
    <div className="about-content">
      {/* ============================================================
          APARTADO 1 (ZIG-ZAG 1): QUIÉNES SOMOS
          Primer apartado: mantiene su margen generoso
          ============================================================ */}
      <section id="quienes-somos" className="about-manifesto about-manifesto--first about-manifesto--dark">
        <div className="about-manifesto__grid">
          {/* Left Column: Text box centered within its 50% half */}
          <div className="about-manifesto__text-col">
            <motion.div className="about-manifesto__text-inner" {...fadeInView}>
              <div className="about-manifesto__kicker">
                <Compass size={14} className="about-gold-icon" />
                <span>{t('whoBadge')}</span>
              </div>

              <h2 className="about-manifesto__title">
                {t('whoTitle')}. <br />
                <span className="about-manifesto__title-gradient">
                  {t('whoHeading')}
                </span>
              </h2>

              <div className="about-manifesto__divider" />

              <div className="about-manifesto__lines">
                <p>{t('whoText1')}</p>
                <div className="about-manifesto__bullets">
                  <div className="about-bullet-row">
                    <div className="about-check-disc">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>{t('whoBullet1')}</span>
                  </div>
                  <div className="about-bullet-row">
                    <div className="about-check-disc">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>{t('whoBullet2')}</span>
                  </div>
                  <div className="about-bullet-row">
                    <div className="about-check-disc">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>{t('whoBullet3')}</span>
                  </div>
                </div>
                <p className="about-manifesto__punchline">
                  {t('whoText3')}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Image without frame, fading left into background */}
          <div className="about-manifesto__img-col">
            <Image
              src="/images/about/transit.jpg"
              alt="Utopia Van Life Ford Transit clásica camper"
              fill
              className="about-manifesto__img"
              sizes="(max-width: 860px) 100vw, 50vw"
              priority
            />
            <div className="about-manifesto__img-shadow about-manifesto__img-shadow--left-dark" />
          </div>
        </div>
      </section>

      {/* ============================================================
          APARTADO 2 (ZIG-ZAG 2): NUESTRA FORMA DE HACERLO
          Margen entre apartados más pequeño
          ============================================================ */}
      <section className="about-manifesto about-manifesto--subsequent about-manifesto--alt">
        <div className="about-manifesto__grid about-manifesto__grid--reverse">
          {/* Left Column: Image without frame, fading right into background */}
          <div className="about-manifesto__img-col">
            <Image
              src="/images/campers/space/interior/space-saloon-rear-doors-open.webp"
              alt="Artesanía y acabados camper Utopia Van Life"
              fill
              className="about-manifesto__img"
              sizes="(max-width: 860px) 100vw, 50vw"
            />
            <div className="about-manifesto__img-shadow about-manifesto__img-shadow--right-alt" />
          </div>

          {/* Right Column: Text box centered within its 50% half */}
          <div className="about-manifesto__text-col">
            <motion.div className="about-manifesto__text-inner" {...fadeInView}>
              <div className="about-manifesto__kicker">
                <Layers size={14} className="about-gold-icon" />
                <span>{t('methodBadge')}</span>
              </div>

              <h2 className="about-manifesto__title">
                {t('methodTitle')}. <br />
                <span className="about-manifesto__title-gradient">
                  &ldquo;{t('methodText1')}&rdquo;
                </span>
              </h2>

              <div className="about-manifesto__divider" />

              <div className="about-manifesto__lines">
                <p>{t('methodText2')}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================
          APARTADO 3 (ZIG-ZAG 3): NUESTRA FILOSOFÍA
          Margen entre apartados más pequeño
          ============================================================ */}
      <section className="about-manifesto about-manifesto--subsequent about-manifesto--dark">
        <div className="about-manifesto__grid">
          {/* Left Column: Manifesto Text centered in its 50% half */}
          <div className="about-manifesto__text-col">
            <motion.div className="about-manifesto__text-inner" {...fadeInView}>
              <div className="about-manifesto__kicker">
                <Compass size={14} className="about-gold-icon" />
                <span>{t('philosophyBadge')}</span>
              </div>

              <h2 className="about-manifesto__title">
                Nuestra Filosofía. <br />
                <span className="about-manifesto__title-gradient">
                  Viajar no debería ser complicado.
                </span>
              </h2>

              <div className="about-manifesto__divider" />

              <div className="about-manifesto__lines">
                <p>
                  Debería ser sencillo: <br />
                  arrancar, moverte, parar cuando te apetezca.
                </p>
                <p>
                  Dormir bien. <br />
                  Estar cómodo. <br />
                  Y disfrutar del camino.
                </p>
                <p className="about-manifesto__punchline">
                  Eso es lo que buscamos con cada modelo.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Image without frame, fading left into background */}
          <div className="about-manifesto__img-col">
            <Image
              src="/images/camper-interior-sunset.jpg"
              alt="Interior camper Utopia Van Life al atardecer frente al mar"
              fill
              className="about-manifesto__img"
              sizes="(max-width: 860px) 100vw, 50vw"
            />
            <div className="about-manifesto__img-shadow about-manifesto__img-shadow--left-dark" />
          </div>
        </div>
      </section>

      {/* ============================================================
          APARTADO 4: CTA FINAL BOUTIQUE (Estilo Venta)
          ============================================================ */}
      <section className="about-cta-section">
        <div className="about-cta-container">
          <motion.div
            className="about-cta-card"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="about-manifesto__kicker">
              <Compass size={14} className="about-gold-icon" />
              <span>{t('ctaBadge')}</span>
            </div>

            <h2 className="about-cta-title">{t('ctaTitle')}</h2>
            <p className="about-cta-subtitle">{t('ctaSubtitle')}</p>

            <div className="about-cta-actions">
              <Link href="/campers" className="about-btn-gold">
                <span>{t('ctaFleetBtn')}</span>
                <ArrowRight size={16} />
              </Link>
              <Link href="/contacto" className="about-btn-gold-outline">
                <span>{t('ctaContactBtn')}</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <style jsx>{`
        .about-content {
          background: #08090B;
          color: #FFFFFF;
          width: 100%;
          overflow: hidden;
          padding: 0 0 clamp(50px, 6vw, 80px);
        }

        /* Each section as an independent apartado */
        .about-manifesto {
          width: 100%;
          position: relative;
          overflow: hidden;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        /* Espaciado de separación compacto entre apartados */
        .about-manifesto--first {
          margin-top: clamp(40px, 5vw, 64px);
          margin-bottom: clamp(24px, 3.2vw, 36px);
        }

        .about-manifesto--subsequent {
          margin-bottom: clamp(24px, 3.2vw, 36px);
        }

        .about-manifesto--dark {
          background: #0B0C0E;
        }

        .about-manifesto--alt {
          background: #0E1013;
        }

        .about-manifesto__grid {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: stretch;
          min-height: 520px;
        }

        .about-manifesto__grid--reverse {
          grid-template-columns: 1fr 1fr;
        }

        /* Text Column: Takes 50% and centers the text block inside with generous margins */
        .about-manifesto__text-col {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(48px, 6vw, 84px) clamp(32px, 5vw, 72px);
          width: 100%;
          z-index: 2;
        }

        /* Text Inner Box: Centered in its half, never touches the edges, max-width controlled */
        .about-manifesto__text-inner {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .about-manifesto__kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #CCA053;
          margin-bottom: 16px;
        }

        :global(.about-gold-icon) {
          color: #CCA053;
        }

        .about-manifesto__title {
          font-size: clamp(1.9rem, 2.7vw, 2.5rem);
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.22;
          margin-bottom: 18px;
          letter-spacing: -0.02em;
        }

        .about-manifesto__title-gradient {
          background: linear-gradient(135deg, #FFFFFF 20%, #E8CA7C 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .about-manifesto__divider {
          width: 48px;
          height: 2px;
          background: linear-gradient(90deg, #CCA053 0%, transparent 100%);
          margin-bottom: 24px;
        }

        .about-manifesto__lines {
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 1.05rem;
          color: #94A3B8;
          line-height: 1.65;
          width: 100%;
        }

        .about-manifesto__lines p {
          margin: 0;
        }

        .about-manifesto__bullets {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin: 4px 0;
        }

        .about-bullet-row {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #E2E8F0;
        }

        .about-check-disc {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(204, 160, 83, 0.16);
          border: 1px solid rgba(204, 160, 83, 0.35);
          color: #CCA053;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .about-manifesto__punchline {
          margin-top: 14px !important;
          color: #E8CA7C !important;
          font-weight: 600;
          font-style: italic;
          font-size: 1.08rem;
        }

        /* Image Column: 50% width, no frame, full height */
        .about-manifesto__img-col {
          position: relative;
          min-height: 520px;
          width: 100%;
        }

        :global(.about-manifesto__img) {
          object-fit: cover;
          object-position: center;
        }

        /* Gradient shadow on image for Dark (#0B0C0E) */
        .about-manifesto__img-shadow--left-dark {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            #0B0C0E 0%,
            rgba(11, 12, 14, 0.45) 8%,
            transparent 20%
          );
          pointer-events: none;
        }

        /* Gradient shadow on image for Alt (#0E1013) reverse */
        .about-manifesto__img-shadow--right-alt {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            270deg,
            #0E1013 0%,
            rgba(14, 16, 19, 0.45) 8%,
            transparent 20%
          );
          pointer-events: none;
        }

        /* CTA Section */
        .about-cta-section {
          padding: 30px 20px 20px;
          position: relative;
          width: 100%;
        }

        .about-cta-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .about-cta-card {
          background: linear-gradient(180deg, #13161B 0%, #0B0C0E 100%);
          border: 1px solid rgba(204, 160, 83, 0.35);
          border-radius: 28px;
          padding: 64px 36px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          position: relative;
          overflow: hidden;
        }

        .about-cta-title {
          font-family: var(--font-display, serif);
          font-size: clamp(2rem, 3.5vw, 2.7rem);
          font-weight: 400;
          color: #FFFFFF;
          margin: 0 0 16px;
          line-height: 1.2;
        }

        .about-cta-subtitle {
          font-size: 1.1rem;
          color: #94A3B8;
          max-width: 600px;
          margin: 0 0 32px;
          line-height: 1.6;
        }

        .about-cta-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .about-cta-actions :global(.about-btn-gold),
        .about-cta-actions :global(.about-btn-gold-outline) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: #FFFFFF;
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          padding: 12px 28px;
          min-height: 44px;
          text-decoration: none;
          cursor: pointer;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          user-select: none;
        }

        .about-cta-actions :global(.about-btn-gold svg) {
          color: #CCA053;
          flex-shrink: 0;
          transition: transform 0.25s ease;
        }

        .about-cta-actions :global(.about-btn-gold:hover),
        .about-cta-actions :global(.about-btn-gold-outline:hover) {
          border-color: rgba(204, 160, 83, 0.45);
          background: rgba(204, 160, 83, 0.12);
          color: #CCA053;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
        }

        .about-cta-actions :global(.about-btn-gold:hover svg) {
          transform: translateX(3px);
        }

        .about-cta-actions :global(.about-btn-gold:active),
        .about-cta-actions :global(.about-btn-gold-outline:active) {
          transform: translateY(0);
        }

        /* RESPONSIVE BREAKPOINTS (AGENTS.md) */
        @media (max-width: 860px) {
          .about-manifesto--first {
            margin-top: 32px;
            margin-bottom: 24px;
          }

          .about-manifesto--subsequent {
            margin-bottom: 24px;
          }

          .about-manifesto__grid,
          .about-manifesto__grid--reverse {
            grid-template-columns: 1fr;
            min-height: auto;
          }

          .about-manifesto__grid--reverse {
            display: flex;
            flex-direction: column-reverse;
          }

          .about-manifesto__text-col {
            padding: 48px 24px 36px;
          }

          .about-manifesto__text-inner {
            max-width: 100%;
          }

          .about-manifesto__img-col {
            min-height: 340px;
            height: 340px;
          }

          .about-manifesto__img-shadow--left-dark {
            background: linear-gradient(
              180deg,
              #0B0C0E 0%,
              rgba(11, 12, 14, 0.2) 20%,
              transparent 70%,
              #0B0C0E 100%
            );
          }

          .about-manifesto__img-shadow--right-alt {
            background: linear-gradient(
              180deg,
              #0E1013 0%,
              rgba(14, 16, 19, 0.2) 20%,
              transparent 70%,
              #0E1013 100%
            );
          }

          .about-cta-card {
            padding: 48px 20px;
          }
        }

        @media (max-width: 640px) {
          .about-manifesto--first {
            margin-top: 24px;
            margin-bottom: 18px;
          }

          .about-manifesto--subsequent {
            margin-bottom: 18px;
          }

          .about-manifesto__title {
            font-size: 1.85rem;
          }

          .about-manifesto__text-col {
            padding: 40px 18px 28px;
          }

          .about-manifesto__img-col {
            min-height: 280px;
            height: 280px;
          }

          .about-cta-actions {
            flex-direction: column;
            width: 100%;
          }

          .about-cta-actions :global(.about-btn-gold),
          .about-cta-actions :global(.about-btn-gold-outline) {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
