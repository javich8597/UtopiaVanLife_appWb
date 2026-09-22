import crypto from 'crypto'

export interface RedsysConfig {
    environment: 'test' | 'production'
    merchantCode: string
    terminal: string
    secretKey: string
    appUrl: string
}

export interface RedsysOrderRequest {
    amount: number // In Euros, e.g. 600.00
    orderId: string // 4 to 12 alphanumeric characters, first 4 numeric
    description?: string
    customerName?: string
    locale?: string
}

export interface RedsysFormData {
    url: string
    signatureVersion: string
    merchantParameters: string
    signature: string
    orderId: string
}

export interface RedsysNotificationParams {
    Ds_Date?: string
    Ds_Hour?: string
    Ds_Amount?: string
    Ds_Currency?: string
    Ds_Order?: string
    Ds_MerchantCode?: string
    Ds_Terminal?: string
    Ds_Response?: string
    Ds_MerchantData?: string
    Ds_SecurePayment?: string
    Ds_TransactionType?: string
    Ds_Card_Country?: string
    Ds_AuthorisationCode?: string
    Ds_ConsumerLanguage?: string
    Ds_Card_Type?: string
    [key: string]: any
}

// Redsys Endpoints
export const REDSYS_URLS = {
    test: 'https://sis-t.redsys.es:25443/sis/realizarPago',
    production: 'https://sis.redsys.es/sis/realizarPago/utf-8',
}

// Default Sandbox Credentials for Testing (Official Redsys Test Gateway)
export const REDSYS_TEST_DEFAULTS = {
    merchantCode: '999008881',
    terminal: '1',
    secretKey: 'sq7HjrUqKpOuKiGbKWwbqy6kh6xminic',
}

/**
 * Retrieves the current Redsys configuration from environment variables
 */
export function getRedsysConfig(): RedsysConfig {
    const environment = (process.env.REDSYS_ENVIRONMENT === 'production' ? 'production' : 'test') as 'test' | 'production'
    
    // In production, require actual merchant code and secret key
    const merchantCode = process.env.REDSYS_MERCHANT_CODE || (environment === 'production' ? '36935583' : REDSYS_TEST_DEFAULTS.merchantCode)
    const terminal = process.env.REDSYS_TERMINAL || '1'
    const secretKey = process.env.REDSYS_SECRET_KEY || REDSYS_TEST_DEFAULTS.secretKey
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

    return {
        environment,
        merchantCode,
        terminal,
        secretKey,
        appUrl,
    }
}

/**
 * Returns the gateway URL according to environment
 */
export function getRedsysGatewayUrl(env: 'test' | 'production'): string {
    return REDSYS_URLS[env] || REDSYS_URLS.test
}

/**
 * Generates a valid Redsys Order ID (12 alphanumeric characters, starting with 4 digits).
 * Pattern example: 0000 + 8 unique chars, matching standard Redsys order format e.g. 00001258z582
 */
export function generateRedsysOrderId(seedPrefix?: string): string {
    // Generate 4 digits
    const prefix = seedPrefix && /^\d{4}$/.test(seedPrefix) 
        ? seedPrefix 
        : `${Math.floor(1000 + Math.random() * 9000)}`
    
    // Generate remaining 8 characters (letters and digits, lowercase/numbers)
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
    let suffix = ''
    const randomBytes = crypto.randomBytes(8)
    for (let i = 0; i < 8; i++) {
        suffix += chars[randomBytes[i] % chars.length]
    }

    return `${prefix}${suffix}`
}

/**
 * Pads a buffer with zero bytes to a multiple of 8 (for Redsys 3DES CBC mode)
 */
function padZero(buffer: Buffer): Buffer {
    const padLength = 8 - (buffer.length % 8)
    if (padLength === 8) {
        return buffer
    }
    return Buffer.concat([buffer, Buffer.alloc(padLength, 0)])
}

/**
 * Derives the 3DES encryption key for a given order using the merchant's secret key
 */
export function encrypt3DES(orderId: string, secretKeyBase64: string): Buffer {
    const keyBuffer = Buffer.from(secretKeyBase64, 'base64')
    const iv = Buffer.alloc(8, 0)
    const cipher = crypto.createCipheriv('des-ede3-cbc', keyBuffer, iv)
    cipher.setAutoPadding(false)

    const orderBuffer = Buffer.from(orderId, 'utf8')
    const paddedOrder = padZero(orderBuffer)

    return Buffer.concat([cipher.update(paddedOrder), cipher.final()])
}

/**
 * Calculates the HMAC-SHA256 signature for Redsys
 */
