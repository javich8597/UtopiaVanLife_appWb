import crypto from "crypto";
import { createCheckoutAccessCookie, createCheckoutNoAccessCookie } from '@/lib/checkoutAccess'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { calculatePriceV2 } from '@/lib/pricing/engine'
import { CategorizedExtra, KmPackage, CancellationPolicy, DepositOption } from '@/lib/pricing/types'
import { generateRedsysOrderId, createRedsysPaymentForm, getRedsysConfig, isRedsysLocale } from '@/lib/redsys'
import {
    calculateAge,
    calculateLicenseSeniorityYears,
    camperSeats,
    countSecondDrivers,
    isAlreadyAmong,
    isSecondDriverFlag,
    MAX_CAMPER_SEATS,
    MAX_SECOND_DRIVERS,
    isValidDateString,
    isValidDniNieOrPassport,
    isValidEmail,
    normalizeEmail,
    personDocument,
    resolveBookingSlots,
    sanitizeCustomerNotes,
    validateBookingDates,
} from '@/lib/booking/checkoutRules'
import { hasTooManyOpenBookings, isSessionOf, resolveCheckoutCustomer, retireAccount } from '@/lib/booking/checkoutCustomer'
import { isBookingRangeFree } from '@/lib/booking/calendarLogic'
import { clientIp, registerCheckoutAttempt } from '@/lib/booking/checkoutRateLimit'
import {
    isValidDocumentIdText,
    isValidLicenseIdText,
    isValidPersonName,
    isValidPhoneText,
    isValidTypedAddress,
    joinAddressParts,
    MAX_ADDRESS_LENGTH,
    normalizeDriverText,
} from '@/lib/driverDocuments'

// La regla del documento vive en `lib/booking/checkoutRules.ts` para que el backoffice no tenga que
// copiarla: importar una ruta de Next desde el panel arrastra la ruta entera. Se reexporta porque
// los tests y el resto del flujo la importan desde aquí
export { calculateAge, calculateLicenseSeniorityYears, isValidDniNieOrPassport }

export interface BookingPassenger {
    fullName: string
    dniNie: string
    isSecondDriver: boolean
    birthDate?: string | null
    licenseDate?: string | null
    /**
     * Número del permiso de conducir del 2º conductor, obligatorio como sus dos fechas (decisión de
     * Javier, 2026-11-09). Es el único sitio de donde puede salir: el contrato lo imprime desde la
     * ficha de la reserva y la subida de documentación solo lo confirma, nunca lo reescribe.
     * `null` en los acompañantes que no conducen: de ellos no se guarda ningún carnet.
     */
    driverLicenseId?: string | null
}

