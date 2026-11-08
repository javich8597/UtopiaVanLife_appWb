import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { calculatePriceV2, SECOND_DRIVER_RATE_PER_DAY } from '../lib/pricing/engine'
import {
    adminBookingSecondDriver,
    bookingFlexDeposit,
    buildBreakdownLines,
    resolveBasePrice,
    sumBreakdownLines,
} from '../lib/admin/bookingBreakdown'

/**
 * QA-SD-5: el «Desglose Económico Pormenorizado» del detalle de reserva del backoffice tiene que
 * sumar lo mismo que el «Total Abonado». El suplemento del segundo conductor (5 €/día con fianza
 * Estándar) y el de la fianza Flex (+10 €/día) van dentro de `total_price`, pero solo viven en
 * `pricing_breakdown`. No se toca Supabase: las filas se construyen como las escribe el checkout.
 */

const SEASONS = [{ id: 'baja', code: 'baja', name: 'Baja', supplement_per_night: 0, min_nights: 3, is_default: true }]
const NIGHTS = 7

const ANA = { fullName: 'Ana Ruiz', dniNie: '12345678Z', isSecondDriver: true, birthDate: '1990-01-01', licenseDate: '2012-01-01' }
const LUIS = { fullName: 'Luis Gil', dniNie: '87654321X', isSecondDriver: false }

function bookingRow(opts: {
    deposit?: 'standard_2000' | 'flex_1000'
    secondDriver?: boolean
    km?: 'included_150' | 'unlimited'
    cancellation?: 'standard' | 'flexible'
    discount?: boolean
    passengers?: unknown[]
} = {}): Record<string, any> {
    const deposit = opts.deposit ?? 'standard_2000'
    const b = calculatePriceV2({
        startDate: '2099-06-01',
        pickupSlot: 'afternoon',
        endDate: '2099-06-08',
        dropoffSlot: 'morning',
        camperBasePrice: 100,
        seasons: SEASONS as never,
        periods: [],
        discounts: opts.discount ? [{ min_days: 7, discount_pct: 10, is_active: true }] : [],
        kmPackage: opts.km ?? 'included_150',
        cancellationPolicy: opts.cancellation ?? 'standard',
        depositOption: deposit,
        depositAmount: deposit === 'flex_1000' ? 1000 : 2000,
        secondDriver: Boolean(opts.secondDriver),
        extrasSelected: [{ id: 'sup', name: 'Paddle surf', price: 20, quantity: 2, pricingType: 'per_rental' }] as never,
    })
    const passengers = opts.passengers ?? (opts.secondDriver ? [ANA, LUIS] : [LUIS])
    // Mismas columnas que escribe app/api/bookings/checkout/route.ts
    return {
        id: '11111111-aaaa-bbbb-cccc-222222222222',
        km_package: opts.km ?? 'included_150',
        km_price: b.kmSupplement,
        cancellation_policy: opts.cancellation ?? 'standard',
        cancellation_price: b.cancellationSupplement,
        extras_total: b.extrasTotal,
        base_price: b.baseRentalTotal,
        discount_amount: b.discountAmount,
        deposit_amount: b.depositAmount,
        total_price: b.payableTotal,
        pricing_breakdown: { ...b, passengers },
        passengers,
    }
}

/** Lo que el modal pasa a buildBreakdownLines: las mismas cifras que lee de la fila */
function linesFor(row: Record<string, any>) {
    const parts = {
        kmSupplement: row.km_price,
        cancellationSupplement: row.cancellation_price,
        extrasSubtotal: row.extras_total,
        discountAmount: row.discount_amount,
    }
    const basePrice = resolveBasePrice(row, parts)
    return buildBreakdownLines(row, {
        ...parts,
        basePrice,
        nights: NIGHTS,
        kmLabel: 'km',
        cancellationLabel: 'cancelación',
        extrasCount: 1,
    })
}

