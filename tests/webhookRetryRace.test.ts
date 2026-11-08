import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST as payPost } from '../app/api/bookings/[id]/pay/route'
import { getSupabaseAdmin } from '../lib/supabase/admin'
import { decideRedsysNotification, hasPreviousOrderCharge, MAX_PAYMENT_RETRIES, previousOrderIds, processRedsysNotification } from '../lib/redsysNotification'
import { activePaymentAlerts, markPaymentAlertsReviewed } from '../lib/admin/bookingStatus'

/**
 * Webhook de Redsys y reintento de pago cruzados, con el código real de los dos lados
 * (lib/redsysNotification.ts y /api/bookings/[id]/pay) sobre Supabase simulado.
 * El cruce se fuerza deteniendo la escritura de un lado hasta que el otro termina.
 * No prueba el bloqueo de filas real de Postgres: el simulador aplica cada PATCH entero de una vez.
 *
 * R1: el webhook del pedido A lee la reserva, un reintento la pasa al pedido B y después el webhook escribe.
 * R2: el reintento lee la reserva, el webhook escribe sus notas y después el reintento escribe.
 */

const ORDER_A = '1111pedidoaa'
const NOW = new Date('2099-05-01T10:00:00Z')

const booking = (overrides: Row = {}): Row => ({
    id: 'b1', user_id: 'u1', camper_id: 'c1', start_date: '2099-06-01', end_date: '2099-06-08',
    status: 'pending', payment_status: 'pending', payment_intent_id: ORDER_A,
    notes: 'Llegamos tarde', total_price: 700, customer_name: 'Ana', customer_email: 'ana@example.com', ...overrides,
})

const charge = (order: string, overrides: Row = {}) => ({
    Ds_Order: order, Ds_Response: '0000', Ds_Amount: '70000', Ds_Currency: '978',
    Ds_TransactionType: '0', Ds_AuthorisationCode: '123456', ...overrides,
})

