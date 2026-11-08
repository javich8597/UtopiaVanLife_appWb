import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { installFlows, cents, redsysForm, step5Payload, CookieJar, NEO } from './helpers/qaFlows'
import { Row } from './helpers/fakeSupabase'
import { calculatePriceV2, SECOND_DRIVER_RATE_PER_DAY } from '../lib/pricing/engine'
import { validateStep5, countStep5SecondDrivers } from '../app/[locale]/reserva/[slug]/types'
import { formatPhoneWithPrefix } from '../lib/driverDocuments'
import { generateContractData } from '../lib/contracts/contractEngine'
import { secondDriverSupplementText } from '../lib/admin/contractHtml'
import { buildBreakdownLines, sumBreakdownLines } from '../lib/admin/bookingBreakdown'

/**
 * Verificación independiente del 2º conductor (qa-verificador, 2026-11-08).
 *
 * Regla de negocio: con fianza Estándar (2.000 €) cuesta SECOND_DRIVER_RATE_PER_DAY €/día; con
 * Flex (1.000 €) va incluido; como máximo uno por reserva.
 *
 * Lo que NO prueba este archivo: Supabase real, RLS, Storage, Redsys real ni el navegador.
 * Los `it(..., { todo: 'QA-SD-n' })` son fallos reproducidos a propósito: dejan el rojo
 * documentado sin tumbar `npm test`.
 */

/** Lo que el paso 5 tiene en el formulario (igual que en qa_cierre_subida_pago_fianza.test.ts) */
const RAW_CUSTOMER: Row = {
    ...step5Payload().customer as Row,
    phone: '600 000 000',
    phoneCountryCode: '+34',
    acceptTerms: true,
    acceptPrivacy: true,
}
/** Lo que Step5Checkout.tsx envía tras normalizar el teléfono con el prefijo */
const sentCustomer = (raw: Row): Row => ({ ...raw, phone: formatPhoneWithPrefix(String(raw.phone), String(raw.phoneCountryCode)) })
const companion = (fullName: string, dniNie: string): Row => ({ fullName, dniNie, birthDate: '', licenseDate: '', isSecondDriver: false })
/** Ficha completa de 2º conductor: 25 años cumplidos y carnet B de más de 2 años */
const DRIVER: Row = { fullName: 'Luis Pérez', dniNie: 'AB123456', birthDate: '1985-01-01', licenseDate: '2010-01-01' }

/** step5Payload: 2099-06-01 tarde → 2099-06-08 mañana = 7 noches y 7 días */
const DAYS = 7
const SUPPLEMENT = SECOND_DRIVER_RATE_PER_DAY * DAYS

// =====================================================================================
// 1. LA MATRIZ DE CIERRE, CON LA CONDICIÓN SACADA DEL FUENTE DEL PASO 5
//    (la copia de `sentByStep5` en qa_cierre_subida_pago_fianza.test.ts quedó desfasada)
// =====================================================================================

const STEP5_SOURCE = readFileSync('app/[locale]/reserva/[slug]/Step5Checkout.tsx', 'utf8')

describe('Paso 5: la condición de envío se lee del fuente, no se copia', () => {
    it('el bloque "solo" depende solo del número de viajeros, no de la fianza', () => {
        const match = STEP5_SOURCE.match(/const soloSecondDriverVisible = ([^\n]+)/)
        assert.ok(match, 'no se encuentra soloSecondDriverVisible en Step5Checkout.tsx')
        assert.equal(match![1].trim(), 'currentTravelersCount === 1')
    })

    it('las fichas visibles se envían tal cual: ya no se fuerza isSecondDriver a false', () => {
        const match = STEP5_SOURCE.match(/passengers: \(customer\.passengers \|\| \[\]\)([^\n]+)/)
        assert.ok(match, 'no se encuentra el recorte de passengers en Step5Checkout.tsx')
        assert.match(match![1], /\.slice\(0, Math\.max\(0, currentTravelersCount - 1\)\)/)
        assert.doesNotMatch(match![1], /isSecondDriver: false/)
    })

    it('la casilla del 2º conductor de cada acompañante ya no está dentro de un bloque de Flex', () => {
        const toggle = STEP5_SOURCE.slice(STEP5_SOURCE.indexOf('second-driver-toggle-box'))
        assert.doesNotMatch(toggle.slice(0, 400), /currentDeposit === 'flex_1000'/)
    })
})

