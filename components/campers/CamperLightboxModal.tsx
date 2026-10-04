'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface LightboxImage {
  src: string
  tag: string
}

interface Props {
  isOpen: boolean
  images: LightboxImage[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function CamperLightboxModal({
  isOpen,
  images,
  currentIndex,
  onClose,
  onNavigate
}: Props) {
  const currentItem = images[currentIndex] || images[0]

  const handlePrev = useCallback(() => {
    onNavigate((currentIndex - 1 + images.length) % images.length)
  }, [currentIndex, images.length, onNavigate])

  const handleNext = useCallback(() => {
    onNavigate((currentIndex + 1) % images.length)
  }, [currentIndex, images.length, onNavigate])

  useEffect(() => {
    if (!isOpen) return

    // Lock body scroll per AGENTS.md rule
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, handlePrev, handleNext])

  if (!isOpen || !currentItem) return null

  return (
    <div className="camper-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="Visor de fotos en alta resolución">
      {/* Top Header */}
      <div className="lightbox-header">
        <div className="lightbox-meta">
          <span className="lightbox-counter">{currentIndex + 1} / {images.length}</span>
          <span className="lightbox-divider">|</span>
          <span className="lightbox-caption">{currentItem.tag}</span>
        </div>

        <button
          onClick={onClose}
          className="lightbox-close-btn"
          aria-label="Cerrar visor"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main View Area */}
      <div className="lightbox-stage">
        <button
          onClick={handlePrev}
          className="lightbox-nav-btn lightbox-nav-btn--prev"
          aria-label="Foto anterior"
        >
          <ChevronLeft size={28} />
        </button>

        <div className="lightbox-image-container">
          <Image
            src={currentItem.src}
            alt={currentItem.tag}
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            className="lightbox-img"
            priority
          />
        </div>

        <button
          onClick={handleNext}
          className="lightbox-nav-btn lightbox-nav-btn--next"
          aria-label="Foto siguiente"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* Bottom Thumbnail Strip */}
      <div className="lightbox-thumbnails">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => onNavigate(idx)}
            className={`thumb-btn ${idx === currentIndex ? 'thumb-btn--active' : ''}`}
            aria-label={`Ir a foto ${idx + 1}`}
          >
            <img src={img.src} alt="" className="thumb-img" />
          </button>
        ))}
      </div>

      <style jsx>{`
        .camper-lightbox-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(8, 9, 11, 0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px 24px;
        }
        .lightbox-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
        }
        .lightbox-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lightbox-counter {
          font-family: monospace;
          font-size: 13px;
          font-weight: 700;
          color: #e6ca65;
          letter-spacing: 0.1em;
        }
        .lightbox-divider {
          color: rgba(255, 255, 255, 0.2);
        }
        .lightbox-caption {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 500;
        }
        .lightbox-close-btn {
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lightbox-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .lightbox-stage {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 0;
          overflow: hidden;
        }
        .lightbox-image-container {
          position: relative;
          width: 100%;
          max-width: 1100px;
          height: calc(100vh - 200px);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
        }
        :global(.lightbox-img) {
          object-fit: contain;
        }
        .lightbox-nav-btn {
          position: absolute;
          z-index: 10;
          width: 48px;
          height: 48px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lightbox-nav-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.08);
        }
        .lightbox-nav-btn--prev {
          left: 16px;
        }
        .lightbox-nav-btn--next {
          right: 16px;
        }
        .lightbox-thumbnails {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          overflow-x: auto;
          padding: 8px 0;
          z-index: 10;
        }
        .thumb-btn {
          width: 56px;
          height: 40px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid transparent;
          background: #000;
          cursor: pointer;
          opacity: 0.45;
          transition: all 0.2s ease;
          flex-shrink: 0;
          padding: 0;
        }
        .thumb-btn:hover {
          opacity: 0.85;
        }
        .thumb-btn--active {
          opacity: 1;
          border-color: #e6ca65;
          transform: scale(1.06);
        }
        .thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        @media (max-width: 640px) {
          .camper-lightbox-backdrop {
            padding: 12px 14px;
          }
          .lightbox-counter {
            font-size: 11px;
          }
          .lightbox-caption {
            font-size: 11px;
            max-width: 200px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .lightbox-image-container {
            height: calc(100vh - 160px);
            border-radius: 12px;
          }
          .lightbox-nav-btn {
            width: 38px;
            height: 38px;
          }
          .lightbox-nav-btn--prev { left: 8px; }
          .lightbox-nav-btn--next { right: 8px; }
          .thumb-btn {
            width: 44px;
            height: 32px;
          }
        }
      `}</style>
    </div>
  )
}
