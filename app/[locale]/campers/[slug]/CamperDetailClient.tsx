'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Users,
  Ruler,
  Fuel,
  Calendar,
  Settings,
  Compass,
  Sun,
  Eye,
  Zap,
  Sparkles,
  Shield,
  Check
} from 'lucide-react'
import PriceCalculator from '@/components/booking/PriceCalculator'
import MapboxExperiences from '@/components/map/MapboxExperiences'
import { useTranslations, useLocale } from 'next-intl'

interface Props {
  camper: any
  seasons: any[]
  extras: any[]
  initialFrom?: string
  initialTo?: string
}

// Media and highlights mapping based on Nomade Nation official specs
const PREMIUM_MEDIA_DATA: Record<string, {
  tourUrl: string
  dayVideo: string
  dayPoster: string
  nightVideo: string
  nightPoster: string
  relaxImg: string
  highlights_es: string[]
  highlights_en: string[]
  techDetails_es: string[]
  techDetails_en: string[]
}> = {
  neo: {
    tourUrl: "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.html?panorama=https://nomade-nation.com/wp-content/uploads/2024/07/NEO_31-2-optimized.png&autoLoad=true",
    dayVideo: "https://nomade-nation.com/wp-content/uploads/2024/07/video_dia_min.mp4",
    dayPoster: "https://nomade-nation.com/wp-content/uploads/2024/10/Dia-optimized.jpg",
    nightVideo: "https://nomade-nation.com/wp-content/uploads/2024/07/video_noche_min.mp4",
    nightPoster: "https://nomade-nation.com/wp-content/uploads/2024/10/Oscuro-optimized.jpg",
    relaxImg: "https://nomade-nation.com/wp-content/uploads/2024/07/4-3-optimized.png",
    highlights_es: [
      "Claraboya panorámica (El doble de estrellas)",
      "Separación total de cabina para máximo aislamiento e intimidad",
      "2.230 Litros de maletero de gran capacidad bajo la cama fija",
      "Cama fija de 192x130 cm con colchón viscoelástico + cama auxiliar",
      "Ducha interior con agua caliente, WC químico y ducha exterior",
      "Sistema Eléctrico PRO Victron (540Ah Litio + 400W Solar + Inversor 2000W)",
      "Aire acondicionado 12V Dometic y calefacción diésel Truma Combi 4D + E"
    ],
    highlights_en: [
      "Panoramic skylight (Double the stars)",
      "Complete cabin separation for maximum thermal and acoustic insulation",
      "2,230 Liters of cargo storage under the fixed bed",
      "Fixed 192x130 cm bed with memory foam mattress + extra lounge bed",
      "Indoor shower with hot water, chemical toilet, and outdoor shower",
      "Victron PRO Electrical System (540Ah Lithium + 400W Solar + 2000W Inverter)",
      "12V Dometic Air Conditioning and Truma Combi 4D + E diesel heating"
    ],
    techDetails_es: [
      "Vehículo base: Fiat Ducato L3H2 (5.99m longitud)",
      "Motor Multijet 140 CV Diésel (8L/100 km) con cambio manual",
      "Aire acondicionado 12V Dometic CoolAir y calefacción Truma Combi 4D + E",
      "2 Baterías de Litio Victron (540Ah) y 2 Placas Solares (400W)",
      "Inversor Victron Multiplus 2000W y cargador Orion XS 12/12-50A",
      "Pantalla táctil Garmin SERV y app Garmin RV Controls",
      "Depósito de aguas limpias de 113L y aguas grises de 90L",
      "Pantalla táctil de 10 pulgadas con CarPlay/Android Auto y cámara trasera",
      "Sonido envolvente con 4 altavoces coaxiales JBL"
    ],
    techDetails_en: [
      "Base vehicle: Fiat Ducato L3H2 (5.99m length)",
      "Multijet 140 HP Diesel engine (8L/100 km) with manual transmission",
      "12V Dometic CoolAir AC and Truma Combi 4D + E diesel heating",
      "2 Victron Lithium batteries (540Ah) and 2 Solar Panels (400W)",
      "Victron Multiplus 2000W Inverter and Orion XS 12/12-50A charger",
      "Garmin SERV touchscreen and Garmin RV Controls mobile app",
      "113L fresh water tank and 90L gray water tank",
      "10-inch touchscreen with CarPlay/Android Auto and rear camera",
      "Surround sound with 4 JBL coaxial speakers"
    ]
  },
  space: {
    tourUrl: "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.html?panorama=https://nomade-nation.com/wp-content/uploads/2026/02/State360-1-optimized.png&autoLoad=true",
    dayVideo: "https://nomade-nation.com/wp-content/uploads/2024/07/video_dia_min.mp4",
    dayPoster: "https://nomade-nation.com/wp-content/uploads/2024/10/Dia-optimized.jpg",
    nightVideo: "https://nomade-nation.com/wp-content/uploads/2024/07/video_noche_min.mp4",
    nightPoster: "https://nomade-nation.com/wp-content/uploads/2024/10/Oscuro-optimized.jpg",
    relaxImg: "https://nomade-nation.com/wp-content/uploads/2026/04/3-1-optimized.png",
    highlights_es: [
      "Distribución diurna 100% abierta (7m² sin divisiones)",
      "Cama elevable eléctrica de 185x135 cm (salón de día, dormitorio de noche)",
      "Salón panorámico trasero en U con mesa giratoria 360° para teletrabajo",
      "5 Ventanas correderas y hasta 3 claraboyas para máxima luminosidad",
      "Depósito de aguas limpias de gran capacidad (160 Litros)",
      "Nevera de compresor 86L a 12V con congelador y encimera en L",
      "Pack Cine con proyector HD y sistema de sonido JBL con amplificador"
    ],
    highlights_en: [
      "100% Open day layout (7m² without barriers)",
      "Electric drop-down 185x135 cm bed (lounge by day, bedroom by night)",
      "Panoramic U-shaped lounge with 360° swivel table for remote work",
      "5 Sliding windows and up to 3 skylights for maximum natural light",
      "Extra large 160-Liter fresh water tank for superior autonomy",
      "12V compressor 86L refrigerator with freezer and L-shaped countertop",
      "Cinema Pack with HD projector and amplified JBL sound system"
    ],
    techDetails_es: [
      "Vehículo base: Fiat Ducato L3H2 (5.99m longitud)",
      "Motor Multijet 140 CV Diésel (8L/100 km) con cambio manual",
      "Aire acondicionado Dometic 12V y calefacción Truma Combi 4D + E",
      "2 Baterías de Litio Victron (540Ah) y 2 Placas Solares (400W)",
      "Inversor Victron Multiplus 2000W y cargador Orion XS 12/12-50A",
      "Pantalla táctil Garmin SERV con domótica integral y app móvil",
      "Depósito de aguas limpias de 160L y aguas grises de 93L",
      "Ducha interior spa con agua caliente, WC químico y ducha exterior",
      "Pantalla táctil 10\" con CarPlay/Android Auto y cámara dinámica"
    ],
    techDetails_en: [
      "Base vehicle: Fiat Ducato L3H2 (5.99m length)",
      "Multijet 140 HP Diesel engine (8L/100 km) with manual transmission",
      "12V Dometic AC and Truma Combi 4D + E diesel heating",
      "2 Victron Lithium batteries (540Ah) and 2 Solar Panels (400W)",
      "Victron Multiplus 2000W Inverter and Orion XS 12/12-50A charger",
      "Garmin SERV touchscreen with home automation and mobile app",
      "160L fresh water tank and 93L gray water tank",
      "Indoor spa shower with hot water, chemical toilet, and outdoor shower",
      "10-inch touchscreen with CarPlay/Android Auto and dynamic camera"
    ]
  }
}

