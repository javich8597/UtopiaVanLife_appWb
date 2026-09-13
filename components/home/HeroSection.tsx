'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { Calendar as CalendarIcon, Users, Search, Sparkles, Shield, Compass, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import BookingCalendar from '@/components/booking/BookingCalendar'
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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (startDate) params.set('from', startDate)
        if (endDate) params.set('to', endDate)
        params.set('pax', String(Math.min(3, Math.max(1, pax))))
        router.push(`/campers?${params.toString()}`)
    }

    const handleDatesChange = (start: string, end: string) => {
        setStartDate(start)
        setEndDate(end)
        if (start && end) {
            setIsCalendarOpen(false)
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
                    poster="/images/campers/neo/neo-ext.png"
                    suppressHydrationWarning
                >
                    <source src="/videos/hero-bg.mov" type="video/mp4" />
                </video>
                <div className="hero__overlay" />
            </div>

            {/* Editorial Content */}
            <div className="hero__content">
                {/* Floating Eyebrow Pill */}
                <div className="hero__eyebrow-pill">
                    <Sparkles size={13} className="hero__eyebrow-icon" />
                    <span>{t('eyebrow')}</span>
                </div>

                {/* Main Headline */}
                <h1 className="hero__title text-display">
                    Tu Utopía<br />
                    <em>te espera</em>
                </h1>

                {/* Subtitle */}
                <p className="hero__subtitle">
                    {t('subtitle')}
                </p>

                {/* Search Bar Container with Pro Max Glassmorphism */}
                <div className="hero__search-container" ref={containerRef}>
                    <form className="hero__searchbar glass-pro" onSubmit={handleSearch}>
                        
                        {/* Selector Fechas: Llegada */}
                        <div
                            className={`hero__field hero__field--clickable ${isCalendarOpen ? 'hero__field--active' : ''}`}
                            onClick={() => setIsCalendarOpen(true)}
                        >
                            <span className="hero__field-label">
                                <CalendarIcon size={13} className="text-sand" />
                                {t('llegada')}
                            </span>
                            <div className="hero__field-display">
                                <span className={!startDate ? 'hero__field-placeholder' : 'hero__field-value'}>
                                    {formatDisplayDate(startDate) || t('llegada')}
                                </span>
                            </div>
                        </div>

                        <div className="hero__separator" />

                        {/* Selector Fechas: Salida */}
                        <div
                            className={`hero__field hero__field--clickable ${isCalendarOpen ? 'hero__field--active' : ''}`}
                            onClick={() => setIsCalendarOpen(true)}
                        >
                            <span className="hero__field-label">
                                <CalendarIcon size={13} className="text-sand" />
                                {t('salida')}
                            </span>
                            <div className="hero__field-display">
                                <span className={!endDate ? 'hero__field-placeholder' : 'hero__field-value'}>
                                    {formatDisplayDate(endDate) || t('salida')}
                                </span>
                            </div>
                        </div>

                        <div className="hero__separator" />

                        {/* Selector de Viajeros (1 a 3) */}
                        <div className="hero__field">
                            <span className="hero__field-label">
                                <Users size={13} className="text-sand" />
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
                        <button type="submit" className="hero__search-btn btn btn-forest btn-lg">
                            <Search size={17} />
                            <span>{t('buscar')}</span>
                        </button>
                    </form>

                    {/* Popover flotante del calendario */}
                    <AnimatePresence>
                        {isCalendarOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                className="hero__calendar-popover"
                            >
                                <BookingCalendar
                                    startDate={startDate}
                                    endDate={endDate}
                                    onChange={handleDatesChange}
                                    onClose={() => setIsCalendarOpen(false)}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Micro-guarantees badges */}
                    <div className="hero__guarantees">
                        <span className="hero__guarantee-item">
                            <Compass size={13} />
                            {t('guarantee1')}
                        </span>
                        <span className="hero__guarantee-dot">•</span>
                        <span className="hero__guarantee-item">
                            <Sun size={13} />
                            {t('guarantee2')}
                        </span>
                        <span className="hero__guarantee-dot">•</span>
                        <span className="hero__guarantee-item">
                            <Shield size={13} />
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
            rgba(20, 24, 20, 0.45) 0%,
            rgba(20, 24, 20, 0.32) 40%,
            rgba(20, 24, 20, 0.65) 100%
          );
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
          padding: 6px 16px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          font-size: 0.76rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--cream);
        }
        .hero__eyebrow-icon {
          color: var(--sand);
        }

        /* Main Headline */
        .hero__title {
          font-size: clamp(3rem, 7.5vw, 5.8rem);
          font-weight: 300;
          letter-spacing: -0.03em;
          line-height: 0.96;
          color: white;
          text-shadow: 0 2px 24px rgba(0, 0, 0, 0.35);
          text-wrap: balance;
        }
        .hero__title em {
          font-style: italic;
          color: var(--sand);
          font-weight: 300;
        }
        .hero__subtitle {
          font-size: clamp(1rem, 2vw, 1.18rem);
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.68;
          max-width: 580px;
          text-shadow: 0 1px 12px rgba(0, 0, 0, 0.3);
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
          top: calc(100% - 18px);
          left: 50%;
          transform: translateX(-50%) !important;
          z-index: 100;
          width: max-content;
          max-width: calc(100vw - 32px);
          box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
        }

        /* Search bar (Glassmorphism Pro Max) */
        .glass-pro {
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.4);
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
          box-shadow: 0 20px 48px -10px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.6);
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
          background: rgba(45, 58, 45, 0.05);
        }
        .hero__field--active {
          background: rgba(45, 58, 45, 0.08);
        }
        .hero__field-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gray-600);
        }
        .hero__pax-limit {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--forest-green);
          background: rgba(45, 58, 45, 0.08);
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
          color: var(--black-matte);
          font-weight: 600;
        }
        .hero__field-placeholder {
          color: var(--gray-400);
        }
        .hero__separator {
          width: 1px;
          height: 34px;
          background: var(--gray-200);
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
          border: 1px solid var(--gray-200);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 600;
          color: var(--black-matte);
          background: white;
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .hero__pax-btn:hover:not(:disabled) {
          border-color: var(--forest-green);
          background: var(--forest-green);
          color: white;
        }
        .hero__pax-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .hero__pax-num {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--black-matte);
          min-width: 18px;
          text-align: center;
        }
        .hero__search-btn {
          border-radius: var(--radius-full);
          flex-shrink: 0;
          gap: 8px;
          padding: 14px 26px;
          font-size: 0.92rem;
          box-shadow: 0 6px 18px rgba(45, 58, 45, 0.28);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }
        .hero__search-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(45, 58, 45, 0.35);
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
