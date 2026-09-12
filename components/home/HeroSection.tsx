'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { Calendar as CalendarIcon, Users, Search, ChevronDown } from 'lucide-react'
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
            {/* Video Background */}
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

            {/* Content */}
            <div className="hero__content">
                <div className="hero__eyebrow text-label">{t('eyebrow')}</div>
                <h1 className="hero__title text-display">
                    Tu Utopía<br />
                    <em>te espera</em>
                </h1>
                <p className="hero__subtitle">
                    {t('subtitle')}
                </p>

                {/* Search Bar Container */}
                <div className="hero__search-container" ref={containerRef}>
                    <form className="hero__searchbar glass" onSubmit={handleSearch}>
                        
                        {/* Selector Fechas: Llegada */}
                        <div
                            className={`hero__field hero__field--clickable ${isCalendarOpen ? 'hero__field--active' : ''}`}
                            onClick={() => setIsCalendarOpen(true)}
                        >
                            <span className="hero__field-label">
                                <CalendarIcon size={14} />
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
                                <CalendarIcon size={14} />
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
                                <Users size={14} />
                                {t('viajeros')}
                                <span className="hero__pax-limit">(máx. 3)</span>
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
                            <Search size={18} />
                            <span>{t('buscar')}</span>
                        </button>
                    </form>

                    {/* Popover flotante del calendario */}
                    <AnimatePresence>
                        {isCalendarOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
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
          height: 100svh;
          min-height: 640px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .hero__video-wrap {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .hero__video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        .hero__overlay {
          position: absolute;
          inset: 0;
          background: rgba(26,26,26,0.38);
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
          gap: var(--space-6);
          animation: fadeInUp 0.8s both;
          width: 100%;
          max-width: 860px;
        }
        .hero__eyebrow {
          color: rgba(255,255,255,0.75);
          letter-spacing: 0.2em;
        }
        .hero__title {
          font-size: clamp(2.75rem, 7.5vw, 5.75rem);
          font-weight: 300;
          letter-spacing: -0.03em;
          line-height: 0.98;
          color: white;
          text-wrap: balance;
        }
        .hero__title em {
          font-style: italic;
          color: var(--sand);
        }
        .hero__subtitle {
          font-size: clamp(1rem, 2vw, 1.15rem);
          color: rgba(255,255,255,0.8);
          line-height: 1.7;
          max-width: 520px;
        }

        /* Search Container & Popover */
        .hero__search-container {
          position: relative;
          width: 100%;
          max-width: 780px;
          margin-top: var(--space-4);
        }
        .hero__calendar-popover {
          position: absolute;
          top: calc(100% + var(--space-3));
          left: 50%;
          transform: translateX(-50%) !important;
          z-index: 50;
          width: 100%;
          max-width: 360px;
          box-shadow: var(--shadow-xl);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        /* Search bar */
        .hero__searchbar {
          display: flex;
          align-items: center;
          border-radius: var(--radius-xl);
          padding: var(--space-3) var(--space-3) var(--space-3) var(--space-6);
          gap: var(--space-2);
          width: 100%;
          text-align: left;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(16px);
          box-shadow: var(--shadow-lg);
        }
        .hero__field {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 130px;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-md);
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
          gap: 5px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gray-600);
        }
        .hero__pax-limit {
          font-size: 0.65rem;
          font-weight: 500;
          color: var(--forest-green);
          text-transform: none;
          letter-spacing: normal;
        }
        .hero__field-display {
          font-size: 0.95rem;
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
          height: 36px;
          background: var(--gray-200);
          flex-shrink: 0;
        }
        .hero__pax-control {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .hero__pax-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1.5px solid var(--gray-200);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
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
          opacity: 0.35;
          cursor: not-allowed;
        }
        .hero__pax-num {
          font-size: 1rem;
          font-weight: 600;
          color: var(--black-matte);
          min-width: 20px;
          text-align: center;
        }
        .hero__search-btn {
          border-radius: var(--radius-xl);
          flex-shrink: 0;
          gap: var(--space-2);
          box-shadow: 0 4px 12px rgba(45, 58, 45, 0.2);
        }

        /* Scroll indicator */
        .hero__scroll-indicator {
          position: absolute;
          bottom: var(--space-8);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          color: rgba(255,255,255,0.6);
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0;
          animation: fadeIn 1s 1.5s both;
        }
        .hero__scroll-line {
          width: 1px;
          height: 40px;
          background: linear-gradient(to bottom, rgba(255,255,255,0.5), transparent);
          animation: scrollLine 2s ease-in-out infinite;
        }
        @keyframes scrollLine {
          0%, 100% { height: 40px; opacity: 0.5; }
          50% { height: 60px; opacity: 1; }
        }

        @media (max-width: 768px) {
          .hero__searchbar {
            flex-direction: column;
            padding: var(--space-4);
            gap: var(--space-3);
            border-radius: var(--radius-lg);
            align-items: stretch;
          }
          .hero__separator { display: none; }
          .hero__search-btn { width: 100%; border-radius: var(--radius-md); }
          .hero__field { min-width: unset; }
          .hero__calendar-popover {
            position: fixed;
            top: auto;
            bottom: var(--space-4);
            left: var(--space-4);
            right: var(--space-4);
            transform: none !important;
            max-width: unset;
            z-index: 100;
          }
        }
      `}</style>
        </section>
    )
}
