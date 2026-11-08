import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
    buildVerifiedBooking,
    CHECKOUT_ACCESS_COOKIE,
    createCheckoutAccessCookie,
    createCheckoutNoAccessCookie,
    expiredCheckoutAccessCookie,
    hasCheckoutAccess,
    resolveCheckoutUploadOwner,
} from '../lib/checkoutAccess'

const ORDER = '1234abcd5678'
const NOW = new Date('2026-11-07T10:00:00Z')
const minutesLater = (m: number) => new Date(NOW.getTime() + m * 60 * 1000)

const booking = {
    id: 'b1',
    payment_intent_id: ORDER,
    camper_id: 'c1',
    start_date: '2026-12-01',
    end_date: '2026-12-05',
    total_price: '700.50',
    payment_status: 'paid',
    status: 'pending',
    customer_name: 'Ana Pérez',
    customer_email: 'ana@example.com',
    customer_phone: '600000000',
    customer_dni: '12345678Z',
    customer_address: 'Calle Mayor 1',
}

describe('Acceso tras el pago', () => {
    const previous = process.env.SUPABASE_SERVICE_ROLE_KEY

    before(() => { process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-test' })
    after(() => {
        if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
        else process.env.SUPABASE_SERVICE_ROLE_KEY = previous
    })

    const token = () => createCheckoutAccessCookie(ORDER, NOW)!.value

    it('reconoce al navegador que creó el pedido', () => {
        assert.equal(hasCheckoutAccess(ORDER, token(), minutesLater(5)), true)
    })

    it('la cookie no es legible desde JavaScript y solo viaja a las API', () => {
        const cookie = createCheckoutAccessCookie(ORDER, NOW)!

        assert.equal(cookie.name, CHECKOUT_ACCESS_COOKIE)
        assert.equal(cookie.options.httpOnly, true)
        assert.equal(cookie.options.sameSite, 'lax')
        assert.equal(cookie.options.path, '/api')
    })

    it('no sirve para otro pedido', () => {
        assert.equal(hasCheckoutAccess('9999otropedido', token(), minutesLater(5)), false)
    })

    it('caduca', () => {
        assert.equal(hasCheckoutAccess(ORDER, token(), minutesLater(119)), true)
        assert.equal(hasCheckoutAccess(ORDER, token(), minutesLater(120)), false)
    })

    it('no se puede alargar la caducidad ni alterar la firma', () => {
        const [expires, signature] = token().split('.')
        const flipped = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1)

        assert.equal(hasCheckoutAccess(ORDER, `${Number(expires) + 60000}.${signature}`, minutesLater(5)), false)
        assert.equal(hasCheckoutAccess(ORDER, `${expires}.${flipped}`, minutesLater(5)), false)
    })

    it('rechaza valores vacíos o malformados sin lanzar errores', () => {
        for (const value of [undefined, null, '', 'x', '.', 'abc.def', `${token()}.extra`]) {
            assert.equal(hasCheckoutAccess(ORDER, value, NOW), false)
        }
    })

    it('una cookie firmada con otra clave no vale', () => {
        const value = token()
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'otra-clave'
        try {
            assert.equal(hasCheckoutAccess(ORDER, value, minutesLater(5)), false)
        } finally {
            process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-test'
        }
    })

    it('la cookie de quien no tiene acceso es indistinguible de la real, pero no sirve para nada', () => {
        const real = createCheckoutAccessCookie(ORDER, NOW)!
        const noAccess = createCheckoutNoAccessCookie(NOW)!

        assert.equal(noAccess.name, real.name)
        assert.deepEqual(noAccess.options, real.options)
        assert.equal(noAccess.value.length, real.value.length)
        assert.equal(noAccess.value.split('.')[0], real.value.split('.')[0])
        assert.equal(hasCheckoutAccess(ORDER, noAccess.value, minutesLater(5)), false)
    })

    it('la cookie se puede borrar del navegador', () => {
        const expired = expiredCheckoutAccessCookie()

        assert.equal(expired.name, CHECKOUT_ACCESS_COOKIE)
        assert.equal(expired.value, '')
        assert.equal(expired.options.maxAge, 0)
        assert.equal(expired.options.path, '/api')
    })

    it('sin clave de servidor no concede acceso', () => {
        const value = token()
        delete process.env.SUPABASE_SERVICE_ROLE_KEY
        try {
            assert.equal(createCheckoutAccessCookie(ORDER, NOW), null)
            assert.equal(hasCheckoutAccess(ORDER, value, minutesLater(5)), false)
        } finally {
            process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-test'
        }
    })
})

describe('Subida de documentación sin sesión', () => {
    const previous = process.env.SUPABASE_SERVICE_ROLE_KEY

    before(() => { process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-test' })
    after(() => {
        if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
        else process.env.SUPABASE_SERVICE_ROLE_KEY = previous
    })

    function fakeDb(tables: { bookings?: object | null; users?: object | null }) {
        const queries: string[] = []
        const db = {
            from(table: 'bookings' | 'users') {
                queries.push(table)
                const query = {
                    select: () => query,
                    eq: () => query,
                    maybeSingle: async () => ({ data: tables[table] ?? null, error: null }),
                }
                return query
            },
        }
        return { db: db as unknown as SupabaseClient, queries }
    }

    const cookie = (order = ORDER) => createCheckoutAccessCookie(order, NOW)!.value
    const later = minutesLater(5)

    const paidBooking = { user_id: 'u1', payment_status: 'paid' }

    it('con la cookie de una cuenta creada en el checkout y la reserva pagada, asocia los documentos', async () => {
        const { db } = fakeDb({ bookings: paidBooking, users: { verification_status: 'not_submitted' } })

        assert.equal(await resolveCheckoutUploadOwner(db, ORDER, cookie(), later), 'u1')
    })

    it('una cuenta existente sin sesión no recibe cookie válida: no se le asocia nada', async () => {
        const { db, queries } = fakeDb({ bookings: paidBooking, users: { verification_status: 'not_submitted' } })

        assert.equal(await resolveCheckoutUploadOwner(db, ORDER, createCheckoutNoAccessCookie(NOW)!.value, later), null)
        assert.deepEqual(queries, [])
    })

    it('sin pagar la cookie no sirve: crear pedidos no permite averiguar si un email tiene cuenta', async () => {
        for (const payment_status of ['pending', 'failed', 'refunded', null]) {
            const { db } = fakeDb({ bookings: { user_id: 'u1', payment_status }, users: { verification_status: 'not_submitted' } })

            assert.equal(await resolveCheckoutUploadOwner(db, ORDER, cookie(), later), null)
        }
    })

    it('tras enviar la documentación la cookie deja de valer', async () => {
        const { db } = fakeDb({ bookings: paidBooking, users: { verification_status: 'pending_validation' } })

        assert.equal(await resolveCheckoutUploadOwner(db, ORDER, cookie(), later), null)
    })

    it('conocer el número de pedido no basta, y ni siquiera se consulta la base de datos', async () => {
        const { db, queries } = fakeDb({ bookings: paidBooking, users: { verification_status: 'not_submitted' } })

        assert.equal(await resolveCheckoutUploadOwner(db, ORDER, undefined, later), null)
        assert.equal(await resolveCheckoutUploadOwner(db, ORDER, '9999999999999.falsa', later), null)
        assert.equal(await resolveCheckoutUploadOwner(db, ORDER, cookie('9999otropedido'), later), null)
        assert.equal(await resolveCheckoutUploadOwner(db, '', cookie(), later), null)
        assert.deepEqual(queries, [])
    })

    it('el acceso caduca aunque la reserva esté pagada', async () => {
        const { db } = fakeDb({ bookings: paidBooking, users: { verification_status: 'not_submitted' } })

        assert.equal(await resolveCheckoutUploadOwner(db, ORDER, cookie(), minutesLater(120)), null)
    })

    it('un cliente verificado debe iniciar sesión para cambiar sus datos', async () => {
        for (const verification_status of ['verified', 'approved', ' Approved ']) {
            const { db } = fakeDb({ bookings: paidBooking, users: { verification_status } })

            assert.equal(await resolveCheckoutUploadOwner(db, ORDER, cookie(), later), null)
        }
    })

    it('no asocia nada si la reserva no existe o no tiene titular', async () => {
        assert.equal(await resolveCheckoutUploadOwner(fakeDb({}).db, ORDER, cookie(), later), null)
        assert.equal(await resolveCheckoutUploadOwner(fakeDb({ bookings: { user_id: null, payment_status: 'paid' } }).db, ORDER, cookie(), later), null)
    })
})

describe('Respuesta de verify-payment', () => {
    it('sin acceso devuelve solo el estado del pago', () => {
        const result = buildVerifiedBooking(booking, ORDER, null)

        assert.deepEqual(result, { orderId: ORDER, paymentStatus: 'paid', status: 'pending' })
        for (const value of ['Ana Pérez', 'ana@example.com', '600000000', '12345678Z', 'Calle Mayor 1']) {
            assert.ok(!JSON.stringify(result).includes(value))
        }
    })

    it('con acceso devuelve lo necesario para rellenar el formulario', () => {
        const result = buildVerifiedBooking(booking, ORDER, {
            profile: { driver_license_issue_date: '2015-01-01', birth_date: '1985-02-02' },
        })

        assert.deepEqual(result, {
            orderId: ORDER,
            paymentStatus: 'paid',
            status: 'pending',
            id: 'b1',
            camperId: 'c1',
            startDate: '2026-12-01',
            endDate: '2026-12-05',
            totalPrice: 700.5,
            customerName: 'Ana Pérez',
            customerEmail: 'ana@example.com',
            customerPhone: '600000000',
            customerDni: '12345678Z',
            customerAddress: 'Calle Mayor 1',
            driverLicenseIssueDate: '2015-01-01',
            birthDate: '1985-02-02',
        })
    })

    it('con acceso admite un cliente sin perfil', () => {
        const result = buildVerifiedBooking(booking, ORDER, { profile: null })

        assert.ok('customerDni' in result)
        assert.equal('driverLicenseIssueDate' in result && result.driverLicenseIssueDate, null)
    })
})
