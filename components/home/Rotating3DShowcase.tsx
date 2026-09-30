'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Sparkles, Eye, Compass, MoveHorizontal } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'

interface ShowcaseItem {
  id: string
  title: string
  subtitle: string
  camper: 'SPACE' | 'NEO' | 'MALLORCA'
  tag: string
  image: string
  href: string
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: 'space-sunset',
    title: 'Atardecer en los Acantilados',
    subtitle: 'Vistas panorámicas infinitas al Mediterráneo',
    camper: 'SPACE',
    tag: 'Utopia Space',
    image: '/images/campers/uploads/1790382530493-2k_space_landscape_door_closed.jpeg',
    href: '/campers/space',
  },
  {
    id: 'neo-lounge',
    title: 'Salón de Roble Nórdico',
    subtitle: 'Luz natural, acabados cálidos y máxima calidez',
    camper: 'NEO',
    tag: 'Utopia Neo',
    image: '/images/campers/neo/interior/neo-salon-daylight.webp',
    href: '/campers/neo',
  },
  {
    id: 'space-saloon-open',
    title: 'Salón en U Abierto al Mar',
    subtitle: 'Suite diáfana de 7m² con puertas panorámicas',
    camper: 'SPACE',
    tag: 'Suite Diáfana',
    image: '/images/campers/space/interior/space-saloon-rear-doors-open.webp',
    href: '/campers/space',
  },
  {
    id: 'neo-kitchen',
    title: 'Cocina Gourmet & Vinoteca',
    subtitle: 'Inducción rápida, menaje completo y bodega fresca',
    camper: 'NEO',
    tag: 'Gastronomía',
    image: '/images/campers/neo/interior/neo-kitchen-wine-cooler.webp',
    href: '/campers/neo',
  },
  {
    id: 'space-cinema',
    title: 'Cine Suite Bajo las Estrellas',
    subtitle: 'Proyector HD integrado con sonido envolvente',
    camper: 'SPACE',
    tag: 'Pack Cinema',
    image: '/images/campers/space/interior/space-cinema-projector-lounge.webp',
    href: '/campers/space',
  },
  {
    id: 'neo-ocean-bed',
    title: 'Dormitorio con Vista al Océano',
    subtitle: 'Colchón viscoelástico de alta densidad y confort',
    camper: 'NEO',
    tag: 'Descanso 5★',
    image: '/images/campers/neo/interior/neo-bed-view-outdoors.webp',
    href: '/campers/neo',
  },
  {
    id: 'space-drop-bed',
    title: 'Cama Elevable Eléctrica',
    subtitle: 'Espacio diáfano de día, suite king de noche',
    camper: 'SPACE',
    tag: 'Ingeniería',
    image: '/images/campers/space/interior/space-electric-drop-down-bed.webp',
    href: '/campers/space',
  },
  {
    id: 'island-breakfast',
    title: 'Despertar en Calas Vírgenes',
    subtitle: 'La libertad de amanecer en primera línea de mar',
    camper: 'MALLORCA',
    tag: 'Experiencia',
    image: '/images/hero/hero-breakfast-sea-horizon.webp',
    href: '/campers',
  },
]

