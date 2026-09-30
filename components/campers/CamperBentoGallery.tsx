'use client'

import Image from 'next/image'
import { Maximize2, ZoomIn } from 'lucide-react'
import { LightboxImage } from './CamperLightboxModal'

interface Props {
  images: LightboxImage[]
  onOpenLightbox: (index: number) => void
}

export default function CamperBentoGallery({ images, onOpenLightbox }: Props) {
  if (!images || images.length === 0) return null

  return (
    <section className="bento-gallery-section" aria-label="Galería interactiva de la camper">
      <div className="bento-gallery-header">
        <div className="gallery-title-wrapper">
          <span className="gold-accent-dot" />
          <h2 className="gallery-section-title">Galería de Arquitectura & Espacio</h2>
        </div>

        <button
          onClick={() => onOpenLightbox(0)}
          className="fullscreen-trigger-btn"
          aria-label="Abrir galería a pantalla completa"
        >
          <Maximize2 size={15} />
          <span>Ver pantalla completa (Lightbox)</span>
        </button>
      </div>

      <div className="bento-grid-container">
        {/* Card 0: Large Feature Card */}
        {images[0] && (
          <div
            onClick={() => onOpenLightbox(0)}
            className="bento-card bento-card--feature"
            role="button"
            tabIndex={0}
            aria-label={`Ver foto: ${images[0].tag}`}
            onKeyDown={(e) => e.key === 'Enter' && onOpenLightbox(0)}
          >
            <div className="image-wrap">
              <Image
                src={images[0].src}
                alt={images[0].tag}
                fill
                sizes="(max-width: 860px) 100vw, 65vw"
                className="bento-img"
                priority
              />
            </div>
            <div className="card-gradient-overlay" />
            <div className="card-footer">
              <span className="glass-pill-badge">{images[0].tag}</span>
              <div className="zoom-circle-indicator">
                <ZoomIn size={16} />
              </div>
            </div>
          </div>
        )}

        {/* Card 1: Top Right */}
        {images[1] && (
          <div
            onClick={() => onOpenLightbox(1)}
            className="bento-card bento-card--top-right"
            role="button"
            tabIndex={0}
            aria-label={`Ver foto: ${images[1].tag}`}
            onKeyDown={(e) => e.key === 'Enter' && onOpenLightbox(1)}
          >
            <div className="image-wrap">
              <Image
                src={images[1].src}
                alt={images[1].tag}
                fill
                sizes="(max-width: 860px) 100vw, 35vw"
                className="bento-img"
              />
            </div>
            <div className="card-gradient-overlay" />
            <div className="card-footer">
              <span className="glass-pill-badge">{images[1].tag}</span>
            </div>
          </div>
        )}

        {/* Card 2: Mid Right */}
        {images[2] && (
          <div
            onClick={() => onOpenLightbox(2)}
            className="bento-card bento-card--mid-right"
            role="button"
            tabIndex={0}
            aria-label={`Ver foto: ${images[2].tag}`}
            onKeyDown={(e) => e.key === 'Enter' && onOpenLightbox(2)}
          >
            <div className="image-wrap">
              <Image
                src={images[2].src}
                alt={images[2].tag}
                fill
                sizes="(max-width: 860px) 100vw, 35vw"
                className="bento-img"
              />
            </div>
            <div className="card-gradient-overlay" />
            <div className="card-footer">
              <span className="glass-pill-badge">{images[2].tag}</span>
            </div>
          </div>
        )}

        {/* Card 3: Bottom Left */}
        {images[3] && (
          <div
            onClick={() => onOpenLightbox(3)}
            className="bento-card bento-card--bottom-left"
            role="button"
            tabIndex={0}
            aria-label={`Ver foto: ${images[3].tag}`}
            onKeyDown={(e) => e.key === 'Enter' && onOpenLightbox(3)}
          >
            <div className="image-wrap">
              <Image
                src={images[3].src}
                alt={images[3].tag}
                fill
                sizes="(max-width: 860px) 100vw, 40vw"
                className="bento-img"
              />
            </div>
            <div className="card-gradient-overlay" />
            <div className="card-footer">
              <span className="glass-pill-badge">{images[3].tag}</span>
            </div>
          </div>
        )}

        {/* Card 4: Bottom Center */}
        {images[4] && (
          <div
            onClick={() => onOpenLightbox(4)}
            className="bento-card bento-card--bottom-center"
            role="button"
            tabIndex={0}
            aria-label={`Ver foto: ${images[4].tag}`}
            onKeyDown={(e) => e.key === 'Enter' && onOpenLightbox(4)}
          >
            <div className="image-wrap">
              <Image
                src={images[4].src}
                alt={images[4].tag}
                fill
                sizes="(max-width: 860px) 100vw, 25vw"
                className="bento-img"
              />
            </div>
            <div className="card-gradient-overlay" />
            <div className="card-footer">
              <span className="glass-pill-badge">{images[4].tag}</span>
            </div>
          </div>
        )}

        {/* Card 5: Bottom Right */}
        {images[5] && (
          <div
            onClick={() => onOpenLightbox(5)}
            className="bento-card bento-card--bottom-right"
            role="button"
            tabIndex={0}
            aria-label={`Ver foto: ${images[5].tag}`}
            onKeyDown={(e) => e.key === 'Enter' && onOpenLightbox(5)}
          >
            <div className="image-wrap">
              <Image
                src={images[5].src}
                alt={images[5].tag}
                fill
                sizes="(max-width: 860px) 100vw, 35vw"
                className="bento-img"
              />
            </div>
            <div className="card-gradient-overlay" />
            <div className="card-footer">
              <span className="glass-pill-badge">{images[5].tag}</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .bento-gallery-section {
          width: 100%;
          margin-bottom: 48px;
        }
        .bento-gallery-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .gallery-title-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .gold-accent-dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #e6ca65;
          display: inline-block;
        }
        .gallery-section-title {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }
        .fullscreen-trigger-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #e6ca65;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .fullscreen-trigger-btn:hover {
          text-decoration: underline;
          color: #f7df8b;
        }
        .bento-grid-container {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          grid-template-rows: repeat(12, 48px);
          gap: 16px;
        }
        .bento-card {
          position: relative;
          background: #131518;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.4s ease;
        }
        .bento-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.8);
          border-color: rgba(230, 202, 101, 0.35);
        }
        .image-wrap {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        :global(.bento-img) {
          object-fit: cover;
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bento-card:hover :global(.bento-img) {
          transform: scale(1.04);
        }
        .card-gradient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.1) 40%, transparent 100%);
          pointer-events: none;
        }
        .card-footer {
          position: absolute;
          bottom: 16px;
          left: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 2;
          pointer-events: none;
        }
        .glass-pill-badge {
          display: inline-block;
          background: rgba(11, 12, 14, 0.78);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 85%;
        }
        .zoom-circle-indicator {
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          opacity: 0;
          transition: opacity 0.25s ease;
        }
        .bento-card:hover .zoom-circle-indicator {
          opacity: 1;
        }

        /* Bento Grid Placement (12x12 grid) */
        .bento-card--feature {
          grid-column: span 7;
          grid-row: span 7;
        }
        .bento-card--top-right {
          grid-column: span 5;
          grid-row: span 4;
        }
        .bento-card--mid-right {
          grid-column: span 5;
          grid-row: span 3;
        }
        .bento-card--bottom-left {
          grid-column: span 5;
          grid-row: span 5;
        }
        .bento-card--bottom-center {
          grid-column: span 3;
          grid-row: span 5;
        }
        .bento-card--bottom-right {
          grid-column: span 4;
          grid-row: span 5;
        }

        /* Responsive Breakpoints per AGENTS.md */
        @media (max-width: 860px) {
          .bento-grid-container {
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: auto;
            gap: 12px;
          }
          .bento-card--feature {
            grid-column: span 2;
            height: 280px;
          }
          .bento-card--top-right,
          .bento-card--mid-right,
          .bento-card--bottom-left,
          .bento-card--bottom-center,
          .bento-card--bottom-right {
            grid-column: span 1;
            height: 200px;
          }
        }

        @media (max-width: 640px) {
          .bento-gallery-section {
            margin-bottom: 32px;
          }
          .bento-grid-container {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .bento-card {
            border-radius: 18px;
          }
          .bento-card--feature {
            grid-column: span 1;
            height: 240px;
          }
          .bento-card--top-right,
          .bento-card--mid-right,
          .bento-card--bottom-left,
          .bento-card--bottom-center,
          .bento-card--bottom-right {
            grid-column: span 1;
            height: 180px;
          }
          .glass-pill-badge {
            font-size: 10px;
            padding: 4px 10px;
          }
        }
      `}</style>
    </section>
  )
}