describe('Webhook y reintento cruzados', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }
    let pauseBeforeWrite: ((body: Row) => Promise<void> | void) | null = null
    /** Se ejecuta durante el envío del enlace de acceso; si devuelve false, el envío falla */
    let duringOtp: (() => Promise<boolean>) | null = null

    beforeEach(() => {
        fake = installFakeSupabase({ bookings: [booking()] })
        fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
        console.error = () => {}
        console.warn = () => {}

        // Detiene la primera escritura en bookings que cumpla la condición hasta que acaba el otro lado
        const inner = globalThis.fetch
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = new URL(input instanceof Request ? input.url : String(input))
            if (url.pathname === '/auth/v1/otp') {
                const hook = duringOtp
                duringOtp = null
                const ok = hook ? await hook() : true
                return ok
                    ? new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
                    : new Response(JSON.stringify({ msg: 'fallo simulado' }), { status: 429, headers: { 'content-type': 'application/json' } })
            }
            if (url.pathname === '/rest/v1/bookings' && init?.method === 'PATCH' && pauseBeforeWrite) {
                const hook = pauseBeforeWrite
                const body = JSON.parse(String(init.body))
                const result = hook(body)
                if (result) {
                    pauseBeforeWrite = null
                    await result
                }
            }
            return inner(input, init)
        }) as typeof fetch
    })

    afterEach(() => {
        pauseBeforeWrite = null
        duringOtp = null
        fake.restore()
        Object.assign(console, silenced)
    })

    async function pay() {
        const res = await payPost(new Request('http://localhost/api/bookings/b1/pay', { method: 'POST' }), {
            params: Promise.resolve({ id: 'b1' }),
        })
        return { status: res.status, json: await res.json() }
    }

    const notify = (notification: Row) => processRedsysNotification(getSupabaseAdmin(), notification, NOW)

    it('R1: el cobro del pedido A no marca pagada la reserva que ya pasó al pedido B, ni borra su rastro', async () => {
        let retry: Awaited<ReturnType<typeof pay>> | null = null
        pauseBeforeWrite = body => body.payment_status === 'paid' ? (async () => { retry = await pay() })() : undefined

        const res = await notify(charge(ORDER_A))

        assert.ok(retry, 'el reintento debe ejecutarse entre la lectura y la escritura del webhook')
        const { status, json } = retry as Awaited<ReturnType<typeof pay>>
        assert.equal(status, 200)
        assert.equal(res.httpStatus, 200)

        const row = fake.tables.bookings[0]
        assert.equal(row.payment_intent_id, json.orderId, 'la reserva sigue con el pedido del reintento')
        assert.equal(row.payment_status, 'pending', 'el cobro de A no cuenta como pago del pedido B')
        assert.equal(row.status, 'pending')
        assert.match(row.notes, new RegExp(`^Llegamos tarde\\n\\[PEDIDO ANTERIOR\\] ${ORDER_A}$`, 'm'))
        assert.match(row.notes, new RegExp(`\\[PAGO A REVISAR\\] Cobro del pedido anterior ${ORDER_A} \\(70000 céntimos\\)`))
        assert.equal(fake.tables.blocked_dates.filter(b => b.session_id === `redsys_${ORDER_A}`).length, 0)
    })

    it('R1: si después se cobra también el pedido B, la reserva queda pagada y el aviso de A se conserva', async () => {
        let orderB = ''
        pauseBeforeWrite = body => body.payment_status === 'paid' ? (async () => { orderB = (await pay()).json.orderId })() : undefined
        await notify(charge(ORDER_A))

        const res = await notify(charge(orderB, { Ds_AuthorisationCode: '654321' }))

        const row = fake.tables.bookings[0]
        assert.equal(res.httpStatus, 200)
        assert.equal(row.payment_status, 'paid')
        assert.match(row.notes, new RegExp(`Cobro del pedido anterior ${ORDER_A}`))
        assert.match(row.notes, new RegExp(`\\[COBRO REDSYS\\] Pedido ${orderB}, autorización 654321\\.`))
    })

    it('R1: la repetición del cobro de A tras el cruce no duplica el aviso', async () => {
        pauseBeforeWrite = body => body.payment_status === 'paid' ? (async () => { await pay() })() : undefined
        await notify(charge(ORDER_A))
        const after = fake.tables.bookings[0].notes

        await notify(charge(ORDER_A))

        assert.equal(fake.tables.bookings[0].notes, after)
    })

    it('R1: un fallo del pedido A que llega cruzado con el reintento no toca la reserva', async () => {
        let orderB = ''
        pauseBeforeWrite = body => body.payment_status === 'failed' ? (async () => { orderB = (await pay()).json.orderId })() : undefined

        const res = await notify(charge(ORDER_A, { Ds_Response: '0190' }))

        const row = fake.tables.bookings[0]
        assert.equal(res.httpStatus, 200)
        assert.equal(row.payment_intent_id, orderB)
        assert.equal(row.payment_status, 'pending', 'el fallo del pedido viejo no marca como fallido el nuevo')
        assert.equal(row.notes, `Llegamos tarde\n[PEDIDO ANTERIOR] ${ORDER_A}`)
    })

    it('R2: el reintento no pisa el aviso que el webhook escribió entre su lectura y su escritura', async () => {
        pauseBeforeWrite = body => body.payment_status === 'pending' && body.payment_intent_id
            ? (async () => { await notify(charge(ORDER_A, { Ds_Amount: '100' })) })()
            : undefined

        const { status, json } = await pay()

        const row = fake.tables.bookings[0]
        assert.equal(status, 409)
        assert.equal(json.form, undefined, 'el pedido del perdedor nunca llega a Redsys')
        assert.match(json.error, /vuelve a intentarlo/i)
        assert.equal(row.payment_intent_id, ORDER_A)
        assert.match(row.notes, /\[PAGO A REVISAR\] El cobro no coincide con la reserva/)
    })

    it('R2: con el aviso del webhook sin revisar, un nuevo reintento no cobra otra vez', async () => {
        pauseBeforeWrite = body => body.payment_status === 'pending' && body.payment_intent_id
            ? (async () => { await notify(charge(ORDER_A, { Ds_Amount: '100' })) })()
            : undefined
        await pay()
        const notes = fake.tables.bookings[0].notes

        const { status, json } = await pay()

        assert.equal(status, 409)
        assert.equal(json.form, undefined)
        assert.match(json.error, /revisando un pago/)
        assert.equal(fake.tables.bookings[0].payment_intent_id, ORDER_A)
        assert.equal(fake.tables.bookings[0].notes, notes)
    })

    it('R2: revisado el aviso, el reintento lo conserva en las notas', async () => {
        pauseBeforeWrite = body => body.payment_status === 'pending' && body.payment_intent_id
            ? (async () => { await notify(charge(ORDER_A, { Ds_Amount: '100' })) })()
            : undefined
        await pay()
        const row = fake.tables.bookings[0]
        row.notes = markPaymentAlertsReviewed(row.notes)

        const { status, json } = await pay()

        assert.equal(status, 200)
        assert.equal(row.payment_intent_id, json.orderId)
        assert.match(row.notes, /\[PAGO A REVISAR\] El cobro no coincide con la reserva/)
        assert.match(row.notes, /\[PAGO REVISADO\] El cobro no coincide con la reserva/)
        assert.match(row.notes, new RegExp(`\\[PEDIDO ANTERIOR\\] ${ORDER_A}`))
    })

    it('R2: si el webhook cobra el pedido A antes de la escritura del reintento, gana el pago', async () => {
        pauseBeforeWrite = body => body.payment_status === 'pending' && body.payment_intent_id
            ? (async () => { await notify(charge(ORDER_A)) })()
            : undefined

        const { status, json } = await pay()

        const row = fake.tables.bookings[0]
        assert.equal(status, 409)
        assert.equal(json.form, undefined)
        assert.equal(row.payment_status, 'paid')
        assert.equal(row.payment_intent_id, ORDER_A)
        assert.match(row.notes, new RegExp(`\\[COBRO REDSYS\\] Pedido ${ORDER_A}, autorización 123456\\.`))
    })

    it('auditoría: el cobro de B no borra el aviso del cobro de A que entra mientras B escribe', async () => {
        // Escenario reproducido por seguridad-auditor (race.test.ts): la reserva va por el pedido B y A es anterior
        const ORDER_B = '2222pedidobb'
        Object.assign(fake.tables.bookings[0], { payment_intent_id: ORDER_B, notes: `Llegamos tarde\n[PEDIDO ANTERIOR] ${ORDER_A}` })
        let resA: Awaited<ReturnType<typeof notify>> | null = null
        pauseBeforeWrite = body => body.payment_status === 'paid'
            ? (async () => { resA = await notify(charge(ORDER_A)) })()
            : undefined

        const resB = await notify(charge(ORDER_B, { Ds_AuthorisationCode: '654321' }))

        const row = fake.tables.bookings[0]
        assert.deepEqual(resA, { httpStatus: 200, body: 'OK' })
        assert.deepEqual(resB, { httpStatus: 200, body: 'OK' })
        assert.equal(row.payment_status, 'paid')
        const alerts = activePaymentAlerts(row.notes)
        assert.equal(alerts.length, 1, row.notes)
        assert.match(alerts[0], new RegExp(`^Cobro del pedido anterior ${ORDER_A} \\(70000 céntimos\\)`))
        assert.match(row.notes, new RegExp(`\\[COBRO REDSYS\\] Pedido ${ORDER_B}, autorización 654321\\.`))
        assert.match(row.notes, new RegExp(`\\[PEDIDO ANTERIOR\\] ${ORDER_A}`))
    })

    it('auditoría: anotar el fallo del enlace de acceso no borra un aviso escrito durante el envío', async () => {
        const ORDER_B = '2222pedidobb'
        Object.assign(fake.tables.bookings[0], { payment_intent_id: ORDER_B, notes: `Llegamos tarde\n[PEDIDO ANTERIOR] ${ORDER_A}` })
        // Mientras se envía el enlace del pago de B (y falla), entra el cobro del pedido anterior A
        duringOtp = async () => { await notify(charge(ORDER_A)); return false }

        const resB = await notify(charge(ORDER_B, { Ds_AuthorisationCode: '654321' }))

        const row = fake.tables.bookings[0]
        assert.equal(resB.httpStatus, 500, 'el enlace falló: Redsys debe reenviar')
        assert.equal(row.payment_status, 'paid')
        const alerts = activePaymentAlerts(row.notes)
        assert.ok(alerts.some(a => a.startsWith(`Cobro del pedido anterior ${ORDER_A}`)), row.notes)
        assert.ok(alerts.some(a => a.startsWith('No se pudo enviar el enlace de acceso')), row.notes)
    })

    it('si el enlace se envía, quitar su aviso antiguo no borra uno escrito durante el envío', async () => {
        const ORDER_B = '2222pedidobb'
        const linkAlert = `[PAGO A REVISAR] No se pudo enviar el enlace de acceso al cliente (pedido ${ORDER_B}). Se reintentará si Redsys repite la notificación; si no, envíaselo a mano.`
        Object.assign(fake.tables.bookings[0], {
            payment_intent_id: ORDER_B, payment_status: 'paid',
            notes: `Llegamos tarde\n[PEDIDO ANTERIOR] ${ORDER_A}\n[COBRO REDSYS] Pedido ${ORDER_B}, autorización 654321.\n${linkAlert}`,
        })
        duringOtp = async () => { await notify(charge(ORDER_A)); return true }

        const res = await notify(charge(ORDER_B, { Ds_AuthorisationCode: '654321' }))

        const row = fake.tables.bookings[0]
        assert.equal(res.httpStatus, 200)
        assert.ok(!row.notes.includes(linkAlert), 'el aviso del enlace ya enviado se quita')
        assert.match(row.notes, new RegExp(`Cobro del pedido anterior ${ORDER_A}`))
    })

    it('el reintento no se prepara si la reserva tiene un aviso de pago sin revisar', async () => {
        fake.tables.bookings[0].notes = 'Llegamos tarde\n[PAGO A REVISAR] El cobro no coincide con la reserva (pedido 1111pedidoaa: 100 céntimos, moneda 978).'

        const { status, json } = await pay()

        assert.equal(status, 409)
        assert.equal(json.form, undefined)
        assert.deepEqual(fake.writesTo('bookings'), [])
    })

    it('el aviso de un pedido anterior no pisa un reintento que escribe las notas a la vez', async () => {
        // Estado tras un primer reintento: la reserva va por el pedido B y A queda como anterior
        const ORDER_B = '2222pedidobb'
        Object.assign(fake.tables.bookings[0], { payment_intent_id: ORDER_B, notes: `Llegamos tarde\n[PEDIDO ANTERIOR] ${ORDER_A}` })
        let orderC = ''
        pauseBeforeWrite = body => typeof body.notes === 'string' && body.notes.includes('Cobro del pedido anterior')
            ? (async () => { orderC = (await pay()).json.orderId })()
            : undefined

        const res = await notify(charge(ORDER_A))

        const row = fake.tables.bookings[0]
        assert.equal(res.httpStatus, 200)
        assert.equal(row.payment_intent_id, orderC)
        assert.match(row.notes, new RegExp(`\\[PEDIDO ANTERIOR\\] ${ORDER_B}`), 'el pedido B sigue localizable')
        assert.match(row.notes, new RegExp(`Cobro del pedido anterior ${ORDER_A}`))
    })
})

