import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST } from '../app/api/upload-driver-docs/route'
import { bookingSecondDriver } from '../lib/booking/secondDriver'
import { adminBookingSecondDriver } from '../lib/admin/bookingBreakdown'
import { generateContractData } from '../lib/contracts/contractEngine'

/**
 * Fronteras del 2º conductor que `tests/segundoConductorReserva.test.ts` no recorre
 * (qa-verificador, 2026-11-09): de quién es la reserva, cuál se elige cuando hay varias y a quién
 * nombra el contrato cuando la reserva no guarda la ficha.
 *
 * Lo que NO prueba este archivo: Supabase real, RLS, Storage real, triggers, columnas reales ni el
 * navegador. Los `it(..., { todo: 'QA-SD-n' })` son fallos reproducidos a propósito.
 */

const ORDER = '1234abcd5678'
const MINE = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const NEARBY = 'cccccccc-3333-4333-8333-cccccccccccc'
const THEIRS = 'dddddddd-4444-4444-8444-dddddddddddd'
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])

/**
 * Ficha del 2º conductor tal y como la guarda el checkout en `bookings.passengers`, con su nº de
 * carnet: desde el 2026-11-09 los tres datos de esa persona solo salen de la ficha, así que un
 * carnet del formulario que la ficha no trae se rechaza
 */
const AUTHORIZED = {
    fullName: 'Luis Pérez',
    dniNie: 'AB123456',
    driverLicenseId: 'B-99',
    isSecondDriver: true,
    birthDate: '1985-01-01',
    licenseDate: '2010-01-01',
}

const paidBooking = (overrides: Row = {}): Row => ({
    id: MINE,
    user_id: 'u1',
    payment_intent_id: ORDER,
    payment_status: 'paid',
    status: 'confirmed',
    start_date: '2099-12-01',
    end_date: '2099-12-08',
    passengers: [{ ...AUTHORIZED }],
    pricing_breakdown: { depositOption: 'standard_2000', secondDriver: true, secondDriverSupplement: 35 },
    ...overrides,
})

