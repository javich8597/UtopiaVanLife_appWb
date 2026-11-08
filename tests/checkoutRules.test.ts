import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    isValidEmail,
    MAX_BOOKING_NIGHTS,
    normalizeEmail,
    resolveBookingSlots,
    sanitizeCustomerNotes,
    todayInBookingTimeZone,
    validateBookingDates,
} from '../lib/booking/checkoutRules'

describe('Email del checkout', () => {
    it('normaliza y admite direcciones reales, también con guion bajo', () => {
        assert.equal(normalizeEmail('  Ana.Perez@Example.COM '), 'ana.perez@example.com')
        for (const email of ['ana@example.com', 'jefa_admin@example.com', 'ana+reservas@mail.example.es', "o'neil@example.ie"]) {
            assert.equal(isValidEmail(email), true, email)
        }
    })

    it('rechaza comodines, espacios y direcciones incompletas', () => {
        for (const email of ['', 'victima%', 'victi%a@example.com', 'a*b@example.com', 'a b@example.com', 'ana@example', '@example.com', 'ana@@example.com']) {
            assert.equal(isValidEmail(email), false, email)
        }
        assert.equal(isValidEmail(`${'a'.repeat(250)}@example.com`), false)
    })

    it('un valor que no es texto se trata como vacío', () => {
        assert.equal(normalizeEmail({ email: 'x' }), '')
        assert.equal(normalizeEmail(undefined), '')
    })
})

describe('Tramos horarios', () => {
    it('recogida 15:00 y devolución 12:00 por defecto', () => {
        assert.deepEqual(resolveBookingSlots({}), {
            pickupSlot: 'afternoon', dropoffSlot: 'morning', pickupTime: '15:00', dropoffTime: '12:00',
        })
    })

    it('cada tramo tiene su hora, y el tramo manda sobre la hora enviada', () => {
        assert.deepEqual(resolveBookingSlots({ pickupSlot: 'morning', dropoffSlot: 'afternoon', pickupTime: '15:00', dropoffTime: '12:00' }), {
            pickupSlot: 'morning', dropoffSlot: 'afternoon', pickupTime: '09:00', dropoffTime: '19:00',
        })
    })

    it('sin tramo, una hora conocida elige un tramo que se cobra', () => {
        const slots = resolveBookingSlots({ pickupTime: '09:00', dropoffTime: '19:00' })

        assert.equal(slots?.pickupSlot, 'morning')
        assert.equal(slots?.dropoffSlot, 'afternoon')
    })

    it('rechaza tramos desconocidos', () => {
        assert.equal(resolveBookingSlots({ pickupSlot: 'night' }), null)
        assert.equal(resolveBookingSlots({ endSlot: 'noon' }), null)
        assert.equal(resolveBookingSlots({ dropoffSlot: ['morning'] }), null)
    })
})

describe('Fechas de reserva', () => {
    const NOW = new Date('2026-11-07T10:00:00Z')

    it('el día de hoy es el de Mallorca, no el del servidor', () => {
        assert.equal(todayInBookingTimeZone(new Date('2026-11-07T23:30:00Z')), '2026-11-08')
        assert.equal(todayInBookingTimeZone(new Date('2026-07-07T22:30:00Z')), '2026-07-08')
        assert.equal(todayInBookingTimeZone(new Date('2026-11-07T22:30:00Z')), '2026-11-07')
    })

    it('admite hoy, que el calendario deja elegir, y rechaza ayer', () => {
        assert.equal(validateBookingDates('2026-11-07', '2026-11-10', NOW).error, undefined)
        assert.ok(validateBookingDates('2026-11-06', '2026-11-10', NOW).error)
    })

    it('rechaza rangos invertidos o del mismo día', () => {
        assert.ok(validateBookingDates('2026-12-05', '2026-12-01', NOW).error)
        assert.ok(validateBookingDates('2026-12-01', '2026-12-01', NOW).error)
    })

    it('rechaza fechas inexistentes o con otro formato', () => {
        for (const [start, end] of [['2026-02-30', '2026-03-05'], ['2026-12-01T00:00:00Z', '2026-12-05'], ['01/12/2026', '05/12/2026'], [undefined, '2026-12-05'], [20261201, '2026-12-05']]) {
            assert.ok(validateBookingDates(start, end, NOW).error, String(start))
        }
    })

    it(`admite hasta ${MAX_BOOKING_NIGHTS} noches, también con cambio de hora dentro`, () => {
        assert.equal(validateBookingDates('2027-01-01', '2027-04-01', NOW).error, undefined)
        assert.ok(validateBookingDates('2027-01-01', '2027-04-02', NOW).error)
    })

    it('devuelve las fechas en UTC, para que el motor de precios cuente las mismas noches', () => {
        const dates = validateBookingDates('2026-12-01', '2026-12-05', NOW)

        if (dates.error !== undefined) assert.fail(dates.error)
        assert.equal(dates.startDate.toISOString(), '2026-12-01T00:00:00.000Z')
        assert.equal(dates.endDate.toISOString(), '2026-12-05T00:00:00.000Z')
    })
})

describe('Notas del cliente', () => {
    it('neutraliza los marcadores del sistema en cualquier forma', () => {
        assert.equal(sanitizeCustomerNotes('[PAGO A REVISAR] falso'), '(PAGO A REVISAR) falso')
        assert.equal(sanitizeCustomerNotes('[pago revisado] falso'), '(pago revisado) falso')
        assert.equal(sanitizeCustomerNotes('x [ COBRO REDSYS ] y'), 'x (COBRO REDSYS) y')
        assert.equal(sanitizeCustomerNotes('[PEDIDO ANTERIOR] 1234'), '(PEDIDO ANTERIOR) 1234')
    })

    it('deja el resto del texto como está', () => {
        assert.equal(sanitizeCustomerNotes('Llegamos a las [15:00]\nGracias'), 'Llegamos a las [15:00]\nGracias')
    })

    it('corta las notas a 2000 caracteres', () => {
        assert.equal(sanitizeCustomerNotes('x'.repeat(5000)).length, 2000)
    })

    it('un valor que no es texto se guarda vacío', () => {
        assert.equal(sanitizeCustomerNotes({ a: 1 }), '')
        assert.equal(sanitizeCustomerNotes(undefined), '')
    })
})
