import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFlows, cents, redsysForm, step5Payload, NEO } from './helpers/qaFlows'
import { Row } from './helpers/fakeSupabase'
import { calculatePriceV2, SECOND_DRIVER_RATE_PER_DAY } from '../lib/pricing/engine'
import { validateBookingPassengers } from '../app/api/bookings/checkout/route'

/**
 * Decisión de negocio de Javier: con fianza Estándar (2.000 €) el 2º conductor cuesta 5 €/día;
 * con fianza Flex (1.000 €, +10 €/día) sigue incluido sin coste. Como máximo uno por reserva.
 *
 * Aquí se comprueba el motor de precios (punto 1), la regla única del checkout (punto 3) y las
 * fechas de los acompañantes que no conducen (punto 7). No se toca Supabase, Redsys ni RLS reales.
 */

const SEASONS = [
    { id: 'baja', code: 'baja', name: 'Baja', supplement_per_night: 0, min_nights: 3, is_default: true },
    { id: 'alta', code: 'alta', name: 'Alta', supplement_per_night: 60, min_nights: 5, is_default: false },
]
const PERIODS = [{ id: 'p1', season_id: 'alta', start_date: '2099-07-01', end_date: '2099-08-31' }]

const price = (overrides: Record<string, unknown> = {}) => calculatePriceV2({
    startDate: '2099-06-01',
    pickupSlot: 'afternoon',
    endDate: '2099-06-08', // 7 noches
    dropoffSlot: 'morning',
    camperBasePrice: 100,
    seasons: SEASONS as never,
    periods: PERIODS as never,
    discounts: [],
    kmPackage: 'included_150',
    cancellationPolicy: 'standard',
    depositOption: 'standard_2000',
    depositAmount: 2000,
    ...overrides,
})

// ============================================================
// 1. MOTOR DE PRECIOS
// ============================================================

