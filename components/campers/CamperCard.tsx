'use client'

import { useRef, useState } from 'react'
import { Link } from '@/i18n/routing'
import Image from 'next/image'
import {
  BusFront,
  Moon,
  Ruler,
  ArrowRight,
  Utensils,
  ShowerHead,
  BedDouble,
  BatteryCharging,
  Zap,
  Snowflake,
  Sun,
  Shield,
  Wind,
} from 'lucide-react'
import { resolveCamperContent } from '@/lib/campers/camperCatalog'

const CARD_SPEC_ICONS: Record<string, any> = {
  bus: BusFront,
  users: BusFront,
  moon: Moon,
  utensils: Utensils,
  shower: ShowerHead,
  droplets: ShowerHead,
  ruler: Ruler,
  bed: BedDouble,
  battery: BatteryCharging,
  zap: Zap,
  snowflake: Snowflake,
  sun: Sun,
  shield: Shield,
  wind: Wind,
}

interface CamperCardProps {
  id: string
  slug: string
  name: string
  description_es?: string
  thumbnail_url: string
  images?: string[]
  specs: {
    beds?: number
    seats?: number
    length_m?: number
    year?: number
    [key: string]: any
  }
  deposit_amount: number
  pricePerNight: number
  seasonName?: string
  isAvailable?: boolean
  searchParams?: string
  variant?: 'light' | 'dark'
  customHref?: string
  ctaText?: string
}

