import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { latestDocument, DOCUMENT_PREFIXES } from '../lib/admin/documents'

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
