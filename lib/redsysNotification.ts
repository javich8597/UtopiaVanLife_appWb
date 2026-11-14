import type { SupabaseClient } from '@supabase/supabase-js'
import { isRedsysSuccess, isValidRedsysOrderId, RedsysNotificationParams } from './redsys'
import { isBookingRangeFree } from './booking/calendarLogic'
import { activePaymentAlerts } from './admin/bookingStatus'
import { isSmtpConfigured } from './email/smtpClient'
import { sendBookingConfirmationEmails } from './email/bookingConfirmationEmail'

/**
 * Qué hacer con una notificación de Redsys ya firmada y válida.
 *
 * Redsys puede repetir notificaciones y entregarlas tarde o desordenadas, así que el resultado
 * depende del estado actual de la reserva. La notificación nunca cambia `status`: aceptar o
 * rechazar una reserva es decisión del admin.
 */

export interface RedsysBookingRow {
    id: string
    camper_id: string
    start_date: string
    end_date: string
    status: string
    payment_status?: string | null
    total_price?: number | string | null
    notes?: string | null
    customer_name?: string | null
    customer_email?: string | null
    customer_phone?: string | null
    payment_intent_id?: string | null
    pickup_time?: string | null
    dropoff_time?: string | null
}

export interface RedsysDecisionInput {
    booking: Pick<RedsysBookingRow, 'status' | 'payment_status' | 'total_price'>
    orderId: string
    responseCode?: string | number
    amount?: string | number
    currency?: string | number
    transactionType?: string | number
    /** Otra reserva o bloqueo ocupa ya las fechas */
    datesTaken?: boolean
    /** Este mismo cobro ya se registró en la reserva: es una notificación repetida */
    chargeRecorded?: boolean
    /** Pedidos cuyo cobro consta en las notas de la reserva ([COBRO REDSYS]) */
    recordedChargeOrders?: string[]
}

export interface RedsysDecision {
    /** Nuevo payment_status, si cambia */
    paymentStatus?: 'paid' | 'failed'
    /** Asegurar el bloqueo de fechas de este pedido */
    ensureBlock: boolean
    /** Aviso para el admin: requiere una revisión manual */
    alert?: string
}

const EUR_CODE = '978'
const AUTHORIZATION_TYPE = '0'

const IGNORE: RedsysDecision = { ensureBlock: false }

function isPresent(value: unknown): boolean {
    return value !== undefined && value !== null && value !== ''
}

/** Importe de la reserva en céntimos, tal como se envió a Redsys */
export function bookingAmountInCents(totalPrice: number | string | null | undefined): number | null {
    const amount = Number(totalPrice)
    if (!isPresent(totalPrice) || !Number.isFinite(amount)) return null
    return Math.round(amount * 100)
}

function matchesBookingAmount(amount: string | number | undefined, totalPrice: RedsysBookingRow['total_price']): boolean {
    const expected = bookingAmountInCents(totalPrice)
    if (expected === null || !isPresent(amount) || !/^\d+$/.test(String(amount))) return false
    return parseInt(String(amount), 10) === expected
}

