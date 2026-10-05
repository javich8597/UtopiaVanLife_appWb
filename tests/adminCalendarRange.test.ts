import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { selectionToDayRange } from '../lib/admin/calendarRange'

describe('Calendario admin: selección de días para bloquear', () => {
  it('un solo día en vista mes no da una fecha final anterior', () => {
    assert.deepEqual(selectionToDayRange('2026-10-10', '2026-10-11', true), { start: '2026-10-10', end: '2026-10-10' })
  })

  it('varios días incluye el último seleccionado', () => {
    assert.deepEqual(selectionToDayRange('2026-10-10', '2026-10-13', true), { start: '2026-10-10', end: '2026-10-12' })
  })

  it('cruza fin de mes y de año sin desfase', () => {
    assert.deepEqual(selectionToDayRange('2026-10-30', '2026-11-01', true), { start: '2026-10-30', end: '2026-10-31' })
    assert.deepEqual(selectionToDayRange('2026-12-31', '2027-01-01', true), { start: '2026-12-31', end: '2026-12-31' })
  })

  it('en vista semana con horas se queda con la fecha', () => {
    assert.deepEqual(
      selectionToDayRange('2026-10-10T10:00:00+02:00', '2026-10-10T12:00:00+02:00', false),
      { start: '2026-10-10', end: '2026-10-10' }
    )
  })
})
