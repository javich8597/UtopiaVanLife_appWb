'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { Calendar as CalendarIcon, Users, Plus, Minus, CheckCircle, ChevronDown } from 'lucide-react'
import { calculatePrice, formatPrice } from '@/lib/pricing/engine'
import type { Season, Extra } from '@/lib/pricing/engine'
import BookingCalendar, { BlockedRange } from './BookingCalendar'
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
    const [endDate, setEndDate] = useState(initialTo || '')
    const [pax, setPax] = useState(2)
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([])
    const [selectedExtras, setSelectedExtras] = useState<Extra[]>([])
    const [breakdown, setBreakdown] = useState<ReturnType<typeof calculatePrice> | null>(null)

    // Cargar fechas bloqueadas para esta furgoneta
    useEffect(() => {
        let isMounted = true
        async function fetchAvailability() {
            try {
                const res = await fetch(`/api/campers/${camperSlug}/availability`)
                if (res.ok) {
                    const data = await res.json()
                    if (isMounted && data.blockedRanges) {
                        setBlockedRanges(data.blockedRanges)
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

    // Recalcular desglose de precio
    useEffect(() => {
        if (!startDate || !endDate) { setBreakdown(null); return }
        const start = new Date(startDate)
        const end = new Date(endDate)
        if (end <= start) { setBreakdown(null); return }

        const result = calculatePrice(start, end, seasons, selectedExtras, depositAmount)
        setBreakdown(result)
    }, [startDate, endDate, selectedExtras, seasons, depositAmount])

    const toggleExtra = (extra: Extra) => {
        setSelectedExtras(prev =>
            prev.find(e => e.id === extra.id)
                ? prev.filter(e => e.id !== extra.id)
                : [...prev, extra]
        )
    }

    const handleDatesChange = (start: string, end: string) => {
        setStartDate(start)
        setEndDate(end)
        if (start && end) {
            // Cerramos el calendario suavemente al completar el rango
            setIsCalendarOpen(false)
        }
    }

    const handleReserve = () => {
        if (!startDate || !endDate || !breakdown) return
        const params = new URLSearchParams({
            camper: camperSlug,
            from: startDate,
            to: endDate,
            pax: String(Math.min(3, Math.max(1, pax))),
            extras: selectedExtras.map(e => e.id).join(','),
        })
        router.push(`/checkout?${params.toString()}`)
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
        <div className="price-calc">
            <div className="price-calc__header">
                <h3 className="text-h4">Calcular precio</h3>
                {breakdown && (
                    <div className="price-calc__total">
                        <span className="price-calc__amount">{formatPrice(breakdown.totalWithoutDeposit)}</span>
                        <span className="price-calc__nights">/ {breakdown.numNights} noche{breakdown.numNights !== 1 ? 's' : ''}</span>
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
                            Llegada
                        </span>
                        <span className={`price-calc__date-val ${!startDate ? 'price-calc__date-val--placeholder' : ''}`}>
                            {formatDisplayDate(startDate) || 'Añadir fecha'}
                        </span>
                    </div>

                    <div className="price-calc__date-separator" />

                    <div className="price-calc__date-pill">
                        <span className="price-calc__date-label">
                            <CalendarIcon size={12} style={{ display: 'inline', marginRight: 5 }} />
                            Salida
                        </span>
                        <span className={`price-calc__date-val ${!endDate ? 'price-calc__date-val--placeholder' : ''}`}>
                            {formatDisplayDate(endDate) || 'Añadir fecha'}
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
                                endDate={endDate}
                                onChange={handleDatesChange}
                                blockedRanges={blockedRanges}
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
                        <span>Subtotal (sin fianza)</span>
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

            <button
                className="btn btn-forest btn-lg"
                style={{ width: '100%' }}
                disabled={!breakdown || breakdown.numNights === 0}
                onClick={handleReserve}
            >
                {breakdown && breakdown.numNights > 0
                    ? `Reservar — ${formatPrice(breakdown.grandTotal)}`
                    : 'Selecciona fechas para reservar'}
            </button>

            {breakdown && breakdown.numNights >= 7 && breakdown.discountPct > 0 && (
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
          border: 1px solid var(--gray-200);
          box-shadow: var(--shadow-md);
          position: sticky;
          top: 88px;
        }
        .price-calc__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .price-calc__total { text-align: right; }
        .price-calc__amount {
          font-family: var(--font-display);
          font-size: 1.8rem;
          font-weight: 500;
          color: var(--forest-green);
        }
        .price-calc__nights {
          font-size: 0.8rem;
          color: var(--gray-400);
          display: block;
        }
        .price-calc__dates-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .price-calc__dates-card {
          display: flex;
          align-items: center;
          padding: var(--space-2) var(--space-3);
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius-md);
          background: #FAF8F5;
          cursor: pointer;
          transition: all var(--transition-fast);
          user-select: none;
        }
        .price-calc__dates-card:hover {
          border-color: var(--sand-dark);
          background: white;
        }
        .price-calc__dates-card--open {
          border-color: var(--forest-green);
          background: white;
          box-shadow: 0 0 0 1px var(--forest-green);
        }
        .price-calc__date-pill {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: var(--space-1) var(--space-2);
        }
        .price-calc__date-label {
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--gray-600);
        }
        .price-calc__date-val {
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--black-matte);
        }
        .price-calc__date-val--placeholder {
          color: var(--gray-400);
          font-weight: 400;
        }
        .price-calc__date-separator {
          width: 1px;
          height: 28px;
          background: var(--gray-200);
        }
        .price-calc__dates-caret {
          padding-left: var(--space-2);
          color: var(--gray-600);
          display: flex;
          align-items: center;
        }
        .price-calc__calendar-collapse {
          overflow: hidden;
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
          gap: var(--space-4);
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
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          border: 1.5px solid var(--gray-200);
          font-size: 0.85rem;
          transition: all var(--transition-fast);
          text-align: left;
          cursor: pointer;
          background: white;
        }
        .price-calc__extra:hover { border-color: var(--forest-green); }
        .price-calc__extra--selected {
          border-color: var(--forest-green);
          background: rgba(45,58,45,0.04);
          color: var(--forest-green);
        }
        .price-calc__extra-check { color: var(--forest-green); }
        .price-calc__extra-price {
          margin-left: auto;
          font-weight: 600;
          font-size: 0.8rem;
        }
        .price-calc__breakdown {
          background: var(--cream);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .price-calc__row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: var(--gray-600);
        }
        .price-calc__row--discount { color: var(--success); }
        .price-calc__row--subtotal {
          font-weight: 500;
          color: var(--black-matte);
          margin-top: var(--space-1);
        }
        .price-calc__row--total {
          font-weight: 700;
          font-size: 1rem;
          color: var(--black-matte);
        }
        .price-calc__divider {
          height: 1px;
          background: var(--gray-200);
          margin-block: var(--space-2);
        }
      `}</style>
        </div>
    )
}
