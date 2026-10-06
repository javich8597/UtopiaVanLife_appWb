'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { Calendar as CalendarIcon, Users, Search, Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'
import BookingCalendar from '@/components/booking/BookingCalendar'
import { DaySlot } from '@/lib/pricing/engine'
import { motion, AnimatePresence } from 'framer-motion'
import { parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'

const HERO_PHOTOS = [
  {
    src: '/images/campers/space/interior/space-dining-lounge-frontview.webp',
    alt: 'Utopia Space Salón comedor convertible y acabados en madera',
  },
  {
    src: '/images/camper-interior-sunset.jpg',
    alt: 'Interior camper con luz cálida del atardecer',
  },
  {
    src: '/images/campers/space/interior/space-saloon-rear-doors-open.webp',
    alt: 'Utopia Space Salón abierto a la naturaleza',
  },
  {
    src: '/images/campers/neo/interior/neo-dining-room-daylight.webp',
    alt: 'Utopia Neo Salón con luz natural y cocina completa',
  },
  {
    src: '/images/campers/space/interior/space-cinema-projector-lounge.webp',
    alt: 'Proyector de cine nocturno en salón camper',
  },
  {
    src: '/images/campers/neo/interior/neo-bed-view-outdoors.webp',
    alt: 'Vistas exteriores desde la cama camper Utopia Neo',
  },
  {
    src: '/images/hero/hero-breakfast-sea-horizon.webp',
    alt: 'Desayuno nómada con horizonte mediterráneo',
  },
  {
    src: '/images/campers/space/interior/space-king-bed-prepared.webp',
    alt: 'Cama suspendida king size con sábanas de lino',
  },
]

export default function HeroSection() {
  const t = useTranslations('HomePage.Hero')
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [pax, setPax] = useState(2)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const calendarPopoverRef = useRef<HTMLDivElement>(null)
  const salidaRef = useRef<HTMLDivElement>(null)
  const llegadaRef = useRef<HTMLDivElement>(null)

  // Carousel rotativo de imágenes del habitáculo interior
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePhotoIndex(prev => (prev + 1) % HERO_PHOTOS.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  // Cerrar el calendario al hacer clic en cualquier punto fuera del recuadro del calendario (a los lados incluidos)
  useEffect(() => {
    if (!isCalendarOpen) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      // Si el clic fue dentro del recuadro del calendario, permanece abierto
      if (calendarPopoverRef.current && calendarPopoverRef.current.contains(target)) {
        return
      }
      // Si el clic fue en los campos disparadores de fecha, no cerrar (tienen su propio toggle)
      if (salidaRef.current && salidaRef.current.contains(target)) {
        return
      }
      if (llegadaRef.current && llegadaRef.current.contains(target)) {
        return
      }
      // Cualquier otro clic (a los lados del recuadro, fondo, etc.) cierra el calendario
      setIsCalendarOpen(false)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCalendarOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCalendarOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (startDate) params.set('from', startDate)
    if (endDate) params.set('to', endDate)
    params.set('pax', String(Math.min(3, Math.max(1, pax))))
    router.push(`/reservar?${params.toString()}`)
  }

  const handleDatesChange = (start: string, _startSlot: DaySlot, end: string, _endSlot: DaySlot) => {
    setStartDate(start)
    setEndDate(end)
    if (start && end) {
      setTimeout(() => {
        setIsCalendarOpen(false)
      }, 200)
    }
  }

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return null
    try {
      return format(parseISO(dateStr), "d 'de' MMM", { locale: es })
    } catch {
      return dateStr
    }
  }

  return (
    <section className="hero">
      {/* Fondo Split 50/50: Vídeo a la izquierda + Recopilatorio de fotos pasando a la derecha */}
      <div className="hero__split-bg" aria-hidden="true">
        {/* Mitad izquierda: Vídeo de la carretera */}
        <div className="hero__split-col hero__split-col--left">
          <video
            className="hero__split-media hero__split-video"
            autoPlay
            muted
            loop
            playsInline
            poster="/images/campers/neo/exterior/neo-exterior-front-three-quarter.webp"
            suppressHydrationWarning
          >
            <source src="/videos/hero/nomade-hero-road.mp4" type="video/mp4" media="(min-width: 768px)" />
            <source src="/videos/hero/nomade-hero-mobile.mp4" type="video/mp4" media="(max-width: 767px)" />
            <source src="/videos/hero-bg.mov" type="video/mp4" />
          </video>
        </div>

        {/* Línea divisoria central sutil */}
        <div className="hero__split-divider" />

        {/* Mitad derecha: Carrusel de fotos de la web con fundido suave */}
        <div className="hero__split-col hero__split-col--right">
          {HERO_PHOTOS.map((photo, idx) => (
            <div
              key={photo.src}
              className={`hero__photo-slide ${idx === activePhotoIndex ? 'hero__photo-slide--active' : ''}`}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                className="hero__split-media hero__photo-img"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))}

          {/* Indicadores de fotos en la esquina inferior derecha */}
          <div className="hero__photo-indicators" aria-label="Fotos del interior">
            {HERO_PHOTOS.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setActivePhotoIndex(dotIdx)}
                className={`hero__photo-dot ${dotIdx === activePhotoIndex ? 'hero__photo-dot--active' : ''}`}
                aria-label={`Ver foto ${dotIdx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Overlay degradado cinematográfico unificado */}
        <div className="hero__split-overlay" />
      </div>

      {/* Contenido Editorial Central */}
      <div className="hero__content">
        {/* Coordenadas / Eyebrow */}
        <div className="hero__coordinates">
          <span>{t('eyebrow') || 'MALLORCA · 39.6953° N'}</span>
        </div>

        {/* Gran Titular Icónico UTOPIA / VAN LIFE */}
        <h1 className="hero__title">
          <span className="hero__title-line hero__title-line--cream">UTOPIA</span>
          <span className="hero__title-line hero__title-line--gold">VAN LIFE</span>
        </h1>

        {/* Subtítulo poético de la dualidad exterior / interior */}
        <p className="hero__subtitle">
          {t('tagline') || 'Dos formas de entrar en la aventura. El camino fuera. Tu refugio dentro.'}
        </p>

        {/* Barra de Selección Flotante Glassmorphic */}
        <div className="hero__search-container" ref={containerRef}>
          <form className="hero__searchbar" onSubmit={handleSearch}>

            {/* Contenedor relativo de Fechas y Popover */}
            <div className="hero__dates-wrapper">
              <div className="hero__dates-group">
                {/* Selector Fechas: Salida */}
                <div
                  ref={salidaRef}
                  className={`hero__field hero__field--clickable ${isCalendarOpen ? 'hero__field--active' : ''}`}
                  onClick={() => setIsCalendarOpen(prev => !prev)}
                  role="button"
                  tabIndex={0}
                  aria-label="Seleccionar fecha de salida"
                >
                  <span className="hero__field-label">
                    <CalendarIcon size={13} className="hero__field-icon" />
                    {t('salida')}
                  </span>
                  <div className="hero__field-display">
                    <span className={!startDate ? 'hero__field-placeholder' : 'hero__field-value'}>
                      {formatDisplayDate(startDate) || 'Fecha de salida'}
                    </span>
                  </div>
                </div>

                <div className="hero__separator hero__separator--dates" />

                {/* Selector Fechas: Llegada */}
                <div
                  ref={llegadaRef}
                  className={`hero__field hero__field--clickable ${isCalendarOpen ? 'hero__field--active' : ''}`}
                  onClick={() => setIsCalendarOpen(prev => !prev)}
                  role="button"
                  tabIndex={0}
                  aria-label="Seleccionar fecha de llegada"
                >
                  <span className="hero__field-label">
                    <CalendarIcon size={13} className="hero__field-icon" />
                    {t('llegada')}
                  </span>
                  <div className="hero__field-display">
                    <span className={!endDate ? 'hero__field-placeholder' : 'hero__field-value'}>
                      {formatDisplayDate(endDate) || 'Fecha de llegada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Popover flotante del calendario */}
              <AnimatePresence>
                {isCalendarOpen && (
                  <motion.div
                    ref={calendarPopoverRef}
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="hero__calendar-popover"
                  >
                    <BookingCalendar
                      startDate={startDate}
                      endDate={endDate}
                      showSlots={false}
                      variant="hero"
                      onChange={handleDatesChange}
                      onClose={() => setIsCalendarOpen(false)}
                      showDoneButton={false}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hero__separator" />

            {/* Selector de Viajeros (1 a 3) */}
            <div className="hero__field">
              <span className="hero__field-label">
                <Users size={13} className="hero__field-icon" />
                {t('viajeros')}
              </span>
              <div className="hero__pax-control">
                <button
                  type="button"
                  onClick={() => setPax(p => Math.max(1, p - 1))}
                  disabled={pax <= 1}
                  className="hero__pax-btn"
                  aria-label="Menos viajeros"
                >
                  −
                </button>
                <span className="hero__pax-num">{pax}</span>
                <button
                  type="button"
                  onClick={() => setPax(p => Math.min(3, p + 1))}
                  disabled={pax >= 3}
                  className="hero__pax-btn"
                  aria-label="Más viajeros (máximo 3)"
                >
                  +
                </button>
              </div>
            </div>

            {/* Botón Buscar mi Utopia con el mismo color dorado que Reservar en la barra superior */}
            <button type="submit" className="hero__search-btn">
              <Search size={16} />
              <span>{t('buscar') || 'Buscar mi Utopia'}</span>
            </button>
          </form>

          {/* Badges de micro-garantías bajo la barra de búsqueda */}
          <div className="hero__guarantees">
            <span className="hero__guarantee-item">
              <span className="hero__guarantee-icon">◎</span>
              <span>{t('guarantee1')}</span>
            </span>
            <span className="hero__guarantee-dot">•</span>
            <span className="hero__guarantee-item">
              <span className="hero__guarantee-icon">✳</span>
              <span>{t('guarantee2')}</span>
            </span>
            <span className="hero__guarantee-dot">•</span>
            <span className="hero__guarantee-item">
              <Shield size={13} className="hero__guarantee-icon" />
              <span>{t('guarantee3')}</span>
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hero {
          position: relative;
          min-height: 100svh;
          height: auto;
          padding: 100px 0 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* Split Background (50% Izquierda Vídeo, 50% Derecha Carrusel de Fotos) */
        .hero__split-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: flex;
          overflow: hidden;
        }
        .hero__split-col {
          position: relative;
          width: 50%;
          height: 100%;
          overflow: hidden;
        }
        .hero__split-col--left {
          background: #0b0c0e;
        }
        .hero__split-col--right {
          background: #141715;
        }
        .hero__split-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }
        .hero__split-video {
          filter: saturate(1.06) brightness(0.94);
        }
        .hero__split-divider {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 1px;
          background: rgba(255, 255, 255, 0.14);
          z-index: 2;
          pointer-events: none;
        }

        /* Diapositivas de fotos con crossfade suave y Ken Burns */
        .hero__photo-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1200ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .hero__photo-slide--active {
          opacity: 1;
          pointer-events: auto;
        }
        .hero__photo-img {
          transform: scale(1);
          transition: transform 6000ms cubic-bezier(0.25, 1, 0.5, 1);
        }
        .hero__photo-slide--active .hero__photo-img {
          transform: scale(1.05);
        }

        /* Indicadores de fotos discretos */
        .hero__photo-indicators {
          position: absolute;
          bottom: 24px;
          right: 28px;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          background: rgba(11, 12, 14, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .hero__photo-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 200ms ease;
        }
        .hero__photo-dot--active {
          width: 16px;
          border-radius: var(--radius-full);
          background: #CCA053;
        }

        /* Degradado de contraste unificado */
        .hero__split-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: linear-gradient(
            to bottom,
            rgba(11, 12, 14, 0.62) 0%,
            rgba(11, 12, 14, 0.22) 28%,
            rgba(11, 12, 14, 0.35) 62%,
            rgba(11, 12, 14, 0.82) 100%
          );
        }

        /* Contenedor de contenido editorial */
        .hero__content {
          position: relative;
          z-index: 2;
          text-align: center;
          color: white;
          padding: 0 var(--space-4);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-4);
          width: 100%;
          max-width: 900px;
          animation: fadeInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Coordenadas */
        .hero__coordinates {
          display: inline-flex;
          align-items: center;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #CCA053;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
          margin-bottom: -4px;
        }

        /* Gran Titular UTOPIA / VAN LIFE */
        .hero__title {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin: 0;
          line-height: 0.92;
        }
        .hero__title-line {
          font-family: var(--font-display);
          font-size: clamp(3.4rem, 8.8vw, 6.6rem);
          font-weight: 800;
          letter-spacing: -0.015em;
          text-transform: uppercase;
          display: block;
          line-height: 0.94;
        }
        .hero__title-line--cream {
          color: #F5EFEB;
          text-shadow: 0 4px 30px rgba(0, 0, 0, 0.6);
        }
        .hero__title-line--gold {
          color: #CCA053;
          text-shadow: 0 4px 30px rgba(0, 0, 0, 0.6);
        }

        /* Subtítulo poético */
        .hero__subtitle {
          font-size: clamp(1rem, 2vw, 1.18rem);
          color: rgba(255, 255, 255, 0.92);
          line-height: 1.6;
          max-width: 600px;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.6);
          text-wrap: balance;
          margin-top: -4px;
        }

        /* Contenedor de la barra de búsqueda */
        .hero__search-container {
          position: relative;
          width: 100%;
          max-width: 820px;
          margin-top: var(--space-3);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }

        /* Barra de búsqueda (Glassmorphism Oscuro Premium como en el diseño) */
        .hero__searchbar {
          position: relative;
          display: flex;
          align-items: center;
          border-radius: var(--radius-full);
          padding: 8px 10px 8px 24px;
          gap: var(--space-2);
          width: 100%;
          text-align: left;
          background: rgba(14, 16, 15, 0.82);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transition: border-color var(--transition-base), box-shadow var(--transition-base);
        }
        .hero__searchbar:hover {
          border-color: rgba(204, 160, 83, 0.45);
          box-shadow: 0 24px 56px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .hero__dates-wrapper {
          display: contents;
        }

        .hero__dates-group {
          display: contents;
        }

        .hero__field {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 130px;
          padding: 6px 12px;
          border-radius: var(--radius-lg);
          transition: background var(--transition-fast);
        }
        .hero__field--clickable {
          cursor: pointer;
        }
        .hero__field--clickable:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .hero__field--active {
          background: rgba(204, 160, 83, 0.12);
        }
        .hero__field-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.65);
        }
        :global(.hero__field-icon) {
          color: #CCA053;
        }
        .hero__field-display {
          font-size: 0.94rem;
          font-weight: 500;
        }
        .hero__field-value {
          color: #F5EFEB;
          font-weight: 600;
        }
        .hero__field-placeholder {
          color: rgba(255, 255, 255, 0.55);
        }
        .hero__separator {
          width: 1px;
          height: 34px;
          background: rgba(255, 255, 255, 0.15);
          flex-shrink: 0;
        }
        .hero__pax-control {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .hero__pax-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 600;
          color: #F5EFEB;
          background: rgba(255, 255, 255, 0.08);
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .hero__pax-btn:hover:not(:disabled) {
          border-color: #CCA053;
          background: #CCA053;
          color: #111311;
        }
        .hero__pax-btn:active:not(:disabled) {
          transform: scale(0.93);
        }
        .hero__pax-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .hero__pax-num {
          font-size: 0.95rem;
          font-weight: 700;
          color: #F5EFEB;
          min-width: 18px;
          text-align: center;
        }

        /* Botón Buscar mi Utopia: color dorado idéntico a Reservar en la barra superior */
        .hero__search-btn {
          background-color: #CCA053;
          color: #111311;
          border: none;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px 26px;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: 0 6px 20px rgba(204, 160, 83, 0.35);
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
                      background-color 160ms ease,
                      box-shadow 160ms ease;
          white-space: nowrap;
        }
        .hero__search-btn:hover {
          background-color: #d8ad5e;
          transform: translateY(-1px);
          box-shadow: 0 8px 26px rgba(204, 160, 83, 0.45);
        }
        .hero__search-btn:active {
          transform: scale(0.97);
        }

        /* Calendario popover */
        .hero__calendar-popover {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          translate: -50% 0;
          z-index: 100;
          width: auto;
          max-width: calc(100vw - 32px);
          box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15);
          border-radius: var(--radius-lg);
          box-sizing: border-box;
        }

        /* Micro-garantías */
        .hero__guarantees {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.8rem;
          font-weight: 500;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
          flex-wrap: wrap;
        }
        .hero__guarantee-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .hero__guarantee-icon {
          color: #CCA053;
          font-size: 0.85rem;
        }
        .hero__guarantee-dot {
          opacity: 0.4;
          font-size: 0.7rem;
        }

        /* Responsive */
        @media (max-width: 860px) {
          .hero {
            padding: 95px var(--space-4) 40px;
          }
          .hero__title-line {
            font-size: clamp(2.8rem, 11vw, 4.4rem);
          }
          .hero__subtitle {
            font-size: 0.98rem;
          }
        }

        @media (max-width: 768px) {
          /* En móvil solo mostrar el vídeo de fondo a pantalla completa */
          .hero__split-col--left {
            width: 100% !important;
          }
          .hero__split-col--right {
            display: none !important;
          }
          .hero__split-divider {
            display: none !important;
          }
          .hero__photo-indicators {
            display: none !important;
          }

          .hero__dates-wrapper {
            position: relative;
            width: 100%;
            z-index: 40;
          }

          /* Fechas de salida y llegada en 1 fila 2 columnas fijas y simétricas */
          .hero__dates-group {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            width: 100%;
            box-sizing: border-box;
          }
          .hero__separator--dates {
            display: none;
          }

          .hero__searchbar {
            flex-direction: column;
            padding: var(--space-4);
            gap: var(--space-3);
            border-radius: var(--radius-xl);
            align-items: stretch;
          }
          .hero__separator {
            display: none;
          }
          .hero__field {
            min-width: 0;
            padding: 8px 10px;
            background: rgba(255, 255, 255, 0.04);
            border-radius: var(--radius-md);
            box-sizing: border-box;
          }
          .hero__field-display {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .hero__search-btn {
            width: 100%;
            border-radius: var(--radius-full);
            padding: 14px;
          }
          .hero__calendar-popover {
            position: absolute;
            top: calc(100% + 8px);
            left: 50%;
            right: auto;
            bottom: auto;
            translate: -50% 0;
            max-width: 330px;
            width: 100%;
            max-height: none;
            overflow: visible;
            z-index: 100;
          }
          .hero__guarantees {
            flex-direction: column;
            gap: 6px;
            font-size: 0.75rem;
          }
          .hero__guarantee-dot {
            display: none;
          }
        }
      `}</style>
    </section>
  )
}
