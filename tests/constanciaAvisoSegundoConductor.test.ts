import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST } from '../app/api/upload-driver-docs/route'
import { POST as recordPOST } from '../app/api/admin/bookings/second-driver/route'
import {
    SECOND_DRIVER_INFORMED_COLUMN,
    SECOND_DRIVER_NOT_INFORMED_MESSAGE,
    secondDriverInformedColumnMissing,
    secondDriverInformedPatch,
    secondDriverInformedRejection,
    secondDriverInformedReset,
} from '../lib/booking/secondDriver'
import { mayUploadSecondDriverPhotos } from '../lib/user/secondDriverBookings'

/**
 * CONSTANCIA DE QUE EL TITULAR DECLARÓ HABER INFORMADO AL 2º CONDUCTOR
 * (decisión de Javier, 2026-11-14: «guardemos constancia para cumplir siempre con la ley y la
 * normativa»; art. 5.2 del RGPD: hay que poder DEMOSTRAR el cumplimiento, no solo cumplirlo).
 *
 * La casilla de /dashboard/datos bloqueaba los selectores de foto pero no salía del navegador: no
 * llegaba a /api/upload-driver-docs ni se guardaba, así que era un aviso y no un control. Esto
 * prueba las dos mitades:
 *
 *   1. La confirmación viaja y la ruta la EXIGE: sin ella, las fotos del 2º conductor se rechazan
 *      antes de escribir en `users`, en `bookings` y en Storage.
 *   2. Queda constancia con fecha y hora en la reserva (`second_driver_informed_declared_at`,
 *      migración 20261114, PREPARADA SIN APLICAR), sin reescribir la primera declaración y sin
 *      romperse si la columna todavía no existe.
 *
 * Reloj SIEMPRE congelado (`mock.timers`): la constancia es una fecha y hora, y un test anclado al
 * reloj de la máquina no puede comprobar cuál se guarda.
 *
 * Lo que NO prueba: Supabase real, RLS, el trigger que impide al cliente escribir esa columna,
 * Storage real ni el navegador.
 */

const ORDER = '5555abcd1111'
const BOOKING = 'cccccccc-3333-4333-8333-cccccccccccc'
const NOW = '2026-11-14T10:30:00.000Z'
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])

const AUTHORIZED = {
    fullName: 'Luis Gómez',
    dniNie: '87654321X',
    driverLicenseId: 'B-99',
    isSecondDriver: true,
    birthDate: '1985-01-01',
    licenseDate: '2010-01-01',
}

describe('La confirmación de haber informado al 2º conductor: regla pura', () => {
    afterEach(() => mock.timers.reset())

    const row = (extra: Row = {}): Row => ({ id: BOOKING, [SECOND_DRIVER_INFORMED_COLUMN]: null, ...extra })

    it('la pantalla y la ruta aplican la misma regla: sin confirmar, las fotos no viajan ni se aceptan', () => {
        assert.equal(mayUploadSecondDriverPhotos(true, false), false)
        assert.equal(secondDriverInformedRejection(true, false), SECOND_DRIVER_NOT_INFORMED_MESSAGE)

        assert.equal(mayUploadSecondDriverPhotos(true, true), true)
        assert.equal(secondDriverInformedRejection(true, true), null)
    })

    it('el titular que solo guarda sus propios datos no necesita la casilla', () => {
        assert.equal(secondDriverInformedRejection(false, false), null)
    })

    it('la constancia es la fecha y la hora de la confirmación, no un booleano', () => {
        mock.timers.enable({ apis: ['Date'], now: new Date(NOW) })

        assert.deepEqual(secondDriverInformedPatch(row(), true), { [SECOND_DRIVER_INFORMED_COLUMN]: NOW })
    })

    it('no se reescribe la que ya constaba: vale la PRIMERA declaración', () => {
        mock.timers.enable({ apis: ['Date'], now: new Date(NOW) })
        const antes = '2026-11-01T08:00:00.000Z'

        assert.deepEqual(secondDriverInformedPatch(row({ [SECOND_DRIVER_INFORMED_COLUMN]: antes }), true), {})
    })

    it('sin confirmación no se escribe nada, aunque la columna exista', () => {
        assert.deepEqual(secondDriverInformedPatch(row(), false), {})
    })

    it('con la columna sin aplicar no se escribe nada: el UPDATE de la ficha no debe fallar por ella', () => {
        const sinColumna = { id: BOOKING, second_driver_dni: '87654321X' }

        assert.equal(secondDriverInformedColumnMissing(sinColumna), true)
        assert.equal(secondDriverInformedColumnMissing(row()), false)
        assert.deepEqual(secondDriverInformedPatch(sinColumna, true), {})
    })

    it('cambiar de persona invalida la constancia anterior; el mismo 2º conductor la conserva', () => {
        const constancia = row({ [SECOND_DRIVER_INFORMED_COLUMN]: '2026-11-01T08:00:00.000Z' })

        assert.deepEqual(secondDriverInformedReset(constancia, true), { [SECOND_DRIVER_INFORMED_COLUMN]: null })
        assert.deepEqual(secondDriverInformedReset(constancia, false), {})
        // Nada que invalidar: ni constancia previa, ni columna
        assert.deepEqual(secondDriverInformedReset(row(), true), {})
        assert.deepEqual(secondDriverInformedReset({ id: BOOKING }, true), {})
    })
})

