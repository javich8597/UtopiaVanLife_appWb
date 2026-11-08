import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { cents, installFlows, JPEG, NEO, step5Payload } from './helpers/qaFlows'
import { POST as payPost } from '../app/api/bookings/[id]/pay/route'
import { POST as uploadPost } from '../app/api/upload-driver-docs/route'
import { createCheckoutAccessCookie } from '../lib/checkoutAccess'
import { driverFieldError, formatPhoneWithPrefix } from '../lib/driverDocuments'
import { FILES_BUDGET_BYTES, MAX_REQUEST_BYTES, prepareDocuments } from '../lib/documentUploadBudget'
import { validateDniNieOrPassport, validatePhone, validateStep5 } from '../app/[locale]/reserva/[slug]/types'
import { generateContractData } from '../lib/contracts/contractEngine'
import { generateOfficialContractPdfBlob } from '../lib/contracts/pdfGenerator'
import { calculatePrice, calculatePriceV2 } from '../lib/pricing/engine'

/**
 * Verificación independiente del cierre: reintento de pago simultáneo, multipart real de la subida,
 * validadores frente al paso 5 y fianza en el contrato. Los casos con `todo` reproducen un fallo abierto.
 */

const field = (name: string, value: string) => {
    const data = new FormData()
    data.append(name, value)
    return driverFieldError(data)
}

/** Se llama a validateStep5 real, que es lo que comprueba el botón de pagar */
const step5AcceptsName = (fullName: string) => !validateStep5({ fullName } as never).errors.fullName
const step5AcceptsPhone = (phone: string) => !validateStep5({ phone } as never).errors.phone

describe('Validadores: lo pedido en el encargo', () => {
    for (const name of ['Pérez, Ana', 'Marcel·la Puig', 'O´Connor']) {
        it(`admite el nombre ${name}`, () => assert.equal(field('fullName', name), null))
    }

    for (const phone of ['+34 600 000 000', '+34 600/000/000', '‪+34 600 000 000‬']) {
        it(`admite el teléfono ${JSON.stringify(phone)}`, () => {
            assert.equal(validatePhone(phone).isValid, true)
            assert.equal(field('phone', phone), null)
        })
    }

    for (const [name, value] of [['fullName', '  '], ['fullName', '--'], ['dniNie', '     ']]) {
        it(`rechaza ${name} = ${JSON.stringify(value)}`, () => assert.notEqual(field(name, value), null))
    }

    it('todo documento válido en el paso 5 pasa en la ruta', () => {
        for (const doc of ['12345678Z', 'X1234567L', 'AB1234', 'A1B2C3D4E5F6G7H']) {
            assert.equal(validateDniNieOrPassport(doc).isValid, true, doc)
            assert.equal(field('dniNie', doc), null, doc)
        }
    })
})

/** Teléfonos y nombres pegados de otras apps: [valor, ¿debe pasar?]. Paso 5 y subida tienen que coincidir */
const PHONE_CASES: Array<[string, boolean]> = [
    ['611222333 Javi', false],
    ['+34 611 222 333 (móvil)', false],
    ['Tel: 611222333', false],
    ['+34 611 222 333', true],
    ['+34 611 222 333', true],
    ['+34 611 222 333', true],
    ['+34‑611‑222‑333', true],
    ['+34–611–222–333', true],
    ['‎+34 611 222 333', true],
    ['⁦+34 611 222 333⁩', true],
]

const NAME_CASES: Array<[string, boolean]> = [
    ['María (Mari) López', false],
    ['Ana "Mari" López', false],
    ['Juan & Ana', false],
    ['Luis Pérez 2', false],
    ['Ana Pérez', true],
    ['O‘Connor Liam', true],
    ['O’Connor Liam', true],
    ['Ana‐María Ruiz', true],
]

describe('Validadores: el paso 5 y la subida dicen lo mismo', () => {
    for (const [phone, valid] of PHONE_CASES) {
        it(`teléfono ${JSON.stringify(phone)}: ${valid ? 'pasa' : 'no pasa'} en los dos`, () => {
            assert.equal(step5AcceptsPhone(phone), valid, 'paso 5')
            assert.equal(field('phone', phone) === null, valid, 'subida')
        })
    }

    for (const [name, valid] of NAME_CASES) {
        it(`nombre ${JSON.stringify(name)}: ${valid ? 'pasa' : 'no pasa'} en los dos`, () => {
            assert.equal(step5AcceptsName(name), valid, 'paso 5')
            assert.equal(field('fullName', name) === null, valid, 'subida')
        })
    }
})

