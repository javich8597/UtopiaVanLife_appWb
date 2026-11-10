import {
    formatPhoneWithPrefix,
    isValidLicenseIdText,
    isValidPersonName,
    isValidPhoneText,
    isValidTypedAddress,
    joinAddressParts,
    MAX_ADDRESS_LENGTH,
    MAX_PHONE_LENGTH,
    normalizeDriverText,
} from '../../../../lib/driverDocuments'
/**
 * UTOPIA VAN LIFE — Tipos y Esquemas del Wizard Multi-Paso (Holo-Van Style)
 * Ruta: app/[locale]/reserva/[slug]/types.ts
 */

import { DaySlot, KmPackage, CancellationPolicy, DepositOption } from '@/lib/pricing/types'
import { BlockedSlot } from '@/lib/booking/availability'
import { validateBookingRange } from '@/lib/booking/calendarLogic'
import { isValidEmail, MAX_BOOKING_NIGHTS, normalizeEmail } from '@/lib/booking/checkoutRules'

export type WizardStep = 1 | 2 | 3 | 4 | 5

export type { DaySlot, KmPackage, CancellationPolicy, DepositOption }

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
    depositOption?: DepositOption // 'standard_2000' | 'flex_1000'
}

export interface Step4Data {
    selectedExtras: SelectedWizardExtra[]
}

export interface BookingPassenger {
    fullName: string
    dniNie: string
    birthDate?: string // YYYY-MM-DD (con cálculo reactivo de edad)
    isSecondDriver?: boolean
    licenseDate?: string // YYYY-MM-DD (requerido si isSecondDriver)
    /**
     * Número del permiso de conducir, obligatorio si `isSecondDriver` (decisión de Javier,
     * 2026-11-09). Los tres datos de esa persona (nombre, documento y nº de carnet) salen de la
     * ficha de la reserva: si el asistente no lo pide, el contrato imprime siempre «Pendiente».
     */
    driverLicenseId?: string
}

export interface Step5Customer {
    fullName: string
    dniNie: string
    birthDate?: string // YYYY-MM-DD (validación >= 25 años)
    licenseDate?: string // YYYY-MM-DD (validación >= 2 años antigüedad carnet B)
    email: string
    phone: string
    phoneCountryCode?: string // ej. "+34", "+33", "+49"
    depositOption?: DepositOption // 'standard_2000' | 'flex_1000'
    address: string
    city: string
    postalCode: string
    country: string
    travelersCount: number
    passengers?: BookingPassenger[]
    secondDriverSoloEnabled?: boolean
    secondDriverSolo?: BookingPassenger
    specialNotes?: string
    acceptTerms: boolean // Términos y Condiciones Generales
    acceptCancellationPolicy?: boolean // Política de Cancelación (100% >30d, 50% 15-29d, 0% <=14d)
    acceptPrivacy: boolean // Política de Privacidad RGPD
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
    // La misma regla que el checkout (normalizeEmail + isValidEmail): lo que pasa aquí pasa al pagar
    if (!isValidEmail(normalizeEmail(email))) {
        return { isValid: false, error: "Formato de correo electrónico no válido. Usa solo letras, números y los signos . _ + ' - antes de la @" }
    }
    return { isValid: true }
}

export function validateDriverAge(birthDate: string): { isValid: boolean; error?: string; age?: number } {
    if (!birthDate || typeof birthDate !== 'string') {
        return { isValid: false, error: 'Fecha de nacimiento obligatoria' }
    }
    const dob = new Date(birthDate)
    if (isNaN(dob.getTime())) {
        return { isValid: false, error: 'Fecha de nacimiento no válida' }
    }
    const today = new Date()
    if (dob > today) {
        return { isValid: false, error: 'La fecha de nacimiento no puede ser en el futuro' }
    }
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--
    }
    if (age < 25) {
        return {
            isValid: false,
            age,
            error: `La edad del conductor es de ${age} años. La edad mínima requerida por la póliza de seguro es de 25 años.`,
        }
    }
    return { isValid: true, age }
}

