import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import SecondDriverRecordEditor from '../app/[locale]/admin/bookings/SecondDriverRecordEditor'
import { POST as recordPOST } from '../app/api/admin/bookings/second-driver/route'
import { isValidDniNieOrPassport } from '../app/api/bookings/checkout/route'
import {
    isValidIdentityDocument,
    secondDriverRecordBlock,
    validateSecondDriverRecord,
} from '../lib/admin/secondDriverRecord'
import { bookingSecondDriver } from '../lib/booking/secondDriver'
import { secondDriverAlerts } from '../lib/admin/secondDriverAlerts'

/**
 * Completar la ficha del segundo conductor de una reserva desde el backoffice. Se ejecuta la ruta
 * real con Supabase simulado en memoria (ninguna petición real). Un test de comportamiento: qué
 * queda escrito, en qué reserva y quién consta; y que un fallo nunca se presenta como éxito.
 */

const ADMIN_ID = '00000000-0000-4000-8000-0000000000aa'
const B1 = '11111111-aaaa-4bbb-8ccc-222222222222'
const B2 = '33333333-aaaa-4bbb-8ccc-444444444444'
const B3 = '55555555-aaaa-4bbb-8ccc-666666666666'

const emptyColumns = {
    has_second_driver: false, second_driver_name: null, second_driver_dni: null, second_driver_license: null,
    second_driver_birth_date: null, second_driver_license_date: null,
    second_driver_updated_by: null, second_driver_updated_at: null,
}

/** Cobrado el suplemento del segundo conductor pero sin saber quién: el caso que hoy no se puede arreglar */
function incomplete(id: string, extra: Row = {}): Row {
    return {
        id, user_id: 'cliente-1', status: 'confirmed', payment_status: 'paid',
        start_date: '2099-06-01', end_date: '2099-06-08', notes: null,
        passengers: [], pricing_breakdown: { secondDriver: true, secondDriverSupplement: 35 },
        ...emptyColumns, ...extra,
    }
}

const GOOD = { fullName: 'Ana Ruiz Pérez', document: '12345678z', licenseId: 'B-1234567', birthDate: '1990-01-01', licenseDate: '2012-01-01' }

