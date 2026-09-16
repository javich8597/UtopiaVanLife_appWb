/**
 * UTOPIA VAN LIFE — Mapeo y Normalización de Disponibilidad
 * Soporte de turnos de Mañana (09:00-12:00) y Tarde (15:00-19:00)
 */

export interface BlockedSlot {
    date: string // YYYY-MM-DD
    slot: 'morning' | 'afternoon' | 'full'
    reason?: 'booking' | 'blocked'
}

export interface RawBookingAvailability {
    start_date: string
    pickup_time?: string
    end_date: string
    dropoff_time?: string
}

export interface RawBlockedDate {
    start_date: string
    end_date: string
}

export function parseBlockedRanges(
    bookings: { start_date: string; end_date: string }[],
    blocked: { start_date: string; end_date: string }[]
) {
    const allRanges = [...bookings, ...blocked]
    return allRanges.map(r => ({
        start: r.start_date.split('T')[0],
        end: r.end_date.split('T')[0],
    }))
}

export function parseBlockedSlots(
    bookings: RawBookingAvailability[],
    blockedDates: RawBlockedDate[]
): BlockedSlot[] {
    const slotMap = new Map<string, 'morning' | 'afternoon' | 'full'>()

    // 1. Fechas expresamente bloqueadas (bloquean el día completo)
    for (const b of blockedDates) {
        const start = new Date(b.start_date.split('T')[0])
        const end = new Date(b.end_date.split('T')[0])
        const current = new Date(start)
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0]
            slotMap.set(dateStr, 'full')
            current.setDate(current.getDate() + 1)
        }
    }

    // 2. Reservas existentes
    for (const b of bookings) {
        const startStr = b.start_date.split('T')[0]
        const endStr = b.end_date.split('T')[0]
        const pickupHour = parseInt((b.pickup_time || '15:00').split(':')[0], 10)
        const dropoffHour = parseInt((b.dropoff_time || '12:00').split(':')[0], 10)

        // Si la recogida es antes de las 14:00 (mañana), el día de inicio queda bloqueado completo
        // Si la recogida es a partir de las 14:00 (tarde), la mañana queda libre para checkout previo
        const startBlockedSlot: 'morning' | 'afternoon' | 'full' = pickupHour < 14 ? 'full' : 'afternoon'

        // Si la entrega es después de las 14:00 (tarde), el día de fin queda bloqueado completo
        // Si la entrega es antes de las 14:00 (mañana), la tarde queda libre para checkin posterior
        const endBlockedSlot: 'morning' | 'afternoon' | 'full' = dropoffHour > 14 ? 'full' : 'morning'

        if (startStr === endStr) {
            slotMap.set(startStr, 'full')
            continue
        }

        // Día de inicio
        const existingStart = slotMap.get(startStr)
        if (existingStart === 'full' || (existingStart === 'morning' && startBlockedSlot === 'afternoon')) {
            slotMap.set(startStr, 'full')
        } else {
            slotMap.set(startStr, startBlockedSlot)
        }

        // Días intermedios: siempre bloqueados completos
        const current = new Date(startStr)
        current.setDate(current.getDate() + 1)
        const endDate = new Date(endStr)
        while (current < endDate) {
            slotMap.set(current.toISOString().split('T')[0], 'full')
            current.setDate(current.getDate() + 1)
        }

        // Día de fin
        const existingEnd = slotMap.get(endStr)
        if (existingEnd === 'full' || (existingEnd === 'afternoon' && endBlockedSlot === 'morning')) {
            slotMap.set(endStr, 'full')
        } else {
            slotMap.set(endStr, endBlockedSlot)
        }
    }

    return Array.from(slotMap.entries()).map(([date, slot]) => ({ date, slot }))
}