describe('Subida: de quién es la reserva que autoriza', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [
                { id: 'u1', verification_status: 'not_submitted', full_name: 'Ana Pérez' },
                { id: 'u2', verification_status: 'verified', full_name: 'Otro Cliente' },
            ],
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

    async function upload(data: FormData, { order }: { order?: string } = {}) {
        const encoded = new Request('http://localhost/', { method: 'POST', body: data })
        const body = await encoded.arrayBuffer()
        const headers = new Headers({
            'content-type': encoded.headers.get('content-type')!,
            'content-length': String(body.byteLength),
        })
        const url = `http://localhost/api/upload-driver-docs${order ? `?order=${order}` : ''}`
        const res = await POST(new NextRequest(url, { method: 'POST', headers, body }))
        return { status: res.status, json: await res.json() }
    }

    const storageUploads = () => fake.requests.filter(r => r.path.startsWith('/storage/v1/object/documents/'))
    const bookingPatches = () => fake.writesTo('bookings').map(r => r.query.get('id'))

    it('la reserva de otro cliente no autoriza, aunque se indique su bookingId', async () => {
        fake.tables.bookings = [paidBooking({ id: THEIRS, user_id: 'u2', payment_intent_id: 'pedido-ajeno' })]

        const { status, json } = await upload(form({
            bookingId: THEIRS,
            second_dni_front: new File([JPEG], 'dni.jpg'),
        }))

        assert.equal(status, 400, 'la reserva de otro cliente no debe autorizar nada')
        assert.match(json.error, /segundo conductor/i)
        assert.deepEqual(storageUploads(), [], 'no se sube ninguna foto a la carpeta de esa reserva')
        assert.deepEqual(bookingPatches(), [], 'no se escribe en la reserva ajena')
    })

    it('sin bookingId, la reserva de otro cliente con esa misma persona tampoco vale', async () => {
        fake.tables.bookings = [paidBooking({ id: THEIRS, user_id: 'u2', payment_intent_id: 'pedido-ajeno' })]

        const { status, json } = await upload(form())

        assert.equal(status, 400)
        assert.match(json.error, /segundo conductor/i)
        assert.deepEqual(fake.writesTo('users'), [])
    })

    it('con el pedido de OTRO cliente en la URL no se cuela su reserva', async () => {
        fake.tables.bookings = [paidBooking({ id: THEIRS, user_id: 'u2', payment_intent_id: 'pedido-ajeno' })]

        const { status } = await upload(form(), { order: 'pedido-ajeno' })

        assert.equal(status, 400)
        assert.deepEqual(bookingPatches(), [])
    })

    // El documento identifica a la persona: una reserva que lleva a OTRO 2º conductor no autoriza a
    // subir el de esta. Antes bastaba con que "alguna" reserva llevara uno, sin comparar con quién:
    // este es el test que distingue el cambio (el de «basta cualquiera» pasaba con las dos versiones)
    it('una reserva con otro 2º conductor no autoriza a esta persona', async () => {
        fake.tables.bookings = [paidBooking({
            passengers: [{ ...AUTHORIZED, fullName: 'Marta Ruiz', dniNie: 'X1234567L' }],
        })]

        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 400, 'el documento no es el de la persona que autoriza esa reserva')
        assert.match(json.error, /segundo conductor/i)
        assert.deepEqual(storageUploads(), [])
    })

    // QA-SD-11: el documento se compara contra la ficha de la reserva, pero el NOMBRE que se guardaba
    // en la reserva salía del formulario (`second_driver_name: secondDriverFullName || ...`,
    // route.ts:331). Con la migración 20261108 aplicada, `bookingSecondDriver` lee las columnas
    // primero, así que el contrato firmado facultaba al nombre que hubiera teclado el titular con el
    // DNI de la ficha. El nombre lo validó el checkout: ya no puede reescribirse aquí.
    //
    // La corrección rechaza el envío (400) en lugar de guardarlo en silencio: el titular tiene que
    // ver que ese nombre no es el de su reserva. La aserción original esperaba el 200 de entonces
    it('QA-SD-11 el nombre de la ficha de la reserva no puede reescribirse desde el formulario', async () => {
        fake.tables.bookings = [paidBooking()]

        const { status, json } = await upload(form({ secondDriverFullName: 'Pedro Falso' }))

        assert.equal(status, 400, 'la reserva pasaba a nombrar a otra persona con el DNI de la ficha')
        assert.match(json.error, /no coincide/i)
        assert.deepEqual(fake.writesTo('bookings'), [], 'no se reescribe el nombre de la ficha')
        assert.deepEqual(fake.writesTo('users'), [])
    })

    // `LIVE_BOOKING_STATUSES` incluye 'completed': un viaje terminado hace años seguía autorizando
    // subidas, y los 25 años se comprobaban contra aquella fecha de recogida. Desde el 2026-11-09 lo
    // decide la ENTREGA (decisión de Javier): con la camper ya entregada no se admite su
    // documentación, y las fotos no llegan a Storage
    it('con la entrega de recogida cerrada ya no se admite la subida', async () => {
        fake.tables.bookings = [paidBooking({ status: 'completed', start_date: '2020-06-01', end_date: '2020-06-08' })]
        fake.tables.handovers = [{
            id: 'h1', booking_id: fake.tables.bookings[0].id, kind: 'pickup', completed_at: '2020-06-01T15:00:00Z',
        }]

        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 400)
        assert.match(json.error, /ya está entregada/i)
        assert.deepEqual(storageUploads(), [])
        assert.deepEqual(bookingPatches(), [])
    })

    // Regla del 2026-11-09 con el cierre del 2026-11-10: sin ninguna entrega registrada la subida
    // sigue abierta hasta el día de la devolución, incluido, y ni un día más
    it('el día de la devolución, sin entrega registrada, sigue autorizando la subida', async () => {
        fake.tables.bookings = [paidBooking({ status: 'active', start_date: daysAgo(7), end_date: daysAgo(0) })]
        fake.tables.handovers = []

        const { status, json } = await upload(form())

        assert.equal(status, 200, json.error)
    })

    it('un viaje ya devuelto sin entrega registrada ya no la autoriza', async () => {
        fake.tables.bookings = [paidBooking({ status: 'completed', start_date: daysAgo(8), end_date: daysAgo(1) })]
        fake.tables.handovers = []

        const { status, json } = await upload(form())

        assert.equal(status, 400)
        assert.match(json.error, /el día de la devolución/i)
        assert.deepEqual(storageUploads(), [])
        assert.deepEqual(bookingPatches(), [])
    })
/** Día de hace `days` días, para situar un viaje dentro o fuera del plazo */
function daysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().slice(0, 10)
}


    it('un viaje en curso sigue autorizando la subida', async () => {
        const today = new Date().toISOString().slice(0, 10)
        fake.tables.bookings = [paidBooking({ status: 'active', start_date: today, end_date: today })]

        const { status, json } = await upload(form())

        assert.equal(status, 200, json.error)
    })
})

