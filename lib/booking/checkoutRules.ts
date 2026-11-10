import type { DaySlot } from '../pricing/types'

/** Reglas de una reserva que el checkout comprueba antes de escribir nada */

/** Límite antiabuso: un rango enorme bloquearía el calendario de una camper con una sola petición */
export const MAX_BOOKING_NIGHTS = 90

/** Reservas sin pagar que un mismo email puede tener abiertas a la vez */
export const MAX_OPEN_PENDING_PER_EMAIL = 3

/** Las notas del cliente van a `bookings.notes`, que el panel usa también para los avisos de cobro */
export const MAX_CUSTOMER_NOTES_LENGTH = 2000
/**
 * Y en bytes UTF-8: el webhook y el reintento de pago escriben las notas solo si siguen igual
 * (`notes=eq.<notas>` en la URL de PostgREST), así que su tamaño acota la longitud de esa URL
 */
export const MAX_CUSTOMER_NOTES_BYTES = 2000

/** Plazas máximas de cualquier camper: un vehículo de carnet B lleva como mucho 9, conductor incluido */
export const MAX_CAMPER_SEATS = 9

/** Plazas de una camper, como las calcula el asistente: specs.seats o, si falta, 2 en SPACE y 3 en las demás */
export function camperSeats(camper: { slug?: string | null; specs?: { seats?: unknown } | null }): number {
    const seats = Number(camper.specs?.seats)
    if (Number.isInteger(seats) && seats >= 1 && seats <= MAX_CAMPER_SEATS) return seats
    return camper.slug === 'space' ? 2 : 3
}

/** Pasado este tiempo una reserva sin pagar se considera caducada */
export const OPEN_PENDING_WINDOW_MINUTES = 60

/**
 * Una sola regla del 2º conductor, la misma para el asistente, el checkout, el contrato y la subida:
 * se permite con cualquier fianza (con Flex va incluido, con Estándar cuesta
 * `SECOND_DRIVER_RATE_PER_DAY`), pero como máximo uno por reserva.
 */
export const MAX_SECOND_DRIVERS = 1

/** Documento de una ficha, normalizado: es lo que identifica a una persona entre acompañantes */
export function personDocument(person: unknown): string {
    if (!person || typeof person !== 'object') return ''
    const p = person as Record<string, unknown>
    const raw = p.dniNie ?? p.dni ?? p.passport ?? p.documentNumber ?? p.document_number ?? p.dni_nie
    return typeof raw === 'string' ? raw.trim().toUpperCase() : ''
}

/** ¿Esta persona ya figura entre los acompañantes? Se compara por documento, como el checkout */
export function isAlreadyAmong(person: unknown, people: unknown): boolean {
    const doc = personDocument(person)
    if (!doc || !Array.isArray(people)) return false
    return people.some(other => personDocument(other) === doc)
}

/** Los distintos nombres con los que una ficha puede llegar marcada como 2º conductor */
export function isSecondDriverFlag(passenger: unknown): boolean {
    if (!passenger || typeof passenger !== 'object') return false
    const p = passenger as Record<string, unknown>
    return Boolean(p.isSecondDriver || p.is_second_driver || p.secondDriver || p.isDriver)
}

export function countSecondDrivers(passengers: unknown): number {
    return Array.isArray(passengers) ? passengers.filter(isSecondDriverFlag).length : 0
}

/**
 * ¿Esta reserva lleva un 2º conductor? Mira las fichas guardadas y, como respaldo, el desglose de
 * precio con el que se cobró (`pricing_breakdown.secondDriver`), que es el que lleva el suplemento.
 */
export function bookingHasSecondDriver(booking: unknown): boolean {
    if (!booking || typeof booking !== 'object') return false
    const row = booking as Record<string, unknown>
    if (countSecondDrivers(row.passengers) > 0) return true
    const breakdown = row.pricing_breakdown
    if (breakdown && typeof breakdown === 'object') {
        const b = breakdown as Record<string, unknown>
        if (b.secondDriver === true) return true
        if (countSecondDrivers(b.passengers) > 0) return true
    }
    return false
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MAX_EMAIL_LENGTH = 254
/** Cada parte del dominio empieza y acaba por letra o número: `ana@-ex.com` no es un dominio */
const EMAIL_PATTERN = /^[a-z0-9._+'-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/
const BOOKING_TIME_ZONE = 'Europe/Madrid'

export function normalizeEmail(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

/** Espera el email ya normalizado. El guion bajo es válido; % y otros comodines, no */
export function isValidEmail(email: string): boolean {
    return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email)
}

const NOTE_MARKERS = /\[\s*(PAGO A REVISAR|PAGO REVISADO|COBRO REDSYS|PEDIDO ANTERIOR)\s*\]/gi

/**
 * Las notas del cliente se guardan en `bookings.notes`, junto a las líneas con las que el webhook y
 * el panel gestionan los cobros. Un cliente no puede escribir esas líneas: una falsa impediría que
 * la reserva caducara, o taparía un aviso real.
 */
export function sanitizeCustomerNotes(value: unknown): string {
    if (typeof value !== 'string') return ''
    return truncateUtf8(value.replace(NOTE_MARKERS, '($1)').slice(0, MAX_CUSTOMER_NOTES_LENGTH), MAX_CUSTOMER_NOTES_BYTES)
}

/** Corta el texto para que ocupe como mucho maxBytes en UTF-8, sin partir ningún carácter */
function truncateUtf8(text: string, maxBytes: number): string {
    const encoder = new TextEncoder()
    if (encoder.encode(text).length <= maxBytes) return text
    let bytes = 0
    let result = ''
    for (const char of text) {
        const size = encoder.encode(char).length
        if (bytes + size > maxBytes) break
        bytes += size
        result += char
    }
    return result
}

const PICKUP_TIMES: Record<DaySlot, string> = { morning: '09:00', afternoon: '15:00' }
const DROPOFF_TIMES: Record<DaySlot, string> = { morning: '12:00', afternoon: '19:00' }

function asSlot(value: unknown): DaySlot | null {
    return value === 'morning' || value === 'afternoon' ? value : null
}

export interface BookingSlots {
    pickupSlot: DaySlot
    dropoffSlot: DaySlot
    pickupTime: string
    dropoffTime: string
}

/**
 * Tramos de recogida y devolución de la reserva. La hora siempre sale del tramo, que es lo que se
 * cobra: una hora enviada por el navegador nunca se guarda. Devuelve null si el tramo no existe.
 */
export function resolveBookingSlots(body: Record<string, unknown>): BookingSlots | null {
    const pickupSlot = asSlot(body.pickupSlot || body.startSlot || (body.pickupTime === '09:00' ? 'morning' : 'afternoon'))
    const dropoffSlot = asSlot(body.dropoffSlot || body.endSlot || (body.dropoffTime === '19:00' || body.dropoffTime === '18:00' ? 'afternoon' : 'morning'))
    if (!pickupSlot || !dropoffSlot) return null

    return {
        pickupSlot,
        dropoffSlot,
        pickupTime: PICKUP_TIMES[pickupSlot],
        dropoffTime: DROPOFF_TIMES[dropoffSlot],
    }
}

/** Fecha real con formato YYYY-MM-DD, a medianoche UTC */
function parseBookingDate(value: unknown): Date | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const date = new Date(`${value}T00:00:00Z`)
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}

export function isValidDateString(value: unknown): boolean {
    return parseBookingDate(value) !== null
}

/** Día de hoy en Mallorca, sea cual sea la zona horaria del servidor */
export function todayInBookingTimeZone(now: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: BOOKING_TIME_ZONE }).format(now)
}

