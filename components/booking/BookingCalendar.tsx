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
}

export default function BookingCalendar({
    startDate,
    startSlot = 'afternoon',
    endDate,
    endSlot = 'morning',
    onChange,
    blockedSlots = [],
    blockedRanges = [],
    minNights = 3,
    minDate = startOfDay(new Date()),
    onClose,
}: BookingCalendarProps) {
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

    const days = useMemo(() => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDateGrid = startOfWeek(monthStart, { weekStartsOn: 1 })
        const endDateGrid = endOfWeek(monthEnd, { weekStartsOn: 1 })

        return eachDayOfInterval({ start: startDateGrid, end: endDateGrid })
    }, [currentMonth])

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
        onChange('', 'afternoon', '', 'morning')
    }

    const weekHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

    // Controles de slot para pickup y return
    const canPickupMorning = startDate ? isSlotSelectableAsPickup(startDate, 'morning', effectiveSlots) : false
    const canPickupAfternoon = startDate ? isSlotSelectableAsPickup(startDate, 'afternoon', effectiveSlots) : false
    const canReturnMorning = endDate ? isSlotSelectableAsReturn(endDate, 'morning', effectiveSlots) : false
    const canReturnAfternoon = endDate ? isSlotSelectableAsReturn(endDate, 'afternoon', effectiveSlots) : false

    return (
        <div className="booking-cal">
            {/* Header del mes */}
            <div className="booking-cal__header">
                <button
                    type="button"
                    className="booking-cal__nav-btn"
                    onClick={prevMonth}
                    disabled={!canGoPrev}
                    aria-label="Mes anterior"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className="booking-cal__month-title">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </div>
                <button
                    type="button"
                    className="booking-cal__nav-btn"
                    onClick={nextMonth}
                    aria-label="Mes siguiente"
                >
                    <ChevronRight size={18} />
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
                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const isCurrentMonth = isSameMonth(day, currentMonth)
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

                    // Títulos accesibles según el estado de la celda
                    let tooltip = ''
                    if (slotStatus === 'morning_blocked') tooltip = 'Mañana reservada — Recogida a partir de las 15:00h'
                    if (slotStatus === 'afternoon_blocked') tooltip = 'Tarde reservada — Devolución antes de las 12:00h'
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
                                !isCurrentMonth ? 'booking-cal__day--outside' : ''
                            } ${isFullBlocked ? 'booking-cal__day--disabled' : ''} ${
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

            {/* Leyenda visual de medios días */}
            <div className="booking-cal__legend">
                <div className="booking-cal__legend-item">
                    <span className="booking-cal__legend-icon booking-cal__legend-icon--am"></span>
                    <span>Mañana ocupada (Salida 15h)</span>
                </div>
                <div className="booking-cal__legend-item">
                    <span className="booking-cal__legend-icon booking-cal__legend-icon--pm"></span>
                    <span>Tarde ocupada (Entrega 12h)</span>
                </div>
            </div>

            {/* Selectores de Franja Horaria (Holo-Van style) */}
            <div className="booking-cal__slots-container">
                {/* HORA DE RECOGIDA */}
                <div className="booking-cal__slot-group">
                    <span className="booking-cal__slot-title">HORA DE RECOGIDA</span>
                    <div className="booking-cal__slot-buttons">
                        <button
                            type="button"
                            disabled={!canPickupMorning}
                            onClick={() => handlePickupSlotChange('morning')}
                            className={`booking-cal__slot-pill ${startSlot === 'morning' ? 'booking-cal__slot-pill--active' : ''}`}
                        >
                            Mañana 09–12h
                        </button>
                        <button
                            type="button"
                            disabled={!canPickupAfternoon}
                            onClick={() => handlePickupSlotChange('afternoon')}
                            className={`booking-cal__slot-pill ${startSlot === 'afternoon' ? 'booking-cal__slot-pill--active' : ''}`}
                        >
                            Tarde 15–19h
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
                            className={`booking-cal__slot-pill ${endSlot === 'morning' ? 'booking-cal__slot-pill--active' : ''}`}
                        >
                            Mañana 09–12h
                        </button>
                        <button
                            type="button"
                            disabled={!canReturnAfternoon}
                            onClick={() => handleReturnSlotChange('afternoon')}
                            className={`booking-cal__slot-pill ${endSlot === 'afternoon' ? 'booking-cal__slot-pill--active' : ''}`}
                        >
                            Tarde 15–19h
                        </button>
                    </div>
                </div>
            </div>

            {/* Mensaje de validación o estancia mínima */}
            {validationError && (
                <div className="booking-cal__alert">
                    <Info size={13} style={{ flexShrink: 0 }} />
                    <span>{validationError}</span>
                </div>
            )}

            {/* Footer con acciones */}
            <div className="booking-cal__footer">
                <button
                    type="button"
                    className="booking-cal__clear-btn"
                    onClick={clearDates}
                    disabled={!startDate && !endDate}
                >
                    Borrar fechas
                </button>
                {onClose && (
                    <button
                        type="button"
                        className="booking-cal__done-btn"
                        onClick={onClose}
                    >
                        Listo
                    </button>
                )}
            </div>

            <style jsx>{`
                .booking-cal {
                    background: #FAF8F5;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md);
                    padding: 12px 14px 10px;
                    user-select: none;
                    max-width: 320px;
                    margin: 0 auto;
                }
                .booking-cal__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .booking-cal__month-title {
                    font-family: var(--font-sans);
                    font-weight: 600;
                    text-transform: capitalize;
                    font-size: 0.85rem;
                    color: var(--black-matte);
                    letter-spacing: -0.01em;
                }
                .booking-cal__nav-btn {
                    background: transparent;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-full);
                    width: 26px;
                    height: 26px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: var(--black-matte);
                    transition: all var(--transition-fast);
                    padding: 0;
                }
                .booking-cal__nav-btn:hover:not(:disabled) {
                    background: white;
                    border-color: var(--forest-green);
                    color: var(--forest-green);
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
                    font-weight: 600;
                    color: var(--gray-400);
                    padding-bottom: 2px;
                }
                .booking-cal__grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 1px 0;
                }
                .booking-cal__day {
                    aspect-ratio: 1;
                    background: transparent;
                    border: none;
                    font-size: 0.78rem;
                    font-weight: 500;
                    color: var(--black-matte);
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
                    width: 26px;
                    height: 26px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-full);
                    position: relative;
                    z-index: 2;
                }
                .booking-cal__day--outside {
                    opacity: 0.2;
                }
                .booking-cal__day--disabled {
                    color: var(--gray-400);
                    text-decoration: line-through;
                    cursor: not-allowed;
                    opacity: 0.4;
                }
                /* Corte diagonal: Mañana ocupada (AM) */
                .booking-cal__day--morning-blocked {
                    background: linear-gradient(135deg, rgba(194, 168, 120, 0.45) 50%, transparent 50%);
                }
                /* Corte diagonal: Tarde ocupada (PM) */
                .booking-cal__day--afternoon-blocked {
                    background: linear-gradient(135deg, transparent 50%, rgba(194, 168, 120, 0.45) 50%);
                }
                .booking-cal__day:hover:not(.booking-cal__day--disabled):not(.booking-cal__day--start):not(.booking-cal__day--end) .booking-cal__day-number {
                    background: rgba(45, 58, 45, 0.08);
                    color: var(--forest-green);
                }
                .booking-cal__day--in-range {
                    background: rgba(45, 58, 45, 0.08);
                }
                .booking-cal__day--start {
                    background: linear-gradient(to right, transparent 50%, rgba(45, 58, 45, 0.08) 50%);
                }
                .booking-cal__day--start .booking-cal__day-number {
                    background: var(--forest-green);
                    color: #FAF8F5;
                    font-weight: 600;
                }
                .booking-cal__day--end {
                    background: linear-gradient(to left, transparent 50%, rgba(45, 58, 45, 0.08) 50%);
                }
                .booking-cal__day--end .booking-cal__day-number {
                    background: var(--forest-green);
                    color: #FAF8F5;
                    font-weight: 600;
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
                    margin-top: 8px;
                    padding-top: 6px;
                    border-top: 1px dashed var(--gray-200);
                    font-size: 0.65rem;
                    color: var(--gray-500);
                }
                .booking-cal__legend-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .booking-cal__legend-icon {
                    width: 10px;
                    height: 10px;
                    border-radius: 2px;
                    display: inline-block;
                }
                .booking-cal__legend-icon--am {
                    background: linear-gradient(135deg, rgba(194, 168, 120, 0.8) 50%, transparent 50%);
                    border: 1px solid rgba(194, 168, 120, 0.6);
                }
                .booking-cal__legend-icon--pm {
                    background: linear-gradient(135deg, transparent 50%, rgba(194, 168, 120, 0.8) 50%);
                    border: 1px solid rgba(194, 168, 120, 0.6);
                }

                /* Selectores de Franjas Horarias */
                .booking-cal__slots-container {
                    margin-top: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    background: white;
                    padding: 8px 10px;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--gray-200);
                }
                .booking-cal__slot-group {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }
                .booking-cal__slot-title {
                    font-size: 0.62rem;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    color: var(--gray-500);
                    text-transform: uppercase;
                }
                .booking-cal__slot-buttons {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 4px;
                }
                .booking-cal__slot-pill {
                    padding: 4px 6px;
                    font-size: 0.68rem;
                    font-weight: 500;
                    border-radius: 6px;
                    border: 1px solid var(--gray-200);
                    background: #FAF8F5;
                    color: var(--black-matte);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    text-align: center;
                }
                .booking-cal__slot-pill:hover:not(:disabled) {
                    border-color: var(--forest-green);
                    background: white;
                }
                .booking-cal__slot-pill--active {
                    background: var(--forest-green) !important;
                    color: #FAF8F5 !important;
                    border-color: var(--forest-green) !important;
                    font-weight: 600;
                }
                .booking-cal__slot-pill:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                    text-decoration: line-through;
                }

                .booking-cal__alert {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin-top: 8px;
                    padding: 4px 8px;
                    background: rgba(194, 168, 120, 0.15);
                    border-left: 2px solid var(--sand-dark);
                    border-radius: 4px;
                    font-size: 0.68rem;
                    color: #8A6D3B;
                }

                .booking-cal__footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 8px;
                    padding-top: 6px;
                    border-top: 1px solid var(--gray-200);
                }
                .booking-cal__clear-btn {
                    background: none;
                    border: none;
                    font-size: 0.72rem;
                    text-decoration: underline;
                    color: var(--gray-600);
                    cursor: pointer;
                    padding: 0;
                }
                .booking-cal__clear-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                    text-decoration: none;
                }
                .booking-cal__done-btn {
                    background: var(--forest-green);
                    color: #FAF8F5;
                    border: none;
                    border-radius: var(--radius-full);
                    padding: 3px 10px;
                    font-size: 0.72rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background var(--transition-fast);
                }
                .booking-cal__done-btn:hover {
                    background: var(--forest-green-light);
                }
            `}</style>
        </div>
    )
}
