'use client'

import Image from 'next/image'
import { ArrowRight, Check } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function AboutPreview() {
  const t = useTranslations('HomePage.AboutPreview')

  const row1Points = [
    { title: t('row1_p1_title'), desc: t('row1_p1_desc') },
    { title: t('row1_p2_title'), desc: t('row1_p2_desc') },
    { title: t('row1_p3_title'), desc: t('row1_p3_desc') },
  ]

  const row2Points = [t('row2_p1'), t('row2_p2'), t('row2_p3')]
  const row3Points = [t('row3_p1'), t('row3_p2'), t('row3_p3')]

  return (
    <div className="about-preview" id="por-que-utopia">
      {/* Row 1: Centered "Nuestra Flota" Header + Text Left · Photo Right */}
      <section className="about-band about-band--a">
        <div className="container">
          <div className="about-preview__header">
            <h2 className="about-preview__header-title">
              {t('header_title')}
            </h2>
            <p className="about-preview__header-subtitle">
              {t('header_subtitle')}
            </p>
          </div>

          <div className="about-band__grid">
            <div className="about-band__text">
              <span className="about-band__tag">{t('row1_tag')}</span>
              <h3 className="about-band__title">{t('row1_title')}</h3>

              <ul className="about-band__list">
                {row1Points.map((item, idx) => (
                  <li key={idx} className="about-band__list-item">
                    <div className="about-band__check-disc">
                      <Check size={13} strokeWidth={3} />
                    </div>
                    <span>
                      <strong className="about-band__item-title">{item.title}:</strong>{' '}
                      {item.desc}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="about-band__media">
              <Image
                src="/images/about/interior-about.png"
                alt={t('row1_imgAlt')}
                fill
                sizes="(max-width: 860px) 100vw, 48vw"
                className="about-band__img"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Row 2: Photo Left · Text Right (Autonomía total) */}
      <section className="about-band about-band--b">
        <div className="container">
          <div className="about-band__grid">
            <div className="about-band__media about-band__media--dark">
              <Image
                src="/images/campers/space/tech-details/space-electrical-rooftop.webp"
                alt={t('row2_imgAlt')}
                fill
                sizes="(max-width: 860px) 100vw, 48vw"
                className="about-band__img about-band__img--contain"
                loading="lazy"
              />
            </div>

            <div className="about-band__text">
              <span className="about-band__tag">{t('row2_tag')}</span>
              <h3 className="about-band__title">{t('row2_title')}</h3>

              <ul className="about-band__list">
                {row2Points.map((text, idx) => (
                  <li key={idx} className="about-band__list-item">
                    <div className="about-band__check-disc">
                      <Check size={13} strokeWidth={3} />
                    </div>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Row 3: Text Left · Photo Right (Equipado totalmente + Conócenos) */}
      <section className="about-band about-band--a">
        <div className="container">
          <div className="about-band__grid">
            <div className="about-band__text">
              <span className="about-band__tag">{t('row3_tag')}</span>
              <h3 className="about-band__title">{t('row3_title')}</h3>

              <ul className="about-band__list">
                {row3Points.map((text, idx) => (
                  <li key={idx} className="about-band__list-item">
                    <div className="about-band__check-disc">
                      <Check size={13} strokeWidth={3} />
                    </div>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              <div className="about-band__actions">
                <Link href="/conocenos" className="about-band__cta">
                  <span>{t('row3_cta')}</span>
                  <ArrowRight size={16} className="about-band__cta-arrow" />
                </Link>
              </div>
            </div>

            <div className="about-band__media">
              <Image
                src="/images/camper-interior-sunset.jpg"
                alt={t('row3_imgAlt')}
                fill
                sizes="(max-width: 860px) 100vw, 48vw"
                className="about-band__img"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .about-preview {
          width: 100%;
          color: #FFFFFF;
        }

        .about-preview__header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 680px;
          margin-inline: auto;
          margin-bottom: 48px;
          gap: 14px;
        }

        .about-preview__header-title {
          font-family: var(--font-display, inherit);
          font-size: clamp(2.6rem, 4.8vw, 3.65rem);
          font-weight: 500;
          color: #FFFFFF;
          letter-spacing: -0.02em;
          line-height: 1.08;
          margin: 0;
        }

        .about-preview__header-subtitle {
          color: #94A3B8;
          line-height: 1.68;
          font-size: 1.05rem;
          margin: 0;
          text-wrap: balance;
        }

        .about-band {
          padding: 68px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .about-band--a {
          background: #0E1013;
        }

        .about-band--b {
          background: #0B0C0E;
        }

        .about-band__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 52px;
          align-items: center;
        }

        .about-band__text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .about-band__tag {
          display: inline-block;
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.35);
          color: #E8CA7C;
          padding: 5px 14px;
          border-radius: 50px;
          font-size: 0.76rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 14px;
        }

        .about-band__title {
          font-size: clamp(1.75rem, 3vw, 2.35rem);
          font-weight: 500;
          line-height: 1.15;
          letter-spacing: -0.015em;
          color: #FFFFFF;
          margin: 0 0 20px;
          text-wrap: balance;
        }

        .about-band__list {
          padding: 0;
          margin: 0 0 20px;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 0.98rem;
          color: #94A3B8;
          line-height: 1.5;
        }

        .about-band__list-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .about-band__check-disc {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          margin-top: 2px;
          border-radius: 50%;
          background: rgba(204, 160, 83, 0.16);
          border: 1px solid rgba(204, 160, 83, 0.45);
          color: #E8CA7C;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .about-band__item-title {
          color: #FFFFFF;
          font-weight: 600;
        }

        .about-band__media {
          position: relative;
          width: 100%;
          height: 340px;
          border-radius: 24px;
          overflow: hidden;
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.48);
        }

        .about-band__media--dark {
          background: #0D0F12;
        }

        :global(.about-band__img) {
          object-fit: cover;
          object-position: center;
          transition: transform 500ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        :global(.about-band__img--contain) {
          object-fit: contain;
          padding: 12px;
        }

        .about-band__media:hover :global(.about-band__img) {
          transform: scale(1.03);
        }

        .about-band__actions {
          margin-top: 4px;
        }

        :global(.about-band__cta) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 44px;
          padding: 11px 24px;
          border-radius: 50px;
          background: transparent;
          border: 1px solid rgba(232, 202, 124, 0.55);
          color: #E8CA7C;
          font-size: 0.94rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 200ms ease, color 200ms ease, border-color 200ms ease, transform 200ms ease;
        }

        :global(.about-band__cta:hover) {
          background: rgba(204, 160, 83, 0.16);
          border-color: #E8CA7C;
          color: #FFFFFF;
          transform: translateY(-1px);
        }

        :global(.about-band__cta-arrow) {
          transition: transform 200ms ease;
        }

        :global(.about-band__cta:hover .about-band__cta-arrow) {
          transform: translateX(3px);
        }

        @media (max-width: 860px) {
          .about-band {
            padding: 52px 0;
          }

          .about-preview__header {
            margin-bottom: 36px;
          }

          .about-band__grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .about-band__text {
            order: 1;
          }

          .about-band__media {
            order: 2;
            height: 280px;
          }
        }

        @media (max-width: 640px) {
          .about-band {
            padding: 44px 0;
          }

          .about-band__media {
            height: 230px;
            border-radius: 18px;
          }

          .about-band__actions {
            width: 100%;
          }

          :global(.about-band__cta) {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
