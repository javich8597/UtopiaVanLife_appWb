import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
    appendPaymentAlert,
    bookingAmountInCents,
    decideRedsysNotification,
    processRedsysNotification,
    RedsysBookingRow,
} from '../lib/redsysNotification'
import {
    calculateSignature,
    encodeMerchantParameters,
    REDSYS_TEST_DEFAULTS,
    verifyRedsysSignature,
} from '../lib/redsys'

const ORDER = '1234abcd5678'
const NOW = new Date('2026-11-07T10:00:00Z')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
type QueryResult = { data: Row[] | null; error: { message: string } | null }

/** Base de datos en memoria con la parte del cliente de Supabase que usa el webhook */
function fakeDb(tables: { bookings: Row[]; blocked_dates?: Row[] }) {
    const data: Record<string, Row[]> = { blocked_dates: [], ...tables }
    const emails: string[] = []
    const failures: { table?: string; op?: string } = {}
    let beforeUpdate: (() => void) | null = null

    class Query implements PromiseLike<QueryResult> {
        private filters: Array<(row: Row) => boolean> = []
        private op: 'select' | 'update' | 'insert' | 'delete' = 'select'
        private values: Row = {}
        private max = Infinity

        constructor(private table: string) {}

        select() { return this }
        update(values: Row) { this.op = 'update'; this.values = values; return this }
        insert(values: Row) { this.op = 'insert'; this.values = values; return this }
        delete() { this.op = 'delete'; return this }
        eq(col: string, value: unknown) { this.filters.push(r => r[col] === value); return this }
        neq(col: string, value: unknown) { this.filters.push(r => r[col] !== value); return this }
        is(col: string, value: unknown) { this.filters.push(r => (r[col] ?? null) === value); return this }
        in(col: string, values: unknown[]) { this.filters.push(r => values.includes(r[col])); return this }
        lte(col: string, value: string) { this.filters.push(r => r[col] <= value); return this }
        gte(col: string, value: string) { this.filters.push(r => r[col] >= value); return this }
        limit(n: number) { this.max = n; return this }

        private run(): QueryResult {
            if (failures.table === this.table && failures.op === this.op) {
                return { data: null, error: { message: 'fallo simulado' } }
            }
            if (this.op === 'insert') {
                data[this.table].push({ id: `row-${data[this.table].length + 1}`, ...this.values })
                return { data: null, error: null }
            }
            if (this.op === 'update' && beforeUpdate) {
                const hook = beforeUpdate
                beforeUpdate = null
                hook()
            }
            const rows = data[this.table].filter(r => this.filters.every(f => f(r))).slice(0, this.max)
            if (this.op === 'update') rows.forEach(r => Object.assign(r, this.values))
            if (this.op === 'delete') data[this.table] = data[this.table].filter(r => !rows.includes(r))
            return { data: rows, error: null }
        }

        async maybeSingle() {
            const { data: rows, error } = this.run()
            return { data: rows?.[0] ?? null, error }
        }

        then<A, B>(ok?: ((v: QueryResult) => A | PromiseLike<A>) | null, ko?: ((e: unknown) => B | PromiseLike<B>) | null) {
            return Promise.resolve(this.run()).then(ok, ko)
        }
    }

    return {
        data,
        emails,
        failures,
        onBeforeUpdate(fn: () => void) { beforeUpdate = fn },
        from: (table: string) => new Query(table),
        auth: {
            signInWithOtp: async ({ email }: { email: string }) => {
                emails.push(email)
                return { error: null }
            },
        },
    }
}

function booking(overrides: Row = {}): RedsysBookingRow & Row {
    return {
        id: 'b1',
        camper_id: 'c1',
        start_date: '2026-12-01',
        end_date: '2026-12-05',
        status: 'pending',
        payment_status: 'pending',
        payment_intent_id: ORDER,
        total_price: 700.5,
        notes: null,
        customer_email: 'cliente@example.com',
        ...overrides,
    }
}

const process = (db: ReturnType<typeof fakeDb>, notification: Row) =>
    processRedsysNotification(db as unknown as SupabaseClient, notification, NOW)

const paid = (overrides: Row = {}) => ({
    Ds_Order: ORDER,
    Ds_Response: '0000',
    Ds_Amount: '70050',
    Ds_Currency: '978',
    Ds_TransactionType: '0',
    ...overrides,
})

const denied = (overrides: Row = {}) => paid({ Ds_Response: '0190', ...overrides })

