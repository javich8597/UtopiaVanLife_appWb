import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { installFlows, step5Payload } from './helpers/qaFlows'
import {
    formatPhoneWithPrefix,
    isValidAddressText,
    isValidPersonName,
    isValidTypedAddress,
    MAX_RAW_TEXT_LENGTH,
    normalizeDriverText,
} from '../lib/driverDocuments'
import { validateEmail, validatePhone, validateStep5 } from '../app/[locale]/reserva/[slug]/types'
import { isValidEmail, normalizeEmail, sanitizeCustomerNotes } from '../lib/booking/checkoutRules'

/** Texto de nombre, teléfono y dirección: una normalización para el paso 5, el checkout y la subida */

describe('normalizeDriverText', () => {
    it('quita marcas invisibles, unifica espacios, guiones y comillas, y compone acentos (NFC)', () => {
        assert.equal(normalizeDriverText('‎Ana María‑Ruiz​ '), 'Ana María-Ruiz')
        assert.equal(normalizeDriverText('O’Connor'), "O'Connor")
        assert.equal(normalizeDriverText('Carrer\tMar\n1'), 'Carrer Mar 1')
    })

    it('no procesa un texto crudo más largo que el límite, aunque normalizado cupiera', () => {
        const padded = `Ana${'​'.repeat(MAX_RAW_TEXT_LENGTH)}`
        assert.equal(normalizeDriverText(padded), null)
        assert.equal(isValidPersonName(padded), false)
    })
})

describe('Dirección', () => {
    it('rechaza controles de dirección del texto en vez de quitarlos', () => {
        for (const mark of ['‮', '⁦', '‏', '؜']) {
            assert.equal(isValidAddressText(`Calle ${mark}Mayor 1`), false, JSON.stringify(mark))
            assert.equal(isValidTypedAddress(`Calle ${mark}Mayor 1`), false, JSON.stringify(mark))
        }
    })

    it('admite hasta 300 caracteres normalizados y rechaza otros controles', () => {
        assert.equal(isValidAddressText('a'.repeat(300)), true)
        assert.equal(isValidAddressText('a'.repeat(301)), false)
        assert.equal(isValidAddressText('Calle\u0000 1'), false)
        assert.equal(isValidTypedAddress('Calle\u0000 1'), false)
    })

    it('en el paso 5 y el checkout un tabulador pegado es un espacio; en la subida, tal cual, no vale', () => {
        assert.equal(isValidTypedAddress('Carrer\tMar 1'), true)
        assert.equal(isValidAddressText('Carrer\tMar 1'), false)
        assert.equal(isValidAddressText(normalizeDriverText('Carrer\tMar 1')!), true)
    })

    it('el paso 5 mide la dirección completa (calle, ciudad, CP y país) y lo dice', () => {
        const customer = { address: 'Carrer de la Mar '.repeat(17).trim(), city: 'Palma', postalCode: '07001', country: 'España' }

        const { errors } = validateStep5(customer as never)

        assert.match(errors.address, /dirección completa .* no puede superar 300 caracteres: ahora tiene 310/)
    })

    it('el paso 5 rechaza una dirección con controles de dirección del texto', () => {
        const { errors } = validateStep5({ address: 'Calle ‮Mayor 1', city: 'Palma', postalCode: '07001', country: 'España' } as never)

        assert.match(errors.address, /caracteres no válidos/)
    })
})

describe('Teléfono con prefijo', () => {
    it('no repite el prefijo aunque el + venga tras un espacio raro o una marca invisible', () => {
        for (const phone of [' +34 611 222 333', '‪+34 611 222 333‬', '‎+34 611 222 333']) {
            assert.equal(formatPhoneWithPrefix(phone, '+34'), '+34 611 222 333')
        }
        assert.equal(formatPhoneWithPrefix('611 222 333', '+49'), '+49 611 222 333')
    })

    it('el paso 5 valida lo que se guardará, con el prefijo elegido', () => {
        assert.equal(validatePhone('611 222 333', '+34').isValid, true)
        assert.match(validatePhone('6 1 1 2 2 2 3 3 3 6 1 1 2 2 2', '+34').error!, /con el prefijo de país, no puede superar 30 caracteres/)
        assert.match(validatePhone('611222333611222', '+34').error!, /con el prefijo de país, debe tener entre 8 y 15 dígitos/)
    })
})

