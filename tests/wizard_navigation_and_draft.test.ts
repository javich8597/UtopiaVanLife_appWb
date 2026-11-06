import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { WizardStep, Step1Data, Step2Data, Step3Data, Step4Data, Step5Customer } from '../app/[locale]/reserva/[slug]/types'
import { WIZARD_STEPS } from '../app/[locale]/reserva/[slug]/WizardBottomBar'

// Helpers mimicking the draft serialization and rehydration logic in BookingWizardClient
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000

interface WizardDraft {
    version: number
    timestamp: number
    currentStep: WizardStep
    maxCompletedStep: number
    step1: Step1Data
    step2: Step2Data
    step3: Step3Data
    step4: Step4Data
    step5: Step5Customer
}

function isStepClickable(stepNumber: number, currentStep: number, maxCompletedStep: number): boolean {
    return stepNumber <= maxCompletedStep + 1 || stepNumber < currentStep
}

function isDraftExpired(timestamp: number, now: number = Date.now()): boolean {
    return now - timestamp > DRAFT_TTL_MS
}

function rehydrateWizardState(
    rawDraft: WizardDraft | null,
    searchParams: { from?: string; to?: string; startSlot?: 'morning' | 'afternoon'; endSlot?: 'morning' | 'afternoon'; pax?: number; step?: number },
    defaultState: { step1: Step1Data; step2: Step2Data; step3: Step3Data; step4: Step4Data; step5: Step5Customer; currentStep: WizardStep; maxCompletedStep: number }
) {
    if (!rawDraft || isDraftExpired(rawDraft.timestamp)) {
        return {
            ...defaultState,
            currentStep: (searchParams.step && searchParams.step >= 1 && searchParams.step <= 5)
                ? (searchParams.step as WizardStep)
                : defaultState.currentStep,
        }
    }

    const step1: Step1Data = {
        ...defaultState.step1,
        ...rawDraft.step1,
        startDate: searchParams.from || rawDraft.step1.startDate || defaultState.step1.startDate,
        endDate: searchParams.to || rawDraft.step1.endDate || defaultState.step1.endDate,
        startSlot: searchParams.startSlot || rawDraft.step1.startSlot || defaultState.step1.startSlot,
        endSlot: searchParams.endSlot || rawDraft.step1.endSlot || defaultState.step1.endSlot,
        pax: searchParams.pax || rawDraft.step1.pax || defaultState.step1.pax,
    }

    const currentStep = (searchParams.step && searchParams.step >= 1 && searchParams.step <= 5)
        ? (searchParams.step as WizardStep)
        : rawDraft.currentStep

    return {
        step1,
        step2: rawDraft.step2 || defaultState.step2,
        step3: rawDraft.step3 || defaultState.step3,
        step4: rawDraft.step4 || defaultState.step4,
        step5: rawDraft.step5 || defaultState.step5,
        currentStep,
        maxCompletedStep: rawDraft.maxCompletedStep ?? defaultState.maxCompletedStep,
    }
}

describe('Wizard Unified Bottom Bar & Step Navigation', () => {
    it('defines the canonical 5 steps in correct order', () => {
        assert.equal(WIZARD_STEPS.length, 5)
        assert.deepEqual(
            WIZARD_STEPS.map((s) => s.number),
            [1, 2, 3, 4, 5]
        )
        assert.equal(WIZARD_STEPS[0].label, 'Fechas')
        assert.equal(WIZARD_STEPS[1].label, 'KM')
        assert.equal(WIZARD_STEPS[2].label, 'Fianza')
        assert.equal(WIZARD_STEPS[3].label, 'Extras')
        assert.equal(WIZARD_STEPS[4].label, 'Pago')
    })

    it('allows clicking backwards to any previous step without restriction', () => {
        const currentStep = 4
        const maxCompletedStep = 3

        // Previous steps (1, 2, 3) must always be clickable
        assert.equal(isStepClickable(1, currentStep, maxCompletedStep), true)
        assert.equal(isStepClickable(2, currentStep, maxCompletedStep), true)
        assert.equal(isStepClickable(3, currentStep, maxCompletedStep), true)

        // Current step is reachable
        assert.equal(isStepClickable(4, currentStep, maxCompletedStep), true)

        // Step 5 has not been reached yet and is not completed
        assert.equal(isStepClickable(5, currentStep, maxCompletedStep), false)
    })

    it('allows jumping directly to step 1 from step 5', () => {
        const currentStep = 5
        const maxCompletedStep = 4

        assert.equal(isStepClickable(1, currentStep, maxCompletedStep), true)
        assert.equal(isStepClickable(2, currentStep, maxCompletedStep), true)
        assert.equal(isStepClickable(3, currentStep, maxCompletedStep), true)
        assert.equal(isStepClickable(4, currentStep, maxCompletedStep), true)
    })
})

