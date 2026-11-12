'use client'

import { Star } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface CustomerReview {
  id: string
  name: string
  initial: string
  rating: number
  text: string
}

const CUSTOMER_REVIEWS: CustomerReview[] = [
  {
    id: 'ines-b',
    name: 'Inés B',
    initial: 'I',
    rating: 5,
    text: 'Experiencia de 10!! Estuvimos recorriendo Mallorca en 3 días, con la SPACE y qué maravilla!! La camper súper equipada, limpia y muy cómoda. Sergio súper atento, amable y con recomendaciones muy buenas. Lo recomiendo al 100%!! Seguro que volveremos ✨',
  },
  {
    id: 'teresa-l',
    name: 'Teresa L',
    initial: 'T',
    rating: 5,
    text: 'Lo encontré de casualidad y fue una experiencia inolvidable con Utopía. Desde el primer contacto fueron lo más en facilitar toda la info y recomendar rutas. Además la camper es literalmente todo lo que puedes necesitar y más!!! Moderna, limpia, con todas las facilidades para pasar unos días (o semanas) y desde luego que bonita y acogedora. Se nota (y se agradece) mucho el cariño pensado en este proyecto. Desde luego que repetiremos. Y Mallorca, poco que decir, paraíso sin palabras!',
  },
  {
    id: 'enrique-toledo',
    name: 'Enrique Toledo Sánchez',
    initial: 'E',
    rating: 5,
    text: 'Experiencia increíble recorriendo Mallorca en camper con Utopía Van Life. La libertad de dormir frente al mar y descubrir calas y montaña sin depender de campings no tiene precio. La camper estaba totalmente equipada, prácticamente nueva, y con todo lo necesario para viajar con total autonomía por la isla. Gracias a las placas solares y las baterías de litio no necesitas enchufarte en ningún momento, lo que te permite hacer la ruta por Mallorca a tu ritmo. Un detalle que nos encantó fue la nevera, que funciona de forma independiente y está siempre encendida, perfecta para tener todo frío durante el viaje. Después de comparar varias opciones, sin duda es la camper más premium para alquilar en Mallorca. Gracias Utopía Van Life por esta experiencia, repetiremos seguro.',
  },
  {
    id: 'maria-t',
    name: 'Maria T',
    initial: 'M',
    rating: 5,
    text: 'La experiencia de conocer Mallorca en furgo ha sido simplemente alucinante!!! Muy cómodo el trato directo, sus recomendaciones y lo fácil que hace todo el proceso. Sin duda lo recomiendo muchísimo, la Camper es espaciosa, con ese acabado premium que hace que sientas que no te falta nada, muy bien equipada, es un auténtico lujo ver amanecer desde la cama... Sin duda repetiría 🌴🌊',
  },
  {
    id: 'manuel-pardavila',
    name: 'Manuel Pardavila Freire',
    initial: 'M',
    rating: 5,
    text: 'Alquilar una autocaravana en Mallorca con Utopía Van Life fue la mejor decisión de nuestro viaje. La furgoneta está perfectamente diseñada para ofrecer comodidad e independencia, permitiéndote explorar la isla sin depender de campings. Desde playas escondidas hasta vistas a la montaña, todo fue muy sencillo. Una forma verdaderamente única de descubrir Mallorca.',
  },
]