/** Lo que envía Step5Checkout, derivado de lo que acaban de comprobar los tests de arriba */
const sentByStep5 = (raw: Row): Row => {
    const soloVisible = raw.travelersCount === 1
    return {
        ...sentCustomer(raw),
        passengers: (raw.passengers ?? []).slice(0, Math.max(0, raw.travelersCount - 1)),
        secondDriverSoloEnabled: soloVisible && Boolean(raw.secondDriverSoloEnabled),
        secondDriverSolo: soloVisible && raw.secondDriverSoloEnabled ? raw.secondDriverSolo : undefined,
    }
}

describe('Cierre: NEO y SPACE, de 1 a sus plazas, Estándar y Flex, con y sin 2º conductor', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => { console.error = () => {}; console.warn = () => {} })
    afterEach(() => { flows?.fake.restore(); Object.assign(console, silenced) })

    it('las 20 combinaciones pasan el paso 5 y el checkout, y el suplemento es el de la fianza', async () => {
        const campers = [
            { camper: { ...NEO, specs: { seats: 3 } }, slug: 'neo', seats: 3 },
            { camper: { ...NEO, id: 'c2', slug: 'space', name: 'SPACE', specs: { seats: 2 } }, slug: 'space', seats: 2 },
        ]
        const people = [companion('Ana Ruiz', 'X1234567L'), companion('Marcel·la Puig', 'C01X00T47')]
        let checked = 0

        for (const { camper, slug, seats } of campers) {
            for (let travelers = 1; travelers <= seats; travelers++) {
                for (const deposit of ['standard_2000', 'flex_1000'] as const) {
                    for (const withDriver of [false, true]) {
                        const passengers = people.slice(0, travelers - 1).map(p => ({ ...p }))
                        if (withDriver && travelers > 1) Object.assign(passengers[0], { ...DRIVER, isSecondDriver: true })
                        const raw: Row = {
                            ...RAW_CUSTOMER, travelersCount: travelers, depositOption: deposit, passengers,
                            secondDriverSoloEnabled: withDriver && travelers === 1, secondDriverSolo: DRIVER,
                        }
                        const where = JSON.stringify({ slug, travelers, deposit, withDriver })

                        assert.equal(validateStep5(raw as never, seats).isValid, true, `paso 5: ${where}`)
                        assert.equal(countStep5SecondDrivers(raw as never), withDriver ? 1 : 0, `cuenta del paso 5: ${where}`)

                        flows?.fake.restore()
                        flows = installFlows({ campers: [camper] })
                        const { status, json } = await flows.checkout(step5Payload({ camperSlug: slug, depositOption: deposit }, sentByStep5(raw)))

                        assert.equal(status, 200, `${where} → ${json.error}`)
                        const saved = flows.fake.tables.bookings[0]
                        assert.equal(saved.num_pax, travelers, where)
                        assert.equal(saved.deposit_amount, deposit === 'flex_1000' ? 1000 : 2000, where)
                        assert.equal(saved.passengers.length, travelers - 1 + (withDriver && travelers === 1 ? 1 : 0), where)
                        assert.equal(saved.passengers.filter((p: Row) => p.isSecondDriver).length, withDriver ? 1 : 0, where)

                        const expected = withDriver && deposit === 'standard_2000' ? SUPPLEMENT : 0
                        assert.equal(json.breakdown.secondDriver, withDriver, `bandera: ${where}`)
                        assert.equal(json.breakdown.secondDriverSupplement, expected, `suplemento: ${where}`)
                        assert.equal(saved.total_price, json.breakdown.payableTotal, where)
                        assert.equal(saved.pricing_breakdown.secondDriverSupplement, expected, where)
                        checked++
                    }
                }
            }
        }
        // NEO: 3 viajeros × 2 fianzas × 2; SPACE: 2 × 2 × 2
        assert.equal(checked, 20)
    })

    it('el importe es el mismo en el desglose, en total_price y en lo que se manda a Redsys', async () => {
        flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
        const sin = await flows.checkout(step5Payload({}, { travelersCount: 2, passengers: [companion('Luis Pérez', 'AB123456')] }))
        const base = sin.json.breakdown.payableTotal

        flows.fake.restore()
        flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
        const con = await flows.checkout(step5Payload({}, { travelersCount: 2, passengers: [{ ...DRIVER, isSecondDriver: true }] }))

        assert.equal(con.status, 200, con.json.error)
        const saved = flows.fake.tables.bookings[0]
        assert.equal(con.json.breakdown.payableTotal, base + SUPPLEMENT)
        assert.equal(saved.total_price, base + SUPPLEMENT)
        assert.equal(redsysForm(con.json.formData.merchantParameters).DS_MERCHANT_AMOUNT, String(cents(base + SUPPLEMENT)))
        assert.equal(saved.base_price, con.json.breakdown.baseRentalTotal, 'base_price no incluye el suplemento')
    })

    it('el reintento de pago cobra el total guardado, con el suplemento dentro y sin recalcular', async () => {
        flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
        const { json } = await flows.checkout(step5Payload({}, { travelersCount: 2, passengers: [{ ...DRIVER, isSecondDriver: true }] }))
        const saved = flows.fake.tables.bookings[0]
        flows.fake.setSession({ id: saved.user_id, email: 'ana@example.com', aud: 'authenticated' })

        const retry = await flows.pay(saved.id)

        assert.equal(retry.status, 200, retry.json.error)
        assert.equal(redsysForm(retry.json.form.merchantParameters).DS_MERCHANT_AMOUNT, String(cents(json.breakdown.payableTotal)))
        assert.equal(flows.fake.tables.bookings[0].total_price, json.breakdown.payableTotal, 'el reintento no recalcula el precio')
    })

    it('dos envíos seguidos del mismo paso 5 cobran lo mismo: el suplemento no se duplica', async () => {
        flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
        const payload = step5Payload({}, { travelersCount: 2, passengers: [{ ...DRIVER, isSecondDriver: true }] })

        const primero = await flows.checkout(payload)
        const segundo = await flows.checkout(payload)

        assert.equal(primero.status, 200, primero.json.error)
        for (const booking of flows.fake.tables.bookings) {
            assert.equal(booking.pricing_breakdown.secondDriverSupplement, SUPPLEMENT)
            assert.equal(booking.total_price, primero.json.breakdown.payableTotal)
        }
        if (segundo.status === 200) assert.equal(segundo.json.breakdown.secondDriverSupplement, SUPPLEMENT)
    })
})

