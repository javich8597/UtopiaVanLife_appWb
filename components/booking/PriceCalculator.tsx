'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { Calendar, Users, Plus, Minus, CheckCircle } from 'lucide-react'
import { calculatePrice, formatPrice } from '@/lib/pricing/engine'
import type { Season, Extra } from '@/lib/pricing/engine'

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
    const [selectedExtras, setSelectedExtras] = useState<Extra[]>([])
    const [breakdown, setBreakdown] = useState<ReturnType<typeof calculatePrice> | null>(null)

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

    const handleReserve = () => {
        if (!startDate || !endDate || !breakdown) return
        const params = new URLSearchParams({
            camper: camperSlug,
            from: startDate,
            to: endDate,
            pax: String(pax),
            extras: selectedExtras.map(e => e.id).join(','),
        })
        router.push(`/checkout?${params.toString()}`)
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

            {/* Dates */}
            <div className="price-calc__dates">
                <div className="form-group">
                    <label className="form-label">
                        <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                        Llegada
                    </label>
                    <input
                        type="date"
                        className="form-input"
                        value={startDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setStartDate(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">
                        <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                        Salida
                    </label>
                    <input
                        type="date"
                        className="form-input"
                        value={endDate}
                        min={startDate || new Date().toISOString().split('T')[0]}
                        onChange={e => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Pax */}
            <div className="form-group">
                <label className="form-label">
                    <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Viajeros
                </label>
                <div className="price-calc__pax">
                    <button type="button" className="btn btn-outline btn-icon" onClick={() => setPax(p => Math.max(1, p - 1))}>
                        <Minus size={16} />
                    </button>
                    <span className="price-calc__pax-num">{pax} persona{pax !== 1 ? 's' : ''}</span>
                    <button type="button" className="btn btn-outline btn-icon" onClick={() => setPax(p => Math.min(6, p + 1))}>
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
        .price-calc__dates {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
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
