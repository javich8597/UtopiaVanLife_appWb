import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { CHECKLIST, handoverSteps, missingSteps, kmSummary } from '../lib/handover/checklist'

const allChecked = (kind: 'pickup' | 'return') => Object.fromEntries(CHECKLIST[kind].map(i => [i.id, true]))

describe('Entrega de la camper: pasos obligatorios', () => {
  it('una entrega vacía tiene todos los pasos pendientes, empezando por el carnet', () => {
    const missing = missingSteps({ kind: 'pickup' })
    assert.equal(missing[0], 'Carnet comprobado')
    assert.equal(missing.length, 6)
  })

  it('la devolución no pide comprobar el carnet', () => {
    assert.ok(!handoverSteps({ kind: 'return' }).some(s => s.id === 'license'))
  })

  it('una entrega completa no tiene pasos pendientes', () => {
    const h = {
      kind: 'pickup' as const, license_checked: true, km: 12345, fuel_level: 'Lleno',
      dashboard_photo_path: 'a.jpg', exterior_video_path: 'e.webm', interior_video_path: 'i.webm',
      checklist: allChecked('pickup'), customer_signature: 'data:image/png;base64,x',
    }
    assert.deepEqual(missingSteps(h), [])
  })

  it('los km 0 son válidos pero sin foto del cuadro el paso no está hecho', () => {
    const steps = handoverSteps({ kind: 'return', km: 0, fuel_level: 'Lleno' })
    assert.equal(steps.find(s => s.id === 'km')?.done, false)
  })

  it('la revisión exige marcar todos los puntos', () => {
    const checks = allChecked('pickup'); delete (checks as any).keys
    assert.equal(handoverSteps({ kind: 'pickup', checklist: checks }).find(s => s.id === 'checklist')?.done, false)
  })
})

describe('Kilómetros recorridos', () => {
  it('calcula el exceso sobre 150 km/día', () => {
    assert.deepEqual(kmSummary(10000, 11000, 5, 'included_150'), { driven: 1000, allowance: 750, extra: 250 })
  })
  it('sin exceso con km ilimitados', () => {
    assert.deepEqual(kmSummary(10000, 11000, 5, 'unlimited'), { driven: 1000, allowance: null, extra: 0 })
  })
  it('sin datos de alguno de los dos, no hay resumen', () => {
    assert.equal(kmSummary(null, 11000, 5), null)
  })
})
