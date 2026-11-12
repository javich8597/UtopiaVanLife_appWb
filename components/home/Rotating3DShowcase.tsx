'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Eye } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface ShowcaseItemConfig {
  id: string
  titleKey: 'card1_title' | 'card2_title' | 'card3_title' | 'card4_title' | 'card5_title' | 'card6_title' | 'card7_title' | 'card8_title'
  subtitleKey: 'card1_subtitle' | 'card2_subtitle' | 'card3_subtitle' | 'card4_subtitle' | 'card5_subtitle' | 'card6_subtitle' | 'card7_subtitle' | 'card8_subtitle'
  tagKey: 'card1_tag' | 'card2_tag' | 'card3_tag' | 'card4_tag' | 'card5_tag' | 'card6_tag' | 'card7_tag' | 'card8_tag'
  badgeKey: 'card1_badge' | 'card2_badge' | 'card3_badge' | 'card4_badge' | 'card5_badge' | 'card6_badge' | 'card7_badge' | 'card8_badge'
  image: string
  href: '/campers/space' | '/campers/neo' | '/campers'
}

const SHOWCASE_ITEMS: ShowcaseItemConfig[] = [
  {
    id: 'sunrise-breakfast',
    titleKey: 'card1_title',
    subtitleKey: 'card1_subtitle',
    tagKey: 'card1_tag',
    badgeKey: 'card1_badge',
    image: '/images/hero/hero-breakfast-sea-horizon.webp',
    href: '/campers/space',
  },
  {
    id: 'hidden-coves',
    titleKey: 'card2_title',
    subtitleKey: 'card2_subtitle',
    tagKey: 'card2_tag',
    badgeKey: 'card2_badge',
    image: '/images/guia/cala-tuent.jpg',
    href: '/campers',
  },
  {
    id: 'paddle-surf',
    titleKey: 'card3_title',
    subtitleKey: 'card3_subtitle',
    tagKey: 'card3_tag',
    badgeKey: 'card3_badge',
    image: '/images/experiences/exp-paddlesurf-mallorca.jpg',
    href: '/campers/neo',
  },
  {
    id: 'cycling-tramuntana',
    titleKey: 'card4_title',
    subtitleKey: 'card4_subtitle',
    tagKey: 'card4_tag',
    badgeKey: 'card4_badge',
    image: '/images/experiences/exp-cycling-mallorca.jpg',
    href: '/campers/neo',
  },
  {
    id: 'offgrid-sunset',
    titleKey: 'card5_title',
    subtitleKey: 'card5_subtitle',
    tagKey: 'card5_tag',
    badgeKey: 'card5_badge',
    image: '/images/campers/uploads/1790382530493-2k_space_landscape_door_closed.jpeg',
    href: '/campers/space',
  },
  {
    id: 'sunset-gastronomy',
    titleKey: 'card6_title',
    subtitleKey: 'card6_subtitle',
    tagKey: 'card6_tag',
    badgeKey: 'card6_badge',
    image: '/images/experiences/exp-sunset-gastronomy.jpg',
    href: '/campers/space',
  },
  {
    id: 'pack-cinema',
    titleKey: 'card7_title',
    subtitleKey: 'card7_subtitle',
    tagKey: 'card7_tag',
    badgeKey: 'card7_badge',
    image: '/images/experiences/exp-cinema-movie.jpg',
    href: '/campers/space',
  },
  {
    id: 'shower-comfort',
    titleKey: 'card8_title',
    subtitleKey: 'card8_subtitle',
    tagKey: 'card8_tag',
    badgeKey: 'card8_badge',
    image: '/images/experiences/exp2.png',
    href: '/campers/neo',
  },
]

