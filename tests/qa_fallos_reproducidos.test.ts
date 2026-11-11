import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cents, installFlows, NEO, redsysForm, step5Payload } from './helpers/qaFlows'
import { calculatePriceV2 } from '../lib/pricing/engine'
import { activePaymentAlerts } from '../lib/admin/bookingStatus'
import { getTripState, isLiveBooking } from '../lib/user/tripState'
import { parseBlockedSlots } from '../lib/booking/availability'
import { validateBookingRange } from '../lib/booking/calendarLogic'
import { validateStep1, validateStep5 } from '../app/[locale]/reserva/[slug]/types'
import { POST as uploadDocument } from '../app/api/upload-document/route'

/**
 * Verificador: fallos encontrados. CADA TEST DE ESTE ARCHIVO ESTÁ EN ROJO A PROPÓSITO y describe lo
 * esperado. El código de producción no se ha tocado: deben pasar a verde cuando se arregle cada
 * fallo. El prefijo QA-n coincide con el informe.
 */
describe('QA fallos reproducidos (rojo a propósito)', () => {
    let flows: ReturnType<typeof installFlows>
    const silenced = { error: console.error, warn: console.warn }
    const ana = { id: 'u-ana', email: 'ana@example.com', aud: 'authenticated' }

    beforeEach(() => {
        for (const key of ['REDSYS_ENVIRONMENT', 'REDSYS_ALLOW_TEST_MODE', 'REDSYS_SECRET_KEY', 'REDSYS_MERCHANT_CODE']) delete process.env[key]
        flows = installFlows()
        console.error = () => { }
        console.warn = () => { }
    })

    afterEach(() => {
        flows.fake.restore()
        Object.assign(console, silenced)
    })

    const booking = () => flows.fake.tables.bookings[0]

    function asAna() {
        flows.fake.tables.users.push({ id: ana.id, email: ana.email })
        flows.fake.authUsers.push({ id: ana.id, email: ana.email })
        flows.fake.setSession(ana)
    }

    it('QA-1 cliente que vuelve de Redsys antes del webhook, sin Ds_* en la URL: la página no debe darle el pago por fallido', async () => {
        const { json, jar } = await flows.checkout(step5Payload())

        // Cobrado en Redsys, pero el webhook aún no ha llegado y la URL solo trae ?order=
        const back = await flows.verify(json.orderId, jar)
        assert.equal(back.json.success, true)
        assert.equal(back.json.isPaid, false)
        assert.equal(back.json.booking.paymentStatus, 'pending')

        // success/page.tsx:78-89: todo lo que no sea isPaid acaba en paymentVerified=false, y la línea
        // 261 lo pinta como "Pago no completado": ni reintenta ni distingue 'pending' de 'failed'
        const page = readFileSync('app/[locale]/checkout/success/page.tsx', 'utf8')
        const waitsForWebhook = /setTimeout|setInterval/.test(page) || /paymentStatus\s*===\s*'pending'/.test(page)
        assert.ok(waitsForWebhook, 'la página no espera al webhook: muestra "Pago no completado" a quien ya pagó')
    })

    it('QA-2 segundo reintento con el bloqueo del primer pedido vigente: no debe decir que las fechas están ocupadas', async () => {
        asAna()
        await flows.checkout(step5Payload())
        const first = await flows.pay(booking().id)
        assert.equal(first.status, 200)

        const second = await flows.pay(booking().id)
        assert.equal(second.status, 200, `el propio bloqueo checkout_<pedido original> lo impide: ${JSON.stringify(second.json)}`)
    })

    it('QA-3 pago correcto de un reintento con su bloqueo original vigente: no debe avisar de fechas ocupadas', async () => {
        asAna()
        const { json } = await flows.checkout(step5Payload())
        const retry = await flows.pay(booking().id)

        await flows.webhook(retry.json.orderId, cents(json.breakdown.payableTotal))

        assert.equal(booking().payment_status, 'paid')
        assert.deepEqual(activePaymentAlerts(booking().notes), [], 'aviso falso: las fechas las ocupa su propio bloqueo')
    })

    it('QA-4 el asistente no debe dar por válido el paso 5 sin las fechas que el servidor exige', async () => {
        const customer = {
            ...step5Payload().customer,
            birthDate: '',
            licenseDate: '',
            phoneCountryCode: '+34',
            acceptTerms: true,
            acceptPrivacy: true,
        }
        const wizardAccepts = validateStep5(customer as never, 3).isValid
        const { status } = await flows.checkout(step5Payload({}, { birthDate: '', licenseDate: '' }))

        assert.equal(status, 400)
        assert.equal(wizardAccepts, false, 'validateStep5 lo acepta, el botón de pagar sigue activo y el servidor responde 400')
    })

    it('QA-5 lo que el calendario deja elegir no debe rechazarse al pagar: 90 noches, el máximo', async () => {
        const dates = { startDate: '2099-06-01', startSlot: 'afternoon', endDate: '2099-08-30', endSlot: 'morning', pax: 2 }
        assert.equal(validateStep1(dates as never, [], 3).isValid, true)

        const { status, json } = await flows.checkout(step5Payload({ startDate: dates.startDate, endDate: dates.endDate }))
        assert.equal(status, 200, json.error)
    })

    it('QA-6 el reintento de pago debe conservar el idioma en la URL de vuelta', async () => {
        asAna()
        await flows.checkout(step5Payload({ locale: 'de' }))
        const retry = await flows.pay(booking().id)
        const form = redsysForm(retry.json.form.merchantParameters)
        assert.match(form.DS_MERCHANT_URLOK, /\/(es|en|de|fr)\/checkout\/success/)
    })

    it('QA-7 quien paga un pedido sustituido por un reintento no debe recibir "reserva no encontrada"', async () => {
        asAna()
        const { json, jar } = await flows.checkout(step5Payload())
        await flows.pay(booking().id)

        const back = await flows.verify(json.orderId, jar, flows.signed(json.orderId, cents(json.breakdown.payableTotal)))
        assert.equal(activePaymentAlerts(booking().notes).length, 1, 'el admin sí queda avisado')
        assert.notEqual(back.status, 404, 'el cliente, ya cobrado, ve "Pago no completado"')
    })

    it('QA-8 con un cobro a revisar no se debe ofrecer volver a pagar', async () => {
        asAna()
        const { json } = await flows.checkout(step5Payload())
        await flows.pay(booking().id)
        await flows.webhook(json.orderId, cents(json.breakdown.payableTotal))
        const row = { ...booking(), created_at: '2020-01-01T00:00:00.000Z' } as unknown as { status: string; start_date: string; end_date: string; notes: string }

        assert.equal(activePaymentAlerts(row.notes).length, 1)
        assert.equal(isLiveBooking(row), true)
        assert.notEqual(getTripState(row, null).step, 'pay', 'el panel enseña "Volver al pago" sobre un cobro ya hecho')
    })

    it('QA-9 un tercero no debe poder dejar sin reservar a un cliente escribiendo su email', async () => {
        for (const month of ['01', '02', '03']) {
            const attacker = await flows.checkout(step5Payload({ startDate: `2099-${month}-01`, endDate: `2099-${month}-08` }))
            assert.equal(attacker.status, 200)
        }

        asAna()
        const { status } = await flows.checkout(step5Payload({ startDate: '2099-06-01', endDate: '2099-06-08' }))
        assert.notEqual(status, 429, 'la dueña del email, con sesión, queda bloqueada hasta 60 minutos')
    })

    it('QA-10 (A5 residual) una misma IP no debe poder bloquear el calendario cambiando de email', async () => {
        const sameClient = { 'x-forwarded-for': '203.0.113.7' }
        const statuses: number[] = []
        for (let i = 0; i < 8; i++) {
            const year = 2090 + i
            const { status } = await flows.checkout(
                step5Payload({ startDate: `${year}-01-01`, endDate: `${year}-03-31` }, { email: `falso${i}@example.com` }),
                undefined,
                sameClient
            )
            statuses.push(status)
        }
        assert.ok(statuses.some(s => s === 429), `sin límite: ${statuses.join(', ')} y ${flows.fake.authUsers.length} cuentas creadas`)
    })

    it('QA-11 la fianza del resumen debe coincidir con la que se guarda', async () => {
        // Decisión de Javier: Estándar 2.000 € y Flex 1.000 €, sea cual sea campers.deposit_amount
        flows.fake.tables.campers[0] = { ...NEO, deposit_amount: 1000 }
        const { json } = await flows.checkout(step5Payload())
        assert.equal(json.breakdown.depositAmount, 2000)

        for (const file of ['BookingWizardClient.tsx', 'StickyTripSummary.tsx']) {
            const source = readFileSync(`app/[locale]/reserva/[slug]/${file}`, 'utf8')
            assert.match(source, /'flex_1000'[\s\S]*flexDepositAmount/)
            assert.doesNotMatch(source, /Number\(camper\.deposit_amount\)/)
        }
    })

    it('QA-12 el precio del asistente no debe depender de la zona horaria del navegador', () => {
        const seasons = [
            { id: 'baja', code: 'baja', name: 'Baja', supplement_per_night: 0, min_nights: 3, is_default: true },
            { id: 'alta', code: 'alta', name: 'Alta', supplement_per_night: 50, min_nights: 3, is_default: false },
        ]
        const periods = [{ id: 'p', season_id: 'alta', start_date: '2099-07-01', end_date: '2099-08-31' }]
        const price = () => calculatePriceV2({
            startDate: new Date('2099-06-28'), pickupSlot: 'afternoon', endDate: new Date('2099-07-03'), dropoffSlot: 'morning',
            camperBasePrice: 100, camperId: 'c1', seasons: seasons as never, periods: periods as never, discounts: [],
            kmPackage: 'included_150', cancellationPolicy: 'standard', selectedExtras: [],
            depositOption: 'standard_2000', depositAmount: 2000,
        }).payableTotal

        const previous = process.env.TZ
        try {
            process.env.TZ = 'UTC'
            const server = price()
            process.env.TZ = 'America/New_York'
            const browser = price()
            assert.equal(browser, server, 'en América el asistente enseña un total y Redsys cobra otro')
        } finally {
            if (previous === undefined) delete process.env.TZ
            else process.env.TZ = previous
        }
    })

    it('QA-13 un medio día libre según el calendario no debe rechazarse al pagar', async () => {
        const previous = { camper_id: NEO.id, start_date: '2099-05-20', end_date: '2099-06-01', status: 'confirmed', pickup_time: '15:00', dropoff_time: '12:00' }
        flows.fake.tables.bookings.push(previous)

        const slots = parseBlockedSlots([previous], [])
        assert.equal(validateBookingRange('2099-06-01', 'afternoon', '2099-06-08', 'morning', slots, 3).isValid, true)

        const { status, json } = await flows.checkout(step5Payload())
        assert.equal(status, 200, json.error)
    })

    it('QA-14 (M4 residual) /api/upload-document no debe guardar HTML con extensión y tipo del cliente', async () => {
        asAna()
        const data = new FormData()
        data.append('front', new File(['<script>alert(1)</script>'], 'a.html', { type: 'text/html' }))
        data.append('back', new File(['<svg onload=alert(1)>'], 'b.svg', { type: 'image/svg+xml' }))

        const res = await uploadDocument(new Request('http://localhost/api/upload-document', { method: 'POST', body: data }))

        const stored = flows.fake.requests.filter(r => r.path.startsWith('/storage/v1/object/documents/')).map(r => r.path)
        assert.deepEqual(stored, [], `estado ${res.status}: ${stored.join(', ')}`)
    })
})