// =====================================================================================
// 2. ATAQUES AL LÍMITE DE UNO POR RESERVA Y AL RECUENTO DE PLAZAS
// =====================================================================================

describe('Checkout: límites del 2º conductor', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
        console.error = () => {}
        console.warn = () => {}
    })
    afterEach(() => { flows.fake.restore(); Object.assign(console, silenced) })

    it('un secondDriver aparte más un acompañante marcado son dos: 400 y nada escrito', async () => {
        const { status, json } = await flows.checkout(step5Payload({ secondDriver: { ...DRIVER, dniNie: 'ZZ999999' } }, {
            travelersCount: 3, passengers: [{ ...DRIVER, isSecondDriver: true }],
        }))

        assert.equal(status, 400)
        assert.match(json.error, /segundo conductor/i)
        assert.equal(flows.fake.tables.bookings.length, 0)
        assert.deepEqual(flows.fake.tables.blocked_dates, [])
    })

    it('el documento se compara sin espacios ni mayúsculas: no duplica ni pide plaza nueva', async () => {
        const { status, json } = await flows.checkout(step5Payload({ secondDriver: { ...DRIVER, dniNie: '  ab123456  ' } }, {
            travelersCount: 2, passengers: [{ ...DRIVER, isSecondDriver: false }],
        }))

        assert.equal(status, 200, json.error)
        const saved = flows.fake.tables.bookings[0]
        assert.equal(saved.passengers.length, 1)
        assert.equal(saved.passengers[0].isSecondDriver, true)
        assert.equal(json.breakdown.secondDriverSupplement, SUPPLEMENT)
    })

    it('SPACE con 2 plazas no admite titular, acompañante y 2º conductor aparte', async () => {
        flows.fake.restore()
        flows = installFlows({ campers: [{ ...NEO, id: 'c2', slug: 'space', name: 'SPACE', specs: { seats: 2 } }] })
        const { status, json } = await flows.checkout(step5Payload({ camperSlug: 'space', secondDriver: DRIVER }, {
            travelersCount: 2, passengers: [companion('Ana Ruiz', 'X1234567L')],
        }))

        assert.equal(status, 400)
        assert.equal(flows.fake.tables.bookings.length, 0)
    })

    it('con fianza Flex tampoco admite dos marcados, y con Estándar el suplemento no se duplica', async () => {
        const dos = await flows.checkout(step5Payload({ depositOption: 'flex_1000' }, {
            depositOption: 'flex_1000', travelersCount: 3,
            passengers: [{ ...DRIVER, isSecondDriver: true }, { ...DRIVER, dniNie: 'X1234567L', fullName: 'Ana Ruiz', isSecondDriver: true }],
        }))

        assert.equal(dos.status, 400)
        assert.match(dos.json.error, /segundo conductor/i)
    })

    it('el 2º conductor "solo" con 1 viajero no ocupa plaza pero sí se guarda y se cobra', async () => {
        const { status, json } = await flows.checkout(step5Payload({}, {
            travelersCount: 1, passengers: [], secondDriverSoloEnabled: true, secondDriverSolo: DRIVER,
        }))

        assert.equal(status, 200, json.error)
        const saved = flows.fake.tables.bookings[0]
        assert.equal(saved.num_pax, 1)
        assert.equal(saved.passengers.length, 1)
        assert.equal(saved.passengers[0].isSecondDriver, true)
        assert.equal(json.breakdown.secondDriverSupplement, SUPPLEMENT)
    })

    it('el suplemento sale de las fichas validadas, no de ninguna bandera del cuerpo', async () => {
        const { status, json } = await flows.checkout(step5Payload({
            secondDriverSupplement: 999, breakdown: { secondDriverSupplement: 999, secondDriver: true }, totalPrice: 1,
        }, { travelersCount: 2, passengers: [companion('Ana Ruiz', 'X1234567L')] }))

        assert.equal(status, 200, json.error)
        assert.equal(json.breakdown.secondDriver, false)
        assert.equal(json.breakdown.secondDriverSupplement, 0)
        assert.equal(flows.fake.tables.bookings[0].pricing_breakdown.secondDriverSupplement, 0)
    })

    it('una fianza desconocida se trata como Estándar y cobra el suplemento', async () => {
        const { status, json } = await flows.checkout(step5Payload({ depositOption: 'gratis_0' }, {
            depositOption: 'gratis_0', travelersCount: 2, passengers: [{ ...DRIVER, isSecondDriver: true }],
        }))

        assert.equal(status, 200, json.error)
        assert.equal(flows.fake.tables.bookings[0].deposit_amount, 2000)
        assert.equal(json.breakdown.secondDriverSupplement, SUPPLEMENT)
    })
})

