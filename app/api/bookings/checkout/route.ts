import crypto from "crypto";
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { calculatePriceV2 } from '@/lib/pricing/engine'
import { CategorizedExtra, DaySlot, KmPackage, CancellationPolicy, DepositOption } from '@/lib/pricing/types'
import { generateRedsysOrderId, createRedsysPaymentForm } from '@/lib/redsys'

export function calculateAge(birthDate: Date, referenceDate: Date = new Date()): number {
    let age = referenceDate.getFullYear() - birthDate.getFullYear()
    const m = referenceDate.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) {
        age--
    }
    return age
}

export function calculateLicenseSeniorityYears(issueDate: Date, referenceDate: Date = new Date()): number {
    let years = referenceDate.getFullYear() - issueDate.getFullYear()
    const m = referenceDate.getMonth() - issueDate.getMonth()
    if (m < 0 || (m === 0 && referenceDate.getDate() < issueDate.getDate())) {
        years--
    }
    return Math.max(0, years)
}

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

export function isValidDniNieOrPassport(value: string): { isValid: boolean; error?: string } {
    if (!value || typeof value !== 'string') {
        return { isValid: false, error: 'Documento de identidad requerido' }
    }
    const clean = value.trim().toUpperCase()

    // 1. DNI español: 8 dígitos + 1 letra de control
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

    // 2. NIE español: X, Y, Z + 7 dígitos + 1 letra de control
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

    // 3. Pasaporte internacional: 6-15 caracteres alfanuméricos
    const passportRegex = /^[A-Z0-9]{6,15}$/
    if (passportRegex.test(clean)) {
        return { isValid: true }
    }

    return { isValid: false, error: 'Formato de DNI, NIE o Pasaporte no válido' }
}

export interface BookingPassenger {
    fullName: string
    dniNie: string
    isSecondDriver: boolean
    birthDate?: string | null
    licenseDate?: string | null
}

