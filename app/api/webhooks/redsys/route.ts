import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
    getRedsysConfig,
    verifyRedsysSignature,
    decodeMerchantParameters,
    RedsysNotificationParams,
} from '@/lib/redsys'
import { processRedsysNotification } from '@/lib/redsysNotification'

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

        if (signatureVersion && signatureVersion !== 'HMAC_SHA256_V1') {
            console.error('Redsys Webhook: Versión de firma incompatible:', signatureVersion)
            return new Response('Invalid signature version', { status: 400 })
        }

        const config = getRedsysConfig()
        const isValid = verifyRedsysSignature(merchantParameters, signature, config.secretKey)

        if (!isValid) {
            console.error('Redsys Webhook: Firma inválida recibida')
            return new Response('Invalid signature', { status: 400 })
        }

        const notificationData = decodeMerchantParameters<RedsysNotificationParams>(merchantParameters)
        const dsMerchantCode = notificationData.Ds_MerchantCode || notificationData.DS_MERCHANTCODE

        if (dsMerchantCode !== config.merchantCode) {
            console.error('Redsys Webhook: MerchantCode mismatch')
            return new Response('Invalid merchant code', { status: 400 })
        }

        // Acceso con privilegios de administrador: la notificación no trae sesión de usuario
        const { httpStatus, body } = await processRedsysNotification(getSupabaseAdmin(), notificationData)
        return new Response(body, { status: httpStatus })
    } catch (err: any) {
        console.error('Redsys Webhook Unhandled Exception:', err)
        return new Response('Server Error', { status: 500 })
    }
}