export default function Rotating3DShowcase() {
  const t = useTranslations('HomePage.Showcase')

  const containerRef = useRef<HTMLDivElement>(null)
  const [rotationAngle, setRotationAngle] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const dragStartX = useRef(0)
  const dragStartAngle = useRef(0)
  const dragDistanceRef = useRef(0)
  const animFrameId = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const currentAngleRef = useRef(0)

  // Sync ref with state outside render
  useEffect(() => {
    currentAngleRef.current = rotationAngle
  }, [rotationAngle])

  // Auto rotation loop
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const delta = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      // If not dragging and not hovered, advance gentle auto-rotation (velocidad muy suave y pausada)
      if (!isDragging && !isHovered) {
        setRotationAngle(prev => (prev - (delta * 0.007)) % 360)
      }

      animFrameId.current = requestAnimationFrame(animate)
    }

    animFrameId.current = requestAnimationFrame(animate)
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
    }
  }, [isDragging, isHovered])

  // Mouse & Touch Drag Interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartAngle.current = currentAngleRef.current
    dragDistanceRef.current = 0
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const deltaX = e.clientX - dragStartX.current
    dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.abs(deltaX))
    // 0.35 sensitivity
    const newAngle = dragStartAngle.current + deltaX * 0.35
    setRotationAngle(newAngle)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    if (containerRef.current && containerRef.current.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId)
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (dragDistanceRef.current > 8) {
      e.preventDefault()
    }
  }

  const totalCards = SHOWCASE_ITEMS.length
  const stepAngle = 360 / totalCards

  return (
    <section className="showcase-section" id="experiencias" aria-label={t('ariaLabel')}>
      <div className="container showcase-header">
        <h2 className="showcase-title">
          {t('title')}
        </h2>
        <p className="showcase-subtitle">
          {t('subtitle')}
        </p>
      </div>

      {/* 3D Scene Viewport */}
      <div
        ref={containerRef}
        className="showcase-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="showcase-cylinder"
          style={{
            transform: `rotateY(${rotationAngle}deg)`,
          }}
        >
          {SHOWCASE_ITEMS.map((item, index) => {
            const cardAngle = index * stepAngle
            const title = t(item.titleKey)
            const subtitle = t(item.subtitleKey)
            const tag = t(item.tagKey)
            const badge = t(item.badgeKey)

            return (
              <div
                key={item.id}
                className="showcase-card"
                style={{
                  transform: `rotateY(${cardAngle}deg) translateZ(var(--cylinder-radius))`,
                }}
              >
                <Link href={item.href} className="showcase-card__link" onClick={handleCardClick}>
                  <div className="showcase-card__image-wrap">
                    <Image
                      src={item.image}
                      alt={title}
                      fill
                      sizes="(max-width: 640px) 640px, 1080px"
                      quality={95}
                      className="showcase-card__img"
                      style={{ objectFit: 'cover', objectPosition: 'center' }}
                      loading="eager"
                    />
                    <div className="showcase-card__scrim" />

                    <div className="showcase-card__tag">
                      <span>{tag}</span>
                    </div>

                    <div className="showcase-card__content">
                      <div className="showcase-card__badge-row">
                        <span className="showcase-card__camper-badge">{badge}</span>
                      </div>
                      <h3 className="showcase-card__heading">{title}</h3>
                      <p className="showcase-card__text">{subtitle}</p>
                    </div>

                    <div className="showcase-card__action">
                      <Eye size={14} />
                      <span>{t('explore')}</span>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        .showcase-section {
          position: relative;
          padding-top: var(--space-16);
          padding-bottom: var(--space-16);
          background: #0B0C0E;
          color: #ffffff;
          overflow: hidden;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .showcase-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 680px;
          margin-inline: auto;
          margin-bottom: var(--space-16);
          gap: 16px;
          position: relative;
          z-index: 2;
        }

        .showcase-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-radius: 999px;
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.35);
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #E8CA7C;
          text-transform: uppercase;
        }

        .showcase-title {
          font-family: var(--font-display, inherit);
          font-size: clamp(2.6rem, 4.8vw, 3.65rem);
          font-weight: 500;
          color: #FFFFFF;
          letter-spacing: -0.02em;
          line-height: 1.08;
          margin: 0;
        }

        .showcase-subtitle {
          font-size: 1.05rem;
          color: #94A3B8;
          line-height: 1.68;
          margin: 0;
          text-wrap: balance;
        }

        .showcase-drag-hint {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        /* 3D Viewport */
        .showcase-viewport {
          position: relative;
          width: 100%;
          height: 420px;
          perspective: 1150px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
          touch-action: pan-y;
        }

        .showcase-viewport:active {
          cursor: grabbing;
        }

        /* The 3D Rotating Cylinder */
        .showcase-cylinder {
          position: relative;
          width: 345px;
          height: 295px;
          transform-style: preserve-3d;
          transition: transform 0.05s linear;
          will-change: transform;
          --cylinder-radius: 445px;
        }

        /* Each Card Facet - Formato panorámico/compacto equilibrado */
        .showcase-card {
          position: absolute;
          inset: 0;
          width: 335px;
          height: 285px;
          margin: auto;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 18px;
          overflow: hidden;
          background: rgba(20, 24, 22, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
          transition: border-color 220ms ease, box-shadow 220ms ease;
        }

        .showcase-card:hover {
          border-color: rgba(197, 168, 128, 0.55);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6), 0 0 24px rgba(197, 168, 128, 0.16);
        }

        :global(.showcase-card__link) {
          position: relative;
          display: block;
          width: 100%;
          height: 100%;
          text-decoration: none;
          color: inherit;
        }

        .showcase-card__image-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        :global(.showcase-card__img) {
          transition: transform 400ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        .showcase-card:hover :global(.showcase-card__img) {
          transform: scale(1.05);
        }

        .showcase-card__scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(10, 14, 12, 0.95) 0%,
            rgba(10, 14, 12, 0.5) 45%,
            rgba(10, 14, 12, 0.1) 75%,
            transparent 100%
          );
          z-index: 1;
        }

        .showcase-card__tag {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 2;
          background: rgba(18, 24, 19, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(212, 195, 179, 0.3);
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: #F5EFEB;
        }

        .showcase-card__content {
          position: absolute;
          bottom: 18px;
          left: 18px;
          right: 18px;
          z-index: 2;
        }

        .showcase-card__badge-row {
          margin-bottom: 5px;
        }

        .showcase-card__camper-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--sand);
          background: rgba(24, 36, 27, 0.85);
          border: 1px solid rgba(212, 195, 179, 0.25);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .showcase-card__heading {
          font-size: 1.05rem;
          font-weight: 600;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 4px;
        }

        .showcase-card__text {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.82);
          line-height: 1.35;
          margin: 0;
        }

        .showcase-card__action {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          padding: 4px 9px;
          border-radius: 999px;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 200ms ease, transform 200ms ease;
        }

        .showcase-card:hover .showcase-card__action {
          opacity: 1;
          transform: translateY(0);
        }

        /* Mobile Adjustments (<= 640px) */
        @media (max-width: 640px) {
          .showcase-section {
            padding-top: var(--space-10);
            padding-bottom: var(--space-12);
          }
          .showcase-viewport {
            height: 310px;
            perspective: 800px;
          }
          .showcase-cylinder {
            width: 230px;
            height: 200px;
            --cylinder-radius: 290px;
          }
          .showcase-card {
            width: 220px;
            height: 190px;
            border-radius: 14px;
          }
          .showcase-card__tag {
            top: 10px;
            left: 10px;
            padding: 3px 8px;
            font-size: 0.65rem;
          }
          .showcase-card__content {
            padding: 12px;
          }
          .showcase-card__heading {
            font-size: 0.88rem;
            margin-bottom: 2px;
          }
          .showcase-card__text {
            font-size: 0.68rem;
            line-height: 1.25;
          }
        }
      `}</style>
    </section>
  )
}
