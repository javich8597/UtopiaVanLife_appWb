'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Users,
  BedDouble,
  Droplets,
  Zap,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Compass,
  MapPin
} from 'lucide-react'
import PriceCalculator from '@/components/booking/PriceCalculator'
import MapboxExperiences from '@/components/map/MapboxExperiences'
import CamperModelSwitcher from '@/components/campers/CamperModelSwitcher'
import CamperBentoGallery from '@/components/campers/CamperBentoGallery'
import CamperLightboxModal, { LightboxImage } from '@/components/campers/CamperLightboxModal'
import CamperEditorialPillars, { EditorialPillarsData } from '@/components/campers/CamperEditorialPillars'
import CamperVideoShowcase, { CamperVideoTour } from '@/components/campers/CamperVideoShowcase'
import CamperSpecsAccordion, { CamperAccordionGroup } from '@/components/campers/CamperSpecsAccordion'
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

// Curated assets & metadata
const CURATED_MEDIA: Record<string, {
  bentoImages: LightboxImage[]
  pillars: EditorialPillarsData
  videos: CamperVideoTour[]
  tagline: string
  passengersBadge: string
  bedBadge: string
  showerBadge: string
  techBadge: string
}> = {
  space: {
    tagline: 'Salón panorámico de 7m², cama elevable motorizada y distribución open concept.',
    passengersBadge: '4 Viaje / 4 Descanso',
    bedBadge: 'Cama Eléctrica King Size',
    showerBadge: 'Ducha Interior Caliente + WC',
    techBadge: 'Victron Pro: 540Ah Litio + 400W Solar',
    bentoImages: [
      { src: '/images/campers/space/exterior/space-vehicle-hero-lanzarote.webp', tag: 'Exterior SPACE en tres cuartos frente a la costa' },
      { src: '/images/campers/space/interior/space-dining-lounge-frontview.jpg', tag: 'Salón comedor para 4 con luz natural' },
      { src: '/images/campers/space/interior/space-electric-drop-down-bed.jpg', tag: 'Cama eléctrica suspendida en techo' },
      { src: '/images/campers/space/interior/space-cinema-projector-lounge.jpg', tag: 'Cine con pantalla motorizada y proyector HD' },
      { src: '/images/campers/space/interior/space-kitchen-counter-cabin.jpg', tag: 'Cocina nórdica & fuegos gas' },
      { src: '/images/campers/space/interior/space-bathroom-shower.webp', tag: 'Cabina de ducha interior de agua caliente' }
    ],
    pillars: {
      heroBadge: '02 · SPACE',
      heroTitle: 'Salón panorámico, cama elevable y vida interior amplia.',
      heroDesc: 'Diseñada para nómadas que priorizan el espacio habitable interior. En solo 5,99 metros de longitud, ofrece la sensación de amplitud de una suite de diseño.',
      heroImg: '/images/campers/space/interior/space-lounge-spacious-daylight.jpg',
      card1: {
        num: '01',
        category: 'ARQUITECTURA',
        title: 'Open Concept & Cama Elevable',
        desc: 'Sin necesidad de montar ni desmontar tu cama a diario. Con un botón desciende silenciosamente desde el techo, dejando libre un salón diáfano durante el día.',
        img: '/images/campers/space/interior/space-dining-lounge-frontview.jpg',
        footerLabel: 'Altura interior: 1.95m',
        footerVal: 'Optimizado 100%'
      },
      card2: {
        num: '02',
        category: 'MATERIALES',
        title: 'Madera Nórdica & Texturas Soft',
        desc: 'Superficies táctiles de abedul fenólico con tratamiento antibacteriano, tapicería resistente al agua de mar y bisagras con cierre amortiguado en cada armario.',
        img: '/images/campers/space/interior/space-kitchen-counter-cabin.jpg',
        footerLabel: 'Aislamiento Kaiflex 20mm',
        footerVal: 'Tacto acústico'
      },
      card3: {
        num: '03',
        category: 'EXPERIENCIA',
        title: 'Cine Nómada & Conexión Total',
        desc: 'Disfruta de tus películas favoritas en una pantalla desplegable de 50" con proyector de alta definición y sistema de sonido envolvente bajo las estrellas de Tramuntana.',
        img: '/images/campers/space/interior/space-cinema-projector-lounge.jpg',
        footerLabel: 'Proyector HD + HDMI',
        footerVal: 'Atmósfera única'
      }
    },
    videos: [
      {
        src: '/videos/campers/space/space-complete-tour.mp4',
        tag: 'Tour Completo',
        title: 'Recorrido por el habitáculo SPACE',
        desc: 'Conoce en 45 segundos la fluidez de paso y luminosidad interior.'
      },
      {
        src: '/videos/campers/space/space-kitchen-counter-tour.mp4',
        tag: 'Cocina & Almacenaje',
        title: 'Detalle de cocina y muebles soft-close',
        desc: 'Organización inteligente de menaje y cajoneras de alta resistencia.'
      },
      {
        src: '/videos/campers/space/space-shower-cabin-tour.mp4',
        tag: 'Cabina de Ducha',
        title: 'Espacio de baño independiente',
        desc: 'Mampara retráctil estanca, espejo retroiluminado y agua caliente instantánea.'
      }
    ]
  },
  neo: {
    tagline: 'Garaje interior para bicicletas, agilidad en curvas de montaña y máxima discreción.',
    passengersBadge: '2-3 Viaje / 2-3 Descanso',
    bedBadge: 'Cama Fija 192×130 cm + Auxiliar',
    showerBadge: 'Ducha Interior + Garaje XXL',
    techBadge: 'Victron Pro: 540Ah Litio + 400W Solar',
    bentoImages: [
      { src: '/images/campers/neo/exterior/neo-exterior-front-three-quarter.jpg', tag: 'Exterior de la camper NEO en tres cuartos' },
      { src: '/images/campers/neo/interior/neo-dining-room-daylight.jpg', tag: 'Salón comedor de la NEO con luz natural' },
      { src: '/images/campers/neo/interior/neo-interior-hero-anthracite.webp', tag: 'Interior antracita de la NEO' },
      { src: '/images/campers/neo/details/neo-garage-bike-storage.jpg', tag: 'Garaje trasero de la NEO con bicicletas' },
      { src: '/images/campers/neo/details/solar-tech.webp', tag: 'Conectividad Starlink & Placa Solar en la NEO' },
      { src: '/images/campers/neo/interior/neo-bathroom-shower.webp', tag: 'Baño con ducha interior de la NEO' }
    ],
    pillars: {
      heroBadge: '01 · NEO',
      heroTitle: 'Aventura sin límites, garaje integrado para bicis y espíritu nómada.',
      heroDesc: 'Pensada para ciclistas, escaladores y parejas aventureras. Permite llevar dos bicicletas de carretera o montaña aseguradas en el interior sin estorbar el espacio habitable.',
      heroImg: '/images/campers/neo/details/neo-garage-bike-storage.jpg',
      card1: {
        num: '01',
        category: 'ARQUITECTURA',
        title: 'Garaje XXL Interior',
        desc: 'Almacenaje protegido bajo la cama con anclajes rápidos, toma de corriente de 12V/220V para cargar e-bikes y espacio para material deportivo de gran volumen.',
        img: '/images/campers/neo/details/neo-garage-bike-storage.jpg',
        footerLabel: 'Capacidad maletero: 2.230L',
        footerVal: '2 Bicis seguras'
      },
      card2: {
        num: '02',
        category: 'MATERIALES',
        title: 'Acabados Antracita & Aluminio',
        desc: 'Estética deportiva con materiales resistentes a rozaduras, panelado oscuro mate y perfilería de aluminio aeronáutico que garantiza ligereza y cero ruidos en marcha.',
        img: '/images/campers/neo/interior/neo-interior-hero-anthracite.webp',
        footerLabel: 'Aislamiento Kaiflex 20mm',
        footerVal: 'Acabado deportivo'
      },
      card3: {
        num: '03',
        category: 'EXPERIENCIA',
        title: 'Conexión Starlink & Libertad Total',
        desc: 'Trabaja en remoto desde calas remotas o puertos de montaña con cobertura satelital de alta velocidad gracias a la antena Starlink integrada de bajo consumo.',
        img: '/images/campers/neo/details/solar-tech.webp',
        footerLabel: 'Internet Satelital 200 Mbps',
        footerVal: 'Off-grid total'
      }
    },
    videos: [
      {
        src: '/videos/campers/neo/neo-interior-highlight-tour.mp4',
        tag: 'Tour Habitáculo',
        title: 'Habitáculo ágil de la NEO',
        desc: 'Distribución eficiente y compacta para aventureros.'
      },
      {
        src: '/videos/campers/neo/neo-garage-bike-loading.mp4',
        tag: 'Garaje Deportivo',
        title: 'Carga de bicicletas en garaje trasero',
        desc: 'Anclajes seguros y espacio para 2 bicis bajo la cama.'
      },
      {
        src: '/videos/campers/neo/neo-kitchen-details.mp4',
        tag: 'Cocina Compacta',
        title: 'Cocina compacta y optimizada',
        desc: 'Nevera de compresor, fregadero de diseño y fogones a gas.'
      }
    ]
  }
}

