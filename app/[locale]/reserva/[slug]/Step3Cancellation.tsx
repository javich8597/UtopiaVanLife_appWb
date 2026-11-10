'use client'

import React from 'react'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import { Step3Data, CancellationPolicy } from './types'
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

    const handleCancellationChange = (policy: CancellationPolicy) => {
        onChange({
            ...data,
            cancellationPolicy: policy,
        })
    }

    return (
        <div className="step-cancellation">
            <div className="step-header">
                <span className="step-header__tag">PASO 5 DE 7</span>
                <h2 className="step-header__title">Política de cancelación</h2>
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
                    <div className="policy-card__top">
                        <div className="policy-card__title-group">
                            <div className="policy-card__radio">
                                {data.cancellationPolicy === 'standard' && (
                                    <div className="policy-card__radio-inner" />
                                )}
                            </div>
                            <ShieldCheck size={18} className="text-forest" />
                            <h4 className="policy-card__title">Política Estándar</h4>
                        </div>
                        <span className="policy-card__price-pill">Incluida</span>
                    </div>

                    <div className="policy-card__timeline">
                        <div className="timeline-item">
                            <span className="timeline-item__badge timeline-item__badge--green">&gt; 60 días</span>
                            <span className="timeline-item__text">Cambio de fechas sin coste (según disponibilidad)</span>
                        </div>

                        <div className="timeline-item">
                            <span className="timeline-item__badge timeline-item__badge--gray">&lt; 60 días</span>
                            <span className="timeline-item__text">Penalización progresiva según términos</span>
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
                    <div className="policy-card__top">
                        <div className="policy-card__title-group">
                            <div className="policy-card__radio">
                                {data.cancellationPolicy === 'flexible' && (
                                    <div className="policy-card__radio-inner" />
                                )}
                            </div>
                            <RefreshCw size={18} className="text-forest" />
                            <h4 className="policy-card__title">Política Flexible</h4>
                        </div>
                        <span className="policy-card__price-pill">
                            +{formatPrice(flexibleCost)} (+8 €/día)
                        </span>
                    </div>

                    <div className="policy-card__timeline">
                        <div className="timeline-item">
                            <span className="timeline-item__badge timeline-item__badge--highlight">100% Reembolso</span>
                            <span className="timeline-item__text">Hasta 30 días antes del viaje</span>
                        </div>

                        <div className="timeline-item">
                            <span className="timeline-item__badge timeline-item__badge--highlight">50% Reembolso</span>
                            <span className="timeline-item__text">Entre 29 y 15 días antes</span>
                        </div>

                        <div className="timeline-item">
                            <span className="timeline-item__badge timeline-item__badge--green">1 Cambio Gratis</span>
                            <span className="timeline-item__text">Hasta 15 días antes del viaje</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .step-cancellation {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4, 16px);
                }

                .step-header {
                    margin-bottom: 2px;
                }

                .step-header__tag {
                    display: inline-block;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: var(--wz-pill-text);
                    background: var(--wz-pill-bg);
                    border: 1px solid var(--wz-pill-border);
                    padding: 2px 8px;
                    border-radius: var(--radius-sm, 6px);
                    margin-bottom: 4px;
                }

                .step-header__title {
                    font-family: var(--font-display, inherit);
                    font-size: var(--text-xl, 20px);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                    line-height: 1.2;
                }

                .cards-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4, 16px);
                }

                .policy-card {
                    background: var(--wz-surface);
                    border: 1.5px solid var(--gray-200);
                    border-radius: var(--radius-lg, 14px);
                    padding: 16px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    transition: all 0.2s ease;
                    outline: none;
                    min-height: 44px;
                    user-select: none;
                }

                .policy-card:hover {
                    border-color: var(--forest-green-light);
                }

                .policy-card--active {
                    border-color: var(--forest-green);
                    box-shadow: 0 0 0 1px var(--wz-pill-border);
                }

                .policy-card__top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .policy-card__title-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .policy-card__radio {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    border: 2px solid var(--gray-400);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .policy-card--active .policy-card__radio {
                    border-color: var(--forest-green);
                }

                .policy-card__radio-inner {
                    width: 9px;
                    height: 9px;
                    border-radius: 50%;
                    background: var(--forest-green);
                }

                .policy-card__title {
                    font-family: var(--font-display, inherit);
                    font-size: 15px;
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                }

                .policy-card__price-pill {
                    font-size: 11.5px;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: 999px;
                    background: var(--wz-pill-bg);
                    color: var(--wz-pill-text);
                    border: 1px solid var(--wz-pill-border);
                    white-space: nowrap;
                }

                .policy-card__timeline {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    border-top: 1px solid var(--gray-100);
                    padding-top: 10px;
                }

                .timeline-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .timeline-item__badge {
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 4px;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .timeline-item__badge--highlight {
                    background: var(--wz-pill-bg);
                    color: var(--wz-pill-text);
                    border: 1px solid var(--wz-pill-border);
                }

                .timeline-item__badge--green {
                    background: rgba(52, 211, 153, 0.14);
                    color: #34d399;
                }

                :global(html[data-theme="light"]) .timeline-item__badge--green {
                    background: #E7EFE5;
                    color: #2D5233;
                }

                .timeline-item__badge--gray {
                    background: var(--wz-chip-bg);
                    border: 1px solid var(--wz-chip-border);
                    color: var(--gray-600);
                }

                .timeline-item__text {
                    font-size: 12px;
                    color: var(--gray-600);
                }

                :global(.text-forest) {
                    color: var(--forest-green);
                }

                @media (max-width: 860px) {
                    .cards-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}
