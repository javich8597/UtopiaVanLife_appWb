import {
    calculateAge,
    calculateLicenseSeniorityYears,
    countSecondDrivers,
    isSecondDriverFlag,
    personDocument,
} from './checkoutRules'
import { normalizeDriverText } from '../driverDocuments'

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
    /** Día de devolución: es el que pone el plazo de subida (`uploadDeadlineDay`) */
    end_date?: string | null
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

/** `YYYY-MM-DD` o null. Las fechas de reserva son cadenas: nunca se pasan por `Date` para leerlas */
export const dateOrNull = (value: unknown): string | null =>
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

/**
 * Forma canónica de un nombre para comparar personas: normalizado como lo guarda la subida, con los
 * espacios colapsados, sin acentos y en minúsculas. `Luis  Pérez` y `luis perez` son el mismo
 * nombre; `Mario Impostor` no.
 */
export function canonicalName(value: unknown): string {
    if (typeof value !== 'string') return ''
    return (normalizeDriverText(value) || '')
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLocaleLowerCase('es-ES')
        .trim()
}

/**
 * ¿Los dos nombres son el mismo? Un nombre vacío nunca coincide con nada.
 *
 * El nombre del 2º conductor lo validó el checkout y queda en la ficha de la reserva: la subida solo
 * puede confirmarlo, nunca reescribirlo (hallazgo QA-SD-11: acertando el documento, el titular
 * dejaba el contrato facultando a otra persona).
 */
export function sameDriverName(a: unknown, b: unknown): boolean {
    const left = canonicalName(a)
    return left.length > 0 && left === canonicalName(b)
}

/**
 * Los tres datos de la persona autorizada (nombre, documento y nº de carnet) salen de la ficha de la
 * reserva y de ningún otro sitio (decisión de Javier, 2026-11-09, hallazgos QA-SD-11, QA-SD-13 y N2).
 *
 * El formulario de `/dashboard/datos` los manda de solo lectura, prellenados desde la ficha, así que
 * lo que la ficha no trae llega vacío. Vacío no es un conflicto: se sube la documentación y el dato
 * queda pendiente (el contrato dirá «Pendiente de verificación»). Lo que no se acepta nunca es un
 * valor DISTINTO al de la ficha: antes bastaba acertar el documento para que el titular tecleara
 * cualquier nombre o cualquier nº de carnet y el contrato facultara a esa persona con ese permiso.
 *
 * Devuelve el mensaje que hay que responder al cliente, o null si no hay conflicto. El valor que se
 * guarda es siempre el de la ficha.
 */
export function secondDriverNameConflict(submitted: unknown, booked: unknown): string | null {
    const sent = typeof submitted === 'string' ? submitted.trim() : ''
    if (!sent) return null
    const onFile = typeof booked === 'string' ? booked.trim() : ''
    if (!onFile) {
        return 'Tu reserva no guarda el nombre completo del segundo conductor, así que no podemos dar por bueno el que has escrito. Déjalo en blanco para subir sus fotos y escríbenos para completar la ficha de tu reserva: el nombre que se autoriza en el contrato es el de la reserva.'
    }
    if (!sameDriverName(sent, onFile)) {
        return `El nombre del segundo conductor no coincide con el de tu reserva (${onFile}). Escríbenos para corregirlo: el nombre de la reserva es el que se autoriza en el contrato.`
    }
    return null
}

/** Igual que el nombre: el nº de carnet solo puede venir de la ficha de la reserva (hallazgo N2) */
export function secondDriverLicenseConflict(submitted: unknown, booked: unknown): string | null {
    const sent = typeof submitted === 'string' ? submitted.trim() : ''
    if (!sent) return null
    const onFile = typeof booked === 'string' ? booked.trim() : ''
    if (!onFile) {
        return 'Tu reserva no guarda el número de carnet del segundo conductor, así que no podemos dar por bueno el que has escrito. Déjalo en blanco para subir sus fotos y escríbenos para completar la ficha de tu reserva: el permiso que se autoriza en el contrato es el de la reserva.'
    }
    // El número no se repite en el mensaje: es un dato de identidad y el cliente ya lo tiene delante
    if (sent !== onFile) {
        return 'El número de carnet del segundo conductor no coincide con el que consta en tu reserva. Escríbenos para corregirlo: el permiso que se autoriza en el contrato es el de la reserva.'
    }
    return null
}

