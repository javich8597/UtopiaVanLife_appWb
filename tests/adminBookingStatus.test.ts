import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  isAbandonedPending,
  getAdminBookingStatus,
  livePendingSince,
  actionablePendingFilter,
  isActionablePending,
  activePaymentAlerts,
  hasPaymentAlert,
  markPaymentAlertsReviewed,
  BOOKING_STATUS_COLUMNS,
  PAYMENT_ALERT_MARKER,
} from '../lib/admin/bookingStatus'
import { appendPaymentAlert } from '../lib/redsysNotification'

describe('Admin booking status (reservas abandonadas)', () => {
  const now = new Date('2026-10-03T20:00:00Z')

  it('marks unpaid pending bookings older than 60 min as expired', () => {
    const b = { status: 'pending', payment_status: 'pending', created_at: '2026-10-03T18:00:00Z' }
    assert.equal(isAbandonedPending(b, now), true)
    assert.equal(getAdminBookingStatus(b, now), 'expired')
  })

  it('keeps recent pending bookings as pending (cliente pagando)', () => {
    const b = { status: 'pending', payment_status: 'pending', created_at: '2026-10-03T19:30:00Z' }
    assert.equal(getAdminBookingStatus(b, now), 'pending')
  })

  it('never expires paid or non-pending bookings', () => {
    assert.equal(getAdminBookingStatus({ status: 'pending', payment_status: 'paid', created_at: '2026-01-01' }, now), 'review')
    assert.equal(getAdminBookingStatus({ status: 'confirmed', created_at: '2026-01-01' }, now), 'confirmed')
  })

  it('treats paid pending bookings as awaiting confirmation, not as unpaid', () => {
    const fresh = { status: 'pending', payment_status: 'paid', created_at: '2026-10-03T19:50:00Z' }
    assert.equal(getAdminBookingStatus(fresh, now), 'review')
    assert.equal(isAbandonedPending(fresh, now), false)
  })

  it('exposes the cutoff for live pending queries', () => {
    assert.equal(livePendingSince(now), '2026-10-03T19:00:00.000Z')
    assert.equal(actionablePendingFilter(now), 'payment_status.eq.paid,created_at.gte.2026-10-03T19:00:00.000Z')
  })
})

