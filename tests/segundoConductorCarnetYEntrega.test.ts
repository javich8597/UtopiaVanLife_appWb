import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { installFlows, step5Payload, NEO } from './helpers/qaFlows'
import { POST as uploadPost } from '../app/api/upload-driver-docs/route'
import { validateBookingPassengers } from '../app/api/bookings/checkout/route'
import { validateStep5, validateSecondDriverLicenseId, Step5Customer } from '../app/[locale]/reserva/[slug]/types'
import { driverFieldError } from '../lib/driverDocuments'
import {
    bookingSecondDriver,
    closedPickupBookingIds,
    isPickupHandoverClosed,
    isUploadWindowOpen,
    uploadableSecondDriverBookings,
    uploadWindowClosedMessage,
    uploadWindowRejection,
    uploadWindowState,
    uploadDeadlineDay,
} from '../lib/booking/secondDriver'
import { generateContractData } from '../lib/contracts/contractEngine'
import { secondDriverSupplementText } from '../lib/contracts/pdfGenerator'

/**
 * Las dos decisiones de Javier del 2026-11-09 sobre el 2º conductor:
 *
 * 1. El paso 5 pide su NÚMERO DE CARNET. Antes no lo pedía, así que ninguna ficha lo traía y el
 *    contrato imprimía siempre «Pendiente» —el único sitio del que puede salir es la ficha de la
 *    reserva—. Se valida con la misma regla que la subida (`LICENSE_ID_PATTERN`) y el servidor lo
 *    exige igual que las dos fechas. Las reservas ya hechas no lo tienen: ahí sigue pendiente.
 * 2. El plazo de subida deja de contarse en días (`UPLOAD_GRACE_DAYS`) y se cierra con la ENTREGA:
 *    se admite documentación mientras no haya una entrega de recogida cerrada (`handovers`,
 *    `kind: 'pickup'`, con `completed_at`, que es lo que el panel escribe cuando no queda ningún
 *    paso pendiente). Consecuencia nueva: sin entrega registrada la subida sigue abierta aunque el
 *    viaje haya pasado.
 *
 * Lo que NO prueba este archivo: Supabase real, RLS, Storage real, columnas reales ni el navegador.
 */

const ORDER = '1234abcd5678'
const B1 = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const B2 = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'

/** Ficha del 2º conductor tal como la guarda el checkout, con su nº de carnet */
const AUTHORIZED = {
    fullName: 'Luis Pérez',
    dniNie: 'AB123456',
    driverLicenseId: 'B-7788990',
    isSecondDriver: true,
    birthDate: '1985-01-01',
    licenseDate: '2010-01-01',
}

