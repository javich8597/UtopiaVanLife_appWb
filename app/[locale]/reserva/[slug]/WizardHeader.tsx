'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Check, Sparkles, ShieldCheck, Users, BedDouble } from 'lucide-react'
import { WizardStep, WizardCamper } from './types'

interface WizardHeaderProps {
    camper: WizardCamper
    currentStep: WizardStep
    maxCompletedStep: number
    onStepClick: (step: WizardStep) => void
    locale: string
}

const STEPS = [
    { number: 1 as WizardStep, title: 'Fechas y Horarios', shortTitle: 'Fechas' },
    { number: 2 as WizardStep, title: 'Kilometraje', shortTitle: 'KM' },
    { number: 3 as WizardStep, title: 'Cancelación', shortTitle: 'Cancelación' },
    { number: 4 as WizardStep, title: 'Extras & Experiencias', shortTitle: 'Extras' },
    { number: 5 as WizardStep, title: 'Tus Datos & Pago', shortTitle: 'Pago' },
]

export default function WizardHeader({
    camper,
    currentStep,
    maxCompletedStep,
    onStepClick,
    locale,
}: WizardHeaderProps) {
    const mainImage = camper.images && camper.images.length > 0 ? camper.images[0] : '/images/campers/neo/neo-ext.png'
    const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100

    return (
        <header className="wizard-header">
            {/* Top Brand & Camper Bar */}
            <div className="wizard-header__top">
                <div className="wizard-header__container">
                    {/* Back link */}
                    <Link
                        href={`/${locale}/campers/${camper.slug}`}
                        className="wizard-header__back-btn"
                        title="Volver a la ficha de la camper"
                    >
                        <ArrowLeft size={16} />
                        <span className="wizard-header__back-text">Ficha de la camper</span>
                    </Link>

                    {/* Camper Summary Capsule */}
                    <div className="wizard-header__camper-capsule">
                        <div className="wizard-header__camper-thumb">
                            <Image
                                src={mainImage}
                                alt={camper.name}
                                width={54}
                                height={36}
                                className="wizard-header__camper-img"
                                priority
                            />
                        </div>
                        <div className="wizard-header__camper-meta">
                            <div className="wizard-header__brand-line">
                                <span className="wizard-header__brand-tag">UTOPIA VAN LIFE</span>
                                <span className="wizard-header__brand-dot">·</span>
                                <span className="wizard-header__badge-model">{camper.name}</span>
                            </div>
                            <div className="wizard-header__camper-sub">
                                <span>Mallorca</span>
                                <span>·</span>
                                <span>{camper.specs?.seats || 2} plazas</span>
                                <span>·</span>
                                <span>{camper.specs?.transmission || 'Automático / Manual'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Trust Pill */}
                    <div className="wizard-header__trust-pill">
                        <ShieldCheck size={14} className="text-forest" />
                        <span>Fianza 1.000 € reembolsable</span>
                    </div>
                </div>
            </div>

            {/* Stepper Bar */}
            <div className="wizard-header__stepper-bar">
                <div className="wizard-header__container">
                    <div className="wizard-stepper">
                        {/* Continuous Track Background */}
                        <div className="wizard-stepper__track-bg">
                            <div
                                className="wizard-stepper__track-fill"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        {/* Step Nodes */}
                        <div className="wizard-stepper__nodes">
                            {STEPS.map((step) => {
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
                                        disabled={!isClickable}
                                        aria-current={isCurrent ? 'step' : undefined}
                                    >
                                        <div className="wizard-step-node__circle">
                                            {isCompleted ? (
                                                <Check size={14} strokeWidth={2.8} />
                                            ) : (
                                                <span>{step.number}</span>
                                            )}
                                        </div>
                                        <div className="wizard-step-node__label-box">
                                            <span className="wizard-step-node__number-sub">Paso {step.number}</span>
                                            <span className="wizard-step-node__title">{step.title}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .wizard-header {
                    background: #ffffff;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.07);
                    position: sticky;
                    top: 0;
                    z-index: 40;
                    backdrop-filter: blur(16px);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
                }

                .wizard-header__container {
                    max-width: 1240px;
                    margin: 0 auto;
                    padding: 0 var(--space-4);
                }

                .wizard-header__top {
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                    padding: var(--space-2) 0;
                    background: #faf8f5;
                }

                .wizard-header__top .wizard-header__container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-3);
                }

                .wizard-header__back-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: var(--text-xs);
                    font-weight: 600;
                    color: var(--gray-600);
                    padding: 6px 12px;
                    border-radius: var(--radius-full);
                    background: rgba(0, 0, 0, 0.03);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .wizard-header__back-btn:hover {
                    color: var(--black-matte);
                    background: rgba(0, 0, 0, 0.07);
                    transform: translateX(-2px);
                }

                .wizard-header__camper-capsule {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .wizard-header__camper-thumb {
                    width: 52px;
                    height: 34px;
                    border-radius: 6px;
                    overflow: hidden;
                    background: #202020;
                    flex-shrink: 0;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
                }

                .wizard-header__camper-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .wizard-header__camper-meta {
                    display: flex;
                    flex-direction: column;
                }

                .wizard-header__brand-line {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .wizard-header__brand-tag {
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: var(--forest-green);
                }

                .wizard-header__brand-dot {
                    font-size: 10px;
                    color: var(--gray-400);
                }

                .wizard-header__badge-model {
                    font-family: var(--font-display);
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--black-matte);
                    letter-spacing: 0.02em;
                }

                .wizard-header__camper-sub {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: var(--gray-600);
                }

                .wizard-header__trust-pill {
                    display: none;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: var(--forest-green);
                    font-weight: 600;
                    background: rgba(45, 58, 45, 0.06);
                    padding: 4px 10px;
                    border-radius: var(--radius-full);
                }

                @media (min-width: 768px) {
                    .wizard-header__trust-pill {
                        display: flex;
                    }
                }

                /* Stepper styling */
                .wizard-header__stepper-bar {
                    padding: 14px 0 12px;
                }

                .wizard-stepper {
                    position: relative;
                    width: 100%;
                }

                .wizard-stepper__track-bg {
                    position: absolute;
                    top: 16px;
                    left: 20px;
                    right: 20px;
                    height: 2px;
                    background: var(--gray-200);
                    z-index: 1;
                }

                .wizard-stepper__track-fill {
                    height: 100%;
                    background: var(--forest-green);
                    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .wizard-stepper__nodes {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    justify-content: space-between;
                }

                .wizard-step-node {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 0 4px;
                    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .wizard-step-node:not(.wizard-step-node--disabled):hover {
                    transform: translateY(-1px);
                }

                .wizard-step-node--disabled {
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                .wizard-step-node__circle {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 2px solid var(--gray-200);
                    color: var(--gray-600);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    font-weight: 700;
                    margin-bottom: 6px;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
                }

                .wizard-step-node--completed .wizard-step-node__circle {
                    background: var(--forest-green);
                    border-color: var(--forest-green);
                    color: #ffffff;
                }

                .wizard-step-node--current .wizard-step-node__circle {
                    background: #ffffff;
                    border-color: var(--forest-green);
                    color: var(--forest-green);
                    box-shadow: 0 0 0 4px rgba(45, 58, 45, 0.15);
                    transform: scale(1.08);
                }

                .wizard-step-node__label-box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }

                .wizard-step-node__number-sub {
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: var(--gray-400);
                    display: none;
                }

                .wizard-step-node__title {
                    font-size: 12px;
                    font-weight: 500;
                    color: var(--gray-600);
                    white-space: nowrap;
                    transition: color 0.2s ease;
                }

                .wizard-step-node--current .wizard-step-node__title {
                    font-weight: 700;
                    color: var(--forest-green);
                }

                .wizard-step-node--completed .wizard-step-node__title {
                    color: var(--black-matte);
                    font-weight: 600;
                }

                @media (min-width: 640px) {
                    .wizard-step-node__number-sub {
                        display: block;
                    }
                    .wizard-step-node__circle {
                        width: 34px;
                        height: 34px;
                    }
                }

                @media (max-width: 600px) {
                    .wizard-step-node__title {
                        display: none;
                    }
                    .wizard-step-node--current .wizard-step-node__title {
                        display: block;
                        position: absolute;
                        top: 40px;
                        font-size: 11px;
                        white-space: nowrap;
                    }
                    .wizard-header__stepper-bar {
                        padding-bottom: 24px;
                    }
                }
            `}</style>
        </header>
    )
}