describe('Checkout: valida y guarda normalizado', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        flows = installFlows()
        console.error = () => {}
        console.warn = () => {}
    })
    afterEach(() => { flows.fake.restore(); Object.assign(console, silenced) })

    it('guarda nombre, teléfono y dirección normalizados', async () => {
        const { status, json } = await flows.checkout(step5Payload({}, {
            fullName: 'Ana‑María Ruiz', phone: '‪+34 600 000 000‬', address: 'Carrer\tMar 1',
        }))
        assert.equal(status, 200, json.error)

        const saved = flows.fake.tables.bookings[0]
        assert.equal(saved.customer_name, 'Ana-María Ruiz')
        assert.equal(saved.customer_phone, '+34 600 000 000')
        assert.equal(saved.customer_address, 'Carrer Mar 1, Palma, 07001, España')
    })

    for (const [label, customer] of [
        ['un nombre con cifras', { fullName: 'Luis Pérez 2' }],
        ['un teléfono con texto', { phone: '611222333 Javi' }],
        ['una dirección completa de más de 300 caracteres', { address: 'a'.repeat(290) }],
        ['una dirección con controles de dirección del texto', { address: 'Calle ‮Mayor 1' }],
    ] as const) {
        it(`rechaza ${label} con 400 y sin crear nada`, async () => {
            const { status } = await flows.checkout(step5Payload({}, customer))

            assert.equal(status, 400)
            assert.equal(flows.fake.tables.bookings.length, 0)
            assert.equal(flows.fake.tables.blocked_dates.length, 0)
        })
    }
})

describe('Dirección: caracteres que no son texto imprimible', () => {
    it('los separadores de línea y de párrafo Unicode se convierten en espacio', () => {
        assert.equal(normalizeDriverText('Calle Mayor 1'), 'Calle Mayor 1')
        assert.equal(isValidTypedAddress('Calle Mayor 1'), true)
    })

    for (const [label, value] of [
        ['uso privado', 'Calle  1'],
        ['uso privado de plano suplementario', 'Calle \u{F0000} 1'],
        ['sustituto alto suelto', 'Calle \ud800 1'],
        ['sustituto bajo suelto', 'Calle \udc00 1'],
        ['no-carácter U+FFFE', 'Calle ￾ 1'],
        ['no-carácter U+FFFF', 'Calle ￿ 1'],
        ['no-carácter U+FDD0', 'Calle ﷐ 1'],
        ['no-carácter U+1FFFF', 'Calle \u{1FFFF} 1'],
    ] as const) {
        it(`rechaza ${label} en la subida, en el paso 5 y en el checkout`, () => {
            assert.equal(isValidAddressText(value), false)
            assert.equal(isValidTypedAddress(value), false)
        })
    }

    it('un emoji o un carácter de otro plano válido sí se admite', () => {
        assert.equal(isValidAddressText('Calle del Sol \u{1F31E} 1'), true)
    })
})

describe('Notas del cliente: límite en bytes UTF-8', () => {
    it('corta a 2.000 bytes aunque sean menos de 2.000 caracteres', () => {
        const notes = sanitizeCustomerNotes('ñ'.repeat(2000))
        assert.equal(new TextEncoder().encode(notes).length, 2000)
        assert.equal(notes, 'ñ'.repeat(1000))
    })

    it('no parte un carácter de 4 bytes', () => {
        const notes = sanitizeCustomerNotes(`${'a'.repeat(1998)}\u{1F31E}`)
        assert.equal(notes, 'a'.repeat(1998))
    })

    it('el texto corto no cambia', () => {
        assert.equal(sanitizeCustomerNotes('Llegamos tarde'), 'Llegamos tarde')
    })
})

