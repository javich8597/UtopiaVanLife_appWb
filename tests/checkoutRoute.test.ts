import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST } from '../app/api/bookings/checkout/route'
import { CHECKOUT_ACCESS_COOKIE, hasCheckoutAccess } from '../lib/checkoutAccess'
import { MAX_BOOKING_NIGHTS } from '../lib/booking/checkoutRules'
import { activePaymentAlerts } from '../lib/admin/bookingStatus'

const camper = { id: 'c1', slug: 'neo', name: 'NEO', base_price_per_night: 100 }

const victim: Row = {
    id: 'u-victima',
    email: 'victima@example.com',
    role: 'customer',
    full_name: 'Victima Real',
    dni_nie: '11111111H',
    phone: null,
    address: null,
    birth_date: '1985-02-02',
    driver_license_issue_date: '2015-01-01',
}

const request = (overrides: Row = {}, customer: Row = {}) => ({
    camperSlug: 'neo',
    startDate: '2099-06-01',
    endDate: '2099-06-08',
    pickupSlot: 'afternoon',
    dropoffSlot: 'morning',
    customer: {
        fullName: 'Ana Pérez',
        email: 'ana@example.com',
        phone: '+34 600000000',
        dniNie: '12345678Z',
        birthDate: '1990-01-01',
        licenseDate: '2015-01-01',
        address: 'Calle Mayor 1',
        ...customer,
    },
    ...overrides,
})

async function checkout(body: Row) {
    const res = await POST(new Request('http://localhost/api/bookings/checkout', { method: 'POST', body: JSON.stringify(body) }))
    const setCookie = res.headers.get('set-cookie') || ''
    const cookieValue = setCookie.match(new RegExp(`^${CHECKOUT_ACCESS_COOKIE}=([^;]*)`))?.[1]
    return { status: res.status, json: await res.json(), setCookie, cookieValue }
}

const envKeys = ['REDSYS_ENVIRONMENT', 'REDSYS_ALLOW_TEST_MODE', 'REDSYS_SECRET_KEY', 'REDSYS_MERCHANT_CODE']