export function calculateSignature(merchantParametersBase64: string, orderId: string, secretKeyBase64: string): string {
    const derivedKey = encrypt3DES(orderId, secretKeyBase64)
    const hmac = crypto.createHmac('sha256', derivedKey)
    hmac.update(merchantParametersBase64)
    return hmac.digest('base64')
}

/**
 * Decodes and parses Base64 encoded merchant parameters
 */
export function decodeMerchantParameters<T = RedsysNotificationParams>(base64Params: string): T {
    const jsonStr = Buffer.from(base64Params, 'base64').toString('utf8')
    return JSON.parse(jsonStr) as T
}

/**
 * Encodes an object to Base64 JSON string
 */
export function encodeMerchantParameters(params: Record<string, any>): string {
    const jsonStr = JSON.stringify(params)
    return Buffer.from(jsonStr, 'utf8').toString('base64')
}

/**
 * Normalizes base64 string to handle URL-safe characters (-_ instead of +/)
 */
export function normalizeBase64(str: string): string {
    return str.replace(/-/g, '+').replace(/_/g, '/')
}

/**
 * Verifies if an incoming signature from Redsys matches the calculated signature
 */
export function verifyRedsysSignature(
    merchantParametersBase64: string,
    receivedSignature: string,
    secretKeyBase64: string
): boolean {
    try {
        const decoded = decodeMerchantParameters(merchantParametersBase64)
        // Redsys parameters in notification can be Ds_Order or DS_ORDER (or DS_MERCHANT_ORDER in requests)
        const orderId = decoded.Ds_Order || decoded.DS_ORDER || decoded.DS_MERCHANT_ORDER || decoded.Ds_Merchant_Order
        if (!orderId) {
            return false
        }

        const expectedSignature = calculateSignature(merchantParametersBase64, orderId, secretKeyBase64)

        const normReceived = normalizeBase64(receivedSignature).replace(/=+$/, '')
        const normExpected = normalizeBase64(expectedSignature).replace(/=+$/, '')

        return normReceived === normExpected
    } catch (e) {
        console.error('Error verifying Redsys signature:', e)
        return false
    }
}

/**
 * Checks if the Redsys response code indicates a successful authorization (0000 - 0099)
 */
export function isRedsysSuccess(responseCode?: string | number): boolean {
    if (responseCode === undefined || responseCode === null) return false
    const codeNum = parseInt(String(responseCode), 10)
    return !isNaN(codeNum) && codeNum >= 0 && codeNum <= 99
}

/**
 * Prepares the complete form data required to redirect the client to Redsys TPV
 */
export function createRedsysPaymentForm(
    orderReq: RedsysOrderRequest,
    customConfig?: Partial<RedsysConfig>
): RedsysFormData {
    const config = { ...getRedsysConfig(), ...customConfig }

    // Redsys requires amount in cents without commas/dots (e.g. 600.00 -> "60000")
    const amountInCents = Math.round(orderReq.amount * 100).toString()

    const merchantParametersObj: Record<string, any> = {
        DS_MERCHANT_AMOUNT: amountInCents,
        DS_MERCHANT_ORDER: orderReq.orderId,
        DS_MERCHANT_MERCHANTCODE: config.merchantCode,
        DS_MERCHANT_CURRENCY: '978', // EUR
        DS_MERCHANT_TRANSACTIONTYPE: '0', // Autorización
        DS_MERCHANT_TERMINAL: config.terminal,
        DS_MERCHANT_MERCHANTURL: `${config.appUrl}/api/webhooks/redsys`,
        DS_MERCHANT_URLOK: `${config.appUrl}/checkout/success?order=${orderReq.orderId}`,
        DS_MERCHANT_URLKO: `${config.appUrl}/checkout/error?order=${orderReq.orderId}`,
    }

    if (orderReq.description) {
        // Redsys limits product description to 125 chars
        merchantParametersObj.DS_MERCHANT_PRODUCTDESCRIPTION = orderReq.description.slice(0, 125)
    }

    if (orderReq.customerName) {
        merchantParametersObj.DS_MERCHANT_TITULAR = orderReq.customerName.slice(0, 60)
    }

    const merchantParameters = encodeMerchantParameters(merchantParametersObj)
    const signature = calculateSignature(merchantParameters, orderReq.orderId, config.secretKey)

    return {
        url: getRedsysGatewayUrl(config.environment),
        signatureVersion: 'HMAC_SHA256_V1',
        merchantParameters,
        signature,
        orderId: orderReq.orderId,
    }
}
