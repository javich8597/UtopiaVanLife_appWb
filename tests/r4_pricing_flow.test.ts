import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    calculatePriceV2,
    SeasonV2,
    SeasonPeriod,
    DurationDiscount,
    DaySlot,
    formatPrice,
} from '../lib/pricing/engine'

// =========================================================================
// R4 PRICING ENGINE INTERFACE & REFERENCE IMPLEMENTATION (ORIGINAL_REQUEST.md)
// =========================================================================

export type KmPackage = 'included_150' | 'unlimited'
export type CancellationPolicy = 'standard' | 'flexible'
export type ExtraPricingType = 'per_rental' | 'per_day'

export interface R4CategorizedExtra {
    id: string
    name: string
    category: 'Equipamiento' | 'Deporte' | 'Confort' | string
    price: number
    priceType: ExtraPricingType
    quantity?: number
}

export interface R4PricingBreakdown {
    nights: number
    totalDays: number
    basePricePerNight: number
    baseRentalTotal: number
    slotSupplement: number
    discountPct: number
    discountAmount: number
    discountedBaseTotal: number
    kmPackage: KmPackage
    kmRatePerDay: number
    kmSupplement: number
    cancellationPolicy: CancellationPolicy
    cancellationRatePerDay: number
    cancellationSupplement: number
    extrasTotal: number
    itemizedExtras: Array<{
        id: string
        name: string
        category: string
        quantity: number
        unitPrice: number
        pricingType: ExtraPricingType
        total: number
    }>
    payableTotal: number // 100% of trip (to pay via Redsys)
    depositAmount: number // Refundable hold (1.000 €)
    grandTotalWithDeposit: number
}

export interface CalculateR4PriceParams {
    startDate: Date
    startSlot?: DaySlot
    endDate: Date
    endSlot?: DaySlot
    camperBasePrice: number
    seasons: SeasonV2[]
    periods: SeasonPeriod[]
    discounts?: DurationDiscount[]
    kmPackage?: KmPackage
    cancellationPolicy?: CancellationPolicy
    extras?: R4CategorizedExtra[]
    depositAmount?: number
}

/**
 * Authoritative pricing calculation derived from ORIGINAL_REQUEST.md Follow-up:
 * - 150 km/day included: 0 €
 * - Unlimited km: +15 €/day
 * - Standard cancellation: 0 €
 * - Flexible cancellation: +8 €/day
 * - Categorized extras: fixed (per_rental) vs daily (per_day * ceil(totalDays))
 * - Deposit: 1.000 € informative refundable hold
 */
export function calculateR4Price({
    startDate,
    startSlot = 'afternoon',
    endDate,
    endSlot = 'morning',
    camperBasePrice,
    seasons,
    periods,
    discounts = [],
    kmPackage = 'included_150',
    cancellationPolicy = 'standard',
    extras = [],
    depositAmount = 1000,
}: CalculateR4PriceParams): R4PricingBreakdown {
    // 1. Calculate base pricing using project's V2 engine
    const baseBreakdown = calculatePriceV2({
        startDate,
        startSlot,
        endDate,
        endSlot,
        camperBasePrice,
        seasons,
        periods,
        discounts,
        selectedExtras: [], // We calculate R4 categorized extras below
        depositAmount: 0,
    })

    const totalDays = baseBreakdown.totalDays
    const nights = baseBreakdown.numNights

    // 2. KM Package calculation
    const kmRatePerDay = kmPackage === 'unlimited' ? 15 : 0
    const kmSupplement = Math.round(kmRatePerDay * totalDays * 100) / 100

    // 3. Cancellation Policy calculation
    const cancellationRatePerDay = cancellationPolicy === 'flexible' ? 8 : 0
    const cancellationSupplement = Math.round(cancellationRatePerDay * totalDays * 100) / 100

    // 4. Categorized Extras calculation
    const itemizedExtras = extras.map(e => {
        const qty = e.quantity ?? 1
        const unitPrice = Number(e.price) || 0
        const multiplier = e.priceType === 'per_day' ? Math.ceil(totalDays) : 1
        const total = Math.round(unitPrice * multiplier * qty * 100) / 100
        return {
            id: e.id,
            name: e.name,
            category: e.category,
            quantity: qty,
            unitPrice,
            pricingType: e.priceType,
            total,
        }
    })

    const extrasTotal = Math.round(itemizedExtras.reduce((sum, item) => sum + item.total, 0) * 100) / 100

    // 5. Total calculations
    const discountedBase = Math.round((baseBreakdown.baseTotal - baseBreakdown.discountAmount) * 100) / 100
    const payableTotal = Math.round((discountedBase + kmSupplement + cancellationSupplement + extrasTotal) * 100) / 100
    const grandTotalWithDeposit = Math.round((payableTotal + depositAmount) * 100) / 100

    return {
        nights,
        totalDays,
        basePricePerNight: camperBasePrice,
        baseRentalTotal: baseBreakdown.baseTotal,
        slotSupplement: baseBreakdown.baseTotal - (nights * camperBasePrice),
        discountPct: baseBreakdown.discountPct,
        discountAmount: baseBreakdown.discountAmount,
        discountedBaseTotal: discountedBase,
        kmPackage,
        kmRatePerDay,
        kmSupplement,
        cancellationPolicy,
        cancellationRatePerDay,
        cancellationSupplement,
        extrasTotal,
        itemizedExtras,
        payableTotal,
        depositAmount,
        grandTotalWithDeposit,
    }
}

