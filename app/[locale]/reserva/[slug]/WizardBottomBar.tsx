'use client'

import React from 'react'
import { ArrowLeft, ArrowRight, Lock, ChevronUp, Check, ShieldCheck } from 'lucide-react'
import { WizardStep } from './types'
import { formatPrice } from '@/lib/pricing/engine'

interface WizardBottomBarProps {
    currentStep: WizardStep
    isStepValid: boolean
    totalPayable: number
    onPrev: () => void
    onNext: () => void
    onSubmitStep5?: () => void
    onOpenMobileSummary?: () => void
    isSubmitting?: boolean
}

export default function WizardBottomBar({
    currentStep,
    isStepValid,
    totalPayable,
    onPrev,
    onNext,
    onSubmitStep5,
    onOpenMobileSummary,
    isSubmitting = false,
}: WizardBottomBarProps) {
    const isFirstStep = currentStep === 1
    const isFinalStep = currentStep === 5

    const handleNextClick = () => {
        if (!isStepValid || isSubmitting) return
        if (isFinalStep && onSubmitStep5) {
            onSubmitStep5()
        } else {
            onNext()
        }
    }

    return (
        <div className="wizard-bottom-bar">
            <div className="wizard-bottom-bar__container">
                {/* Back button */}
                <button
                    type="button"
                    className="wizard-bar-btn wizard-bar-btn--back"
                    onClick={onPrev}
                    disabled={isFirstStep || isSubmitting}
                    aria-label="Volver al paso anterior"
                >
                    <ArrowLeft size={16} />
                    <span className="wizard-bar-btn__text">Volver</span>
                </button>

                {/* Mobile price indicator with trigger to open summary sheet */}
                <div
                    role="button"
                    tabIndex={0}
                    className="wizard-bottom-bar__mobile-price"
                    onClick={onOpenMobileSummary}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            onOpenMobileSummary?.()
                        }
                    }}
                >
                    <div className="mobile-price-details">
                        <span className="mobile-price-label">Total estimado</span>
                        <div className="mobile-price-flex">
                            <span className="mobile-price-amount">{formatPrice(totalPayable)}</span>
                            <ChevronUp size={14} className="mobile-price-chevron" />
                        </div>
                    </div>
                    <span className="mobile-price-sub">Ver desglose</span>
                </div>

                {/* Next / Pay button */}
                <button
                    type="button"
                    className={`wizard-bar-btn wizard-bar-btn--next ${
                        isFinalStep ? 'wizard-bar-btn--pay' : ''
                    }`}
                    onClick={handleNextClick}
                    disabled={!isStepValid || isSubmitting}
                >
                    {isFinalStep ? (
                        <>
                            <Lock size={16} />
                            <span>Confirmar y Pagar {formatPrice(totalPayable)}</span>
                        </>
                    ) : (
                        <>
                            <span>Continuar</span>
                            <ArrowRight size={16} />
                        </>
                    )}
                </button>
            </div>

            <style jsx>{`
                .wizard-bottom-bar {
                    position: sticky;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(255, 255, 255, 0.94);
                    backdrop-filter: blur(16px);
                    border-top: 1px solid rgba(0, 0, 0, 0.08);
                    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.04);
                    z-index: 50;
                    padding: var(--space-3) 0;
                }

                .wizard-bottom-bar__container {
                    max-width: 1240px;
                    margin: 0 auto;
                    padding: 0 var(--space-4);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-3);
                }

                .wizard-bar-btn {
                    height: 48px;
                    padding: 0 var(--space-6);
                    border-radius: var(--radius-lg);
                    font-size: var(--text-sm);
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    border: none;
                }

                .wizard-bar-btn--back {
                    background: #faf8f5;
                    border: 1px solid var(--gray-300);
                    color: var(--black-matte);
                }

                .wizard-bar-btn--back:hover:not(:disabled) {
                    background: var(--gray-100);
                    border-color: var(--gray-400);
                }

                .wizard-bar-btn--back:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                }

                .wizard-bar-btn--next {
                    background: var(--forest-green);
                    color: #ffffff;
                    min-width: 150px;
                    box-shadow: 0 4px 12px rgba(45, 58, 45, 0.2);
                }

                .wizard-bar-btn--next:hover:not(:disabled) {
                    background: var(--forest-green-light);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(45, 58, 45, 0.25);
                }

                .wizard-bar-btn--next:disabled {
                    background: var(--gray-300);
                    color: var(--gray-500);
                    cursor: not-allowed;
                    box-shadow: none;
                }

                .wizard-bar-btn--pay {
                    background: var(--forest-green);
                    color: #ffffff;
                    padding: 0 var(--space-8);
                }

                /* Mobile price preview */
                .wizard-bottom-bar__mobile-price {
                    display: none;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                    user-select: none;
                }

                .mobile-price-details {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .mobile-price-label {
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--gray-500);
                }

                .mobile-price-flex {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                }

                .mobile-price-amount {
                    font-size: var(--text-base);
                    font-weight: 800;
                    color: var(--forest-green);
                }

                .mobile-price-chevron {
                    color: var(--forest-green);
                }

                .mobile-price-sub {
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--forest-green);
                    text-decoration: underline;
                }

                @media (max-width: 768px) {
                    .wizard-bottom-bar__mobile-price {
                        display: flex;
                    }
                    .wizard-bar-btn {
                        height: 44px;
                        padding: 0 var(--space-4);
                    }
                    .wizard-bar-btn__text {
                        display: none;
                    }
                }
            `}</style>
        </div>
    )
}