const paidBooking = (overrides: Row = {}): Row => ({
    id: B1,
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

const closedPickup = (bookingId: string, at = '2099-12-01T15:10:00Z'): Row =>
    ({ id: `h-${bookingId}`, booking_id: bookingId, kind: 'pickup', completed_at: at })

// =====================================================================================
// 1. El paso 5 pide el nº de carnet del 2º conductor
// =====================================================================================

const BASE_CUSTOMER: Step5Customer = {
    fullName: 'Ana Pérez Ruiz',
    dniNie: '12345678Z',
    birthDate: '1990-01-01',
    licenseDate: '2015-01-01',
    email: 'ana@example.com',
    phone: '600000000',
    phoneCountryCode: '+34',
    depositOption: 'standard_2000',
    address: 'Calle Mayor 1',
    city: 'Palma',
    postalCode: '07001',
    country: 'España',
    travelersCount: 1,
    passengers: [],
    acceptTerms: true,
    acceptPrivacy: true,
}

describe('Paso 5: el nº de carnet del 2º conductor', () => {
    const companionDriver = (extra: Row = {}) => ({
        fullName: 'Luis Pérez Gil',
        dniNie: 'X1234567L',
        birthDate: '1985-01-01',
        licenseDate: '2010-01-01',
        isSecondDriver: true,
        ...extra,
    })

    it('un acompañante marcado como 2º conductor sin nº de carnet no pasa el paso 5', () => {
        const { isValid, errors } = validateStep5({
            ...BASE_CUSTOMER, travelersCount: 2, passengers: [companionDriver()],
        }, 4)

        assert.equal(isValid, false)
        assert.ok(errors.passenger_2_driverLicenseId, 'el paso 5 tiene que pedir el número')
        assert.match(errors.passenger_2_driverLicenseId, /permiso de conducir/i)
    })

    it('con el nº de carnet pasa, y se valida con la regla de la subida', () => {
        const ok = validateStep5({
            ...BASE_CUSTOMER, travelersCount: 2, passengers: [companionDriver({ driverLicenseId: 'B-7788990' })],
        }, 4)
        assert.equal(ok.isValid, true, JSON.stringify(ok.errors))

        // LICENSE_ID_PATTERN: letras, números y . / - entre 3 y 30 caracteres
        for (const bad of ['B', 'B@7788990', 'B'.repeat(31)]) {
            const res = validateStep5({
                ...BASE_CUSTOMER, travelersCount: 2, passengers: [companionDriver({ driverLicenseId: bad })],
            }, 4)
            assert.equal(res.isValid, false, `debería rechazar ${JSON.stringify(bad)}`)
            assert.ok(res.errors.passenger_2_driverLicenseId, JSON.stringify(bad))
        }
    })

    it('el bloque "solo" de 1 viajero también lo pide', () => {
        const sinCarnet = validateStep5({
            ...BASE_CUSTOMER,
            travelersCount: 1,
            secondDriverSoloEnabled: true,
            secondDriverSolo: { fullName: 'Luis Pérez Gil', dniNie: 'X1234567L', birthDate: '1985-01-01', licenseDate: '2010-01-01' },
        }, 4)
        assert.equal(sinCarnet.isValid, false)
        assert.ok(sinCarnet.errors.secondDriverSolo_driverLicenseId)

        const conCarnet = validateStep5({
            ...BASE_CUSTOMER,
            travelersCount: 1,
            secondDriverSoloEnabled: true,
            secondDriverSolo: {
                fullName: 'Luis Pérez Gil', dniNie: 'X1234567L', birthDate: '1985-01-01',
                licenseDate: '2010-01-01', driverLicenseId: 'B-7788990',
            },
        }, 4)
        assert.equal(conCarnet.isValid, true, JSON.stringify(conCarnet.errors))
    })

    // La subida compara el nº de carnet del formulario con el de la ficha: si las dos puntas no
    // validaran igual, el checkout aceptaría un número que después la subida rechaza
    it('lo que acepta el paso 5 lo acepta la subida de documentación, y al revés', () => {
        for (const value of ['B-7788990', '12345678 Z', 'ES/123.456', 'ABC']) {
            const paso5 = validateSecondDriverLicenseId(value).isValid
            const data = new FormData()
            data.append('secondDriverLicense', value)
            const subida = driverFieldError(data) === null
            assert.equal(paso5, subida, `${JSON.stringify(value)}: paso 5 ${paso5}, subida ${subida}`)
        }
        for (const value of ['B', 'B@7788990']) {
            assert.equal(validateSecondDriverLicenseId(value).isValid, false, value)
            const data = new FormData()
            data.append('secondDriverLicense', value)
            assert.ok(driverFieldError(data), `la subida también rechaza ${value}`)
        }
    })
})

describe('Checkout: el nº de carnet del 2º conductor es obligatorio en el servidor', () => {
    const rentalStart = new Date('2099-06-01T00:00:00Z')
    const raw = (extra: Row = {}) => [{
        fullName: 'Luis Pérez', dniNie: 'X1234567L', isSecondDriver: true,
        birthDate: '1985-01-01', licenseDate: '2010-01-01', ...extra,
    }]

    it('sin nº de carnet no valida, igual que sin las fechas', () => {
        const result = validateBookingPassengers(raw(), rentalStart)

        assert.equal(result.isValid, false)
        assert.match(result.error!, /permiso de conducir/i)
        assert.deepEqual(result.passengers, [])
    })

    it('con un nº de carnet que no cumple la regla de la subida tampoco', () => {
        const result = validateBookingPassengers(raw({ driverLicenseId: 'B@1' }), rentalStart)

        assert.equal(result.isValid, false)
        assert.match(result.error!, /permiso de conducir/i)
    })

    it('lo guarda normalizado en la ficha, y no guarda carnet de quien no conduce', () => {
        const result = validateBookingPassengers([
            { fullName: 'Ana Ruiz', dniNie: '12345678Z', driverLicenseId: 'B-0000001' },
            ...raw({ driverLicenseId: '  B-7788990 ' }),
        ], rentalStart)

        assert.equal(result.isValid, true, result.error)
        assert.equal(result.passengers[0].driverLicenseId, null, 'un acompañante que no conduce no aporta carnet')
        assert.equal(result.passengers[1].driverLicenseId, 'B-7788990')
    })

    it('un 2º conductor enviado aparte (bloque "solo") también lo exige', () => {
        const sin = validateBookingPassengers([], rentalStart, {
            fullName: 'Luis Pérez', dniNie: 'X1234567L', birthDate: '1985-01-01', licenseDate: '2010-01-01',
        })
        assert.equal(sin.isValid, false)
        assert.match(sin.error!, /permiso de conducir/i)

        const con = validateBookingPassengers([], rentalStart, {
            fullName: 'Luis Pérez', dniNie: 'X1234567L', birthDate: '1985-01-01',
            licenseDate: '2010-01-01', driverLicenseId: 'B-7788990',
        })
        assert.equal(con.isValid, true, con.error)
        assert.equal(con.passengers[0].driverLicenseId, 'B-7788990')
    })
})

describe('Checkout → ficha → contrato: el número llega al contrato', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn, log: console.log }

    beforeEach(() => {
        flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
        console.error = () => {}
        console.warn = () => {}
        console.log = () => {}
    })
    afterEach(() => { flows.fake.restore(); Object.assign(console, silenced) })

    it('la reserva creada guarda el nº de carnet y el contrato lo imprime', async () => {
        const { status, json } = await flows.checkout(step5Payload({}, {
            travelersCount: 2,
            passengers: [{
                fullName: 'Luis Pérez', dniNie: 'X1234567L', isSecondDriver: true,
                birthDate: '1985-01-01', licenseDate: '2010-01-01', driverLicenseId: 'B-7788990',
            }],
        }))

        assert.equal(status, 200, json.error)
        const saved = flows.fake.tables.bookings[0]
        assert.equal(saved.passengers[0].driverLicenseId, 'B-7788990')

        // La ficha de la reserva es la única fuente de los tres datos de esa persona
        const driver = bookingSecondDriver(saved)
        assert.equal(driver?.licenseId, 'B-7788990')

        const contract = generateContractData(saved, null, null)
        assert.equal(contract.secondDriver?.driverLicenseId, 'B-7788990')
        assert.ok(!/Pendiente/.test(String(contract.secondDriver?.driverLicenseId)))
        // El PDF lo faculta con ESE permiso
        assert.match(
            `permiso de conducción nº ${contract.secondDriver?.driverLicenseId}`,
            /permiso de conducción nº B-7788990/,
        )
        assert.ok(secondDriverSupplementText(contract.secondDriver!).length > 0)
    })

    it('una reserva anterior al cambio no trae el número: sigue «Pendiente» y no rompe nada', () => {
        const antigua = paidBooking({
            passengers: [{ fullName: 'Luis Pérez', dniNie: 'AB123456', isSecondDriver: true, birthDate: '1985-01-01', licenseDate: '2010-01-01' }],
        })

        const driver = bookingSecondDriver(antigua)
        assert.equal(driver?.licenseId, '')
        assert.equal(driver?.fullName, 'Luis Pérez', 'lo demás de la ficha sigue ahí')

        const contract = generateContractData(antigua, null, null)
        assert.equal(contract.secondDriver?.driverLicenseId, 'Pendiente')
        assert.equal(contract.secondDriver?.dniNie, 'AB123456')
    })
})

