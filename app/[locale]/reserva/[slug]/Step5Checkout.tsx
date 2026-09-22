'use client'

import React, { useState } from 'react'
import {
    Lock,
    ShieldCheck,
    CreditCard,
    AlertCircle,
    Loader2,
    CheckCircle2,
    Building,
    Mail,
    Phone,
    User,
    FileText,
    MapPin,
    Globe,
    Sparkles,
} from 'lucide-react'
import { Step5Customer, WizardCamper, Step1Data, Step2Data, Step3Data, Step4Data } from './types'
import { validateStep5 } from './types'
import { formatPrice } from '@/lib/pricing/engine'

interface Step5CheckoutProps {
    camper: WizardCamper
    step1: Step1Data
    step2: Step2Data
    step3: Step3Data
    step4: Step4Data
    customer: Step5Customer
    onChange: (customer: Step5Customer) => void
    totalPayable: number
    onSuccessfulSubmit?: () => void
}

export default function Step5Checkout({
    camper,
    step1,
    step2,
    step3,
    step4,
    customer,
    onChange,
    totalPayable,
    onSuccessfulSubmit,
}: Step5CheckoutProps) {
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const maxPax = camper.specs?.seats || (camper.slug === 'space' ? 2 : 3)

    const handleInputChange = (field: keyof Step5Customer, value: any) => {
        const next = { ...customer, [field]: value }
        onChange(next)
        if (fieldErrors[field]) {
            setFieldErrors((prev) => {
                const updated = { ...prev }
                delete updated[field]
                return updated
            })
        }
    }

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitError(null)

        // Validar todos los campos del paso 5
        const validation = validateStep5(customer, maxPax)
        if (!validation.isValid) {
            setFieldErrors(validation.errors)
            const firstErrorKey = Object.keys(validation.errors)[0]
            const el = document.getElementById(`input-${firstErrorKey}`)
            if (el) el.focus()
            return
        }

        setIsSubmitting(true)

        try {
            // Payload para /api/bookings/checkout
            const payload = {
                camperSlug: camper.slug,
                startDate: step1.startDate,
                startSlot: step1.startSlot,
                endDate: step1.endDate,
                endSlot: step1.endSlot,
                pickupSlot: step1.startSlot,
                dropoffSlot: step1.endSlot,
                kmPackage: step2.kmPackage,
                cancellationPolicy: step3.cancellationPolicy,
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
                    phone: customer.phone.trim(),
                    dniNie: customer.dniNie.trim().toUpperCase(),
                    address: customer.address.trim(),
                    city: customer.city.trim(),
                    postalCode: customer.postalCode.trim(),
                    country: customer.country.trim(),
                    travelersCount: customer.travelersCount || step1.pax,
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

            // Extraer parámetros oficiales de Redsys
            const redsysUrl = data.formData?.url || data.redsys?.url
            const version = data.formData?.signatureVersion || data.redsys?.version
            const merchantParams = data.formData?.merchantParameters || data.redsys?.params
            const signature = data.formData?.signature || data.redsys?.signature

            if (!redsysUrl || !merchantParams || !signature) {
                throw new Error('Respuesta inválida de la pasarela de pago Redsys')
            }

            // Crear y auto-enviar formulario oculto a Redsys TPV Virtual
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
            <div className="step-header">
                <span className="step-header__tag">PASO 5 DE 5</span>
                <h2 className="step-header__title">Datos del conductor y confirmación de pago</h2>
                <p className="step-header__desc">
                    Introduce tus datos para formalizar el contrato oficial y la póliza de seguro. Serás redirigido a la pasarela bancaria oficial de Redsys para abonar el 100% del viaje de forma segura.
                </p>
            </div>

            {submitError && (
                <div className="alert-box alert-box--error">
                    <AlertCircle size={18} />
                    <span>{submitError}</span>
                </div>
            )}

            <form onSubmit={handleSubmitPayment} className="checkout-form" noValidate>
                {/* Personal Information Group */}
                <div className="form-group-card">
                    <div className="form-group-card__header">
                        <User size={18} className="text-forest" />
                        <h4 className="form-group-card__title">Datos del conductor principal</h4>
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
                                <span className="field-hint">DNI español con letra o pasaporte internacional</span>
                            )}
                        </div>

                        {/* Number of Travelers */}
                        <div className="form-field">
                            <label htmlFor="input-travelersCount" className="field-label">
                                Número de viajeros *
                            </label>
                            <select
                                id="input-travelersCount"
                                className={`field-input ${fieldErrors.travelersCount ? 'field-input--error' : ''}`}
                                value={customer.travelersCount}
                                onChange={(e) => handleInputChange('travelersCount', Number(e.target.value))}
                                disabled={isSubmitting}
                            >
                                {Array.from({ length: maxPax }, (_, i) => i + 1).map((num) => (
                                    <option key={num} value={num}>
                                        {num} {num === 1 ? 'persona' : 'personas'}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.travelersCount && (
                                <span className="field-error-text">{fieldErrors.travelersCount}</span>
                            )}
                        </div>

                        {/* Email */}
                        <div className="form-field">
                            <label htmlFor="input-email" className="field-label">
                                Correo Electrónico *
                            </label>
                            <div className="input-with-icon">
                                <Mail size={16} className="input-icon" />
                                <input
                                    id="input-email"
                                    type="email"
                                    className={`field-input field-input--has-icon ${fieldErrors.email ? 'field-input--error' : ''}`}
                                    placeholder="tunombre@email.com"
                                    value={customer.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>
                            {fieldErrors.email ? (
                                <span className="field-error-text">{fieldErrors.email}</span>
                            ) : (
                                <span className="field-hint">Recibirás aquí la confirmación y acceso a tu panel</span>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="form-field">
                            <label htmlFor="input-phone" className="field-label">
                                Teléfono Móvil *
                            </label>
                            <div className="input-with-icon">
                                <Phone size={16} className="input-icon" />
                                <input
                                    id="input-phone"
                                    type="tel"
                                    className={`field-input field-input--has-icon ${fieldErrors.phone ? 'field-input--error' : ''}`}
                                    placeholder="+34 600 000 000"
                                    value={customer.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>
                            {fieldErrors.phone && (
                                <span className="field-error-text">{fieldErrors.phone}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Billing Address Group */}
                <div className="form-group-card">
                    <div className="form-group-card__header">
                        <MapPin size={18} className="text-forest" />
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

                {/* Special Requests */}
                <div className="form-group-card">
                    <div className="form-group-card__header">
                        <Sparkles size={18} className="text-forest" />
                        <h4 className="form-group-card__title">Notas especiales o detalles del viaje</h4>
                    </div>

                    <div className="form-field">
                        <textarea
                            id="input-specialNotes"
                            className="field-textarea"
                            rows={3}
                            placeholder="Ej. Llegamos en vuelo a las 09:30h, necesitamos una sillita infantil o tenemos consultas sobre spots de pernocta..."
                            value={customer.specialNotes || ''}
                            onChange={(e) => handleInputChange('specialNotes', e.target.value)}
                            disabled={isSubmitting}
                        />
                        <span className="field-hint">Opcional. Te responderemos personalmente tras formalizar la reserva.</span>
                    </div>
                </div>

                {/* Legal & Terms Checkboxes */}
                <div className="legal-consent-card">
                    <label className="checkbox-row">
                        <input
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
                            de Utopia Van Life y las condiciones de la póliza de seguro. *
                        </span>
                    </label>
                    {fieldErrors.acceptTerms && (
                        <span className="field-error-text" style={{ marginLeft: 28 }}>
                            {fieldErrors.acceptTerms}
                        </span>
                    )}

                    <label className="checkbox-row">
                        <input
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
                            y el tratamiento seguro de mis datos personales para la gestión de la reserva. *
                        </span>
                    </label>
                    {fieldErrors.acceptPrivacy && (
                        <span className="field-error-text" style={{ marginLeft: 28 }}>
                            {fieldErrors.acceptPrivacy}
                        </span>
                    )}
                </div>

                {/* Big Payment Submit Button */}
                <div className="submit-section">
                    <button
                        type="submit"
                        className="btn-pay-redsys"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={20} className="spinner" />
                                <span>Conectando con Redsys CaixaBank...</span>
                            </>
                        ) : (
                            <>
                                <Lock size={18} />
                                <span>Pagar {formatPrice(totalPayable)} con Redsys (100% Seguro)</span>
                            </>
                        )}
                    </button>

                    <div className="payment-security-badges">
                        <div className="security-badge">
                            <ShieldCheck size={14} className="text-forest" />
                            <span>Cifrado SSL 256 bits</span>
                        </div>
                        <div className="security-badge">
                            <CreditCard size={14} className="text-forest" />
                            <span>Tarjetas Visa, Mastercard & Bizum</span>
                        </div>
                        <div className="security-badge">
                            <Building size={14} className="text-forest" />
                            <span>TPV Virtual CaixaBank Oficial</span>
                        </div>
                    </div>
                </div>
            </form>

            <style jsx>{`
                .step-checkout {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-6);
                }

                .step-header {
                    margin-bottom: var(--space-2);
                }

                .step-header__tag {
                    display: inline-block;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: var(--forest-green);
                    background: rgba(45, 58, 45, 0.08);
                    padding: 3px 8px;
                    border-radius: var(--radius-sm);
                    margin-bottom: var(--space-2);
                }

                .step-header__title {
                    font-family: var(--font-display);
                    font-size: var(--text-2xl);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin-bottom: var(--space-2);
                    line-height: 1.25;
                }

                .step-header__desc {
                    font-size: var(--text-sm);
                    color: var(--gray-600);
                    line-height: 1.6;
                }

                .alert-box {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: var(--space-3) var(--space-4);
                    border-radius: var(--radius-md);
                    font-size: var(--text-sm);
                    font-weight: 500;
                }

                .alert-box--error {
                    background: #fde8e8;
                    border: 1px solid #f8b4b4;
                    color: var(--error);
                }

                .checkout-form {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-5);
                }

                .form-group-card {
                    background: #ffffff;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-xl);
                    padding: var(--space-5);
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
                }

                .form-group-card__header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: var(--space-4);
                    padding-bottom: var(--space-3);
                    border-bottom: 1px solid var(--gray-100);
                }

                .form-group-card__title {
                    font-size: var(--text-sm);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4);
                }

                .form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .form-field--span-2 {
                    grid-column: span 2;
                }

                .field-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--black-matte);
                }

                .field-input {
                    height: 44px;
                    padding: 0 var(--space-3);
                    border: 1.5px solid var(--gray-200);
                    border-radius: var(--radius-md);
                    font-size: var(--text-sm);
                    color: var(--black-matte);
                    background: #faf8f5;
                    transition: all 0.2s ease;
                    outline: none;
                }

                .field-input:focus {
                    border-color: var(--forest-green);
                    background: #ffffff;
                    box-shadow: 0 0 0 3px rgba(45, 58, 45, 0.12);
                }

                .field-input--error {
                    border-color: var(--error);
                    background: #fff8f8;
                }

                .field-textarea {
                    padding: var(--space-3);
                    border: 1.5px solid var(--gray-200);
                    border-radius: var(--radius-md);
                    font-size: var(--text-sm);
                    color: var(--black-matte);
                    background: #faf8f5;
                    font-family: inherit;
                    resize: vertical;
                    outline: none;
                }

                .field-textarea:focus {
                    border-color: var(--forest-green);
                    background: #ffffff;
                    box-shadow: 0 0 0 3px rgba(45, 58, 45, 0.12);
                }

                .input-with-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    left: 12px;
                    color: var(--gray-400);
                    pointer-events: none;
                }

                .field-input--has-icon {
                    padding-left: 38px;
                    width: 100%;
                }

                .field-hint {
                    font-size: 11px;
                    color: var(--gray-500);
                }

                .field-error-text {
                    font-size: 11px;
                    color: var(--error);
                    font-weight: 600;
                }

                /* Legal Consent Card */
                .legal-consent-card {
                    background: #ffffff;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    padding: var(--space-4) var(--space-5);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .checkbox-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    cursor: pointer;
                }

                .checkbox-row input[type='checkbox'] {
                    margin-top: 3px;
                    width: 16px;
                    height: 16px;
                    accent-color: var(--forest-green);
                    cursor: pointer;
                }

                .checkbox-label {
                    font-size: 12px;
                    color: var(--gray-600);
                    line-height: 1.5;
                }

                .legal-link {
                    color: var(--forest-green);
                    font-weight: 600;
                    text-decoration: underline;
                }

                /* Submit Section */
                .submit-section {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .btn-pay-redsys {
                    height: 54px;
                    border: none;
                    background: var(--forest-green);
                    color: #ffffff;
                    font-size: var(--text-base);
                    font-weight: 700;
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    box-shadow: 0 4px 14px rgba(45, 58, 45, 0.25);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .btn-pay-redsys:hover:not(:disabled) {
                    background: var(--forest-green-light);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(45, 58, 45, 0.3);
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
                    gap: var(--space-4);
                    padding: var(--space-2) 0;
                }

                .security-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: var(--gray-600);
                    font-weight: 500;
                }

                @media (max-width: 768px) {
                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                    .form-field--span-2 {
                        grid-column: span 1;
                    }
                }
            `}</style>
        </div>
    )
}