export function validateBookingPassengers(
    rawPassengers: any[],
    rentalStartDate: Date = new Date(),
    separateSecondDriver?: any
): { isValid: boolean; error?: string; passengers: BookingPassenger[] } {
    if ((!rawPassengers || !Array.isArray(rawPassengers) || rawPassengers.length === 0) && !separateSecondDriver) {
        return { isValid: true, passengers: [] }
    }

    // Antes de recorrer nada: ninguna camper lleva más de MAX_CAMPER_SEATS plazas (carnet B)
    if (Array.isArray(rawPassengers) && rawPassengers.length > MAX_CAMPER_SEATS - 1) {
        return { isValid: false, error: `No puede haber más de ${MAX_CAMPER_SEATS - 1} acompañantes.`, passengers: [] }
    }

    const text = (value: unknown) => typeof value === 'string' ? value : ''
    const items: any[] = Array.isArray(rawPassengers) ? [...rawPassengers] : []
    if (separateSecondDriver && typeof separateSecondDriver === 'object') {
        if (isAlreadyAmong(separateSecondDriver, items)) {
            // Ya viene entre los acompañantes: se marca ahí y no se duplica
            const doc = personDocument(separateSecondDriver)
            const existing = items.find(p => personDocument(p) === doc)
            if (existing) items[items.indexOf(existing)] = { ...existing, isSecondDriver: true }
        } else {
            items.push({ ...separateSecondDriver, isSecondDriver: true })
        }
    }

    // Como máximo un 2º conductor por reserva, sea cual sea la fianza (decisión de negocio).
    // Un borrador antiguo o una pestaña vieja pueden traer varias fichas marcadas
    if (countSecondDrivers(items) > MAX_SECOND_DRIVERS) {
        return {
            isValid: false,
            error: `Solo puede haber ${MAX_SECOND_DRIVERS} segundo conductor en la reserva. Desmarca los demás.`,
            passengers: []
        }
    }

    const validated: BookingPassenger[] = []

    for (let i = 0; i < items.length; i++) {
        const p = items[i]
        const passengerNum = i + 2 // Pasajero 1 es el conductor principal / cliente
        if (!p || typeof p !== 'object') {
            return { isValid: false, error: `Los datos del Pasajero ${passengerNum} no son válidos.`, passengers: [] }
        }
        const rawName = text(p.fullName || p.name || p.customer_name)
        // Se guarda normalizado, como el nombre del cliente: es lo que imprime el contrato
        const fullName = normalizeDriverText(rawName) ?? ''
        const doc = personDocument(p)
        const isSecondDriver = isSecondDriverFlag(p)

        if (!fullName) {
            return {
                isValid: false,
                error: `El nombre y apellidos del acompañante (Pasajero ${passengerNum}) son obligatorios.`,
                passengers: []
            }
        }

        if (!isValidPersonName(rawName)) {
            return {
                isValid: false,
                error: `El nombre del acompañante (Pasajero ${passengerNum}) solo puede contener letras, espacios y los signos . , · ' -`,
                passengers: []
            }
        }

        if (!doc) {
            return {
                isValid: false,
                error: `El DNI, NIE o Pasaporte del acompañante "${fullName}" (Pasajero ${passengerNum}) es obligatorio.`,
                passengers: []
            }
        }

        const docValidation = isValidDniNieOrPassport(doc)
        if (!docValidation.isValid) {
            return {
                isValid: false,
                error: `El documento de identidad de "${fullName}" (Pasajero ${passengerNum}) no es válido: ${docValidation.error}`,
                passengers: []
            }
        }

        let birthDateStr: string | null = null
        let licenseDateStr: string | null = null
        let licenseIdStr: string | null = null

        if (isSecondDriver) {
            const rawBirthDate = p.birthDate || p.birth_date || p.driverBirthDate || p.driver_birth_date
            const rawLicenseDate = p.licenseDate || p.license_date || p.licenseIssueDate || p.license_issue_date || p.driverLicenseIssueDate || p.driver_license_issue_date

            // 1. Validar edad mínima obligatoria (>= 25 años).
            // Solo la FECHA: una edad o unos años autodeclarados (`age`, `licenseYears`) se perdían
            // al guardar la ficha, así que ni el contrato ni la subida podían volver a comprobarlos.
            // El paso 5 ya pide las dos fechas para la ficha marcada como 2º conductor.
            if (!rawBirthDate) {
                return {
                    isValid: false,
                    error: `La fecha de nacimiento del segundo conductor ("${fullName}") es obligatoria para verificar los requisitos de seguro (>= 25 años).`,
                    passengers: []
                }
            }
            // YYYY-MM-DD, como la del titular: new Date() admitía "2000/01/01 (texto…)" y se guardaba tal cual
            if (!isValidDateString(rawBirthDate)) {
                return {
                    isValid: false,
                    error: `La fecha de nacimiento del segundo conductor ("${fullName}") no es válida.`,
                    passengers: []
                }
            }
            const age = calculateAge(new Date(rawBirthDate), rentalStartDate)
            if (age < 25) {
                return {
                    isValid: false,
                    error: `El segundo conductor ("${fullName}") debe tener al menos 25 años cumplidos en la fecha de alquiler (edad calculada: ${age} años). Requisito obligatorio según la póliza de seguro.`,
                    passengers: []
                }
            }
            // isValidDateString ya garantiza YYYY-MM-DD: se guarda la cadena tal cual
            birthDateStr = rawBirthDate

            // 2. Validar antigüedad carnet B obligatoria (>= 2 años), también por fecha
            if (!rawLicenseDate) {
                return {
                    isValid: false,
                    error: `La fecha de expedición del carnet de conducir del segundo conductor ("${fullName}") es obligatoria para verificar la antigüedad mínima (>= 2 años).`,
                    passengers: []
                }
            }
            if (!isValidDateString(rawLicenseDate)) {
                return {
                    isValid: false,
                    error: `La fecha de expedición del carnet de conducir del segundo conductor ("${fullName}") no es válida.`,
                    passengers: []
                }
            }
            const seniority = calculateLicenseSeniorityYears(new Date(rawLicenseDate), rentalStartDate)
            if (seniority < 2) {
                return {
                    isValid: false,
                    error: `El segundo conductor ("${fullName}") debe tener al menos 2 años de antigüedad del permiso de conducir clase B (antigüedad calculada: ${seniority} años). Requisito obligatorio según la póliza de seguro.`,
                    passengers: []
                }
            }
            licenseDateStr = rawLicenseDate

            // 3. Nº del permiso de conducir, obligatorio igual que las dos fechas. Sin él, ninguna
            // ficha lo trae y el contrato faculta a esa persona con un permiso «Pendiente»; la
            // subida de documentación tampoco puede confirmar el que teclee el titular
            const rawLicenseId = p.driverLicenseId || p.driver_license_id || p.licenseId || p.license_id
            const licenseId = typeof rawLicenseId === 'string' ? (normalizeDriverText(rawLicenseId) ?? '') : ''
            if (!licenseId) {
                return {
                    isValid: false,
                    error: `El número del permiso de conducir del segundo conductor ("${fullName}") es obligatorio: es el permiso que se autoriza en el contrato.`,
                    passengers: []
                }
            }
            // La misma regla que la subida de documentación (LICENSE_ID_PATTERN): lo que pasa aquí pasa después
            if (!isValidLicenseIdText(licenseId)) {
                return {
                    isValid: false,
                    error: `El número del permiso de conducir del segundo conductor ("${fullName}") no es válido: solo letras, números y los signos . / - (entre 3 y 30 caracteres).`,
                    passengers: []
                }
            }
            licenseIdStr = licenseId
        } else {
            // Acompañante que no conduce: las fechas son opcionales, pero si vienen deben ser
            // YYYY-MM-DD y se guardan tal cual. `new Date(...)` admitía "1980/01/01 (texto)" y
            // `toISOString()` sobre una fecha local corría el día según la zona horaria del servidor
            const rawBirthDate = p.birthDate || p.birth_date
            if (rawBirthDate) {
                if (!isValidDateString(rawBirthDate)) {
                    return {
                        isValid: false,
                        error: `La fecha de nacimiento del acompañante "${fullName}" (Pasajero ${passengerNum}) no es válida.`,
                        passengers: []
                    }
                }
                birthDateStr = rawBirthDate
            }
            const rawLicenseDate = p.licenseDate || p.license_date
            if (rawLicenseDate) {
                if (!isValidDateString(rawLicenseDate)) {
                    return {
                        isValid: false,
                        error: `La fecha de expedición del carnet de conducir del acompañante "${fullName}" (Pasajero ${passengerNum}) no es válida.`,
                        passengers: []
                    }
                }
                licenseDateStr = rawLicenseDate
            }
        }

        validated.push({
            fullName,
            dniNie: doc,
            isSecondDriver,
            birthDate: birthDateStr,
            licenseDate: licenseDateStr,
            driverLicenseId: licenseIdStr,
        })
    }

    return {
        isValid: true,
        passengers: validated
    }
}

