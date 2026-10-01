// components/campers/CamperDescription.tsx
'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  paragraphs: string[]
  inlineImage?: { src: string; alt: string }
  visibleCount?: number
}

export default function CamperDescription({ paragraphs, inlineImage, visibleCount = 3 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const needsExpand = paragraphs.length > visibleCount
  const visible = expanded ? paragraphs : paragraphs.slice(0, visibleCount)

  return (
    <section className="description-section">
      <div className="section-divider-row">
        <h3 className="section-divider-title">DESCRIPCIÓN</h3>
        <div className="section-divider-line" />
      </div>

      <div className="description-body">
        {visible.map((p, i) => (
          <p key={i} className="description-paragraph">{p}</p>
        ))}
        {!expanded && needsExpand && (
          <div className="description-fade" />
        )}
      </div>

      {needsExpand && (
        <button
          className="expand-toggle-btn"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Leer menos' : 'Leer más'}</span>
          <ChevronDown size={16} className={`expand-chevron ${expanded ? 'expanded' : ''}`} />
        </button>
      )}

      {expanded && inlineImage && (
        <figure className="description-inline-figure">
          <img src={inlineImage.src} alt={inlineImage.alt} className="description-inline-img" loading="lazy" />
        </figure>
      )}

      <style jsx>{`
        .description-section {
          margin-bottom: 48px;
          position: relative;
        }
        .section-divider-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }
        .section-divider-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
          white-space: nowrap;
          margin: 0;
        }
        .section-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(230, 202, 101, 0.3), rgba(255, 255, 255, 0.06));
          border-radius: 1px;
        }
        .description-body {
          position: relative;
        }
        .description-paragraph {
          font-size: 15px;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 14px 0;
        }
        .description-fade {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: linear-gradient(transparent, #0b0c0e);
          pointer-events: none;
        }
        .expand-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #e6ca65;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          padding: 8px 0;
          transition: opacity 0.2s;
        }
        .expand-toggle-btn:hover {
          opacity: 0.8;
        }
        :global(.expand-chevron) {
          transition: transform 0.3s ease;
        }
        :global(.expand-chevron.expanded) {
          transform: rotate(180deg);
        }
        .description-inline-figure {
          margin: 28px 0 0;
          border-radius: 20px;
          overflow: hidden;
        }
        .description-inline-img {
          width: 100%;
          display: block;
          border-radius: 20px;
        }

        @media (max-width: 640px) {
          .description-paragraph {
            font-size: 14px;
          }
          .description-inline-figure {
            border-radius: 16px;
          }
          .description-inline-img {
            border-radius: 16px;
          }
        }
      `}</style>
    </section>
  )
}
