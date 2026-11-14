import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeSupabase, type Row } from './helpers/fakeSupabase'
import { NextRequest } from 'next/server'
import { POST as activateAccountPost } from '../app/api/bookings/activate-account/route'
import { createCheckoutAccessCookie } from '../lib/checkoutAccess'
import { getSmtpConfig, isSmtpConfigured } from '../lib/email/smtpClient'
import {
    buildAdminBookingNotificationHtml,
    buildClientBookingEmailHtml,
} from '../lib/email/bookingConfirmationEmail'

const ORDER = '4321dcba8765'

function createJsonRequest(url: string, body: unknown, cookie?: string) {
    return new NextRequest(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(body),
    })
}

describe('POST /api/bookings/activate-account', () => {
    it('rechaza peticiones sin cookie ni sesión válida', async () => {
        const fake = installFakeSupabase({
            bookings: [{ id: 'b1', user_id: 'u1', payment_intent_id: ORDER, payment_status: 'paid' }],
            users: [{ id: 'u1', email: 'cliente@example.com', verification_status: 'not_submitted' }],
        })
        try {
            const res = await activateAccountPost(
                createJsonRequest(`http://localhost/api/bookings/activate-account?order=${ORDER}`, {
                    password: 'MiPassword123!',
                })
            )
            assert.equal(res.status, 401)
            const json = await res.json()
            assert.ok(json.error)
        } finally {
            fake.restore()
        }
    })

    it('rechaza contraseñas de menos de 8 caracteres', async () => {
        const fake = installFakeSupabase()
        try {
            const access = createCheckoutAccessCookie(ORDER)!
            const res = await activateAccountPost(
                createJsonRequest(
                    `http://localhost/api/bookings/activate-account?order=${ORDER}`,
                    { password: '1234567' },
                    `${access.name}=${access.value}`
                )
            )
            assert.equal(res.status, 400)
        } finally {
            fake.restore()
        }
    })

    it('rechaza si la reserva aún no está pagada aunque tenga cookie', async () => {
        const fake = installFakeSupabase({
            bookings: [{ id: 'b1', user_id: 'u1', payment_intent_id: ORDER, payment_status: 'pending' }],
            users: [{ id: 'u1', email: 'cliente@example.com', verification_status: 'not_submitted' }],
        })
        try {
            const access = createCheckoutAccessCookie(ORDER)!
            const res = await activateAccountPost(
                createJsonRequest(
                    `http://localhost/api/bookings/activate-account?order=${ORDER}`,
                    { password: 'MiPassword123!' },
                    `${access.name}=${access.value}`
                )
            )
            assert.equal(res.status, 401)
        } finally {
            fake.restore()
        }
    })

    it('actualiza la contraseña e inicia sesión cuando la cookie es válida y la reserva está pagada', async () => {
        const userId = '00000000-0000-4000-8000-000000000001'
        const fake = installFakeSupabase({
            bookings: [{ id: 'b1', user_id: userId, payment_intent_id: ORDER, payment_status: 'paid' }],
            users: [{ id: userId, email: 'antonio@example.com', verification_status: 'not_submitted' }],
        })
        const authUser: Row = {
            id: userId,
            aud: 'authenticated',
            email: 'antonio@example.com',
            email_confirmed_at: '2026-11-14T10:00:00Z',
        }
        fake.authUsers.push(authUser)

        const baseFetch = globalThis.fetch
        let tokenCalledWith: { email?: string; password?: string } | null = null
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = new URL(input instanceof Request ? input.url : String(input))
            if (url.pathname === '/auth/v1/token') {
                tokenCalledWith = JSON.parse(String(init?.body || '{}'))
                return new Response(
                    JSON.stringify({
                        access_token: 'access-token-test',
                        token_type: 'bearer',
                        expires_in: 3600,
                        refresh_token: 'refresh-token-test',
                        user: authUser,
                    }),
                    { status: 200, headers: { 'content-type': 'application/json' } }
                )
            }
            return baseFetch(input, init)
        }) as typeof fetch

        try {
            const access = createCheckoutAccessCookie(ORDER)!
            const res = await activateAccountPost(
                createJsonRequest(
                    `http://localhost/api/bookings/activate-account?order=${ORDER}`,
                    { password: 'MiPassword123!' },
                    `${access.name}=${access.value}`
                )
            )
            assert.equal(res.status, 200)
            const json = await res.json()
            assert.equal(json.success, true)
            assert.equal(json.email, 'antonio@example.com')
            assert.equal(authUser.password, 'MiPassword123!')
            assert.equal(authUser.email_confirm, true)
            assert.deepEqual(tokenCalledWith, {
                email: 'antonio@example.com',
                password: 'MiPassword123!',
                gotrue_meta_security: {},
            })
        } finally {
            globalThis.fetch = baseFetch
            fake.restore()
        }
    })
})

describe('Configuración SMTP DonDominio y plantillas HTML', () => {
    it('detecta cuando faltan credenciales SMTP y aplica valores por defecto de DonDominio cuando existen', () => {
        assert.equal(isSmtpConfigured({}), false)
        assert.equal(isSmtpConfigured({ SMTP_USER: 'reservas@utopiavanlife.com' }), false)

        const cfg = getSmtpConfig({
            SMTP_USER: 'reservas@utopiavanlife.com',
            SMTP_PASS: 'secreto',
        })
        assert.ok(cfg)
        assert.equal(cfg.host, 'smtp.dondominio.com')
        assert.equal(cfg.port, 465)
        assert.equal(cfg.from, 'Utopia Van Life <reservas@utopiavanlife.com>')
        assert.equal(cfg.replyTo, 'reservas@utopiavanlife.com')
    })

    it('genera el correo corporativo del cliente y del admin con resumen y escape HTML', () => {
        const params = {
            bookingId: 'b1',
            orderId: '9876TEST1234',
            customerName: 'Antonio <script>alert(1)</script>',
            customerEmail: 'antonio@example.com',
            customerPhone: '+34 600 111 222',
            camperName: 'Utopia NEO 4x4',
            startDate: '2026-12-01',
            endDate: '2026-12-06',
            totalPrice: 950.5,
            dashboardUrl: 'https://utopiavanlife.com/es/dashboard',
            adminUrl: 'https://utopiavanlife.com/es/admin',
        }

        const clientHtml = buildClientBookingEmailHtml(params)
        assert.ok(clientHtml.includes('UTOPIA'))
        assert.ok(clientHtml.includes('VAN LIFE'))
        assert.ok(clientHtml.includes('#9876TEST1234'))
        assert.ok(clientHtml.includes('Utopia NEO 4x4'))
        assert.ok(clientHtml.includes('01/12/2026'))
        assert.ok(clientHtml.includes('06/12/2026'))
        assert.ok(clientHtml.includes('950,50 €'))
        assert.ok(clientHtml.includes('https://utopiavanlife.com/es/dashboard'))
        assert.ok(clientHtml.includes('tus fechas ya están bloqueadas'))
        assert.ok(clientHtml.includes('contraseña que has creado durante tu reserva'))
        assert.ok(clientHtml.includes('Mis Documentos / Datos'))
        assert.ok(!clientHtml.includes('<script>alert(1)</script>'))

        const adminHtml = buildAdminBookingNotificationHtml(params)
        assert.ok(adminHtml.includes('Pago Redsys confirmado (#9876TEST1234)'))
        assert.ok(adminHtml.includes('https://utopiavanlife.com/es/admin'))
        assert.ok(!adminHtml.includes('<script>alert(1)</script>'))
    })
})
