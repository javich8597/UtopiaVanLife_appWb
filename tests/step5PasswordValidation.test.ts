import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    Step5Customer,
    validateStep5,
    normalizeStep5Draft,
} from '../app/[locale]/reserva/[slug]/types'

describe('Step5 Customer Password & Draft Security', () => {
    const validBaseCustomer: Step5Customer = {
        fullName: 'Carlos García Ruiz',
        dniNie: '12345678Z',
        birthDate: '1990-05-15',
        licenseDate: '2015-06-20',
        email: 'carlos.garcia@example.com',
        phone: '+34600112233',
        phoneCountryCode: '+34',
        address: 'Calle Mayor 12',
        city: 'Palma',
        postalCode: '07001',
        country: 'España',
        travelersCount: 2,
        acceptTerms: true,
        acceptCancellationPolicy: true,
        acceptPrivacy: true,
    }

    it('validateStep5 sin options ni password es válido (retrocompatibilidad para usuarios ya autenticados)', () => {
        const result = validateStep5(validBaseCustomer, 4)
        assert.equal(result.isValid, true)
        assert.equal(result.errors.password, undefined)
    })

    it('validateStep5 con requirePassword: true exige contraseña de al menos 8 caracteres', () => {
        const resultWithoutPassword = validateStep5(validBaseCustomer, 4, { requirePassword: true })
        assert.equal(resultWithoutPassword.isValid, false)
        assert.equal(
            resultWithoutPassword.errors.password,
            'La contraseña debe tener al menos 8 caracteres para acceder a tu reserva'
        )

        const resultShortPassword = validateStep5(
            { ...validBaseCustomer, password: 'short' },
            4,
            { requirePassword: true }
        )
        assert.equal(resultShortPassword.isValid, false)
        assert.equal(
            resultShortPassword.errors.password,
            'La contraseña debe tener al menos 8 caracteres para acceder a tu reserva'
        )
    })

    it('validateStep5 con requirePassword: true acepta contraseñas válidas entre 8 y 128 caracteres', () => {
        const resultValid = validateStep5(
            { ...validBaseCustomer, password: 'PasswordSegura2026!' },
            4,
            { requirePassword: true }
        )
        assert.equal(resultValid.isValid, true)
        assert.equal(resultValid.errors.password, undefined)
    })

    it('validateStep5 rechaza contraseñas mayores a 128 caracteres', () => {
        const longPassword = 'a'.repeat(129)
        const resultLong = validateStep5(
            { ...validBaseCustomer, password: longPassword },
            4,
            { requirePassword: true }
        )
        assert.equal(resultLong.isValid, false)
        assert.equal(resultLong.errors.password, 'La contraseña no puede superar los 128 caracteres')
    })

    it('validateStep5 sin requirePassword pero con password no vacía valida longitud mínima y máxima', () => {
        const resultShort = validateStep5(
            { ...validBaseCustomer, password: '123' },
            4
        )
        assert.equal(resultShort.isValid, false)
        assert.equal(
            resultShort.errors.password,
            'La contraseña debe tener al menos 8 caracteres para acceder a tu reserva'
        )

        const resultValid = validateStep5(
            { ...validBaseCustomer, password: 'ValidPassword123' },
            4
        )
        assert.equal(resultValid.isValid, true)
        assert.equal(resultValid.errors.password, undefined)
    })

    it('normalizeStep5Draft nunca preserva la contraseña en borradores de almacenamiento', () => {
        const draftWithPassword = {
            ...validBaseCustomer,
            password: 'SuperSecretPassword123!',
        }
        const normalized = normalizeStep5Draft(draftWithPassword, 2)
        assert.equal(normalized.password, '', 'La contraseña en el borrador normalizado debe estar vacía')
    })
})
