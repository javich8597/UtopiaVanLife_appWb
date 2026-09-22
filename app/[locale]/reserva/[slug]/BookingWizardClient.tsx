'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
    WizardCamper,
    WizardStep,
    Step1Data,
    Step2Data,
    Step3Data,
    Step4Data,
    Step5Customer,
    WizardExtraItem,
    validateStep1,
    validateStep2,
    validateStep3,
    validateStep4,
    validateStep5,
} from './types'
import {
    calculatePriceV2,
    PricingBreakdown,
    SeasonV2,
    SeasonPeriod,
    DurationDiscount,
    getMinNightsForDateV2,
} from '@/lib/pricing/engine'
import WizardHeader from './WizardHeader'
import Step1Dates from './Step1Dates'
import Step2Mileage from './Step2Mileage'
import Step3Cancellation from './Step3Cancellation'
import Step4Extras from './Step4Extras'
import Step5Checkout from './Step5Checkout'
import StickyTripSummary from './StickyTripSummary'
import WizardBottomBar from './WizardBottomBar'
import { AnimatePresence, motion } from 'framer-motion'

interface BookingWizardClientProps {
    camper: WizardCamper
    availableExtras: WizardExtraItem[]
    seasonsV2: SeasonV2[]
    seasonPeriods: SeasonPeriod[]
    durationDiscounts: DurationDiscount[]
    initialFrom?: string
    initialTo?: string
    initialStartSlot?: 'morning' | 'afternoon'
    initialEndSlot?: 'morning' | 'afternoon'
    initialPax?: number
    initialKmPackage?: 'included_150' | 'unlimited'
    initialCancellationPolicy?: 'standard' | 'flexible'
    locale: string
}