export async function POST(req: Request) {
    try {
        // Antes de crear nada: sin configuración válida de Redsys no se puede cobrar
        try {
            getRedsysConfig()
        } catch (configErr) {
            console.error('Checkout: configuración de Redsys no válida:', configErr)
            return NextResponse.json({ error: 'El pago no está disponible en este momento. Inténtalo más tarde.' }, { status: 503 })
        }

        const body = await req.json()

        const camperSlug = body.camperSlug || body.camper_slug || body.camper || body.camperId
        const startDateStr = body.startDate || body.from
        const endDateStr = body.endDate || body.to

        const slots = resolveBookingSlots(body)
        if (!slots) {
            return NextResponse.json({ error: 'Tramo horario de recogida o devolución no válido' }, { status: 400 })
        }
        const { pickupSlot, dropoffSlot, pickupTime, dropoffTime } = slots

        const kmPackage: KmPackage = body.kmPackage === 'unlimited' ? 'unlimited' : 'included_150'
        const cancellationPolicy: CancellationPolicy = body.cancellationPolicy === 'flexible' ? 'flexible' : 'standard'

        const cust = body.customer || {}
        const driverData = body.driver || {}

        const depositOption: DepositOption = (
            body.depositOption === 'flex_1000' ||
            body.depositOption === 'flex' ||
            cust.depositOption === 'flex_1000' ||
            cust.depositOption === 'flex'
        ) ? 'flex_1000' : 'standard_2000'

        const rawExtras = body.extrasSelected || body.extras || body.selectedExtras || []

        const rawName = String(cust.fullName || cust.name || body.customerName || body.fullName || body.name || '')
        const customerEmail = normalizeEmail(cust.email || body.customerEmail || body.email)
        const rawPhone = String(cust.phone || body.customerPhone || body.phone || '')
        const rawDni: unknown = cust.dniNie || cust.dni || body.customerDni || body.dniNie || body.dni || ''

        const rawAddress = joinAddressParts([
            cust.address || body.customerAddress || body.address,
            cust.city || body.city,
            cust.postalCode || body.postalCode,
            cust.country || body.country
        ])

        // Las mismas reglas que el paso 5 y la subida de documentos: lo que se acepta aquí pasa después.
        // Vacíos se admiten como hasta ahora (la reserva usa 'Cliente Utopia' y sin teléfono ni dirección)
        if (rawName.trim() && !isValidPersonName(rawName)) {
            return NextResponse.json({ error: "El nombre solo puede contener letras, espacios y los signos . , · ' -" }, { status: 400 })
        }
        if (rawPhone.trim() && !isValidPhoneText(rawPhone)) {
            return NextResponse.json({ error: 'El teléfono solo puede contener números, espacios y los signos + ( ) . / -, hasta 30 caracteres con el prefijo' }, { status: 400 })
        }
        if (rawAddress && !isValidTypedAddress(rawAddress)) {
            return NextResponse.json({ error: `La dirección completa (dirección, ciudad, código postal y país) no puede superar ${MAX_ADDRESS_LENGTH} caracteres ni contener caracteres de control` }, { status: 400 })
        }
        // Mismo patrón que la subida de documentos. Antes, un valor que no era texto daba 500
        if (typeof rawDni !== 'string' || (rawDni.trim() && !isValidDocumentIdText(rawDni))) {
            return NextResponse.json({ error: 'El documento de identidad solo puede contener letras, números, espacios y guiones (5 a 20 caracteres)' }, { status: 400 })
        }
        // Se guarda lo normalizado: es lo que la subida de documentos y el contrato esperan
        const customerName = normalizeDriverText(rawName) || ''
        const customerPhone = normalizeDriverText(rawPhone) || ''
        const customerAddress = normalizeDriverText(rawAddress) || ''
        const customerDni = normalizeDriverText(rawDni) || ''

        // Entero entre 1 y el máximo de plazas; las de esta camper se comprueban al leerla
        const rawTravelers = cust.travelersCount ?? cust.pax ?? body.travelersCount ?? body.pax ?? body.num_pax
        const travelersCount = rawTravelers === undefined || rawTravelers === null || rawTravelers === '' ? 2 : Number(rawTravelers)
        if (!Number.isInteger(travelersCount) || travelersCount < 1 || travelersCount > MAX_CAMPER_SEATS) {
            return NextResponse.json({ error: `El número de viajeros debe ser un número entero entre 1 y ${MAX_CAMPER_SEATS}` }, { status: 400 })
        }
        const notes = sanitizeCustomerNotes(cust.notes || body.notes)

        // 1. Validaciones básicas de entrada
        if (!camperSlug || !startDateStr || !endDateStr) {
            return NextResponse.json(
                { error: 'Faltan parámetros requeridos (camper, fecha inicio y fecha fin)' },
                { status: 400 }
            )
        }

        // El slug/id se interpola en un filtro .or() de PostgREST: solo letras, números y guiones
        if (!/^[a-z0-9-]+$/i.test(String(camperSlug))) {
            return NextResponse.json({ error: 'Camper no válida' }, { status: 400 })
        }

        if (!customerEmail) {
            return NextResponse.json(
                { error: 'El correo electrónico del cliente es obligatorio' },
                { status: 400 }
            )
        }

        if (!isValidEmail(customerEmail)) {
            return NextResponse.json({ error: 'El correo electrónico no es válido' }, { status: 400 })
        }

        const bookingDates = validateBookingDates(startDateStr, endDateStr)
        if (bookingDates.error !== undefined) {
            return NextResponse.json({ error: bookingDates.error }, { status: 400 })
        }
        const { startDate, endDate } = bookingDates

        // 2. Validaciones de conductor server-side (Edad mínima >= 25 años y antigüedad carnet B >= 2 años)
        const rawBirthDate =
            body.driverBirthDate ||
            body.birthDate ||
            body.driver_birth_date ||
            body.birth_date ||
            cust.driverBirthDate ||
            cust.birthDate ||
            cust.driver_birth_date ||
            cust.birth_date ||
            driverData.birthDate ||
            driverData.birth_date

        const rawAge =
            body.driverAge ??
            body.driver_age ??
            body.age ??
            cust.driverAge ??
            cust.age ??
            driverData.age

        const rawLicenseIssueDate =
            body.driverLicenseIssueDate ||
            body.licenseIssueDate ||
            body.driver_license_issue_date ||
            body.license_issue_date ||
            cust.driverLicenseIssueDate ||
            cust.licenseIssueDate ||
            cust.driver_license_issue_date ||
            cust.license_issue_date ||
            cust.licenseDate ||
            driverData.licenseIssueDate ||
            driverData.issueDate ||
            driverData.license_issue_date

        const rawLicenseYears =
            body.driverLicenseYears ??
            body.licenseYears ??
            body.driver_license_years ??
            cust.driverLicenseYears ??
            cust.licenseYears ??
            driverData.yearsHeld ??
            driverData.licenseYears

        const driverRequirementsConfirmed =
            body.driverRequirementsConfirmed ??
            cust.driverRequirementsConfirmed ??
            driverData.meetsRequirements

        // Validación de edad mínima (>= 25 años)
        if (rawBirthDate) {
            if (!isValidDateString(rawBirthDate)) {
                return NextResponse.json(
                    { error: 'Fecha de nacimiento del conductor no válida' },
                    { status: 400 }
                )
            }
            const birthDate = new Date(rawBirthDate)
            const age = calculateAge(birthDate, startDate)
            if (age < 25) {
                return NextResponse.json(
                    { error: `El conductor principal debe tener al menos 25 años cumplidos en la fecha de alquiler (edad calculada: ${age} años). Requisito obligatorio según la póliza de seguro.` },
                    { status: 400 }
                )
            }
        } else if (rawAge !== undefined && rawAge !== null && rawAge !== '') {
            const ageNum = Number(rawAge)
            if (isNaN(ageNum) || ageNum < 25) {
                return NextResponse.json(
                    { error: `El conductor principal debe tener al menos 25 años cumplidos (edad indicada: ${rawAge} años). Requisito obligatorio según la póliza de seguro.` },
                    { status: 400 }
                )
            }
        } else {
            // Sin sesión del titular no se mira su perfil: la comprobación depende de este dato
            return NextResponse.json({ error: 'La fecha de nacimiento del conductor es obligatoria' }, { status: 400 })
        }

        // Validación de antigüedad mínima del permiso de conducir B (>= 2 años)
        if (rawLicenseIssueDate) {
            if (!isValidDateString(rawLicenseIssueDate)) {
                return NextResponse.json(
                    { error: 'Fecha de expedición del carnet de conducir no válida' },
                    { status: 400 }
                )
            }
            const issueDate = new Date(rawLicenseIssueDate)
            const seniority = calculateLicenseSeniorityYears(issueDate, startDate)
            if (seniority < 2) {
                return NextResponse.json(
                    { error: `El permiso de conducir clase B debe tener un mínimo de 2 años de antigüedad (antigüedad calculada: ${seniority} años). Requisito obligatorio según la póliza de seguro.` },
                    { status: 400 }
                )
            }
        } else if (rawLicenseYears !== undefined && rawLicenseYears !== null && rawLicenseYears !== '') {
            const yearsNum = Number(rawLicenseYears)
            if (isNaN(yearsNum) || yearsNum < 2) {
                return NextResponse.json(
                    { error: `El permiso de conducir clase B debe tener un mínimo de 2 años de antigüedad (antigüedad indicada: ${rawLicenseYears} años). Requisito obligatorio según la póliza de seguro.` },
                    { status: 400 }
                )
            }
        } else {
            return NextResponse.json({ error: 'La fecha de expedición del carnet de conducir es obligatoria' }, { status: 400 })
        }

        if (driverRequirementsConfirmed === false) {
            return NextResponse.json(
                { error: 'Es obligatorio confirmar que el conductor cumple los requisitos mínimos de edad (>= 25 años) y antigüedad de carnet B (>= 2 años).' },
                { status: 400 }
            )
        }

        // 2b. Validaciones de acompañantes y segundo conductor server-side
        const rawPassengersInput = body.passengers || cust.passengers || body.companions || cust.companions || []
        const rawPassengers = Array.isArray(rawPassengersInput) ? rawPassengersInput : []

        // ── Regla única del 2º conductor (`secondDriver`, `cust.secondDriver`, `secondDriverSolo`
        // y el `isSecondDriver` de cada acompañante) ──
        // Se admite con cualquier fianza: con Flex va incluido y con Estándar se cobra
        // SECOND_DRIVER_RATE_PER_DAY, que suma el servidor al recalcular el precio.
        // Como máximo uno por reserva: lo comprueba validateBookingPassengers sobre todas las fichas.
        //
        // El bloque "solo" del paso 5 solo existe con 1 viajero: fuera de ahí se ignora, porque una
        // pestaña antigua o el borrador de sessionStorage lo pueden seguir enviando
        const soloSecondDriver = travelersCount === 1 && (cust.secondDriverSoloEnabled || body.secondDriverSoloEnabled)
            ? (body.secondDriverSolo || cust.secondDriverSolo || null)
            : null
        // Un 2º conductor enviado aparte de las fichas viaja además de los acompañantes y ocupa
        // plaza, salvo que ya figure entre ellos. El del bloque "solo" se registra aparte de los
        // viajeros (el paso 5 lo presenta así) y no suma plaza
        const standaloneSecondDriver = body.secondDriver || cust.secondDriver || null
        const separateSecondDriver = standaloneSecondDriver || soloSecondDriver
        const extraSeats = standaloneSecondDriver && !isAlreadyAmong(standaloneSecondDriver, rawPassengers) ? 1 : 0

        // Cada acompañante es un viajero más que el titular
        const companionsCount = rawPassengers.length + extraSeats
        if (travelersCount < companionsCount + 1) {
            return NextResponse.json(
                { error: `Has indicado ${travelersCount} ${travelersCount === 1 ? 'viajero' : 'viajeros'} y ${companionsCount} ${companionsCount === 1 ? 'acompañante' : 'acompañantes'}: revisa el número de viajeros.` },
                { status: 400 }
            )
        }

        const passengerValidation = validateBookingPassengers(rawPassengers, startDate, separateSecondDriver)
        if (!passengerValidation.isValid) {
            return NextResponse.json(
                { error: passengerValidation.error },
                { status: 400 }
            )
        }
        const validatedPassengers = passengerValidation.passengers
        // El suplemento se cobra por lo que ha quedado validado en el servidor, nunca por lo que
        // diga el navegador: ninguna bandera del cuerpo entra en el cálculo del precio
        const hasSecondDriver = countSecondDrivers(validatedPassengers) > 0

        const supabase = getSupabaseAdmin()

        const session = await createServerClient()
        const { data: { user: sessionUser } } = await session.auth.getUser()

        // El límite cuenta por email, que escribe cualquiera: al titular con sesión no le afecta
        if (!isSessionOf(sessionUser, customerEmail) && await hasTooManyOpenBookings(supabase, customerEmail)) {
            return NextResponse.json(
                { error: 'Hay varias reservas sin pagar con este email. Inicia sesión para continuar, espera unos minutos o escríbenos.' },
                { status: 429 }
            )
        }

        // 3. Comprobar existencia de la camper
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(camperSlug)
        let camperQuery = supabase.from('campers').select('*')
        if (isUuid) {
            camperQuery = camperQuery.or(`id.eq.${camperSlug},slug.eq.${camperSlug}`)
        } else {
            camperQuery = camperQuery.eq('slug', camperSlug)
        }
        const { data: camper, error: camperErr } = await camperQuery.maybeSingle()

        if (camperErr || !camper) {
            return NextResponse.json({ error: 'Camper no encontrada' }, { status: 404 })
        }

        // Plazas de esta camper: viajeros y acompañantes (segundo conductor incluido) no pueden superarlas
        const seats = camperSeats(camper)
        if (travelersCount > seats || validatedPassengers.length > seats - 1) {
            return NextResponse.json(
                { error: `La camper ${camper.name || ''} tiene ${seats} plazas: revisa el número de viajeros y acompañantes.` },
                { status: 400 }
            )
        }

        // 4. Comprobar disponibilidad frente a reservas activas y bloqueos de calendario
        const now = new Date()

        // 4a. Limpiar bloqueos de checkout_hold expirados antes de comprobar disponibilidad
        await supabase
            .from('blocked_dates')
            .delete()
            .eq('reason', 'checkout_hold')
            .lt('expires_at', now.toISOString())

        // 4b. Comprobar reservas confirmadas o activas
        const { data: activeBookings, error: activeErr } = await supabase
            .from('bookings')
            .select('id, start_date, end_date, pickup_time, dropoff_time')
            .eq('camper_id', camper.id)
            .in('status', ['confirmed', 'active'])
            .lte('start_date', endDateStr)
            .gte('end_date', startDateStr)
        if (activeErr) throw new Error(activeErr.message)

        // 4c. Comprobar bloqueos de calendario vigentes (permanentes o no expirados)
        const { data: blockedDates, error: blockedErr } = await supabase
            .from('blocked_dates')
            .select('id, start_date, end_date, expires_at, reason')
            .eq('camper_id', camper.id)
            .lte('start_date', endDateStr)
            .gte('end_date', startDateStr)
        if (blockedErr) throw new Error(blockedErr.message)

        const effectiveHolds = (blockedDates || []).filter(b => {
            if (!b.expires_at) return true // Permanente (Redsys o admin)
            return new Date(b.expires_at) > now // Hold temporal vigente
        })

        // Misma regla que el calendario: un medio día libre se puede reservar
        const requestedRange = { start_date: startDateStr, end_date: endDateStr, pickup_time: pickupTime, dropoff_time: dropoffTime }
        if (!isBookingRangeFree(requestedRange, activeBookings || [], effectiveHolds)) {
            return NextResponse.json(
                { error: 'La camper no está disponible en las fechas seleccionadas' },
                { status: 409 }
            )
        }

        // 5. Obtener tarifas de temporadas, periodos, tramos de descuento y extras de la base de datos
        const [{ data: seasonsV2 }, { data: seasonPeriods }, { data: discounts }, { data: dbExtras }] = await Promise.all([
            supabase.from('seasons_v2').select('*'),
            supabase.from('season_periods').select('*'),
            supabase.from('duration_discounts').select('*'),
            supabase.from('extras').select('*'),
        ])

        // Normalizar y verificar extras seleccionados con la base de datos o catálogo base del servidor (seguridad server-side)
        const STATIC_EXTRAS_CATALOG: Record<string, { name_es: string; category: string; price: number; price_type: 'per_day' | 'per_rental' }> = {
            'extra-chair-unit': { name_es: 'Silla exterior adicional', category: 'Equipamiento', price: 10, price_type: 'per_rental' },
            'extra-table-unit': { name_es: 'Mesa exterior adicional', category: 'Equipamiento', price: 15, price_type: 'per_rental' },
            'extra-cleaning-set': { name_es: 'Set limpieza adicional', category: 'Equipamiento', price: 10, price_type: 'per_rental' },
            'extra-bedding-kit': { name_es: 'Kit cama adicional', category: 'Confort', price: 20, price_type: 'per_rental' },
            'extra-snorkel-mask': { name_es: 'Kit snorkel adicional', category: 'Deporte', price: 10, price_type: 'per_rental' },
            'extra-paddle-surf': { name_es: 'Padelsurf con hinchador', category: 'Deporte', price: 45, price_type: 'per_rental' },
            'extra-bike-rack': { name_es: 'Portabicicletas', category: 'Deporte', price: 40, price_type: 'per_rental' },
            'extra-bicycle': { name_es: 'Bicicleta', category: 'Deporte', price: 35, price_type: 'per_rental' },
        }

        const verifiedExtras: CategorizedExtra[] = []
        if (Array.isArray(rawExtras)) {
            for (const item of rawExtras) {
                const extraId = typeof item === 'string' ? item : (item.id || item.extraId)
                const dbExtra = (dbExtras || []).find((e: any) => e.id === extraId) || (extraId && STATIC_EXTRAS_CATALOG[extraId] ? { id: extraId, ...STATIC_EXTRAS_CATALOG[extraId] } : null)
                if (dbExtra) {
                    const quantity = typeof item === 'object' && item.quantity ? Math.max(1, Math.floor(Number(item.quantity))) : 1
                    verifiedExtras.push({
                        id: dbExtra.id,
                        extraId: dbExtra.id,
                        name: dbExtra.name_es || dbExtra.name || 'Extra',
                        category: dbExtra.category || 'Equipamiento',
                        price: Number(dbExtra.price) || 0,
                        pricingType: dbExtra.price_type === 'per_day' ? 'per_day' : 'per_rental',
                        pricing_type: dbExtra.price_type === 'per_day' ? 'per_day' : 'per_rental',
                        quantity,
                    })
                }
            }
        }

        // 6. Cálculo verificado de precios en el servidor (Source of Truth)
        // Se calcula 100% de forma inmutable en el backend mediante calculatePriceV2
        const breakdown = calculatePriceV2({
            startDate,
            pickupSlot,
            endDate,
            dropoffSlot,
            camperBasePrice: Number(camper.base_price_per_night || camper.price_per_night || camper.price_per_day || 110),
            camperId: camper.id,
            seasons: seasonsV2 || [],
            periods: seasonPeriods || [],
            discounts: discounts || [],
            kmPackage,
            cancellationPolicy,
            depositOption,
            secondDriver: hasSecondDriver,
            extrasSelected: verifiedExtras,
            depositAmount: body.depositAmount === 1000 ? 1000 : (depositOption === 'flex_1000' ? 1000 : 2000),
        })

        if (breakdown.numNights <= 0) {
            return NextResponse.json({ error: 'Rango de fechas de reserva inválido' }, { status: 400 })
        }

        // A partir de aquí se crean cuentas y bloqueos: se cuenta solo lo que llega a hacerlo
        if (!registerCheckoutAttempt(clientIp(req.headers))) {
            return NextResponse.json({ error: 'Demasiados intentos de reserva. Espera unos minutos.' }, { status: 429 })
        }

        // 7. Cuenta del cliente: se crea o se enlaza. Solo la sesión del titular, o haberla creado
        // aquí, permite tocar el perfil y da acceso a los datos tras el pago
        const customer = await resolveCheckoutCustomer(supabase, {
            email: customerEmail,
            startDate,
            sessionUser,
            profile: {
                fullName: customerName,
                phone: customerPhone,
                dniNie: customerDni,
                address: customerAddress,
                birthDate: rawBirthDate || null,
                licenseIssueDate: rawLicenseIssueDate || null,
            },
        }, `Utopia_${crypto.randomBytes(12).toString("hex")}_2026!`)

        if (customer.rejection !== undefined) {
            return NextResponse.json({ error: customer.rejection }, { status: 400 })
        }
        const { userId, grantAccess, accountCreated } = customer
        const retireNewAccount = async () => {
            if (accountCreated) await retireAccount(supabase, userId)
        }

        // 8. Generar identificador de pedido único de Redsys (12 caracteres) y su formulario de pago,
        // que ya no depende de nada más: a partir de aquí la reserva está validada
        const orderId = generateRedsysOrderId()
        const redsysFormData = createRedsysPaymentForm({
            amount: breakdown.payableTotal,
            orderId,
            description: `1x Camper ${camper.name || camperSlug.toUpperCase()} - Utopia Van Life`,
            customerName: customerName || 'Cliente Utopia',
            locale: isRedsysLocale(body.locale) ? body.locale : 'es',
        })

        // 9. Insertar bloqueo provisional de 15 minutos en blocked_dates
        const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
        const { data: holdRecord, error: holdErr } = await supabase
            .from('blocked_dates')
            .insert({
                camper_id: camper.id,
                start_date: startDateStr,
                end_date: endDateStr,
                reason: 'checkout_hold',
                session_id: `checkout_${orderId}`,
                expires_at: holdExpiresAt,
            })
            .select('id')
            .maybeSingle()

        if (holdErr || !holdRecord) {
            await retireNewAccount()
            throw new Error(`No se pudo crear el bloqueo provisional: ${holdErr?.message}`)
        }

        // 10. Persistir reserva con estado 'pending' y payment_status 'pending'
        const { data: booking, error: bookingErr } = await supabase
            .from('bookings')
            .insert({
                camper_id: camper.id,
                user_id: userId,
                start_date: startDateStr,
                end_date: endDateStr,
                pickup_time: pickupTime,
                dropoff_time: dropoffTime,
                num_nights: breakdown.numNights,
                num_pax: travelersCount,
                km_package: kmPackage,
                km_price: breakdown.kmSupplement,
                cancellation_policy: cancellationPolicy,
                cancellation_price: breakdown.cancellationSupplement,
                extras_selected: verifiedExtras,
                extras_total: breakdown.extrasTotal,
                base_price: breakdown.baseRentalTotal,
                discount_amount: breakdown.discountAmount,
                deposit_amount: breakdown.depositAmount,
                total_price: breakdown.payableTotal,
                pricing_breakdown: {
                    ...breakdown,
                    passengers: validatedPassengers,
                },
                passengers: validatedPassengers,
                customer_name: customerName || 'Cliente Utopia',
                customer_email: customerEmail,
                customer_phone: customerPhone || null,
                customer_dni: customerDni || null,
                customer_address: customerAddress || null,
                notes: notes || null,
                status: 'pending',
                payment_status: 'pending',
                payment_intent_id: orderId,
            })
            .select('id')
            .single()

        if (bookingErr || !booking) {
            console.error('Error insertando reserva en bookings:', bookingErr)
            // Liberar el hold temporal si la reserva falló
            await supabase.from('blocked_dates').delete().eq('id', holdRecord.id)
            await retireNewAccount()
            return NextResponse.json({ error: 'Error al registrar la reserva' }, { status: 500 })
        }

        const response = NextResponse.json({
            success: true,
            bookingId: booking.id,
            orderId,
            redsys: {
                url: redsysFormData.url,
                params: redsysFormData.merchantParameters,
                signature: redsysFormData.signature,
                version: redsysFormData.signatureVersion,
                orderId,
            },
            formData: redsysFormData,
            breakdown,
            passengers: validatedPassengers,
        })

        // Permite recuperar los datos de la reserva a la vuelta de Redsys, que llega sin sesión.
        // Quien no tiene acceso recibe una cookie igual pero inútil: la respuesta no dice si el email tenía cuenta
        const access = grantAccess ? createCheckoutAccessCookie(orderId) : createCheckoutNoAccessCookie()
        if (access) response.cookies.set(access.name, access.value, access.options)

        return response
    } catch (error) {
        console.error('Checkout API error:', error)
        return NextResponse.json({ error: 'No hemos podido procesar la reserva. Inténtalo de nuevo.' }, { status: 500 })
    }
}