describe('Ruta /api/admin/bookings/second-driver', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: 'cliente-1', role: 'customer' }],
            bookings: [incomplete(B1), incomplete(B2), incomplete(B3, { pricing_breakdown: {}, has_second_driver: false })],
        })
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        console.error = () => {}
        console.info = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        fake.restore()
        Object.assign(console, silenced)
    })

    const send = (body: Record<string, unknown>) =>
        recordPOST(new Request('http://localhost/api/admin/bookings/second-driver', { method: 'POST', body: JSON.stringify(body) }))
    const row = (id: string) => fake.tables.bookings.find(b => b.id === id)!

    it('completa la ficha de ESA reserva, deja constancia de quién y no toca las demás', async () => {
        const res = await send({ bookingId: B1, ...GOOD })
        assert.equal(res.status, 200)
        const body = await res.json()
        assert.equal(body.success, true)
        assert.ok(body.changed.includes('documento'))

        const saved = row(B1)
        assert.equal(saved.second_driver_name, 'Ana Ruiz Pérez')
        assert.equal(saved.second_driver_dni, '12345678Z', 'el documento se guarda normalizado')
        assert.equal(saved.second_driver_license, 'B-1234567')
        assert.equal(saved.second_driver_birth_date, '1990-01-01')
        assert.equal(saved.second_driver_license_date, '2012-01-01')
        assert.equal(saved.has_second_driver, true)
        assert.equal(saved.second_driver_updated_by, ADMIN_ID)
        assert.ok(saved.second_driver_updated_at)

        assert.deepEqual(row(B2), incomplete(B2), 'otra reserva del mismo cliente no se toca')
        assert.equal(fake.writesTo('bookings').length, 1)
        assert.equal(fake.writesTo('users').length, 0, 'no escribe en el perfil del cliente')
    })

    it('tras guardar, lo que lee el contrato y los avisos es la ficha nueva', async () => {
        assert.equal(bookingSecondDriver(row(B1))!.document, '')
        assert.ok(secondDriverAlerts(row(B1), new Date('2099-01-01')).some(a => a.code === 'missing_document'))
        await send({ bookingId: B1, ...GOOD })
        const driver = bookingSecondDriver(row(B1))!
        assert.equal(driver.fullName, 'Ana Ruiz Pérez')
        assert.equal(driver.document, '12345678Z')
        assert.equal(driver.licenseId, 'B-1234567')
        assert.deepEqual(secondDriverAlerts(row(B1), new Date('2099-01-01')).map(a => a.code).filter(c => c !== 'docs_pending'), [])
    })

    it('un número de carnet vacío no borra el que ya constaba', async () => {
        fake.tables.bookings[0] = incomplete(B1, { second_driver_license: 'ANTIGUO-1', second_driver_name: 'Ana Ruiz Pérez', second_driver_dni: '12345678Z', has_second_driver: true })
        const res = await send({ bookingId: B1, ...GOOD, licenseId: '' })
        assert.equal(res.status, 200)
        assert.equal(row(B1).second_driver_license, 'ANTIGUO-1')
    })

    it('repetir la misma ficha no escribe nada ni cambia quién consta', async () => {
        await send({ bookingId: B1, ...GOOD })
        const before = fake.writesTo('bookings').length
        row(B1).second_driver_updated_by = 'otro-admin'
        const res = await send({ bookingId: B1, ...GOOD })
        assert.equal(res.status, 200)
        assert.deepEqual((await res.json()).changed, [])
        assert.equal(fake.writesTo('bookings').length, before)
        assert.equal(row(B1).second_driver_updated_by, 'otro-admin')
    })

    it('rechaza con las reglas del checkout y no escribe nada', async () => {
        const cases: Array<[string, Record<string, unknown>, RegExp]> = [
            ['letra de DNI incorrecta', { document: '12345678A' }, /Letra de DNI incorrecta/],
            ['nombre con números', { fullName: 'Ana 123' }, /nombre/i],
            ['nombre vacío', { fullName: '  ' }, /nombre/i],
            ['menor de 25 años', { birthDate: '2090-01-01' }, /25 años/],
            ['carnet de menos de 2 años', { licenseDate: '2098-01-01' }, /2 años/],
            ['fecha inventada', { birthDate: '1990-02-31' }, /no es válida/],
            ['sin fecha de carnet', { licenseDate: '' }, /obligatoria/],
            ['nº de carnet con símbolos', { licenseId: '<script>' }, /carnet/],
        ]
        for (const [name, override, expected] of cases) {
            const res = await send({ bookingId: B1, ...GOOD, ...override })
            assert.equal(res.status, 400, name)
            assert.match((await res.json()).error, expected, name)
        }
        assert.deepEqual(row(B1), incomplete(B1))
        assert.equal(fake.writesTo('bookings').length, 0)
    })

    it('no añade un segundo conductor a una reserva que no lo llevaba', async () => {
        const res = await send({ bookingId: B3, ...GOOD })
        assert.equal(res.status, 409)
        assert.match((await res.json()).error, /no lleva segundo conductor/)
        assert.equal(row(B3).second_driver_dni, null)
    })

    it('no reescribe quién conduce en una reserva cancelada o ya completada', async () => {
        row(B1).status = 'cancelled'
        row(B2).status = 'completed'
        for (const id of [B1, B2]) {
            const res = await send({ bookingId: id, ...GOOD })
            assert.equal(res.status, 409)
        }
        assert.equal(fake.writesTo('bookings').length, 0)
    })

    it('sin las columnas de la migración responde 409 diciendo cuáles faltan, sin escribir', async () => {
        delete row(B1).second_driver_updated_at
        const res = await send({ bookingId: B1, ...GOOD })
        assert.equal(res.status, 409)
        const { error } = await res.json()
        assert.match(error, /second_driver_updated_at/)
        assert.match(error, /20261109_booking_second_driver_audit\.sql/)
        assert.equal(fake.writesTo('bookings').length, 0)
    })

    it('si la escritura falla, la respuesta es un error y no confirma nada', async () => {
        fake.failures.table = 'bookings'
        fake.failures.method = 'PATCH'
        const res = await send({ bookingId: B1, ...GOOD })
        assert.equal(res.status, 500)
        const body = await res.json()
        assert.equal(body.success, undefined)
        assert.ok(body.error)
        assert.equal(row(B1).second_driver_dni, null)
    })

    it('si la reserva no se llega a modificar (0 filas), tampoco lo da por bueno', async () => {
        fake.onBeforeWrite('bookings', () => { fake.tables.bookings.splice(0, fake.tables.bookings.length) })
        const res = await send({ bookingId: B1, ...GOOD })
        assert.equal(res.status, 409)
        assert.equal((await res.json()).success, undefined)
    })

    it('un visitante o un cliente no pueden: 401 y 403, y no se lee la reserva', async () => {
        fake.setSession(null)
        assert.equal((await send({ bookingId: B1, ...GOOD })).status, 401)
        fake.setSession({ id: 'cliente-1', email: 'c@example.com', app_metadata: {}, user_metadata: { role: 'admin' } })
        assert.equal((await send({ bookingId: B1, ...GOOD })).status, 403)
        assert.equal(fake.writesTo('bookings').length, 0)
    })

    it('un id de reserva que no es un UUID no llega a la base', async () => {
        const res = await send({ bookingId: `${B1}&or=(id.neq.0)`, ...GOOD })
        assert.equal(res.status, 400)
        assert.equal(fake.requests.some(r => r.path === '/rest/v1/bookings'), false)
    })

    it('sin la clave de servicio responde 503 en lugar de escribir con la sesión', async () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'tu_clave_secreta_aqui'
        const res = await send({ bookingId: B1, ...GOOD })
        assert.equal(res.status, 503)
        assert.equal(fake.writesTo('bookings').length, 0)
    })
})

