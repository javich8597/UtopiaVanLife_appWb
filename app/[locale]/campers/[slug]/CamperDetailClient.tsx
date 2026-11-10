'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  Heart,
  Clock,
  ShieldCheck
} from 'lucide-react'
import PriceCalculator from '@/components/booking/PriceCalculator'
import CamperModelSwitcher from '@/components/campers/CamperModelSwitcher'
import CamperGalleryGrid from '@/components/campers/CamperGalleryGrid'
import CamperLightboxModal, { LightboxImage } from '@/components/campers/CamperLightboxModal'
import CamperFeaturePills from '@/components/campers/CamperFeaturePills'
import CamperDescription from '@/components/campers/CamperDescription'
import CamperFloorplans from '@/components/campers/CamperFloorplans'
import CamperFeatureGrid, { FeatureItem } from '@/components/campers/CamperFeatureGrid'
import CamperIncluded from '@/components/campers/CamperIncluded'
import CamperStickyBookingBar from '@/components/campers/CamperStickyBookingBar'
import { useTranslations, useLocale } from 'next-intl'

interface Props {
  camper: any
  seasons: any[]
  extras: any[]
  initialFrom?: string
  initialTo?: string
  seasonsV2?: any[]
  seasonPeriods?: any[]
  durationDiscounts?: any[]
}

/* ──────────────────────────────────────────────────────────────────────────
   STATIC CONTENT PER CAMPER
   ────────────────────────────────────────────────────────────────────────── */

interface CamperContent {
  tagline: string
  pills: { icon: 'users' | 'bed' | 'droplets' | 'zap'; label: string }[]
  galleryImages: LightboxImage[]
  description: string[]
  descriptionInlineImage: { src: string; alt: string }
  floorplanDay: string
  floorplanNight: string
  features: FeatureItem[]
  included: string[]
}