describe('Subida: la ruta exige la confirmación y deja constancia', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    const booking = (extra: Row = {}): Row => ({
        id: BOOKING, user_id: 'u1', payment_intent_id: ORDER, payment_status: 'paid', status: 'confirmed',
        start_date: '2099-06-01', end_date: '2099-06-08', passengers: [AUTHORIZED],
        has_second_driver: true, second_driver_name: 'Luis Gómez', second_driver_dni: '87654321X',
        second_driver_license: 'B-99', second_driver_birth_date: '1985-01-01',
        second_driver_license_date: '2010-01-01', second_driver_docs_uploaded_at: null,
        [SECOND_DRIVER_INFORMED_COLUMN]: null,
        ...extra,
    })

    beforeEach(() => {
        fake = installFakeSupabase({
            bookings: [booking()],
            users: [{ id: 'u1', verification_status: 'not_submitted', full_name: 'Ana Pérez' }],
        })
        fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
        mock.timers.enable({ apis: ['Date'], now: new Date(NOW) })
        console.error = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        mock.timers.reset()
        fake.restore()
        Object.assign(console, silenced)
    })

    /** El formulario tal como lo manda /dashboard/datos con el 2º conductor activo */
    function form(fields: Row = {}) {
        const data = new FormData()
        data.append('fullName', 'Ana Pérez')
        data.append('driverLicenseIssueDate', '2015-01-01')
        data.append('driverLicenseExpiryDate', '2035-01-01')
        data.append('hasSecondDriver', 'true')
        data.append('bookingId', BOOKING)
        data.append('secondDriverFullName', 'Luis Gómez')
        data.append('secondDriverDni', '87654321X')
        data.append('secondDriverLicense', 'B-99')
        for (const [key, value] of Object.entries(fields)) data.append(key, value)
        return data
    }

    const photo = (name: string) => new File([JPEG], name, { type: 'image/jpeg' })

    async function upload(data: FormData) {
        const encoded = new Request('http://localhost/', { method: 'POST', body: data })
        const body = await encoded.arrayBuffer()
        const headers = new Headers({
            'content-type': encoded.headers.get('content-type')!,
            'content-length': String(body.byteLength),
        })
        const res = await POST(new NextRequest(`http://localhost/api/upload-driver-docs?order=${ORDER}`, { method: 'POST', headers, body }))
        return { status: res.status, json: await res.json() }
    }

    const storageUploads = () => fake.requests.filter(r => r.path.startsWith('/storage/v1/object/documents/'))
    const saved = () => fake.tables.bookings[0]

    it('con la confirmación se guardan sus fotos y queda la constancia con fecha y hora', async () => {
        const res = await upload(form({
            secondDriverInformed: 'true',
            second_license_front: photo('carnet-anverso.jpg'),
            second_license_back: photo('carnet-reverso.jpg'),
        }))

        assert.equal(res.status, 200, res.json.error)
        assert.equal(storageUploads().length, 2)
        for (const sent of storageUploads()) {
            assert.match(sent.path, new RegExp(`/documents/u1/${BOOKING}/second_license_`), 'las fotos van a la carpeta de SU reserva')
        }
        assert.equal(saved()[SECOND_DRIVER_INFORMED_COLUMN], NOW)
        assert.equal(saved().second_driver_docs_uploaded_at, NOW)
    })

    it('sin la confirmación se rechazan sus fotos sin escribir NADA', async () => {
        const res = await upload(form({
            second_license_front: photo('carnet-anverso.jpg'),
            second_license_back: photo('carnet-reverso.jpg'),
        }))

        assert.equal(res.status, 400)
        assert.equal(res.json.error, SECOND_DRIVER_NOT_INFORMED_MESSAGE)
        assert.deepEqual(storageUploads(), [], 'ninguna foto en Storage')
        assert.deepEqual(fake.writesTo('bookings'), [], 'nada escrito en la reserva')
        assert.deepEqual(fake.writesTo('users'), [], 'ni el perfil pasa a revisión')
        assert.equal(saved()[SECOND_DRIVER_INFORMED_COLUMN], null)
        assert.equal(saved().second_driver_docs_uploaded_at, null)
        // El rechazo va antes incluso de consultar la reserva
        assert.equal(fake.requests.some(r => r.path === '/rest/v1/bookings'), false)
        assert.equal(fake.tables.users[0].verification_status, 'not_submitted')
    })

    it('tampoco con `false`, ni mandando solo el DNI de esa persona', async () => {
        const res = await upload(form({ secondDriverInformed: 'false', second_dni_front: photo('dni.jpg') }))

        assert.equal(res.status, 400)
        assert.equal(res.json.error, SECOND_DRIVER_NOT_INFORMED_MESSAGE)
        assert.deepEqual(storageUploads(), [])
        assert.deepEqual(fake.writesTo('users'), [])
    })

    it('el titular que solo guarda SUS datos y SUS fotos sigue sin necesitar la casilla', async () => {
        const res = await upload(form({ dni_front: photo('mi-dni.jpg'), license_front: photo('mi-carnet.jpg') }))

        assert.equal(res.status, 200, res.json.error)
        assert.equal(storageUploads().length, 2)
        for (const sent of storageUploads()) {
            assert.match(sent.path, /\/documents\/u1\/(dni_front|front)_/, 'van a su carpeta, no a la de la reserva')
        }
        assert.equal(fake.tables.users[0].verification_status, 'pending_validation')
        assert.equal(saved()[SECOND_DRIVER_INFORMED_COLUMN], null, 'sin confirmación no se inventa constancia')
    })

    it('con la columna sin aplicar no se rompe: se suben las fotos y se guarda la ficha', async () => {
        const sinColumna = booking()
        delete sinColumna[SECOND_DRIVER_INFORMED_COLUMN]
        fake.tables.bookings[0] = sinColumna

        const res = await upload(form({ secondDriverInformed: 'true', second_license_front: photo('carnet.jpg') }))

        assert.equal(res.status, 200, res.json.error)
        assert.equal(storageUploads().length, 1)
        const [write] = fake.writesTo('bookings')
        assert.ok(write, 'la ficha del 2º conductor sí se guarda')
        assert.equal(SECOND_DRIVER_INFORMED_COLUMN in (write.body as Row), false, 'no se manda una columna que no existe')
        assert.equal(saved().second_driver_docs_uploaded_at, NOW)
    })

    it('volver a enviar no reescribe la constancia: queda la de la primera declaración', async () => {
        const antes = '2026-11-10T07:15:00.000Z'
        fake.tables.bookings[0][SECOND_DRIVER_INFORMED_COLUMN] = antes

        const res = await upload(form({ secondDriverInformed: 'true', second_license_front: photo('carnet.jpg') }))

        assert.equal(res.status, 200, res.json.error)
        assert.equal(saved()[SECOND_DRIVER_INFORMED_COLUMN], antes)
        const [write] = fake.writesTo('bookings')
        assert.equal(SECOND_DRIVER_INFORMED_COLUMN in (write.body as Row), false)
    })
})

