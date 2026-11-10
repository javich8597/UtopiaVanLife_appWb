import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST } from '../app/api/upload-driver-docs/route'
import {
    closedPickupBookingIds,
    isUploadWindowOpen,
    uploadableSecondDriverBookings,
    uploadDeadlineDay,
    uploadWindowClosedMessage,
    uploadWindowRejection,
    uploadWindowState,
} from '../lib/booking/secondDriver'
import { upcomingSecondDriverBookings } from '../lib/user/secondDriverBookings'
import { secondDriverAlerts } from '../lib/admin/secondDriverAlerts'

/**
 * EL PLAZO DE SUBIDA DEL 2º CONDUCTOR TERMINA EL DÍA DE LA DEVOLUCIÓN, INCLUIDO
 * (decisión de Javier, 2026-11-10), verificado por `qa-verificador` el 2026-11-10.
 *
 * Sustituye a `tests/qa_topeSubidaSegundoConductor.test.ts`, que fijaba el tope anterior de un mes
 * DESPUÉS de la devolución: esa aritmética de meses (`UPLOAD_CAP_MONTHS`, `uploadCapDay`) queda
 * retirada por redundante, porque el día de la devolución siempre cierra antes. Lo que se conserva
 * de aquel archivo es lo que sigue valiendo y ningún otro test cubre:
 *
 * 1. La frontera está en la MEDIANOCHE DE MADRID y no en la de UTC, medida en invierno (CET), en
 *    verano (CEST) y en los dos domingos del cambio de hora de la UE de 2026. Sin esto, cambiar
 *    `timeZone: 'Europe/Madrid'` por `'UTC'` en `madridDay` dejaba la suite en verde (mutación que
 *    sobrevivió el 2026-11-10).
 * 2. Que no queda aritmética de meses: una devolución a fin de mes o a fin de año se cierra al día
 *    siguiente, no al mes siguiente. Es lo que distingue la regla nueva de la vieja.
 * 3. Una reserva sin `end_date` se sitúa por `start_date`, con reloj FIJO (los tests anclados al
 *    reloj real caducan solos).
 * 4. La ruta real `/api/upload-driver-docs`: el día de la devolución responde 200 y escribe; el
 *    siguiente responde 400 sin tocar `bookings` ni Storage, incluso con fotos adjuntas, incluso
 *    cuando el perfil del titular ya guarda a esa misma persona (el camino que en QA-SD-14 devolvía
 *    un 200 «guardado con éxito»), y la entrega de llaves sigue mandando sobre las fechas.
 * 5. Que la regla y la pantalla (`lib/user/secondDriverBookings.ts`) ofrecen lo mismo, con las dos
 *    discrepancias que quedan pinchadas como `{ todo: 'QA-SD-15' }` y `{ todo: 'QA-SD-16' }`.
 *
 * Lo que NO prueba: Supabase real, RLS, Storage real, columnas reales ni el navegador.
 */

const ORDER = '9876abcd4321'
const MINE = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const OTHER = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])

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
    // 'active', no 'completed': estos casos miden el cierre por FECHAS, y una reserva cuya devolución
    // ya está registrada se cierra por el estado antes de llegar a la frontera del día
    status: 'active',
    start_date: '2026-10-01',
    end_date: '2026-10-08',
    passengers: [{ ...AUTHORIZED }],
    pricing_breakdown: { depositOption: 'standard_2000', secondDriver: true, secondDriverSupplement: 35 },
    ...overrides,
})

/** Mediodía de Madrid de ese día, para situar «hoy» sin depender del reloj de la máquina */
const madridNoon = (day: string) => new Date(`${day}T12:00:00+01:00`)

/** La reserva devuelta ese día, para medir la frontera sobre una devolución concreta */
const returnedOn = (day: string) => paidBooking({ start_date: day, end_date: day })