export default function CamperDetailClient({ camper, seasons, extras, initialFrom, initialTo }: Props) {
  const t = useTranslations('CamperDetail')
  const locale = useLocale()
  const [currentImg, setCurrentImg] = useState(0)
  
  // Media Tabs: 'gallery' | 'tour360' | 'vibe'
  const [mediaTab, setMediaTab] = useState<'gallery' | 'tour360' | 'vibe'>('gallery')
  // Vibe Modes: 'day' | 'night' | 'relax'
  const [vibeMode, setVibeMode] = useState<'day' | 'night' | 'relax'>('day')

  const premiumData = PREMIUM_MEDIA_DATA[camper.slug] || PREMIUM_MEDIA_DATA.neo
  const images = camper.images?.length ? camper.images : [camper.thumbnail_url]

  const prevImg = () => setCurrentImg(i => (i - 1 + images.length) % images.length)
  const nextImg = () => setCurrentImg(i => (i + 1) % images.length)

  const specs = camper.specs || {}
  const specsItems = [
    { icon: Moon, label: t('beds'), value: specs.beds ? `${specs.beds} ${t('beds').toLowerCase()}` : '-' },
    { icon: Users, label: t('seats'), value: specs.seats ? `${specs.seats} ${t('seats').toLowerCase()}` : '-' },
    { icon: Ruler, label: t('length'), value: specs.length_m ? `${specs.length_m}m` : '-' },
    { icon: Fuel, label: t('engine'), value: specs.engine ?? '-' },
    { icon: Settings, label: t('transmission'), value: specs.transmission ?? '-' },
    { icon: Calendar, label: t('year'), value: specs.year ?? '-' },
  ]

  const effectiveSeasons = seasons.length > 0 ? seasons : [
    { id: 's1', name: 'Temporada Alta', start_date: '2025-06-15', end_date: '2025-09-15', price_per_night: 175, discount_7days_pct: 10 },
    { id: 's2', name: 'Temporada Media', start_date: '2025-04-01', end_date: '2025-06-14', price_per_night: 130, discount_7days_pct: 8 },
    { id: 's3', name: 'Temporada Baja', start_date: '2025-11-01', end_date: '2026-03-31', price_per_night: 95, discount_7days_pct: 5 },
  ]

  const effectiveExtras = extras.length > 0 ? extras : [
    { id: 'e1', name_es: 'Kit de Limpieza', price: 75, icon: 'sparkles' },
    { id: 'e2', name_es: 'Kit Snorkel', price: 25, icon: 'waves' },
    { id: 'e3', name_es: 'Silla de Camping', price: 15, icon: 'armchair' },
    { id: 'e4', name_es: 'Wi-Fi Portátil', price: 20, icon: 'wifi' },
  ]

  const highlights = locale === 'es' ? premiumData.highlights_es : premiumData.highlights_en
  const techDetails = locale === 'es' ? premiumData.techDetails_es : premiumData.techDetails_en

  return (
    <div className="camper-detail bg-light-cream">
      {/* Premium Media Viewport */}
      <div className="media-viewport">
        
        {/* Main View Area */}
        <div className="media-viewport__content">
          {mediaTab === 'gallery' && (
            <div className="media-viewport__slide gallery-slide">
              <Image
                src={images[currentImg] || 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=1200&q=85'}
                alt={`${camper.name} - foto ${currentImg + 1}`}
                fill
                style={{ objectFit: 'cover' }}
                priority
                sizes="100vw"
              />
              {images.length > 1 && (
                <>
                  <button className="gallery-btn gallery-btn--prev" onClick={prevImg} aria-label="Foto anterior">
                    <ChevronLeft size={22} />
                  </button>
                  <button className="gallery-btn gallery-btn--next" onClick={nextImg} aria-label="Foto siguiente">
                    <ChevronRight size={22} />
                  </button>
                  <div className="gallery-dots">
                    {images.map((_: any, i: number) => (
                      <button
                        key={i}
                        className={`gallery-dot ${i === currentImg ? 'gallery-dot--active' : ''}`}
                        onClick={() => setCurrentImg(i)}
                        aria-label={`Foto ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {mediaTab === 'tour360' && (
            <div className="media-viewport__slide iframe-slide">
              <iframe
                src={premiumData.tourUrl}
                title={`Tour 360 - ${camper.name}`}
                className="tour-360-iframe"
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}

          {mediaTab === 'vibe' && (
            <div className="media-viewport__slide vibe-slide">
              {vibeMode === 'day' && (
                <video
                  key="day-video"
                  src={premiumData.dayVideo}
                  poster={premiumData.dayPoster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  suppressHydrationWarning
                  className="vibe-media"
                />
              )}
              {vibeMode === 'night' && (
                <video
                  key="night-video"
                  src={premiumData.nightVideo}
                  poster={premiumData.nightPoster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  suppressHydrationWarning
                  className="vibe-media"
                />
              )}
              {vibeMode === 'relax' && (
                <Image
                  src={premiumData.relaxImg}
                  alt="Modo Relax"
                  fill
                  style={{ objectFit: 'cover' }}
                  className="vibe-media"
                />
              )}
            </div>
          )}
        </div>

        {/* Media Control Capsule (Glassmorphic) */}
        <div className="media-capsule">
          <button
            onClick={() => setMediaTab('gallery')}
            className={`media-capsule-btn ${mediaTab === 'gallery' ? 'media-capsule-btn--active' : ''}`}
          >
            <span>{t('galleryTab')}</span>
          </button>
          
          <button
            onClick={() => setMediaTab('tour360')}
            className={`media-capsule-btn ${mediaTab === 'tour360' ? 'media-capsule-btn--active' : ''}`}
          >
            <Compass size={14} style={{ marginRight: 6 }} />
            <span>{t('tourTab')}</span>
          </button>

          <button
            onClick={() => {
              setMediaTab('vibe')
              setVibeMode('day')
            }}
            className={`media-capsule-btn ${mediaTab === 'vibe' ? 'media-capsule-btn--active' : ''}`}
          >
            <Sun size={14} style={{ marginRight: 6 }} />
            <span>{t('vibeTab')}</span>
          </button>
        </div>

        {/* Ambient Vibe Toggle Overlay (when Vibe is active) */}
        {mediaTab === 'vibe' && (
          <div className="vibe-overlay-menu">
            <button
              onClick={() => setVibeMode('day')}
              className={`vibe-menu-btn ${vibeMode === 'day' ? 'vibe-menu-btn--active' : ''}`}
            >
              {t('vibeDay')}
            </button>
            <button
              onClick={() => setVibeMode('night')}
              className={`vibe-menu-btn ${vibeMode === 'night' ? 'vibe-menu-btn--active' : ''}`}
            >
              {t('vibeNight')}
            </button>
            <button
              onClick={() => setVibeMode('relax')}
              className={`vibe-menu-btn ${vibeMode === 'relax' ? 'vibe-menu-btn--active' : ''}`}
            >
              {t('vibeRelax')}
            </button>
          </div>
        )}
      </div>

      {/* Main Grid Content */}
      <div className="container">
        <div className="camper-detail__layout">
          
          {/* Main content */}
          <div className="camper-detail__main">
            {/* Header Title */}
            <div className="camper-detail__header">
              <div>
                <span className="text-label tracking-wide" style={{ color: 'var(--forest-green)', fontWeight: 600 }}>
                  Utopia Van Life
                </span>
                <h1 className="text-display" style={{ marginTop: 'var(--space-2)' }}>
                  {camper.name}
                </h1>
              </div>
            </div>

            {/* Description Text */}
            <div className="camper-detail__desc">
              {(camper.description_es || '').split('\n\n').map((para: string, i: number) => (
                <p key={i} className="text-body-large" style={{ color: 'var(--gray-700)', lineHeight: '1.75' }}>
                  {para}
                </p>
              ))}
            </div>

            {/* Specifications Cards Grid (Glassmorphism + physical style) */}
            <div>
              <h2 className="text-h3" style={{ marginBottom: 'var(--space-6)' }}>
                {t('specs')}
              </h2>
              <div className="camper-detail__specs">
                {specsItems.map((s, i) => (
                  <div key={i} className="spec-card">
                    <div className="spec-card__icon">
                      <s.icon size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="spec-card__label">{s.label}</div>
                      <div className="spec-card__value">{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlighted Equipment and Power System (Wallet card style mix) */}
            <div className="equipment-grid">
              
              {/* Highlight List */}
              <div className="equipment-card">
                <h3 className="text-h3" style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={22} className="text-forest" />
                  <span>{t('highlightedEquipment')}</span>
                </h3>
                <ul className="highlight-list">
                  {highlights.map((hl, i) => (
                    <li key={i} className="highlight-item">
                      <span className="check-bullet">
                        <Check size={14} />
                      </span>
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Special Pro Electrical System Card (Wallet Card Layout) */}
              <div className="pro-power-card">
                <div className="power-card-glow" />
                <div className="power-card-content">
                  <div className="power-card-header">
                    <Zap size={24} className="text-gold animate-pulse" />
                    <span className="power-card-chip">{t('proElectricalSystem')}</span>
                  </div>
                  <h4 className="power-card-title">VICTRON SYSTEM PRO</h4>
                  <p className="power-card-desc">
                    {t('proElectricalDesc')}
                  </p>
                  
                  <div className="power-card-footer">
                    <div className="power-stat">
                      <span className="stat-label">SOLAR CAPACITY</span>
                      <span className="stat-val">{camper.slug === 'space' ? '800 W' : '400 W'}</span>
                    </div>
                    <div className="power-stat">
                      <span className="stat-label">LITHIUM STORAGE</span>
                      <span className="stat-val">{camper.slug === 'space' ? '540 Ah' : '200 Ah'}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Complete technical specs checklist */}
            <div className="technical-checklist">
              <h3 className="text-h3" style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={22} className="text-forest" />
                <span>Especificaciones Técnicas</span>
              </h3>
              <div className="tech-details-grid">
                {techDetails.map((detail, i) => (
                  <div key={i} className="tech-detail-row">
                    <span className="tech-dot" />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Experience Map (Utopia route tracker) */}
            <div>
              <h2 className="text-h3" style={{ marginBottom: 'var(--space-2)' }}>
                {t('experienceMap')}
              </h2>
              <p className="text-body" style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-6)' }}>
                {t('experienceMapDesc')}
              </p>
              <div className="map-card">
                <MapboxExperiences />
              </div>
            </div>

          </div>

          {/* Sticky booking calculator panel */}
          <div className="camper-detail__sidebar">
            <PriceCalculator
              camperSlug={camper.slug}
              depositAmount={camper.deposit_amount}
              seasons={effectiveSeasons}
              availableExtras={effectiveExtras}
              initialFrom={initialFrom}
              initialTo={initialTo}
            />
          </div>

        </div>
      </div>

      <style jsx>{`
        .media-viewport {
          position: relative;
          width: 100%;
          height: 65vh;
          min-height: 480px;
          max-height: 720px;
          background: #141419;
          overflow: hidden;
        }
        .media-viewport__content {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .media-viewport__slide {
          position: relative;
          width: 100%;
          height: 100%;
          animation: fade-in 0.4s ease-out;
        }
        .tour-360-iframe {
          width: 100%;
          height: 100%;
          border: 0;
          background: #141419;
        }
        .vibe-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .gallery-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.25);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 5;
        }
        .gallery-btn:hover {
          background: white;
          color: var(--black-matte);
          transform: translateY(-50%) scale(1.05);
        }
        .gallery-btn--prev { left: var(--space-6); }
        .gallery-btn--next { right: var(--space-6); }
        
        .gallery-dots {
          position: absolute;
          bottom: var(--space-6);
          left: var(--space-6);
          display: flex;
          gap: 6px;
          z-index: 5;
        }
        .gallery-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .gallery-dot--active {
          background: white;
          width: 24px;
          border-radius: 3px;
        }
        
        /* Media control capsule (glassmorphism style) */
        .media-capsule {
          position: absolute;
          bottom: var(--space-6);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
          background: rgba(20, 20, 25, 0.65);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 5px;
          border-radius: 9999px;
          z-index: 10;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .media-capsule-btn {
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 9999px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .media-capsule-btn:hover {
          color: white;
        }
        .media-capsule-btn--active {
          background: white;
          color: var(--black-matte);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* Ambient vibe select overlay */
        .vibe-overlay-menu {
          position: absolute;
          top: var(--space-6);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 4px;
          border-radius: var(--radius-md);
          z-index: 10;
        }
        .vibe-menu-btn {
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.7);
          font-size: var(--text-xs);
          font-weight: 500;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }
        .vibe-menu-btn:hover {
          color: white;
        }
        .vibe-menu-btn--active {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-weight: 600;
        }

        .camper-detail__layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: var(--space-12);
          padding-block: var(--space-12);
          align-items: start;
        }
        .camper-detail__main {
          display: flex;
          flex-direction: column;
          gap: var(--space-12);
        }
        .camper-detail__header {
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          padding-bottom: var(--space-6);
        }
        .camper-detail__desc {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        
        /* Specs card layout (glassmorphism/physical cards) */
        .camper-detail__specs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
        }
        .spec-card {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-5);
          background: white;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .spec-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
          border-color: rgba(43,76,55,0.1);
        }
        .spec-card__icon {
          width: 44px;
          height: 44px;
          background: rgba(43,76,55,0.06);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest-green);
          flex-shrink: 0;
        }
        .spec-card__label {
          font-size: var(--text-xs);
          color: var(--gray-400);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .spec-card__value {
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--black-matte);
        }

        /* Equipment lists and Victron Pro card */
        .equipment-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: var(--space-6);
        }
        .equipment-card {
          background: white;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: var(--radius-lg);
          padding: var(--space-8);
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .highlight-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .highlight-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          font-size: var(--text-base);
          color: var(--gray-700);
        }
        .check-bullet {
          width: 20px;
          height: 20px;
          background: rgba(43,76,55,0.08);
          color: var(--forest-green);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
          flex-shrink: 0;
        }

        /* Cyberpunkish/wallet card premium look for Victron GX */
        .pro-power-card {
          position: relative;
          background: linear-gradient(135deg, #101014 0%, #1e1f26 100%);
          border-radius: var(--radius-lg);
          padding: var(--space-8);
          color: white;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0,0,0,0.25);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .power-card-glow {
          position: absolute;
          top: -50%;
          right: -50%;
          width: 150%;
          height: 150%;
          background: radial-gradient(circle, rgba(234, 179, 8, 0.08) 0%, transparent 60%);
          pointer-events: none;
        }
        .power-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-6);
        }
        .power-card-chip {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          background: rgba(234, 179, 8, 0.15);
          color: #eab308;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-weight: 700;
        }
        .power-card-title {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #ffffff;
          margin: 0 0 var(--space-2) 0;
        }
        .power-card-desc {
          font-size: var(--text-sm);
          color: rgba(255,255,255,0.6);
          line-height: 1.5;
          margin-bottom: var(--space-8);
        }
        .power-card-footer {
          display: flex;
          gap: var(--space-6);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: var(--space-4);
        }
        .power-stat {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }
        .stat-val {
          font-size: var(--text-lg);
          font-weight: 700;
          color: #eab308;
        }

        /* Tech checklist section */
        .technical-checklist {
          background: white;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: var(--radius-lg);
          padding: var(--space-8);
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .tech-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4) var(--space-8);
        }
        .tech-detail-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--text-sm);
          color: var(--gray-600);
        }
        .tech-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--forest-green);
          flex-shrink: 0;
        }

        .map-card {
          border-radius: var(--radius-lg);
          overflow: hidden;
          line-height: 0;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 960px) {
          .camper-detail__layout {
            grid-template-columns: 1fr;
          }
          .camper-detail__sidebar { order: -1; }
          .media-viewport {
            height: 50vh;
            min-height: 380px;
          }
        }
        @media (max-width: 768px) {
          .camper-detail__specs {
            grid-template-columns: repeat(2, 1fr);
          }
          .equipment-grid {
            grid-template-columns: 1fr;
          }
          .tech-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