// 5 Accordion groups with deep specs
const ACCORDION_GROUPS: CamperAccordionGroup[] = [
  {
    id: 'acc-1',
    title: 'Autonomía Eléctrica & Energía Solar Off-Grid',
    subtitle: 'Batería LiFePO4, placas solares monocristalinas e inversor Victron',
    badge: '100% Autosuficiente',
    iconName: 'zap',
    items: [
      { label: 'Capacidad Batería', val: 'Litio LiFePO4 150Ah', desc: 'Hasta 4-5 días de autonomía sin arrancar motor ni conectar a camping.' },
      { label: 'Generación Solar', val: 'Placa Solar 320W', desc: 'Regulador MPPT Victron SmartSolar con monitoreo Bluetooth desde tu móvil.' },
      { label: 'Inversor 220V', val: 'Onda Pura 1200W', desc: 'Carga portátil, dron, cámara réflex o cafetera sin dañar ningún dispositivo.' },
      { label: 'Conectores Habitáculo', val: '4x USB-C PD 65W + 3x 220V', desc: 'Tomas situadas en cabecero de cama, salón y zona de trabajo nómada.' }
    ]
  },
  {
    id: 'acc-2',
    title: 'Agua, Baño & Ducha Interior con Agua Caliente',
    subtitle: 'Depósito de 100L limpias, caldera Truma Combi y WC extraíble Dometic',
    badge: 'Ducha Interior & Exterior',
    iconName: 'droplets',
    items: [
      { label: 'Aguas Limpias', val: '100 Litros', desc: 'Llenado exterior con llave, manguera extensible incluida y sensor de nivel porcentual.' },
      { label: 'Aguas Grises', val: '90 Litros con Válvula Eléctrica', desc: 'Descarga sencilla y limpia accionada desde el interior o el arcón técnico.' },
      { label: 'Boiler de Agua Caliente', val: 'Truma Combi 4 (10 Litros a 60°C)', desc: 'Agua caliente lista en 15 minutos tanto para la ducha interior como para la exterior.' },
      { label: 'Inodoro Químico', val: 'Dometic 976 con Tanque 19L', desc: 'Completamente higiénico, sellado hermético y pastillas ecológicas incluidas.' }
    ]
  },
  {
    id: 'acc-3',
    title: 'Climatización & Aislamiento Cuatro Estaciones',
    subtitle: 'Calefacción diésel estacionaria Webasto y claraboya MaxxFan Deluxe con mando',
    badge: 'Confort 365 días',
    iconName: 'sun',
    items: [
      { label: 'Calefacción Estacionaria', val: 'Webasto Air Top 2000 STC', desc: 'Conexión directa al depósito de combustible diésel. Termostato digital de precisión.' },
      { label: 'Ventilación Techo', val: 'MaxxFan Deluxe 10 Velocidades', desc: 'Permite ventilación incluso lloviendo gracias a su cúpula protectora patentada.' },
      { label: 'Aislamiento Térmico', val: 'Kaiflex Elastómero 20mm', desc: 'Cero puentes térmicos en chasis, suelo y techo para evitar condensación interior.' },
      { label: 'Mosquiteras & Oscurecedores', val: 'Remis Integrados en Cabina', desc: 'Oscuridad y privacidad total en 10 segundos sin ventosas ni cortinas incómodas.' }
    ]
  },
  {
    id: 'acc-4',
    title: 'Equipamiento Premium Incluido Sin Coste Oculto',
    subtitle: 'Menaje completo de cocina, sillas nómadas de exterior, mesa de picnic y ropa de cama',
    badge: 'Listo para viajar',
    iconName: 'utensils',
    items: [
      { label: 'Mobiliario Exterior', val: 'Mesa de camping + Sillas ergonómicas', desc: 'Mesa enrollable de aluminio ligero y sillas plegables con respaldo alto.' },
      { label: 'Menaje Nómada Gourmet', val: 'Batería de cocina + Cafetera Italiana', desc: 'Sartenes antiadherentes, vajilla de melamina irrompible, copas y cuchillos de chef.' },
      { label: 'Kit de Descanso & Baño', val: 'Ropa de cama 100% Algodón + Toallas', desc: 'Almohadas viscoelásticas, edredón nórdico y toallas de secado rápido.' },
      { label: 'Aventura & Snorkel', val: '2 Máscaras de Snorkel', desc: 'Preparadas para explorar calas cristalinas y fondos marinos de la isla.' }
    ]
  },
  {
    id: 'acc-5',
    title: 'Seguro Todo Riesgo, Asistencia 24/7 en Mallorca & Fianza',
    subtitle: 'Tranquilidad absoluta para descubrir la isla sin imprevistos',
    badge: 'Kilometraje Ilimitado',
    iconName: 'shield',
    items: [
      { label: 'Seguro a Todo Riesgo', val: 'Franquicia de 800€ (Retención temporal)', desc: 'No es un cobro, solo una retención de autorización en tarjeta liberada tras la devolución.' },
      { label: 'Asistencia en Carretera', val: '24 horas / 365 días en toda Mallorca', desc: 'Vehículo de sustitución o remolque inmediato ante cualquier pinchazo o imprevisto.' },
      { label: 'Kilometraje Ilimitado', val: '0€ por kilómetro extra', desc: 'Recorre calas del norte, la Sierra de Tramuntana o el sureste con total libertad.' },
      { label: 'Entrega Personalizada', val: 'Aeropuerto de Palma o Base Central', desc: 'Explicación exhaustiva del vehículo y entrega sin esperas ni mostradores.' }
    ]
  }
]

