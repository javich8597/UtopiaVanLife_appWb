import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
    formatTripRange,
    madridDay,
    upcomingSecondDriverBookings,
} from '../lib/user/secondDriverBookings'

/**
 * QA-SD-8: /dashboard/datos ofrecía la reserva MÁS ANTIGUA que llevara 2º conductor, y un viaje ya
 * terminado tapaba a la reserva próxima: su documentación no se podía subir por ninguna pantalla.
 */

const NOW = new Date('2026-11-09T10:00:00Z')

function booking(overrides: Record<string, unknown> & { id: string }) {
    const { driver, ...rest } = overrides as Record<string, unknown> & { id: string; driver?: Record<string, string> }
    return {
        status: 'confirmed',
        payment_status: 'paid',
        start_date: '2026-12-01',
        end_date: '2026-12-08',
        passengers: [
            { fullName: 'Titular', dniNie: '11111111A' },
            { isSecondDriver: true, fullName: 'Luis Pérez', dniNie: '22222222B', ...(driver || {}) },
        ],
        pricing_breakdown: { secondDriver: true },
        ...rest,
    }
}

const OLD_TRIP = booking({
    id: 'old', status: 'completed', start_date: '2024-07-01', end_date: '2024-07-08',
    driver: { fullName: 'Persona Antigua', dniNie: '99999999Z' },
})
const NEXT_TRIP = booking({
    id: 'next', start_date: '2026-12-01', end_date: '2026-12-08',
    driver: { fullName: 'Marta Soler', dniNie: '33333333C' },
})

describe('/dashboard/datos: qué reserva se ofrece para el 2º conductor (QA-SD-8)', () => {
    it('el criterio de antes (más antigua con documento) elegía el viaje terminado', () => {
        // Réplica del código anterior de page.tsx: estados vivos (incluido completed), orden por
        // start_date ascendente y primera con documento. Demuestra que el escenario reproduce QA-SD-8
        const old = [NEXT_TRIP, OLD_TRIP]
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
            .find(b => (b.passengers as Array<{ isSecondDriver?: boolean; dniNie: string }>).some(p => p.isSecondDriver && p.dniNie))
        assert.equal(old?.id, 'old')
    })

    it('con un viaje terminado antiguo y una reserva próxima, ofrece la próxima', () => {
        const options = upcomingSecondDriverBookings([OLD_TRIP, NEXT_TRIP], NOW)

        assert.equal(options.length, 1)
        assert.equal(options[0].bookingId, 'next')
        assert.equal(options[0].fullName, 'Marta Soler')
        assert.equal(options[0].dniNie, '33333333C')
    })

    it('no importa el orden en que llegan las reservas', () => {
        assert.equal(upcomingSecondDriverBookings([NEXT_TRIP, OLD_TRIP], NOW)[0].bookingId, 'next')
    })

    it('con varias reservas por delante las ordena por inicio y la primera es la próxima', () => {
        const later = booking({ id: 'later', start_date: '2027-03-10', end_date: '2027-03-17', driver: { dniNie: '44444444D', fullName: 'Ana Gil' } })
        const options = upcomingSecondDriverBookings([later, OLD_TRIP, NEXT_TRIP], NOW)

        assert.deepEqual(options.map(o => o.bookingId), ['next', 'later'])
    })

    it('un viaje en curso sigue ofreciéndose hasta el día de la devolución', () => {
        const active = booking({ id: 'active', status: 'active', start_date: '2026-11-05', end_date: '2026-11-09' })
        assert.deepEqual(upcomingSecondDriverBookings([active, NEXT_TRIP], NOW).map(o => o.bookingId), ['active', 'next'])
    })

    it('un viaje cuya devolución ya pasó no se ofrece, aunque no conste como completado', () => {
        const stale = booking({ id: 'stale', status: 'active', start_date: '2026-10-01', end_date: '2026-10-08' })
        assert.deepEqual(upcomingSecondDriverBookings([stale, NEXT_TRIP], NOW).map(o => o.bookingId), ['next'])
    })

    it('no ofrece canceladas, sin pagar ni un 2º conductor sin documento', () => {
        const rows = [
            booking({ id: 'cancelled', status: 'cancelled' }),
            booking({ id: 'unpaid', status: 'pending', payment_status: 'pending' }),
            booking({ id: 'no-doc', passengers: [], pricing_breakdown: { secondDriver: true } }),
            booking({ id: 'solo-titular', passengers: [{ fullName: 'Titular', dniNie: '11111111A' }], pricing_breakdown: {} }),
        ]
        assert.deepEqual(upcomingSecondDriverBookings(rows, NOW), [])
    })

    it('si ninguna reserva autoriza a un 2º conductor, no hay nada que ofrecer', () => {
        assert.deepEqual(upcomingSecondDriverBookings([], NOW), [])
        assert.deepEqual(upcomingSecondDriverBookings([OLD_TRIP], NOW), [])
    })

    it('ignora filas sin id o sin fechas en vez de romper', () => {
        const rows = [
            { ...NEXT_TRIP, id: undefined },
            { ...NEXT_TRIP, id: 'sin-fecha', start_date: null, end_date: null },
            null,
        ]
        assert.deepEqual(upcomingSecondDriverBookings(rows as unknown[], NOW), [])
    })

    it('"hoy" es el día de Mallorca, no el del servidor: sin desfases fuera de Europa', () => {
        // 23:30 UTC del 9 de noviembre ya es el 10 en Mallorca
        const lateUtc = new Date('2026-11-09T23:30:00Z')
        assert.equal(madridDay(lateUtc), '2026-11-10')
        assert.equal(madridDay(new Date('2026-11-09T22:30:00Z')), '2026-11-09')

        const endsToday = booking({ id: 'ends-9', start_date: '2026-11-02', end_date: '2026-11-09' })
        const endsTomorrow = booking({ id: 'ends-10', start_date: '2026-11-03', end_date: '2026-11-10' })
        assert.deepEqual(
            upcomingSecondDriverBookings([endsToday, endsTomorrow], lateUtc).map(o => o.bookingId),
            ['ends-10']
        )
    })
})