// =====================================================================================
// 3. PRECIO: ZONA HORARIA, MEDIO DÍA Y DESCUENTOS
// =====================================================================================

describe('Motor de precios: el suplemento no depende de la zona horaria', () => {
    const price = (overrides: Record<string, unknown> = {}) => calculatePriceV2({
        startDate: '2099-06-28', pickupSlot: 'afternoon',
        endDate: '2099-07-05', dropoffSlot: 'morning',
        camperBasePrice: 100,
        seasons: [{ id: 'baja', code: 'baja', name: 'Baja', supplement_per_night: 0, min_nights: 3, is_default: true }] as never,
        periods: [] as never,
        discounts: [],
        kmPackage: 'included_150',
        cancellationPolicy: 'standard',
        depositOption: 'standard_2000',
        depositAmount: 2000,
        ...overrides,
    })

    for (const zone of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Europe/Madrid']) {
        it(`con el servidor en ${zone} el suplemento sigue siendo ${SUPPLEMENT} €`, () => {
            const previous = process.env.TZ
            process.env.TZ = zone
            try {
                const con = price({ secondDriver: true })
                assert.equal(con.totalDays, DAYS, zone)
                assert.equal(con.secondDriverSupplement, SUPPLEMENT, zone)
                assert.equal(con.payableTotal, price().payableTotal + SUPPLEMENT, zone)
            } finally {
                if (previous === undefined) delete process.env.TZ
                else process.env.TZ = previous
            }
        })
    }

    it('con los dos medios días el suplemento se cobra sobre 8 días', () => {
        const con = price({ pickupSlot: 'morning', dropoffSlot: 'afternoon', secondDriver: true })
        assert.equal(con.totalDays, 8)
        assert.equal(con.secondDriverSupplement, SECOND_DRIVER_RATE_PER_DAY * 8)
    })

    it('el descuento por estancia no toca el suplemento', () => {
        const discounts = [{ id: 'd1', min_days: 7, discount_pct: 20, is_active: true }]
        assert.equal(price({ discounts, secondDriver: true }).secondDriverSupplement, SUPPLEMENT)
        assert.equal(
            price({ discounts, secondDriver: true }).payableTotal,
            price({ discounts }).payableTotal + SUPPLEMENT
        )
    })
})