export function decideRedsysNotification(input: RedsysDecisionInput): RedsysDecision {
    const { booking, orderId, responseCode, amount, currency, transactionType, datesTaken, chargeRecorded, recordedChargeOrders = [] } = input

    // Devoluciones y otras operaciones hechas en el panel del banco no son pagos de la reserva
    if (isPresent(transactionType) && String(transactionType) !== AUTHORIZATION_TYPE) return IGNORE

    const alreadyPaid = booking.payment_status === 'paid'
    const refunded = booking.payment_status === 'refunded'
    const holdsDates = ['pending', 'confirmed', 'active'].includes(booking.status)

    if (!isRedsysSuccess(responseCode)) {
        if (alreadyPaid || refunded || booking.status !== 'pending') return IGNORE
        return { paymentStatus: 'failed', ensureBlock: false }
    }

    if (refunded) {
        if (chargeRecorded) return IGNORE
        return { ensureBlock: false, alert: `Cobro recibido en una reserva ya reembolsada (pedido ${orderId}). Revisar en el banco.` }
    }

    if (alreadyPaid) {
        // Pagada con el cobro de otro pedido y el de este no consta: no es una repetición sino un
        // segundo cobro (p. ej. el webhook del pedido anterior y un reintento se cruzaron)
        if (recordedChargeOrders.length > 0 && !recordedChargeOrders.includes(orderId)) {
            return {
                ensureBlock: holdsDates,
                alert: `Cobro del pedido ${orderId} (${amount ?? 'sin importe'} céntimos) en una reserva que ya consta pagada con el pedido ${recordedChargeOrders.join(', ')}. Posible cobro doble: comprobar en el banco y devolver el que sobre.`,
            }
        }
        // Notificación repetida: reponer el bloqueo si faltó, sin tocar nada más
        return { ensureBlock: holdsDates }
    }

    if (booking.status === 'cancelled') {
        return { ensureBlock: false, alert: `Cobro recibido en una reserva cancelada (pedido ${orderId}). Hay que devolverlo desde el banco.` }
    }

    const wrongCurrency = isPresent(currency) && String(currency) !== EUR_CODE
    if (wrongCurrency || !matchesBookingAmount(amount, booking.total_price)) {
        return {
            ensureBlock: false,
            alert: `El cobro no coincide con la reserva (pedido ${orderId}: ${amount ?? 'sin importe'} céntimos, moneda ${currency ?? 'desconocida'}). No se ha marcado como pagada.`,
        }
    }

    return {
        paymentStatus: 'paid',
        ensureBlock: holdsDates,
        alert: booking.status === 'pending' && datesTaken
            ? `Pago recibido, pero las fechas ya están ocupadas (pedido ${orderId}). Revisar antes de aceptar.`
            : undefined,
    }
}

const paymentAlertLine = (alert: string) => `[PAGO A REVISAR] ${alert}`

function withoutLine(notes: string | null, line: string): string | null {
    if (!notes?.includes(line)) return notes
    return notes.split('\n').filter(l => l !== line).join('\n') || null
}

/** Añade el aviso a las notas de la reserva sin repetirlo si Redsys reenvía la notificación */
export function appendPaymentAlert(notes: string | null | undefined, alert: string): string {
    const line = paymentAlertLine(alert)
    if (!notes || notes === '') return line
    return notes.includes(line) ? notes : `${notes}\n${line}`
}

/** Línea de las notas que registra un cobro: una repetición trae el mismo pedido y autorización */
function chargeRecord(orderId: string, authorisationCode: string): string {
    return `[COBRO REDSYS] Pedido ${orderId}, autorización ${authorisationCode}.`
}

/** Pedidos con un cobro registrado en las notas */
export const recordedChargeOrderIds = (notes: string | null | undefined): string[] =>
    [...(notes ?? '').matchAll(/^\[COBRO REDSYS\] Pedido ([^,\s]+),/gm)].map(match => match[1])

const previousOrderLine = (orderId: string) => `[PEDIDO ANTERIOR] ${orderId}`

export const previousOrderIds = (notes: string | null | undefined): string[] =>
    [...(notes ?? '').matchAll(/^\[PEDIDO ANTERIOR\] (\S+)$/gm)].map(match => match[1])

/**
 * Reintentos de pago por reserva. Cada uno añade una línea [PEDIDO ANTERIOR] a las notas, que el
 * webhook y el reintento usan como condición de escritura (`notes=eq.` en la URL): sin tope crecerían sin fin
 */
export const MAX_PAYMENT_RETRIES = 10

