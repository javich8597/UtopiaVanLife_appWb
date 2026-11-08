import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { driverFieldError } from '../lib/driverDocuments'

const check = (field: string, value: string) => {
    const data = new FormData()
    data.append(field, value)
    return driverFieldError(data)
}

describe('driverFieldError: lo que el asistente acepta no se rechaza después de pagar', () => {
    for (const name of ['Pérez, Ana', 'Marcel·la Puig', 'Liam O´Connor', 'Liam O`Connor', "Liam O'Connor", 'María José']) {
        it(`admite el nombre ${name}`, () => assert.equal(check('fullName', name), null))
    }

    for (const phone of ['+34 600/000/000', '+34 600 000 000', '‪+34 600 000 000‬', '+1 (415) 555-0100']) {
        it(`admite el teléfono ${JSON.stringify(phone)}`, () => assert.equal(check('phone', phone), null))
    }

    for (const [field, value] of [['fullName', '  '], ['fullName', '--'], ['fullName', '<b>x</b>'], ['dniNie', '     '], ['phone', '      '], ['phone', '611222333 Javi']]) {
        it(`rechaza ${field} = ${JSON.stringify(value)}`, () => assert.notEqual(check(field, value), null))
    }
})
