'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import {
    Calendar as CalendarIcon,
    Clock,
    Users,
    ShieldCheck,
    Check,
    CreditCard,
    Lock,
    X,
    Info,
    Gauge,
    RefreshCw,
    Package,
    CarFront,
} from 'lucide-react'
import { WizardCamper, Step1Data, Step2Data, Step3Data, Step4Data } from './types'
import { PricingBreakdown, formatPrice } from '@/lib/pricing/engine'
import { resolveCamperContent, formatDepositEuros } from '@/lib/campers/camperCatalog'
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
    const resolved = resolveCamperContent(camper)
    const mainImage = resolved.cardImages[0] || resolved.galleryImages[0]?.src || '/images/campers/neo/neo-ext.png'
    const {
        standardDepositAmount,
        flexDepositAmount,
        flexDepositRatePerDay,
        included: includedServices,
    } = resolved.rental

    // Bloquear scroll del body cuando el bottom sheet móvil está abierto (AGENTS.md Regla 5)
    useEffect(() => {
        if (!isOpenMobile || typeof document === 'undefined') return
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prevOverflow
        }
    }, [isOpenMobile])

    const formatDateSlot = (dateStr: string, slot: 'morning' | 'afternoon', isDropoff: boolean) => {
        if (!dateStr) return 'Por seleccionar'
        try {
            const d = parseISO(dateStr)
            const dateFormatted = format(d, "d 'de' MMM", { locale: es })
            const slotLabel = slot === 'morning' ? 'Mañana' : 'Tarde'
            const timeTag = isDropoff
                ? (slot === 'morning' ? '09:00–12:00h' : '15:00–19:00h')
                : (slot === 'morning' ? '09:00–12:00h' : '15:00–19:00h')
            return `${dateFormatted} · ${slotLabel} (${timeTag})`
        } catch {
            return dateStr
        }
    }

    const totalPayable = breakdown ? breakdown.payableTotal : 0
    const totalDays = breakdown ? breakdown.totalDays : 0
    const numNights = breakdown ? breakdown.numNights : 0
    const depositAmount = breakdown
        ? breakdown.depositAmount
        : (step3.depositOption === 'flex_1000' ? flexDepositAmount : standardDepositAmount)

    const contentProps: TripSummaryContentProps = {
        camper,
        mainImage,
        step1,
        step2,
        step3,
        step4,
        breakdown,
        totalPayable,
        depositAmount,
        flexDepositRatePerDay,
        includedServices,
        totalDays,
        numNights,
        formatDateSlot,
    }

    return (
        <>
            {/* Desktop Sticky Card */}
            <aside className="sticky-summary-desktop">
                <div className="sticky-summary-card">
                    <div className="sticky-summary-card__header">
                        <h3 className="summary-heading">Resumen de tu Reserva</h3>
                    </div>
                    <TripSummaryContent {...contentProps} />
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
                                <h3 className="summary-heading">Resumen de tu Reserva · Desglose</h3>
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
                            <TripSummaryContent {...contentProps} />
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .sticky-summary-desktop {
                    display: block;
                    width: 100%;
                }

                .sticky-summary-card {
                    background: var(--wz-surface);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-xl);
                    padding: var(--space-5);
                    box-shadow: 0 4px 20px rgba(255, 255, 255, 0.04);
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
                    background: rgba(204, 160, 83, 0.08);
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

                /* Mobile Drawer */
                .mobile-summary-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.65);
                    backdrop-filter: blur(4px);
                    z-index: 60;
                    display: flex;
                    align-items: flex-end;
                    animation: fadeIn 0.2s ease-out;
                }

                .mobile-summary-sheet {
                    background: var(--wz-surface);
                    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
                    width: 100%;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.35);
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
                    color: var(--black-matte);
                    width: 34px;
                    height: 34px;
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