describe('Paso 5 → checkout → subida: lo que se guarda', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        flows = installFlows()
        console.error = () => {}
        console.warn = () => {}
    })
    afterEach(() => { flows.fake.restore(); Object.assign(console, silenced) })

    /** La expresión real de Step5Checkout.tsx; la función que llama vive en lib/driverDocuments.ts */
    const formatPhone = (phone: string, phoneCountryCode = '+34'): string => {
        const source = readFileSync('app/[locale]/reserva/[slug]/Step5Checkout.tsx', 'utf8')
        const expression = source.match(/const formattedPhone = ([\s\S]+?)\n\s*\n/)
        assert.ok(expression, 'formattedPhone ya no está en Step5Checkout.tsx')
        return new Function('customer', 'formatPhoneWithPrefix', `return ${expression[1]}`)({ phone, phoneCountryCode }, formatPhoneWithPrefix)
    }

    it('un móvil normal llega con un solo prefijo y pasa en la subida', () => {
        const stored = formatPhone('611 222 333')

        assert.equal(stored, '+34 611 222 333')
        assert.equal(field('phone', stored), null)
    })

    for (const phone of [' +34 611 222 333', ' +34 611 222 333', '‪+34 611 222 333‬', '‎+34 611 222 333']) {
        it(`QA-C2 ${JSON.stringify(phone)} no debe guardarse con el prefijo repetido`, () => {
            assert.equal(step5AcceptsPhone(phone), true)
            assert.equal(formatPhone(phone).replace(/\D/g, ''), '34611222333')
        })
    }

    /**
     * Implicación de punta a punta, con las rutas reales: si el botón del paso 5 (validateStep5 sobre el
     * formulario entero) acepta, el checkout acepta, la vuelta de Redsys rellena /checkout/success con lo
     * guardado, la subida lo acepta tal cual y guarda exactamente lo mismo que guardó el checkout.
     * Si el paso 5 rechaza, la implicación no exige nada; los casos de límite comprueban además que el
     * checkout también rechaza, para que el paso 5 no sea el único filtro.
     */
    const RAW_CUSTOMER: Row = {
        ...step5Payload().customer as Row,
        phone: '600 000 000',
        phoneCountryCode: '+34',
        acceptTerms: true,
        acceptPrivacy: true,
    }

    /** Lo que Step5Checkout.tsx (handleSubmitPayment) hace con el formulario antes del fetch */
    const sentCustomer = (raw: Row): Row => ({
        ...raw,
        fullName: String(raw.fullName).trim(),
        email: String(raw.email).trim().toLowerCase(),
        phone: formatPhone(String(raw.phone), String(raw.phoneCountryCode)),
        dniNie: String(raw.dniNie).trim().toUpperCase(),
        address: String(raw.address).trim(),
        city: String(raw.city).trim(),
        postalCode: String(raw.postalCode).trim(),
        country: String(raw.country).trim(),
    })

    const PROFILE_COLUMNS = { fullName: 'full_name', phone: 'phone', address: 'address' } as const
    const BOOKING_COLUMNS = { fullName: 'customer_name', phone: 'customer_phone', address: 'customer_address' } as const

    /**
     * Recorre paso 5 → checkout → webhook → verify-payment → subida. Devuelve 'rejected' si el paso 5 rechaza.
     * Las aserciones llevan el valor en el mensaje para poder reproducir cualquier contraejemplo.
     */
    async function stepFiveImpliesUpload(override: Row): Promise<'rejected' | 'accepted'> {
        const raw = { ...RAW_CUSTOMER, ...override }
        if (!validateStep5(raw as never).isValid) return 'rejected'
        const where = JSON.stringify(override)

        const { status, json, jar } = await flows.checkout(step5Payload({}, sentCustomer(raw)))
        assert.equal(status, 200, `checkout rechaza lo que el paso 5 acepta: ${where} → ${json.error}`)
        const booking = flows.fake.tables.bookings.find(b => b.id === json.bookingId)!
        const before = { ...flows.fake.tables.users.find(u => u.id === booking.user_id)! }
        for (const key of Object.keys(PROFILE_COLUMNS) as Array<keyof typeof PROFILE_COLUMNS>) {
            assert.equal(before[PROFILE_COLUMNS[key]], booking[BOOKING_COLUMNS[key]], `perfil y reserva difieren en ${key}: ${where}`)
        }

        assert.equal((await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))).status, 200)
        const back = await flows.verify(json.orderId, jar)
        assert.equal(back.json.isPaid, true, where)

        // Lo que hace /checkout/success: rellena con lo devuelto y envía sin tocarlo
        const form = new FormData()
        form.append('fullName', back.json.booking.customerName)
        form.append('dniNie', back.json.booking.customerDni)
        form.append('driverLicenseId', 'B-1234')
        form.append('driverLicenseIssueDate', '2015-01-01')
        form.append('driverLicenseExpiryDate', '2035-01-01')
        form.append('address', back.json.booking.customerAddress)
        form.append('phone', back.json.booking.customerPhone)
        for (const name of ['dni_front', 'dni_back', 'license_front', 'license_back']) form.append(name, JPEG(), `${name}.jpg`)

        const sent = await flows.upload(form, jar, json.orderId)
        assert.equal(sent.status, 200, `la subida rechaza lo guardado por el checkout: ${where} → ${sent.json.error}`)

        const after = flows.fake.tables.users.find(u => u.id === booking.user_id)!
        for (const column of Object.values(PROFILE_COLUMNS)) {
            assert.equal(after[column], before[column], `la subida guarda ${column} distinto del checkout: ${where}`)
        }
        return 'accepted'
    }

    /** Ningún caso se da por bueno sin que la cadena llegue a ejecutarse alguna vez */
    async function implicationHolds(overrides: Row[], minAccepted: number) {
        let accepted = 0
        for (const override of overrides) {
            if (await stepFiveImpliesUpload(override) === 'accepted') accepted++
            flows.fake.restore()
            flows = installFlows()
        }
        assert.ok(accepted >= minAccepted, `solo ${accepted} casos aceptados por el paso 5: la implicación se cumpliría en vacío`)
    }

    const TRICKY = [' ', ' ', ' ', '‑', '–', '‎', '⁦', '⁩', '‪', '‬',
        '​', '﻿', '­', '\t', '　', '·', '´', '’', '‘', ',', '.', '-', '/', '(', ')', 'é']
    let seed = 20261108
    const random = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32
    const anyOf = <T>(list: T[]) => list[Math.floor(random() * list.length)]

    it('QA-C3 si el paso 5 acepta un teléfono, checkout y subida lo aceptan y guardan lo mismo', async () => {
        const curated: Row[] = [
            // El caso original: el paso 5 lo rechaza (33 caracteres con prefijo) y el checkout también
            { phone: '6 1 1 2 2 2 3 3 3 6 1 1 2 2 2' }, { phone: '6 1 1 - 2 2 2 - 3 3 3 - 4 4' },
            { phone: '611 222 333' }, { phone: '611 222 333' }, { phone: '611 222 333' },
            { phone: '+34‑611‑222‑333' }, { phone: '+34–611–222–333' },
            { phone: '‎+34 611 222 333' }, { phone: '⁦+34 611 222 333⁩' }, { phone: '‪+34 611 222 333‬' },
            { phone: ' +34 611 222 333' }, { phone: '612345678901', phoneCountryCode: '+351' },
            { phone: '(0) 20 7946 0958', phoneCountryCode: '+44' }, { phone: '611222333 Javi' },
        ]
        const digits = () => String(Math.floor(random() * 10))
        const generated = Array.from({ length: 40 }, () => ({
            phoneCountryCode: anyOf(['+34', '+33', '+49', '+44', '+351', '+353', '+1']),
            phone: (random() < 0.3 ? `${anyOf(TRICKY)}+34` : '')
                + Array.from({ length: 6 + Math.floor(random() * 10) }, () => digits() + (random() < 0.35 ? anyOf(TRICKY) : '')).join(''),
        }))

        await implicationHolds([...curated, ...generated], 15)
    })

    // El primero se rechaza por dígitos (17 con el prefijo); el segundo tiene 13 dígitos y 27 caracteres,
    // y solo con el prefijo (31) supera el máximo: es el caso que exige validar lo que se guarda
    for (const phone of ['6 1 1 2 2 2 3 3 3 6 1 1 2 2 2', '6 1 1 - 2 2 2 - 3 3 3 - 4 4']) {
        it(`QA-C3 el teléfono ${JSON.stringify(phone)} que el paso 5 rechaza tampoco pasa en el checkout`, async () => {
            const raw = { ...RAW_CUSTOMER, phone }
            assert.ok(validateStep5(raw as never).errors.phone)

            assert.equal((await flows.checkout(step5Payload({}, sentCustomer(raw)))).status, 400)
        })
    }

    it('si el paso 5 acepta un nombre, checkout y subida lo aceptan y guardan lo mismo', async () => {
        const curated: Row[] = ['Marcel·la Puig', 'O´Connor Liam', 'Pérez, Ana', 'Ana Pérez', 'José Ruiz',
            'Ana‑María Ruiz', 'Ana–María', '‎Ana Pérez', 'O’Connor', 'María (Mari) López'].map(fullName => ({ fullName }))
        const generated = Array.from({ length: 30 }, () => ({
            fullName: `Ana${Array.from({ length: Math.floor(random() * 6) }, () => anyOf(TRICKY) + anyOf(['a', 'ñ', 'Ø', ''])).join('')} Ruiz`,
        }))

        await implicationHolds([...curated, ...generated], 15)
    })

    const LIMIT_SUFFIX = ', Palma, 07001, España'
    const streetOf = (length: number) => `${'Carrer de la Mar '.repeat(20).slice(0, length - 1)}x`

    it('QA-C4 si el paso 5 acepta una dirección, checkout y subida la aceptan y guardan lo mismo', async () => {
        const curated: Row[] = [
            // 'larga': 310 caracteres con ciudad, código postal y país. El paso 5 la rechaza
            { address: 'Carrer de la Mar '.repeat(17).trim() },
            { address: 'Carrer\tMar 1' },
            { address: streetOf(300 - LIMIT_SUFFIX.length) },
            // 301 tecleados, 300 una vez compuesta la é: cuenta lo que se guarda
            { address: `${streetOf(300 - LIMIT_SUFFIX.length - 1)}é` },
            { address: ' Gran Vía 28, 4º B' }, { address: 'C/ Major 3 · 2n 1a' },
        ]
        const generated = Array.from({ length: 30 }, () => ({
            address: `Calle${Array.from({ length: Math.floor(random() * 8) }, () => anyOf(TRICKY) + anyOf(['a', 'º', '3', ''])).join('')} 1`,
            city: anyOf(['Palma', 'Sóller', ' Inca ', 'Sant‑Llorenç']),
        }))

        await implicationHolds([...curated, ...generated], 15)

        // El límite se mide sobre lo guardado y lo guarda entero
        await stepFiveImpliesUpload({ address: streetOf(300 - LIMIT_SUFFIX.length) })
        assert.equal(flows.fake.tables.bookings[0].customer_address.length, 300)
    })

    for (const [label, address] of [
        ['larga (310)', 'Carrer de la Mar '.repeat(17).trim()],
        ['de 301', streetOf(301 - LIMIT_SUFFIX.length)],
    ] as const) {
        it(`QA-C4 la dirección ${label} que el paso 5 rechaza tampoco pasa en el checkout`, async () => {
            const raw = { ...RAW_CUSTOMER, address }
            assert.match(validateStep5(raw as never).errors.address ?? '', /no puede superar 300/)

            assert.equal((await flows.checkout(step5Payload({}, sentCustomer(raw)))).status, 400)
        })
    }

    /**
     * Paso 5 → checkout. Si el paso 5 acepta el formulario entero, el checkout responde 200; `check`
     * comprueba lo guardado. Devuelve 'rejected' si el paso 5 rechaza. Reinstala el simulador al acabar.
     */
    async function stepFiveImpliesCheckout(
        override: Row,
        options: { seats?: number; payload?: Row; check?: (booking: Row, user: Row | undefined, raw: Row) => void } = {},
    ): Promise<'rejected' | 'accepted'> {
        const raw = { ...RAW_CUSTOMER, ...override }
        try {
            if (!validateStep5(raw as never, options.seats).isValid) return 'rejected'
            const where = JSON.stringify(override)

            const { status, json } = await flows.checkout(step5Payload(options.payload ?? {}, sentCustomer(raw)))
            assert.equal(status, 200, `checkout rechaza lo que el paso 5 acepta: ${where} → ${json.error}`)
            const booking = flows.fake.tables.bookings.find(b => b.id === json.bookingId)!
            options.check?.(booking, flows.fake.tables.users.find(u => u.id === booking.user_id), raw)
            return 'accepted'
        } finally {
            flows.fake.restore()
            flows = installFlows()
        }
    }

    const emailCase = (email: string) => stepFiveImpliesCheckout({ email }, {
        check: (booking, user, raw) => {
            const expected = String(raw.email).trim().toLowerCase()
            assert.equal(booking.customer_email, expected, `reserva: ${JSON.stringify(raw.email)}`)
            assert.equal(user?.email, expected, `perfil: ${JSON.stringify(raw.email)}`)
        },
    })

    it('QA-C7 si el paso 5 acepta un email, el checkout lo acepta y guarda lo mismo', async () => {
        const curated = [
            // Los del fallo original: ahora el paso 5 los rechaza
            'ana!x@example.com', 'ana%x@example.com', `${'a'.repeat(250)}@example.com`, 'a{b}@example.com', 'ana@-ex.com', 'ana@ex-.com',
            ' Ana.Perez+viaje@Example.COM ', ' ana@example.com ', "o'connor@example.ie", 'ana_x@sub.example.co.uk',
            'ana@xn--espaa-rta.es', 'Kate@example.com', 'ana@example', 'ana@ex_ample.com', 'ana..x@example.com',
            `${'a'.repeat(242)}@example.com`, `${'a'.repeat(243)}@example.com`,
        ]
        const LOCAL = ['a', 'Z', '0', '.', '_', '+', "'", '-', '!', '%', 'ñ', ' ', ' ', '​']
        const DOMAIN = ['example.com', 'ex-ample.es', '-ex.com', 'ex-.com', 'EXAMPLE.ES', 'a.b.c.de', 'ex..com', 'xn--a.com']
        const generated = Array.from({ length: 40 }, () =>
            `${Array.from({ length: 1 + Math.floor(random() * 8) }, () => anyOf(LOCAL)).join('')}@${anyOf(DOMAIN)}`)

        let accepted = 0
        for (const email of [...curated, ...generated]) {
            if (await emailCase(email) === 'accepted') accepted++
        }
        assert.ok(accepted >= 15, `solo ${accepted} emails aceptados: la implicación se cumpliría en vacío`)
    })

    for (const [email, label] of [
        ['ana!x@example.com', 'signos fuera de la regla'],
        ['ana@-ex.com', 'dominio que empieza por guion'],
        [`${'a'.repeat(243)}@example.com`, '255 caracteres'],
    ] as const) {
        it(`QA-C7 el email con ${label} lo rechazan el paso 5 y el checkout`, async () => {
            const raw = { ...RAW_CUSTOMER, email }
            assert.ok(validateStep5(raw as never).errors.email)

            assert.equal((await flows.checkout(step5Payload({}, sentCustomer(raw)))).status, 400)
        })
    }

    it('QA-C7 un email de 254 caracteres pasa en los dos', async () => {
        assert.equal(await emailCase(`${'a'.repeat(242)}@example.com`), 'accepted')
    })

    /** Acompañantes y segundo conductor tal como los deja el asistente */
    const companion = (fullName: string, dniNie: string): Row => ({ fullName, dniNie, birthDate: '', isSecondDriver: false, licenseDate: '' })
    const SECOND_DRIVER: Row = { fullName: 'Luis Pérez', dniNie: 'AB123456', birthDate: '1985-01-01', licenseDate: '2010-01-01' }

    it('reservas válidas con acompañantes y documentos extranjeros siguen pasando en el checkout', async () => {
        const cases: Array<[Row, Parameters<typeof stepFiveImpliesCheckout>[1]]> = [
            // NEO (3 plazas): el asistente llena hasta 2 acompañantes
            [{ travelersCount: 3, passengers: [companion('Ana Ruiz', 'X1234567L'), companion('Marcel·la Puig', 'C01X00T47')] }, {}],
            [{ travelersCount: 2, passengers: [companion("O'Connor Liam", '123456789')] }, {}],
            [{ travelersCount: 1, passengers: [] }, {}],
            // Flex con segundo conductor marcado entre los acompañantes
            [{ travelersCount: 2, depositOption: 'flex_1000', passengers: [{ ...SECOND_DRIVER, isSecondDriver: true }] }, { payload: { depositOption: 'flex_1000' } }],
            // Flex y una sola persona con segundo conductor aparte
            [{ travelersCount: 1, depositOption: 'flex_1000', passengers: [], secondDriverSoloEnabled: true, secondDriverSolo: SECOND_DRIVER }, { payload: { depositOption: 'flex_1000' } }],
            // Pasaportes y documentos extranjeros del titular (el asistente los envía en mayúsculas)
            [{ dniNie: 'ab1234' }, {}], [{ dniNie: 'A1B2C3D4E5F6G7H' }, {}], [{ dniNie: ' x1234567l ' }, {}], [{ dniNie: 'YA1234567' }, {}],
        ]
        for (const [override, options] of cases) {
            assert.equal(await stepFiveImpliesCheckout(override, options), 'accepted', JSON.stringify(override))
        }
    })

    it('travelersCount ausente o en texto no tumba una reserva válida', async () => {
        for (const travelersCount of [undefined, '2', ' 2 ']) {
            const customer = { ...step5Payload().customer as Row, travelersCount }
            if (travelersCount === undefined) delete customer.travelersCount
            const { status, json } = await flows.checkout({ ...step5Payload(), customer })
            assert.equal(status, 200, `${JSON.stringify(travelersCount)} → ${json.error}`)
            assert.equal(flows.fake.tables.bookings[0].num_pax, 2)
            flows.fake.restore()
            flows = installFlows()
        }
    })

    // QA-C8 y QA-C9 envían a propósito el segundo conductor oculto de un borrador antiguo (sentCustomer no lo
    // filtra): comprueban que el checkout lo ignora fuera de 1 viajero con Flex, aunque llegue de una pestaña vieja
    it('QA-C8 un segundo conductor oculto de antes no impide pagar una camper llena', async () => {
        flows.fake.restore()
        flows = installFlows({ campers: [{ ...NEO, id: 'c2', slug: 'space', name: 'SPACE', specs: { seats: 2 } }] })
        const stale = { travelersCount: 2, depositOption: 'flex_1000', passengers: [companion('Ana Ruiz', 'X1234567L')], secondDriverSoloEnabled: true, secondDriverSolo: SECOND_DRIVER }
        assert.equal(validateStep5({ ...RAW_CUSTOMER, ...stale } as never, 2).isValid, true, 'el paso 5 lo acepta')

        const { status, json } = await flows.checkout(step5Payload({ camperSlug: 'space', depositOption: 'flex_1000' }, sentCustomer({ ...RAW_CUSTOMER, ...stale })))

        assert.equal(status, 200, json.error)
    })

    // El bloque del 2º conductor "solo" ya se ve con cualquier fianza, así que con Estándar sus datos
    // dejan de estar ocultos: a medias los rechazan el paso 5 y el checkout, y completos se cobran
    it('QA-C9 un segundo conductor a medias con fianza Estándar lo rechazan el paso 5 y el checkout', async () => {
        const stale = { travelersCount: 1, depositOption: 'standard_2000', passengers: [], secondDriverSoloEnabled: true, secondDriverSolo: { fullName: 'Luis', dniNie: '', birthDate: '', licenseDate: '' } }
        const { errors } = validateStep5({ ...RAW_CUSTOMER, ...stale } as never)
        assert.ok(errors.secondDriverSolo_dniNie, 'el paso 5 pide su documento')
        assert.ok(errors.secondDriverSolo_birthDate, 'el paso 5 pide su fecha de nacimiento')

        const { status } = await flows.checkout(step5Payload({}, sentCustomer({ ...RAW_CUSTOMER, ...stale })))

        assert.equal(status, 400)
        assert.equal(flows.fake.tables.bookings.length, 0)
    })

    /** Lo que envía Step5Checkout desde la tercera tanda: solo las fichas visibles de acompañantes y del 2º conductor */
    const sentByStep5 = (raw: Row): Row => {
        const sent = sentCustomer(raw)
        const deposit = raw.depositOption ?? 'standard_2000'
        const soloVisible = raw.travelersCount === 1 && deposit === 'flex_1000'
        return {
            ...sent,
            passengers: (raw.passengers ?? [])
                .slice(0, Math.max(0, raw.travelersCount - 1))
                .map((p: Row) => (deposit === 'flex_1000' ? p : { ...p, isSecondDriver: false })),
            secondDriverSoloEnabled: soloVisible && Boolean(raw.secondDriverSoloEnabled),
            secondDriverSolo: soloVisible && raw.secondDriverSoloEnabled ? raw.secondDriverSolo : undefined,
        }
    }

    it('cierre: NEO y SPACE, de 1 a 3 viajeros, Flex y Estándar, con y sin 2º conductor pasan en el checkout', async () => {
        const campers = [
            { camper: { ...NEO, specs: { seats: 3 } }, slug: 'neo', seats: 3 },
            { camper: { ...NEO, id: 'c2', slug: 'space', name: 'SPACE', specs: { seats: 2 } }, slug: 'space', seats: 2 },
        ]
        const people = [companion('Ana Ruiz', 'X1234567L'), companion('Marcel·la Puig', 'C01X00T47')]
        let checked = 0
        for (const { camper, slug, seats } of campers) {
            for (let travelers = 1; travelers <= seats; travelers++) {
                for (const deposit of ['standard_2000', 'flex_1000'] as const) {
                    for (const withDriver of [false, true]) {
                        if (withDriver && deposit !== 'flex_1000') continue
                        const passengers = people.slice(0, travelers - 1).map(p => ({ ...p }))
                        if (withDriver && travelers > 1) Object.assign(passengers[0], { isSecondDriver: true, birthDate: '1985-01-01', licenseDate: '2010-01-01' })
                        const raw = {
                            ...RAW_CUSTOMER, travelersCount: travelers, depositOption: deposit, passengers,
                            secondDriverSoloEnabled: withDriver && travelers === 1, secondDriverSolo: SECOND_DRIVER,
                        }
                        const where = JSON.stringify({ slug, travelers, deposit, withDriver })
                        assert.equal(validateStep5(raw as never, seats).isValid, true, `paso 5: ${where}`)

                        flows.fake.restore()
                        flows = installFlows({ campers: [camper] })
                        const { status, json } = await flows.checkout(step5Payload({ camperSlug: slug, depositOption: deposit }, sentByStep5(raw)))
                        assert.equal(status, 200, `${where} → ${json.error}`)
                        const saved = flows.fake.tables.bookings[0]
                        assert.equal(saved.num_pax, travelers, where)
                        assert.equal(saved.deposit_amount, deposit === 'flex_1000' ? 1000 : 2000, where)
                        assert.equal(saved.passengers.length, travelers - 1 + (withDriver && travelers === 1 ? 1 : 0), where)
                        assert.equal(saved.passengers.filter((p: Row) => p.isSecondDriver).length, withDriver ? 1 : 0, where)
                        checked++
                    }
                }
            }
        }
        // NEO: 3 viajeros × (Estándar, Flex, Flex con 2º conductor); SPACE: 2 × 3
        assert.equal(checked, 15)
    })

    // El 2º conductor vale con las dos fianzas: con Flex va incluido y con Estándar se cobra 5 €/día.
    // Al pasar de Flex a Estándar la ficha marcada se conserva y el suplemento entra en el cobro;
    // si le faltan sus fechas obligatorias (edad >= 25 y carnet B >= 2 años), el paso 5 y el checkout lo rechazan
    it('QA-C10 un acompañante marcado como 2º conductor se cobra a 5 €/día al pasar de Flex a Estándar', async () => {
        const driver = { ...companion('Luis Pérez', 'AB123456'), isSecondDriver: true, birthDate: '1985-01-01', licenseDate: '2010-01-01' }
        const stale = { travelersCount: 2, depositOption: 'standard_2000', passengers: [driver] }
        assert.equal(validateStep5({ ...RAW_CUSTOMER, ...stale } as never).isValid, true, 'el paso 5 lo acepta')

        const sinDriver = await flows.checkout(step5Payload({}, sentCustomer({ ...RAW_CUSTOMER, travelersCount: 2, passengers: [companion('Luis Pérez', 'AB123456')] })))
        assert.equal(sinDriver.status, 200, sinDriver.json.error)
        const baseTotal = sinDriver.json.breakdown.payableTotal

        flows.fake.restore()
        flows = installFlows()
        const { status, json } = await flows.checkout(step5Payload({}, sentCustomer({ ...RAW_CUSTOMER, ...stale })))

        assert.equal(status, 200, json.error)
        const saved = flows.fake.tables.bookings[0]
        assert.equal(saved.passengers[0].isSecondDriver, true, 'con Estándar también se guarda el 2º conductor')
        // 7 noches con recogida por la tarde y devolución por la mañana = 7 días × 5 €
        assert.equal(json.breakdown.secondDriverRatePerDay, 5)
        assert.equal(json.breakdown.secondDriverSupplement, 35)
        assert.equal(saved.total_price, baseTotal + 35, 'el suplemento se cobra')
        assert.equal(saved.pricing_breakdown.secondDriverSupplement, 35)
    })

    it('QA-C10 sin las fechas obligatorias del 2º conductor con Estándar, el paso 5 y el checkout lo rechazan', async () => {
        const stale = {
            travelersCount: 2, depositOption: 'standard_2000',
            passengers: [{ ...companion('Luis Pérez', 'AB123456'), isSecondDriver: true }],
        }
        const { errors } = validateStep5({ ...RAW_CUSTOMER, ...stale } as never)
        assert.ok(errors.passenger_2_birthDate, 'el paso 5 pide su fecha de nacimiento')
        assert.ok(errors.passenger_2_licenseDate, 'el paso 5 pide su carnet B')

        const { status } = await flows.checkout(step5Payload({}, sentCustomer({ ...RAW_CUSTOMER, ...stale })))

        assert.equal(status, 400)
        assert.equal(flows.fake.tables.bookings.length, 0)
    })

    it('cierre: el enlace de acceso se reintenta si falla y deja de enviarse cuando sale', async () => {
        const linkAlert = /\[PAGO A REVISAR\] No se pudo enviar el enlace de acceso/
        const { json, jar } = await flows.checkout(step5Payload())
        const amount = cents(json.breakdown.payableTotal)
        const booking = () => flows.fake.tables.bookings[0]

        flows.failOtp('Email rate limit exceeded')
        assert.equal((await flows.webhook(json.orderId, amount)).status, 500, 'Redsys debe repetir')
        assert.equal(booking().payment_status, 'paid')
        assert.match(booking().notes, linkAlert)
        assert.equal(flows.otpRequests.length, 1)

        // Mientras falla, cada repetición lo reintenta sin duplicar el aviso
        assert.equal((await flows.webhook(json.orderId, amount)).status, 500)
        assert.equal(booking().notes.match(new RegExp(linkAlert.source, 'g'))?.length, 1)
        assert.equal(flows.otpRequests.length, 2)

        flows.failOtp(null)
        assert.equal((await flows.webhook(json.orderId, amount)).status, 200)
        assert.doesNotMatch(booking().notes, linkAlert)
        assert.match(booking().notes, /\[COBRO REDSYS\] Pedido/)
        assert.equal(flows.otpRequests.length, 3)

        // Enviado: ni otra repetición ni la vuelta a /checkout/success lo envían otra vez
        assert.equal((await flows.webhook(json.orderId, amount)).status, 200)
        const back = await flows.verify(json.orderId, jar, flows.signed(json.orderId, amount))
        assert.equal(back.json.isPaid, true)
        assert.equal(flows.otpRequests.length, 3)
        assert.equal(flows.fake.tables.blocked_dates.filter(b => b.session_id === `redsys_${json.orderId}`).length, 1)
    })

    it('cierre: si el enlace sale a la primera, la reserva pagada no queda con ningún aviso', async () => {
        const { json } = await flows.checkout(step5Payload({}, { notes: 'Llegamos tarde' }))

        assert.equal((await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))).status, 200)

        const saved = flows.fake.tables.bookings[0]
        assert.equal(saved.payment_status, 'paid')
        assert.doesNotMatch(saved.notes, /PAGO A REVISAR/)
        assert.ok(saved.notes.startsWith('Llegamos tarde\n'))
        assert.equal(flows.otpRequests.length, 1)
    })

    it('QA-C6 el checkout debe rechazar lo que el paso 5 rechaza', async () => {
        const { status } = await flows.checkout(step5Payload({}, { fullName: 'María (Mari) López', phone: '611222333 Javi' }))

        assert.equal(status, 400)
    })
})