describe('Subida: varias reservas con el mismo 2º conductor', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({
            // Las dos están vivas y pagadas y llevan a Luis. La primera de la lista es la LEJANA:
            // la consulta de la ruta no tiene ORDER BY, así que el orden de las filas es el que
            // devuelva Postgres (aquí, el de inserción)
            bookings: [
                paidBooking({ id: MINE, start_date: '2099-12-01', end_date: '2099-12-08' }),
                paidBooking({ id: NEARBY, payment_intent_id: 'pedido-proximo', start_date: '2099-06-01', end_date: '2099-06-08' }),
            ],
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

    async function upload(data: FormData) {
        const encoded = new Request('http://localhost/', { method: 'POST', body: data })
        const body = await encoded.arrayBuffer()
        const headers = new Headers({
            'content-type': encoded.headers.get('content-type')!,
            'content-length': String(body.byteLength),
        })
        const res = await POST(new NextRequest('http://localhost/api/upload-driver-docs', { method: 'POST', headers, body }))
        return { status: res.status, json: await res.json() }
    }

    it('con bookingId la ficha y las fotos van a ESA reserva', async () => {
        const { status, json } = await upload(form({
            bookingId: NEARBY,
            second_dni_front: new File([JPEG], 'dni.jpg'),
        }))

        assert.equal(status, 200, json.error)
        assert.deepEqual(fake.writesTo('bookings').map(r => r.query.get('id')), [`eq.${NEARBY}`])
        const [sent] = fake.requests.filter(r => r.path.startsWith('/storage/v1/object/documents/'))
        assert.match(sent.path, new RegExp(`^/storage/v1/object/documents/u1/${NEARBY}/second_dni_front_`))
    })

    // QA-SD-7: sin bookingId ni pedido, la consulta de app/api/upload-driver-docs/route.ts:165-173 no
    // ordena, así que gana la primera fila que devuelva Postgres. Con dos reservas de la misma
    // persona, la ficha y las fotos pueden acabar en la que no toca (y la próxima se queda sin ellas)
    it('QA-SD-7 sin bookingId elige la reserva de start_date más próxima', async () => {
        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 200, json.error)
        assert.deepEqual(
            fake.writesTo('bookings').map(r => r.query.get('id')),
            [`eq.${NEARBY}`],
            'la ficha se guarda en una reserva cualquiera, no en la próxima'
        )
    })

    it('QA-SD-7 las fotos van a la carpeta de la reserva próxima', async () => {
        await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        const [sent] = fake.requests.filter(r => r.path.startsWith('/storage/v1/object/documents/'))
        assert.match(
            sent.path,
            new RegExp(`^/storage/v1/object/documents/u1/${NEARBY}/second_dni_front_`),
            'las fotos quedan en la carpeta de otra reserva'
        )
    })
})

// =====================================================================================
// /dashboard/datos: cuál de las reservas enseña el formulario
// =====================================================================================

describe('/dashboard/datos: la reserva que enseña el interruptor', () => {
    const PAGE_SOURCE = readFileSync('app/[locale]/dashboard/datos/page.tsx', 'utf8')

    it('el interruptor sale de la reserva, no del perfil (QA-SD-6)', () => {
        const client = readFileSync('app/[locale]/dashboard/datos/DriverDataClient.tsx', 'utf8')
        assert.match(client, /const \[hasSecondDriver, setHasSecondDriver\] = useState\(Boolean\(secondDriverBooking\)\)/)
        assert.doesNotMatch(client, /useState\(Boolean\(profile\?\.has_second_driver\)\)/)
        assert.match(client, /const sendSecondDriver = hasSecondDriver && Boolean\(secondDriverBooking\)/)
        // Con reserva se dice CUÁL: la ruta compara el documento contra esa reserva
        assert.match(client, /formData\.append\('bookingId', secondDriverBooking!\.bookingId\)/)
    })

    // QA-SD-8: la consulta ordena por start_date ascendente y se queda con la primera que lleve
    // 2º conductor (page.tsx:49-69). `LIVE_BOOKING_STATUSES` incluye 'completed', así que un viaje
    // pasado gana a la próxima reserva: el cliente ve al 2º conductor del viaje antiguo y no puede
    // subir la documentación del de la reserva que viene
    it('QA-SD-8 debería enseñar la reserva próxima, no la más antigua', () => {
        const order = PAGE_SOURCE.match(/\.order\('start_date'[^)]*\)/)?.[0] || '(sin orden)'
        assert.notEqual(
            order,
            ".order('start_date', { ascending: true }",
            'ordena de la más antigua a la más reciente y se queda con la primera que lleve 2º conductor'
        )
    })
})

// =====================================================================================
// Contrato: a quién nombra cuando la reserva no guarda la ficha
// =====================================================================================