// =====================================================================================
// 4. SUBIDA DE DOCUMENTACIÓN: QUÉ RESERVA AUTORIZA AL 2º CONDUCTOR
// =====================================================================================

describe('Subida: la reserva que autoriza al 2º conductor', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn }

    const bookingRow = (overrides: Row = {}): Row => ({
        id: 'b1', user_id: 'u1', payment_intent_id: '1234abcd5678', payment_status: 'paid',
        status: 'confirmed', passengers: [], ...overrides,
    })
    const withDriver = (overrides: Row = {}) => bookingRow({
        passengers: [{ fullName: 'Luis Pérez', dniNie: 'AB123456', isSecondDriver: true }], ...overrides,
    })

    const uploadForm = () => {
        const data = new FormData()
        data.append('fullName', 'Ana Pérez')
        data.append('dniNie', '12345678Z')
        data.append('driverLicenseId', 'B-1234')
        data.append('driverLicenseIssueDate', '2015-01-01')
        data.append('driverLicenseExpiryDate', '2035-01-01')
        data.append('address', 'Calle Mayor 1')
        data.append('phone', '+34 600000000')
        data.append('hasSecondDriver', 'true')
        data.append('secondDriverFullName', 'Luis Pérez')
        data.append('secondDriverDni', 'AB123456')
        data.append('secondDriverLicense', 'B-99')
        return data
    }

    const send = async (bookings: Row[]) => {
        flows?.fake.restore()
        flows = installFlows({
            bookings,
            users: [{ id: 'u1', verification_status: 'not_submitted', full_name: 'Ana' }],
        })
        flows.fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
        return flows.upload(uploadForm(), new CookieJar())
    }

    beforeEach(() => { console.error = () => {}; console.warn = () => {} })
    afterEach(() => { flows?.fake.restore(); Object.assign(console, silenced) })

    it('sin ninguna reserva con 2º conductor: 400 y sin escribir en users', async () => {
        const { status, json } = await send([bookingRow()])

        assert.equal(status, 400)
        assert.match(json.error, /segundo conductor/i)
        assert.deepEqual(flows.fake.writesTo('users'), [])
    })

    it('sin ninguna reserva: 400 (lista vacía)', async () => {
        const { status, json } = await send([])

        assert.equal(status, 400)
        assert.match(json.error, /segundo conductor/i)
    })

    // Antes bastaba con que *alguna* reserva llevara un 2º conductor, sin mirar quién: este test
    // pasaba igual con las dos versiones de la ruta. Ahora lo que lo hace pasar es que el documento
    // enviado coincide con el de la ficha de b1. El test que distingue el cambio es el siguiente
    it('con dos reservas, acepta porque el documento es el de la ficha de una de ellas', async () => {
        const { status, json } = await send([withDriver({ id: 'b1' }), bookingRow({ id: 'b2', payment_intent_id: 'otra' })])

        assert.equal(status, 200, json.error)
    })

    it('con dos reservas, ninguna con ESE documento, lo rechaza', async () => {
        const otraPersona = bookingRow({
            id: 'b2', payment_intent_id: 'otra',
            passengers: [{ fullName: 'Marta Ruiz', dniNie: 'X1234567L', isSecondDriver: true }],
        })

        const { status, json } = await send([bookingRow({ id: 'b1' }), otraPersona])

        assert.equal(status, 400, 'una reserva con otro 2º conductor no autoriza a esta persona')
        assert.match(json.error, /segundo conductor/i)
        assert.deepEqual(flows.fake.writesTo('users'), [])
    })

    // QA-SD-1: la consulta no filtra por estado. Una reserva cancelada o caducada sin pagar sigue
    // autorizando a subir la documentación de un 2º conductor que ya no está contratado
    it('QA-SD-1 una reserva cancelada con 2º conductor no debería autorizar la subida', async () => {
        const { status } = await send([withDriver({ status: 'cancelled', payment_status: 'refunded' })])

        assert.equal(status, 400, 'una reserva cancelada no debería valer como autorización')
    })

    it('QA-SD-1 una reserva sin pagar con 2º conductor tampoco debería autorizarla', async () => {
        const { status } = await send([withDriver({ status: 'pending', payment_status: 'pending' })])

        assert.equal(status, 400, 'una reserva sin pagar no debería valer como autorización')
    })

    // QA-SD-6: /dashboard/datos manda hasSecondDriver con el valor que ya tenía el perfil
    // (DriverDataClient.tsx:61 y :175). Un cliente con has_second_driver = true de antes de este
    // cambio y una reserva sin 2º conductor no puede guardar NINGÚN dato suyo: la ruta corta antes
    // de escribir y el formulario no explica por qué
    it('QA-SD-6 un perfil que ya tenía 2º conductor no debería quedarse sin poder guardar sus datos', async () => {
        flows?.fake.restore()
        flows = installFlows({
            bookings: [bookingRow()],
            users: [{
                id: 'u1', verification_status: 'verified', full_name: 'Ana',
                has_second_driver: true, second_driver_name: 'Luis Pérez',
            }],
        })
        flows.fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })

        const { status } = await flows.upload(uploadForm(), new CookieJar())

        assert.equal(status, 200, 'el cliente no puede actualizar sus propios documentos')
        assert.notDeepEqual(flows.fake.writesTo('users'), [], 'no se guarda nada del conductor principal')
    })
})

