// components/campers/CamperFeaturePills.tsx
'use client'

import { Users, BedDouble, Droplets, Zap, Sun, Shield, Wind, Snowflake, Utensils, BatteryCharging, Ruler } from 'lucide-react'

interface PillData {
  icon: string
  label: string
}

interface Props {
  pills: PillData[]
}

const ICON_MAP: Record<string, any> = {
  users: Users,
  bed: BedDouble,
  droplets: Droplets,
  zap: Zap,
  sun: Sun,
  shield: Shield,
  wind: Wind,
  snowflake: Snowflake,
  utensils: Utensils,
  battery: BatteryCharging,
  ruler: Ruler,
}

export default function CamperFeaturePills({ pills }: Props) {
  return (
    <div className="feature-pills-row">
      {pills.map((pill, i) => {
        const Icon = ICON_MAP[pill.icon] || Zap
        return (
          <span key={i} className="feature-pill">
            <Icon size={14} className="pill-icon-gold" />
            <span>{pill.label}</span>
          </span>
        )
      })}

      <style jsx>{`
        .feature-pills-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 20px;
        }
        .feature-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          white-space: nowrap;
          transition: border-color 0.25s ease;
        }
        .feature-pill:hover {
          border-color: rgba(230, 202, 101, 0.3);
        }
        :global(.pill-icon-gold) {
          color: #e6ca65;
        }

        :global(html[data-theme="light"]) .feature-pill {
          background: #FAFAF7;
          border-color: rgba(26, 23, 20, 0.14);
          color: #1F1B17;
          box-shadow: 0 1px 4px rgba(26, 23, 20, 0.04);
        }
        :global(html[data-theme="light"]) .feature-pill:hover {
          border-color: rgba(150, 122, 34, 0.45);
          background: #F4EFE4;
        }
        :global(html[data-theme="light"] .pill-icon-gold) {
          color: #82681A;
        }

        @media (max-width: 640px) {
          .feature-pills-row {
            gap: 6px;
          }
          .feature-pill {
            font-size: 11px;
            padding: 5px 10px;
          }
        }
      `}</style>
    </div>
  )
}
