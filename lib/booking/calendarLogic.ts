/**
 * UTOPIA VAN LIFE — Lógica de Validación de Calendario y Slots (Holo-Van Style)
 */

import { BlockedSlot } from './availability'
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
    minNights: number = 3
): { isValid: boolean; reason?: 'min_nights' | 'blocked_dates' | 'invalid_dates' } {
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
    current.setDate(current.getDate() + 1)
    while (current < endDate) {
        const dateStr = current.toISOString().split('T')[0]
        const status = getSlotAvailability(dateStr, blockedSlots)
        if (status !== 'free') {
            return { isValid: false, reason: 'blocked_dates' }
        }
        current.setDate(current.getDate() + 1)
    }

    return { isValid: true }
}