describe('/dashboard/datos: fechas del viaje en el texto', () => {
    it('lee el día de calendario tal cual', () => {
        assert.equal(formatTripRange('2026-11-12', '2026-11-19'), 'del 12 al 19 de noviembre de 2026')
        assert.equal(formatTripRange('2026-11-28', '2026-12-03'), 'del 28 de noviembre al 3 de diciembre de 2026')
        assert.equal(formatTripRange('2026-12-28', '2027-01-03'), 'del 28 de diciembre de 2026 al 3 de enero de 2027')
        assert.equal(formatTripRange('2026-11-12', '2026-11-12'), 'el 12 de noviembre de 2026')
        assert.equal(formatTripRange('', ''), '')
    })
})

describe('/dashboard/datos: pantalla', () => {
    const PAGE = readFileSync('app/[locale]/dashboard/datos/page.tsx', 'utf8')
    const CLIENT = readFileSync('app/[locale]/dashboard/datos/DriverDataClient.tsx', 'utf8')

    it('la página elige la reserva con la función probada, no con "la primera por start_date"', () => {
        assert.match(PAGE, /upcomingSecondDriverBookings\(/)
        assert.doesNotMatch(PAGE, /\.order\('start_date'/)
        assert.doesNotMatch(PAGE, /\.find\(\(\{ driver \}\)/)
        assert.match(PAGE, /\.select\('\*'\)/)
    })

    it('el formulario marca por defecto la próxima y manda el bookingId de la elegida', () => {
        assert.match(CLIENT, /useState\(secondDriverBookings\[0\]\?\.bookingId \|\| ''\)/)
        assert.match(CLIENT, /secondDriverBookings\.find\(b => b\.bookingId === selectedBookingId\)/)
        assert.match(CLIENT, /formData\.append\('bookingId', secondDriverBooking!\.bookingId\)/)
    })

    it('con varias reservas hay selector; con una sola solo se dice a qué reserva corresponde', () => {
        assert.match(CLIENT, /secondDriverBookings\.length > 1/)
        assert.match(CLIENT, /type="radio"/)
        assert.match(CLIENT, /Estás subiendo la documentación de/)
    })

    it('sin reserva que lo autorice el interruptor sigue apagado y deshabilitado', () => {
        assert.match(CLIENT, /useState\(Boolean\(secondDriverBooking\)\)/)
        assert.match(CLIENT, /disabled=\{!secondDriverBooking\}/)
        assert.match(CLIENT, /const sendSecondDriver = hasSecondDriver && Boolean\(secondDriverBooking\)/)
    })

    it('no pinta vistas previas desde columnas del perfil que nada escribe', () => {
        assert.doesNotMatch(CLIENT, /second_license_front_url|second_license_back_url/)
        assert.doesNotMatch(CLIENT, /second_driver_license_(front|back)_url/)
        assert.match(CLIENT, /siguen guardadas/)
    })

    it('el selector es táctil y no usa estilos inline estructurales', () => {
        const picker = CLIENT.slice(CLIENT.indexOf('className="trip-picker"'), CLIENT.indexOf('className="trip-context"'))
        assert.doesNotMatch(picker, /style=\{\{/)
        const option = CLIENT.match(/\.trip-option \{[^}]*\}/)?.[0] || ''
        const minHeight = Number(option.match(/min-height:\s*(\d+)px/)?.[1] || 0)
        assert.ok(minHeight >= 44, `objetivo táctil de ${minHeight}px`)
    })
})
