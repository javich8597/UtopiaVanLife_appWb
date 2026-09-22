import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    validateDniNieOrPassport,
    validateEmail,
    validatePhone,
    validateStep1,
    validateStep2,
    validateStep3,
    validateStep4,
    validateStep5,
    Step5Customer
} from '../app/[locale]/reserva/[slug]/types'
import {
    validateBookingRange,
    isSlotSelectableAsPickup,
    isSlotSelectableAsReturn,
    getSlotAvailability
} from '../lib/booking/calendarLogic'
import {
    calculatePriceV2,
    resolveSeasonForDate,
    resolveDurationDiscount,
    hasOverlappingPeriods,
    SeasonV2,
    SeasonPeriod,
    DurationDiscount
} from '../lib/pricing/engine'
import {
    generateRedsysOrderId,
    createRedsysPaymentForm,
    verifyRedsysSignature,
    isRedsysSuccess,
    encrypt3DES,
    calculateSignature,
    decodeMerchantParameters,
    encodeMerchantParameters,
    REDSYS_TEST_DEFAULTS
} from '../lib/redsys'

describe('Adversarial Stress Test: Domain 1 — DNI/NIE/Passport Validation', () => {
    it('exhaustively validates valid and invalid DNI modulo-23 letters', () => {
        const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
        // Test 23 different numbers yielding each expected letter
        for (let i = 0; i < 23; i++) {
            const num = 10000000 + i
            const expectedLetter = letters[num % 23]
            const dniStr = `${num}${expectedLetter}`
            const res = validateDniNieOrPassport(dniStr)
            assert.equal(res.isValid, true, `DNI ${dniStr} should be valid`)

            // Intentionally replace with a wrong letter
            const wrongLetter = letters[(num + 1) % 23]
            const badDni = `${num}${wrongLetter}`
            const badRes = validateDniNieOrPassport(badDni)
            assert.equal(badRes.isValid, false, `DNI ${badDni} with wrong letter should be rejected`)
            assert.ok(badRes.error?.includes('Letra de DNI incorrecta'))
        }
    })

    it('handles NIE prefixes X (0), Y (1), Z (2) across valid and corrupted letters', () => {
        // X1234567 -> 01234567 -> mod 23 is 19 -> 'L'
        assert.equal(validateDniNieOrPassport('X1234567L').isValid, true)
        assert.equal(validateDniNieOrPassport('X1234567A').isValid, false)

        // Y1234567 -> 11234567 -> mod 23 is 10 -> 'X'
        assert.equal(validateDniNieOrPassport('Y1234567X').isValid, true)
        assert.equal(validateDniNieOrPassport('Y1234567Z').isValid, false)

        // Z1234567 -> 21234567 -> mod 23 is 1 -> 'R'
        assert.equal(validateDniNieOrPassport('Z1234567R').isValid, true)
        assert.equal(validateDniNieOrPassport('Z1234567K').isValid, false)
    })

    it('robustly handles whitespace trimming and casing', () => {
        assert.equal(validateDniNieOrPassport('  12345678z  ').isValid, true)
        assert.equal(validateDniNieOrPassport('\t\n12345678Z\n').isValid, true)
        assert.equal(validateDniNieOrPassport('  x1234567l  ').isValid, true)
        assert.equal(validateDniNieOrPassport('  y1234567x  ').isValid, true)
        assert.equal(validateDniNieOrPassport('  z1234567r  ').isValid, true)
    })

    it('rejects foreign passport boundaries and malformed inputs', () => {
        // Valid 6 to 15 alphanumeric passport strings
        assert.equal(validateDniNieOrPassport('AB1234').isValid, true)
        assert.equal(validateDniNieOrPassport('123456789012345').isValid, true)
        assert.equal(validateDniNieOrPassport('PASS1234567890').isValid, true)

        // Boundary rejects: too short (5 chars) or too long (16 chars)
        assert.equal(validateDniNieOrPassport('A1234').isValid, false) // 5 chars
        assert.equal(validateDniNieOrPassport('1234567890123456').isValid, false) // 16 chars

        // Symbols, spaces inside, empty, non-string
        assert.equal(validateDniNieOrPassport('PASS-12345').isValid, false)
        assert.equal(validateDniNieOrPassport('PA 123456').isValid, false)
        assert.equal(validateDniNieOrPassport('').isValid, false)
        assert.equal(validateDniNieOrPassport(null as any).isValid, false)
        assert.equal(validateDniNieOrPassport(undefined as any).isValid, false)
    })
})