export default function CamperCard({
  slug,
  name,
  description_es,
  thumbnail_url,
  images,
  specs,
  deposit_amount,
  pricePerNight,
  seasonName,
  isAvailable = true,
  searchParams = '',
  variant = 'dark',
  customHref,
  ctaText,
}: CamperCardProps) {
  const href = customHref || `/campers/${slug}${searchParams ? `?${searchParams}` : ''}`
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlayingVideo, setIsPlayingVideo] = useState(false)

  // Interior video tours for experiential previews
  const videoPreviewUrl = slug === 'neo'
    ? '/videos/campers/neo/neo-interior-highlight-tour.mp4'
    : slug === 'space'
      ? '/videos/campers/space/space-complete-tour.mp4'
      : null

  const resolved = resolveCamperContent({
    slug,
    name,
    description_es,
    thumbnail_url,
    images,
    specs,
    deposit_amount,
  })

  const subtitleTagline = resolved.card.tagline

  const summarySpecs = resolved.card.summarySpecs.map(item => ({
    icon: CARD_SPEC_ICONS[item.icon] || Zap,
    text: item.text,
    wide: Boolean(item.wide),
  }))

  const handleMouseEnter = () => {
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) {
      return
    }
    if (videoRef.current && videoPreviewUrl) {
      setIsPlayingVideo(true)
      videoRef.current.play().catch(() => { })
    }
  }

  const handleMouseLeave = () => {
    if (videoRef.current && videoPreviewUrl) {
      setIsPlayingVideo(false)
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  const [activeImgIndex, setActiveImgIndex] = useState(0)

  // Galería sincronizada desde el panel de administración (portada + galería)
  const galleryImages: string[] = resolved.cardImages.length > 0
    ? resolved.cardImages
    : [thumbnail_url || '/images/campers/neo/neo-ext.png']

  const currentImg = galleryImages[activeImgIndex] || galleryImages[0]

  const handleNextImg = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveImgIndex(prev => (prev + 1) % galleryImages.length)
  }

  const handlePrevImg = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveImgIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length)
  }

  const handleDotClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveImgIndex(index)
  }

  return (
    <article
      className={`camper-card ${variant === 'dark' ? 'camper-card--dark' : ''} ${!isAvailable ? 'camper-card--unavailable' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image Wrap — Completely free of overlay badges */}
      <div className="camper-card__img-wrap">
        <Link href={isAvailable ? (href as any) : '#'} className="camper-card__img-link" tabIndex={-1}>
          <Image
            src={currentImg}
            alt={`${name} - Vista ${activeImgIndex + 1}`}
            fill
            className={`camper-card__img ${isPlayingVideo ? 'camper-card__img--hidden' : ''}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 560px"
            priority
          />
        </Link>

        {videoPreviewUrl && (
          <video
            ref={videoRef}
            className={`camper-card__preview-video ${isPlayingVideo ? 'camper-card__preview-video--active' : ''}`}
            muted
            loop
            playsInline
            preload="none"
            suppressHydrationWarning
          >
            <source src={videoPreviewUrl} type="video/mp4" />
          </video>
        )}

        {/* Subtle gradient scrim at the bottom for gallery dots */}
        <div className="camper-card__scrim" />

        {/* Left / Right Gallery Navigation Arrows */}
        {galleryImages.length > 1 && (
          <div className="camper-card__gallery-controls">
            <button
              type="button"
              className="camper-card__nav-arrow camper-card__nav-arrow--left"
              onClick={handlePrevImg}
              aria-label={`Ver foto anterior de ${name}`}
            >
              ‹
            </button>
            <button
              type="button"
              className="camper-card__nav-arrow camper-card__nav-arrow--right"
              onClick={handleNextImg}
              aria-label={`Ver siguiente foto de ${name}`}
            >
              ›
            </button>
          </div>
        )}

        {/* Interactive Gallery Dots */}
        {galleryImages.length > 1 && (
          <div className="camper-card__dots" role="tablist" aria-label={`Galería de fotos de ${name}`}>
            {galleryImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`camper-card__dot ${idx === activeImgIndex ? 'camper-card__dot--active' : ''}`}
                onClick={(e) => handleDotClick(idx, e)}
                aria-label={`Foto ${idx + 1} de ${galleryImages.length}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="camper-card__body">

        {/* Header: Name + Price */}
        <div className="camper-card__header">
          <div className="camper-card__title-group">
            <h3 className="camper-card__name text-display">{name}</h3>
            <p className="camper-card__tagline">{subtitleTagline}</p>
          </div>
          <div className="camper-card__price">
            <span className="camper-card__price-from">desde</span>
            <span className="camper-card__price-amount">{pricePerNight}€</span>
            <span className="camper-card__price-label">/ noche</span>
          </div>
        </div>

        {/* Características clave en recuadro */}
        <div className="camper-card__specs">
          {summarySpecs.map(({ icon: Icon, text, wide }, idx) => (
            <div key={idx} className={`camper-card__spec ${wide ? 'camper-card__spec--wide' : ''}`}>
              <Icon size={14} strokeWidth={1.9} className="camper-card__spec-icon" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Interactive CTA */}
        <Link
          href={isAvailable ? (href as any) : '#'}
          className={`btn ${isAvailable ? 'btn-forest' : 'btn-outline'} camper-card__btn ${!isAvailable ? 'btn--disabled' : ''}`}
          aria-disabled={!isAvailable}
          tabIndex={isAvailable ? 0 : -1}
        >
          <span>{isAvailable ? (ctaText || (searchParams ? 'Seleccionar camper' : `Ver detalles de ${name}`)) : 'No disponible'}</span>
          {isAvailable && <ArrowRight size={15} className="camper-card__btn-arrow" />}
        </Link>
      </div>

      <style jsx>{`
        .camper-card {
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
          border-radius: 20px;
          border: 1px solid var(--gray-200);
          overflow: hidden;
          box-shadow: var(--shadow-card);
          transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1), 
                      box-shadow 240ms cubic-bezier(0.23, 1, 0.32, 1), 
                      border-color 240ms ease;
          position: relative;
        }
        .camper-card:hover { 
          transform: translateY(-4px);
          box-shadow: 0 16px 36px -4px rgba(24, 36, 27, 0.12);
          border-color: rgba(197, 168, 128, 0.45);
        }
        .camper-card:active {
          transform: translateY(-1px) scale(0.985);
          transition-duration: 100ms;
        }
        .camper-card--unavailable {
          filter: grayscale(85%);
          opacity: 0.7;
        }
        .camper-card--unavailable:hover { 
          transform: none; 
          box-shadow: var(--shadow-card);
        }

        /* Image & Video Wrap */
        .camper-card__img-wrap {
          position: relative;
          aspect-ratio: 16/10;
          overflow: hidden;
          background: var(--gray-100);
        }
        :global(.camper-card__img) {
          object-fit: cover;
          transition: transform 350ms cubic-bezier(0.23, 1, 0.32, 1), opacity 240ms ease;
        }
        .camper-card:hover :global(.camper-card__img) {
          transform: scale(1.03);
        }
        :global(.camper-card__img--hidden) {
          opacity: 0;
        }

        .camper-card__preview-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
          pointer-events: none;
        }
        .camper-card__preview-video--active {
          opacity: 1;
        }

        :global(.camper-card__img-link) {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
        }

        .camper-card__scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top, 
            rgba(0, 0, 0, 0.4) 0%, 
            rgba(0, 0, 0, 0.05) 25%, 
            transparent 50%
          );
          pointer-events: none;
        }

        /* Gallery Controls (Chevrons) */
        .camper-card__gallery-controls {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          opacity: 0;
          transition: opacity 200ms ease;
          pointer-events: none;
          z-index: 3;
        }
        .camper-card:hover .camper-card__gallery-controls {
          opacity: 1;
        }
        .camper-card__nav-arrow {
          pointer-events: auto;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: var(--black-matte);
          font-size: 1.4rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transition: transform 150ms ease, background 150ms ease;
          user-select: none;
        }
        .camper-card__nav-arrow:hover {
          background: #ffffff;
          transform: scale(1.08);
        }
        .camper-card__nav-arrow:active {
          transform: scale(0.95);
        }

        /* Gallery Dots */
        .camper-card__dots {
          position: absolute;
          bottom: 12px;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          z-index: 3;
        }
        .camper-card__dot {
          width: 7px;
          height: 7px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.5);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 200ms cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .camper-card__dot--active {
          width: 20px;
          background: #ffffff;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
        }



        /* Body */
        .camper-card__body {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: var(--space-6);
          gap: var(--space-4);
          background: white;
        }

        /* Header */
        .camper-card__header {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          gap: var(--space-4);
        }
        .camper-card__title-group {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
          min-width: 0;
        }
        .camper-card__name {
          font-size: 1.85rem;
          font-weight: 600;
          color: var(--black-matte);
          line-height: 1.1;
          letter-spacing: -0.01em;
        }
        .camper-card__tagline {
          font-size: 0.8rem;
          color: var(--gray-600);
          font-weight: 500;
          line-height: 1.38;
          max-width: 320px;
        }

        /* Price */
        .camper-card__price {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          flex-shrink: 0;
          padding: 6px 14px;
          background: #FDFBF8;
          border-radius: var(--radius-md);
          border: 1px solid var(--gray-200);
          box-sizing: border-box;
        }
        .camper-card__price-from {
          font-size: 0.56rem;
          font-weight: 500;
          color: var(--gray-500);
          text-transform: lowercase;
          letter-spacing: 0.02em;
          margin-bottom: 4px;
          line-height: 1;
        }
        .camper-card__price-amount {
          font-family: var(--font-sans);
          font-size: 1.65rem;
          font-weight: 700;
          color: var(--forest-green);
          line-height: 1;
        }
        .camper-card__price-label {
          font-size: 0.7rem;
          color: var(--gray-600);
          font-weight: 500;
          margin-top: 0px;
        }

        /* Specs estilo fila con divisor */
        .camper-card__specs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: 20px;
          row-gap: 0;
          padding-top: var(--space-1);
        }
        .camper-card__spec {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--gray-800);
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          padding: 10px 0;
          min-width: 0;
        }
        .camper-card__spec--wide {
          grid-column: 1 / -1;
        }
        .camper-card__spec span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .camper-card__spec--wide span {
          white-space: normal;
        }
        :global(.camper-card__spec-icon) {
          color: #d4a742;
          flex-shrink: 0;
        }

        /* CTA Button */
        .camper-card__btn {
          width: 100%;
          margin-top: auto;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: var(--radius-full);
          font-weight: 600;
          font-size: 0.9rem;
          background: var(--forest-green);
          color: #FBF9F5;
          box-shadow: 0 2px 8px rgba(24, 36, 27, 0.12);
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease, box-shadow 160ms ease;
        }
        .camper-card__btn:hover {
          background: var(--forest-green-light);
          box-shadow: 0 4px 16px rgba(24, 36, 27, 0.2);
        }
        .camper-card__btn:hover .camper-card__btn-arrow {
          transform: translateX(3px);
        }
        .camper-card__btn-arrow {
          transition: transform 180ms ease-out;
        }
        .camper-card__btn:active {
          transform: scale(0.97);
        }
        .btn--disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        /* Dark Theme Variant */
        .camper-card--dark {
          background: #131518;
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
        }
        .camper-card--dark:hover {
          border-color: rgba(204, 160, 83, 0.4);
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.7);
        }
        .camper-card--dark .camper-card__body {
          background: #131518;
        }
        .camper-card--dark .camper-card__name {
          color: #FFFFFF;
        }
        .camper-card--dark .camper-card__tagline {
          color: #94A3B8;
        }
        .camper-card--dark .camper-card__desc {
          color: #94A3B8;
        }
        .camper-card--dark .camper-card__price {
          background: rgba(204, 160, 83, 0.1);
          border: 1px solid rgba(204, 160, 83, 0.3);
        }
        .camper-card--dark .camper-card__price-from {
          color: #94A3B8;
        }
        .camper-card--dark .camper-card__price-amount {
          color: #CCA053;
        }
        .camper-card--dark .camper-card__price-label {
          color: #94A3B8;
        }

        .camper-card--dark .camper-card__spec {
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.88);
        }
        .camper-card--dark :global(.camper-card__spec-icon) {
          color: #d4a742;
        }
        .camper-card--dark .camper-card__btn {
          background: linear-gradient(135deg, #CCA053 0%, #B2883B 100%);
          color: #0B0C0E;
          font-weight: 700;
          box-shadow: 0 4px 16px rgba(204, 160, 83, 0.3);
        }
        .camper-card--dark .camper-card__btn:hover {
          box-shadow: 0 6px 22px rgba(204, 160, 83, 0.45);
          filter: brightness(1.05);
        }
        .camper-card--dark .camper-card__nav-arrow {
          background: rgba(19, 21, 24, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
        }
        .camper-card--dark .camper-card__nav-arrow:hover {
          border-color: #CCA053;
          color: #CCA053;
          background: #16191E;
        }
        .camper-card--dark .camper-card__dot {
          background: rgba(255, 255, 255, 0.3);
        }
        .camper-card--dark .camper-card__dot--active {
          background: #CCA053;
        }

        @media (max-width: 640px) {
          .camper-card__body {
            padding: var(--space-5);
            gap: var(--space-3);
          }
          .camper-card__name {
            font-size: 1.6rem;
          }
          .camper-card__tagline {
            max-width: 100%;
          }
          .camper-card__specs {
            grid-template-columns: 1fr;
          }
          .camper-card__video-hint {
            display: none;
          }
        }
      `}</style>
    </article>
  )
}
