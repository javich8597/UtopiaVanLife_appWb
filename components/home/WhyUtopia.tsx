'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Sparkles, Shield, Compass, Zap, Layers, HeartHandshake, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface FeatureCardData {
  id: string
  title: string
  tag: string
  desc: string
  image: string
  icon: any
}

const BRAND_PILLARS: FeatureCardData[] = [
  {
    id: 'craftsmanship',
    title: 'Artesanía y Acabados Nobles',
    tag: 'Ebanistería a Medida',
    desc: 'Maderas macizas tratadas contra humedad, cantos redondeados y ajustes de precisión aeronáutica para un rodar 100% silencioso.',
    image: '/images/brand/feature-craftsmanship-quality.jpg',
    icon: Sparkles
  },
  {
    id: 'design',
    title: 'Filosofía de Diseño Minimalista',
    tag: 'Estética & Calidez',
    desc: 'Líneas depuradas, tonos orgánicos e iluminación ambiental LED cálida que convierten el habitáculo en un refugio de calma.',
    image: '/images/brand/feature-design-philosophy.jpg',
    icon: Compass
  },
  {
    id: 'innovation',
    title: 'Innovación & Autonomía Off-Grid',
    tag: '540Ah Litio Victron',
    desc: 'Sistemas eléctricos de última generación con baterías inteligentes Victron, placas solares de 400W e inversores a 230V.',
    image: '/images/brand/feature-innovation-technology.jpg',
    icon: Zap
  },
  {
    id: 'modular',
    title: 'Modularidad & Espacio Dinámico',
    tag: 'Open Concept 7m²',
    desc: 'Soluciones que se transforman entre modo viaje, comedor y descanso en segundos sin sacrificar capacidad de maletero ni confort.',
    image: '/images/brand/feature-modular-functionality.jpg',
    icon: Layers
  },
  {
    id: 'warranty',
    title: 'Garantía & Asistencia Continua',
    tag: 'Soporte 24/7 en Ruta',
    desc: 'Flota propia rigurosamente inspeccionada pre-entrega, seguro a todo riesgo incluido y atención telefónica directa durante tu viaje.',
    image: '/images/brand/feature-warranty-reliability.jpg',
    icon: Shield
  }
]

function SpotlightCard({ card }: { card: FeatureCardData }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseLeave = () => {
    setMousePos(null)
  }

  const Icon = card.icon

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="spotlight-card"
    >
      {/* Dynamic spotlight gradient */}
      {mousePos && (
        <div
          className="spotlight-layer"
          style={{
            background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, rgba(229, 192, 123, 0.15), transparent 70%)`
          }}
        />
      )}

      {/* Image container */}
      <div className="card-image-wrap">
        <Image
          src={card.image}
          alt={card.title}
          fill
          className="object-cover card-img"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
        />
        <div className="card-img-overlay" />
        <span className="card-tag">{card.tag}</span>
      </div>

      {/* Card Content */}
      <div className="card-body">
        <div className="card-icon-wrap">
          <Icon size={18} className="card-icon" />
        </div>
        <h3 className="card-title">{card.title}</h3>
        <p className="card-desc">{card.desc}</p>
      </div>

      <style jsx>{`
        .spotlight-card {
          position: relative;
          background: #14171D;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xl, 20px);
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          cursor: default;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .spotlight-card:hover {
          border-color: rgba(229, 192, 123, 0.35);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(229, 192, 123, 0.15);
        }
        .spotlight-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
        }
        .card-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          background: #000;
          overflow: hidden;
        }
        :global(.card-img) {
          transition: transform 0.5s ease;
        }
        .spotlight-card:hover :global(.card-img) {
          transform: scale(1.05);
        }
        .card-img-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, #14171D 0%, rgba(20, 23, 29, 0.3) 50%, transparent 100%);
          z-index: 1;
        }
        .card-tag {
          position: absolute;
          top: 14px;
          left: 14px;
          background: rgba(11, 13, 17, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(229, 192, 123, 0.3);
          color: #E5C07B;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          z-index: 2;
        }
        .card-body {
          position: relative;
          z-index: 3;
          padding: var(--space-5) var(--space-6) var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          flex: 1;
        }
        .card-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(229, 192, 123, 0.12);
          border: 1px solid rgba(229, 192, 123, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }
        :global(.card-icon) {
          color: #E5C07B;
        }
        .card-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: white;
          letter-spacing: -0.01em;
          line-height: 1.3;
          margin: 0;
        }
        .card-desc {
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.68);
          line-height: 1.6;
          margin: 0;
        }
      `}</style>
    </motion.div>
  )
}

export default function WhyUtopia() {
  const t = useTranslations('HomePage.WhyUtopia')

  return (
    <section className="craftsmanship-section" id="ingenieria">
      <div className="container">
        
        {/* Editorial Section Header */}
        <div className="section-header">
          <div>
            <div className="eyebrow-pill">
              <Sparkles size={12} className="text-gold" />
              <span>INGENIERÍA & ARTESANÍA NÓMADA</span>
            </div>
            <h2 className="section-title">
              Construidas con precisión.<br />
              <em className="text-gold italic">Pensadas para la libertad.</em>
            </h2>
          </div>
          <p className="section-subtitle">
            Cada camper de Utopia Van Life se diseña y ensambla siguiendo los estándares más exigentes de náutica y automoción. Materiales puros, acabados silenciosos y energía inagotable para tu aventura en Mallorca.
          </p>
        </div>

        {/* 5-Column Responsive Bento Grid */}
        <div className="cards-grid">
          {BRAND_PILLARS.map((card) => (
            <SpotlightCard key={card.id} card={card} />
          ))}
        </div>

      </div>

      <style jsx>{`
        .craftsmanship-section {
          background: #0F1115;
          color: white;
          padding-block: var(--space-24);
          position: relative;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: var(--space-8);
          margin-bottom: var(--space-14);
          flex-wrap: wrap;
        }
        .eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: var(--radius-full);
          background: rgba(229, 192, 123, 0.1);
          border: 1px solid rgba(229, 192, 123, 0.22);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #E5C07B;
          margin-bottom: var(--space-3);
        }
        .section-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.18;
          color: white;
          text-wrap: balance;
        }
        .text-gold {
          color: #E5C07B;
        }
        .italic {
          font-style: italic;
          font-weight: 300;
        }
        .section-subtitle {
          max-width: 480px;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.68;
          font-size: 0.96rem;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-6);
        }
        @media (max-width: 768px) {
          .craftsmanship-section {
            padding-block: var(--space-16);
          }
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-4);
            margin-bottom: var(--space-10);
          }
          .cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  )
}
