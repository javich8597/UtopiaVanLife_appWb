import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { latestDocument, DOCUMENT_PREFIXES } from '../lib/admin/documents'
import { adminStatusLabel } from '../lib/admin/bookingStatus'

const files = (...names: string[]) => names.map(name => ({ name }))

describe('Admin: documentos del cliente', () => {
  it('no confunde el carnet del titular con el del segundo conductor', () => {
    const list = files('dni_front_100.jpg', 'front_100.jpg', 'second_license_front_100.jpg', 'second_dni_front_100.jpg')
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseFrontUrl), 'front_100.jpg')
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.dniFrontUrl), 'dni_front_100.jpg')
  })

  it('no muestra el DNI como carnet si el carnet no se ha subido', () => {
    const list = files('dni_front_100.jpg', 'dni_back_100.jpg')
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseFrontUrl), null)
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseBackUrl), null)
  })

  it('elige la subida más reciente por timestamp', () => {
    const list = files('front_900.jpg', 'front_1000.png', 'back_5.jpg')
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseFrontUrl), 'front_1000.png')
    assert.equal(latestDocument(list, DOCUMENT_PREFIXES.licenseBackUrl), 'back_5.jpg')
  })
})

describe('Admin: etiqueta de estado', () => {
  const now = new Date('2026-10-03T20:00:00Z')

  it('distingue la pendiente ya pagada de la que espera el pago', () => {
    assert.equal(adminStatusLabel({ status: 'pending', payment_status: 'paid', created_at: '2026-01-01' }, now), 'Pagada · por aceptar')
    assert.equal(adminStatusLabel({ status: 'pending', payment_status: 'pending', created_at: '2026-10-03T19:30:00Z' }, now), 'Pendiente de pago')
    assert.equal(adminStatusLabel({ status: 'pending', payment_status: 'pending', created_at: '2026-10-03T10:00:00Z' }, now), 'Caducada')
  })
})