// =====================================================================================
// 5. CONTRATO Y PDF: LO QUE SE IMPRIME FRENTE A LO QUE SE COBRÓ
// =====================================================================================

const PDF_SOURCE = readFileSync('lib/contracts/pdfGenerator.ts', 'utf8')

describe('Contrato: el suplemento impreso frente al cobrado', () => {
    const PROFILE_WITH = {
        has_second_driver: true, second_driver_name: 'Luis Pérez',
        second_driver_dni: 'AB123456', second_driver_license: 'B-99',
    }
    const booking = (breakdown: Row | null, overrides: Row = {}): Row => ({
        id: 'b1', total_price: 735, start_date: '2099-06-01', end_date: '2099-06-08',
        deposit_amount: 2000, pricing_breakdown: breakdown, ...overrides,
    })

    it('con el desglose cobrado imprime el suplemento y su tarifa', () => {
        const data = generateContractData(
            booking({ secondDriver: true, secondDriverRatePerDay: SECOND_DRIVER_RATE_PER_DAY, secondDriverSupplement: SUPPLEMENT }),
            PROFILE_WITH
        )

        assert.ok(data.secondDriver)
        assert.equal(data.secondDriver!.supplement, SUPPLEMENT)
        assert.equal(data.secondDriver!.ratePerDay, SECOND_DRIVER_RATE_PER_DAY)
    })

    it('con fianza Flex imprime 0 € y el texto de "incluido"', () => {
        const data = generateContractData(
            booking({ secondDriver: true, secondDriverRatePerDay: 0, secondDriverSupplement: 0 }, { deposit_amount: 1000 }),
            PROFILE_WITH
        )

        assert.equal(data.secondDriver!.supplement, 0)
        assert.match(PDF_SOURCE, /Segundo conductor incluido sin coste adicional/)
    })

    // QA-SD-2: el bloque del 2º conductor del contrato sale del perfil del cliente, no de la
    // reserva. Una reserva que lo lleva y cobró el suplemento no lo imprime si el cliente aún no
    // ha rellenado sus datos en /dashboard/datos
    it('QA-SD-2 una reserva que cobró el suplemento debería nombrar a su 2º conductor', () => {
        const data = generateContractData(
            booking(
                { secondDriver: true, secondDriverRatePerDay: SECOND_DRIVER_RATE_PER_DAY, secondDriverSupplement: SUPPLEMENT },
                { passengers: [{ fullName: 'Luis Pérez', dniNie: 'AB123456', isSecondDriver: true }] }
            ),
            { has_second_driver: false }
        )

        assert.ok(data.secondDriver, 'el contrato no menciona al 2º conductor que se cobró en la reserva')
    })

    // QA-SD-3: al revés, un perfil con 2º conductor imprime la cláusula en TODAS sus reservas,
    // incluso en una con fianza Estándar que no lo contrató, y además afirma que va incluido
    it('QA-SD-3 una reserva Estándar sin 2º conductor no debería imprimir su cláusula', () => {
        const data = generateContractData(
            booking({ secondDriver: false, secondDriverRatePerDay: 0, secondDriverSupplement: 0 }),
            PROFILE_WITH
        )

        assert.equal(data.secondDriver, undefined, 'imprime un 2º conductor que esta reserva no lleva')
    })

    // QA-SD-4 (resuelto, reescrito 2026-11-09): la aserción original —`notEqual(supplement, 0)`
    // sobre una reserva sin ninguna ficha— ya no encaja: ahí el bloque no se imprime y el acceso
    // rompía con un TypeError. Lo que importaba es que con Estándar nunca se afirme "incluido", y
    // eso ahora lo decide `included`, no un suplemento de 0 €. El texto está en
    // lib/contracts/pdfGenerator.ts y lib/admin/contractHtml.ts (`secondDriverSupplementText`)
    it('QA-SD-4 una reserva antigua con Estándar no dice que vaya incluido', () => {
        const data = generateContractData(booking({ basePrice: 700 }, { has_second_driver: true }), PROFILE_WITH)

        assert.ok(data.secondDriver, 'la reserva consta con 2º conductor')
        assert.equal(data.secondDriver!.supplement, 0, 'en esa reserva no se cobró nada')
        assert.equal(data.secondDriver!.included, false, 'con Estándar no puede afirmar que va incluido')
        assert.equal(
            secondDriverSupplementText(data.secondDriver!),
            'No consta suplemento de segundo conductor en esta reserva.'
        )
    })

    it('QA-SD-4 con Flex el texto de "incluido" sí sale', () => {
        const data = generateContractData(
            booking({ secondDriver: true, secondDriverSupplement: 0 }, { deposit_amount: 1000 }),
            PROFILE_WITH
        )

        assert.equal(data.secondDriver!.included, true)
        assert.match(secondDriverSupplementText(data.secondDriver!), /incluido sin coste adicional/)
    })
})

