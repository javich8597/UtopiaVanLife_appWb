'use client'

import React, { useState } from 'react'
import { useLocale } from 'next-intl'
import {
    Lock,
    ShieldCheck,
    CreditCard,
    AlertCircle,
    Loader2,
    Building,
    User,
    Users,
    UserCheck,
    MapPin,
    Sparkles,
} from 'lucide-react'
import { Step5Customer, WizardCamper, Step1Data, Step2Data, Step3Data, Step4Data, BookingPassenger, DepositOption } from './types'
import { validateStep5, validateDriverAge, validateDrivingLicense } from './types'
import { formatPhoneWithPrefix } from '@/lib/driverDocuments'
import { formatPrice, SECOND_DRIVER_RATE_PER_DAY } from '@/lib/pricing/engine'
import DatePicker from '@/components/ui/DatePicker'

interface Step5CheckoutProps {
    camper: WizardCamper
    step1: Step1Data
    step2: Step2Data
    step3: Step3Data
    step4: Step4Data
    customer: Step5Customer
    onChange: (customer: Step5Customer) => void
    totalPayable: number
    standardDepositAmount?: number
    flexDepositAmount?: number
    secondDriverRatePerDay?: number
    onSuccessfulSubmit?: () => void
}

const COUNTRY_PREFIXES = [
    { code: '+34', flag: '🇪🇸', label: 'España (+34)' },
    { code: '+33', flag: '🇫🇷', label: 'Francia (+33)' },
    { code: '+49', flag: '🇩🇪', label: 'Alemania (+49)' },
    { code: '+44', flag: '🇬🇧', label: 'Reino Unido (+44)' },
    { code: '+39', flag: '🇮🇹', label: 'Italia (+39)' },
    { code: '+41', flag: '🇨🇭', label: 'Suiza (+41)' },
    { code: '+31', flag: '🇳🇱', label: 'Países Bajos (+31)' },
    { code: '+32', flag: '🇧🇪', label: 'Bélgica (+32)' },
    { code: '+351', flag: '🇵🇹', label: 'Portugal (+351)' },
    { code: '+43', flag: '🇦🇹', label: 'Austria (+43)' },
    { code: '+45', flag: '🇩🇰', label: 'Dinamarca (+45)' },
    { code: '+46', flag: '🇸🇪', label: 'Suecia (+46)' },
    { code: '+47', flag: '🇳🇴', label: 'Noruega (+47)' },
    { code: '+353', flag: '🇮🇪', label: 'Irlanda (+353)' },
    { code: '+1', flag: '🇺🇸', label: 'EE.UU. / Canadá (+1)' },
]