export default function BookingWizardClient({
    camper,
    availableExtras = [],
    seasonsV2 = [],
    seasonPeriods = [],
    durationDiscounts = [],
    initialFrom = '',
    initialTo = '',
    initialStartSlot = 'morning',
    initialEndSlot = 'afternoon',
    initialPax = 2,
    initialKmPackage = 'included_150',
    initialCancellationPolicy = 'standard',
    locale = 'es',
}: BookingWizardClientProps) {
    const maxPax = camper.specs?.seats || (camper.slug === 'space' ? 2 : 3)
    const containerRef = useRef<HTMLDivElement>(null)

    // Wizard Step State
    const [currentStep, setCurrentStep] = useState<WizardStep>(1)
    const [maxCompletedStep, setMaxCompletedStep] = useState<number>(0)
    const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false)

    // Step 1 State: Dates & Slots
    const [step1, setStep1] = useState<Step1Data>({
        startDate: initialFrom,
        startSlot: initialStartSlot,
        endDate: initialTo,
        endSlot: initialEndSlot,
        pax: Math.min(maxPax, Math.max(1, Number(initialPax) || 2)),
    })

    // Step 2 State: Mileage Package
    const [step2, setStep2] = useState<Step2Data>({
        kmPackage: initialKmPackage,
    })

    // Step 3 State: Cancellation Policy
    const [step3, setStep3] = useState<Step3Data>({
        cancellationPolicy: initialCancellationPolicy,
    })

    // Step 4 State: Selected Extras
    const [step4, setStep4] = useState<Step4Data>({
        selectedExtras: [],
    })

    // Step 5 State: Personal & Billing Customer Details
    const [step5, setStep5] = useState<Step5Customer>({
        fullName: '',
        dniNie: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
        country: 'España',
        travelersCount: step1.pax,
        specialNotes: '',
        acceptTerms: false,
        acceptPrivacy: false,
    })

    // Sincronizar número de viajeros si cambia en paso 1
    useEffect(() => {
        setStep5((prev) => ({ ...prev, travelersCount: step1.pax }))
    }, [step1.pax])

    // Calcular estancia mínima para Step 1
    const activeMinNights = step1.startDate && seasonsV2.length > 0 && seasonPeriods.length > 0
        ? getMinNightsForDateV2(new Date(step1.startDate), seasonsV2, seasonPeriods)
        : 3

    // Recálculo en tiempo real con calculatePriceV2
    const breakdown: PricingBreakdown | null = useMemo(() => {
        if (!step1.startDate || !step1.endDate) return null

        const start = new Date(step1.startDate)
        const end = new Date(step1.endDate)
        if (end <= start) return null

        const basePrice = Number(camper.base_price_per_night || camper.price_per_night || 110)

        return calculatePriceV2({
            startDate: start,
            pickupSlot: step1.startSlot,
            endDate: end,
            dropoffSlot: step1.endSlot,
            camperBasePrice: basePrice,
            camperId: camper.id,
            seasons: seasonsV2,
            periods: seasonPeriods,
            discounts: durationDiscounts,
            kmPackage: step2.kmPackage,
            cancellationPolicy: step3.cancellationPolicy,
            selectedExtras: step4.selectedExtras.map((e) => ({
                id: e.id,
                name: e.name_es,
                name_es: e.name_es,
                price: e.price,
                pricingType: e.price_type,
                quantity: e.quantity,
                category: e.category,
            })),
            depositAmount: Number(camper.deposit_amount) || 1000,
        })
    }, [camper, step1, step2, step3, step4, seasonsV2, seasonPeriods, durationDiscounts])

    // Validación de cada paso
    const isCurrentStepValid = useMemo(() => {
        switch (currentStep) {
            case 1:
                return validateStep1(step1, [], activeMinNights).isValid
            case 2:
                return validateStep2(step2).isValid
            case 3:
                return validateStep3(step3).isValid
            case 4:
                return validateStep4(step4).isValid
            case 5:
                return validateStep5(step5, maxPax).isValid
            default:
                return false
        }
    }, [currentStep, step1, step2, step3, step4, step5, activeMinNights, maxPax])

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleNext = () => {
        if (!isCurrentStepValid) return
        setMaxCompletedStep((prev) => Math.max(prev, currentStep))
        if (currentStep < 5) {
            setCurrentStep((prev) => (prev + 1) as WizardStep)
            scrollToTop()
        }
    }

    const handlePrev = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => (prev - 1) as WizardStep)
            scrollToTop()
        }
    }

    const handleStepClick = (step: WizardStep) => {
        if (step <= maxCompletedStep + 1 || step < currentStep) {
            setCurrentStep(step)
            scrollToTop()
        }
    }

    const handleTriggerStep5Submit = () => {
        // En el paso 5, el submit button de Step5Checkout se encarga de la llamada
        const formSubmitBtn = document.querySelector<HTMLButtonElement>('.btn-pay-redsys')
        if (formSubmitBtn) {
            formSubmitBtn.click()
        }
    }

    const totalPayable = breakdown ? breakdown.payableTotal : 0
    const totalDays = breakdown ? breakdown.totalDays : 0

    return (
        <div className="booking-wizard-root" ref={containerRef}>
            {/* Dedicated Wizard Header */}
            <WizardHeader
                camper={camper}
                currentStep={currentStep}
                maxCompletedStep={maxCompletedStep}
                onStepClick={handleStepClick}
                locale={locale}
            />

            {/* Main Content Layout */}
            <main className="wizard-main-layout">
                <div className="wizard-layout-container">
                    {/* Active Step Panel (Left / Main column) */}
                    <div className="wizard-step-column">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 14 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -14 }}
                                transition={{ duration: 0.24, ease: 'easeOut' }}
                                className="wizard-step-card"
                            >
                                {currentStep === 1 && (
                                    <Step1Dates
                                        camper={camper}
                                        data={step1}
                                        onChange={setStep1}
                                        seasonsV2={seasonsV2}
                                        seasonPeriods={seasonPeriods}
                                    />
                                )}

                                {currentStep === 2 && (
                                    <Step2Mileage
                                        data={step2}
                                        totalDays={totalDays}
                                        onChange={setStep2}
                                    />
                                )}

                                {currentStep === 3 && (
                                    <Step3Cancellation
                                        data={step3}
                                        totalDays={totalDays}
                                        onChange={setStep3}
                                    />
                                )}

                                {currentStep === 4 && (
                                    <Step4Extras
                                        data={step4}
                                        availableExtras={availableExtras}
                                        totalDays={totalDays}
                                        onChange={setStep4}
                                    />
                                )}

                                {currentStep === 5 && (
                                    <Step5Checkout
                                        camper={camper}
                                        step1={step1}
                                        step2={step2}
                                        step3={step3}
                                        step4={step4}
                                        customer={step5}
                                        onChange={setStep5}
                                        totalPayable={totalPayable}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Sticky Trip Summary Sidebar (Right column) */}
                    <div className="wizard-summary-column">
                        <StickyTripSummary
                            camper={camper}
                            breakdown={breakdown}
                            step1={step1}
                            step2={step2}
                            step3={step3}
                            step4={step4}
                            isOpenMobile={isMobileSummaryOpen}
                            onCloseMobile={() => setIsMobileSummaryOpen(false)}
                        />
                    </div>
                </div>
            </main>

            {/* Sticky Bottom Navigation Bar */}
            <WizardBottomBar
                currentStep={currentStep}
                isStepValid={isCurrentStepValid}
                totalPayable={totalPayable}
                onPrev={handlePrev}
                onNext={handleNext}
                onSubmitStep5={handleTriggerStep5Submit}
                onOpenMobileSummary={() => setIsMobileSummaryOpen(true)}
            />

            <style jsx>{`
                .booking-wizard-root {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background: var(--white-broken);
                }

                .wizard-main-layout {
                    flex: 1;
                    padding: var(--space-6) 0 var(--space-12);
                }

                .wizard-layout-container {
                    max-width: 1240px;
                    margin: 0 auto;
                    padding: 0 var(--space-4);
                    display: grid;
                    grid-template-columns: minmax(0, 1.8fr) minmax(320px, 1fr);
                    gap: var(--space-8);
                    align-items: start;
                }

                .wizard-step-column {
                    min-width: 0;
                }

                .wizard-step-card {
                    background: transparent;
                }

                .wizard-summary-column {
                    position: sticky;
                    top: 100px;
                }

                @media (max-width: 960px) {
                    .wizard-layout-container {
                        grid-template-columns: 1fr;
                        gap: var(--space-6);
                    }
                    .wizard-summary-column {
                        display: none;
                    }
                }
            `}</style>
        </div>
    )
}