describe('Wizard Draft Persistence & Data Preservation', () => {
    const mockStep1: Step1Data = {
        startDate: '2026-06-10',
        startSlot: 'morning',
        endDate: '2026-06-15',
        endSlot: 'afternoon',
        pax: 2,
    }

    const mockStep2: Step2Data = {
        kmPackage: 'unlimited',
    }

    const mockStep3: Step3Data = {
        cancellationPolicy: 'flexible',
        depositOption: 'flex_1000',
    }

    const mockStep4: Step4Data = {
        selectedExtras: [
            { id: 'cine', name_es: 'Pack Cine Exterior', price: 45, price_type: 'per_rental', quantity: 1, category: 'Confort' },
        ],
    }

    const mockStep5: Step5Customer = {
        fullName: 'Laura García Martínez',
        dniNie: '12345678Z',
        birthDate: '1992-04-15',
        licenseDate: '2014-06-20',
        email: 'laura@example.com',
        phone: '612345678',
        phoneCountryCode: '+34',
        depositOption: 'flex_1000',
        passengers: [
            {
                fullName: 'Marcos Alonso',
                dniNie: '87654321X',
                birthDate: '1990-08-10',
                isSecondDriver: true,
                licenseDate: '2012-05-15',
            },
        ],
        secondDriverSoloEnabled: false,
        secondDriverSolo: { fullName: '', dniNie: '', birthDate: '', licenseDate: '' },
        address: 'Calle Mayor 14',
        city: 'Palma',
        postalCode: '07001',
        country: 'España',
        travelersCount: 2,
        specialNotes: 'Llegada en vuelo a las 10:00',
        acceptTerms: true,
        acceptCancellationPolicy: true,
        acceptPrivacy: true,
    }

    it('rehydrates all entered customer and passenger data completely without loss', () => {
        const draft: WizardDraft = {
            version: 1,
            timestamp: Date.now(),
            currentStep: 5,
            maxCompletedStep: 4,
            step1: mockStep1,
            step2: mockStep2,
            step3: mockStep3,
            step4: mockStep4,
            step5: mockStep5,
        }

        const defaultState = {
            step1: { startDate: '', startSlot: 'afternoon' as const, endDate: '', endSlot: 'morning' as const, pax: 2 },
            step2: { kmPackage: 'included_150' as const },
            step3: { cancellationPolicy: 'standard' as const, depositOption: 'standard_2000' as const },
            step4: { selectedExtras: [] },
            step5: {
                fullName: '',
                dniNie: '',
                birthDate: '',
                licenseDate: '',
                email: '',
                phone: '',
                phoneCountryCode: '+34',
                depositOption: 'standard_2000' as const,
                passengers: [],
                secondDriverSoloEnabled: false,
                secondDriverSolo: { fullName: '', dniNie: '', birthDate: '', licenseDate: '' },
                address: '',
                city: '',
                postalCode: '',
                country: 'España',
                travelersCount: 2,
                specialNotes: '',
                acceptTerms: false,
                acceptCancellationPolicy: false,
                acceptPrivacy: false,
            },
            currentStep: 1 as WizardStep,
            maxCompletedStep: 0,
        }

        const rehydrated = rehydrateWizardState(draft, {}, defaultState)

        // Verify Step 1
        assert.equal(rehydrated.step1.startDate, '2026-06-10')
        assert.equal(rehydrated.step1.startSlot, 'morning')
        assert.equal(rehydrated.step1.endDate, '2026-06-15')

        // Verify Step 2 & 3
        assert.equal(rehydrated.step2.kmPackage, 'unlimited')
        assert.equal(rehydrated.step3.cancellationPolicy, 'flexible')
        assert.equal(rehydrated.step3.depositOption, 'flex_1000')

        // Verify Step 4 extras
        assert.equal(rehydrated.step4.selectedExtras.length, 1)
        assert.equal(rehydrated.step4.selectedExtras[0].id, 'cine')

        // Verify Step 5 customer and passenger details
        assert.equal(rehydrated.step5.fullName, 'Laura García Martínez')
        assert.equal(rehydrated.step5.dniNie, '12345678Z')
        assert.ok(rehydrated.step5.passengers)
        assert.equal(rehydrated.step5.passengers!.length, 1)
        assert.equal(rehydrated.step5.passengers![0].fullName, 'Marcos Alonso')
        assert.equal(rehydrated.step5.passengers![0].isSecondDriver, true)
        assert.equal(rehydrated.currentStep, 5)
        assert.equal(rehydrated.maxCompletedStep, 4)
    })

    it('prioritizes explicit URL searchParams when coming from camper page', () => {
        const draft: WizardDraft = {
            version: 1,
            timestamp: Date.now(),
            currentStep: 3,
            maxCompletedStep: 2,
            step1: mockStep1, // '2026-06-10' to '2026-06-15'
            step2: mockStep2,
            step3: mockStep3,
            step4: mockStep4,
            step5: mockStep5,
        }

        const defaultState = {
            step1: { startDate: '', startSlot: 'afternoon' as const, endDate: '', endSlot: 'morning' as const, pax: 2 },
            step2: { kmPackage: 'included_150' as const },
            step3: { cancellationPolicy: 'standard' as const, depositOption: 'standard_2000' as const },
            step4: { selectedExtras: [] },
            step5: mockStep5,
            currentStep: 1 as WizardStep,
            maxCompletedStep: 0,
        }

        // User clicked a new date range on /campers/neo and lands on /reserva/neo?from=2026-07-01&to=2026-07-08
        const rehydrated = rehydrateWizardState(
            draft,
            { from: '2026-07-01', to: '2026-07-08', step: 1 },
            defaultState
        )

        assert.equal(rehydrated.step1.startDate, '2026-07-01')
        assert.equal(rehydrated.step1.endDate, '2026-07-08')
        assert.equal(rehydrated.currentStep, 1)
        // Passenger and customer data from draft are still preserved!
        assert.equal(rehydrated.step5.fullName, 'Laura García Martínez')
    })

    it('discards drafts older than 24 hours', () => {
        const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000)
        assert.equal(isDraftExpired(expiredTimestamp), true)

        const freshTimestamp = Date.now() - (2 * 60 * 60 * 1000)
        assert.equal(isDraftExpired(freshTimestamp), false)
    })
})