/**
 * Día de calendario de "hoy" en Mallorca (`YYYY-MM-DD`). La devolución es un día de allí: el
 * servidor corre en UTC y un cliente puede conectarse desde otra zona, así que ni la hora del
 * servidor ni la del navegador sirven para saber si el viaje ya terminó.
 */
export function madridDay(now: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now)
    const get = (type: string) => parts.find(part => part.type === type)?.value || ''
    return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * Día de devolución de la reserva (`end_date`, o la recogida si no consta).
 *
 * Es el día desde el que se cuentan los plazos del dominio: el de subida de documentación (aquí) y
 * los de conservación (`lib/booking/dataRetention.ts`). Devuelve '' si la reserva no se puede situar.
 */
export function bookingReturnDay(booking: unknown): string {
    const row = asRow(booking)
    if (!row) return ''
    return dateOrNull(row.end_date) || dateOrNull(row.start_date) || ''
}

/** Alias interno histórico de `bookingReturnDay` */
const returnDay = bookingReturnDay

/**
 * Último día en que el cliente puede subir documentación, o '' si la reserva no se puede situar.
 *
 * Es el día de la DEVOLUCIÓN (decisión de Javier, 2026-11-10): el cliente puede subirla hasta que
 * devuelve la camper, y a partir de ahí la comprobamos nosotros con los documentos físicos. Antes de
 * eso, la entrega de llaves ya suele haber cerrado el plazo; esto es el cierre de respaldo para las
 * reservas de las que nadie registró la entrega, que si no se quedaban abiertas para siempre.
 *
 * Coincide con lo que ya hacía el panel del cliente (`lib/user/secondDriverBookings.ts`), que solo
 * ofrece reservas con el viaje por delante: así la regla y la pantalla dicen lo mismo.
 */
export function uploadDeadlineDay(booking: unknown): string {
    return returnDay(booking)
}

/**
 * ¿Esta entrega de recogida está CERRADA? Lo dice `handovers.completed_at`, que es la misma marca
 * que usa el panel: `app/api/admin/handovers/route.ts` solo la escribe después de exigir que no
 * quede ningún paso pendiente (`incompleteSteps` de `lib/handover/checklist.ts`), y entre esos pasos
 * está la comprobación del 2º conductor que el panel añade según la reserva.
 *
 * No se recalcula el checklist aquí: `missingSteps(row)` sin opciones NO incluye ese paso, así que
 * una entrega con todo lo demás hecho parecería cerrada sin que nadie hubiera comprobado a esa
 * persona (aviso de `panel-admin`, 2026-11-10).
 *
 * Una fila que no sea de recogida (`kind: 'return'`) nunca cierra la subida: la documentación hace
 * falta antes de dar las llaves, no antes de recogerlas.
 */
export function isPickupHandoverClosed(handover: unknown): boolean {
    const row = asRow(handover)
    if (!row || text(row.kind) !== 'pickup') return false
    return text(row.completed_at).length > 0
}

/** Reservas con la entrega de recogida cerrada, a partir de las filas de `handovers` */
export function closedPickupBookingIds(handovers: readonly unknown[] | null | undefined): Set<string> {
    const ids = new Set<string>()
    for (const handover of handovers || []) {
        if (!isPickupHandoverClosed(handover)) continue
        const id = text(asRow(handover)?.booking_id)
        if (id) ids.add(id)
    }
    return ids
}

