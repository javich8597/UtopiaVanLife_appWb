# Calendario de Reserva Interactivo & Límite de Viajeros - Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar un calendario interactivo de selección de rango (llegada y salida) colapsable con diseño elegante tipo boutique y detección de fechas ocupadas en la tarjeta de reserva (`PriceCalculator`), junto con la restricción estricta de 1 a 3 viajeros.

**Architecture:** Componente desacoplado `BookingCalendar.tsx` construido con `date-fns` y animaciones `framer-motion`, integrado en `PriceCalculator.tsx` mediante un contenedor colapsable animado. La disponibilidad por camper se consulta mediante un endpoint ligero dedicado `/api/campers/[slug]/availability` que une `bookings` activos y `blocked_dates`. El control de pasajeros se restringe a un máximo de 3.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, date-fns 4.x, framer-motion, Lucide React, Supabase.

---

### Task 1: API de Disponibilidad por Camper

**Files:**
- Create: `app/api/campers/[slug]/availability/route.ts`
- Test: `tests/availability.test.ts`

- [ ] **Step 1: Escribir el test para el cálculo y formato de fechas bloqueadas**

```typescript
// tests/availability.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Función pura de normalización de rangos bloqueados
export function parseBlockedRanges(bookings: { start_date: string; end_date: string }[], blocked: { start_date: string; end_date: string }[]) {
    const allRanges = [...bookings, ...blocked]
    return allRanges.map(r => ({
        start: r.start_date.split('T')[0],
        end: r.end_date.split('T')[0],
    }))
}

describe('Availability blocked dates normalization', () => {
    it('normalizes bookings and blocked records into YYYY-MM-DD ranges', () => {
        const bookings = [{ start_date: '2026-06-10T00:00:00.000Z', end_date: '2026-06-15T00:00:00.000Z' }]
        const blocked = [{ start_date: '2026-07-01', end_date: '2026-07-05' }]
        const result = parseBlockedRanges(bookings, blocked)

        assert.equal(result.length, 2)
        assert.deepEqual(result[0], { start: '2026-06-10', end: '2026-06-15' })
        assert.deepEqual(result[1], { start: '2026-07-01', end: '2026-07-05' })
    })
})
```

- [ ] **Step 2: Ejecutar el test para verificar que corre**

Run: `npm test`
Expected: PASS (1 test passing)

- [ ] **Step 3: Implementar la ruta API `/api/campers/[slug]/availability`**

```typescript
// app/api/campers/[slug]/availability/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ slug: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { slug } = await params
        const supabase = await createClient()

        // 1. Obtener camper id
        const { data: camper, error: camperError } = await supabase
            .from('campers')
            .select('id')
            .eq('slug', slug)
            .single()

        if (camperError || !camper) {
            return NextResponse.json({ blockedRanges: [] })
        }

        const todayIso = new Date().toISOString().split('T')[0]

        // 2. Obtener reservas confirmadas/activas futuras o en curso
        const { data: bookings } = await supabase
            .from('bookings')
            .select('start_date, end_date')
            .eq('camper_id', camper.id)
            .in('status', ['confirmed', 'active'])
            .gte('end_date', todayIso)

        // 3. Obtener fechas expresamente bloqueadas
        const { data: blocked } = await supabase
            .from('blocked_dates')
            .select('start_date, end_date')
            .eq('camper_id', camper.id)
            .gte('end_date', todayIso)

        const blockedRanges = [
            ...(bookings || []).map((b: { start_date: string; end_date: string }) => ({
                start: b.start_date.split('T')[0],
                end: b.end_date.split('T')[0],
            })),
            ...(blocked || []).map((b: { start_date: string; end_date: string }) => ({
                start: b.start_date.split('T')[0],
                end: b.end_date.split('T')[0],
            })),
        ]

        return NextResponse.json({ blockedRanges })
    } catch {
        return NextResponse.json({ blockedRanges: [] })
    }
}
```

- [ ] **Step 4: Verificar que el código compila sin errores**

Run: `npm run lint` o `npx tsc --noEmit`
Expected: 0 errores de compilación en `app/api/campers/[slug]/availability/route.ts`

- [ ] **Step 5: Commit**

```bash
git add tests/availability.test.ts app/api/campers/[slug]/availability/route.ts
git commit -m "feat(api): add camper availability blocked-dates endpoint"
```

---

### Task 2: Componente Reutilizable `BookingCalendar`

**Files:**
- Create: `components/booking/BookingCalendar.tsx`
- Test: `tests/bookingCalendar.test.ts`

- [ ] **Step 1: Escribir tests para la lógica de fechas y deshabilitación**

```typescript
// tests/bookingCalendar.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

export function isDateBlocked(dateStr: string, blockedRanges: { start: string; end: string }[]): boolean {
    return blockedRanges.some(range => dateStr >= range.start && dateStr <= range.end)
}

export function isRangeValid(start: string, end: string, blockedRanges: { start: string; end: string }[]): boolean {
    if (end <= start) return false
    return !blockedRanges.some(range => {
        // Chequea si el rango cruza sobre cualquier fecha bloqueada
        return (start <= range.end && end >= range.start)
    })
}

describe('Booking calendar date logic', () => {
    const blocked = [{ start: '2026-06-15', end: '2026-06-20' }]

    it('identifies blocked dates accurately', () => {
        assert.equal(isDateBlocked('2026-06-16', blocked), true)
        assert.equal(isDateBlocked('2026-06-14', blocked), false)
        assert.equal(isDateBlocked('2026-06-21', blocked), false)
    })

    it('rejects selection ranges that overlap blocked dates', () => {
        assert.equal(isRangeValid('2026-06-10', '2026-06-22', blocked), false)
        assert.equal(isRangeValid('2026-06-10', '2026-06-14', blocked), true)
        assert.equal(isRangeValid('2026-06-21', '2026-06-25', blocked), true)
    })
})
```