describe('Reintento de pago simultáneo', () => {
    const OLD_ORDER = '1111oldorder'
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = console.error

    const booking = (overrides: Row = {}): Row => ({
        id: 'b1', user_id: 'u1', camper_id: 'c1', start_date: '2099-06-01', end_date: '2099-06-08',
        status: 'pending', payment_status: 'pending', payment_intent_id: OLD_ORDER,
        notes: 'Llegamos tarde', total_price: 700, customer_name: 'Ana', ...overrides,
    })

    const start = (overrides: Row = {}) => {
        fake = installFakeSupabase({ bookings: [booking(overrides)] })
        fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
    }

    beforeEach(() => { console.error = () => {} })
    afterEach(() => { fake.restore(); console.error = silenced })

    async function pay() {
        const res = await payPost(new Request('http://localhost/api/bookings/b1/pay', { method: 'POST' }), {
            params: Promise.resolve({ id: 'b1' }),
        })
        return { status: res.status, json: await res.json() }
    }

    it('si otro reintento gana entre la lectura y la escritura, este no pisa su pedido', async () => {
        start()
        const winner = '2222ganador'
        const winnerNotes = `Llegamos tarde\n[PEDIDO ANTERIOR] ${OLD_ORDER}`
        fake.onBeforeWrite('bookings', () => {
            fake.tables.bookings[0].payment_intent_id = winner
            fake.tables.bookings[0].notes = winnerNotes
        })

        const { status, json } = await pay()

        assert.equal(status, 409)
        assert.equal(json.form, undefined, 'el perdedor no recibe formulario: su pedido nunca llega a Redsys')
        assert.equal(fake.tables.bookings[0].payment_intent_id, winner)
        assert.equal(fake.tables.bookings[0].notes, winnerNotes)
    })

    it('dos peticiones a la vez: una gana y ningún pedido enviado a Redsys se pierde', async () => {
        start()

        const results = await Promise.all([pay(), pay()])
        const winners = results.filter(r => r.status === 200)
        const row = fake.tables.bookings[0]

        assert.equal(winners.length, 1, JSON.stringify(results.map(r => r.status)))
        assert.equal(row.payment_intent_id, winners[0].json.orderId)
        assert.equal(row.notes, `Llegamos tarde\n[PEDIDO ANTERIOR] ${OLD_ORDER}`)
    })

    it('dos reintentos seguidos conservan los dos pedidos anteriores', async () => {
        start()

        const first = await pay()
        const second = await pay()
        const row = fake.tables.bookings[0]

        assert.equal(first.status, 200)
        assert.equal(second.status, 200)
        assert.equal(row.payment_intent_id, second.json.orderId)
        assert.match(row.notes, new RegExp(`\\[PEDIDO ANTERIOR\\] ${OLD_ORDER}`))
        assert.match(row.notes, new RegExp(`\\[PEDIDO ANTERIOR\\] ${first.json.orderId}`))
    })

    it('con payment_intent_id nulo reintenta y escribe el filtro is.null', async () => {
        start({ payment_intent_id: null, notes: null })

        const { status, json } = await pay()

        assert.equal(status, 200)
        assert.equal(fake.tables.bookings[0].payment_intent_id, json.orderId)
        const [update] = fake.writesTo('bookings')
        assert.equal(update.query.get('payment_intent_id'), 'is.null')
    })

    it('con payment_intent_id nulo y payment_status nulo también', async () => {
        start({ payment_intent_id: null, payment_status: null })

        assert.equal((await pay()).status, 200)
    })

    it('la escritura incluye el pedido leído', async () => {
        start()

        await pay()

        const [update] = fake.writesTo('bookings')
        assert.equal(update.query.get('payment_intent_id'), `eq.${OLD_ORDER}`)
    })
})

