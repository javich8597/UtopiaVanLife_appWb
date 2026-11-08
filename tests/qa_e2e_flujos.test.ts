import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'
import { cents, CookieJar, dashboardForm, installFlows, redsysForm, step5Payload, successPageForm } from './helpers/qaFlows'
import { calculatePriceV2 } from '../lib/pricing/engine'
import { latestDocument, latestLicensePhotoNames } from '../lib/admin/documents'
import { activePaymentAlerts, getAdminBookingStatus, isAbandonedPending, markPaymentAlertsReviewed } from '../lib/admin/bookingStatus'
import { isLiveBooking } from '../lib/user/tripState'
import { safeRedirectPath } from '../lib/auth/safeRedirect'
import { createRedsysPaymentForm } from '../lib/redsys'
import { middleware } from '../middleware'

/**
 * Verificador: flujos de punta a punta con las rutas reales encadenadas.
 * Estos pasan: son la evidencia de lo que SÍ funciona con Supabase simulado.
 */
describe('QA punta a punta', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        for (const key of ['REDSYS_ENVIRONMENT', 'REDSYS_ALLOW_TEST_MODE', 'REDSYS_SECRET_KEY', 'REDSYS_MERCHANT_CODE']) delete process.env[key]
        flows = installFlows()
        console.error = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        flows.fake.restore()
        Object.assign(console, silenced)
    })

    const booking = () => flows.fake.tables.bookings[0]
    const uploadedNames = () => flows.fake.requests
        .filter(r => r.path.startsWith('/storage/v1/object/documents/'))
        .map(r => decodeURIComponent(r.path.split('/').pop()!))

    describe('1. Cliente nuevo sin sesión', () => {
        it('webhook antes de volver: asistente → checkout → webhook → success → upload', async () => {
            const { status, json, jar } = await flows.checkout(step5Payload({ locale: 'de' }))
            assert.equal(status, 200)

            const order = json.orderId
            const form = redsysForm(json.formData.merchantParameters)
            assert.match(form.DS_MERCHANT_URLOK, new RegExp(`/de/checkout/success\\?order=${order}$`))
            assert.match(form.DS_MERCHANT_URLKO, new RegExp(`/de/checkout/error\\?order=${order}$`))
            assert.equal(form.DS_MERCHANT_AMOUNT, String(cents(json.breakdown.payableTotal)))

            // El perfil recibe las dos fechas con los nombres que manda el asistente
            const profile = flows.fake.tables.users.find(u => u.email === 'ana@example.com')!
            assert.equal(profile.birth_date, '1990-01-01')
            assert.equal(profile.driver_license_issue_date, '2015-01-01')
            assert.equal(profile.role, undefined)

            assert.equal((await flows.webhook(order, cents(json.breakdown.payableTotal))).status, 200)
            assert.equal(booking().payment_status, 'paid')
            assert.equal(flows.otpRequests.length, 1)
            assert.equal(flows.otpRequests[0].create_user, false)

            const back = await flows.verify(order, jar)
            assert.equal(back.json.isPaid, true)
            assert.ok(back.json.booking.id, 'con cookie y pagada, la página tiene datos para el formulario')
            // N5: con solo la cookie no salen datos del perfil; la fecha se rellena en el formulario
            assert.equal(back.json.booking.driverLicenseIssueDate, null)

            const sent = await flows.upload(successPageForm(), jar, order)
            assert.equal(sent.status, 200)
            assert.equal(sent.json.verificationStatus, 'pending_validation')
            assert.equal(profile.driver_license_id, 'B-1234')
            assert.equal(profile.driver_license_expiry_date, '2035-01-01')

            // Lo subido aparece en el lector real de documentos del panel
            const names = uploadedNames().map(name => ({ name, created_at: '2026-11-07T10:00:00Z' }))
            assert.equal(names.length, 4)
            assert.ok(latestDocument(names, ['dni_front']))
            assert.ok(latestDocument(names, ['dni_back']))
            assert.equal(latestLicensePhotoNames(names).length, 2)

            // Tras enviar: cookie revocada, solo queda el estado del pago
            const reload = await flows.verify(order, jar)
            assert.equal(reload.json.booking.id, undefined)
            assert.equal((await flows.upload(successPageForm(), jar, order)).status, 401)
        })

        it('vuelve antes del webhook CON parámetros firmados: se registra el pago y hay formulario', async () => {
            const { json, jar } = await flows.checkout(step5Payload())
            const amount = cents(json.breakdown.payableTotal)

            const back = await flows.verify(json.orderId, jar, flows.signed(json.orderId, amount))
            assert.equal(back.json.isPaid, true)
            assert.ok(back.json.booking.id)
            assert.equal(flows.otpRequests.length, 1)

            // El webhook llega después: no repite email ni rompe nada
            assert.equal((await flows.webhook(json.orderId, amount)).status, 200)
            assert.equal(flows.otpRequests.length, 1)
            assert.equal((await flows.upload(successPageForm(), jar, json.orderId)).status, 200)
        })

        it('sin pagar: ni datos ni subida, aunque la cookie sea buena', async () => {
            const { json, jar } = await flows.checkout(step5Payload())
            const back = await flows.verify(json.orderId, jar)
            assert.equal(back.json.isPaid, false)
            assert.equal(back.json.booking.id, undefined)
            assert.equal((await flows.upload(successPageForm(), jar, json.orderId)).status, 401)
        })

        it('reload en el formulario antes de enviar: sigue teniendo acceso', async () => {
            const { json, jar } = await flows.checkout(step5Payload())
            await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))
            assert.ok((await flows.verify(json.orderId, jar)).json.booking.id)
            assert.ok((await flows.verify(json.orderId, jar)).json.booking.id)
        })

        it('los segundos conductores del asistente pasan la validación del servidor', async () => {
            const { status } = await flows.checkout(step5Payload({ depositOption: 'flex_1000' }, {
                depositOption: 'flex_1000',
                travelersCount: 2,
                passengers: [{ fullName: 'Luis Gómez', dniNie: '87654321X', birthDate: '1990-01-01', licenseDate: '2015-01-01', isSecondDriver: true }],
            }))
            assert.equal(status, 200)
        })
    })

    describe('2. Cliente con cuenta sin sesión', () => {
        beforeEach(() => {
            flows.fake.tables.users.push({ id: 'u-ana', email: 'ana@example.com', full_name: 'Ana', verification_status: 'not_submitted' })
            flows.fake.authUsers.push({ id: 'u-ana', email: 'ana@example.com' })
        })

        it('paga, ve la tarjeta de email, recibe el enlace y no se escribe nada en su perfil', async () => {
            const { json, jar } = await flows.checkout(step5Payload())
            assert.equal(booking().user_id, 'u-ana')

            await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))
            assert.deepEqual(flows.otpRequests.map(r => [r.email, r.create_user]), [['ana@example.com', false]])

            const back = await flows.verify(json.orderId, jar)
            assert.equal(back.json.isPaid, true)
            assert.equal(back.json.booking.id, undefined, 'la página pinta la tarjeta "revisa tu email"')
            assert.equal((await flows.upload(successPageForm(), jar, json.orderId)).status, 401)
            assert.deepEqual(flows.fake.writesTo('users'), [])
        })

        it('al entrar con el enlace (sesión) ya puede leer y subir desde /dashboard/datos', async () => {
            const { json } = await flows.checkout(step5Payload())
            await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))

            flows.fake.setSession({ id: 'u-ana', email: 'ana@example.com', aud: 'authenticated' })
            const jar = new CookieJar()
            assert.ok((await flows.verify(json.orderId, jar)).json.booking.id)
            assert.equal((await flows.upload(dashboardForm(), jar)).status, 200)
        })

        it('la plantilla documentada de /auth/confirm lleva a una ruta interna aceptada', () => {
            assert.equal(safeRedirectPath('/es/dashboard', '/x'), '/es/dashboard')
        })
    })

    describe('3. Cliente con sesión', () => {
        it('reserva, conserva el acceso y sube con los nuevos límites', async () => {
            flows.fake.tables.users.push({ id: 'u-ana', email: 'ana@example.com', phone: null, verification_status: 'verified' })
            flows.fake.authUsers.push({ id: 'u-ana', email: 'ana@example.com' })
            flows.fake.setSession({ id: 'u-ana', email: 'ana@example.com', aud: 'authenticated' })

            const { status, json, jar } = await flows.checkout(step5Payload())
            assert.equal(status, 200)
            assert.equal(booking().user_id, 'u-ana')
            assert.equal(flows.fake.tables.users[0].phone, '+34 600000000')

            await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))
            assert.ok((await flows.verify(json.orderId, jar)).json.booking.id)

            const sent = await flows.upload(dashboardForm(), new CookieJar())
            assert.equal(sent.status, 200)
        })

        it('sesión sin fila en users: la crea sin role y reserva', async () => {
            flows.fake.authUsers.push({ id: 'u-ana', email: 'ana@example.com' })
            flows.fake.setSession({ id: 'u-ana', email: 'ana@example.com', aud: 'authenticated' })
            const { status } = await flows.checkout(step5Payload())
            assert.equal(status, 200)
            assert.equal(flows.fake.tables.users[0].id, 'u-ana')
            assert.equal(flows.fake.tables.users[0].role, undefined)
        })
    })

    describe('4. Pago: repetido, tardío, KO y pedido anterior', () => {
        async function pendingBooking() {
            flows.fake.authUsers.push({ id: 'u-ana', email: 'ana@example.com' })
            flows.fake.tables.users.push({ id: 'u-ana', email: 'ana@example.com' })
            flows.fake.setSession({ id: 'u-ana', email: 'ana@example.com', aud: 'authenticated' })
            const { json, jar } = await flows.checkout(step5Payload())
            return { order: json.orderId as string, amount: cents(json.breakdown.payableTotal), jar }
        }

        it('notificación repetida: un solo email y un solo bloqueo definitivo', async () => {
            const { order, amount } = await pendingBooking()
            await flows.webhook(order, amount)
            await flows.webhook(order, amount)
            await flows.webhook(order, amount)
            assert.equal(flows.otpRequests.length, 1)
            assert.equal(flows.fake.tables.blocked_dates.filter(b => b.session_id === `redsys_${order}`).length, 1)
            assert.equal(flows.fake.tables.blocked_dates.filter(b => b.session_id === `checkout_${order}`).length, 0)
        })

        it('notificación tardía tras caducar el bloqueo: se marca pagada', async () => {
            const { order, amount } = await pendingBooking()
            flows.fake.tables.blocked_dates[0].expires_at = '2020-01-01T00:00:00.000Z'
            booking().created_at = '2020-01-01T00:00:00.000Z'
            assert.equal((await flows.webhook(order, amount)).status, 200)
            assert.equal(booking().payment_status, 'paid')
            assert.equal(activePaymentAlerts(booking().notes).length, 0)
        })

        it('reintento: el pedido anterior cobrado avisa una sola vez y no marca pagada', async () => {
            const { order, amount } = await pendingBooking()
            const retry = await flows.pay(booking().id)
            assert.equal(retry.status, 200)
            assert.notEqual(booking().payment_intent_id, order)

            await flows.webhook(order, amount)
            await flows.webhook(order, amount)
            assert.equal(booking().payment_status, 'pending')
            assert.equal(activePaymentAlerts(booking().notes).length, 1)
            assert.ok(activePaymentAlerts(booking().notes)[0].includes(order))
        })

        it('reintento pagado con el pedido nuevo: pagada y con el importe original', async () => {
            const { amount } = await pendingBooking()
            const retry = await flows.pay(booking().id)
            assert.equal(redsysForm(retry.json.form.merchantParameters).DS_MERCHANT_AMOUNT, String(amount))
            await flows.webhook(retry.json.orderId, amount)
            assert.equal(booking().payment_status, 'paid')
        })

        it('KO firmado por la página de error: libera el bloqueo y permite reservar otra vez', async () => {
            const { order, amount, jar } = await pendingBooking()
            await flows.verify(order, jar, flows.signed(order, amount, { response: '0184', authorisation: '' }))
            assert.equal(booking().payment_status, 'failed')
            assert.equal(flows.fake.tables.blocked_dates.length, 0)
            assert.equal((await flows.checkout(step5Payload())).status, 200)
        })

        it('KO repetido después de pagar no deshace el pago', async () => {
            const { order, amount } = await pendingBooking()
            await flows.webhook(order, amount)
            await flows.webhook(order, amount, { response: '0184' })
            assert.equal(booking().payment_status, 'paid')
        })

        it('importe distinto: avisa, no caduca, no se archiva y se puede marcar revisado', async () => {
            const { order, amount } = await pendingBooking()
            await flows.webhook(order, amount - 1)
            const row = booking() as { status: string; payment_status: string; notes: string; created_at: string }
            assert.equal(row.payment_status, 'pending')
            row.created_at = '2020-01-01T00:00:00.000Z'
            assert.equal(isAbandonedPending(row), false)
            assert.equal(getAdminBookingStatus(row), 'pending')

            const reviewed = markPaymentAlertsReviewed(row.notes)!
            assert.equal(activePaymentAlerts(reviewed).length, 0)
            assert.equal(isAbandonedPending({ ...row, notes: reviewed }), true)
        })

        it('si falla el email del enlace, Redsys reintenta y se envía sin duplicar el cobro', async () => {
            const { order, amount } = await pendingBooking()
            flows.failOtp('rate limit')
            assert.equal((await flows.webhook(order, amount)).status, 500)
            assert.equal(booking().payment_status, 'paid')
            assert.equal(activePaymentAlerts(booking().notes).length, 1)

            flows.failOtp(null)
            assert.equal((await flows.webhook(order, amount)).status, 200)
            assert.equal(activePaymentAlerts(booking().notes).length, 0)
        })
    })

    describe('5. Firma de vuelta y consumidores de isAbandonedPending', () => {
        it('la firma del formulario de pago no sirve como vuelta firmada', async () => {
            const { json, jar } = await flows.checkout(step5Payload())
            const form = createRedsysPaymentForm({ amount: 1, orderId: json.orderId })
            const res = await flows.verify(json.orderId, jar, {
                Ds_SignatureVersion: 'HMAC_SHA256_V1',
                Ds_MerchantParameters: form.merchantParameters,
                Ds_Signature: form.signature,
            })
            assert.equal(res.status, 400)
            assert.equal(booking().payment_status, 'pending')
        })

        it('una pendiente sin aviso desaparece del panel del cliente a los 60 minutos', () => {
            const row = { status: 'pending', payment_status: 'pending', created_at: '2020-01-01T00:00:00Z', start_date: '2099-01-01', end_date: '2099-01-05' }
            assert.equal(isLiveBooking(row), false)
        })
    })

    describe('8. Tramos, horarios y límites', () => {
        const slots: Array<['morning' | 'afternoon', 'morning' | 'afternoon', string, string]> = [
            ['afternoon', 'morning', '15:00:00'.slice(0, 5), '12:00'],
            ['morning', 'morning', '09:00', '12:00'],
            ['afternoon', 'afternoon', '15:00', '19:00'],
            ['morning', 'afternoon', '09:00', '19:00'],
        ]
        for (const [startSlot, endSlot, pickup, dropoff] of slots) {
            it(`${startSlot}/${endSlot}: asistente, servidor y Redsys cobran lo mismo y guardan ${pickup}-${dropoff}`, async () => {
                const { json } = await flows.checkout(step5Payload({ startSlot, endSlot, pickupSlot: startSlot, dropoffSlot: endSlot }))
                const wizard = calculatePriceV2({
                    startDate: new Date('2099-06-01'), pickupSlot: startSlot, endDate: new Date('2099-06-08'), dropoffSlot: endSlot,
                    camperBasePrice: 100, camperId: 'c1', seasons: [], periods: [], discounts: [],
                    kmPackage: 'included_150', cancellationPolicy: 'standard', selectedExtras: [],
                    depositOption: 'standard_2000', depositAmount: 2000,
                })
                assert.equal(wizard.payableTotal, json.breakdown.payableTotal)
                assert.equal(booking().total_price, wizard.payableTotal)
                assert.equal(redsysForm(json.formData.merchantParameters).DS_MERCHANT_AMOUNT, String(cents(wizard.payableTotal)))
                assert.equal(booking().pickup_time, pickup)
                assert.equal(booking().dropoff_time, dropoff)
            })
        }

        it('sin tramos ni horas: recogida 15:00 y devolución 12:00, sin suplemento', async () => {
            const body = step5Payload()
            for (const key of ['startSlot', 'endSlot', 'pickupSlot', 'dropoffSlot']) delete body[key]
            const { json } = await flows.checkout(body)
            assert.equal(booking().pickup_time, '15:00')
            assert.equal(booking().dropoff_time, '12:00')
            assert.equal(json.breakdown.slotSupplement, 0)
        })

        it('exactamente 90 noches y fecha de inicio hoy son válidas', async () => {
            const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
            const end = new Date(`${today}T00:00:00Z`)
            end.setUTCDate(end.getUTCDate() + 90)
            const { status } = await flows.checkout(step5Payload({ startDate: today, endDate: end.toISOString().slice(0, 10) }))
            assert.equal(status, 200)
        })
    })
})

