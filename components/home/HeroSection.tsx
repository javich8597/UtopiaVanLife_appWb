'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { Calendar, Users, Search } from 'lucide-react'
import { useTranslations } from 'next-intl';

export default function HeroSection() {
    const t = useTranslations('HomePage.Hero');
    const router = useRouter()
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [pax, setPax] = useState(2)

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (startDate) params.set('from', startDate)
        if (endDate) params.set('to', endDate)
        params.set('pax', String(pax))
        router.push(`/campers?${params.toString()}`)
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

                {/* Search Bar */}
                <form className="hero__searchbar glass" onSubmit={handleSearch}>
                    <div className="hero__field">
                        <label htmlFor="hero-start-date" className="hero__field-label">
                            <Calendar size={14} />
                            {t('llegada')}
                        </label>
                        <input
                            id="hero-start-date"
                            name="from"
                            type="date"
                            className="hero__field-input"
                            value={startDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={e => setStartDate(e.target.value)}
                            suppressHydrationWarning
                        />
                    </div>

                    <div className="hero__separator" />

                    <div className="hero__field">
                        <label htmlFor="hero-end-date" className="hero__field-label">
                            <Calendar size={14} />
                            {t('salida')}
                        </label>
                        <input
                            id="hero-end-date"
                            name="to"
                            type="date"
                            className="hero__field-input"
                            value={endDate}
                            min={startDate || new Date().toISOString().split('T')[0]}
                            onChange={e => setEndDate(e.target.value)}
                            suppressHydrationWarning
                        />
                    </div>

                    <div className="hero__separator" />

                    <div className="hero__field">
                        <label className="hero__field-label">
                            <Users size={14} />
                            {t('viajeros')}
                        </label>
                        <div className="hero__pax-control">
                            <button type="button" onClick={() => setPax(p => Math.max(1, p - 1))} className="hero__pax-btn">−</button>
                            <span className="hero__pax-num">{pax}</span>
                            <button type="button" onClick={() => setPax(p => Math.min(6, p + 1))} className="hero__pax-btn">+</button>
                        </div>
                    </div>

                    <button type="submit" className="hero__search-btn btn btn-forest btn-lg">
                        <Search size={18} />
                        <span>{t('buscar')}</span>
                    </button>
                </form>

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

        /* Search bar */
        .hero__searchbar {
          display: flex;
          align-items: center;
          border-radius: var(--radius-xl);
          padding: var(--space-3) var(--space-3) var(--space-3) var(--space-6);
          gap: var(--space-2);
          margin-top: var(--space-4);
          flex-wrap: wrap;
          max-width: 760px;
          width: 100%;
        }
        .hero__field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 120px;
        }
        .hero__field-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gray-600);
        }
        .hero__field-input {
          border: none;
          background: transparent;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--black-matte);
          outline: none;
          width: 100%;
          cursor: pointer;
        }
        .hero__field-input::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          width: 100%;
          cursor: pointer;
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
          width: 28px; height: 28px;
          border-radius: 50%;
          border: 1.5px solid var(--gray-200);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--black-matte);
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .hero__pax-btn:hover {
          border-color: var(--forest-green);
          background: var(--forest-green);
          color: white;
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
        }
      `}</style>
        </section>
    )
}