describe('Adversarial Stress Test: Domain 2 — Date Intervals & Calendar Logic', () => {
    it('strictly rejects same-day bookings and inverted date ranges', () => {
        // Same-day booking (0 nights)
        const sameDayRes = validateBookingRange('2026-10-10', 'afternoon', '2026-10-10', 'morning', [], 1)
        assert.equal(sameDayRes.isValid, false)
        assert.equal(sameDayRes.reason, 'invalid_dates')

        // Inverted range
        const invertedRes = validateBookingRange('2026-10-15', 'afternoon', '2026-10-10', 'morning', [], 1)
        assert.equal(invertedRes.isValid, false)
        assert.equal(invertedRes.reason, 'invalid_dates')
    })

    it('enforces minNights across various boundaries', () => {
        // Range of 2 nights with minNights = 3 -> rejected
        const shortStay = validateBookingRange('2026-10-01', 'afternoon', '2026-10-03', 'morning', [], 3)
        assert.equal(shortStay.isValid, false)
        assert.equal(shortStay.reason, 'min_nights')

        // Range of 3 nights with minNights = 3 -> valid
        const exactMin = validateBookingRange('2026-10-01', 'afternoon', '2026-10-04', 'morning', [], 3)
        assert.equal(exactMin.isValid, true)

        // Range of 6 nights with minNights = 7 (High Season) -> rejected
        const shortHigh = validateBookingRange('2026-07-01', 'afternoon', '2026-07-07', 'morning', [], 7)
        assert.equal(shortHigh.isValid, false)
        assert.equal(shortHigh.reason, 'min_nights')

        // Range of 7 nights with minNights = 7 -> valid
        const validHigh = validateBookingRange('2026-07-01', 'afternoon', '2026-07-08', 'morning', [], 7)
        assert.equal(validHigh.isValid, true)
    })

    it('correctly handles leap year (2028-02-28 to 2028-03-01) and month boundaries', () => {
        // 2028 is a leap year (Feb 29 exists)
        // 2028-02-28 to 2028-03-01 is 2 nights (28th->29th, 29th->1st)
        const leap2Nights = validateBookingRange('2028-02-28', 'afternoon', '2028-03-01', 'morning', [], 2)
        assert.equal(leap2Nights.isValid, true)

        // Month transition: 2026-04-30 to 2026-05-03 is 3 nights
        const monthTransition = validateBookingRange('2026-04-30', 'afternoon', '2026-05-03', 'morning', [], 3)
        assert.equal(monthTransition.isValid, true)

        // Year transition: 2026-12-30 to 2027-01-02 is 3 nights
        const yearTransition = validateBookingRange('2026-12-30', 'afternoon', '2027-01-02', 'morning', [], 3)
        assert.equal(yearTransition.isValid, true)
    })

    it('detects intermediate blocked dates correctly', () => {
        const blockedSlots = [
            { date: '2026-10-05', slot: 'full' as const }
        ]
        // 2026-10-03 to 2026-10-07 spans through 2026-10-05 (blocked)
        const blockedMid = validateBookingRange('2026-10-03', 'afternoon', '2026-10-07', 'morning', blockedSlots, 3)
        assert.equal(blockedMid.isValid, false)
        assert.equal(blockedMid.reason, 'blocked_dates')
    })

    it('allows valid turnover slots on pickup and dropoff boundaries', () => {
        // Existing booking checked out morning of 2026-10-03 (morning blocked)
        const turnoverSlots = [
            { date: '2026-10-03', slot: 'morning' as const }
        ]
        // New booking picking up afternoon of 2026-10-03 -> allowed!
        const pickupOk = validateBookingRange('2026-10-03', 'afternoon', '2026-10-06', 'morning', turnoverSlots, 3)
        assert.equal(pickupOk.isValid, true)

        // New booking picking up morning of 2026-10-03 -> rejected!
        const pickupBlocked = validateBookingRange('2026-10-03', 'morning', '2026-10-06', 'morning', turnoverSlots, 3)
        assert.equal(pickupBlocked.isValid, false)
        assert.equal(pickupBlocked.reason, 'blocked_dates')
    })
})

