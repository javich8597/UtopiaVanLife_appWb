import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateContractRequirements, generateContractData } from '../../lib/contracts/contractEngine'

describe('contractEngine validation and data generation', () => {
  it('detects incomplete profile data', () => {
    const invalidProfile = {
      full_name: 'Juan Pérez',
      dni_nie: '', // Missing
      phone: '+34600112233'
    }
    const result = validateContractRequirements(invalidProfile)
    assert.equal(result.isValid, false)
    assert.ok(result.missingFields.includes('dni_nie'))
  })

  it('detects expired or novel license (< 2 years)', () => {
    const novelProfile = {
      full_name: 'Juan Pérez',
      dni_nie: '12345678Z',
      phone: '+34600112233',
      address: 'Calle Mayor 1, Madrid',
      driver_license_id: 'B-12345678',
      driver_license_issue_date: new Date().toISOString(), // 0 years
      driver_license_expiry_date: '2030-01-01'
    }
    const result = validateContractRequirements(novelProfile)
    assert.equal(result.isValid, false)
    assert.ok(result.issues.includes('license_too_novel'))
  })

  it('validates complete and correct profile', () => {
    const validProfile = {
      full_name: 'Juan Pérez',
      dni_nie: '12345678Z',
      phone: '+34600112233',
      address: 'Calle Mayor 1, Madrid',
      driver_license_id: 'B-12345678',
      driver_license_issue_date: '2015-01-01',
      driver_license_expiry_date: '2030-01-01'
    }
    const result = validateContractRequirements(validProfile)
    assert.equal(result.isValid, true)
    assert.equal(result.missingFields.length, 0)
  })

  it('generates official Utopia Van Life legal data and full 31 articles', () => {
    const dummyBooking = {
      id: 'book-abc-123',
      start_date: '2026-10-03',
      end_date: '2026-10-05',
      total_price: 450,
      camper: { slug: 'neo', name: 'Camper NEO' }
    }
    const dummyProfile = {
      full_name: 'Laura Gómez',
      dni_nie: '87654321X',
      phone: '+34611223344',
      address: 'Av. Diagonal 100, Barcelona',
      driver_license_id: 'B-87654321',
      driver_license_issue_date: '2018-05-10',
      driver_license_expiry_date: '2028-05-10'
    }
    const data = generateContractData(dummyBooking, dummyProfile)
    assert.equal(data.lessor.companyName, 'UTOPIA VAN LIFE SL')
    assert.equal(data.lessor.cif, 'B24902637')
    assert.equal(data.lessor.representative, 'ROBERTO ESTEBANEZ BLANCO')
    assert.equal(data.pricing.depositAmount, 1000)
    assert.equal(data.articles.length, 31)
  })
})