/** Guarda en las notas el pedido que un reintento de pago va a sustituir */
export function appendPreviousOrder(notes: string | null | undefined, orderId: string | null | undefined): string | null {
    if (!orderId) return notes ?? null
    const line = previousOrderLine(orderId)
    if (!notes) return line
    return previousOrderIds(notes).includes(orderId) ? notes : `${notes}\n${line}`
}

/** Pedidos de una reserva: el actual y los que sustituyeron sus reintentos de pago */
function bookingOrderIds(booking: { payment_intent_id?: string | null; notes?: string | null }): string[] {
    const previous = previousOrderIds(booking.notes)
    return booking.payment_intent_id ? [booking.payment_intent_id, ...previous] : previous
}

/** Bloqueos temporales de la propia reserva, que nunca cuentan como fechas ocupadas */
export function ownProvisionalSessions(booking: { payment_intent_id?: string | null; notes?: string | null }): string[] {
    return bookingOrderIds(booking).flatMap(provisionalSessions)
}

const PREVIOUS_ORDER_CANDIDATES = 20

const previousOrderChargeText = (orderId: string) => `Cobro del pedido anterior ${orderId}`

/**
 * ¿Hay un cobro de este pedido anterior sin revisar? El webhook lo deja como aviso [PAGO A REVISAR];
 * solo cuentan los avisos activos, no un texto parecido en cualquier otra línea de las notas
 */
export function hasPreviousOrderCharge(notes: string | null | undefined, orderId: string): boolean {
    const text = `${previousOrderChargeText(orderId)} (`
    return activePaymentAlerts(notes).some(alert => alert.startsWith(text))
}

/**
 * Reserva cuyo pedido actual sustituyó a este. El LIKE solo acota: también coincide con pedidos que
 * empiezan igual, y la coincidencia exacta se comprueba después. Solo con formato de pedido.
 */
export async function findBookingByPreviousOrder(db: SupabaseClient, orderId: string) {
    if (!isValidRedsysOrderId(orderId)) return null

    const { data: rows, error } = await db
        .from('bookings')
        .select('id, status, notes')
        .like('notes', `%${previousOrderLine(orderId)}%`)
        .limit(PREVIOUS_ORDER_CANDIDATES)
    if (error) throw new Error(error.message)
    return rows?.find(row => previousOrderIds(row.notes).includes(orderId)) ?? null
}

const accessLinkAlert = (orderId: string) =>
    `No se pudo enviar el enlace de acceso al cliente (pedido ${orderId}). Se reintentará si Redsys repite la notificación; si no, envíaselo a mano.`

/** Bloqueos temporales que el checkout crea para este pedido mientras el cliente paga */
function provisionalSessions(orderId: string): string[] {
    return [`checkout_${orderId}`, `hold_${orderId}`]
}

async function areDatesTaken(db: SupabaseClient, booking: RedsysBookingRow, orderId: string, now: Date): Promise<boolean> {
    const ownSessions = [`redsys_${orderId}`, ...provisionalSessions(orderId), ...ownProvisionalSessions(booking)]
    const [clashes, blocks] = await Promise.all([
        db.from('bookings')
            .select('id, start_date, end_date, pickup_time, dropoff_time')
            .eq('camper_id', booking.camper_id)
            .in('status', ['confirmed', 'active'])
            .neq('id', booking.id)
            .lte('start_date', booking.end_date)
            .gte('end_date', booking.start_date),
        db.from('blocked_dates')
            .select('id, start_date, end_date, session_id, expires_at')
            .eq('camper_id', booking.camper_id)
            .lte('start_date', booking.end_date)
            .gte('end_date', booking.start_date),
    ])
    if (clashes.error) throw new Error(clashes.error.message)
    if (blocks.error) throw new Error(blocks.error.message)

    const activeBlocks = (blocks.data || []).filter((b: { session_id?: string | null; expires_at?: string | null }) =>
        !ownSessions.includes(b.session_id ?? '') && (!b.expires_at || new Date(b.expires_at) > now)
    )
    return !isBookingRangeFree(booking, clashes.data || [], activeBlocks)
}