describe('Cobro en una reserva ya pagada con otro pedido', () => {
    const base = { booking: { status: 'pending', payment_status: 'paid', total_price: 700 }, responseCode: '0000', amount: '70000', currency: '978' }

    it('avisa si consta el cobro de otro pedido y no el de este', () => {
        const decision = decideRedsysNotification({ ...base, orderId: '2222pedidobb', recordedChargeOrders: [ORDER_A] })

        assert.equal(decision.paymentStatus, undefined)
        assert.match(decision.alert || '', /Posible cobro doble/)
        assert.match(decision.alert || '', new RegExp(ORDER_A))
    })

    it('no avisa en una repetición del cobro registrado', () => {
        assert.equal(decideRedsysNotification({ ...base, orderId: ORDER_A, recordedChargeOrders: [ORDER_A] }).alert, undefined)
    })

    it('no avisa si no consta ningún cobro (reservas antiguas o sin código de autorización)', () => {
        assert.equal(decideRedsysNotification({ ...base, orderId: ORDER_A, recordedChargeOrders: [] }).alert, undefined)
    })

    it('de punta a punta: la reserva pagada con A que recibe el cobro de B lo deja anotado una vez', async () => {
        const ORDER_B = '2222pedidobb'
        const fake = installFakeSupabase({
            bookings: [booking({
                payment_status: 'paid', payment_intent_id: ORDER_B,
                notes: `[COBRO REDSYS] Pedido ${ORDER_A}, autorización 123456.`,
            })],
        })
        const silenced = console.error
        console.error = () => {}
        try {
            await processRedsysNotification(getSupabaseAdmin(), charge(ORDER_B, { Ds_AuthorisationCode: '654321' }), NOW)
            await processRedsysNotification(getSupabaseAdmin(), charge(ORDER_B, { Ds_AuthorisationCode: '654321' }), NOW)

            const row = fake.tables.bookings[0]
            assert.equal(row.payment_status, 'paid')
            assert.equal(row.notes.match(/Posible cobro doble/g)?.length, 1)
        } finally {
            console.error = silenced
            fake.restore()
        }
    })
})