export interface UploadWindowOptions {
    /** Ids de reserva con la entrega de recogida cerrada (`closedPickupBookingIds`) */
    closedPickups?: ReadonlySet<string> | null
    /** Momento con el que se mide el tope; por defecto, ahora */
    now?: Date
}

/** `open`: se admite documentación. Los demás son los motivos por los que no */
export type UploadWindowState = 'open' | 'handed_over' | 'returned' | 'not_schedulable'

/**
 * ¿Esta reserva sigue admitiendo documentación del 2º conductor?
 *
 * Lo decide la ENTREGA, no el calendario (decisión de Javier, 2026-11-09): se admite mientras no
 * haya una entrega de recogida cerrada para esa reserva. Tiene más sentido que una fecha inventada,
 * porque la documentación hace falta antes de dar las llaves y en la entrega el admin la comprueba.
 *
 * El cierre por fechas queda como respaldo, para las reservas que la entrega no puede cerrar
 * (decisión de Javier, 2026-11-10): una sin fechas no autoriza nada, porque sin la fecha de recogida
 * tampoco se pueden recomprobar los 25 años ni los 2 de carnet, y una de la que NADIE registró la
 * entrega se cierra el día de la devolución (`uploadDeadlineDay`), para que un viaje de hace años
 * mal registrado no se quede admitiendo documentación para siempre.
 *
 * La entrega manda sobre las fechas: con la recogida cerrada el motivo es `handed_over` aunque
 * además haya pasado la devolución, porque es lo que de verdad le ocurrió a esa reserva. Y una
 * reserva ya `completed` se cierra ese mismo día, sin esperar a medianoche: la devolución está
 * registrada y la documentación se comprueba en persona a partir de ahí.
 */
export function uploadWindowState(booking: unknown, options: UploadWindowOptions = {}): UploadWindowState {
    const row = asRow(booking)
    if (!row) return 'not_schedulable'
    // La entrega va primero, también por delante de la falta de fechas: es lo que de verdad le pasó
    // a esa reserva, y decir «no tiene fecha de recogida» a quien ya tiene la camper confunde
    const id = text(row.id)
    if (id && options.closedPickups?.has(id)) return 'handed_over'
    // La devolución ya registrada cierra el plazo ese mismo día (decisión de Javier, 2026-11-10):
    // `completed` lo escribe el panel al cerrar la entrega de devolución, con la camper ya revisada
    // en persona. Es lo que ya hacía el panel del cliente, así que regla y pantalla coinciden
    if (text(row.status) === 'completed') return 'returned'
    // Sin fecha de RECOGIDA no se puede situar la reserva aunque haya devolución: sin ella no se
    // recomprueban los 25 años ni los 2 de carnet, y la ruta acaba rechazando por ese mismo motivo
    const deadline = dateOrNull(row.start_date) ? uploadDeadlineDay(row) : ''
    if (!deadline) return 'not_schedulable'
    if (madridDay(options.now || new Date()) > deadline) return 'returned'
    return 'open'
}

/** ¿Se admite documentación del 2º conductor en esta reserva? */
export function isUploadWindowOpen(booking: unknown, options: UploadWindowOptions = {}): boolean {
    return uploadWindowState(booking, options) === 'open'
}

/** Lo que se responde al cliente cuando su reserva ya no admite documentación; null si sí la admite */
export function uploadWindowClosedMessage(state: UploadWindowState): string | null {
    if (state === 'handed_over') {
        return 'La camper de esa reserva ya está entregada, así que su documentación ya no se puede subir aquí: a partir de la entrega de llaves la comprobamos nosotros con los documentos físicos. Escríbenos y lo resolvemos contigo.'
    }
    if (state === 'returned') {
        return 'La camper de esa reserva ya está devuelta, así que su documentación ya no se puede subir aquí: el plazo termina el día de la devolución y a partir de ahí la comprobamos nosotros con los documentos físicos. Escríbenos y lo resolvemos contigo.'
    }
    if (state === 'not_schedulable') {
        return 'La reserva que autoriza a ese segundo conductor no tiene fecha de recogida, así que no podemos comprobar los requisitos del seguro ni admitir su documentación. Escríbenos y lo resolvemos contigo.'
    }
    return null
}

