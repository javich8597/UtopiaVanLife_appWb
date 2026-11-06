'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { WizardStep, WizardCamper } from './types'

interface WizardHeaderProps {
    camper: WizardCamper
    currentStep: WizardStep
    locale: string
    maxCompletedStep?: number
    onStepClick?: (step: WizardStep) => void
}

export default function WizardHeader({
    camper,
    currentStep,
    locale,
}: WizardHeaderProps) {
    const mainImage = camper.images && camper.images.length > 0 ? camper.images[0] : '/images/campers/neo/neo-ext.png'
    const progressPercent = Math.min(100, Math.max(10, (currentStep / 5) * 100))

    return (
        <header className="wizard-header">
            <div className="wizard-header__container">
                {/* Back link to camper detail page */}
                <Link
                    href={`/${locale}/campers/${camper.slug}`}
                    className="wizard-header__back-btn"
                    title="Volver a la ficha de la camper"
                    aria-label="Volver a la ficha de la camper"
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
                            fill
                            sizes="48px"
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

            {/* Ultra-fine 2px progress bar at the bottom border */}
            <div className="wizard-header__progress-track" aria-hidden="true">
                <div
                    className="wizard-header__progress-bar"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <style jsx>{`
                .wizard-header {
                    background: var(--wz-surface);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
                    position: sticky;
                    top: 0;
                    z-index: 40;
                    backdrop-filter: blur(16px);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
                }

                .wizard-header__container {
                    max-width: 1240px;
                    margin: 0 auto;
                    padding: 0 var(--space-4);
                    height: 56px;
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
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    min-height: 36px;
                }

                .wizard-header__back-btn:hover {
                    color: var(--black-matte);
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.16);
                    transform: translateX(-2px);
                }

                .wizard-header__camper-capsule {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .wizard-header__camper-thumb {
                    position: relative;
                    width: 48px;
                    height: 32px;
                    border-radius: 6px;
                    overflow: hidden;
                    background: #202020;
                    flex-shrink: 0;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                }

                .wizard-header__camper-img {
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
                    color: var(--gray-500);
                }

                .wizard-header__trust-pill {
                    display: none;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: var(--forest-green);
                    font-weight: 600;
                    background: rgba(204, 160, 83, 0.08);
                    border: 1px solid rgba(204, 160, 83, 0.2);
                    padding: 5px 12px;
                    border-radius: var(--radius-full);
                }

                .wizard-header__progress-track {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: rgba(255, 255, 255, 0.06);
                    overflow: hidden;
                }

                .wizard-header__progress-bar {
                    height: 100%;
                    background: var(--forest-green);
                    box-shadow: 0 0 8px rgba(204, 160, 83, 0.4);
                    transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @media (min-width: 768px) {
                    .wizard-header__trust-pill {
                        display: flex;
                    }
                }

                @media (max-width: 640px) {
                    .wizard-header__container {
                        height: 50px;
                    }
                    .wizard-header__back-text,
                    .wizard-header__camper-sub {
                        display: none;
                    }
                    .wizard-header__back-btn {
                        width: 44px;
                        height: 44px;
                        min-height: 44px;
                        justify-content: center;
                        padding: 0;
                    }
                }
            `}</style>
        </header>
    )
}