export function validateDrivingLicense(licenseDate: string): { isValid: boolean; error?: string; years?: number } {
    if (!licenseDate || typeof licenseDate !== 'string') {
        return { isValid: false, error: 'Fecha de expedición del permiso de conducir B obligatoria' }
    }
    const exp = new Date(licenseDate)
    if (isNaN(exp.getTime())) {
        return { isValid: false, error: 'Fecha de expedición no válida' }
    }
    const today = new Date()
    if (exp > today) {
        return { isValid: false, error: 'La fecha de expedición no puede ser en el futuro' }
    }
    let years = today.getFullYear() - exp.getFullYear()
    const m = today.getMonth() - exp.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < exp.getDate())) {
        years--
    }
    if (years < 2) {
        return {
            isValid: false,
            years,
            error: `La antigüedad del carnet B es de ${years} ${years === 1 ? 'año' : 'años'}. Se requiere un mínimo de 2 años de experiencia.`,
        }
    }
    return { isValid: true, years }
}

/**
 * Valida el teléfono tal como se guardará: normalizado y con el prefijo del país delante si no lo
 * trae (formatPhoneWithPrefix, lo mismo que envía el paso 5). Así lo que pasa aquí pasa en la subida.
 */
export function validatePhone(phone: string, countryCode?: string): { isValid: boolean; error?: string } {
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
        return { isValid: false, error: 'Teléfono de contacto obligatorio con prefijo de país' }
    }
    if (!isValidPhoneText(phone)) {
        return { isValid: false, error: 'El teléfono solo puede contener números, espacios y los signos + ( ) . / -' }
    }
    const stored = formatPhoneWithPrefix(phone, countryCode)
    if (stored.length > MAX_PHONE_LENGTH) {
        return { isValid: false, error: `El teléfono, con el prefijo de país, no puede superar ${MAX_PHONE_LENGTH} caracteres. Quita espacios o signos` }
    }
    if (!isValidPhoneText(stored)) {
        return { isValid: false, error: 'Revisa el prefijo de país del teléfono' }
    }
    const digitsOnly = stored.replace(/\D/g, '')
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
        return { isValid: false, error: 'El teléfono, con el prefijo de país, debe tener entre 8 y 15 dígitos' }
    }
    return { isValid: true }
}

