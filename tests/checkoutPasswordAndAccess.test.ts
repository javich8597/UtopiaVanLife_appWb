import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST } from '../app/api/bookings/checkout/route'
import { isAllowedOriginHostname } from '../app/api/bookings/checkout/route'
import { GET as verifyPaymentGet } from '../app/api/bookings/verify-payment/route'
import { NextRequest } from 'next/server'
import { createCheckoutAccessToken, hasCheckoutAccess } from '../lib/checkoutAccess'
import { createRedsysPaymentForm, decodeMerchantParameters, getRedsysConfig } from '../lib/redsys'
import { registerVerifyPaymentAttempt, MAX_VERIFY_PAYMENTS_PER_IP } from '../lib/booking/checkoutRateLimit'

const camper = { id: 'c1', slug: 'space', name: 'SPACE', base_price_per_night: 110 }

const sampleCustomer = {
    fullName: 'Carlos Viajero',
    email: 'carlos@example.com',
    phone: '+34 600112233',
    dniNie: '12345678Z',
    birthDate: '1995-05-15',
    licenseDate: '2018-05-15',
    address: 'Calle Mayor 10, Madrid',
}

const checkoutPayload = (overrides: Row = {}, customerOverrides: Row = {}) => ({
    camperSlug: 'space',
    startDate: '2099-09-01',
    endDate: '2099-09-06',
    pickupSlot: 'morning',
    dropoffSlot: 'afternoon',
    customer: {
        ...sampleCustomer,
        ...customerOverrides,
    },
    ...overrides,
})

