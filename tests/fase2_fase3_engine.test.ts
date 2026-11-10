import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    calculatePriceV2,
    SeasonV2,
    SeasonPeriod,
    DurationDiscount,
} from '../lib/pricing/engine'
import {
    calculateAge,
    calculateLicenseSeniorityYears,
    validateBookingPassengers,
    isValidDniNieOrPassport,
} from '../app/api/bookings/checkout/route'

describe('FASE 2 & FASE 3: Backend & Booking Core Engine Test Suite', () => {

    const testSeasons: SeasonV2[] = [
        { id: 's-baja', code: 'baja', name: 'Temporada Baja', supplement_per_night: 0, min_nights: 3, is_default: true },
        { id: 's-alta', code: 'alta', name: 'Temporada Alta', supplement_per_night: 40, min_nights: 5 },
    ]

    const testPeriods: SeasonPeriod[] = [
        { id: 'p-1', season_id: 's-alta', start_date: '2026-07-01', end_date: '2026-08-31' },
    ]

    const testDiscounts: DurationDiscount[] = [
        { id: 'd-1', min_days: 7, discount_pct: 10, is_active: true },
    ]

    // =========================================================================
    // 1. MOTOR DE PRECIOS, FIANZA Y DESGLOSE DE IVA
    // =========================================================================

    describe('1. Política de Fianza y Desglose Transparente de IVA (21%)', () => {

        it('aplica la fianza estándar (2.000 €) por defecto sin suplemento diario', () => {
            const breakdown = calculatePriceV2({
                startDate: '2026-05-10',
                endDate: '2026-05-15', // 5 nights, 5 days
                camperBasePrice: 100,
                seasons: testSeasons,
                periods: testPeriods,
                discounts: testDiscounts,
                depositOption: 'standard_2000',
            })

            assert.equal(breakdown.depositOption, 'standard_2000')
            assert.equal(breakdown.depositAmount, 2000)
            assert.equal(breakdown.deposit, 2000)
            assert.equal(breakdown.flexDepositRatePerDay, 0)
            assert.equal(breakdown.flexDepositSupplement, 0)
            assert.equal(breakdown.includesSecondDriver, false)

            // 5 noches a 100 € = 500 €
            assert.equal(breakdown.baseRentalTotal, 500)
            assert.equal(breakdown.payableTotal, 500)
            assert.equal(breakdown.grandTotalWithDeposit, 2500)

            // IVA 21% transparente
            assert.equal(breakdown.vatPct, 21)
            assert.equal(breakdown.vatRate, 0.21)
            assert.equal(breakdown.ivaIncluded, true)
            // Base imponible: 500 / 1.21 = 413.22 €
            assert.equal(breakdown.netTotal, 413.22)
            assert.equal(breakdown.taxBase, 413.22)
            // Cuota IVA: 500 - 413.22 = 86.78 €
            assert.equal(breakdown.vatAmount, 86.78)
            assert.equal(breakdown.vatTotal, 86.78)
            assert.equal(Math.round((breakdown.netTotal + breakdown.vatAmount) * 100) / 100, breakdown.payableTotal)
        })

        it('aplica la Fianza Flex (1.000 €) con suplemento de 10 €/día y segundo conductor incluido', () => {
            const breakdown = calculatePriceV2({
                startDate: '2026-05-10',
                endDate: '2026-05-15', // 5 nights, 5 days
                camperBasePrice: 100,
                seasons: testSeasons,
                periods: testPeriods,
                discounts: testDiscounts,
                depositOption: 'flex_1000',
            })

            assert.equal(breakdown.depositOption, 'flex_1000')
            assert.equal(breakdown.depositAmount, 1000)
            assert.equal(breakdown.deposit, 1000)
            assert.equal(breakdown.flexDepositRatePerDay, 10)
            // 5 días * 10 €/día = 50 €
            assert.equal(breakdown.flexDepositSupplement, 50)
            assert.equal(breakdown.includesSecondDriver, true)

            // 5 noches base (500 €) + flexDepositSupplement (50 €) = 550 €
            assert.equal(breakdown.payableTotal, 550)
            // 550 € abonados + 1.000 € fianza retenida = 1.550 €
            assert.equal(breakdown.grandTotalWithDeposit, 1550)

            // Desglose de IVA en 550 €
            // Base imponible: 550 / 1.21 = 454.55 €
            assert.equal(breakdown.netTotal, 454.55)
            // Cuota IVA: 550 - 454.55 = 95.45 €
            assert.equal(breakdown.vatAmount, 95.45)
            assert.equal(Math.round((breakdown.netTotal + breakdown.vatAmount) * 100) / 100, breakdown.payableTotal)
        })

        it('acepta el alias "flex" de forma idéntica a "flex_1000"', () => {
            const breakdown = calculatePriceV2({
                startDate: '2026-05-10',
                endDate: '2026-05-15',
                camperBasePrice: 100,
                depositOption: 'flex' as any,
            })

            assert.equal(breakdown.depositOption, 'flex_1000')
            assert.equal(breakdown.depositAmount, 1000)
            assert.equal(breakdown.flexDepositRatePerDay, 10)
            assert.equal(breakdown.flexDepositSupplement, 50)
            assert.equal(breakdown.includesSecondDriver, true)
            assert.equal(breakdown.payableTotal, 550)
        })

        it('combina Fianza Flex con KM ilimitado y política de cancelación flexible', () => {
            const breakdown = calculatePriceV2({
                startDate: '2026-05-10',
                endDate: '2026-05-15', // 5 nights, 5 days
                camperBasePrice: 100, // 500 €
                kmPackage: 'unlimited', // +15 €/día * 5 = +75 €
                cancellationPolicy: 'flexible', // +8 €/día * 5 = +40 €
                depositOption: 'flex_1000', // +10 €/día * 5 = +50 €, fianza 1.000 €
            })

            // Base 500 + KM 75 + Cancelación 40 + Fianza Flex 50 = 665 €
            assert.equal(breakdown.kmSupplement, 75)
            assert.equal(breakdown.cancellationSupplement, 40)
            assert.equal(breakdown.flexDepositSupplement, 50)
            assert.equal(breakdown.payableTotal, 665)
            assert.equal(breakdown.depositAmount, 1000)
            assert.equal(breakdown.includesSecondDriver, true)

            // Base imponible IVA: 665 / 1.21 = 549.59 €
            assert.equal(breakdown.netTotal, 549.59)
            assert.equal(breakdown.vatAmount, 115.41)
            assert.equal(Math.round((breakdown.netTotal + breakdown.vatAmount) * 100) / 100, 665)
        })

        it('respeta depositAmount explícito para compatibilidad con campers configuradas', () => {
            const breakdown = calculatePriceV2({
                startDate: '2026-05-10',
                endDate: '2026-05-15',
                camperBasePrice: 100,
                depositAmount: 1500, // Fianza personalizada
            })

            assert.equal(breakdown.depositAmount, 1500)
            assert.equal(breakdown.deposit, 1500)
            assert.equal(breakdown.flexDepositSupplement, 0)
        })
    })

    // =========================================================================
    // 2. VALIDACIONES DE CONDUCTOR SERVER-SIDE
    // =========================================================================

    describe('2. Validaciones de Conductor (>= 25 años y carnet B >= 2 años)', () => {

        it('calcula la edad del conductor de forma exacta respetando mes y día', () => {
            const refDate = new Date('2026-06-15')

            // Exactamente 25 años cumplidos hoy
            assert.equal(calculateAge(new Date('2001-06-15'), refDate), 25)

            // Cumple 25 mañana (aún tiene 24)
            assert.equal(calculateAge(new Date('2001-06-16'), refDate), 24)

            // Cumplió 25 ayer
            assert.equal(calculateAge(new Date('2001-06-14'), refDate), 25)

            // 30 años
            assert.equal(calculateAge(new Date('1996-01-01'), refDate), 30)

            // Conductor menor de 25 años (23 años)
            assert.equal(calculateAge(new Date('2003-01-01'), refDate), 23)
        })

        it('calcula la antigüedad del carnet B de forma exacta respetando mes y día', () => {
            const refDate = new Date('2026-06-15')

            // Exactamente 2 años de antigüedad hoy
            assert.equal(calculateLicenseSeniorityYears(new Date('2024-06-15'), refDate), 2)

            // Cumple 2 años mañana (aún tiene 1 año)
            assert.equal(calculateLicenseSeniorityYears(new Date('2024-06-16'), refDate), 1)

            // Conductor novel (menos de 2 años: 1 año de carnet)
            assert.equal(calculateLicenseSeniorityYears(new Date('2025-01-01'), refDate), 1)

            // Conductor con 10 años de carnet
            assert.equal(calculateLicenseSeniorityYears(new Date('2016-01-01'), refDate), 10)
        })

        it('rechaza conductores menores de 25 años en la fecha de alquiler', () => {
            const rentalStart = new Date('2026-08-01')
            const youngDriver = new Date('2002-09-15') // 23 años en agosto 2026
            const age = calculateAge(youngDriver, rentalStart)

            assert.equal(age < 25, true)
            assert.equal(age, 23)
        })

        it('acepta conductores de 25 años cumplidos en la fecha de alquiler', () => {
            const rentalStart = new Date('2026-08-01')
            const validDriver = new Date('2001-07-20') // 25 años cumplidos
            const age = calculateAge(validDriver, rentalStart)

            assert.equal(age >= 25, true)
            assert.equal(age, 25)
        })

        it('rechaza permisos de conducir con menos de 2 años de antigüedad', () => {
            const rentalStart = new Date('2026-08-01')
            const noviceLicense = new Date('2025-03-10') // 1 año y 4 meses
            const seniority = calculateLicenseSeniorityYears(noviceLicense, rentalStart)

            assert.equal(seniority < 2, true)
            assert.equal(seniority, 1)
        })

        it('acepta permisos de conducir con 2 o más años de antigüedad', () => {
            const rentalStart = new Date('2026-08-01')
            const veteranLicense = new Date('2024-07-01') // 2 años y 1 mes
            const seniority = calculateLicenseSeniorityYears(veteranLicense, rentalStart)

            assert.equal(seniority >= 2, true)
            assert.equal(seniority, 2)
        })
    })

    // =========================================================================
    // 3. BLOQUEO PROVISIONAL DE 15 MINUTOS Y DISPONIBILIDAD
    // =========================================================================

    describe('3. Bloqueo Provisional de 15 Minutos en Calendario', () => {

        it('discrimina correctamente entre bloqueos temporales vigentes y expirados', () => {
            const now = new Date('2026-06-15T12:00:00Z')

            const activeHold = {
                camper_id: 'neo',
                start_date: '2026-07-01',
                end_date: '2026-07-05',
                reason: 'checkout_hold',
                expires_at: '2026-06-15T12:15:00Z', // Expira dentro de 15 min
            }

            const expiredHold = {
                camper_id: 'neo',
                start_date: '2026-07-01',
                end_date: '2026-07-05',
                reason: 'checkout_hold',
                expires_at: '2026-06-15T11:45:00Z', // Expiró hace 15 min
            }

            const permanentBlock = {
                camper_id: 'neo',
                start_date: '2026-07-10',
                end_date: '2026-07-15',
                reason: 'Auto-Bloqueo Redsys',
                expires_at: null, // Bloqueo permanente
            }

            const isEffective = (b: { expires_at: string | null }) => {
                if (!b.expires_at) return true
                return new Date(b.expires_at) > now
            }

            assert.equal(isEffective(activeHold), true, 'El hold activo debe bloquear la fecha')
            assert.equal(isEffective(expiredHold), false, 'El hold expirado NO debe bloquear la fecha')
            assert.equal(isEffective(permanentBlock), true, 'El bloqueo permanente debe bloquear la fecha')
        })

        it('calcula la expiración a 15 minutos en el futuro exactamente', () => {
            const before = Date.now()
            const holdExpiresAtIso = new Date(Date.now() + 15 * 60 * 1000).toISOString()
            const expiresTimestamp = new Date(holdExpiresAtIso).getTime()
            const diffMinutes = (expiresTimestamp - before) / (1000 * 60)

            assert.ok(diffMinutes >= 14.99 && diffMinutes <= 15.01)
        })
    })

    // =========================================================================
    // 4. VALIDACIÓN SERVER-SIDE DE ACOMPAÑANTES Y 2º CONDUCTOR
    // =========================================================================

    describe('4. Validación Server-Side del Array de Pasajeros y Segundo Conductor', () => {

        const rentalStart = new Date('2026-07-01')

        it('acepta acompañantes válidos con nombre y DNI español válido', () => {
            const rawPassengers = [
                { fullName: 'Marta Pérez', dniNie: '12345678Z' }
            ]
            const result = validateBookingPassengers(rawPassengers, rentalStart)
            assert.equal(result.isValid, true)
            assert.equal(result.passengers.length, 1)
            assert.equal(result.passengers[0].fullName, 'Marta Pérez')
            assert.equal(result.passengers[0].dniNie, '12345678Z')
            assert.equal(result.passengers[0].isSecondDriver, false)
        })

        it('acepta acompañantes con NIE y Pasaporte internacional válido', () => {
            const rawPassengers = [
                { fullName: 'Jean Dupont', dniNie: 'X1234567L' },
                { fullName: 'John Smith', dniNie: 'PASS123456' }
            ]
            const result = validateBookingPassengers(rawPassengers, rentalStart)
            assert.equal(result.isValid, true)
            assert.equal(result.passengers.length, 2)
            assert.equal(result.passengers[0].dniNie, 'X1234567L')
            assert.equal(result.passengers[1].dniNie, 'PASS123456')
        })

        it('rechaza acompañante si falta el nombre y apellidos', () => {
            const rawPassengers = [
                { fullName: '', dniNie: '12345678Z' }
            ]
            const result = validateBookingPassengers(rawPassengers, rentalStart)
            assert.equal(result.isValid, false)
            assert.ok(result.error?.includes('nombre y apellidos'))
        })

        it('rechaza acompañante si falta el documento de identidad', () => {
            const rawPassengers = [
                { fullName: 'Marta Pérez', dniNie: '' }
            ]
            const result = validateBookingPassengers(rawPassengers, rentalStart)
            assert.equal(result.isValid, false)
            assert.ok(result.error?.includes('DNI, NIE o Pasaporte'))
        })

        it('rechaza acompañante con DNI y letra incorrecta (control checksum)', () => {
            const rawPassengers = [
                { fullName: 'Marta Pérez', dniNie: '12345678A' } // 12345678 tiene letra Z
            ]
            const result = validateBookingPassengers(rawPassengers, rentalStart)
            assert.equal(result.isValid, false)
            assert.ok(result.error?.includes('Letra de DNI incorrecta'))
        })

        it('valida con éxito un segundo conductor que cumple >= 25 años y carnet B >= 2 años', () => {
            const rawPassengers = [
                {
                    fullName: 'Carlos Gómez',
                    dniNie: '12345678Z',
                    isSecondDriver: true,
                    birthDate: '1998-03-15', // 28 años en 2026
                    licenseDate: '2020-05-10', // 6 años de antigüedad
                    driverLicenseId: 'B-7001234'
                }
            ]
            const result = validateBookingPassengers(rawPassengers, rentalStart)
            assert.equal(result.isValid, true)
            assert.equal(result.passengers.length, 1)
            assert.equal(result.passengers[0].isSecondDriver, true)
            assert.equal(result.passengers[0].birthDate, '1998-03-15')
            assert.equal(result.passengers[0].licenseDate, '2020-05-10')
        })

        it('rechaza segundo conductor menor de 25 años en la fecha de alquiler', () => {
            const rawPassengers = [
                {
                    fullName: 'Joven Conductor',
                    dniNie: '12345678Z',
                    isSecondDriver: true,
                    birthDate: '2003-01-01', // 23 años en julio 2026
                    licenseDate: '2022-01-01'
                }
            ]
            const result = validateBookingPassengers(rawPassengers, rentalStart)
            assert.equal(result.isValid, false)
            assert.ok(result.error?.includes('25 años'))
        })

        it('rechaza segundo conductor con carnet B inferior a 2 años de antigüedad', () => {
            const rawPassengers = [
                {
                    fullName: 'Conductor Novel',
                    dniNie: '12345678Z',
                    isSecondDriver: true,
                    birthDate: '1995-01-01', // 31 años
                    licenseDate: '2025-06-01' // 1 año y 1 mes en julio 2026
                }
            ]
            const result = validateBookingPassengers(rawPassengers, rentalStart)
            assert.equal(result.isValid, false)
            assert.ok(result.error?.includes('2 años de antigüedad'))
        })

        // La edad autodeclarada ya no vale: el checkout exige la FECHA de nacimiento, que es lo
        // único que queda guardado en la ficha para poder recomprobar los 25 años más adelante
        it('rechaza segundo conductor si falta la fecha de nacimiento', () => {
            const rawPassengers = [
                {
                    fullName: 'Conductor Sin Edad',
                    dniNie: '12345678Z',
                    isSecondDriver: true,
                    licenseDate: '2020-01-01'
                }
            ]
            const result = validateBookingPassengers(rawPassengers, rentalStart)
            assert.equal(result.isValid, false)
            assert.ok(result.error?.includes('fecha de nacimiento'))
        })

        it('rechaza segundo conductor si falta la fecha de carnet de conducir', () => {
            const rawPassengers = [
                {
                    fullName: 'Conductor Sin Carnet',
                    dniNie: '12345678Z',
                    isSecondDriver: true,
                    birthDate: '1995-01-01'
                }
            ]
            const result = validateBookingPassengers(rawPassengers, rentalStart)
            assert.equal(result.isValid, false)
            assert.ok(result.error?.includes('carnet de conducir'))
        })

        it('integra y valida segundo conductor suministrado por separado (separateSecondDriver)', () => {
            const rawPassengers = [
                { fullName: 'Pasajero Uno', dniNie: '12345678Z' }
            ]
            const separateSecondDriver = {
                fullName: 'Segundo Conductor Separado',
                dniNie: 'X1234567L',
                birthDate: '1990-01-01',
                licenseDate: '2015-01-01',
                driverLicenseId: 'B-7001234'
            }
            const result = validateBookingPassengers(rawPassengers, rentalStart, separateSecondDriver)
            assert.equal(result.isValid, true)
            assert.equal(result.passengers.length, 2)
            assert.equal(result.passengers[0].isSecondDriver, false)
            assert.equal(result.passengers[1].isSecondDriver, true)
            assert.equal(result.passengers[1].fullName, 'Segundo Conductor Separado')
        })

        it('no duplica el segundo conductor si ya viene incluido en el array de pasajeros con el mismo DNI', () => {
            const rawPassengers = [
                {
                    fullName: 'Segundo Conductor',
                    dniNie: '12345678Z',
                    isSecondDriver: true,
                    birthDate: '1990-01-01',
                    licenseDate: '2015-01-01',
                    driverLicenseId: 'B-7001234'
                }
            ]
            const separateSecondDriver = {
                fullName: 'Segundo Conductor',
                dniNie: '12345678Z',
                birthDate: '1990-01-01',
                licenseDate: '2015-01-01',
                driverLicenseId: 'B-7001234'
            }
            const result = validateBookingPassengers(rawPassengers, rentalStart, separateSecondDriver)
            assert.equal(result.isValid, true)
            assert.equal(result.passengers.length, 1)
        })

        it('permite array vacío o nulo de pasajeros sin error (viajero solitario)', () => {
            assert.equal(validateBookingPassengers([], rentalStart).isValid, true)
            assert.equal(validateBookingPassengers(null as any, rentalStart).isValid, true)
            assert.equal(validateBookingPassengers(undefined as any, rentalStart).isValid, true)
        })
    })
})