describe('Desglose económico del detalle de reserva: cuadra con el total', () => {
    const scenarios: Array<[string, Parameters<typeof bookingRow>[0]]> = [
        ['Estándar sin segundo conductor', {}],
        ['Estándar con segundo conductor (35 €)', { secondDriver: true }],
        ['Flex sin segundo conductor (70 € de fianza Flex)', { deposit: 'flex_1000' }],
        ['Flex con segundo conductor (incluido)', { deposit: 'flex_1000', secondDriver: true }],
        ['Estándar + 2º conductor + km ilimitado + cancelación flexible + descuento', { secondDriver: true, km: 'unlimited', cancellation: 'flexible', discount: true }],
        ['Flex + 2º conductor + km ilimitado + cancelación flexible + descuento', { deposit: 'flex_1000', secondDriver: true, km: 'unlimited', cancellation: 'flexible', discount: true }],
    ]

    for (const [name, opts] of scenarios) {
        it(`la suma de las líneas es el Total Abonado: ${name}`, () => {
            const row = bookingRow(opts)
            assert.equal(sumBreakdownLines(linesFor(row)), row.total_price)
        })
    }

    it('Estándar con segundo conductor: aparece una línea de 5 €/día × noches con el nombre', () => {
        const row = bookingRow({ secondDriver: true })
        const line = linesFor(row).find(l => l.kind === 'secondDriver')
        assert.ok(line, 'falta la línea del segundo conductor')
        assert.equal(line.amount, SECOND_DRIVER_RATE_PER_DAY * NIGHTS)
        assert.equal(line.included, false)
        assert.match(line.label, /Ana Ruiz/)
        assert.match(line.label, /5 €\/día/)
    })

    it('Flex con segundo conductor: la línea existe, va incluida y no suma', () => {
        const row = bookingRow({ deposit: 'flex_1000', secondDriver: true })
        const line = linesFor(row).find(l => l.kind === 'secondDriver')
        assert.ok(line, 'falta la línea del segundo conductor')
        assert.equal(line.amount, 0)
        assert.equal(line.included, true)
        assert.match(line.label, /incluido con fianza Flex/)
    })

    it('sin segundo conductor no hay línea de segundo conductor', () => {
        const row = bookingRow()
        assert.equal(linesFor(row).some(l => l.kind === 'secondDriver'), false)
    })

    it('la fianza Flex tiene su propia línea (+10 €/día) y la Estándar no', () => {
        const flex = linesFor(bookingRow({ deposit: 'flex_1000' })).find(l => l.kind === 'flexDeposit')
        assert.ok(flex, 'falta la línea de la fianza Flex')
        assert.equal(flex.amount, 10 * NIGHTS)
        assert.match(flex.label, /\+10 €\/día/)
        assert.equal(linesFor(bookingRow()).some(l => l.kind === 'flexDeposit'), false)
    })
})

describe('Alquiler base cuando la fila no trae base_price', () => {
    it('resta el suplemento del segundo conductor (Estándar): 500 € y no 535 €', () => {
        const row = bookingRow({ secondDriver: true })
        row.base_price = null
        // Desglose parcial, sin el alquiler: obliga al respaldo por resta
        row.pricing_breakdown = {
            secondDriver: true,
            secondDriverRatePerDay: 5,
            secondDriverSupplement: 35,
            passengers: row.passengers,
        }
        const parts = { kmSupplement: 0, cancellationSupplement: 0, extrasSubtotal: row.extras_total, discountAmount: 0 }
        assert.equal(resolveBasePrice(row, parts), row.total_price - 35 - row.extras_total)
    })

    it('resta el suplemento de la fianza Flex', () => {
        const row = bookingRow({ deposit: 'flex_1000' })
        row.base_price = null
        row.pricing_breakdown = { depositOption: 'flex_1000', flexDepositRatePerDay: 10, flexDepositSupplement: 70 }
        const parts = { kmSupplement: 0, cancellationSupplement: 0, extrasSubtotal: row.extras_total, discountAmount: 0 }
        assert.equal(resolveBasePrice(row, parts), row.total_price - 70 - row.extras_total)
    })

    it('con el desglose completo usa el alquiler del desglose, no la tarifa por noche', () => {
        const row = bookingRow({ secondDriver: true, deposit: 'flex_1000' })
        const expected = row.base_price
        row.base_price = null
        const parts = { kmSupplement: 0, cancellationSupplement: 0, extrasSubtotal: row.extras_total, discountAmount: 0 }
        assert.equal(resolveBasePrice(row, parts), expected)
        assert.notEqual(resolveBasePrice(row, parts), 100, 'pricing_breakdown.basePrice es la tarifa por noche')
    })

    it('respeta base_price si la fila lo trae', () => {
        const row = bookingRow({ secondDriver: true })
        const parts = { kmSupplement: 0, cancellationSupplement: 0, extrasSubtotal: 0, discountAmount: 0 }
        assert.equal(resolveBasePrice(row, parts), row.base_price)
    })
})