/**
 * Mensaje que explica por qué ninguna de esas reservas admite la documentación, o null si alguna sí.
 *
 * Con varias reservas de la misma persona manda el motivo más probable: la entrega, después la
 * devolución y en último lugar las fechas, porque lo normal es que el cliente llegue tarde a subirla,
 * no que su reserva no tenga fechas.
 */
export function uploadWindowRejection(
    rows: readonly unknown[],
    options: UploadWindowOptions = {}
): string | null {
    const states = rows.map(row => uploadWindowState(row, options))
    if (states.length === 0 || states.includes('open')) return null
    const reason = (['handed_over', 'returned', 'not_schedulable'] as const).find(state => states.includes(state))
    return uploadWindowClosedMessage(reason || 'not_schedulable')
}

/**
 * Reservas que autorizan a subir la documentación de ESE documento, de la más próxima a la más
 * lejana. La consulta de la ruta no ordena y se quedaba con la primera fila que devolviera Postgres:
 * con dos reservas de la misma persona, la ficha y las fotos podían acabar en la lejana y la próxima
 * quedarse sin documentación (hallazgo QA-SD-7).
 *
 * Solo entran reservas vivas, pagadas y con el viaje por delante. La consulta de la ruta ya lo filtra; esto es para que el
 * siguiente que use este ayudante no tenga que acordarse de repetirlo.
 */
export function uploadableSecondDriverBookings<T extends BookingSecondDriverRow>(
    rows: readonly T[],
    document: string,
    options: UploadWindowOptions = {}
): Array<{ row: T; driver: BookingSecondDriver }> {
    return rows
        .map(row => ({ row, driver: bookingSecondDriver(row) }))
        // Un 2º conductor cobrado del que no consta el documento no autoriza a nadie
        .filter((candidate): candidate is { row: T; driver: BookingSecondDriver } =>
            !!candidate.driver?.document && sameDocument(document, candidate.driver.document))
        .filter(({ row }) => isLivePaidBooking(row) && isUploadWindowOpen(row, options))
        .sort((a, b) =>
            (dateOrNull(a.row.start_date) || '9999-12-31').localeCompare(dateOrNull(b.row.start_date) || '9999-12-31') ||
            returnDay(a.row).localeCompare(returnDay(b.row)) ||
            String(a.row.id || '').localeCompare(String(b.row.id || '')))
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
 * Las dos fechas son obligatorias: el paso 5 y el checkout las piden, así que una ficha sin ellas no
 * se validó nunca contra la póliza (antes el checkout aceptaba una edad o unos años autodeclarados y
 * aquí no quedaba nada que recalcular). Sin la fecha de recogida tampoco se puede comprobar nada.
 */
export function secondDriverRequirementError(
    driver: Pick<BookingSecondDriver, 'birthDate' | 'licenseDate'>,
    startDate: string | null | undefined
): string | null {
    if (!driver.birthDate) {
        return `La ficha del segundo conductor de tu reserva no guarda su fecha de nacimiento, obligatoria para comprobar los ${MIN_SECOND_DRIVER_AGE} años que exige la póliza de seguro. Escríbenos para completarla antes de subir su documentación.`
    }
    if (!driver.licenseDate) {
        return `La ficha del segundo conductor de tu reserva no guarda la fecha de expedición de su permiso de conducir, obligatoria para comprobar los ${MIN_SECOND_DRIVER_LICENSE_YEARS} años de antigüedad que exige la póliza de seguro. Escríbenos para completarla antes de subir su documentación.`
    }

    const start = dateOrNull(startDate)
    if (!start) {
        return 'La reserva que autoriza a ese segundo conductor no tiene fecha de recogida: no podemos comprobar los requisitos del seguro. Escríbenos.'
    }
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