export default function Step5Checkout({
    camper,
    step1,
    step2,
    step3,
    step4,
    customer,
    onChange,
    totalPayable,
    standardDepositAmount = 2000,
    flexDepositAmount = 1000,
    secondDriverRatePerDay = SECOND_DRIVER_RATE_PER_DAY,
    onSuccessfulSubmit,
}: Step5CheckoutProps) {
    const locale = useLocale()
    const [todayDate] = useState(() => new Date())
    const [defaultBirthViewDate] = useState(() => new Date(new Date().getFullYear() - 30, 0, 1))
    const [defaultLicenseViewDate] = useState(() => new Date(new Date().getFullYear() - 6, 0, 1))
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const maxPax = camper.specs?.seats || (camper.slug === 'space' ? 2 : 3)
    const currentTravelersCount = customer.travelersCount || step1.pax || 1
    const additionalPaxCount = Math.max(0, currentTravelersCount - 1)
    const currentDeposit: DepositOption = step3.depositOption || customer.depositOption || 'standard_2000'
    /** El bloque del 2º conductor "solo" (y su validación en validateStep5) solo existe con 1 viajero */
    const soloSecondDriverVisible = currentTravelersCount === 1
    /** Con Flex el 2º conductor va incluido; con Estándar cuesta secondDriverRatePerDay */
    const secondDriverIncluded = currentDeposit === 'flex_1000'
    const secondDriverPriceLabel = secondDriverIncluded
        ? 'Incluido sin recargo en tu Seguro Flex.'
        : `Suplemento de ${secondDriverRatePerDay} €/día con el Seguro Estándar.`

    // Helpers reactivos para cálculo de edad y antigüedad
    const calculateAge = (birthDate?: string | null): number | null => {
        if (!birthDate) return null
        const dob = new Date(birthDate)
        if (isNaN(dob.getTime())) return null
        const today = new Date()
        let age = today.getFullYear() - dob.getFullYear()
        const m = today.getMonth() - dob.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--
        }
        return age
    }

    const calculateLicenseYears = (licenseDate?: string | null): number | null => {
        if (!licenseDate) return null
        const exp = new Date(licenseDate)
        if (isNaN(exp.getTime())) return null
        const today = new Date()
        let years = today.getFullYear() - exp.getFullYear()
        const m = today.getMonth() - exp.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < exp.getDate())) {
            years--
        }
        return years
    }

    const currentAge = calculateAge(customer.birthDate)
    const currentLicenseYears = calculateLicenseYears(customer.licenseDate)

    const handleInputChange = (field: keyof Step5Customer, value: any) => {
        const next = { ...customer, [field]: value }
        onChange(next)

        // Limpiar error específico
        if (fieldErrors[field]) {
            setFieldErrors((prev) => {
                const updated = { ...prev }
                delete updated[field]
                return updated
            })
        }

        // Validación en tiempo real para fecha de nacimiento conductor principal
        if (field === 'birthDate') {
            const ageValidation = validateDriverAge(value)
            if (!ageValidation.isValid) {
                setFieldErrors((prev) => ({ ...prev, birthDate: ageValidation.error! }))
            } else {
                setFieldErrors((prev) => {
                    const updated = { ...prev }
                    delete updated.birthDate
                    return updated
                })
            }
        }

        // Validación en tiempo real para carnet B conductor principal
        if (field === 'licenseDate') {
            const licenseValidation = validateDrivingLicense(value)
            if (!licenseValidation.isValid) {
                setFieldErrors((prev) => ({ ...prev, licenseDate: licenseValidation.error! }))
            } else {
                setFieldErrors((prev) => {
                    const updated = { ...prev }
                    delete updated.licenseDate
                    return updated
                })
            }
        }
    }

    const handleTravelersCountChange = (newCount: number) => {
        const currentPassengers = [...(customer.passengers || [])]
        const needed = Math.max(0, newCount - 1)
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
        onChange({
            ...customer,
            travelersCount: newCount,
            passengers: updatedPassengers,
        })
    }

    const handlePassengerChange = (index: number, field: keyof BookingPassenger, value: any) => {
        const currentPassengers = [...(customer.passengers || [])]
        while (currentPassengers.length <= index) {
            currentPassengers.push({
                fullName: '',
                dniNie: '',
                birthDate: '',
                isSecondDriver: false,
                licenseDate: '',
                driverLicenseId: '',
            })
        }

        if (field === 'isSecondDriver' && value === true) {
            // Solo un acompañante puede ser 2º conductor
            currentPassengers.forEach((p, idx) => {
                p.isSecondDriver = idx === index
            })
        } else {
            currentPassengers[index] = {
                ...currentPassengers[index],
                [field]: value,
            }
        }

        const next = { ...customer, passengers: currentPassengers }
        onChange(next)

        // Limpiar errores específicos del pasajero
        const errKey = `passenger_${index + 2}_${field}`
        if (fieldErrors[errKey]) {
            setFieldErrors((prev) => {
                const updated = { ...prev }
                delete updated[errKey]
                return updated
            })
        }
    }

    const handleSoloSecondDriverChange = (field: keyof BookingPassenger, value: any) => {
        const currentSec = customer.secondDriverSolo || { fullName: '', dniNie: '', birthDate: '', licenseDate: '', driverLicenseId: '' }
        const nextSec = { ...currentSec, [field]: value }
        const next = { ...customer, secondDriverSolo: nextSec }
        onChange(next)

        const errKey = `secondDriverSolo_${field}`
        if (fieldErrors[errKey]) {
            setFieldErrors((prev) => {
                const updated = { ...prev }
                delete updated[errKey]
                return updated
            })
        }
    }

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitError(null)

        // Validar todos los campos del paso 7 (con modalidad de seguro y fianza actual)
        const normalizedCustomerForValidation: Step5Customer = {
            ...customer,
            depositOption: currentDeposit,
        }
        const validation = validateStep5(normalizedCustomerForValidation, maxPax)
        if (!validation.isValid) {
            setFieldErrors(validation.errors)
            const firstErrorKey = Object.keys(validation.errors)[0]
            const el = document.getElementById(`input-${firstErrorKey}`)
            if (el) el.focus()
            return
        }

        setIsSubmitting(true)

        try {
            // Normaliza antes de mirar el +: es lo mismo que valida validateStep5
            const formattedPhone = formatPhoneWithPrefix(customer.phone, customer.phoneCountryCode)

            const payload = {
                locale,
                camperSlug: camper.slug,
                startDate: step1.startDate,
                startSlot: step1.startSlot,
                endDate: step1.endDate,
                endSlot: step1.endSlot,
                pickupSlot: step1.startSlot,
                dropoffSlot: step1.endSlot,
                kmPackage: step2.kmPackage,
                cancellationPolicy: step3.cancellationPolicy,
                depositOption: currentDeposit,
                depositAmount: currentDeposit === 'flex_1000' ? flexDepositAmount : standardDepositAmount,
                extrasSelected: step4.selectedExtras.map((e) => ({
                    id: e.id,
                    name: e.name_es,
                    price: e.price,
                    pricingType: e.price_type,
                    quantity: e.quantity,
                })),
                customer: {
                    fullName: customer.fullName.trim(),
                    email: customer.email.trim().toLowerCase(),
                    phone: formattedPhone,
                    dniNie: customer.dniNie.trim().toUpperCase(),
                    birthDate: customer.birthDate,
                    licenseDate: customer.licenseDate,
                    depositOption: currentDeposit,
                    address: customer.address.trim(),
                    city: customer.city.trim(),
                    postalCode: customer.postalCode.trim(),
                    country: customer.country.trim(),
                    travelersCount: currentTravelersCount,
                    passengers: (customer.passengers || []).slice(0, Math.max(0, currentTravelersCount - 1)),
                    secondDriverSoloEnabled: soloSecondDriverVisible && Boolean(customer.secondDriverSoloEnabled),
                    secondDriverSolo: soloSecondDriverVisible && customer.secondDriverSoloEnabled ? customer.secondDriverSolo : undefined,
                    notes: customer.specialNotes || '',
                },
            }

            const response = await fetch('/api/bookings/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Ocurrió un error al procesar la reserva. Por favor, revisa tus datos.')
            }

            if (onSuccessfulSubmit) {
                onSuccessfulSubmit()
            }

            const redsysUrl = data.formData?.url || data.redsys?.url
            const version = data.formData?.signatureVersion || data.redsys?.version
            const merchantParams = data.formData?.merchantParameters || data.redsys?.params
            const signature = data.formData?.signature || data.redsys?.signature

            if (!redsysUrl || !merchantParams || !signature) {
                throw new Error('Respuesta inválida de la pasarela de pago Redsys')
            }

            const form = document.createElement('form')
            form.method = 'POST'
            form.action = redsysUrl
            form.style.display = 'none'

            const inputVersion = document.createElement('input')
            inputVersion.type = 'hidden'
            inputVersion.name = 'Ds_SignatureVersion'
            inputVersion.value = version
            form.appendChild(inputVersion)

            const inputParams = document.createElement('input')
            inputParams.type = 'hidden'
            inputParams.name = 'Ds_MerchantParameters'
            inputParams.value = merchantParams
            form.appendChild(inputParams)

            const inputSignature = document.createElement('input')
            inputSignature.type = 'hidden'
            inputSignature.name = 'Ds_Signature'
            inputSignature.value = signature
            form.appendChild(inputSignature)

            document.body.appendChild(form)
            form.submit()
        } catch (err: any) {
            console.error('Booking checkout error:', err)
            setSubmitError(err.message || 'Error de conexión con la pasarela bancaria')
            setIsSubmitting(false)
        }
    }

    return (
        <div className="step-checkout">
            {/* Header */}
            <div className="step-header">
                <span className="step-header__tag">PASO 7 DE 7</span>
                <h2 className="step-header__title">Datos y pago</h2>
            </div>

            {submitError && (
                <div className="alert-box alert-box--error" role="alert">
                    <AlertCircle size={16} />
                    <span>{submitError}</span>
                </div>
            )}

            <form onSubmit={handleSubmitPayment} className="checkout-form" noValidate>
                {/* ── 1. Grupo Conductor Principal ── */}
                <div className="form-group-card">
                    <div className="form-group-card__header">
                        <User size={15} className="text-forest" />
                        <h4 className="form-group-card__title">Conductor Principal (Titular de la reserva)</h4>
                    </div>

                    <div className="form-grid">
                        {/* Full Name */}
                        <div className="form-field form-field--span-2">
                            <label htmlFor="input-fullName" className="field-label">
                                Nombre y Apellidos completos *
                            </label>
                            <input
                                id="input-fullName"
                                type="text"
                                className={`field-input ${fieldErrors.fullName ? 'field-input--error' : ''}`}
                                placeholder="Ej. Carlos Martínez García"
                                value={customer.fullName}
                                onChange={(e) => handleInputChange('fullName', e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                            {fieldErrors.fullName && (
                                <span className="field-error-text">{fieldErrors.fullName}</span>
                            )}
                        </div>

                        {/* DNI / NIE / Passport */}
                        <div className="form-field">
                            <label htmlFor="input-dniNie" className="field-label">
                                DNI / NIE / Pasaporte *
                            </label>
                            <input
                                id="input-dniNie"
                                type="text"
                                className={`field-input ${fieldErrors.dniNie ? 'field-input--error' : ''}`}
                                placeholder="12345678Z ó X1234567A"
                                value={customer.dniNie}
                                onChange={(e) => handleInputChange('dniNie', e.target.value.toUpperCase())}
                                disabled={isSubmitting}
                                required
                            />
                            {fieldErrors.dniNie ? (
                                <span className="field-error-text">{fieldErrors.dniNie}</span>
                            ) : (
                                <span className="field-hint">DNI español con letra de control o pasaporte</span>
                            )}
                        </div>

                        {/* Number of Travelers */}
                        <div className="form-field">
                            <label htmlFor="input-travelersCount" className="field-label">
                                Número total de viajeros *
                            </label>
                            <select
                                id="input-travelersCount"
                                className={`field-input field-select ${fieldErrors.travelersCount ? 'field-input--error' : ''}`}
                                value={currentTravelersCount}
                                onChange={(e) => handleTravelersCountChange(Number(e.target.value))}
                                disabled={isSubmitting}
                            >
                                {Array.from({ length: maxPax }, (_, i) => i + 1).map((num) => (
                                    <option key={num} value={num}>
                                        {num} {num === 1 ? 'persona (Solo conductor)' : `personas (1 conductor + ${num - 1} ${num === 2 ? 'acompañante' : 'acompañantes'})`}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.travelersCount && (
                                <span className="field-error-text">{fieldErrors.travelersCount}</span>
                            )}
                        </div>

                        {/* Driver Birth Date (>= 25 years old) */}
                        <div className="form-field">
                            <label htmlFor="input-birthDate" className="field-label">
                                Fecha de nacimiento (Conductor) *
                            </label>
                            <DatePicker
                                id="input-birthDate"
                                value={customer.birthDate || ''}
                                onChange={(val) => handleInputChange('birthDate', val)}
                                hasError={!!fieldErrors.birthDate}
                                disabled={isSubmitting}
                                maxDate={todayDate}
                                defaultViewDate={defaultBirthViewDate}
                                placeholder="Seleccionar fecha de nacimiento"
                                locale={locale}
                                required
                            />
                            {fieldErrors.birthDate ? (
                                <span className="field-error-text">{fieldErrors.birthDate}</span>
                            ) : currentAge !== null && currentAge >= 25 ? (
                                <span className="field-success-hint">
                                    ✓ Edad válida: {currentAge} años (mínimo 25 cumplido)
                                </span>
                            ) : (
                                <span className="field-hint">Requisito de seguro: mínimo 25 años cumplidos</span>
                            )}
                        </div>

                        {/* Driving License Date (>= 2 years) */}
                        <div className="form-field">
                            <label htmlFor="input-licenseDate" className="field-label">
                                Fecha expedición carnet B (Conductor) *
                            </label>
                            <DatePicker
                                id="input-licenseDate"
                                value={customer.licenseDate || ''}
                                onChange={(val) => handleInputChange('licenseDate', val)}
                                hasError={!!fieldErrors.licenseDate}
                                disabled={isSubmitting}
                                maxDate={todayDate}
                                defaultViewDate={defaultLicenseViewDate}
                                placeholder="Seleccionar fecha de expedición"
                                locale={locale}
                                required
                            />
                            {fieldErrors.licenseDate ? (
                                <span className="field-error-text">{fieldErrors.licenseDate}</span>
                            ) : currentLicenseYears !== null && currentLicenseYears >= 2 ? (
                                <span className="field-success-hint">
                                    ✓ Antigüedad válida: {currentLicenseYears} {currentLicenseYears === 1 ? 'año' : 'años'} de carnet B
                                </span>
                            ) : (
                                <span className="field-hint">Mínimo 2 años de experiencia con permiso clase B</span>
                            )}
                        </div>

                        {/* Email */}
                        <div className="form-field">
                            <label htmlFor="input-email" className="field-label">
                                Correo Electrónico *
                            </label>
                            <input
                                id="input-email"
                                type="email"
                                className={`field-input ${fieldErrors.email ? 'field-input--error' : ''}`}
                                placeholder="tunombre@email.com"
                                value={customer.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                            {fieldErrors.email ? (
                                <span className="field-error-text">{fieldErrors.email}</span>
                            ) : (
                                <span className="field-hint">Recibirás aquí el contrato y acceso al panel</span>
                            )}
                        </div>

                        {/* Phone with International Country Code */}
                        <div className="form-field">
                            <label htmlFor="input-phone" className="field-label">
                                Teléfono móvil internacional *
                            </label>
                            <div className="phone-field-row">
                                <select
                                    id="input-phoneCountryCode"
                                    className="phone-prefix-select"
                                    value={customer.phoneCountryCode || '+34'}
                                    onChange={(e) => handleInputChange('phoneCountryCode', e.target.value)}
                                    disabled={isSubmitting}
                                    aria-label="Prefijo telefónico internacional"
                                >
                                    {COUNTRY_PREFIXES.map((p) => (
                                        <option key={p.code} value={p.code}>
                                            {p.flag} {p.code}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    id="input-phone"
                                    type="tel"
                                    className={`field-input phone-number-input ${fieldErrors.phone ? 'field-input--error' : ''}`}
                                    placeholder="600 000 000"
                                    value={customer.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>
                            {fieldErrors.phone ? (
                                <span className="field-error-text">{fieldErrors.phone}</span>
                            ) : (
                                <span className="field-hint">Coordinación de entrega y asistencia en ruta 16h</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── 2. DATOS DE CADA PASAJERO ACOMPAÑANTE ── */}
                {additionalPaxCount > 0 && (
                    <div className="passengers-section">
                        <div className="passengers-section__header">
                            <Users size={15} className="text-forest" />
                            <h4 className="passengers-section__title">
                                Pasajeros acompañantes ({additionalPaxCount} {additionalPaxCount === 1 ? 'persona' : 'personas'})
                            </h4>
                        </div>
                        <p className="passengers-section__desc">
                            Requerido por normativa de tráfico y registro de viajeros de la Guardia Civil / Hospederías en Baleares.
                        </p>

                        <div className="passengers-cards-list">
                            {Array.from({ length: additionalPaxCount }).map((_, idx) => {
                                const pNum = idx + 2
                                const passenger = (customer.passengers && customer.passengers[idx]) || {
                                    fullName: '',
                                    dniNie: '',
                                    birthDate: '',
                                    isSecondDriver: false,
                                    licenseDate: '',
                                    driverLicenseId: '',
                                }
                                const pAge = calculateAge(passenger.birthDate)
                                const pLicenseYears = calculateLicenseYears(passenger.licenseDate)
                                const is2ndDriver = Boolean(passenger.isSecondDriver)

                                return (
                                    <div key={idx} className={`passenger-card ${is2ndDriver ? 'passenger-card--second-driver' : ''}`}>
                                        <div className="passenger-card__header">
                                            <div className="passenger-card__tag">
                                                <User size={14} />
                                                <span>Pasajero {pNum} (Acompañante)</span>
                                            </div>
                                            {is2ndDriver && (
                                                <span className="passenger-driver-badge">
                                                    <UserCheck size={12} />
                                                    2º Conductor Autorizado
                                                </span>
                                            )}
                                        </div>

                                        <div className="form-grid">
                                            {/* Full Name */}
                                            <div className="form-field form-field--span-2">
                                                <label htmlFor={`input-passenger_${pNum}_fullName`} className="field-label">
                                                    Nombre y Apellidos completos (Pasajero {pNum}) *
                                                </label>
                                                <input
                                                    id={`input-passenger_${pNum}_fullName`}
                                                    type="text"
                                                    className={`field-input ${fieldErrors[`passenger_${pNum}_fullName`] ? 'field-input--error' : ''}`}
                                                    placeholder="Nombre y dos apellidos"
                                                    value={passenger.fullName}
                                                    onChange={(e) => handlePassengerChange(idx, 'fullName', e.target.value)}
                                                    disabled={isSubmitting}
                                                    required
                                                />
                                                {fieldErrors[`passenger_${pNum}_fullName`] && (
                                                    <span className="field-error-text">{fieldErrors[`passenger_${pNum}_fullName`]}</span>
                                                )}
                                            </div>

                                            {/* DNI / NIE / Passport */}
                                            <div className="form-field">
                                                <label htmlFor={`input-passenger_${pNum}_dniNie`} className="field-label">
                                                    DNI / NIE / Pasaporte *
                                                </label>
                                                <input
                                                    id={`input-passenger_${pNum}_dniNie`}
                                                    type="text"
                                                    className={`field-input ${fieldErrors[`passenger_${pNum}_dniNie`] ? 'field-input--error' : ''}`}
                                                    placeholder="Documento de identidad"
                                                    value={passenger.dniNie}
                                                    onChange={(e) => handlePassengerChange(idx, 'dniNie', e.target.value.toUpperCase())}
                                                    disabled={isSubmitting}
                                                    required
                                                />
                                                {fieldErrors[`passenger_${pNum}_dniNie`] && (
                                                    <span className="field-error-text">{fieldErrors[`passenger_${pNum}_dniNie`]}</span>
                                                )}
                                            </div>

                                            {/* Birth Date */}
                                            <div className="form-field">
                                                <label htmlFor={`input-passenger_${pNum}_birthDate`} className="field-label">
                                                    Fecha de nacimiento *
                                                </label>
                                                <DatePicker
                                                    id={`input-passenger_${pNum}_birthDate`}
                                                    value={passenger.birthDate || ''}
                                                    onChange={(val) => handlePassengerChange(idx, 'birthDate', val)}
                                                    hasError={!!fieldErrors[`passenger_${pNum}_birthDate`]}
                                                    disabled={isSubmitting}
                                                    maxDate={todayDate}
                                                    defaultViewDate={defaultBirthViewDate}
                                                    placeholder="Seleccionar fecha de nacimiento"
                                                    locale={locale}
                                                    required
                                                />
                                                {fieldErrors[`passenger_${pNum}_birthDate`] ? (
                                                    <span className="field-error-text">{fieldErrors[`passenger_${pNum}_birthDate`]}</span>
                                                ) : pAge !== null ? (
                                                    <span className="field-hint">Edad calculada: {pAge} años</span>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Casilla para habilitar 2º conductor (con cualquier modalidad de seguro) */}
                                        <div className="second-driver-toggle-box">
                                            <label className="driver-toggle-label" htmlFor={`checkbox-second-driver-${pNum}`}>
                                                <input
                                                    id={`checkbox-second-driver-${pNum}`}
                                                    type="checkbox"
                                                    className="driver-toggle-checkbox"
                                                    checked={is2ndDriver}
                                                    onChange={(e) => handlePassengerChange(idx, 'isSecondDriver', e.target.checked)}
                                                    disabled={isSubmitting}
                                                />
                                                <div className="driver-toggle-text">
                                                    <span className="driver-toggle-title">
                                                        Habilitar a Pasajero {pNum} como 2º conductor autorizado
                                                        {secondDriverIncluded
                                                            ? <span className="driver-toggle-price">incluido</span>
                                                            : <span className="driver-toggle-price driver-toggle-price--charged">+{secondDriverRatePerDay} €/día</span>}
                                                    </span>
                                                    <span className="driver-toggle-sub">
                                                        {secondDriverPriceLabel} Solo un acompañante puede ser 2º conductor.
                                                    </span>
                                                </div>
                                            </label>

                                            {is2ndDriver && (
                                                <div className="second-driver-license-block">
                                                    <div className="form-grid">
                                                        <div className="form-field">
                                                            <label htmlFor={`input-passenger_${pNum}_driverLicenseId`} className="field-label">
                                                                Número del permiso de conducir (Pasajero {pNum}) *
                                                            </label>
                                                            <input
                                                                id={`input-passenger_${pNum}_driverLicenseId`}
                                                                type="text"
                                                                className={`field-input ${fieldErrors[`passenger_${pNum}_driverLicenseId`] ? 'field-input--error' : ''}`}
                                                                placeholder="Ej. 12345678-Z"
                                                                value={passenger.driverLicenseId || ''}
                                                                onChange={(e) => handlePassengerChange(idx, 'driverLicenseId', e.target.value)}
                                                                disabled={isSubmitting}
                                                                required
                                                            />
                                                            {fieldErrors[`passenger_${pNum}_driverLicenseId`] ? (
                                                                <span className="field-error-text">{fieldErrors[`passenger_${pNum}_driverLicenseId`]}</span>
                                                            ) : (
                                                                <span className="field-hint">El número que figura en su carnet: es el que autoriza el contrato.</span>
                                                            )}
                                                        </div>

                                                        <div className="form-field">
                                                            <label htmlFor={`input-passenger_${pNum}_licenseDate`} className="field-label">
                                                                Fecha expedición carnet B (Pasajero {pNum}) *
                                                            </label>
                                                            <DatePicker
                                                                id={`input-passenger_${pNum}_licenseDate`}
                                                                value={passenger.licenseDate || ''}
                                                                onChange={(val) => handlePassengerChange(idx, 'licenseDate', val)}
                                                                hasError={!!fieldErrors[`passenger_${pNum}_licenseDate`]}
                                                                disabled={isSubmitting}
                                                                maxDate={todayDate}
                                                                defaultViewDate={defaultLicenseViewDate}
                                                                placeholder="Seleccionar fecha de expedición"
                                                                locale={locale}
                                                                required
                                                            />
                                                            {fieldErrors[`passenger_${pNum}_licenseDate`] && (
                                                                <span className="field-error-text">{fieldErrors[`passenger_${pNum}_licenseDate`]}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="driver-verification-status">
                                                        {pAge !== null && pAge < 25 && (
                                                            <span className="verification-pill verification-pill--error">
                                                                ⚠️ Edad: {pAge} años (Se requieren al menos 25 años para conducir)
                                                            </span>
                                                        )}
                                                        {pLicenseYears !== null && pLicenseYears < 2 && (
                                                            <span className="verification-pill verification-pill--error">
                                                                ⚠️ Carnet B: {pLicenseYears} {pLicenseYears === 1 ? 'año' : 'años'} (Se requieren mínimo 2 años de experiencia)
                                                            </span>
                                                        )}
                                                        {pAge !== null && pAge >= 25 && pLicenseYears !== null && pLicenseYears >= 2 && (
                                                            <span className="verification-pill verification-pill--success">
                                                                ✓ 2º conductor verificado: {pAge} años y {pLicenseYears} años de experiencia
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* ── Si viaja 1 solo pasajero: Opción de 2º conductor (con cualquier seguro/fianza) ── */}
                {soloSecondDriverVisible && (
                    <div className="form-group-card form-group-card--solo-second-driver">
                        <div className="form-group-card__header">
                            <UserCheck size={15} className="text-forest" />
                            <h4 className="form-group-card__title">
                                2º Conductor Autorizado Opcional ({secondDriverIncluded ? 'incluido con Seguro Flex' : `+${secondDriverRatePerDay} €/día con Seguro Estándar`})
                            </h4>
                        </div>
                        <p className="section-intro-text">
                            {secondDriverPriceLabel} Si alguien más va a conducir la camper durante tu viaje, puedes añadir sus datos ahora:
                        </p>

                        <div className="second-driver-toggle-box">
                            <label className="driver-toggle-label" htmlFor="checkbox-solo-second-driver">
                                <input
                                    id="checkbox-solo-second-driver"
                                    type="checkbox"
                                    className="driver-toggle-checkbox"
                                    checked={Boolean(customer.secondDriverSoloEnabled)}
                                    onChange={(e) => handleInputChange('secondDriverSoloEnabled', e.target.checked)}
                                    disabled={isSubmitting}
                                />
                                <div className="driver-toggle-text">
                                    <span className="driver-toggle-title">
                                        Añadir datos de un 2º conductor autorizado (opcional)
                                        {secondDriverIncluded
                                            ? <span className="driver-toggle-price">incluido</span>
                                            : <span className="driver-toggle-price driver-toggle-price--charged">+{secondDriverRatePerDay} €/día</span>}
                                    </span>
                                    <span className="driver-toggle-sub">
                                        Habilita a otra persona para alternarse al volante con cobertura total del seguro.
                                    </span>
                                </div>
                            </label>

                            {customer.secondDriverSoloEnabled && (
                                <div className="solo-second-driver-fields">
                                    <div className="form-grid">
                                        <div className="form-field form-field--span-2">
                                            <label htmlFor="input-secondDriverSolo_fullName" className="field-label">
                                                Nombre y Apellidos completos (2º Conductor) *
                                            </label>
                                            <input
                                                id="input-secondDriverSolo_fullName"
                                                type="text"
                                                className={`field-input ${fieldErrors.secondDriverSolo_fullName ? 'field-input--error' : ''}`}
                                                placeholder="Ej. María Sánchez Romero"
                                                value={customer.secondDriverSolo?.fullName || ''}
                                                onChange={(e) => handleSoloSecondDriverChange('fullName', e.target.value)}
                                                disabled={isSubmitting}
                                                required
                                            />
                                            {fieldErrors.secondDriverSolo_fullName && (
                                                <span className="field-error-text">{fieldErrors.secondDriverSolo_fullName}</span>
                                            )}
                                        </div>

                                        <div className="form-field">
                                            <label htmlFor="input-secondDriverSolo_dniNie" className="field-label">
                                                DNI / NIE / Pasaporte *
                                            </label>
                                            <input
                                                id="input-secondDriverSolo_dniNie"
                                                type="text"
                                                className={`field-input ${fieldErrors.secondDriverSolo_dniNie ? 'field-input--error' : ''}`}
                                                placeholder="Documento de identidad"
                                                value={customer.secondDriverSolo?.dniNie || ''}
                                                onChange={(e) => handleSoloSecondDriverChange('dniNie', e.target.value.toUpperCase())}
                                                disabled={isSubmitting}
                                                required
                                            />
                                            {fieldErrors.secondDriverSolo_dniNie && (
                                                <span className="field-error-text">{fieldErrors.secondDriverSolo_dniNie}</span>
                                            )}
                                        </div>

                                        <div className="form-field">
                                            <label htmlFor="input-secondDriverSolo_birthDate" className="field-label">
                                                Fecha de nacimiento (2º Conductor) *
                                            </label>
                                            <DatePicker
                                                id="input-secondDriverSolo_birthDate"
                                                value={customer.secondDriverSolo?.birthDate || ''}
                                                onChange={(val) => handleSoloSecondDriverChange('birthDate', val)}
                                                hasError={!!fieldErrors.secondDriverSolo_birthDate}
                                                disabled={isSubmitting}
                                                maxDate={todayDate}
                                                defaultViewDate={defaultBirthViewDate}
                                                placeholder="Seleccionar fecha de nacimiento"
                                                locale={locale}
                                                required
                                            />
                                            {fieldErrors.secondDriverSolo_birthDate && (
                                                <span className="field-error-text">{fieldErrors.secondDriverSolo_birthDate}</span>
                                            )}
                                        </div>

                                        <div className="form-field">
                                            <label htmlFor="input-secondDriverSolo_driverLicenseId" className="field-label">
                                                Número del permiso de conducir (2º Conductor) *
                                            </label>
                                            <input
                                                id="input-secondDriverSolo_driverLicenseId"
                                                type="text"
                                                className={`field-input ${fieldErrors.secondDriverSolo_driverLicenseId ? 'field-input--error' : ''}`}
                                                placeholder="Ej. 12345678-Z"
                                                value={customer.secondDriverSolo?.driverLicenseId || ''}
                                                onChange={(e) => handleSoloSecondDriverChange('driverLicenseId', e.target.value)}
                                                disabled={isSubmitting}
                                                required
                                            />
                                            {fieldErrors.secondDriverSolo_driverLicenseId ? (
                                                <span className="field-error-text">{fieldErrors.secondDriverSolo_driverLicenseId}</span>
                                            ) : (
                                                <span className="field-hint">El número que figura en su carnet: es el que autoriza el contrato.</span>
                                            )}
                                        </div>

                                        <div className="form-field">
                                            <label htmlFor="input-secondDriverSolo_licenseDate" className="field-label">
                                                Fecha expedición carnet B (2º Conductor) *
                                            </label>
                                            <DatePicker
                                                id="input-secondDriverSolo_licenseDate"
                                                value={customer.secondDriverSolo?.licenseDate || ''}
                                                onChange={(val) => handleSoloSecondDriverChange('licenseDate', val)}
                                                hasError={!!fieldErrors.secondDriverSolo_licenseDate}
                                                disabled={isSubmitting}
                                                maxDate={todayDate}
                                                defaultViewDate={defaultLicenseViewDate}
                                                placeholder="Seleccionar fecha de expedición"
                                                locale={locale}
                                                required
                                            />
                                            {fieldErrors.secondDriverSolo_licenseDate && (
                                                <span className="field-error-text">{fieldErrors.secondDriverSolo_licenseDate}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="driver-verification-status">
                                        {calculateAge(customer.secondDriverSolo?.birthDate) !== null && (calculateAge(customer.secondDriverSolo?.birthDate) as number) < 25 && (
                                            <span className="verification-pill verification-pill--error">
                                                ⚠️ Edad: {calculateAge(customer.secondDriverSolo?.birthDate)} años (Mínimo 25 años requeridos)
                                            </span>
                                        )}
                                        {calculateLicenseYears(customer.secondDriverSolo?.licenseDate) !== null && (calculateLicenseYears(customer.secondDriverSolo?.licenseDate) as number) < 2 && (
                                            <span className="verification-pill verification-pill--error">
                                                ⚠️ Carnet B: {calculateLicenseYears(customer.secondDriverSolo?.licenseDate)} años (Mínimo 2 años requeridos)
                                            </span>
                                        )}
                                        {calculateAge(customer.secondDriverSolo?.birthDate) !== null && (calculateAge(customer.secondDriverSolo?.birthDate) as number) >= 25 && calculateLicenseYears(customer.secondDriverSolo?.licenseDate) !== null && (calculateLicenseYears(customer.secondDriverSolo?.licenseDate) as number) >= 2 && (
                                            <span className="verification-pill verification-pill--success">
                                                ✓ 2º conductor apto: edad y antigüedad válidas
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── 3. Dirección de Facturación y Contrato ── */}
                <div className="form-group-card">
                    <div className="form-group-card__header">
                        <MapPin size={15} className="text-forest" />
                        <h4 className="form-group-card__title">Dirección de facturación y contrato</h4>
                    </div>

                    <div className="form-grid">
                        {/* Address */}
                        <div className="form-field form-field--span-2">
                            <label htmlFor="input-address" className="field-label">
                                Dirección (Calle, número, piso/puerta) *
                            </label>
                            <input
                                id="input-address"
                                type="text"
                                className={`field-input ${fieldErrors.address ? 'field-input--error' : ''}`}
                                placeholder="Ej. Gran Vía 28, 4º B"
                                value={customer.address}
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                            {fieldErrors.address && (
                                <span className="field-error-text">{fieldErrors.address}</span>
                            )}
                        </div>

                        {/* City */}
                        <div className="form-field">
                            <label htmlFor="input-city" className="field-label">
                                Ciudad / Población *
                            </label>
                            <input
                                id="input-city"
                                type="text"
                                className={`field-input ${fieldErrors.city ? 'field-input--error' : ''}`}
                                placeholder="Ej. Madrid"
                                value={customer.city}
                                onChange={(e) => handleInputChange('city', e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                            {fieldErrors.city && (
                                <span className="field-error-text">{fieldErrors.city}</span>
                            )}
                        </div>

                        {/* Postal Code */}
                        <div className="form-field">
                            <label htmlFor="input-postalCode" className="field-label">
                                Código Postal *
                            </label>
                            <input
                                id="input-postalCode"
                                type="text"
                                className={`field-input ${fieldErrors.postalCode ? 'field-input--error' : ''}`}
                                placeholder="28013"
                                value={customer.postalCode}
                                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                            {fieldErrors.postalCode && (
                                <span className="field-error-text">{fieldErrors.postalCode}</span>
                            )}
                        </div>

                        {/* Country */}
                        <div className="form-field form-field--span-2">
                            <label htmlFor="input-country" className="field-label">
                                País *
                            </label>
                            <input
                                id="input-country"
                                type="text"
                                className={`field-input ${fieldErrors.country ? 'field-input--error' : ''}`}
                                placeholder="España"
                                value={customer.country}
                                onChange={(e) => handleInputChange('country', e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                            {fieldErrors.country && (
                                <span className="field-error-text">{fieldErrors.country}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── 4. Peticiones o Notas Especiales ── */}
                <div className="form-group-card">
                    <div className="form-group-card__header">
                        <Sparkles size={15} className="text-forest" />
                        <h4 className="form-group-card__title">Notas especiales o detalles del viaje</h4>
                    </div>

                    <div className="form-field">
                        <textarea
                            id="input-specialNotes"
                            className="field-textarea"
                            rows={3}
                            placeholder="Ej. Llegamos en vuelo a las 09:30h a Son San Joan, o tenemos dudas sobre spots de pernocta en la isla..."
                            value={customer.specialNotes || ''}
                            onChange={(e) => handleInputChange('specialNotes', e.target.value)}
                            disabled={isSubmitting}
                        />
                        <span className="field-hint">Opcional. Te contactaremos personalmente tras formalizar la reserva.</span>
                    </div>
                </div>

                {/* ── 5. Checkboxes Obligatorios Desglosados e Independientes ── */}
                <div className="legal-consent-card">
                    <div className="legal-consent-header">
                        <ShieldCheck size={15} className="text-forest" />
                        <span className="legal-consent-title">Consentimientos y condiciones obligatorias</span>
                    </div>

                    {/* Checkbox 1: Términos y Condiciones */}
                    <div className="checkbox-block">
                        <label className="checkbox-row" htmlFor="checkbox-acceptTerms">
                            <input
                                id="checkbox-acceptTerms"
                                type="checkbox"
                                checked={customer.acceptTerms}
                                onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                                disabled={isSubmitting}
                            />
                            <span className="checkbox-label">
                                He leído y acepto los{' '}
                                <a href="/legal/terminos" target="_blank" rel="noopener noreferrer" className="legal-link">
                                    Términos y Condiciones Generales de Alquiler
                                </a>{' '}
                                de Utopia Van Life y las coberturas de la póliza de seguro a todo riesgo. *
                            </span>
                        </label>
                        {fieldErrors.acceptTerms && (
                            <span className="field-error-text field-error-text--checkbox">
                                {fieldErrors.acceptTerms}
                            </span>
                        )}
                    </div>

                    {/* Checkbox 2: Política de Cancelación */}
                    <div className="checkbox-block">
                        <label className="checkbox-row" htmlFor="checkbox-acceptCancellation">
                            <input
                                id="checkbox-acceptCancellation"
                                type="checkbox"
                                checked={customer.acceptCancellationPolicy}
                                onChange={(e) => handleInputChange('acceptCancellationPolicy', e.target.checked)}
                                disabled={isSubmitting}
                            />
                            <span className="checkbox-label">
                                Acepto la{' '}
                                <strong className="text-strong-gold">Política de Cancelación oficial</strong>: reembolso del 100% cancelando con más de 30 días de antelación, 50% entre 15 y 29 días, y 0% con 14 días o menos antes de la recogida del vehículo. *
                            </span>
                        </label>
                        {fieldErrors.acceptCancellationPolicy && (
                            <span className="field-error-text field-error-text--checkbox">
                                {fieldErrors.acceptCancellationPolicy}
                            </span>
                        )}
                    </div>

                    {/* Checkbox 3: Política de Privacidad */}
                    <div className="checkbox-block">
                        <label className="checkbox-row" htmlFor="checkbox-acceptPrivacy">
                            <input
                                id="checkbox-acceptPrivacy"
                                type="checkbox"
                                checked={customer.acceptPrivacy}
                                onChange={(e) => handleInputChange('acceptPrivacy', e.target.checked)}
                                disabled={isSubmitting}
                            />
                            <span className="checkbox-label">
                                Acepto la{' '}
                                <a href="/legal/privacidad" target="_blank" rel="noopener noreferrer" className="legal-link">
                                    Política de Privacidad
                                </a>{' '}
                                y el tratamiento seguro de mis datos personales para la emisión del contrato oficial conforme al RGPD. *
                            </span>
                        </label>
                        {fieldErrors.acceptPrivacy && (
                            <span className="field-error-text field-error-text--checkbox">
                                {fieldErrors.acceptPrivacy}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── 6. Botón de Pago Redsys TPV Virtual ── */}
                <div className="submit-section">
                    <button
                        type="submit"
                        className="btn-pay-redsys"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="spinner" />
                                <span>Conectando con Redsys CaixaBank...</span>
                            </>
                        ) : (
                            <>
                                <Lock size={16} />
                                <span>Pagar {formatPrice(totalPayable)} con Redsys (100% Seguro)</span>
                            </>
                        )}
                    </button>

                    <div className="payment-security-badges">
                        <div className="security-badge">
                            <ShieldCheck size={13} className="text-forest" />
                            <span>Cifrado SSL 256 bits</span>
                        </div>
                        <div className="security-badge">
                            <CreditCard size={13} className="text-forest" />
                            <span>Visa, Mastercard & Bizum</span>
                        </div>
                        <div className="security-badge">
                            <Building size={13} className="text-forest" />
                            <span>TPV CaixaBank Oficial</span>
                        </div>
                    </div>
                </div>
            </form>

            <style jsx>{`
                .step-checkout {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4, 16px);
                }

                .step-header {
                    margin-bottom: 2px;
                }

                .step-header__tag {
                    display: inline-block;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: var(--wz-pill-text);
                    background: var(--wz-pill-bg);
                    border: 1px solid var(--wz-pill-border);
                    padding: 2px 8px;
                    border-radius: var(--radius-sm);
                    margin-bottom: 4px;
                }

                .step-header__title {
                    font-family: var(--font-display);
                    font-size: var(--text-xl, 20px);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                    line-height: 1.2;
                }

                .alert-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 14px;
                    border-radius: var(--radius-md, 8px);
                    font-size: 13px;
                    font-weight: 500;
                }

                .alert-box--error {
                    background: rgba(239, 68, 68, 0.12);
                    border: 1px solid rgba(239, 68, 68, 0.35);
                    color: #ef4444;
                }

                :global(html[data-theme="light"]) .alert-box--error {
                    background: #FEE2E2;
                    border: 1px solid #FECACA;
                    color: #991B1B;
                }

                .checkout-form {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .form-group-card {
                    background: var(--wz-surface);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-xl, 16px);
                    padding: 16px 18px;
                    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
                }

                .form-group-card__header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 14px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--gray-100);
                }

                .form-group-card__title {
                    font-size: 13.5px;
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                    letter-spacing: -0.01em;
                }

                .section-intro-text {
                    font-size: 12.5px;
                    color: var(--gray-600);
                    line-height: 1.5;
                    margin: 0 0 12px 0;
                }

                /* Passengers Section */
                .passengers-section {
                    background: var(--wz-surface);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-xl, 16px);
                    padding: 16px 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
                }

                .passengers-section__header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--gray-100);
                }

                .passengers-section__title {
                    font-size: 13.5px;
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                    letter-spacing: -0.01em;
                }

                .passengers-section__desc {
                    font-size: 12px;
                    color: var(--gray-600);
                    line-height: 1.45;
                    margin: 0;
                }

                .passengers-cards-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .passenger-card {
                    background: var(--wz-chip-bg);
                    border: 1px solid var(--wz-chip-border);
                    border-radius: 12px;
                    padding: 14px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    transition: all 0.2s ease;
                }

                .passenger-card--second-driver {
                    border-color: var(--forest-green);
                    background: var(--wz-surface-soft);
                }

                .passenger-card__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    flex-wrap: wrap;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--gray-200);
                }

                .passenger-card__tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--black-matte);
                }

                .passenger-driver-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--wz-pill-text);
                    background: var(--wz-pill-bg);
                    padding: 3px 9px;
                    border-radius: 9999px;
                    border: 1px solid var(--wz-pill-border);
                }

                /* Second Driver Toggle Box */
                .second-driver-toggle-box {
                    background: var(--wz-surface-soft);
                    border: 1px solid var(--wz-pill-border);
                    border-radius: 10px;
                    padding: 10px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .driver-toggle-label {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    cursor: pointer;
                    user-select: none;
                    min-height: 40px;
                }

                .driver-toggle-checkbox {
                    margin-top: 3px;
                    width: 17px;
                    height: 17px;
                    accent-color: var(--forest-green);
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .driver-toggle-text {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .driver-toggle-title {
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--black-matte);
                    display: inline-flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .driver-toggle-sub {
                    font-size: 11px;
                    color: var(--gray-600);
                    line-height: 1.4;
                }

                .driver-toggle-price {
                    display: inline-block;
                    padding: 1px 7px;
                    border-radius: 999px;
                    font-size: 9.5px;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                    text-transform: uppercase;
                    white-space: nowrap;
                    background: rgba(46, 125, 93, 0.18);
                    color: #7fd6ac;
                }

                :global(html[data-theme="light"]) .driver-toggle-price {
                    background: #E7EFE5;
                    color: #2D5233;
                    border: 1px solid #CFE2D2;
                }

                .driver-toggle-price--charged {
                    background: var(--wz-pill-bg);
                    color: var(--wz-pill-text);
                    border: 1px solid var(--wz-pill-border);
                }

                .second-driver-license-block {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding-top: 10px;
                    border-top: 1px solid var(--gray-200);
                }

                .solo-second-driver-fields {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding-top: 10px;
                    border-top: 1px solid var(--gray-200);
                }

                .driver-verification-status {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .verification-pill {
                    font-size: 11px;
                    font-weight: 600;
                    padding: 3px 9px;
                    border-radius: 6px;
                }

                .verification-pill--success {
                    background: rgba(52, 211, 153, 0.12);
                    color: #34d399;
                    border: 1px solid rgba(52, 211, 153, 0.3);
                }

                :global(html[data-theme="light"]) .verification-pill--success {
                    background: #E7EFE5;
                    color: #2D5233;
                    border: 1px solid #CFE2D2;
                }

                .verification-pill--error {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                }

                :global(html[data-theme="light"]) .verification-pill--error {
                    background: #FEE2E2;
                    color: #991B1B;
                    border: 1px solid #FECACA;
                }

                /* Form Grid */
                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px 14px;
                }

                .form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .form-field--span-2 {
                    grid-column: span 2;
                }

                .field-label {
                    font-size: 11.5px;
                    font-weight: 600;
                    color: var(--black-matte);
                    letter-spacing: -0.01em;
                }

                .field-input {
                    height: 42px;
                    padding: 0 12px;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md, 8px);
                    font-size: 13.5px;
                    color: var(--black-matte);
                    background: var(--wz-chip-bg);
                    transition: all 0.2s ease;
                    outline: none;
                }

                .field-select {
                    cursor: pointer;
                }

                .field-input:focus {
                    border-color: var(--forest-green);
                    background: var(--wz-surface);
                    box-shadow: 0 0 0 3px var(--wz-pill-bg);
                }

                .field-input--error {
                    border-color: #ef4444;
                    background: rgba(239, 68, 68, 0.08);
                }

                .field-textarea {
                    padding: 10px 12px;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md, 8px);
                    font-size: 13.5px;
                    color: var(--black-matte);
                    background: var(--wz-chip-bg);
                    font-family: inherit;
                    resize: vertical;
                    outline: none;
                    min-height: 72px;
                    transition: all 0.2s ease;
                }

                .field-textarea:focus {
                    border-color: var(--forest-green);
                    background: var(--wz-surface);
                    box-shadow: 0 0 0 3px var(--wz-pill-bg);
                }

                /* Phone with Country Prefix */
                .phone-field-row {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .phone-number-input {
                    flex: 1;
                    width: 100%;
                }

                .phone-prefix-select {
                    height: 42px;
                    padding: 0 8px;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md, 8px);
                    background: var(--wz-chip-bg);
                    color: var(--black-matte);
                    font-size: 12.5px;
                    font-weight: 500;
                    outline: none;
                    cursor: pointer;
                    min-width: 105px;
                    transition: border-color 0.2s ease;
                }

                .phone-prefix-select:focus {
                    border-color: var(--forest-green);
                    box-shadow: 0 0 0 3px var(--wz-pill-bg);
                }


                .field-hint {
                    font-size: 11px;
                    color: var(--gray-500);
                    line-height: 1.35;
                }

                .field-success-hint {
                    font-size: 11px;
                    color: #34d399;
                    font-weight: 600;
                    line-height: 1.35;
                }

                :global(html[data-theme="light"]) .field-success-hint {
                    color: #2D5233;
                }

                .field-error-text {
                    font-size: 11px;
                    color: #ef4444;
                    font-weight: 600;
                    line-height: 1.35;
                }

                .field-error-text--checkbox {
                    margin-left: 28px;
                    display: block;
                }

                /* Legal Consent Card */
                .legal-consent-card {
                    background: var(--wz-surface);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg, 12px);
                    padding: 14px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
                }

                .legal-consent-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--gray-100);
                }

                .legal-consent-title {
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--black-matte);
                }

                .checkbox-block {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .checkbox-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    cursor: pointer;
                    min-height: 38px;
                    padding: 2px 0;
                    user-select: none;
                }

                .checkbox-row input[type='checkbox'] {
                    margin-top: 3px;
                    width: 16px;
                    height: 16px;
                    accent-color: var(--forest-green);
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .checkbox-label {
                    font-size: 12px;
                    color: var(--gray-600);
                    line-height: 1.45;
                }

                .legal-link {
                    color: var(--forest-green);
                    font-weight: 600;
                    text-decoration: underline;
                }

                .text-strong-gold {
                    color: var(--forest-green);
                    font-weight: 700;
                }

                /* Submit Section */
                .submit-section {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-top: 4px;
                }

                .btn-pay-redsys {
                    height: 50px;
                    min-height: 44px;
                    border: none;
                    background: var(--forest-green);
                    color: var(--wz-on-accent);
                    font-size: 15px;
                    font-weight: 700;
                    letter-spacing: 0.01em;
                    border-radius: var(--radius-lg, 12px);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    box-shadow: 0 4px 14px rgba(204, 160, 83, 0.22);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .btn-pay-redsys:hover:not(:disabled) {
                    background: var(--forest-green-light);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(204, 160, 83, 0.3);
                }

                .btn-pay-redsys:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .spinner {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .payment-security-badges {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 12px 16px;
                    padding: 4px 0;
                }

                .security-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 11px;
                    color: var(--gray-600);
                    font-weight: 500;
                }

                :global(.text-forest) {
                    color: var(--forest-green);
                }

                /* Responsive Rules per AGENTS.md */
                @media (max-width: 640px) {
                    .form-grid {
                        grid-template-columns: 1fr;
                        gap: 10px;
                    }
                    .form-field--span-2 {
                        grid-column: span 1;
                    }
                    .phone-field-row {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .phone-prefix-select {
                        width: 100%;
                    }
                    .payment-security-badges {
                        flex-direction: column;
                        align-items: center;
                        gap: 6px;
                    }
                    .form-group-card,
                    .passengers-section,
                    .legal-consent-card {
                        padding: 14px 14px;
                    }
                }
            `}</style>
        </div>
    )
}
