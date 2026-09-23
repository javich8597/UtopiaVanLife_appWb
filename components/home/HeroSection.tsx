'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { Calendar as CalendarIcon, Users, Search, Sparkles, Shield, Compass, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import BookingCalendar from '@/components/booking/BookingCalendar'
import { DaySlot } from '@/lib/pricing/engine'
import { motion, AnimatePresence } from 'framer-motion'
import { parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function HeroSection() {
  const t = useTranslations('HomePage.Hero')
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [pax, setPax] = useState(2)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cerrar el popover al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
    }
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCalendarOpen])

  // Centrar la barra de búsqueda y el calendario en el viewport al abrir para verlo sin escrolear
  useEffect(() => {
    if (isCalendarOpen && containerRef.current) {
      requestAnimationFrame(() => {
        containerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        })
      })
    }
  }, [isCalendarOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (startDate) params.set('from', startDate)
    if (endDate) params.set('to', endDate)
    params.set('pax', String(Math.min(3, Math.max(1, pax))))

    if (startDate && endDate) {
      router.push(`/reserva/neo?${params.toString()}`)
    } else {
      const target = document.getElementById('showcase') || document.getElementById('campers')
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' })
      } else {
        router.push(`/reserva/neo?${params.toString()}`)
      }
    }
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
      {/* Cinematic Video Background with Multi-Layer Gradient */}
      <div className="hero__video-wrap">
        <video
          className="hero__video"
          autoPlay
          muted
          loop
          playsInline
          poster="/images/camper-interior-sunset.jpg"
          preload="auto"
          suppressHydrationWarning
        >
          <source src="/videos/hero/nomade-hero-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />
          <source src="/videos/video_noche_min.mp4" type="video/mp4" />
        </video>
        <div className="hero__overlay" />
      </div>

      {/* Editorial Content */}
      <div className="hero__content">
        <div className="hero__eyebrow-pill">
          <Sparkles size={12} style={{ color: '#E5C07B' }} />
          <span>FLOTA 100% OFF-GRID · MALLORCA</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero__title text-display">
          Tu Utopía<br />
          <em className="hero__title-accent">te espera</em>
        </h1>

        {/* Subtitle */}
        <p className="hero__subtitle">
          {t('subtitle')}
        </p>

        {/* Search Bar Container with Dark Glassmorphism */}
        <div className="hero__search-container" ref={containerRef}>
          <form className="hero__searchbar glass-dark" onSubmit={handleSearch}>

            {/* Selector Fechas: Salida */}
            <div
              className={`hero__field hero__field--clickable ${isCalendarOpen ? 'hero__field--active' : ''}`}
              onClick={() => setIsCalendarOpen(true)}
            >
              <span className="hero__field-label">
                <CalendarIcon size={13} style={{ color: '#E5C07B' }} />
                {t('salida')}
              </span>
              <div className="hero__field-display">
                <span className={!startDate ? 'hero__field-placeholder' : 'hero__field-value'}>
                  {formatDisplayDate(startDate) || 'Fecha de salida'}
                </span>
              </div>
            </div>

            <div className="hero__separator" />

            {/* Selector Fechas: Llegada */}
            <div
              className={`hero__field hero__field--clickable ${isCalendarOpen ? 'hero__field--active' : ''}`}
              onClick={() => setIsCalendarOpen(true)}
            >
              <span className="hero__field-label">
                <CalendarIcon size={13} style={{ color: '#E5C07B' }} />
                {t('llegada')}
              </span>
              <div className="hero__field-display">
                <span className={!endDate ? 'hero__field-placeholder' : 'hero__field-value'}>
                  {formatDisplayDate(endDate) || 'Fecha de llegada'}
                </span>
              </div>
            </div>

            <div className="hero__separator" />

            {/* Selector de Viajeros (1 a 3) */}
            <div className="hero__field">
              <span className="hero__field-label">
                <Users size={13} style={{ color: '#E5C07B' }} />
                {t('viajeros')}
                <span className="hero__pax-limit">Máx. 3</span>
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

            {/* Botón Buscar */}
            <button type="submit" className="hero__search-btn btn btn-lg">
              <Search size={17} />
              <span>{t('buscar')}</span>
            </button>
          </form>

          {/* Popover flotante del calendario */}
          <AnimatePresence>
            {isCalendarOpen && (
              <motion.div
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
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Micro-guarantees badges */}
          <div className="hero__guarantees">
            <span className="hero__guarantee-item">
              <Compass size={13} style={{ color: '#E5C07B' }} />
              {t('guarantee1')}
            </span>
            <span className="hero__guarantee-dot">•</span>
            <span className="hero__guarantee-item">
              <Sun size={13} style={{ color: '#E5C07B' }} />
              {t('guarantee2')}
            </span>
            <span className="hero__guarantee-dot">•</span>
            <span className="hero__guarantee-item">
              <Shield size={13} style={{ color: '#E5C07B' }} />
              {t('guarantee3')}
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hero__scroll-indicator">
          <span>{t('explorar')}</span>
          <div className="hero__scroll-line" />
        </div>
      </div>

      <style jsx>{`
        .hero {
          position: relative;
          min-height: 100svh;
          height: auto;
          padding: 100px 0 70px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero__video-wrap {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }
        .hero__video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          filter: saturate(1.08) brightness(0.95);
        }
        .hero__overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(11, 13, 17, 0.65) 0%,
            rgba(11, 13, 17, 0.4) 40%,
            rgba(11, 13, 17, 0.95) 100%
          );
        }
        @media (prefers-reduced-motion: reduce) {
          .hero__video {
            display: none;
          }
          .hero__video-wrap {
            background-image: url('/images/camper-interior-sunset.jpg');
            background-size: cover;
            background-position: center;
          }
        }
        .hero__content {
          position: relative;
          z-index: 1;
          text-align: center;
          color: white;
          padding: 0 var(--space-4);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-5);
          animation: fadeInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
          width: 100%;
          max-width: 860px;
        }

        /* Floating Eyebrow Pill */
        .hero__eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 18px;
          border-radius: var(--radius-full);
          background: rgba(15, 17, 21, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(229, 192, 123, 0.25);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
          font-size: 0.76rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #E5C07B;
        }

        /* Main Headline */
        .hero__title {
          font-size: clamp(2.8rem, 6.5vw, 5.2rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.05;
          color: white;
          text-shadow: 0 2px 24px rgba(0, 0, 0, 0.55);
          text-wrap: balance;
        }
        .hero__title em,
        .hero__title-accent {
          font-style: italic;
          color: #E5C07B;
          font-weight: 300;
          text-shadow: 0 0 28px rgba(229, 192, 123, 0.4);
        }
        .hero__subtitle {
          font-size: clamp(1rem, 2vw, 1.18rem);
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.68;
          max-width: 580px;
          text-shadow: 0 1px 12px rgba(0, 0, 0, 0.4);
          text-wrap: balance;
        }

        /* Search Container & Popover */
        .hero__search-container {
          position: relative;
          width: 100%;
          max-width: 800px;
          margin-top: var(--space-4);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }
        .hero__calendar-popover {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          translate: -50% 0;
          z-index: 100;
          width: 350px;
          max-width: calc(100vw - 32px);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-lg);
          box-sizing: border-box;
          background: #14171D;
        }

        /* Search bar (Dark Glassmorphic) */
        .glass-dark {
          background: rgba(15, 17, 21, 0.78);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.04);
        }
        .hero__searchbar {
          display: flex;
          align-items: center;
          border-radius: var(--radius-full);
          padding: 8px 8px 8px 24px;
          gap: var(--space-2);
          width: 100%;
          text-align: left;
          transition: all var(--transition-base);
        }
        .hero__searchbar:hover {
          border-color: rgba(229, 192, 123, 0.3);
          box-shadow: 0 24px 56px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(229, 192, 123, 0.15);
        }
        .hero__field {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 130px;
          padding: 6px 10px;
          border-radius: var(--radius-lg);
          transition: background var(--transition-fast);
        }
        .hero__field--clickable {
          cursor: pointer;
        }
        .hero__field--clickable:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .hero__field--active {
          background: rgba(229, 192, 123, 0.12);
        }
        .hero__field-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.65);
        }
        .hero__pax-limit {
          font-size: 0.65rem;
          font-weight: 600;
          color: #E5C07B;
          background: rgba(229, 192, 123, 0.15);
          padding: 1px 6px;
          border-radius: var(--radius-full);
          text-transform: none;
          letter-spacing: normal;
        }
        .hero__field-display {
          font-size: 0.94rem;
          font-weight: 500;
        }
        .hero__field-value {
          color: #FFFFFF;
          font-weight: 600;
        }
        .hero__field-placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        .hero__separator {
          width: 1px;
          height: 34px;
          background: rgba(255, 255, 255, 0.08);
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
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          background: rgba(255, 255, 255, 0.06);
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .hero__pax-btn:hover:not(:disabled) {
          border-color: #E5C07B;
          background: #E5C07B;
          color: #0B0D11;
        }
        .hero__pax-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        .hero__pax-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }
        .hero__pax-num {
          font-size: 0.95rem;
          font-weight: 600;
          color: #FFFFFF;
          min-width: 18px;
          text-align: center;
        }
        .hero__search-btn {
          border-radius: var(--radius-full);
          flex-shrink: 0;
          gap: 8px;
          padding: 14px 26px;
          font-size: 0.92rem;
          background: linear-gradient(135deg, #E5C07B 0%, #D4AF37 100%);
          color: #0B0D11;
          font-weight: 700;
          border: none;
          box-shadow: 0 4px 18px rgba(229, 192, 123, 0.35);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }
        .hero__search-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(229, 192, 123, 0.5);
        }
        .hero__search-btn:active {
          transform: scale(0.97);
        }

        /* Micro-guarantees */
        .hero__guarantees {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.8rem;
          font-weight: 500;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
          flex-wrap: wrap;
        }
        .hero__guarantee-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .hero__guarantee-dot {
          opacity: 0.4;
          font-size: 0.7rem;
        }

        /* Scroll indicator */
        .hero__scroll-indicator {
          position: absolute;
          bottom: var(--space-6);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0;
          animation: fadeIn 1s 1.5s both;
        }
        .hero__scroll-line {
          width: 1px;
          height: 36px;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.6), transparent);
          animation: scrollLine 2s ease-in-out infinite;
        }
        @keyframes scrollLine {
          0%, 100% { height: 36px; opacity: 0.4; }
          50% { height: 52px; opacity: 1; }
        }

        @media (max-width: 768px) {
          .hero {
            padding: 90px var(--space-4) 60px;
          }
          .hero__searchbar {
            flex-direction: column;
            padding: var(--space-4);
            gap: var(--space-3);
            border-radius: var(--radius-xl);
            align-items: stretch;
          }
          .hero__separator { display: none; }
          .hero__search-btn { width: 100%; border-radius: var(--radius-full); }
          .hero__field { min-width: unset; }
          .hero__calendar-popover {
            position: fixed;
            top: 50%;
            bottom: auto;
            left: 50%;
            right: auto;
            transform: translate(-50%, -50%) !important;
            max-width: 310px;
            width: 90vw;
            z-index: 1000;
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
