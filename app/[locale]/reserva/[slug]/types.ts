/**
 * UTOPIA VAN LIFE — Tipos y Esquemas del Wizard Multi-Paso (Holo-Van Style)
 * Ruta: app/[locale]/reserva/[slug]/types.ts
 */

import { DaySlot, KmPackage, CancellationPolicy } from '@/lib/pricing/types'
import { BlockedSlot } from '@/lib/booking/availability'
import { validateBookingRange } from '@/lib/booking/calendarLogic'

export type WizardStep = 1 | 2 | 3 | 4 | 5

export type { DaySlot, KmPackage, CancellationPolicy }

export interface WizardCamper {
    id: string
    slug: string
    name: string
    description_es?: string
    specs?: {
        beds?: number
        seats?: number
        length_m?: number
        width_m?: number
        height_m?: number
        engine?: string
        transmission?: string
    }
    price_per_night?: number
    price_per_day?: number
    base_price_per_night?: number
    deposit_amount?: number
    images?: string[]
}

export interface WizardExtraItem {
    id: string
    name_es: string
    name_en?: string
    name?: string
    price: number
    price_type: 'per_rental' | 'per_day'
    category: 'Equipamiento' | 'Deporte' | 'Confort' | string
    description?: string
    icon?: string
    quantity?: number
}

export interface SelectedWizardExtra {
    id: string
    name_es: string
    price: number
    price_type: 'per_rental' | 'per_day'
    quantity: number
    category?: string
}

export interface Step1Data {
    startDate: string // YYYY-MM-DD
    startSlot: DaySlot
    endDate: string   // YYYY-MM-DD
    endSlot: DaySlot
    pax: number
}

export interface Step2Data {
    kmPackage: KmPackage
}

export interface Step3Data {
    cancellationPolicy: CancellationPolicy
}

export interface Step4Data {
    selectedExtras: SelectedWizardExtra[]
}

export interface Step5Customer {
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
    acceptTerms: boolean
    acceptPrivacy: boolean
}

export interface BookingWizardState {
    currentStep: WizardStep
    step1: Step1Data
    step2: Step2Data
    step3: Step3Data
    step4: Step4Data
    step5: Step5Customer
}

// ==========================================
// VALIDATION UTILITIES (Matches R4 Test Suite)
// ==========================================

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
    referenceTodayStr?: string
): { isValid: boolean; error?: string } {
    if (!data.startDate || !data.endDate) {
        return { isValid: false, error: 'Debes seleccionar fecha de inicio y fin' }
    }

    const todayStr = referenceTodayStr || new Date().toISOString().split('T')[0]
    if (data.startDate < todayStr) {
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
    if (!Array.isArray(data.selectedExtras)) {
        return { isValid: false, error: 'Formato de extras no válido' }
    }
    for (const extra of data.selectedExtras) {
        if (typeof extra.quantity !== 'number' || extra.quantity < 0 || !Number.isInteger(extra.quantity)) {
            return { isValid: false, error: `Cantidad no válida para el extra ${extra.name_es || extra.id}` }
        }
    }
    return { isValid: true }
}

export function validateStep5(
    data: Step5Customer,
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

    if (!data.acceptTerms) {
        errors.acceptTerms = 'Debes aceptar los Términos y Condiciones Generales'
    }

    if (!data.acceptPrivacy) {
        errors.acceptPrivacy = 'Debes aceptar la Política de Privacidad'
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    }
}