// =====================================================================================
// 2. El plazo de subida se cierra con la entrega de llaves
// =====================================================================================

describe('Plazo de subida: lo cierra la entrega, no el calendario', () => {
    it('sin entrega registrada la subida sigue abierta mientras no se haya devuelto la camper', () => {
        // Regla nueva (Javier, 2026-11-10): se admite hasta el día de la devolución incluido y ni un
        // día más. Antes había un tope de un mes DESPUÉS de devolverla, que esta prueba daba por bueno
        const reciente = paidBooking({ status: 'active', start_date: '2026-10-01', end_date: '2026-10-08' })

        assert.equal(uploadWindowState(reciente, { now: new Date('2026-10-05T10:00:00Z') }), 'open', 'viaje en curso')
        assert.equal(isUploadWindowOpen(reciente, { now: new Date('2026-10-08T10:00:00Z') }), true, 'el día de la devolución')
        assert.equal(uploadWindowClosedMessage('open'), null)
        // Y una semana después de devolverla ya no: el tope de un mes está retirado
        assert.equal(uploadWindowState(reciente, { now: new Date('2026-10-15T10:00:00Z') }), 'returned')
    })

    // Cierre de respaldo (decisión de Javier, 2026-11-10): la entrega es la que cierra el plazo, pero
    // una reserva de la que nadie registró la entrega se quedaba admitiendo documentación para
    // siempre. El día de la devolución la cierra igual, que es lo que ya hacía el panel del cliente
    it('un viaje devuelto del que nadie registró la entrega ya no admite documentación', () => {
        const viejo = paidBooking({ status: 'completed', start_date: '2020-06-01', end_date: '2020-06-08' })

        assert.equal(uploadWindowState(viejo), 'returned')
        assert.equal(isUploadWindowOpen(viejo), false)
        assert.match(uploadWindowClosedMessage('returned')!, /el día de la devolución/i)
    })

    it('el plazo es el día de la devolución: ese día sigue abierto, el siguiente ya no', () => {
        const enero = paidBooking({ start_date: '2026-01-25', end_date: '2026-01-31' })

        assert.equal(uploadDeadlineDay(enero), '2026-01-31')
        assert.equal(uploadWindowState(enero, { now: new Date('2026-01-31T23:30:00+01:00') }), 'open', 'medianoche de Madrid')
        assert.equal(uploadWindowState(enero, { now: new Date('2026-02-01T00:30:00+01:00') }), 'returned')
        assert.equal(uploadDeadlineDay(paidBooking({ start_date: null, end_date: null })), '')
    })

    it('sin end_date el plazo lo pone la recogida', () => {
        const sinFin = paidBooking({ start_date: '2026-10-10', end_date: null })

        assert.equal(uploadDeadlineDay(sinFin), '2026-10-10')
        assert.equal(uploadWindowState(sinFin, { now: new Date('2026-10-10T12:00:00+02:00') }), 'open')
        assert.equal(uploadWindowState(sinFin, { now: new Date('2026-10-11T12:00:00+02:00') }), 'returned')
    })

    it('con la entrega cerrada manda la entrega, aunque la reserva no tenga fechas', () => {
        // Decirle «no tiene fecha de recogida» a quien ya tiene la camper confunde: el motivo real
        // es la entrega, y por eso se mira antes que el tope y antes que las fechas
        const closedPickups = closedPickupBookingIds([closedPickup(B1)])
        const sinFechas = paidBooking({ id: B1, start_date: null, end_date: null })

        assert.equal(uploadWindowState(sinFechas, { closedPickups }), 'handed_over')
        assert.match(uploadWindowRejection([sinFechas], { closedPickups })!, /ya está entregada/i)
    })

    it('una reserva ya devuelta no compite con la próxima: solo entra la del viaje por delante', () => {
        const now = new Date('2026-11-10T10:00:00Z')
        const devuelta = paidBooking({ id: B1, status: 'completed', start_date: '2026-10-20', end_date: '2026-10-27' })
        const proxima = paidBooking({ id: B2, start_date: '2026-12-20', end_date: '2026-12-27' })

        for (const rows of [[devuelta, proxima], [proxima, devuelta]]) {
            const elegidas = uploadableSecondDriverBookings(rows, 'AB123456', { now }).map(c => c.row.id)
            assert.deepEqual(elegidas, [B2], 'la devuelta ya no es candidata')
        }
    })

    it('una reserva cancelada o sin pagar no entra como candidata, aunque esté en fechas', () => {
        const now = new Date('2026-11-10T10:00:00Z')
        const cancelada = paidBooking({ id: B1, status: 'cancelled', start_date: '2026-12-20', end_date: '2026-12-27' })
        const sinPagar = paidBooking({ id: B2, payment_status: 'pending', start_date: '2026-12-20', end_date: '2026-12-27' })

        assert.deepEqual(uploadableSecondDriverBookings([cancelada, sinPagar], 'AB123456', { now }), [])
    })

    it('con la entrega cerrada manda la entrega, aunque además se haya pasado el mes', () => {
        const closedPickups = closedPickupBookingIds([closedPickup(B1)])
        const viejo = paidBooking({ id: B1, status: 'completed', start_date: '2020-06-01', end_date: '2020-06-08' })

        assert.equal(uploadWindowState(viejo, { closedPickups }), 'handed_over')
        assert.match(uploadWindowRejection([viejo], { closedPickups })!, /ya está entregada/i)
    })

    it('con la entrega de recogida cerrada, no', () => {
        const closedPickups = closedPickupBookingIds([closedPickup(B1)])

        assert.equal(uploadWindowState(paidBooking(), { closedPickups }), 'handed_over')
        assert.match(uploadWindowClosedMessage('handed_over')!, /ya está entregada/i)
    })

    it('«cerrada» es `completed_at`: una entrega a medias o la devolución no cuentan', () => {
        assert.equal(isPickupHandoverClosed(closedPickup(B1)), true)
        assert.equal(isPickupHandoverClosed({ booking_id: B1, kind: 'pickup', completed_at: null }), false)
        assert.equal(isPickupHandoverClosed({ booking_id: B1, kind: 'pickup', completed_at: '' }), false)
        assert.equal(isPickupHandoverClosed({ booking_id: B1, kind: 'return', completed_at: '2099-12-08T11:00:00Z' }), false)
        assert.equal(isPickupHandoverClosed(null), false)
    })

    it('el cierre por fechas queda como respaldo: sin fechas no autoriza nada', () => {
        const sinFechas = paidBooking({ start_date: null, end_date: null })

        assert.equal(uploadWindowState(sinFechas), 'not_schedulable')
        assert.match(uploadWindowClosedMessage('not_schedulable')!, /no tiene fecha de recogida/i)
        // Con varios motivos a la vez, el que se le cuenta al cliente es el más probable
        assert.match(
            uploadWindowRejection([sinFechas, paidBooking({ start_date: '2020-06-01', end_date: '2020-06-08' })])!,
            /el día de la devolución/i,
            'la devolución pesa más que la falta de fechas'
        )
    })

    it('con varias reservas, la documentación va a la que no está entregada', () => {
        const entregada = paidBooking({ id: B1, start_date: '2099-06-01', end_date: '2099-06-08' })
        const porEntregar = paidBooking({ id: B2, start_date: '2099-12-01', end_date: '2099-12-08' })
        const closedPickups = closedPickupBookingIds([closedPickup(B1), { booking_id: B2, kind: 'pickup', completed_at: null }])

        const elegidas = uploadableSecondDriverBookings([entregada, porEntregar], 'AB123456', { closedPickups })

        assert.deepEqual(elegidas.map(c => c.row.id), [B2])
        assert.equal(uploadWindowRejection([entregada, porEntregar], { closedPickups }), null, 'alguna sigue admitiendo')
        assert.match(uploadWindowRejection([entregada], { closedPickups })!, /ya está entregada/i)
    })
})

