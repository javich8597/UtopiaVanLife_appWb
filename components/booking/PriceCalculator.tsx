'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { Calendar as CalendarIcon, Users, Plus, Minus, CheckCircle, ChevronDown, AlertCircle, Sparkles, Check, Info } from 'lucide-react'
import { calculatePrice, calculatePriceV2, formatPrice, getMinNightsForDate, getMinNightsForDateV2, DaySlot } from '@/lib/pricing/engine'
import type { Season, SeasonV2, SeasonPeriod, DurationDiscount, Extra } from '@/lib/pricing/engine'
import BookingCalendar, { BlockedRange } from './BookingCalendar'
import { BlockedSlot } from '@/lib/booking/availability'
import { motion, AnimatePresence } from 'framer-motion'
import { parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PriceCalculatorProps {
    camperSlug: string
    depositAmount: number
    seasons: Season[]
    availableExtras: Extra[]
    initialFrom?: string
    initialTo?: string
    maxGuests?: number
    durationDiscounts?: DurationDiscount[]
    seasonsV2?: SeasonV2[]
    seasonPeriods?: SeasonPeriod[]
    camperBasePrice?: number
}

export default function PriceCalculator({
    camperSlug,
    depositAmount,
    seasons,
    availableExtras,
    initialFrom,
    initialTo,
    maxGuests,
    durationDiscounts,
    seasonsV2,
    seasonPeriods,
    camperBasePrice,
}: PriceCalculatorProps) {
    const router = useRouter()
    const maxPax = maxGuests || (camperSlug === 'space' ? 2 : 3)
    const [startDate, setStartDate] = useState(initialFrom || '')
    const [startSlot, setStartSlot] = useState<DaySlot>('morning')
    const [endDate, setEndDate] = useState(initialTo || '')
    const [endSlot, setEndSlot] = useState<DaySlot>('afternoon')
    const [pax, setPax] = useState(Math.min(2, maxPax))
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const [isExtrasOpen, setIsExtrasOpen] = useState(false)
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
    const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([])
    const [selectedExtras, setSelectedExtras] = useState<Extra[]>([])
    const [breakdown, setBreakdown] = useState<ReturnType<typeof calculatePrice> | null>(null)

    const safeDeposit = Number(depositAmount) || 1000

    // Cargar fechas y slots bloqueados para esta furgoneta
    useEffect(() => {
        let isMounted = true
        async function fetchAvailability() {
            try {
                const res = await fetch(`/api/campers/${camperSlug}/availability`)
                if (res.ok) {
                    const data = await res.json()
                    if (isMounted) {
                        if (data.blockedSlots) setBlockedSlots(data.blockedSlots)
                        if (data.blockedRanges) setBlockedRanges(data.blockedRanges)
                    }
                }
            } catch {
                // Silencioso si falla
            }
        }
        fetchAvailability()
        return () => {
            isMounted = false
        }
    }, [camperSlug])

    // Estancia mínima para la temporada del día de inicio
    const activeMinNights = startDate
        ? (seasonsV2 && seasonPeriods && seasonsV2.length > 0)
            ? getMinNightsForDateV2(new Date(startDate), seasonsV2, seasonPeriods)
            : getMinNightsForDate(new Date(startDate), seasons)
        : 3

    // Recalcular desglose de precio con granularidad de medio día
    useEffect(() => {
        if (!startDate || !endDate) { setBreakdown(null); return }
        const start = new Date(startDate)
        const end = new Date(endDate)
        if (end <= start) { setBreakdown(null); return }

        if (seasonsV2 && seasonPeriods && seasonsV2.length > 0 && camperBasePrice) {
            const result = calculatePriceV2({
                startDate: start,
                startSlot,
                endDate: end,
                endSlot,
                camperBasePrice,
                seasons: seasonsV2,
                periods: seasonPeriods,
                discounts: durationDiscounts || [],
                selectedExtras,
                depositAmount: safeDeposit
            })
            setBreakdown(result)
        } else {
            const result = calculatePrice(start, startSlot, end, endSlot, seasons, selectedExtras, safeDeposit)
            setBreakdown(result)
        }
    }, [startDate, startSlot, endDate, endSlot, selectedExtras, seasons, safeDeposit, seasonsV2, seasonPeriods, durationDiscounts, camperBasePrice])

    const toggleExtra = (extra: Extra) => {
        setSelectedExtras(prev =>
            prev.find(e => e.id === extra.id)
                ? prev.filter(e => e.id !== extra.id)
                : [...prev, extra]
        )
    }

    const handleDatesChange = (start: string, sSlot: DaySlot, end: string, eSlot: DaySlot) => {
        setStartDate(start)
        setStartSlot(sSlot)
        setEndDate(end)
        setEndSlot(eSlot)
        // Mantener el calendario abierto para permitir al usuario seleccionar y revisar turnos horarios y pulsar 'Listo'
    }

    const isBelowMinNights = Boolean(breakdown && breakdown.numNights < activeMinNights)

    const handleReserve = () => {
        if (!startDate || !endDate || !breakdown || isBelowMinNights) return
        const pickupTime = startSlot === 'morning' ? '09:00' : '15:00'
        const dropoffTime = endSlot === 'morning' ? '12:00' : '19:00'

        const params = new URLSearchParams({
            camper: camperSlug,
            from: startDate,
            pickup_time: pickupTime,
            to: endDate,
            dropoff_time: dropoffTime,
            pax: String(Math.min(3, Math.max(1, pax))),
            extras: selectedExtras.map(e => e.id).join(','),
        })
        router.push(`/checkout?${params.toString()}`)
    }

    const formatDisplayDate = (dateStr: string, slot?: DaySlot, isEnd?: boolean) => {
        if (!dateStr) return null
        try {
            const formatted = format(parseISO(dateStr), "d 'de' MMM", { locale: es })
            if (!slot) return formatted
            const timeTag = isEnd
                ? (slot === 'morning' ? '12:00h' : '19:00h')
                : (slot === 'morning' ? '09:00h' : '15:00h')
            return `${formatted} (${timeTag})`
        } catch {
            return dateStr
        }
    }

    return (
        <div className="price-calc">
            <div className="price-calc__header">
                <h3 className="text-h4">Calcular precio</h3>
                {breakdown && (
                    <div className="price-calc__total">
                        <span className="price-calc__amount">{formatPrice(breakdown.totalWithoutDeposit)}</span>
                        <span className="price-calc__nights">
                            / {breakdown.totalDays} día{breakdown.totalDays !== 1 ? 's' : ''} ({breakdown.numNights} n.)
                        </span>
                    </div>
                )}
            </div>

            {/* Interactive Dates Selector */}
            <div className="price-calc__dates-wrapper">
                <div
                    className={`price-calc__dates-card ${isCalendarOpen ? 'price-calc__dates-card--open' : ''}`}
                    onClick={() => setIsCalendarOpen(prev => !prev)}
                >
                    <div className="price-calc__date-pill">
                        <span className="price-calc__date-label">
                            <CalendarIcon size={12} style={{ display: 'inline', marginRight: 5 }} />
                            Recogida
                        </span>
                        <span className={`price-calc__date-val ${!startDate ? 'price-calc__date-val--placeholder' : ''}`}>
                            {formatDisplayDate(startDate, startSlot, false) || 'Añadir fecha'}
                        </span>
                    </div>

                    <div className="price-calc__date-separator" />

                    <div className="price-calc__date-pill">
                        <span className="price-calc__date-label">
                            <CalendarIcon size={12} style={{ display: 'inline', marginRight: 5 }} />
                            Devolución
                        </span>
                        <span className={`price-calc__date-val ${!endDate ? 'price-calc__date-val--placeholder' : ''}`}>
                            {formatDisplayDate(endDate, endSlot, true) || 'Añadir fecha'}
                        </span>
                    </div>

                    <div className="price-calc__dates-caret">
                        <ChevronDown
                            size={16}
                            style={{
                                transform: isCalendarOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform var(--transition-fast)'
                            }}
                        />
                    </div>
                </div>

                {/* Resumen de franjas seleccionadas */}
                {startDate && endDate && (
                    <div className="price-calc__schedule-badge">
                        <span>Recogida: {startSlot === 'morning' ? 'Mañana (09–12h)' : 'Tarde (15–19h)'}</span>
                        <span>·</span>
                        <span>Devolución: {endSlot === 'morning' ? 'Mañana (09–12h)' : 'Tarde (15–19h)'}</span>
                    </div>
                )}

                {/* Animated Dropdown Calendar */}
                <AnimatePresence>
                    {isCalendarOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="price-calc__calendar-collapse"
                        >
                            <BookingCalendar
                                startDate={startDate}
                                startSlot={startSlot}
                                endDate={endDate}
                                endSlot={endSlot}
                                onChange={handleDatesChange}
                                blockedSlots={blockedSlots}
                                blockedRanges={blockedRanges}
                                minNights={activeMinNights}
                                onClose={() => setIsCalendarOpen(false)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Pax (travellers max based on camper capacity) */}
            <div className="form-group">
                <div className="price-calc__pax-header">
                    <label className="form-label" style={{ marginBottom: 0 }}>
                        <Users size={12} style={{ display: 'inline', marginRight: 5 }} />
                        Viajeros
                    </label>
                    <span className="price-calc__pax-badge">Máx. {maxPax} {maxPax === 1 ? 'plaza' : 'plazas'}</span>
                </div>
                <div className="price-calc__pax">
                    <button
                        type="button"
                        className="btn btn-outline btn-icon"
                        onClick={() => setPax(p => Math.max(1, p - 1))}
                        disabled={pax <= 1}
                        aria-label="Disminuir viajeros"
                    >
                        <Minus size={16} />
                    </button>
                    <span className="price-calc__pax-num">{pax} {pax === 1 ? 'persona' : 'personas'}</span>
                    <button
                        type="button"
                        className="btn btn-outline btn-icon"
                        onClick={() => setPax(p => Math.min(maxPax, p + 1))}
                        disabled={pax >= maxPax}
                        aria-label={`Aumentar viajeros (máximo ${maxPax})`}
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Collapsible Extras Dropdown */}
            {availableExtras.length > 0 && (
                <div className="price-calc__extras-section">
                    <button
                        type="button"
                        className={`price-calc__extras-toggle ${isExtrasOpen ? 'price-calc__extras-toggle--open' : ''}`}
                        onClick={() => setIsExtrasOpen(prev => !prev)}
                        aria-expanded={isExtrasOpen}
                    >
                        <div className="price-calc__extras-toggle-left">
                            <Sparkles size={16} className="text-forest" />
                            <div className="price-calc__extras-toggle-info">
                                <span className="price-calc__extras-title">Personaliza tu viaje: Extras</span>
                                <span className="price-calc__extras-hint">
                                    {selectedExtras.length === 0
                                        ? 'Equipamiento opcional para tu ruta'
                                        : `${selectedExtras.length} ${selectedExtras.length === 1 ? 'extra añadido' : 'extras añadidos'} (+${formatPrice(breakdown?.extrasTotal || 0)})`}
                                </span>
                            </div>
                        </div>
                        <div className="price-calc__extras-toggle-right">
                            {selectedExtras.length > 0 && (
                                <span className="price-calc__extras-count-badge">
                                    {selectedExtras.length}
                                </span>
                            )}
                            <ChevronDown
                                size={16}
                                className={`price-calc__extras-chevron ${isExtrasOpen ? 'price-calc__extras-chevron--open' : ''}`}
                            />
                        </div>
                    </button>

                    {/* Selected Extras preview chips when collapsed */}
                    {!isExtrasOpen && selectedExtras.length > 0 && (
                        <div className="price-calc__extras-chips">
                            {selectedExtras.map(e => (
                                <span
                                    key={e.id}
                                    className="price-calc__extra-chip"
                                    onClick={() => toggleExtra(e)}
                                    title="Pulsar para deseleccionar"
                                >
                                    ✓ {e.name_es} <span className="price-calc__chip-price">+{formatPrice(Number(e.price))}{e.price_type === 'per_day' ? '/día' : ''}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Collapsible Animated Panel */}
                    <AnimatePresence>
                        {isExtrasOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.22, ease: 'easeInOut' }}
                                className="price-calc__extras-collapse"
                            >
                                <div className="price-calc__extras-grid">
                                    {availableExtras.map(extra => {
                                        const selected = selectedExtras.some(e => e.id === extra.id)
                                        return (
                                            <button
                                                key={extra.id}
                                                type="button"
                                                className={`price-calc__extra-card ${selected ? 'price-calc__extra-card--selected' : ''}`}
                                                onClick={() => toggleExtra(extra)}
                                            >
                                                <div className="price-calc__extra-card-content">
                                                    <span className={`price-calc__extra-checkbox ${selected ? 'price-calc__extra-checkbox--checked' : ''}`}>
                                                        {selected && <Check size={11} strokeWidth={3} />}
                                                    </span>
                                                    <span className="price-calc__extra-name">{extra.name_es}</span>
                                                </div>
                                                <span className="price-calc__extra-price">
                                                    +{formatPrice(Number(extra.price))}{extra.price_type === 'per_day' ? '/día' : ''}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Price breakdown */}
            {breakdown && breakdown.numNights > 0 && (
                <div className="price-calc__breakdown">
                    {breakdown.nightsPerSeason.map((s, i) => (
                        <div key={i} className="price-calc__row">
                            <span>{s.season} × {s.nights} noche{s.nights !== 1 ? 's' : ''}</span>
                            <span>{formatPrice(s.subtotal)}</span>
                        </div>
                    ))}
                    {breakdown.totalDays > breakdown.numNights && (
                        <div className="price-calc__row" style={{ color: 'var(--forest-green)', fontStyle: 'italic' }}>
                            <span>Suplemento medio día ({breakdown.totalDays - breakdown.numNights} día adicional)</span>
                            <span>+{formatPrice(breakdown.baseTotal - breakdown.nightsPerSeason.reduce((acc, curr) => acc + curr.subtotal, 0))}</span>
                        </div>
                    )}
                    {breakdown.discountAmount > 0 && (
                        <div className="price-calc__row price-calc__row--discount">
                            <div className="price-calc__discount-tag-wrap">
                                <span className="price-calc__discount-badge">−{breakdown.discountPct}%</span>
                                <span>Descuento estancia larga ({breakdown.totalDays} días)</span>
                            </div>
                            <span className="price-calc__discount-amount">−{formatPrice(breakdown.discountAmount)}</span>
                        </div>
                    )}
                    {breakdown.extrasTotal > 0 && (
                        <div className="price-calc__row">
                            <span>Extras opcionales</span>
                            <span>{formatPrice(breakdown.extrasTotal)}</span>
                        </div>
                    )}
                    <div className="price-calc__divider" />
                    <div className="price-calc__row price-calc__row--subtotal">
                        <span>Alquiler camper ({breakdown.totalDays} días)</span>
                        <span>{formatPrice(breakdown.totalWithoutDeposit)}</span>
                    </div>
                    <div className="price-calc__row price-calc__row--deposit">
                        <div>
                            <span>Fianza (100% reembolsable)</span>
                            <span className="price-calc__deposit-subtext">Retención temporal al recoger el vehículo</span>
                        </div>
                        <span className="price-calc__deposit-val">{formatPrice(breakdown.deposit)}</span>
                    </div>
                    <div className="price-calc__row price-calc__row--total">
                        <span>Total reserva</span>
                        <span>{formatPrice(breakdown.grandTotal)}</span>
                    </div>
                </div>
            )}

            {/* Discount savings banner */}
            {breakdown && breakdown.discountAmount > 0 && (
                <div className="price-calc__discount-banner">
                    <Sparkles size={16} className="text-gold" />
                    <span>¡Ahorras <strong>{formatPrice(breakdown.discountAmount)}</strong> con el descuento del {breakdown.discountPct}% por estancia larga!</span>
                </div>
            )}

            {/* Dynamic hint for next duration discount tier */}
            {breakdown && breakdown.numNights > 0 && (
                (() => {
                    const sortedDiscounts = (durationDiscounts || [
                        { min_days: 7, discount_pct: 10, is_active: true },
                        { min_days: 14, discount_pct: 15, is_active: true },
                        { min_days: 21, discount_pct: 20, is_active: true },
                    ]).filter(d => d.is_active && d.min_days > breakdown.totalDays).sort((a, b) => a.min_days - b.min_days)
                    const nextTier = sortedDiscounts[0]
                    if (!nextTier) return null
                    return (
                        <div className="price-calc__discount-hint">
                            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>Reserva {nextTier.min_days} días o más y obtén un descuento automático del {nextTier.discount_pct}% en tu alquiler.</span>
                        </div>
                    )
                })()
            )}

            {isBelowMinNights && (
                <div className="price-calc__min-nights-alert">
                    <AlertCircle size={14} />
                    <span>Estancia mínima requerida para estas fechas: {activeMinNights} noches.</span>
                </div>
            )}

            <button
                className="btn btn-forest btn-lg"
                style={{ width: '100%' }}
                disabled={!breakdown || breakdown.numNights === 0 || isBelowMinNights}
                onClick={handleReserve}
            >
                {isBelowMinNights
                    ? `Mínimo ${activeMinNights} noches requeridas`
                    : breakdown && breakdown.numNights > 0
                    ? `Reservar — ${formatPrice(breakdown.grandTotal)}`
                    : 'Selecciona fechas para reservar'}
            </button>

            {breakdown && breakdown.numNights > 0 && !isBelowMinNights && (
                <p className="price-calc__subtext-fianza">
                    <Check size={13} className="text-forest" style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                    Incluye {formatPrice(breakdown.deposit)} de fianza 100% reembolsable
                </p>
            )}

            <style jsx>{`
        .price-calc__subtext-fianza {
          font-size: var(--text-xs);
          color: var(--gray-500);
          text-align: center;
          margin-top: calc(-1 * var(--space-2));
          margin-bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .price-calc {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
          padding: var(--space-6);
          background: white;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
        }

        .price-calc__header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-bottom: var(--space-4);
          border-bottom: 1px solid var(--gray-100);
        }

        .price-calc__total {
          display: flex;
          align-items: baseline;
          gap: var(--space-1);
        }

        .price-calc__amount {
          font-family: var(--font-sans);
          font-size: var(--text-h4);
          font-weight: 700;
          color: var(--forest-green);
        }

        .price-calc__nights {
          font-size: var(--text-small);
          color: var(--gray-500);
        }

        .price-calc__dates-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .price-calc__dates-card {
          display: flex;
          align-items: center;
          background: #FAF8F5;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .price-calc__dates-card:hover {
          border-color: var(--forest-green);
          background: white;
        }

        .price-calc__dates-card--open {
          border-color: var(--forest-green);
          box-shadow: 0 0 0 1px var(--forest-green);
          background: white;
        }

        .price-calc__date-pill {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .price-calc__date-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #4A4540;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .price-calc__date-val {
          font-size: 0.90rem;
          font-weight: 700;
          color: #1A1A1A;
        }

        .price-calc__date-val--placeholder {
          color: #78716C;
          font-weight: 500;
        }

        .price-calc__date-separator {
          width: 1px;
          height: 28px;
          background: var(--gray-200);
          margin: 0 var(--space-2);
        }

        .price-calc__dates-caret {
          color: #4A4540;
          padding-left: var(--space-1);
        }

        .price-calc__schedule-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.76rem;
          color: #1E3324;
          background: #EAF2EB;
          border: 1px solid #CFE2D2;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-weight: 600;
        }

        .price-calc__calendar-collapse {
          overflow: hidden;
          margin-top: 4px;
        }

        .price-calc__pax-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-2);
        }

        .price-calc__pax-badge {
          font-size: 0.7rem;
          color: var(--forest-green);
          background: rgba(45, 58, 45, 0.08);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-weight: 500;
        }

        .price-calc__pax {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .price-calc__pax-num {
          flex: 1;
          text-align: center;
          font-weight: 500;
        }

        /* Collapsible Extras Dropdown styles */
        .price-calc__extras-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .price-calc__extras-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 14px;
          background: #FAF8F5;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .price-calc__extras-toggle:hover {
          background: #F4EFEB;
          border-color: rgba(43, 76, 55, 0.25);
        }

        .price-calc__extras-toggle--open {
          background: white;
          border-color: var(--forest-green);
          box-shadow: 0 0 0 1px var(--forest-green);
        }

        .price-calc__extras-toggle-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .price-calc__extras-toggle-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .price-calc__extras-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--black-matte);
          letter-spacing: 0.01em;
        }

        .price-calc__extras-hint {
          font-size: 0.72rem;
          color: var(--gray-500);
        }

        .price-calc__extras-toggle-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .price-calc__extras-count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background: var(--forest-green);
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          border-radius: var(--radius-full);
        }

        .price-calc__extras-chevron {
          color: var(--gray-500);
          transition: transform 0.2s ease;
        }

        .price-calc__extras-chevron--open {
          transform: rotate(180deg);
        }

        /* Chips for selected extras */
        .price-calc__extras-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 4px 0;
        }

        .price-calc__extra-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(43, 76, 55, 0.08);
          color: var(--forest-green);
          border: 1px solid rgba(43, 76, 55, 0.15);
          border-radius: var(--radius-full);
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .price-calc__extra-chip:hover {
          background: rgba(220, 38, 38, 0.1);
          color: #DC2626;
          border-color: rgba(220, 38, 38, 0.2);
        }

        .price-calc__chip-price {
          color: var(--gray-600);
          font-weight: 500;
        }

        /* Collapsible grid */
        .price-calc__extras-collapse {
          overflow: hidden;
        }

        .price-calc__extras-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 6px 0;
        }

        .price-calc__extra-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .price-calc__extra-card:hover {
          border-color: rgba(43, 76, 55, 0.3);
          background: #FAF8F5;
        }

        .price-calc__extra-card--selected {
          border-color: var(--forest-green);
          background: rgba(43, 76, 55, 0.05);
        }

        .price-calc__extra-card-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .price-calc__extra-checkbox {
          width: 16px;
          height: 16px;
          border: 1.5px solid var(--gray-400);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .price-calc__extra-checkbox--checked {
          background: var(--forest-green);
          border-color: var(--forest-green);
          color: white;
        }

        .price-calc__extra-name {
          font-size: 0.8rem;
          color: var(--black-matte);
          font-weight: 500;
        }

        .price-calc__extra-price {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--gray-600);
        }

        /* Price Breakdown Details */
        .price-calc__breakdown {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-4);
          background: #FAF8F5;
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: var(--radius-md);
          font-size: var(--text-small);
        }

        .price-calc__row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--gray-600);
        }

        .price-calc__row--discount {
          color: #15803D;
          font-weight: 600;
          background: rgba(34, 197, 94, 0.08);
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          margin: 2px 0;
        }

        .price-calc__discount-tag-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .price-calc__discount-badge {
          background: #15803D;
          color: white;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: var(--radius-full);
          letter-spacing: 0.02em;
        }

        .price-calc__discount-amount {
          font-size: 0.88rem;
          font-weight: 700;
          color: #15803D;
        }

        .price-calc__row--subtotal {
          font-weight: 600;
          color: var(--black-matte);
        }

        .price-calc__row--deposit {
          color: var(--gray-700);
          padding-top: 2px;
        }

        .price-calc__deposit-subtext {
          display: block;
          font-size: 0.68rem;
          color: var(--gray-500);
          font-weight: 400;
        }

        .price-calc__deposit-val {
          font-weight: 600;
          color: var(--black-matte);
        }

        .price-calc__row--total {
          font-weight: 700;
          font-size: 1.05rem;
          color: var(--forest-green);
          padding-top: var(--space-1);
        }

        .price-calc__divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.08);
          margin: var(--space-1) 0;
        }

        /* Discount Banner & Hint */
        .price-calc__discount-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: var(--radius-sm);
          color: #166534;
          font-size: 0.76rem;
          font-weight: 500;
        }

        .price-calc__discount-hint {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 8px 10px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: var(--radius-sm);
          color: #475569;
          font-size: 0.72rem;
          line-height: 1.4;
        }

        .price-calc__min-nights-alert {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #FEF3C7;
          border: 1px solid #F59E0B;
          border-radius: var(--radius-sm);
          color: #92400E;
          font-size: 0.78rem;
          font-weight: 500;
        }
      `}</style>
        </div>
    )
}