async function ensureBlock(db: SupabaseClient, booking: RedsysBookingRow, sessionId: string): Promise<void> {
    const { data: existing, error } = await db
        .from('blocked_dates')
        .select('id')
        .eq('camper_id', booking.camper_id)
        .eq('session_id', sessionId)
        .limit(1)
    if (error) throw new Error(error.message)
    if (existing && existing.length > 0) return

    const { error: insertErr } = await db.from('blocked_dates').insert({
        camper_id: booking.camper_id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        session_id: sessionId,
        reason: 'Auto-Bloqueo Redsys',
        expires_at: null,
    })
    if (insertErr) throw new Error(insertErr.message)
}

async function resolveCamperName(db: SupabaseClient, camperId: string): Promise<string | null> {
    try {
        const { data } = await db.from('campers').select('name').eq('id', camperId).maybeSingle()
        return typeof data?.name === 'string' && data.name.trim() ? data.name.trim() : null
    } catch {
        return null
    }
}

async function resolveMagicDashboardUrl(db: SupabaseClient, email: string, appUrl: string): Promise<string> {
    const fallback = `${appUrl}/es/dashboard`
    try {
        const generateLink = (db.auth as { admin?: { generateLink?: Function } })?.admin?.generateLink
        if (!generateLink) return fallback

        const { data, error } = await db.auth.admin.generateLink({
            type: 'magiclink',
            email,
        })
        const tokenHash = data?.properties?.hashed_token
        if (error || !tokenHash) return fallback

        return `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent('/es/dashboard')}`
    } catch {
        return fallback
    }
}

async function sendAccessLink(db: SupabaseClient, booking: RedsysBookingRow, orderId: string): Promise<boolean> {
    try {
        if (isSmtpConfigured()) {
            const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://utopiavanlife.com').replace(/\/$/, '')
            const [camperName, dashboardUrl] = await Promise.all([
                resolveCamperName(db, booking.camper_id),
                resolveMagicDashboardUrl(db, booking.customer_email!, appUrl),
            ])
            const sent = await sendBookingConfirmationEmails({
                bookingId: booking.id,
                orderId: booking.payment_intent_id || orderId,
                customerName: booking.customer_name,
                customerEmail: booking.customer_email!,
                customerPhone: booking.customer_phone,
                camperName,
                startDate: booking.start_date,
                endDate: booking.end_date,
                totalPrice: booking.total_price,
                dashboardUrl,
                adminUrl: `${appUrl}/es/admin`,
            })
            if (sent) return true
        }

        const { error } = await db.auth.signInWithOtp({
            email: booking.customer_email!,
            options: { shouldCreateUser: false },
        })
        if (!error) return true
        console.warn(`Redsys Webhook: no se pudo enviar el enlace de acceso a la reserva ${booking.id}:`, error.message)
    } catch (err) {
        console.warn(`Redsys Webhook: no se pudo enviar el enlace de acceso a la reserva ${booking.id}:`, err)
    }
    return false
}

/**
 * Veces que se relee la reserva y se vuelve a intentar una escritura cuando otro (otra
 * notificación, un reintento de pago, el admin) cambió la reserva entre la lectura y la escritura.
 * Agotadas, se responde 500 y Redsys reenvía la notificación más tarde.
 */
const NOTES_WRITE_ATTEMPTS = 3

/**
 * Las notas se escriben enteras: solo se guardan si siguen como se leyeron, para no borrar un aviso
 * [PAGO A REVISAR], un [PEDIDO ANTERIOR] o un cobro que otro acaba de añadir. False si cambiaron.
 */
