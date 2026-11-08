'use client'

import React from 'react'
import { ShieldCheck, Check, Sparkles, RefreshCw, UserCheck, Shield } from 'lucide-react'
import { Step3Data, DepositOption, CancellationPolicy } from './types'
import { formatPrice } from '@/lib/pricing/engine'

interface Step3CancellationProps {
    data: Step3Data
    totalDays: number
    onChange: (data: Step3Data) => void
}

export default function Step3Cancellation({
    data,
    totalDays,
    onChange,
}: Step3CancellationProps) {
    const effectiveDays = Math.max(1, totalDays || 1)
    const flexibleCost = 8 * effectiveDays
    const flexDepositCost = 10 * effectiveDays
    const currentDeposit: DepositOption = data.depositOption || 'standard_2000'

    const handleDepositChange = (option: DepositOption) => {
        onChange({
            ...data,
            depositOption: option,
        })
    }

    const handleCancellationChange = (policy: CancellationPolicy) => {
        onChange({
            ...data,
            cancellationPolicy: policy,
        })
    }

    return (
        <div className="step-cancellation">
            {/* Step Header */}
            <div className="step-header">
                <span className="step-header__tag">PASO 3 DE 5</span>
                <h2 className="step-header__title">Cobertura, Fianza y Cancelación</h2>
                <p className="step-header__desc">
                    Personaliza las garantías de tu viaje en camper por Mallorca. Elige la modalidad de fianza y la política de cancelación que mejor se adapte a tus planes.
                </p>
            </div>

            {/* ── 1. SELECTOR DE POLÍTICA DE FIANZA ── */}
            <div className="section-block">
                <div className="section-block__header">
                    <div className="section-block__title-wrap">
                        <ShieldCheck size={20} className="text-forest" />
                        <h3 className="section-block__title">1. Modalidad de Fianza y Seguro</h3>
                    </div>
                    <p className="section-block__desc">
                        El depósito de fianza no se abona hoy: se bloquea temporalmente en tu tarjeta de crédito o débito durante el check-in presencial y se desbloquea al 100% tras el viaje.
                    </p>
                </div>

                <div className="cards-grid">
                    {/* Opción 1: Fianza Estándar 2.000 € */}
                    <div
                        role="radio"
                        aria-checked={currentDeposit === 'standard_2000'}
                        tabIndex={0}
                        className={`policy-card ${currentDeposit === 'standard_2000' ? 'policy-card--active' : ''}`}
                        onClick={() => handleDepositChange('standard_2000')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleDepositChange('standard_2000')
                            }
                        }}
                    >
                        <div className="policy-card__header">
                            <div className="policy-card__radio">
                                {currentDeposit === 'standard_2000' && (
                                    <div className="policy-card__radio-inner" />
                                )}
                            </div>
                            <span className="policy-card__badge policy-card__badge--standard">
                                Sin recargo
                            </span>
                        </div>

                        <div className="policy-card__body">
                            <div className="policy-card__title-row">
                                <Shield size={20} className="text-forest" />
                                <h4 className="policy-card__title">Fianza Estándar · 2.000 €</h4>
                            </div>

                            <div className="policy-card__price-box">
                                <span className="policy-card__price-amount">0,00 €</span>
                                <span className="policy-card__price-sub">Sin recargo diario · 1 conductor incluido</span>
                            </div>

                            <p className="policy-card__description">
                                Modalidad base con retención temporal de 2.000 € en tarjeta bancaria. Se libera íntegramente tras la inspección del vehículo en el check-out.
                            </p>

                            <ul className="policy-card__features">
                                <li className="feature-item">
                                    <Check size={14} className="feature-item__icon" />
                                    <span>Seguro a todo riesgo con franquicia de 1.000 €</span>
                                </li>
                                <li className="feature-item">
                                    <Check size={14} className="feature-item__icon" />
                                    <span>1 conductor principal autorizado incluido</span>
                                </li>
                                <li className="feature-item">
                                    <Check size={14} className="feature-item__icon" />
                                    <span>Asistencia en carretera 24/7 en toda Mallorca</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Opción 2: Fianza Flex 1.000 € */}
                    <div
                        role="radio"
                        aria-checked={currentDeposit === 'flex_1000'}
                        tabIndex={0}
                        className={`policy-card policy-card--flex ${currentDeposit === 'flex_1000' ? 'policy-card--active' : ''}`}
                        onClick={() => handleDepositChange('flex_1000')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleDepositChange('flex_1000')
                            }
                        }}
                    >
                        <div className="policy-card__header">
                            <div className="policy-card__radio">
                                {currentDeposit === 'flex_1000' && (
                                    <div className="policy-card__radio-inner" />
                                )}
                            </div>
                            <span className="policy-card__badge policy-card__badge--highlight">
                                <Sparkles size={12} />
                                Recomendado · +10 €/día
                            </span>
                        </div>

                        <div className="policy-card__body">
                            <div className="policy-card__title-row">
                                <UserCheck size={20} className="text-forest" />
                                <h4 className="policy-card__title">Fianza Flex · 1.000 €</h4>
                            </div>

                            <div className="policy-card__price-box">
                                <div className="policy-card__price-flex">
                                    <span className="policy-card__price-amount">+{formatPrice(flexDepositCost)}</span>
                                    <span className="policy-card__price-daily">(+10 € / día)</span>
                                </div>
                                <span className="policy-card__price-sub">Calculado para {effectiveDays} días de viaje</span>
                            </div>

                            <p className="policy-card__description">
                                Reduce la retención en tu tarjeta bancaria al 50% (solo 1.000 €) e incluye la posibilidad de añadir un 2º conductor autorizado sin coste adicional.
                            </p>

                            <ul className="policy-card__features">
                                <li className="feature-item">
                                    <Check size={14} className="feature-item__icon feature-item__icon--gold" />
                                    <span className="text-strong-gold">Retención bancaria reducida al 50% (solo 1.000 €)</span>
                                </li>
                                <li className="feature-item">
                                    <Check size={14} className="feature-item__icon feature-item__icon--gold" />
                                    <span className="text-strong-gold">2º conductor autorizado GRATIS incluido</span>
                                </li>
                                <li className="feature-item">
                                    <Check size={14} className="feature-item__icon" />
                                    <span>Seguro a todo riesgo con franquicia de 1.000 €</span>
                                </li>
                                <li className="feature-item">
                                    <Check size={14} className="feature-item__icon" />
                                    <span>Asistencia en carretera 24/7 en toda Mallorca</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2. POLÍTICA DE CANCELACIÓN ── */}
            <div className="section-block">
                <div className="section-block__header">
                    <div className="section-block__title-wrap">
                        <RefreshCw size={20} className="text-forest" />
                        <h3 className="section-block__title">2. Política de Cancelación</h3>
                    </div>
                    <p className="section-block__desc">
                        Viaja con total tranquilidad. Te ofrecemos opciones para proteger tu reserva ante cambios de billetes o imprevistos de última hora.
                    </p>
                </div>

                <div className="cards-grid">
                    {/* Option 1: Standard Policy */}
                    <div
                        role="radio"
                        aria-checked={data.cancellationPolicy === 'standard'}
                        tabIndex={0}
                        className={`policy-card ${data.cancellationPolicy === 'standard' ? 'policy-card--active' : ''}`}
                        onClick={() => handleCancellationChange('standard')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleCancellationChange('standard')
                            }
                        }}
                    >
                        <div className="policy-card__header">
                            <div className="policy-card__radio">
                                {data.cancellationPolicy === 'standard' && (
                                    <div className="policy-card__radio-inner" />
                                )}
                            </div>
                            <span className="policy-card__badge policy-card__badge--standard">
                                Incluida de serie
                            </span>
                        </div>

                        <div className="policy-card__body">
                            <div className="policy-card__title-row">
                                <ShieldCheck size={20} className="text-forest" />
                                <h4 className="policy-card__title">Política Estándar</h4>
                            </div>

                            <div className="policy-card__price-box">
                                <span className="policy-card__price-amount">0,00 €</span>
                                <span className="policy-card__price-sub">Sin coste adicional</span>
                            </div>

                            <p className="policy-card__description">
                                La opción habitual para viajes planificados. Te permite modificar fechas con antelación suficiente sujeta a disponibilidad.
                            </p>

                            <div className="policy-card__timeline">
                                <div className="timeline-item">
                                    <div className="timeline-item__badge timeline-item__badge--green">&gt; 60 días</div>
                                    <div className="timeline-item__info">
                                        <span className="timeline-item__title">Cambio de fechas sin coste</span>
                                        <span className="timeline-item__desc">Sujeto a disponibilidad del vehículo</span>
                                    </div>
                                </div>

                                <div className="timeline-item">
                                    <div className="timeline-item__badge timeline-item__badge--gray">&lt; 60 días</div>
                                    <div className="timeline-item__info">
                                        <span className="timeline-item__title">Condiciones contractuales</span>
                                        <span className="timeline-item__desc">Penalización progresiva según términos oficiales</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Option 2: Flexible Policy */}
                    <div
                        role="radio"
                        aria-checked={data.cancellationPolicy === 'flexible'}
                        tabIndex={0}
                        className={`policy-card ${data.cancellationPolicy === 'flexible' ? 'policy-card--active' : ''}`}
                        onClick={() => handleCancellationChange('flexible')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleCancellationChange('flexible')
                            }
                        }}
                    >
                        <div className="policy-card__header">
                            <div className="policy-card__radio">
                                {data.cancellationPolicy === 'flexible' && (
                                    <div className="policy-card__radio-inner" />
                                )}
                            </div>
                            <span className="policy-card__badge policy-card__badge--highlight">
                                <Sparkles size={12} />
                                Máxima Tranquilidad
                            </span>
                        </div>

                        <div className="policy-card__body">
                            <div className="policy-card__title-row">
                                <RefreshCw size={20} className="text-forest" />
                                <h4 className="policy-card__title">Política Flexible</h4>
                            </div>

                            <div className="policy-card__price-box">
                                <div className="policy-card__price-flex">
                                    <span className="policy-card__price-amount">+{formatPrice(flexibleCost)}</span>
                                    <span className="policy-card__price-daily">(+8 € / día)</span>
                                </div>
                                <span className="policy-card__price-sub">Calculado para {effectiveDays} días de viaje</span>
                            </div>

                            <p className="policy-card__description">
                                Garantía blindada contra imprevistos con reembolso escalonado garantizado y cambio gratuito de fechas.
                            </p>

                            <div className="policy-card__timeline">
                                <div className="timeline-item">
                                    <div className="timeline-item__badge timeline-item__badge--highlight">100% Reembolso</div>
                                    <div className="timeline-item__info">
                                        <span className="timeline-item__title">Hasta 30 días antes</span>
                                        <span className="timeline-item__desc">Recuperas la totalidad del importe pagado</span>
                                    </div>
                                </div>

                                <div className="timeline-item">
                                    <div className="timeline-item__badge timeline-item__badge--highlight">50% Reembolso</div>
                                    <div className="timeline-item__info">
                                        <span className="timeline-item__title">Entre 29 y 15 días antes</span>
                                        <span className="timeline-item__desc">Recuperas el 50% de la reserva</span>
                                    </div>
                                </div>

                                <div className="timeline-item">
                                    <div className="timeline-item__badge timeline-item__badge--green">1 Cambio Gratis</div>
                                    <div className="timeline-item__info">
                                        <span className="timeline-item__title">Hasta 15 días antes</span>
                                        <span className="timeline-item__desc">Modifica tus fechas de viaje sin recargos</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .step-cancellation {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-6, 24px);
                }

                .step-header {
                    margin-bottom: var(--space-2, 8px);
                }

                .step-header__tag {
                    display: inline-block;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: var(--forest-green, #cca053);
                    background: rgba(204, 160, 83, 0.08);
                    padding: 3px 8px;
                    border-radius: var(--radius-sm, 6px);
                    margin-bottom: var(--space-2, 8px);
                }

                .step-header__title {
                    font-family: var(--font-display, inherit);
                    font-size: var(--text-2xl, 24px);
                    font-weight: 700;
                    color: var(--black-matte, #f5f5f7);
                    margin-bottom: var(--space-2, 8px);
                    line-height: 1.25;
                }

                .step-header__desc {
                    font-size: var(--text-sm, 14px);
                    color: var(--gray-600, #a1a1aa);
                    line-height: 1.6;
                }

                .section-block {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    background: var(--wz-surface, #131518);
                    border: 1px solid var(--gray-200, rgba(255, 255, 255, 0.08));
                    border-radius: var(--radius-xl, 16px);
                    padding: var(--space-5, 20px);
                }

                .section-block__header {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                }

                .section-block__title-wrap {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .section-block__title {
                    font-size: var(--text-base, 16px);
                    font-weight: 700;
                    color: var(--black-matte, #f5f5f7);
                    margin: 0;
                }

                .section-block__desc {
                    font-size: 13px;
                    color: var(--gray-600, #a1a1aa);
                    line-height: 1.5;
                    margin: 0;
                }

                .cards-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4, 16px);
                }

                .policy-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 2px solid var(--gray-200, rgba(255, 255, 255, 0.08));
                    border-radius: var(--radius-xl, 14px);
                    padding: var(--space-4, 18px);
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    outline: none;
                    min-height: 44px; /* Ergonomía táctil per AGENTS.md */
                    user-select: none;
                }

                .policy-card:hover {
                    border-color: rgba(204, 160, 83, 0.4);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
                }

                .policy-card--active {
                    border-color: var(--forest-green, #cca053);
                    background: rgba(204, 160, 83, 0.05);
                    box-shadow: 0 0 0 2px rgba(204, 160, 83, 0.2), 0 8px 24px rgba(204, 160, 83, 0.08);
                }

                .policy-card__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: var(--space-3, 12px);
                }

                .policy-card__radio {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    border: 2px solid var(--gray-400, rgba(255, 255, 255, 0.3));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }

                .policy-card--active .policy-card__radio {
                    border-color: var(--forest-green, #cca053);
                }

                .policy-card__radio-inner {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: var(--forest-green, #cca053);
                }

                .policy-card__badge {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: var(--radius-full, 9999px);
                    letter-spacing: 0.02em;
                }

                .policy-card__badge--standard {
                    background: rgba(255, 255, 255, 0.06);
                    color: var(--gray-600, #a1a1aa);
                }

                .policy-card__badge--highlight {
                    background: rgba(204, 160, 83, 0.16);
                    color: var(--forest-green, #cca053);
                    border: 1px solid rgba(204, 160, 83, 0.3);
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }

                .policy-card__title-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: var(--space-2, 8px);
                }

                .policy-card__title {
                    font-family: var(--font-display, inherit);
                    font-size: 15px;
                    font-weight: 700;
                    color: var(--black-matte, #f5f5f7);
                    margin: 0;
                }

                .policy-card__price-box {
                    margin-bottom: var(--space-3, 12px);
                    display: flex;
                    flex-direction: column;
                }

                .policy-card__price-flex {
                    display: flex;
                    align-items: baseline;
                    gap: 6px;
                }

                .policy-card__price-amount {
                    font-size: var(--text-2xl, 22px);
                    font-weight: 700;
                    color: var(--forest-green, #cca053);
                }

                .policy-card__price-daily {
                    font-size: var(--text-xs, 12px);
                    font-weight: 600;
                    color: var(--gray-600, #a1a1aa);
                }

                .policy-card__price-sub {
                    font-size: 11px;
                    color: var(--gray-500, #71717a);
                }

                .policy-card__description {
                    font-size: var(--text-xs, 12px);
                    color: var(--gray-600, #a1a1aa);
                    line-height: 1.5;
                    margin-bottom: var(--space-3, 12px);
                }

                /* Features list */
                .policy-card__features {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                    padding-top: var(--space-3, 12px);
                }

                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    color: var(--gray-600, #d4d4d8);
                }

                .feature-item__icon {
                    color: #34d399;
                    flex-shrink: 0;
                }

                .feature-item__icon--gold {
                    color: #cca053;
                }

                .text-strong-gold {
                    color: #cca053;
                    font-weight: 700;
                }

                /* Cancellation Timeline */
                .policy-card__timeline {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                    padding-top: var(--space-3, 12px);
                }

                .timeline-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }

                .timeline-item__badge {
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: var(--radius-sm, 4px);
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .timeline-item__badge--highlight {
                    background: rgba(204, 160, 83, 0.16);
                    color: #cca053;
                }

                .timeline-item__badge--green {
                    background: rgba(52, 211, 153, 0.14);
                    color: #34d399;
                }

                .timeline-item__badge--gray {
                    background: rgba(255, 255, 255, 0.06);
                    color: var(--gray-600, #a1a1aa);
                }

                .timeline-item__info {
                    display: flex;
                    flex-direction: column;
                }

                .timeline-item__title {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--black-matte, #f5f5f7);
                }

                .timeline-item__desc {
                    font-size: 11px;
                    color: var(--gray-500, #71717a);
                }

                :global(.text-forest) {
                    color: #cca053;
                }

                /* Responsive rules per AGENTS.md */
                @media (max-width: 860px) {
                    .cards-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}
