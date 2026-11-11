'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
    WizardCamper,
    WizardStep,
    DepositOption,
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
    step5HasSecondDriver,
    normalizeStep5Draft,
} from './types'
import {
    calculatePriceV2,
    PricingBreakdown,
    SeasonV2,
    SeasonPeriod,
    DurationDiscount,
    getMinNightsForDateV2,
} from '@/lib/pricing/engine'
import Navbar from '@/components/layout/Navbar'
import Step1Dates from './Step1Dates'
import Step2Model from './Step2Model'
import Step2Mileage from './Step2Mileage'
import Step4Insurance from './Step4Insurance'
import Step3Cancellation from './Step3Cancellation'
import Step4Extras, { ALLOWED_EXTRAS_CATALOG } from './Step4Extras'
import Step5Checkout from './Step5Checkout'
import StickyTripSummary from './StickyTripSummary'
import WizardBottomBar from './WizardBottomBar'
import { AnimatePresence, motion } from 'framer-motion'

interface BookingWizardClientProps {
    camper: WizardCamper
    allCampers?: WizardCamper[]
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
    initialDepositOption?: DepositOption
    initialExtraIds?: string[]
    locale: string
}

const DRAFT_STORAGE_PREFIX = 'utopia_wizard_'
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export default function BookingWizardClient({
    camper,
    allCampers = [],
    availableExtras = [],
    seasonsV2 = [],
    seasonPeriods = [],
    durationDiscounts = [],
    initialFrom = '',
    initialTo = '',
    initialStartSlot = 'afternoon',
    initialEndSlot = 'morning',
    initialPax = 2,
    initialKmPackage = 'included_150',
    initialCancellationPolicy = 'standard',
    initialDepositOption = 'standard_2000',
    initialExtraIds = [],
    locale = 'es',
}: BookingWizardClientProps) {
    const [activeCamper, setActiveCamper] = useState<WizardCamper>(camper)
    const maxPax = activeCamper.specs?.seats || (activeCamper.slug === 'space' ? 2 : 3)
    const containerRef = useRef<HTMLDivElement>(null)
    const isHydratedRef = useRef(false)
    const historyPushesRef = useRef(0)

    // Wizard Step State (1 to 7)
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

    // Step 3 State: Mileage Package
    const [step2, setStep2] = useState<Step2Data>({
        kmPackage: initialKmPackage,
    })

    // Step 4 & 5 State: Deposit Option (Seguro/Fianza) & Cancellation Policy
    const [step3, setStep3] = useState<Step3Data>({
        cancellationPolicy: initialCancellationPolicy,
        depositOption: initialDepositOption,
    })

    // Step 6 State: Selected Extras
    const [step4, setStep4] = useState<Step4Data>({
        selectedExtras: ALLOWED_EXTRAS_CATALOG
            .filter((extra) => initialExtraIds.includes(extra.id))
            .map((extra) => ({
                id: extra.id,
                name_es: extra.name_es || extra.name || 'Extra',
                price: Number(extra.price) || 0,
                price_type: extra.price_type === 'per_day' ? 'per_day' : 'per_rental',
                quantity: 1,
                category: extra.category || 'Equipamiento',
            })),
    })

    // Step 7 State: Personal & Billing Customer Details + Passengers
    const initialPaxCount = Math.min(maxPax, Math.max(1, Number(initialPax) || 2))
    const [step5, setStep5] = useState<Step5Customer>({
        fullName: '',
        dniNie: '',
        birthDate: '',
        licenseDate: '',
        email: '',
        phone: '',
        phoneCountryCode: '+34',
        depositOption: initialDepositOption,
        passengers: Array.from({ length: Math.max(0, initialPaxCount - 1) }, () => ({
            fullName: '',
            dniNie: '',
            birthDate: '',
            isSecondDriver: false,
            licenseDate: '',
            driverLicenseId: '',
        })),
        secondDriverSoloEnabled: false,
        secondDriverSolo: {
            fullName: '',
            dniNie: '',
            birthDate: '',
            licenseDate: '',
            driverLicenseId: '',
        },
        address: '',
        city: '',
        postalCode: '',
        country: 'España',
        travelersCount: initialPaxCount,
        specialNotes: '',
        acceptTerms: false,
        acceptCancellationPolicy: false,
        acceptPrivacy: false,
    })

    // 1. Rehidratar borrador de sessionStorage en cliente (solo una vez al montar)
    useEffect(() => {
        if (typeof window === 'undefined' || isHydratedRef.current) return

        try {
            const params = new URLSearchParams(window.location.search)
            const urlFrom = params.get('from') || ''
            const urlTo = params.get('to') || ''
            const hasUrlStartSlot = params.has('startSlot') || params.has('pickup_time')
            const hasUrlEndSlot = params.has('endSlot') || params.has('dropoff_time')
            const hasUrlPax = params.has('pax')

            const storageKey = `${DRAFT_STORAGE_PREFIX}${activeCamper.slug}`
            const rawDraft = sessionStorage.getItem(storageKey)
            if (rawDraft) {
                const draft = JSON.parse(rawDraft)
                const isExpired = draft.timestamp && Date.now() - draft.timestamp > DRAFT_TTL_MS

                if (!isExpired && draft.step1) {
                    setStep1((prev) => ({
                        ...prev,
                        ...draft.step1,
                        startDate: urlFrom || draft.step1.startDate || prev.startDate,
                        endDate: urlTo || draft.step1.endDate || prev.endDate,
                        startSlot: hasUrlStartSlot
                            ? initialStartSlot
                            : draft.step1.startSlot || prev.startSlot,
                        endSlot: hasUrlEndSlot
                            ? initialEndSlot
                            : draft.step1.endSlot || prev.endSlot,
                        pax: hasUrlPax
                            ? Math.min(maxPax, Math.max(1, Number(initialPax)))
                            : Math.min(maxPax, draft.step1.pax || prev.pax),
                    }))

                    if (draft.step2) setStep2(draft.step2)
                    const draftDeposit: DepositOption = draft.step3?.depositOption === 'flex_1000' || draft.step5?.depositOption === 'flex_1000'
                        ? 'flex_1000'
                        : 'standard_2000'
                    if (draft.step3) setStep3({ ...draft.step3, depositOption: draftDeposit })
                    if (draft.step4 && Array.isArray(draft.step4.selectedExtras)) {
                        const allowedIds = new Set(ALLOWED_EXTRAS_CATALOG.map((e) => e.id))
                        setStep4({
                            selectedExtras: draft.step4.selectedExtras.filter((e: any) => e && allowedIds.has(e.id)),
                        })
                    }
                    if (draft.step5) {
                        const normalizedStep5 = normalizeStep5Draft(draft.step5, draft.step1?.pax || initialPaxCount)
                        setStep5({
                            ...normalizedStep5,
                            depositOption: draftDeposit,
                        })
                    }
                    if (typeof draft.maxCompletedStep === 'number') {
                        setMaxCompletedStep(draft.maxCompletedStep)
                    }

                    const urlStep = parseInt(params.get('step') || '', 10)
                    if (urlStep >= 1 && urlStep <= 7) {
                        setCurrentStep(urlStep as WizardStep)
                    } else if (draft.currentStep && draft.currentStep >= 1 && draft.currentStep <= 7) {
                        setCurrentStep(draft.currentStep as WizardStep)
                    }
                } else if (isExpired) {
                    sessionStorage.removeItem(storageKey)
                }
            } else {
                const urlStep = parseInt(params.get('step') || '', 10)
                if (urlStep >= 1 && urlStep <= 7) {
                    setCurrentStep(urlStep as WizardStep)
                }
            }
        } catch (e) {
            console.warn('[Wizard] Error al rehidratar borrador:', e)
        } finally {
            isHydratedRef.current = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // 2. Sincronización con el Historial del Navegador (popstate y pushState)
    useEffect(() => {
        if (typeof window === 'undefined') return

        const url = new URL(window.location.href)
        const currentUrlStep = parseInt(url.searchParams.get('step') || '', 10)
        const initialStep =
            currentUrlStep >= 1 && currentUrlStep <= 7 ? (currentUrlStep as WizardStep) : currentStep

        if (!url.searchParams.has('step')) {
            url.searchParams.set('step', String(initialStep))
            window.history.replaceState({ step: initialStep, utopiaWizard: true }, '', url.toString())
        } else {
            window.history.replaceState({ step: initialStep, utopiaWizard: true }, '', window.location.href)
        }

        const handlePopState = (event: PopStateEvent) => {
            const stateStep = event.state?.step
            if (typeof stateStep === 'number' && stateStep >= 1 && stateStep <= 7) {
                setCurrentStep(stateStep as WizardStep)
                scrollToTop()
            } else {
                const params = new URLSearchParams(window.location.search)
                const fallbackStep = parseInt(params.get('step') || '1', 10)
                if (fallbackStep >= 1 && fallbackStep <= 7) {
                    setCurrentStep(fallbackStep as WizardStep)
                    scrollToTop()
                }
            }
            if (historyPushesRef.current > 0) {
                historyPushesRef.current -= 1
            }
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [])

    // 3. Guardado automático del borrador en sessionStorage y sincronización de URL (debounced)
    useEffect(() => {
        if (!isHydratedRef.current || typeof window === 'undefined') return

        const timer = setTimeout(() => {
            try {
                const storageKey = `${DRAFT_STORAGE_PREFIX}${activeCamper.slug}`
                const draft = {
                    version: 2,
                    timestamp: Date.now(),
                    currentStep,
                    maxCompletedStep,
                    step1,
                    step2,
                    step3,
                    step4,
                    step5,
                }
                sessionStorage.setItem(storageKey, JSON.stringify(draft))

                const url = new URL(window.location.href)
                if (step1.startDate) url.searchParams.set('from', step1.startDate)
                if (step1.endDate) url.searchParams.set('to', step1.endDate)
                url.searchParams.set('startSlot', step1.startSlot)
                url.searchParams.set('endSlot', step1.endSlot)
                url.searchParams.set('step', String(currentStep))
                window.history.replaceState({ step: currentStep, utopiaWizard: true }, '', url.toString())
            } catch (e) {
                // Manejar posibles excepciones de quota o navegación privada
            }
        }, 250)

        return () => clearTimeout(timer)
    }, [activeCamper.slug, currentStep, maxCompletedStep, step1, step2, step3, step4, step5])

    // Sincronizar número de viajeros si cambia en paso 1 o al cambiar modelo (maxPax)
    useEffect(() => {
        const clampedPax = Math.min(maxPax, Math.max(1, step1.pax))
        if (clampedPax !== step1.pax) {
            setStep1((prev) => ({ ...prev, pax: clampedPax }))
            return
        }

        setStep5((prev) => {
            const count = clampedPax
            const currentPassengers = prev.passengers || []
            const needed = Math.max(0, count - 1)
            let updatedPassengers = [...currentPassengers]
            if (updatedPassengers.length < needed) {
                while (updatedPassengers.length < needed) {
                    updatedPassengers.push({
                        fullName: '',
                        dniNie: '',
                        birthDate: '',
                        isSecondDriver: false,
                        licenseDate: '',
                        driverLicenseId: '',
                    })
                }
            } else if (updatedPassengers.length > needed) {
                updatedPassengers = updatedPassengers.slice(0, needed)
            }
            return {
                ...prev,
                travelersCount: count,
                passengers: updatedPassengers,
            }
        })
    }, [step1.pax, maxPax])

    // Cambio de modelo en el Paso 2
    const handleSelectModel = (newCamper: WizardCamper) => {
        if (newCamper.slug === activeCamper.slug) return

        const newMaxPax = newCamper.specs?.seats || (newCamper.slug === 'space' ? 2 : 3)
        setActiveCamper(newCamper)
        if (step1.pax > newMaxPax) {
            setStep1((prev) => ({ ...prev, pax: newMaxPax }))
        }

        if (typeof window !== 'undefined') {
            try {
                // Copiar borrador actual a la nueva clave de modelo para mantener continuidad
                const newStorageKey = `${DRAFT_STORAGE_PREFIX}${newCamper.slug}`
                const draft = {
                    version: 2,
                    timestamp: Date.now(),
                    currentStep,
                    maxCompletedStep,
                    step1: { ...step1, pax: Math.min(newMaxPax, step1.pax) },
                    step2,
                    step3,
                    step4,
                    step5,
                }
                sessionStorage.setItem(newStorageKey, JSON.stringify(draft))

                const url = new URL(window.location.href)
                url.pathname = url.pathname.replace(/\/reserva\/[^/]+/, `/reserva/${newCamper.slug}`)
                window.history.replaceState({ step: currentStep, utopiaWizard: true }, '', url.toString())
            } catch (e) { }
        }
    }

    // Calcular estancia mínima para Step 1
    const activeMinNights =
        step1.startDate && seasonsV2.length > 0 && seasonPeriods.length > 0
            ? getMinNightsForDateV2(new Date(step1.startDate), seasonsV2, seasonPeriods)
            : 3

    // Recálculo en tiempo real con calculatePriceV2 (Fianza Estándar 2.000 € / Flex 1.000 € + 2º conductor)
    const activeDepositOption: DepositOption = step3.depositOption || step5.depositOption || 'standard_2000'
    const breakdown: PricingBreakdown | null = useMemo(() => {
        if (!step1.startDate || !step1.endDate) return null

        const start = new Date(step1.startDate)
        const end = new Date(step1.endDate)
        if (end <= start) return null

        const basePrice = Number(activeCamper.base_price_per_night || activeCamper.price_per_night || 110)

        return calculatePriceV2({
            startDate: start,
            pickupSlot: step1.startSlot,
            endDate: end,
            dropoffSlot: step1.endSlot,
            camperBasePrice: basePrice,
            camperId: activeCamper.id,
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
            depositOption: activeDepositOption,
            secondDriver: step5HasSecondDriver(step5, step5.travelersCount || step1.pax || 1),
            depositAmount: activeDepositOption === 'flex_1000' ? 1000 : 2000,
        })
    }, [activeCamper, step1, step2, step3, step4, step5, activeDepositOption, seasonsV2, seasonPeriods, durationDiscounts])

    // Validación de cada uno de los 7 pasos
    const isCurrentStepValid = useMemo(() => {
        switch (currentStep) {
            case 1:
                return validateStep1(step1, [], activeMinNights).isValid
            case 2:
                return Boolean(activeCamper && activeCamper.slug)
            case 3:
                return validateStep2(step2).isValid
            case 4:
                return activeDepositOption === 'standard_2000' || activeDepositOption === 'flex_1000'
            case 5:
                return validateStep3(step3).isValid
            case 6:
                return validateStep4(step4).isValid
            case 7:
                return validateStep5({ ...step5, depositOption: activeDepositOption }, maxPax).isValid
            default:
                return false
        }
    }, [currentStep, step1, activeCamper, step2, step3, step4, step5, activeDepositOption, activeMinNights, maxPax])

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const navigateToStep = (newStep: WizardStep, mode: 'push' | 'replace' = 'push') => {
        if (newStep === currentStep) return
        setCurrentStep(newStep)
        scrollToTop()

        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            url.searchParams.set('step', String(newStep))
            if (mode === 'push') {
                window.history.pushState({ step: newStep, utopiaWizard: true }, '', url.toString())
                historyPushesRef.current += 1
            } else {
                window.history.replaceState({ step: newStep, utopiaWizard: true }, '', url.toString())
            }
        }
    }

    const handleDepositChange = (depositOption: DepositOption) => {
        setStep3((prev) => ({ ...prev, depositOption }))
        setStep5((prev) => ({ ...prev, depositOption }))
    }

    const handleStep3Change = (newStep3: Step3Data) => {
        setStep3(newStep3)
        if (newStep3.depositOption) {
            setStep5((prev) => ({ ...prev, depositOption: newStep3.depositOption }))
        }
    }

    const handleStep5Change = (newCustomer: Step5Customer) => {
        setStep5(newCustomer)
        if (newCustomer.depositOption && newCustomer.depositOption !== step3.depositOption) {
            setStep3((prev) => ({ ...prev, depositOption: newCustomer.depositOption }))
        }
        if (newCustomer.travelersCount && newCustomer.travelersCount !== step1.pax) {
            setStep1((prev) => ({ ...prev, pax: newCustomer.travelersCount }))
        }
    }

    const handleNext = () => {
        if (!isCurrentStepValid) return
        setMaxCompletedStep((prev) => Math.max(prev, currentStep))
        if (currentStep < 7) {
            navigateToStep((currentStep + 1) as WizardStep, 'push')
        }
    }

    const handlePrev = () => {
        if (currentStep > 1) {
            const prevStep = (currentStep - 1) as WizardStep
            if (historyPushesRef.current > 0 && typeof window !== 'undefined' && window.history.state?.utopiaWizard) {
                window.history.back()
            } else {
                navigateToStep(prevStep, 'push')
            }
        }
    }

    const handleStepClick = (step: WizardStep) => {
        if (step <= maxCompletedStep + 1 || step < currentStep) {
            if (step !== currentStep) {
                navigateToStep(step, 'push')
            }
        }
    }

    const handleClearDraft = () => {
        if (typeof window === 'undefined') return
        try {
            sessionStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${activeCamper.slug}`)
        } catch (e) { }
    }

    const handleTriggerStep5Submit = () => {
        const formSubmitBtn = document.querySelector<HTMLButtonElement>('.btn-pay-redsys')
        if (formSubmitBtn) {
            formSubmitBtn.click()
        }
    }

    const totalPayable = breakdown ? breakdown.payableTotal : 0
    const totalDays = breakdown ? breakdown.totalDays : 0

    return (
        <div className="booking-wizard-root" ref={containerRef}>
            {/* Barra superior fija persistente sin ocultarse al hacer scroll */}
            <Navbar alwaysVisible />

            {/* Main Content Layout */}
            <main className="wizard-main-layout">
                <div className="wizard-layout-container">
                    {/* Active Step Panel (Left / Main column) */}
                    <div className="wizard-step-column">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${currentStep}-${activeCamper.slug}`}
                                initial={{ opacity: 0, x: 14 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -14 }}
                                transition={{ duration: 0.24, ease: 'easeOut' }}
                                className="wizard-step-card"
                            >
                                {/* Paso 1: Fechas y Franjas Horarias */}
                                {currentStep === 1 && (
                                    <Step1Dates
                                        camper={activeCamper}
                                        data={step1}
                                        onChange={setStep1}
                                        seasonsV2={seasonsV2}
                                        seasonPeriods={seasonPeriods}
                                    />
                                )}

                                {/* Paso 2: Modelo Seleccionado (con cambio según disponibilidad) */}
                                {currentStep === 2 && (
                                    <Step2Model
                                        selectedCamper={activeCamper}
                                        allCampers={allCampers}
                                        step1={step1}
                                        seasonsV2={seasonsV2}
                                        seasonPeriods={seasonPeriods}
                                        durationDiscounts={durationDiscounts}
                                        onSelectCamper={handleSelectModel}
                                    />
                                )}

                                {/* Paso 3: Kilometraje */}
                                {currentStep === 3 && (
                                    <Step2Mileage
                                        data={step2}
                                        totalDays={totalDays}
                                        onChange={setStep2}
                                    />
                                )}

                                {/* Paso 4: Seguro y Fianza (Estándar 2.000 € o Flex 1.000 €) */}
                                {currentStep === 4 && (
                                    <Step4Insurance
                                        depositOption={activeDepositOption}
                                        totalDays={totalDays}
                                        onChange={handleDepositChange}
                                    />
                                )}

                                {/* Paso 5: Política de Cancelación */}
                                {currentStep === 5 && (
                                    <Step3Cancellation
                                        data={step3}
                                        totalDays={totalDays}
                                        onChange={handleStep3Change}
                                    />
                                )}

                                {/* Paso 6: Extras */}
                                {currentStep === 6 && (
                                    <Step4Extras
                                        data={step4}
                                        availableExtras={availableExtras}
                                        totalDays={totalDays}
                                        onChange={setStep4}
                                    />
                                )}

                                {/* Paso 7: Pago */}
                                {currentStep === 7 && (
                                    <Step5Checkout
                                        camper={activeCamper}
                                        step1={step1}
                                        step2={step2}
                                        step3={step3}
                                        step4={step4}
                                        customer={step5}
                                        onChange={handleStep5Change}
                                        totalPayable={totalPayable}
                                        onSuccessfulSubmit={handleClearDraft}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Sticky Trip Summary Sidebar (Right column) */}
                    <div className="wizard-summary-column">
                        <StickyTripSummary
                            camper={activeCamper}
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

            {/* Sticky Bottom Navigation Bar with integrated 7-step stepper */}
            <WizardBottomBar
                currentStep={currentStep}
                maxCompletedStep={maxCompletedStep}
                onStepClick={handleStepClick}
                isStepValid={isCurrentStepValid}
                totalPayable={totalPayable}
                onPrev={handlePrev}
                onNext={handleNext}
                onSubmitStep5={handleTriggerStep5Submit}
                onOpenMobileSummary={() => setIsMobileSummaryOpen(true)}
            />

            <style jsx>{`
                .booking-wizard-root {
                    --wz-bg: #0B0C0E;
                    --wz-surface: #131518;
                    --wz-surface-soft: #181B20;
                    --wz-chip-bg: rgba(255, 255, 255, 0.035);
                    --wz-chip-border: rgba(255, 255, 255, 0.09);
                    --wz-pill-bg: rgba(204, 160, 83, 0.14);
                    --wz-pill-border: rgba(204, 160, 83, 0.28);
                    --wz-pill-text: #E8CA7C;
                    --wz-on-accent: #0B0C0E;
                    --forest-green: #CCA053;
                    --forest-green-light: #E8CA7C;
                    --black-matte: #F8FAFC;
                    --white-broken: #0B0C0E;
                    --gray-100: #1A1D22;
                    --gray-200: rgba(255, 255, 255, 0.1);
                    --gray-300: rgba(255, 255, 255, 0.18);
                    --gray-400: #7C8796;
                    --gray-500: #94A3B8;
                    --gray-600: #A8B3C4;
                    --gray-700: #CBD5E1;
                    --gray-800: #E2E8F0;
                    min-height: 100vh;
                    padding-top: 72px; /* Espacio para la barra superior fija */
                    display: flex;
                    flex-direction: column;
                    background: var(--wz-bg);
                    color: var(--black-matte);
                    color-scheme: dark;
                }

                :global(html[data-theme="light"]) .booking-wizard-root {
                    --wz-bg: #F2F0EC;
                    --wz-surface: #FFFFFF;
                    --wz-surface-soft: #FAF8F5;
                    --wz-chip-bg: #F7F5F1;
                    --wz-chip-border: #EAE5DD;
                    --wz-pill-bg: #F7EEDC;
                    --wz-pill-border: #E8D6B2;
                    --wz-pill-text: #1A1714;
                    --wz-on-accent: #F6EBD3;
                    --forest-green: #1A1714;
                    --forest-green-light: #2E2822;
                    --black-matte: #1F1B17;
                    --white-broken: #F2F0EC;
                    --gray-100: #EAE5DD;
                    --gray-200: #E2DBD3;
                    --gray-300: #D9D1C4;
                    --gray-400: #857B6F;
                    --gray-500: #6E655A;
                    --gray-600: #5A5248;
                    --gray-700: #3E3730;
                    --gray-800: #1F1B17;
                    color-scheme: light;
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
                    top: 90px;
                }

                @media (max-width: 1024px) {
                    .booking-wizard-root {
                        padding-top: 68px;
                    }
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

                @media (max-width: 860px) {
                    .wizard-main-layout {
                        padding-bottom: calc(110px + env(safe-area-inset-bottom, 16px));
                    }
                }

                @media (max-width: 768px) {
                    .booking-wizard-root {
                        padding-top: 64px;
                    }
                }
            `}</style>
        </div>
    )
}
