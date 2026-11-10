import { DOCUMENT_PREFIXES, documentsMatching, type StoredFile } from '../admin/documents'
import { SECOND_DRIVER_DOCUMENT_PREFIXES } from '../admin/secondDriverDocuments'
import { bookingReturnDay, dateOrNull, isLiveBooking, madridDay } from './secondDriver'

/**
 * POLÍTICA DE CONSERVACIÓN DE LA DOCUMENTACIÓN DE IDENTIDAD (decisión de Javier, 2026-11-10):
 *
 *   «Purgar imágenes de Storage a los 100 días tras la devolución; retener datos legales 3 años por
 *    RD 933/2021».
 *
 * Son DOS plazos distintos sobre la misma reserva:
 *   - IMÁGENES: las fotos de DNI y carnet del bucket privado `documents` se borran a los 100 días de
 *     la devolución. Hasta ahora no se borraba nada y cada reenvío del formulario dejaba otra copia.
 *   - DATOS LEGALES: los datos de identidad que exige el RD 933/2021 para el registro de viajeros
 *     (los que arma `lib/sesHospedajes/xmlGenerator.ts`) se conservan 3 años y se borran después.
 *
 * El día de referencia es el de la DEVOLUCIÓN (`bookings.end_date`, o `start_date` si no consta),
 * medido en días de Europe/Madrid como el resto del dominio: la devolución es un día de Mallorca y
 * ni la hora del servidor (UTC) ni la del navegador sirven para decidir si un plazo venció.
 *
 * Aquí solo hay funciones puras: ninguna lee Supabase, ninguna borra nada y ninguna usa el reloj
 * salvo a través del `now` que se le pasa. Quien ejecuta la purga es
 * `app/api/admin/retention/documents/route.ts`.
 *
 * Lo que este módulo NO decide (y hace falta saber antes de confiar en él):
 *   - Las fotos del TITULAR viven en `documents/<cliente>/`, una sola carpeta para TODAS sus
 *     reservas: no se pueden borrar por reserva. Ver `holderImagePurgeDecision`.
 *   - Los datos de identidad del PERFIL (`public.users`) también son de la cuenta, no de la reserva:
 *     este módulo los sitúa (`accountLegalPurgeDecision`) pero la purga no los toca.
 *   - Las fotos de entregas y del estado del vehículo están en otros buckets (`handovers`,
 *     `vehicle-docs`) y no entran: su finalidad es otra (daños y reclamaciones).
 */

/** 100 días tras la devolución para las imágenes de Storage */
export const IDENTITY_IMAGE_RETENTION_DAYS = 100

/** 3 años tras la devolución para los datos del registro de viajeros (RD 933/2021) */
export const LEGAL_DATA_RETENTION_YEARS = 3

/* -------------------------------------------------------------------------- */
/* Aritmética de días civiles                                                  */
/* -------------------------------------------------------------------------- */

const pad = (value: number) => String(value).padStart(2, '0')

