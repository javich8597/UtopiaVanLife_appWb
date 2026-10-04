'use client'

import { useState, useRef, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter, Link } from '@/i18n/routing'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CamperCard from '@/components/campers/CamperCard'
import BookingCalendar from '@/components/booking/BookingCalendar'
import { DaySlot } from '@/lib/pricing/engine'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Calendar as CalendarIcon,
    Users,
    Search,
    Shield,
    Sparkles,
    BatteryCharging,
    Coffee,
    MapPin,
    CalendarX,
    CheckCircle2,
    RotateCcw
} from 'lucide-react'
import { parseISO, format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const SEASON_PRICES: Record<string, number> = {
    'Temporada Alta': 175,
    'Temporada Media': 130,
    'Temporada Baja': 95,
}

function ReservarContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const initialFrom = searchParams.get('from') || ''
    const initialTo = searchParams.get('to') || ''
    const initialPax = Number(searchParams.get('pax')) || 2

    const [startDate, setStartDate] = useState(initialFrom)
    const [endDate, setEndDate] = useState(initialTo)
    const [pax, setPax] = useState(initialPax)
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    const [campers, setCampers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterModel, setFilterModel] = useState<'all' | 'space' | 'neo'>('all')

    const searchContainerRef = useRef<HTMLDivElement>(null)

    const getDemoCampers = () => [
        {
            id: '1',
            slug: 'space',
            name: 'SPACE',
            description_es: 'SPACE redefine el confort con distribución abierta de 7m², cama elevable eléctrica sobre salón en U y 160L de agua limpia.',
            thumbnail_url: '/images/campers/uploads/1790382530493-2k_space_landscape_door_closed.jpeg',
            specs: { beds: 2, seats: 2, length_m: 6.0 },
            deposit_amount: 1000,
            pricePerNight: 154,
            seasonName: 'Temporada Media',
            isAvailable: true,
        },
        {
            id: '2',
            slug: 'neo',
            name: 'NEO',
            description_es: 'La camper más polivalente y con 2.230L de maletero. Separación total de cabina, 540Ah litio Victron y aire acondicionado 12V.',
            thumbnail_url: '/images/campers/neo/neo-ext.png',
            specs: { beds: 3, seats: 3, length_m: 6.0 },
            deposit_amount: 1000,
            pricePerNight: 124,
            seasonName: 'Temporada Media',
            isAvailable: true,
        },
    ]

    // Sync from URL search params if changed externally
    useEffect(() => {
        if (initialFrom !== startDate) setStartDate(initialFrom)
        if (initialTo !== endDate) setEndDate(initialTo)
        if (initialPax !== pax) setPax(initialPax)
    }, [initialFrom, initialTo, initialPax])

    // Close calendar popover on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
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

    // Fetch availability from backend
    useEffect(() => {
        setLoading(true)
        const params = new URLSearchParams()
        if (startDate) params.set('from', startDate)
        if (endDate) params.set('to', endDate)

        fetch(`/api/availability?${params.toString()}`)
            .then(r => r.json())
            .then(data => {
                if (!data.campers || data.campers.length === 0) {
                    setCampers(getDemoCampers())
                } else {
                    setCampers(data.campers)
                }
            })
            .catch(() => setCampers(getDemoCampers()))
            .finally(() => setLoading(false))
    }, [startDate, endDate])

    // Dates selected handler from calendar popover
    const handleDatesChange = (start: string, _startSlot: DaySlot, end: string, _endSlot: DaySlot) => {
        setStartDate(start)
        setEndDate(end)
        if (start && end) {
            setTimeout(() => {
                setIsCalendarOpen(false)
            }, 200)
            updateUrlParams(start, end, pax)
        }
    }

    const updateUrlParams = (fromVal: string, toVal: string, paxVal: number) => {
        const p = new URLSearchParams()
        if (fromVal) p.set('from', fromVal)
        if (toVal) p.set('to', toVal)
        p.set('pax', String(paxVal))
        router.replace(`/reservar?${p.toString()}`)
    }

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateUrlParams(startDate, endDate, pax)
        if (!startDate || !endDate) {
            setIsCalendarOpen(true)
        }
    }

    const handleClearDates = () => {
        setStartDate('')
        setEndDate('')
        router.replace('/reservar')
    }

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return null
        try {
            return format(parseISO(dateStr), "d 'de' MMM", { locale: es })
        } catch {
            return dateStr
        }
    }

    const nightsCount = useMemo(() => {
        if (!startDate || !endDate) return 0
        try {
            return Math.max(0, differenceInDays(parseISO(endDate), parseISO(startDate)))
        } catch {
            return 0
        }
    }, [startDate, endDate])

    const hasDates = Boolean(startDate && endDate)

    // IMPORTANT: Once dates are selected, show ONLY available campers per user requirement
    const availableCampers = useMemo(() => {
        if (!hasDates) {
            return campers
        }
        return campers.filter(c => c.isAvailable)
    }, [campers, hasDates])

    const filteredCampers = useMemo(() => {
        if (filterModel === 'all') return availableCampers
        return availableCampers.filter(c => c.slug === filterModel)
    }, [availableCampers, filterModel])

    return (
        <div className="reservar-content">
            {/* Floating Date Selector Bar */}
            <div className="reservar-search__container" ref={searchContainerRef}>
                <form className="reservar-searchbar" onSubmit={handleSearchSubmit}>
                    {/* Selector Fechas: Salida */}
                    <div
                        className={`reservar-search__field reservar-search__field--clickable ${isCalendarOpen ? 'reservar-search__field--active' : ''}`}
                        onClick={() => setIsCalendarOpen(true)}
                        role="button"
                        tabIndex={0}
                        aria-label="Seleccionar fecha de salida"
                    >
                        <span className="reservar-search__field-label">
                            <CalendarIcon size={13} className="reservar-search__field-icon" />
                            Salida
                        </span>
                        <div className="reservar-search__field-display">
                            <span className={!startDate ? 'reservar-search__field-placeholder' : 'reservar-search__field-value'}>
                                {formatDisplayDate(startDate) || 'Fecha de salida'}
                            </span>
                        </div>
                    </div>

                    <div className="reservar-search__separator" />

                    {/* Selector Fechas: Llegada */}
                    <div
                        className={`reservar-search__field reservar-search__field--clickable ${isCalendarOpen ? 'reservar-search__field--active' : ''}`}
                        onClick={() => setIsCalendarOpen(true)}
                        role="button"
                        tabIndex={0}
                        aria-label="Seleccionar fecha de llegada"
                    >
                        <span className="reservar-search__field-label">
                            <CalendarIcon size={13} className="reservar-search__field-icon" />
                            Llegada
                        </span>
                        <div className="reservar-search__field-display">
                            <span className={!endDate ? 'reservar-search__field-placeholder' : 'reservar-search__field-value'}>
                                {formatDisplayDate(endDate) || 'Fecha de llegada'}
                            </span>
                        </div>
                    </div>

                    <div className="reservar-search__separator" />

                    {/* Selector de Viajeros */}
                    <div className="reservar-search__field">
                        <span className="reservar-search__field-label">
                            <Users size={13} className="reservar-search__field-icon" />
                            Viajeros
                        </span>
                        <div className="reservar-search__pax-control">
                            <button
                                type="button"
                                onClick={() => {
                                    const nextPax = Math.max(1, pax - 1)
                                    setPax(nextPax)
                                    if (hasDates) updateUrlParams(startDate, endDate, nextPax)
                                }}
                                disabled={pax <= 1}
                                className="reservar-search__pax-btn"
                                aria-label="Menos viajeros"
                            >
                                −
                            </button>
                            <span className="reservar-search__pax-num">{pax}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const nextPax = Math.min(3, pax + 1)
                                    setPax(nextPax)
                                    if (hasDates) updateUrlParams(startDate, endDate, nextPax)
                                }}
                                disabled={pax >= 3}
                                className="reservar-search__pax-btn"
                                aria-label="Más viajeros (máximo 3)"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Search / Availability CTA button */}
                    <button type="submit" className="reservar-search__btn">
                        <Search size={16} />
                        <span>{hasDates ? 'Actualizar búsqueda' : 'Buscar disponibilidad'}</span>
                    </button>
                </form>

                {/* Floating 2-month Calendar Popover */}
                <AnimatePresence>
                    {isCalendarOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="reservar-search__calendar-popover"
                        >
                            <BookingCalendar
                                startDate={startDate}
                                endDate={endDate}
                                showSlots={false}
                                variant="hero"
                                monthsCount={2}
                                onChange={handleDatesChange}
                                onClose={() => setIsCalendarOpen(false)}
                                showDoneButton={false}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Guarantees */}
                <div className="reservar-search__guarantees">
                    <span className="reservar-search__guarantee-item">
                        <span className="reservar-search__guarantee-icon">◎</span>
                        <span>Sin rutas marcadas</span>
                    </span>
                    <span className="reservar-search__guarantee-dot">•</span>
                    <span className="reservar-search__guarantee-item">
                        <span className="reservar-search__guarantee-icon">✳</span>
                        <span>Autonomía solar & litio 100%</span>
                    </span>
                    <span className="reservar-search__guarantee-dot">•</span>
                    <span className="reservar-search__guarantee-item">
                        <Shield size={13} className="reservar-search__guarantee-icon" />
                        <span>Seguro a todo riesgo incluido</span>
                    </span>
                </div>
            </div>

            {/* Availability Banner or Selection Prompt */}
            {hasDates ? (
                <div className="reservar-status-banner">
                    <div className="reservar-status-banner__info">
                        <CheckCircle2 size={18} className="reservar-status-banner__check" />
                        <span>
                            Mostrando campers disponibles: <strong>{formatDisplayDate(startDate)}</strong> → <strong>{formatDisplayDate(endDate)}</strong> ({nightsCount} {nightsCount === 1 ? 'noche' : 'noches'}) · {pax} {pax === 1 ? 'viajero' : 'viajeros'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleClearDates}
                        className="reservar-status-banner__reset-btn"
                    >
                        <RotateCcw size={13} />
                        <span>Ver toda la flota</span>
                    </button>
                </div>
            ) : (
                <div className="reservar-prompt-banner">
                    <Sparkles size={16} className="reservar-prompt-banner__icon" />
                    <span>
                        Selecciona fecha de salida y llegada en el buscador superior para comprobar disponibilidad en tiempo real.
                    </span>
                </div>
            )}

            {/* Quick Fleet Model Filter Pills Centered */}
            {availableCampers.length > 0 && (
                <div className="reservar__filters">
                    <button
                        type="button"
                        onClick={() => setFilterModel('all')}
                        className={`reservar__filter-btn ${filterModel === 'all' ? 'reservar__filter-btn--active' : ''}`}
                    >
                        <span>
                            {hasDates ? `Disponibles (${availableCampers.length})` : `Toda la flota (${campers.length})`}
                        </span>
                    </button>
                    {availableCampers.some(c => c.slug === 'space') && (
                        <button
                            type="button"
                            onClick={() => setFilterModel('space')}
                            className={`reservar__filter-btn ${filterModel === 'space' ? 'reservar__filter-btn--active' : ''}`}
                        >
                            <span>SPACE · Suite Diáfana & Cine</span>
                        </button>
                    )}
                    {availableCampers.some(c => c.slug === 'neo') && (
                        <button
                            type="button"
                            onClick={() => setFilterModel('neo')}
                            className={`reservar__filter-btn ${filterModel === 'neo' ? 'reservar__filter-btn--active' : ''}`}
                        >
                            <span>NEO · Gran Maletero 2.230L</span>
                        </button>
                    )}
                </div>
            )}

            {/* Centered Campers Grid */}
            <div className="reservar__grid-container">
                {loading ? (
                    <div className="reservar__grid">
                        {[1, 2].map(i => (
                            <div key={i} className="skeleton reservar__skeleton-card" />
                        ))}
                    </div>
                ) : filteredCampers.length > 0 ? (
                    <div className="reservar__grid">
                        {filteredCampers.map(c => {
                            const bookingParams = hasDates
                                ? `from=${startDate}&to=${endDate}&pax=${pax}`
                                : ''
                            const bookingUrl = hasDates
                                ? `/reserva/${c.slug}?${bookingParams}`
                                : `/campers/${c.slug}`

                            return (
                                <CamperCard
                                    key={c.id}
                                    {...c}
                                    pricePerNight={c.pricePerNight ?? SEASON_PRICES['Temporada Media']}
                                    seasonName={c.seasonName ?? 'Temporada Media'}
                                    searchParams={bookingParams}
                                    customHref={bookingUrl}
                                    ctaText={hasDates ? `Reservar ${c.name}` : `Ver detalles de ${c.name}`}
                                    variant="dark"
                                />
                            )
                        })}
                    </div>
                ) : (
                    /* Empty State when no campers available for selected dates */
                    <div className="reservar__empty-state">
                        <div className="reservar__empty-icon">
                            <CalendarX size={36} />
                        </div>
                        <h3 className="reservar__empty-title">
                            No hay campers disponibles para estas fechas
                        </h3>
                        <p className="reservar__empty-text">
                            Nuestra flota está ocupada del <strong>{formatDisplayDate(startDate)}</strong> al <strong>{formatDisplayDate(endDate)}</strong>.
                            Prueba a seleccionar otras fechas para vivir la experiencia Utopia Van Life en Mallorca.
                        </p>
                        <div className="reservar__empty-actions">
                            <button
                                type="button"
                                onClick={() => setIsCalendarOpen(true)}
                                className="reservar__empty-btn-primary"
                            >
                                <CalendarIcon size={15} />
                                <span>Cambiar fechas</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleClearDates}
                                className="reservar__empty-btn-secondary"
                            >
                                <RotateCcw size={14} />
                                <span>Limpiar búsqueda</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Signature Standard Micro-Pillars Centered */}
            <div className="reservar__pillars">
                <div className="reservar__pillar-item">
                    <div className="reservar__pillar-icon">
                        <BatteryCharging size={20} />
                    </div>
                    <div className="reservar__pillar-text">
                        <h4>Autonomía Off-Grid 100%</h4>
                        <p>Baterías Victron Litio y placas solares. Libertad real sin pisar campings.</p>
                    </div>
                </div>

                <div className="reservar__pillar-item">
                    <div className="reservar__pillar-icon">
                        <Shield size={20} />
                    </div>
                    <div className="reservar__pillar-text">
                        <h4>Seguro a Todo Riesgo</h4>
                        <p>Cobertura integral europea y asistencia personalizada 24h incluida.</p>
                    </div>
                </div>

                <div className="reservar__pillar-item">
                    <div className="reservar__pillar-icon">
                        <Coffee size={20} />
                    </div>
                    <div className="reservar__pillar-text">
                        <h4>Pack Confort Completo</h4>
                        <p>Sábanas de lino, toallas, menaje completo y mesa exterior de cortesía.</p>
                    </div>
                </div>

                <div className="reservar__pillar-item">
                    <div className="reservar__pillar-icon">
                        <MapPin size={20} />
                    </div>
                    <div className="reservar__pillar-text">
                        <h4>Discreción Total</h4>
                        <p>Diseño exterior limpio y sobrio, sin pegatinas publicitarias invasivas.</p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .reservar-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                }

                /* Search Bar Container */
                .reservar-search__container {
                    position: relative;
                    width: 100%;
                    max-width: 860px;
                    margin: 0 auto 36px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }

                .reservar-searchbar {
                    display: flex;
                    align-items: center;
                    border-radius: var(--radius-full);
                    padding: 8px 10px 8px 24px;
                    gap: var(--space-2);
                    width: 100%;
                    text-align: left;
                    background: rgba(19, 21, 24, 0.95);
                    backdrop-filter: blur(28px);
                    -webkit-backdrop-filter: blur(28px);
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    transition: border-color var(--transition-base), box-shadow var(--transition-base);
                }
                .reservar-searchbar:hover {
                    border-color: rgba(204, 160, 83, 0.5);
                    box-shadow: 0 24px 56px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.18);
                }

                .reservar-search__field {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    flex: 1;
                    min-width: 130px;
                    padding: 6px 12px;
                    border-radius: var(--radius-lg);
                    transition: background var(--transition-fast);
                }
                .reservar-search__field--clickable {
                    cursor: pointer;
                }
                .reservar-search__field--clickable:hover {
                    background: rgba(255, 255, 255, 0.06);
                }
                .reservar-search__field--active {
                    background: rgba(204, 160, 83, 0.12);
                }
                .reservar-search__field-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.68rem;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.65);
                }
                :global(.reservar-search__field-icon) {
                    color: #CCA053;
                }
                .reservar-search__field-display {
                    font-size: 0.94rem;
                    font-weight: 500;
                }
                .reservar-search__field-value {
                    color: #F5EFEB;
                    font-weight: 600;
                }
                .reservar-search__field-placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }

                .reservar-search__separator {
                    width: 1px;
                    height: 34px;
                    background: rgba(255, 255, 255, 0.15);
                    flex-shrink: 0;
                }

                .reservar-search__pax-control {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                }
                .reservar-search__pax-btn {
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
                .reservar-search__pax-btn:hover:not(:disabled) {
                    border-color: #CCA053;
                    background: #CCA053;
                    color: #111311;
                }
                .reservar-search__pax-btn:active:not(:disabled) {
                    transform: scale(0.93);
                }
                .reservar-search__pax-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }
                .reservar-search__pax-num {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #F5EFEB;
                    min-width: 18px;
                    text-align: center;
                }

                .reservar-search__btn {
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
                .reservar-search__btn:hover {
                    background-color: #d8ad5e;
                    transform: translateY(-1px);
                    box-shadow: 0 8px 26px rgba(204, 160, 83, 0.45);
                }
                .reservar-search__btn:active {
                    transform: scale(0.97);
                }

                /* Calendar Popover */
                .reservar-search__calendar-popover {
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

                /* Guarantees */
                .reservar-search__guarantees {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.8rem;
                    font-weight: 500;
                    flex-wrap: wrap;
                }
                .reservar-search__guarantee-item {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .reservar-search__guarantee-icon {
                    color: #CCA053;
                    font-size: 0.85rem;
                }
                .reservar-search__guarantee-dot {
                    opacity: 0.4;
                    font-size: 0.7rem;
                }

                /* Status & Prompt Banners */
                .reservar-status-banner {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 24px;
                    background: #131518;
                    border-radius: 16px;
                    border: 1px solid rgba(204, 160, 83, 0.3);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
                    width: 100%;
                    max-width: 1020px;
                    margin: 0 auto 32px;
                }
                .reservar-status-banner__info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #FFFFFF;
                    font-size: 0.95rem;
                }
                :global(.reservar-status-banner__check) {
                    color: #CCA053;
                    flex-shrink: 0;
                }
                .reservar-status-banner__reset-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 16px;
                    border-radius: var(--radius-full);
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    color: #FFFFFF;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }
                .reservar-status-banner__reset-btn:hover {
                    background: #CCA053;
                    border-color: #CCA053;
                    color: #0B0C0E;
                }

                .reservar-prompt-banner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 14px 20px;
                    background: rgba(204, 160, 83, 0.08);
                    border: 1px solid rgba(204, 160, 83, 0.22);
                    border-radius: 14px;
                    width: 100%;
                    max-width: 1020px;
                    margin: 0 auto 32px;
                    color: rgba(255, 255, 255, 0.85);
                    font-size: 0.88rem;
                    text-align: center;
                }
                :global(.reservar-prompt-banner__icon) {
                    color: #CCA053;
                    flex-shrink: 0;
                }

                /* Model Filter Pills */
                .reservar__filters {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-bottom: 40px;
                    width: 100%;
                }

                .reservar__filter-btn {
                    display: inline-flex;
                    align-items: center;
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 10px 20px;
                    border-radius: var(--radius-full);
                    font-size: 0.86rem;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    transition: all 180ms ease;
                }

                .reservar__filter-btn:hover {
                    border-color: rgba(204, 160, 83, 0.5);
                    background: rgba(255, 255, 255, 0.06);
                    color: #FFFFFF;
                }

                .reservar__filter-btn--active {
                    background: #CCA053;
                    border-color: #CCA053;
                    color: #0B0C0E;
                    font-weight: 700;
                    box-shadow: 0 4px 16px rgba(204, 160, 83, 0.3);
                }

                /* Grid Container */
                .reservar__grid-container {
                    display: flex;
                    justify-content: center;
                    width: 100%;
                }

                .reservar__grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 480px));
                    gap: 32px;
                    width: 100%;
                    max-width: 1020px;
                    justify-content: center;
                }

                .reservar__skeleton-card {
                    height: 520px;
                    border-radius: 20px;
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }

                /* Empty state when no campers available */
                .reservar__empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 56px 32px;
                    max-width: 640px;
                    width: 100%;
                    margin: 20px auto;
                }

                .reservar__empty-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: rgba(204, 160, 83, 0.12);
                    color: #CCA053;
                    margin-bottom: 20px;
                }

                .reservar__empty-title {
                    font-family: var(--font-display, sans-serif);
                    font-size: 1.4rem;
                    font-weight: 700;
                    color: #FFFFFF;
                    margin: 0 0 12px 0;
                }

                .reservar__empty-text {
                    font-size: 0.95rem;
                    color: rgba(255, 255, 255, 0.7);
                    line-height: 1.6;
                    margin: 0 0 28px 0;
                    max-width: 480px;
                }

                .reservar__empty-actions {
                    display: flex;
                    gap: 14px;
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .reservar__empty-btn-primary {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: #CCA053;
                    color: #0B0C0E;
                    padding: 12px 24px;
                    border-radius: var(--radius-full);
                    font-size: 0.9rem;
                    font-weight: 700;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 16px rgba(204, 160, 83, 0.3);
                    transition: all 180ms ease;
                }
                .reservar__empty-btn-primary:hover {
                    background: #d8ad5e;
                    transform: translateY(-1px);
                }

                .reservar__empty-btn-secondary {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    color: #FFFFFF;
                    padding: 12px 24px;
                    border-radius: var(--radius-full);
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 180ms ease;
                }
                .reservar__empty-btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.15);
                }

                /* Pillars */
                .reservar__pillars {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    width: 100%;
                    max-width: 1020px;
                    margin: 56px auto 0;
                    padding-top: 40px;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                }

                .reservar__pillar-item {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                    padding: 24px;
                    transition: transform var(--transition-fast), border-color var(--transition-fast);
                }
                .reservar__pillar-item:hover {
                    transform: translateY(-2px);
                    border-color: rgba(204, 160, 83, 0.3);
                }

                .reservar__pillar-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: rgba(204, 160, 83, 0.12);
                    color: #CCA053;
                }

                .reservar__pillar-text h4 {
                    font-size: 0.96rem;
                    font-weight: 700;
                    color: #FFFFFF;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.01em;
                }

                .reservar__pillar-text p {
                    font-size: 0.83rem;
                    color: rgba(255, 255, 255, 0.6);
                    line-height: 1.55;
                    margin: 0;
                }

                @media (max-width: 960px) {
                    .reservar__grid {
                        grid-template-columns: minmax(0, 500px);
                    }
                    .reservar__pillars {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .reservar-searchbar {
                        flex-direction: column;
                        padding: var(--space-4);
                        gap: var(--space-3);
                        border-radius: var(--radius-xl);
                        align-items: stretch;
                    }
                    .reservar-search__separator {
                        display: none;
                    }
                    .reservar-search__field {
                        min-width: unset;
                        padding: 8px 12px;
                        background: rgba(255, 255, 255, 0.04);
                        border-radius: var(--radius-md);
                    }
                    .reservar-search__btn {
                        width: 100%;
                        border-radius: var(--radius-full);
                        padding: 14px;
                    }
                    .reservar-search__calendar-popover {
                        position: fixed;
                        top: 50%;
                        bottom: auto;
                        left: 50%;
                        right: auto;
                        transform: translate(-50%, -50%) !important;
                        max-width: 360px;
                        width: 92vw;
                        max-height: 85vh;
                        overflow-y: auto;
                        z-index: 1000;
                    }
                    .reservar-search__guarantees {
                        flex-direction: column;
                        gap: 6px;
                        font-size: 0.75rem;
                    }
                    .reservar-search__guarantee-dot {
                        display: none;
                    }
                }

                @media (max-width: 640px) {
                    .reservar__grid {
                        grid-template-columns: 1fr;
                        gap: 24px;
                    }
                    .reservar__filters {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .reservar__filter-btn {
                        justify-content: center;
                    }
                    .reservar__pillars {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                    .reservar-status-banner {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 14px;
                    }
                }
            `}</style>
        </div>
    )
}

export default function ReservarPage() {
    return (
        <>
            <Navbar />
            <main className="reservar-page">
                {/* Centered Hero Header */}
                <section className="reservar-hero">
                    <div className="container reservar-hero__container">
                        <div className="reservar-hero__eyebrow">
                            <Sparkles size={13} className="reservar-hero__sparkle" />
                            <span>RESERVA DIRECTA · BOUTIQUE CAMPERS MALLORCA</span>
                        </div>
                        <h1 className="reservar-hero__title">
                            RESERVA TU UTOPIA
                        </h1>
                        <p className="reservar-hero__subtitle">
                            Selecciona las fechas de tu aventura para consultar la disponibilidad en tiempo real de nuestra flota boutique.
                        </p>
                    </div>
                </section>

                {/* Main Reservar Content */}
                <section className="reservar-section">
                    <div className="container">
                        <Suspense fallback={<div className="skeleton reservar__loading-skeleton" />}>
                            <ReservarContent />
                        </Suspense>
                    </div>
                </section>
            </main>
            <Footer />

            <style jsx>{`
                .reservar-page {
                    min-height: 100vh;
                    padding-top: 72px;
                    background: #0B0C0E;
                }

                .reservar-hero {
                    background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(204, 160, 83, 0.12), transparent 70%), #0B0C0E;
                    padding: 5rem 0 3.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    color: white;
                    text-align: center;
                }

                .reservar-hero__container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    max-width: 760px;
                    margin: 0 auto;
                }

                .reservar-hero__eyebrow {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    letter-spacing: 0.22em;
                    color: #CCA053;
                    text-transform: uppercase;
                    margin-bottom: 14px;
                    background: rgba(204, 160, 83, 0.1);
                    border: 1px solid rgba(204, 160, 83, 0.28);
                    padding: 5px 16px;
                    border-radius: 999px;
                }
                :global(.reservar-hero__sparkle) {
                    color: #CCA053;
                }

                .reservar-hero__title {
                    font-family: var(--font-display, sans-serif);
                    font-size: clamp(2.4rem, 5vw, 3.6rem);
                    font-weight: 800;
                    color: #FFFFFF;
                    letter-spacing: -0.02em;
                    line-height: 1.1;
                    margin: 0 0 16px 0;
                    text-transform: uppercase;
                    text-align: center;
                }

                .reservar-hero__subtitle {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 1.05rem;
                    line-height: 1.6;
                    max-width: 620px;
                    margin: 0 auto;
                    text-align: center;
                }

                .reservar-section {
                    padding-block: 48px 80px;
                }

                .reservar__loading-skeleton {
                    height: 480px;
                    border-radius: 20px;
                    background: #131518;
                    max-width: 1020px;
                    margin: 0 auto;
                }

                @media (max-width: 640px) {
                    .reservar-hero {
                        padding: 3.5rem 0 2.5rem;
                    }
                    .reservar-section {
                        padding-block: 32px 56px;
                    }
                }
            `}</style>
        </>
    )
}
