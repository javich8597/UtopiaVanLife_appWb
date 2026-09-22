import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    generateRedsysOrderId,
    createRedsysPaymentForm,
    calculateSignature,
    encodeMerchantParameters,
    decodeMerchantParameters,
    verifyRedsysSignature,
    isRedsysSuccess,
    REDSYS_TEST_DEFAULTS,
    getRedsysGatewayUrl,
} from '../lib/redsys'

describe('Redsys Payment Gateway Unit Tests', () => {
    it('should generate valid 12-char Redsys Order IDs starting with 4 digits', () => {
        for (let i = 0; i < 10; i++) {
            const orderId = generateRedsysOrderId()
            assert.equal(orderId.length, 12, `Order ID ${orderId} must be exactly 12 characters`)
            assert.match(orderId, /^\d{4}[a-z0-9]{8}$/, `Order ID ${orderId} must start with 4 digits followed by 8 alphanumeric characters`)
        }
    })

    it('should respect custom 4-digit seed prefix if provided', () => {
        const orderId = generateRedsysOrderId('1234')
        assert.ok(orderId.startsWith('1234'))
        assert.equal(orderId.length, 12)
    })

    it('should correctly encode and decode merchant parameters', () => {
        const testData = {
            DS_MERCHANT_AMOUNT: '60000',
            DS_MERCHANT_ORDER: '00001258z582',
            DS_MERCHANT_CURRENCY: '978',
        }
        const encoded = encodeMerchantParameters(testData)
        const decoded = decodeMerchantParameters<typeof testData>(encoded)
        assert.deepEqual(decoded, testData)
    })

    it('should generate accurate 3DES and HMAC-SHA256 signature for test gateway', () => {
        const orderId = '00001258z582'
        const merchantParameters = encodeMerchantParameters({
            DS_MERCHANT_AMOUNT: '60000',
            DS_MERCHANT_ORDER: orderId,
            DS_MERCHANT_MERCHANTCODE: REDSYS_TEST_DEFAULTS.merchantCode,
            DS_MERCHANT_CURRENCY: '978',
        })

        const signature = calculateSignature(merchantParameters, orderId, REDSYS_TEST_DEFAULTS.secretKey)
        assert.ok(signature && signature.length > 20)

        // Verify that the signature verifies successfully
        const isValid = verifyRedsysSignature(merchantParameters, signature, REDSYS_TEST_DEFAULTS.secretKey)
        assert.equal(isValid, true)
    })

    it('should verify signature with URL-safe replacement (- and _)', () => {
        const orderId = '1234abcdef56'
        const params = encodeMerchantParameters({
            Ds_Order: orderId,
            Ds_Amount: '35000',
            Ds_Response: '0000',
        })
        const signature = calculateSignature(params, orderId, REDSYS_TEST_DEFAULTS.secretKey)
        const urlSafeSignature = signature.replace(/\+/g, '-').replace(/\//g, '_')

        const isValid = verifyRedsysSignature(params, urlSafeSignature, REDSYS_TEST_DEFAULTS.secretKey)
        assert.equal(isValid, true)
    })

    it('should reject tampered merchant parameters or wrong signature', () => {
        const orderId = '00001258z582'
        const originalParams = encodeMerchantParameters({
            Ds_Order: orderId,
            Ds_Amount: '60000',
        })
        const signature = calculateSignature(originalParams, orderId, REDSYS_TEST_DEFAULTS.secretKey)

        // Tamper with the amount
        const tamperedParams = encodeMerchantParameters({
            Ds_Order: orderId,
            Ds_Amount: '1000',
        })

        const isValid = verifyRedsysSignature(tamperedParams, signature, REDSYS_TEST_DEFAULTS.secretKey)
        assert.equal(isValid, false)
    })

    it('should accurately detect Redsys authorization success codes (0000 to 0099)', () => {
        assert.equal(isRedsysSuccess('0000'), true)
        assert.equal(isRedsysSuccess('0099'), true)
        assert.equal(isRedsysSuccess(0), true)
        assert.equal(isRedsysSuccess(99), true)
        assert.equal(isRedsysSuccess('0101'), false) // Card expired
        assert.equal(isRedsysSuccess('0184'), false) // Auth error
        assert.equal(isRedsysSuccess('0904'), false) // Terminal error
        assert.equal(isRedsysSuccess('9915'), false) // Cancelled by user
        assert.equal(isRedsysSuccess(undefined), false)
    })

    it('should create complete Redsys payment form with correct URLs and amount in cents', () => {
        const orderId = generateRedsysOrderId()
        const formData = createRedsysPaymentForm(
            {
                amount: 600.5,
                orderId,
                description: 'Camper NEO - Utopia Van Life',
                customerName: 'Javier Garcia',
            },
            {
                environment: 'test',
                merchantCode: '999008881',
                terminal: '1',
                secretKey: REDSYS_TEST_DEFAULTS.secretKey,
                appUrl: 'http://localhost:3000',
            }
        )

        assert.equal(formData.url, getRedsysGatewayUrl('test'))
        assert.equal(formData.signatureVersion, 'HMAC_SHA256_V1')
        assert.equal(formData.orderId, orderId)
        assert.ok(formData.signature)

        const decoded = decodeMerchantParameters<any>(formData.merchantParameters)
        assert.equal(decoded.DS_MERCHANT_AMOUNT, '60050') // 600.50 -> 60050 cents
        assert.equal(decoded.DS_MERCHANT_ORDER, orderId)
        assert.equal(decoded.DS_MERCHANT_MERCHANTCODE, '999008881')
        assert.equal(decoded.DS_MERCHANT_CURRENCY, '978')
        assert.equal(decoded.DS_MERCHANT_URLOK, `http://localhost:3000/checkout/success?order=${orderId}`)
        assert.equal(decoded.DS_MERCHANT_URLKO, `http://localhost:3000/checkout/error?order=${orderId}`)
        assert.equal(decoded.DS_MERCHANT_MERCHANTURL, 'http://localhost:3000/api/webhooks/redsys')
    })
})
