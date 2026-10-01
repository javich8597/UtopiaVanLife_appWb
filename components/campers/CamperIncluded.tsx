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
            <span className="included-check">
              <Check size={14} />
            </span>
            <span>{item}</span>
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
          gap: 10px;
        }
        .included-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.5;
        }
        .included-check {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: rgba(230, 202, 101, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #e6ca65;
          margin-top: 1px;
        }

        @media (max-width: 640px) {
          .included-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  )
}
