import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Acceso a los datos de una reserva tras pagar en Redsys.
 *
 * El cliente vuelve del banco sin sesión y el número de pedido viaja en la URL, así que conocerlo
 * no demuestra nada. El checkout deja en el navegador que hizo la reserva una cookie firmada, que
 * es lo que permite rellenar el formulario de después del pago y subir la documentación.
 */

export const CHECKOUT_ACCESS_COOKIE = 'uvl_checkout_access'
const ACCESS_MINUTES = 120

function sign(orderId: string, expiresAt: number, secret: string): string {
    return crypto.createHmac('sha256', secret).update(`checkout-access:${orderId}:${expiresAt}`).digest('base64url')
}

/** Cookie para el navegador que acaba de crear el pedido. Sin clave de servidor no se concede acceso. */
export function createCheckoutAccessCookie(orderId: string, now: Date = new Date()) {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) return null

    const expiresAt = now.getTime() + ACCESS_MINUTES * 60 * 1000
    return {
        name: CHECKOUT_ACCESS_COOKIE,
        value: `${expiresAt}.${sign(orderId, expiresAt, secret)}`,
        options: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/api',
            maxAge: ACCESS_MINUTES * 60,
        },
    }
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
 * Titular al que se puede asociar la documentación enviada sin sesión. El acceso se comprueba antes
 * de consultar nada, y un cliente ya verificado solo puede cambiar sus datos iniciando sesión.
 */
export async function resolveCheckoutUploadOwner(
    db: SupabaseClient,
    orderId: string,
    cookieValue: string | null | undefined,
    now: Date = new Date()
): Promise<string | null> {
    if (!orderId || !hasCheckoutAccess(orderId, cookieValue, now)) return null

    const { data: booking } = await db
        .from('bookings')
        .select('user_id')
        .eq('payment_intent_id', orderId)
        .maybeSingle()
    if (!booking?.user_id) return null

    const { data: owner } = await db
        .from('users')
        .select('verification_status')
        .eq('id', booking.user_id)
        .maybeSingle()

    return owner?.verification_status === 'verified' ? null : booking.user_id
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

/** Lo que devuelve verify-payment: el estado del pago, y el resto solo a quien tenga acceso */
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