describe('Motor de precios: línea del 2º conductor', () => {
    it('la tarifa vive en una constante exportada de 5 €/día', () => {
        assert.equal(SECOND_DRIVER_RATE_PER_DAY, 5)
    })

    it('con fianza Estándar cobra la constante por día y lo suma al total que se paga', () => {
        const sin = price()
        const con = price({ secondDriver: true })

        assert.equal(con.secondDriver, true)
        assert.equal(con.secondDriverRatePerDay, SECOND_DRIVER_RATE_PER_DAY)
        assert.equal(con.secondDriverSupplement, SECOND_DRIVER_RATE_PER_DAY * 7)
        assert.equal(con.payableTotal, sin.payableTotal + SECOND_DRIVER_RATE_PER_DAY * 7)
        assert.equal(con.totalPrice, con.payableTotal, 'total_price es payableTotal')
        assert.equal(con.grandTotalWithDeposit, con.payableTotal + 2000, 'la fianza no entra en lo que se cobra')
    })

    it('con fianza Flex sigue incluido: 0 € y el total no cambia', () => {
        const sin = price({ depositOption: 'flex_1000', depositAmount: 1000 })
        const con = price({ depositOption: 'flex_1000', depositAmount: 1000, secondDriver: true })

        assert.equal(con.secondDriver, true)
        assert.equal(con.includesSecondDriver, true)
        assert.equal(con.secondDriverRatePerDay, 0)
        assert.equal(con.secondDriverSupplement, 0)
        assert.equal(con.payableTotal, sin.payableTotal)
    })

    it('sin 2º conductor no hay línea ni suplemento, con ninguna fianza', () => {
        for (const depositOption of ['standard_2000', 'flex_1000'] as const) {
            const breakdown = price({ depositOption, depositAmount: depositOption === 'flex_1000' ? 1000 : 2000 })
            assert.equal(breakdown.secondDriver, false, depositOption)
            assert.equal(breakdown.secondDriverRatePerDay, 0, depositOption)
            assert.equal(breakdown.secondDriverSupplement, 0, depositOption)
        }
    })

    it('el medio día compartido cuenta: recogida por la mañana y devolución por la tarde son 8 días', () => {
        const con = price({ pickupSlot: 'morning', dropoffSlot: 'afternoon', secondDriver: true })

        assert.equal(con.totalDays, 8)
        assert.equal(con.secondDriverSupplement, SECOND_DRIVER_RATE_PER_DAY * 8)
    })

    it('un solo medio día deja un total con decimales (7,5 días × 5 €)', () => {
        const con = price({ dropoffSlot: 'afternoon', secondDriver: true })

        assert.equal(con.totalDays, 7.5)
        assert.equal(con.secondDriverSupplement, 37.5)
    })

    it('un cambio de temporada dentro de la reserva no altera el suplemento: es por día', () => {
        const cruzada = {
            startDate: '2099-06-28',
            endDate: '2099-07-05', // 3 noches en Baja y 4 en Alta
        }
        const sin = price(cruzada)
        const con = price({ ...cruzada, secondDriver: true })

        assert.ok(sin.nightsPerSeason.length > 1, 'la reserva debe cruzar dos temporadas')
        assert.equal(con.secondDriverSupplement, SECOND_DRIVER_RATE_PER_DAY * 7)
        assert.equal(con.payableTotal, sin.payableTotal + SECOND_DRIVER_RATE_PER_DAY * 7)
    })

    it('el descuento por estancia no se aplica al suplemento del 2º conductor', () => {
        const discounts = [{ id: 'd1', min_days: 7, discount_pct: 10, is_active: true }]
        const sin = price({ discounts })
        const con = price({ discounts, secondDriver: true })

        assert.equal(con.discountPct, 10)
        assert.equal(con.secondDriverSupplement, SECOND_DRIVER_RATE_PER_DAY * 7)
        assert.equal(con.payableTotal, sin.payableTotal + SECOND_DRIVER_RATE_PER_DAY * 7)
    })

    it('un rango sin noches no cobra nada y conserva la bandera', () => {
        const vacio = price({ startDate: '2099-06-01', endDate: '2099-06-01', secondDriver: true })

        assert.equal(vacio.numNights, 0)
        assert.equal(vacio.payableTotal, 0)
        assert.equal(vacio.secondDriver, true)
        assert.equal(vacio.secondDriverSupplement, 0)
    })

    it('el IVA se desglosa sobre el total con el suplemento dentro', () => {
        const con = price({ secondDriver: true })

        assert.equal(con.netTotal, Math.round((con.payableTotal / 1.21) * 100) / 100)
        assert.equal(con.vatAmount, Math.round((con.payableTotal - con.netTotal) * 100) / 100)
    })
})

// ============================================================
// 3. CHECKOUT EN EL SERVIDOR: UNA SOLA REGLA
// ============================================================

const companion = (fullName: string, dniNie: string): Row => ({ fullName, dniNie, birthDate: '', isSecondDriver: false, licenseDate: '' })
const DRIVER: Row = { fullName: 'Luis Pérez', dniNie: 'AB123456', birthDate: '1985-01-01', licenseDate: '2010-01-01' }

