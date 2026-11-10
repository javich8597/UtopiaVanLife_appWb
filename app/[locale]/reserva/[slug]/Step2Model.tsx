'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Check, Users, BedDouble, Zap, Sparkles, CalendarCheck, CalendarX, ZoomIn } from 'lucide-react'
import { Step1Data, WizardCamper, getCamperGalleryImages, CamperGalleryPhoto } from './types'
import { validateBookingRange } from '@/lib/booking/calendarLogic'
import { BlockedSlot } from '@/lib/booking/availability'
import {
    formatPrice,
    resolveSeasonForDate,
    getMinNightsForDateV2,
    calculatePriceV2,
    SeasonV2,
    SeasonPeriod,
    DurationDiscount,
} from '@/lib/pricing/engine'
import CamperLightboxModal from '@/components/campers/CamperLightboxModal'

interface Step2ModelProps {
    selectedCamper: WizardCamper
    allCampers: WizardCamper[]
    step1: Step1Data
    seasonsV2: SeasonV2[]
    seasonPeriods: SeasonPeriod[]
    durationDiscounts?: DurationDiscount[]
    onSelectCamper: (camper: WizardCamper) => void
}

const MODEL_HIGHLIGHTS: Record<string, string[]> = {
    neo: [
        'Cama doble fija + cama auxiliar (3 plazas)',
        'Gran maletero + Baño con WC y ducha',
        'Sistema eléctrico Pro 540Ah + A/C 12V Dometic',
    ],
    space: [
        'Cama elevable + cama interbanco (2 plazas)',
        'Máximo espacio interior diurno + Baño con WC y ducha',
        'Sistema eléctrico Pro 540Ah + A/C 12V Dometic',
    ],
}

