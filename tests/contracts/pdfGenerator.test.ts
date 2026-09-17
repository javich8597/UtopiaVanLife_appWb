import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateOfficialContractPdfBlob } from '../../lib/contracts/pdfGenerator'
import { generateContractData } from '../../lib/contracts/contractEngine'

describe('pdfGenerator', () => {
  it('generates a multipage PDF blob containing contract clauses and signatures', async () => {
    const dummyBooking = {
      id: 'book-test-123',
      start_date: '2026-10-03',
      end_date: '2026-10-05',
      total_price: 450,
      camper: { slug: 'neo', name: 'Camper NEO', plate_number: '8291-LKN' }
    }
    const dummyProfile = {
      full_name: 'Carlos Ruiz',
      dni_nie: '12345678Z',
      phone: '+34600112233',
      address: 'Calle Mayor 1, Madrid',
      driver_license_id: 'B-12345678',
      driver_license_issue_date: '2015-01-01',
      driver_license_expiry_date: '2030-01-01'
    }
    const contractData = generateContractData(dummyBooking, dummyProfile)
    // 1x1 transparent/black PNG base64 for test
    const dummySignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    const { doc, blob, buffer } = await generateOfficialContractPdfBlob(contractData, dummySignature)
    assert.ok(doc.getNumberOfPages() >= 4, `Expected at least 4 pages, got ${doc.getNumberOfPages()}`)
    assert.ok(buffer.length > 5000, `Expected buffer length > 5000, got ${buffer.length}`)
  })
})