describe('Ruta de checkout', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({ campers: [camper], users: [{ ...victim }] })
        fake.authUsers.push({ id: victim.id, email: victim.email })
        for (const key of envKeys) delete process.env[key]
        console.error = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        fake.restore()
        Object.assign(console, silenced)
    })

    const expectNoBooking = () => {
        assert.equal(fake.tables.bookings.length, 0)
        assert.equal(fake.tables.blocked_dates.length, 0)
    }

    describe('cuenta existente sin sesión', () => {
        const withVictimEmail = (customer: Row = {}) => request({}, { email: 'victima@example.com', ...customer })

        it('enlaza la reserva, sin acceso y sin escribir en su perfil', async () => {
            const { status, json, cookieValue } = await checkout(withVictimEmail({ phone: '+34 699999999', address: 'Calle Falsa 2' }))

            assert.equal(status, 200)
            assert.equal(fake.tables.bookings[0].user_id, victim.id)
            assert.equal(hasCheckoutAccess(json.orderId, cookieValue), false)
            assert.deepEqual(fake.writesTo('users'), [])
            assert.deepEqual(fake.tables.users[0], victim)
        })

        it('la respuesta es igual que la de un email sin cuenta', async () => {
            const known = await checkout(withVictimEmail())
            const unknown = await checkout(request({ startDate: '2099-07-01', endDate: '2099-07-08' }))

            assert.equal(known.status, unknown.status)
            assert.deepEqual(Object.keys(known.json), Object.keys(unknown.json))
            assert.ok(known.cookieValue && unknown.cookieValue)
            assert.equal(known.cookieValue.length, unknown.cookieValue.length)
            // `Expires` es una fecha absoluta: dos peticiones a distinto lado de un segundo daban
            // atributos distintos sin que la respuesta revelara nada (el test fallaba a ratos). Que
            // la cookie caduque se compara por `Max-Age`, que sí es el mismo en las dos
            const attributes = (setCookie: string) =>
                setCookie.split(';').slice(1).map(part => part.trim()).filter(part => !/^expires=/i.test(part)).join('; ')

            assert.match(known.setCookie, /Expires=/i)
            assert.match(unknown.setCookie, /Expires=/i)
            assert.match(known.setCookie, /Max-Age=\d/i)
            assert.equal(attributes(known.setCookie), attributes(unknown.setCookie))
        })

        it('no responde nada que dependa de la edad o el carnet del perfil', async () => {
            fake.tables.users[0].birth_date = '2090-01-01'
            fake.tables.users[0].driver_license_issue_date = '2099-01-01'

            const { status, json } = await checkout(withVictimEmail())

            assert.equal(status, 200)
            assert.ok(!JSON.stringify(json).includes('perfil'))
        })

        it('aplica las reglas de conductor a los datos del formulario', async () => {
            const tooYoung = await checkout(withVictimEmail({ birthDate: '2080-01-01' }))
            const newLicense = await checkout(withVictimEmail({ licenseDate: '2098-01-01' }))

            assert.equal(tooYoung.status, 400)
            assert.equal(newLicense.status, 400)
            expectNoBooking()
        })

        it('exige fecha de nacimiento y de carnet, porque no se mira el perfil', async () => {
            const noBirth = await checkout(withVictimEmail({ birthDate: '' }))
            const noLicense = await checkout(withVictimEmail({ licenseDate: '' }))

            assert.equal(noBirth.status, 400)
            assert.equal(noLicense.status, 400)
            expectNoBooking()
        })

        it('cuenta en Auth sin fila en users: no usa la cookie ni copia datos del formulario', async () => {
            fake.authUsers.push({ id: 'u-solo-auth', email: 'solo.auth@example.com' })

            const { status, json, cookieValue } = await checkout(request({}, { email: 'solo.auth@example.com' }))

            assert.equal(status, 200)
            assert.equal(fake.tables.bookings[0].user_id, 'u-solo-auth')
            assert.equal(hasCheckoutAccess(json.orderId, cookieValue), false)

            const [insert] = fake.writesTo('users')
            assert.deepEqual(insert.body, { full_name: 'Cliente Utopia', id: 'u-solo-auth', email: 'solo.auth@example.com' })
            assert.match(insert.headers.get('prefer') || '', /ignore-duplicates/)
            assert.equal(fake.writesTo('users').length, 1)
        })

        it('una cuenta en Auth cuyo perfil no se puede crear para el checkout sin retirar esa cuenta', async () => {
            fake.authUsers.push({ id: 'u-solo-auth', email: 'solo.auth@example.com' })
            fake.failures.table = 'users'
            fake.failures.method = 'POST'

            const { status } = await checkout(request({}, { email: 'solo.auth@example.com' }))

            assert.equal(status, 500)
            expectNoBooking()
            assert.ok(fake.authUsers.some(u => u.id === 'u-solo-auth'))
        })

        it('tampoco usa la cookie si la cuenta existe en Auth y la fila ya está en users con otro email', async () => {
            fake.tables.users.push({ id: 'u-otra', email: 'Mayusculas@Example.com', role: 'admin', full_name: 'Jefa' })
            fake.authUsers.push({ id: 'u-otra', email: 'mayusculas@example.com' })

            const { json, cookieValue } = await checkout(request({}, { email: 'mayusculas@example.com' }))

            assert.equal(hasCheckoutAccess(json.orderId, cookieValue), false)
            assert.equal(fake.tables.users[1].role, 'admin')
            assert.equal(fake.tables.users[1].full_name, 'Jefa')
        })
    })

    describe('cuenta creada en este checkout', () => {
        it('da acceso y guarda el perfil sin role', async () => {
            const { status, json, cookieValue } = await checkout(request())

            assert.equal(status, 200)
            assert.equal(hasCheckoutAccess(json.orderId, cookieValue), true)

            const profile = fake.tables.users.find(u => u.email === 'ana@example.com')!
            assert.equal(profile.dni_nie, '12345678Z')
            assert.equal(profile.driver_license_issue_date, '2015-01-01')
            for (const write of fake.writesTo('users')) assert.ok(!('role' in (write.body as Row)))
        })

        it('completa la fila que haya creado el trigger de alta', async () => {
            fake.onBeforeWrite('users', () => {
                fake.tables.users.push({ id: fake.authUsers.at(-1)!.id, email: 'ana@example.com', full_name: null })
            })

            await checkout(request())

            const profile = fake.tables.users.find(u => u.id === fake.authUsers.at(-1)!.id)!
            assert.equal(profile.full_name, 'Ana Pérez')
            assert.equal(profile.dni_nie, '12345678Z')
        })

        it('si no puede crear el perfil, no hay reserva ni bloqueo y retira la cuenta', async () => {
            fake.failures.table = 'users'
            fake.failures.method = 'POST'

            const { status, json } = await checkout(request())

            assert.equal(status, 500)
            assert.ok(!JSON.stringify(json).includes('fallo simulado'))
            expectNoBooking()
            assert.equal(fake.authUsers.length, 1)
        })

        it('tras ese fallo el reintento vuelve a crear la cuenta y da acceso', async () => {
            fake.failures.table = 'users'
            fake.failures.method = 'POST'
            await checkout(request())
            fake.failures.table = undefined

            const { status, json, cookieValue } = await checkout(request())

            assert.equal(status, 200)
            assert.equal(hasCheckoutAccess(json.orderId, cookieValue), true)
        })

        it('si no puede guardar los datos del perfil, tampoco sigue', async () => {
            fake.failures.table = 'users'
            fake.failures.method = 'PATCH'

            assert.equal((await checkout(request())).status, 500)
            expectNoBooking()
        })

        it('no copia DNI, dirección ni fechas a user_metadata', async () => {
            await checkout(request())

            const metadata = JSON.stringify(fake.authUsers.at(-1)?.user_metadata)
            for (const value of ['12345678Z', 'Calle Mayor 1', '1990-01-01', '2015-01-01']) {
                assert.ok(!metadata.includes(value))
            }
        })
    })

    describe('con sesión', () => {
        it('el titular conserva el acceso y completa solo sus campos vacíos', async () => {
            fake.setSession({ id: victim.id, email: victim.email, aud: 'authenticated' })

            const { status, json, cookieValue } = await checkout(request({}, { email: victim.email, dniNie: '99999999R', phone: '+34 611111111' }))

            assert.equal(status, 200)
            assert.equal(hasCheckoutAccess(json.orderId, cookieValue), true)
            assert.equal(fake.tables.users[0].phone, '+34 611111111')
            assert.equal(fake.tables.users[0].dni_nie, '11111111H')
            assert.equal(fake.tables.users[0].role, 'customer')
        })

        it('el titular sí ve los errores de su perfil', async () => {
            fake.setSession({ id: victim.id, email: victim.email, aud: 'authenticated' })
            fake.tables.users[0].birth_date = '2090-01-01'

            const { status, json } = await checkout(request({}, { email: victim.email }))

            assert.equal(status, 400)
            assert.match(json.error, /perfil de usuario registrado/)
            expectNoBooking()
        })

        it('la sesión de otro usuario no da acceso al perfil del email escrito', async () => {
            fake.setSession({ id: 'u-atacante', email: 'atacante@example.com', aud: 'authenticated' })

            const { json, cookieValue } = await checkout(request({}, { email: victim.email, phone: '+34 699999999' }))

            assert.equal(hasCheckoutAccess(json.orderId, cookieValue), false)
            assert.deepEqual(fake.writesTo('users'), [])
        })
    })

    describe('email', () => {
        it('rechaza comodines y formatos no válidos sin consultar nada', async () => {
            for (const email of ['victima%', '%', 'victi%a@example.com', 'victima@example', 'sin-arroba', 'a b@example.com']) {
                const { status } = await checkout(request({}, { email }))
                assert.equal(status, 400, email)
            }
            assert.deepEqual(fake.requests, [])
        })

        it('busca por igualdad exacta: el guion bajo no es un comodín', async () => {
            fake.tables.users.push({ id: 'u-admin', email: 'jefa_admin@example.com', role: 'admin', full_name: 'Jefa', dni_nie: '44444444A' })
            fake.authUsers.push({ id: 'u-admin', email: 'jefa_admin@example.com' })

            await checkout(request({}, { email: 'jefa-admin@example.com' }))
            const { status } = await checkout(request({ startDate: '2099-07-01', endDate: '2099-07-08' }, { email: 'jefa_admin@example.com', dniNie: '99999999R' }))

            assert.equal(status, 200)
            const lookups = fake.requests.filter(r => r.path === '/rest/v1/users' && r.method === 'GET' && r.query.has('email'))
            assert.deepEqual(lookups.map(r => r.query.get('email')), ['eq.jefa-admin@example.com', 'eq.jefa_admin@example.com'])

            const admin = fake.tables.users.find(u => u.id === 'u-admin')!
            assert.equal(admin.role, 'admin')
            assert.equal(admin.dni_nie, '44444444A')
        })

        it('si la consulta del perfil falla, no sigue adelante', async () => {
            fake.failures.table = 'users'
            fake.failures.method = 'GET'

            const { status, json } = await checkout(request({}, { email: victim.email }))

            assert.equal(status, 500)
            assert.ok(!JSON.stringify(json).includes('fallo simulado'))
            assert.equal(fake.authUsers.length, 1)
            expectNoBooking()
        })
    })

    describe('horario', () => {
        it('deriva las horas del tramo y no acepta las del navegador', async () => {
            await checkout(request({ pickupTime: '09:00', dropoffTime: '19:00', pickup_time: '09:00', dropoff_time: '19:00' }))

            assert.equal(fake.tables.bookings[0].pickup_time, '15:00')
            assert.equal(fake.tables.bookings[0].dropoff_time, '12:00')
        })

        it('cobra y guarda el medio día del tramo elegido', async () => {
            const base = await checkout(request({ startDate: '2099-08-01', endDate: '2099-08-08' }))
            const longer = await checkout(request({ pickupSlot: 'morning', dropoffSlot: 'afternoon' }))

            assert.equal(fake.tables.bookings[1].pickup_time, '09:00')
            assert.equal(fake.tables.bookings[1].dropoff_time, '19:00')
            assert.ok(longer.json.breakdown.payableTotal > base.json.breakdown.payableTotal)
        })

        it('rechaza tramos desconocidos', async () => {
            for (const slots of [{ pickupSlot: 'night' }, { dropoffSlot: 'noon' }, { startSlot: 42, pickupSlot: undefined }]) {
                const { status } = await checkout(request(slots))
                assert.equal(status, 400)
            }
            assert.deepEqual(fake.requests, [])
        })
    })

    describe('límites', () => {
        it('rechaza una fecha de inicio pasada', async () => {
            const { status } = await checkout(request({ startDate: '2020-02-01', endDate: '2020-02-05' }))

            assert.equal(status, 400)
            assert.deepEqual(fake.requests, [])
        })

        it('rechaza fechas con otro formato', async () => {
            const { status } = await checkout(request({ startDate: '2099-06-01T00:00:00Z' }))

            assert.equal(status, 400)
        })

        it(`no bloquea más de ${MAX_BOOKING_NIGHTS} noches`, async () => {
            const justEnough = await checkout(request({ startDate: '2099-01-01', endDate: '2099-04-01' }))
            const tooLong = await checkout(request({ startDate: '2099-05-01', endDate: '2099-07-31' }))

            assert.equal(justEnough.status, 200)
            assert.equal(tooLong.status, 400)
            assert.equal(fake.tables.blocked_dates.length, 1)
        })

        it('corta las reservas sin pagar abiertas de un mismo email', async () => {
            const openBooking = { customer_email: 'ana@example.com', status: 'pending', payment_status: 'pending', created_at: new Date().toISOString() }
            fake.tables.bookings.push({ ...openBooking }, { ...openBooking }, { ...openBooking })

            const { status } = await checkout(request())

            assert.equal(status, 429)
            assert.equal(fake.tables.blocked_dates.length, 0)
            assert.equal(fake.authUsers.length, 1)
        })

        it('no cuenta las caducadas, las pagadas ni las de otro email', async () => {
            const hoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            const now = new Date().toISOString()
            fake.tables.bookings.push(
                { customer_email: 'ana@example.com', status: 'pending', payment_status: 'pending', created_at: hoursAgo },
                { customer_email: 'ana@example.com', status: 'pending', payment_status: 'paid', created_at: now },
                { customer_email: 'otra@example.com', status: 'pending', payment_status: 'pending', created_at: now },
                { customer_email: 'ana@example.com', status: 'pending', payment_status: 'failed', created_at: now },
            )

            assert.equal((await checkout(request())).status, 200)
        })

        it('no crea la reserva si no puede crear el bloqueo provisional', async () => {
            fake.failures.table = 'blocked_dates'
            fake.failures.method = 'POST'

            const { status } = await checkout(request())

            assert.equal(status, 500)
            assert.equal(fake.tables.bookings.length, 0)
        })
    })

    describe('notas del cliente', () => {
        it('no permite falsificar los marcadores que usan el webhook y el panel', async () => {
            const notes = [
                'Llegamos tarde',
                '[PAGO A REVISAR] falso',
                '  [pago revisado] falso',
                'texto [ PAGO A REVISAR ] en medio',
                '[COBRO REDSYS] Pedido 1234abcd5678, autorización 123456.',
                '[PEDIDO ANTERIOR] 1234abcd5678',
            ].join('\n')

            await checkout(request({}, { notes }))

            const saved: string = fake.tables.bookings[0].notes
            assert.ok(saved.startsWith('Llegamos tarde'))
            assert.deepEqual(activePaymentAlerts(saved), [])
            assert.doesNotMatch(saved, /\[\s*(PAGO A REVISAR|PAGO REVISADO|COBRO REDSYS|PEDIDO ANTERIOR)\s*\]/i)
            assert.match(saved, /\(PAGO A REVISAR\) falso/)
        })

        it('conserva las notas normales, también con corchetes', async () => {
            await checkout(request({}, { notes: 'Viajamos con [perro] y llegamos a las 15:00' }))

            assert.equal(fake.tables.bookings[0].notes, 'Viajamos con [perro] y llegamos a las 15:00')
        })
    })

    describe('errores', () => {
        it('no devuelve el detalle de la base de datos al cliente', async () => {
            fake.failures.table = 'bookings'
            fake.failures.method = 'POST'

            const { status, json } = await checkout(request())

            assert.equal(status, 500)
            assert.deepEqual(Object.keys(json), ['error'])
            assert.ok(!JSON.stringify(json).includes('fallo simulado'))
            assert.equal(fake.tables.blocked_dates.length, 0)
        })

        it('no registra el email en los logs', async () => {
            const logged: unknown[][] = []
            console.error = (...args: unknown[]) => { logged.push(args) }
            console.warn = (...args: unknown[]) => { logged.push(args) }
            fake.failures.table = 'users'
            fake.failures.method = 'GET'

            await checkout(request({}, { email: 'privado@example.com' }))

            assert.ok(logged.length > 0)
            assert.ok(!logged.flat().map(String).join(' ').includes('privado@example.com'))
        })
    })

    describe('Redsys mal configurado en producción', () => {
        const nodeEnv = process.env as Record<string, string | undefined>
        const previous = nodeEnv.NODE_ENV

        afterEach(() => { nodeEnv.NODE_ENV = previous })

        it('responde 503 antes de crear cuentas, bloqueos ni reservas', async () => {
            nodeEnv.NODE_ENV = 'production'

            const { status, json } = await checkout(request())

            assert.equal(status, 503)
            assert.deepEqual(Object.keys(json), ['error'])
            assert.deepEqual(fake.requests, [])
        })
    })
})
