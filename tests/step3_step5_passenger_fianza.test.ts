import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    validateStep3,
    validateStep5,
    Step3Data,
    Step5Customer,
    BookingPassenger,
} from '../app/[locale]/reserva/[slug]/types'
import { calculatePriceV2 } from '../lib/pricing/engine'

describe('Wizard Step 3 & Step 5 — Fianza Selection & Passengers Suite', () => {
    describe('Step 3: Cobertura, Fianza y Cancelación Validation', () => {
        it('accepts valid Step 3 data with standard cancellation and standard fianza', () => {
            const data: Step3Data = {
                cancellationPolicy: 'standard',
                depositOption: 'standard_2000',
            }
            const res = validateStep3(data)
            assert.equal(res.isValid, true)
        })

        it('accepts valid Step 3 data with flexible cancellation and flex fianza', () => {
            const data: Step3Data = {
                cancellationPolicy: 'flexible',
                depositOption: 'flex_1000',
            }
            const res = validateStep3(data)
            assert.equal(res.isValid, true)
        })

        it('rejects invalid depositOption in Step 3', () => {
            const data: any = {
                cancellationPolicy: 'standard',
                depositOption: 'invalid_500',
            }
            const res = validateStep3(data)
            assert.equal(res.isValid, false)
            assert.ok(res.error)
        })
    })

    describe('Step 5: Multiple Passengers & Second Driver Validations', () => {
        const baseValidCustomer: Step5Customer = {
            fullName: 'Ana Rodríguez Blanco',
            dniNie: '12345678Z',
            birthDate: '1990-05-15', // 36 years old
            licenseDate: '2015-06-20', // > 2 years
            email: 'ana.rodriguez@example.com',
            phone: '+34 654 321 987',
            address: 'Avenida Jaime III, 10',
            city: 'Palma',
            postalCode: '07012',
            country: 'España',
            travelersCount: 2,
            depositOption: 'standard_2000',
            acceptTerms: true,
            acceptPrivacy: true,
        }

        it('validates Step 5 successfully with multiple passengers for standard deposit', () => {
            const customer: Step5Customer = {
                ...baseValidCustomer,
                travelersCount: 3,
                passengers: [
                    {
                        fullName: 'Marcos López Gil',
                        dniNie: '87654321X',
                        birthDate: '1995-08-10',
                    },
                    {
                        fullName: 'Elena Sánchez Mora',
                        dniNie: '71234567W',
                        birthDate: '2001-03-25',
                    },
                ],
            }
            const res = validateStep5(customer, 4)
            assert.equal(res.isValid, true)
            assert.equal(Object.keys(res.errors).length, 0)
        })

        it('flags invalid DNI for Passenger 2', () => {
            const customer: Step5Customer = {
                ...baseValidCustomer,
                travelersCount: 2,
                passengers: [
                    {
                        fullName: 'Marcos López Gil',
                        dniNie: '00000000A', // Bad checksum
                        birthDate: '1995-08-10',
                    },
                ],
            }
            const res = validateStep5(customer, 4)
            assert.equal(res.isValid, false)
            assert.ok(res.errors['passenger_2_dniNie'])
        })

        it('validates Passenger 2 as 2nd driver with Fianza Flex when age >= 25 and license >= 2 years', () => {
            const customer: Step5Customer = {
                ...baseValidCustomer,
                travelersCount: 2,
                depositOption: 'flex_1000',
                passengers: [
                    {
                        fullName: 'Carlos Gómez Ramos',
                        dniNie: '87654321X',
                        birthDate: '1996-04-12', // 30 years old >= 25
                        isSecondDriver: true,
                        licenseDate: '2018-02-10', // 8 years experience >= 2
                        driverLicenseId: 'B-7001234',
                    },
                ],
            }
            const res = validateStep5(customer, 4)
            assert.equal(res.isValid, true)
            assert.equal(Object.keys(res.errors).length, 0)
        })

        it('rejects Passenger 2 as 2nd driver if younger than 25 years', () => {
            const customer: Step5Customer = {
                ...baseValidCustomer,
                travelersCount: 2,
                depositOption: 'flex_1000',
                passengers: [
                    {
                        fullName: 'Joven Conductor',
                        dniNie: '87654321X',
                        birthDate: '2004-01-01', // 22 years old < 25
                        isSecondDriver: true,
                        licenseDate: '2022-01-01',
                    },
                ],
            }
            const res = validateStep5(customer, 4)
            assert.equal(res.isValid, false)
            assert.ok(res.errors['passenger_2_birthDate'])
        })

        it('rejects Passenger 2 as 2nd driver if driving license is less than 2 years', () => {
            const customer: Step5Customer = {
                ...baseValidCustomer,
                travelersCount: 2,
                depositOption: 'flex_1000',
                passengers: [
                    {
                        fullName: 'Novato Conductor',
                        dniNie: '87654321X',
                        birthDate: '1995-01-01', // 31 years old
                        isSecondDriver: true,
                        licenseDate: '2025-11-01', // < 2 years
                    },
                ],
            }
            const res = validateStep5(customer, 4)
            assert.equal(res.isValid, false)
            assert.ok(res.errors['passenger_2_licenseDate'])
        })

        it('validates solo traveler with Fianza Flex and optional 2nd driver', () => {
            const customer: Step5Customer = {
                ...baseValidCustomer,
                travelersCount: 1,
                depositOption: 'flex_1000',
                secondDriverSoloEnabled: true,
                secondDriverSolo: {
                    fullName: 'Lucía Fernández Real',
                    dniNie: '87654321X',
                    birthDate: '1992-07-22',
                    licenseDate: '2014-09-15',
                    driverLicenseId: 'B-7001234',
                },
            }
            const res = validateStep5(customer, 4)
            assert.equal(res.isValid, true)
            assert.equal(Object.keys(res.errors).length, 0)
        })

        it('rejects solo traveler optional 2nd driver if missing mandatory data', () => {
            const customer: Step5Customer = {
                ...baseValidCustomer,
                travelersCount: 1,
                depositOption: 'flex_1000',
                secondDriverSoloEnabled: true,
                secondDriverSolo: {
                    fullName: '',
                    dniNie: 'bad-dni',
                    birthDate: '',
                    licenseDate: '',
                },
            }
            const res = validateStep5(customer, 4)
            assert.equal(res.isValid, false)
            assert.ok(res.errors.secondDriverSolo_fullName)
            assert.ok(res.errors.secondDriverSolo_dniNie)
            assert.ok(res.errors.secondDriverSolo_birthDate)
        })
    })

    describe('Pricing Engine: calculatePriceV2 with +10 €/day Fianza Flex', () => {
        it('calculates Fianza Flex at 10 €/day and sets deposit amount to 1.000 €', () => {
            const breakdown = calculatePriceV2({
                startDate: '2026-06-01',
                endDate: '2026-06-08', // 7 days
                camperBasePrice: 120,
                depositOption: 'flex_1000',
            })

            assert.equal(breakdown.depositOption, 'flex_1000')
            assert.equal(breakdown.depositAmount, 1000)
            assert.equal(breakdown.flexDepositRatePerDay, 10)
            // 7 days * 10 €/day = 70 €
            assert.equal(breakdown.flexDepositSupplement, 70)
            assert.equal(breakdown.includesSecondDriver, true)
        })
    })
})
