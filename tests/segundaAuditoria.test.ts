import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { cents, CookieJar, installFlows, NEO, step5Payload } from './helpers/qaFlows'
import { POST as uploadDocument } from '../app/api/upload-document/route'
import { calculatePriceV2 } from '../lib/pricing/engine'
import { activePaymentAlerts } from '../lib/admin/bookingStatus'
import { isBookingRangeFree, validateBookingRange } from '../lib/booking/calendarLogic'
import {
    CHECKOUT_IP_WINDOW_MS,
    clientIp,
    MAX_CHECKOUTS_PER_IP,
    registerCheckoutAttempt,
} from '../lib/booking/checkoutRateLimit'
import { MAX_BOOKING_NIGHTS } from '../lib/booking/checkoutRules'
import { hasCheckoutAccess, CHECKOUT_ACCESS_COOKIE } from '../lib/checkoutAccess'
import { appendPreviousOrder, hasPreviousOrderCharge } from '../lib/redsysNotification'
import { validateStep1, validateStep5 } from '../app/[locale]/reserva/[slug]/types'

const VICTIM = '11111111-1111-4111-8111-111111111111'
const ATTACKER = '22222222-2222-4222-8222-222222222222'

describe('Segunda auditoría', () => {
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
    const authCalls = (method: string) => flows.fake.requests.filter(r => r.path === '/auth/v1/admin/users' && r.method === method)
    const access = (jar: { header(): string }, order: string) =>
        hasCheckoutAccess(order, jar.header().split(`${CHECKOUT_ACCESS_COOKIE}=`)[1])

    describe('N1: la identidad la decide Auth, no public.users.email', () => {
        const withVictimEmail = { email: 'victima@example.com' }

        beforeEach(() => {
            flows.fake.authUsers.push({ id: VICTIM, email: 'victima@example.com' }, { id: ATTACKER, email: 'atacante@example.com' })
            flows.fake.tables.users.push(
                { id: VICTIM, email: 'victima@example.com', full_name: 'Victima Real' },
                // El atacante ha cambiado su propia fila para que diga el email de la víctima
                { id: ATTACKER, email: 'victima@example.com', full_name: 'Atacante' },
            )
        })

        it('una fila falsificada no se lleva la reserva: va a la cuenta real de Auth', async () => {
            flows.fake.tables.users.reverse()

            const { status } = await flows.checkout(step5Payload({}, withVictimEmail))

            assert.equal(status, 200)
            assert.equal(booking().user_id, VICTIM)
        })

        it('si solo existe la fila falsificada, tampoco: la reserva va a la cuenta real', async () => {
            flows.fake.tables.users.splice(0, 1)

            await flows.checkout(step5Payload({}, withVictimEmail))

            assert.equal(booking().user_id, VICTIM)
        })

        it('si nadie tiene ese email en Auth, se crea la cuenta y no se usa la fila falsificada', async () => {
            flows.fake.tables.users.push({ id: ATTACKER, email: 'libre@example.com' })

            const { json, jar } = await flows.checkout(step5Payload({}, { email: 'libre@example.com' }))

            assert.notEqual(booking().user_id, ATTACKER)
            assert.equal(flows.fake.authUsers.at(-1)?.email, 'libre@example.com')
            assert.equal(access(jar, json.orderId), true)
        })

        it('la sesión del atacante con la fila falsificada no le da el perfil ni el acceso', async () => {
            flows.fake.setSession({ id: ATTACKER, email: 'atacante@example.com', aud: 'authenticated' })

            const { json, jar } = await flows.checkout(step5Payload({}, { ...withVictimEmail, phone: '+34 699999999' }))

            assert.equal(booking().user_id, VICTIM)
            assert.equal(access(jar, json.orderId), false)
            assert.deepEqual(flows.fake.writesTo('users'), [])
        })

        it('una sesión de Auth con ese email sí es el titular, aunque la fila diga otro', async () => {
            flows.fake.tables.users[0].email = 'antiguo@example.com'
            flows.fake.tables.users.splice(1, 1)
            flows.fake.setSession({ id: VICTIM, email: 'victima@example.com', aud: 'authenticated' })

            const { json, jar } = await flows.checkout(step5Payload({}, withVictimEmail))

            assert.equal(booking().user_id, VICTIM)
            assert.equal(access(jar, json.orderId), true)
        })

        it('con la fila correcta no crea cuenta ni recorre Auth', async () => {
            flows.fake.tables.users.splice(1, 1)

            await flows.checkout(step5Payload({}, withVictimEmail))

            assert.equal(booking().user_id, VICTIM)
            assert.deepEqual(authCalls('POST'), [])
            assert.deepEqual(authCalls('GET'), [])
        })
    })

    describe('QA-5: el calendario y el servidor comparten el límite de noches', () => {
        it(`los dos admiten ${MAX_BOOKING_NIGHTS} noches`, async () => {
            const dates = { startDate: '2099-06-01', startSlot: 'afternoon', endDate: '2099-08-30', endSlot: 'morning', pax: 2 }

            assert.equal(validateStep1(dates as never, [], 3).isValid, true)
            const { status } = await flows.checkout(step5Payload({ startDate: dates.startDate, endDate: dates.endDate }))
            assert.equal(status, 200)
        })

        it(`los dos rechazan ${MAX_BOOKING_NIGHTS + 1} noches`, async () => {
            const dates = { startDate: '2099-06-01', startSlot: 'afternoon', endDate: '2099-08-31', endSlot: 'morning', pax: 2 }

            assert.equal(validateBookingRange(dates.startDate, 'afternoon', dates.endDate, 'morning', [], 3).reason, 'max_nights')
            assert.equal(validateStep1(dates as never, [], 3).isValid, false)
            const { status } = await flows.checkout(step5Payload({ startDate: dates.startDate, endDate: dates.endDate }))
            assert.equal(status, 400)
        })
    })

    describe('QA-7: pedido sustituido por un reintento', () => {
        const ana = { id: 'u-ana', email: 'ana@example.com', aud: 'authenticated' }

        beforeEach(() => {
            flows.fake.tables.users.push({ id: ana.id, email: ana.email })
            flows.fake.authUsers.push({ id: ana.id, email: ana.email })
            flows.fake.setSession(ana)
        })

        it('sin cobro todavía, el cliente espera: no ve "no encontrada"', async () => {
            const { json, jar } = await flows.checkout(step5Payload())
            await flows.pay(booking().id)

            const back = await flows.verify(json.orderId, jar)

            assert.equal(back.status, 200)
            assert.equal(back.json.isPaid, false)
            assert.equal(back.json.booking.paymentStatus, 'pending')
        })

        it('con cobro, queda en revisión y no da datos personales', async () => {
            const { json, jar } = await flows.checkout(step5Payload())
            await flows.pay(booking().id)
            await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))

            const back = await flows.verify(json.orderId, jar)

            assert.equal(back.json.booking.paymentStatus, 'review')
            assert.deepEqual(Object.keys(back.json.booking).sort(), ['orderId', 'paymentStatus', 'status'])
        })

        it('un pedido que nunca existió sigue dando 404', async () => {
            const { jar } = await flows.checkout(step5Payload())

            assert.equal((await flows.verify('9999nuncahubo', jar)).status, 404)
        })
    })

    describe('QA-13: medios días', () => {
        const previous = { id: 'b-anterior', camper_id: NEO.id, start_date: '2099-05-20', end_date: '2099-06-01', status: 'confirmed', pickup_time: '15:00', dropoff_time: '12:00' }

        it('el servidor rechaza lo que el calendario rechaza: recoger por la mañana del día compartido', async () => {
            flows.fake.tables.bookings.push(previous)

            const { status } = await flows.checkout(step5Payload({ pickupSlot: 'morning', startSlot: 'morning' }))

            assert.equal(status, 409)
        })

        it('un solape real sigue rechazándose', async () => {
            flows.fake.tables.bookings.push({ ...previous, end_date: '2099-06-03' })

            assert.equal((await flows.checkout(step5Payload())).status, 409)
        })

        it('al pagar un medio día compartido no hay aviso falso de fechas ocupadas', async () => {
            flows.fake.tables.bookings.push(previous)
            const { json } = await flows.checkout(step5Payload())
            const paying = flows.fake.tables.bookings[1]

            await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))

            assert.equal(paying.payment_status, 'paid')
            assert.deepEqual(activePaymentAlerts(paying.notes), [])
        })

        it('el reintento de pago también lo admite', async () => {
            flows.fake.tables.bookings.push(previous)
            flows.fake.tables.users.push({ id: 'u-ana', email: 'ana@example.com' })
            flows.fake.authUsers.push({ id: 'u-ana', email: 'ana@example.com' })
            flows.fake.setSession({ id: 'u-ana', email: 'ana@example.com', aud: 'authenticated' })
            await flows.checkout(step5Payload())

            assert.equal((await flows.pay(flows.fake.tables.bookings[1].id)).status, 200)
        })

        it('un bloqueo ocupa el día entero', () => {
            const range = { start_date: '2099-06-01', end_date: '2099-06-08', pickup_time: '15:00', dropoff_time: '12:00' }

            assert.equal(isBookingRangeFree(range, [], [{ start_date: '2099-05-20', end_date: '2099-06-01' }]), false)
            assert.equal(isBookingRangeFree(range, [], [{ start_date: '2099-05-20', end_date: '2099-05-31' }]), true)
        })
    })

    describe('F1: cobro con incidencia en el pedido actual', () => {
        const NOTE = 'notas internas del cliente'

        it('un importe distinto queda en revisión, sin revelar el aviso', async () => {
            const { json, jar } = await flows.checkout(step5Payload({}, { notes: NOTE }))
            await flows.webhook(json.orderId, 1)

            const back = await flows.verify(json.orderId, jar)

            assert.equal(booking().payment_status, 'pending')
            assert.equal(back.json.isPaid, false)
            assert.equal(back.json.booking.paymentStatus, 'review')
            assert.doesNotMatch(JSON.stringify(back.json), /no coincide|REVISAR|céntimos/)
        })

        it('un cobro en una reserva cancelada también', async () => {
            const { json, jar } = await flows.checkout(step5Payload())
            booking().status = 'cancelled'
            await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))

            assert.equal((await flows.verify(json.orderId, jar)).json.booking.paymentStatus, 'review')
        })

        it('con el aviso ya revisado vuelve a su estado real', async () => {
            const { json, jar } = await flows.checkout(step5Payload())
            await flows.webhook(json.orderId, 1)
            const [alert] = activePaymentAlerts(booking().notes)
            booking().notes += `\n[PAGO REVISADO] ${alert}`

            assert.equal((await flows.verify(json.orderId, jar)).json.booking.paymentStatus, 'pending')
        })

        it('una reserva pagada con aviso sigue constando como pagada', async () => {
            const { json, jar } = await flows.checkout(step5Payload())
            await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))
            booking().notes += '\n[PAGO A REVISAR] Fechas ocupadas'

            const back = await flows.verify(json.orderId, jar)

            assert.equal(back.json.isPaid, true)
            assert.equal(back.json.booking.paymentStatus, 'paid')
        })
    })

    describe('F2: fallo tras crear la cuenta', () => {
        const email = 'nueva@example.com'

        for (const table of ['blocked_dates', 'bookings']) {
            it(`si falla ${table}, retira la cuenta creada y su perfil`, async () => {
                flows.fake.failures.table = table
                flows.fake.failures.method = 'POST'

                const { status } = await flows.checkout(step5Payload({}, { email }))

                assert.equal(status, 500)
                assert.deepEqual(flows.fake.authUsers, [])
                assert.deepEqual(flows.fake.tables.users, [])
            })

            it(`si falla ${table}, no retira una cuenta que ya existía`, async () => {
                flows.fake.authUsers.push({ id: VICTIM, email })
                flows.fake.tables.users.push({ id: VICTIM, email, full_name: 'Ya Existía' })
                flows.fake.failures.table = table
                flows.fake.failures.method = 'POST'

                await flows.checkout(step5Payload({}, { email }))

                assert.equal(flows.fake.authUsers.length, 1)
                assert.equal(flows.fake.tables.users.length, 1)
            })
        }

        it('tampoco retira la cuenta del titular con sesión', async () => {
            flows.fake.authUsers.push({ id: VICTIM, email })
            flows.fake.tables.users.push({ id: VICTIM, email })
            flows.fake.setSession({ id: VICTIM, email, aud: 'authenticated' })
            flows.fake.failures.table = 'bookings'
            flows.fake.failures.method = 'POST'

            await flows.checkout(step5Payload({}, { email }))

            assert.equal(flows.fake.authUsers.length, 1)
        })
    })

    describe('A1: cuentas sin confirmar', () => {
        const email = 'victima@example.com'
        const passwordChanges = () => flows.fake.requests.filter(r => r.method === 'PUT' && r.path.startsWith('/auth/v1/admin/users/'))

        it('invalida la contraseña antes de enlazar, encontrada por su perfil', async () => {
            flows.fake.authUsers.push({ id: VICTIM, email, email_confirmed_at: null, password: 'la-del-atacante' })
            flows.fake.tables.users.push({ id: VICTIM, email })

            const { status } = await flows.checkout(step5Payload({}, { email }))

            assert.equal(status, 200)
            assert.equal(booking().user_id, VICTIM)
            assert.equal(passwordChanges().length, 1)
            assert.notEqual(flows.fake.authUsers[0].password, 'la-del-atacante')
            assert.ok(String(flows.fake.authUsers[0].password).length >= 20)
        })

        it('invalida la contraseña también si solo aparece al recorrer Auth', async () => {
            flows.fake.authUsers.push({ id: VICTIM, email, email_confirmed_at: null, password: 'la-del-atacante' })

            await flows.checkout(step5Payload({}, { email }))

            assert.equal(booking().user_id, VICTIM)
            assert.notEqual(flows.fake.authUsers[0].password, 'la-del-atacante')
        })

        it('si no puede invalidarla, no enlaza la reserva', async () => {
            flows.fake.authUsers.push({ id: VICTIM, email, email_confirmed_at: null })
            flows.fake.failures.table = 'auth'

            const { status } = await flows.checkout(step5Payload({}, { email }))

            assert.equal(status, 500)
            assert.equal(flows.fake.tables.bookings.length, 0)
        })

        it('una cuenta confirmada no se toca', async () => {
            flows.fake.authUsers.push({ id: VICTIM, email, password: 'la-suya' })
            flows.fake.tables.users.push({ id: VICTIM, email })

            await flows.checkout(step5Payload({}, { email }))

            assert.deepEqual(passwordChanges(), [])
            assert.equal(flows.fake.authUsers[0].password, 'la-suya')
        })

        it('una sesión con el email sin confirmar no es el titular', async () => {
            flows.fake.authUsers.push({ id: VICTIM, email, email_confirmed_at: null })
            flows.fake.tables.users.push({ id: VICTIM, email, phone: null })
            flows.fake.setSession({ id: VICTIM, email, email_confirmed_at: null, aud: 'authenticated' })

            const { json, jar } = await flows.checkout(step5Payload({}, { email, phone: '+34 699999999' }))

            assert.equal(access(jar, json.orderId), false)
            assert.equal(flows.fake.tables.users[0].phone, null)
        })
    })

    describe('B1: fechas del conductor en el servidor', () => {
        it('exige YYYY-MM-DD real', async () => {
            for (const birthDate of ['01/01/1990', '1990-13-01', '1990-02-30', '1990-01-01T00:00:00Z', 'January 1, 1990', 19900101]) {
                assert.equal((await flows.checkout(step5Payload({}, { birthDate }))).status, 400, String(birthDate))
            }
            for (const licenseDate of ['01/01/2015', '2015-02-30', '2015-01-01T00:00:00Z']) {
                assert.equal((await flows.checkout(step5Payload({}, { licenseDate }))).status, 400, String(licenseDate))
            }
            assert.equal(flows.fake.tables.bookings.length, 0)
        })
    })

    describe('B3: pedido sustituido', () => {
        const row = (notes: string) => ({ id: 'b9', status: 'pending', payment_status: 'pending', payment_intent_id: '9999otropedid', camper_id: 'c1', notes })

        it('un pedido que solo coincide por el principio no encuentra la reserva', async () => {
            flows.fake.tables.bookings.push(row('[PEDIDO ANTERIOR] 1234abcd5678'))

            const back = await flows.verify('1234abcd', new CookieJar())
            await flows.webhook('1234abcd', 70000)

            assert.equal(back.status, 404)
            assert.equal(flows.fake.tables.bookings[0].notes, '[PEDIDO ANTERIOR] 1234abcd5678')
        })

        it('la coincidencia exacta sí, aunque otra reserva coincida antes por el principio', async () => {
            flows.fake.tables.bookings.push(row('[PEDIDO ANTERIOR] 1234abcd5678'), { ...row('[PEDIDO ANTERIOR] 1234abcd'), id: 'b10' })

            await flows.webhook('1234abcd', 70000)

            assert.equal(flows.fake.tables.bookings[0].notes, '[PEDIDO ANTERIOR] 1234abcd5678')
            assert.equal(activePaymentAlerts(flows.fake.tables.bookings[1].notes).length, 1)
        })

        it('guardar un pedido no se confunde con otro que empieza igual', () => {
            assert.equal(appendPreviousOrder('[PEDIDO ANTERIOR] 1234abcd5678', '1234abcd'), '[PEDIDO ANTERIOR] 1234abcd5678\n[PEDIDO ANTERIOR] 1234abcd')
        })

        it('el cobro de un pedido no cuenta para otro que empieza igual', () => {
            // Desde la auditoría de seguridad solo cuentan los avisos [PAGO A REVISAR] activos
            assert.equal(hasPreviousOrderCharge('[PAGO A REVISAR] Cobro del pedido anterior 1234abcd5678 (100 céntimos)', '1234abcd'), false)
            assert.equal(hasPreviousOrderCharge('[PAGO A REVISAR] Cobro del pedido anterior 1234abcd (100 céntimos)', '1234abcd'), true)
        })
    })

    describe('QA-4: fechas del conductor en el asistente', () => {
        const customer = {
            ...step5Payload().customer,
            phoneCountryCode: '+34',
            acceptTerms: true,
            acceptPrivacy: true,
        }

        it('con las dos fechas el paso 5 es válido', () => {
            assert.equal(validateStep5(customer as never, 3).isValid, true)
        })

        it('cada una es obligatoria por separado', () => {
            assert.ok(validateStep5({ ...customer, birthDate: '' } as never, 3).errors.birthDate)
            assert.ok(validateStep5({ ...customer, licenseDate: '' } as never, 3).errors.licenseDate)
        })
    })

    describe('QA-10: límite por IP', () => {
        const NOW = 1_000_000

        it('corta al superar el máximo y vuelve a dejar pasar al acabar la ventana', () => {
            const ip = '198.51.100.1'
            for (let i = 0; i < MAX_CHECKOUTS_PER_IP; i++) assert.equal(registerCheckoutAttempt(ip, NOW), true)

            assert.equal(registerCheckoutAttempt(ip, NOW), false)
            assert.equal(registerCheckoutAttempt('198.51.100.2', NOW), true)
            assert.equal(registerCheckoutAttempt(ip, NOW + CHECKOUT_IP_WINDOW_MS), true)
        })

        it('sin IP conocida no limita: todos compartirían contador', () => {
            for (let i = 0; i < MAX_CHECKOUTS_PER_IP + 3; i++) assert.equal(registerCheckoutAttempt(null, NOW), true)
        })

        it('usa la última entrada de x-forwarded-for, no las que puede escribir el cliente', () => {
            assert.equal(clientIp(new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 203.0.113.9' })), '203.0.113.9')
            assert.equal(clientIp(new Headers({ 'x-forwarded-for': ' 203.0.113.9 ' })), '203.0.113.9')
            assert.equal(clientIp(new Headers()), null)
        })

        it('las peticiones rechazadas por validación no consumen el límite', async () => {
            const headers = { 'x-forwarded-for': '203.0.113.50' }
            for (let i = 0; i < MAX_CHECKOUTS_PER_IP + 2; i++) {
                const { status } = await flows.checkout(step5Payload({ startDate: '2020-01-01', endDate: '2020-01-05' }), undefined, headers)
                assert.equal(status, 400)
            }
            assert.equal((await flows.checkout(step5Payload(), undefined, headers)).status, 200)
        })
    })

    describe('QA-12: zona horaria del precio', () => {
        const seasons = [
            { id: 'baja', code: 'baja', name: 'Baja', supplement_per_night: 0, min_nights: 3, is_default: true },
            { id: 'alta', code: 'alta', name: 'Alta', supplement_per_night: 50, min_nights: 3, is_default: false },
        ]
        const periods = [{ id: 'p', season_id: 'alta', start_date: '2099-07-01', end_date: '2099-08-31' }]
        const price = (startDate: Date, endDate: Date) => calculatePriceV2({
            startDate, pickupSlot: 'afternoon', endDate, dropoffSlot: 'morning',
            camperBasePrice: 100, camperId: 'c1', seasons: seasons as never, periods: periods as never, discounts: [],
            kmPackage: 'included_150', cancellationPolicy: 'standard', selectedExtras: [],
            depositOption: 'standard_2000', depositAmount: 2000,
        }).payableTotal

        it('el importe de una reserva con cambio de temporada es el esperado: 3 noches baja y 2 alta', () => {
            assert.equal(price(new Date('2099-06-28'), new Date('2099-07-03')), 3 * 100 + 2 * 150)
        })

        it('una fecha a medianoche local da el mismo importe', () => {
            const previous = process.env.TZ
            try {
                process.env.TZ = 'Europe/Madrid'
                assert.equal(price(new Date(2099, 5, 28), new Date(2099, 6, 3)), 3 * 100 + 2 * 150)
            } finally {
                if (previous === undefined) delete process.env.TZ
                else process.env.TZ = previous
            }
        })
    })

    describe('QA-14: /api/upload-document', () => {
        const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])

        beforeEach(() => {
            flows.fake.setSession({ id: 'u-ana', email: 'ana@example.com', aud: 'authenticated' })
            flows.fake.tables.users.push({ id: 'u-ana', verification_status: 'not_submitted' })
        })

        async function upload(front: File, back: File, length?: number) {
            const data = new FormData()
            data.append('front', front)
            data.append('back', back)
            const encoded = new Request('http://localhost/', { method: 'POST', body: data })
            const body = await encoded.arrayBuffer()
            return uploadDocument(new Request('http://localhost/api/upload-document', {
                method: 'POST',
                headers: { 'content-type': encoded.headers.get('content-type')!, 'content-length': String(length ?? body.byteLength) },
                body,
            }))
        }

        const stored = () => flows.fake.requests.filter(r => r.path.startsWith('/storage/v1/object/documents/'))

        it('rechaza por el contenido, aunque el tamaño sea correcto', async () => {
            const res = await upload(new File(['<script>alert(1)</script>'], 'a.jpg', { type: 'image/jpeg' }), new File([JPEG], 'b.jpg'))

            assert.equal(res.status, 400)
            assert.deepEqual(stored(), [])
        })

        it('guarda con la extensión y el tipo del contenido', async () => {
            const res = await upload(new File([JPEG], 'a.html', { type: 'text/html' }), new File([JPEG], 'b.svg', { type: 'image/svg+xml' }))

            assert.equal(res.status, 200)
            assert.equal(stored().length, 2)
            for (const sent of stored()) {
                assert.match(sent.path, /\/u-ana\/(front|back)_\d+\.jpg$/)
                assert.equal(sent.headers.get('content-type'), 'image/jpeg')
            }
            assert.equal(flows.fake.tables.users[0].verification_status, 'pending_validation')
        })

        it('rechaza archivos de más de 10 MB y peticiones que declaran demasiado', async () => {
            const big = new Uint8Array(10 * 1024 * 1024 + 1)
            big.set(JPEG)

            assert.equal((await upload(new File([big], 'a.jpg'), new File([JPEG], 'b.jpg'))).status, 400)
            assert.equal((await upload(new File([JPEG], 'a.jpg'), new File([JPEG], 'b.jpg'), 30 * 1024 * 1024)).status, 413)
            assert.deepEqual(stored(), [])
        })

        it('no devuelve los errores internos', async () => {
            flows.fake.failures.table = 'users'
            flows.fake.failures.method = 'PATCH'

            const res = await upload(new File([JPEG], 'a.jpg'), new File([JPEG], 'b.jpg'))

            assert.equal(res.status, 500)
            assert.ok(!JSON.stringify(await res.json()).includes('fallo simulado'))
        })
    })
})
