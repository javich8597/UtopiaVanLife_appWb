// components/campers/CamperGalleryGrid.tsx
'use client'

import { LightboxImage } from './CamperLightboxModal'

interface Props {
  images: LightboxImage[]
  onOpenLightbox: (index: number) => void
}

export default function CamperGalleryGrid({ images, onOpenLightbox }: Props) {
  const hero = images[0]
  const side1 = images[1]
  const side2 = images[2]
  const totalCount = images.length

  return (
    <section className="gallery-grid-section" aria-label="Galería de fotos">
      <div className="gallery-grid">
        <button
          className="gallery-hero-cell"
          onClick={() => onOpenLightbox(0)}
          aria-label={hero?.tag || 'Vista principal'}
        >
          <img src={hero?.src} alt={hero?.tag || ''} className="gallery-img" loading="eager" />
        </button>
        <button
          className="gallery-side-cell"
          onClick={() => onOpenLightbox(1)}
          aria-label={side1?.tag || 'Detalle'}
        >
          <img src={side1?.src} alt={side1?.tag || ''} className="gallery-img" loading="lazy" />
        </button>
        <button
          className="gallery-side-cell gallery-side-last"
          onClick={() => onOpenLightbox(2)}
          aria-label={side2?.tag || 'Detalle'}
        >
          <img src={side2?.src} alt={side2?.tag || ''} className="gallery-img" loading="lazy" />
          <div className="gallery-count-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            <span>Ver las {totalCount} fotos</span>
          </div>
        </button>
      </div>

      <style jsx>{`
        .gallery-grid-section {
          margin-bottom: 40px;
        }
        .gallery-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 8px;
          border-radius: 20px;
          overflow: hidden;
          aspect-ratio: 2 / 1;
        }
        .gallery-hero-cell {
          grid-row: 1 / 3;
          position: relative;
          cursor: zoom-in;
          background: #131518;
          border: none;
          padding: 0;
          overflow: hidden;
        }
        .gallery-side-cell {
          position: relative;
          cursor: zoom-in;
          background: #131518;
          border: none;
          padding: 0;
          overflow: hidden;
        }
        .gallery-side-last {
          position: relative;
        }
        .gallery-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .gallery-hero-cell:hover .gallery-img,
        .gallery-side-cell:hover .gallery-img {
          transform: scale(1.03);
        }
        .gallery-count-badge {
          position: absolute;
          bottom: 16px;
          right: 16px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 9999px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(12px);
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          pointer-events: none;
        }

        @media (max-width: 640px) {
          .gallery-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto auto;
            aspect-ratio: auto;
            border-radius: 16px;
          }
          .gallery-hero-cell {
            grid-column: 1 / 3;
            grid-row: auto;
            aspect-ratio: 16 / 9;
          }
          .gallery-side-cell {
            aspect-ratio: 4 / 3;
          }
        }
      `}</style>
    </section>
  )
}