const CAMPER_CONTENT: Record<string, CamperContent> = {
  space: {
    tagline: 'Lo esencial, bien hecho. Espacio, diseño y libertad en su forma más simple. Camper diseñada para dos personas, primando el máximo confort en todo momento.',
    pills: [
      { icon: 'users', label: '2 Plazas viaje / 2 dormir' },
      { icon: 'bed', label: 'Cama elevable + interbanco' },
      { icon: 'droplets', label: 'Ducha interior + WC' },
      { icon: 'zap', label: 'Sistema eléctrico Pro 540Ah' },
    ],
    galleryImages: [
      { src: '/images/campers/space/exterior/space-vehicle-hero-lanzarote.webp', tag: 'Exterior SPACE' },
      { src: '/images/campers/space/interior/space-dining-lounge-frontview.jpg', tag: 'Salón comedor con luz natural' },
      { src: '/images/campers/space/interior/space-electric-drop-down-bed.jpg', tag: 'Cama eléctrica suspendida' },
      { src: '/images/campers/space/interior/space-cinema-projector-lounge.jpg', tag: 'Salón amplio SPACE' },
      { src: '/images/campers/space/interior/space-kitchen-counter-cabin.jpg', tag: 'Cocina equipada con nevera 86L y 2 fogones' },
      { src: '/images/campers/space/interior/space-bathroom-shower.webp', tag: 'Baño completo con ducha interior y WC' },
    ],
    description: [
      'Máximo confort en una camper. Gracias a su cama elevable, durante el día disfrutas de todo el espacio interior, como si estuvieras en una autocaravana… pero con la libertad de una camper. Menos maletero. Más calidad de vida en el día a día. Camper diseñada para dos personas, primando el máximo confort en todo momento.',
      'Más espacio. Más comodidad. Más libertad. La SPACE está diseñada para quienes quieren viajar sin renunciar a nada. Una camper amplia, equipada y preparada para convertir cualquier destino en tu propio lugar. Cocina completa, baño con ducha, climatización y un sistema eléctrico que te permite desconectar… sin dejar de tenerlo todo.',
      'Diseño en cada detalle: amplitud real con espacios abiertos que aportan libertad de movimiento; confort superior con cada zona pensada para disfrutar sin renunciar a nada; y funcionalidad total con todo organizado para un uso práctico y sencillo. Perfecta para viajes largos, rutas sin prisa y planes que simplemente surgen. Si la NEO es libertad, la SPACE es dar un paso más allá.',
      'El corazón de la camper incorpora el sistema electrónico más avanzado: dos baterías de litio (540Ah), doble placa solar monocristalina (400W), inversor Multiplus 2.000W Victron, centralita Cerbo GX, cargador de batería Orion XS 12/12-50A y regulador SmartSolar MPPT 100/30.',
    ],
    descriptionInlineImage: {
      src: '/images/campers/space/interior/space-lounge-spacious-daylight.jpg',
      alt: 'Salón panorámico SPACE con luz natural',
    },
    floorplanDay: '/images/campers/space/exterior/space-vehicle-dimensions-top.webp',
    floorplanNight: '/images/campers/space/exterior/space-vehicle-dimensions-side.webp',
    features: [
      { icon: 'users', label: 'Plazas de viaje', value: '2 personas homologadas' },
      { icon: 'bed', label: 'Plazas para dormir', value: '2 personas en máximo confort' },
      { icon: 'bed', label: 'Tipo de cama', value: 'Cama elevable + cama interbanco' },
      { icon: 'utensils', label: 'Cocina equipada', value: 'Nevera 86L y dos fogones a gas GLP' },
      { icon: 'droplets', label: 'Baño completo', value: 'Ducha interior, WC químico/portátil y ducha exterior' },
      { icon: 'ruler', label: 'Longitud del vehículo', value: '5,99 m (Fiat Ducato · Mayor amplitud interior)' },
      { icon: 'battery', label: 'Sistema eléctrico Pro', value: '2 baterías de litio (540Ah) + Centralita Cerbo GX' },
      { icon: 'sun', label: 'Placas solares', value: 'Doble placa solar monocristalina (400W) · SmartSolar MPPT 100/30' },
      { icon: 'zap', label: 'Inversor y cargador', value: 'Inversor Multiplus 2.000W Victron + Cargador Orion XS 12/12-50A' },
      { icon: 'snowflake', label: 'Aire acondicionado', value: '12 V Dometic integrado' },
      { icon: 'droplets', label: 'Depósitos de agua', value: 'Aguas limpias 113L y aguas grises 90L' },
      { icon: 'wind', label: 'Calefacción y aislamiento', value: 'Calefacción diésel y aislamiento completo 360º' },
      { icon: 'thermometer', label: 'Gas GLP y seguridad', value: 'Gas GLP para cocina y agua caliente + alarma de gases' },
      { icon: 'sun', label: 'Ventanas y luz', value: 'Claraboya panorámica, mosquiteras y oscurecedores' },
      { icon: 'shield', label: 'Seguridad en ruta', value: 'Rueda de repuesto y mini extintor' },
      { icon: 'gauge', label: 'Motor y cambio', value: 'Motor diésel 8L/100 km · Cambio manual 140 CV' },
    ],
    included: [
      'Seguro a todo riesgo con asistencia en viaje (al recoger el vehículo se deberá depositar una fianza de 1.000 €)',
      '150 km al día incluidos',
      'Asistencia telefónica durante el viaje (16 h)',
      'Almohadas, sábanas y toallas',
      'Menaje completo premium',
      'Dos sillas de camping para exterior',
      '2 máscaras de snorkel',
      'Set de limpieza',
      'Gastos de gestión',
    ],
  },
  neo: {
    tagline: 'Lo esencial, bien hecho. Espacio, diseño y libertad en su forma más simple. Camper ideal para dos personas, que se adapta de forma perfecta para 3.',
    pills: [
      { icon: 'users', label: '3 Plazas viaje / 3 dormir' },
      { icon: 'bed', label: 'Cama doble fija + auxiliar' },
      { icon: 'droplets', label: 'Ducha interior + WC' },
      { icon: 'zap', label: 'Sistema eléctrico Pro 540Ah' },
    ],
    galleryImages: [
      { src: '/images/campers/neo/exterior/neo-exterior-front-three-quarter.jpg', tag: 'Exterior NEO' },
      { src: '/images/campers/neo/interior/neo-dining-room-daylight.jpg', tag: 'Salón comedor NEO' },
      { src: '/images/campers/neo/interior/neo-interior-hero-anthracite.webp', tag: 'Interior NEO' },
      { src: '/images/campers/neo/details/neo-garage-bike-storage.jpg', tag: 'Gran maletero trasero' },
      { src: '/images/campers/neo/details/solar-tech.webp', tag: 'Doble placa solar 400W' },
      { src: '/images/campers/neo/interior/neo-bathroom-shower.webp', tag: 'Baño completo con ducha interior y WC' },
    ],
    description: [
      'No es sólo una camper. La NEO ofrece más espacio, más capacidad y más libertad, gracias a su gran maletero, ideal para llevar todo lo que forma parte de tu aventura: desde equipo deportivo hasta escapadas más largas sin renunciar a nada. Equipada con uno de los sistemas eléctricos más top del mercado para ofrecer autonomía real. Camper ideal para dos personas, que se adapta de forma perfecta para 3.',
      'La NEO no es solo una camper. Es libertad. Diseñada para viajar sin depender de nada ni de nadie, combina autonomía total, confort y un equipamiento que marca la diferencia desde el primer kilómetro. Sistema eléctrico completo, aire acondicionado, baño con ducha interior, cocina equipada y una distribución pensada para disfrutar de verdad cada viaje.',
      'Diseño en cada detalle: materiales de calidad resistentes a los golpes, a las manchas y a las humedades; uso del espacio con una distribución interior compensada para sacar el máximo partido; y máximo confort en cada estancia preparada para que puedas disfrutar de la máxima comodidad.',
      'El corazón de la camper incorpora el sistema electrónico PRO más avanzado: dos baterías de litio (540Ah), doble placa solar monocristalina (400W), inversor Multiplus 2.000W Victron, centralita Cerbo GX, cargador de batería Orion XS 12/12-50A y regulador SmartSolar MPPT 100/30. Compacta, potente y preparada para cualquier plan. Sube, arranca… y olvídate de todo lo demás.',
    ],
    descriptionInlineImage: {
      src: '/images/campers/neo/details/neo-garage-bike-storage.jpg',
      alt: 'Gran maletero trasero NEO para equipamiento deportivo',
    },
    floorplanDay: '/images/campers/neo/blueprints/day-layout.webp',
    floorplanNight: '/images/campers/neo/blueprints/night-layout.webp',
    features: [
      { icon: 'users', label: 'Plazas de viaje', value: '3 personas homologadas' },
      { icon: 'bed', label: 'Plazas para dormir', value: '3 personas (ideal para 2, adaptable a 3)' },
      { icon: 'bed', label: 'Tipo de cama', value: 'Cama doble fija + cama auxiliar (interbanco)' },
      { icon: 'utensils', label: 'Cocina equipada', value: 'Nevera 86L y dos fogones a gas GLP' },
      { icon: 'droplets', label: 'Baño completo', value: 'Ducha interior, WC químico y ducha exterior' },
      { icon: 'ruler', label: 'Longitud del vehículo', value: '5,99 m (Fiat Ducato · Gran maletero 2.230L)' },
      { icon: 'battery', label: 'Sistema eléctrico Pro', value: '2 baterías de litio (540Ah) + Centralita Cerbo GX' },
      { icon: 'sun', label: 'Placas solares', value: 'Doble placa solar monocristalina (400W) · SmartSolar MPPT 100/30' },
      { icon: 'zap', label: 'Inversor y cargador', value: 'Inversor Multiplus 2.000W Victron + Cargador Orion XS 12/12-50A' },
      { icon: 'snowflake', label: 'Aire acondicionado', value: '12 V Dometic integrado' },
      { icon: 'droplets', label: 'Depósitos de agua', value: 'Aguas limpias 113L y aguas grises 90L' },
      { icon: 'wind', label: 'Calefacción y aislamiento', value: 'Calefacción diésel y aislamiento completo 360º' },
      { icon: 'thermometer', label: 'Gas GLP y seguridad', value: 'Gas GLP para cocina y agua caliente + alarma de gases' },
      { icon: 'sun', label: 'Ventanas y luz', value: 'Claraboya panorámica, mosquiteras y oscurecedores' },
      { icon: 'shield', label: 'Seguridad en ruta', value: 'Rueda de repuesto y mini extintor' },
      { icon: 'gauge', label: 'Motor y cambio', value: 'Motor diésel 8L/100 km · Cambio manual 140 CV' },
    ],
    included: [
      'Seguro a todo riesgo con asistencia en viaje (al recoger el vehículo se deberá depositar una fianza de 1.000 €)',
      '150 km al día incluidos',
      'Asistencia telefónica durante el viaje (16 h)',
      'Almohadas, sábanas y toallas',
      'Menaje completo premium',
      'Dos sillas de camping para exterior',
      '2 máscaras de snorkel',
      'Set de limpieza',
      'Gastos de gestión',
    ],
  },
}

