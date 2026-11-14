'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
    format,
    parseISO,
    isValid,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    setMonth,
    setYear,
    isSameDay,
    isSameMonth,
    isBefore,
    isAfter,
    startOfDay,
} from 'date-fns'
import { es, enUS, fr, de } from 'date-fns/locale'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react'

type CalendarView = 'days' | 'months' | 'years'

export interface DatePickerProps {
    id?: string
    value: string // YYYY-MM-DD or ''
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    hasError?: boolean
    required?: boolean
    minDate?: Date
    maxDate?: Date
    defaultViewDate?: Date
    locale?: string
    ariaLabel?: string
    surface?: 'wizard' | 'dark'
}

const LOCALE_MAP = {
    es,
    en: enUS,
    fr,
    de,
} as const

const WEEKDAYS_BY_LOCALE: Record<string, string[]> = {
    es: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
    en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    de: ['M', 'D', 'M', 'D', 'F', 'S', 'S'],
}

function parseSafeDate(value?: string): Date | null {
    if (!value) return null
    const parsed = parseISO(value)
    return isValid(parsed) ? parsed : null
}

export default function DatePicker({
    id,
    value,
    onChange,
    placeholder = 'Seleccionar fecha',
    disabled = false,
    hasError = false,
    minDate = new Date(1920, 0, 1),
    maxDate = new Date(),
    defaultViewDate,
    locale = 'es',
    ariaLabel,
    surface = 'wizard',
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [view, setView] = useState<CalendarView>('days')
    const [isMobile, setIsMobile] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const dateLocale = LOCALE_MAP[locale as keyof typeof LOCALE_MAP] || es
    const weekdays = WEEKDAYS_BY_LOCALE[locale] || WEEKDAYS_BY_LOCALE.es

    const selectedDate = useMemo(() => parseSafeDate(value), [value])
    const minDay = useMemo(() => startOfDay(minDate), [minDate])
    const maxDay = useMemo(() => startOfDay(maxDate), [maxDate])
    const minYear = minDay.getFullYear()
    const maxYear = maxDay.getFullYear()

    const getInitialViewDate = () => {
        if (selectedDate) return selectedDate
        if (defaultViewDate) return defaultViewDate
        return maxDay
    }

    const [viewDate, setViewDate] = useState<Date>(getInitialViewDate)
    const [yearPageStart, setYearPageStart] = useState<number>(
        () => Math.floor(getInitialViewDate().getFullYear() / 12) * 12
    )

    // Detect mobile breakpoint (<= 640px)
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 640px)')
        const update = () => setIsMobile(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    // Sync viewDate when value changes externally
    useEffect(() => {
        if (selectedDate) {
            setViewDate(selectedDate)
            setYearPageStart(Math.floor(selectedDate.getFullYear() / 12) * 12)
        }
    }, [selectedDate])

    // Lock body scroll on mobile bottom sheet when open (per AGENTS.md)
    useEffect(() => {
        if (!isOpen || !isMobile) return
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prevOverflow
        }
    }, [isOpen, isMobile])

    // Close on outside click or Escape
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const handleToggle = () => {
        if (disabled) return
        if (!isOpen) {
            const base = getInitialViewDate()
            setViewDate(base)
            setYearPageStart(Math.floor(base.getFullYear() / 12) * 12)
            setView('days')
        }
        setIsOpen((prev) => !prev)
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (disabled) return
        onChange('')
    }

    const isDayDisabled = (day: Date) => {
        const d = startOfDay(day)
        return isBefore(d, minDay) || isAfter(d, maxDay)
    }

    const handleSelectDay = (day: Date) => {
        if (isDayDisabled(day)) return
        onChange(format(day, 'yyyy-MM-dd'))
        setIsOpen(false)
    }

    const handlePrevMonth = () => {
        const prev = subMonths(viewDate, 1)
        if (!isBefore(endOfMonth(prev), minDay)) {
            setViewDate(prev)
        }
    }

    const handleNextMonth = () => {
        const next = addMonths(viewDate, 1)
        if (!isAfter(startOfMonth(next), maxDay)) {
            setViewDate(next)
        }
    }

    const canGoPrevMonth = !isBefore(endOfMonth(subMonths(viewDate, 1)), minDay)
    const canGoNextMonth = !isAfter(startOfMonth(addMonths(viewDate, 1)), maxDay)

    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(viewDate)
        const monthEnd = endOfMonth(monthStart)
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
        return eachDayOfInterval({ start: gridStart, end: gridEnd })
    }, [viewDate])

    const monthsList = useMemo(() => {
        return Array.from({ length: 12 }, (_, idx) => {
            const d = setMonth(new Date(viewDate.getFullYear(), 0, 1), idx)
            const monthStart = startOfMonth(d)
            const monthEnd = endOfMonth(d)
            const isMonthDisabled = isBefore(monthEnd, minDay) || isAfter(monthStart, maxDay)
            return {
                idx,
                label: format(d, 'MMM', { locale: dateLocale }).replace('.', ''),
                isDisabled: isMonthDisabled,
            }
        })
    }, [viewDate, minDay, maxDay, dateLocale])

    const yearsList = useMemo(() => {
        return Array.from({ length: 12 }, (_, idx) => {
            const yr = yearPageStart + idx
            return {
                year: yr,
                isDisabled: yr < minYear || yr > maxYear,
            }
        })
    }, [yearPageStart, minYear, maxYear])

    const formattedDisplay = useMemo(() => {
        if (!selectedDate) return ''
        return format(selectedDate, 'dd MMM yyyy', { locale: dateLocale })
    }, [selectedDate, dateLocale])

    const today = useMemo(() => startOfDay(new Date()), [])

    return (
        <div className={`utopia-dp ${surface === 'dark' ? 'utopia-dp--dark' : ''}`} ref={containerRef}>
            <button
                id={id}
                type="button"
                className={`utopia-dp__trigger ${hasError ? 'utopia-dp__trigger--error' : ''} ${isOpen ? 'utopia-dp__trigger--open' : ''} ${!selectedDate ? 'utopia-dp__trigger--placeholder' : ''}`}
                onClick={handleToggle}
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={ariaLabel || placeholder}
            >
                <span className="utopia-dp__trigger-left">
                    <CalendarIcon size={15} className="utopia-dp__icon" />
                    <span className="utopia-dp__value">
                        {formattedDisplay || placeholder}
                    </span>
                </span>
                <span className="utopia-dp__trigger-right">
                    {selectedDate && !disabled && (
                        <span
                            role="button"
                            tabIndex={-1}
                            className="utopia-dp__clear"
                            onClick={handleClear}
                            aria-label="Limpiar fecha"
                        >
                            <X size={13} />
                        </span>
                    )}
                    <ChevronDown
                        size={15}
                        className={`utopia-dp__chevron ${isOpen ? 'utopia-dp__chevron--open' : ''}`}
                    />
                </span>
            </button>

            {isOpen && (
                <>
                    {isMobile && (
                        <div
                            className="utopia-dp__backdrop"
                            onClick={() => setIsOpen(false)}
                            aria-hidden="true"
                        />
                    )}
                    <div
                        className={`utopia-dp__popover ${isMobile ? 'utopia-dp__popover--sheet' : ''}`}
                        role="dialog"
                        aria-modal={isMobile}
                    >
                        {isMobile && <div className="utopia-dp__sheet-handle" />}

                        {/* DAYS VIEW */}
                        {view === 'days' && (
                            <div className="utopia-dp__body">
                                <div className="utopia-dp__header">
                                    <button
                                        type="button"
                                        className="utopia-dp__nav-btn"
                                        onClick={handlePrevMonth}
                                        disabled={!canGoPrevMonth}
                                        aria-label="Mes anterior"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    <div className="utopia-dp__title-group">
                                        <button
                                            type="button"
                                            className="utopia-dp__pill-btn"
                                            onClick={() => setView('months')}
                                            title="Cambiar mes"
                                        >
                                            {format(viewDate, 'MMMM', { locale: dateLocale })}
                                        </button>
                                        <button
                                            type="button"
                                            className="utopia-dp__pill-btn utopia-dp__pill-btn--year"
                                            onClick={() => {
                                                setYearPageStart(Math.floor(viewDate.getFullYear() / 12) * 12)
                                                setView('years')
                                            }}
                                            title="Cambiar año"
                                        >
                                            {viewDate.getFullYear()}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className="utopia-dp__nav-btn"
                                        onClick={handleNextMonth}
                                        disabled={!canGoNextMonth}
                                        aria-label="Mes siguiente"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div className="utopia-dp__weekdays">
                                    {weekdays.map((wd, idx) => (
                                        <span key={idx} className="utopia-dp__weekday">
                                            {wd}
                                        </span>
                                    ))}
                                </div>

                                <div className="utopia-dp__grid">
                                    {calendarDays.map((day) => {
                                        const inCurrentMonth = isSameMonth(day, viewDate)
                                        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                                        const isToday = isSameDay(day, today)
                                        const dayDisabled = isDayDisabled(day)

                                        return (
                                            <button
                                                key={day.toISOString()}
                                                type="button"
                                                disabled={dayDisabled}
                                                onClick={() => handleSelectDay(day)}
                                                className={[
                                                    'utopia-dp__day',
                                                    !inCurrentMonth && 'utopia-dp__day--outside',
                                                    isToday && 'utopia-dp__day--today',
                                                    isSelected && 'utopia-dp__day--selected',
                                                ]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                            >
                                                {format(day, 'd')}
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="utopia-dp__footer">
                                    <span className="utopia-dp__hint">
                                        Pulsa el mes o año para saltar rápido
                                    </span>
                                    {isMobile && (
                                        <button
                                            type="button"
                                            className="utopia-dp__close-btn"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            Cerrar
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* MONTHS VIEW */}
                        {view === 'months' && (
                            <div className="utopia-dp__body">
                                <div className="utopia-dp__header">
                                    <button
                                        type="button"
                                        className="utopia-dp__nav-btn"
                                        onClick={() => setViewDate((prev) => setYear(prev, prev.getFullYear() - 1))}
                                        disabled={viewDate.getFullYear() <= minYear}
                                        aria-label="Año anterior"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    <button
                                        type="button"
                                        className="utopia-dp__pill-btn utopia-dp__pill-btn--year"
                                        onClick={() => {
                                            setYearPageStart(Math.floor(viewDate.getFullYear() / 12) * 12)
                                            setView('years')
                                        }}
                                    >
                                        {viewDate.getFullYear()}
                                    </button>

                                    <button
                                        type="button"
                                        className="utopia-dp__nav-btn"
                                        onClick={() => setViewDate((prev) => setYear(prev, prev.getFullYear() + 1))}
                                        disabled={viewDate.getFullYear() >= maxYear}
                                        aria-label="Año siguiente"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div className="utopia-dp__months-grid">
                                    {monthsList.map((m) => {
                                        const isCurrent = viewDate.getMonth() === m.idx
                                        return (
                                            <button
                                                key={m.idx}
                                                type="button"
                                                disabled={m.isDisabled}
                                                onClick={() => {
                                                    setViewDate((prev) => setMonth(prev, m.idx))
                                                    setView('days')
                                                }}
                                                className={`utopia-dp__cell-btn ${isCurrent ? 'utopia-dp__cell-btn--active' : ''}`}
                                            >
                                                {m.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* YEARS VIEW */}
                        {view === 'years' && (
                            <div className="utopia-dp__body">
                                <div className="utopia-dp__header">
                                    <button
                                        type="button"
                                        className="utopia-dp__nav-btn"
                                        onClick={() => setYearPageStart((prev) => prev - 12)}
                                        disabled={yearPageStart <= minYear}
                                        aria-label="Años anteriores"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    <span className="utopia-dp__range-title">
                                        {yearPageStart} – {yearPageStart + 11}
                                    </span>

                                    <button
                                        type="button"
                                        className="utopia-dp__nav-btn"
                                        onClick={() => setYearPageStart((prev) => prev + 12)}
                                        disabled={yearPageStart + 11 >= maxYear}
                                        aria-label="Años siguientes"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div className="utopia-dp__years-grid">
                                    {yearsList.map((y) => {
                                        const isCurrent = viewDate.getFullYear() === y.year
                                        return (
                                            <button
                                                key={y.year}
                                                type="button"
                                                disabled={y.isDisabled}
                                                onClick={() => {
                                                    setViewDate((prev) => setYear(prev, y.year))
                                                    setView('months')
                                                }}
                                                className={`utopia-dp__cell-btn ${isCurrent ? 'utopia-dp__cell-btn--active' : ''}`}
                                            >
                                                {y.year}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            <style jsx>{`
                .utopia-dp {
                    position: relative;
                    width: 100%;
                }

                .utopia-dp--dark {
                    --wz-chip-bg: #0B0C0E;
                    --wz-surface: #131518;
                    --wz-pill-bg: rgba(204, 160, 83, 0.16);
                    --forest-green: #CCA053;
                    --black-matte: #FFFFFF;
                    --gray-100: rgba(255, 255, 255, 0.08);
                    --gray-200: rgba(255, 255, 255, 0.12);
                    --gray-300: rgba(255, 255, 255, 0.24);
                    --gray-400: #94A3B8;
                }

                .utopia-dp--dark .utopia-dp__trigger {
                    height: 46px;
                    padding: 0 16px;
                    border-radius: 12px;
                    font-size: 0.92rem;
                }

                .utopia-dp__trigger {
                    width: 100%;
                    height: 42px;
                    padding: 0 12px;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md, 8px);
                    font-size: 13.5px;
                    font-family: inherit;
                    color: var(--black-matte);
                    background: var(--wz-chip-bg);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    outline: none;
                    text-align: left;
                }

                .utopia-dp__trigger:hover:not(:disabled) {
                    border-color: var(--gray-300);
                }

                .utopia-dp__trigger--open,
                .utopia-dp__trigger:focus-visible {
                    border-color: var(--forest-green);
                    background: var(--wz-surface);
                    box-shadow: 0 0 0 3px var(--wz-pill-bg);
                }

                .utopia-dp__trigger--error {
                    border-color: #ef4444;
                    background: rgba(239, 68, 68, 0.08);
                }

                .utopia-dp__trigger:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .utopia-dp__trigger--placeholder .utopia-dp__value {
                    color: var(--gray-400);
                }

                .utopia-dp__trigger-left {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                    flex: 1;
                }

                .utopia-dp__icon {
                    color: #CCA053;
                    flex-shrink: 0;
                }

                .utopia-dp__value {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    text-transform: capitalize;
                    font-weight: 500;
                }

                .utopia-dp__trigger-right {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    flex-shrink: 0;
                }

                .utopia-dp__clear {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    color: var(--gray-400);
                    transition: all 0.15s ease;
                }

                .utopia-dp__clear:hover {
                    background: var(--gray-100);
                    color: var(--black-matte);
                }

                .utopia-dp__chevron {
                    color: var(--gray-400);
                    transition: transform 0.2s ease;
                }

                .utopia-dp__chevron--open {
                    transform: rotate(180deg);
                }

                .utopia-dp__backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.55);
                    backdrop-filter: blur(4px);
                    z-index: 998;
                }

                .utopia-dp__popover {
                    position: absolute;
                    top: calc(100% + 6px);
                    left: 0;
                    width: 304px;
                    background: var(--wz-surface, #131518);
                    border: 1px solid var(--gray-200, rgba(255, 255, 255, 0.12));
                    border-radius: 16px;
                    padding: 14px;
                    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
                    z-index: 999;
                    user-select: none;
                }

                .utopia-dp__popover--sheet {
                    position: fixed;
                    top: auto;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    width: 100%;
                    border-radius: 20px 20px 0 0;
                    padding: 10px 18px calc(18px + env(safe-area-inset-bottom, 16px));
                    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.35);
                }

                .utopia-dp__sheet-handle {
                    width: 38px;
                    height: 4px;
                    border-radius: 999px;
                    background: var(--gray-300);
                    margin: 0 auto 12px;
                }

                .utopia-dp__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 12px;
                }

                .utopia-dp__nav-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 1px solid var(--gray-200);
                    background: var(--wz-chip-bg);
                    color: var(--black-matte);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    padding: 0;
                }

                .utopia-dp__nav-btn:hover:not(:disabled) {
                    background: #CCA053;
                    border-color: #CCA053;
                    color: #0B0C0E;
                }

                .utopia-dp__nav-btn:disabled {
                    opacity: 0.25;
                    cursor: not-allowed;
                }

                .utopia-dp__title-group {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .utopia-dp__pill-btn {
                    background: var(--wz-chip-bg);
                    border: 1px solid var(--gray-200);
                    border-radius: 8px;
                    padding: 4px 10px;
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--black-matte);
                    text-transform: capitalize;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .utopia-dp__pill-btn:hover {
                    border-color: #CCA053;
                    background: var(--wz-pill-bg);
                }

                .utopia-dp__pill-btn--year {
                    color: #CCA053;
                }

                :global(html[data-theme="light"]) .utopia-dp__pill-btn--year {
                    color: #8C6423;
                }

                .utopia-dp__range-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--black-matte);
                }

                .utopia-dp__weekdays {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    text-align: center;
                    margin-bottom: 6px;
                }

                .utopia-dp__weekday {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--gray-400);
                    padding-bottom: 2px;
                }

                .utopia-dp__grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 3px;
                }

                .utopia-dp__day {
                    aspect-ratio: 1;
                    border: none;
                    background: transparent;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--black-matte);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    padding: 0;
                }

                .utopia-dp__day:hover:not(:disabled):not(.utopia-dp__day--selected) {
                    background: var(--wz-chip-bg);
                }

                .utopia-dp__day--outside {
                    color: var(--gray-400);
                    opacity: 0.45;
                }

                .utopia-dp__day--today:not(.utopia-dp__day--selected) {
                    border: 1px solid #CCA053;
                }

                .utopia-dp__day--selected {
                    background: #CCA053;
                    color: #0B0C0E;
                    font-weight: 700;
                }

                .utopia-dp__day:disabled {
                    opacity: 0.22;
                    cursor: not-allowed;
                }

                .utopia-dp__months-grid,
                .utopia-dp__years-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    padding: 4px 0;
                }

                .utopia-dp__cell-btn {
                    height: 40px;
                    border-radius: 10px;
                    border: 1px solid var(--gray-200);
                    background: var(--wz-chip-bg);
                    color: var(--black-matte);
                    font-size: 13px;
                    font-weight: 600;
                    text-transform: capitalize;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .utopia-dp__cell-btn:hover:not(:disabled):not(.utopia-dp__cell-btn--active) {
                    border-color: #CCA053;
                    background: var(--wz-pill-bg);
                }

                .utopia-dp__cell-btn--active {
                    background: #CCA053;
                    border-color: #CCA053;
                    color: #0B0C0E;
                    font-weight: 700;
                }

                .utopia-dp__cell-btn:disabled {
                    opacity: 0.25;
                    cursor: not-allowed;
                }

                .utopia-dp__footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 1px solid var(--gray-100);
                }

                .utopia-dp__hint {
                    font-size: 11px;
                    color: var(--gray-400);
                }

                .utopia-dp__close-btn {
                    background: var(--wz-chip-bg);
                    border: 1px solid var(--gray-200);
                    border-radius: 8px;
                    padding: 6px 12px;
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--black-matte);
                    cursor: pointer;
                }

                @media (max-width: 640px) {
                    .utopia-dp__day {
                        min-height: 40px;
                    }
                    .utopia-dp__cell-btn {
                        height: 44px;
                    }
                    .utopia-dp__nav-btn {
                        width: 38px;
                        height: 38px;
                    }
                }
            `}</style>
        </div>
    )
}
