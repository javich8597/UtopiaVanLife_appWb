'use client'

import React, { useState, useMemo } from 'react'
import {
    format,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isBefore,
    startOfDay,
    parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { BlockedSlot } from '@/lib/booking/availability'
import { DaySlot } from '@/lib/pricing/engine'
import {
    getSlotAvailability,
    isSlotSelectableAsPickup,
    isSlotSelectableAsReturn,
    validateBookingRange,
    BlockedRange,
} from '@/lib/booking/calendarLogic'

export type { BlockedRange }

interface BookingCalendarProps {
    startDate: string // YYYY-MM-DD
    startSlot?: DaySlot
    endDate: string   // YYYY-MM-DD
    endSlot?: DaySlot
    onChange: (start: string, startSlot: DaySlot, end: string, endSlot: DaySlot) => void
    blockedSlots?: BlockedSlot[]
    blockedRanges?: BlockedRange[]
    minNights?: number
    minDate?: Date
    onClose?: () => void
    showSlots?: boolean
    variant?: 'default' | 'hero'
    monthsCount?: number
    showDoneButton?: boolean
}

export default function BookingCalendar({
    startDate,
    startSlot = 'morning',
    endDate,
    endSlot = 'afternoon',
    onChange,
    blockedSlots = [],
    blockedRanges = [],
    minNights = 3,
    minDate = startOfDay(new Date()),
    onClose,
    showSlots = true,
    variant = 'default',
    monthsCount,
    showDoneButton,
}: BookingCalendarProps) {
    const activeMonthsCount = monthsCount ?? (variant === 'hero' ? 2 : 1)
    const initialMonth = startDate ? parseISO(startDate) : new Date()
    const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth)
    const [hoverDate, setHoverDate] = useState<string | null>(null)
    const [validationError, setValidationError] = useState<string | null>(null)

    const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1))
    const prevMonth = () => {
        const prev = subMonths(currentMonth, 1)
        if (!isBefore(endOfMonth(prev), minDate)) {
            setCurrentMonth(prev)
        }
    }

    const canGoPrev = !isBefore(endOfMonth(subMonths(currentMonth, 1)), minDate)

    const getDaysForMonth = (targetMonth: Date) => {
        const monthStart = startOfMonth(targetMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDateGrid = startOfWeek(monthStart, { weekStartsOn: 1 })
        const endDateGrid = endOfWeek(monthEnd, { weekStartsOn: 1 })

        return eachDayOfInterval({ start: startDateGrid, end: endDateGrid })
    }

    const monthsToRender = useMemo(() => {
        if (activeMonthsCount === 2) {
            return [currentMonth, addMonths(currentMonth, 1)]
        }
        return [currentMonth]
    }, [currentMonth, activeMonthsCount])

    // Convert legacy blockedRanges into slots if blockedSlots is empty
    const effectiveSlots: BlockedSlot[] = useMemo(() => {
        if (blockedSlots.length > 0) return blockedSlots
        const generated: BlockedSlot[] = []
        for (const r of blockedRanges) {
            const start = new Date(r.start)
            const end = new Date(r.end)
            const cur = new Date(start)
            while (cur <= end) {
                generated.push({ date: cur.toISOString().split('T')[0], slot: 'full' })
                cur.setDate(cur.getDate() + 1)
            }
        }
        return generated
    }, [blockedSlots, blockedRanges])

    const handleDayClick = (dateStr: string) => {
        setValidationError(null)

        // Si no hay fecha de inicio o ya teníamos un rango completo cerrado: iniciar nueva selección
        if (!startDate || (startDate && endDate)) {
            const status = getSlotAvailability(dateStr, effectiveSlots)
            // Si la mañana está ocupada, obligamos a recoger por la tarde
            const initialSlot: DaySlot = status === 'morning_blocked' ? 'afternoon' : startSlot
            onChange(dateStr, initialSlot, '', endSlot)
            return
        }

        // Si tenemos fecha de inicio y estamos seleccionando fecha de fin
        if (startDate && !endDate) {
            if (dateStr <= startDate) {
                // Clic en el mismo día o anterior: reiniciar inicio
                const status = getSlotAvailability(dateStr, effectiveSlots)
                const initialSlot: DaySlot = status === 'morning_blocked' ? 'afternoon' : startSlot
                onChange(dateStr, initialSlot, '', endSlot)
                return
            }

            const status = getSlotAvailability(dateStr, effectiveSlots)
            // Si la tarde está ocupada en el día de entrega, obligamos a devolver por la mañana
            const chosenEndSlot: DaySlot = status === 'afternoon_blocked' ? 'morning' : endSlot

            // Validar estancia mínima y ausencia de días bloqueados intermedios
            const validation = validateBookingRange(startDate, startSlot, dateStr, chosenEndSlot, effectiveSlots, minNights)
            if (!validation.isValid) {
                if (validation.reason === 'min_nights') {
                    setValidationError(`Estancia mínima: ${minNights} noches para estas fechas.`)
                    return
                }
                if (validation.reason === 'blocked_dates') {
                    setValidationError('El rango seleccionado atraviesa fechas no disponibles.')
                    return
                }
            }

            onChange(startDate, startSlot, dateStr, chosenEndSlot)
        }
    }

    const handlePickupSlotChange = (slot: DaySlot) => {
        if (!startDate) return
        if (!isSlotSelectableAsPickup(startDate, slot, effectiveSlots)) return
        onChange(startDate, slot, endDate, endSlot)
    }

    const handleReturnSlotChange = (slot: DaySlot) => {
        if (!endDate) return
        if (!isSlotSelectableAsReturn(endDate, slot, effectiveSlots)) return
        onChange(startDate, startSlot, endDate, slot)
    }

    const clearDates = () => {
        setValidationError(null)
        onChange('', 'morning', '', 'afternoon')
    }

    const weekHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

    // Controles de slot para pickup y return (habilitados por defecto si aún no hay fecha seleccionada)
    const canPickupMorning = startDate ? isSlotSelectableAsPickup(startDate, 'morning', effectiveSlots) : true
    const canPickupAfternoon = startDate ? isSlotSelectableAsPickup(startDate, 'afternoon', effectiveSlots) : true
    const canReturnMorning = endDate ? isSlotSelectableAsReturn(endDate, 'morning', effectiveSlots) : true
    const canReturnAfternoon = endDate ? isSlotSelectableAsReturn(endDate, 'afternoon', effectiveSlots) : true

    const isPickupMorningActive = startSlot === 'morning' && canPickupMorning
    const isPickupAfternoonActive = startSlot === 'afternoon' && canPickupAfternoon
    const isReturnMorningActive = endSlot === 'morning' && canReturnMorning
    const isReturnAfternoonActive = endSlot === 'afternoon' && canReturnAfternoon

    const monthHasPartialBlocks = useMemo(() => {
        return monthsToRender.some(m => {
            const mDays = getDaysForMonth(m)
            return mDays.some(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const status = getSlotAvailability(dateStr, effectiveSlots)
                return status === 'morning_blocked' || status === 'afternoon_blocked'
            })
        })
    }, [monthsToRender, effectiveSlots])

    const isHero = variant === 'hero' || !showSlots
    const showDone = showDoneButton !== undefined ? showDoneButton : (!isHero && !!onClose)

    return (
        <div className={`booking-cal ${isHero ? 'booking-cal--hero' : ''} ${activeMonthsCount === 2 ? 'booking-cal--two-months' : ''}`} role="dialog" aria-label="Selector de fechas de reserva">
            {/* Indicador de paso / guía al viajero o alerta de error */}
            {validationError ? (
                <div className="booking-cal__alert" role="alert">
                    <Info size={14} style={{ flexShrink: 0 }} />
                    <span>{validationError}</span>
                </div>
            ) : (
                <div className={`booking-cal__step-banner ${startDate && endDate ? 'booking-cal__step-banner--done' : ''}`}>
                    <span>
                        {!startDate
                            ? '① Elige fecha de salida'
                            : !endDate
                            ? `② Elige fecha de regreso (mín. ${minNights} noches)`
                            : isHero
                            ? '✓ Fechas listas'
                            : '③ Confirma tus horarios y pulsa "Listo"'}
                    </span>
                </div>
            )}

            {/* Contenedor de Meses */}
            <div className="booking-cal__months-wrap">
                {monthsToRender.map((targetMonth, monthIdx) => {
                    const monthDays = getDaysForMonth(targetMonth)
                    const isFirstMonth = monthIdx === 0
                    const isLastMonth = monthIdx === monthsToRender.length - 1

                    return (
                        <React.Fragment key={monthIdx}>
                            <div className="booking-cal__month-col">
                                {/* Header del mes */}
                                <div className="booking-cal__header">
                                    <button
                                        type="button"
                                        className={`booking-cal__nav-btn ${!isFirstMonth ? 'hide-desktop' : ''}`}
                                        onClick={prevMonth}
                                        disabled={!canGoPrev}
                                        aria-label="Mes anterior"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    <div className="booking-cal__month-title">
                                        {format(targetMonth, 'MMMM yyyy', { locale: es })}
                                    </div>

                                    <button
                                        type="button"
                                        className={`booking-cal__nav-btn ${!isLastMonth ? 'hide-desktop' : ''}`}
                                        onClick={nextMonth}
                                        aria-label="Mes siguiente"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                {/* Días de la semana */}
                                <div className="booking-cal__weekdays">
                                    {weekHeaders.map((w, i) => (
                                        <span key={i} className="booking-cal__weekday">
                                            {w}
                                        </span>
                                    ))}
                                </div>

                                {/* Grid de días */}
                                <div className="booking-cal__grid">
                                    {monthDays.map(day => {
                                        const dateStr = format(day, 'yyyy-MM-dd')
                                        const isCurrentMonth = isSameMonth(day, targetMonth)

                                        if (!isCurrentMonth) {
                                            return (
                                                <div
                                                    key={dateStr}
                                                    className="booking-cal__day booking-cal__day--empty"
                                                    aria-hidden="true"
                                                />
                                            )
                                        }

                                        const isPast = isBefore(day, minDate)
                                        const slotStatus = getSlotAvailability(dateStr, effectiveSlots)
                                        const isFullBlocked = isPast || slotStatus === 'full_blocked'

                                        const isStart = startDate === dateStr
                                        const isEnd = endDate === dateStr

                                        let inRange = false
                                        if (startDate && endDate) {
                                            inRange = dateStr > startDate && dateStr < endDate
                                        } else if (startDate && hoverDate && !endDate) {
                                            inRange = dateStr > startDate && dateStr <= hoverDate
                                        }

                                        let tooltip = ''
                                        if (slotStatus === 'morning_blocked') tooltip = 'Mañana ocupada — Recogida disponible a partir de las 15:00h'
                                        if (slotStatus === 'afternoon_blocked') tooltip = 'Tarde ocupada — Devolución disponible antes de las 12:00h'
                                        if (isFullBlocked) tooltip = 'Fecha no disponible'

                                        return (
                                            <button
                                                key={dateStr}
                                                type="button"
                                                disabled={isFullBlocked}
                                                title={tooltip}
                                                onClick={() => handleDayClick(dateStr)}
                                                onMouseEnter={() => !endDate && startDate && setHoverDate(dateStr)}
                                                onMouseLeave={() => setHoverDate(null)}
                                                className={`booking-cal__day ${
                                                    isFullBlocked ? 'booking-cal__day--disabled' : ''
                                                } ${
                                                    slotStatus === 'morning_blocked' ? 'booking-cal__day--morning-blocked' : ''
                                                } ${
                                                    slotStatus === 'afternoon_blocked' ? 'booking-cal__day--afternoon-blocked' : ''
                                                } ${
                                                    isStart ? 'booking-cal__day--start' : ''
                                                } ${isEnd ? 'booking-cal__day--end' : ''} ${
                                                    inRange ? 'booking-cal__day--in-range' : ''
                                                }`}
                                            >
                                                <span className="booking-cal__day-number">{format(day, 'd')}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {monthIdx === 0 && monthsToRender.length > 1 && (
                                <div className="booking-cal__months-divider" />
                            )}
                        </React.Fragment>
                    )
                })}
            </div>

            {/* Leyenda visual de medios días (solo si NO es hero y el mes actual tiene bloqueos parciales) */}
            {!isHero && monthHasPartialBlocks && (
                <div className="booking-cal__legend">
                    <div className="booking-cal__legend-item" title="La mañana ya está reservada. Puedes recoger la camper a partir de las 15:00h">
                        <span className="booking-cal__legend-icon booking-cal__legend-icon--am"></span>
                        <span>Recogidas a partir de 15:00h</span>
                    </div>
                    <div className="booking-cal__legend-item" title="La tarde ya está reservada. Debes entregar la camper antes de las 12:00h">
                        <span className="booking-cal__legend-icon booking-cal__legend-icon--pm"></span>
                        <span>Devoluciones hasta 12:00h</span>
                    </div>
                </div>
            )}

            {/* Selectores de Franja Horaria (solo si NO es hero) */}
            {!isHero && (
                <div className="booking-cal__slots-container">
                    {/* HORA DE RECOGIDA */}
                    <div className="booking-cal__slot-group">
                        <span className="booking-cal__slot-title">HORA DE RECOGIDA</span>
                        <div className="booking-cal__slot-buttons">
                            <button
                                type="button"
                                disabled={!canPickupMorning}
                                onClick={() => handlePickupSlotChange('morning')}
                                className={`booking-cal__slot-pill ${isPickupMorningActive ? 'booking-cal__slot-pill--active' : ''}`}
                                title={!canPickupMorning ? 'Mañana no disponible para recogida' : ''}
                            >
                                <span className="booking-cal__slot-text">Mañana (09–12h)</span>
                                <span className="booking-cal__slot-badge">Estándar (+0.5 d)</span>
                            </button>
                            <button
                                type="button"
                                disabled={!canPickupAfternoon}
                                onClick={() => handlePickupSlotChange('afternoon')}
                                className={`booking-cal__slot-pill ${isPickupAfternoonActive ? 'booking-cal__slot-pill--active' : ''}`}
                                title={!canPickupAfternoon ? 'Tarde no disponible para recogida' : ''}
                            >
                                <span className="booking-cal__slot-text">Tarde (15–19h)</span>
                                <span className="booking-cal__slot-badge">-0.5 día</span>
                            </button>
                        </div>
                    </div>

                    {/* HORA DE DEVOLUCIÓN */}
                    <div className="booking-cal__slot-group">
                        <span className="booking-cal__slot-title">HORA DE DEVOLUCIÓN</span>
                        <div className="booking-cal__slot-buttons">
                            <button
                                type="button"
                                disabled={!canReturnMorning}
                                onClick={() => handleReturnSlotChange('morning')}
                                className={`booking-cal__slot-pill ${isReturnMorningActive ? 'booking-cal__slot-pill--active' : ''}`}
                                title={!canReturnMorning ? 'Mañana no disponible para devolución' : ''}
                            >
                                <span className="booking-cal__slot-text">Mañana (09–12h)</span>
                                <span className="booking-cal__slot-badge">-0.5 día</span>
                            </button>
                            <button
                                type="button"
                                disabled={!canReturnAfternoon}
                                onClick={() => handleReturnSlotChange('afternoon')}
                                className={`booking-cal__slot-pill ${isReturnAfternoonActive ? 'booking-cal__slot-pill--active' : ''}`}
                                title={!canReturnAfternoon ? 'Tarde no disponible para devolución' : ''}
                            >
                                <span className="booking-cal__slot-text">Tarde (15–19h)</span>
                                <span className="booking-cal__slot-badge">Estándar (+0.5 d)</span>
                            </button>
                        </div>
                    </div>

                    {/* Explicación contextual de turnos */}
                    <div className="booking-cal__slots-info">
                        <Info size={13} style={{ flexShrink: 0, marginTop: 2, color: '#CCA053' }} />
                        <span>
                            <strong>Horarios:</strong> Recogida mañana (09–12h) y entrega tarde (15–19h) para días completos. Recogida por la tarde o entrega por la mañana descuenta <strong>-0.5 día</strong>.
                        </span>
                    </div>
                </div>
            )}

            {/* Footer con acciones accesibles */}
            <div className="booking-cal__footer">
                <button
                    type="button"
                    className="booking-cal__clear-btn"
                    onClick={clearDates}
                    disabled={!startDate && !endDate}
                >
                    Borrar fechas
                </button>
                {showDone && onClose && (
                    <button
                        type="button"
                        className="booking-cal__done-btn"
                        onClick={onClose}
                    >
                        ✓ Listo
                    </button>
                )}
            </div>

            <style jsx>{`
                .booking-cal {
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 13px 16px 12px;
                    user-select: none;
                    width: 100%;
                    max-width: 320px;
                    margin: 0 auto;
                    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
                    box-sizing: border-box;
                }
                .booking-cal--two-months {
                    max-width: 580px;
                    width: 580px;
                }
                .booking-cal--hero {
                    border-radius: 16px;
                    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.22);
                    box-sizing: border-box;
                }
                .booking-cal--hero:not(.booking-cal--two-months) {
                    width: 320px;
                    max-width: calc(100vw - 32px);
                }
                .booking-cal--hero.booking-cal--two-months {
                    width: 580px;
                    max-width: calc(100vw - 32px);
                }
                .booking-cal--hero .booking-cal__grid {
                    gap: 2px 0;
                }
                .booking-cal__months-wrap {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                }
                .booking-cal__month-col {
                    flex: 1;
                    min-width: 0;
                }
                .booking-cal__months-divider {
                    width: 1px;
                    align-self: stretch;
                    background: rgba(255, 255, 255, 0.06);
                    margin: 4px 0;
                }
                .booking-cal__day--empty {
                    pointer-events: none;
                    opacity: 0;
                    background: transparent !important;
                }
                .booking-cal__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .booking-cal__month-title {
                    font-family: var(--font-sans);
                    font-weight: 700;
                    text-transform: capitalize;
                    font-size: 0.85rem;
                    color: #F8FAFC;
                    letter-spacing: -0.01em;
                }
                .booking-cal__nav-btn {
                    background: #1A1D22;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: var(--radius-full);
                    width: 26px;
                    height: 26px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #F8FAFC;
                    transition: all var(--transition-fast);
                    padding: 0;
                }
                .booking-cal__nav-btn:hover:not(:disabled) {
                    background: #CCA053;
                    border-color: #CCA053;
                    color: #0B0C0E;
                }
                .booking-cal__nav-btn:disabled {
                    opacity: 0.25;
                    cursor: not-allowed;
                }
                .booking-cal__weekdays {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    text-align: center;
                    margin-bottom: 4px;
                }
                .booking-cal__weekday {
                    font-size: 0.68rem;
                    font-weight: 700;
                    color: #A8B3C4;
                    padding-bottom: 2px;
                }
                .booking-cal__grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 2px 0;
                }
                .booking-cal__day {
                    aspect-ratio: 1;
                    background: transparent;
                    border: none;
                    font-size: 0.76rem;
                    font-weight: 600;
                    color: #F8FAFC;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    padding: 0;
                    transition: all var(--transition-fast);
                    border-radius: 6px;
                }
                .booking-cal__day-number {
                    width: 29px;
                    height: 29px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-full);
                    position: relative;
                    z-index: 2;
                }
                .booking-cal__day--disabled {
                    color: #64748B;
                    cursor: not-allowed;
                }
                .booking-cal__day--disabled .booking-cal__day-number {
                    text-decoration: line-through;
                    text-decoration-color: rgba(255, 255, 255, 0.1);
                }
                /* Corte diagonal: Mañana ocupada (AM) */
                .booking-cal__day--morning-blocked {
                    background: linear-gradient(135deg, rgba(200, 160, 110, 0.45) 50%, transparent 50%);
                }
                /* Corte diagonal: Tarde ocupada (PM) */
                .booking-cal__day--afternoon-blocked {
                    background: linear-gradient(135deg, transparent 50%, rgba(200, 160, 110, 0.45) 50%);
                }
                .booking-cal__day:hover:not(.booking-cal__day--disabled):not(.booking-cal__day--start):not(.booking-cal__day--end) .booking-cal__day-number {
                    background: rgba(204, 160, 83, 0.12);
                    color: #CCA053;
                }
                .booking-cal__day--in-range {
                    background: rgba(204, 160, 83, 0.10);
                }
                .booking-cal__day--in-range .booking-cal__day-number {
                    color: #CCA053;
                    font-weight: 700;
                }
                .booking-cal__day--start {
                    background: linear-gradient(to right, transparent 50%, rgba(204, 160, 83, 0.10) 50%);
                }
                .booking-cal__day--start .booking-cal__day-number {
                    background: #CCA053;
                    color: #0B0C0E;
                    font-weight: 700;
                    box-shadow: 0 2px 6px rgba(204, 160, 83, 0.3);
                }
                .booking-cal__day--end {
                    background: linear-gradient(to left, transparent 50%, rgba(204, 160, 83, 0.10) 50%);
                }
                .booking-cal__day--end .booking-cal__day-number {
                    background: #CCA053;
                    color: #0B0C0E;
                    font-weight: 700;
                    box-shadow: 0 2px 6px rgba(204, 160, 83, 0.3);
                }
                .booking-cal__day--start.booking-cal__day--end {
                    background: transparent;
                }

                /* Leyenda */
                .booking-cal__legend {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 6px;
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    font-size: 0.72rem;
                    color: #A8B3C4;
                    font-weight: 500;
                }
                .booking-cal__legend-item {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .booking-cal__legend-icon {
                    width: 11px;
                    height: 11px;
                    border-radius: 3px;
                    display: inline-block;
                }
                .booking-cal__legend-icon--am {
                    background: linear-gradient(135deg, #C8A06E 50%, #1A1D22 50%);
                    border: 1px solid #B08B5B;
                }
                .booking-cal__legend-icon--pm {
                    background: linear-gradient(135deg, #1A1D22 50%, #C8A06E 50%);
                    border: 1px solid #B08B5B;
                }

                /* Selectores de Franjas Horarias */
                .booking-cal__slots-container {
                    margin-top: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    background: #1A1D22;
                    padding: 10px 12px;
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .booking-cal__slot-group {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .booking-cal__slot-title {
                    font-size: 0.68rem;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                    color: #E8CA7C;
                    text-transform: uppercase;
                }
                .booking-cal__slot-buttons {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px;
                }
                .booking-cal__slot-pill {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: center;
                    gap: 3px;
                    padding: 6px 10px;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: #131518;
                    color: #F8FAFC;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    text-align: left;
                    width: 100%;
                }
                .booking-cal__slot-text {
                    font-size: 0.74rem;
                    font-weight: 700;
                    line-height: 1.2;
                    white-space: nowrap;
                }
                .booking-cal__slot-badge {
                    font-size: 0.64rem;
                    font-weight: 600;
                    padding: 1px 5px;
                    border-radius: 4px;
                    background: #1A1D22;
                    color: #A8B3C4;
                    white-space: nowrap;
                }
                .booking-cal__slot-pill:hover:not(:disabled) {
                    border-color: #CCA053;
                    background: #1A1D22;
                    color: #CCA053;
                }
                .booking-cal__slot-pill--active {
                    background: #CCA053 !important;
                    color: #0B0C0E !important;
                    border-color: #CCA053 !important;
                    box-shadow: 0 2px 6px rgba(204, 160, 83, 0.25);
                }
                .booking-cal__slot-pill--active .booking-cal__slot-text {
                    color: #0B0C0E !important;
                }
                .booking-cal__slot-pill--active .booking-cal__slot-badge {
                    background: rgba(255, 255, 255, 0.22) !important;
                    color: #0B0C0E !important;
                }
                .booking-cal__slot-pill:disabled {
                    opacity: 0.5;
                    background: #1A1D22;
                    border: 1px dashed rgba(255, 255, 255, 0.1);
                    color: #64748B;
                    cursor: not-allowed;
                }
                .booking-cal__slot-pill:disabled .booking-cal__slot-badge {
                    opacity: 0.6;
                    background: rgba(255, 255, 255, 0.06);
                    color: #64748B;
                }

                .booking-cal__step-banner {
                    min-height: 30px;
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 8px;
                    padding: 5px 10px;
                    border-radius: 8px;
                    font-size: 0.74rem;
                    font-weight: 700;
                    background: #1A1D22;
                    color: #E8CA7C;
                    text-align: center;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    letter-spacing: -0.01em;
                }
                .booking-cal__step-banner--done {
                    background: rgba(204, 160, 83, 0.14);
                    color: #E8CA7C;
                    border-color: rgba(204, 160, 83, 0.35);
                }

                .booking-cal__slots-info {
                    display: flex;
                    align-items: flex-start;
                    gap: 6px;
                    font-size: 0.69rem;
                    color: #A8B3C4;
                    line-height: 1.4;
                    background: #131518;
                    padding: 8px 10px;
                    border-radius: 8px;
                    border: 1px dashed rgba(255, 255, 255, 0.1);
                    margin-top: 4px;
                }

                .booking-cal__alert {
                    min-height: 30px;
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    margin-bottom: 8px;
                    padding: 5px 10px;
                    background: rgba(204, 160, 83, 0.08);
                    border: 1px solid rgba(204, 160, 83, 0.35);
                    border-left: 3px solid #CCA053;
                    border-radius: 8px;
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: #E8CA7C;
                    line-height: 1.35;
                    text-align: center;
                }

                .booking-cal__footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                .booking-cal__clear-btn {
                    height: 33px;
                    padding: 0 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: var(--radius-full);
                    background: #1A1D22;
                    color: #A8B3C4;
                    font-size: 0.72rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    white-space: nowrap;
                }
                .booking-cal__clear-btn:hover:not(:disabled) {
                    background: #131518;
                    border-color: rgba(255, 255, 255, 0.3);
                    color: #F8FAFC;
                }
                .booking-cal__clear-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    background: transparent;
                    border-color: transparent;
                }
                .booking-cal__done-btn {
                    height: 33px;
                    flex: 1;
                    background: #CCA053;
                    color: #0B0C0E;
                    border: none;
                    border-radius: var(--radius-full);
                    padding: 0 14px;
                    font-size: 0.78rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    box-shadow: 0 2px 6px rgba(204, 160, 83, 0.25);
                    transition: all var(--transition-fast);
                }
                .booking-cal__done-btn:hover {
                    background: #E8CA7C;
                    box-shadow: 0 4px 10px rgba(204, 160, 83, 0.35);
                }

                @media (min-width: 681px) {
                    .hide-desktop {
                        visibility: hidden;
                        pointer-events: none;
                    }
                }
                @media (max-width: 680px) {
                    .booking-cal--two-months {
                        width: 92vw !important;
                        max-width: 320px !important;
                        padding: 12px 12px 10px;
                    }
                    .booking-cal__months-wrap {
                        flex-direction: column;
                        gap: 14px;
                        max-height: 56vh;
                        overflow-y: auto;
                        -webkit-overflow-scrolling: touch;
                    }
                    .booking-cal__months-divider {
                        display: none;
                    }
                    .hide-desktop {
                        visibility: visible;
                        pointer-events: auto;
                    }
                }
            `}</style>
        </div>
    )
}