export default function CamperDetailClient({
  camper,
  seasons,
  extras,
  initialFrom,
  initialTo,
  seasonsV2,
  seasonPeriods,
  durationDiscounts
}: Props) {
  const t = useTranslations('CamperDetail')
  const locale = useLocale()
  const bookingSectionRef = useRef<HTMLDivElement>(null)

  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const slug = camper.slug?.toLowerCase() || 'space'
  const curated = CURATED_MEDIA[slug] || CURATED_MEDIA.space

  // Merge any dynamic DB images if present
  const bentoImages: LightboxImage[] = camper.images && camper.images.length >= 6
    ? camper.images.slice(0, 6).map((imgUrl: string, idx: number) => ({
      src: imgUrl,
      tag: curated.bentoImages[idx]?.tag || `Detalle ${idx + 1} de la camper`
    }))
    : curated.bentoImages

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
    <div className="camper-detail-boutique">
      {/* Top Header Hero Bar */}
      <section className="camper-header-section">
        <div className="header-breadcrumbs-row">
          <div className="meta-left">
            <Link href={`/${locale}/campers`} className="back-link">
              <ChevronRight size={14} className="rotate-180" />
              <span>Volver a Campers</span>
            </Link>
            <div className="gps-pill">
              <span className="gps-live-dot" />
              <span>39.6952° N, 3.0176° E · MALLORCA</span>
            </div>
          </div>

          <CamperModelSwitcher currentSlug={slug} />
        </div>

        <div className="header-hero-content">
          <div className="hero-text-block">
            <div className="hero-eyebrow">
              <span>UTOPIA VAN LIFE · COLECCIÓN EXCLUSIVA</span>
              <span className="dot-divider">•</span>
              <span className="category-accent">{slug === 'space' ? 'MÁXIMO ESPACIO & CONFORT' : 'DEPORTE & MOVILIDAD TOTAL'}</span>
            </div>
            <h1 className="camper-main-title">{camper.name || slug.toUpperCase()}</h1>
            <p className="camper-main-tagline">{curated.tagline}</p>
          </div>

          {/* Quick Spec Pills */}
          <div className="quick-spec-pills-wrap">
            <div className="glass-spec-pill">
              <Users size={15} className="pill-icon" />
              <span>{curated.passengersBadge}</span>
            </div>
            <div className="glass-spec-pill">
              <BedDouble size={15} className="pill-icon" />
              <span>{curated.bedBadge}</span>
            </div>
            <div className="glass-spec-pill">
              <Droplets size={15} className="pill-icon" />
              <span>{curated.showerBadge}</span>
            </div>
            <div className="glass-spec-pill">
              <Zap size={15} className="pill-icon" />
              <span>{curated.techBadge}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="boutique-container">
        {/* Section 1: Asymmetric Bento Grid Gallery */}
        <CamperBentoGallery
          images={bentoImages}
          onOpenLightbox={handleOpenLightbox}
        />

        {/* Section 2: Editorial 3-Pillars Section */}
        <CamperEditorialPillars data={curated.pillars} />

        {/* Section 3: Micro-Video Tour Interactive Showcase */}
        <CamperVideoShowcase videos={curated.videos} />

        {/* Section 4: Deep Specs & Lifestyle Accordions */}
        <CamperSpecsAccordion groups={ACCORDION_GROUPS} />

        {/* Section 5: Experience Map */}
        <section className="experience-map-section" aria-label="Mapa de spots recomendados">
          <div className="section-header-compact">
            <span className="gold-accent-dot" />
            <h2 className="section-title-compact">Mapa de Experiencias en Mallorca</h2>
          </div>
          <p className="section-desc-compact">
            Descubre las calas escondidas, puntos de pernocta recomendados y servicios para camper en la isla.
          </p>
          <div className="map-embed-wrapper">
            <MapboxExperiences />
          </div>
        </section>

        {/* Section 6: Dedicated Booking & Pricing Block */}
        <section ref={bookingSectionRef} id="booking-calculator-section" className="booking-anchor-section" aria-label="Calculadora de precios y reserva">
          <div className="booking-layout-grid">
            <div className="booking-info-card">
              <div className="holo-wizard-banner">
                <div>
                  <span className="wizard-eyebrow">ASISTENTE DE RESERVA ONLINE</span>
                  <h3 className="wizard-title">Wizard Holo-Van en 5 Pasos Guiados</h3>
                  <p className="wizard-desc">
                    Configura tu viaje paso a paso: selecciona extras (bicicletas, tablas de paddle surf, kit snorkel), elige la política de cancelación y asegura tu camper al instante.
                  </p>
                </div>
                <Link
                  href={`/${locale}/reserva/${slug}${initialFrom && initialTo ? `?from=${initialFrom}&to=${initialTo}` : ''}`}
                  className="wizard-cta-btn"
                >
                  <Sparkles size={16} />
                  <span>Empezar Reserva Asistida</span>
                  <ChevronRight size={16} />
                </Link>
              </div>

              <div className="rental-recap-box">
                <h4 className="recap-title">Todo lo que incluye tu alquiler:</h4>
                <ul className="recap-bullets">
                  <li>✓ Seguro a todo riesgo con asistencia en carretera 24h</li>
                  <li>✓ Kilometraje ilimitado para descubrir toda Mallorca</li>
                  <li>✓ Ropa de cama 100% algodón, toallas y menaje nómada gourmet</li>
                  <li>✓ Mobiliario exterior: mesa enrollable de aluminio y sillas plegables</li>
                  <li>✓ Dos máscaras de snorkel para disfrutar de las aguas cristalinas</li>
                  <li>✓ Check-in personalizado y soporte en ruta durante todo tu viaje</li>
                </ul>
              </div>
            </div>

            <div className="calculator-wrapper-card">
              <PriceCalculator
                camperSlug={slug}
                depositAmount={camper.deposit_amount || 1000}
                seasons={effectiveSeasons}
                availableExtras={effectiveExtras}
                initialFrom={initialFrom}
                initialTo={initialTo}
                maxGuests={camper.specs?.seats || (slug === 'space' ? 4 : 3)}
                seasonsV2={seasonsV2}
                seasonPeriods={seasonPeriods}
                durationDiscounts={durationDiscounts}
                camperBasePrice={basePrice}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <CamperLightboxModal
        isOpen={lightboxOpen}
        images={bentoImages}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIdx) => setLightboxIndex(newIdx)}
      />

      {/* Fixed Sticky Booking Bar Docked at Bottom */}
      <CamperStickyBookingBar
        slug={slug}
        pricePerNight={basePrice}
        initialFrom={initialFrom}
        initialTo={initialTo}
        onScrollToCalculator={handleScrollToBooking}
      />

      <style jsx>{`
        .camper-detail-boutique {
          background-color: #0b0c0e;
          color: #f5f5f7;
          min-height: 100vh;
          padding-bottom: 96px;
          overflow-x: hidden;
        }
        .camper-header-section {
          max-width: 1280px;
          margin: 0 auto;
          padding: 32px 24px 24px 24px;
        }
        .header-breadcrumbs-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .meta-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .back-link:hover {
          color: #ffffff;
        }
        .gps-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 4px 12px;
          border-radius: 9999px;
          font-family: monospace;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.55);
        }
        .gps-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #34d399;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        .header-hero-content {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 32px;
        }
        .hero-text-block {
          max-width: 680px;
        }
        .hero-eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #e6ca65;
          margin-bottom: 8px;
        }
        .dot-divider {
          color: rgba(255, 255, 255, 0.2);
        }
        .category-accent {
          color: rgba(255, 255, 255, 0.5);
        }
        .camper-main-title {
          font-size: 56px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #ffffff;
          line-height: 1;
          margin: 0 0 12px 0;
          text-transform: uppercase;
        }
        .camper-main-tagline {
          font-size: 17px;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.5;
          margin: 0;
        }
        .quick-spec-pills-wrap {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          max-width: 440px;
          justify-content: flex-end;
        }
        .glass-spec-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(19, 21, 24, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 8px 14px;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          white-space: nowrap;
        }
        :global(.pill-icon) {
          color: #e6ca65;
        }
        .boutique-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .experience-map-section {
          width: 100%;
          margin-bottom: 56px;
        }
        .section-header-compact {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .gold-accent-dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #e6ca65;
          display: inline-block;
        }
        .section-title-compact {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }
        .section-desc-compact {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
          margin: 0 0 16px 0;
        }
        .map-embed-wrapper {
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          height: 440px;
          background: #131518;
        }
        .booking-anchor-section {
          width: 100%;
          padding-top: 24px;
          margin-bottom: 40px;
        }
        .booking-layout-grid {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 28px;
          align-items: start;
        }
        .booking-info-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .holo-wizard-banner {
          background: linear-gradient(135deg, rgba(230, 202, 101, 0.12) 0%, rgba(19, 21, 24, 0.95) 100%);
          border: 1px solid rgba(230, 202, 101, 0.3);
          border-radius: 24px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .wizard-eyebrow {
          font-family: monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: #e6ca65;
          text-transform: uppercase;
          display: block;
          margin-bottom: 6px;
        }
        .wizard-title {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 8px 0;
        }
        .wizard-desc {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.6;
          margin: 0;
        }
        .wizard-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 22px;
          border-radius: 9999px;
          background: #e6ca65;
          color: #0b0c0e;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-decoration: none;
          align-self: flex-start;
          transition: all 0.25s ease;
          box-shadow: 0 4px 14px rgba(230, 202, 101, 0.2);
        }
        .wizard-cta-btn:hover {
          background: #d8bc59;
          transform: translateY(-1px);
        }
        .rental-recap-box {
          background: #131518;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 28px;
        }
        .recap-title {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 14px 0;
        }
        .recap-bullets {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
        }
        .calculator-wrapper-card {
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.7);
        }

        /* Responsive Breakpoints per AGENTS.md */
        @media (max-width: 860px) {
          .header-hero-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
          .quick-spec-pills-wrap {
            max-width: 100%;
            justify-content: flex-start;
          }
          .camper-main-title {
            font-size: 40px;
          }
          .booking-layout-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .camper-header-section {
            padding: 20px 16px 16px 16px;
          }
          .header-breadcrumbs-row {
            margin-bottom: 20px;
          }
          .gps-pill {
            display: none;
          }
          .camper-main-title {
            font-size: 32px;
          }
          .camper-main-tagline {
            font-size: 14px;
          }
          .boutique-container {
            padding: 0 16px;
          }
          .map-embed-wrapper {
            height: 320px;
            border-radius: 18px;
          }
          .holo-wizard-banner {
            padding: 20px;
          }
          .rental-recap-box {
            padding: 20px;
          }
          .wizard-cta-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