describe('Checkout: documento, acompañantes y viajeros', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        flows = installFlows()
        console.error = () => {}
        console.warn = () => {}
    })
    afterEach(() => { flows.fake.restore(); Object.assign(console, silenced) })

    const expectRejected = async (label: string, overrides: Record<string, unknown>, customer: Record<string, unknown>) => {
        const { status, json } = await flows.checkout(step5Payload(overrides, customer))
        assert.equal(status, 400, `${label}: ${status} ${json.error}`)
        assert.equal(flows.fake.tables.bookings.length, 0)
        assert.equal(flows.fake.tables.blocked_dates.length, 0)
    }

    it('rechaza un documento que no es texto o no sigue el patrón de la subida, con 400', async () => {
        await expectRejected('número', {}, { dniNie: 12345678 })
        await expectRejected('objeto', {}, { dniNie: { a: 1 } })
        await expectRejected('símbolos', {}, { dniNie: '1234<script>' })
    })

    it('guarda el documento normalizado', async () => {
        const { status, json } = await flows.checkout(step5Payload({}, { dniNie: '‪12345678Z‬' }))
        assert.equal(status, 200, json.error)
        assert.equal(flows.fake.tables.bookings[0].customer_dni, '12345678Z')
    })

    it('rechaza el nombre de un acompañante que no pasa la regla de nombres', async () => {
        await expectRejected('acompañante', {}, { passengers: [{ fullName: 'Juan & Ana', dniNie: 'X1234567L' }] })
    })

    it('guarda el nombre del acompañante normalizado', async () => {
        const { status, json } = await flows.checkout(step5Payload({}, {
            travelersCount: 2, passengers: [{ fullName: 'Luis‑María Ruiz', dniNie: 'X1234567L' }],
        }))
        assert.equal(status, 200, json.error)
        assert.equal(flows.fake.tables.bookings[0].passengers[0].fullName, 'Luis-María Ruiz')
    })

    it('no admite más acompañantes que plazas tiene la camper (NEO: 3)', async () => {
        const passenger = (dniNie: string) => ({ fullName: 'Luis Ruiz', dniNie })
        await expectRejected('3 acompañantes', {}, { travelersCount: 3, passengers: [passenger('X1234567L'), passenger('12345678Z'), passenger('AB123456')] })
        await expectRejected('lista enorme', {}, { passengers: Array.from({ length: 500 }, (_, i) => passenger(`AB${100000 + i}`)) })
    })

    for (const travelersCount of [0, -1, 2.5, 4, 'dos', 1e9]) {
        it(`rechaza travelersCount = ${JSON.stringify(travelersCount)}`, async () => {
            await expectRejected(String(travelersCount), {}, { travelersCount })
        })
    }

    it('admite de 1 a 3 viajeros en NEO', async () => {
        for (const travelersCount of [1, 3]) {
            flows.fake.tables.bookings.length = 0
            flows.fake.tables.blocked_dates.length = 0
            const { status, json } = await flows.checkout(step5Payload({}, { travelersCount }))
            assert.equal(status, 200, `${travelersCount}: ${json.error}`)
        }
    })
})

describe('Email: el paso 5 y el checkout usan la misma regla', () => {
    const cases: Array<[string, boolean]> = [
        ['ana@example.com', true],
        ['Ana.Perez+viaje@mail.example.es', true],
        ["o'connor@example.ie", true],
        ['ana@mi-dominio.com', true],
        ['ana!x@example.com', false],
        ['ana%x@example.com', false],
        ['ana@-ex.com', false],
        ['ana@ex-.com', false],
        ['ana@example', false],
        [`${'a'.repeat(250)}@example.com`, false],
    ]
    for (const [email, valid] of cases) {
        it(`${JSON.stringify(email.length > 40 ? `${email.slice(0, 12)}…` : email)}: ${valid ? 'pasa' : 'no pasa'} en los dos`, () => {
            assert.equal(validateEmail(email).isValid, valid, 'paso 5')
            assert.equal(isValidEmail(normalizeEmail(email)), valid, 'checkout')
        })
    }
})

describe('Paso 5: nombres de acompañantes y segundo conductor con la regla del checkout', () => {
    const base = { travelersCount: 2, depositOption: 'standard_2000' }

    it('rechaza el nombre de un acompañante con símbolos y lo dice', () => {
        const { errors } = validateStep5({ ...base, passengers: [{ fullName: 'Juan & Ana', dniNie: 'X1234567L' }] } as never)
        assert.match(errors.passenger_2_fullName, /solo puede contener letras/)
    })

    it('admite un nombre de acompañante con guion tipográfico o apóstrofo', () => {
        const { errors } = validateStep5({ ...base, passengers: [{ fullName: 'Ana‑María O’Connor', dniNie: 'X1234567L' }] } as never)
        assert.equal(errors.passenger_2_fullName, undefined)
    })

    it('rechaza el nombre del segundo conductor con cifras', () => {
        const { errors } = validateStep5({
            travelersCount: 1, depositOption: 'flex_1000', secondDriverSoloEnabled: true,
            secondDriverSolo: { fullName: 'Luis Pérez 2', dniNie: 'X1234567L', birthDate: '1980-01-01', licenseDate: '2000-01-01' },
        } as never)
        assert.match(errors.secondDriverSolo_fullName, /solo puede contener letras/)
    })
})

