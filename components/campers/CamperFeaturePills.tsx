// components/campers/CamperFeaturePills.tsx
'use client'

import { Users, BedDouble, Droplets, Zap } from 'lucide-react'

interface PillData {
  icon: 'users' | 'bed' | 'droplets' | 'zap'
  label: string
}

interface Props {
  pills: PillData[]
}

const ICON_MAP = {
  users: Users,
  bed: BedDouble,
  droplets: Droplets,
  zap: Zap,
}

export default function CamperFeaturePills({ pills }: Props) {
  return (
    <div className="feature-pills-row">
      {pills.map((pill, i) => {
        const Icon = ICON_MAP[pill.icon]
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