describe('Validación de la ficha: mismas reglas que el checkout', () => {
    it('el documento se valida igual que isValidDniNieOrPassport', () => {
        const samples = ['12345678Z', '12345678A', 'x1234567l', 'X1234567A', 'Y1234567X', 'AB123456', 'AB12-3456', '', '   ', '1234', 'ñ1234567', '12345678z ', 'A'.repeat(16), 'PASAPORTE1']
        for (const sample of samples) {
            assert.equal(isValidIdentityDocument(sample).isValid, isValidDniNieOrPassport(sample).isValid, `«${sample}»`)
        }
    })

    it('la fecha de recogida decide los requisitos de edad y antigüedad', () => {
        const ok = { ...GOOD, birthDate: '2000-06-01', licenseDate: '2020-06-01' }
        assert.equal(validateSecondDriverRecord(ok, '2026-06-01').ok, true)
        assert.equal(validateSecondDriverRecord(ok, '2025-05-31').ok, false, '24 años y 11 meses el día de la recogida')
    })

    it('el bloqueo explica el motivo', () => {
        assert.match(secondDriverRecordBlock(incomplete(B3, { pricing_breakdown: {} }))!, /no lleva segundo conductor/)
        assert.equal(secondDriverRecordBlock(incomplete(B1)), null)
    })
})

describe('Editor de la ficha en el detalle de la reserva', () => {
    const html = (booking: Row) => renderToStaticMarkup(React.createElement(SecondDriverRecordEditor, { booking, onSaved: () => {} }))

    it('con la ficha incompleta marca lo que falta y ofrece completarla', () => {
        const out = html(incomplete(B1))
        assert.match(out, /Completar la ficha/)
        assert.match(out, /Falta/)
    })

    it('con la ficha completa ofrece corregirla y enseña los datos', () => {
        const out = html(incomplete(B1, { ...emptyColumns, has_second_driver: true, second_driver_name: 'Ana Ruiz', second_driver_dni: '12345678Z', second_driver_license: 'B-1', second_driver_birth_date: '1990-01-01', second_driver_license_date: '2012-01-01' }))
        assert.match(out, /Corregir la ficha/)
        assert.match(out, /Ana Ruiz/)
        assert.doesNotMatch(out, /Falta/)
    })

    it('en una reserva cancelada no deja editar y dice por qué', () => {
        const out = html(incomplete(B1, { status: 'cancelled' }))
        assert.doesNotMatch(out, /Completar la ficha/)
        assert.match(out, /cancelada o rechazada/)
    })
})