describe('Checkout: segundo conductor y viajeros', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn }
    const SOLO = { fullName: 'Luis Ruiz', dniNie: 'X1234567L', birthDate: '1980-01-01', licenseDate: '2000-01-01', driverLicenseId: 'B-0099001' }

    beforeEach(() => {
        flows = installFlows()
        console.error = () => {}
        console.warn = () => {}
    })
    afterEach(() => { flows.fake.restore(); Object.assign(console, silenced) })

    it('con 1 viajero y Flex guarda el 2º conductor solo como conductor autorizado', async () => {
        const { status, json } = await flows.checkout(step5Payload({ depositOption: 'flex_1000' }, {
            depositOption: 'flex_1000', travelersCount: 1, passengers: [], secondDriverSoloEnabled: true, secondDriverSolo: SOLO,
        }))

        assert.equal(status, 200, json.error)
        const [driver] = flows.fake.tables.bookings[0].passengers
        assert.equal(driver.isSecondDriver, true)
        assert.equal(driver.birthDate, '1980-01-01')
    })

    // El bloque "solo" solo se ve con 1 viajero: con 2 o más, lo que envíe una pestaña antigua se ignora
    it('con 2 viajeros ignora el 2º conductor solo que envíe una pestaña antigua', async () => {
        const { status, json } = await flows.checkout(step5Payload({ depositOption: 'flex_1000' }, {
            depositOption: 'flex_1000', travelersCount: 2, passengers: [], secondDriverSoloEnabled: true,
            secondDriverSolo: { ...SOLO, birthDate: '' },
        }))

        assert.equal(status, 200, json.error)
        assert.deepEqual(flows.fake.tables.bookings[0].passengers, [])
    })

    // Con fianza Estándar el 2º conductor ya no se ignora: se cobra a 5 €/día y se le exigen sus fechas
    it('con 1 viajero y fianza Estándar guarda el 2º conductor y cobra su suplemento', async () => {
        const { status, json } = await flows.checkout(step5Payload({}, {
            travelersCount: 1, passengers: [], secondDriverSoloEnabled: true, secondDriverSolo: SOLO,
        }))

        assert.equal(status, 200, json.error)
        const saved = flows.fake.tables.bookings[0]
        const [driver] = saved.passengers
        assert.equal(driver.isSecondDriver, true)
        assert.equal(json.breakdown.secondDriverRatePerDay, 5)
        assert.equal(json.breakdown.secondDriverSupplement, 35)
        assert.equal(saved.num_pax, 1, 'el 2º conductor solo no ocupa plaza de viajero')
    })

    it('con fianza Estándar rechaza un 2º conductor solo sin fecha de nacimiento', async () => {
        const { status } = await flows.checkout(step5Payload({}, {
            travelersCount: 1, passengers: [], secondDriverSoloEnabled: true, secondDriverSolo: { ...SOLO, birthDate: '' },
        }))

        assert.equal(status, 400)
        assert.equal(flows.fake.tables.bookings.length, 0)
    })

    for (const [field, value] of [
        ['birthDate', '1980/01/01 (texto)'],
        ['birthDate', '01-01-1980'],
        ['licenseDate', '2000/01/01 (texto)'],
        ['licenseDate', '2000-13-01'],
    ] as const) {
        it(`rechaza ${field} = ${JSON.stringify(value)} del 2º conductor con 400`, async () => {
            const { status } = await flows.checkout(step5Payload({ depositOption: 'flex_1000' }, {
                depositOption: 'flex_1000', travelersCount: 1, passengers: [], secondDriverSoloEnabled: true, secondDriverSolo: { ...SOLO, [field]: value },
            }))

            assert.equal(status, 400)
            assert.equal(flows.fake.tables.bookings.length, 0)
        })
    }

    it('rechaza más acompañantes que viajeros menos el titular', async () => {
        const { status, json } = await flows.checkout(step5Payload({}, {
            travelersCount: 1, passengers: [{ fullName: 'Luis Ruiz', dniNie: 'X1234567L' }],
        }))

        assert.equal(status, 400)
        assert.match(json.error, /1 viajero y 1 acompañante/)
        assert.equal(flows.fake.tables.bookings.length, 0)
    })
})

describe('Paso 5: lo que envía del 2º conductor solo', () => {
    const source = readFileSync('app/[locale]/reserva/[slug]/Step5Checkout.tsx', 'utf8')

    it('solo lo envía con su bloque visible (1 viajero, con cualquier fianza)', () => {
        assert.match(source, /const soloSecondDriverVisible = currentTravelersCount === 1\b/)
        assert.match(source, /secondDriverSoloEnabled: soloSecondDriverVisible && Boolean\(customer\.secondDriverSoloEnabled\)/)
        assert.match(source, /secondDriverSolo: soloSecondDriverVisible && customer\.secondDriverSoloEnabled \? customer\.secondDriverSolo : undefined/)
        assert.match(source, /\{soloSecondDriverVisible && \(/)
        assert.doesNotMatch(source, /secondDriverSolo: customer\.secondDriverSolo,/)
    })

    it('envía tantas fichas de acompañante como viajeros menos el titular', () => {
        assert.match(source, /passengers: \(customer\.passengers \|\| \[\]\)\.slice\(0, Math\.max\(0, currentTravelersCount - 1\)\)/)
    })
})
