import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST } from '../app/api/upload-driver-docs/route'
import { generateContractData } from '../lib/contracts/contractEngine'
import { secondDriverSupplementText } from '../lib/contracts/pdfGenerator'
import { upcomingSecondDriverBookings } from '../lib/user/secondDriverBookings'
import { DOCUMENT_UPLOAD_IP_WINDOW_MS, MAX_DOCUMENT_UPLOADS_PER_IP } from '../lib/booking/checkoutRateLimit'

/**
 * Ronda de cierre de qa-verificador sobre las correcciones de QA-SD-7..11 (2026-11-09).
 *
 * Los `{ todo: 'QA-SD-12..14' }` son fallos REPRODUCIDOS que quedan pinchados aquí sin romper el
 * rojo de `npm test`: el que los arregle quita el `todo`. El resto son fronteras que las
 * correcciones sí cierran pero que ningún test distinguía (se comprobó mutando el código en una
 * copia: sin estas pruebas, invertir la regla dejaba la suite en verde).
 *
 * Lo que NO prueba este archivo: Supabase real, RLS, Storage real, las columnas de la migración
 * 20261108 ni el navegador. La base está simulada.
 */

const ORDER = '1234abcd5678'
const B1 = 'cccccccc-3333-4333-8333-cccccccccccc'

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

describe('Ronda de cierre: subida del 2º conductor contra la ruta', () => {
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

    async function upload(data: FormData, ip?: string) {
        const encoded = new Request('http://localhost/', { method: 'POST', body: data })
        const body = await encoded.arrayBuffer()
        const headers = new Headers({
            'content-type': encoded.headers.get('content-type')!,
            'content-length': String(body.byteLength),
        })
        // El contador por IP es de módulo y vive todo el proceso de test: cada prueba usa la suya
        if (ip) headers.set('x-forwarded-for', ip)
        const res = await POST(new NextRequest('http://localhost/api/upload-driver-docs', { method: 'POST', headers, body }))
        return { status: res.status, json: await res.json().catch(() => ({})) }
    }

    // El tope por IP solo estaba probado sobre el contador (`registerDocumentUploadAttempt`) y con
    // un bucle hasta la propia constante: subirla a 100000 dejaba la suite en verde. Aquí el número
    // y la ventana son los acordados (10 cada 15 minutos) y van escritos, no leídos de la constante
    it('la ruta responde 429 al pasar de los 10 envíos por IP de 15 minutos', async () => {
        assert.equal(MAX_DOCUMENT_UPLOADS_PER_IP, 10, 'el tope acordado es de 10 envíos por IP')
        assert.equal(DOCUMENT_UPLOAD_IP_WINDOW_MS, 15 * 60 * 1000, 'la ventana acordada es de 15 minutos')

        const ip = '198.51.100.41'
        const codes: number[] = []
        for (let i = 0; i < 10; i++) {
            codes.push((await upload(form(), ip)).status)
        }
        assert.ok(codes.every(code => code === 200), `antes del tope: ${codes.join(',')}`)

        const extra = await upload(form(), ip)
        assert.equal(extra.status, 429)
        assert.match(extra.json.error, /demasiados env/i)
    })

    // QA-SD-12 (ronda de cierre): el contador se apunta en route.ts:66, ANTES de
    // `supabase.auth.getUser()`. Diez peticiones sin sesión (cada una rechazada con 401) agotan el
    // cupo de la IP, y el cliente legítimo que comparte salida —CGNAT móvil, wifi del camping, la
    // oficina, su propia pareja— recibe 429 durante 15 minutos sin haber enviado nada.
    // Corregido el 2026-11-09: el cupo se apunta con el titular ya resuelto y la clave lleva su id
    it(
        'QA-SD-12 un visitante sin sesión no gasta el cupo del cliente que comparte IP',
        async () => {
            const ip = '198.51.100.42'
            fake.setSession(null as any)
            const anonimos: number[] = []
            for (let i = 0; i < 10; i++) {
                anonimos.push((await upload(form(), ip)).status)
            }
            assert.ok(anonimos.every(code => code === 401), `los anónimos no entran: ${anonimos.join(',')}`)

            fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
            const legitimo = await upload(form(), ip)

            assert.notEqual(legitimo.status, 429, 'el cliente con sesión queda bloqueado 15 minutos por peticiones ajenas')
        }
    )

    // QA-SD-13 (ronda de cierre): el contrato ya no toma el nombre del perfil (QA-SD-9), pero la
    // subida sí. Con una ficha que identifica a la persona por documento y sin nombre,
    // DriverDataClient.tsx:75-79 deja el campo editable y lo rellena con `profile.second_driver_name`
    // —el 2º conductor de OTRA reserva—, y route.ts:232-236 lo acepta y lo escribe en
    // `bookings.second_driver_name`. A partir de ahí `bookingSecondDriver` lee las columnas y el
    // contrato faculta a esa persona sin que el cliente haya tecleado nada.
    // Corregido el 2026-11-09: la ruta ya no acepta NINGÚN nombre del formulario. Con la ficha sin
    // nombre responde 400 pidiendo que nos escriban para completarla (decisión de Javier), así que
    // la aserción del código de respuesta pasó de 200 a 400; lo que este test comprueba —que la
    // reserva no acabe nombrando a quien el formulario traía— es lo mismo
    it(
        'QA-SD-13 el nombre del perfil no puede nombrar al 2º conductor de la reserva',
        async () => {
            fake.tables.bookings = [paidBooking({
                passengers: [],
                second_driver_dni: 'AB123456',
                second_driver_birth_date: '1985-01-01',
                second_driver_license_date: '2010-01-01',
            })]
            Object.assign(fake.tables.users[0], {
                has_second_driver: true,
                second_driver_name: 'Marta Otra',
                second_driver_dni: 'AB123456',
            })

            // Es lo que /dashboard/datos manda sin que nadie teclee: el campo viene del perfil
            const { status, json } = await upload(form({ secondDriverFullName: 'Marta Otra' }))
            assert.equal(status, 400, `responde ${status} y acepta el nombre del formulario`)
            assert.match(json.error, /no guarda el nombre completo/i)

            const contrato = generateContractData(
                { ...fake.tables.bookings[0], total_price: 735, deposit_amount: 2000 },
                fake.tables.users[0]
            )
            assert.equal(
                contrato.secondDriver!.fullName,
                'Pendiente de verificación',
                `la reserva pasa a nombrar a "${fake.tables.bookings[0].second_driver_name}", que nunca registró`
            )
        }
    )

    // QA-SD-14 (ronda de cierre): el 400 del plazo cerrado va DESPUÉS de
    // `profileRepeatsSecondDriver`. Un cliente cuyo perfil guarda a esa misma persona —lo normal
    // después de haber subido su documentación una vez— recibía 200 y «guardados con éxito» cuando
    // la única reserva que la autoriza ya no admitía documentación.
    // Corregido el 2026-11-09: el plazo se comprueba antes de mirar si el perfil repite a esa
    // persona. Desde el 2026-11-09 el plazo lo cierra la entrega de llaves, no la fecha
    it(
        'QA-SD-14 con el perfil repitiendo al 2º conductor, la camper entregada sigue dando 400',
        async () => {
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

            assert.equal(status, 400, `responde ${status} y dice «${json.message || json.error}»`)
            assert.match(json.error, /ya está entregada/i)
        }
    )

    // Que la ruta vuelva a comprobar los requisitos del seguro contra la fecha de recogida de ESA
    // reserva solo estaba probado llamando a `secondDriverRequirementError` por su cuenta: quitar la
    // llamada de route.ts:217 dejaba la suite entera en verde
    it('la ruta rechaza una ficha que no cumple los 25 años en la fecha de recogida', async () => {
        fake.tables.bookings = [paidBooking({
            start_date: '2026-12-01',
            end_date: '2026-12-08',
            passengers: [{ ...AUTHORIZED, birthDate: '2010-01-01' }],
        })]

        const { status, json } = await upload(form())

        assert.equal(status, 400)
        assert.match(json.error, /25 años/)
        assert.deepEqual(fake.writesTo('bookings'), [], 'no se escribe nada en la reserva')
    })
})

