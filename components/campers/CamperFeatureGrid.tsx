// components/campers/CamperFeatureGrid.tsx
'use client'

import { useState } from 'react'
import {
  Zap, Droplets, Sun, Shield, Utensils,
  Wifi, Battery, ThermometerSun, Wind, Tv,
  Bed, Plug, Gauge, Snowflake, FolderOpen,
  ChevronDown
} from 'lucide-react'

export interface FeatureItem {
  icon: string
  label: string
  value: string
}

interface Props {
  features: FeatureItem[]
  initialVisible?: number
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
}

export default function CamperFeatureGrid({ features, initialVisible = 8 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? features : features.slice(0, initialVisible)
  const needsExpand = features.length > initialVisible

  return (
    <section className="feature-grid-section">
      <div className="section-divider-row">
        <h3 className="section-divider-title">CARACTERÍSTICAS</h3>
        <div className="section-divider-line" />
      </div>

      <div className="feature-grid">
        {visible.map((f, i) => {
          const Icon = ICON_MAP[f.icon] || Zap
          return (
            <div key={i} className="feature-card">
              <div className="feature-icon-box">
                <Icon size={18} />
              </div>
              <div className="feature-text">
                <span className="feature-label">{f.label}</span>
                <span className="feature-value">{f.value}</span>
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
          gap: 10px;
        }
        .feature-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .feature-card:hover {
          border-color: rgba(230, 202, 101, 0.25);
          box-shadow: 0 0 20px -5px rgba(230, 202, 101, 0.1);
        }
        .feature-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(230, 202, 101, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #e6ca65;
          transition: transform 0.25s ease;
        }
        .feature-card:hover .feature-icon-box {
          transform: scale(1.08);
        }
        .feature-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .feature-label {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.3;
        }
        .feature-value {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          line-height: 1.3;
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

        @media (max-width: 860px) {
          .feature-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 640px) {
          .feature-grid {
            grid-template-columns: 1fr;
          }
          .feature-card {
            padding: 12px 14px;
          }
        }
      `}</style>
    </section>
  )
}
