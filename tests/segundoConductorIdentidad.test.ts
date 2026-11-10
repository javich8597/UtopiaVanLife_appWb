import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST } from '../app/api/upload-driver-docs/route'
import { POST as checkoutPost } from '../app/api/bookings/checkout/route'
import { generateContractData } from '../lib/contracts/contractEngine'
import { secondDriverSupplementText } from '../lib/contracts/pdfGenerator'
import {
    closedPickupBookingIds,
    isPickupHandoverClosed,
    isUploadWindowOpen,
    sameDriverName,
    secondDriverRequirementError,
    uploadableSecondDriverBookings,
    uploadWindowState,
} from '../lib/booking/secondDriver'
import { MAX_DOCUMENT_UPLOADS_PER_IP, registerDocumentUploadAttempt } from '../lib/booking/checkoutRateLimit'

/**
 * Quién queda facultado a conducir: el 2º conductor que validó el checkout y nadie más
 * (fallos QA-SD-7, QA-SD-9 y QA-SD-11 y los hallazgos de seguridad del 2026-11-09).
 *
 * Antes, acertando el documento, el titular podía teclear cualquier nombre y el contrato lo
 * facultaba; una reserva que solo cobró el suplemento tomaba el nombre del perfil; con dos reservas
 * de la misma persona la documentación iba a una cualquiera; y la edad podía autodeclararse.
 *
 * Lo que NO prueba este archivo: Supabase real, RLS, Storage real, triggers, columnas reales ni el
 * navegador. La base está simulada y las fechas son del futuro para no depender del reloj.
 */

const ORDER = '1234abcd5678'
const NEAR = 'cccccccc-3333-4333-8333-cccccccccccc'
const FAR = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'