describe('Adversarial Stress Test: Domain 3 — Pricing Engine (calculatePriceV2)', () => {
    const mockSeasons: SeasonV2[] = [
        { id: 's-baja', code: 'baja', name: 'Temporada Baja', supplement_per_night: 0, min_nights: 3, is_default: true, color_badge: '#64748b' },
        { id: 's-alta', code: 'alta', name: 'Temporada Alta', supplement_per_night: 40, min_nights: 7, is_default: false, color_badge: '#f59e0b' },
    ]
    const mockPeriods: SeasonPeriod[] = [
        { id: 'p-alta-jul', season_id: 's-alta', start_date: '2026-07-01', end_date: '2026-07-31' },
    ]
    const mockDiscounts: DurationDiscount[] = [
        { id: 'd-7', min_days: 7, discount_pct: 10, is_active: true },
        { id: 'd-14', min_days: 14, discount_pct: 15, is_active: true },
        { id: 'd-21', min_days: 21, discount_pct: 20, is_active: true },
        { id: 'd-30', min_days: 30, discount_pct: 25, is_active: true },
    ]

    it('gracefully handles 0 nights or negative durations', () => {
        const res = calculatePriceV2({
            camperId: 'camper-1',
            camperBasePrice: 100,
            startDate: '2026-10-10',
            endDate: '2026-10-10', // 0 nights
            depositAmount: 1000
        })
        assert.equal(res.nights, 0)
        assert.equal(res.totalDays, 0)
        assert.equal(res.payableTotal, 0)
        assert.equal(res.depositAmount, 1000)
    })

    it('calculates single-night rental with slots and supplements accurately', () => {
        // 1 night stay: 2026-10-01 to 2026-10-02
        // Morning pickup (+0.5) + Afternoon dropoff (+0.5) => totalDays = 2.0
        // Base rate: 100 € * 1 night + 100 € * 1.0 slot supplement = 200 € base
        // Unlimited KM: 15 € * 2 days = 30 €
        // Flexible cancellation: 8 € * 2 days = 16 €
        // Total payable = 200 + 30 + 16 = 246.00 €
        const res = calculatePriceV2({
            camperId: 'camper-1',
            camperBasePrice: 100,
            startDate: '2026-10-01',
            pickupSlot: 'morning',
            endDate: '2026-10-02',
            dropoffSlot: 'afternoon',
            kmPackage: 'unlimited',
            cancellationPolicy: 'flexible',
            seasons: mockSeasons,
            periods: mockPeriods,
            depositAmount: 1000
        })

        assert.equal(res.nights, 1)
        assert.equal(res.totalDays, 2)
        assert.equal(res.baseRentalTotal, 200)
        assert.equal(res.kmSupplement, 30)
        assert.equal(res.cancellationSupplement, 16)
        assert.equal(res.payableTotal, 246)
        assert.equal(res.depositAmount, 1000)
        assert.equal(res.grandTotalWithDeposit, 1246)
    })

    it('correctly applies 25% duration discount on 30+ day rentals exclusively to base rental', () => {
        // 30 nights in Baja: base 100 € * 30 = 3000 €
        // Duration discount tier: 30+ days = 25% discount
        // Discount amount: 3000 * 0.25 = 750 € -> discounted base = 2250 €
        // Unlimited KM: 15 € * 30 days = 450 € (NOT discounted)
        // Flexible cancellation: 8 € * 30 days = 240 € (NOT discounted)
        // Extras: 1 fixed extra of 50 € = 50 €
        // Expected payable: 2250 + 450 + 240 + 50 = 2990.00 €
        const res = calculatePriceV2({
            camperId: 'camper-1',
            camperBasePrice: 100,
            startDate: '2026-10-01',
            pickupSlot: 'afternoon',
            endDate: '2026-10-31',
            dropoffSlot: 'morning',
            kmPackage: 'unlimited',
            cancellationPolicy: 'flexible',
            extrasSelected: [
                { extraId: 'ext-1', name: 'Paddle Surf', quantity: 1, pricingType: 'per_rental', price: 50, category: 'Deporte' }
            ],
            seasons: mockSeasons,
            periods: mockPeriods,
            discounts: mockDiscounts,
            depositAmount: 1000
        })

        assert.equal(res.nights, 30)
        assert.equal(res.discountPct, 25)
        assert.equal(res.discountAmount, 750)
        assert.equal(res.discountedBaseTotal, 2250)
        assert.equal(res.kmSupplement, 450)
        assert.equal(res.cancellationSupplement, 240)
        assert.equal(res.extrasTotal, 50)
        assert.equal(res.payableTotal, 2990)
    })

    it('seamlessly handles season overlap (2 nights Baja + 2 nights Alta)', () => {
        // June 29 & 30: Baja (100 €/night) = 200 €
        // July 01 & 02: Alta (100 + 40 = 140 €/night) = 280 €
        // Total base = 480 €
        const res = calculatePriceV2({
            camperId: 'camper-1',
            camperBasePrice: 100,
            startDate: '2026-06-29',
            pickupSlot: 'afternoon',
            endDate: '2026-07-03',
            dropoffSlot: 'morning',
            kmPackage: 'included_150',
            cancellationPolicy: 'standard',
            seasons: mockSeasons,
            periods: mockPeriods,
            discounts: mockDiscounts,
            depositAmount: 1000
        })

        assert.equal(res.nights, 4)
        assert.equal(res.baseRentalTotal, 480)
        assert.equal(res.payableTotal, 480)
        assert.equal(res.nightsPerSeason.length, 2)
        const bajaItem = res.nightsPerSeason.find(s => s.season === 'Temporada Baja')
        const altaItem = res.nightsPerSeason.find(s => s.season === 'Temporada Alta')
        assert.equal(bajaItem?.nights, 2)
        assert.equal(altaItem?.nights, 2)
    })

    it('prevents floating point inaccuracies across decimal pricing', () => {
        // Base price 99.99 €
        // 7 nights with 10% discount:
        // 99.99 * 7 = 699.93 €
        // discount 10% = 69.993 -> rounded to 69.99 €
        // discounted base = 699.93 - 69.99 = 629.94 €
        const res = calculatePriceV2({
            camperId: 'camper-1',
            camperBasePrice: 99.99,
            startDate: '2026-10-01',
            endDate: '2026-10-08',
            seasons: mockSeasons,
            discounts: mockDiscounts,
        })
        assert.equal(res.baseRentalTotal, 699.93)
        assert.equal(res.discountAmount, 69.99)
        assert.equal(res.discountedBaseTotal, 629.94)
        assert.equal(res.payableTotal, 629.94)
    })
})

