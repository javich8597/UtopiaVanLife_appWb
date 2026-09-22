'use client'

import React from 'react'
import Image from 'next/image'
import {
    Calendar as CalendarIcon,
    Clock,
    Users,
    Shield,
    ShieldCheck,
    Check,
    Sparkles,
    CreditCard,
    Lock,
    X,
    Info,
    ChevronDown,
    ChevronUp,
} from 'lucide-react'
import { WizardCamper, Step1Data, Step2Data, Step3Data, Step4Data } from './types'
import { PricingBreakdown, formatPrice } from '@/lib/pricing/engine'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface StickyTripSummaryProps {
    camper: WizardCamper
    breakdown: PricingBreakdown | null
    step1: Step1Data
    step2: Step2Data
    step3: Step3Data
    step4: Step4Data
    isOpenMobile?: boolean
    onCloseMobile?: () => void
}

const INCLUDED_SERVICES = [
    'Seguro a todo riesgo con asistencia en carretera 24/7',
    'Ropa de cama completa, sábanas, almohadas y toallas de baño',
    'Menaje de cocina completo, cafetera italiana y kit de limpieza',
    '2 Sillas de camping para exterior y 2 máscaras de snorkel',
]

export default function StickyTripSummary({
    camper,
    breakdown,
    step1,
    step2,
    step3,
    step4,
    isOpenMobile = false,
    onCloseMobile,
}: StickyTripSummaryProps) {
    const mainImage = camper.images && camper.images.length > 0 ? camper.images[0] : '/images/campers/neo/neo-ext.png'

    const formatDateSlot = (dateStr: string, slot: 'morning' | 'afternoon', isDropoff: boolean) => {
        if (!dateStr) return 'Por seleccionar'
        try {
            const d = parseISO(dateStr)
            const dateFormatted = format(d, "d 'de' MMM", { locale: es })
            const timeTag = isDropoff
                ? (slot === 'morning' ? '12:00h' : '19:00h')
                : (slot === 'morning' ? '09:00h' : '15:00h')
            return `${dateFormatted} (${timeTag})`
        } catch {
            return dateStr
        }
    }

    const totalPayable = breakdown ? breakdown.payableTotal : 0
    const totalDays = breakdown ? breakdown.totalDays : 0
    const numNights = breakdown ? breakdown.numNights : 0
    const depositAmount = breakdown ? breakdown.depositAmount : 1000

    const summaryContent = (
        <div className="trip-summary-content">
            {/* Header info */}
            <div className="summary-camper-card">
                <div className="summary-camper-thumb">
                    <Image
                        src={mainImage}
                        alt={camper.name}
                        width={90}
                        height={60}
                        className="summary-camper-img"
                    />
                </div>
                <div className="summary-camper-info">
                    <span className="summary-brand-tag">UTOPIA VAN LIFE</span>
                    <h3 className="summary-camper-name">{camper.name}</h3>
                    <div className="summary-camper-specs">
                        <span>{camper.specs?.seats || 2} plazas</span>
                        <span>·</span>
                        <span>{camper.specs?.beds || 2} camas</span>
                        <span>·</span>
                        <span>{camper.specs?.engine || 'Diésel 140 CV'}</span>
                    </div>
                </div>
            </div>

            {/* Selected Dates and Slots */}
            <div className="summary-dates-card">
                <div className="summary-date-row">
                    <div className="summary-date-icon">
                        <CalendarIcon size={14} className="text-forest" />
                    </div>
                    <div className="summary-date-details">
                        <span className="summary-date-label">Recogida:</span>
                        <span className="summary-date-val">
                            {formatDateSlot(step1.startDate, step1.startSlot, false)}
                        </span>
                    </div>
                </div>

                <div className="summary-date-row">
                    <div className="summary-date-icon">
                        <Clock size={14} className="text-forest" />
                    </div>
                    <div className="summary-date-details">
                        <span className="summary-date-label">Devolución:</span>
                        <span className="summary-date-val">
                            {formatDateSlot(step1.endDate, step1.endSlot, true)}
                        </span>
                    </div>
                </div>

                <div className="summary-stats-pills">
                    <span className="stats-pill">
                        {numNights} {numNights === 1 ? 'noche' : 'noches'} ({totalDays} días)
                    </span>
                    <span className="stats-pill">
                        <Users size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {step1.pax} {step1.pax === 1 ? 'viajero' : 'viajeros'}
                    </span>
                </div>
            </div>

            {/* Price Breakdown */}
            <div className="summary-breakdown-section">
                <h4 className="summary-breakdown-title">Desglose económico</h4>

                {breakdown && breakdown.numNights > 0 ? (
                    <div className="summary-breakdown-list">
                        {/* Nights by season */}
                        {breakdown.nightsPerSeason.map((seasonItem, i) => (
                            <div key={i} className="summary-breakdown-row">
                                <span className="summary-row-label">
                                    {seasonItem.season} ({seasonItem.nights} n. × {formatPrice(seasonItem.pricePerNight)})
                                </span>
                                <span className="summary-row-val">{formatPrice(seasonItem.subtotal)}</span>
                            </div>
                        ))}

                        {/* Half-day slot supplement */}
                        {breakdown.slotSupplement > 0 && (
                            <div className="summary-breakdown-row summary-breakdown-row--slot">
                                <span className="summary-row-label">
                                    Suplemento franja horaria (+{totalDays - numNights} día)
                                </span>
                                <span className="summary-row-val">+{formatPrice(breakdown.slotSupplement)}</span>
                            </div>
                        )}

                        {/* Duration Discount */}
                        {breakdown.discountAmount > 0 && (
                            <div className="summary-breakdown-row summary-breakdown-row--discount">
                                <div className="summary-discount-label">
                                    <span className="discount-tag">−{breakdown.discountPct}%</span>
                                    <span>Descuento estancia larga</span>
                                </div>
                                <span className="summary-discount-val">−{formatPrice(breakdown.discountAmount)}</span>
                            </div>
                        )}

                        {/* KM Package */}
                        <div className="summary-breakdown-row">
                            <span className="summary-row-label">
                                Paquete KM ({step2.kmPackage === 'unlimited' ? 'Ilimitado' : '150 km/día'})
                            </span>
                            <span className="summary-row-val">
                                {step2.kmPackage === 'unlimited'
                                    ? `+${formatPrice(breakdown.kmSupplement)}`
                                    : '0,00 € (Incluido)'}
                            </span>
                        </div>

                        {/* Cancellation Policy */}
                        <div className="summary-breakdown-row">
                            <span className="summary-row-label">
                                Cancelación ({step3.cancellationPolicy === 'flexible' ? 'Flexible' : 'Estándar'})
                            </span>
                            <span className="summary-row-val">
                                {step3.cancellationPolicy === 'flexible'
                                    ? `+${formatPrice(breakdown.cancellationSupplement)}`
                                    : '0,00 € (Incluida)'}
                            </span>
                        </div>

                        {/* Selected Extras */}
                        {breakdown.itemizedExtras.length > 0 && (
                            <div className="summary-extras-group">
                                <div className="summary-extras-header">
                                    <span>Extras seleccionados ({breakdown.itemizedExtras.length})</span>
                                    <span>{formatPrice(breakdown.extrasTotal)}</span>
                                </div>
                                {breakdown.itemizedExtras.map((extra) => (
                                    <div key={extra.id} className="summary-extra-subrow">
                                        <span className="extra-subrow-name">
                                            {extra.quantity > 1 ? `${extra.quantity}× ` : ''}{extra.name}
                                        </span>
                                        <span className="extra-subrow-val">{formatPrice(extra.total)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Divider */}
                        <div className="summary-divider" />

                        {/* Total To Pay Now */}
                        <div className="summary-total-row">
                            <div>
                                <span className="summary-total-title">Total a abonar</span>
                                <span className="summary-total-sub">100% alquiler, paquetes y extras</span>
                            </div>
                            <span className="summary-total-amount">{formatPrice(breakdown.payableTotal)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="summary-empty-state">
                        <Info size={16} />
                        <span>Selecciona tus fechas en el Paso 1 para calcular el precio exacto en tiempo real.</span>
                    </div>
                )}
            </div>

            {/* Informative Deposit Notice */}
            <div className="summary-deposit-box">
                <div className="deposit-box__header">
                    <ShieldCheck size={16} className="text-forest" />
                    <span className="deposit-box__title">Fianza informativa reembolsable</span>
                </div>
                <div className="deposit-box__body">
                    <span className="deposit-box__amount">{formatPrice(depositAmount)}</span>
                    <p className="deposit-box__text">
                        <strong>No se cobra ahora.</strong> Se realiza una retención temporal con tarjeta bancaria el día de entrega del vehículo y se libera íntegramente tras la revisión al finalizar el viaje.
                    </p>
                </div>
            </div>

            {/* Included in All Rentals */}
            <div className="summary-included-box">
                <span className="summary-included-title">Incluido en todos los alquileres Utopia:</span>
                <ul className="summary-included-list">
                    {INCLUDED_SERVICES.map((item, i) => (
                        <li key={i} className="summary-included-item">
                            <Check size={13} className="text-forest" style={{ flexShrink: 0, marginTop: 3 }} />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Trust Footer */}
            <div className="summary-trust-footer">
                <div className="trust-badge">
                    <Lock size={12} />
                    <span>Pago seguro TPV Virtual CaixaBank Redsys</span>
                </div>
                <div className="trust-badge">
                    <CreditCard size={12} />
                    <span>Bizum, Visa y Mastercard</span>
                </div>
            </div>
        </div>
    )

    return (
        <>
            {/* Desktop Sticky Card */}
            <aside className="sticky-summary-desktop">
                <div className="sticky-summary-card">
                    <div className="sticky-summary-card__header">
                        <h3 className="summary-heading">Tu Viaje · Utopia Van Life</h3>
                        <span className="summary-live-indicator">
                            <span className="live-dot" />
                            En vivo
                        </span>
                    </div>
                    {summaryContent}
                </div>
            </aside>

            {/* Mobile Bottom Sheet Drawer */}
            {isOpenMobile && (
                <div className="mobile-summary-backdrop" onClick={onCloseMobile}>
                    <div
                        className="mobile-summary-sheet"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mobile-summary-sheet__header">
                            <div className="mobile-sheet-drag-handle" />
                            <div className="mobile-sheet-title-row">
                                <h3 className="summary-heading">Tu Viaje · Desglose Completo</h3>
                                <button
                                    type="button"
                                    className="mobile-sheet-close-btn"
                                    onClick={onCloseMobile}
                                    aria-label="Cerrar desglose"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="mobile-summary-sheet__scrollable">
                            {summaryContent}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                /* Desktop sticky aside */
                .sticky-summary-desktop {
                    display: block;
                    width: 100%;
                }

                .sticky-summary-card {
                    background: #ffffff;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-xl);
                    padding: var(--space-5);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
                    position: sticky;
                    top: 90px;
                }

                .sticky-summary-card__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: var(--space-4);
                    padding-bottom: var(--space-3);
                    border-bottom: 1px solid var(--gray-100);
                }

                .summary-heading {
                    font-family: var(--font-display);
                    font-size: 15px;
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                }

                .summary-live-indicator {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: var(--forest-green);
                    background: rgba(45, 58, 45, 0.08);
                    padding: 2px 8px;
                    border-radius: var(--radius-full);
                }

                .live-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--forest-green);
                    animation: pulse 1.8s infinite ease-in-out;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.3); }
                }

                .trip-summary-content {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                /* Camper card */
                .summary-camper-card {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    background: #faf8f5;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    padding: var(--space-3);
                }

                .summary-camper-thumb {
                    width: 78px;
                    height: 52px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    background: #202020;
                    flex-shrink: 0;
                }

                .summary-camper-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .summary-camper-info {
                    display: flex;
                    flex-direction: column;
                }

                .summary-brand-tag {
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: var(--forest-green);
                }

                .summary-camper-name {
                    font-family: var(--font-display);
                    font-size: var(--text-base);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                    line-height: 1.2;
                }

                .summary-camper-specs {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    font-size: 11px;
                    color: var(--gray-600);
                    margin-top: 2px;
                }

                /* Dates card */
                .summary-dates-card {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    background: #faf8f5;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md);
                    padding: var(--space-3);
                }

                .summary-date-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .summary-date-details {
                    display: flex;
                    align-items: baseline;
                    gap: 6px;
                    font-size: 12px;
                }

                .summary-date-label {
                    color: var(--gray-600);
                    font-weight: 500;
                }

                .summary-date-val {
                    font-weight: 700;
                    color: var(--black-matte);
                }

                .summary-stats-pills {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 4px;
                    padding-top: 6px;
                    border-top: 1px solid rgba(0, 0, 0, 0.05);
                }

                .stats-pill {
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--gray-700);
                    background: #ffffff;
                    padding: 2px 8px;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--gray-200);
                }

                /* Breakdown section */
                .summary-breakdown-section {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }

                .summary-breakdown-title {
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--gray-600);
                    margin: 0;
                }

                .summary-breakdown-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .summary-breakdown-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 12px;
                    color: var(--gray-700);
                }

                .summary-breakdown-row--slot {
                    color: var(--forest-green);
                    font-style: italic;
                }

                .summary-breakdown-row--discount {
                    color: #1b5e20;
                    font-weight: 600;
                }

                .summary-discount-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .discount-tag {
                    background: #e8f5e9;
                    color: #1b5e20;
                    font-size: 10px;
                    font-weight: 700;
                    padding: 1px 5px;
                    border-radius: var(--radius-sm);
                }

                .summary-row-val {
                    font-weight: 600;
                    color: var(--black-matte);
                }

                .summary-discount-val {
                    color: #1b5e20;
                    font-weight: 700;
                }

                .summary-extras-group {
                    margin-top: 4px;
                    padding-top: 6px;
                    border-top: 1px dashed var(--gray-200);
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .summary-extras-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--gray-700);
                }

                .summary-extra-subrow {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 11px;
                    color: var(--gray-600);
                    padding-left: 8px;
                }

                .summary-divider {
                    height: 1px;
                    background: var(--gray-200);
                    margin: 6px 0;
                }

                .summary-total-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-top: 4px;
                }

                .summary-total-title {
                    font-size: var(--text-sm);
                    font-weight: 700;
                    color: var(--black-matte);
                    display: block;
                }

                .summary-total-sub {
                    font-size: 10px;
                    color: var(--gray-500);
                    display: block;
                }

                .summary-total-amount {
                    font-size: var(--text-xl);
                    font-weight: 800;
                    color: var(--forest-green);
                }

                .summary-empty-state {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11px;
                    color: var(--gray-600);
                    background: #faf8f5;
                    padding: var(--space-3);
                    border-radius: var(--radius-md);
                }

                /* Deposit Box */
                .summary-deposit-box {
                    background: rgba(45, 58, 45, 0.04);
                    border: 1px solid rgba(45, 58, 45, 0.12);
                    border-radius: var(--radius-md);
                    padding: var(--space-3);
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .deposit-box__header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .deposit-box__title {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--forest-green);
                }

                .deposit-box__body {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .deposit-box__amount {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--black-matte);
                }

                .deposit-box__text {
                    font-size: 10px;
                    color: var(--gray-600);
                    line-height: 1.4;
                    margin: 0;
                }

                /* Included Box */
                .summary-included-box {
                    background: #ffffff;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md);
                    padding: var(--space-3);
                }

                .summary-included-title {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--black-matte);
                    margin-bottom: 6px;
                    display: block;
                }

                .summary-included-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .summary-included-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 6px;
                    font-size: 11px;
                    color: var(--gray-600);
                    line-height: 1.35;
                }

                /* Trust Footer */
                .summary-trust-footer {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    padding-top: var(--space-2);
                    border-top: 1px solid var(--gray-100);
                }

                .trust-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    color: var(--gray-500);
                }

                /* Mobile Drawer */
                .mobile-summary-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    z-index: 60;
                    display: flex;
                    align-items: flex-end;
                    animation: fadeIn 0.2s ease-out;
                }

                .mobile-summary-sheet {
                    background: #ffffff;
                    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
                    width: 100%;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.2);
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .mobile-summary-sheet__header {
                    padding: var(--space-3) var(--space-4);
                    border-bottom: 1px solid var(--gray-100);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }

                .mobile-sheet-drag-handle {
                    width: 36px;
                    height: 4px;
                    background: var(--gray-300);
                    border-radius: var(--radius-full);
                }

                .mobile-sheet-title-row {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .mobile-sheet-close-btn {
                    border: none;
                    background: var(--gray-100);
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .mobile-summary-sheet__scrollable {
                    overflow-y: auto;
                    padding: var(--space-4);
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </>
    )
}