describe('Quién es el segundo conductor en el panel', () => {
    it('sale del acompañante con isSecondDriver de la reserva', () => {
        const sd = adminBookingSecondDriver(bookingRow({ secondDriver: true }))
        assert.ok(sd)
        assert.equal(sd.fullName, 'Ana Ruiz')
        assert.equal(sd.document, '12345678Z')
        assert.equal(sd.supplement, 35)
        assert.equal(sd.included, false)
    })

    it('no se toma del perfil del cliente aunque lo traiga', () => {
        const row = bookingRow({ secondDriver: true })
        row.users = { full_name: 'Titular', has_second_driver: true, second_driver_name: 'Persona del perfil', second_driver_dni: '99999999R' }
        const sd = adminBookingSecondDriver(row)
        assert.equal(sd?.fullName, 'Ana Ruiz')
        assert.equal(sd?.document, '12345678Z')
    })

    it('una reserva sin segundo conductor no lo muestra aunque el perfil del cliente tenga uno', () => {
        const row = bookingRow()
        row.users = { has_second_driver: true, second_driver_name: 'Persona del perfil', second_driver_dni: '99999999R' }
        assert.equal(adminBookingSecondDriver(row), null)
    })

    it('si solo consta la bandera del desglose, avisa de que faltan sus datos en vez de inventarlos', () => {
        const row = bookingRow({ secondDriver: true, passengers: [] })
        row.pricing_breakdown.passengers = []
        const sd = adminBookingSecondDriver(row)
        assert.ok(sd)
        assert.equal(sd.fullName, '')
        assert.equal(sd.document, '')
        assert.equal(sd.supplement, 35)
    })

    it('con Flex lo marca como incluido', () => {
        const sd = adminBookingSecondDriver(bookingRow({ deposit: 'flex_1000', secondDriver: true }))
        assert.equal(sd?.included, true)
        assert.equal(sd?.supplement, 0)
        assert.equal(bookingFlexDeposit(bookingRow({ deposit: 'flex_1000' })).supplement, 70)
    })
})

describe('BookingDetailModal usa el desglose compartido', () => {
    const source = readFileSync(new URL('../app/[locale]/admin/bookings/BookingDetailModal.tsx', import.meta.url), 'utf8')

    it('pinta las líneas desde buildBreakdownLines y no las escribe a mano', () => {
        assert.match(source, /buildBreakdownLines\(/)
        assert.match(source, /resolveBasePrice\(/)
        assert.match(source, /adminBookingSecondDriver\(/)
    })

    it('no vuelve al respaldo antiguo que no restaba los suplementos nuevos', () => {
        assert.doesNotMatch(source, /booking\.total_price - kmSupplement - cancellationSupplement - extrasSubtotal/)
        assert.doesNotMatch(source, /booking\.pricing_breakdown\?\.basePrice/)
    })

    it('el segundo conductor no se lee del perfil del cliente', () => {
        assert.doesNotMatch(source, /users\??\.second_driver/)
    })
})
