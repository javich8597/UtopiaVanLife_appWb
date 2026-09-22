import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    generateRedsysOrderId,
    createRedsysPaymentForm,
    calculateSignature,
    encrypt3DES,
    encodeMerchantParameters,
    decodeMerchantParameters,
    verifyRedsysSignature,
    isRedsysSuccess,
    REDSYS_TEST_DEFAULTS,
    getRedsysGatewayUrl,
    RedsysNotificationParams,
} from '../lib/redsys'

describe('R4 Redsys Payment Gateway Test Suite', () => {

    // ---------------------------------------------------------------------
    // TIER 1: Redsys Parameter Format, Normalization & Enums
    // ---------------------------------------------------------------------

    describe('Tier 1: Order ID, Cents Conversion, Currency & Transaction Type', () => {
        it('generates order IDs conforming to Redsys standard (4-12 chars, first 4 numeric)', () => {
            for (let i = 0; i < 20; i++) {
                const orderId = generateRedsysOrderId()
                assert.equal(orderId.length, 12, `Order ID "${orderId}" must be exactly 12 characters`)
                assert.match(orderId, /^\d{4}[a-z0-9]{8}$/, `Order ID "${orderId}" must start with 4 digits followed by 8 alphanumeric characters`)
            }
        })

        it('supports 4-digit custom seed prefixes', () => {
            const orderId = generateRedsysOrderId('8899')
            assert.ok(orderId.startsWith('8899'))
            assert.equal(orderId.length, 12)
        })

        it('converts Euro amounts into integer cents without decimals', () => {
            const testCases = [
                { eur: 600.00, expectedCents: '60000' },
                { eur: 1234.56, expectedCents: '123456' },
                { eur: 0.01, expectedCents: '1' },
                { eur: 49.99, expectedCents: '4999' },
                { eur: 150.05, expectedCents: '15005' },
                { eur: 884.00, expectedCents: '88400' },
            ]

            for (const tc of testCases) {
                const formData = createRedsysPaymentForm({
                    amount: tc.eur,
                    orderId: '0001test1234',
                })
                const decoded = decodeMerchantParameters<any>(formData.merchantParameters)
                assert.equal(
                    decoded.DS_MERCHANT_AMOUNT,
                    tc.expectedCents,
                    `Amount ${tc.eur} € must convert to ${tc.expectedCents} cents`
                )
            }
        })

        it('enforces ISO 4217 numeric currency code 978 (EUR)', () => {
            const formData = createRedsysPaymentForm({
                amount: 250,
                orderId: '0002test1234',
            })
            const decoded = decodeMerchantParameters<any>(formData.merchantParameters)
            assert.equal(decoded.DS_MERCHANT_CURRENCY, '978')
        })

        it('enforces transaction type "0" (Autorización Estándar)', () => {
            const formData = createRedsysPaymentForm({
                amount: 350,
                orderId: '0003test1234',
            })
            const decoded = decodeMerchantParameters<any>(formData.merchantParameters)
            assert.equal(decoded.DS_MERCHANT_TRANSACTIONTYPE, '0')
        })

        it('sets default terminal "1" and correctly formats callback URLs', () => {
            const orderId = '0004test1234'
            const formData = createRedsysPaymentForm(
                { amount: 500, orderId },
                { appUrl: 'https://utopiavanlife.com' }
            )
            const decoded = decodeMerchantParameters<any>(formData.merchantParameters)
            assert.equal(decoded.DS_MERCHANT_TERMINAL, '1')
            assert.equal(decoded.DS_MERCHANT_MERCHANTURL, 'https://utopiavanlife.com/api/webhooks/redsys')
            assert.equal(decoded.DS_MERCHANT_URLOK, `https://utopiavanlife.com/checkout/success?order=${orderId}`)
            assert.equal(decoded.DS_MERCHANT_URLKO, `https://utopiavanlife.com/checkout/error?order=${orderId}`)
        })

        it('truncates product description to 125 chars and titular name to 60 chars', () => {
            const longDesc = 'A'.repeat(200)
            const longName = 'B'.repeat(100)

            const formData = createRedsysPaymentForm({
                amount: 400,
                orderId: '0005test1234',
                description: longDesc,
                customerName: longName,
            })
            const decoded = decodeMerchantParameters<any>(formData.merchantParameters)
            assert.equal(decoded.DS_MERCHANT_PRODUCTDESCRIPTION.length, 125)
            assert.equal(decoded.DS_MERCHANT_TITULAR.length, 60)
        })
    })

    // ---------------------------------------------------------------------
    // TIER 2: 3DES CBC Key Diversification & HMAC-SHA256 Signatures
    // ---------------------------------------------------------------------

    describe('Tier 2: 3DES CBC Diversification & HMAC-SHA256 Cryptography', () => {
        it('diversifies secret key with orderId using 3DES CBC', () => {
            const orderId1 = '0001aaaa1111'
            const orderId2 = '0002bbbb2222'

            const key1 = encrypt3DES(orderId1, REDSYS_TEST_DEFAULTS.secretKey)
            const key2 = encrypt3DES(orderId2, REDSYS_TEST_DEFAULTS.secretKey)

            assert.ok(Buffer.isBuffer(key1))
            assert.ok(Buffer.isBuffer(key2))
            assert.equal(key1.length, 16, '3DES key should be 16 bytes')
            assert.equal(key2.length, 16, '3DES key should be 16 bytes')

            // Key diversification: different order IDs yield different derived keys
            assert.notDeepEqual(key1, key2)

            // Deterministic: same order ID yields identical derived key
            const key1Repeat = encrypt3DES(orderId1, REDSYS_TEST_DEFAULTS.secretKey)
            assert.deepEqual(key1, key1Repeat)
        })

        it('generates reproducible HMAC-SHA256 merchant signature', () => {
            const orderId = '1234order0001'
            const params = encodeMerchantParameters({
                DS_MERCHANT_AMOUNT: '45000',
                DS_MERCHANT_ORDER: orderId,
                DS_MERCHANT_CURRENCY: '978',
            })

            const sig1 = calculateSignature(params, orderId, REDSYS_TEST_DEFAULTS.secretKey)
            const sig2 = calculateSignature(params, orderId, REDSYS_TEST_DEFAULTS.secretKey)

            assert.ok(sig1)
            assert.equal(sig1, sig2)
            assert.match(sig1, /^[A-Za-z0-9+/=]+$/)
        })

        it('verifies genuine signature and handles URL-safe Base64 substitution', () => {
            const orderId = '5678order0002'
            const params = encodeMerchantParameters({
                Ds_Order: orderId,
                Ds_Amount: '50000',
                Ds_Response: '0000',
            })

            const standardSig = calculateSignature(params, orderId, REDSYS_TEST_DEFAULTS.secretKey)

            // Standard verification
            assert.equal(verifyRedsysSignature(params, standardSig, REDSYS_TEST_DEFAULTS.secretKey), true)

            // URL-safe verification (+ -> -, / -> _, no =)
            const urlSafeSig = standardSig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
            assert.equal(verifyRedsysSignature(params, urlSafeSig, REDSYS_TEST_DEFAULTS.secretKey), true)
        })

        it('rejects tampered parameters where amount or orderId is modified', () => {
            const orderId = '9999order0003'
            const originalParams = encodeMerchantParameters({
                Ds_Order: orderId,
                Ds_Amount: '60000', // 600.00 €
            })
            const validSignature = calculateSignature(originalParams, orderId, REDSYS_TEST_DEFAULTS.secretKey)

            // Attack: change amount to 10.00 €
            const tamperedParams = encodeMerchantParameters({
                Ds_Order: orderId,
                Ds_Amount: '1000',
            })

            assert.equal(verifyRedsysSignature(tamperedParams, validSignature, REDSYS_TEST_DEFAULTS.secretKey), false)

            // Attack: change orderId
            const tamperedOrderId = encodeMerchantParameters({
                Ds_Order: '8888order9999',
                Ds_Amount: '60000',
            })
            assert.equal(verifyRedsysSignature(tamperedOrderId, validSignature, REDSYS_TEST_DEFAULTS.secretKey), false)
        })

        it('rejects signature verified with wrong secret key', () => {
            const orderId = '1111order0004'
            const params = encodeMerchantParameters({
                Ds_Order: orderId,
                Ds_Amount: '15000',
            })
            const signature = calculateSignature(params, orderId, REDSYS_TEST_DEFAULTS.secretKey)

            // Valid 24-byte key length for 3DES, but wrong key content
            const wrongKey = Buffer.alloc(24, 'x').toString('base64')
            assert.equal(verifyRedsysSignature(params, signature, wrongKey), false)
        })
    })

    // ---------------------------------------------------------------------
    // TIER 3: Webhook Payload Decoding & Response Codes
    // ---------------------------------------------------------------------

    describe('Tier 3: Webhook Notification Decoding & Response Code Evaluation', () => {
        it('decodes complete webhook notification payload accurately', () => {
            const notificationObj: RedsysNotificationParams = {
                Ds_Date: '22/09/2026',
                Ds_Hour: '21:30',
                Ds_Amount: '44000',
                Ds_Currency: '978',
                Ds_Order: '0010order1234',
                Ds_MerchantCode: REDSYS_TEST_DEFAULTS.merchantCode,
                Ds_Terminal: '1',
                Ds_Response: '0000',
                Ds_TransactionType: '0',
                Ds_AuthorisationCode: '492812',
                Ds_Card_Country: '724', // Spain
            }

            const encoded = encodeMerchantParameters(notificationObj)
            const decoded = decodeMerchantParameters<RedsysNotificationParams>(encoded)

            assert.deepEqual(decoded, notificationObj)
            assert.equal(decoded.Ds_Order, '0010order1234')
            assert.equal(decoded.Ds_Response, '0000')
        })

        it('classifies authorization success codes (0000 to 0099) as true', () => {
            assert.equal(isRedsysSuccess('0000'), true) // Standard approved
            assert.equal(isRedsysSuccess('0001'), true)
            assert.equal(isRedsysSuccess('0099'), true)
            assert.equal(isRedsysSuccess(0), true)
            assert.equal(isRedsysSuccess(99), true)
        })

        it('classifies decline, cancellation and error codes as false', () => {
            const declineCodes = [
                { code: '0101', description: 'Tarjeta caducada' },
                { code: '0180', description: 'Tarjeta ajena al servicio' },
                { code: '0184', description: 'Error en la autenticación del titular' },
                { code: '0190', description: 'Denegación del emisor sin motivo' },
                { code: '0904', description: 'Comercio no registrado en FUC' },
                { code: '9102', description: 'Operación denegada por emisor' },
                { code: '9915', description: 'Cancelado voluntariamente por el usuario' },
            ]

            for (const { code, description } of declineCodes) {
                assert.equal(
                    isRedsysSuccess(code),
                    false,
                    `Code ${code} (${description}) must NOT be classified as success`
                )
            }
        })

        it('handles undefined, null, empty or non-numeric response codes safely', () => {
            assert.equal(isRedsysSuccess(undefined), false)
            assert.equal(isRedsysSuccess(null as any), false)
            assert.equal(isRedsysSuccess(''), false)
            assert.equal(isRedsysSuccess('INVALID'), false)
        })
    })
})