describe('hasPreviousOrderCharge: solo cuentan los avisos activos', () => {
    const alert = `Cobro del pedido anterior ${ORDER_A} (70000 céntimos): el cliente reintentó el pago y la reserva ya tiene otro pedido.`

    it('lo encuentra en un aviso [PAGO A REVISAR] sin revisar', () => {
        assert.equal(hasPreviousOrderCharge(`Llegamos tarde\n[PAGO A REVISAR] ${alert}`, ORDER_A), true)
    })

    it('no cuenta el mismo texto fuera de un aviso, como el que podría escribir un cliente', () => {
        assert.equal(hasPreviousOrderCharge(`Llegamos tarde. ${alert}`, ORDER_A), false)
        assert.equal(hasPreviousOrderCharge(alert, ORDER_A), false)
    })

    it('deja de contar cuando el admin lo marca como revisado', () => {
        assert.equal(hasPreviousOrderCharge(markPaymentAlertsReviewed(`[PAGO A REVISAR] ${alert}`), ORDER_A), false)
    })

    it('no confunde un pedido con otro que empieza igual', () => {
        assert.equal(hasPreviousOrderCharge(`[PAGO A REVISAR] Cobro del pedido anterior ${ORDER_A}99 (100 céntimos)`, ORDER_A), false)
    })
})

