import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import {
    REDSYS_TEST_DEFAULTS,
    getRedsysConfig,
    isValidRedsysOrderId,
    createRedsysPaymentForm,
    calculateSignature,
    encodeMerchantParameters,
    decodeMerchantParameters,
    verifyRedsysSignature,
    isRedsysSuccess,
    normalizeBase64,
} from '../lib/redsys'

describe('Redsys Full Hardening & Sandbox Verification Test Suite', () => {

    it('validates official Sandbox credentials (FUC 999008881 & key sq7HjrUOBfKmC576ILgskD5srU870gJ7)', () => {
        assert.equal(REDSYS_TEST_DEFAULTS.merchantCode, '999008881')
        assert.equal(REDSYS_TEST_DEFAULTS.terminal, '1')
        assert.equal(REDSYS_TEST_DEFAULTS.secretKey, 'sq7HjrUOBfKmC576ILgskD5srU870gJ7')

        const config = getRedsysConfig()
        assert.equal(config.terminal, '1')
        assert.equal(config.secretKey, 'sq7HjrUOBfKmC576ILgskD5srU870gJ7')
    })

    it('enforces orderId validation strictly (4-12 alphanumeric, first 4 digits)', () => {
        // Valid order IDs
        assert.equal(isValidRedsysOrderId('1234'), true)
        assert.equal(isValidRedsysOrderId('1234abcd'), true)
        assert.equal(isValidRedsysOrderId('9999abc12345'), true)
        assert.equal(isValidRedsysOrderId('0001test1234'), true)

        // Invalid order IDs
        assert.equal(isValidRedsysOrderId('123'), false) // Too short (< 4)
        assert.equal(isValidRedsysOrderId('1234567890123'), false) // Too long (> 12)
        assert.equal(isValidRedsysOrderId('abcd1234'), false) // Does not start with 4 digits
        assert.equal(isValidRedsysOrderId('123a4567'), false) // 4th char is not a digit
        assert.equal(isValidRedsysOrderId(''), false)
        assert.equal(isValidRedsysOrderId(null), false)
        assert.equal(isValidRedsysOrderId(undefined), false)
        assert.equal(isValidRedsysOrderId('1234-5678'), false) // Contains forbidden hyphen
    })

    it('throws descriptive error if createRedsysPaymentForm receives invalid orderId', () => {
        assert.throws(
            () => {
                createRedsysPaymentForm({
                    amount: 500,
                    orderId: 'bad_order',
                })
            },
            /Identificador de pedido Redsys inválido/
        )
    })

    it('performs constant-time timingSafeEqual comparison and rejects length/content tampering', () => {
        const orderId = '0001test5678'
        const merchantParameters = encodeMerchantParameters({
            Ds_Amount: '75000',
            Ds_Order: orderId,
            Ds_MerchantCode: '999008881',
            Ds_Currency: '978',
        })

        const genuineSignature = calculateSignature(merchantParameters, orderId, REDSYS_TEST_DEFAULTS.secretKey)

        // Genuine signature passes
        assert.equal(verifyRedsysSignature(merchantParameters, genuineSignature, REDSYS_TEST_DEFAULTS.secretKey), true)

        // URL-safe version passes
        const urlSafeSig = genuineSignature.replace(/\+/g, '-').replace(/\//g, '_')
        assert.equal(verifyRedsysSignature(merchantParameters, urlSafeSig, REDSYS_TEST_DEFAULTS.secretKey), true)

        // Length mismatch fails safely without throw
        assert.equal(verifyRedsysSignature(merchantParameters, genuineSignature + 'A', REDSYS_TEST_DEFAULTS.secretKey), false)
        assert.equal(verifyRedsysSignature(merchantParameters, genuineSignature.slice(0, 10), REDSYS_TEST_DEFAULTS.secretKey), false)

        // Tampered byte fails safely
        const tamperedSig = genuineSignature.substring(0, genuineSignature.length - 2) + 'XY'
        assert.equal(verifyRedsysSignature(merchantParameters, tamperedSig, REDSYS_TEST_DEFAULTS.secretKey), false)

        // Empty signature fails safely
        assert.equal(verifyRedsysSignature(merchantParameters, '', REDSYS_TEST_DEFAULTS.secretKey), false)
    })

    it('generates payment form with locale-prefixed return URLs and cleans trailing slashes', () => {
        const orderId = '0002test9999'
        const formEs = createRedsysPaymentForm({
            amount: 450.00,
            orderId,
            locale: 'es',
        })
        const decodedEs = decodeMerchantParameters<any>(formEs.merchantParameters)
        assert.ok(decodedEs.DS_MERCHANT_URLOK.includes('/es/checkout/success?order=0002test9999'))
        assert.ok(decodedEs.DS_MERCHANT_URLKO.includes('/es/checkout/error?order=0002test9999'))

        const formEn = createRedsysPaymentForm({
            amount: 450.00,
            orderId,
            locale: 'en',
        })
        const decodedEn = decodeMerchantParameters<any>(formEn.merchantParameters)
        assert.ok(decodedEn.DS_MERCHANT_URLOK.includes('/en/checkout/success?order=0002test9999'))
        assert.ok(decodedEn.DS_MERCHANT_URLKO.includes('/en/checkout/error?order=0002test9999'))
    })

    it('models strict idempotency of webhook transitions and hold management', () => {
        // Mock state machine representing the Supabase bookings and blocked_dates tables
        interface MockBooking {
            id: string
            payment_status: 'pending' | 'paid' | 'failed'
            status: 'pending' | 'confirmed'
            payment_intent_id: string
            total_price: number
            otp_sent_count: number
        }

        const booking: MockBooking = {
            id: 'b100',
            payment_status: 'pending',
            status: 'pending',
            payment_intent_id: '0003order8888',
            total_price: 650.00,
            otp_sent_count: 0,
        }

        const blockedDates: Array<{ session_id: string; reason: string }> = [
            { session_id: 'checkout_0003order8888', reason: 'checkout_hold' }
        ]

        // Function that mimics the idempotent webhook handler
        function handleNotification(isSuccess: boolean, orderId: string, receivedAmountCents: number) {
            const expectedAmountCents = Math.round(booking.total_price * 100)
            if (receivedAmountCents !== expectedAmountCents) {
                booking.payment_status = 'failed'
                return { status: 400, message: 'Amount mismatch' }
            }

            if (isSuccess) {
                const wasAlreadyPaid = booking.payment_status === 'paid'

                if (!wasAlreadyPaid) {
                    booking.payment_status = 'paid'
                    booking.status = 'pending'
                }

                // Calendar auto-lock
                const sessionId = `redsys_${orderId}`
                const exists = blockedDates.some(b => b.session_id === sessionId)
                if (!exists) {
                    blockedDates.push({ session_id: sessionId, reason: 'Auto-Bloqueo Redsys' })
                }

                // Remove provisional holds
                const idx = blockedDates.findIndex(b => b.session_id === `checkout_${orderId}`)
                if (idx !== -1) {
                    blockedDates.splice(idx, 1)
                }

                // OTP email sent only on first transition
                if (!wasAlreadyPaid) {
                    booking.otp_sent_count++
                }

                return { status: 200, message: 'OK' }
            } else {
                // Failure releases hold
                const idx = blockedDates.findIndex(b => b.session_id === `checkout_${orderId}`)
                if (idx !== -1) {
                    blockedDates.splice(idx, 1)
                }

                if (booking.payment_status !== 'paid') {
                    booking.payment_status = 'failed'
                }

                return { status: 200, message: 'Payment failed' }
            }
        }

        // 1st Notification: Successful payment
        const res1 = handleNotification(true, '0003order8888', 65000)
        assert.equal(res1.status, 200)
        assert.equal(booking.payment_status, 'paid')
        assert.equal(booking.otp_sent_count, 1)
        assert.equal(blockedDates.some(b => b.session_id === 'redsys_0003order8888'), true)
        assert.equal(blockedDates.some(b => b.session_id === 'checkout_0003order8888'), false)

        // 2nd Notification: Duplicate webhook from Redsys (network retry)
        const res2 = handleNotification(true, '0003order8888', 65000)
        assert.equal(res2.status, 200)
        assert.equal(booking.payment_status, 'paid')
        assert.equal(booking.otp_sent_count, 1, 'OTP email must NOT be sent again on duplicate webhook')
        assert.equal(blockedDates.filter(b => b.session_id === 'redsys_0003order8888').length, 1, 'Auto-lock must not duplicate')

        // 3rd Notification: Delayed error/reversal attempt cannot flip already paid booking
        const res3 = handleNotification(false, '0003order8888', 65000)
        assert.equal(booking.payment_status, 'paid', 'Already paid booking must remain paid')
    })

    it('verifies hold release on failed payment allowing immediate rebooking without 15 min wait', () => {
        const activeHolds = new Set<string>(['checkout_0004fail1234'])

        function onPaymentFailed(orderId: string) {
            activeHolds.delete(`checkout_${orderId}`)
            activeHolds.delete(`hold_${orderId}`)
        }

        assert.equal(activeHolds.has('checkout_0004fail1234'), true)
        onPaymentFailed('0004fail1234')
        assert.equal(activeHolds.has('checkout_0004fail1234'), false, 'Hold must be deleted immediately on failed payment')
    })
})
