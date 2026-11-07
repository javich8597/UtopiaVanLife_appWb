import type { SupabaseClient } from '@supabase/supabase-js'
import { isRedsysSuccess, RedsysNotificationParams } from './redsys'

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
    customer_email?: string | null
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
    const { booking, orderId, responseCode, amount, currency, transactionType, datesTaken } = input

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
        return { ensureBlock: false, alert: `Cobro recibido en una reserva ya reembolsada (pedido ${orderId}). Revisar en el banco.` }
    }

    // Notificación repetida: reponer el bloqueo si faltó, sin tocar nada más
    if (alreadyPaid) return { ensureBlock: holdsDates }

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

/** Añade el aviso a las notas de la reserva sin repetirlo si Redsys reenvía la notificación */
export function appendPaymentAlert(notes: string | null | undefined, alert: string): string {
    const line = `[PAGO A REVISAR] ${alert}`
    if (!notes || notes === '') return line
    return notes.includes(line) ? notes : `${notes}\n${line}`
}

/** Bloqueos temporales que el checkout crea para este pedido mientras el cliente paga */
function provisionalSessions(orderId: string): string[] {
    return [`checkout_${orderId}`, `hold_${orderId}`]
}

async function areDatesTaken(db: SupabaseClient, booking: RedsysBookingRow, orderId: string, now: Date): Promise<boolean> {
    const ownSessions = [`redsys_${orderId}`, ...provisionalSessions(orderId)]
    const [clashes, blocks] = await Promise.all([
        db.from('bookings')
            .select('id')
            .eq('camper_id', booking.camper_id)
            .in('status', ['confirmed', 'active'])
            .neq('id', booking.id)
            .lte('start_date', booking.end_date)
            .gte('end_date', booking.start_date)
            .limit(1),
        db.from('blocked_dates')
            .select('id, session_id, expires_at')
            .eq('camper_id', booking.camper_id)
            .lte('start_date', booking.end_date)
            .gte('end_date', booking.start_date),
    ])
    if (clashes.error) throw new Error(clashes.error.message)
    if (blocks.error) throw new Error(blocks.error.message)

    const activeBlocks = (blocks.data || []).filter((b: { session_id?: string | null; expires_at?: string | null }) =>
        !ownSessions.includes(b.session_id ?? '') && (!b.expires_at || new Date(b.expires_at) > now)
    )
    return (clashes.data || []).length > 0 || activeBlocks.length > 0
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

/**
 * Aplica una notificación ya verificada. Devuelve el código HTTP para Redsys: 500 cuando el
 * cambio no se ha guardado, para que la reenvíe y se decida de nuevo con el estado actual.
 */
export async function processRedsysNotification(
    db: SupabaseClient,
    notification: RedsysNotificationParams,
    now: Date = new Date()
): Promise<{ httpStatus: number; body: string }> {
    const n = notification as Record<string, string | number | undefined>
    const orderId = String(n.Ds_Order ?? n.DS_ORDER ?? '')
    const responseCode = n.Ds_Response ?? n.DS_RESPONSE

    if (!orderId) {
        console.error('Redsys Webhook: Número de pedido no encontrado en notificación')
        return { httpStatus: 400, body: 'Missing order ID' }
    }

    const { data: booking, error: findError } = await db
        .from('bookings')
        .select('*')
        .eq('payment_intent_id', orderId)
        .maybeSingle()

    if (findError) {
        console.error(`Redsys Webhook: error buscando el pedido ${orderId}:`, findError.message)
        return { httpStatus: 500, body: 'Server Error' }
    }
    if (!booking) {
        const log = isRedsysSuccess(responseCode) ? console.error : console.warn
        log(`Redsys Webhook: pedido ${orderId} (respuesta ${responseCode}) sin reserva asociada. Si es un cobro, revisar en el banco.`)
        return { httpStatus: 200, body: 'Booking not found' }
    }

    const sessionId = `redsys_${orderId}`
    const needsDatesCheck = isRedsysSuccess(responseCode)
        && booking.status === 'pending'
        && booking.payment_status !== 'paid'
        && booking.payment_status !== 'refunded'
    const datesTaken = needsDatesCheck ? await areDatesTaken(db, booking, orderId, now) : false

    const decision = decideRedsysNotification({
        booking,
        orderId,
        responseCode,
        amount: n.Ds_Amount ?? n.DS_AMOUNT,
        currency: n.Ds_Currency ?? n.DS_CURRENCY,
        transactionType: n.Ds_TransactionType ?? n.DS_TRANSACTIONTYPE,
        datesTaken,
    })

    if (decision.alert) console.error(`Redsys Webhook: reserva ${booking.id}. ${decision.alert}`)

    const changes: Record<string, unknown> = {}
    if (decision.paymentStatus) changes.payment_status = decision.paymentStatus
    if (decision.alert) changes.notes = appendPaymentAlert(booking.notes, decision.alert)

    if (Object.keys(changes).length > 0) {
        changes.updated_at = now.toISOString()
        // Solo si la reserva sigue como la leímos: el admin o otra notificación pueden haberla cambiado
        let update = db.from('bookings').update(changes).eq('id', booking.id).eq('status', booking.status)
        update = booking.payment_status === null || booking.payment_status === undefined
            ? update.is('payment_status', null)
            : update.eq('payment_status', booking.payment_status)
        const { data: updated, error: updateErr } = await update.select('id')

        if (updateErr) throw new Error(updateErr.message)
        if (!updated || updated.length === 0) {
            console.warn(`Redsys Webhook: la reserva ${booking.id} cambió mientras se procesaba el pedido ${orderId}`)
            return { httpStatus: 500, body: 'Retry' }
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
            .in('session_id', provisionalSessions(orderId))
        if (releaseErr) console.warn(`Redsys Webhook: no se pudo liberar el bloqueo provisional del pedido ${orderId}:`, releaseErr.message)
    }

    // La cuenta se creó en el checkout con una contraseña que el cliente no conoce: enlace de acceso
    if (decision.paymentStatus === 'paid' && booking.customer_email) {
        const { error: otpErr } = await db.auth.signInWithOtp({
            email: booking.customer_email,
            options: { shouldCreateUser: false },
        })
        if (otpErr) console.warn(`Redsys Webhook: no se pudo enviar el enlace de acceso a la reserva ${booking.id}:`, otpErr.message)
    }

    return { httpStatus: 200, body: 'OK' }
}