describe('Notificación de Redsys: pago correcto', () => {
    it('marca la reserva como pagada, bloquea las fechas y envía el enlace de acceso', async () => {
        const db = fakeDb({ bookings: [booking()] })

        const res = await process(db, paid())

        assert.equal(res.httpStatus, 200)
        assert.equal(db.data.bookings[0].payment_status, 'paid')
        assert.equal(db.data.bookings[0].status, 'pending')
        assert.equal(db.data.blocked_dates.length, 1)
        assert.equal(db.data.blocked_dates[0].session_id, `redsys_${ORDER}`)
        assert.deepEqual(db.emails, ['cliente@example.com'])
    })

    it('acepta los nombres de campo en mayúsculas', async () => {
        const db = fakeDb({ bookings: [booking()] })

        await process(db, {
            DS_ORDER: ORDER, DS_RESPONSE: '0000', DS_AMOUNT: '70050', DS_CURRENCY: '978', DS_TRANSACTIONTYPE: '0',
        })

        assert.equal(db.data.bookings[0].payment_status, 'paid')
    })

    it('un pago que llega tras un intento fallido cuenta como pagado', async () => {
        const db = fakeDb({ bookings: [booking({ payment_status: 'failed' })] })

        await process(db, paid())

        assert.equal(db.data.bookings[0].payment_status, 'paid')
    })

    it('admite reservas antiguas sin payment_status', async () => {
        const db = fakeDb({ bookings: [booking({ payment_status: null })] })

        await process(db, paid())

        assert.equal(db.data.bookings[0].payment_status, 'paid')
    })
})

describe('Notificación de Redsys: importe', () => {
    it('no marca como pagada una reserva con otro importe y avisa al admin', async () => {
        const db = fakeDb({ bookings: [booking()] })

        const res = await process(db, paid({ Ds_Amount: '100' }))

        assert.equal(res.httpStatus, 200)
        assert.equal(db.data.bookings[0].payment_status, 'pending')
        assert.match(db.data.bookings[0].notes, /PAGO A REVISAR/)
        assert.equal(db.data.blocked_dates.length, 0)
        assert.equal(db.emails.length, 0)
    })

    it('rechaza una notificación sin importe o con otra moneda', () => {
        const base = { booking: booking(), orderId: ORDER, responseCode: '0000', currency: '978' }

        assert.equal(decideRedsysNotification({ ...base, amount: undefined }).paymentStatus, undefined)
        assert.equal(decideRedsysNotification({ ...base, amount: '70050', currency: '840' }).paymentStatus, undefined)
        assert.equal(decideRedsysNotification({ ...base, amount: 'abc' }).paymentStatus, undefined)
    })

    it('calcula los céntimos sin errores de coma flotante', () => {
        assert.equal(bookingAmountInCents(1234.56), 123456)
        assert.equal(bookingAmountInCents('19.99'), 1999)
        assert.equal(bookingAmountInCents(null), null)
    })
})

describe('Notificación de Redsys: repetidas y desordenadas', () => {
    it('una repetición no devuelve a pendiente una reserva confirmada', async () => {
        const db = fakeDb({
            bookings: [booking({ status: 'confirmed', payment_status: 'paid' })],
            blocked_dates: [{ id: 'x', camper_id: 'c1', session_id: `redsys_${ORDER}` }],
        })

        const res = await process(db, paid())

        assert.equal(res.httpStatus, 200)
        assert.equal(db.data.bookings[0].status, 'confirmed')
        assert.equal(db.data.blocked_dates.length, 1)
        assert.equal(db.emails.length, 0)
    })

    it('una repetición no reabre una reserva cancelada ni vuelve a bloquear sus fechas', async () => {
        const db = fakeDb({ bookings: [booking({ status: 'cancelled', payment_status: 'paid' })] })

        await process(db, paid())

        assert.equal(db.data.bookings[0].status, 'cancelled')
        assert.equal(db.data.blocked_dates.length, 0)
    })

    it('una repetición repone el bloqueo si faltaba', async () => {
        const db = fakeDb({ bookings: [booking({ payment_status: 'paid' })] })

        await process(db, paid())

        assert.equal(db.data.blocked_dates.length, 1)
        assert.equal(db.emails.length, 0)
    })

    it('un fallo posterior no borra un pago', async () => {
        const db = fakeDb({ bookings: [booking({ payment_status: 'paid' })] })

        await process(db, denied())

        assert.equal(db.data.bookings[0].payment_status, 'paid')
    })

    it('un fallo no toca una reserva reembolsada ni confirmada', async () => {
        const db = fakeDb({
            bookings: [
                booking({ status: 'cancelled', payment_status: 'refunded' }),
            ],
        })
        await process(db, denied())
        assert.equal(db.data.bookings[0].payment_status, 'refunded')

        const decision = decideRedsysNotification({
            booking: booking({ status: 'confirmed', payment_status: 'pending' }),
            orderId: ORDER,
            responseCode: '0190',
        })
        assert.equal(decision.paymentStatus, undefined)
    })

    it('marca como fallido un intento denegado de una reserva pendiente', async () => {
        const db = fakeDb({ bookings: [booking()] })

        await process(db, denied())

        assert.equal(db.data.bookings[0].payment_status, 'failed')
        assert.equal(db.data.blocked_dates.length, 0)
    })

    it('ignora devoluciones hechas desde el panel del banco', async () => {
        const db = fakeDb({ bookings: [booking({ status: 'confirmed', payment_status: 'paid' })] })

        await process(db, paid({ Ds_TransactionType: '3', Ds_Response: '0900' }))

        assert.equal(db.data.bookings[0].payment_status, 'paid')
        assert.equal(db.data.bookings[0].status, 'confirmed')
    })

    it('una operación que no es un cobro no cambia una reserva pendiente, aunque sea correcta', async () => {
        const accepted = fakeDb({ bookings: [booking()] })
        await process(accepted, paid({ Ds_TransactionType: '3' }))
        assert.equal(accepted.data.bookings[0].payment_status, 'pending')
        assert.equal(accepted.data.blocked_dates.length, 0)

        const refundCode = fakeDb({ bookings: [booking()] })
        await process(refundCode, paid({ Ds_TransactionType: '3', Ds_Response: '0900' }))
        assert.equal(refundCode.data.bookings[0].payment_status, 'pending')
    })
})

