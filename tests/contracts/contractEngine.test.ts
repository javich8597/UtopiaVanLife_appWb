import { describe, it } from 'node:test'
import assert from 'node:assert'
import { validateDriverLicense } from '../../lib/contracts/licenseValidator'
import { generateContractData, detectCamperModelSpecs } from '../../lib/contracts/contractEngine'

describe('Driver License Validation & Expiration Engine', () => {
  it('should mark license as valid if expiry date is in the future and issue date is > 2 years ago', () => {
    const today = new Date()
    const issueDate = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate()).toISOString().split('T')[0]
    const expiryDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate()).toISOString().split('T')[0]

    const result = validateDriverLicense(issueDate, expiryDate)
    assert.strictEqual(result.isValid, true)
    assert.strictEqual(result.isExpired, false)
    assert.strictEqual(result.isNovel, false)
    assert.strictEqual(result.yearsHeld >= 5, true)
  })

  it('should flag license as novel if issue date is less than 2 years ago', () => {
    const today = new Date()
    const issueDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]
    const expiryDate = new Date(today.getFullYear() + 8, today.getMonth(), today.getDate()).toISOString().split('T')[0]

    const result = validateDriverLicense(issueDate, expiryDate)
    assert.strictEqual(result.isValid, true)
    assert.strictEqual(result.isNovel, true)
    assert.strictEqual(result.isExpired, false)
    assert.match(result.warningMessage || '', /menos de 2 años/)
  })

  it('should flag license as expired if expiry date is in the past', () => {
    const today = new Date()
    const issueDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()).toISOString().split('T')[0]
    const expiryDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]

    const result = validateDriverLicense(issueDate, expiryDate)
    assert.strictEqual(result.isValid, false)
    assert.strictEqual(result.isExpired, true)
    assert.match(result.warningMessage || '', /caducado/)
  })
})

describe('Camper Model Detection (NEO vs SPACE)', () => {
  it('should correctly detect NEO model specifications', () => {
    const specs = detectCamperModelSpecs('neo')
    assert.strictEqual(specs.modelName, 'Nomade NEO')
    assert.strictEqual(specs.vehicleType, 'Fiat Ducato L3H2 (5.99m)')
    assert.match(specs.capacity, /2-3 Plazas/)
    assert.strictEqual(specs.lengthMeters, 5.99)
  })

  it('should correctly detect SPACE model specifications', () => {
    const specs = detectCamperModelSpecs('space')
    assert.strictEqual(specs.modelName, 'Nomade SPACE')
    assert.strictEqual(specs.vehicleType, 'Fiat Ducato L3H2 (5.99m)')
    assert.match(specs.capacity, /2 Plazas/)
    assert.strictEqual(specs.lengthMeters, 5.99)
  })
})

describe('Dynamic Contract Data Generation', () => {
  it('should auto-fill all user, vehicle and booking fields into the official contract structure', () => {
    const mockBooking = {
      id: 'book-12345',
      start_date: '2026-09-10',
      end_date: '2026-09-15',
      pickup_time: '10:00',
      dropoff_time: '18:00',
      total_price: 750,
      extras: ['cama_extra', 'pack_playa'],
      camper: { slug: 'neo', name: 'Nomade NEO' }
    }

    const mockProfile = {
      full_name: 'Carlos Ruiz García',
      dni_nie: '12345678Z',
      driver_license_id: 'B-87654321',
      driver_license_issue_date: '2018-05-12',
      driver_license_expiry_date: '2028-05-12',
      address: 'Calle Mayor 14, 28013 Madrid, España',
      phone: '+34 654 321 987',
      email: 'carlos@example.com'
    }

    const contract = generateContractData(mockBooking, mockProfile)

    assert.strictEqual(contract.contractNumber, 'CTR-BOOK-BOOK1234')
    assert.strictEqual(contract.lessor.companyName, 'Utopia Van Life S.L.')
    assert.strictEqual(contract.lessee.fullName, 'Carlos Ruiz García')
    assert.strictEqual(contract.lessee.dniNie, '12345678Z')
    assert.strictEqual(contract.lessee.driverLicenseId, 'B-87654321')
    assert.strictEqual(contract.vehicle.modelName, 'Nomade NEO')
    assert.strictEqual(contract.vehicle.vehicleType, 'Fiat Ducato L3H2 (5.99m)')
    assert.strictEqual(contract.booking.startDate, '2026-09-10')
    assert.strictEqual(contract.booking.endDate, '2026-09-15')
    assert.strictEqual(contract.pricing.totalPrice, 750)
    assert.strictEqual(contract.pricing.depositAmount, 1000)
  })
})
