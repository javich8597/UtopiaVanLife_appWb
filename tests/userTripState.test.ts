import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getLicenseState, getTripState, pickCurrentBooking, daysUntil } from '../lib/user/tripState'

const now = new Date('2026-10-04T10:00:00')
const base = {
  status: 'confirmed',
  payment_status: 'paid',
  created_at: '2026-09-01T10:00:00Z',
  start_date: '2026-10-16',
  end_date: '2026-10-23',
  contract_signed_at: null as string | null,
}

describe('Mi reserva: estado del carnet', () => {
  it('reconoce pending_validation como en revisión', () => {
    assert.equal(getLicenseState({ verification_status: 'pending_validation' }), 'review')
    assert.equal(getLicenseState({ verification_status: 'pending' }), 'review')
    assert.equal(getLicenseState({ verification_status: 'rejected' }), 'rejected')
    assert.equal(getLicenseState({ verification_status: 'not_submitted' }), 'missing')
    assert.equal(getLicenseState(null), 'missing')
  })
})

describe('Mi reserva: siguiente paso', () => {
  it('pide el pago si la reserva no está pagada', () => {
    const s = getTripState({ ...base, status: 'pending', payment_status: 'pending', created_at: '2026-10-04T09:40:00' }, {}, now)
    assert.equal(s.step, 'pay')
  })
  it('pide el carnet, luego el contrato, luego espera la validación', () => {
    assert.equal(getTripState(base, {}, now).step, 'license')
    assert.equal(getTripState(base, { verification_status: 'rejected' }, now).step, 'license-fix')
    assert.equal(getTripState(base, { verification_status: 'pending_validation' }, now).step, 'contract')
    assert.equal(getTripState({ ...base, contract_signed_at: '2026-10-01' }, { verification_status: 'pending_validation' }, now).step, 'waiting')
  })
  it('espera si está pagada pero la reserva aún no está confirmada', () => {
    const s = getTripState({ ...base, status: 'pending', contract_signed_at: '2026-10-01' }, { verification_status: 'verified' }, now)
    assert.equal(s.step, 'waiting')
  })
  it('todo listo con carnet validado y contrato firmado', () => {
    const s = getTripState({ ...base, contract_signed_at: '2026-10-01' }, { verification_status: 'verified' }, now)
    assert.equal(s.step, 'ready')
    assert.deepEqual(s.milestones.map(m => m.done), [true, true, true, false])
    assert.equal(s.milestones.find(m => m.current)?.key, 'pickup')
  })
  it('en ruta durante el viaje y devolución al terminar', () => {
    assert.equal(getTripState({ ...base, start_date: '2026-10-02', end_date: '2026-10-06' }, {}, now).step, 'on-trip')
    assert.equal(getTripState({ ...base, start_date: '2026-09-20', end_date: '2026-10-01' }, {}, now).step, 'returned')
  })
  it('cuenta noches y días', () => {
    const s = getTripState(base, {}, now)
    assert.equal(s.nights, 7)
    assert.equal(s.daysToStart, 12)
    assert.equal(daysUntil('2026-10-04', now), 0)
  })
  it('lee la fecha del viaje como día de calendario, sin desfase horario', () => {
    // Sea cual sea la zona del proceso, '2026-10-05' es mañana respecto al 4 de octubre local
    const localNow = new Date(2026, 9, 4, 22, 30)
    assert.equal(daysUntil('2026-10-05', localNow), 1)
    assert.equal(daysUntil('2026-10-04', localNow), 0)
  })
})

describe('Mi reserva: qué reserva mostrar', () => {
  it('elige la próxima, ignora canceladas y pagos abandonados', () => {
    const list = [
      { ...base, id: 'lejana', start_date: '2027-05-01', end_date: '2027-05-05' },
      { ...base, id: 'cercana' },
      { ...base, id: 'cancelada', status: 'cancelled', start_date: '2026-10-05', end_date: '2026-10-07' },
      { ...base, id: 'abandonada', status: 'pending', payment_status: 'pending', created_at: '2026-10-01T10:00:00Z', start_date: '2026-10-06', end_date: '2026-10-08' },
    ]
    assert.equal(pickCurrentBooking(list, now)?.id, 'cercana')
  })
  it('no devuelve nada si solo hay reservas cerradas', () => {
    assert.equal(pickCurrentBooking([{ ...base, status: 'completed' }], now), undefined)
  })
})