describe('Checkout: regla única del 2º conductor', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
        console.error = () => {}
        console.warn = () => {}
    })
    afterEach(() => { flows.fake.restore(); Object.assign(console, silenced) })

    /** 7 noches con recogida por la tarde y devolución por la mañana: 7 días */
    const EXPECTED_SUPPLEMENT = SECOND_DRIVER_RATE_PER_DAY * 7

    it('un acompañante marcado como 2º conductor se cobra con Estándar y es gratis con Flex', async () => {
        const totals: Record<string, number> = {}
        for (const deposit of ['standard_2000', 'flex_1000'] as const) {
            for (const withDriver of [false, true]) {
                flows.fake.restore()
                flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
                const passenger = withDriver ? { ...companion('Luis Pérez', 'AB123456'), ...DRIVER, isSecondDriver: true } : companion('Luis Pérez', 'AB123456')
                const { status, json } = await flows.checkout(step5Payload({ depositOption: deposit }, {
                    depositOption: deposit, travelersCount: 2, passengers: [passenger],
                }))

                assert.equal(status, 200, `${deposit}/${withDriver} → ${json.error}`)
                totals[`${deposit}-${withDriver}`] = json.breakdown.payableTotal
                assert.equal(json.breakdown.secondDriver, withDriver)
                assert.equal(
                    json.breakdown.secondDriverSupplement,
                    withDriver && deposit === 'standard_2000' ? EXPECTED_SUPPLEMENT : 0,
                )
            }
        }

        assert.equal(totals['standard_2000-true'], totals['standard_2000-false'] + EXPECTED_SUPPLEMENT)
        assert.equal(totals['flex_1000-true'], totals['flex_1000-false'], 'con Flex va incluido')
    })

    it('el suplemento se cobra de verdad: total_price, el formulario de Redsys y el desglose guardado', async () => {
        const { json } = await flows.checkout(step5Payload({}, {
            travelersCount: 2, passengers: [{ ...DRIVER, isSecondDriver: true }],
        }))

        const saved = flows.fake.tables.bookings[0]
        assert.equal(saved.total_price, json.breakdown.payableTotal)
        assert.equal(saved.pricing_breakdown.secondDriverSupplement, EXPECTED_SUPPLEMENT)
        assert.equal(saved.pricing_breakdown.secondDriverRatePerDay, SECOND_DRIVER_RATE_PER_DAY)
        // Lo que se manda a Redsys: Ds_Amount en céntimos, con el suplemento dentro
        const sent = redsysForm(json.formData.merchantParameters)
        assert.equal(sent.DS_MERCHANT_AMOUNT, String(cents(json.breakdown.payableTotal)))
        assert.equal(sent.DS_MERCHANT_ORDER, json.orderId)
    })

    it('no acepta el importe del navegador: un total rebajado no cambia lo que se cobra', async () => {
        const honesto = await flows.checkout(step5Payload({}, {
            travelersCount: 2, passengers: [{ ...DRIVER, isSecondDriver: true }],
        }))
        const esperado = honesto.json.breakdown.payableTotal

        flows.fake.restore()
        flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
        const manipulado = await flows.checkout({
            ...step5Payload({
                totalPrice: 1,
                payableTotal: 1,
                total: 1,
                breakdown: { payableTotal: 1, secondDriverSupplement: 0, secondDriverRatePerDay: 0 },
                secondDriverSupplement: 0,
            }, { travelersCount: 2, passengers: [{ ...DRIVER, isSecondDriver: true }] }),
        })

        assert.equal(manipulado.status, 200, manipulado.json.error)
        assert.equal(manipulado.json.breakdown.payableTotal, esperado)
        assert.equal(manipulado.json.breakdown.secondDriverSupplement, EXPECTED_SUPPLEMENT)
        assert.equal(flows.fake.tables.bookings[0].total_price, esperado)
    })

    it('una notificación con el importe sin el suplemento no marca la reserva como pagada', async () => {
        const { json } = await flows.checkout(step5Payload({}, {
            travelersCount: 2, passengers: [{ ...DRIVER, isSecondDriver: true }],
        }))
        const sinSuplemento = cents(json.breakdown.payableTotal - EXPECTED_SUPPLEMENT)

        const corta = await flows.webhook(json.orderId, sinSuplemento)

        assert.equal(corta.status, 200, 'Redsys no debe repetir: el aviso ya está escrito')
        const saved = flows.fake.tables.bookings[0]
        assert.equal(saved.payment_status, 'pending')
        assert.equal(saved.status, 'pending', 'la notificación nunca cambia status')
        assert.match(saved.notes, /\[PAGO A REVISAR\]/)

        // Con el importe correcto sí cobra, y repetirla no cobra dos veces
        assert.equal((await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))).status, 200)
        assert.equal(flows.fake.tables.bookings[0].payment_status, 'paid')
        assert.equal((await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))).status, 200)
        assert.equal(flows.fake.tables.blocked_dates.filter((b: Row) => b.session_id === `redsys_${json.orderId}`).length, 1)
    })

    it('como máximo un 2º conductor, sea cual sea la fianza', async () => {
        for (const deposit of ['standard_2000', 'flex_1000'] as const) {
            flows.fake.restore()
            flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
            const { status, json } = await flows.checkout(step5Payload({ depositOption: deposit }, {
                depositOption: deposit,
                travelersCount: 3,
                passengers: [
                    { ...DRIVER, isSecondDriver: true },
                    { fullName: 'Ana Ruiz', dniNie: 'X1234567L', birthDate: '1986-02-02', licenseDate: '2011-03-03', isSecondDriver: true },
                ],
            }))

            assert.equal(status, 400, deposit)
            assert.match(json.error, /segundo conductor/i)
            assert.equal(flows.fake.tables.bookings.length, 0, deposit)
        }
    })

    it('los otros nombres de la bandera cuentan igual (is_second_driver, secondDriver, isDriver)', () => {
        for (const flag of ['is_second_driver', 'secondDriver', 'isDriver']) {
            const result = validateBookingPassengers([
                { ...DRIVER, isSecondDriver: true },
                { fullName: 'Ana Ruiz', dniNie: 'X1234567L', [flag]: true },
            ], new Date('2099-06-01'))

            assert.equal(result.isValid, false, flag)
            assert.match(result.error!, /segundo conductor/i)
        }
    })

    it('el 2º conductor "solo" solo vale con 1 viajero: con más, se ignora', async () => {
        const { status, json } = await flows.checkout(step5Payload({}, {
            travelersCount: 2, passengers: [companion('Ana Ruiz', 'X1234567L')],
            secondDriverSoloEnabled: true, secondDriverSolo: DRIVER,
        }))

        assert.equal(status, 200, json.error)
        assert.equal(json.breakdown.secondDriver, false)
        assert.equal(json.breakdown.secondDriverSupplement, 0)
        assert.equal(flows.fake.tables.bookings[0].passengers.filter((p: Row) => p.isSecondDriver).length, 0)
    })

    it('un secondDriver enviado aparte ocupa plaza y cuenta en el número de viajeros', async () => {
        const corto = await flows.checkout(step5Payload({ secondDriver: DRIVER }, {
            travelersCount: 2, passengers: [companion('Ana Ruiz', 'X1234567L')],
        }))

        assert.equal(corto.status, 400, 'titular + acompañante + 2º conductor son 3 plazas')
        assert.match(corto.json.error, /2 viajeros y 2 acompañantes/)

        flows.fake.restore()
        flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
        const cabe = await flows.checkout(step5Payload({ secondDriver: DRIVER }, {
            travelersCount: 3, passengers: [companion('Ana Ruiz', 'X1234567L')],
        }))

        assert.equal(cabe.status, 200, cabe.json.error)
        assert.equal(cabe.json.breakdown.secondDriverSupplement, EXPECTED_SUPPLEMENT)
        assert.equal(flows.fake.tables.bookings[0].passengers.length, 2)
    })

    it('un secondDriver aparte que ya es acompañante no ocupa plaza nueva ni se duplica', async () => {
        const { status, json } = await flows.checkout(step5Payload({ secondDriver: DRIVER }, {
            travelersCount: 2, passengers: [{ ...DRIVER, isSecondDriver: false }],
        }))

        assert.equal(status, 200, json.error)
        const saved = flows.fake.tables.bookings[0]
        assert.equal(saved.passengers.length, 1)
        assert.equal(saved.passengers[0].isSecondDriver, true)
        assert.equal(json.breakdown.secondDriverSupplement, EXPECTED_SUPPLEMENT)
    })

    it('al 2º conductor se le siguen exigiendo 25 años y 2 años de carnet con fianza Estándar', async () => {
        for (const bad of [{ birthDate: '2090-01-01' }, { licenseDate: '2098-01-01' }]) {
            flows.fake.restore()
            flows = installFlows({ campers: [{ ...NEO, specs: { seats: 3 } }] })
            const { status } = await flows.checkout(step5Payload({}, {
                travelersCount: 2, passengers: [{ ...DRIVER, ...bad, isSecondDriver: true }],
            }))

            assert.equal(status, 400, JSON.stringify(bad))
            assert.equal(flows.fake.tables.bookings.length, 0)
        }
    })
})

