'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, ZoomIn, Users, BedDouble, Zap, Maximize2, RefreshCw } from 'lucide-react'
import { WizardStep, WizardCamper, getCamperGalleryImages } from './types'
import CamperLightboxModal from '@/components/campers/CamperLightboxModal'

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
    onStepClick,
}: WizardHeaderProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
    const galleryImages = getCamperGalleryImages(camper)
    const progressPercent = Math.min(100, Math.max(10, (currentStep / 7) * 100))

    const seats = camper.specs?.seats || (camper.slug === 'space' ? 2 : 3)
    const beds = camper.specs?.beds || (camper.slug === 'space' ? 2 : 3)
    const highlightFeature = camper.slug === 'space' ? 'Salón «U» + Pack Cine HD' : 'Maletero XXL 2.230L'

    return (
        <>
            <section className="wizard-model-banner" aria-label={`Modelo seleccionado: ${camper.name}`}>
                <div className="wizard-model-banner__container">
                    {/* Top Row: Back button & Trust Pill */}
                    <div className="wizard-model-banner__top-bar">
                        <Link
                            href={`/${locale}/campers/${camper.slug}`}
                            className="wizard-model-banner__back-btn"
                            title="Volver a la ficha de la camper"
                        >
                            <ArrowLeft size={15} />
                            <span>Volver a la ficha de {camper.name}</span>
                        </Link>

                        <div className="wizard-model-banner__top-right">
                            {onStepClick && currentStep !== 2 && (
                                <button
                                    type="button"
                                    className="wizard-model-banner__switch-btn"
                                    onClick={() => onStepClick(2)}
                                >
                                    <RefreshCw size={13} />
                                    <span>Cambiar modelo</span>
                                </button>
                            )}
                            <div className="wizard-model-banner__trust-pill">
                                <ShieldCheck size={14} className="text-forest" />
                                <span>Seguro a Todo Riesgo + Fianza 1.000 € incluida</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Showcase Card: Selected Model Info + Clickable Photo Thumbnails */}
                    <div className="wizard-model-card">
                        <div className="wizard-model-card__info">
                            <div className="wizard-model-card__eyebrow">
                                <span className="wizard-model-card__brand">UTOPIA VAN LIFE</span>
                                <span className="wizard-model-card__dot">·</span>
                                <span className="wizard-model-card__status">MODELO ELEGIDO</span>
                            </div>

                            <div className="wizard-model-card__title-row">
                                <h1 className="wizard-model-card__name">{camper.name}</h1>
                                <span className="wizard-model-card__step-pill">
                                    Paso {currentStep} de 7
                                </span>
                            </div>

                            {camper.description_es && (
                                <p className="wizard-model-card__desc">{camper.description_es}</p>
                            )}

                            <div className="wizard-model-card__specs">
                                <span className="model-spec-badge">
                                    <Users size={13} className="text-forest" />
                                    <span>{seats} plazas</span>
                                </span>
                                <span className="model-spec-badge">
                                    <BedDouble size={13} className="text-forest" />
                                    <span>{beds} camas</span>
                                </span>
                                <span className="model-spec-badge">
                                    <Zap size={13} className="text-forest" />
                                    <span>Victron 540Ah Litio</span>
                                </span>
                                <span className="model-spec-badge">
                                    <span>{highlightFeature}</span>
                                </span>
                            </div>
                        </div>

                        {/* Clickable Thumbnail Strip */}
                        <div className="wizard-model-card__gallery">
                            <div className="wizard-model-card__gallery-header">
                                <span className="gallery-label">
                                    <Maximize2 size={12} className="text-forest" />
                                    <span>Fotos de {camper.name} (clica para ampliar)</span>
                                </span>
                                <button
                                    type="button"
                                    className="gallery-view-all-btn"
                                    onClick={() => setLightboxIndex(0)}
                                >
                                    Ver las {galleryImages.length} fotos
                                </button>
                            </div>

                            <div className="wizard-model-card__thumbs" role="list" aria-label={`Miniaturas de ${camper.name}`}>
                                {galleryImages.map((img, idx) => (
                                    <button
                                        key={`${camper.slug}-thumb-${idx}`}
                                        type="button"
                                        className="model-thumb-btn"
                                        onClick={() => setLightboxIndex(idx)}
                                        aria-label={`Ampliar foto ${idx + 1}: ${img.tag}`}
                                        title={`Clic para ampliar: ${img.tag}`}
                                    >
                                        <Image
                                            src={img.src}
                                            alt={img.tag}
                                            fill
                                            sizes="(max-width: 640px) 96px, 116px"
                                            className="model-thumb-img"
                                            priority={idx < 2}
                                        />
                                        <span className="model-thumb-overlay" aria-hidden="true">
                                            <ZoomIn size={15} />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress bar at the bottom of the model banner */}
                <div className="wizard-model-banner__progress-track" aria-hidden="true">
                    <div
                        className="wizard-model-banner__progress-bar"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </section>

            {/* Full-screen Photo Lightbox Modal */}
            <CamperLightboxModal
                isOpen={lightboxIndex !== null}
                images={galleryImages}
                currentIndex={lightboxIndex ?? 0}
                onClose={() => setLightboxIndex(null)}
                onNavigate={(idx) => setLightboxIndex(idx)}
            />

            <style jsx>{`
                .wizard-model-banner {
                    background: var(--wz-surface);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    position: relative;
                    z-index: 20;
                    padding: var(--space-4) 0 var(--space-5);
                }

                .wizard-model-banner__container {
                    max-width: 1240px;
                    margin: 0 auto;
                    padding: 0 var(--space-4);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .wizard-model-banner__top-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-3);
                    flex-wrap: wrap;
                }

                .wizard-model-banner :global(.wizard-model-banner__back-btn) {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--gray-600);
                    padding: 6px 12px;
                    border-radius: var(--radius-full);
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    transition: all 0.2s ease;
                    min-height: 36px;
                    text-decoration: none;
                }

                .wizard-model-banner :global(.wizard-model-banner__back-btn:hover) {
                    color: var(--black-matte);
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.18);
                    transform: translateX(-2px);
                }

                .wizard-model-banner__top-right {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    flex-wrap: wrap;
                }

                .wizard-model-banner__switch-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--black-matte);
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    padding: 6px 12px;
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    min-height: 34px;
                }

                .wizard-model-banner__switch-btn:hover {
                    border-color: var(--forest-green);
                    color: var(--forest-green);
                    background: rgba(204, 160, 83, 0.08);
                }

                .wizard-model-banner__trust-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: var(--forest-green);
                    font-weight: 600;
                    background: rgba(204, 160, 83, 0.08);
                    border: 1px solid rgba(204, 160, 83, 0.22);
                    padding: 5px 12px;
                    border-radius: var(--radius-full);
                }

                .wizard-model-card {
                    display: grid;
                    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
                    gap: var(--space-5);
                    align-items: center;
                    background: var(--wz-bg);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-xl);
                    padding: var(--space-4) var(--space-5);
                }

                .wizard-model-card__info {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    min-width: 0;
                }

                .wizard-model-card__eyebrow {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                }

                .wizard-model-card__brand {
                    color: var(--forest-green);
                }

                .wizard-model-card__dot {
                    color: var(--gray-400);
                }

                .wizard-model-card__status {
                    color: var(--gray-500);
                }

                .wizard-model-card__title-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .wizard-model-card__name {
                    font-family: var(--font-display);
                    font-size: clamp(1.35rem, 2.5vw, 1.75rem);
                    font-weight: 800;
                    color: var(--black-matte);
                    margin: 0;
                    line-height: 1.1;
                    letter-spacing: 0.02em;
                }

                .wizard-model-card__step-pill {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--wz-on-accent);
                    background: var(--forest-green);
                    padding: 3px 10px;
                    border-radius: var(--radius-full);
                    letter-spacing: 0.03em;
                }

                .wizard-model-card__desc {
                    font-size: 12px;
                    color: var(--gray-600);
                    line-height: 1.5;
                    margin: 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .wizard-model-card__specs {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 2px;
                }

                .model-spec-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--gray-700);
                    background: var(--wz-surface);
                    border: 1px solid var(--gray-200);
                    padding: 4px 10px;
                    border-radius: var(--radius-full);
                }

                .wizard-model-card__gallery {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    min-width: 0;
                }

                .wizard-model-card__gallery-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }

                .gallery-label {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--gray-600);
                }

                .gallery-view-all-btn {
                    background: transparent;
                    border: none;
                    color: var(--forest-green);
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    padding: 2px 4px;
                    text-decoration: underline;
                }

                .gallery-view-all-btn:hover {
                    color: var(--forest-green-light);
                }

                .wizard-model-card__thumbs {
                    display: grid;
                    grid-template-columns: repeat(6, minmax(0, 1fr));
                    gap: 8px;
                }

                .model-thumb-btn {
                    position: relative;
                    aspect-ratio: 4 / 3;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    border: 1.5px solid rgba(255, 255, 255, 0.14);
                    background: #181a1e;
                    padding: 0;
                    cursor: zoom-in;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .model-thumb-btn:hover {
                    border-color: var(--forest-green);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
                }

                :global(.model-thumb-img) {
                    object-fit: cover;
                    transition: transform 0.3s ease;
                }

                .model-thumb-btn:hover :global(.model-thumb-img) {
                    transform: scale(1.08);
                }

                .model-thumb-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(11, 12, 14, 0.45);
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                .model-thumb-btn:hover .model-thumb-overlay {
                    opacity: 1;
                }

                .wizard-model-banner__progress-track {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: rgba(255, 255, 255, 0.06);
                    overflow: hidden;
                }

                .wizard-model-banner__progress-bar {
                    height: 100%;
                    background: var(--forest-green);
                    box-shadow: 0 0 8px rgba(204, 160, 83, 0.4);
                    transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @media (max-width: 860px) {
                    .wizard-model-card {
                        grid-template-columns: 1fr;
                        gap: var(--space-3);
                        padding: var(--space-3) var(--space-4);
                    }

                    .wizard-model-card__thumbs {
                        grid-template-columns: repeat(6, minmax(68px, 1fr));
                        overflow-x: auto;
                        padding-bottom: 2px;
                    }
                }

                @media (max-width: 640px) {
                    .wizard-model-banner__trust-pill {
                        display: none;
                    }

                    .wizard-model-card__thumbs {
                        grid-template-columns: repeat(6, 76px);
                    }
                }
            `}</style>
        </>
    )
}