describe('Admin booking status: cobros a revisar ([PAGO A REVISAR] en notes)', () => {
  const now = new Date('2026-10-03T20:00:00Z')
  const ALERT = 'El cobro no coincide con la reserva (pedido 1234abcd5678: 100 céntimos, moneda 978). No se ha marcado como pagada.'
  const alertNotes = appendPaymentAlert(null, ALERT)
  const old = '2026-10-03T10:00:00Z'

  it('una pendiente con cobro a revisar no es abandonada ni caduca, aunque lleve horas sin pagar', () => {
    const b = { status: 'pending', payment_status: 'pending', created_at: old, notes: alertNotes }
    assert.equal(isAbandonedPending(b, now), false)
    assert.equal(getAdminBookingStatus(b, now), 'pending')
    // Sin el aviso sigue siendo abandonada
    assert.equal(getAdminBookingStatus({ ...b, notes: 'Quiero cuna' }, now), 'expired')
  })

  it('el marcador del panel es el que escribe appendPaymentAlert', () => {
    assert.ok(alertNotes.startsWith(PAYMENT_ALERT_MARKER))
    assert.deepEqual(activePaymentAlerts(alertNotes), [ALERT])
  })

  it('se detecta el aviso en reservas canceladas y reembolsadas, sin cambiar su estado', () => {
    const cancelled = { status: 'cancelled', payment_status: 'pending', created_at: old, notes: appendPaymentAlert('Cliente llamó', 'Cobro recibido en una reserva cancelada (pedido 9). Hay que devolverlo desde el banco.') }
    const refunded = { status: 'cancelled', payment_status: 'refunded', created_at: old, notes: appendPaymentAlert(null, 'Cobro recibido en una reserva ya reembolsada (pedido 9). Revisar en el banco.') }
    for (const b of [cancelled, refunded]) {
      assert.equal(hasPaymentAlert(b), true)
      assert.equal(getAdminBookingStatus(b, now), 'cancelled')
    }
    assert.equal(hasPaymentAlert({ notes: 'Cliente llamó' }), false)
    assert.equal(hasPaymentAlert({ notes: null }), false)
    assert.equal(hasPaymentAlert({}), false)
  })

  it('solo cuenta el marcador al inicio de línea', () => {
    assert.equal(hasPaymentAlert({ notes: 'Pon [PAGO A REVISAR] en la nota' }), false)
    assert.equal(hasPaymentAlert({ notes: 'Hola\r\n[PAGO A REVISAR] Aviso' }), true)
  })

  it('marcar como revisado apaga el aviso y la reserva abandonada vuelve a caducar', () => {
    const reviewed = markPaymentAlertsReviewed(alertNotes)!
    assert.deepEqual(activePaymentAlerts(reviewed), [])
    assert.equal(isAbandonedPending({ status: 'pending', payment_status: 'pending', created_at: old, notes: reviewed }, now), true)
    // Idempotente: sin avisos activos no hay nada que marcar
    assert.equal(markPaymentAlertsReviewed(reviewed), null)
    assert.equal(markPaymentAlertsReviewed(null), null)
    assert.equal(markPaymentAlertsReviewed('Solo una nota'), null)
  })

  it('una notificación repetida de Redsys no reactiva un aviso ya revisado', () => {
    const reviewed = markPaymentAlertsReviewed(alertNotes)!
    const again = appendPaymentAlert(reviewed, ALERT)
    assert.equal(again, reviewed)
    assert.deepEqual(activePaymentAlerts(again), [])
    // Un aviso distinto sí se activa
    const other = appendPaymentAlert(reviewed, 'Cobro recibido en una reserva cancelada (pedido 7).')
    assert.deepEqual(activePaymentAlerts(other), ['Cobro recibido en una reserva cancelada (pedido 7).'])
  })

  it('conserva las notas del cliente al marcar como revisado', () => {
    const notes = appendPaymentAlert('Llego tarde', ALERT)
    const reviewed = markPaymentAlertsReviewed(notes)!
    assert.ok(reviewed.startsWith('Llego tarde\n'))
    assert.ok(reviewed.includes(`[PAGO A REVISAR] ${ALERT}`))
  })

  it('isActionablePending coincide con el filtro de Supabase', () => {
    const since = livePendingSince(now)
    assert.equal(actionablePendingFilter(now), `payment_status.eq.paid,created_at.gte.${since}`)
    assert.equal(isActionablePending({ status: 'pending', payment_status: 'paid', created_at: old }, now), true)
    assert.equal(isActionablePending({ status: 'pending', payment_status: 'pending', created_at: '2026-10-03T19:30:00Z' }, now), true)
    assert.equal(isActionablePending({ status: 'pending', payment_status: 'pending', created_at: old }, now), false)
    assert.equal(isActionablePending({ status: 'cancelled', payment_status: 'paid', created_at: old }, now), false)
  })

  it('el archivado en lote pide la columna notes, así que el servidor ve el aviso', () => {
    assert.ok(BOOKING_STATUS_COLUMNS.split(',').map(c => c.trim()).includes('notes'))
    const route = readFileSync(new URL('../app/api/admin/bookings/expire/route.ts', import.meta.url), 'utf8')
    assert.ok(route.includes('BOOKING_STATUS_COLUMNS}'))
    assert.match(route, /isAbandonedPending/)
  })
})

describe('Fianza: una sola fuente de verdad en el contrato', () => {
  it('usa la fianza de la reserva/camper antes que la de la plantilla', async () => {
    const { generateContractData } = await import('../lib/contracts/contractEngine')
    const booking = { id: 'b-1', deposit_amount: 1500, total_price: 900, start_date: '2026-07-01', end_date: '2026-07-05', campers: { slug: 'space', deposit_amount: 1500 } }
    const data = generateContractData(booking, {}, undefined, { terms: { depositAmount: 1000 } })
    assert.equal(data.pricing.depositAmount, 1500)
    const fianzaArticle = data.articles.find(a => a.content.some(p => /fianza mediante tarjeta/i.test(p)))
    assert.ok(fianzaArticle?.content.some(p => p.includes('1.500 €')))
  })

  it('recurre a la plantilla solo si no hay fianza en reserva ni camper', async () => {
    const { generateContractData } = await import('../lib/contracts/contractEngine')
    const data = generateContractData({ id: 'b-2', total_price: 100 }, {}, {}, { terms: { depositAmount: 800 } })
    assert.equal(data.pricing.depositAmount, 800)
  })
})
