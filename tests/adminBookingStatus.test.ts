import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isAbandonedPending, getAdminBookingStatus, livePendingSince } from '../lib/admin/bookingStatus'

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
    assert.equal(getAdminBookingStatus({ status: 'pending', payment_status: 'paid', created_at: '2026-01-01' }, now), 'pending')
    assert.equal(getAdminBookingStatus({ status: 'confirmed', created_at: '2026-01-01' }, now), 'confirmed')
  })

  it('exposes the cutoff for live pending queries', () => {
    assert.equal(livePendingSince(now), '2026-10-03T19:00:00.000Z')
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