describe('Enlace de acceso pendiente (escenario E2 de seguridad-auditor)', () => {
    const ORDER_B = '2222pedidobb'
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }
    let otpCalls = 0
    let otpWorks = false
    let interfere = true

    beforeEach(() => {
        fake = installFakeSupabase({ bookings: [booking({ payment_intent_id: ORDER_B, notes: `Llegamos tarde\n[PEDIDO ANTERIOR] ${ORDER_A}` })] })
        console.error = () => {}
        console.warn = () => {}
        otpCalls = 0
        otpWorks = false
        interfere = true
        const inner = globalThis.fetch
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = new URL(input instanceof Request ? input.url : String(input))
            if (url.pathname === '/auth/v1/otp') {
                otpCalls++
                return otpWorks
                    ? new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
                    : new Response('{"msg":"smtp"}', { status: 500, headers: { 'content-type': 'application/json' } })
            }
            // Alguien (el admin) cambia las notas justo antes de cada escritura que menciona el enlace
            if (interfere && url.pathname === '/rest/v1/bookings' && init?.method === 'PATCH' && String(init.body).includes('enlace de acceso')) {
                fake.tables.bookings[0].notes += '\nnota admin'
            }
            return inner(input, init)
        }) as typeof fetch
    })

    afterEach(() => { fake.restore(); Object.assign(console, silenced) })

    const notify = (notification: Row) => processRedsysNotification(getSupabaseAdmin(), notification, NOW)
    const linkAlerts = () => activePaymentAlerts(fake.tables.bookings[0].notes).filter(a => a.startsWith('No se pudo enviar el enlace de acceso'))

    it('si no se puede guardar, no se guarda nada a medias y la repetición cobra y deja el enlace pendiente', async () => {
        const first = await notify(charge(ORDER_B, { Ds_AuthorisationCode: '654321' }))

        assert.equal(first.httpStatus, 500, 'Redsys debe repetir')
        assert.equal(fake.tables.bookings[0].payment_status, 'pending', 'el pago no se guarda sin su aviso de enlace')
        assert.equal(otpCalls, 0, 'no se envía el enlace de un pago que no se ha guardado')

        interfere = false
        const repeat = await notify(charge(ORDER_B, { Ds_AuthorisationCode: '654321' }))

        assert.equal(repeat.httpStatus, 500, 'el enlace sigue fallando: Redsys debe repetir otra vez')
        assert.equal(fake.tables.bookings[0].payment_status, 'paid')
        assert.equal(otpCalls, 1)
        assert.equal(linkAlerts().length, 1, 'el enlace queda pendiente y visible para el admin')

        otpWorks = true
        const last = await notify(charge(ORDER_B, { Ds_AuthorisationCode: '654321' }))

        assert.equal(last.httpStatus, 200)
        assert.equal(otpCalls, 2, 'la repetición reenvía el enlace pendiente')
        assert.equal(linkAlerts().length, 0)
    })

    it('el enlace enviado cuyo aviso no se puede quitar se reenvía en la repetición, nunca se pierde', async () => {
        otpWorks = true
        interfere = false
        // El pago se guarda; después, cada intento de quitar el aviso del enlace choca con otro cambio
        const inner = globalThis.fetch
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = new URL(input instanceof Request ? input.url : String(input))
            if (url.pathname === '/rest/v1/bookings' && init?.method === 'PATCH' && !String(init.body).includes('payment_status')) {
                fake.tables.bookings[0].notes += '\nnota admin'
            }
            return inner(input, init)
        }) as typeof fetch

        const first = await notify(charge(ORDER_B, { Ds_AuthorisationCode: '654321' }))

        assert.equal(first.httpStatus, 500)
        assert.equal(fake.tables.bookings[0].payment_status, 'paid')
        assert.equal(otpCalls, 1)
        assert.equal(linkAlerts().length, 1, 'el aviso se conserva: no se sabe si llegó')

        globalThis.fetch = inner
        const repeat = await notify(charge(ORDER_B, { Ds_AuthorisationCode: '654321' }))

        assert.equal(repeat.httpStatus, 200)
        assert.equal(otpCalls, 2)
        assert.equal(linkAlerts().length, 0)
        assert.match(fake.tables.bookings[0].notes, /nota admin/)
    })
})