describe('Plazo de subida: el día de la devolución y el siguiente', () => {
    it('el plazo es el día de la devolución, no un mes después', () => {
        const row = paidBooking() // devolución 2026-10-08

        assert.equal(uploadDeadlineDay(row), '2026-10-08')
        assert.equal(uploadWindowState(row, { now: madridNoon('2026-10-08') }), 'open')
        assert.equal(uploadWindowState(row, { now: madridNoon('2026-10-09') }), 'returned')
        // Con el tope de un mes que había antes, estos dos días seguían abiertos
        assert.equal(uploadWindowState(row, { now: madridNoon('2026-10-15') }), 'returned')
        assert.equal(uploadWindowState(row, { now: madridNoon('2026-11-08') }), 'returned')
    })

    it('en invierno (CET) la frontera es la medianoche de Madrid, no la de UTC', () => {
        const row = returnedOn('2026-11-08')

        // 22:59:59Z sigue siendo el día 8 en Madrid; 23:00:00Z ya es el 9 (en UTC seguiría siendo el 8)
        assert.equal(uploadWindowState(row, { now: new Date('2026-11-08T22:59:59Z') }), 'open')
        assert.equal(uploadWindowState(row, { now: new Date('2026-11-08T23:00:00Z') }), 'returned')
        assert.equal(uploadWindowState(row, { now: new Date('2026-11-08T00:00:00+01:00') }), 'open', 'desde la primera hora')
    })

    it('en verano (CEST) la frontera se adelanta una hora más respecto a UTC', () => {
        const row = returnedOn('2026-07-10')

        // 21:59:59Z es el día 10 en Madrid; 22:00:00Z ya es el 11, y en UTC faltarían dos horas
        assert.equal(uploadWindowState(row, { now: new Date('2026-07-10T21:59:59Z') }), 'open')
        assert.equal(uploadWindowState(row, { now: new Date('2026-07-10T22:00:00Z') }), 'returned')
        assert.equal(uploadWindowState(row, { now: new Date('2026-07-10T23:30:00Z') }), 'returned')
    })

    it('los dos domingos del cambio de hora de la UE de 2026 no desplazan la frontera', () => {
        // 2026-03-29 entra el horario de verano (+02) y 2026-10-25 vuelve el de invierno (+01)
        const casos: Array<[string, string, string]> = [
            ['2026-03-28', '2026-03-28T22:59:59Z', '2026-03-28T23:00:00Z'], // víspera, todavía +01
            ['2026-03-29', '2026-03-29T21:59:59Z', '2026-03-29T22:00:00Z'], // ya +02
            ['2026-10-24', '2026-10-24T21:59:59Z', '2026-10-24T22:00:00Z'], // víspera, todavía +02
            ['2026-10-25', '2026-10-25T22:59:59Z', '2026-10-25T23:00:00Z'], // ya +01
        ]

        for (const [devolucion, ultimoAbierto, primeroCerrado] of casos) {
            const row = returnedOn(devolucion)
            assert.equal(uploadWindowState(row, { now: new Date(ultimoAbierto) }), 'open', `${devolucion}: ${ultimoAbierto}`)
            assert.equal(uploadWindowState(row, { now: new Date(primeroCerrado) }), 'returned', `${devolucion}: ${primeroCerrado}`)
        }
    })

    it('fin de mes y fin de año se cierran al DÍA siguiente, sin aritmética de meses', () => {
        // Cada una de estas devoluciones seguía abierta un mes entero con la regla anterior
        assert.equal(uploadWindowState(returnedOn('2026-01-31'), { now: madridNoon('2026-01-31') }), 'open')
        assert.equal(uploadWindowState(returnedOn('2026-01-31'), { now: madridNoon('2026-02-01') }), 'returned')
        assert.equal(uploadWindowState(returnedOn('2026-01-31'), { now: madridNoon('2026-02-28') }), 'returned', 'el tope de un mes está retirado')
        assert.equal(uploadWindowState(returnedOn('2024-02-29'), { now: madridNoon('2024-02-29') }), 'open', 'bisiesto')
        assert.equal(uploadWindowState(returnedOn('2024-02-29'), { now: madridNoon('2024-03-01') }), 'returned')
        assert.equal(uploadWindowState(returnedOn('2026-12-31'), { now: new Date('2026-12-31T22:59:59Z') }), 'open')
        assert.equal(uploadWindowState(returnedOn('2026-12-31'), { now: new Date('2026-12-31T23:00:00Z') }), 'returned', 'salto de año')
        assert.equal(uploadWindowState(returnedOn('2026-12-31'), { now: madridNoon('2027-01-31') }), 'returned')
    })

    it('una reserva futura y una en curso siguen abiertas', () => {
        const futura = paidBooking({ status: 'confirmed', start_date: '2027-05-01', end_date: '2027-05-08' })
        const enCurso = paidBooking({ status: 'active', start_date: '2026-11-07', end_date: '2026-11-14' })

        assert.equal(uploadWindowState(futura, { now: madridNoon('2026-11-10') }), 'open')
        assert.equal(uploadWindowState(enCurso, { now: madridNoon('2026-11-10') }), 'open')
        assert.equal(uploadWindowState(enCurso, { now: madridNoon('2026-11-14') }), 'open', 'el día de la devolución')
        assert.equal(uploadWindowState(enCurso, { now: madridNoon('2026-11-15') }), 'returned')
    })

    it('el cierre por fechas sigue vivo para los estados que NO registran la devolución', () => {
        // Este es el caso para el que existe el cierre de respaldo: nadie registró la entrega ni la
        // devolución, así que la reserva se queda en `confirmed` o `active` y solo la fecha la cierra.
        // Los estados se escriben aquí a propósito: si el fixture cambiara de defecto otra vez, estas
        // fronteras tienen que seguir midiendo la fecha y no el estado
        for (const status of ['confirmed', 'active', 'pending']) {
            const row = paidBooking({ status, start_date: '2026-11-03', end_date: '2026-11-10' })

            assert.equal(uploadWindowState(row, { now: madridNoon('2026-11-10') }), 'open', `${status}: el día de la devolución`)
            assert.equal(uploadWindowState(row, { now: new Date('2026-11-10T22:59:59Z') }), 'open', `${status}: antes de medianoche en Madrid`)
            assert.equal(uploadWindowState(row, { now: new Date('2026-11-10T23:00:00Z') }), 'returned', `${status}: pasada la medianoche`)
            assert.deepEqual(
                uploadableSecondDriverBookings([row], 'AB123456', { now: madridNoon('2026-11-10') }).map(c => c.row.id),
                [MINE],
                `${status}: candidata el día de la devolución`
            )
        }
    })

    it('la devolución REGISTRADA (`completed`) cierra por estado, sin mirar el calendario', () => {
        // Decisión de Javier (2026-11-10): con la devolución registrada la camper ya está revisada en
        // persona. Cierra aunque la devolución sea hoy, aunque sea futura y aunque falten las fechas
        const hoy = paidBooking({ status: 'completed', start_date: '2026-11-03', end_date: '2026-11-10' })
        const futura = paidBooking({ status: 'completed', start_date: '2027-05-01', end_date: '2027-05-08' })
        const sinFechas = paidBooking({ status: 'completed', start_date: null, end_date: null })
        const now = madridNoon('2026-11-10')

        assert.equal(uploadWindowState(hoy, { now }), 'returned', 'el día de la devolución ya no cuenta')
        assert.equal(uploadWindowState(futura, { now }), 'returned', 'ni con el viaje por delante')
        assert.equal(uploadWindowState(sinFechas, { now }), 'returned', 'el estado pesa más que la falta de fechas')
        assert.deepEqual(uploadableSecondDriverBookings([hoy, futura], 'AB123456', { now }), [])
        // Y la entrega de llaves sigue mandando sobre el estado: es lo que de verdad le pasó
        const closedPickups = closedPickupBookingIds([{ booking_id: MINE, kind: 'pickup', completed_at: '2026-11-03T10:00:00Z' }])
        assert.equal(uploadWindowState(hoy, { now, closedPickups }), 'handed_over')
        assert.match(uploadWindowRejection([hoy], { now, closedPickups })!, /ya está entregada/i)
    })

    it('sin end_date se sitúa por start_date (con reloj fijo, no con el de la máquina)', () => {
        const soloRecogida = paidBooking({ start_date: '2026-10-10', end_date: null })

        assert.equal(uploadDeadlineDay(soloRecogida), '2026-10-10')
        assert.equal(uploadWindowState(soloRecogida, { now: madridNoon('2026-10-10') }), 'open')
        assert.equal(uploadWindowState(soloRecogida, { now: madridNoon('2026-10-11') }), 'returned')
        // Y la frontera de esa reserva también es la medianoche de Madrid
        assert.equal(uploadWindowState(soloRecogida, { now: new Date('2026-10-10T22:00:00Z') }), 'returned')
    })

    it('sin ninguna fecha no se puede situar: ni abierta ni devuelta', () => {
        const sinFechas = paidBooking({ start_date: null, end_date: null })

        assert.equal(uploadDeadlineDay(sinFechas), '')
        assert.equal(uploadWindowState(sinFechas, { now: madridNoon('2026-11-10') }), 'not_schedulable')
        assert.equal(isUploadWindowOpen(sinFechas, { now: madridNoon('2026-11-10') }), false)
    })
})

