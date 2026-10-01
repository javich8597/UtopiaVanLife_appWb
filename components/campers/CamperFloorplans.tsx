// components/campers/CamperFloorplans.tsx
'use client'

import { Sun, Moon } from 'lucide-react'

interface Props {
  dayImage: string
  nightImage: string
}

export default function CamperFloorplans({ dayImage, nightImage }: Props) {
  return (
    <section className="floorplans-section">
      <div className="section-divider-row">
        <h3 className="section-divider-title">CONFIGURACIÓN</h3>
        <div className="section-divider-line" />
      </div>

      <div className="floorplans-grid">
        <div className="floorplan-card">
          <div className="floorplan-label">
            <Sun size={14} />
            <span>Día</span>
          </div>
          <img src={dayImage} alt="Configuración de día" className="floorplan-img" loading="lazy" />
        </div>
        <div className="floorplan-card">
          <div className="floorplan-label">
            <Moon size={14} />
            <span>Noche</span>
          </div>
          <img src={nightImage} alt="Configuración de noche" className="floorplan-img" loading="lazy" />
        </div>
      </div>

      <style jsx>{`
        .floorplans-section {
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
        .floorplans-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .floorplan-card {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: border-color 0.25s ease;
        }
        .floorplan-card:hover {
          border-color: rgba(230, 202, 101, 0.2);
        }
        .floorplan-label {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 8px;
          background: rgba(11, 12, 14, 0.85);
          backdrop-filter: blur(8px);
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
        }
        .floorplan-img {
          width: 100%;
          display: block;
          aspect-ratio: 16 / 10;
          object-fit: contain;
          background: #131518;
        }

        @media (max-width: 640px) {
          .floorplans-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>
    </section>
  )
}
