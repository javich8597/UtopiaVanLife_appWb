import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateContractData } from '../../lib/contracts/contractEngine'
import { secondDriverParticularsValue, secondDriverSupplementText } from '../../lib/contracts/pdfGenerator'
import { secondDriverSupplementText as adminSupplementText } from '../../lib/admin/contractHtml'
import { SECOND_DRIVER_RATE_PER_DAY } from '../../lib/pricing/engine'

/**
 * El 2º conductor del contrato nace de la RESERVA, no del perfil del cliente (hallazgos 1 y 2 de la
 * auditoría del 2º conductor). Antes el bloque se activaba con `userProfile.has_second_driver`, así
 * que un cliente con dos reservas firmaba en la Estándar que iba "incluido sin coste" —falso— y, al
 * revés, un 2º conductor cobrado no salía si el perfil estaba vacío.
 *
 * No prueba Supabase, RLS ni el PDF renderizado: solo los datos del contrato y los textos.
 */

const DAYS = 7
const SUPPLEMENT = SECOND_DRIVER_RATE_PER_DAY * DAYS

const PROFILE_WITH_SECOND_DRIVER = {
    full_name: 'Ana Pérez',
    dni_nie: '12345678Z',
    has_second_driver: true,
    second_driver_name: 'Luis Pérez',
    second_driver_dni: 'AB123456',
    second_driver_license: 'B-99',
}

const PASSENGER_DRIVER = {
    fullName: 'Luis Pérez',
    dniNie: 'AB123456',
    isSecondDriver: true,
    birthDate: '1985-01-01',
    licenseDate: '2010-01-01',
}

const booking = (overrides: Record<string, unknown> = {}) => ({
    id: 'b1',
    start_date: '2099-06-01',
    end_date: '2099-06-08',
    total_price: 735,
    deposit_amount: 2000,
    ...overrides,
})

/** Desglose tal y como lo guarda el checkout con fianza Estándar y 2º conductor */
const standardBreakdown = {
    depositOption: 'standard_2000',
    includesSecondDriver: false,
    secondDriver: true,
    secondDriverRatePerDay: SECOND_DRIVER_RATE_PER_DAY,
    secondDriverSupplement: SUPPLEMENT,
}

describe('Contrato: el 2º conductor sale de la reserva', () => {
    it('una reserva Estándar con suplemento cobrado imprime ese suplemento', () => {
        const data = generateContractData(
            booking({ pricing_breakdown: standardBreakdown, passengers: [PASSENGER_DRIVER] }),
            PROFILE_WITH_SECOND_DRIVER
        )

        assert.ok(data.secondDriver)
        assert.equal(data.secondDriver!.supplement, SUPPLEMENT)
        assert.equal(data.secondDriver!.ratePerDay, SECOND_DRIVER_RATE_PER_DAY)
        assert.equal(data.secondDriver!.included, false)
        assert.equal(data.pricing.depositOption, 'standard_2000')
    })

    it('una reserva sin 2º conductor no lo imprime, aunque el perfil lo tenga guardado', () => {
        const data = generateContractData(
            booking({
                passengers: [{ fullName: 'Ana Ruiz', dniNie: 'X1234567L', isSecondDriver: false }],
                pricing_breakdown: { depositOption: 'standard_2000', includesSecondDriver: false, secondDriver: false, secondDriverSupplement: 0 },
            }),
            PROFILE_WITH_SECOND_DRIVER
        )

        assert.equal(data.secondDriver, undefined)
    })

    it('un 2º conductor en passengers se imprime con el perfil vacío', () => {
        const data = generateContractData(
            booking({ passengers: [PASSENGER_DRIVER], pricing_breakdown: standardBreakdown }),
            { full_name: 'Ana Pérez', has_second_driver: false }
        )

        assert.ok(data.secondDriver)
        assert.equal(data.secondDriver!.fullName, 'Luis Pérez')
        assert.equal(data.secondDriver!.dniNie, 'AB123456')
    })

    it('la antigüedad del carnet del 2º conductor sale de la ficha de la reserva', () => {
        const con = generateContractData(booking({ passengers: [PASSENGER_DRIVER], pricing_breakdown: standardBreakdown }), {})
        const sin = generateContractData(
            booking({
                passengers: [{ fullName: 'Luis Pérez', dniNie: 'AB123456', isSecondDriver: true }],
                pricing_breakdown: standardBreakdown,
            }),
            {}
        )

        assert.ok((con.secondDriver!.yearsHeld ?? 0) >= 15, `antigüedad calculada: ${con.secondDriver!.yearsHeld}`)
        assert.equal(sin.secondDriver!.yearsHeld, null, 'sin fecha de carnet no se inventa antigüedad')
    })

    it('el perfil solo completa lo que la reserva no guarda (el nº de carnet)', () => {
        const data = generateContractData(
            booking({ passengers: [PASSENGER_DRIVER], pricing_breakdown: standardBreakdown }),
            PROFILE_WITH_SECOND_DRIVER
        )

        assert.equal(data.secondDriver!.driverLicenseId, 'B-99')
    })
})

