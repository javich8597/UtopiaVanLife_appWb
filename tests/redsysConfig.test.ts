import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeSupabase } from './helpers/fakeSupabase'
import { POST as webhook } from '../app/api/webhooks/redsys/route'
import { GET as verifyPayment } from '../app/api/bookings/verify-payment/route'
import { NextRequest } from 'next/server'
import {
    calculateSignature,
    encodeMerchantParameters,
    getRedsysConfig,
    REDSYS_TEST_DEFAULTS,
} from '../lib/redsys'

const ORDER = '1234abcd5678'
const REAL_KEY = Buffer.alloc(24, 'k').toString('base64')
const REAL_MERCHANT = '123456789'

const env = process.env as Record<string, string | undefined>
const keys = ['NODE_ENV', 'REDSYS_ENVIRONMENT', 'REDSYS_ALLOW_TEST_MODE', 'REDSYS_SECRET_KEY', 'REDSYS_MERCHANT_CODE'] as const

describe('Configuración de Redsys', () => {
    const previous = Object.fromEntries(keys.map(key => [key, env[key]]))

    beforeEach(() => { for (const key of keys) delete env[key] })
    afterEach(() => {
        for (const key of keys) {
            if (previous[key] === undefined) delete env[key]
            else env[key] = previous[key]
        }
    })

    const production = (vars: Record<string, string> = {}) => Object.assign(env, { NODE_ENV: 'production', ...vars })

    describe('fuera de producción', () => {
        it('sin variables usa el modo de pruebas', () => {
            const config = getRedsysConfig()

            assert.equal(config.environment, 'test')
            assert.equal(config.secretKey, REDSYS_TEST_DEFAULTS.secretKey)
            assert.equal(config.merchantCode, REDSYS_TEST_DEFAULTS.merchantCode)
        })
    })

    describe('en NODE_ENV=production', () => {
        it('sin variables falla: no usa la clave pública', () => {
            production()

            assert.throws(getRedsysConfig, /modo de pruebas/)
        })

        it('REDSYS_ENVIRONMENT=test sin opt-in falla', () => {
            production({ REDSYS_ENVIRONMENT: 'test' })

            assert.throws(getRedsysConfig, /REDSYS_ALLOW_TEST_MODE/)
        })

        it('el opt-in solo vale con el valor exacto', () => {
            for (const value of ['1', 'TRUE', 'yes', ' true']) {
                production({ REDSYS_ALLOW_TEST_MODE: value })

                assert.throws(getRedsysConfig, /modo de pruebas/, value)
            }
        })

        it('con REDSYS_ALLOW_TEST_MODE=true usa el modo de pruebas', () => {
            production({ REDSYS_ALLOW_TEST_MODE: 'true' })

            const config = getRedsysConfig()

            assert.equal(config.environment, 'test')
            assert.equal(config.secretKey, REDSYS_TEST_DEFAULTS.secretKey)
        })

        it('REDSYS_ENVIRONMENT=production funciona con clave y comercio reales', () => {
            production({ REDSYS_ENVIRONMENT: 'production', REDSYS_SECRET_KEY: REAL_KEY, REDSYS_MERCHANT_CODE: REAL_MERCHANT })

            const config = getRedsysConfig()

            assert.equal(config.environment, 'production')
            assert.equal(config.secretKey, REAL_KEY)
            assert.equal(config.merchantCode, REAL_MERCHANT)
        })
    })

    describe('REDSYS_ENVIRONMENT=production', () => {
        const base = { REDSYS_ENVIRONMENT: 'production' }

        it('nunca admite la clave ni el comercio de pruebas, ni siquiera con el opt-in', () => {
            production({ ...base, REDSYS_ALLOW_TEST_MODE: 'true', REDSYS_SECRET_KEY: REDSYS_TEST_DEFAULTS.secretKey, REDSYS_MERCHANT_CODE: REAL_MERCHANT })
            assert.throws(getRedsysConfig, /clave ni el comercio de pruebas/)

            production({ ...base, REDSYS_ALLOW_TEST_MODE: 'true', REDSYS_SECRET_KEY: REAL_KEY, REDSYS_MERCHANT_CODE: REDSYS_TEST_DEFAULTS.merchantCode })
            assert.throws(getRedsysConfig, /clave ni el comercio de pruebas/)
        })

        it('reconoce la clave de pruebas aunque esté escrita de otra forma', () => {
            const sameBytes = [
                `  ${REDSYS_TEST_DEFAULTS.secretKey}\n`,
                Buffer.from(REDSYS_TEST_DEFAULTS.secretKey, 'base64').toString('base64url'),
                `${REDSYS_TEST_DEFAULTS.secretKey}=`,
            ]
            for (const key of sameBytes) {
                production({ ...base, REDSYS_SECRET_KEY: key, REDSYS_MERCHANT_CODE: REAL_MERCHANT })

                assert.throws(getRedsysConfig, /clave ni el comercio de pruebas/, JSON.stringify(key))
            }
        })

        it('una clave solo con espacios cuenta como vacía, y el comercio se recorta', () => {
            production({ ...base, REDSYS_SECRET_KEY: '   ' })
            assert.throws(getRedsysConfig, /REDSYS_SECRET_KEY/)

            production({ ...base, REDSYS_SECRET_KEY: ` ${REAL_KEY} `, REDSYS_MERCHANT_CODE: ` ${REAL_MERCHANT}\n` })
            const config = getRedsysConfig()
            assert.equal(config.secretKey, REAL_KEY)
            assert.equal(config.merchantCode, REAL_MERCHANT)

            production({ ...base, REDSYS_SECRET_KEY: REAL_KEY, REDSYS_MERCHANT_CODE: ` ${REDSYS_TEST_DEFAULTS.merchantCode} ` })
            assert.throws(getRedsysConfig, /clave ni el comercio de pruebas/)
        })

        it('sin clave falla', () => {
            production(base)

            assert.throws(getRedsysConfig, /REDSYS_SECRET_KEY/)
        })
    })

    it('un valor desconocido de REDSYS_ENVIRONMENT falla en cualquier entorno', () => {
        for (const value of ['prod', 'Production', 'sandbox', ' production']) {
            env.REDSYS_ENVIRONMENT = value

            assert.throws(getRedsysConfig, /REDSYS_ENVIRONMENT/, value)
        }
    })

    describe('con la clave pública en producción, una notificación firmada', () => {
        let fake: ReturnType<typeof installFakeSupabase>
        const silenced = console.error

        const merchantParameters = encodeMerchantParameters({
            Ds_Order: ORDER,
            Ds_Response: '0000',
            Ds_Amount: '70000',
            Ds_Currency: '978',
            Ds_TransactionType: '0',
            Ds_MerchantCode: REDSYS_TEST_DEFAULTS.merchantCode,
        })
        const signature = calculateSignature(merchantParameters, ORDER, REDSYS_TEST_DEFAULTS.secretKey)

        beforeEach(() => {
            fake = installFakeSupabase({
                bookings: [{
                    id: 'b1', camper_id: 'c1', start_date: '2099-06-01', end_date: '2099-06-08',
                    status: 'pending', payment_status: 'pending', payment_intent_id: ORDER, total_price: 700,
                }],
            })
            production()
            console.error = () => {}
        })

        afterEach(() => {
            fake.restore()
            console.error = silenced
        })

        it('no marca la reserva como pagada por el webhook', async () => {
            const res = await webhook(new Request('http://localhost/api/webhooks/redsys', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ Ds_SignatureVersion: 'HMAC_SHA256_V1', Ds_MerchantParameters: merchantParameters, Ds_Signature: signature }),
            }))

            assert.equal(res.status, 500)
            assert.equal(fake.tables.bookings[0].payment_status, 'pending')
            assert.deepEqual(fake.requests, [])
        })

        it('no marca la reserva como pagada por verify-payment', async () => {
            const query = new URLSearchParams({ Ds_MerchantParameters: merchantParameters, Ds_Signature: signature })

            const res = await verifyPayment(new NextRequest(`http://localhost/api/bookings/verify-payment?${query}`))

            assert.equal(res.status, 500)
            assert.equal(fake.tables.bookings[0].payment_status, 'pending')
            assert.deepEqual(fake.requests, [])
        })
    })
})