export default function CustomerReviews() {
  const t = useTranslations('HomePage.Reviews')

  return (
    <section className="reviews-section" id="resenas" aria-label={t('title')}>
      <div className="container">
        <div className="reviews__header">
          <h2 className="reviews__title">{t('title')}</h2>
          <p className="reviews__subtitle">{t('subtitle')}</p>
        </div>

        <div className="reviews-marquee">
          <div className="reviews-fade reviews-fade--left" aria-hidden="true" />
          <div className="reviews-fade reviews-fade--right" aria-hidden="true" />

          <div className="reviews-track">
            {[0, 1].map((dupIdx) => (
              <div
                key={dupIdx}
                className="reviews-set"
                aria-hidden={dupIdx === 1}
              >
                {CUSTOMER_REVIEWS.map((review) => (
                  <article key={`${dupIdx}-${review.id}`} className="review-card">
                    <div className="review-card__stars" aria-label={`${review.rating} / 5`}>
                      {Array.from({ length: review.rating }).map((_, sIdx) => (
                        <Star
                          key={sIdx}
                          size={15}
                          className="review-card__star"
                          fill="currentColor"
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>

                    <p className="review-card__text">&ldquo;{review.text}&rdquo;</p>

                    <div className="review-card__footer">
                      <div className="review-card__avatar" aria-hidden="true">
                        {review.initial}
                      </div>
                      <div className="review-card__author-meta">
                        <span className="review-card__name">{review.name}</span>
                        <span className="review-card__source">{t('sourceLabel')}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .reviews-section {
          position: relative;
          background: #0B0C0E;
          padding-block: 96px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .reviews-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url('/images/hero-sunset-poster.jpg');
          background-size: cover;
          background-position: center;
          opacity: 0.6;
          pointer-events: none;
          z-index: 0;
        }

        .reviews-section > .container {
          position: relative;
          z-index: 1;
        }

        .reviews__header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 680px;
          margin-inline: auto;
          margin-bottom: 48px;
          gap: 14px;
        }

        .reviews__title {
          font-family: var(--font-display, inherit);
          font-size: clamp(2.6rem, 4.8vw, 3.65rem);
          font-weight: 500;
          color: #FFFFFF;
          letter-spacing: -0.02em;
          line-height: 1.08;
          margin: 0;
        }

        .reviews__subtitle {
          color: #94A3B8;
          line-height: 1.68;
          font-size: 1.05rem;
          margin: 0;
          text-wrap: balance;
        }

        .reviews-marquee {
          position: relative;
          width: 100%;
          overflow: hidden;
          padding-block: 8px;
        }

        .reviews-fade {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 72px;
          z-index: 2;
          pointer-events: none;
        }

        .reviews-fade--left {
          left: 0;
          background: linear-gradient(to right, #0E1013 0%, transparent 100%);
        }

        .reviews-fade--right {
          right: 0;
          background: linear-gradient(to left, #0E1013 0%, transparent 100%);
        }

        .reviews-track {
          display: flex;
          width: max-content;
          animation: reviews-scroll-left 48s linear infinite;
          will-change: transform;
        }

        .reviews-marquee:hover .reviews-track,
        .reviews-marquee:focus-within .reviews-track {
          animation-play-state: paused;
        }

        @keyframes reviews-scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .reviews-set {
          display: flex;
          align-items: stretch;
          gap: 24px;
          padding-right: 24px;
        }

        .review-card {
          flex: 0 0 340px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 16px;
          padding: 24px;
          border-radius: 20px;
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
          transition: border-color 200ms ease, transform 200ms ease;
        }

        .review-card:hover {
          border-color: rgba(204, 160, 83, 0.4);
          transform: translateY(-2px);
        }

        .review-card__stars {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #F5B841;
        }

        .review-card__text {
          font-size: 0.93rem;
          line-height: 1.62;
          color: #CBD5E1;
          margin: 0;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 7;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .review-card__footer {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
        }

        .review-card__avatar {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(204, 160, 83, 0.16);
          border: 1px solid rgba(204, 160, 83, 0.4);
          color: #E8CA7C;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .review-card__author-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .review-card__name {
          font-size: 0.92rem;
          font-weight: 700;
          color: #FFFFFF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .review-card__source {
          font-size: 0.74rem;
          color: #94A3B8;
        }

        @media (prefers-reduced-motion: reduce) {
          .reviews-marquee {
            overflow-x: auto;
          }
          .reviews-track {
            animation: none;
          }
          .reviews-set[aria-hidden='true'] {
            display: none;
          }
          .reviews-fade {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .reviews-section {
            padding-block: 64px;
          }

          .reviews__header {
            margin-bottom: 36px;
          }

          .reviews-fade {
            width: 28px;
          }

          .reviews-set {
            gap: 16px;
            padding-right: 16px;
          }

          .review-card {
            flex: 0 0 285px;
            padding: 20px;
          }
        }
      `}</style>
    </section>
  )
}