async function updateNotesIfUnchanged(
    db: SupabaseClient,
    bookingId: string,
    readNotes: string | null | undefined,
    notes: string | null,
    now: Date
): Promise<boolean> {
    const update = db.from('bookings').update({ notes, updated_at: now.toISOString() }).eq('id', bookingId)
    const { data: updated, error } = await (readNotes === null || readNotes === undefined
        ? update.is('notes', null)
        : update.eq('notes', readNotes)
    ).select('id')
    if (error) throw new Error(error.message)
    return Boolean(updated && updated.length > 0)
}

/**
 * Cobro de un pedido que un reintento de pago sustituyó. Solo avisa: la reserva puede haberse
 * pagado también con el pedido nuevo, y eso lo decide el admin mirando el banco.
 */
async function alertPreviousOrderCharge(
    db: SupabaseClient,
    orderId: string,
    amount: string | number | undefined,
    now: Date
): Promise<'alerted' | 'not_found' | 'conflict'> {
    const alert = `${previousOrderChargeText(orderId)} (${amount ?? 'sin importe'} céntimos): el cliente reintentó el pago y la reserva ya tiene otro pedido. Comprobar en el banco si hay que registrarlo o devolverlo.`

    // Solo si las notas siguen como se leyeron: un reintento de pago puede estar añadiendo su
    // [PEDIDO ANTERIOR] y, si se pisara, un cobro tardío de ese pedido ya no encontraría la reserva
    for (let attempt = 0; attempt < NOTES_WRITE_ATTEMPTS; attempt++) {
        const booking = await findBookingByPreviousOrder(db, orderId)
        if (!booking) return 'not_found'
        if (attempt === 0) console.error(`Redsys Webhook: reserva ${booking.id}. ${alert}`)

        const notes = appendPaymentAlert(booking.notes, alert)
        if (notes === booking.notes) return 'alerted'
        if (await updateNotesIfUnchanged(db, booking.id, booking.notes, notes, now)) return 'alerted'
    }
    return 'conflict'
}

/**
 * Pedido que ya no es el actual de ninguna reserva. Si es un cobro de un pedido que un reintento
 * sustituyó, se avisa en esa reserva; si no, solo queda en los logs.
 */
async function handleOrderWithoutBooking(
    db: SupabaseClient,
    n: Record<string, string | number | undefined>,
    orderId: string,
    now: Date
): Promise<{ httpStatus: number; body: string }> {
    const responseCode = n.Ds_Response ?? n.DS_RESPONSE
    const transactionType = n.Ds_TransactionType ?? n.DS_TRANSACTIONTYPE
    const isCharge = isRedsysSuccess(responseCode) && (!isPresent(transactionType) || String(transactionType) === AUTHORIZATION_TYPE)

    if (isCharge) {
        const result = await alertPreviousOrderCharge(db, orderId, n.Ds_Amount ?? n.DS_AMOUNT, now)
        if (result === 'alerted') return { httpStatus: 200, body: 'OK' }
        if (result === 'conflict') {
            console.warn(`Redsys Webhook: no se pudo anotar el cobro del pedido anterior ${orderId}: la reserva cambiaba a la vez`)
            return { httpStatus: 500, body: 'Retry' }
        }
    }

    const log = isRedsysSuccess(responseCode) ? console.error : console.warn
    log(`Redsys Webhook: pedido ${orderId} (respuesta ${responseCode}) sin reserva asociada. Si es un cobro, revisar en el banco.`)
    return { httpStatus: 200, body: 'Booking not found' }
}

/**
 * Aplica una notificación ya verificada. Devuelve el código HTTP para Redsys: 500 cuando el
 * cambio no se ha guardado o falta enviar el enlace de acceso, para que la reenvíe y se decida
 * de nuevo con el estado actual.
 */
