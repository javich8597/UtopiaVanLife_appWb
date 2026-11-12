'use client'

import React from 'react'
import { Gauge, Check, Zap } from 'lucide-react'
import { Step2Data } from './types'
import { formatPrice } from '@/lib/pricing/engine'

interface Step2MileageProps {
    data: Step2Data
    totalDays: number
    onChange: (data: Step2Data) => void
}

export default function Step2Mileage({
    data,
    totalDays,
    onChange,
}: Step2MileageProps) {
    const effectiveDays = Math.max(1, totalDays || 1)
    const unlimitedCost = 15 * effectiveDays
    const includedTotalKm = Math.round(150 * effectiveDays)

    return (
        <div className="step-mileage">
            <div className="step-header">
                <span className="step-header__tag">PASO 3 DE 7</span>
                <h2 className="step-header__title">Kilometraje</h2>
            </div>

            <div className="cards-grid">
                {/* Option 1: 150 km / day included */}
                <div
                    role="button"
                    tabIndex={0}
                    className={`km-card ${data.kmPackage === 'included_150' ? 'km-card--active' : ''}`}
                    onClick={() => onChange({ kmPackage: 'included_150' })}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            onChange({ kmPackage: 'included_150' })
                        }
                    }}
                >
                    <div className="km-card__top">
                        <div className="km-card__title-group">
                            <div className="km-card__radio">
                                {data.kmPackage === 'included_150' && <div className="km-card__radio-inner" />}
                            </div>
                            <Gauge size={18} className="text-forest" />
                            <h3 className="km-card__title">150 km / día</h3>
                        </div>
                        <span className="km-card__price-pill">Incluido</span>
                    </div>

                    <div className="km-card__features">
                        <div className="km-feature">
                            <Check size={15} strokeWidth={2.2} className="km-feature-icon" />
                            <span><strong>{includedTotalKm} km totales</strong> acumulables en tu estancia</span>
                        </div>
                        <div className="km-feature km-feature--sub">
                            <span className="km-feature__dot" />
                            <span>Km extra adicional: 0,25 €/km</span>
                        </div>
                    </div>
                </div>

                {/* Option 2: Unlimited mileage */}
                <div
                    role="button"
                    tabIndex={0}
                    className={`km-card ${data.kmPackage === 'unlimited' ? 'km-card--active' : ''}`}
                    onClick={() => onChange({ kmPackage: 'unlimited' })}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            onChange({ kmPackage: 'unlimited' })
                        }
                    }}
                >
                    <div className="km-card__top">
                        <div className="km-card__title-group">
                            <div className="km-card__radio">
                                {data.kmPackage === 'unlimited' && <div className="km-card__radio-inner" />}
                            </div>
                            <Zap size={18} className="text-forest" />
                            <h3 className="km-card__title">Kilometraje Ilimitado</h3>
                        </div>
                        <span className="km-card__price-pill">+{formatPrice(unlimitedCost)}</span>
                    </div>

                    <div className="km-card__features">
                        <div className="km-feature">
                            <Check size={15} strokeWidth={2.2} className="km-feature-icon" />
                            <span>Kilómetros sin límite durante los {effectiveDays} días (+15 €/día)</span>
                        </div>
                        <div className="km-feature">
                            <Check size={15} strokeWidth={2.2} className="km-feature-icon" />
                            <span>Sin cargos por exceso de kilometraje</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .step-mileage {
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
                    border-radius: var(--radius-sm);
                    margin-bottom: 4px;
                }

                .step-header__title {
                    font-family: var(--font-display);
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

                .km-card {
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
                }

                .km-card:hover {
                    border-color: var(--forest-green-light);
                }

                .km-card--active {
                    border-color: var(--forest-green);
                    box-shadow: 0 0 0 1px var(--wz-pill-border);
                }

                .km-card__top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }

                .km-card__title-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .km-card__radio {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    border: 2px solid var(--gray-400);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .km-card--active .km-card__radio {
                    border-color: var(--forest-green);
                }

                .km-card__radio-inner {
                    width: 9px;
                    height: 9px;
                    border-radius: 50%;
                    background: var(--forest-green);
                }

                .km-card__title {
                    font-family: var(--font-display);
                    font-size: 15px;
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                }

                .km-card__price-pill {
                    font-size: 12px;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: var(--radius-full);
                    background: var(--wz-pill-bg);
                    color: var(--wz-pill-text);
                    border: 1px solid var(--wz-pill-border);
                    white-space: nowrap;
                }

                .km-card__features {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    padding-top: 4px;
                }

                .km-feature {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 12.5px;
                    color: var(--black-matte);
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }

                .km-feature:last-child {
                    border-bottom: none;
                }

                .km-feature--sub {
                    color: var(--gray-500);
                    font-size: 11px;
                }

                :global(.km-feature-icon) {
                    color: #d4a742;
                    flex-shrink: 0;
                }

                :global(html[data-theme="light"]) .km-card__features {
                    border-top-color: rgba(26, 23, 20, 0.08);
                }

                :global(html[data-theme="light"]) .km-feature {
                    border-bottom-color: rgba(26, 23, 20, 0.08);
                }

                :global(html[data-theme="light"]) :global(.km-feature-icon) {
                    color: #b38827;
                }

                .km-feature__dot {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: var(--gray-400);
                    margin-left: 4px;
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