describe('Adversarial Stress Test: Domain 4 — Redsys Parameters & Cryptography', () => {
    it('generates 1,000 Order IDs verifying strict length and 4-digit prefix compliance', () => {
        for (let i = 0; i < 1000; i++) {
            const orderId = generateRedsysOrderId()
            assert.equal(orderId.length, 12, `Order ID length must be 12 chars: ${orderId}`)
            const prefix = orderId.substring(0, 4)
            assert.match(prefix, /^\d{4}$/, `First 4 chars must be numeric: ${orderId}`)
            const suffix = orderId.substring(4)
            assert.match(suffix, /^[a-z0-9]{8}$/, `Last 8 chars must be lowercase alphanumeric: ${orderId}`)
        }
    })

    it('converts Euro amounts to integer cents without decimal points across stress boundaries', () => {
        const testCases = [
            { eur: 0.01, cents: '1' },
            { eur: 0.10, cents: '10' },
            { eur: 1.00, cents: '100' },
            { eur: 145.50, cents: '14550' },
            { eur: 600.00, cents: '60000' },
            { eur: 1234.56, cents: '123456' },
            { eur: 99999.99, cents: '9999999' }
        ]

        for (const tc of testCases) {
            const form = createRedsysPaymentForm({
                amount: tc.eur,
                orderId: '0000abcdef12'
            })
            const decoded = decodeMerchantParameters(form.merchantParameters)
            assert.equal(decoded.DS_MERCHANT_AMOUNT, tc.cents, `Amount ${tc.eur} € must convert to ${tc.cents} cents`)
            assert.doesNotMatch(decoded.DS_MERCHANT_AMOUNT, /[.,]/, 'Cents must not contain dots or commas')
        }
    })

    it('performs 3DES CBC key diversification and HMAC-SHA256 signature verification', () => {
        const orderId = '1234abcde567'
        const secretKey = REDSYS_TEST_DEFAULTS.secretKey

        const form = createRedsysPaymentForm({
            amount: 250.00,
            orderId,
            description: 'Reserva Camper Utopia Van Life'
        }, { secretKey })

        // Genuine signature verification
        const isGenuine = verifyRedsysSignature(form.merchantParameters, form.signature, secretKey)
        assert.equal(isGenuine, true, 'Genuine signature must verify successfully')

        // Tamper test: modify 1 byte in merchant parameters
        const decoded = decodeMerchantParameters(form.merchantParameters)
        decoded.DS_MERCHANT_AMOUNT = '999900' // Changed price to 9999 €
        const tamperedParams = encodeMerchantParameters(decoded)
        const isTamperedDetected = verifyRedsysSignature(tamperedParams, form.signature, secretKey)
        assert.equal(isTamperedDetected, false, 'Tampered parameters must fail verification')

        // Tamper test: wrong secret key (must be a valid 24-byte base64 key to avoid cipher len exception)
        const wrongKey24Bytes = Buffer.alloc(24, 'a').toString('base64')
        const isWrongKeyDetected = verifyRedsysSignature(form.merchantParameters, form.signature, wrongKey24Bytes)
        assert.equal(isWrongKeyDetected, false, 'Verification with wrong secret key must fail')
    })

    it('rigorously tests Redsys response code classification for 0000-0099 vs 9xxx and error codes', () => {
        // Success codes
        for (let i = 0; i <= 99; i++) {
            const codeStr = String(i).padStart(4, '0')
            assert.equal(isRedsysSuccess(codeStr), true, `Code ${codeStr} must be classified as success`)
            assert.equal(isRedsysSuccess(i), true, `Numeric code ${i} must be classified as success`)
        }

        // Decline, technical failure, and 9xxx error codes
        const failureCodes = [
            '0101', '0180', '0184', '0190', '0904',
            '9001', '9051', '9102', '9915', '9999',
            '-1', '100', '999', 'SIS0001', 'INVALID', '', null, undefined
        ]
        for (const code of failureCodes) {
            assert.equal(isRedsysSuccess(code as any), false, `Code ${code} must NOT be classified as success`)
        }
    })

    it('truncates customer name to 60 chars and description to 125 chars', () => {
        const longName = 'A'.repeat(100)
        const longDesc = 'B'.repeat(200)
        const form = createRedsysPaymentForm({
            amount: 100,
            orderId: '000012345678',
            customerName: longName,
            description: longDesc
        })
        const decoded = decodeMerchantParameters(form.merchantParameters)
        assert.equal(decoded.DS_MERCHANT_TITULAR.length, 60)
        assert.equal(decoded.DS_MERCHANT_PRODUCTDESCRIPTION.length, 125)
    })
})