export default function Rotating3DShowcase() {
  const locale = useLocale()
  const isEs = locale === 'es'

  const containerRef = useRef<HTMLDivElement>(null)
  const [rotationAngle, setRotationAngle] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  const dragStartX = useRef(0)
  const dragStartAngle = useRef(0)
  const animFrameId = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const currentAngleRef = useRef(0)

  // Sync ref with state
  currentAngleRef.current = rotationAngle

  // Auto rotation loop
  useEffect(() => {
    const autoSpeed = 0.05 // degrees per millisecond * constant -> gentle ~5-7 deg/sec

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const delta = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      // If not dragging and not hovered, advance gentle auto-rotation
      if (!isDragging && !isHovered) {
        setRotationAngle(prev => (prev - (delta * 0.016)) % 360)
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
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const deltaX = e.clientX - dragStartX.current
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

  const totalCards = SHOWCASE_ITEMS.length
  const stepAngle = 360 / totalCards

  return (
    <section className="showcase-section" aria-label="Galería interactiva en 3D de Utopia Van Life">
      <div className="container showcase-header">
        <div className="showcase-eyebrow">
          <Sparkles size={13} className="text-forest" />
          <span>{isEs ? 'EXPERIENCIA VISUAL 360°' : '360° VISUAL EXPERIENCE'}</span>
        </div>
        <h2 className="showcase-title">
          {isEs ? 'Espacios pensados para desconectar' : 'Spaces Crafted for Pure Freedom'}
        </h2>
        <p className="showcase-subtitle">
          {isEs
            ? 'Gira la galería arrastrando para descubrir los interiores de autor, la autonomía solar y cada detalle artesanal.'
            : 'Drag to spin the cylinder and explore bespoke interiors, solar independence and handcrafted comfort.'}
        </p>
        <div className="showcase-drag-hint">
          <MoveHorizontal size={14} className="drag-hint-icon" />
          <span>{isEs ? 'Arrastra para girar · Haz clic en cualquier foto' : 'Drag to rotate · Click any photo to view'}</span>
        </div>
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

            return (
              <div
                key={item.id}
                className="showcase-card"
                style={{
                  transform: `rotateY(${cardAngle}deg) translateZ(var(--cylinder-radius))`,
                }}
              >
                <Link href={item.href as any} className="showcase-card__link">
                  <div className="showcase-card__image-wrap">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 270px, 360px"
                      className="showcase-card__img"
                      style={{ objectFit: 'cover', objectPosition: 'center' }}
                      loading="lazy"
                    />
                    <div className="showcase-card__scrim" />

                    <div className="showcase-card__tag">
                      <span>{item.tag}</span>
                    </div>

                    <div className="showcase-card__content">
                      <div className="showcase-card__badge-row">
                        <span className="showcase-card__camper-badge">{item.camper}</span>
                      </div>
                      <h3 className="showcase-card__heading">{item.title}</h3>
                      <p className="showcase-card__text">{item.subtitle}</p>
                    </div>

                    <div className="showcase-card__action">
                      <Eye size={14} />
                      <span>{isEs ? 'Explorar' : 'Explore'}</span>
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
          padding-top: var(--space-20);
          padding-bottom: var(--space-24);
          background: linear-gradient(180deg, var(--white-broken) 0%, #0d120f 16%, #0d120f 84%, var(--white-broken) 100%);
          color: #ffffff;
          overflow: hidden;
        }

        .showcase-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: var(--space-12);
          position: relative;
          z-index: 2;
        }

        .showcase-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(45, 58, 45, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #9cd1a6;
          margin-bottom: var(--space-4);
          text-transform: uppercase;
        }

        .showcase-title {
          font-family: var(--font-serif, serif);
          font-size: clamp(1.85rem, 3.5vw, 2.75rem);
          font-weight: 400;
          color: #ffffff;
          letter-spacing: -0.02em;
          margin-bottom: var(--space-3);
          max-width: 640px;
        }

        .showcase-subtitle {
          font-size: clamp(0.92rem, 1.8vw, 1.05rem);
          color: rgba(255, 255, 255, 0.7);
          max-width: 580px;
          line-height: 1.6;
          margin-bottom: var(--space-4);
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
          height: 500px;
          perspective: 1200px;
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
          width: 370px;
          height: 350px;
          transform-style: preserve-3d;
          transition: transform 0.05s linear;
          will-change: transform;
          --cylinder-radius: 480px;
        }

        /* Each Card Facet - Formato cuadrado equilibrado */
        .showcase-card {
          position: absolute;
          inset: 0;
          width: 360px;
          height: 340px;
          margin: auto;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(20, 24, 22, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
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
            padding-top: var(--space-14);
            padding-bottom: var(--space-16);
          }
          .showcase-viewport {
            height: 380px;
            perspective: 850px;
          }
          .showcase-cylinder {
            width: 280px;
            height: 260px;
            --cylinder-radius: 340px;
          }
          .showcase-card {
            width: 260px;
            height: 240px;
            border-radius: 16px;
          }
          .showcase-card__heading {
            font-size: 0.95rem;
          }
          .showcase-card__text {
            font-size: 0.72rem;
          }
        }
      `}</style>
    </section>
  )
}