/**
 * Ficha del 2º conductor tal y como la guarda el checkout en `bookings.passengers`, con su nº de
 * carnet: desde el 2026-11-09 los tres datos de esa persona solo salen de la ficha (hallazgo N2)
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
    id: FAR,
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

// =====================================================================================
// 1. El nombre sale de la ficha validada, no del formulario
// =====================================================================================

describe('Subida: el nombre del 2º conductor es el de la ficha de la reserva', () => {
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

    it('acertar el documento no permite facultar a otra persona', async () => {
        const { status, json } = await upload(form({ secondDriverFullName: 'Mario Impostor' }))

        assert.equal(status, 400)
        assert.match(json.error, /no coincide/i)
        assert.deepEqual(fake.writesTo('bookings'), [], 'la reserva no cambia de 2º conductor')
        assert.equal(fake.tables.users[0].second_driver_name, undefined, 'tampoco el perfil')
    })

    it('el perfil guarda el nombre de la ficha, no el del formulario', async () => {
        // Diferencias de forma (espacios, acentos, mayúsculas) son la misma persona
        const { status, json } = await upload(form({ secondDriverFullName: '  luis   perez ' }))

        assert.equal(status, 200, json.error)
        assert.equal(fake.tables.users[0].second_driver_name, 'Luis Pérez')
        assert.equal(fake.tables.bookings[0].second_driver_name, 'Luis Pérez')
    })

    // Cambio de regla del 2026-11-09 (QA-SD-13): la ficha sin nombre ya NO toma el del formulario.
    // Esta prueba esperaba antes un 200 que guardaba «Luis Pérez» en la reserva; con una ficha que
    // solo identifica a la persona por documento, /dashboard/datos rellenaba ese campo con
    // `users.second_driver_name` —el 2º conductor de OTRA reserva— y el contrato acababa
    // facultándolo. Lo que se puede hacer es subir las fotos con el campo en blanco: el nombre queda
    // pendiente y lo completamos nosotros
    const fichaSinNombre = () => {
        fake.tables.bookings = [paidBooking({
            passengers: [],
            second_driver_dni: 'AB123456',
            second_driver_license: 'B-99',
            second_driver_birth_date: '1985-01-01',
            second_driver_license_date: '2010-01-01',
        })]
    }

    it('si la ficha no guarda el nombre, el del formulario se rechaza', async () => {
        fichaSinNombre()

        const { status, json } = await upload(form())

        assert.equal(status, 400)
        assert.match(json.error, /no guarda el nombre completo/i)
        assert.match(json.error, /escríbenos/i)
        assert.deepEqual(fake.writesTo('bookings'), [], 'la reserva no pasa a nombrar a nadie')
    })

    it('si la ficha no guarda el nombre, en blanco sí se admiten sus fotos y el nombre queda pendiente', async () => {
        fichaSinNombre()

        const { status, json } = await upload(form({ secondDriverFullName: '' }))

        assert.equal(status, 200, json.error)
        assert.equal(fake.tables.bookings[0].second_driver_name, '')
        assert.equal(fake.tables.users[0].second_driver_name, '')
    })

    // Hallazgo N2 (decisión de Javier, 2026-11-09): el nº de carnet también sale solo de la ficha.
    // Antes el formulario ganaba (`secondDriverLicense || authorizedSecondDriver.licenseId`) y el
    // cambio solo dejaba un console.warn: el contrato imprimía como permiso de la persona autorizada
    // el número que hubiera teclado el titular
    it('un nº de carnet distinto del de la ficha se rechaza', async () => {
        fake.tables.bookings = [paidBooking({
            passengers: [{ ...AUTHORIZED, driverLicenseId: 'B-OLD' }],
        })]

        const { status, json } = await upload(form({ secondDriverLicense: 'B-NUEVO' }))

        assert.equal(status, 400)
        assert.match(json.error, /no coincide/i)
        assert.ok(!json.error.includes('B-OLD'), 'el mensaje no repite el número de la ficha')
        assert.deepEqual(fake.writesTo('bookings'), [], 'el carnet de la ficha no se reescribe')
        assert.deepEqual(fake.writesTo('users'), [])
    })

    it('el nº de carnet que se guarda es el de la ficha, aunque el formulario lo mande en blanco', async () => {
        fake.tables.bookings = [paidBooking({
            passengers: [{ ...AUTHORIZED, driverLicenseId: 'B-FICHA' }],
        })]

        const { status, json } = await upload(form({ secondDriverLicense: '' }))

        assert.equal(status, 200, json.error)
        assert.equal(fake.tables.bookings[0].second_driver_license, 'B-FICHA')
        assert.equal(fake.tables.users[0].second_driver_license, 'B-FICHA')
    })

    it('si la ficha no guarda el carnet, el del formulario se rechaza y en blanco queda pendiente', async () => {
        fake.tables.bookings = [paidBooking({
            passengers: [{ ...AUTHORIZED, driverLicenseId: '' }],
        })]

        const inventado = await upload(form({ secondDriverLicense: 'B-INVENTADO' }))
        assert.equal(inventado.status, 400)
        assert.match(inventado.json.error, /no guarda el número de carnet/i)

        const enBlanco = await upload(form({ secondDriverLicense: '' }))
        assert.equal(enBlanco.status, 200, enBlanco.json.error)
        assert.equal(fake.tables.bookings[0].second_driver_license, '')
    })

    // Hallazgo 7: con el documento guardado en el perfil bastaba acertarlo para que pasara
    // cualquier nombre. No autoriza a nadie, pero el titular tiene que ver que no es esa persona
    it('un perfil sin reserva que lo autorice no cuela otro nombre con el documento acertado', async () => {
        fake.tables.bookings = []
        Object.assign(fake.tables.users[0], {
            has_second_driver: true,
            second_driver_name: 'Luis Pérez',
            second_driver_dni: 'AB123456',
        })

        const impostor = await upload(form({ secondDriverFullName: 'Mario Impostor' }))
        assert.equal(impostor.status, 400)
        assert.match(impostor.json.error, /segundo conductor/i)

        // El mismo 2º conductor del perfil sí deja al titular guardar SUS datos
        const propio = await upload(form())
        assert.equal(propio.status, 200, propio.json.error)
        assert.equal(fake.tables.users[0].second_driver_name, 'Luis Pérez', 'no se toca lo que había')
    })

    // Cambio de regla del 2026-11-09 (QA-SD-14): el plazo cerrado se comprueba ANTES de mirar si el
    // perfil repite a esa persona. Antes este caso respondía 200 y «guardados con éxito» —el perfil
    // guarda a ese 2º conductor en cuanto subió su documentación una vez—, así que el cliente no se
    // enteraba de que la única reserva que lo autoriza devolvió la camper hace años
    // El plazo lo cierra la ENTREGA de llaves, no la fecha (decisión de Javier, 2026-11-09): la
    // documentación hace falta antes de dar la camper y en la entrega el admin la comprueba
    it('con la camper ya entregada responde que no se puede subir, no éxito', async () => {
        fake.tables.bookings = [paidBooking({ status: 'completed', start_date: '2020-06-01', end_date: '2020-06-08' })]
        fake.tables.handovers = [{
            id: 'h1', booking_id: fake.tables.bookings[0].id, kind: 'pickup', completed_at: '2020-06-01T15:00:00Z',
        }]
        Object.assign(fake.tables.users[0], {
            has_second_driver: true,
            second_driver_name: 'Luis Pérez',
            second_driver_dni: 'AB123456',
        })

        const { status, json } = await upload(form())

        assert.equal(status, 400)
        assert.match(json.error, /ya está entregada/i)
        assert.deepEqual(fake.writesTo('bookings'), [], 'no se escribe en la reserva ya entregada')
    })

    // El día de la devolución es el último: sin entrega registrada, ese día todavía se admite
    it('el día de la devolución todavía admite su documentación', async () => {
        fake.tables.bookings = [paidBooking({ status: 'active', start_date: daysAgoDay(7), end_date: daysAgoDay(0) })]
        fake.tables.handovers = []

        const { status, json } = await upload(form())

        assert.equal(status, 200, json.error)
        assert.equal(fake.tables.bookings[0].second_driver_name, 'Luis Pérez')
    })

    it('un viaje ya devuelto sin entrega registrada ya no la admite', async () => {
        fake.tables.bookings = [paidBooking({ status: 'completed', start_date: daysAgoDay(8), end_date: daysAgoDay(1) })]
        fake.tables.handovers = []

        const { status, json } = await upload(form())

        assert.equal(status, 400)
        assert.match(json.error, /el día de la devolución/i)
        assert.deepEqual(fake.writesTo('bookings'), [], 'no se escribe en el viaje fuera de plazo')
    })

/** Día de hace `days` días, para situar un viaje dentro o fuera del plazo */
function daysAgoDay(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().slice(0, 10)
}

    // El titular sí puede guardar SUS datos sin arrastrar al 2º conductor de aquel viaje: el
    // interruptor de /dashboard/datos sale de la reserva, así que sin reserva viva manda `false`
    it('sin el 2º conductor en el formulario, el titular guarda sus datos con el viaje terminado', async () => {
        fake.tables.bookings = [paidBooking({ status: 'completed', start_date: '2020-06-01', end_date: '2020-06-08' })]
        Object.assign(fake.tables.users[0], {
            has_second_driver: true,
            second_driver_name: 'Luis Pérez',
            second_driver_dni: 'AB123456',
        })

        const { status, json } = await upload(form({ hasSecondDriver: 'false' }))

        assert.equal(status, 200, json.error)
        assert.deepEqual(fake.writesTo('bookings'), [], 'no se escribe en el viaje terminado')
    })
})

