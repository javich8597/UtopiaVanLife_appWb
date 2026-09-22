'use client'

import React from 'react'
import { Gauge, Check, Sparkles, Compass, Shield, Zap } from 'lucide-react'
import { KmPackage, Step2Data } from './types'
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
                <span className="step-header__tag">PASO 2 DE 5</span>
                <h2 className="step-header__title">Elige tu paquete de kilometraje</h2>
                <p className="step-header__desc">
                    Mallorca tiene unas dimensiones aproximadas de 100 km de punta a punta. Selecciona la opción que mejor se ajuste a tu plan de viaje.
                </p>
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
                    <div className="km-card__header">
                        <div className="km-card__radio">
                            {data.kmPackage === 'included_150' && (
                                <div className="km-card__radio-inner" />
                            )}
                        </div>
                        <span className="km-card__badge km-card__badge--standard">
                            Incluido de serie
                        </span>
                    </div>

                    <div className="km-card__body">
                        <div className="km-card__title-row">
                            <Gauge size={22} className="text-forest" />
                            <h3 className="km-card__title">150 km / día</h3>
                        </div>

                        <div className="km-card__price-box">
                            <span className="km-card__price-amount">0,00 €</span>
                            <span className="km-card__price-sub">Sin coste adicional</span>
                        </div>

                        <p className="km-card__description">
                            Dispones de <strong>{includedTotalKm} km en total</strong> para todo tu viaje. Es ideal para recorrer los pueblos con encanto, calas y miradores de la isla sin prisas.
                        </p>

                        <div className="km-card__features">
                            <div className="km-feature">
                                <Check size={14} className="text-forest" />
                                <span>150 km acumulables por cada día contratado</span>
                            </div>
                            <div className="km-feature">
                                <Check size={14} className="text-forest" />
                                <span>Suficiente para cruzar Mallorca varias veces</span>
                            </div>
                            <div className="km-feature km-feature--sub">
                                <span className="km-feature__dot" />
                                <span>Excedente posterior: solo 0,25 € por km adicional</span>
                            </div>
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
                    <div className="km-card__header">
                        <div className="km-card__radio">
                            {data.kmPackage === 'unlimited' && (
                                <div className="km-card__radio-inner" />
                            )}
                        </div>
                        <span className="km-card__badge km-card__badge--highlight">
                            <Sparkles size={12} />
                            Libertad Total
                        </span>
                    </div>

                    <div className="km-card__body">
                        <div className="km-card__title-row">
                            <Zap size={22} className="text-forest" />
                            <h3 className="km-card__title">Kilometraje Ilimitado</h3>
                        </div>

                        <div className="km-card__price-box">
                            <div className="km-card__price-flex">
                                <span className="km-card__price-amount">+{formatPrice(unlimitedCost)}</span>
                                <span className="km-card__price-daily">(+15 € / día)</span>
                            </div>
                            <span className="km-card__price-sub">Calculado para {effectiveDays} días de viaje</span>
                        </div>

                        <p className="km-card__description">
                            Conduce sin mirar el marcador. Explora calas escondidas en el norte, puertos del sur y rutas de montaña cuantas veces te apetezca sin preocuparte por límites.
                        </p>

                        <div className="km-card__features">
                            <div className="km-feature">
                                <Check size={14} className="text-forest" />
                                <span>Kilómetros 100% infinitos durante todo el alquiler</span>
                            </div>
                            <div className="km-feature">
                                <Check size={14} className="text-forest" />
                                <span>Cero cargos sorpresa por excedentes de ruta</span>
                            </div>
                            <div className="km-feature">
                                <Check size={14} className="text-forest" />
                                <span>Máxima flexibilidad e improvisación nómada</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .step-mileage {
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

                .km-card {
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

                .km-card:hover {
                    border-color: var(--forest-green-light);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
                }

                .km-card--active {
                    border-color: var(--forest-green);
                    background: #ffffff;
                    box-shadow: 0 0 0 2px rgba(45, 58, 45, 0.15), 0 8px 24px rgba(45, 58, 45, 0.06);
                }

                .km-card__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: var(--space-4);
                }

                .km-card__radio {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    border: 2px solid var(--gray-400);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .km-card--active .km-card__radio {
                    border-color: var(--forest-green);
                }

                .km-card__radio-inner {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: var(--forest-green);
                }

                .km-card__badge {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: var(--radius-full);
                    letter-spacing: 0.02em;
                }

                .km-card__badge--standard {
                    background: rgba(0, 0, 0, 0.05);
                    color: var(--gray-800);
                }

                .km-card__badge--highlight {
                    background: rgba(45, 58, 45, 0.1);
                    color: var(--forest-green);
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }

                .km-card__title-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: var(--space-3);
                }

                .km-card__title {
                    font-family: var(--font-display);
                    font-size: var(--text-lg);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                }

                .km-card__price-box {
                    margin-bottom: var(--space-3);
                    display: flex;
                    flex-direction: column;
                }

                .km-card__price-flex {
                    display: flex;
                    align-items: baseline;
                    gap: 6px;
                }

                .km-card__price-amount {
                    font-size: var(--text-2xl);
                    font-weight: 700;
                    color: var(--forest-green);
                }

                .km-card__price-daily {
                    font-size: var(--text-xs);
                    font-weight: 600;
                    color: var(--gray-600);
                }

                .km-card__price-sub {
                    font-size: 11px;
                    color: var(--gray-500);
                }

                .km-card__description {
                    font-size: var(--text-xs);
                    color: var(--gray-600);
                    line-height: 1.6;
                    margin-bottom: var(--space-4);
                }

                .km-card__features {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    border-top: 1px solid var(--gray-100);
                    padding-top: var(--space-3);
                }

                .km-feature {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    color: var(--black-matte);
                }

                .km-feature--sub {
                    color: var(--gray-500);
                    font-size: 11px;
                }

                .km-feature__dot {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: var(--gray-400);
                    margin-left: 5px;
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