export async function processRedsysNotification(
    db: SupabaseClient,
    notification: RedsysNotificationParams,
    now: Date = new Date()
): Promise<{ httpStatus: number; body: string }> {
    const n = notification as Record<string, string | number | undefined>
    const orderId = String(n.Ds_Order ?? n.DS_ORDER ?? '')

    if (!orderId) {
        console.error('Redsys Webhook: Número de pedido no encontrado en notificación')
        return { httpStatus: 400, body: 'Missing order ID' }
    }

    // Si la reserva cambia entre la lectura y la escritura, se relee y se decide otra vez con lo actual
    for (let attempt = 0; attempt < NOTES_WRITE_ATTEMPTS; attempt++) {
        const { data: booking, error: findError } = await db
            .from('bookings')
            .select('*')
            .eq('payment_intent_id', orderId)
            .maybeSingle()

        if (findError) {
            console.error(`Redsys Webhook: error buscando el pedido ${orderId}:`, findError.message)
            return { httpStatus: 500, body: 'Server Error' }
        }
        // Ninguna reserva tiene este pedido: no existe o un reintento lo sustituyó, también entre dos intentos
        if (!booking) return handleOrderWithoutBooking(db, n, orderId, now)

        const result = await applyToBooking(db, booking, n, orderId, now)
        if (result) return result
        console.warn(`Redsys Webhook: la reserva ${booking.id} cambió mientras se procesaba el pedido ${orderId}; se vuelve a leer`)
    }

    // Error y no aviso: si Redsys deja de reenviar, este cobro solo queda aquí
    console.error(`Redsys Webhook: el pedido ${orderId} no se pudo guardar tras ${NOTES_WRITE_ATTEMPTS} intentos; Redsys lo reenviará. Si es un cobro y no vuelve a llegar, revisar en el banco.`)
    return { httpStatus: 500, body: 'Retry' }
}

/**
 * Decide y guarda la notificación sobre la reserva tal como se leyó. Devuelve null si la reserva
 * cambió antes de guardar (estado, pago, pedido o notas): entonces no se ha escrito nada.
 */
