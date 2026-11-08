/**
 * UTOPIA VAN LIFE — Lógica de Validación de Calendario y Slots (Holo-Van Style)
 */

import { BlockedSlot, parseBlockedSlots, RawBlockedDate, RawBookingAvailability } from './availability'
import { MAX_BOOKING_NIGHTS } from './checkoutRules'
import { DaySlot } from '../pricing/engine'

export type SlotAvailabilityStatus = 'free' | 'morning_blocked' | 'afternoon_blocked' | 'full_blocked'

export interface BlockedRange {
    start: string // YYYY-MM-DD
    end: string   // YYYY-MM-DD
}

// Compatibilidad heredada
export function isDateBlocked(dateStr: string, blockedRanges: BlockedRange[]): boolean {
    return blockedRanges.some(range => dateStr >= range.start && dateStr <= range.end)
}

export function isRangeValid(start: string, end: string, blockedRanges: BlockedRange[]): boolean {
    if (end <= start) return false
    return !blockedRanges.some(range => {
        return (start <= range.end && end >= range.start)
    })
}

/**
 * Determina el estado de ocupación de un día específico
 */
export function getSlotAvailability(dateStr: string, blockedSlots: BlockedSlot[] = []): SlotAvailabilityStatus {
    const found = blockedSlots.find(s => s.date === dateStr)
    if (!found) return 'free'
    if (found.slot === 'full') return 'full_blocked'
    if (found.slot === 'morning') return 'morning_blocked'
    if (found.slot === 'afternoon') return 'afternoon_blocked'
    return 'free'
}

/**
 * Determina si un slot de un día es elegible para ser seleccionado como recogida (pickup)
 */
export function isSlotSelectableAsPickup(dateStr: string, slot: DaySlot, blockedSlots: BlockedSlot[] = []): boolean {
    const status = getSlotAvailability(dateStr, blockedSlots)
    if (status === 'full_blocked') return false
    if (status === 'free') return true
    if (status === 'morning_blocked') {
        // La mañana está ocupada por una entrega previa: solo se puede recoger por la tarde
        return slot === 'afternoon'
    }
    if (status === 'afternoon_blocked') {
        // La tarde está ocupada: se podría recoger por la mañana si no estuviera ocupada
        return slot === 'morning'
    }
    return true
}

/**
 * Determina si un slot de un día es elegible para ser seleccionado como devolución (return)
 */
export function isSlotSelectableAsReturn(dateStr: string, slot: DaySlot, blockedSlots: BlockedSlot[] = []): boolean {
    const status = getSlotAvailability(dateStr, blockedSlots)
    if (status === 'full_blocked') return false
    if (status === 'free') return true
    if (status === 'afternoon_blocked') {
        // La tarde está ocupada por una recogida posterior: solo se puede devolver por la mañana
        return slot === 'morning'
    }
    if (status === 'morning_blocked') {
        // La mañana está ocupada: se podría devolver por la tarde
        return slot === 'afternoon'
    }
    return true
}

/**
 * Valida si un rango completo de reserva (inicio, slot de inicio, fin, slot de fin) es válido
 */
export function validateBookingRange(
    start: string,
    startSlot: DaySlot,
    end: string,
    endSlot: DaySlot,
    blockedSlots: BlockedSlot[] = [],
    minNights: number = 3,
    maxNights: number = MAX_BOOKING_NIGHTS
): { isValid: boolean; reason?: 'min_nights' | 'max_nights' | 'blocked_dates' | 'invalid_dates' } {
    if (!start || !end || end <= start) {
        return { isValid: false, reason: 'invalid_dates' }
    }

    const startDate = new Date(start)
    const endDate = new Date(end)
    const msPerDay = 1000 * 60 * 60 * 24
    const nights = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay)

    if (nights < minNights) {
        return { isValid: false, reason: 'min_nights' }
    }

    if (nights > maxNights) {
        return { isValid: false, reason: 'max_nights' }
    }

    // Comprobar inicio
    if (!isSlotSelectableAsPickup(start, startSlot, blockedSlots)) {
        return { isValid: false, reason: 'blocked_dates' }
    }

    // Comprobar fin
    if (!isSlotSelectableAsReturn(end, endSlot, blockedSlots)) {
        return { isValid: false, reason: 'blocked_dates' }
    }

    // Comprobar días intermedios (deben estar completamente libres)
    const current = new Date(startDate)
    current.setUTCDate(current.getUTCDate() + 1)
    while (current < endDate) {
        const dateStr = current.toISOString().split('T')[0]
        const status = getSlotAvailability(dateStr, blockedSlots)
        if (status !== 'free') {
            return { isValid: false, reason: 'blocked_dates' }
        }
        current.setUTCDate(current.getUTCDate() + 1)
    }

    return { isValid: true }
}

const pickupSlotOf = (time?: string | null): DaySlot => parseInt(time || '15:00', 10) < 14 ? 'morning' : 'afternoon'
const dropoffSlotOf = (time?: string | null): DaySlot => parseInt(time || '12:00', 10) > 14 ? 'afternoon' : 'morning'

/**
 * ¿Cabe esta reserva entre las demás? Es la misma regla que aplica el calendario, medios días
 * incluidos, para que el servidor no rechace lo que el cliente pudo elegir ni al revés.
 * Solo mira ocupación: las noches mínimas y máximas se comprueban aparte.
 */
export function isBookingRangeFree(
    booking: RawBookingAvailability,
    otherBookings: RawBookingAvailability[],
    blocks: RawBlockedDate[]
): boolean {
    return validateBookingRange(
        booking.start_date.split('T')[0],
        pickupSlotOf(booking.pickup_time),
        booking.end_date.split('T')[0],
        dropoffSlotOf(booking.dropoff_time),
        parseBlockedSlots(otherBookings, blocks),
        1,
        Infinity
    ).isValid
}
