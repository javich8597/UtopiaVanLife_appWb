'use client'

import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, Users, Plus, Minus, AlertCircle, Sparkles, CheckCircle2, Info } from 'lucide-react'
import BookingCalendar, { BlockedRange } from '@/components/booking/BookingCalendar'
import { BlockedSlot } from '@/lib/booking/availability'
import { DaySlot, Step1Data, WizardCamper } from './types'
import { getMinNightsForDateV2, SeasonV2, SeasonPeriod } from '@/lib/pricing/engine'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Step1DatesProps {
    camper: WizardCamper
    data: Step1Data
    onChange: (data: Step1Data) => void
    seasonsV2: SeasonV2[]
    seasonPeriods: SeasonPeriod[]
}

export default function Step1Dates({
    camper,
    data,
    onChange,
    seasonsV2,
    seasonPeriods,
}: Step1DatesProps) {
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
    const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([])
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(true)

    const maxPax = camper.specs?.seats || (camper.slug === 'space' ? 2 : 3)

    // Cargar disponibilidad en tiempo real
    useEffect(() => {
        let isMounted = true
        async function fetchAvailability() {
            try {
                const res = await fetch(`/api/campers/${camper.slug}/availability`)
                if (res.ok) {
                    const json = await res.json()
                    if (isMounted) {
                        if (json.blockedSlots) setBlockedSlots(json.blockedSlots)
                        if (json.blockedRanges) setBlockedRanges(json.blockedRanges)
                    }
                }
            } catch (err) {
                console.error('Error fetching camper availability:', err)
            } finally {
                if (isMounted) setIsLoadingAvailability(false)
            }
        }
        fetchAvailability()
        return () => {
            isMounted = false
        }
    }, [camper.slug])

    // Calcular estancia mínima según la temporada de la fecha de inicio
    const activeMinNights = data.startDate && seasonsV2.length > 0 && seasonPeriods.length > 0
        ? getMinNightsForDateV2(new Date(data.startDate), seasonsV2, seasonPeriods)
        : 3

    // Manejar cambio de fechas desde BookingCalendar
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

    const handleStartSlotSelect = (slot: DaySlot) => {
        onChange({ ...data, startSlot: slot })
    }

    const handleEndSlotSelect = (slot: DaySlot) => {
        onChange({ ...data, endSlot: slot })
    }

    const handlePaxChange = (delta: number) => {
        const next = Math.max(1, Math.min(maxPax, data.pax + delta))
        onChange({ ...data, pax: next })
    }

    // Calcular noches entre fechas seleccionadas
    const nights = data.startDate && data.endDate
        ? Math.round((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0

    const isBelowMin = Boolean(data.startDate && data.endDate && nights > 0 && nights < activeMinNights)

    return (
        <div className="step-dates">
            {/* Step Introduction */}
            <div className="step-header">
                <span className="step-header__tag">PASO 1 DE 5</span>
                <h2 className="step-header__title">Elige tus fechas y horarios en Mallorca</h2>
                <p className="step-header__desc">
                    Selecciona el rango de viaje y ajusta tus turnos de recogida y devolución. Los horarios te permiten optimizar el alquiler según la llegada de tu vuelo.
                </p>
            </div>

            {/* Passenger Selector Bar */}
            <div className="pax-card">
                <div className="pax-card__info">
                    <div className="pax-card__icon-box">
                        <Users size={18} className="text-forest" />
                    </div>
                    <div>
                        <h4 className="pax-card__title">Número de viajeros</h4>
                        <p className="pax-card__desc">
                            Capacidad homologada de {camper.name}: hasta {maxPax} plazas con cinturones y descanso
                        </p>
                    </div>
                </div>

                <div className="pax-counter">
                    <button
                        type="button"
                        className="pax-btn"
                        onClick={() => handlePaxChange(-1)}
                        disabled={data.pax <= 1}
                        aria-label="Disminuir viajeros"
                    >
                        <Minus size={14} />
                    </button>
                    <span className="pax-value">
                        {data.pax} {data.pax === 1 ? 'viajero' : 'viajeros'}
                    </span>
                    <button
                        type="button"
                        className="pax-btn"
                        onClick={() => handlePaxChange(1)}
                        disabled={data.pax >= maxPax}
                        aria-label="Aumentar viajeros"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {/* Interactive Calendar Section */}
            <div className="calendar-section">
                <div className="calendar-section__header">
                    <div className="calendar-section__dates-badge">
                        <CalendarIcon size={16} className="text-forest" />
                        <span>
                            {data.startDate
                                ? format(parseISO(data.startDate), "d 'de' MMMM", { locale: es })
                                : 'Selecciona salida'}
                        </span>
                        <span className="calendar-section__arrow">→</span>
                        <span>
                            {data.endDate
                                ? format(parseISO(data.endDate), "d 'de' MMMM", { locale: es })
                                : 'Selecciona regreso'}
                        </span>
                        {nights > 0 && (
                            <span className="calendar-section__nights-pill">
                                {nights} {nights === 1 ? 'noche' : 'noches'}
                            </span>
                        )}
                    </div>

                    <div className="calendar-section__min-stay-note">
                        <Info size={13} />
                        <span>Estancia mínima: <strong>{activeMinNights} noches</strong></span>
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
                        variant="default"
                    />
                </div>

                {isBelowMin && (
                    <div className="alert-box alert-box--warning">
                        <AlertCircle size={16} />
                        <span>
                            Has seleccionado {nights} {nights === 1 ? 'noche' : 'noches'}. Para este periodo la estancia mínima requerida es de <strong>{activeMinNights} noches</strong>. Por favor, amplía el rango en el calendario.
                        </span>
                    </div>
                )}
            </div>

            {/* Slots Selector (Pickup & Return) */}
            <div className="slots-grid">
                {/* Pickup Slot Card */}
                <div className="slot-box">
                    <div className="slot-box__header">
                        <Clock size={16} className="text-forest" />
                        <div>
                            <h4 className="slot-box__title">Franja de Recogida</h4>
                            <p className="slot-box__subtitle">Aeropuerto de Palma / Base Utopia</p>
                        </div>
                    </div>

                    <div className="slot-options">
                        <button
                            type="button"
                            className={`slot-option-btn ${data.startSlot === 'morning' ? 'slot-option-btn--active' : ''}`}
                            onClick={() => handleStartSlotSelect('morning')}
                        >
                            <div className="slot-option-btn__top">
                                <span className="slot-option-btn__time">09:00 – 12:00</span>
                                <span className="slot-option-btn__tag slot-option-btn__tag--extra">+0.5 día</span>
                            </div>
                            <span className="slot-option-btn__name">Mañana temprano</span>
                            <span className="slot-option-btn__detail">
                                Zarpa a primera hora y aprovecha el día completo explorando la costa
                            </span>
                        </button>

                        <button
                            type="button"
                            className={`slot-option-btn ${data.startSlot === 'afternoon' ? 'slot-option-btn--active' : ''}`}
                            onClick={() => handleStartSlotSelect('afternoon')}
                        >
                            <div className="slot-option-btn__top">
                                <span className="slot-option-btn__time">15:00 – 19:00</span>
                                <span className="slot-option-btn__tag">Estándar</span>
                            </div>
                            <span className="slot-option-btn__name">Tarde</span>
                            <span className="slot-option-btn__detail">
                                Recogida a partir de las 15:00h, ideal si aterrizas en vuelo de mediodía o tarde
                            </span>
                        </button>
                    </div>
                </div>

                {/* Return Slot Card */}
                <div className="slot-box">
                    <div className="slot-box__header">
                        <Clock size={16} className="text-forest" />
                        <div>
                            <h4 className="slot-box__title">Franja de Devolución</h4>
                            <p className="slot-box__subtitle">Entrega y revisión de la camper</p>
                        </div>
                    </div>

                    <div className="slot-options">
                        <button
                            type="button"
                            className={`slot-option-btn ${data.endSlot === 'morning' ? 'slot-option-btn--active' : ''}`}
                            onClick={() => handleEndSlotSelect('morning')}
                        >
                            <div className="slot-option-btn__top">
                                <span className="slot-option-btn__time">09:00 – 12:00</span>
                                <span className="slot-option-btn__tag">Estándar</span>
                            </div>
                            <span className="slot-option-btn__name">Mañana</span>
                            <span className="slot-option-btn__detail">
                                Devolución antes de las 12:00h para vuelos matinales o de mediodía
                            </span>
                        </button>

                        <button
                            type="button"
                            className={`slot-option-btn ${data.endSlot === 'afternoon' ? 'slot-option-btn--active' : ''}`}
                            onClick={() => handleEndSlotSelect('afternoon')}
                        >
                            <div className="slot-option-btn__top">
                                <span className="slot-option-btn__time">15:00 – 19:00</span>
                                <span className="slot-option-btn__tag slot-option-btn__tag--extra">+0.5 día</span>
                            </div>
                            <span className="slot-option-btn__name">Tarde</span>
                            <span className="slot-option-btn__detail">
                                Alarga tu aventura hasta las 19:00h para ver un último atardecer en Mallorca
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .step-dates {
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

                /* Pax Selector */
                .pax-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #ffffff;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    padding: var(--space-4) var(--space-5);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
                }

                .pax-card__info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                }

                .pax-card__icon-box {
                    width: 38px;
                    height: 38px;
                    border-radius: var(--radius-md);
                    background: rgba(45, 58, 45, 0.06);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .pax-card__title {
                    font-size: var(--text-sm);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin-bottom: 2px;
                }

                .pax-card__desc {
                    font-size: var(--text-xs);
                    color: var(--gray-600);
                }

                .pax-counter {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    background: #faf8f5;
                    border: 1px solid var(--gray-200);
                    padding: 4px;
                    border-radius: var(--radius-full);
                }

                .pax-btn {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    border: none;
                    background: #ffffff;
                    color: var(--black-matte);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                    transition: all 0.2s ease;
                }

                .pax-btn:hover:not(:disabled) {
                    background: var(--forest-green);
                    color: #ffffff;
                }

                .pax-btn:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                }

                .pax-value {
                    font-size: var(--text-xs);
                    font-weight: 700;
                    color: var(--black-matte);
                    min-width: 75px;
                    text-align: center;
                }

                /* Calendar section */
                .calendar-section {
                    background: #ffffff;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-xl);
                    padding: var(--space-5);
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
                }

                .calendar-section__header {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-3);
                    margin-bottom: var(--space-4);
                    padding-bottom: var(--space-3);
                    border-bottom: 1px solid var(--gray-100);
                }

                .calendar-section__dates-badge {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: var(--text-sm);
                    font-weight: 600;
                    color: var(--black-matte);
                }

                .calendar-section__arrow {
                    color: var(--gray-400);
                    font-weight: 400;
                }

                .calendar-section__nights-pill {
                    font-size: 11px;
                    font-weight: 700;
                    background: var(--forest-green);
                    color: #ffffff;
                    padding: 2px 8px;
                    border-radius: var(--radius-full);
                }

                .calendar-section__min-stay-note {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 12px;
                    color: var(--gray-600);
                }

                .calendar-embed-wrap {
                    margin-bottom: var(--space-3);
                }

                .alert-box {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: var(--space-3) var(--space-4);
                    border-radius: var(--radius-md);
                    font-size: var(--text-xs);
                    line-height: 1.5;
                    margin-top: var(--space-3);
                }

                .alert-box--warning {
                    background: #fff8eb;
                    border: 1px solid #fde0b2;
                    color: #9a5b00;
                }

                /* Slots Grid */
                .slots-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4);
                }

                .slot-box {
                    background: #ffffff;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    padding: var(--space-4);
                }

                .slot-box__header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: var(--space-3);
                }

                .slot-box__title {
                    font-size: var(--text-sm);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                }

                .slot-box__subtitle {
                    font-size: 11px;
                    color: var(--gray-600);
                    margin: 0;
                }

                .slot-options {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }

                .slot-option-btn {
                    text-align: left;
                    background: #faf8f5;
                    border: 1.5px solid var(--gray-200);
                    border-radius: var(--radius-md);
                    padding: var(--space-3);
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .slot-option-btn:hover {
                    border-color: var(--forest-green-light);
                    background: #ffffff;
                }

                .slot-option-btn--active {
                    background: #ffffff;
                    border-color: var(--forest-green);
                    box-shadow: 0 0 0 2px rgba(45, 58, 45, 0.12);
                }

                .slot-option-btn__top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .slot-option-btn__time {
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--black-matte);
                }

                .slot-option-btn__tag {
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--gray-600);
                    background: rgba(0, 0, 0, 0.05);
                    padding: 1px 6px;
                    border-radius: var(--radius-sm);
                }

                .slot-option-btn__tag--extra {
                    background: rgba(45, 58, 45, 0.1);
                    color: var(--forest-green);
                    font-weight: 700;
                }

                .slot-option-btn__name {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--forest-green);
                }

                .slot-option-btn__detail {
                    font-size: 11px;
                    color: var(--gray-600);
                    line-height: 1.4;
                }

                @media (max-width: 768px) {
                    .slots-grid {
                        grid-template-columns: 1fr;
                    }
                    .pax-card {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--space-3);
                    }
                    .pax-counter {
                        width: 100%;
                        justify-content: space-between;
                    }
                }
            `}</style>
        </div>
    )
}