describe('Contrato: "incluido sin coste" solo con la Fianza Flex', () => {
    it('con Flex lo afirma', () => {
        const data = generateContractData(
            booking({
                deposit_amount: 1000,
                passengers: [PASSENGER_DRIVER],
                pricing_breakdown: {
                    depositOption: 'flex_1000', includesSecondDriver: true,
                    secondDriver: true, secondDriverRatePerDay: 0, secondDriverSupplement: 0,
                },
            }),
            PROFILE_WITH_SECOND_DRIVER
        )

        assert.equal(data.pricing.depositOption, 'flex_1000')
        assert.equal(data.secondDriver!.included, true)
        assert.match(secondDriverSupplementText(data.secondDriver!), /incluido sin coste adicional/)
        assert.match(secondDriverParticularsValue(data), /Incluido sin coste en la modalidad de Fianza Flex/)
    })

    it('con Estándar y suplemento 0 por falta de dato no afirma ni cobro ni gratuidad', () => {
        // Reserva anterior al cambio: su pricing_breakdown no trae las claves nuevas
        const data = generateContractData(
            booking({ pricing_breakdown: { basePrice: 100 }, passengers: [PASSENGER_DRIVER] }),
            PROFILE_WITH_SECOND_DRIVER
        )

        assert.equal(data.pricing.depositOption, 'standard_2000')
        assert.equal(data.secondDriver!.supplement, 0)
        assert.equal(data.secondDriver!.included, false)
        const text = secondDriverSupplementText(data.secondDriver!)
        assert.doesNotMatch(text, /sin coste adicional/)
        assert.doesNotMatch(text, /incluido sin coste/i)
        assert.doesNotMatch(secondDriverParticularsValue(data), /sin coste/i)
    })

    it('con Estándar y suplemento cobrado imprime el importe y la tarifa', () => {
        const data = generateContractData(
            booking({ passengers: [PASSENGER_DRIVER], pricing_breakdown: standardBreakdown }),
            PROFILE_WITH_SECOND_DRIVER
        )

        const text = secondDriverSupplementText(data.secondDriver!)
        assert.match(text, new RegExp(`${SUPPLEMENT.toFixed(2)} €`))
        assert.match(text, new RegExp(`${SECOND_DRIVER_RATE_PER_DAY.toFixed(2)} €/día`))
        assert.doesNotMatch(text, /sin coste/i)
    })

    it('sin 2º conductor la fila de condiciones particulares lo dice', () => {
        const data = generateContractData(booking({ passengers: [] }), {})

        assert.equal(data.secondDriver, undefined)
        assert.match(secondDriverParticularsValue(data), /No contratado/)
        assert.match(secondDriverParticularsValue(data), /Solo el arrendatario/)
    })
})

describe('Contrato del cliente y contrato imprimible del admin dicen lo mismo', () => {
    const cases = [
        { supplement: SUPPLEMENT, ratePerDay: SECOND_DRIVER_RATE_PER_DAY, included: false },
        { supplement: 0, ratePerDay: 0, included: true },
        { supplement: 0, ratePerDay: 0, included: false },
    ]

    for (const sd of cases) {
        it(`misma frase con supplement=${sd.supplement} included=${sd.included}`, () => {
            assert.equal(secondDriverSupplementText(sd), adminSupplementText(sd))
        })
    }
})

describe('Plantilla editable del contrato', () => {
    it('lleva el máximo de segundos conductores y su tarifa diaria', async () => {
        const { defaultContractTerms } = await import('../../lib/contracts/templateTypes')

        assert.equal(defaultContractTerms.secondDriverMaxCount, 1)
        assert.equal(defaultContractTerms.secondDriverPricePerDay, SECOND_DRIVER_RATE_PER_DAY)
    })
})