export default function Step2Model({
    selectedCamper,
    allCampers,
    step1,
    seasonsV2,
    seasonPeriods,
    durationDiscounts = [],
    onSelectCamper,
}: Step2ModelProps) {
    const [availabilityMap, setAvailabilityMap] = useState<Record<string, { loading: boolean; isAvailable: boolean }>>({})
    const [lightboxState, setLightboxState] = useState<{ images: CamperGalleryPhoto[]; index: number } | null>(null)

    const activeMinNights =
        step1.startDate && seasonsV2.length > 0 && seasonPeriods.length > 0
            ? getMinNightsForDateV2(new Date(step1.startDate), seasonsV2, seasonPeriods)
            : 3

    useEffect(() => {
        let isMounted = true

        async function checkModelsAvailability() {
            const initialStatus: Record<string, { loading: boolean; isAvailable: boolean }> = {}
            allCampers.forEach((c) => {
                initialStatus[c.slug] = { loading: true, isAvailable: true }
            })
            if (isMounted) setAvailabilityMap(initialStatus)

            await Promise.all(
                allCampers.map(async (c) => {
                    try {
                        const res = await fetch(`/api/campers/${c.slug}/availability`)
                        if (!res.ok) {
                            if (isMounted) {
                                setAvailabilityMap((prev) => ({
                                    ...prev,
                                    [c.slug]: { loading: false, isAvailable: true },
                                }))
                            }
                            return
                        }
                        const json = await res.json()
                        const blockedSlots: BlockedSlot[] = json.blockedSlots || []

                        let available = true
                        if (step1.startDate && step1.endDate) {
                            const check = validateBookingRange(
                                step1.startDate,
                                step1.startSlot,
                                step1.endDate,
                                step1.endSlot,
                                blockedSlots,
                                activeMinNights
                            )
                            available = check.isValid
                        }

                        if (isMounted) {
                            setAvailabilityMap((prev) => ({
                                ...prev,
                                [c.slug]: { loading: false, isAvailable: available },
                            }))
                        }
                    } catch {
                        if (isMounted) {
                            setAvailabilityMap((prev) => ({
                                ...prev,
                                [c.slug]: { loading: false, isAvailable: true },
                            }))
                        }
                    }
                })
            )
        }

        checkModelsAvailability()
        return () => {
            isMounted = false
        }
    }, [allCampers, step1.startDate, step1.startSlot, step1.endDate, step1.endSlot, activeMinNights])

    const getNightlyPrice = (camper: WizardCamper) => {
        const base = Number(camper.base_price_per_night || camper.price_per_night || 110)
        if (!step1.startDate || seasonsV2.length === 0) return base
        const season = resolveSeasonForDate(new Date(step1.startDate), seasonsV2, seasonPeriods)
        return base + Number(season.supplement_per_night || 0)
    }

    const getModelRangeSubtotal = (camper: WizardCamper): number | null => {
        if (!step1.startDate || !step1.endDate) return null
        const s = new Date(step1.startDate)
        const e = new Date(step1.endDate)
        if (e <= s) return null
        const base = Number(camper.base_price_per_night || camper.price_per_night || 110)
        const calc = calculatePriceV2({
            startDate: s,
            pickupSlot: step1.startSlot,
            endDate: e,
            dropoffSlot: step1.endSlot,
            camperBasePrice: base,
            camperId: camper.id,
            seasons: seasonsV2,
            periods: seasonPeriods,
            discounts: durationDiscounts,
            kmPackage: 'included_150',
            cancellationPolicy: 'standard',
            depositOption: 'standard_2000',
            depositAmount: 1000,
        })
        return calc.numNights > 0 ? calc.discountedBaseTotal : null
    }

    return (
        <div className="step-model">
            <div className="step-header">
                <span className="step-header__tag">PASO 2 DE 7</span>
                <h2 className="step-header__title">Modelo de camper</h2>
            </div>

            <div className="models-grid">
                {allCampers.map((model) => {
                    const isSelected = model.slug === selectedCamper.slug
                    const status = availabilityMap[model.slug]
                    const isAvailable = status ? status.isAvailable : true
                    const canSelect = isSelected || isAvailable
                    const gallery = getCamperGalleryImages(model)
                    const nightlyPrice = getNightlyPrice(model)
                    const rangeSubtotal = getModelRangeSubtotal(model)
                    const seats = model.specs?.seats || (model.slug === 'space' ? 2 : 3)
                    const beds = model.specs?.beds || (model.slug === 'space' ? 2 : 3)
                    const highlights = MODEL_HIGHLIGHTS[model.slug.toLowerCase()] || MODEL_HIGHLIGHTS.neo

                    return (
                        <div
                            key={model.slug}
                            role="radio"
                            aria-checked={isSelected}
                            aria-disabled={!canSelect}
                            tabIndex={canSelect ? 0 : -1}
                            className={`model-card ${isSelected ? 'model-card--active' : ''} ${!canSelect ? 'model-card--disabled' : ''}`}
                            onClick={() => {
                                if (canSelect && !isSelected) {
                                    onSelectCamper(model)
                                }
                            }}
                            onKeyDown={(e) => {
                                if ((e.key === 'Enter' || e.key === ' ') && canSelect && !isSelected) {
                                    e.preventDefault()
                                    onSelectCamper(model)
                                }
                            }}
                        >
                            {/* Compact Top Row */}
                            <div className="model-card__top">
                                <div className="model-card__title-wrap">
                                    <div className="model-card__radio">
                                        {isSelected && <div className="model-card__radio-inner" />}
                                    </div>
                                    <h3 className="model-card__title">{model.name}</h3>
                                    {isSelected ? (
                                        <span className="model-card__badge model-card__badge--selected">
                                            <Sparkles size={11} />
                                            Seleccionado
                                        </span>
                                    ) : isAvailable ? (
                                        <span className="model-card__badge model-card__badge--available">
                                            <CalendarCheck size={11} />
                                            Disponible
                                        </span>
                                    ) : (
                                        <span className="model-card__badge model-card__badge--unavailable">
                                            <CalendarX size={11} />
                                            Ocupado
                                        </span>
                                    )}
                                </div>

                                <div className="model-card__price-col">
                                    <div className="model-card__price-box">
                                        <span className="model-card__price-amount">{formatPrice(nightlyPrice)}</span>
                                        <span className="model-card__price-unit">/noche</span>
                                    </div>
                                    {rangeSubtotal !== null && (
                                        <span className="model-card__range-total">
                                            Estancia: {formatPrice(rangeSubtotal)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Compact Thumbnail Strip */}
                            <div
                                className="model-card__photos"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {gallery.slice(0, 4).map((photo, idx) => (
                                    <button
                                        key={`${model.slug}-photo-${idx}`}
                                        type="button"
                                        className="model-photo-thumb"
                                        onClick={() => setLightboxState({ images: gallery, index: idx })}
                                        aria-label={`Ver foto ${idx + 1} de ${model.name}`}
                                        title={`Ampliar: ${photo.tag}`}
                                    >
                                        <Image
                                            src={photo.src}
                                            alt={photo.tag}
                                            fill
                                            sizes="96px"
                                            className="model-photo-img"
                                        />
                                        <span className="model-photo-zoom">
                                            <ZoomIn size={11} />
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Compact Specs & Highlights */}
                            <div className="model-card__QuickSpecs">
                                <span className="quick-spec">
                                    <Users size={12} className="text-forest" />
                                    {seats} plazas
                                </span>
                                <span className="quick-spec">
                                    <BedDouble size={12} className="text-forest" />
                                    {beds} camas
                                </span>
                                <span className="quick-spec">
                                    <Zap size={12} className="text-forest" />
                                    540Ah Litio
                                </span>
                            </div>

                            <ul className="model-card__features">
                                {highlights.map((feat, idx) => (
                                    <li key={idx} className="model-feature-item">
                                        <Check size={12} className="text-forest model-feature-icon" />
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* Compact Action Button */}
                            <button
                                type="button"
                                className={`model-select-btn ${isSelected ? 'model-select-btn--active' : ''}`}
                                disabled={!canSelect}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (canSelect && !isSelected) {
                                        onSelectCamper(model)
                                    }
                                }}
                            >
                                {isSelected
                                    ? `${model.name} seleccionado ✓`
                                    : isAvailable
                                        ? `Cambiar a ${model.name}`
                                        : `No disponible`}
                            </button>
                        </div>
                    )
                })}
            </div>

            <CamperLightboxModal
                isOpen={lightboxState !== null}
                images={lightboxState?.images || []}
                currentIndex={lightboxState?.index || 0}
                onClose={() => setLightboxState(null)}
                onNavigate={(idx) =>
                    setLightboxState((prev) => (prev ? { ...prev, index: idx } : null))
                }
            />

            <style jsx>{`
                .step-model {
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

                .models-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4, 16px);
                }

                .model-card {
                    background: var(--wz-surface);
                    border: 1.5px solid var(--gray-200);
                    border-radius: var(--radius-lg, 14px);
                    padding: 14px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    transition: all 0.2s ease;
                    outline: none;
                }

                .model-card:hover:not(.model-card--disabled) {
                    border-color: var(--forest-green-light);
                }

                .model-card--active {
                    border-color: var(--forest-green);
                    box-shadow: 0 0 0 1px var(--wz-pill-border);
                }

                .model-card--disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .model-card__top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }

                .model-card__title-wrap {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .model-card__radio {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    border: 2px solid var(--gray-400);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .model-card--active .model-card__radio {
                    border-color: var(--forest-green);
                }

                .model-card__radio-inner {
                    width: 9px;
                    height: 9px;
                    border-radius: 50%;
                    background: var(--forest-green);
                }

                .model-card__title {
                    font-family: var(--font-display);
                    font-size: 16px;
                    font-weight: 800;
                    color: var(--black-matte);
                    margin: 0;
                }

                .model-card__badge {
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: var(--radius-full);
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }

                .model-card__badge--selected {
                    background: var(--wz-pill-bg);
                    color: var(--wz-pill-text);
                    border: 1px solid var(--wz-pill-border);
                }

                .model-card__badge--available {
                    background: rgba(52, 211, 153, 0.12);
                    color: #34d399;
                    border: 1px solid rgba(52, 211, 153, 0.25);
                }

                :global(html[data-theme="light"]) .model-card__badge--available {
                    background: #E7EFE5;
                    color: #2D5233;
                    border: 1px solid #CFE2D2;
                }

                .model-card__badge--unavailable {
                    background: rgba(239, 68, 68, 0.12);
                    color: #f87171;
                }

                :global(html[data-theme="light"]) .model-card__badge--unavailable {
                    background: #FEE2E2;
                    color: #991B1B;
                }

                .model-card__price-col {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 1px;
                }

                .model-card__price-box {
                    display: flex;
                    align-items: baseline;
                    gap: 3px;
                }

                .model-card__range-total {
                    font-size: 10.5px;
                    font-weight: 600;
                    color: var(--gray-500);
                }

                .model-card__price-amount {
                    font-size: 15px;
                    font-weight: 800;
                    color: var(--forest-green);
                }

                .model-card__price-unit {
                    font-size: 10px;
                    color: var(--gray-500);
                }

                .model-card__photos {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 6px;
                }

                .model-photo-thumb {
                    position: relative;
                    height: 48px;
                    border-radius: 6px;
                    overflow: hidden;
                    border: 1px solid var(--gray-200);
                    background: var(--wz-chip-bg);
                    padding: 0;
                    cursor: pointer;
                }

                .model-photo-thumb:hover {
                    border-color: var(--forest-green);
                }

                :global(.model-photo-img) {
                    object-fit: cover;
                }

                .model-photo-zoom {
                    position: absolute;
                    inset: 0;
                    background: rgba(11, 12, 14, 0.45);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                .model-photo-thumb:hover .model-photo-zoom {
                    opacity: 1;
                }

                .model-card__QuickSpecs {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .quick-spec {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--gray-700);
                    background: var(--wz-chip-bg);
                    border: 1px solid var(--wz-chip-border);
                    padding: 2px 7px;
                    border-radius: 999px;
                }

                .model-card__features {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    border-top: 1px solid var(--gray-100);
                    padding-top: 8px;
                }

                .model-feature-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11.5px;
                    color: var(--gray-600);
                }

                :global(.model-feature-icon) {
                    flex-shrink: 0;
                }

                .model-select-btn {
                    width: 100%;
                    min-height: 36px;
                    border-radius: var(--radius-md, 8px);
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    border: 1px solid var(--gray-300);
                    background: var(--wz-chip-bg);
                    color: var(--black-matte);
                    transition: all 0.2s ease;
                    margin-top: auto;
                }

                .model-select-btn:hover:not(:disabled) {
                    border-color: var(--forest-green);
                }

                .model-select-btn--active {
                    background: var(--forest-green);
                    border-color: var(--forest-green);
                    color: var(--wz-on-accent);
                }

                .model-select-btn:disabled {
                    opacity: 0.45;
                    cursor: not-allowed;
                }

                @media (max-width: 860px) {
                    .models-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}