describe('QA traducciones y estilos del cambio', () => {
    const load = (locale: string) => JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')).CheckoutSuccess as Record<string, string>

    it('7. CheckoutSuccess tiene las mismas claves en los cuatro idiomas y cubre lo que usa la página', () => {
        const es = load('es')
        const page = readFileSync('app/[locale]/checkout/success/page.tsx', 'utf8')
        const used = [...page.matchAll(/\bt\('([^']+)'\)/g)].map(m => m[1])
        assert.ok(used.length > 0)
        for (const locale of ['en', 'de', 'fr']) {
            const other = load(locale)
            assert.deepEqual(Object.keys(other).sort(), Object.keys(es).sort())
            for (const key of Object.keys(es)) {
                assert.ok(other[key].trim().length > 0)
                assert.notEqual(other[key], es[key], `${locale}.${key} sin traducir`)
            }
        }
        for (const key of used) assert.ok(es[key], `falta ${key}`)
    })
})

describe('QA middleware /admin con el middleware real', () => {
    let flows: ReturnType<typeof installFlows>

    beforeEach(() => { flows = installFlows() })
    afterEach(() => flows.fake.restore())

    const cookie = () => {
        const session = { access_token: 't', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u1' } }
        return `sb-supabase-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`
    }
    const enter = async (path: string, withCookie = true) => {
        const res = await middleware(new NextRequest(`http://localhost${path}`, { headers: withCookie ? { cookie: cookie() } : {} }))
        return res.headers.get('location') ?? ''
    }
    const session = (extra: Record<string, unknown> = {}) => flows.fake.setSession({
        id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'x@example.com', created_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {}, ...extra,
    })

    it('anónimo: al login conservando la ruta, en cualquier idioma', async () => {
        assert.match(await enter('/en/admin/bookings?status=alert', false), /\/en\/auth\/login\?redirect=%2Fadmin%2Fbookings%3Fstatus%3Dalert$/)
    })

    it('/admin sin idioma, anónimo: pasa primero por el idioma', async () => {
        assert.match(await enter('/admin', false), /\/es\/admin$/)
    })

    it('cliente con rol customer: fuera, conservando idioma', async () => {
        session({ user_metadata: { role: 'admin', is_admin: 'true' } })
        flows.fake.tables.users.push({ id: 'u1', role: 'customer' })
        assert.match(await enter('/de/admin'), /\/de\/auth\/login$/)
    })

    it('sin fila en users: fuera', async () => {
        session()
        assert.match(await enter('/es/admin'), /\/es\/auth\/login$/)
    })

    it('si la lectura de users falla: fuera', async () => {
        session()
        flows.fake.tables.users.push({ id: 'u1', role: 'admin' })
        flows.fake.failures.table = 'users'
        flows.fake.failures.method = 'GET'
        assert.match(await enter('/es/admin'), /\/es\/auth\/login$/)
    })

    it('admin por public.users: entra', async () => {
        session()
        flows.fake.tables.users.push({ id: 'u1', role: 'admin' })
        assert.doesNotMatch(await enter('/es/admin/verifications'), /auth\/login/)
    })
})