describe('Notificación de Redsys: pagos tardíos', () => {
    it('un cobro en una reserva cancelada no la reabre y avisa para devolverlo', async () => {
        const db = fakeDb({ bookings: [booking({ status: 'cancelled' })] })

        await process(db, paid())

        const row = db.data.bookings[0]
        assert.equal(row.status, 'cancelled')
        assert.equal(row.payment_status, 'pending')
        assert.match(row.notes, /devolverlo desde el banco/)
        assert.equal(db.data.blocked_dates.length, 0)
    })

    it('un cobro con fechas ya vendidas queda pagado, sin confirmar y con aviso', async () => {
        const db = fakeDb({
            bookings: [
                booking(),
                booking({ id: 'b2', status: 'confirmed', payment_status: 'paid', payment_intent_id: 'otro' }),
            ],
        })

        await process(db, paid())

        const row = db.data.bookings[0]
        assert.equal(row.payment_status, 'paid')
        assert.equal(row.status, 'pending')
        assert.match(row.notes, /fechas ya están ocupadas/)
    })

    it('detecta un bloqueo activo de otra sesión, pero no el propio ni uno caducado', async () => {
        const block = { camper_id: 'c1', start_date: '2026-12-02', end_date: '2026-12-03' }

        const taken = fakeDb({
            bookings: [booking()],
            blocked_dates: [{ ...block, id: 'x', session_id: 'mantenimiento', expires_at: null }],
        })
        await process(taken, paid())
        assert.match(taken.data.bookings[0].notes, /fechas ya están ocupadas/)

        const free = fakeDb({
            bookings: [booking()],
            blocked_dates: [
                { ...block, id: 'y', session_id: `redsys_${ORDER}`, expires_at: null },
                { ...block, id: 'z', session_id: 'antiguo', expires_at: '2026-11-07T09:00:00Z' },
            ],
        })
        await process(free, paid())
        assert.equal(free.data.bookings[0].notes, null)
    })

    it('un cobro en una reserva reembolsada avisa y no cambia nada más', () => {
        const decision = decideRedsysNotification({
            booking: booking({ status: 'cancelled', payment_status: 'refunded' }),
            orderId: ORDER,
            responseCode: '0000',
            amount: '70050',
        })

        assert.equal(decision.paymentStatus, undefined)
        assert.equal(decision.ensureBlock, false)
        assert.match(decision.alert || '', /reembolsada/)
    })

    it('no repite el aviso si Redsys reenvía la notificación', async () => {
        const db = fakeDb({ bookings: [booking({ status: 'cancelled', notes: 'Llegamos tarde' })] })

        await process(db, paid())
        await process(db, paid())

        const notes: string = db.data.bookings[0].notes
        assert.equal(notes.match(/PAGO A REVISAR/g)?.length, 1)
        assert.ok(notes.startsWith('Llegamos tarde\n'))
    })

    it('appendPaymentAlert conserva las notas del cliente', () => {
        assert.equal(appendPaymentAlert('', 'Aviso'), '[PAGO A REVISAR] Aviso')
        assert.equal(appendPaymentAlert('Hola', 'Aviso'), 'Hola\n[PAGO A REVISAR] Aviso')
    })
})