async function applyToBooking(
    db: SupabaseClient,
    booking: RedsysBookingRow,
    n: Record<string, string | number | undefined>,
    orderId: string,
    now: Date
): Promise<{ httpStatus: number; body: string } | null> {
    const responseCode = n.Ds_Response ?? n.DS_RESPONSE
    const sessionId = `redsys_${orderId}`
    const needsDatesCheck = isRedsysSuccess(responseCode)
        && booking.status === 'pending'
        && booking.payment_status !== 'paid'
        && booking.payment_status !== 'refunded'
    const datesTaken = needsDatesCheck ? await areDatesTaken(db, booking, orderId, now) : false

    const authorisationCode = String(n.Ds_AuthorisationCode ?? n.DS_AUTHORISATIONCODE ?? '').trim()
    const charge = authorisationCode ? chargeRecord(orderId, authorisationCode) : null

    const decision = decideRedsysNotification({
        booking,
        orderId,
        responseCode,
        amount: n.Ds_Amount ?? n.DS_AMOUNT,
        currency: n.Ds_Currency ?? n.DS_CURRENCY,
        transactionType: n.Ds_TransactionType ?? n.DS_TRANSACTIONTYPE,
        datesTaken,
        chargeRecorded: Boolean(charge && booking.notes?.includes(charge)),
        recordedChargeOrders: recordedChargeOrderIds(booking.notes),
    })

    if (decision.alert) console.error(`Redsys Webhook: reserva ${booking.id}. ${decision.alert}`)

    const changes: Record<string, unknown> = {}
    if (decision.paymentStatus) changes.payment_status = decision.paymentStatus
    let notes: string | null = booking.notes ?? null
    if (decision.alert) notes = appendPaymentAlert(notes, decision.alert)
    if (decision.paymentStatus === 'paid' && charge) notes = notes ? `${notes}\n${charge}` : charge

    // La cuenta se creó en el checkout con una contraseña que el cliente no conoce: hay que enviarle
    // el enlace de acceso. Sin esquema para registrar el envío, queda pendiente como aviso en la misma
    // escritura del pago y solo se quita cuando el envío funciona: si algo falla entre medias, el aviso
    // sigue ahí y la repetición de Redsys lo reintenta
    const linkAlert = accessLinkAlert(orderId)
    const linkLine = paymentAlertLine(linkAlert)
    const linkPending = booking.payment_status === 'paid' && Boolean(booking.notes?.includes(linkLine))
    const sendsLink = Boolean(booking.customer_email) && (decision.paymentStatus === 'paid' || linkPending)
    if (decision.paymentStatus === 'paid' && sendsLink) notes = appendPaymentAlert(notes, linkAlert)

    if (notes !== (booking.notes ?? null)) changes.notes = notes

    if (Object.keys(changes).length > 0) {
        changes.updated_at = now.toISOString()
        // Solo si la reserva sigue como la leímos: el admin u otra notificación pueden haberla cambiado,
        // un reintento de pago puede haberle puesto otro pedido, y las notas se escriben enteras:
        // otra notificación puede acabar de añadir un aviso [PAGO A REVISAR] que no se debe perder
        let update = db.from('bookings').update(changes)
            .eq('id', booking.id)
            .eq('status', booking.status)
            .eq('payment_intent_id', orderId)
        update = booking.payment_status === null || booking.payment_status === undefined
            ? update.is('payment_status', null)
            : update.eq('payment_status', booking.payment_status)
        update = booking.notes === null || booking.notes === undefined
            ? update.is('notes', null)
            : update.eq('notes', booking.notes)
        const { data: updated, error: updateErr } = await update.select('id')

        if (updateErr) throw new Error(updateErr.message)
        if (!updated || updated.length === 0) return null
    }

    // Enlace de acceso: va antes del bloqueo para que un fallo ahí no lo pierda. Su aviso pendiente
    // ya está guardado; si el envío falla, se deja y se pide a Redsys que repita
    let linkFailed = false
    let linkNoteUnsaved = false

    if (sendsLink) {
        linkFailed = !await sendAccessLink(db, booking, orderId)

        if (!linkFailed) {
            // Tras la llamada de red otra notificación puede haber escrito las notas: se quita la línea
            // sobre las notas actuales, sin pisarlas
            let current: string | null = notes
            let saved = false
            for (let attempt = 0; attempt < NOTES_WRITE_ATTEMPTS && !saved; attempt++) {
                const withoutLink = withoutLine(current, linkLine)
                saved = withoutLink === current || await updateNotesIfUnchanged(db, booking.id, current, withoutLink, now)
                if (!saved) {
                    const { data: reread, error: rereadErr } = await db.from('bookings').select('notes').eq('id', booking.id).maybeSingle()
                    if (rereadErr) throw new Error(rereadErr.message)
                    current = reread?.notes ?? null
                }
            }
            if (!saved) {
                // El aviso sigue: en la repetición se reenvía el enlace (un email de más, nunca uno de menos)
                linkNoteUnsaved = true
                console.error(`Redsys Webhook: enlace de acceso enviado para la reserva ${booking.id}, pero no se pudo quitar su aviso: las notas cambiaban a la vez`)
            }
        }
    }

    if (decision.ensureBlock) await ensureBlock(db, booking, sessionId)

    // Pago resuelto: el bloqueo definitivo ya está puesto o las fechas deben quedar libres.
    // Si esto falla no es grave: el bloqueo provisional caduca solo.
    if (decision.ensureBlock || !isRedsysSuccess(responseCode)) {
        const { error: releaseErr } = await db
            .from('blocked_dates')
            .delete()
            .eq('camper_id', booking.camper_id)
            .in('session_id', [...provisionalSessions(orderId), ...ownProvisionalSessions(booking)])
        if (releaseErr) console.warn(`Redsys Webhook: no se pudo liberar el bloqueo provisional del pedido ${orderId}:`, releaseErr.message)
    }

    return linkFailed || linkNoteUnsaved ? { httpStatus: 500, body: 'Retry' } : { httpStatus: 200, body: 'OK' }
}