// =====================================================================================
// 3. Varias reservas: la próxima. 5. Viajes ya devueltos
// =====================================================================================

describe('Subida: qué reserva recibe la documentación', () => {
    const near = paidBooking({ id: NEAR, payment_intent_id: 'pedido-proximo', start_date: '2099-06-01', end_date: '2099-06-08' })
    const far = paidBooking({ id: FAR, start_date: '2099-12-01', end_date: '2099-12-08' })

    it('entre las que autorizan a esa persona, la de recogida más próxima', () => {
        for (const rows of [[far, near], [near, far]]) {
            const elegidas = uploadableSecondDriverBookings(rows, 'AB123456').map(c => c.row.id)
            assert.deepEqual(elegidas, [NEAR, FAR])
        }
    })

    it('una reserva con OTRO 2º conductor no entra en la lista', () => {
        const otra = paidBooking({ id: NEAR, passengers: [{ ...AUTHORIZED, fullName: 'Marta Ruiz', dniNie: 'X1234567L' }] })

        assert.deepEqual(uploadableSecondDriverBookings([otra, far], 'AB123456').map(c => c.row.id), [FAR])
    })

    // Regla del 2026-11-09 con el tope del 2026-11-10 (decisiones de Javier): el plazo lo cierra la
    // entrega de llaves y, como respaldo para las reservas de las que nadie registró la entrega, el
    // mes siguiente a la devolución. Así un viaje mal registrado no queda abierto para siempre
    it('el día de la devolución, sin entrega registrada, sigue admitiendo documentación', () => {
        const reciente = paidBooking({ status: 'active', start_date: '2026-10-01', end_date: '2026-10-08' })
        const now = new Date('2026-10-08T10:00:00Z')

        assert.equal(isUploadWindowOpen(reciente, { now }), true)
        assert.deepEqual(uploadableSecondDriverBookings([reciente], 'AB123456', { now }).map(c => c.row.id), [reciente.id])
    })

    it('un viaje ya devuelto sin entrega registrada ya no la admite', () => {
        const viejo = paidBooking({ status: 'completed', start_date: '2020-06-01', end_date: '2020-06-08' })

        assert.equal(uploadWindowState(viejo), 'returned')
        assert.deepEqual(uploadableSecondDriverBookings([viejo], 'AB123456'), [])
    })

    it('con la entrega de recogida cerrada ya no se admite su documentación', () => {
        const entregada = paidBooking({ id: NEAR, start_date: '2099-06-01', end_date: '2099-06-08' })
        const closedPickups = closedPickupBookingIds([
            { booking_id: NEAR, kind: 'pickup', completed_at: '2099-06-01T15:30:00Z' },
        ])

        assert.equal(uploadWindowState(entregada, { closedPickups }), 'handed_over')
        assert.deepEqual(uploadableSecondDriverBookings([entregada], 'AB123456', { closedPickups }), [])
    })

    it('una entrega sin cerrar, o la devolución, no cierran la subida', () => {
        // `completed_at` es la marca que escribe el panel solo cuando no queda ningún paso pendiente,
        // el de comprobar al 2º conductor incluido: recalcular el checklist aquí lo dejaría fuera
        assert.equal(isPickupHandoverClosed({ booking_id: NEAR, kind: 'pickup', completed_at: null }), false)
        assert.equal(isPickupHandoverClosed({ booking_id: NEAR, kind: 'return', completed_at: '2099-06-08T11:00:00Z' }), false)
        assert.deepEqual([...closedPickupBookingIds([
            { booking_id: NEAR, kind: 'pickup', completed_at: '' },
            { booking_id: FAR, kind: 'return', completed_at: '2099-12-08T11:00:00Z' },
        ])], [])
    })

    it('una reserva sin fechas no se puede situar en el calendario: no autoriza', () => {
        assert.equal(uploadWindowState(paidBooking({ start_date: null, end_date: null })), 'not_schedulable')
        assert.deepEqual(uploadableSecondDriverBookings([paidBooking({ start_date: null, end_date: null })], 'AB123456'), [])
    })

    it('sin end_date basta la fecha de recogida para situarla', () => {
        // El reloj se fija: con el real esta comprobación caducaba sola (qa-verificador, 2026-11-10).
        // Sin `end_date` el plazo lo pone la recogida, que pasa a ser también el día de la devolución;
        // las dos caras de esa frontera están en `tests/qa_plazoDevolucionSegundoConductor.test.ts`
        const sinFin = paidBooking({ start_date: '2026-11-09', end_date: null })
        assert.equal(isUploadWindowOpen(sinFin, { now: new Date('2026-11-09T12:00:00+01:00') }), true)
        assert.equal(isUploadWindowOpen(sinFin, { now: new Date('2026-11-10T12:00:00+01:00') }), false, 'pasada la recogida/devolución')
        assert.equal(isUploadWindowOpen(paidBooking({ start_date: null, end_date: null }), { now: new Date('2026-11-09T12:00:00+01:00') }), false)
    })

    it('la ruta limita los envíos por IP: antes no tenía ninguno', () => {
        const ip = '203.0.113.77'
        const now = Date.now()

        for (let i = 0; i < MAX_DOCUMENT_UPLOADS_PER_IP; i++) {
            assert.equal(registerDocumentUploadAttempt(ip, now), true, `envío ${i + 1}`)
        }
        assert.equal(registerDocumentUploadAttempt(ip, now), false, 'el límite no frena nada')
        // Sin cabecera de proxy no se limita: todos los clientes compartirían contador
        assert.equal(registerDocumentUploadAttempt(null, now), true)
    })
})

