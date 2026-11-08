import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST } from '../app/api/bookings/[id]/pay/route'

const OLD_ORDER = '1111oldorder'
const owner = { id: 'u1', email: 'ana@example.com', aud: 'authenticated' }

const booking = (overrides: Row = {}): Row => ({
    id: 'b1',
    user_id: 'u1',
    camper_id: 'c1',
    start_date: '2099-06-01',
    end_date: '2099-06-08',
    status: 'pending',
    payment_status: 'pending',
    payment_intent_id: OLD_ORDER,
    notes: 'Llegamos tarde',
    total_price: 700,
    customer_name: 'Ana',
    ...overrides,
})

describe('Reintento de pago', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = console.error

    beforeEach(() => {
        fake = installFakeSupabase({ bookings: [booking()] })
        fake.setSession(owner)
        console.error = () => {}
    })

    afterEach(() => {
        fake.restore()
        console.error = silenced
    })

    async function pay() {
        const res = await POST(new Request('http://localhost/api/bookings/b1/pay', { method: 'POST' }), {
            params: Promise.resolve({ id: 'b1' }),
        })
        return { status: res.status, json: await res.json() }
    }

    it('cambia el pedido y conserva el anterior en las notas', async () => {
        const { status, json } = await pay()

        assert.equal(status, 200)
        assert.equal(fake.tables.bookings[0].payment_intent_id, json.orderId)
        assert.equal(fake.tables.bookings[0].notes, `Llegamos tarde\n[PEDIDO ANTERIOR] ${OLD_ORDER}`)
    })

    it('la escritura excluye las reservas ya pagadas', async () => {
        await pay()

        const [update] = fake.writesTo('bookings')
        assert.equal(update.query.get('payment_status'), 'neq.paid')
        assert.equal(update.query.get('status'), 'eq.pending')
    })

    it('si el webhook entra justo antes, no deshace el pago', async () => {
        fake.onBeforeWrite('bookings', () => { fake.tables.bookings[0].payment_status = 'paid' })

        const { status } = await pay()

        assert.equal(status, 409)
        assert.equal(fake.tables.bookings[0].payment_status, 'paid')
        assert.equal(fake.tables.bookings[0].payment_intent_id, OLD_ORDER)
        assert.equal(fake.tables.bookings[0].notes, 'Llegamos tarde')
    })

    it('admite reservas antiguas sin payment_status', async () => {
        fake.tables.bookings[0].payment_status = null

        assert.equal((await pay()).status, 200)
    })

    it('su propio bloqueo provisional no le impide reintentar', async () => {
        fake.tables.blocked_dates.push({
            camper_id: 'c1',
            start_date: '2099-06-01',
            end_date: '2099-06-08',
            session_id: `checkout_${OLD_ORDER}`,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })

        assert.equal((await pay()).status, 200)
    })

    it('el bloqueo provisional de otro cliente sí se lo impide', async () => {
        fake.tables.blocked_dates.push({
            camper_id: 'c1',
            start_date: '2099-06-01',
            end_date: '2099-06-08',
            session_id: 'checkout_2222otropedido',
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })

        assert.equal((await pay()).status, 409)
    })

    it('con Redsys mal configurado la reserva conserva su pedido', async () => {
        process.env.REDSYS_ENVIRONMENT = 'prod'

        const { status } = await pay()

        assert.equal(status, 500)
        assert.equal(fake.tables.bookings[0].payment_intent_id, OLD_ORDER)
        assert.deepEqual(fake.writesTo('bookings'), [])
    })
})