describe('Notificación de Redsys: bloqueo provisional del checkout', () => {
    const hold = (sessionId: string) => ({
        id: sessionId,
        camper_id: 'c1',
        start_date: '2026-12-01',
        end_date: '2026-12-05',
        reason: 'checkout_hold',
        session_id: sessionId,
        expires_at: '2026-11-07T10:10:00Z',
    })
    const sessions = (db: ReturnType<typeof fakeDb>) => db.data.blocked_dates.map(b => b.session_id)

    it('un pago normal no toma su propio bloqueo por una fecha ocupada y lo sustituye', async () => {
        const db = fakeDb({ bookings: [booking()], blocked_dates: [hold(`checkout_${ORDER}`)] })

        await process(db, paid())

        assert.equal(db.data.bookings[0].notes, null)
        assert.deepEqual(sessions(db), [`redsys_${ORDER}`])
    })

    it('un pago denegado libera las fechas', async () => {
        const db = fakeDb({ bookings: [booking()], blocked_dates: [hold(`checkout_${ORDER}`), hold(`hold_${ORDER}`)] })

        await process(db, denied())

        assert.deepEqual(sessions(db), [])
    })

    it('no toca el bloqueo provisional de otro cliente y lo considera ocupado', async () => {
        const db = fakeDb({ bookings: [booking()], blocked_dates: [hold('checkout_9999otropedido')] })

        await process(db, paid())

        assert.match(db.data.bookings[0].notes, /fechas ya están ocupadas/)
        assert.ok(sessions(db).includes('checkout_9999otropedido'))
    })

    it('con importe distinto mantiene el bloqueo hasta que caduque', async () => {
        const db = fakeDb({ bookings: [booking()], blocked_dates: [hold(`checkout_${ORDER}`)] })

        await process(db, paid({ Ds_Amount: '100' }))

        assert.deepEqual(sessions(db), [`checkout_${ORDER}`])
    })
})

describe('Notificación de Redsys: errores', () => {
    let warnings: typeof console.error

    beforeEach(() => { warnings = console.error })

    it('pide reintento si la reserva cambió mientras se procesaba', async () => {
        const db = fakeDb({ bookings: [booking()] })
        db.onBeforeUpdate(() => { db.data.bookings[0].status = 'cancelled' })

        const res = await process(db, paid())

        assert.equal(res.httpStatus, 500)
        assert.equal(db.data.bookings[0].payment_status, 'pending')
        assert.equal(db.data.blocked_dates.length, 0)
        assert.equal(db.emails.length, 0)
    })

    it('lanza el error si no puede guardar el pago, para que la ruta responda 500', async () => {
        const db = fakeDb({ bookings: [booking()] })
        db.failures.table = 'bookings'
        db.failures.op = 'update'

        await assert.rejects(process(db, paid()), /fallo simulado/)
    })

    it('tras fallar el bloqueo, el reenvío lo repone sin repetir el email', async () => {
        const db = fakeDb({ bookings: [booking()] })
        db.failures.table = 'blocked_dates'
        db.failures.op = 'insert'

        await assert.rejects(process(db, paid()), /fallo simulado/)
        assert.equal(db.data.bookings[0].payment_status, 'paid')

        db.failures.table = undefined
        await process(db, paid())

        assert.equal(db.data.blocked_dates.length, 1)
    })

    it('responde 200 si el pedido no existe y 400 si no trae número', async () => {
        console.error = () => {}
        try {
            const db = fakeDb({ bookings: [] })
            assert.equal((await process(db, paid())).httpStatus, 200)
            assert.equal((await process(db, { Ds_Response: '0000' })).httpStatus, 400)
        } finally {
            console.error = warnings
        }
    })
})

describe('Firma de la notificación', () => {
    const key = REDSYS_TEST_DEFAULTS.secretKey
    const params = encodeMerchantParameters({ Ds_Order: ORDER, Ds_Response: '0000' })
    const signature = calculateSignature(params, ORDER, key)

    it('acepta la firma correcta, también en base64 para URL', () => {
        assert.equal(verifyRedsysSignature(params, signature, key), true)
        assert.equal(verifyRedsysSignature(params, signature.replace(/\+/g, '-').replace(/\//g, '_'), key), true)
    })

    it('rechaza firmas alteradas o de otra longitud sin lanzar errores', () => {
        const flipped = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1)

        assert.equal(verifyRedsysSignature(params, flipped, key), false)
        assert.equal(verifyRedsysSignature(params, 'corta', key), false)
        assert.equal(verifyRedsysSignature(params, '', key), false)
    })
})