- [ ] **Step 2: Ejecutar los tests para verificar que pasan**

Run: `npm test`
Expected: PASS (ambos archivos de test pasando)

- [ ] **Step 3: Crear el componente `components/booking/BookingCalendar.tsx`**

Implementar un calendario visual con:
- Cabecera con selector de mes y año (`<`, `>`).
- Días de la semana abreviados (L, M, X, J, V, S, D).
- Cálculo de días con `date-fns` (`startOfWeek`, `endOfWeek`, `eachDayOfInterval`, `format`, `addMonths`, `subMonths`).
- Estados de cada día: hoy, pasado, deshabilitado/bloqueado, seleccionado inicio, seleccionado fin, intermedio en rango, y estado hover.
- Botones inferiores de acción: "Limpiar" y "Listo".

```tsx
// components/booking/BookingCalendar.tsx
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
    isSameDay,
    isBefore,
    startOfDay,
    parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

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
                    border-radius: var(--radius-lg);
                    padding: var(--space-4);
                    user-select: none;
                }
                .booking-cal__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: var(--space-3);
                }
                .booking-cal__month-title {
                    font-family: var(--font-sans);
                    font-weight: 600;
                    text-transform: capitalize;
                    font-size: 0.95rem;
                    color: var(--black-matte);
                }
                .booking-cal__nav-btn {
                    background: transparent;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-full);
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: var(--black-matte);
                    transition: all var(--transition-fast);
                }
                .booking-cal__nav-btn:hover:not(:disabled) {
                    background: white;
                    border-color: var(--forest-green);
                    color: var(--forest-green);
                }
                .booking-cal__nav-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }
                .booking-cal__weekdays {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    text-align: center;
                    margin-bottom: var(--space-2);
                }
                .booking-cal__weekday {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--gray-400);
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
                    font-size: 0.85rem;
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
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-full);
                    position: relative;
                    z-index: 2;
                }
                .booking-cal__day--outside {
                    opacity: 0.25;
                }
                .booking-cal__day--disabled {
                    color: var(--gray-400);
                    text-decoration: line-through;
                    cursor: not-allowed;
                    opacity: 0.45;
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
                    margin-top: var(--space-4);
                    padding-top: var(--space-3);
                    border-top: 1px solid var(--gray-200);
                }
                .booking-cal__clear-btn {
                    background: none;
                    border: none;
                    font-size: 0.8rem;
                    text-decoration: underline;
                    color: var(--gray-600);
                    cursor: pointer;
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
                    padding: 4px 14px;
                    font-size: 0.8rem;
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
```

- [ ] **Step 4: Ejecutar type-check para validar el componente**

Run: `npx tsc --noEmit`
Expected: 0 errores

- [ ] **Step 5: Commit**

```bash
git add tests/bookingCalendar.test.ts components/booking/BookingCalendar.tsx
git commit -m "feat(booking): add customizable responsive BookingCalendar component"
```

---

### Task 3: Integración en `PriceCalculator` & Límite de Viajeros

**Files:**
- Modify: `components/booking/PriceCalculator.tsx`

- [ ] **Step 1: Ajustar el límite de pasajeros a 3 viajeros**

En `PriceCalculator.tsx`, modificar la función de incremento de pasajeros:
```tsx
// De:
<button type="button" className="btn btn-outline btn-icon" onClick={() => setPax(p => Math.min(6, p + 1))}>
// A:
<button type="button" className="btn btn-outline btn-icon" disabled={pax >= 3} onClick={() => setPax(p => Math.min(3, p + 1))}>
```
Y limitar el estado inicial si viniese un parámetro URL superior: `Math.min(3, initialPax)`.

- [ ] **Step 2: Integrar el selector de fechas tipo acordeón y el fetch de fechas bloqueadas**

En `PriceCalculator.tsx`:
- Importar `BookingCalendar` y `motion`, `AnimatePresence` de `framer-motion`.
- Añadir estado `const [isCalendarOpen, setIsCalendarOpen] = useState(false)` y `const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([])`.
- Efectuar fetch a `/api/campers/${camperSlug}/availability` para poblar `blockedRanges`.
- Reemplazar los dos inputs `<input type="date">` por dos cajas botón estilizadas (Llegada / Salida) que muestran la fecha formateada o "Añadir fecha", y al hacer clic alternan `isCalendarOpen`.
- Renderizar dentro de `<AnimatePresence>` el `<BookingCalendar>` animado.

- [ ] **Step 3: Verificar visual y lógicamente el cálculo de precios y checkout**

Verificar que:
1. Al seleccionar llegada y salida, se calcula el número de noches y el precio total.
2. Si el usuario hace clic en "Reservar", redirige a `/checkout?camper=...&from=...&to=...&pax=...` con `pax <= 3`.
3. El botón `+` de personas queda inhabilitado cuando se llega a 3.

- [ ] **Step 4: Compilar la aplicación y correr tests**

Run: `npm test` y `npm run build`
Expected: Build exitoso sin errores de TypeScript ni de bundle.

- [ ] **Step 5: Commit**

```bash
git add components/booking/PriceCalculator.tsx
git commit -m "feat(booking): integrate interactive calendar and enforce 3-pax limit"
```
