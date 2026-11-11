'use client'

import React from 'react'
import { ShieldCheck, Shield, Lock, PhoneCall, UserCheck, Sparkles } from 'lucide-react'
import { DepositOption } from './types'
import { formatPrice, SECOND_DRIVER_RATE_PER_DAY } from '@/lib/pricing/engine'

interface Step4InsuranceProps {
    depositOption: DepositOption
    totalDays: number
    onChange: (depositOption: DepositOption) => void
}

export default function Step4Insurance({
    depositOption,
    totalDays,
    onChange,
}: Step4InsuranceProps) {
    const effectiveDays = Math.max(1, totalDays || 1)
    const flexDepositCost = 10 * effectiveDays
    const currentDeposit: DepositOption = depositOption === 'flex_1000' ? 'flex_1000' : 'standard_2000'

    const handleSelect = (option: DepositOption) => {
        onChange(option)
    }

    return (
        <div className="step-insurance">
            <div className="step-header">
                <span className="step-header__tag">PASO 4 DE 7</span>
                <h2 className="step-header__title">Seguro y fianza</h2>
            </div>

            <div className="cards-grid" role="radiogroup" aria-label="Modalidad de seguro y fianza">
                {/* Opción 1: Seguro y Fianza Estándar (2.000 €) */}
                <div
                    role="radio"
                    aria-checked={currentDeposit === 'standard_2000'}
                    tabIndex={0}
                    className={`insurance-card ${currentDeposit === 'standard_2000' ? 'insurance-card--active' : ''}`}
                    onClick={() => handleSelect('standard_2000')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleSelect('standard_2000')
                        }
                    }}
                >
                    <div className="policy-card__top-row">
                        <div className="policy-card__title-group">
                            <div className="policy-card__title-row">
                                <div className="policy-card__radio" aria-hidden="true">
                                    {currentDeposit === 'standard_2000' && <div className="policy-card__radio-inner" />}
                                </div>
                                <Shield size={18} className="text-forest" />
                                <h3 className="policy-card__title">Seguro Estándar</h3>
                            </div>
                        </div>

                        <div className="policy-card__price-box">
                            <span className="policy-card__price-amount">Incluido</span>
                        </div>
                    </div>

                    <div className="policy-card__features-list">
                        <div className="feature-item">
                            <Lock size={14} className="text-forest" />
                            <div className="feature-item__text">
                                <span className="feature-item__title">Fianza reembolsable 2.000 €</span>
                                <span className="feature-item__sub">Retención con tarjeta al recoger (no se cobra hoy)</span>
                            </div>
                        </div>

                        <div className="feature-item">
                            <ShieldCheck size={14} className="text-forest" />
                            <div className="feature-item__text">
                                <span className="feature-item__title">Seguro a Todo Riesgo</span>
                                <span className="feature-item__sub">Daños propios y a terceros · Franquicia 1.000 €</span>
                            </div>
                        </div>

                        <div className="feature-item">
                            <PhoneCall size={14} className="text-forest" />
                            <div className="feature-item__text">
                                <span className="feature-item__title">Asistencia en viaje y telefónica (16 h)</span>
                                <span className="feature-item__sub">Gastos de gestión incluidos</span>
                            </div>
                        </div>

                        <div className="feature-item">
                            <UserCheck size={14} className="text-forest" />
                            <div className="feature-item__text">
                                <span className="feature-item__title">1 conductor incluido</span>
                                <span className="feature-item__sub">Mín. 25 años y 2 años carnet B · 2º conductor +{SECOND_DRIVER_RATE_PER_DAY} €/día</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Opción 2: Seguro y Fianza Flex (1.000 €) */}
                <div
                    role="radio"
                    aria-checked={currentDeposit === 'flex_1000'}
                    tabIndex={0}
                    className={`insurance-card ${currentDeposit === 'flex_1000' ? 'insurance-card--active' : ''}`}
                    onClick={() => handleSelect('flex_1000')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleSelect('flex_1000')
                        }
                    }}
                >
                    <div className="policy-card__top-row">
                        <div className="policy-card__title-group">
                            <div className="policy-card__title-row">
                                <div className="policy-card__radio" aria-hidden="true">
                                    {currentDeposit === 'flex_1000' && <div className="policy-card__radio-inner" />}
                                </div>
                                <Sparkles size={18} className="text-forest" />
                                <h3 className="policy-card__title">Seguro Flex</h3>
                            </div>
                        </div>

                        <div className="policy-card__price-box">
                            <span className="policy-card__price-amount">+{formatPrice(flexDepositCost)} (+10 €/día)</span>
                        </div>
                    </div>

                    <div className="policy-card__features-list">
                        <div className="feature-item feature-item--highlight">
                            <Lock size={14} className="text-forest" />
                            <div className="feature-item__text">
                                <span className="feature-item__title">Fianza reducida al 50% · 1.000 €</span>
                                <span className="feature-item__sub">Menor retención con tarjeta al recoger</span>
                            </div>
                        </div>

                        <div className="feature-item feature-item--highlight">
                            <UserCheck size={14} className="text-forest" />
                            <div className="feature-item__text">
                                <span className="feature-item__title">2º conductor autorizado incluido</span>
                                <span className="feature-item__sub">Sin suplemento adicional (mín. 25 años y 2 años carnet B)</span>
                            </div>
                        </div>

                        <div className="feature-item">
                            <ShieldCheck size={14} className="text-forest" />
                            <div className="feature-item__text">
                                <span className="feature-item__title">Seguro a Todo Riesgo</span>
                                <span className="feature-item__sub">Daños propios y a terceros · Franquicia 1.000 €</span>
                            </div>
                        </div>

                        <div className="feature-item">
                            <PhoneCall size={14} className="text-forest" />
                            <div className="feature-item__text">
                                <span className="feature-item__title">Asistencia en viaje y telefónica (16 h)</span>
                                <span className="feature-item__sub">Gastos de gestión incluidos</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .step-insurance {
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

                .insurance-card {
                    background: var(--wz-surface);
                    border: 1.5px solid var(--gray-200);
                    border-radius: var(--radius-lg, 14px);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    outline: none;
                    user-select: none;
                }

                .insurance-card:hover {
                    border-color: var(--forest-green-light);
                }

                .insurance-card--active {
                    border-color: var(--forest-green);
                    box-shadow: 0 0 0 1px var(--wz-pill-border);
                }

                .policy-card__top-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .policy-card__title-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .policy-card__title-row {
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

                .insurance-card--active .policy-card__radio {
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

                .policy-card__price-box {
                    background: var(--wz-pill-bg);
                    border: 1px solid var(--wz-pill-border);
                    border-radius: 999px;
                    padding: 3px 10px;
                    flex-shrink: 0;
                }

                .policy-card__price-amount {
                    font-size: 11.5px;
                    font-weight: 700;
                    color: var(--wz-pill-text);
                    white-space: nowrap;
                }

                .policy-card__features-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    border-top: 1px solid var(--gray-100);
                    padding-top: 10px;
                }

                .feature-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 9px;
                    background: var(--wz-chip-bg);
                    border: 1px solid var(--wz-chip-border);
                    border-radius: 9px;
                    padding: 8px 10px;
                }

                .feature-item--highlight {
                    background: var(--wz-pill-bg);
                    border-color: var(--wz-pill-border);
                }

                .feature-item__text {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }

                .feature-item__title {
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--black-matte);
                }

                .feature-item__sub {
                    font-size: 11px;
                    color: var(--gray-600);
                    line-height: 1.35;
                }

                :global(.text-forest) {
                    color: var(--forest-green);
                    flex-shrink: 0;
                    margin-top: 2px;
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
