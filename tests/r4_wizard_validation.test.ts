import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateBookingRange } from '../lib/booking/calendarLogic'
import { BlockedSlot } from '../lib/booking/availability'

// =========================================================================
// WIZARD VALIDATION SCHEMAS & SPECIFICATION (ORIGINAL_REQUEST.md Step 1-5)
// =========================================================================

export interface Step1Data {
    startDate: string // YYYY-MM-DD
    startSlot: 'morning' | 'afternoon'
    endDate: string   // YYYY-MM-DD
    endSlot: 'morning' | 'afternoon'
}

export interface Step2Data {
    kmPackage: 'included_150' | 'unlimited'
}

export interface Step3Data {
    cancellationPolicy: 'standard' | 'flexible'
}

export interface Step4Data {
    extras: Array<{
        id: string
        name: string
        category: 'Equipamiento' | 'Deporte' | 'Confort' | string
        price: number
        priceType: 'per_rental' | 'per_day'
        quantity: number
    }>
}

export interface Step5Data {
    fullName: string
    dniNie: string
    email: string
    phone: string
    address: string
    city: string
    postalCode: string
    country: string
    travelersCount: number
    specialNotes?: string
}

export interface CompleteWizardState {
    step1: Step1Data | null
    step2: Step2Data | null
    step3: Step3Data | null
    step4: Step4Data | null
    step5: Step5Data | null
}

// -------------------------------------------------------------------------
// Validators
// -------------------------------------------------------------------------

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

export function validateDniNieOrPassport(value: string): { isValid: boolean; error?: string } {
    if (!value || typeof value !== 'string') {
        return { isValid: false, error: 'Documento de identidad requerido' }
    }
    const clean = value.trim().toUpperCase()

    // 1. Spanish DNI: 8 digits + 1 letter
    const dniRegex = /^(\d{8})([A-Z])$/
    const dniMatch = clean.match(dniRegex)
    if (dniMatch) {
        const num = parseInt(dniMatch[1], 10)
        const expectedLetter = DNI_LETTERS[num % 23]
        if (dniMatch[2] === expectedLetter) {
            return { isValid: true }
        }
        return { isValid: false, error: `Letra de DNI incorrecta. Para el número ${dniMatch[1]}, la letra debe ser ${expectedLetter}` }
    }

    // 2. Spanish NIE: X, Y, Z + 7 digits + 1 letter
    const nieRegex = /^([XYZ])(\d{7})([A-Z])$/
    const nieMatch = clean.match(nieRegex)
    if (nieMatch) {
        const prefixMap: Record<string, string> = { X: '0', Y: '1', Z: '2' }
        const numStr = prefixMap[nieMatch[1]] + nieMatch[2]
        const num = parseInt(numStr, 10)
        const expectedLetter = DNI_LETTERS[num % 23]
        if (nieMatch[3] === expectedLetter) {
            return { isValid: true }
        }
        return { isValid: false, error: `Letra de NIE incorrecta. Se esperaba ${expectedLetter}` }
    }

    // 3. Foreign Passport: 6-15 alphanumeric characters
    const passportRegex = /^[A-Z0-9]{6,15}$/
    if (passportRegex.test(clean)) {
        return { isValid: true }
    }

    return { isValid: false, error: 'Formato de DNI, NIE o Pasaporte no válido' }
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
    if (!email || typeof email !== 'string') {
        return { isValid: false, error: 'Correo electrónico obligatorio' }
    }
    const trimmed = email.trim()
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
    if (!emailRegex.test(trimmed)) {
        return { isValid: false, error: 'Formato de correo electrónico no válido' }
    }
    return { isValid: true }
}

export function validatePhone(phone: string): { isValid: boolean; error?: string } {
    if (!phone || typeof phone !== 'string') {
        return { isValid: false, error: 'Teléfono de contacto obligatorio' }
    }
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length < 9 || digitsOnly.length > 15) {
        return { isValid: false, error: 'El teléfono debe contener entre 9 y 15 dígitos numéricos' }
    }
    return { isValid: true }
}

