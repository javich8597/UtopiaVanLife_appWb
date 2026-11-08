import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeVerificationStatus } from './admin/auth'

/**
 * Acceso a los datos de una reserva tras pagar en Redsys.
 *
 * El cliente vuelve del banco sin sesión y el número de pedido viaja en la URL, así que conocerlo
 * no demuestra nada. Si la cuenta se creó en ese checkout (o había sesión de su titular), el
 * navegador recibe una cookie firmada con la que rellenar el formulario de después del pago y subir
 * la documentación. Un email que ya tenía cuenta no da acceso: su titular entra con el enlace del
 * email. La cookie solo sirve con la reserva pagada, así que crear pedidos sin pagar no permite
 * averiguar si un email tiene cuenta.
 */

export const CHECKOUT_ACCESS_COOKIE = 'uvl_checkout_access'
const ACCESS_MINUTES = 120

function sign(orderId: string, expiresAt: number, secret: string): string {
    return crypto.createHmac('sha256', secret).update(`checkout-access:${orderId}:${expiresAt}`).digest('base64url')
}

const cookieOptions = (maxAge: number) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api',
    maxAge,
})

/** Cookie para el navegador que acaba de crear el pedido. Sin clave de servidor no se concede acceso. */
export function createCheckoutAccessCookie(orderId: string, now: Date = new Date()) {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) return null

    const expiresAt = now.getTime() + ACCESS_MINUTES * 60 * 1000
    return {
        name: CHECKOUT_ACCESS_COOKIE,
        value: `${expiresAt}.${sign(orderId, expiresAt, secret)}`,
        options: cookieOptions(ACCESS_MINUTES * 60),
    }
}

/**
 * Misma forma que la cookie de acceso, pero no da acceso a nada. Se entrega cuando el email ya tenía
 * cuenta, para que la respuesta del checkout sea igual en los dos casos.
 */
export function createCheckoutNoAccessCookie(now: Date = new Date()) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null

    const expiresAt = now.getTime() + ACCESS_MINUTES * 60 * 1000
    return {
        name: CHECKOUT_ACCESS_COOKIE,
        value: `${expiresAt}.${crypto.randomBytes(32).toString('base64url')}`,
        options: cookieOptions(ACCESS_MINUTES * 60),
    }
}

/** Borra la cookie de acceso del navegador */
export function expiredCheckoutAccessCookie() {
    return { name: CHECKOUT_ACCESS_COOKIE, value: '', options: cookieOptions(0) }
}

export function hasCheckoutAccess(orderId: string, cookieValue: string | null | undefined, now: Date = new Date()): boolean {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret || !cookieValue) return false

    const [expiresRaw, signature, ...rest] = cookieValue.split('.')
    const expiresAt = Number(expiresRaw)
    if (!signature || rest.length > 0 || !Number.isSafeInteger(expiresAt) || expiresAt <= now.getTime()) return false

    const received = Buffer.from(signature)
    const expected = Buffer.from(sign(orderId, expiresAt, secret))
    return received.length === expected.length && crypto.timingSafeEqual(received, expected)
}

/**
 * Titular al que da acceso la cookie. Hace falta la reserva pagada, y la cookie deja de valer en
 * cuanto la documentación se ha enviado o aprobado: a partir de ahí se entra con sesión.
 */
export async function checkoutCookieOwner(
    db: SupabaseClient,
    booking: { user_id?: string | null; payment_status?: string | null } | null | undefined,
    orderId: string,
    cookieValue: string | null | undefined,
    now: Date = new Date()
): Promise<string | null> {
    if (!orderId || !hasCheckoutAccess(orderId, cookieValue, now)) return null
    if (!booking?.user_id || booking.payment_status !== 'paid') return null

    const { data: owner, error } = await db
        .from('users')
        .select('verification_status')
        .eq('id', booking.user_id)
        .maybeSingle()
    if (error || !owner) return null

    const alreadySubmitted = owner.verification_status === 'pending_validation'
    const verified = normalizeVerificationStatus(owner.verification_status) === 'verified'
    return alreadySubmitted || verified ? null : booking.user_id
}

/** Titular al que se asocia la documentación enviada sin sesión. El acceso se comprueba antes de consultar nada */
export async function resolveCheckoutUploadOwner(
    db: SupabaseClient,
    orderId: string,
    cookieValue: string | null | undefined,
    now: Date = new Date()
): Promise<string | null> {
    if (!orderId || !hasCheckoutAccess(orderId, cookieValue, now)) return null

    const { data: booking } = await db
        .from('bookings')
        .select('user_id, payment_status')
        .eq('payment_intent_id', orderId)
        .maybeSingle()

    return checkoutCookieOwner(db, booking, orderId, cookieValue, now)
}

export interface VerifiableBooking {
    id: string
    payment_intent_id?: string | null
    camper_id: string
    start_date: string
    end_date: string
    total_price?: number | string | null
    payment_status?: string | null
    status: string
    customer_name?: string | null
    customer_email?: string | null
    customer_phone?: string | null
    customer_dni?: string | null
    customer_address?: string | null
}

export interface VerifiableProfile {
    driver_license_issue_date?: string | null
    birth_date?: string | null
}

/**
 * Lo que devuelve verify-payment: el estado del pago, y el resto solo a quien tenga acceso. Los
 * datos de la reserva bastan para el formulario; los del perfil son solo para la sesión del titular.
 */
export function buildVerifiedBooking(
    booking: VerifiableBooking,
    orderId: string,
    details: { profile: VerifiableProfile | null } | null
) {
    const paymentState = {
        orderId: booking.payment_intent_id || orderId,
        paymentStatus: booking.payment_status ?? '',
        status: booking.status,
    }
    if (!details) return paymentState

    return {
        ...paymentState,
        id: booking.id,
        camperId: booking.camper_id,
        startDate: booking.start_date,
        endDate: booking.end_date,
        totalPrice: Number(booking.total_price),
        customerName: booking.customer_name || '',
        customerEmail: booking.customer_email || '',
        customerPhone: booking.customer_phone || '',
        customerDni: booking.customer_dni || '',
        customerAddress: booking.customer_address || '',
        driverLicenseIssueDate: details.profile?.driver_license_issue_date || null,
        birthDate: details.profile?.birth_date || null,
    }
}