// =====================================================================================
// 6. ADMIN: EL DESGLOSE QUE VE EL ADMIN FRENTE AL QUE SE COBRÓ
// =====================================================================================

describe('Admin: el desglose pormenorizado y el suplemento', () => {
    const ADMIN_SOURCE = readFileSync('app/[locale]/admin/bookings/BookingDetailModal.tsx', 'utf8')

    /** Reserva de 7 noches con 2º conductor cobrado: 700 de alquiler + 35 de suplemento */
    const conSuplemento = {
        id: 'b1',
        total_price: 735,
        passengers: [{ fullName: 'Luis Pérez', dniNie: 'AB123456', isSecondDriver: true }],
        pricing_breakdown: {
            depositOption: 'standard_2000', secondDriver: true,
            secondDriverRatePerDay: SECOND_DRIVER_RATE_PER_DAY, secondDriverSupplement: SUPPLEMENT,
        },
    }
    const input = {
        basePrice: 700, nights: DAYS, kmLabel: 'incluidos', cancellationLabel: 'estándar',
        kmSupplement: 0, cancellationSupplement: 0, extrasSubtotal: 0, discountAmount: 0, extrasCount: 0,
    }

    // QA-SD-5 (resuelto, reescrito 2026-11-09): la aserción original buscaba `secondDriverSupplement`
    // dentro de BookingDetailModal.tsx, pero la lógica se movió a lib/admin/bookingBreakdown.ts.
    // Aquí se comprueba donde está ahora y, sobre todo, que las líneas cuadren con el total cobrado
    it('QA-SD-5 el desglose de admin incluye la línea del 2º conductor y cuadra con el total', () => {
        const lines = buildBreakdownLines(conSuplemento, input)
        const second = lines.find(line => line.kind === 'secondDriver')

        assert.ok(second, 'el desglose no tiene línea de 2º conductor')
        assert.equal(second!.amount, SUPPLEMENT)
        assert.match(second!.label, /Luis Pérez/)
        assert.equal(sumBreakdownLines(lines), 735, 'las líneas no suman el Total Abonado')
    })

    it('QA-SD-5 el modal pinta esas líneas y la ficha del 2º conductor de la reserva', () => {
        assert.match(ADMIN_SOURCE, /from '@\/lib\/admin\/bookingBreakdown'/)
        assert.match(ADMIN_SOURCE, /const secondDriver = adminBookingSecondDriver\(booking\)/)
        assert.match(ADMIN_SOURCE, /breakdownLines\.map\(line =>/)
    })

    it('sin 2º conductor no aparece la línea', () => {
        const lines = buildBreakdownLines(
            { id: 'b2', total_price: 700, passengers: [], pricing_breakdown: { depositOption: 'standard_2000' } },
            input
        )

        assert.equal(lines.find(line => line.kind === 'secondDriver'), undefined)
        assert.equal(sumBreakdownLines(lines), 700)
    })

    it('el resumen del asistente sí tiene la línea (comparación)', () => {
        const summary = readFileSync('app/[locale]/reserva/[slug]/StickyTripSummary.tsx', 'utf8')
        assert.match(summary, /breakdown\.secondDriver &&/)
        assert.match(summary, /secondDriverSupplement/)
    })
})