/** `YYYY-MM-DD` de una fecha construida con `Date.UTC`: se leen sus componentes UTC, sin desfases */
const utcDay = (time: number): string => {
    const date = new Date(time)
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/**
 * Suma días a un día civil `YYYY-MM-DD`. Devuelve '' si el día no es válido.
 *
 * Se calcula en UTC y se lee en UTC: el resultado no depende de la zona de la máquina y no pasa por
 * `toISOString()` sobre una fecha local (los desplazamientos de un día del historial venían de ahí).
 */
export function addDaysToDay(day: unknown, days: number): string {
    const valid = dateOrNull(day)
    if (!valid) return ''
    const [year, month, date] = valid.split('-').map(Number)
    return utcDay(Date.UTC(year, month - 1, date + days))
}

/**
 * Suma años a un día civil `YYYY-MM-DD`. Devuelve '' si el día no es válido.
 *
 * Un 29 de febrero más 3 años no existe: rueda al 1 de marzo (un día MÁS de conservación, nunca uno
 * menos). Es la opción conservadora para un plazo de borrado.
 */
export function addYearsToDay(day: unknown, years: number): string {
    const valid = dateOrNull(day)
    if (!valid) return ''
    const [year, month, date] = valid.split('-').map(Number)
    return utcDay(Date.UTC(year + years, month - 1, date))
}

/* -------------------------------------------------------------------------- */
/* Los dos plazos sobre una reserva                                            */
/* -------------------------------------------------------------------------- */

export interface BookingRetentionRow {
    id?: string | null
    user_id?: string | null
    status?: string | null
    start_date?: string | null
    /** Día de devolución: es el que pone los dos plazos */
    end_date?: string | null
    [key: string]: unknown
}

/** Día en que se borran las imágenes de identidad de esta reserva; '' si la reserva no se puede situar */
export function identityImagePurgeDay(booking: unknown): string {
    return addDaysToDay(bookingReturnDay(booking), IDENTITY_IMAGE_RETENTION_DAYS)
}

/** Día en que se borran los datos del registro de viajeros; '' si la reserva no se puede situar */
export function legalDataPurgeDay(booking: unknown): string {
    return addYearsToDay(bookingReturnDay(booking), LEGAL_DATA_RETENTION_YEARS)
}

/**
 * ¿Venció ya ese día de purga? El plazo vence EL PROPIO día calculado, no al siguiente: con la
 * devolución el día D, el día D+100 ya es el día 100 cumplido y las imágenes se borran.
 *
 * Un día vacío nunca vence: una reserva que no se puede situar no se purga sola (ver
 * `BookingRetentionPlan.blocked`).
 */
export function isPurgeDayDue(purgeDay: string, now: Date = new Date()): boolean {
    return purgeDay.length > 0 && madridDay(now) >= purgeDay
}

export interface BookingRetentionPlan {
    bookingId: string
    userId: string | null
    /** Día de devolución del que cuelgan los dos plazos */
    returnDay: string
    imagePurgeDay: string
    legalPurgeDay: string
    imageDue: boolean
    legalDue: boolean
    /** Por qué esta reserva no se puede purgar sola; null si sí se puede */
    blocked: 'no_dates' | 'no_id' | null
}

/** Los dos plazos de UNA reserva, situados contra `now` */
export function bookingRetentionPlan(booking: unknown, now: Date = new Date()): BookingRetentionPlan {
    const row = (booking && typeof booking === 'object' ? booking : {}) as BookingRetentionRow
    const bookingId = typeof row.id === 'string' ? row.id : ''
    const returnDay = bookingReturnDay(row)
    const imageDay = identityImagePurgeDay(row)
    const legalDay = legalDataPurgeDay(row)
    return {
        bookingId,
        userId: typeof row.user_id === 'string' && row.user_id ? row.user_id : null,
        returnDay,
        imagePurgeDay: imageDay,
        legalPurgeDay: legalDay,
        imageDue: isPurgeDayDue(imageDay, now),
        legalDue: isPurgeDayDue(legalDay, now),
        blocked: !bookingId ? 'no_id' : !returnDay ? 'no_dates' : null,
    }
}

/**
 * Reservas con la purga de IMÁGENES pendiente, de la más antigua a la más reciente.
 *
 * Entran también las canceladas, rechazadas y caducadas: su viaje no se hizo, así que las fotos de
 * su carpeta tienen menos motivo aún para seguir ahí. Lo que una reserva muerta NO puede hacer es
 * alargar la conservación de la carpeta compartida del titular (ver `holderImagePurgeDecision`).
 */
export function pendingImagePurges(
    bookings: readonly unknown[] | null | undefined,
    now: Date = new Date()
): BookingRetentionPlan[] {
    return (bookings || [])
        .map(booking => bookingRetentionPlan(booking, now))
        .filter(plan => !plan.blocked && plan.imageDue)
        .sort(byPurgeDay)
}

/** Reservas con la purga de DATOS LEGALES pendiente, de la más antigua a la más reciente */
export function pendingLegalPurges(
    bookings: readonly unknown[] | null | undefined,
    now: Date = new Date()
): BookingRetentionPlan[] {
    return (bookings || [])
        .map(booking => bookingRetentionPlan(booking, now))
        .filter(plan => !plan.blocked && plan.legalDue)
        .sort(byPurgeDay)
}

const byPurgeDay = (a: BookingRetentionPlan, b: BookingRetentionPlan) =>
    a.returnDay.localeCompare(b.returnDay) || a.bookingId.localeCompare(b.bookingId)

/* -------------------------------------------------------------------------- */
/* La carpeta del titular es de la CUENTA, no de la reserva                     */
/* -------------------------------------------------------------------------- */

export type HolderPurgeReason =
    /** Vencido: la última reserva que cuenta pasó el plazo */
    | 'due'
    /** Todavía no: alguna reserva que cuenta está dentro del plazo */
    | 'retained'
    /** La cuenta no tiene ninguna reserva: el plazo no se puede situar */
    | 'no_bookings'
    /** Alguna reserva que cuenta no tiene fechas: no se purga a ciegas */
    | 'undatable_booking'

export interface HolderImagePurgeDecision {
    /** Día en que se pueden borrar las fotos del titular; '' si no se puede decidir */
    purgeDay: string
    due: boolean
    reason: HolderPurgeReason
}

/**
 * ¿Se pueden borrar ya las fotos de identidad del TITULAR de una cuenta?
 *
 * `/api/upload-driver-docs` guarda las del titular en `documents/<cliente>/`, la MISMA carpeta para
 * todas sus reservas (las del 2º conductor sí bajan a `documents/<cliente>/<reserva>/`). Así que
 * aplicar el plazo reserva a reserva borraría el DNI que todavía hace falta para la reserva
 * siguiente de ese mismo cliente. El plazo de la carpeta es el de la ÚLTIMA reserva que cuenta.
 *
 * Qué reservas cuentan: las vivas (`pending`, `confirmed`, `active`, `completed`). Una cancelada no
 * alarga nada, porque ese viaje no se hizo. Si la cuenta solo tiene reservas muertas se usan esas,
 * para que la carpeta llegue a purgarse en vez de quedarse para siempre.
 *
 * Si alguna reserva que cuenta no tiene fechas, no se purga: `undatable_booking`, para revisarlo a
 * mano. Es el mismo criterio que el plazo de subida, que tampoco sitúa una reserva sin fechas.
 */
export function holderImagePurgeDecision(
    bookings: readonly unknown[] | null | undefined,
    now: Date = new Date()
): HolderImagePurgeDecision {
    const all = (bookings || []).filter(booking => booking && typeof booking === 'object')
    if (all.length === 0) return { purgeDay: '', due: false, reason: 'no_bookings' }

    const live = all.filter(isLiveBooking)
    const counted = live.length > 0 ? live : all

    if (counted.some(booking => !bookingReturnDay(booking))) {
        return { purgeDay: '', due: false, reason: 'undatable_booking' }
    }

    const purgeDay = counted
        .map(booking => identityImagePurgeDay(booking))
        .reduce((latest, day) => (day > latest ? day : latest), '')
    const due = isPurgeDayDue(purgeDay, now)
    return { purgeDay, due, reason: due ? 'due' : 'retained' }
}

/**
 * Los DATOS LEGALES del perfil (`public.users`: nombre, DNI, fecha de nacimiento, dirección,
 * teléfono, carnet…) también son de la cuenta y no de la reserva, y su plazo NO está decidido:
 * vaciar el perfil es, de hecho, borrar la cuenta, y eso lo decide Javier aparte.
 *
 * Aquí NO hay ninguna función para eso a propósito. Había una (`accountLegalPurgeDecision`) que solo
 * ejercitaban los tests, y un ayudante exportado que nadie llama parece código vivo y no lo es
 * (hallazgo de `seguridad-auditor`, 2026-11-10). Cuando Javier decida el plazo del perfil, se
 * escribe entonces: sería `holderImagePurgeDecision` con `legalDataPurgeDay` en lugar de
 * `identityImagePurgeDay`.
 */

/* -------------------------------------------------------------------------- */
/* Qué archivos de Storage son imágenes de identidad                           */
/* -------------------------------------------------------------------------- */

/** Prefijos de las fotos del TITULAR en `documents/<cliente>/` (DNI y carnet, anverso y reverso) */
export const HOLDER_IDENTITY_PREFIXES: string[] = Object.values(DOCUMENT_PREFIXES).flat()

/** Prefijos de las fotos del 2º CONDUCTOR, tanto en la carpeta de la reserva como sueltas (antiguas) */
export const SECOND_DRIVER_IDENTITY_PREFIXES: string[] = Object.values(SECOND_DRIVER_DOCUMENT_PREFIXES).flat()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface IdentityFileSelection {
    /** Nombres de archivo que SÍ son imágenes de identidad: todas las copias, no solo la última */
    purge: string[]
    /** Entradas que son subcarpetas de reserva (Storage las lista como un nombre sin extensión) */
    folders: string[]
    /** Lo que no se reconoce: no se borra y se informa, para no llevarse nada por delante */
    unknown: string[]
}

/**
 * Clasifica lo que `storage.list()` devolvió de una carpeta: qué se borra, qué son subcarpetas y qué
 * no se reconoce.
 *
 * Solo se borra lo que coincide EXACTO con un prefijo conocido más un UUID o un timestamp
 * (`documentsMatching`). Un archivo con cualquier otro nombre se deja y se informa: si alguien
 * guardó algo más en esa carpeta, esta purga no es quien debe decidir borrarlo.
 */
export function selectIdentityFiles(
    files: readonly StoredFile[] | null | undefined,
    prefixes: readonly string[]
): IdentityFileSelection {
    const list = (files || []).filter(file => typeof file?.name === 'string' && file.name.length > 0)
    const purge = documentsMatching(list as StoredFile[], [...prefixes])
    const purgeSet = new Set(purge)
    const folders = list.map(f => f.name).filter(name => !purgeSet.has(name) && UUID_RE.test(name))
    const folderSet = new Set(folders)
    const unknown = list.map(f => f.name).filter(name => !purgeSet.has(name) && !folderSet.has(name))
    return { purge, folders, unknown }
}

/** Rutas completas dentro del bucket `documents` para los nombres de una carpeta */
export function storagePaths(folder: string, names: readonly string[]): string[] {
    return names.map(name => `${folder}/${name}`)
}

/** Cuántos caracteres de un nombre no reconocido se pueden repetir en una respuesta */
export const UNKNOWN_NAME_SAMPLE_LENGTH = 10

/**
 * Cómo se informa de los archivos que la purga NO reconoce, sin repetir sus nombres.
 *
 * Un archivo subido a mano puede llevar datos personales en el propio nombre («dni-ana-perez.jpg»),
 * y la respuesta de la ruta los reproducía enteros (hallazgo de `seguridad-auditor`, 2026-11-10).
 * Se devuelve el recuento y, como mucho, tres nombres recortados, lo justo para reconocer el tipo de
 * archivo y poder ir a mirarlo en Storage.
 */
export function describeUnknownNames(
    names: readonly string[] | null | undefined,
    maxSamples = 3
): { count: number; sample: string[] } {
    const list = (names || []).filter(name => typeof name === 'string' && name.length > 0)
    return {
        count: list.length,
        sample: list.slice(0, maxSamples).map(name =>
            name.length > UNKNOWN_NAME_SAMPLE_LENGTH ? `${name.slice(0, UNKNOWN_NAME_SAMPLE_LENGTH)}…` : name),
    }
}

/* -------------------------------------------------------------------------- */
/* Qué columnas son «datos legales» del RD 933/2021                            */
/* -------------------------------------------------------------------------- */

/**
 * Columnas de `bookings` que alimentan el registro de viajeros del RD 933/2021.
 *
 * Salen de leer `lib/sesHospedajes/xmlGenerator.ts` (el XML que se transmite al Ministerio): la
 * identidad del titular y del 2º conductor. El generador lee primero el perfil (`users.*`) y usa
 * estas columnas de respaldo (`customer_name`, `customer_dni`, `passengers`,
 * `second_driver_*`), así que son copias de la identidad guardadas EN la reserva.
 *
 * Lo que NO entra, aunque también viaje en ese XML: las fechas, las horas de recogida y devolución,
 * la camper, el importe, el medio de pago y `notes`. Son datos de la operación, hacen falta para la
 * contabilidad y no identifican a nadie por sí solos.
 */
export const BOOKING_LEGAL_DATA_COLUMNS = [
    // Escritas por /api/bookings/checkout al crear la reserva
    'customer_name',
    'customer_email',
    'customer_phone',
    'customer_dni',
    'customer_address',
    'passengers',
    // Escritas por el backoffice y por la subida de documentación (migración 20261108)
    'second_driver_name',
    'second_driver_dni',
    'second_driver_license',
    'second_driver_birth_date',
    'second_driver_license_date',
    // El generador del XML las lee de la reserva (`booking?.X`) como respaldo del perfil, pero
    // ninguna ruta las escribe: puede que no existan en la base. Entran por si existen, porque solo
    // se vacía lo que de verdad está en la fila y trae algo. Todas son identidad del viajero.
    'customer_birth_date',
    'customer_city',
    'customer_gender',
    'nationality',
    'country_code',
    'postal_code',
    'municipality_code',
    'municipality_name',
    'driver_license_expiry_date',
] as const

/**
 * Identidad guardada en la reserva que esta purga NO toca, y por qué. Pendiente de Javier:
 *   - `contract_signature`: la firma manuscrita del contrato. No es un dato del registro de
 *     viajeros, y el contrato es la prueba de la relación contractual (plazos civiles y fiscales,
 *     más largos que 3 años). Borrarla deja el contrato sin firmar.
 *   - `documents/contracts/<reserva>_contrato_firmado.pdf`: el PDF archivado, por lo mismo.
 *   - `pricing_breakdown`: el desglose con el que se cobró. Es el registro contable; lo único de
 *     identidad que guarda son sus fichas de acompañantes, que se redactan aparte
 *     (`redactPricingBreakdown`) sin tocar los importes.
 */
export const BOOKING_IDENTITY_NOT_PURGED = ['contract_signature', 'contract_pdf_url', 'pricing_breakdown'] as const

const isEmptyValue = (value: unknown): boolean =>
    value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

/**
 * Copia del desglose sin las fichas de acompañantes, o null si no hay nada que redactar.
 *
 * `pricing_breakdown.passengers` repite nombre, documento y fechas de los viajeros (lo lee
 * `bookingSecondDriver` como tercera fuente). Se quita esa clave y se deja el resto intacto: los
 * importes son el registro contable de lo que se cobró y no se tocan.
 */
export function redactPricingBreakdown(breakdown: unknown): Record<string, unknown> | null {
    if (!breakdown || typeof breakdown !== 'object' || Array.isArray(breakdown)) return null
    const row = breakdown as Record<string, unknown>
    if (!('passengers' in row) || isEmptyValue(row.passengers)) return null
    const copy: Record<string, unknown> = { ...row }
    delete copy.passengers
    return copy
}

/**
 * Lo que hay que escribir en la reserva para borrar sus datos del registro de viajeros.
 *
 * Solo entran columnas que EXISTEN en la fila leída y que todavía tienen algo: las de la migración
 * 20261108 (`second_driver_*`) no están aplicadas en la base real, y una fila sin esas claves no
 * debe hacer fallar la purga. Devuelve `{}` cuando no queda nada que borrar, que es lo que hace
 * idempotente la segunda ejecución.
 *
 * `passengers` se deja en `[]` y no en null: el código recorre ese array con `Array.isArray`, y una
 * lista vacía dice «no consta ningún viajero» sin romper nada.
 */
export function legalDataPurgePatch(booking: unknown): Record<string, unknown> {
    const row = (booking && typeof booking === 'object' ? booking : {}) as Record<string, unknown>
    const patch: Record<string, unknown> = {}
    for (const column of BOOKING_LEGAL_DATA_COLUMNS) {
        if (!(column in row) || isEmptyValue(row[column])) continue
        patch[column] = column === 'passengers' ? [] : null
    }
    if ('pricing_breakdown' in row) {
        const redacted = redactPricingBreakdown(row.pricing_breakdown)
        if (redacted) patch.pricing_breakdown = redacted
    }
    return patch
}

/** Qué columnas borraría esa purga, en orden, para poder enseñarlo sin enseñar ningún valor */
export function legalDataPurgeColumns(booking: unknown): string[] {
    return Object.keys(legalDataPurgePatch(booking)).sort()
}

/* -------------------------------------------------------------------------- */
/* Constancia de lo purgado                                                    */
/* -------------------------------------------------------------------------- */

/** Columnas de constancia que añade `20261110_document_retention_policy.sql` a `bookings` */
export const RETENTION_AUDIT_COLUMNS = [
    'identity_images_purged_at',
    'identity_images_purged_count',
    'legal_data_purged_at',
] as const

/** Ámbitos que registra `retention_purge_log` */
export type RetentionScope = 'booking_images' | 'holder_images' | 'booking_legal_data'

export interface RetentionPurgeEntry {
    scope: RetentionScope
    bookingId: string | null
    userId: string | null
    /** Día de purga que venció (`YYYY-MM-DD`) */
    purgeDay: string
    /** Rutas de Storage borradas, o columnas vaciadas. Nunca valores */
    items: string[]
}

/** Resumen de una ejecución, para el registro y para la respuesta de la ruta */
export function summarizePurge(entries: readonly RetentionPurgeEntry[]): {
    files: number
    columns: number
    bookings: number
    holders: number
} {
    const bookings = new Set<string>()
    const holders = new Set<string>()
    let files = 0
    let columns = 0
    for (const entry of entries) {
        if (entry.scope === 'booking_legal_data') columns += entry.items.length
        else files += entry.items.length
        if (entry.scope === 'holder_images' && entry.userId) holders.add(entry.userId)
        else if (entry.bookingId) bookings.add(entry.bookingId)
    }
    return { files, columns, bookings: bookings.size, holders: holders.size }
}

/**
 * Día más tardío que hay que pedir a la base para encontrar candidatos: devoluciones anteriores o
 * iguales a `hoy - 100 días` (el plazo más corto). El de 3 años queda dentro de ese filtro.
 */
export function imageCandidateCutoffDay(now: Date = new Date()): string {
    return addDaysToDay(madridDay(now), -IDENTITY_IMAGE_RETENTION_DAYS)
}

/** Día de corte para los datos legales: devoluciones anteriores o iguales a `hoy - 3 años` */
export function legalCandidateCutoffDay(now: Date = new Date()): string {
    return addYearsToDay(madridDay(now), -LEGAL_DATA_RETENTION_YEARS)
}
