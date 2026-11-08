import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST } from '../app/api/upload-driver-docs/route'
import { createCheckoutAccessCookie } from '../lib/checkoutAccess'

/**
 * El 2º conductor pertenece a la RESERVA, no al cliente (hallazgos 1, 3, 5 y 6 de la auditoría).
 *
 * Antes la subida solo preguntaba si *alguna* reserva del cliente llevaba un 2º conductor, sin
 * comparar con quién: un cliente podía subir el nombre y el DNI de otra persona y el contrato la
 * autorizaba. Tampoco filtraba por estado, así que una reserva cancelada o sin pagar valía.
 *
 * No prueba Supabase real, RLS, Storage, triggers ni columnas reales: la base está simulada.
 */

const ORDER = '1234abcd5678'
const BOOKING_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const OTHER_BOOKING_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])

/** Ficha del 2º conductor tal y como la guarda el checkout: 25 años y carnet de más de 2 */
const AUTHORIZED = {
    fullName: 'Luis Pérez',
    dniNie: 'AB123456',
    isSecondDriver: true,
    birthDate: '1985-01-01',
    licenseDate: '2010-01-01',
}

const paidBooking = (overrides: Row = {}): Row => ({
    id: BOOKING_ID,
    user_id: 'u1',
    payment_intent_id: ORDER,
    payment_status: 'paid',
    status: 'confirmed',
    start_date: '2099-06-01',
    end_date: '2099-06-08',
    passengers: [{ ...AUTHORIZED }],
    pricing_breakdown: { depositOption: 'standard_2000', secondDriver: true, secondDriverSupplement: 35 },
    ...overrides,
})

