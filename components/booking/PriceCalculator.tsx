'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { Calendar as CalendarIcon, Users, Plus, Minus, CheckCircle, ChevronDown, AlertCircle } from 'lucide-react'
import { calculatePrice, formatPrice, getMinNightsForDate, DaySlot } from '@/lib/pricing/engine'
import type { Season, Extra } from '@/lib/pricing/engine'
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
}

export default function PriceCalculator({
    camperSlug,
    depositAmount,
    seasons,
    availableExtras,
    initialFrom,
    initialTo,
}: PriceCalculatorProps) {
    const router = useRouter()
    const [startDate, setStartDate] = useState(initialFrom || '')
    const [startSlot, setStartSlot] = useState<DaySlot>('afternoon')
    const [endDate, setEndDate] = useState(initialTo || '')
    const [endSlot, setEndSlot] = useState<DaySlot>('morning')
    const [pax, setPax] = useState(2)
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
    const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([])
    const [selectedExtras, setSelectedExtras] = useState<Extra[]>([])
    const [breakdown, setBreakdown] = useState<ReturnType<typeof calculatePrice> | null>(null)

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
    const activeMinNights = startDate ? getMinNightsForDate(new Date(startDate), seasons) : 3

    // Recalcular desglose de precio con granularidad de medio día
    useEffect(() => {
        if (!startDate || !endDate) { setBreakdown(null); return }
        const start = new Date(startDate)
        const end = new Date(endDate)
        if (end <= start) { setBreakdown(null); return }

        const result = calculatePrice(start, startSlot, end, endSlot, seasons, selectedExtras, depositAmount)
        setBreakdown(result)
    }, [startDate, startSlot, endDate, endSlot, selectedExtras, seasons, depositAmount])

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
        if (start && end) {
            // Cerramos el calendario suavemente al completar el rango
            setIsCalendarOpen(false)
        }
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

            {/* Pax (1 to 3 travellers max) */}
            <div className="form-group">
                <div className="price-calc__pax-header">
                    <label className="form-label" style={{ marginBottom: 0 }}>
                        <Users size={12} style={{ display: 'inline', marginRight: 5 }} />
                        Viajeros
                    </label>
                    <span className="price-calc__pax-badge">Máx. 3 plazas</span>
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
                        onClick={() => setPax(p => Math.min(3, p + 1))}
                        disabled={pax >= 3}
                        aria-label="Aumentar viajeros (máximo 3)"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Extras */}
            {availableExtras.length > 0 && (
                <div>
                    <label className="form-label" style={{ marginBottom: 'var(--space-3)', display: 'block' }}>Extras opcionales</label>
                    <div className="price-calc__extras">
                        {availableExtras.map(extra => {
                            const selected = selectedExtras.find(e => e.id === extra.id)
                            return (
                                <button
                                    key={extra.id}
                                    type="button"
                                    className={`price-calc__extra ${selected ? 'price-calc__extra--selected' : ''}`}
                                    onClick={() => toggleExtra(extra)}
                                >
                                    {selected && <CheckCircle size={14} className="price-calc__extra-check" />}
                                    <span>{extra.name_es}</span>
                                    <span className="price-calc__extra-price">+{formatPrice(extra.price)}</span>
                                </button>
                            )
                        })}
                    </div>
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
                            <span>Descuento estancia larga ({breakdown.discountPct}%)</span>
                            <span>−{formatPrice(breakdown.discountAmount)}</span>
                        </div>
                    )}
                    {breakdown.extrasTotal > 0 && (
                        <div className="price-calc__row">
                            <span>Extras</span>
                            <span>{formatPrice(breakdown.extrasTotal)}</span>
                        </div>
                    )}
                    <div className="price-calc__divider" />
                    <div className="price-calc__row price-calc__row--subtotal">
                        <span>Subtotal ({breakdown.totalDays} días)</span>
                        <span>{formatPrice(breakdown.totalWithoutDeposit)}</span>
                    </div>
                    <div className="price-calc__row">
                        <span>Fianza (reembolsable)</span>
                        <span>{formatPrice(breakdown.deposit)}</span>
                    </div>
                    <div className="price-calc__row price-calc__row--total">
                        <span>Total</span>
                        <span>{formatPrice(breakdown.grandTotal)}</span>
                    </div>
                </div>
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

            {breakdown && breakdown.totalDays >= 7 && breakdown.discountPct > 0 && (
                <p className="text-xs" style={{ textAlign: 'center', color: 'var(--success)', marginTop: 'var(--space-2)' }}>
                    ✓ Descuento de estancia larga aplicado ({breakdown.discountPct}%)
                </p>
            )}

            <style jsx>{`
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

        .price-calc__extras {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .price-calc__extra {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
          background: white;
          cursor: pointer;
          font-size: var(--text-small);
          transition: all var(--transition-fast);
          text-align: left;
        }

        .price-calc__extra:hover {
          border-color: var(--sand-dark);
          background: #FAF8F5;
        }

        .price-calc__extra--selected {
          border-color: var(--forest-green);
          background: rgba(45, 58, 45, 0.05);
        }

        .price-calc__extra-check {
          color: var(--forest-green);
          flex-shrink: 0;
        }

        .price-calc__extra-price {
          margin-left: auto;
          font-weight: 500;
          color: var(--gray-600);
        }

        .price-calc__breakdown {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-4);
          background: #FAF8F5;
          border-radius: var(--radius-md);
          font-size: var(--text-small);
        }

        .price-calc__row {
          display: flex;
          justify-content: space-between;
          color: var(--gray-600);
        }

        .price-calc__row--discount {
          color: var(--success);
        }

        .price-calc__row--subtotal {
          font-weight: 600;
          color: var(--black-matte);
        }

        .price-calc__row--total {
          font-weight: 700;
          font-size: var(--text-body);
          color: var(--forest-green);
        }

        .price-calc__divider {
          height: 1px;
          background: var(--gray-200);
          margin: var(--space-1) 0;
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