export type BookingDatesResult =
    | { startDate: Date; endDate: Date; error?: undefined }
    | { error: string }

export function validateBookingDates(start: unknown, end: unknown, now: Date = new Date()): BookingDatesResult {
    const startDate = parseBookingDate(start)
    const endDate = parseBookingDate(end)

    if (!startDate || !endDate || endDate <= startDate) {
        return { error: 'Rango de fechas de reserva inválido' }
    }
    if ((start as string) < todayInBookingTimeZone(now)) {
        return { error: 'La fecha de inicio de la reserva ya ha pasado' }
    }
    if ((endDate.getTime() - startDate.getTime()) / MS_PER_DAY > MAX_BOOKING_NIGHTS) {
        return { error: `La reserva no puede superar las ${MAX_BOOKING_NIGHTS} noches. Escríbenos para estancias más largas.` }
    }
    return { startDate, endDate }
}

export function calculateAge(birthDate: Date, referenceDate: Date = new Date()): number {
    let age = referenceDate.getFullYear() - birthDate.getFullYear()
    const m = referenceDate.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) {
        age--
    }
    return age
}

export function calculateLicenseSeniorityYears(issueDate: Date, referenceDate: Date = new Date()): number {
    let years = referenceDate.getFullYear() - issueDate.getFullYear()
    const m = referenceDate.getMonth() - issueDate.getMonth()
    if (m < 0 || (m === 0 && referenceDate.getDate() < issueDate.getDate())) {
        years--
    }
    return Math.max(0, years)
}

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

/**
 * DNI, NIE o pasaporte, con la letra de control comprobada. Vivía exportado desde la ruta
 * `app/api/bookings/checkout/route.ts`, y por eso el backoffice tuvo que hacerse una copia
 * (`lib/admin/secondDriverRecord.ts`) con un test de paridad: importar una ruta de Next desde el
 * panel arrastra la ruta entera. Aquí la comparten las dos puntas.
 */
export function isValidDniNieOrPassport(value: string): { isValid: boolean; error?: string } {
    if (!value || typeof value !== 'string') {
        return { isValid: false, error: 'Documento de identidad requerido' }
    }
    const clean = value.trim().toUpperCase()

    // 1. DNI español: 8 dígitos + 1 letra de control
    const dniMatch = clean.match(/^(\d{8})([A-Z])$/)
    if (dniMatch) {
        const expectedLetter = DNI_LETTERS[parseInt(dniMatch[1], 10) % 23]
        if (dniMatch[2] === expectedLetter) return { isValid: true }
        return { isValid: false, error: `Letra de DNI incorrecta. Para el número ${dniMatch[1]}, la letra debe ser ${expectedLetter}` }
    }

    // 2. NIE español: X, Y, Z + 7 dígitos + 1 letra de control
    const nieMatch = clean.match(/^([XYZ])(\d{7})([A-Z])$/)
    if (nieMatch) {
        const prefixMap: Record<string, string> = { X: '0', Y: '1', Z: '2' }
        const expectedLetter = DNI_LETTERS[parseInt(prefixMap[nieMatch[1]] + nieMatch[2], 10) % 23]
        if (nieMatch[3] === expectedLetter) return { isValid: true }
        return { isValid: false, error: `Letra de NIE incorrecta. Se esperaba ${expectedLetter}` }
    }

    // 3. Pasaporte internacional: 6-15 caracteres alfanuméricos
    if (/^[A-Z0-9]{6,15}$/.test(clean)) return { isValid: true }

    return { isValid: false, error: 'Formato de DNI, NIE o Pasaporte no válido' }
}