export function validateBookingPassengers(
    rawPassengers: any[],
    rentalStartDate: Date = new Date(),
    separateSecondDriver?: any
): { isValid: boolean; error?: string; passengers: BookingPassenger[] } {
    if ((!rawPassengers || !Array.isArray(rawPassengers) || rawPassengers.length === 0) && !separateSecondDriver) {
        return { isValid: true, passengers: [] }
    }

    const items: any[] = Array.isArray(rawPassengers) ? [...rawPassengers] : []
    if (separateSecondDriver && typeof separateSecondDriver === 'object') {
        const sDoc = (separateSecondDriver.dniNie || separateSecondDriver.dni || separateSecondDriver.passport || '').trim().toUpperCase()
        const exists = items.some(p => {
            const pDoc = (p.dniNie || p.dni || p.passport || '').trim().toUpperCase()
            return pDoc && sDoc && pDoc === sDoc
        })
        if (!exists) {
            items.push({ ...separateSecondDriver, isSecondDriver: true })
        }
    }

    const validated: BookingPassenger[] = []

    for (let i = 0; i < items.length; i++) {
        const p = items[i]
        const passengerNum = i + 2 // Pasajero 1 es el conductor principal / cliente
        const fullName = (p.fullName || p.name || p.customer_name || '').trim()
        const doc = (p.dniNie || p.dni || p.passport || p.documentNumber || p.document_number || p.dni_nie || '').trim().toUpperCase()
        const isSecondDriver = Boolean(p.isSecondDriver || p.is_second_driver || p.secondDriver || p.isDriver)

        if (!fullName) {
            return {
                isValid: false,
                error: `El nombre y apellidos del acompañante (Pasajero ${passengerNum}) son obligatorios.`,
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

        if (isSecondDriver) {
            const rawBirthDate = p.birthDate || p.birth_date || p.driverBirthDate || p.driver_birth_date
            const rawAge = p.age ?? p.driverAge ?? p.driver_age
            const rawLicenseDate = p.licenseDate || p.license_date || p.licenseIssueDate || p.license_issue_date || p.driverLicenseIssueDate || p.driver_license_issue_date
            const rawLicenseYears = p.licenseYears ?? p.license_years ?? p.yearsHeld

            // 1. Validar edad mínima obligatoria (>= 25 años)
            if (rawBirthDate) {
                const bDate = new Date(rawBirthDate)
                if (isNaN(bDate.getTime())) {
                    return {
                        isValid: false,
                        error: `La fecha de nacimiento del segundo conductor ("${fullName}") no es válida.`,
                        passengers: []
                    }
                }
                const age = calculateAge(bDate, rentalStartDate)
                if (age < 25) {
                    return {
                        isValid: false,
                        error: `El segundo conductor ("${fullName}") debe tener al menos 25 años cumplidos en la fecha de alquiler (edad calculada: ${age} años). Requisito obligatorio según la póliza de seguro.`,
                        passengers: []
                    }
                }
                birthDateStr = typeof rawBirthDate === 'string' ? rawBirthDate.split('T')[0] : bDate.toISOString().split('T')[0]
            } else if (rawAge !== undefined && rawAge !== null && rawAge !== '') {
                const ageNum = Number(rawAge)
                if (isNaN(ageNum) || ageNum < 25) {
                    return {
                        isValid: false,
                        error: `El segundo conductor ("${fullName}") debe tener al menos 25 años cumplidos (edad indicada: ${rawAge} años). Requisito obligatorio según la póliza de seguro.`,
                        passengers: []
                    }
                }
            } else {
                return {
                    isValid: false,
                    error: `La fecha de nacimiento o edad del segundo conductor ("${fullName}") es obligatoria para verificar los requisitos de seguro (>= 25 años).`,
                    passengers: []
                }
            }

            // 2. Validar antigüedad carnet B obligatoria (>= 2 años)
            if (rawLicenseDate) {
                const lDate = new Date(rawLicenseDate)
                if (isNaN(lDate.getTime())) {
                    return {
                        isValid: false,
                        error: `La fecha de expedición del carnet de conducir del segundo conductor ("${fullName}") no es válida.`,
                        passengers: []
                    }
                }
                const seniority = calculateLicenseSeniorityYears(lDate, rentalStartDate)
                if (seniority < 2) {
                    return {
                        isValid: false,
                        error: `El segundo conductor ("${fullName}") debe tener al menos 2 años de antigüedad del permiso de conducir clase B (antigüedad calculada: ${seniority} años). Requisito obligatorio según la póliza de seguro.`,
                        passengers: []
                    }
                }
                licenseDateStr = typeof rawLicenseDate === 'string' ? rawLicenseDate.split('T')[0] : lDate.toISOString().split('T')[0]
            } else if (rawLicenseYears !== undefined && rawLicenseYears !== null && rawLicenseYears !== '') {
                const yearsNum = Number(rawLicenseYears)
                if (isNaN(yearsNum) || yearsNum < 2) {
                    return {
                        isValid: false,
                        error: `El segundo conductor ("${fullName}") debe tener al menos 2 años de antigüedad del permiso de conducir clase B (antigüedad indicada: ${rawLicenseYears} años). Requisito obligatorio según la póliza de seguro.`,
                        passengers: []
                    }
                }
            } else {
                return {
                    isValid: false,
                    error: `La fecha de expedición del carnet de conducir del segundo conductor ("${fullName}") es obligatoria para verificar la antigüedad mínima (>= 2 años).`,
                    passengers: []
                }
            }
        } else {
            if (p.birthDate || p.birth_date) {
                const b = new Date(p.birthDate || p.birth_date)
                if (!isNaN(b.getTime())) birthDateStr = b.toISOString().split('T')[0]
            }
            if (p.licenseDate || p.license_date) {
                const l = new Date(p.licenseDate || p.license_date)
                if (!isNaN(l.getTime())) licenseDateStr = l.toISOString().split('T')[0]
            }
        }

        validated.push({
            fullName,
            dniNie: doc,
            isSecondDriver,
            birthDate: birthDateStr,
            licenseDate: licenseDateStr,
        })
    }

    return {
        isValid: true,
        passengers: validated
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()

        const camperSlug = body.camperSlug || body.camper_slug || body.camper || body.camperId
        const startDateStr = body.startDate || body.from
        const endDateStr = body.endDate || body.to

        const pickupSlot: DaySlot = body.pickupSlot || body.startSlot || (body.pickupTime === '09:00' ? 'morning' : 'afternoon')
        const dropoffSlot: DaySlot = body.dropoffSlot || body.endSlot || (body.dropoffTime === '19:00' || body.dropoffTime === '18:00' ? 'afternoon' : 'morning')

        const pickupTime = body.pickupTime || body.pickup_time || (pickupSlot === 'morning' ? '09:00' : '15:00')
        const dropoffTime = body.dropoffTime || body.dropoff_time || (dropoffSlot === 'afternoon' ? '19:00' : '12:00')

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

        const customerName = (cust.fullName || cust.name || body.customerName || body.fullName || body.name || '').trim()
        const customerEmail = (cust.email || body.customerEmail || body.email || '').trim().toLowerCase()
        const customerPhone = (cust.phone || body.customerPhone || body.phone || '').trim()
        const customerDni = (cust.dniNie || cust.dni || body.customerDni || body.dniNie || body.dni || '').trim()

        const addressParts = [
            cust.address || body.customerAddress || body.address,
            cust.city || body.city,
            cust.postalCode || body.postalCode,
            cust.country || body.country
        ].filter(Boolean)
        const customerAddress = addressParts.length > 0 ? addressParts.join(', ') : (cust.address || body.customerAddress || '')

        const travelersCount = Number(cust.travelersCount || cust.pax || body.travelersCount || body.pax || body.num_pax || 2)
        const notes = cust.notes || body.notes || ''

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

        const startDate = new Date(startDateStr)
        const endDate = new Date(endDateStr)

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
            return NextResponse.json(
                { error: 'Rango de fechas de reserva inválido' },
                { status: 400 }
            )
        }

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
            const birthDate = new Date(rawBirthDate)
            if (isNaN(birthDate.getTime())) {
                return NextResponse.json(
                    { error: 'Fecha de nacimiento del conductor no válida' },
                    { status: 400 }
                )
            }
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
        }

        // Validación de antigüedad mínima del permiso de conducir B (>= 2 años)
        if (rawLicenseIssueDate) {
            const issueDate = new Date(rawLicenseIssueDate)
            if (isNaN(issueDate.getTime())) {
                return NextResponse.json(
                    { error: 'Fecha de expedición del carnet de conducir no válida' },
                    { status: 400 }
                )
            }
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
        }

        if (driverRequirementsConfirmed === false) {
            return NextResponse.json(
                { error: 'Es obligatorio confirmar que el conductor cumple los requisitos mínimos de edad (>= 25 años) y antigüedad de carnet B (>= 2 años).' },
                { status: 400 }
            )
        }

        // 2b. Validaciones de acompañantes y segundo conductor server-side
        const rawPassengers = body.passengers || cust.passengers || body.companions || cust.companions || []
        const separateSecondDriver = 
            body.secondDriver || 
            cust.secondDriver || 
            ((cust.secondDriverSoloEnabled || body.secondDriverSoloEnabled) 
                ? (body.secondDriverSolo || cust.secondDriverSolo) 
                : null) || 
            null

        const passengerValidation = validateBookingPassengers(rawPassengers, startDate, separateSecondDriver)
        if (!passengerValidation.isValid) {
            return NextResponse.json(
                { error: passengerValidation.error },
                { status: 400 }
            )
        }
        const validatedPassengers = passengerValidation.passengers

        const supabase = getSupabaseAdmin()

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

        // 4. Comprobar disponibilidad frente a reservas activas y bloqueos de calendario
        const now = new Date()

        // 4a. Limpiar bloqueos de checkout_hold expirados antes de comprobar disponibilidad
        await supabase
            .from('blocked_dates')
            .delete()
            .eq('reason', 'checkout_hold')
            .lt('expires_at', now.toISOString())

        // 4b. Comprobar reservas confirmadas o activas
        const { data: activeBookings } = await supabase
            .from('bookings')
            .select('id, start_date, end_date')
            .eq('camper_id', camper.id)
            .in('status', ['confirmed', 'active'])
            .lte('start_date', endDateStr)
            .gte('end_date', startDateStr)

        if (activeBookings && activeBookings.length > 0) {
            return NextResponse.json(
                { error: 'La camper no está disponible en las fechas seleccionadas (reserva confirmada existente)' },
                { status: 409 }
            )
        }

        // 4c. Comprobar bloqueos de calendario vigentes (permanentes o no expirados)
        const { data: blockedDates } = await supabase
            .from('blocked_dates')
            .select('id, start_date, end_date, expires_at, reason')
            .eq('camper_id', camper.id)
            .lte('start_date', endDateStr)
            .gte('end_date', startDateStr)

        const effectiveHolds = (blockedDates || []).filter(b => {
            if (!b.expires_at) return true // Permanente (Redsys o admin)
            return new Date(b.expires_at) > now // Hold temporal vigente
        })

        if (effectiveHolds.length > 0) {
            return NextResponse.json(
                { error: 'La camper no está disponible en las fechas seleccionadas (fechas bloqueadas o en proceso de reserva)' },
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

        // Normalizar y verificar extras seleccionados con la base de datos (seguridad server-side)
        const verifiedExtras: CategorizedExtra[] = []
        if (Array.isArray(rawExtras)) {
            for (const item of rawExtras) {
                const extraId = typeof item === 'string' ? item : (item.id || item.extraId)
                const dbExtra = (dbExtras || []).find((e: any) => e.id === extraId)
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
            extrasSelected: verifiedExtras,
            depositAmount: depositOption === 'flex_1000' ? 1000 : 2000,
        })

        if (breakdown.numNights <= 0) {
            return NextResponse.json({ error: 'Rango de fechas de reserva inválido' }, { status: 400 })
        }

        // 7. Gestión de Usuario (Creación transparente o vinculación por email)
        let userId: string | null = null

        // Comprobar si el usuario ya existe en public.users
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, phone, dni_nie, address, full_name, birth_date, driver_license_issue_date')
            .ilike('email', customerEmail)
            .maybeSingle()

        if (existingUser) {
            // Validar requisitos de conductor también contra el perfil ya guardado si existe
            if (existingUser.birth_date) {
                const uBirth = new Date(existingUser.birth_date)
                if (!isNaN(uBirth.getTime()) && calculateAge(uBirth, startDate) < 25) {
                    return NextResponse.json(
                        { error: 'El perfil de usuario registrado indica una edad inferior a 25 años cumplidos' },
                        { status: 400 }
                    )
                }
            }
            if (existingUser.driver_license_issue_date) {
                const uLicense = new Date(existingUser.driver_license_issue_date)
                if (!isNaN(uLicense.getTime()) && calculateLicenseSeniorityYears(uLicense, startDate) < 2) {
                    return NextResponse.json(
                        { error: 'El perfil de usuario registrado indica una antigüedad de carnet B inferior a 2 años' },
                        { status: 400 }
                    )
                }
            }

            userId = existingUser.id
            const sessionClient = await createServerClient()
            const { data: { user: sessionUser } } = await sessionClient.auth.getUser()
            const canUpdateProfile = sessionUser?.id === existingUser.id
            const updates: Record<string, any> = {}
            if (customerPhone && !existingUser.phone) updates.phone = customerPhone
            if (customerDni && !existingUser.dni_nie) updates.dni_nie = customerDni
            if (customerAddress && !existingUser.address) updates.address = customerAddress
            if (customerName && !existingUser.full_name) updates.full_name = customerName
            if (rawBirthDate && !existingUser.birth_date) updates.birth_date = rawBirthDate
            if (rawLicenseIssueDate && !existingUser.driver_license_issue_date) updates.driver_license_issue_date = rawLicenseIssueDate

            if (canUpdateProfile && Object.keys(updates).length > 0) {
                await supabase.from('users').update(updates).eq('id', userId)
            }
        } else {
            // Usuario nuevo: crear en Supabase Auth
            const secureRandomPassword = `Utopia_${crypto.randomBytes(12).toString("hex")}_2026!`
            try {
                const { data: authCreated } = await supabase.auth.admin.createUser({
                    email: customerEmail,
                    password: secureRandomPassword,
                    email_confirm: true,
                    user_metadata: {
                        full_name: customerName,
                        phone: customerPhone,
                        dni_nie: customerDni,
                        address: customerAddress,
                        birth_date: rawBirthDate || null,
                        driver_license_issue_date: rawLicenseIssueDate || null,
                    },
                })
                if (authCreated?.user) {
                    userId = authCreated.user.id
                }
            } catch (authErr) {
                console.warn('createUser admin error, attempting fallback signUp:', authErr)
            }

            if (!userId) {
                const { data: signUpData } = await supabase.auth.signUp({
                    email: customerEmail,
                    password: secureRandomPassword,
                    options: {
                        data: {
                            full_name: customerName,
                            phone: customerPhone,
                            dni_nie: customerDni,
                            address: customerAddress,
                            birth_date: rawBirthDate || null,
                            driver_license_issue_date: rawLicenseIssueDate || null,
                        },
                    },
                })
                userId = signUpData?.user?.id || null
            }

            // Asegurar sincronización en public.users
            if (userId) {
                const { data: checkPublic } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', userId)
                    .maybeSingle()

                if (!checkPublic) {
                    await supabase.from('users').upsert({
                        id: userId,
                        full_name: customerName || 'Cliente Utopia',
                        email: customerEmail,
                        phone: customerPhone || null,
                        dni_nie: customerDni || null,
                        address: customerAddress || null,
                        birth_date: rawBirthDate || null,
                        driver_license_issue_date: rawLicenseIssueDate || null,
                        role: 'client',
                    })
                }
            }
        }

        if (!userId) {
            console.error('No se pudo resolver o crear el usuario para email:', customerEmail)
            return NextResponse.json({ error: 'Error al asociar cuenta de usuario' }, { status: 500 })
        }

        // 8. Generar identificador de pedido único de Redsys (12 caracteres)
        const orderId = generateRedsysOrderId()

        // 9. Insertar bloqueo provisional de 15 minutos en blocked_dates
        const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
        const { data: holdRecord } = await supabase
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
            if (holdRecord?.id) {
                await supabase.from('blocked_dates').delete().eq('id', holdRecord.id)
            }
            return NextResponse.json({ error: 'Error al registrar la reserva' }, { status: 500 })
        }

        // 11. Generar parámetros firmados de Redsys basados en el cálculo server-side inmutable
        const requestedLocale = body.locale || 'es'
        const redsysFormData = createRedsysPaymentForm({
            amount: breakdown.payableTotal,
            orderId,
            description: `1x Camper ${camper.name || camperSlug.toUpperCase()} - Utopia Van Life`,
            customerName: customerName || 'Cliente Utopia',
            locale: requestedLocale,
        })

        return NextResponse.json({
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
    } catch (error: any) {
        console.error('Checkout API error:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
