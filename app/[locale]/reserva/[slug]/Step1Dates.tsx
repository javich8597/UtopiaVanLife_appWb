'use client'

import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, AlertCircle, Sun, Sunset, Info } from 'lucide-react'
import BookingCalendar, { BlockedRange } from '@/components/booking/BookingCalendar'
import { BlockedSlot } from '@/lib/booking/availability'
import { isSlotSelectableAsPickup, isSlotSelectableAsReturn } from '@/lib/booking/calendarLogic'
import { DaySlot, Step1Data, WizardCamper } from './types'
import {
    getMinNightsForDateV2,
    resolveSeasonForDate,
    formatPrice,
    SeasonV2,
    SeasonPeriod,
} from '@/lib/pricing/engine'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Step1DatesProps {
    camper: WizardCamper
    data: Step1Data
    onChange: (data: Step1Data) => void
    seasonsV2: SeasonV2[]
    seasonPeriods: SeasonPeriod[]
    onBlockedSlotsChange?: (slots: BlockedSlot[]) => void
}

export default function Step1Dates({
    camper,
    data,
    onChange,
    seasonsV2,
    seasonPeriods,
    onBlockedSlotsChange,
}: Step1DatesProps) {
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
    const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([])

    useEffect(() => {
        let isMounted = true
        async function fetchAvailability() {
            try {
                const res = await fetch(`/api/campers/${camper.slug}/availability`)
                if (res.ok) {
                    const json = await res.json()
                    if (isMounted) {
                        const slots = json.blockedSlots || []
                        const ranges = json.blockedRanges || []
                        setBlockedSlots(slots)
                        setBlockedRanges(ranges)
                        onBlockedSlotsChange?.(slots)
                    }
                }
            } catch (err) {
                console.error('Error fetching camper availability:', err)
            }
        }
        fetchAvailability()
        return () => {
            isMounted = false
        }
    }, [camper.slug])

    const activeMinNights =
        data.startDate && seasonsV2.length > 0 && seasonPeriods.length > 0
            ? getMinNightsForDateV2(new Date(data.startDate), seasonsV2, seasonPeriods)
            : 3

    const baseCamperPrice = Number(camper.base_price_per_night || camper.price_per_night || 110)

    const pickupHalfDayCost =
        data.startDate && seasonsV2.length > 0
            ? (baseCamperPrice +
                Number(resolveSeasonForDate(new Date(data.startDate), seasonsV2, seasonPeriods).supplement_per_night || 0)) *
            0.5
            : baseCamperPrice * 0.5

    const returnHalfDayCost =
        data.endDate && seasonsV2.length > 0
            ? (baseCamperPrice +
                Number(resolveSeasonForDate(new Date(data.endDate), seasonsV2, seasonPeriods).supplement_per_night || 0)) *
            0.5
            : baseCamperPrice * 0.5

    const handleCalendarChange = (
        start: string,
        newStartSlot: DaySlot,
        end: string,
        newEndSlot: DaySlot
    ) => {
        onChange({
            ...data,
            startDate: start,
            startSlot: newStartSlot || data.startSlot,
            endDate: end,
            endSlot: newEndSlot || data.endSlot,
        })
    }

    const canPickupMorning = data.startDate
        ? isSlotSelectableAsPickup(data.startDate, 'morning', blockedSlots)
        : true
    const canPickupAfternoon = data.startDate
        ? isSlotSelectableAsPickup(data.startDate, 'afternoon', blockedSlots)
        : true
    const canReturnMorning = data.endDate
        ? isSlotSelectableAsReturn(data.endDate, 'morning', blockedSlots)
        : true
    const canReturnAfternoon = data.endDate
        ? isSlotSelectableAsReturn(data.endDate, 'afternoon', blockedSlots)
        : true

    const handleStartSlotSelect = (slot: DaySlot) => {
        if (slot === 'morning' && !canPickupMorning) return
        if (slot === 'afternoon' && !canPickupAfternoon) return
        onChange({ ...data, startSlot: slot })
    }

    const handleEndSlotSelect = (slot: DaySlot) => {
        if (slot === 'morning' && !canReturnMorning) return
        if (slot === 'afternoon' && !canReturnAfternoon) return
        onChange({ ...data, endSlot: slot })
    }

    const nights =
        data.startDate && data.endDate
            ? Math.round(
                (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
            : 0

    const isBelowMin = Boolean(data.startDate && data.endDate && nights > 0 && nights < activeMinNights)

    return (
        <div className="step-dates">
            <div className="step-header">
                <span className="step-header__tag">PASO 1 DE 7</span>
                <h2 className="step-header__title">Fechas y horario</h2>
            </div>

            {/* 1. Interactive Calendar Section */}
            <div className="calendar-section">
                <div className="calendar-section__header">
                    <div className="calendar-section__dates-badge">
                        <CalendarIcon size={15} className="text-forest" />
                        <span>
                            {data.startDate
                                ? format(parseISO(data.startDate), "d MMM yyyy", { locale: es })
                                : 'Recogida'}
                        </span>
                        <span className="calendar-section__arrow">→</span>
                        <span>
                            {data.endDate
                                ? format(parseISO(data.endDate), "d MMM yyyy", { locale: es })
                                : 'Devolución'}
                        </span>
                        {nights > 0 && (
                            <span className="calendar-section__nights-pill">
                                {nights} {nights === 1 ? 'noche' : 'noches'}
                            </span>
                        )}
                    </div>

                    <div className="calendar-section__min-stay-note">
                        <Info size={13} />
                        <span>Mínimo {activeMinNights} noches</span>
                    </div>
                </div>

                <div className="calendar-embed-wrap">
                    <BookingCalendar
                        startDate={data.startDate}
                        startSlot={data.startSlot}
                        endDate={data.endDate}
                        endSlot={data.endSlot}
                        onChange={handleCalendarChange}
                        blockedSlots={blockedSlots}
                        blockedRanges={blockedRanges}
                        minNights={activeMinNights}
                        showSlots={false}
                        monthsCount={2}
                        variant="default"
                    />
                </div>

                {isBelowMin && (
                    <div className="alert-box alert-box--warning">
                        <AlertCircle size={15} />
                        <span>
                            Estancia mínima de <strong>{activeMinNights} noches</strong> en estas fechas.
                        </span>
                    </div>
                )}
            </div>

            {/* 2. Compact Slots Selector Below Calendar */}
            <div className="slots-grid">
                {/* Pickup Slot Card */}
                <div className="slot-box">
                    <div className="slot-box__header">
                        <Clock size={15} className="text-forest" />
                        <h4 className="slot-box__title">Recogida</h4>
                    </div>

                    <div className="slot-options">
                        <button
                            type="button"
                            className={`slot-option-btn ${data.startSlot === 'morning' ? 'slot-option-btn--active' : ''}`}
                            onClick={() => handleStartSlotSelect('morning')}
                            disabled={!canPickupMorning}
                        >
                            <div className="slot-option-btn__top">
                                <span className="slot-option-btn__label-group">
                                    <Sun size={14} className="text-forest" />
                                    <span className="slot-option-btn__name">Mañana</span>
                                </span>
                                <span className="slot-option-btn__price-pill">
                                    {canPickupMorning ? '+0.5 día' : 'Ocupado'}
                                </span>
                            </div>
                            <span className="slot-option-btn__time">09:00 – 12:00 h</span>
                        </button>

                        <button
                            type="button"
                            className={`slot-option-btn ${data.startSlot === 'afternoon' ? 'slot-option-btn--active' : ''}`}
                            onClick={() => handleStartSlotSelect('afternoon')}
                            disabled={!canPickupAfternoon}
                        >
                            <div className="slot-option-btn__top">
                                <span className="slot-option-btn__label-group">
                                    <Sunset size={14} className="text-forest" />
                                    <span className="slot-option-btn__name">Tarde</span>
                                </span>
                                <span className="slot-option-btn__price-pill">
                                    {canPickupAfternoon ? 'Incluido' : 'Ocupado'}
                                </span>
                            </div>
                            <span className="slot-option-btn__time">15:00 – 19:00 h</span>
                        </button>
                    </div>
                </div>

                {/* Return Slot Card */}
                <div className="slot-box">
                    <div className="slot-box__header">
                        <Clock size={15} className="text-forest" />
                        <h4 className="slot-box__title">Devolución</h4>
                    </div>

                    <div className="slot-options">
                        <button
                            type="button"
                            className={`slot-option-btn ${data.endSlot === 'morning' ? 'slot-option-btn--active' : ''}`}
                            onClick={() => handleEndSlotSelect('morning')}
                            disabled={!canReturnMorning}
                        >
                            <div className="slot-option-btn__top">
                                <span className="slot-option-btn__label-group">
                                    <Sun size={14} className="text-forest" />
                                    <span className="slot-option-btn__name">Mañana</span>
                                </span>
                                <span className="slot-option-btn__price-pill">
                                    {canReturnMorning ? 'Incluido' : 'Ocupado'}
                                </span>
                            </div>
                            <span className="slot-option-btn__time">09:00 – 12:00 h</span>
                        </button>

                        <button
                            type="button"
                            className={`slot-option-btn ${data.endSlot === 'afternoon' ? 'slot-option-btn--active' : ''}`}
                            onClick={() => handleEndSlotSelect('afternoon')}
                            disabled={!canReturnAfternoon}
                        >
                            <div className="slot-option-btn__top">
                                <span className="slot-option-btn__label-group">
                                    <Sunset size={14} className="text-forest" />
                                    <span className="slot-option-btn__name">Tarde</span>
                                </span>
                                <span className="slot-option-btn__price-pill">
                                    {canReturnAfternoon ? '+0.5 día' : 'Ocupado'}
                                </span>
                            </div>
                            <span className="slot-option-btn__time">15:00 – 19:00 h</span>
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .step-dates {
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

                .calendar-section {
                    background: var(--wz-surface);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-xl);
                    padding: var(--space-4, 16px);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3, 12px);
                }

                .calendar-section__header {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--gray-100);
                }

                .calendar-section__dates-badge {
                    display: inline-flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--black-matte);
                }

                .calendar-section__arrow {
                    color: var(--forest-green);
                    font-weight: 700;
                }

                .calendar-section__nights-pill {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--wz-pill-text);
                    background: var(--wz-pill-bg);
                    border: 1px solid var(--wz-pill-border);
                    padding: 2px 9px;
                    border-radius: 999px;
                }

                .calendar-section__min-stay-note {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 11px;
                    color: var(--gray-600);
                    background: var(--wz-chip-bg);
                    border: 1px solid var(--wz-chip-border);
                    padding: 3px 9px;
                    border-radius: 999px;
                }

                .calendar-embed-wrap {
                    width: 100%;
                }

                .alert-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 12px;
                    border-radius: var(--radius-md);
                    font-size: 12px;
                }

                .alert-box--warning {
                    background: rgba(245, 158, 11, 0.1);
                    border: 1px solid rgba(245, 158, 11, 0.35);
                    color: #fcd34d;
                }

                :global(html[data-theme="light"]) .alert-box--warning {
                    background: #FEF7EE;
                    border: 1px solid #E8C99B;
                    color: #78350F;
                }

                /* Slots Grid */
                .slots-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-3, 12px);
                }

                .slot-box {
                    background: var(--wz-surface);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg, 14px);
                    padding: 12px 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .slot-box__header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .slot-box__title {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                }

                .slot-options {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }

                .slot-option-btn {
                    border: 1.5px solid var(--gray-200);
                    background: var(--wz-chip-bg);
                    border-radius: var(--radius-md, 10px);
                    padding: 10px 12px;
                    text-align: left;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    transition: all 0.2s ease;
                    min-height: 44px;
                }

                .slot-option-btn:hover:not(:disabled) {
                    border-color: var(--forest-green);
                }

                .slot-option-btn--active {
                    border-color: var(--forest-green);
                    background: var(--wz-pill-bg);
                    box-shadow: 0 0 0 1px var(--wz-pill-border);
                }

                .slot-option-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                .slot-option-btn__top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 6px;
                }

                .slot-option-btn__label-group {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }

                .slot-option-btn__name {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--black-matte);
                }

                .slot-option-btn__price-pill {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: var(--radius-full);
                    background: var(--wz-pill-bg);
                    color: var(--wz-pill-text);
                    border: 1px solid var(--wz-pill-border);
                    white-space: nowrap;
                }

                .slot-option-btn__time {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--gray-500);
                }

                @media (max-width: 860px) {
                    .slots-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 640px) {
                    .calendar-section {
                        padding: var(--space-3);
                    }
                    .slot-options {
                        grid-template-columns: 1fr 1fr;
                    }
                }
            `}</style>
        </div>
    )
}