// =====================================================================================
// 4. Edad y antigüedad del carnet: solo por fecha
// =====================================================================================

describe('La edad y el carnet del 2º conductor se comprueban por fecha', () => {
    it('la subida rechaza una ficha sin fecha de nacimiento o sin fecha de carnet', () => {
        const sinNacimiento = { birthDate: null, licenseDate: '2010-01-01' }
        const sinCarnet = { birthDate: '1985-01-01', licenseDate: null }

        assert.match(secondDriverRequirementError(sinNacimiento, '2099-06-01') || '', /fecha de nacimiento/i)
        assert.match(secondDriverRequirementError(sinCarnet, '2099-06-01') || '', /expedición/i)
        assert.equal(secondDriverRequirementError({ birthDate: '1985-01-01', licenseDate: '2010-01-01' }, '2099-06-01'), null)
    })

    it('sin fecha de recogida tampoco se da por bueno', () => {
        assert.ok(secondDriverRequirementError({ birthDate: '1985-01-01', licenseDate: '2010-01-01' }, null))
    })

    describe('checkout', () => {
        let fake: ReturnType<typeof installFakeSupabase>
        const silenced = { error: console.error, warn: console.warn, log: console.log }

        beforeEach(() => {
            fake = installFakeSupabase({
                campers: [{
                    id: 'camper-1', slug: 'neo', name: 'NEO', is_active: true, status: 'active',
                    base_price_per_night: 110, deposit_amount: 2000, capacity: 3,
                }],
            })
            console.error = () => {}
            console.warn = () => {}
            console.log = () => {}
        })

        afterEach(() => {
            fake.restore()
            Object.assign(console, silenced)
        })

        const payload = (passenger: Row) => ({
            camperSlug: 'neo',
            startDate: '2099-06-01',
            endDate: '2099-06-08',
            pickupSlot: 'afternoon',
            dropoffSlot: 'morning',
            kmPackage: 'included_150',
            cancellationPolicy: 'standard',
            depositOption: 'standard_2000',
            selectedExtras: [],
            customer: {
                fullName: 'Ana Pérez',
                email: 'ana@example.com',
                phone: '+34600000000',
                dniNie: '12345678Z',
                birthDate: '1985-01-01',
                licenseDate: '2010-01-01',
                travelersCount: 2,
                passengers: [passenger],
            },
        })

        const checkout = async (passenger: Row) => {
            const res = await checkoutPost(new Request('http://localhost/api/bookings/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload(passenger)),
            }))
            return { status: res.status, json: await res.json() }
        }

        const LUIS = { fullName: 'Luis Pérez', dniNie: 'AB123456', isSecondDriver: true, driverLicenseId: 'B-99' }

        it('una edad autodeclarada ya no sustituye a la fecha de nacimiento', async () => {
            const { status, json } = await checkout({ ...LUIS, age: 40, licenseDate: '2010-01-01' })

            assert.equal(status, 400, 'la edad se perdía al guardar la ficha: nadie podía recalcularla')
            assert.match(json.error, /fecha de nacimiento/i)
            assert.equal(fake.tables.bookings.length, 0)
        })

        it('unos años de carnet autodeclarados ya no sustituyen a la fecha de expedición', async () => {
            const { status, json } = await checkout({ ...LUIS, birthDate: '1985-01-01', licenseYears: 10 })

            assert.equal(status, 400)
            assert.match(json.error, /expedición/i)
            assert.equal(fake.tables.bookings.length, 0)
        })

        it('con las dos fechas la reserva se crea y las guarda', async () => {
            const { status, json } = await checkout({ ...LUIS, birthDate: '1985-01-01', licenseDate: '2010-01-01' })

            assert.equal(status, 200, json.error)
            const [saved] = fake.tables.bookings
            assert.equal(saved.passengers[0].birthDate, '1985-01-01')
            assert.equal(saved.passengers[0].licenseDate, '2010-01-01')
        })
    })
})

