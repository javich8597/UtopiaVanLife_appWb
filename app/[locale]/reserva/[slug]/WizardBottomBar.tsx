'use client'

import React from 'react'
import { ArrowLeft, ArrowRight, Lock, ChevronUp, Check } from 'lucide-react'
import { WizardStep } from './types'
import { formatPrice } from '@/lib/pricing/engine'

export const WIZARD_STEPS = [
    { number: 1 as WizardStep, label: 'Fechas', fullTitle: 'Fechas y Horarios' },
    { number: 2 as WizardStep, label: 'KM', fullTitle: 'Kilometraje' },
    { number: 3 as WizardStep, label: 'Fianza', fullTitle: 'Cobertura & Fianza' },
    { number: 4 as WizardStep, label: 'Extras', fullTitle: 'Extras & Experiencias' },
    { number: 5 as WizardStep, label: 'Pago', fullTitle: 'Tus Datos & Pago' },
]

interface WizardBottomBarProps {
    currentStep: WizardStep
    maxCompletedStep: number
    onStepClick: (step: WizardStep) => void
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
    maxCompletedStep,
    onStepClick,
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

    const progressPercent = ((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100

    return (
        <footer className="wizard-bottom-bar" role="region" aria-label="Navegación y pasos de la reserva">
            <div className="wizard-bottom-bar__container">
                {/* 1. Left Action: Back Button */}
                <div className="wizard-bottom-bar__col-left">
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
                </div>

                {/* 2. Center Stepper: Integrated 5-step navigation */}
                <nav className="wizard-bottom-bar__col-center wizard-stepper" aria-label="Pasos de la reserva">
                    {/* Connecting track background */}
                    <div className="wizard-stepper__track-bg" aria-hidden="true">
                        <div
                            className="wizard-stepper__track-fill"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    {/* Step Nodes */}
                    <div className="wizard-stepper__nodes" role="tablist">
                        {WIZARD_STEPS.map((step) => {
                            const isCompleted = step.number < currentStep
                            const isCurrent = step.number === currentStep
                            const isClickable = step.number <= maxCompletedStep + 1 || step.number < currentStep

                            return (
                                <button
                                    key={step.number}
                                    type="button"
                                    className={`wizard-step-node ${isCurrent ? 'wizard-step-node--current' : ''} ${
                                        isCompleted ? 'wizard-step-node--completed' : ''
                                    } ${!isClickable ? 'wizard-step-node--disabled' : ''}`}
                                    onClick={() => {
                                        if (isClickable && step.number !== currentStep) {
                                            onStepClick(step.number)
                                        }
                                    }}
                                    disabled={!isClickable || isSubmitting}
                                    aria-current={isCurrent ? 'step' : undefined}
                                    aria-label={`Paso ${step.number}: ${step.fullTitle}${
                                        isCompleted ? ' (completado)' : isCurrent ? ' (actual)' : ''
                                    }`}
                                    title={`Paso ${step.number}: ${step.fullTitle}`}
                                >
                                    <span className="wizard-step-node__circle">
                                        {isCompleted ? (
                                            <Check size={12} strokeWidth={3} />
                                        ) : (
                                            <span>{step.number}</span>
                                        )}
                                    </span>
                                    <span className="wizard-step-node__label">{step.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </nav>

                {/* Mobile price indicator with trigger to open summary sheet (Mobile only) */}
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
                    aria-label="Ver desglose del precio total estimado"
                >
                    <div className="mobile-price-flex">
                        <span className="mobile-price-amount">{formatPrice(totalPayable)}</span>
                        <ChevronUp size={14} className="mobile-price-chevron" />
                    </div>
                    <span className="mobile-price-sub">Ver desglose</span>
                </div>

                {/* 3. Right Action: Next / Confirm & Pay Button */}
                <div className="wizard-bottom-bar__col-right">
                    <button
                        type="button"
                        className={`wizard-bar-btn wizard-bar-btn--next ${
                            isFinalStep ? 'wizard-bar-btn--pay' : ''
                        }`}
                        onClick={handleNextClick}
                        disabled={!isStepValid || isSubmitting}
                        aria-label={
                            isFinalStep
                                ? `Confirmar y Pagar ${formatPrice(totalPayable)}`
                                : 'Continuar al siguiente paso'
                        }
                    >
                        {isFinalStep ? (
                            <>
                                <Lock size={16} />
                                <span className="wizard-bar-btn__pay-desktop">
                                    Confirmar y Pagar {formatPrice(totalPayable)}
                                </span>
                                <span className="wizard-bar-btn__pay-mobile">
                                    Pagar {formatPrice(totalPayable)}
                                </span>
                            </>
                        ) : (
                            <>
                                <span>Continuar</span>
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .wizard-bottom-bar {
                    position: sticky;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(19, 21, 24, 0.95);
                    backdrop-filter: blur(18px);
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.4);
                    z-index: 50;
                    padding: 10px 0;
                    padding-bottom: calc(10px + env(safe-area-inset-bottom, 16px));
                }

                .wizard-bottom-bar__container {
                    max-width: 1240px;
                    margin: 0 auto;
                    padding: 0 var(--space-4);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-4);
                }

                .wizard-bottom-bar__col-left {
                    flex: 0 0 auto;
                }

                .wizard-bottom-bar__col-center {
                    flex: 1;
                    max-width: 580px;
                    margin: 0 auto;
                }

                .wizard-bottom-bar__col-right {
                    flex: 0 0 auto;
                }

                /* Buttons */
                .wizard-bar-btn {
                    height: 48px;
                    padding: 0 var(--space-5);
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
                    user-select: none;
                    white-space: nowrap;
                }

                .wizard-bar-btn--back {
                    background: var(--wz-surface);
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    color: var(--black-matte);
                    min-width: 110px;
                }

                .wizard-bar-btn--back:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.25);
                    transform: translateX(-2px);
                }

                .wizard-bar-btn--back:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                }

                .wizard-bar-btn--next {
                    background: var(--forest-green);
                    color: var(--wz-on-accent);
                    min-width: 140px;
                    box-shadow: 0 4px 14px rgba(204, 160, 83, 0.22);
                }

                .wizard-bar-btn--next:hover:not(:disabled) {
                    background: var(--forest-green-light);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(204, 160, 83, 0.32);
                }

                .wizard-bar-btn--next:disabled {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--gray-500);
                    cursor: not-allowed;
                    box-shadow: none;
                }

                .wizard-bar-btn--pay {
                    background: var(--forest-green);
                    color: var(--wz-on-accent);
                    padding: 0 var(--space-6);
                    min-width: 200px;
                }

                .wizard-bar-btn__pay-mobile {
                    display: none;
                }

                /* Stepper in bottom bar */
                .wizard-stepper {
                    position: relative;
                    width: 100%;
                }

                .wizard-stepper__track-bg {
                    position: absolute;
                    top: 14px;
                    left: 20px;
                    right: 20px;
                    height: 2px;
                    background: rgba(255, 255, 255, 0.12);
                    z-index: 1;
                }

                .wizard-stepper__track-fill {
                    height: 100%;
                    background: var(--forest-green);
                    box-shadow: 0 0 6px rgba(204, 160, 83, 0.5);
                    transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .wizard-stepper__nodes {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .wizard-step-node {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    padding: 2px 6px;
                    border-radius: var(--radius-full);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    user-select: none;
                }

                .wizard-step-node:not(.wizard-step-node--disabled):hover {
                    transform: translateY(-1px);
                }

                .wizard-step-node:not(.wizard-step-node--disabled):hover .wizard-step-node__label {
                    color: var(--black-matte);
                }

                .wizard-step-node--disabled {
                    cursor: not-allowed;
                    opacity: 0.45;
                }

                .wizard-step-node__circle {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: #181A1E;
                    border: 2px solid rgba(255, 255, 255, 0.18);
                    color: var(--gray-400);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 700;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    flex-shrink: 0;
                }

                .wizard-step-node--completed .wizard-step-node__circle {
                    background: var(--forest-green);
                    border-color: var(--forest-green);
                    color: var(--wz-on-accent);
                    box-shadow: 0 0 8px rgba(204, 160, 83, 0.3);
                }

                .wizard-step-node--current .wizard-step-node__circle {
                    background: var(--wz-surface);
                    border-color: var(--forest-green);
                    color: var(--forest-green);
                    box-shadow: 0 0 0 3px rgba(204, 160, 83, 0.22);
                    transform: scale(1.1);
                }

                .wizard-step-node__label {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--gray-400);
                    margin-left: 6px;
                    white-space: nowrap;
                    transition: color 0.2s ease;
                }

                .wizard-step-node--current .wizard-step-node__label {
                    color: var(--forest-green);
                    font-weight: 700;
                }

                .wizard-step-node--completed .wizard-step-node__label {
                    color: var(--gray-600);
                }

                /* Mobile price preview (hidden on desktop) */
                .wizard-bottom-bar__mobile-price {
                    display: none;
                }

                /* Tablet / Mobile breakpoint: <= 860px (Standard AGENTS.md breakpoint) */
                @media (max-width: 860px) {
                    .wizard-bottom-bar {
                        padding: 8px 0;
                        padding-bottom: calc(8px + env(safe-area-inset-bottom, 16px));
                    }

                    .wizard-bottom-bar__container {
                        flex-direction: column;
                        gap: 8px;
                        padding: 0 var(--space-3);
                    }

                    /* Center stepper becomes the top tier on mobile */
                    .wizard-bottom-bar__col-center {
                        order: 1;
                        max-width: 340px;
                        width: 100%;
                        margin: 0 auto;
                    }

                    .wizard-stepper__track-bg {
                        top: 15px;
                        left: 18px;
                        right: 18px;
                    }

                    .wizard-step-node {
                        padding: 2px 4px;
                        min-width: 44px;
                        min-height: 34px;
                        justify-content: center;
                    }

                    .wizard-step-node__circle {
                        width: 28px;
                        height: 28px;
                    }

                    .wizard-step-node__label {
                        display: none;
                    }

                    /* Actions row container (Back, Mobile Price, Next) */
                    .wizard-bottom-bar__col-left {
                        order: 2;
                        flex: 1 1 0%;
                    }

                    .wizard-bottom-bar__mobile-price {
                        order: 3;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        user-select: none;
                        flex: 1 1 auto;
                        min-height: 44px;
                        padding: 0 4px;
                    }

                    .wizard-bottom-bar__col-right {
                        order: 4;
                        flex: 1 1 0%;
                        display: flex;
                        justify-content: flex-end;
                    }

                    /* Wrap bottom actions into a flex row */
                    .wizard-bottom-bar__container {
                        display: grid;
                        grid-template-areas:
                            "stepper stepper stepper"
                            "back price next";
                        grid-template-columns: auto 1fr auto;
                        align-items: center;
                    }

                    .wizard-bottom-bar__col-center {
                        grid-area: stepper;
                    }

                    .wizard-bottom-bar__col-left {
                        grid-area: back;
                    }

                    .wizard-bottom-bar__mobile-price {
                        grid-area: price;
                    }

                    .wizard-bottom-bar__col-right {
                        grid-area: next;
                    }

                    .wizard-bar-btn {
                        height: 44px;
                        min-height: 44px;
                        padding: 0 var(--space-3);
                    }

                    .wizard-bar-btn--back {
                        min-width: 80px;
                    }

                    .wizard-bar-btn--next {
                        min-width: 110px;
                    }

                    .wizard-bar-btn--pay {
                        min-width: 130px;
                    }

                    .wizard-bar-btn__pay-desktop {
                        display: none;
                    }

                    .wizard-bar-btn__pay-mobile {
                        display: inline;
                    }

                    .mobile-price-flex {
                        display: flex;
                        align-items: center;
                        gap: 2px;
                    }

                    .mobile-price-amount {
                        font-size: var(--text-sm);
                        font-weight: 800;
                        color: var(--forest-green);
                    }

                    .mobile-price-chevron {
                        color: var(--forest-green);
                    }

                    .mobile-price-sub {
                        font-size: 10px;
                        font-weight: 600;
                        color: var(--gray-400);
                        text-decoration: underline;
                    }
                }

                @media (max-width: 480px) {
                    .wizard-bar-btn--back {
                        min-width: 44px;
                        padding: 0 10px;
                    }

                    .wizard-bar-btn--next {
                        min-width: 90px;
                        padding: 0 12px;
                        font-size: var(--text-xs);
                    }

                    .wizard-bar-btn--pay {
                        min-width: 110px;
                        padding: 0 10px;
                    }
                }
            `}</style>
        </footer>
    )
}
