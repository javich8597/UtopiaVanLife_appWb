'use client'

import React from 'react'
import { ShieldCheck, Shield, Lock, PhoneCall, UserCheck } from 'lucide-react'

export default function Step4Insurance() {
    return (
        <div className="step-insurance">
            <div className="step-header">
                <span className="step-header__tag">PASO 4 DE 7</span>
                <h2 className="step-header__title">Seguro y fianza</h2>
            </div>

            <div className="insurance-card" role="region" aria-label="Seguro a todo riesgo con fianza de 1.000 €">
                <div className="policy-card__top-row">
                    <div className="policy-card__title-group">
                        <div className="policy-card__title-row">
                            <div className="policy-card__radio" aria-hidden="true">
                                <div className="policy-card__radio-inner" />
                            </div>
                            <Shield size={19} className="text-forest" />
                            <h3 className="policy-card__title">Seguro a Todo Riesgo · Fianza de 1.000 €</h3>
                        </div>
                        <p className="policy-card__description">
                            Cobertura con franquicia de 1.000 €. La fianza no se cobra hoy: se retiene en tarjeta en la entrega y se libera tras revisar la camper a la devolución.
                        </p>
                    </div>

                    <div className="policy-card__price-box">
                        <span className="policy-card__price-amount">Incluido</span>
                    </div>
                </div>

                <div className="policy-card__features-grid">
                    <div className="feature-item">
                        <ShieldCheck size={15} className="text-forest" />
                        <div className="feature-item__text">
                            <span className="feature-item__title">Seguro a Todo Riesgo</span>
                            <span className="feature-item__sub">Daños propios y a terceros</span>
                        </div>
                    </div>

                    <div className="feature-item">
                        <Lock size={15} className="text-forest" />
                        <div className="feature-item__text">
                            <span className="feature-item__title">Fianza reembolsable 1.000 €</span>
                            <span className="feature-item__sub">Retención con tarjeta en el check-in</span>
                        </div>
                    </div>

                    <div className="feature-item">
                        <PhoneCall size={15} className="text-forest" />
                        <div className="feature-item__text">
                            <span className="feature-item__title">Asistencia en viaje y telefónica (16 h)</span>
                            <span className="feature-item__sub">Soporte durante el viaje y gastos de gestión incluidos</span>
                        </div>
                    </div>

                    <div className="feature-item">
                        <UserCheck size={15} className="text-forest" />
                        <div className="feature-item__text">
                            <span className="feature-item__title">Conductor principal</span>
                            <span className="feature-item__sub">Mín. 25 años y 2 años de carnet B</span>
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

                .insurance-card {
                    background: var(--wz-surface);
                    border: 1.5px solid var(--forest-green);
                    border-radius: var(--radius-lg, 14px);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    box-shadow: 0 0 0 1px var(--wz-pill-border);
                }

                .policy-card__top-row {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 14px;
                }

                .policy-card__title-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
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
                    border: 2px solid var(--forest-green);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
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

                .policy-card__description {
                    font-size: 12px;
                    color: var(--gray-600);
                    line-height: 1.45;
                    margin: 0;
                }

                .policy-card__price-box {
                    background: var(--wz-pill-bg);
                    border: 1px solid var(--wz-pill-border);
                    border-radius: 999px;
                    padding: 4px 12px;
                    flex-shrink: 0;
                }

                .policy-card__price-amount {
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--wz-pill-text);
                }

                .policy-card__features-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    border-top: 1px solid var(--gray-100);
                    padding-top: 12px;
                }

                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: var(--wz-chip-bg);
                    border: 1px solid var(--wz-chip-border);
                    border-radius: 10px;
                    padding: 9px 11px;
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
                }

                :global(.text-forest) {
                    color: var(--forest-green);
                    flex-shrink: 0;
                }

                @media (max-width: 860px) {
                    .policy-card__features-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}
