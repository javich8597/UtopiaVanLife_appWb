'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Map, Route, Utensils, Tent, Sparkles, Compass, Play, Sun, Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ExperienceItem {
  id: string
  title: string
  tag: string
  desc: string
  image: string
  video?: string
  icon: any
}

const EXPERIENCES: ExperienceItem[] = [
  {
    id: 'tramuntana',
    title: 'Serra de Tramuntana & Costa Norte',
    tag: 'Carretera Escénica · UNESCO',
    desc: 'Carreteras panorámicas entre acantilados y olivos milenarios. Desde Andratx y Valldemossa hasta el Faro de Formentor.',
    image: '/images/experiences/exp2.png',
    video: '/videos/lifestyle/lifestyle-driving-mallorca-coastal.mp4',
    icon: Route
  },
  {
    id: 'calas',
    title: 'Calas Vírgenes & Despertar Frente al Mar',
    tag: 'Aguas Turquesas',
    desc: 'Abre los portones traseros de tu camper frente al Mediterráneo en calas del sur y levante mientras disfrutas del primer café.',
    image: '/images/lifestyle/newsletter-adventure-hero.jpg',
    video: '/videos/lifestyle/lifestyle-coffee-morning-sea.mp4',
    icon: Map
  },
  {
    id: 'estrellas',
    title: 'Pernocta Bajo las Estrellas',
    tag: 'Cielo Limpio Off-Grid',
    desc: 'Observa la Vía Láctea desde el confort de tu colchón viscoelástico con la claraboya panorámica en parajes sin contaminación.',
    image: '/images/experiences/exp4.png',
    video: '/videos/lifestyle/lifestyle-sunset-relax-window.mp4',
    icon: Tent
  },
  {
    id: 'gastronomia',
    title: 'Gastronomía Local al Aire Libre',
    tag: 'Sabores Mediterráneos',
    desc: 'Compra ingredientes frescos en los mercados rurales de Santanyí y Sineu y cocina con vistas al mar en tu módulo de gas GLP.',
    image: '/images/experiences/exp3.png',
    video: '/videos/lifestyle/lifestyle-cooking-sea-views.mp4',
    icon: Utensils
  },
  {
    id: 'comunidad',
    title: 'Comunidad Utopia Nomade Society',
    tag: 'Cultura Viajera',
    desc: 'Comparte atardeceres y relatos de viaje con otros nómadas en los rincones más mágicos y pacíficos de la isla.',
    image: '/images/lifestyle/nomade-society-community.jpg',
    icon: Heart
  }
]

function ExperienceCard({ item }: { item: ExperienceItem }) {
  const [isHovered, setIsHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (videoRef.current && item.video) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  const Icon = item.icon

  return (
    <motion.div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="exp-card"
    >
      <div className="exp-media-wrap">
        {/* Still image fallback */}
        <Image
          src={item.image}
          alt={item.title}
          fill
          className={`object-cover exp-img ${isHovered && item.video ? 'exp-img--hidden' : ''}`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
        />

        {/* Video preview on hover */}
        {item.video && (
          <video
            ref={videoRef}
            src={item.video}
            muted
            loop
            playsInline
            preload="none"
            className={`exp-video ${isHovered ? 'exp-video--playing' : ''}`}
          />
        )}

        <div className="exp-vignette" />

        <div className="exp-header-badges">
          <span className="exp-tag">{item.tag}</span>
          {item.video && (
            <span className="video-badge" title="Previsualización en vídeo disponible">
              <Play size={10} style={{ color: '#E5C07B', marginLeft: 1 }} />
              <span>Vídeo</span>
            </span>
          )}
        </div>
      </div>

      <div className="exp-body">
        <div className="exp-title-row">
          <div className="exp-icon-pill">
            <Icon size={16} style={{ color: '#E5C07B' }} />
          </div>
          <h3 className="exp-title">{item.title}</h3>
        </div>
        <p className="exp-desc">{item.desc}</p>
      </div>

      <style jsx>{`
        .exp-card {
          background: #14171D;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-xl, 20px);
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .exp-card:hover {
          border-color: rgba(229, 192, 123, 0.35);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(229, 192, 123, 0.15);
        }
        .exp-media-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16/10;
          overflow: hidden;
          background: #000;
        }
        :global(.exp-img) {
          transition: transform 0.5s ease, opacity 0.3s ease;
        }
        :global(.exp-img--hidden) {
          opacity: 0;
        }
        .exp-card:hover :global(.exp-img) {
          transform: scale(1.04);
        }
        .exp-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .exp-video--playing {
          opacity: 1;
        }
        .exp-vignette {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, #14171D 0%, rgba(20, 23, 29, 0.2) 60%, transparent 100%);
          pointer-events: none;
          z-index: 2;
        }
        .exp-header-badges {
          position: absolute;
          top: 14px;
          left: 14px;
          right: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 3;
        }
        .exp-tag {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #E5C07B;
          background: rgba(11, 13, 17, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(229, 192, 123, 0.25);
          padding: 3px 10px;
          border-radius: var(--radius-full);
        }
        .video-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          font-weight: 600;
          color: white;
          background: rgba(11, 13, 17, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 3px 8px;
          border-radius: var(--radius-full);
        }
        .exp-body {
          position: relative;
          z-index: 3;
          padding: var(--space-5) var(--space-6) var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          flex: 1;
        }
        .exp-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .exp-icon-pill {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(229, 192, 123, 0.12);
          border: 1px solid rgba(229, 192, 123, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .exp-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: white;
          letter-spacing: -0.01em;
          line-height: 1.3;
          margin: 0;
        }
        .exp-desc {
          font-size: 0.86rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 0;
        }
      `}</style>
    </motion.div>
  )
}

export default function ExperiencesSection() {
  const t = useTranslations('HomePage.Experiences')

  return (
    <section className="experiences-section" id="experiencias">
      <div className="container">
        
        {/* Section Header */}
        <div className="section-header">
          <div className="eyebrow-pill">
            <Compass size={12} className="text-gold" />
            <span>RUTAS & ESTILO DE VIDA NÓMADA</span>
          </div>

          <h2 className="section-title">
            Mallorca a tu propio <em className="text-gold italic">compás</em>
          </h2>

          <p className="section-subtitle">
            Desde los pinares de la Serra de Tramuntana hasta las calas turquesas escondidas del sureste. Descubre la isla sin prisas, pernoctando en los enclaves más bellos y respetando el entorno.
          </p>
        </div>

        {/* Experiences Grid */}
        <div className="experiences-grid">
          {EXPERIENCES.map((item) => (
            <ExperienceCard key={item.id} item={item} />
          ))}
        </div>

      </div>

      <style jsx>{`
        .experiences-section {
          background: #0B0D11;
          color: white;
          padding-block: var(--space-24);
          position: relative;
        }
        .section-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 680px;
          margin-inline: auto;
          margin-bottom: var(--space-14);
          gap: var(--space-3);
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
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.68;
          font-size: 0.98rem;
          text-wrap: balance;
        }
        .experiences-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-6);
        }
        @media (max-width: 768px) {
          .experiences-section {
            padding-block: var(--space-16);
          }
          .experiences-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  )
}