describe('Subida: la ruta cierra el plazo con la entrega', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({
            bookings: [paidBooking()],
            handovers: [],
            users: [{ id: 'u1', verification_status: 'not_submitted', full_name: 'Ana Pérez' }],
        })
        fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
        console.error = () => {}
        console.warn = () => {}
    })

    afterEach(() => { fake.restore(); Object.assign(console, silenced) })

    function form(fields: Row = {}) {
        const data = new FormData()
        data.append('fullName', 'Ana Pérez')
        data.append('driverLicenseIssueDate', '2015-01-01')
        data.append('driverLicenseExpiryDate', '2035-01-01')
        data.append('hasSecondDriver', 'true')
        data.append('secondDriverFullName', 'Luis Pérez')
        data.append('secondDriverDni', 'AB123456')
        data.append('secondDriverLicense', 'B-7788990')
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
        const res = await uploadPost(new NextRequest('http://localhost/api/upload-driver-docs', { method: 'POST', headers, body }))
        return { status: res.status, json: await res.json() }
    }

    it('con la entrega cerrada responde que la camper ya está entregada y no escribe nada', async () => {
        fake.tables.handovers = [closedPickup(B1)]

        const { status, json } = await upload(form())

        assert.equal(status, 400)
        assert.match(json.error, /ya está entregada/i)
        assert.match(json.error, /escríbenos/i)
        assert.deepEqual(fake.writesTo('bookings'), [], 'no se toca la reserva entregada')
        assert.deepEqual(fake.writesTo('users'), [])
    })

    it('con la entrega empezada pero sin cerrar sí se admite', async () => {
        fake.tables.handovers = [{ id: 'h1', booking_id: B1, kind: 'pickup', completed_at: null }]

        const { status, json } = await upload(form())

        assert.equal(status, 200, json.error)
        assert.equal(fake.tables.bookings[0].second_driver_dni, 'AB123456')
    })

    it('la devolución cerrada no cierra el plazo: lo cierra la recogida', async () => {
        fake.tables.handovers = [{ id: 'h1', booking_id: B1, kind: 'return', completed_at: '2099-12-08T11:00:00Z' }]

        const { status, json } = await upload(form())

        assert.equal(status, 200, json.error)
    })

    // La entrega es de la reserva, como el 2º conductor: la de OTRA reserva no cierra esta
    it('la entrega cerrada de otra reserva no cierra esta', async () => {
        fake.tables.handovers = [closedPickup(B2)]

        const { status, json } = await upload(form())

        assert.equal(status, 200, json.error)
    })
})
