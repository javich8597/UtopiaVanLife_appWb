'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  Sparkles,
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
    tagline: 'Salón panorámico de 7m², cama elevable motorizada y distribución open concept.',
    pills: [
      { icon: 'users', label: '2 Viaje / 2 Descanso' },
      { icon: 'bed', label: 'Cama Eléctrica King Size' },
      { icon: 'droplets', label: 'Ducha Interior + WC' },
      { icon: 'zap', label: '540Ah Litio + 400W Solar' },
    ],
    galleryImages: [
      { src: '/images/campers/space/exterior/space-vehicle-hero-lanzarote.webp', tag: 'Exterior SPACE' },
      { src: '/images/campers/space/interior/space-dining-lounge-frontview.jpg', tag: 'Salón comedor con luz natural' },
      { src: '/images/campers/space/interior/space-electric-drop-down-bed.jpg', tag: 'Cama eléctrica suspendida' },
      { src: '/images/campers/space/interior/space-cinema-projector-lounge.jpg', tag: 'Cine con proyector HD' },
      { src: '/images/campers/space/interior/space-kitchen-counter-cabin.jpg', tag: 'Cocina nórdica' },
      { src: '/images/campers/space/interior/space-bathroom-shower.webp', tag: 'Ducha interior de agua caliente' },
    ],
    description: [
      'SPACE redefine el confort nómada: un salón panorámico de 7m² con distribución open concept que transforma una furgoneta camper en una auténtica suite de diseño móvil.',
      'La cama elevable eléctrica desciende silenciosamente desde el techo con solo pulsar un botón, dejando libre un espacio diáfano durante el día para cocinar, trabajar o simplemente disfrutar de la luz que entra por las ventanas panorámicas.',
      'Cada material ha sido elegido con intención: abedul fenólico con tratamiento antibacteriano, tapicería resistente al agua de mar y bisagras con cierre amortiguado en cada armario.',
      'El sistema eléctrico Victron Pro con 540Ah de litio LiFePO4 y 400W de paneles solares monocristalinos garantiza hasta 5 días de autonomía total sin necesidad de conexión externa.',
      'Incluye un cine nómada con pantalla motorizada de 50" y proyector HD, perfecto para disfrutar de tus películas favoritas bajo las estrellas de la Sierra de Tramuntana.',
      'La cabina de ducha interior con agua caliente instantánea, inodoro Dometic sellado herméticamente y claraboya de ventilación completan una experiencia de higiene y privacidad sin compromisos.',
    ],
    descriptionInlineImage: {
      src: '/images/campers/space/interior/space-lounge-spacious-daylight.jpg',
      alt: 'Salón panorámico SPACE con luz natural',
    },
    floorplanDay: '/images/campers/space/exterior/space-vehicle-dimensions-top.webp',
    floorplanNight: '/images/campers/space/exterior/space-vehicle-dimensions-side.webp',
    features: [
      { icon: 'battery', label: 'Batería LiFePO4', value: '540Ah Litio · 4-5 días autonomía' },
      { icon: 'sun', label: 'Paneles Solares', value: '400W Monocristalinos + MPPT Victron' },
      { icon: 'zap', label: 'Inversor 220V', value: 'Onda Pura 1200W' },
      { icon: 'plug', label: 'Conectores', value: '4x USB-C PD 65W + 3x 220V' },
      { icon: 'droplets', label: 'Aguas Limpias', value: '100 Litros + sensor de nivel' },
      { icon: 'thermometer', label: 'Boiler', value: 'Truma Combi 4 · 10L a 60°C' },
      { icon: 'wind', label: 'Calefacción', value: 'Webasto Air Top 2000 STC' },
      { icon: 'snowflake', label: 'Ventilación', value: 'MaxxFan Deluxe 10 velocidades' },
      { icon: 'shield', label: 'Aislamiento', value: 'Kaiflex Elastómero 20mm' },
      { icon: 'tv', label: 'Cine Nómada', value: 'Proyector HD + Pantalla 50"' },
      { icon: 'utensils', label: 'Cocina', value: 'Fogones gas + nevera compresor' },
      { icon: 'bed', label: 'Cama Eléctrica', value: 'King Size motorizada · colchón 15cm' },
      { icon: 'droplets', label: 'Ducha Interior', value: 'Agua caliente instantánea' },
      { icon: 'gauge', label: 'Aguas Grises', value: '90L con válvula eléctrica' },
      { icon: 'shield', label: 'WC', value: 'Dometic 976 · tanque 19L sellado' },
      { icon: 'folder', label: 'Oscurecedores', value: 'Remis integrados sin ventosas' },
    ],
    included: [
      'Seguro a todo riesgo con asistencia 24h',
      '150 km/día incluidos · ilimitado opcional',
      'Ropa de cama completa y toallas',
      'Menaje nómada gourmet completo',
      '2 sillas de camping',
      'Check-in personalizado en aeropuerto',
      'Soporte en ruta durante todo el viaje',
    ],
  },
  neo: {
    tagline: 'Garaje interior para bicicletas, agilidad en curvas de montaña y máxima discreción.',
    pills: [
      { icon: 'users', label: '2-3 Viaje / 2-3 Descanso' },
      { icon: 'bed', label: 'Cama Fija 192×130 cm' },
      { icon: 'droplets', label: 'Ducha Interior + Garaje XXL' },
      { icon: 'zap', label: '540Ah Litio + 400W Solar' },
    ],
    galleryImages: [
      { src: '/images/campers/neo/exterior/neo-exterior-front-three-quarter.jpg', tag: 'Exterior NEO' },
      { src: '/images/campers/neo/interior/neo-dining-room-daylight.jpg', tag: 'Salón comedor NEO' },
      { src: '/images/campers/neo/interior/neo-interior-hero-anthracite.webp', tag: 'Interior antracita' },
      { src: '/images/campers/neo/details/neo-garage-bike-storage.jpg', tag: 'Garaje trasero con bicis' },
      { src: '/images/campers/neo/details/solar-tech.webp', tag: 'Placa solar 400W' },
      { src: '/images/campers/neo/interior/neo-bathroom-shower.webp', tag: 'Baño con ducha interior' },
    ],
    description: [
      'NEO es la camper pensada para ciclistas, escaladores y parejas aventureras que priorizan la movilidad y el deporte sin renunciar al confort.',
      'Su garaje interior XXL permite llevar dos bicicletas de carretera o montaña aseguradas con anclajes rápidos, junto con tomas de 12V y 220V para cargar e-bikes durante la noche.',
      'Con acabados antracita y perfilería de aluminio aeronáutico, la estética deportiva se combina con materiales resistentes a rozaduras y panelado oscuro mate que minimiza el ruido en marcha.',
      'Compacta por fuera, sorprendentemente espaciosa por dentro: la distribución eficiente maximiza cada centímetro con almacenaje inteligente bajo la cama fija de 192×130 cm.',
      'La separación total de cabina garantiza privacidad y aislamiento térmico, mientras que la calefacción estacionaria Webasto mantiene el habitáculo a temperatura óptima incluso en invierno.',
    ],
    descriptionInlineImage: {
      src: '/images/campers/neo/details/neo-garage-bike-storage.jpg',
      alt: 'Garaje trasero NEO con bicicletas',
    },
    floorplanDay: '/images/campers/neo/blueprints/day-layout.webp',
    floorplanNight: '/images/campers/neo/blueprints/night-layout.webp',
    features: [
      { icon: 'battery', label: 'Batería LiFePO4', value: '540Ah Litio · 4-5 días autonomía' },
      { icon: 'sun', label: 'Paneles Solares', value: '400W Monocristalinos + MPPT Victron' },
      { icon: 'zap', label: 'Inversor 220V', value: 'Onda Pura 1200W' },
      { icon: 'plug', label: 'Conectores', value: '4x USB-C PD 65W + 3x 220V' },
      { icon: 'droplets', label: 'Aguas Limpias', value: '100 Litros + sensor de nivel' },
      { icon: 'thermometer', label: 'Boiler', value: 'Truma Combi 4 · 10L a 60°C' },
      { icon: 'wind', label: 'Calefacción', value: 'Webasto Air Top 2000 STC' },
      { icon: 'snowflake', label: 'Ventilación', value: 'MaxxFan Deluxe 10 velocidades' },
      { icon: 'shield', label: 'Aislamiento', value: 'Kaiflex Elastómero 20mm' },
      { icon: 'utensils', label: 'Cocina Compacta', value: 'Fogones gas + nevera compresor' },
      { icon: 'bed', label: 'Cama Fija', value: '192×130 cm · colchón 15cm' },
      { icon: 'droplets', label: 'Ducha Interior', value: 'Agua caliente instantánea' },
      { icon: 'gauge', label: 'Garaje XXL', value: '2.230L · 2 bicis + material' },
      { icon: 'shield', label: 'WC', value: 'Dometic 976 · tanque 19L sellado' },
      { icon: 'folder', label: 'Separación Cabina', value: 'Aislamiento térmico + privacidad' },
    ],
    included: [
      'Seguro a todo riesgo con asistencia 24h',
      '150 km/día incluidos · ilimitado opcional',
      'Ropa de cama completa y toallas',
      'Menaje nómada gourmet completo',
      '2 sillas de camping',
      'Check-in personalizado en aeropuerto',
      'Soporte en ruta durante todo el viaje',
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
                depositAmount={camper.deposit_amount || 1000}
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
              <span className="sidebar-price-label">Desde</span>
              <span className="sidebar-price-amount">{basePrice}€</span>
              <span className="sidebar-price-unit">/ noche</span>
            </div>

            <Link
              href={`/${locale}/reserva/${slug}${initialFrom && initialTo ? `?from=${initialFrom}&to=${initialTo}` : ''}`}
              className="sidebar-cta-btn"
            >
              <Sparkles size={16} />
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
                depositAmount={camper.deposit_amount || 1000}
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
        /* ── Page Root ── */
        .camper-detail-v2 {
          background-color: #0b0c0e;
          color: #f5f5f7;
          min-height: 100vh;
          padding-bottom: 96px;
          overflow-x: hidden;
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
          font-weight: 300;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.5;
          margin: 0;
          max-width: 620px;
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
          background: #ffffff;
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
          color: rgba(255, 255, 255, 0.45);
          margin-bottom: 16px;
          margin-top: 4px;
        }
        :global(.sidebar-icon-muted) {
          color: rgba(255, 255, 255, 0.35);
        }
        .sidebar-price-block {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 20px;
        }
        .sidebar-price-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
        }
        .sidebar-price-amount {
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
        }
        .sidebar-price-unit {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
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
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.4;
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
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 20px;
        }
        .sidebar-calculator-wrap {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.4);
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