describe('Subida: multipart real contra la ruta', () => {
    const ORDER = '1234abcd5678'
    const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({
            // `worstForm` envía hasSecondDriver=true: la reserva tiene que estar viva, pagada y
            // llevar como 2º conductor justamente a esa persona (el documento se compara)
            bookings: [{
                id: 'b1', user_id: 'u1', payment_intent_id: ORDER, payment_status: 'paid',
                status: 'confirmed', start_date: '2099-06-01',
                passengers: [{ fullName: 'Luis Pérez', dniNie: 'A'.repeat(20), isSecondDriver: true }],
            }],
            users: [{ id: 'u1', verification_status: 'not_submitted', full_name: 'Ana' }],
        })
        console.error = () => {}
        console.warn = () => {}
    })
    afterEach(() => { fake.restore(); Object.assign(console, silenced) })

    const jpeg = (size: number, name: string) => {
        const bytes = new Uint8Array(size)
        bytes.set(JPEG)
        return new File([bytes], name, { type: 'image/jpeg' })
    }

    const cookie = () => {
        const { name, value } = createCheckoutAccessCookie(ORDER)!
        return `${name}=${value}`
    }

    /** Peor caso del formulario: textos al límite que admite la ruta y nombres de archivo de 255 bytes */
    function worstForm(fields: string[]) {
        const longName = `${'ñ'.repeat(125)}.jpg`
        const perFile = Math.floor(FILES_BUDGET_BYTES / fields.length)
        const data = new FormData()
        data.append('fullName', 'Á'.repeat(120))
        data.append('dniNie', 'A'.repeat(20))
        data.append('driverLicenseId', 'B'.repeat(30))
        data.append('driverLicenseIssueDate', '2015-01-01')
        data.append('driverLicenseExpiryDate', '2035-01-01')
        data.append('address', 'ñ'.repeat(300))
        data.append('phone', '+34 600 000 000')
        for (const name of fields) data.append(name, jpeg(perFile, longName))
        data.append('hasSecondDriver', 'true')
        data.append('secondDriverFullName', 'Á'.repeat(120))
        data.append('secondDriverDni', 'A'.repeat(20))
        data.append('secondDriverLicense', 'B'.repeat(30))
        return data
    }

    async function encode(data: FormData) {
        const encoded = new Request('http://localhost/', { method: 'POST', body: data })
        return { body: await encoded.arrayBuffer(), type: encoded.headers.get('content-type')! }
    }

    async function send(body: ArrayBuffer, type: string, length: number = body.byteLength) {
        const headers = new Headers({ 'content-type': type, cookie: cookie(), 'content-length': String(length) })
        const res = await uploadPost(new NextRequest(`http://localhost/api/upload-driver-docs?order=${ORDER}`, { method: 'POST', headers, body }))
        return { status: res.status, json: await res.json(), setCookie: res.headers.get('set-cookie') || '' }
    }

    const four = ['dni_front', 'dni_back', 'license_front', 'license_back']
    const six = [...four, 'second_license_front', 'second_license_back']

    for (const [label, fields] of [['4', four], ['6', six]] as const) {
        it(`${label} fotos al límite del presupuesto no pasan de 4,5 MB y la ruta las acepta en una petición`, async () => {
            const { body, type } = await encode(worstForm([...fields]))
            const overhead = body.byteLength - Math.floor(FILES_BUDGET_BYTES / fields.length) * fields.length
            console.log(`[QA] ${label} fotos: cuerpo ${body.byteLength} B, sobrecarga ${overhead} B`)

            assert.ok(body.byteLength <= MAX_REQUEST_BYTES)
            assert.ok(overhead < 20_000)

            const { status, json, setCookie } = await send(body, type)

            assert.equal(status, 200, json.error)
            assert.equal(fake.requests.filter(r => r.path.startsWith('/storage/v1/object/documents/')).length, fields.length)
            assert.match(setCookie, /Max-Age=0/i)
        })
    }

    const textForm = (name: string, value: string) => {
        const data = new FormData()
        data.append('driverLicenseIssueDate', '2015-01-01')
        data.append('driverLicenseExpiryDate', '2035-01-01')
        data.append(name, value)
        return data
    }

    for (const [name, column, cases] of [['phone', 'phone', PHONE_CASES], ['fullName', 'full_name', NAME_CASES]] as const) {
        for (const [value, valid] of cases) {
            it(`${name} ${JSON.stringify(value)}: la ruta da ${valid ? '200' : '400'}`, async () => {
                const before = fake.tables.users[0][column]
                const { body, type } = await encode(textForm(name, value))

                const { status } = await send(body, type)

                assert.equal(status, valid ? 200 : 400)
                if (!valid) assert.equal(fake.tables.users[0][column], before, 'lo rechazado no se guarda')
            })
        }
    }

    it('QA-C5 un nombre aceptado no debe romper la línea del contrato en el PDF', async () => {
        const { body, type } = await encode(textForm('fullName', 'Ana‑María Ruiz'))
        assert.equal((await send(body, type)).status, 200)

        const saved = fake.tables.users[0].full_name
        const data = generateContractData(
            { id: 'b1', start_date: '2099-06-01', end_date: '2099-06-08', total_price: 700, deposit_amount: 2000, camper: { name: 'NEO', slug: 'neo' } } as never,
            { full_name: saved, dni_nie: '12345678Z', phone: '600000000', address: 'Calle 1' } as never,
        )
        const { doc } = await generateOfficialContractPdfBlob(data)

        // jsPDF escribe en UTF-16 toda línea con un carácter ajeno a WinAnsi, con una fuente WinAnsi
        assert.doesNotMatch(doc.output(), /\x00D\x00\.\x00\/\x00D/)
    })

    it('un byte por encima del límite declarado da 413 y no toca nada', async () => {
        const { body, type } = await encode(worstForm(four))

        const { status } = await send(body, type, MAX_REQUEST_BYTES + 1)

        assert.equal(status, 413)
        assert.deepEqual(fake.requests, [])
    })

    it('exactamente en el límite declarado no da 413', async () => {
        const { body, type } = await encode(worstForm(four))

        assert.notEqual((await send(body, type, MAX_REQUEST_BYTES)).status, 413)
    })

    it('la ruta no mide los archivos: se fía del content-length declarado', async () => {
        const data = new FormData()
        data.append('driverLicenseIssueDate', '2015-01-01')
        data.append('driverLicenseExpiryDate', '2035-01-01')
        data.append('dni_front', jpeg(6_000_000, 'grande.jpg'))
        const { body, type } = await encode(data)

        const { status } = await send(body, type, 1000)

        assert.equal(status, 200, 'si este test falla, la ruta ya mide el cuerpo real y el riesgo descrito desaparece')
    })
})

