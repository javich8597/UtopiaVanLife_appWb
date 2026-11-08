import {
    calculateAge,
    calculateLicenseSeniorityYears,
    countSecondDrivers,
    isSecondDriverFlag,
    personDocument,
} from './checkoutRules'

/**
 * El segundo conductor pertenece a la RESERVA, no al cliente (decisión de Javier, 2026-11-08).
 *
 * Una cuenta puede tener varias reservas y solo algunas llevan segundo conductor: quién está
 * autorizado, con qué documento y con qué suplemento se cobró es un dato de la reserva. El perfil
 * (`users.second_driver_*`) solo vale para completar datos de lectura mientras no esté aplicada la
 * migración de columnas `bookings.second_driver_*`; nunca para decidir si hay segundo conductor ni
 * para identificar a la persona.
 *
 * Orden de verdad: columnas de la reserva → `bookings.passengers` → `pricing_breakdown` (el
 * desglose con el que se cobró).
 */

/** Requisitos del seguro, los mismos que comprueba el checkout al crear la reserva */
export const MIN_SECOND_DRIVER_AGE = 25
export const MIN_SECOND_DRIVER_LICENSE_YEARS = 2

/**
 * Estados en los que una reserva sigue viva. Una cancelada no autoriza a nadie a conducir, y una
 * `pending` sin pagar puede caducar: la documentación se admite sobre reservas vivas y pagadas.
 */
export const LIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'active', 'completed'] as const

export interface BookingSecondDriverRow {
    id?: string
    user_id?: string | null
    status?: string | null
    payment_status?: string | null
    start_date?: string | null
    passengers?: unknown
    pricing_breakdown?: unknown
    has_second_driver?: boolean | null
    second_driver_name?: string | null
    second_driver_dni?: string | null
    second_driver_license?: string | null
    second_driver_birth_date?: string | null
    second_driver_license_date?: string | null
}

