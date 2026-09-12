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
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface BlockedRange {
    start: string // YYYY-MM-DD
    end: string   // YYYY-MM-DD
}

interface BookingCalendarProps {
    startDate: string // YYYY-MM-DD
    endDate: string   // YYYY-MM-DD
    onChange: (start: string, end: string) => void
    blockedRanges?: BlockedRange[]
    minDate?: Date
    onClose?: () => void
}

export default function BookingCalendar({
    startDate,
    endDate,
    onChange,
    blockedRanges = [],
    minDate = startOfDay(new Date()),
    onClose,
}: BookingCalendarProps) {
    const initialMonth = startDate ? parseISO(startDate) : new Date()
    const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth)
    const [hoverDate, setHoverDate] = useState<string | null>(null)

    const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1))
    const prevMonth = () => {
        const prev = subMonths(currentMonth, 1)
        if (!isBefore(endOfMonth(prev), minDate)) {
            setCurrentMonth(prev)
        }
    }

    const canGoPrev = !isBefore(endOfMonth(subMonths(currentMonth, 1)), minDate)

    const isBlocked = (dateStr: string) => {
        return blockedRanges.some(r => dateStr >= r.start && dateStr <= r.end)
    }

    const days = useMemo(() => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDateGrid = startOfWeek(monthStart, { weekStartsOn: 1 })
        const endDateGrid = endOfWeek(monthEnd, { weekStartsOn: 1 })

        return eachDayOfInterval({ start: startDateGrid, end: endDateGrid })
    }, [currentMonth])

    const handleDayClick = (dateStr: string) => {
        if (!startDate || (startDate && endDate)) {
            // Empezar nuevo rango
            onChange(dateStr, '')
            return
        }

        if (startDate && !endDate) {
            if (dateStr < startDate) {
                // Si hace click antes de la llegada, reubicar llegada
                onChange(dateStr, '')
                return
            }

            // Comprobar si cruza fechas bloqueadas intermedias
            const crossesBlocked = blockedRanges.some(
                r => r.start <= dateStr && r.end >= startDate
            )
            if (crossesBlocked) {
                onChange(dateStr, '')
                return
            }

            onChange(startDate, dateStr)
        }
    }

    const clearDates = () => {
        onChange('', '')
    }

    const weekHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

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
                    const blocked = isBlocked(dateStr)
                    const disabled = isPast || blocked

                    const isStart = startDate === dateStr
                    const isEnd = endDate === dateStr

                    let inRange = false
                    if (startDate && endDate) {
                        inRange = dateStr > startDate && dateStr < endDate
                    } else if (startDate && hoverDate && !endDate) {
                        inRange = dateStr > startDate && dateStr <= hoverDate
                    }

                    return (
                        <button
                            key={dateStr}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleDayClick(dateStr)}
                            onMouseEnter={() => !endDate && startDate && setHoverDate(dateStr)}
                            onMouseLeave={() => setHoverDate(null)}
                            className={`booking-cal__day ${
                                !isCurrentMonth ? 'booking-cal__day--outside' : ''
                            } ${disabled ? 'booking-cal__day--disabled' : ''} ${
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
                    max-width: 300px;
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
                .booking-cal__footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 10px;
                    padding-top: 8px;
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
