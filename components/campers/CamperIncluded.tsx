// components/campers/CamperIncluded.tsx
'use client'

import { Check } from 'lucide-react'

interface Props {
  items: string[]
}

export default function CamperIncluded({ items }: Props) {
  return (
    <section className="included-section">
      <div className="section-divider-row">
        <h3 className="section-divider-title">QUÉ INCLUYE TU ALQUILER</h3>
        <div className="section-divider-line" />
      </div>

      <ul className="included-list">
        {items.map((item, i) => (
          <li key={i} className="included-item">
            <Check size={18} strokeWidth={2.2} className="included-check-icon" />
            <span className="included-text">{item}</span>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .included-section {
          margin-bottom: 48px;
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
        .included-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 36px;
          row-gap: 0;
        }
        .included-item {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 13.5px;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.45;
          padding: 14px 0;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0;
        }
        :global(.included-check-icon) {
          color: #d4a742;
          flex-shrink: 0;
        }
        .included-text {
          flex: 1;
        }

        :global(html[data-theme="light"]) .section-divider-title {
          color: #5C554C;
        }
        :global(html[data-theme="light"]) .section-divider-line {
          background: linear-gradient(90deg, rgba(150, 122, 34, 0.38), rgba(26, 23, 20, 0.08));
        }
        :global(html[data-theme="light"]) .included-item {
          background: transparent;
          border-bottom-color: rgba(26, 23, 20, 0.1);
          color: #1A1714;
          box-shadow: none;
        }
        :global(html[data-theme="light"]) :global(.included-check-icon) {
          color: #b38827;
        }

        @media (max-width: 860px) {
          .included-list {
            grid-template-columns: 1fr 1fr;
            column-gap: 20px;
          }
        }
        @media (max-width: 640px) {
          .included-list {
            grid-template-columns: 1fr;
          }
          .included-item {
            padding: 12px 0;
          }
        }
      `}</style>
    </section>
  )
}