// =====================================================================================
// 2. El contrato: el perfil no nombra a nadie
// =====================================================================================

describe('Contrato: el perfil solo completa el nº de carnet', () => {
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

    it('una reserva que solo cobró el suplemento no nombra al del perfil', () => {
        const data = generateContractData(
            booking({ secondDriver: true, secondDriverRatePerDay: 5, secondDriverSupplement: 35 }),
            PROFILE_WITH
        )

        assert.equal(data.secondDriver!.fullName, 'Pendiente de verificación')
        assert.equal(data.secondDriver!.dniNie, 'Pendiente')
        assert.equal(data.secondDriver!.driverLicenseId, 'Pendiente', 'sin documento no hay a quién completar')
    })

    it('el perfil completa el carnet solo si es la misma persona que la reserva identifica', () => {
        const misma = generateContractData(
            booking({ secondDriver: true, secondDriverSupplement: 35 }, { passengers: [{ ...AUTHORIZED }] }),
            PROFILE_WITH
        )
        const otra = generateContractData(
            booking({ secondDriver: true, secondDriverSupplement: 35 }, {
                // Su ficha no trae carnet: el del perfil es de otra persona y no puede completarlo
                passengers: [{ ...AUTHORIZED, fullName: 'Marta Ruiz', dniNie: 'X1234567L', driverLicenseId: '' }],
            }),
            PROFILE_WITH
        )

        assert.equal(misma.secondDriver!.driverLicenseId, 'B-99')
        assert.equal(otra.secondDriver!.fullName, 'Marta Ruiz')
        assert.equal(otra.secondDriver!.driverLicenseId, 'Pendiente', 'el carnet de otra persona no entra')
    })

    it('sin dato de gratuidad el contrato no la afirma', () => {
        assert.match(
            secondDriverSupplementText({ supplement: 0, ratePerDay: 0, included: false }),
            /No consta suplemento/
        )
        assert.match(
            secondDriverSupplementText({ supplement: 0, ratePerDay: 0, included: true }),
            /incluido sin coste adicional/
        )
    })
})

describe('Comparar nombres de personas', () => {
    it('la forma no cambia a la persona', () => {
        assert.equal(sameDriverName('Luis Pérez', '  luis   perez '), true)
        assert.equal(sameDriverName('Marcel·la Puig', 'marcel·la puig'), true)
        assert.equal(sameDriverName("O'Connor Liam", '’O‘Connor Liam'.replace('’', '').replace('‘', "'")), true)
    })

    it('otro nombre es otra persona, y un nombre vacío no coincide con nada', () => {
        assert.equal(sameDriverName('Luis Pérez', 'Mario Impostor'), false)
        assert.equal(sameDriverName('Luis Pérez', 'Luis'), false)
        assert.equal(sameDriverName('', ''), false)
        assert.equal(sameDriverName('   ', 'Luis Pérez'), false)
        assert.equal(sameDriverName(null, undefined), false)
    })
})