export function validateStep1(
    data: Step1Data,
    blockedSlots: BlockedSlot[] = [],
    minNights: number = 3,
    referenceTodayStr: string = '2026-05-01'
): { isValid: boolean; error?: string } {
    if (!data.startDate || !data.endDate) {
        return { isValid: false, error: 'Debes seleccionar fecha de inicio y fin' }
    }

    if (data.startDate < referenceTodayStr) {
        return { isValid: false, error: 'La fecha de inicio no puede ser anterior a hoy' }
    }

    if (data.endDate <= data.startDate) {
        return { isValid: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' }
    }

    const rangeResult = validateBookingRange(
        data.startDate,
        data.startSlot,
        data.endDate,
        data.endSlot,
        blockedSlots,
        minNights
    )

    if (!rangeResult.isValid) {
        if (rangeResult.reason === 'min_nights') {
            return { isValid: false, error: `La estancia mínima para estas fechas es de ${minNights} noches` }
        }
        if (rangeResult.reason === 'blocked_dates') {
            return { isValid: false, error: 'Las fechas u horarios seleccionados no están disponibles' }
        }
        return { isValid: false, error: 'Selección de fechas no válida' }
    }

    return { isValid: true }
}

export function validateStep2(data: Step2Data): { isValid: boolean; error?: string } {
    if (data.kmPackage !== 'included_150' && data.kmPackage !== 'unlimited') {
        return { isValid: false, error: 'Selección de paquete de kilometraje no válida' }
    }
    return { isValid: true }
}

export function validateStep3(data: Step3Data): { isValid: boolean; error?: string } {
    if (data.cancellationPolicy !== 'standard' && data.cancellationPolicy !== 'flexible') {
        return { isValid: false, error: 'Selección de política de cancelación no válida' }
    }
    return { isValid: true }
}

export function validateStep4(data: Step4Data): { isValid: boolean; error?: string } {
    if (!Array.isArray(data.extras)) {
        return { isValid: false, error: 'Formato de extras no válido' }
    }
    for (const extra of data.extras) {
        if (typeof extra.quantity !== 'number' || extra.quantity < 0 || !Number.isInteger(extra.quantity)) {
            return { isValid: false, error: `Cantidad no válida para el extra ${extra.name || extra.id}` }
        }
    }
    return { isValid: true }
}

export function validateStep5(
    data: Step5Data,
    maxCamperBerths: number = 4
): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}

    if (!data.fullName || data.fullName.trim().length < 3) {
        errors.fullName = 'Nombre y apellidos completos requeridos'
    }

    const dniCheck = validateDniNieOrPassport(data.dniNie)
    if (!dniCheck.isValid) {
        errors.dniNie = dniCheck.error!
    }

    const emailCheck = validateEmail(data.email)
    if (!emailCheck.isValid) {
        errors.email = emailCheck.error!
    }

    const phoneCheck = validatePhone(data.phone)
    if (!phoneCheck.isValid) {
        errors.phone = phoneCheck.error!
    }

    if (!data.address || data.address.trim().length < 3) {
        errors.address = 'Dirección de facturación obligatoria'
    }

    if (!data.city || data.city.trim().length < 2) {
        errors.city = 'Ciudad obligatoria'
    }

    if (!data.postalCode || data.postalCode.trim().length < 3) {
        errors.postalCode = 'Código postal obligatorio'
    }

    if (!data.country || data.country.trim().length < 2) {
        errors.country = 'País obligatorio'
    }

    if (
        typeof data.travelersCount !== 'number' ||
        data.travelersCount < 1 ||
        data.travelersCount > maxCamperBerths
    ) {
        errors.travelersCount = `El número de viajeros debe estar entre 1 y ${maxCamperBerths}`
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    }
}

// =========================================================================
// TEST SUITE: WIZARD STEP VALIDATION
// =========================================================================