describe('ENGINE - Checkout Password & Post-Payment Access Token', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({ campers: [camper] })
        console.error = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        fake.restore()
        Object.assign(console, silenced)
    })

    describe('1. Validación de contraseña en Checkout', () => {
        it('rechaza contraseñas de menos de 8 caracteres con error 400', async () => {
            const res = await POST(new Request('http://localhost/api/bookings/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(checkoutPayload({}, { password: 'short' })),
            }))

            assert.equal(res.status, 400)
            const json = await res.json()
            assert.match(json.error, /entre 8 y 128 caracteres/)
        })

        it('rechaza contraseñas de más de 128 caracteres con error 400', async () => {
            const longPass = 'A'.repeat(129)
            const res = await POST(new Request('http://localhost/api/bookings/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(checkoutPayload({}, { password: longPass })),
            }))

            assert.equal(res.status, 400)
            const json = await res.json()
            assert.match(json.error, /entre 8 y 128 caracteres/)
        })

        it('cuenta nueva con contraseña válida: crea la cuenta en Auth con esa contraseña y auto_generated_password=false', async () => {
            const res = await POST(new Request('http://localhost/api/bookings/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(checkoutPayload({}, { password: 'MiPasswordSegura123!' })),
            }))

            assert.equal(res.status, 200)
            const json = await res.json()
            assert.equal(json.success, true)
            assert.ok(json.orderId)

            // Auth user created with that password
            const createdAuth = fake.authUsers.find(u => u.email === sampleCustomer.email)
            assert.ok(createdAuth)
            assert.equal(createdAuth.user_metadata?.auto_generated_password, false)

            // Redsys form has access token in DS_MERCHANT_URLOK
            const params = decodeMerchantParameters(json.formData.merchantParameters)
            assert.ok(params.DS_MERCHANT_URLOK.includes(`order=${json.orderId}`))
            assert.ok(params.DS_MERCHANT_URLOK.includes('&access='))
        })
    })

    describe('2. Intento previo abandonado vs cuenta con reservas previas', () => {
        it('cuenta existente SIN reservas pagadas y provisional (auto_generated_password=true): actualiza contraseña y concede acceso', async () => {
            const abandonedUserId = '00000000-0000-4000-8000-000000000099'
            fake.authUsers.push({
                id: abandonedUserId,
                email: 'abandonado@example.com',
                password: 'AntiguaPasswordAleatoria_123',
                user_metadata: { auto_generated_password: true },
            })
            fake.tables.users.push({
                id: abandonedUserId,
                email: 'abandonado@example.com',
                full_name: 'Cliente Abandonado',
                verification_status: 'not_submitted',
            })

            const res = await POST(new Request('http://localhost/api/bookings/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(checkoutPayload({}, {
                    email: 'abandonado@example.com',
                    password: 'NuevaPasswordDefinitiva2026!',
                })),
            }))

            assert.equal(res.status, 200)
            const json = await res.json()
            assert.equal(json.success, true)

            // Contraseña actualizada en Auth y auto_generated_password apagado
            const updatedAuth = fake.authUsers.find(u => u.id === abandonedUserId)
            assert.equal(updatedAuth?.password, 'NuevaPasswordDefinitiva2026!')
            assert.equal(updatedAuth?.user_metadata?.auto_generated_password, false)

            // URLOK incluye token de acceso
            const params = decodeMerchantParameters(json.formData.merchantParameters)
            assert.ok(params.DS_MERCHANT_URLOK.includes('&access='))
        })

        it('cuenta existente con contraseña ya elegida por el usuario (auto_generated_password=false): JAMÁS sobrescribe si no coincide', async () => {
            const userId = '00000000-0000-4000-8000-000000000055'
            fake.authUsers.push({
                id: userId,
                email: 'registrado@example.com',
                password: 'PasswordOriginalDelUsuario123!',
                user_metadata: { auto_generated_password: false },
                email_confirmed_at: '2026-01-01T00:00:00Z',
            })
            fake.tables.users.push({
                id: userId,
                email: 'registrado@example.com',
                full_name: 'Usuario Registrado',
                verification_status: 'not_submitted',
            })

            const res = await POST(new Request('http://localhost/api/bookings/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(checkoutPayload({}, {
                    email: 'registrado@example.com',
                    password: 'PasswordIntrusoAtacante456!',
                })),
            }))

            assert.equal(res.status, 400)
            const json = await res.json()
            assert.match(json.error, /Ya tienes una cuenta registrada con este email/)

            // La contraseña en Auth NO fue modificada
            const auth = fake.authUsers.find(u => u.id === userId)
            assert.equal(auth?.password, 'PasswordOriginalDelUsuario123!')
        })

        it('cuenta de admin (role === "admin"): JAMÁS sobrescribe la contraseña y rechaza si no coincide', async () => {
            const adminId = '00000000-0000-4000-8000-000000000001'
            fake.authUsers.push({
                id: adminId,
                email: 'admin@utopiavanlife.com',
                password: 'AdminPasswordMuySegura123!',
                app_metadata: { role: 'admin' },
                email_confirmed_at: '2026-01-01T00:00:00Z',
            })
            fake.tables.users.push({
                id: adminId,
                email: 'admin@utopiavanlife.com',
                full_name: 'Admin Boss',
                role: 'admin',
                verification_status: 'verified',
            })

            const res = await POST(new Request('http://localhost/api/bookings/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(checkoutPayload({}, {
                    email: 'admin@utopiavanlife.com',
                    password: 'IntentoDeApropiarseDelAdmin789!',
                })),
            }))

            assert.equal(res.status, 400)
            const json = await res.json()
            assert.match(json.error, /Ya tienes una cuenta registrada con este email/)

            // La contraseña del admin NO fue cambiada
            const auth = fake.authUsers.find(u => u.id === adminId)
            assert.equal(auth?.password, 'AdminPasswordMuySegura123!')
        })

        it('cuenta existente CON reservas pagadas previas: rechaza si la contraseña no coincide', async () => {
            const existingId = '00000000-0000-4000-8000-000000000077'
            fake.authUsers.push({
                id: existingId,
                email: 'veterano@example.com',
                password: 'PasswordCorrecta123!',
            })
            fake.tables.users.push({
                id: existingId,
                email: 'veterano@example.com',
                full_name: 'Veterano Viajero',
                verification_status: 'verified',
            })
            fake.tables.bookings.push({
                id: 'b-antigua',
                user_id: existingId,
                payment_status: 'paid',
                status: 'confirmed',
                start_date: '2025-01-01',
                end_date: '2025-01-05',
            })

            const res = await POST(new Request('http://localhost/api/bookings/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(checkoutPayload({}, {
                    email: 'veterano@example.com',
                    password: 'PasswordEquivocada999!',
                })),
            }))

            assert.equal(res.status, 400)
            const json = await res.json()
            assert.match(json.error, /Ya tienes una cuenta registrada con este email/)
        })

        it('cuenta existente CON reservas pagadas previas: concede acceso si la contraseña coincide', async () => {
            const existingId = '00000000-0000-4000-8000-000000000077'
            fake.authUsers.push({
                id: existingId,
                email: 'veterano@example.com',
                password: 'PasswordCorrecta123!',
            })
            fake.tables.users.push({
                id: existingId,
                email: 'veterano@example.com',
                full_name: 'Veterano Viajero',
                verification_status: 'verified',
                birth_date: '1990-01-01',
                driver_license_issue_date: '2015-01-01',
            })
            fake.tables.bookings.push({
                id: 'b-antigua',
                user_id: existingId,
                payment_status: 'paid',
                status: 'confirmed',
                start_date: '2025-01-01',
                end_date: '2025-01-05',
            })

            const res = await POST(new Request('http://localhost/api/bookings/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(checkoutPayload({}, {
                    email: 'veterano@example.com',
                    password: 'PasswordCorrecta123!',
                })),
            }))

            assert.equal(res.status, 200)
            const json = await res.json()
            assert.equal(json.success, true)
            assert.equal(fake.tables.bookings.at(-1)?.user_id, existingId)

            const params = decodeMerchantParameters(json.formData.merchantParameters)
            assert.ok(params.DS_MERCHANT_URLOK.includes('&access='))
        })
    })

    describe('3. Token de Acceso y Redsys URLOK', () => {
        it('createCheckoutAccessToken genera token firmado válido y reproducible', () => {
            const orderId = '1234abcd5678'
            const now = new Date('2026-11-14T10:00:00Z')
            const token = createCheckoutAccessToken(orderId, now)
            assert.ok(token)
            assert.equal(hasCheckoutAccess(orderId, token, now), true)
        })

        it('createRedsysPaymentForm incluye &access=... si se pasa accessToken', () => {
            const orderId = '1234abcd5678'
            const accessToken = 'token-firmado-test'
            const form = createRedsysPaymentForm({
                amount: 350,
                orderId,
                accessToken,
                locale: 'es',
            })
            const params = decodeMerchantParameters(form.merchantParameters)
            assert.ok(params.DS_MERCHANT_URLOK.includes(`/checkout/success?order=${orderId}&access=${encodeURIComponent(accessToken)}`))
            // DS_MERCHANT_MERCHANTURL usa el appUrl del servidor
            assert.equal(params.DS_MERCHANT_MERCHANTURL, `${getRedsysConfig().appUrl}/api/webhooks/redsys`)
        })

        it('createRedsysPaymentForm no añade &access si accessToken no se pasa', () => {
            const orderId = '1234abcd5678'
            const form = createRedsysPaymentForm({
                amount: 350,
                orderId,
                locale: 'es',
            })
            const params = decodeMerchantParameters(form.merchantParameters)
            assert.ok(params.DS_MERCHANT_URLOK.endsWith(`/checkout/success?order=${orderId}`))
            assert.ok(!params.DS_MERCHANT_URLOK.includes('&access='))
        })
    })

    describe('4. Whitelist estricta de host en Checkout', () => {
        it('acepta dominios oficiales de Utopia y localhost en no-producción', () => {
            assert.equal(isAllowedOriginHostname('utopiavanlife.es'), true)
            assert.equal(isAllowedOriginHostname('www.utopiavanlife.es'), true)
            assert.equal(isAllowedOriginHostname('utopiavanlife.com'), true)
            assert.equal(isAllowedOriginHostname('www.utopiavanlife.com'), true)
            assert.equal(isAllowedOriginHostname('localhost'), true)
            assert.equal(isAllowedOriginHostname('127.0.0.1'), true)
        })

        it('rechaza dominios arbitrarios de .vercel.app que no coincidan con VERCEL_URL', () => {
            assert.equal(isAllowedOriginHostname('malicious-attacker.vercel.app'), false)
            assert.equal(isAllowedOriginHostname('evil.com'), false)
            assert.equal(isAllowedOriginHostname('phishing-utopia.com'), false)
        })

        it('acepta VERCEL_URL si coincide exactamente', () => {
            const prev = process.env.VERCEL_URL
            try {
                process.env.VERCEL_URL = 'preview-branch-123.vercel.app'
                assert.equal(isAllowedOriginHostname('preview-branch-123.vercel.app'), true)
                assert.equal(isAllowedOriginHostname('other-branch.vercel.app'), false)
            } finally {
                if (prev === undefined) delete process.env.VERCEL_URL
                else process.env.VERCEL_URL = prev
            }
        })
    })

    describe('5. Rate Limiting en verify-payment', () => {
        it('bloquea tras exceder el límite de peticiones con 429', async () => {
            const ip = '198.51.100.42'
            const now = Date.now()
            // Consumir hasta el límite
            for (let i = 0; i < MAX_VERIFY_PAYMENTS_PER_IP; i++) {
                assert.equal(registerVerifyPaymentAttempt(ip, now), true)
            }
            // La siguiente petición debe fallar
            assert.equal(registerVerifyPaymentAttempt(ip, now), false)

            // La ruta devuelve 429 cuando la IP está limitada
            const req = new NextRequest('http://localhost/api/bookings/verify-payment?order=1234abcd5678', {
                headers: { 'x-forwarded-for': ip },
            })
            const res = await verifyPaymentGet(req)
            assert.equal(res.status, 429)
            const json = await res.json()
            assert.match(json.error, /Demasiadas comprobaciones de pago/)
        })
    })
})