/** Dirección completa tal como la guarda el checkout: calle, ciudad, código postal y país */
export function validateFullAddress(parts: Array<string | undefined>): { isValid: boolean; error?: string } {
    const full = joinAddressParts(parts)
    const normalized = normalizeDriverText(full)
    if (normalized === null || normalized.length > MAX_ADDRESS_LENGTH) {
        return {
            isValid: false,
            error: `La dirección completa (dirección, ciudad, código postal y país) no puede superar ${MAX_ADDRESS_LENGTH} caracteres: ahora tiene ${normalized?.length ?? full.length}. Acórtala`,
        }
    }
    if (!isValidTypedAddress(full)) {
        return { isValid: false, error: 'La dirección contiene caracteres no válidos (de control o de dirección del texto). Escríbela de nuevo sin pegarla' }
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
        if (rangeResult.reason === 'max_nights') {
            return { isValid: false, error: `La reserva no puede superar las ${MAX_BOOKING_NIGHTS} noches` }
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
    if (data.depositOption !== undefined && data.depositOption !== 'standard_2000' && data.depositOption !== 'flex_1000') {
        return { isValid: false, error: 'Selección de modalidad de fianza no válida' }
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

/**
 * Fichas de 2º conductor que el asistente está mostrando: las de los acompañantes visibles más la
 * del bloque "solo" (1 viajero). Es la misma cuenta que envía el paso 5 y que recalcula el servidor.
 * La fianza no entra: el 2º conductor vale con las dos (Flex lo incluye, Estándar lo cobra).
 */
export function countStep5SecondDrivers(
    data: Pick<Step5Customer, 'travelersCount' | 'passengers' | 'secondDriverSoloEnabled'>,
    effectiveTravelersCount?: number
): number {
    // El mismo valor efectivo que usa Step5Checkout (`customer.travelersCount || step1.pax || 1`):
    // un borrador antiguo sin travelersCount descuadraba el resumen frente a lo que se cobra
    const travelers = effectiveTravelersCount || data.travelersCount || 1
    const visible = (data.passengers || []).slice(0, Math.max(0, travelers - 1))
    const marked = visible.filter(p => p.isSecondDriver).length
    return marked + (travelers === 1 && data.secondDriverSoloEnabled ? 1 : 0)
}

/** ¿El asistente lleva un 2º conductor? Es lo que decide si el desglose cobra su suplemento */
export function step5HasSecondDriver(
    data: Pick<Step5Customer, 'travelersCount' | 'passengers' | 'secondDriverSoloEnabled'>,
    effectiveTravelersCount?: number
): boolean {
    return countStep5SecondDrivers(data, effectiveTravelersCount) > 0
}

/**
 * Borrador del paso 5 recuperado de sessionStorage, normalizado: los borradores anteriores a
 * `travelersCount` llegan sin ese campo y el resumen contaba un 2º conductor distinto del que se
 * cobra. El número de viajeros del paso 1 es el que manda.
 */
export function normalizeStep5Draft<T extends Partial<Step5Customer>>(
    draft: T,
    paxFromStep1: number
): T & { travelersCount: number } {
    const travelers = Number(draft?.travelersCount) || Number(paxFromStep1) || 1
    return { ...draft, travelersCount: Math.max(1, Math.floor(travelers)) }
}

/**
 * Número de permiso de conducir del 2º conductor: obligatorio desde el paso 5 (decisión de Javier,
 * 2026-11-09) y con la misma regla que la subida de documentación (`isValidLicenseIdText`).
 *
 * Los tres datos de esa persona (nombre, documento y nº de carnet) salen de la ficha de la reserva:
 * si el asistente no lo pide, ninguna ficha lo trae y el contrato imprime siempre «Pendiente».
 */
export function validateSecondDriverLicenseId(value: string | undefined | null): { isValid: boolean; error?: string } {
    const sent = typeof value === 'string' ? value.trim() : ''
    if (!sent) {
        return { isValid: false, error: 'Número del permiso de conducir obligatorio: es el que se autoriza en el contrato' }
    }
    if (!isValidLicenseIdText(sent)) {
        return { isValid: false, error: 'El número del permiso de conducir solo puede tener letras, números y los signos . / - (entre 3 y 30 caracteres)' }
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
    } else if (!isValidPersonName(data.fullName)) {
        errors.fullName = "El nombre solo puede contener letras, espacios y los signos . , · ' -"
    }

    const dniCheck = validateDniNieOrPassport(data.dniNie)
    if (!dniCheck.isValid) {
        errors.dniNie = dniCheck.error!
    }

    // Obligatorias, igual que en el servidor
    const ageCheck = validateDriverAge(data.birthDate ?? '')
    if (!ageCheck.isValid) {
        errors.birthDate = ageCheck.error!
    }

    const licenseCheck = validateDrivingLicense(data.licenseDate ?? '')
    if (!licenseCheck.isValid) {
        errors.licenseDate = licenseCheck.error!
    }

    const emailCheck = validateEmail(data.email)
    if (!emailCheck.isValid) {
        errors.email = emailCheck.error!
    }

    const phoneCheck = validatePhone(data.phone, data.phoneCountryCode)
    if (!phoneCheck.isValid) {
        errors.phone = phoneCheck.error!
    }

    if (data.depositOption !== undefined && data.depositOption !== 'standard_2000' && data.depositOption !== 'flex_1000') {
        errors.depositOption = 'Selecciona una modalidad de fianza válida (Estándar 2.000 € o Flex 1.000 €)'
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

    if (!errors.address) {
        const fullAddress = validateFullAddress([data.address, data.city, data.postalCode, data.country])
        if (!fullAddress.isValid) errors.address = fullAddress.error!
    }

    if (
        typeof data.travelersCount !== 'number' ||
        data.travelersCount < 1 ||
        data.travelersCount > maxCamperBerths
    ) {
        errors.travelersCount = `El número de viajeros debe estar entre 1 y ${maxCamperBerths}`
    }

    // Validar acompañantes adicionales si existen
    if (data.passengers && Array.isArray(data.passengers)) {
        data.passengers.forEach((passenger, idx) => {
            const pNum = idx + 2
            if (passenger.fullName !== undefined) {
                if (!passenger.fullName || passenger.fullName.trim().length < 3) {
                    errors[`passenger_${pNum}_fullName`] = `Nombre y apellidos completos requeridos para Pasajero ${pNum}`
                } else if (!isValidPersonName(passenger.fullName)) {
                    errors[`passenger_${pNum}_fullName`] = `El nombre del Pasajero ${pNum} solo puede contener letras, espacios y los signos . , · ' -`
                }
            }
            if (passenger.dniNie !== undefined) {
                const pDniCheck = validateDniNieOrPassport(passenger.dniNie)
                if (!pDniCheck.isValid) {
                    errors[`passenger_${pNum}_dniNie`] = `DNI/Pasaporte de Pasajero ${pNum}: ${pDniCheck.error}`
                }
            }
            if (passenger.birthDate !== undefined && passenger.birthDate !== '') {
                const dob = new Date(passenger.birthDate)
                if (isNaN(dob.getTime()) || dob > new Date()) {
                    errors[`passenger_${pNum}_birthDate`] = `Fecha de nacimiento no válida para Pasajero ${pNum}`
                }
            }

            // Marcado como 2º conductor: se valida con cualquier fianza (con Flex va incluido,
            // con Estándar cuesta SECOND_DRIVER_RATE_PER_DAY). Sus fechas son obligatorias
            if (passenger.isSecondDriver) {
                if (!passenger.birthDate) {
                    errors[`passenger_${pNum}_birthDate`] = `Fecha de nacimiento requerida para 2º conductor (Pasajero ${pNum})`
                } else {
                    const ageCheck = validateDriverAge(passenger.birthDate)
                    if (!ageCheck.isValid) {
                        errors[`passenger_${pNum}_birthDate`] = `2º Conductor (Pasajero ${pNum}): ${ageCheck.error}`
                    }
                }
                if (!passenger.licenseDate) {
                    errors[`passenger_${pNum}_licenseDate`] = `Fecha de expedición carnet B requerida para 2º conductor (Pasajero ${pNum})`
                } else {
                    const licCheck = validateDrivingLicense(passenger.licenseDate)
                    if (!licCheck.isValid) {
                        errors[`passenger_${pNum}_licenseDate`] = `2º Conductor (Pasajero ${pNum}): ${licCheck.error}`
                    }
                }
                // Nº de carnet: tan obligatorio como las fechas, y es lo que imprime el contrato
                const licIdCheck = validateSecondDriverLicenseId(passenger.driverLicenseId)
                if (!licIdCheck.isValid) {
                    errors[`passenger_${pNum}_driverLicenseId`] = `2º Conductor (Pasajero ${pNum}): ${licIdCheck.error}`
                }
            }
        })
    }

    // Como máximo un 2º conductor por reserva, sea cual sea la fianza
    if (countStep5SecondDrivers(data) > 1) {
        errors.secondDriver = 'Solo un acompañante puede ser 2º conductor: desmarca los demás'
    }

    // Validar el 2º conductor opcional cuando viaja 1 sola persona (con cualquier fianza)
    if (data.travelersCount === 1 && data.secondDriverSoloEnabled) {
        const sec = data.secondDriverSolo || { fullName: '', dniNie: '', birthDate: '', licenseDate: '' }
        if (!sec.fullName || sec.fullName.trim().length < 3) {
            errors.secondDriverSolo_fullName = 'Nombre y apellidos completos requeridos para el 2º conductor'
        } else if (!isValidPersonName(sec.fullName)) {
            errors.secondDriverSolo_fullName = "El nombre del 2º conductor solo puede contener letras, espacios y los signos . , · ' -"
        }
        const sDniCheck = validateDniNieOrPassport(sec.dniNie)
        if (!sDniCheck.isValid) {
            errors.secondDriverSolo_dniNie = `DNI/Pasaporte del 2º conductor: ${sDniCheck.error}`
        }
        if (!sec.birthDate) {
            errors.secondDriverSolo_birthDate = 'Fecha de nacimiento requerida para el 2º conductor'
        } else {
            const ageCheck = validateDriverAge(sec.birthDate)
            if (!ageCheck.isValid) {
                errors.secondDriverSolo_birthDate = `2º Conductor: ${ageCheck.error}`
            }
        }
        if (!sec.licenseDate) {
            errors.secondDriverSolo_licenseDate = 'Fecha de expedición carnet B requerida para el 2º conductor'
        } else {
            const licCheck = validateDrivingLicense(sec.licenseDate)
            if (!licCheck.isValid) {
                errors.secondDriverSolo_licenseDate = `2º Conductor: ${licCheck.error}`
            }
        }
        // Nº de carnet: tan obligatorio como las fechas, y es lo que imprime el contrato
        const soloLicIdCheck = validateSecondDriverLicenseId(sec.driverLicenseId)
        if (!soloLicIdCheck.isValid) {
            errors.secondDriverSolo_driverLicenseId = `2º Conductor: ${soloLicIdCheck.error}`
        }
    }

    if (!data.acceptTerms) {
        errors.acceptTerms = 'Debes aceptar los Términos y Condiciones Generales de Alquiler'
    }

    if (data.acceptCancellationPolicy !== undefined && !data.acceptCancellationPolicy) {
        errors.acceptCancellationPolicy = 'Debes aceptar la Política de Cancelación (100% >30 días, 50% 15-29 días, 0% <=14 días)'
    }

    if (!data.acceptPrivacy) {
        errors.acceptPrivacy = 'Debes aceptar la Política de Privacidad (RGPD)'
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    }
}