describe('Contrato: a quién nombra el bloque del 2º conductor', () => {
    const PROFILE_WITH = {
        full_name: 'Ana Pérez',
        has_second_driver: true,
        second_driver_name: 'Luis Pérez',
        second_driver_dni: 'AB123456',
        second_driver_license: 'B-99',
    }
    const booking = (breakdown: Row | null, overrides: Row = {}): Row => ({
        id: 'b1', total_price: 735, start_date: '2099-06-01', end_date: '2099-06-08',
        deposit_amount: 2000, pricing_breakdown: breakdown, ...overrides,
    })

    it('nombra al 2º conductor de la reserva, no al del perfil', () => {
        const data = generateContractData(
            booking(
                { secondDriver: true, secondDriverRatePerDay: 5, secondDriverSupplement: 35 },
                { passengers: [{ fullName: 'Marta Ruiz', dniNie: 'X1234567L', isSecondDriver: true }] }
            ),
            PROFILE_WITH
        )

        assert.equal(data.secondDriver!.fullName, 'Marta Ruiz')
        assert.equal(data.secondDriver!.dniNie, 'X1234567L')
    })

    // QA-SD-9: una reserva que cobró el suplemento pero no guarda la ficha (`source: 'pricing_only'`,
    // reservas anteriores al cambio) cae en el perfil: contractEngine.ts:640-642 pone el nombre y el
    // DNI de `users.second_driver_*`. El contrato firmado faculta así a una persona que ESTA reserva
    // no registró nunca (puede ser la 2ª conductora de otra reserva del mismo cliente)
    it('QA-SD-9 no nombra al 2º conductor del perfil en una reserva que no lo registró', () => {
        const data = generateContractData(
            booking({ secondDriver: true, secondDriverRatePerDay: 5, secondDriverSupplement: 35 }),
            PROFILE_WITH
        )

        assert.ok(data.secondDriver, 'la reserva cobró el suplemento: el bloque se imprime')
        assert.equal(data.secondDriver!.fullName, 'Pendiente de verificación')
        assert.equal(data.secondDriver!.dniNie, 'Pendiente')
    })

    // Lo que QA-SD-4 quería comprobar: con fianza Estándar nunca se afirma que vaya incluido.
    // (La aserción anterior, `notEqual(supplement, 0)` sobre una reserva SIN 2º conductor, se
    // rompía: ahí ya no se imprime ninguna cláusula)
    it('QA-SD-4 una reserva antigua con Estándar no dice que vaya incluido', () => {
        const data = generateContractData(
            booking({ basePrice: 100 }, { has_second_driver: true }),
            PROFILE_WITH
        )

        assert.ok(data.secondDriver, 'la reserva consta con 2º conductor')
        assert.equal(data.secondDriver!.supplement, 0, 'no se cobró nada en esa reserva')
        assert.equal(data.secondDriver!.included, false, 'con Estándar no puede afirmar que va incluido')
    })

    it('QA-SD-4 una reserva antigua sin 2º conductor no imprime ninguna cláusula', () => {
        const data = generateContractData(booking({ basePrice: 100 }), PROFILE_WITH)

        assert.equal(data.secondDriver, undefined)
    })

    it('el desglose cobrado manda sobre la fianza: includesSecondDriver gana', () => {
        const flexSinIncluir = generateContractData(
            booking({ secondDriver: true, includesSecondDriver: false, secondDriverSupplement: 0 }, { deposit_amount: 1000 }),
            PROFILE_WITH
        )
        const estandarIncluido = generateContractData(
            booking({ secondDriver: true, includesSecondDriver: true, secondDriverSupplement: 0 }),
            PROFILE_WITH
        )

        assert.equal(flexSinIncluir.secondDriver!.included, false)
        assert.equal(estandarIncluido.secondDriver!.included, true)
    })
})

// =====================================================================================
// Dos resolutores del mismo dato: lib/booking/secondDriver.ts y lib/admin/bookingBreakdown.ts
// =====================================================================================

describe('El 2º conductor de la reserva: contrato y admin deberían leer lo mismo', () => {
    // Columnas nuevas de la reserva (migración 20261108), sin ficha en `passengers`: es lo que deja
    // la propia subida cuando la ficha venía del desglose, y lo que quedará al corregir una ficha
    const byColumns: Row = {
        id: 'b1',
        has_second_driver: true,
        second_driver_name: 'Luis Pérez',
        second_driver_dni: 'AB123456',
        second_driver_license: 'B-99',
        passengers: [],
        pricing_breakdown: { depositOption: 'standard_2000', secondDriverSupplement: 35 },
    }

    it('secondDriver.ts lee las columnas de la reserva', () => {
        const driver = bookingSecondDriver(byColumns)

        assert.equal(driver?.source, 'booking_columns')
        assert.equal(driver?.document, 'AB123456')
    })

    // QA-SD-10: adminBookingSecondDriver solo mira `passengers` y `pricing_breakdown.passengers`
    // (bookingBreakdown.ts:77-78). Con la ficha en las columnas de la reserva, el panel no enseña al
    // 2º conductor que el contrato sí nombra, y su línea desaparece del desglose
    it('QA-SD-10 el desglose de admin debería ver la ficha de las columnas de la reserva', () => {
        assert.ok(
            adminBookingSecondDriver(byColumns),
            'el panel no ve al 2º conductor que el contrato nombra: dos resolutores con reglas distintas'
        )
    })
})