/* ──────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────────────────────── */

export default function CamperDetailClient({
  camper,
  seasons,
  extras,
  initialFrom,
  initialTo,
  seasonsV2,
  seasonPeriods,
  durationDiscounts,
}: Props) {
  const t = useTranslations('CamperDetail')
  const locale = useLocale()
  const bookingSectionRef = useRef<HTMLDivElement>(null)

  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const slug = camper.slug?.toLowerCase() || 'space'
  const content = CAMPER_CONTENT[slug] || CAMPER_CONTENT.space

  const basePrice = Number(camper.base_price_per_night) || (slug === 'space' ? 135 : 110)

  const effectiveSeasons = seasons.length > 0 ? seasons : [
    { id: 's1', name: 'Temporada Alta', start_date: '2025-06-15', end_date: '2025-09-15', price_per_night: 175, discount_7days_pct: 10 },
    { id: 's2', name: 'Temporada Media', start_date: '2025-04-01', end_date: '2025-06-14', price_per_night: 130, discount_7days_pct: 8 },
    { id: 's3', name: 'Temporada Baja', start_date: '2025-11-01', end_date: '2026-03-31', price_per_night: 95, discount_7days_pct: 5 },
  ]

  const effectiveExtras = extras.length > 0 ? extras : [
    { id: 'e1', name_es: 'Kit Snorkel', price: 25, icon: 'waves' },
    { id: 'e2', name_es: 'Silla de Camping', price: 15, icon: 'armchair' },
    { id: 'e3', name_es: 'Wi-Fi 4G Portátil', price: 20, icon: 'wifi' },
  ]

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const handleScrollToBooking = () => {
    if (bookingSectionRef.current) {
      bookingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="camper-detail-v2">
      {/* ── Header Section ── */}
      <section className="camper-header">
        <div className="header-top-row">
          <div className="header-left">
            <Link href={`/${locale}/campers`} className="back-link">
              <ChevronRight size={14} className="rotate-180" />
              <span>Volver a Campers</span>
            </Link>
          </div>
          <CamperModelSwitcher currentSlug={slug} />
        </div>

        <div className="header-hero-block">
          <span className="hero-eyebrow">UTOPIA VAN LIFE · COLECCIÓN EXCLUSIVA</span>
          <h1 className="camper-title">{camper.name || slug.toUpperCase()}</h1>
          <p className="camper-tagline">{content.tagline}</p>
          <CamperFeaturePills pills={content.pills} />
        </div>
      </section>

      {/* ── Two-Column Layout ── */}
      <div className="page-layout">
        {/* Content Column */}
        <div className="content-column">
          <CamperGalleryGrid
            images={content.galleryImages}
            onOpenLightbox={handleOpenLightbox}
          />

          <CamperDescription
            paragraphs={content.description}
            inlineImage={content.descriptionInlineImage}
          />

          <CamperFloorplans
            dayImage={content.floorplanDay}
            nightImage={content.floorplanNight}
          />

          <CamperFeatureGrid features={content.features} initialVisible={8} />

          <CamperIncluded items={content.included} />

          {/* Mobile-only PriceCalculator */}
          <div className="mobile-calculator-section" ref={bookingSectionRef}>
            <div className="section-divider-row">
              <h3 className="section-divider-title">RESERVA TU AVENTURA</h3>
              <div className="section-divider-line" />
            </div>
            <div className="calculator-card">
              <PriceCalculator
                camperSlug={slug}
                depositAmount={2000}
                seasons={effectiveSeasons}
                availableExtras={effectiveExtras}
                initialFrom={initialFrom}
                initialTo={initialTo}
                maxGuests={camper.specs?.seats || (slug === 'space' ? 2 : 3)}
                seasonsV2={seasonsV2}
                seasonPeriods={seasonPeriods}
                durationDiscounts={durationDiscounts}
                camperBasePrice={basePrice}
              />
            </div>
          </div>
        </div>

        {/* Sidebar (desktop only) */}
        <aside className="booking-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-card-accent" />

            <div className="sidebar-trust-row">
              <Heart size={14} className="sidebar-icon-muted" />
              <span>Sin compromiso · Respuesta en 24h</span>
            </div>

            <div className="sidebar-price-block">
              <span className="sidebar-price-label">desde</span>
              <span className="sidebar-price-amount">{basePrice}€</span>
              <span className="sidebar-price-unit">/ noche</span>
            </div>

            <Link
              href={`/${locale}/reserva/${slug}${initialFrom && initialTo ? `?from=${initialFrom}&to=${initialTo}` : ''}`}
              className="sidebar-cta-btn"
            >
              <span>Reservar esta Camper</span>
              <ChevronRight size={16} />
            </Link>

            <div className="sidebar-separator" />

            <ul className="sidebar-includes">
              {content.included.slice(0, 4).map((item, i) => (
                <li key={i} className="sidebar-include-item">
                  <ShieldCheck size={14} className="sidebar-check-icon" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="sidebar-separator" />

            <div className="sidebar-response-row">
              <Clock size={14} className="sidebar-icon-muted" />
              <span>Respuesta en menos de 24 horas</span>
            </div>

            {/* Embedded Calculator */}
            <div className="sidebar-calculator-wrap" ref={bookingSectionRef}>
              <PriceCalculator
                camperSlug={slug}
                depositAmount={2000}
                seasons={effectiveSeasons}
                availableExtras={effectiveExtras}
                initialFrom={initialFrom}
                initialTo={initialTo}
                maxGuests={camper.specs?.seats || (slug === 'space' ? 2 : 3)}
                seasonsV2={seasonsV2}
                seasonPeriods={seasonPeriods}
                durationDiscounts={durationDiscounts}
                camperBasePrice={basePrice}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* ── Lightbox ── */}
      <CamperLightboxModal
        isOpen={lightboxOpen}
        images={content.galleryImages}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIdx) => setLightboxIndex(newIdx)}
      />

      {/* ── Sticky Bottom Bar (mobile) ── */}
      <CamperStickyBookingBar
        slug={slug}
        pricePerNight={basePrice}
        initialFrom={initialFrom}
        initialTo={initialTo}
        onScrollToCalculator={handleScrollToBooking}
      />

      <style jsx>{`
        :global(.camper-detail-main) {
          padding-top: 72px;
        }
        :global(.camper-detail-fallback) {
          height: 50vh;
        }

        /* ── Page Root ── */
        .camper-detail-v2 {
          background-color: #0b0c0e;
          color: #f5f5f7;
          min-height: 100vh;
          padding-bottom: calc(100px + env(safe-area-inset-bottom, 16px));
          overflow-x: hidden;
          transition: background-color 240ms ease, color 240ms ease;
        }

        /* ── Header ── */
        .camper-header {
          max-width: 1280px;
          margin: 0 auto;
          padding: 24px 24px 28px;
        }
        .header-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        :global(.back-link) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: rgba(255, 255, 255, 0.45);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        :global(.back-link:hover) {
          color: #ffffff;
        }
        .header-hero-block {
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 28px;
        }
        .hero-eyebrow {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #e6ca65;
          margin-bottom: 8px;
        }
        .camper-title {
          font-size: 56px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #ffffff;
          line-height: 1;
          margin: 0 0 10px;
          text-transform: uppercase;
        }
        .camper-tagline {
          font-size: 16px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.55;
          margin: 0;
          max-width: 680px;
        }

        /* ── Two-Column Layout ── */
        .page-layout {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 40px;
          align-items: start;
        }
        .content-column {
          min-width: 0;
        }

        /* ── Mobile Calculator (hidden on desktop) ── */
        .mobile-calculator-section {
          display: none;
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
        .calculator-card {
          background: #131518;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6);
        }

        /* ── Sidebar ── */
        .booking-sidebar {
          position: sticky;
          top: 96px;
          align-self: start;
        }
        .sidebar-card {
          position: relative;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #131518;
          padding: 24px;
          overflow: hidden;
          transition: background-color 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
        }
        .sidebar-card-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #e6ca65, rgba(230, 202, 101, 0.2));
        }
        .sidebar-trust-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.55);
          margin-bottom: 16px;
          margin-top: 4px;
        }
        :global(.sidebar-icon-muted) {
          color: rgba(255, 255, 255, 0.45);
        }
        .sidebar-price-block {
          display: flex;
          align-items: baseline;
          margin-bottom: 20px;
        }
        .sidebar-price-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
          text-transform: lowercase;
          margin-right: 9px;
        }
        .sidebar-price-amount {
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
        }
        .sidebar-price-unit {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.55);
          margin-left: 2.5px;
        }
        :global(.sidebar-cta-btn) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 20px;
          border-radius: 14px;
          background: #e6ca65;
          color: #0b0c0e;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 6px 20px rgba(230, 202, 101, 0.25);
        }
        :global(.sidebar-cta-btn:hover) {
          background: #d8bc59;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(230, 202, 101, 0.35);
        }
        .sidebar-separator {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 20px 0;
        }
        .sidebar-includes {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sidebar-include-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.45;
        }
        :global(.sidebar-check-icon) {
          color: #e6ca65;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .sidebar-response-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 20px;
        }
        .sidebar-calculator-wrap {
          background: #0b0c0e;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.4);
        }

        /* ── Light Mode Support ── */
        :global(html[data-theme="light"]) .camper-detail-v2 {
          background-color: #F2F0EC;
          color: #1F1B17;
        }
        :global(html[data-theme="light"]) :global(.back-link) {
          color: #5A5248;
        }
        :global(html[data-theme="light"]) :global(.back-link:hover) {
          color: #1F1B17;
        }
        :global(html[data-theme="light"]) .header-hero-block {
          border-bottom-color: #EAE5DD;
        }
        :global(html[data-theme="light"]) .hero-eyebrow {
          color: #B8893A;
          font-weight: 800;
        }
        :global(html[data-theme="light"]) .camper-title {
          color: #1F1B17;
        }
        :global(html[data-theme="light"]) .camper-tagline {
          color: #5A5248;
        }
        :global(html[data-theme="light"]) .section-divider-title {
          color: #1A1714;
        }
        :global(html[data-theme="light"]) .section-divider-line {
          background: linear-gradient(90deg, #D9D1C4, #EAE5DD);
        }
        :global(html[data-theme="light"]) .calculator-card {
          background: #FFFFFF;
          box-shadow: 0 12px 32px rgba(40, 30, 15, 0.08);
        }
        :global(html[data-theme="light"]) .sidebar-card {
          background: #FFFFFF;
          border-color: #EAE5DD;
          box-shadow: 0 8px 30px rgba(40, 30, 15, 0.08);
        }
        :global(html[data-theme="light"]) .sidebar-card-accent {
          background: linear-gradient(90deg, #CCA053, #E8D6B2);
        }
        :global(html[data-theme="light"]) .sidebar-trust-row {
          color: #5A5248;
        }
        :global(html[data-theme="light"]) :global(.sidebar-icon-muted) {
          color: #857B6F;
        }
        :global(html[data-theme="light"]) .sidebar-price-label,
        :global(html[data-theme="light"]) .sidebar-price-unit {
          color: #5A5248;
        }
        :global(html[data-theme="light"]) .sidebar-price-amount {
          color: #1F1B17;
        }
        :global(html[data-theme="light"]) :global(.sidebar-cta-btn) {
          background: #1A1714;
          color: #F6EBD3;
          box-shadow: 0 6px 20px rgba(26, 23, 20, 0.16);
        }
        :global(html[data-theme="light"]) :global(.sidebar-cta-btn:hover) {
          background: #2E2822;
          box-shadow: 0 8px 24px rgba(26, 23, 20, 0.24);
        }
        :global(html[data-theme="light"]) .sidebar-separator {
          background: #EAE5DD;
        }
        :global(html[data-theme="light"]) .sidebar-include-item {
          color: #3E3730;
        }
        :global(html[data-theme="light"]) :global(.sidebar-check-icon) {
          color: #B8893A;
        }
        :global(html[data-theme="light"]) .sidebar-response-row {
          color: #5A5248;
        }
        :global(html[data-theme="light"]) .sidebar-calculator-wrap {
          background: #FAF8F5;
          box-shadow: 0 4px 16px rgba(40, 30, 15, 0.05);
        }

        /* ── Responsive ── */
        @media (max-width: 860px) {
          .page-layout {
            grid-template-columns: 1fr;
            gap: 0;
          }
          .booking-sidebar {
            display: none;
          }
          .mobile-calculator-section {
            display: block;
            margin-bottom: 48px;
          }
          .camper-title {
            font-size: 40px;
          }
        }

        @media (max-width: 640px) {
          .camper-header {
            padding: 16px 16px 20px;
          }
          .header-top-row {
            margin-bottom: 20px;
          }
          .camper-title {
            font-size: 32px;
          }
          .camper-tagline {
            font-size: 14px;
          }
          .page-layout {
            padding: 0 16px;
          }
        }
      `}</style>
    </div>
  )
}
