'use client'

import React from 'react'
import { ShieldCheck, Check, Sparkles, AlertCircle, RefreshCw, CalendarCheck, HelpCircle } from 'lucide-react'
import { CancellationPolicy, Step3Data } from './types'
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

    return (
        <div className="step-cancellation">
            <div className="step-header">
                <span className="step-header__tag">PASO 3 DE 5</span>
                <h2 className="step-header__title">Elige tu política de cancelación</h2>
                <p className="step-header__desc">
                    Viaja con total seguridad. Te ofrecemos opciones para proteger tu reserva ante cualquier imprevisto de vuelos o cambios de planes.
                </p>
            </div>

            <div className="cards-grid">
                {/* Option 1: Standard Policy */}
                <div
                    role="button"
                    tabIndex={0}
                    className={`policy-card ${data.cancellationPolicy === 'standard' ? 'policy-card--active' : ''}`}
                    onClick={() => onChange({ cancellationPolicy: 'standard' })}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            onChange({ cancellationPolicy: 'standard' })
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
                            <ShieldCheck size={22} className="text-forest" />
                            <h3 className="policy-card__title">Política Estándar</h3>
                        </div>

                        <div className="policy-card__price-box">
                            <span className="policy-card__price-amount">0,00 €</span>
                            <span className="policy-card__price-sub">Sin coste adicional</span>
                        </div>

                        <p className="policy-card__description">
                            La opción habitual para viajes planificados. Te permite modificar fechas con antelación suficiente.
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
                    role="button"
                    tabIndex={0}
                    className={`policy-card ${data.cancellationPolicy === 'flexible' ? 'policy-card--active' : ''}`}
                    onClick={() => onChange({ cancellationPolicy: 'flexible' })}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            onChange({ cancellationPolicy: 'flexible' })
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
                            <RefreshCw size={22} className="text-forest" />
                            <h3 className="policy-card__title">Política Flexible</h3>
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

            <style jsx>{`
                .step-cancellation {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-6);
                }

                .step-header {
                    margin-bottom: var(--space-2);
                }

                .step-header__tag {
                    display: inline-block;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: var(--forest-green);
                    background: rgba(45, 58, 45, 0.08);
                    padding: 3px 8px;
                    border-radius: var(--radius-sm);
                    margin-bottom: var(--space-2);
                }

                .step-header__title {
                    font-family: var(--font-display);
                    font-size: var(--text-2xl);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin-bottom: var(--space-2);
                    line-height: 1.25;
                }

                .step-header__desc {
                    font-size: var(--text-sm);
                    color: var(--gray-600);
                    line-height: 1.6;
                }

                .cards-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-5);
                }

                .policy-card {
                    background: #ffffff;
                    border: 2px solid var(--gray-200);
                    border-radius: var(--radius-xl);
                    padding: var(--space-5);
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    outline: none;
                }

                .policy-card:hover {
                    border-color: var(--forest-green-light);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
                }

                .policy-card--active {
                    border-color: var(--forest-green);
                    background: #ffffff;
                    box-shadow: 0 0 0 2px rgba(45, 58, 45, 0.15), 0 8px 24px rgba(45, 58, 45, 0.06);
                }

                .policy-card__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: var(--space-4);
                }

                .policy-card__radio {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    border: 2px solid var(--gray-400);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .policy-card--active .policy-card__radio {
                    border-color: var(--forest-green);
                }

                .policy-card__radio-inner {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: var(--forest-green);
                }

                .policy-card__badge {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: var(--radius-full);
                    letter-spacing: 0.02em;
                }

                .policy-card__badge--standard {
                    background: rgba(0, 0, 0, 0.05);
                    color: var(--gray-800);
                }

                .policy-card__badge--highlight {
                    background: rgba(45, 58, 45, 0.1);
                    color: var(--forest-green);
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }

                .policy-card__title-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: var(--space-3);
                }

                .policy-card__title {
                    font-family: var(--font-display);
                    font-size: var(--text-lg);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                }

                .policy-card__price-box {
                    margin-bottom: var(--space-3);
                    display: flex;
                    flex-direction: column;
                }

                .policy-card__price-flex {
                    display: flex;
                    align-items: baseline;
                    gap: 6px;
                }

                .policy-card__price-amount {
                    font-size: var(--text-2xl);
                    font-weight: 700;
                    color: var(--forest-green);
                }

                .policy-card__price-daily {
                    font-size: var(--text-xs);
                    font-weight: 600;
                    color: var(--gray-600);
                }

                .policy-card__price-sub {
                    font-size: 11px;
                    color: var(--gray-500);
                }

                .policy-card__description {
                    font-size: var(--text-xs);
                    color: var(--gray-600);
                    line-height: 1.6;
                    margin-bottom: var(--space-4);
                }

                .policy-card__timeline {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    border-top: 1px solid var(--gray-100);
                    padding-top: var(--space-3);
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
                    border-radius: var(--radius-sm);
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .timeline-item__badge--highlight {
                    background: #e8f5e9;
                    color: #1b5e20;
                }

                .timeline-item__badge--green {
                    background: rgba(45, 58, 45, 0.08);
                    color: var(--forest-green);
                }

                .timeline-item__badge--gray {
                    background: rgba(0, 0, 0, 0.05);
                    color: var(--gray-600);
                }

                .timeline-item__info {
                    display: flex;
                    flex-direction: column;
                }

                .timeline-item__title {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--black-matte);
                }

                .timeline-item__desc {
                    font-size: 11px;
                    color: var(--gray-500);
                }

                @media (max-width: 768px) {
                    .cards-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}