describe('Subida: prepareDocuments con pesos aleatorios', () => {
    const MB = 1_000_000
    let seed = 20261107
    const random = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32

    const file = (name: string, size: number, type: string) => new File([new Uint8Array(size)], name, { type })
    const kinds: Array<[string, string]> = [['a.jpg', 'image/jpeg'], ['a.png', 'image/png'], ['a.heic', ''], ['a.pdf', 'application/pdf']]

    it('nunca da por bueno un envío por encima del presupuesto, sea cual sea el reductor', async () => {
        for (let round = 0; round < 400; round++) {
            const count = 1 + Math.floor(random() * 8)
            const files = Array.from({ length: count }, () => {
                const [name, type] = kinds[Math.floor(random() * kinds.length)]
                return file(name, Math.floor(random() * 3 * MB) + 1, type)
            })
            const mode = Math.floor(random() * 3)
            const result = await prepareDocuments(files, async (original, budget) => {
                if (mode === 1 && original.name.endsWith('.heic')) return null
                const size = mode === 2 ? Math.floor(budget * 1.3) + 1000 : Math.max(1, budget)
                return file('r.jpg', size, 'image/jpeg')
            })

            const total = (result.ok ? result.files : []).reduce((sum, f) => sum + f.size, 0)
            assert.ok(total <= FILES_BUDGET_BYTES, `ronda ${round}: ${total}`)
            if (result.ok) assert.equal(result.files.length, count)
        }
    })

    it('con un reductor que cumple, las fotos reducibles siempre caben', async () => {
        for (let round = 0; round < 200; round++) {
            const count = 1 + Math.floor(random() * 6)
            const files = Array.from({ length: count }, () => file('a.jpg', Math.floor(random() * 4 * MB) + 1, 'image/jpeg'))

            const result = await prepareDocuments(files, async (_, budget) => file('r.jpg', Math.max(1, budget), 'image/jpeg'))

            assert.equal(result.ok, true, `ronda ${round}: ${result.totalBytes}`)
        }
    })
})