export interface BookingSecondDriver {
    fullName: string
    /** Documento normalizado: es lo que identifica a la persona entre acompañantes */
    document: string
    /** Número de permiso de conducir, si consta (las fichas del asistente no lo piden) */
    licenseId: string
    birthDate: string | null
    licenseDate: string | null
    /** De dónde sale la ficha, para saber qué fiabilidad tiene */
    source: 'booking_columns' | 'passengers' | 'pricing_breakdown' | 'pricing_only'
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const dateOrNull = (value: unknown): string | null =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : null

/**
 * Forma canónica de un documento para comparar personas: sin espacios ni separadores y en
 * mayúsculas. `12345678-Z`, `12345678 z` y `12345678Z` son la misma persona.
 */
export function canonicalDocument(value: unknown): string {
    return personDocument({ dniNie: value }).replace(/[\s.\-_/]/g, '')
}

/** ¿Los dos documentos son de la misma persona? Un documento vacío nunca coincide con nada */
export function sameDocument(a: unknown, b: unknown): boolean {
    const left = canonicalDocument(a)
    return left.length > 0 && left === canonicalDocument(b)
}

function asRow(booking: unknown): Record<string, unknown> | null {
    return booking && typeof booking === 'object' ? (booking as Record<string, unknown>) : null
}

/** ¿La reserva sigue viva? Una cancelada o rechazada no autoriza nada */
export function isLiveBooking(booking: unknown): boolean {
    const row = asRow(booking)
    if (!row) return false
    const status = text(row.status)
    return (LIVE_BOOKING_STATUSES as readonly string[]).includes(status)
}

/** Solo cuenta el pago confirmado por la notificación firmada: `payment_status = 'paid'` */
export function isPaidBooking(booking: unknown): boolean {
    const row = asRow(booking)
    return !!row && text(row.payment_status) === 'paid'
}

export function isLivePaidBooking(booking: unknown): boolean {
    return isLiveBooking(booking) && isPaidBooking(booking)
}

function passengerDriver(
    passengers: unknown,
    source: BookingSecondDriver['source']
): BookingSecondDriver | null {
    if (!Array.isArray(passengers)) return null
    const found = passengers.find(isSecondDriverFlag)
    const row = asRow(found)
    if (!row) return null
    return {
        fullName: text(row.fullName ?? row.full_name ?? row.name),
        document: personDocument(row),
        licenseId: text(row.driverLicenseId ?? row.licenseId ?? row.driver_license_id),
        birthDate: dateOrNull(row.birthDate ?? row.birth_date),
        licenseDate: dateOrNull(row.licenseDate ?? row.license_date ?? row.licenseIssueDate),
        source,
    }
}

/**
 * Ficha del segundo conductor de ESTA reserva, o null si la reserva no lleva ninguno.
 *
 * Puede devolver una ficha con el documento vacío (`source: 'pricing_only'`): una reserva en la que
 * se cobró el suplemento pero no consta quién. Eso basta para que el contrato muestre el bloque,
 * pero no para autorizar a nadie: quien compare personas debe exigir `document`.
 */
export function bookingSecondDriver(booking: unknown): BookingSecondDriver | null {
    const row = asRow(booking)
    if (!row) return null

    // 1. Columnas propias de la reserva (migración 20261108). Mandan sobre todo lo demás
    const columnName = text(row.second_driver_name)
    const columnDoc = personDocument({ dniNie: row.second_driver_dni })
    if (columnName || columnDoc) {
        return {
            fullName: columnName,
            document: columnDoc,
            licenseId: text(row.second_driver_license),
            birthDate: dateOrNull(row.second_driver_birth_date),
            licenseDate: dateOrNull(row.second_driver_license_date),
            source: 'booking_columns',
        }
    }

    // 2. Fichas de acompañantes guardadas al crear la reserva
    const fromPassengers = passengerDriver(row.passengers, 'passengers')
    if (fromPassengers) return fromPassengers

    // 3. El desglose con el que se cobró: sus fichas y, en último lugar, su bandera
    const breakdown = asRow(row.pricing_breakdown)
    if (breakdown) {
        const fromBreakdown = passengerDriver(breakdown.passengers, 'pricing_breakdown')
        if (fromBreakdown) return fromBreakdown
        if (breakdown.secondDriver === true || countSecondDrivers(breakdown.passengers) > 0) {
            return { fullName: '', document: '', licenseId: '', birthDate: null, licenseDate: null, source: 'pricing_only' }
        }
    }

    // `has_second_driver` de la reserva sin ninguna ficha: se cobró, pero no consta quién
    if (row.has_second_driver === true) {
        return { fullName: '', document: '', licenseId: '', birthDate: null, licenseDate: null, source: 'pricing_only' }
    }

    return null
}

/**
 * Requisitos del segundo conductor contra la fecha de inicio de la reserva: 25 años cumplidos y 2
 * de antigüedad de carnet B. Devuelve el motivo del rechazo, o null si los cumple.
 *
 * Las fichas sin fecha (el checkout admite que el cliente indique edad o años en su lugar) no se
 * pueden recalcular aquí: no se bloquean, porque el checkout ya las validó al crear la reserva.
 */
export function secondDriverRequirementError(
    driver: Pick<BookingSecondDriver, 'birthDate' | 'licenseDate'>,
    startDate: string | null | undefined
): string | null {
    const start = dateOrNull(startDate)
    if (!start) return null
    const reference = new Date(`${start}T00:00:00Z`)

    if (driver.birthDate) {
        const age = calculateAge(new Date(`${driver.birthDate}T00:00:00Z`), reference)
        if (age < MIN_SECOND_DRIVER_AGE) {
            return `El segundo conductor debe tener al menos ${MIN_SECOND_DRIVER_AGE} años cumplidos en la fecha de recogida (edad calculada: ${age} años). Requisito obligatorio según la póliza de seguro.`
        }
    }

    if (driver.licenseDate) {
        const years = calculateLicenseSeniorityYears(new Date(`${driver.licenseDate}T00:00:00Z`), reference)
        if (years < MIN_SECOND_DRIVER_LICENSE_YEARS) {
            return `El segundo conductor debe tener al menos ${MIN_SECOND_DRIVER_LICENSE_YEARS} años de antigüedad del permiso de conducir clase B (antigüedad calculada: ${years} años). Requisito obligatorio según la póliza de seguro.`
        }
    }

    return null
}
