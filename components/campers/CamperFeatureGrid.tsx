// components/campers/CamperFeatureGrid.tsx
'use client'

import { useState } from 'react'
import {
  Zap, Droplets, Sun, Shield, Utensils,
  Wifi, Battery, ThermometerSun, Wind, Tv,
  Bed, Plug, Gauge, Snowflake, FolderOpen,
  Users, Ruler, ChevronDown
} from 'lucide-react'

export interface FeatureItem {
  icon: string
  label: string
  value: string
}

interface Props {
  features: FeatureItem[]
  initialVisible?: number
  title?: string
}

const ICON_MAP: Record<string, any> = {
  zap: Zap,
  droplets: Droplets,
  sun: Sun,
  shield: Shield,
  utensils: Utensils,
  wifi: Wifi,
  battery: Battery,
  thermometer: ThermometerSun,
  wind: Wind,
  tv: Tv,
  bed: Bed,
  plug: Plug,
  gauge: Gauge,
  snowflake: Snowflake,
  folder: FolderOpen,
  users: Users,
  ruler: Ruler,
}

export default function CamperFeatureGrid({ features, initialVisible = 8, title = 'CARACTERÍSTICAS' }: Props) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? features : features.slice(0, initialVisible)
  const needsExpand = features.length > initialVisible

  return (
    <section className="feature-grid-section">
      <div className="section-divider-row">
        <h3 className="section-divider-title">{title}</h3>
        <div className="section-divider-line" />
      </div>

      <div className="feature-grid">
        {visible.map((f, i) => {
          const Icon = ICON_MAP[f.icon] || Zap
          return (
            <div key={i} className="feature-row">
              <Icon size={18} strokeWidth={1.8} className="feature-row-icon" />
              <div className="feature-text">
                <span className="feature-label">{f.label}</span>
                {f.value && <span className="feature-value">{f.value}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {needsExpand && (
        <div className="feature-expand-wrap">
          <button
            className="feature-expand-btn"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Ocultar características' : `Ver las ${features.length} características`}</span>
            <ChevronDown size={16} className={`feat-chevron ${expanded ? 'rotated' : ''}`} />
          </button>
        </div>
      )}

      <style jsx>{`
        .feature-grid-section {
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
        .feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 36px;
          row-gap: 0;
        }
        .feature-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          min-width: 0;
          transition: border-color 0.2s ease;
        }
        :global(.feature-row-icon) {
          color: #d4a742;
          flex-shrink: 0;
        }
        .feature-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .feature-label {
          font-size: 13.5px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.35;
        }
        .feature-value {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          line-height: 1.35;
        }
        .feature-expand-wrap {
          display: flex;
          justify-content: center;
          margin-top: 16px;
        }
        .feature-expand-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 9999px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .feature-expand-btn:hover {
          border-color: rgba(230, 202, 101, 0.4);
          color: #e6ca65;
        }
        :global(.feat-chevron) {
          transition: transform 0.3s ease;
        }
        :global(.feat-chevron.rotated) {
          transform: rotate(180deg);
        }

        :global(html[data-theme="light"]) .section-divider-title {
          color: #5C554C;
        }
        :global(html[data-theme="light"]) .section-divider-line {
          background: linear-gradient(90deg, rgba(150, 122, 34, 0.38), rgba(26, 23, 20, 0.08));
        }
        :global(html[data-theme="light"]) .feature-row {
          border-bottom-color: rgba(26, 23, 20, 0.1);
        }
        :global(html[data-theme="light"]) :global(.feature-row-icon) {
          color: #b38827;
        }
        :global(html[data-theme="light"]) .feature-label {
          color: #1A1714;
        }
        :global(html[data-theme="light"]) .feature-value {
          color: #5C554C;
        }
        :global(html[data-theme="light"]) .feature-expand-btn {
          background: #FAFAF7;
          border-color: rgba(26, 23, 20, 0.18);
          color: #1F1B17;
        }
        :global(html[data-theme="light"]) .feature-expand-btn:hover {
          background: #F3EFE7;
          border-color: rgba(150, 122, 34, 0.45);
          color: #6B5514;
        }

        @media (max-width: 860px) {
          .feature-grid {
            grid-template-columns: 1fr 1fr;
            column-gap: 20px;
          }
        }
        @media (max-width: 640px) {
          .feature-grid {
            grid-template-columns: 1fr;
          }
          .feature-row {
            padding: 12px 0;
          }
        }
      `}</style>
    </section>
  )
}