// =========================================================================
// TEST FIXTURES
// =========================================================================

const mockSeasons: SeasonV2[] = [
    {
        id: 'season-baja',
        code: 'baja',
        name: 'Temporada Baja',
        supplement_per_night: 0,
        min_nights: 3,
        is_default: true,
    },
    {
        id: 'season-alta',
        code: 'alta',
        name: 'Temporada Alta',
        supplement_per_night: 40,
        min_nights: 5,
        is_default: false,
    },
]

const mockPeriods: SeasonPeriod[] = [
    {
        season_id: 'season-alta',
        start_date: '2026-07-01',
        end_date: '2026-08-31',
        label: 'Verano Julio-Agosto',
    },
]

const mockDiscounts: DurationDiscount[] = [
    { min_days: 7, discount_pct: 10, is_active: true },
    { min_days: 14, discount_pct: 15, is_active: true },
    { min_days: 21, discount_pct: 20, is_active: true },
]

// =========================================================================
// TEST SUITE: R4 PRICING FLOW
// =========================================================================

describe('R4 Pricing Flow & Supplements Test Suite', () => {

    // ---------------------------------------------------------------------
    // TIER 1: Core Pricing Rules & Supplements
    // ---------------------------------------------------------------------

    describe('Tier 1: KM Packages & Cancellation Supplements', () => {
        it('calculates 150 km/day included package with 0.00 € supplement', () => {
            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                endDate: new Date('2026-05-14'), // 4 nights, 4.0 days
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                kmPackage: 'included_150',
            })

            assert.equal(result.nights, 4)
            assert.equal(result.totalDays, 4.0)
            assert.equal(result.kmPackage, 'included_150')
            assert.equal(result.kmRatePerDay, 0)
            assert.equal(result.kmSupplement, 0)
        })

        it('calculates Unlimited KM (+15 €/day) correctly for 4 days (60.00 €)', () => {
            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                endDate: new Date('2026-05-14'), // 4 nights, 4.0 days
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                kmPackage: 'unlimited',
            })

            assert.equal(result.kmPackage, 'unlimited')
            assert.equal(result.kmRatePerDay, 15)
            assert.equal(result.kmSupplement, 60.00) // 4 * 15
        })

        it('calculates Standard Cancellation (0 €) correctly', () => {
            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                endDate: new Date('2026-05-14'),
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                cancellationPolicy: 'standard',
            })

            assert.equal(result.cancellationPolicy, 'standard')
            assert.equal(result.cancellationRatePerDay, 0)
            assert.equal(result.cancellationSupplement, 0)
        })

        it('calculates Flexible Cancellation (+8 €/day) correctly for 4 days (32.00 €)', () => {
            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                endDate: new Date('2026-05-14'),
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                cancellationPolicy: 'flexible',
            })

            assert.equal(result.cancellationPolicy, 'flexible')
            assert.equal(result.cancellationRatePerDay, 8)
            assert.equal(result.cancellationSupplement, 32.00) // 4 * 8
        })
    })

    describe('Tier 1: Categorized Extras (Fixed vs Per-Day)', () => {
        it('calculates fixed per_rental extras regardless of duration', () => {
            const extras: R4CategorizedExtra[] = [
                { id: 'surf', name: 'Tabla Paddle Surf', category: 'Deporte', price: 35, priceType: 'per_rental' },
                { id: 'cleaning', name: 'Limpieza Final', category: 'Confort', price: 50, priceType: 'per_rental' },
            ]

            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                endDate: new Date('2026-05-15'), // 5 nights
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                extras,
            })

            assert.equal(result.extrasTotal, 85.00)
            assert.equal(result.itemizedExtras.length, 2)
            assert.equal(result.itemizedExtras[0].total, 35)
            assert.equal(result.itemizedExtras[1].total, 50)
        })

        it('calculates per_day extras multiplied by total days', () => {
            const extras: R4CategorizedExtra[] = [
                { id: 'wifi', name: 'Wi-Fi 4G Ilimitado', category: 'Equipamiento', price: 5, priceType: 'per_day' },
            ]

            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                endDate: new Date('2026-05-14'), // 4.0 days
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                extras,
            })

            assert.equal(result.extrasTotal, 20.00) // 4 days * 5 €
            assert.equal(result.itemizedExtras[0].total, 20)
        })

        it('supports quantity multipliers on categorized extras', () => {
            const extras: R4CategorizedExtra[] = [
                { id: 'snorkel', name: 'Kit Snorkel', category: 'Deporte', price: 15, priceType: 'per_rental', quantity: 3 },
                { id: 'towel', name: 'Juego de Toallas', category: 'Confort', price: 3, priceType: 'per_day', quantity: 2 },
            ]

            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                endDate: new Date('2026-05-14'), // 4 days
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                extras,
            })

            // Snorkel: 15 * 3 = 45 €
            // Towels: 3 * 2 * 4 days = 24 €
            // Total = 69 €
            assert.equal(result.extrasTotal, 69.00)
            assert.equal(result.itemizedExtras[0].total, 45)
            assert.equal(result.itemizedExtras[1].total, 24)
        })
    })

    describe('Tier 1: Pickup and Dropoff Slots Impact on Total Days', () => {
        it('standard afternoon pickup to morning dropoff yields exact nights as totalDays (0 extra cost)', () => {
            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                startSlot: 'afternoon',
                endDate: new Date('2026-05-13'),
                endSlot: 'morning',
                camperBasePrice: 100,
                seasons: mockSeasons,
                periods: mockPeriods,
            })

            assert.equal(result.nights, 3)
            assert.equal(result.totalDays, 3.0)
            assert.equal(result.baseRentalTotal, 300.00)
        })

        it('morning pickup adds 0.5 day supplement', () => {
            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                startSlot: 'morning',
                endDate: new Date('2026-05-13'),
                endSlot: 'morning',
                camperBasePrice: 100,
                seasons: mockSeasons,
                periods: mockPeriods,
            })

            assert.equal(result.nights, 3)
            assert.equal(result.totalDays, 3.5)
            assert.equal(result.baseRentalTotal, 350.00) // 3 nights + 0.5 day
        })

        it('afternoon dropoff adds 0.5 day supplement', () => {
            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                startSlot: 'afternoon',
                endDate: new Date('2026-05-13'),
                endSlot: 'afternoon',
                camperBasePrice: 100,
                seasons: mockSeasons,
                periods: mockPeriods,
            })

            assert.equal(result.nights, 3)
            assert.equal(result.totalDays, 3.5)
            assert.equal(result.baseRentalTotal, 350.00)
        })

        it('morning pickup + afternoon dropoff adds full 1.0 day supplement', () => {
            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                startSlot: 'morning',
                endDate: new Date('2026-05-13'),
                endSlot: 'afternoon',
                camperBasePrice: 100,
                seasons: mockSeasons,
                periods: mockPeriods,
            })

            assert.equal(result.nights, 3)
            assert.equal(result.totalDays, 4.0)
            assert.equal(result.baseRentalTotal, 400.00)
        })
    })

    // ---------------------------------------------------------------------
    // TIER 2: Boundary Conditions & Extended Rentals
    // ---------------------------------------------------------------------

    describe('Tier 2: Boundary Conditions & Edge Cases', () => {
        it('calculates 1-night minimal stay accurately', () => {
            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                endDate: new Date('2026-05-11'), // 1 night = 1.0 day
                camperBasePrice: 120,
                seasons: mockSeasons,
                periods: mockPeriods,
                kmPackage: 'unlimited', // +15 €
                cancellationPolicy: 'flexible', // +8 €
            })

            assert.equal(result.nights, 1)
            assert.equal(result.totalDays, 1.0)
            assert.equal(result.baseRentalTotal, 120.00)
            assert.equal(result.kmSupplement, 15.00)
            assert.equal(result.cancellationSupplement, 8.00)
            assert.equal(result.payableTotal, 143.00) // 120 + 15 + 8
            assert.equal(result.depositAmount, 1000.00)
        })

        it('handles zero extras selected cleanly (extrasTotal = 0)', () => {
            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                endDate: new Date('2026-05-14'),
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                extras: [],
            })

            assert.equal(result.extrasTotal, 0)
            assert.equal(result.itemizedExtras.length, 0)
            assert.equal(result.payableTotal, 440.00) // 4 * 110
        })

        it('applies duration discounts to base rental for extended 30+ day rentals without discounting KM or cancellation', () => {
            // 30 nights = 30 days
            // Base price: 100 € * 30 = 3,000 €
            // Duration discount >= 21 days: 20% of base => 600 € discount
            // Discounted base: 2,400 €
            // KM unlimited: 30 * 15 = 450 €
            // Cancellation flexible: 30 * 8 = 240 €
            // Payable Total = 2,400 + 450 + 240 = 3,090 €
            const result = calculateR4Price({
                startDate: new Date('2026-05-01'),
                endDate: new Date('2026-05-31'),
                camperBasePrice: 100,
                seasons: mockSeasons,
                periods: mockPeriods,
                discounts: mockDiscounts,
                kmPackage: 'unlimited',
                cancellationPolicy: 'flexible',
            })

            assert.equal(result.nights, 30)
            assert.equal(result.totalDays, 30.0)
            assert.equal(result.baseRentalTotal, 3000.00)
            assert.equal(result.discountPct, 20)
            assert.equal(result.discountAmount, 600.00)
            assert.equal(result.discountedBaseTotal, 2400.00)
            assert.equal(result.kmSupplement, 450.00)
            assert.equal(result.cancellationSupplement, 240.00)
            assert.equal(result.payableTotal, 3090.00)
        })

        it('correctly applies High Season supplement (40 €/night) in July', () => {
            // Base camper 110 € + Alta supplement 40 € = 150 €/night
            // 5 nights in July: 750 €
            const result = calculateR4Price({
                startDate: new Date('2026-07-10'),
                endDate: new Date('2026-07-15'),
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                kmPackage: 'included_150',
                cancellationPolicy: 'standard',
            })

            assert.equal(result.nights, 5)
            assert.equal(result.baseRentalTotal, 750.00) // 5 * 150
            assert.equal(result.payableTotal, 750.00)
        })

        it('handles cross-season rentals spanning Low and High seasons', () => {
            // June 29, 30 (Baja: 110 €) + July 01, 02 (Alta: 150 €) = 220 + 300 = 520 €
            const result = calculateR4Price({
                startDate: new Date('2026-06-29'),
                endDate: new Date('2026-07-03'),
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                kmPackage: 'unlimited', // 4 * 15 = 60 €
                cancellationPolicy: 'standard', // 0 €
            })

            assert.equal(result.nights, 4)
            assert.equal(result.baseRentalTotal, 520.00)
            assert.equal(result.kmSupplement, 60.00)
            assert.equal(result.payableTotal, 580.00) // 520 + 60
        })

        it('segregates refundable deposit (1000 €) from the payable total', () => {
            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                endDate: new Date('2026-05-14'),
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                depositAmount: 1000,
            })

            assert.equal(result.payableTotal, 440.00)
            assert.equal(result.depositAmount, 1000.00)
            assert.equal(result.grandTotalWithDeposit, 1440.00)
            // Payable amount processed by Redsys is 440 €, not 1440 €
            assert.equal(result.payableTotal < result.grandTotalWithDeposit, true)
        })

        it('avoids floating point rounding errors in price calculations', () => {
            // 7 days @ 110 € = 770 €
            // 10% discount = 77.00 €
            // Discounted base = 693.00 €
            // KM unlimited (7 * 15) = 105.00 €
            // Flexible (7 * 8) = 56.00 €
            // Extras: 12.33 € + 17.67 € = 30.00 €
            // Grand sum = 693 + 105 + 56 + 30 = 884.00 €
            const extras: R4CategorizedExtra[] = [
                { id: 'e1', name: 'Extra 1', category: 'Confort', price: 12.33, priceType: 'per_rental' },
                { id: 'e2', name: 'Extra 2', category: 'Deporte', price: 17.67, priceType: 'per_rental' },
            ]

            const result = calculateR4Price({
                startDate: new Date('2026-05-10'),
                endDate: new Date('2026-05-17'),
                camperBasePrice: 110,
                seasons: mockSeasons,
                periods: mockPeriods,
                discounts: mockDiscounts,
                kmPackage: 'unlimited',
                cancellationPolicy: 'flexible',
                extras,
            })

            assert.equal(result.extrasTotal, 30.00)
            assert.equal(result.payableTotal, 884.00)
            assert.match(formatPrice(result.payableTotal), /884/)
        })
    })
})