describe('Tope de reintentos de pago', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = console.error

    const previous = (count: number) => Array.from({ length: count }, (_, i) => `[PEDIDO ANTERIOR] ${String(1000 + i)}pedido`).join('\n')

    beforeEach(() => { console.error = () => {} })
    afterEach(() => { fake.restore(); console.error = silenced })

    async function payWith(notes: string) {
        fake = installFakeSupabase({ bookings: [booking({ notes })] })
        fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
        const res = await payPost(new Request('http://localhost/api/bookings/b1/pay', { method: 'POST' }), { params: Promise.resolve({ id: 'b1' }) })
        return { status: res.status, json: await res.json() }
    }

    it('con 9 pedidos anteriores aún admite el décimo reintento', async () => {
        const { status } = await payWith(`Llegamos tarde\n${previous(9)}`)

        assert.equal(status, 200)
        assert.equal(previousOrderIds(fake.tables.bookings[0].notes).length, MAX_PAYMENT_RETRIES)
    })

    it(`con ${MAX_PAYMENT_RETRIES} pedidos anteriores responde 409, pide escribir por WhatsApp y no escribe nada`, async () => {
        const { status, json } = await payWith(`Llegamos tarde\n${previous(MAX_PAYMENT_RETRIES)}`)

        assert.equal(status, 409)
        assert.equal(json.form, undefined)
        assert.match(json.error, /WhatsApp/)
        assert.deepEqual(fake.writesTo('bookings'), [])
    })
})
