import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
    getRedsysConfig,
    verifyRedsysSignature,
    decodeMerchantParameters,
    isRedsysSuccess,
    RedsysNotificationParams,
} from '@/lib/redsys'

export async function POST(req: Request) {
    try {
        let signatureVersion = ''
        let merchantParameters = ''
        let signature = ''

        const contentType = req.headers.get('content-type') || ''

        if (contentType.includes('application/json')) {
            const body = await req.json()
            signatureVersion = body.Ds_SignatureVersion || body.DS_SIGNATUREVERSION || ''
            merchantParameters = body.Ds_MerchantParameters || body.DS_MERCHANTPARAMETERS || ''
            signature = body.Ds_Signature || body.DS_SIGNATURE || ''
        } else {
            try {
                const formData = await req.formData()
                signatureVersion = (formData.get('Ds_SignatureVersion') as string) || (formData.get('DS_SIGNATUREVERSION') as string) || ''
                merchantParameters = (formData.get('Ds_MerchantParameters') as string) || (formData.get('DS_MERCHANTPARAMETERS') as string) || ''
                signature = (formData.get('Ds_Signature') as string) || (formData.get('DS_SIGNATURE') as string) || ''
            } catch {
                const rawText = await req.text()
                const params = new URLSearchParams(rawText)
                signatureVersion = params.get('Ds_SignatureVersion') || params.get('DS_SIGNATUREVERSION') || ''
                merchantParameters = params.get('Ds_MerchantParameters') || params.get('DS_MERCHANTPARAMETERS') || ''
                signature = params.get('Ds_Signature') || params.get('DS_SIGNATURE') || ''
            }
        }

        if (!merchantParameters || !signature) {
            console.error('Redsys Webhook: Faltan parámetros Ds_MerchantParameters o Ds_Signature')
            return new Response('Missing parameters', { status: 400 })
        }

        const config = getRedsysConfig()
        const isValid = verifyRedsysSignature(merchantParameters, signature, config.secretKey)

        if (!isValid) {
            console.error('Redsys Webhook: Firma inválida recibida')
            return new Response('Invalid signature', { status: 400 })
        }

        const notificationData = decodeMerchantParameters<RedsysNotificationParams>(merchantParameters)
        const orderId = notificationData.Ds_Order || notificationData.DS_ORDER
        const responseCode = notificationData.Ds_Response !== undefined ? notificationData.Ds_Response : (notificationData as any).DS_RESPONSE

        if (!orderId) {
            console.error('Redsys Webhook: Número de pedido no encontrado en notificación')
            return new Response('Missing order ID', { status: 400 })
        }

        const isSuccess = isRedsysSuccess(responseCode)
        console.log(`Redsys Webhook: Pedido ${orderId}, Respuesta ${responseCode}, Éxito: ${isSuccess}`)

        // Acceso directo con privilegios de Administrador (bypassing RLS)
        const supabase = getSupabaseAdmin()

        // Buscar la reserva asociada por el código de pedido de Redsys
        const { data: booking, error: findError } = await supabase
            .from('bookings')
            .select('*')
            .eq('payment_intent_id', orderId)
            .maybeSingle()

        if (findError || !booking) {
            console.warn(`Redsys Webhook: Reserva con pedido ${orderId} no encontrada en Supabase`)
            return new Response('Booking not found', { status: 200 })
        }

        if (isSuccess) {
            // 1. Marcar reserva como pagada, asociar payment_intent_id y mantener en 'pending' a la espera de confirmación del admin
            await supabase
                .from('bookings')
                .update({
                    payment_status: 'paid',
                    payment_intent_id: orderId,
                    status: 'pending',
                })
                .eq('id', booking.id)

            // 2. Bloquear fechas en el calendario para asegurar que nadie más pueda reservar este rango
            // Comprobamos si ya existe el bloqueo para evitar duplicados (idempotencia)
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

            console.log(`Redsys Webhook: Reserva ${booking.id} pagada y fechas auto-bloqueadas con éxito`)
        } else {
            // Pago fallido o denegado por la pasarela
            await supabase
                .from('bookings')
                .update({
                    payment_status: 'failed',
                })
                .eq('id', booking.id)

            console.log(`Redsys Webhook: Reserva ${booking.id} marcada como pago fallido`)
        }

        return new Response('OK', { status: 200 })
    } catch (err: any) {
        console.error('Redsys Webhook Unhandled Exception:', err)
        return new Response('Server Error', { status: 500 })
    }
}