describe('Fianza', () => {
    const price = (depositOption: 'standard_2000' | 'flex_1000') => calculatePriceV2({
        startDate: new Date('2099-06-01'), pickupSlot: 'afternoon', endDate: new Date('2099-06-08'), dropoffSlot: 'morning',
        camperBasePrice: 100, camperId: 'c1', seasons: [], periods: [], discounts: [],
        kmPackage: 'included_150', cancellationPolicy: 'standard', selectedExtras: [],
        depositOption, depositAmount: depositOption === 'flex_1000' ? 1000 : 2000,
    })

    const contract = (deposit: number, camperDeposit = 1000) => generateContractData(
        {
            id: 'b1', start_date: '2099-06-01', end_date: '2099-06-08', total_price: 700, deposit_amount: deposit,
            camper: { name: 'NEO', slug: 'neo', deposit_amount: camperDeposit },
        } as never,
        { full_name: 'Ana', dni_nie: '12345678Z', phone: '600000000', address: 'Calle 1' } as never,
    )

    const clause = (data: ReturnType<typeof contract>, text: RegExp) =>
        (data as unknown as { articles: Array<{ content: string[] }> }).articles.flatMap(a => a.content).filter(p => text.test(p))

    for (const [option, deposit, label] of [['standard_2000', 2000, '2.000 €'], ['flex_1000', 1000, '1.000 €']] as const) {
        it(`${option}: precio, contrato y PDF llevan ${label}`, async () => {
            assert.equal(price(option).depositAmount, deposit)

            const data = contract(deposit)
            assert.equal(data.pricing.depositAmount, deposit)
            const [line] = clause(data, /fianza mediante tarjeta/i)
            assert.match(line, new RegExp(`por importe de ${label.replace('.', '\\.')}\\.?$`))
            assert.match(clause(data, /franquicia de \d/i)[0], /franquicia de 1\.000 €/)

            const { doc } = await generateOfficialContractPdfBlob(data)
            const raw = doc.output()
            // jsPDF escribe el euro como el byte 0x80 de WinAnsi
            assert.match(raw, new RegExp(`\\(${deposit}\\.00 \\x80 `))
        })
    }

    it('el PDF deja la franquicia fija aunque la fianza sea de 2.000 €', async () => {
        const { doc } = await generateOfficialContractPdfBlob(contract(2000))
        const raw = doc.output()

        assert.match(raw, /franquicia de 1000\.00/)
        assert.doesNotMatch(raw, /franquicia de 2000\.00/)
    })

    it('el cálculo antiguo de la ficha también lleva la fianza que recibe', () => {
        const breakdown = calculatePrice(new Date('2099-06-01'), 'afternoon', new Date('2099-06-08'), 'morning', [], [], 2000)

        assert.equal(breakdown.deposit, 2000)
        assert.equal(breakdown.depositAmount, 2000)
    })

    it('la ficha de la camper pasa 2.000 € en sus dos calculadoras y no lee la fianza de la camper', () => {
        const source = readFileSync('app/[locale]/campers/[slug]/CamperDetailClient.tsx', 'utf8')

        assert.equal(source.match(/depositAmount=\{2000\}/g)?.length, 2)
        assert.doesNotMatch(source, /camper\.deposit_amount/)
    })

    describe('de punta a punta', () => {
        let flows: ReturnType<typeof installFlows>
        const silenced = { error: console.error, warn: console.warn }

        beforeEach(() => {
            flows = installFlows({ campers: [{ ...NEO, deposit_amount: 1000 }] })
            console.error = () => {}
            console.warn = () => {}
        })
        afterEach(() => { flows.fake.restore(); Object.assign(console, silenced) })

        for (const [option, deposit, label] of [['standard_2000', 2000, '2.000 €'], ['flex_1000', 1000, '1.000 €']] as const) {
            it(`${option}: lo guardado por el checkout es lo que dice el contrato, con una camper de 1.000 €`, async () => {
                const { status, json } = await flows.checkout(step5Payload({ depositOption: option }, { depositOption: option }))
                assert.equal(status, 200, json.error)
                assert.equal(json.breakdown.depositAmount, deposit)

                const saved = flows.fake.tables.bookings[0]
                assert.equal(saved.deposit_amount, deposit)
                assert.equal(saved.total_price, json.breakdown.payableTotal, 'la fianza no se cobra con la reserva')

                const data = generateContractData(
                    { ...saved, camper: { name: 'NEO', slug: 'neo', deposit_amount: 1000 } } as never,
                    { full_name: 'Ana', dni_nie: '12345678Z', phone: '600000000', address: 'Calle 1' } as never,
                )
                assert.equal(data.pricing.depositAmount, deposit)
                const [line] = clause(data, /fianza mediante tarjeta/i)
                assert.match(line, new RegExp(`por importe de ${label.replace('.', '\\.')}\\.?$`))
            })
        }
    })

    it('una reserva sin fianza guardada toma la de la camper', () => {
        assert.equal(contract(0, 1500).pricing.depositAmount, 1500)
    })
})