describe('Ronda de cierre: textos y listas del 2º conductor', () => {
    // `included` pasó a ser obligatorio en el tipo, pero en ejecución sigue llegando `undefined`
    // desde cualquier objeto que no venga de `generateContractData` (JSON guardado, una llamada
    // desde JS). Ningún test pasaba la clave ausente: volver al `!== false` de antes no rompía nada
    it('sin dato de gratuidad el contrato no promete que el 2º conductor fuera gratis', () => {
        const sinDato = { supplement: 0, ratePerDay: 0 } as unknown as Parameters<typeof secondDriverSupplementText>[0]

        assert.match(secondDriverSupplementText(sinDato), /No consta suplemento/)
    })

    // `upcomingSecondDriverBookings` excluye `completed` además de filtrar por fecha de devolución.
    // Los tests usaban viajes completados Y pasados, así que el filtro por estado no lo medía nadie:
    // una reserva cerrada antes de tiempo seguía ofreciéndose como «la próxima»
    it('un viaje marcado como completado con devolución futura no se ofrece en /dashboard/datos', () => {
        const rows = [{
            id: B1,
            user_id: 'u1',
            payment_status: 'paid',
            status: 'completed',
            start_date: '2099-12-01',
            end_date: '2099-12-08',
            passengers: [{ ...AUTHORIZED }],
        }]

        assert.deepEqual(upcomingSecondDriverBookings(rows, new Date('2026-11-09T12:00:00Z')), [])
    })

    // Las fechas se leen como día de calendario: el mismo instante visto desde Mallorca y desde
    // fuera tiene que dar la misma lista (el servidor corre en UTC y el cliente puede estar en Chile)
    it('la lista no cambia con la zona horaria del proceso', () => {
        const rows = [{
            id: B1,
            user_id: 'u1',
            payment_status: 'paid',
            status: 'confirmed',
            start_date: '2026-11-10',
            end_date: '2026-11-10',
            passengers: [{ ...AUTHORIZED }],
        }]
        // 2026-11-09T23:30Z ya es día 10 en Mallorca (UTC+1): la devolución del 10 sigue en plazo
        const instante = new Date('2026-11-09T23:30:00Z')

        assert.equal(upcomingSecondDriverBookings(rows, instante).length, 1)
        assert.equal(
            upcomingSecondDriverBookings(
                [{ ...rows[0], start_date: '2026-11-09', end_date: '2026-11-09' }],
                instante
            ).length,
            0,
            'la devolución del 9 ya pasó cuando en Mallorca es día 10'
        )
    })
})
