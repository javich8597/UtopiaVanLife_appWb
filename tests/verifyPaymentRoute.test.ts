import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import './helpers/fakeSupabase'
import { NextRequest } from 'next/server'
import { GET } from '../app/api/bookings/verify-payment/route'
import { CHECKOUT_ACCESS_COOKIE, createCheckoutAccessCookie } from '../lib/checkoutAccess'

const ORDER = '1234abcd5678'
const FAKE_SUPABASE = 'https://supabase.test'
const PERSONAL_DATA = ['Ana Pérez', 'ana@example.com', '600000000', '12345678Z', 'Calle Mayor 1', '1985-02-02']

const bookingRow = {
    id: 'b1',
    user_id: null as string | null,
    payment_intent_id: ORDER,
    camper_id: 'c1',
    start_date: '2026-12-01',
    end_date: '2026-12-05',
    total_price: 700.5,
    payment_status: 'paid',
    status: 'pending',
    customer_name: 'Ana Pérez',
    customer_email: 'ana@example.com',
    customer_phone: '600000000',
    customer_dni: '12345678Z',
    customer_address: 'Calle Mayor 1',
}

/** Ejecuta la ruta real contra un Supabase simulado: el test no sale a la red */
describe('Ruta verify-payment: datos personales', () => {
    const env = { ...process.env }
    const realFetch = globalThis.fetch
    let row = bookingRow
    let verificationStatus = 'not_submitted'

    before(() => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = FAKE_SUPABASE
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-de-test'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-test'

        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = new URL(input instanceof Request ? input.url : String(input))
            assert.equal(url.origin, FAKE_SUPABASE, 'El test no debe llamar a ningún servicio real')

            const rows = url.pathname.endsWith('/users')
                ? [{ driver_license_issue_date: '2015-01-01', birth_date: '1985-02-02', verification_status: verificationStatus }]
                : [row]
            return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } })
        }) as typeof fetch
    })

    after(() => {
        globalThis.fetch = realFetch
        process.env = env
    })

    async function verify(cookie?: string) {
        const res = await GET(new NextRequest(`http://localhost/api/bookings/verify-payment?order=${ORDER}`, {
            headers: cookie ? { cookie } : {},
        }))
        const text = await res.text()
        return { status: res.status, text, json: JSON.parse(text) }
    }

    const assertNoPersonalData = (text: string) => {
        for (const value of PERSONAL_DATA) assert.ok(!text.includes(value), `No debe exponer ${value}`)
    }

    it('conocer el número de pedido solo da el estado del pago', async () => {
        row = bookingRow

        const { status, text, json } = await verify()

        assert.equal(status, 200)
        assert.equal(json.isPaid, true)
        assert.deepEqual(json.booking, { orderId: ORDER, paymentStatus: 'paid', status: 'pending' })
        assertNoPersonalData(text)
    })

    it('tampoco expone nada de una reserva con titular si no hay acceso', async () => {
        row = { ...bookingRow, user_id: 'u1' }

        assertNoPersonalData((await verify()).text)
    })

    it('una cookie falsa o de otro pedido no da acceso', async () => {
        row = bookingRow
        const other = createCheckoutAccessCookie('9999otropedido')!

        assertNoPersonalData((await verify(`${CHECKOUT_ACCESS_COOKIE}=9999999999999.falsa`)).text)
        assertNoPersonalData((await verify(`${other.name}=${other.value}`)).text)
    })

    it('sin pagar, la cookie no da datos personales', async () => {
        row = { ...bookingRow, user_id: 'u1', payment_status: 'pending' }
        const access = createCheckoutAccessCookie(ORDER)!

        assertNoPersonalData((await verify(`${access.name}=${access.value}`)).text)
    })

    it('el navegador que hizo la reserva recupera sus datos y perfil para el formulario', async () => {
        row = { ...bookingRow, user_id: 'u1' }
        const access = createCheckoutAccessCookie(ORDER)!

        const { status, json } = await verify(`${access.name}=${access.value}`)

        assert.equal(status, 200)
        assert.equal(json.booking.id, 'b1')
        assert.equal(json.booking.customerDni, '12345678Z')
        assert.equal(json.booking.customerAddress, 'Calle Mayor 1')
        assert.equal(json.booking.birthDate, '1985-02-02')
        assert.equal(json.booking.driverLicenseIssueDate, '2015-01-01')
    })

    it('acepta el token de acceso desde el parámetro query access sin cookie', async () => {
        row = { ...bookingRow, user_id: 'u1' }
        const access = createCheckoutAccessCookie(ORDER)!

        const res = await GET(new NextRequest(`http://localhost/api/bookings/verify-payment?order=${ORDER}&access=${access.value}`))
        const json = await res.json()

        assert.equal(res.status, 200)
        assert.equal(json.booking.id, 'b1')
        assert.equal(json.booking.customerDni, '12345678Z')
        assert.equal(json.booking.birthDate, '1985-02-02')
    })

    it('incluso si el usuario ya tenía verification_status de un viaje anterior, permite ver la reserva pagada', async () => {
        row = { ...bookingRow, user_id: 'u1' }
        const access = createCheckoutAccessCookie(ORDER)!

        for (const status of ['pending_validation', 'verified', 'approved']) {
            verificationStatus = status
            const { json } = await verify(`${access.name}=${access.value}`)
            assert.equal(json.booking.id, 'b1')
            assert.equal(json.booking.customerDni, '12345678Z')
        }
        verificationStatus = 'not_submitted'
    })
})
