import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
    getRedsysConfig,
    verifyRedsysSignature,
    decodeMerchantParameters,
    isRedsysSuccess,
    RedsysNotificationParams,
} from '@/lib/redsys'

interface VerifyPaymentResult {
    success: boolean
    isPaid: boolean
    booking: {
        id: string
        orderId: string
        camperId: string
        startDate: string
        endDate: string
        totalPrice: number
        paymentStatus: string
        status: string
        customerName: string
        customerEmail: string
        customerPhone: string
        customerDni: string
        customerAddress: string
        driverLicenseIssueDate: string | null
        birthDate: string | null
    } | null
    error?: string
}

async function processPaymentVerification(params: {
    orderId?: string | null
    signatureVersion?: string | null
    merchantParameters?: string | null
    signature?: string | null
}): Promise<NextResponse<VerifyPaymentResult>> {
    try {
        const { signatureVersion, merchantParameters, signature } = params
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
            const responseCode = notificationData.Ds_Response !== undefined ? notificationData.Ds_Response : (notificationData as any).DS_RESPONSE
            const dsAmount = notificationData.Ds_Amount || (notificationData as any).DS_AMOUNT
            const dsCurrency = notificationData.Ds_Currency || (notificationData as any).DS_CURRENCY
            const dsMerchantCode = notificationData.Ds_MerchantCode || (notificationData as any).DS_MERCHANTCODE

            if (dsMerchantCode !== config.merchantCode) {
                return NextResponse.json(
                    { success: false, isPaid: false, booking: null, error: 'Código de comercio incorrecto' },
                    { status: 400 }
                )
            }

            if (dsCurrency !== '978') {
                return NextResponse.json(
                    { success: false, isPaid: false, booking: null, error: 'Moneda incorrecta' },
                    { status: 400 }
                )
            }

            if (dsOrder) {
                orderId = dsOrder
            }

            const isSuccess = isRedsysSuccess(responseCode)

            if (orderId) {
                const { data: booking } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('payment_intent_id', orderId)
                    .maybeSingle()

                if (booking) {
                    if (isSuccess) {
                        const expectedAmount = Math.round(Number(booking.total_price) * 100)
                        const receivedAmount = parseInt(String(dsAmount || '0'), 10)

                        if (receivedAmount === expectedAmount) {
                            const wasAlreadyPaid = booking.payment_status === 'paid'

                            if (!wasAlreadyPaid) {
                                await supabase
                                    .from('bookings')
                                    .update({
                                        payment_status: 'paid',
                                        payment_intent_id: orderId,
                                        status: 'pending',
                                    })
                                    .eq('id', booking.id)
                            }

                            // Bloqueo persistente en calendario
                            const sessionId = `redsys_${orderId}`
                            const { data: existingHold } = await supabase
                                .from('blocked_dates')
                                .select('id')
                                .eq('camper_id', booking.camper_id)
                                .eq('session_id', sessionId)
                                .maybeSingle()

                            if (!existingHold) {
                                await supabase
                                    .from('blocked_dates')
                                    .insert({
                                        camper_id: booking.camper_id,
                                        start_date: booking.start_date,
                                        end_date: booking.end_date,
                                        session_id: sessionId,
                                        reason: 'Auto-Bloqueo Redsys',
                                        expires_at: null,
                                    })
                            }

                            // Limpiar hold provisional de 15 minutos
                            await supabase
                                .from('blocked_dates')
                                .delete()
                                .eq('camper_id', booking.camper_id)
                                .in('session_id', [`checkout_${orderId}`, `hold_${orderId}`])

                            // Enlace de acceso a la reserva por OTP
                            if (!wasAlreadyPaid && booking.customer_email) {
                                await supabase.auth.signInWithOtp({
                                    email: booking.customer_email,
                                    options: { shouldCreateUser: false },
                                }).catch((err) => console.warn('OTP signIn error:', err))
                            }
                        } else {
                            console.error(`verify-payment: Discrepancia de importe: esperado ${expectedAmount}, recibido ${receivedAmount}`)
                        }
                    } else {
                        // Pago fallido: liberar hold temporal de inmediato para no retener las fechas 15 min
                        await supabase
                            .from('blocked_dates')
                            .delete()
                            .eq('camper_id', booking.camper_id)
                            .in('session_id', [`checkout_${orderId}`, `hold_${orderId}`])

                        if (booking.payment_status !== 'paid') {
                            await supabase
                                .from('bookings')
                                .update({ payment_status: 'failed' })
                                .eq('id', booking.id)
                        }
                    }
                }
            }
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

        // Obtener datos complementarios de usuario si están disponibles
        let driverLicenseIssueDate: string | null = null
        let birthDate: string | null = null

        if (booking.user_id) {
            const { data: userProfile } = await supabase
                .from('users')
                .select('driver_license_issue_date, birth_date')
                .eq('id', booking.user_id)
                .maybeSingle()

            if (userProfile) {
                driverLicenseIssueDate = userProfile.driver_license_issue_date || null
                birthDate = userProfile.birth_date || null
            }
        }

        const isPaid = booking.payment_status === 'paid'

        return NextResponse.json({
            success: true,
            isPaid,
            booking: {
                id: booking.id,
                orderId: booking.payment_intent_id || orderId,
                camperId: booking.camper_id,
                startDate: booking.start_date,
                endDate: booking.end_date,
                totalPrice: Number(booking.total_price),
                paymentStatus: booking.payment_status,
                status: booking.status,
                customerName: booking.customer_name || '',
                customerEmail: booking.customer_email || '',
                customerPhone: booking.customer_phone || '',
                customerDni: booking.customer_dni || '',
                customerAddress: booking.customer_address || '',
                driverLicenseIssueDate,
                birthDate,
            },
        })
    } catch (err: any) {
        console.error('verify-payment exception:', err)
        return NextResponse.json(
            { success: false, isPaid: false, booking: null, error: err.message || 'Error interno del servidor' },
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
    })
}