describe('Plazo de subida: qué motivo se le cuenta al cliente', () => {
    const closedPickups = closedPickupBookingIds([
        { booking_id: MINE, kind: 'pickup', completed_at: '2026-10-01T15:00:00Z' },
    ])
    const now = madridNoon('2026-11-10')

    it('con la recogida cerrada el motivo es la entrega, aunque además se haya devuelto', () => {
        const entregadaYDevuelta = paidBooking()

        assert.equal(uploadWindowState(entregadaYDevuelta, { now }), 'returned', 'sin la entrega sería la devolución')
        assert.equal(uploadWindowState(entregadaYDevuelta, { now, closedPickups }), 'handed_over')
        assert.match(uploadWindowRejection([entregadaYDevuelta], { now, closedPickups })!, /ya está entregada/i)
        assert.doesNotMatch(uploadWindowRejection([entregadaYDevuelta], { now, closedPickups })!, /ya está devuelta/i)
    })

    it('con varias reservas gana la entrega; la devolución pesa más que la falta de fechas', () => {
        const entregada = paidBooking({ id: MINE })
        const devuelta = paidBooking({ id: OTHER, start_date: '2026-02-01', end_date: '2026-02-08' })
        const sinFechas = paidBooking({ id: OTHER, start_date: null, end_date: null })

        assert.match(uploadWindowRejection([devuelta, entregada], { now, closedPickups })!, /ya está entregada/i)
        assert.match(uploadWindowRejection([devuelta], { now, closedPickups })!, /ya está devuelta/i)
        assert.match(uploadWindowRejection([sinFechas, devuelta], { now })!, /ya está devuelta/i)
        assert.match(uploadWindowRejection([sinFechas], { now })!, /no tiene fecha de recogida/i)
        // Con alguna reserva en plazo no hay nada que rechazar
        assert.equal(uploadWindowRejection([devuelta, paidBooking({ id: OTHER, start_date: '2026-12-01', end_date: '2026-12-08' })], { now }), null)
        assert.equal(uploadWindowRejection([], { now }), null, 'sin reservas no hay motivo que dar')
    })

    it('el texto del cliente nombra el día de la devolución y ya no habla de un mes', () => {
        const mensaje = uploadWindowClosedMessage('returned')!

        assert.match(mensaje, /el día de la devolución/i)
        assert.doesNotMatch(mensaje, /\bmes(es)?\b/i, 'el tope de un mes ya no se le cuenta a nadie')
        assert.equal(uploadWindowClosedMessage('open'), null)
    })

    it('el aviso del panel de admin dice lo mismo que la ruta', () => {
        const devuelta = paidBooking({ second_driver_docs_uploaded_at: null })
        const alertas = secondDriverAlerts(devuelta, madridNoon('2026-10-15'))
        const cerrado = alertas.find(a => a.code === 'upload_closed')

        assert.ok(cerrado, `se esperaba el aviso de plazo cerrado: ${alertas.map(a => a.code).join(', ')}`)
        assert.match(cerrado!.text, /el día de la devolución/i)
        assert.doesNotMatch(cerrado!.text, /\bmes(es)?\b/i)
        assert.equal(cerrado!.severity, 'danger')
        // El día de la devolución el aviso todavía es el suave: el cliente aún puede subirla
        const enPlazo = secondDriverAlerts(devuelta, madridNoon('2026-10-08')).map(a => a.code)
        assert.ok(enPlazo.includes('docs_pending'), `se esperaba docs_pending: ${enPlazo.join(', ')}`)
        assert.ok(!enPlazo.includes('upload_closed'))

        // El otro texto del plazo, el de la subida a medias, tiene que decir lo mismo: ningún test
        // lo comprobaba y una vuelta al «al mes de la devolución» pasaba desapercibida
        const aMedias = secondDriverAlerts(devuelta, madridNoon('2026-10-15'), {
            dniFrontUrl: true, dniBackUrl: false, licenseFrontUrl: true, licenseBackUrl: true,
        })
        const incompleto = aMedias.find(a => a.code === 'docs_incomplete')
        assert.ok(incompleto, `se esperaba docs_incomplete: ${aMedias.map(a => a.code).join(', ')}`)
        assert.match(incompleto!.text, /el día de la devolución/i)
        assert.doesNotMatch(incompleto!.text, /\bmes(es)?\b/i)
        assert.equal(incompleto!.severity, 'danger')
    })

    it('ni el dominio ni los textos conservan el tope de un mes ni el estado `expired`', () => {
        const fuentes = [
            'lib/booking/secondDriver.ts',
            'lib/admin/secondDriverAlerts.ts',
            'lib/user/secondDriverBookings.ts',
            'app/api/upload-driver-docs/route.ts',
        ]

        for (const ruta of fuentes) {
            const fuente = readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8')
            assert.doesNotMatch(fuente, /UPLOAD_CAP_MONTHS|uploadCapDay|UPLOAD_GRACE_DAYS|addMonths/, ruta)
        }

        const dominio = readFileSync(new URL('../lib/booking/secondDriver.ts', import.meta.url), 'utf8')
        // El estado de esta ventana se llama `returned`: `expired` es otra cosa (las reservas
        // pendientes abandonadas de `lib/admin/bookingStatus.ts`) y aquí no debe reaparecer
        assert.doesNotMatch(dominio, /['"]expired['"]/, 'el estado de la ventana ya no se llama expired')
        assert.match(dominio, /export function uploadDeadlineDay/)
    })
})

describe('Plazo de subida: qué reserva sigue siendo candidata', () => {
    const now = madridNoon('2026-11-10')

    it('una devuelta no compite con la que está en plazo, llegue en el orden que llegue', () => {
        const devuelta = paidBooking({ id: MINE, start_date: '2026-10-01', end_date: '2026-10-08' })
        const proxima = paidBooking({ id: OTHER, status: 'confirmed', start_date: '2026-12-01', end_date: '2026-12-08' })

        for (const rows of [[devuelta, proxima], [proxima, devuelta]]) {
            assert.deepEqual(uploadableSecondDriverBookings(rows, 'AB123456', { now }).map(c => c.row.id), [OTHER])
        }
    })

    it('la reserva que se devuelve HOY sigue siendo candidata', () => {
        const hoy = paidBooking({ id: MINE, status: 'active', start_date: '2026-11-03', end_date: '2026-11-10' })

        assert.deepEqual(uploadableSecondDriverBookings([hoy], 'AB123456', { now }).map(c => c.row.id), [MINE])
        assert.deepEqual(uploadableSecondDriverBookings([hoy], 'AB123456', { now: madridNoon('2026-11-11') }), [])
    })

    it('entre dos en plazo gana la recogida más próxima', () => {
        const pronto = paidBooking({ id: MINE, status: 'confirmed', start_date: '2026-11-20', end_date: '2026-11-27' })
        const tarde = paidBooking({ id: OTHER, status: 'confirmed', start_date: '2027-03-01', end_date: '2027-03-08' })

        assert.deepEqual(uploadableSecondDriverBookings([tarde, pronto], 'AB123456', { now }).map(c => c.row.id), [MINE, OTHER])
    })
})

describe('Regla y pantalla: /dashboard/datos ofrece lo que la ruta admite', () => {
    const now = madridNoon('2026-11-10')

    /** Ids que la ruta aceptaría (el mismo ayudante que usa la ruta) */
    const admiteLaRuta = (rows: Row[]) =>
        uploadableSecondDriverBookings(rows, 'AB123456', { now }).map(c => String(c.row.id))
    /** Ids que el formulario del cliente ofrece */
    const ofreceLaPantalla = (rows: Row[]) => upcomingSecondDriverBookings(rows, now).map(b => b.bookingId)

    it('coinciden en los casos corrientes: próxima, en curso, devuelta hoy, devuelta ayer y descartadas', () => {
        const casos: Array<[string, Row]> = [
            ['próxima', paidBooking({ id: MINE, status: 'confirmed', start_date: '2026-12-01', end_date: '2026-12-08' })],
            ['en curso', paidBooking({ id: MINE, status: 'active', start_date: '2026-11-07', end_date: '2026-11-14' })],
            ['se devuelve hoy', paidBooking({ id: MINE, status: 'active', start_date: '2026-11-03', end_date: '2026-11-10' })],
            ['se devolvió ayer', paidBooking({ id: MINE, status: 'active', start_date: '2026-11-02', end_date: '2026-11-09' })],
            ['sin end_date, recogida hoy', paidBooking({ id: MINE, status: 'active', start_date: '2026-11-10', end_date: null })],
            ['sin end_date, recogida ayer', paidBooking({ id: MINE, status: 'active', start_date: '2026-11-09', end_date: null })],
            // Un estado por cada uno de LIVE_BOOKING_STATUSES: así ninguno se queda sin comparar
            ['pendiente de confirmar, en fechas', paidBooking({ id: MINE, status: 'pending', start_date: '2026-12-01', end_date: '2026-12-08' })],
            ['completada, se devuelve hoy', paidBooking({ id: MINE, status: 'completed', start_date: '2026-11-03', end_date: '2026-11-10' })],
            ['completada con el viaje por delante', paidBooking({ id: MINE, status: 'completed', start_date: '2027-05-01', end_date: '2027-05-08' })],
            ['cancelada en fechas', paidBooking({ id: MINE, status: 'cancelled', start_date: '2026-12-01', end_date: '2026-12-08' })],
            ['sin pagar en fechas', paidBooking({ id: MINE, payment_status: 'pending', status: 'confirmed', start_date: '2026-12-01', end_date: '2026-12-08' })],
            ['sin fechas', paidBooking({ id: MINE, status: 'confirmed', start_date: null, end_date: null })],
            ['2º conductor sin documento', paidBooking({ id: MINE, status: 'confirmed', start_date: '2026-12-01', end_date: '2026-12-08', passengers: [], pricing_breakdown: { secondDriver: true } })],
        ]

        for (const [nombre, row] of casos) {
            assert.deepEqual(ofreceLaPantalla([row]), admiteLaRuta([row]), nombre)
        }
    })

    it('y eligen la MISMA reserva cuando hay varias', () => {
        const rows = [
            paidBooking({ id: OTHER, status: 'confirmed', start_date: '2027-03-01', end_date: '2027-03-08' }),
            paidBooking({ id: MINE, status: 'active', start_date: '2026-11-07', end_date: '2026-11-14' }),
        ]

        assert.deepEqual(ofreceLaPantalla(rows), [MINE, OTHER])
        assert.deepEqual(admiteLaRuta(rows), ofreceLaPantalla(rows))
    })

    // QA-SD-15, decidida por Javier (2026-11-10): una reserva `completed` cuya devolución es HOY se
    // cierra ese mismo día, sin esperar a medianoche. Ese estado lo escribe el panel al cerrar la
    // entrega de DEVOLUCIÓN (`app/api/admin/handovers/route.ts`), con la camper ya revisada en
    // persona, y es lo que la pantalla del cliente hacía ya: ahora las dos vías dicen lo mismo
    it('una reserva completada que se devuelve hoy ya no admite documentación por ninguna vía', () => {
        const hoy = paidBooking({ id: MINE, status: 'completed', start_date: '2026-11-03', end_date: '2026-11-10' })

        assert.deepEqual(admiteLaRuta([hoy]), [], 'la devolución registrada cierra el plazo ese mismo día')
        assert.deepEqual(ofreceLaPantalla([hoy]), [], 'la pantalla ya se comportaba así')
    })

    // QA-SD-16, corregida: con `end_date` y sin `start_date` la ventana decía `open` aunque nadie
    // pudiera subir nada (la ruta acababa rechazando por `secondDriverRequirementError`, que necesita
    // la fecha de recogida). Ahora el estado dice lo mismo que la pantalla y que el rechazo real
    it('con end_date y sin start_date la reserva no se puede situar: nadie sube nada', () => {
        const sinRecogida = paidBooking({ id: MINE, status: 'confirmed', start_date: null, end_date: '2026-12-08' })

        assert.equal(uploadWindowState(sinRecogida, { now }), 'not_schedulable', 'sin recogida no se puede comprobar nada')
        assert.deepEqual(ofreceLaPantalla([sinRecogida]), admiteLaRuta([sinRecogida]))
    })

    it('la pantalla no mira `handovers`: ofrece la reserva ya entregada que la ruta rechaza', () => {
        // No es un fallo nuevo, es el reparto de responsabilidades: `app/[locale]/dashboard/datos/page.tsx`
        // no consulta `handovers`, así que el cliente ve la reserva y la ruta le explica el motivo
        const entregada = paidBooking({ id: MINE, status: 'active', start_date: '2026-11-07', end_date: '2026-11-14' })
        const closedPickups = closedPickupBookingIds([{ booking_id: MINE, kind: 'pickup', completed_at: '2026-11-07T10:00:00Z' }])

        assert.deepEqual(ofreceLaPantalla([entregada]), [MINE], 'la pantalla la ofrece')
        assert.deepEqual(uploadableSecondDriverBookings([entregada], 'AB123456', { now, closedPickups }), [], 'la ruta no')
        assert.match(uploadWindowRejection([entregada], { now, closedPickups })!, /ya está entregada/i)
    })
})

describe('Subida: la ruta cierra el plazo el día de la devolución', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: 'u1', verification_status: 'not_submitted', full_name: 'Ana Pérez' }],
        })
        fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
        console.error = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        mock.timers.reset()
        fake.restore()
        Object.assign(console, silenced)
    })

    /** «Hoy» para la ruta, que mide el plazo con `new Date()` y no acepta ningún `now` */
    const freeze = (instant: Date) => mock.timers.enable({ apis: ['Date'], now: instant })

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

    const storagePaths = () => fake.requests
        .filter(r => r.path.startsWith('/storage/v1/object/documents/'))
        .map(r => r.path.replace('/storage/v1/object/documents/', ''))
    const bookingPatches = () => fake.writesTo('bookings').map(r => ({ id: r.query.get('id'), body: r.body as Row }))

    it('el día de la devolución todavía admite la documentación y la guarda en la reserva', async () => {
        freeze(madridNoon('2026-10-08')) // devolución 2026-10-08
        fake.tables.bookings = [paidBooking()]
        fake.tables.handovers = []

        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 200, json.error)
        assert.deepEqual(bookingPatches().map(p => p.id), [`eq.${MINE}`])
        assert.ok(bookingPatches()[0].body.second_driver_docs_uploaded_at, 'queda marcada la subida de sus fotos')
        assert.deepEqual(storagePaths().map(p => p.split('/').slice(0, 2).join('/')), [`u1/${MINE}`])
    })

    it('el día siguiente responde 400 y no escribe en bookings ni en Storage', async () => {
        freeze(madridNoon('2026-10-09'))
        fake.tables.bookings = [paidBooking()]
        fake.tables.handovers = []

        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 400)
        assert.match(json.error, /ya está devuelta/i)
        assert.match(json.error, /el día de la devolución/i)
        assert.deepEqual(storagePaths(), [], 'las fotos no llegan a Storage')
        assert.deepEqual(bookingPatches(), [], 'no se toca la reserva')
        assert.deepEqual(fake.writesTo('users'), [], 'tampoco se pasa el perfil a revisión')
        // Ni siquiera se toca Storage para crear el cubo: el rechazo va antes que cualquier escritura
        assert.deepEqual(fake.requests.filter(r => r.path.startsWith('/storage/')).map(r => r.path), [])
        assert.deepEqual(fake.requests.filter(r => r.method !== 'GET').map(r => `${r.method} ${r.path}`), [])
    })

    it('una devolución de hace una semana sin entrega registrada ya NO admite la subida', async () => {
        // Con el tope de un mes esto respondía 200: es el cambio de regla visto por la ruta
        freeze(madridNoon('2026-10-15'))
        fake.tables.bookings = [paidBooking()]
        fake.tables.handovers = []

        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 400)
        assert.match(json.error, /ya está devuelta/i)
        assert.deepEqual(bookingPatches(), [])
        assert.deepEqual(storagePaths(), [])
    })

    it('la frontera de la ruta es la medianoche de Madrid, no la de UTC (verano)', async () => {
        // Las 22:00Z del día de la devolución ya son el día siguiente en Madrid, y en UTC no
        const verano = paidBooking({ start_date: '2026-07-03', end_date: '2026-07-10' })

        freeze(new Date('2026-07-10T21:59:59Z'))
        fake.tables.bookings = [verano]
        fake.tables.handovers = []
        const abierto = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))
        assert.equal(abierto.status, 200, abierto.json.error)

        mock.timers.reset()
        fake.restore()
        fake = installFakeSupabase({ users: [{ id: 'u1', verification_status: 'not_submitted', full_name: 'Ana Pérez' }] })
        fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
        freeze(new Date('2026-07-10T22:00:00Z'))
        fake.tables.bookings = [verano]
        fake.tables.handovers = []
        const cerrado = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(cerrado.status, 400, 'pasada la medianoche de Madrid ya no se admite')
        assert.match(cerrado.json.error, /ya está devuelta/i)
        assert.deepEqual(storagePaths(), [])
        assert.deepEqual(bookingPatches(), [])
    })

    it('pasada la devolución, el 2º conductor que ya consta en el PERFIL no convierte el 400 en un 200', async () => {
        // QA-SD-14 con el estado nuevo: el perfil guarda a esa persona desde la primera subida, así
        // que si `profileRepeatsSecondDriver` se evaluara antes, el cliente vería «guardado con éxito»
        freeze(madridNoon('2026-10-20'))
        fake.tables.users = [{
            id: 'u1',
            verification_status: 'verified',
            full_name: 'Ana Pérez',
            has_second_driver: true,
            second_driver_name: 'Luis Pérez',
            second_driver_dni: 'AB123456',
            second_driver_license: 'B-99',
        }]
        fake.tables.bookings = [paidBooking()]
        fake.tables.handovers = []

        const { status, json } = await upload(form())

        assert.equal(status, 400, 'el plazo cerrado no se puede responder con un 200')
        assert.match(json.error, /ya está devuelta/i)
        assert.deepEqual(bookingPatches(), [])
        assert.deepEqual(fake.writesTo('users'), [], 'tampoco se pasa el perfil a revisión')
    })

    it('con una reserva devuelta y otra en plazo, la documentación va a la que está en plazo', async () => {
        freeze(madridNoon('2026-11-10'))
        fake.tables.bookings = [
            paidBooking({ id: MINE, start_date: '2026-10-01', end_date: '2026-10-08' }), // devuelta
            paidBooking({ id: OTHER, status: 'confirmed', payment_intent_id: 'otro-pedido', start_date: '2026-12-01', end_date: '2026-12-08' }),
        ]
        fake.tables.handovers = []

        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 200, json.error)
        assert.deepEqual(bookingPatches().map(p => p.id), [`eq.${OTHER}`], 'la devuelta no recibe nada')
        assert.deepEqual(storagePaths().map(p => p.split('/').slice(0, 2).join('/')), [`u1/${OTHER}`])
    })

    it('con end_date y sin start_date la ruta rechaza por la VENTANA, no por los requisitos', async () => {
        // QA-SD-16 visto por la ruta. Las dos razones posibles dicen «no tiene fecha de recogida»,
        // así que el mensaje a secas no distingue cuál se aplicó: se compara con el texto exacto de
        // la ventana. Antes de corregirla, la ventana decía `open` y el 400 lo daba
        // `secondDriverRequirementError`; ahora rechaza antes, sin mirar la ficha de la persona
        freeze(madridNoon('2026-11-10'))
        fake.tables.bookings = [paidBooking({ status: 'confirmed', start_date: null, end_date: '2026-12-08' })]
        fake.tables.handovers = []

        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 400)
        assert.equal(json.error, uploadWindowClosedMessage('not_schedulable'))
        assert.deepEqual(storagePaths(), [])
        assert.deepEqual(bookingPatches(), [])
    })

    it('una reserva con la devolución REGISTRADA se cierra el mismo día de la devolución', async () => {
        // QA-SD-15 por la ruta: el panel pone `completed` al cerrar la entrega de devolución, que
        // ocurre el propio día de la devolución. El cliente que suba esa tarde ya no llega
        freeze(madridNoon('2026-10-08')) // el día de la devolución, que sin el estado seguiría abierto
        fake.tables.bookings = [paidBooking({ status: 'completed' })]
        fake.tables.handovers = []

        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 400)
        assert.match(json.error, /ya está devuelta/i)
        assert.deepEqual(storagePaths(), [], 'las fotos no llegan a Storage')
        assert.deepEqual(bookingPatches(), [], 'no se toca la reserva')
        assert.deepEqual(fake.writesTo('users'), [])
    })

    it('con la recogida cerrada el motivo que ve el cliente es la entrega, no la devolución', async () => {
        freeze(madridNoon('2026-10-20')) // devuelta Y con la entrega cerrada
        fake.tables.bookings = [paidBooking()]
        fake.tables.handovers = [{ id: 'h1', booking_id: MINE, kind: 'pickup', completed_at: '2026-10-01T15:00:00Z' }]

        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 400)
        assert.match(json.error, /ya está entregada/i)
        assert.doesNotMatch(json.error, /ya está devuelta/i)
        assert.deepEqual(storagePaths(), [])
        assert.deepEqual(bookingPatches(), [])
    })
})