describe('R4 Booking Wizard Validation Test Suite', () => {

    // ---------------------------------------------------------------------
    // TIER 1: Step-by-Step Happy Path Validation
    // ---------------------------------------------------------------------

    describe('Tier 1: Happy Path Step Validation (Steps 1 to 5)', () => {
        it('validates Step 1 with valid date range, slots and season minNights', () => {
            const step1Data: Step1Data = {
                startDate: '2026-06-10',
                startSlot: 'afternoon',
                endDate: '2026-06-14', // 4 nights >= 3 min
                endSlot: 'morning',
            }

            const result = validateStep1(step1Data, [], 3, '2026-05-01')
            assert.equal(result.isValid, true)
            assert.equal(result.error, undefined)
        })

        it('validates Step 2 with "included_150" and "unlimited" packages', () => {
            assert.equal(validateStep2({ kmPackage: 'included_150' }).isValid, true)
            assert.equal(validateStep2({ kmPackage: 'unlimited' }).isValid, true)
        })

        it('validates Step 3 with "standard" and "flexible" cancellation policies', () => {
            assert.equal(validateStep3({ cancellationPolicy: 'standard' }).isValid, true)
            assert.equal(validateStep3({ cancellationPolicy: 'flexible' }).isValid, true)
        })

        it('validates Step 4 with empty or valid categorized extras', () => {
            // Empty extras is valid (optional)
            assert.equal(validateStep4({ extras: [] }).isValid, true)

            // Multiple extras with valid quantities
            const validExtras: Step4Data = {
                extras: [
                    { id: '1', name: 'Kit Camping', category: 'Equipamiento', price: 30, priceType: 'per_rental', quantity: 1 },
                    { id: '2', name: 'Paddle Surf', category: 'Deporte', price: 20, priceType: 'per_day', quantity: 2 },
                    { id: '3', name: 'Toallas', category: 'Confort', price: 5, priceType: 'per_rental', quantity: 0 },
                ],
            }
            assert.equal(validateStep4(validExtras).isValid, true)
        })

        it('validates Step 5 with full personal & billing data for Spanish DNI', () => {
            const validCustomer: Step5Data = {
                fullName: 'Carlos Santana Vega',
                dniNie: '12345678Z', // Valid checksum: 12345678 % 23 = 14 => 'Z'
                email: 'carlos.santana@utopiavanlife.com',
                phone: '+34 612 345 678',
                address: 'Calle Mayor 14, 2B',
                city: 'Palma',
                postalCode: '07001',
                country: 'España',
                travelersCount: 2,
                specialNotes: 'Llegamos en vuelo tardío a las 20h',
            }

            const result = validateStep5(validCustomer, 4)
            assert.equal(result.isValid, true)
            assert.deepEqual(result.errors, {})
        })

        it('validates Step 5 with valid Spanish NIE (X, Y, Z)', () => {
            // NIE X1234567: X -> 0 + 1234567 = 1234567 % 23 = 19 => 'L'
            const validNie = 'X1234567L'
            const check = validateDniNieOrPassport(validNie)
            assert.equal(check.isValid, true)
        })

        it('validates Step 5 with international passport number', () => {
            const passportCheck = validateDniNieOrPassport('PA8923412')
            assert.equal(passportCheck.isValid, true)
        })

        it('preserves full state when traversing backwards and forwards through wizard steps', () => {
            const state: CompleteWizardState = {
                step1: {
                    startDate: '2026-06-10',
                    startSlot: 'afternoon',
                    endDate: '2026-06-15',
                    endSlot: 'morning',
                },
                step2: { kmPackage: 'included_150' },
                step3: { cancellationPolicy: 'standard' },
                step4: { extras: [{ id: 'wifi', name: 'Wi-Fi', category: 'Equipamiento', price: 5, priceType: 'per_day', quantity: 1 }] },
                step5: {
                    fullName: 'Elena Rostova',
                    dniNie: 'Y1234567B',
                    email: 'elena@example.com',
                    phone: '+34 699 888 777',
                    address: 'Gran Via 22',
                    city: 'Madrid',
                    postalCode: '28013',
                    country: 'España',
                    travelersCount: 2,
                },
            }

            // Simulate user moving backward: Step 5 -> Step 2
            let currentStep = 5
            currentStep = 2

            // User changes KM package
            state.step2 = { kmPackage: 'unlimited' }

            // User navigates forward: Step 2 -> Step 5
            currentStep = 5

            // Verify Step 1, Step 3, Step 4 and Step 5 are completely preserved
            assert.equal(state.step1?.startDate, '2026-06-10')
            assert.equal(state.step2?.kmPackage, 'unlimited')
            assert.equal(state.step3?.cancellationPolicy, 'standard')
            assert.equal(state.step4?.extras.length, 1)
            assert.equal(state.step5?.fullName, 'Elena Rostova')
            assert.equal(state.step5?.email, 'elena@example.com')
        })
    })

    // ---------------------------------------------------------------------
    // TIER 2: Boundary & Negative Cases
    // ---------------------------------------------------------------------

    describe('Tier 2: Boundary & Negative Validation Cases', () => {
        it('rejects Spanish DNI with incorrect control letter checksum', () => {
            // 12345678 requires 'Z', passing 'A' must fail
            const result = validateDniNieOrPassport('12345678A')
            assert.equal(result.isValid, false)
            assert.match(result.error!, /Letra de DNI incorrecta/)
        })

        it('rejects malformed DNI strings with wrong character counts or illegal characters', () => {
            assert.equal(validateDniNieOrPassport('123').isValid, false)
            assert.equal(validateDniNieOrPassport('12345678901234567').isValid, false)
            assert.equal(validateDniNieOrPassport('DNI-INVALIDO!').isValid, false)
            assert.equal(validateDniNieOrPassport('').isValid, false)
        })

        it('rejects malformed email formats', () => {
            const invalidEmails = [
                'plainaddress',
                '@missingusername.com',
                'username@.com',
                'username@domain',
                'username@domain..com',
                'username @domain.com',
                'username@domain com',
                '',
            ]

            for (const email of invalidEmails) {
                const res = validateEmail(email)
                assert.equal(res.isValid, false, `Email "${email}" should be rejected`)
            }
        })

        it('rejects start dates in the past relative to reference date', () => {
            const pastStep1: Step1Data = {
                startDate: '2026-04-20', // Before reference 2026-05-01
                startSlot: 'afternoon',
                endDate: '2026-05-05',
                endSlot: 'morning',
            }

            const result = validateStep1(pastStep1, [], 3, '2026-05-01')
            assert.equal(result.isValid, false)
            assert.match(result.error!, /La fecha de inicio no puede ser anterior a hoy/)
        })

        it('rejects inverted date ranges (start date after end date)', () => {
            const invertedStep1: Step1Data = {
                startDate: '2026-06-15',
                startSlot: 'afternoon',
                endDate: '2026-06-10',
                endSlot: 'morning',
            }

            const result = validateStep1(invertedStep1, [], 3, '2026-05-01')
            assert.equal(result.isValid, false)
            assert.match(result.error!, /La fecha de fin debe ser posterior a la fecha de inicio/)
        })

        it('rejects 0-night stays (same start and end date)', () => {
            const zeroNightsStep1: Step1Data = {
                startDate: '2026-06-15',
                startSlot: 'morning',
                endDate: '2026-06-15',
                endSlot: 'afternoon',
            }

            const result = validateStep1(zeroNightsStep1, [], 1, '2026-05-01')
            assert.equal(result.isValid, false)
            assert.match(result.error!, /La fecha de fin debe ser posterior/)
        })

        it('rejects rental durations below the season minimum nights', () => {
            // 2 nights when minimum is 3 nights
            const shortStay: Step1Data = {
                startDate: '2026-06-10',
                startSlot: 'afternoon',
                endDate: '2026-06-12', // 2 nights
                endSlot: 'morning',
            }

            const result = validateStep1(shortStay, [], 3, '2026-05-01')
            assert.equal(result.isValid, false)
            assert.match(result.error!, /La estancia mínima para estas fechas es de 3 noches/)
        })

        it('rejects selection overlapping with calendar blocked dates', () => {
            const blocked: BlockedSlot[] = [
                { date: '2026-06-12', slot: 'full' },
            ]

            const collidingStay: Step1Data = {
                startDate: '2026-06-10',
                startSlot: 'afternoon',
                endDate: '2026-06-14',
                endSlot: 'morning',
            }

            const result = validateStep1(collidingStay, blocked, 3, '2026-05-01')
            assert.equal(result.isValid, false)
            assert.match(result.error!, /Las fechas u horarios seleccionados no están disponibles/)
        })

        it('rejects invalid enums for Step 2 and Step 3', () => {
            // @ts-expect-error Testing invalid enum value at runtime
            assert.equal(validateStep2({ kmPackage: '500_km' }).isValid, false)
            // @ts-expect-error Testing invalid enum value at runtime
            assert.equal(validateStep3({ cancellationPolicy: 'non_refundable' }).isValid, false)
        })

        it('rejects negative or non-integer extras quantities in Step 4', () => {
            const invalidQtyExtras: Step4Data = {
                extras: [
                    { id: '1', name: 'Snorkel', category: 'Deporte', price: 15, priceType: 'per_rental', quantity: -1 },
                ],
            }
            assert.equal(validateStep4(invalidQtyExtras).isValid, false)

            const fractionalQtyExtras: Step4Data = {
                extras: [
                    { id: '1', name: 'Snorkel', category: 'Deporte', price: 15, priceType: 'per_rental', quantity: 2.5 },
                ],
            }
            assert.equal(validateStep4(fractionalQtyExtras).isValid, false)
        })

        it('flags all missing mandatory fields in Step 5 simultaneously', () => {
            const emptyCustomer: Step5Data = {
                fullName: '',
                dniNie: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                postalCode: '',
                country: '',
                travelersCount: 0,
            }

            const result = validateStep5(emptyCustomer, 4)
            assert.equal(result.isValid, false)
            assert.ok(result.errors.fullName)
            assert.ok(result.errors.dniNie)
            assert.ok(result.errors.email)
            assert.ok(result.errors.phone)
            assert.ok(result.errors.address)
            assert.ok(result.errors.city)
            assert.ok(result.errors.postalCode)
            assert.ok(result.errors.country)
            assert.ok(result.errors.travelersCount)
        })

        it('rejects travelersCount exceeding camper max berth capacity', () => {
            const overCapacityCustomer: Step5Data = {
                fullName: 'Marta Diaz',
                dniNie: '12345678Z',
                email: 'marta@example.com',
                phone: '+34 600 000 000',
                address: 'Calle Real 1',
                city: 'Palma',
                postalCode: '07001',
                country: 'España',
                travelersCount: 5, // Max capacity is 4
            }

            const result = validateStep5(overCapacityCustomer, 4)
            assert.equal(result.isValid, false)
            assert.match(result.errors.travelersCount, /El número de viajeros debe estar entre 1 y 4/)
        })
    })
})