describe('Backoffice: cambiar de 2º conductor invalida la constancia', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const ADMIN_ID = '00000000-0000-4000-8000-0000000000aa'
    const ANTES = '2026-11-01T08:00:00.000Z'
    const silenced = { error: console.error, info: console.info, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: 'u1', role: 'customer' }],
            bookings: [{
                id: BOOKING, user_id: 'u1', status: 'confirmed', payment_status: 'paid', notes: null,
                start_date: '2099-06-01', end_date: '2099-06-08', passengers: [AUTHORIZED],
                pricing_breakdown: { secondDriver: true, secondDriverSupplement: 35 },
                has_second_driver: true, second_driver_name: 'Luis Gómez', second_driver_dni: '87654321X',
                second_driver_license: 'B-99', second_driver_birth_date: '1985-01-01',
                second_driver_license_date: '2010-01-01',
                second_driver_updated_by: null, second_driver_updated_at: null,
                [SECOND_DRIVER_INFORMED_COLUMN]: ANTES,
            }],
        })
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        mock.timers.enable({ apis: ['Date'], now: new Date(NOW) })
        console.error = () => {}
        console.info = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        mock.timers.reset()
        fake.restore()
        Object.assign(console, silenced)
    })

    const send = (body: Record<string, unknown>) =>
        recordPOST(new Request('http://localhost/api/admin/bookings/second-driver', { method: 'POST', body: JSON.stringify(body) }))
    const saved = () => fake.tables.bookings[0]

    it('otra persona en la ficha deja la constancia en NULL: el titular informó a la anterior', async () => {
        const res = await send({
            bookingId: BOOKING, fullName: 'Marta Ruiz', document: '12345678Z',
            licenseId: 'B-1234567', birthDate: '1990-01-01', licenseDate: '2012-01-01',
        })

        assert.equal(res.status, 200, JSON.stringify(await res.clone().json()))
        assert.equal(saved().second_driver_dni, '12345678Z')
        assert.equal(saved()[SECOND_DRIVER_INFORMED_COLUMN], null)
    })

    it('corregir una fecha de la MISMA persona no borra la constancia', async () => {
        const res = await send({
            bookingId: BOOKING, fullName: 'Luis Gómez', document: '87654321X',
            licenseId: 'B-99', birthDate: '1985-01-02', licenseDate: '2010-01-01',
        })

        assert.equal(res.status, 200, JSON.stringify(await res.clone().json()))
        assert.equal(saved().second_driver_birth_date, '1985-01-02')
        assert.equal(saved()[SECOND_DRIVER_INFORMED_COLUMN], ANTES)
    })
})