// ============================================================
// 7. FECHAS DE LOS ACOMPAÑANTES QUE NO CONDUCEN
// ============================================================

describe('Checkout: fechas de los acompañantes que no conducen', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        flows = installFlows()
        console.error = () => {}
        console.warn = () => {}
    })
    afterEach(() => { flows.fake.restore(); Object.assign(console, silenced) })

    const withCompanion = (extra: Row) => flows.checkout(step5Payload({}, {
        travelersCount: 2,
        passengers: [{ fullName: 'Ana Ruiz', dniNie: 'X1234567L', ...extra }],
    }))

    it('guarda la fecha tal cual, sin desplazarla por la zona horaria', async () => {
        const { status, json } = await withCompanion({ birthDate: '1990-01-01' })

        assert.equal(status, 200, json.error)
        const [passenger] = flows.fake.tables.bookings[0].passengers
        assert.equal(passenger.birthDate, '1990-01-01')
        assert.equal(passenger.isSecondDriver, false)
    })

    it('el día no se mueve ni con el servidor en una zona al oeste de Greenwich', async () => {
        const previous = process.env.TZ
        process.env.TZ = 'America/Los_Angeles'
        try {
            const { status } = await withCompanion({ birthDate: '1990-01-01', licenseDate: '2015-06-15' })

            assert.equal(status, 200)
            const [passenger] = flows.fake.tables.bookings[0].passengers
            assert.equal(passenger.birthDate, '1990-01-01')
            assert.equal(passenger.licenseDate, '2015-06-15')
        } finally {
            if (previous === undefined) delete process.env.TZ
            else process.env.TZ = previous
        }
    })

    for (const value of ['1990/01/01 (texto)', '01-01-1990', '1990-13-01', '1990-02-30', '1990-1-1', '1990-01-01T00:00:00Z', 19900101]) {
        it(`rechaza con 400 la fecha de nacimiento ${JSON.stringify(value)} de un acompañante`, async () => {
            const { status, json } = await withCompanion({ birthDate: value })

            assert.equal(status, 400)
            assert.match(json.error, /fecha de nacimiento del acompañante/i)
            assert.equal(flows.fake.tables.bookings.length, 0, 'no se escribe nada')
            assert.deepEqual(flows.fake.tables.blocked_dates, [], 'ni se bloquea el calendario')
        })
    }

    for (const value of ['2015/06/15 (texto)', '15-06-2015', '2015-06-31']) {
        it(`rechaza con 400 la fecha de carnet ${JSON.stringify(value)} de un acompañante`, async () => {
            const { status, json } = await withCompanion({ licenseDate: value })

            assert.equal(status, 400)
            assert.match(json.error, /carnet de conducir del acompañante/i)
            assert.equal(flows.fake.tables.bookings.length, 0)
        })
    }

    it('las fechas de un acompañante siguen siendo opcionales', async () => {
        const { status, json } = await withCompanion({ birthDate: '', licenseDate: '' })

        assert.equal(status, 200, json.error)
        const [passenger] = flows.fake.tables.bookings[0].passengers
        assert.equal(passenger.birthDate, null)
        assert.equal(passenger.licenseDate, null)
    })
})