interface TripSummaryContentProps {
    camper: WizardCamper
    mainImage: string
    step1: Step1Data
    step2: Step2Data
    step3: Step3Data
    step4: Step4Data
    breakdown: PricingBreakdown | null
    totalPayable: number
    depositAmount: number
    flexDepositRatePerDay: number
    includedServices: string[]
    totalDays: number
    numNights: number
    formatDateSlot: (dateStr: string, slot: 'morning' | 'afternoon', isDropoff: boolean) => string
}

function TripSummaryContent({
    camper,
    mainImage,
    step1,
    step2,
    step3,
    breakdown,
    depositAmount,
    flexDepositRatePerDay,
    includedServices,
    totalDays,
    numNights,
    formatDateSlot,
}: TripSummaryContentProps) {
    return (
        <div className="trip-summary-content">
            {/* ── 1. FECHAS Y HORARIOS ── */}
            <div className="summary-section-block">
                <div className="summary-section-head">
                    <span className="summary-step-num">1</span>
                    <span className="summary-section-label">Fechas y Horarios</span>
                </div>

                <div className="summary-dates-card">
                    <div className="summary-date-row">
                        <CalendarIcon size={15} strokeWidth={1.8} className="summary-gold-icon" />
                        <div className="summary-date-details">
                            <span className="summary-date-label">Recogida:</span>
                            <span className="summary-date-val">
                                {formatDateSlot(step1.startDate, step1.startSlot, false)}
                            </span>
                        </div>
                    </div>

                    <div className="summary-date-row">
                        <Clock size={15} strokeWidth={1.8} className="summary-gold-icon" />
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
                    </div>

                    {breakdown && breakdown.numNights > 0 && (
                        <div className="summary-sub-breakdown">
                            {breakdown.nightsPerSeason.map((seasonItem, i) => (
                                <div key={i} className="summary-breakdown-row">
                                    <span className="summary-row-label">
                                        {seasonItem.season} ({seasonItem.nights} n. × {formatPrice(seasonItem.pricePerNight)})
                                    </span>
                                    <span className="summary-row-val">{formatPrice(seasonItem.subtotal)}</span>
                                </div>
                            ))}

                            {breakdown.slotSupplement > 0 && (
                                <div className="summary-breakdown-row summary-breakdown-row--slot">
                                    <span className="summary-row-label">
                                        Suplemento franja horaria (+{totalDays - numNights} día)
                                    </span>
                                    <span className="summary-row-val">+{formatPrice(breakdown.slotSupplement)}</span>
                                </div>
                            )}

                            {breakdown.discountAmount > 0 && (
                                <div className="summary-breakdown-row summary-breakdown-row--discount">
                                    <div className="summary-discount-label">
                                        <span className="discount-tag">−{breakdown.discountPct}%</span>
                                        <span>Descuento estancia larga</span>
                                    </div>
                                    <span className="summary-discount-val">−{formatPrice(breakdown.discountAmount)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── 2. MODELO SELECCIONADO ── */}
            <div className="summary-section-block">
                <div className="summary-section-head">
                    <span className="summary-step-num">2</span>
                    <span className="summary-section-label">Modelo Seleccionado</span>
                </div>

                <div className="summary-camper-card">
                    <div className="summary-camper-thumb">
                        <Image
                            src={mainImage}
                            alt={camper.name}
                            fill
                            priority
                            sizes="90px"
                            className="summary-camper-img"
                        />
                    </div>
                    <div className="summary-camper-info">
                        <span className="summary-brand-tag">UTOPIA VAN LIFE</span>
                        <h3 className="summary-camper-name">Utopia {camper.name}</h3>
                        <div className="summary-camper-specs">
                            <span>{camper.specs?.seats || (camper.slug === 'space' ? 2 : 3)} plazas</span>
                            <span>·</span>
                            <span>{camper.specs?.beds || (camper.slug === 'space' ? 2 : 3)} camas</span>
                            <span>·</span>
                            <span>{formatPrice(camper.base_price_per_night || camper.price_per_night || 110)}/noche base</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 3. KILOMETRAJE ── */}
            <div className="summary-section-block">
                <div className="summary-section-head">
                    <span className="summary-step-num">3</span>
                    <span className="summary-section-label">Kilometraje</span>
                </div>
                <div className="summary-item-box">
                    <div className="summary-breakdown-row">
                        <span className="summary-row-label summary-row-label--with-icon">
                            <Gauge size={15} strokeWidth={1.8} className="summary-gold-icon" />
                            <span>{step2.kmPackage === 'unlimited' ? 'Kilometraje Ilimitado' : '150 km / día incluidos'}</span>
                        </span>
                        <span className="summary-row-val">
                            {step2.kmPackage === 'unlimited' && breakdown
                                ? `+${formatPrice(breakdown.kmSupplement)}`
                                : 'Incluido'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── 4. SEGURO Y FIANZA ── */}
            <div className="summary-section-block">
                <div className="summary-section-head">
                    <span className="summary-step-num">4</span>
                    <span className="summary-section-label">Seguro y Fianza</span>
                </div>
                <div className="summary-item-box">
                    <div className="summary-breakdown-row">
                        <span className="summary-row-label summary-row-label--with-icon">
                            <ShieldCheck size={15} strokeWidth={1.8} className="summary-gold-icon" />
                            <span>
                                {step3.depositOption === 'flex_1000'
                                    ? `Seguro Flex (+${flexDepositRatePerDay} €/día)`
                                    : 'Seguro Estándar'}
                            </span>
                        </span>
                        <span className="summary-row-val">
                            {step3.depositOption === 'flex_1000'
                                ? (breakdown && breakdown.flexDepositSupplement > 0
                                    ? `+${formatPrice(breakdown.flexDepositSupplement)}`
                                    : `+${flexDepositRatePerDay} €/día`)
                                : 'Incluido'}
                        </span>
                    </div>
                    <div className="summary-breakdown-row summary-breakdown-row--muted">
                        <span className="summary-row-label">Fianza reembolsable (retención en entrega)</span>
                        <span className="summary-row-val">{formatPrice(depositAmount)}</span>
                    </div>
                    {breakdown && breakdown.secondDriver && (
                        <div className="summary-breakdown-row summary-breakdown-row--muted">
                            <span className="summary-row-label">
                                {breakdown.secondDriverRatePerDay > 0
                                    ? `Segundo conductor (+${breakdown.secondDriverRatePerDay} €/día)`
                                    : 'Segundo conductor'}
                            </span>
                            <span className="summary-row-val">
                                {breakdown.secondDriverSupplement > 0
                                    ? `+${formatPrice(breakdown.secondDriverSupplement)}`
                                    : '0,00 € (Incluido)'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── 5. POLÍTICA DE CANCELACIÓN ── */}
            <div className="summary-section-block">
                <div className="summary-section-head">
                    <span className="summary-step-num">5</span>
                    <span className="summary-section-label">Política de Cancelación</span>
                </div>
                <div className="summary-item-box">
                    <div className="summary-breakdown-row">
                        <span className="summary-row-label summary-row-label--with-icon">
                            <RefreshCw size={15} strokeWidth={1.8} className="summary-gold-icon" />
                            <span>Cancelación {step3.cancellationPolicy === 'flexible' ? 'Flex' : 'Estándar'}</span>
                        </span>
                        <span className="summary-row-val">
                            {step3.cancellationPolicy === 'flexible'
                                ? (breakdown && breakdown.cancellationSupplement > 0
                                    ? `+${formatPrice(breakdown.cancellationSupplement)}`
                                    : '+8 €/día')
                                : 'Incluida'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── 6. EXTRAS ── */}
            <div className="summary-section-block">
                <div className="summary-section-head">
                    <span className="summary-step-num">6</span>
                    <span className="summary-section-label">Extras</span>
                </div>
                <div className="summary-item-box">
                    {breakdown && breakdown.itemizedExtras.length > 0 ? (
                        <div className="summary-extras-group">
                            <div className="summary-extras-header">
                                <span className="summary-row-label summary-row-label--with-icon">
                                    <Package size={15} strokeWidth={1.8} className="summary-gold-icon" />
                                    <span>Extras seleccionados ({breakdown.itemizedExtras.length})</span>
                                </span>
                                <span className="summary-row-val">+{formatPrice(breakdown.extrasTotal)}</span>
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
                    ) : (
                        <div className="summary-breakdown-row">
                            <span className="summary-row-label summary-row-label--with-icon">
                                <Package size={15} strokeWidth={1.8} className="summary-gold-icon" />
                                <span>Sin extras opcionales</span>
                            </span>
                            <span className="summary-row-val">0,00 €</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── 7. PAGO Y TOTAL ── */}
            <div className="summary-section-block">
                <div className="summary-section-head">
                    <span className="summary-step-num">7</span>
                    <span className="summary-section-label">Pago · Total de la Reserva</span>
                </div>

                {breakdown && breakdown.numNights > 0 ? (
                    <div className="summary-total-box">
                        <div className="summary-total-row">
                            <div>
                                <span className="summary-total-title">Total a abonar ahora</span>
                                <span className="summary-total-sub">Alquiler, seguro a todo riesgo, paquetes y extras</span>
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
                    <span className="deposit-box__title">Fianza reembolsable · {formatPrice(depositAmount)}</span>
                </div>
                <div className="deposit-box__body">
                    <p className="deposit-box__text">
                        <strong>No se cobra hoy.</strong> Se realiza una retención temporal con tarjeta bancaria en la entrega de la camper y se libera al 100% tras la revisión a la devolución.
                    </p>
                </div>
            </div>

            {/* Included in All Rentals */}
            <div className="summary-included-box">
                <span className="summary-included-title">Incluido en todos los alquileres Utopia:</span>
                <ul className="summary-included-list">
                    {includedServices.map((item, i) => (
                        <li key={i} className="summary-included-item">
                            <Check size={14} strokeWidth={2.2} className="summary-included-icon" />
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

            <style jsx>{`
                .trip-summary-content {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .summary-section-block {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .summary-section-head {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                }

                .summary-step-num {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: var(--wz-pill-bg);
                    border: 1px solid var(--wz-pill-border);
                    color: var(--wz-pill-text);
                    font-size: 10px;
                    font-weight: 800;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .summary-section-label {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--gray-600);
                }

                .summary-item-box {
                    background: transparent;
                    border: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 0;
                    padding: 8px 0;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                /* Camper card */
                .summary-camper-card {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    background: transparent;
                    border: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 0;
                    padding: 8px 0;
                }

                .summary-camper-thumb {
                    position: relative;
                    width: 72px;
                    height: 48px;
                    border-radius: var(--radius-sm);
                    overflow: hidden;
                    background: var(--gray-100);
                    flex-shrink: 0;
                }

                .summary-camper-img {
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
                    color: #d4a742;
                }

                .summary-camper-name {
                    font-family: var(--font-display);
                    font-size: 14px;
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
                    background: transparent;
                    border: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 0;
                    padding: 8px 0;
                }

                .summary-date-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .summary-date-details {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: baseline;
                    gap: 5px;
                    font-size: 11.5px;
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
                    margin-top: 2px;
                    padding-top: 6px;
                }

                .stats-pill {
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--wz-pill-text);
                    background: var(--wz-pill-bg);
                    padding: 2px 8px;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--wz-pill-border);
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }

                :global(.stats-pill__icon) {
                    display: inline;
                    margin-right: 2px;
                }

                .summary-sub-breakdown {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    margin-top: 4px;
                    padding-top: 6px;
                    border-top: 1px dashed rgba(255, 255, 255, 0.08);
                }

                .summary-breakdown-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    font-size: 12px;
                    color: var(--gray-700);
                }

                :global(.summary-gold-icon) {
                    color: #d4a742;
                    flex-shrink: 0;
                }

                :global(html[data-theme="light"]) .summary-item-box,
                :global(html[data-theme="light"]) .summary-camper-card,
                :global(html[data-theme="light"]) .summary-dates-card {
                    border-bottom-color: rgba(26, 23, 20, 0.08);
                }

                :global(html[data-theme="light"]) .summary-sub-breakdown {
                    border-top-color: rgba(26, 23, 20, 0.08);
                }

                :global(html[data-theme="light"]) :global(.summary-gold-icon) {
                    color: #b38827;
                }

                .summary-breakdown-row--muted {
                    font-size: 11px;
                    color: var(--gray-500);
                }

                .summary-row-label--with-icon {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }

                .summary-breakdown-row--slot {
                    color: var(--forest-green);
                    font-style: italic;
                }

                .summary-breakdown-row--discount {
                    color: var(--wz-pill-text);
                    font-weight: 600;
                }

                .summary-discount-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .discount-tag {
                    background: var(--wz-pill-bg);
                    border: 1px solid var(--wz-pill-border);
                    color: var(--wz-pill-text);
                    font-size: 10px;
                    font-weight: 700;
                    padding: 1px 5px;
                    border-radius: var(--radius-sm);
                }

                .summary-row-val {
                    font-weight: 600;
                    color: var(--black-matte);
                    white-space: nowrap;
                }

                .summary-discount-val {
                    color: var(--wz-pill-text);
                    font-weight: 700;
                }

                .summary-extras-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .summary-extras-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--gray-700);
                }

                .summary-extra-subrow {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 11px;
                    color: var(--gray-600);
                    padding-left: 18px;
                }

                .summary-total-box {
                    background: var(--wz-pill-bg);
                    border: 1.5px solid var(--wz-pill-border);
                    border-radius: var(--radius-md);
                    padding: 11px 13px;
                }

                .summary-total-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
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
                    white-space: nowrap;
                }

                .summary-empty-state {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11px;
                    color: var(--gray-600);
                    background: var(--wz-chip-bg);
                    border: 1px solid var(--wz-chip-border);
                    padding: var(--space-3);
                    border-radius: var(--radius-md);
                }

                /* Deposit Box */
                .summary-deposit-box {
                    background: var(--wz-pill-bg);
                    border: 1px solid var(--wz-pill-border);
                    border-radius: var(--radius-md);
                    padding: 10px 12px;
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

                .deposit-box__text {
                    font-size: 10px;
                    color: var(--gray-600);
                    line-height: 1.45;
                    margin: 0;
                }

                /* Included list */
                .summary-included-box {
                    border-top: 1px solid var(--gray-100);
                    padding-top: var(--space-3);
                }

                .summary-included-title {
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: var(--gray-500);
                    display: block;
                    margin-bottom: 6px;
                }

                .summary-included-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }

                .summary-included-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11.5px;
                    color: var(--gray-600);
                    line-height: 1.35;
                    padding: 6px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }

                .summary-included-item:last-child {
                    border-bottom: none;
                }

                :global(.summary-included-icon) {
                    color: #d4a742;
                    flex-shrink: 0;
                }

                :global(html[data-theme="light"]) .summary-included-item {
                    border-bottom-color: rgba(26, 23, 20, 0.08);
                }

                :global(html[data-theme="light"]) :global(.summary-included-icon) {
                    color: #b38827;
                }

                /* Trust Footer */
                .summary-trust-footer {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 6px;
                    padding-top: var(--space-2);
                    border-top: 1px solid var(--gray-100);
                }

                .trust-badge {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--gray-500);
                }
            `}</style>
        </div>
    )
}