describe('Subida: el 2º conductor de la reserva manda', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({
            bookings: [paidBooking()],
            users: [{ id: 'u1', verification_status: 'not_submitted', full_name: 'Ana Pérez' }],
        })
        fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
        console.error = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        fake.restore()
        Object.assign(console, silenced)
    })

    function form(fields: Row = {}) {
        const data = new FormData()
        data.append('fullName', 'Ana Pérez')
        data.append('driverLicenseIssueDate', '2015-01-01')
        data.append('driverLicenseExpiryDate', '2035-01-01')
        data.append('hasSecondDriver', 'true')
        data.append('secondDriverFullName', 'Luis Pérez')
        data.append('secondDriverDni', 'AB123456')
        data.append('secondDriverLicense', 'B-99')
        for (const [key, value] of Object.entries(fields)) data.set(key, value)
        return data
    }

    async function upload(data: FormData, { order, cookie }: { order?: string; cookie?: string } = {}) {
        const encoded = new Request('http://localhost/', { method: 'POST', body: data })
        const body = await encoded.arrayBuffer()
        const headers = new Headers({
            'content-type': encoded.headers.get('content-type')!,
            'content-length': String(body.byteLength),
        })
        if (cookie) headers.set('cookie', cookie)
        const url = `http://localhost/api/upload-driver-docs${order ? `?order=${order}` : ''}`
        const res = await POST(new NextRequest(url, { method: 'POST', headers, body }))
        return { status: res.status, json: await res.json() }
    }

    const storageUploads = () => fake.requests.filter(r => r.path.startsWith('/storage/v1/object/documents/'))

    it('rechaza el documento de otra persona, sin subir ni guardar nada', async () => {
        const { status, json } = await upload(form({
            secondDriverFullName: 'Otra Persona',
            secondDriverDni: 'ZZ999999',
            second_dni_front: new File([JPEG], 'dni.jpg'),
        }))

        assert.equal(status, 400)
        assert.match(json.error, /segundo conductor/i)
        assert.deepEqual(storageUploads(), [])
        assert.deepEqual(fake.writesTo('users'), [])
        assert.deepEqual(fake.writesTo('bookings'), [])
    })

    it('acepta el documento de la reserva aunque llegue con espacios, guiones y minúsculas', async () => {
        const { status, json } = await upload(form({ secondDriverDni: '  ab-123456 ' }))

        assert.equal(status, 200, json.error)
    })

    it('guarda la ficha del 2º conductor en su reserva', async () => {
        const { status, json } = await upload(form())

        assert.equal(status, 200, json.error)
        const saved = fake.tables.bookings[0]
        assert.equal(saved.has_second_driver, true)
        assert.equal(saved.second_driver_dni, 'AB123456')
        assert.equal(saved.second_driver_name, 'Luis Pérez')
        assert.equal(saved.second_driver_license, 'B-99')
        assert.equal(saved.second_driver_birth_date, '1985-01-01')
        assert.equal(saved.second_driver_license_date, '2010-01-01')
        const [write] = fake.writesTo('bookings')
        assert.equal(write.query.get('id'), `eq.${BOOKING_ID}`)
        assert.equal(write.query.get('user_id'), 'eq.u1')
    })

    it('sus fotos van ligadas a la reserva, no a la carpeta del perfil', async () => {
        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 200, json.error)
        const [sent] = storageUploads()
        assert.match(sent.path, new RegExp(`^/storage/v1/object/documents/u1/${BOOKING_ID}/second_dni_front_`))
    })

    it('las fotos del titular siguen en su carpeta', async () => {
        const { status } = await upload(form({ dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 200)
        const [sent] = storageUploads()
        assert.match(sent.path, /^\/storage\/v1\/object\/documents\/u1\/dni_front_/)
    })

    for (const [caso, overrides] of [
        ['cancelada', { status: 'cancelled', payment_status: 'refunded' }],
        ['rechazada', { status: 'rejected' }],
        ['sin pagar', { status: 'pending', payment_status: 'pending' }],
        ['caducada sin pagar', { status: 'pending', payment_status: 'unpaid' }],
    ] as Array<[string, Row]>) {
        it(`una reserva ${caso} no autoriza la subida`, async () => {
            Object.assign(fake.tables.bookings[0], overrides)

            const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

            assert.equal(status, 400, `una reserva ${caso} no debe autorizar`)
            assert.match(json.error, /segundo conductor/i)
            assert.deepEqual(storageUploads(), [])
            assert.deepEqual(fake.writesTo('bookings'), [])
        })
    }

    it('revalida los 25 años contra la fecha de recogida de esa reserva', async () => {
        // 24 años cumplidos el 2099-06-01
        fake.tables.bookings[0].passengers = [{ ...AUTHORIZED, birthDate: '2075-01-01' }]

        const { status, json } = await upload(form())

        assert.equal(status, 400)
        assert.match(json.error, /25 años/)
        assert.deepEqual(fake.writesTo('users'), [])
    })

    it('revalida los 2 años de carnet contra la fecha de recogida', async () => {
        fake.tables.bookings[0].passengers = [{ ...AUTHORIZED, licenseDate: '2098-01-01' }]

        const { status, json } = await upload(form())

        assert.equal(status, 400)
        assert.match(json.error, /antigüedad/i)
    })

    it('con bookingId manda esa reserva, no otra del cliente que sí lo lleve', async () => {
        fake.tables.bookings.push(paidBooking({
            id: OTHER_BOOKING_ID,
            payment_intent_id: 'otro-pedido',
            passengers: [{ fullName: 'Ana Ruiz', dniNie: 'X1234567L', isSecondDriver: false }],
            pricing_breakdown: { depositOption: 'standard_2000', secondDriver: false, secondDriverSupplement: 0 },
        }))

        const { status, json } = await upload(form({ bookingId: OTHER_BOOKING_ID }))

        assert.equal(status, 400, 'la reserva indicada no lleva 2º conductor')
        assert.match(json.error, /segundo conductor/i)
    })

    it('con el pedido de la URL manda la reserva de ese pedido', async () => {
        const { status, json } = await upload(form({ secondDriverDni: 'AB123456' }), { order: ORDER })

        assert.equal(status, 200, json.error)
    })

    it('un 2º conductor cobrado del que no consta el documento no autoriza a nadie', async () => {
        fake.tables.bookings[0].passengers = []

        const { status, json } = await upload(form())

        assert.equal(status, 400)
        assert.match(json.error, /segundo conductor/i)
    })

    it('exige los tres datos del 2º conductor en lugar de vaciar lo guardado', async () => {
        Object.assign(fake.tables.users[0], {
            has_second_driver: true,
            second_driver_name: 'Luis Pérez',
            second_driver_dni: 'AB123456',
            second_driver_license: 'B-99',
        })

        const { status, json } = await upload(form({ secondDriverDni: '', secondDriverLicense: '' }))

        assert.equal(status, 400)
        assert.deepEqual(fake.writesTo('users'), [])
        assert.equal(fake.tables.users[0].second_driver_dni, 'AB123456', 'no se borra lo que ya constaba')
        assert.match(json.error, /nombre completo/i)
    })

    it('sin sesión y sin clave de service role válida responde 503, no un 400 que culpa al cliente', async () => {
        fake.setSession(null)
        // Sin service role válida, RLS oculta las reservas al visitante: el fallo es del servidor.
        // La cookie se firma con esta misma clave, así que se crea después de cambiarla
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-sin-formato-de-jwt'
        const { name, value } = createCheckoutAccessCookie(ORDER)!

        const { status, json } = await upload(form(), { order: ORDER, cookie: `${name}=${value}` })

        assert.equal(status, 503)
        assert.doesNotMatch(json.error, /reserva no incluye/i)
        assert.deepEqual(fake.writesTo('bookings'), [])
    })
})