describe('Adversarial Stress Test: Domain 5 — Advanced Step 5 & Season Overlaps', () => {
    it('exhaustively validates Step 5 customer data and berth limitations', () => {
        const validCustomer: Step5Customer = {
            fullName: 'Carlos Santana Perez',
            email: 'carlos@example.com',
            phone: '+34 600 123 456',
            dniNie: '12345678Z',
            address: 'Calle Mayor 12',
            city: 'Palma',
            postalCode: '07001',
            country: 'España',
            travelersCount: 2,
            specialNotes: '',
            acceptTerms: true,
            acceptPrivacy: true
        }

        const validRes = validateStep5(validCustomer, 4)
        assert.equal(validRes.isValid, true)
        assert.equal(Object.keys(validRes.errors).length, 0)

        // Invalid: missing terms acceptance
        const noTermsRes = validateStep5({ ...validCustomer, acceptTerms: false }, 4)
        assert.equal(noTermsRes.isValid, false)
        assert.ok(noTermsRes.errors.acceptTerms)

        // Invalid: travelers exceed max berths
        const overBerthRes = validateStep5({ ...validCustomer, travelersCount: 5 }, 4)
        assert.equal(overBerthRes.isValid, false)
        assert.ok(overBerthRes.errors.travelersCount)

        // Invalid: empty full name or too short
        const shortNameRes = validateStep5({ ...validCustomer, fullName: '  ' }, 4)
        assert.equal(shortNameRes.isValid, false)
        assert.ok(shortNameRes.errors.fullName)

        // Invalid: phone too short or invalid
        const badPhoneRes = validateStep5({ ...validCustomer, phone: '12345' }, 4)
        assert.equal(badPhoneRes.isValid, false)
        assert.ok(badPhoneRes.errors.phone)

        // Invalid: malformed email
        const badEmailRes = validateStep5({ ...validCustomer, email: 'bad-email@' }, 4)
        assert.equal(badEmailRes.isValid, false)
        assert.ok(badEmailRes.errors.email)
    })

    it('verifies period overlap detection logic (hasOverlappingPeriods)', () => {
        const existing = [
            { id: 'p1', start_date: '2026-07-01', end_date: '2026-07-15' },
            { id: 'p2', start_date: '2026-08-01', end_date: '2026-08-15' }
        ]

        // Exact collision inside p1
        assert.equal(hasOverlappingPeriods({ start_date: '2026-07-05', end_date: '2026-07-10' }, existing), true)

        // Collision spanning across p1
        assert.equal(hasOverlappingPeriods({ start_date: '2026-06-25', end_date: '2026-07-20' }, existing), true)

        // Collision on single boundary day (start_date === end_date)
        assert.equal(hasOverlappingPeriods({ start_date: '2026-07-15', end_date: '2026-07-20' }, existing), true)

        // Clean non-overlapping interval between p1 and p2
        assert.equal(hasOverlappingPeriods({ start_date: '2026-07-16', end_date: '2026-07-31' }, existing), false)

        // Self-edit: editing p1 with same dates does not collide with itself
        assert.equal(hasOverlappingPeriods({ id: 'p1', start_date: '2026-07-01', end_date: '2026-07-15' }, existing), false)
    })
})

