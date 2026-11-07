import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { buildVerifiedBooking, CHECKOUT_ACCESS_COOKIE, hasCheckoutAccess } from '@/lib/checkoutAccess'
import {
    getRedsysConfig,
    verifyRedsysSignature,
    decodeMerchantParameters,
    RedsysNotificationParams,
} from '@/lib/redsys'
import { processRedsysNotification } from '@/lib/redsysNotification'

interface VerifyPaymentResult {
    success: boolean
    isPaid: boolean
    booking: ReturnType<typeof buildVerifiedBooking> | null
    error?: string
}

/** Conocer el número de pedido no basta: viaja en la URL de vuelta de Redsys */
async function canReadBookingDetails(ownerId: string | null, orderId: string, accessCookie?: string | null): Promise<boolean> {
    if (hasCheckoutAccess(orderId, accessCookie)) return true
    if (!ownerId) return false

    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    return user?.id === ownerId
}

async function processPaymentVerification(params: {
    orderId?: string | null
    signatureVersion?: string | null
    merchantParameters?: string | null
    signature?: string | null
    accessCookie?: string | null
}): Promise<NextResponse<VerifyPaymentResult>> {
    try {
        const { signatureVersion, merchantParameters, signature, accessCookie } = params
        let orderId = params.orderId || null

        const config = getRedsysConfig()
        const supabase = getSupabaseAdmin()

        // 1. Si vienen parámetros de Redsys (redirección desde TPV), verificar firma criptográfica
        if (merchantParameters && signature) {
            if (signatureVersion && signatureVersion !== 'HMAC_SHA256_V1') {
                return NextResponse.json(
                    { success: false, isPaid: false, booking: null, error: 'Versión de firma no soportada' },
                    { status: 400 }
                )
            }

            const isValidSig = verifyRedsysSignature(merchantParameters, signature, config.secretKey)
            if (!isValidSig) {
                console.warn('verify-payment: Firma Redsys inválida recibida')
                return NextResponse.json(
                    { success: false, isPaid: false, booking: null, error: 'Firma de pago inválida' },
                    { status: 400 }
                )
            }

            const notificationData = decodeMerchantParameters<RedsysNotificationParams>(merchantParameters)
            const dsOrder = notificationData.Ds_Order || notificationData.DS_ORDER
            const dsMerchantCode = notificationData.Ds_MerchantCode || notificationData.DS_MERCHANTCODE

            if (dsMerchantCode !== config.merchantCode) {
                return NextResponse.json(
                    { success: false, isPaid: false, booking: null, error: 'Código de comercio incorrecto' },
                    { status: 400 }
                )
            }

            if (dsOrder) {
                orderId = dsOrder
            }

            // Misma lógica que el webhook: el cliente puede volver antes o después de la notificación
            await processRedsysNotification(supabase, notificationData)
        }

        // 2. Resolver estado final de la reserva por orderId
        if (!orderId) {
            return NextResponse.json(
                { success: false, isPaid: false, booking: null, error: 'Identificador de pedido no proporcionado' },
                { status: 400 }
            )
        }

        const { data: booking, error: findError } = await supabase
            .from('bookings')
            .select('*')
            .eq('payment_intent_id', orderId)
            .maybeSingle()

        if (findError || !booking) {
            return NextResponse.json(
                { success: false, isPaid: false, booking: null, error: 'Reserva no encontrada' },
                { status: 404 }
            )
        }

        let details: Parameters<typeof buildVerifiedBooking>[2] = null

        if (await canReadBookingDetails(booking.user_id ?? null, orderId, accessCookie)) {
            const { data: profile } = booking.user_id
                ? await supabase
                    .from('users')
                    .select('driver_license_issue_date, birth_date')
                    .eq('id', booking.user_id)
                    .maybeSingle()
                : { data: null }
            details = { profile }
        }

        const isPaid = booking.payment_status === 'paid'

        return NextResponse.json({
            success: true,
            isPaid,
            booking: buildVerifiedBooking(booking, orderId, details),
        })
    } catch (err) {
        console.error('verify-payment exception:', err)
        return NextResponse.json(
            { success: false, isPaid: false, booking: null, error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams
    const orderId = searchParams.get('order') || searchParams.get('orderId') || searchParams.get('Ds_Order') || searchParams.get('DS_ORDER')
    const signatureVersion = searchParams.get('Ds_SignatureVersion') || searchParams.get('signatureVersion')
    const merchantParameters = searchParams.get('Ds_MerchantParameters') || searchParams.get('merchantParameters')
    const signature = searchParams.get('Ds_Signature') || searchParams.get('signature')

    return processPaymentVerification({
        orderId,
        signatureVersion,
        merchantParameters,
        signature,
        accessCookie: req.cookies.get(CHECKOUT_ACCESS_COOKIE)?.value,
    })
}

export async function POST(req: NextRequest) {
    let orderId: string | null = null
    let signatureVersion: string | null = null
    let merchantParameters: string | null = null
    let signature: string | null = null

    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
        const body = await req.json().catch(() => ({}))
        orderId = body.order || body.orderId || body.Ds_Order || body.DS_ORDER || null
        signatureVersion = body.Ds_SignatureVersion || body.signatureVersion || null
        merchantParameters = body.Ds_MerchantParameters || body.merchantParameters || null
        signature = body.Ds_Signature || body.signature || null
    } else {
        try {
            const formData = await req.formData()
            orderId = (formData.get('order') as string) || (formData.get('orderId') as string) || (formData.get('Ds_Order') as string) || null
            signatureVersion = (formData.get('Ds_SignatureVersion') as string) || null
            merchantParameters = (formData.get('Ds_MerchantParameters') as string) || null
            signature = (formData.get('Ds_Signature') as string) || null
        } catch {
            const searchParams = req.nextUrl.searchParams
            orderId = searchParams.get('order') || searchParams.get('orderId') || null
            signatureVersion = searchParams.get('Ds_SignatureVersion') || null
            merchantParameters = searchParams.get('Ds_MerchantParameters') || null
            signature = searchParams.get('Ds_Signature') || null
        }
    }

    if (!orderId && req.nextUrl.searchParams.has('order')) {
        orderId = req.nextUrl.searchParams.get('order')
    }

    return processPaymentVerification({
        orderId,
        signatureVersion,
        merchantParameters,
        signature,
        accessCookie: req.cookies.get(CHECKOUT_ACCESS_COOKIE)?.value,
    })
}
