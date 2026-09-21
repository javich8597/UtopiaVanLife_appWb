import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isAdminUser,
  normalizeVerificationStatus,
  canRefundBooking,
  validateDriverLicenseExpiration
} from '../lib/admin/auth'

describe('Admin Area Stress Test — Authorization & Privileges Matrix', () => {
  it('should authorize user with exact admin role', () => {
    assert.equal(isAdminUser({ id: 'u-1', role: 'admin' }), true)
  })

  it('should authorize master admin email', () => {
    assert.equal(isAdminUser({ id: 'u-2', email: 'javipn85@gmail.com' }), true)
  })

  it('should authorize user with boolean is_admin in user_metadata', () => {
    assert.equal(isAdminUser({ id: 'u-3', user_metadata: { is_admin: true } }), true)
  })

  it('should authorize user with string "true" is_admin in user_metadata', () => {
    assert.equal(isAdminUser({ id: 'u-4', user_metadata: { is_admin: 'true' } }), true)
  })

  it('should reject non-admin roles (customer, guest, staff, driver)', () => {
    assert.equal(isAdminUser({ id: 'u-5', role: 'customer' }), false)
    assert.equal(isAdminUser({ id: 'u-6', role: 'guest' }), false)
    assert.equal(isAdminUser({ id: 'u-7', role: 'staff' }), false)
    assert.equal(isAdminUser({ id: 'u-8', role: 'driver' }), false)
  })

  it('should reject uppercase ADMIN role (strict case check)', () => {
    assert.equal(isAdminUser({ id: 'u-9', role: 'ADMIN' }), false)
  })

  it('should reject uppercase master email (strict case check)', () => {
    assert.equal(isAdminUser({ id: 'u-10', email: 'JAVIPN85@GMAIL.COM' }), false)
  })

  it('should reject user with is_admin: false or is_admin: "false"', () => {
    assert.equal(isAdminUser({ id: 'u-11', user_metadata: { is_admin: false } }), false)
    assert.equal(isAdminUser({ id: 'u-12', user_metadata: { is_admin: 'false' } }), false)
  })

  it('should reject empty, null, and undefined user objects', () => {
    assert.equal(isAdminUser({}), false)
    assert.equal(isAdminUser(null), false)
    assert.equal(isAdminUser(undefined), false)
  })
})

describe('Admin Area Stress Test — Camper Payload Validation Logic', () => {
  function validateCamperCreate(body: any) {
    const { name, slug, seats, beds, deposit_amount, price_per_night, base_price, specs } = body || {}

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { status: 400, error: 'El nombre de la camper es obligatorio' }
    }

    const generatedSlug = (slug && typeof slug === 'string' && slug.trim().length > 0)
      ? slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      : name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')

    const parsedSeats = parseInt(seats ?? specs?.seats ?? 2, 10)
    const parsedBeds = parseInt(beds ?? specs?.beds ?? 2, 10)
    const parsedDeposit = parseFloat(deposit_amount ?? 1000)
    const parsedPrice = parseFloat(price_per_night ?? base_price ?? 120)

    if (isNaN(parsedSeats) || parsedSeats < 1) {
      return { status: 400, error: 'Las plazas deben ser un número mayor a 0' }
    }
    if (isNaN(parsedBeds) || parsedBeds < 1) {
      return { status: 400, error: 'Las camas deben ser un número mayor a 0' }
    }
    if (isNaN(parsedDeposit) || parsedDeposit < 0) {
      return { status: 400, error: 'La fianza debe ser un número mayor o igual a 0' }
    }

    return {
      status: 201,
      slug: generatedSlug,
      seats: parsedSeats,
      beds: parsedBeds,
      deposit_amount: parsedDeposit,
      price_per_night: parsedPrice
    }
  }

  function validateCamperPatch(body: any) {
    const { name, slug, seats, beds, deposit_amount } = body || {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return { status: 400, error: 'El nombre no puede estar vacío' }
      }
    }
    if (slug !== undefined) {
      if (typeof slug !== 'string' || slug.trim().length === 0) {
        return { status: 400, error: 'El slug no puede estar vacío' }
      }
    }
    if (deposit_amount !== undefined) {
      const parsedDeposit = parseFloat(deposit_amount)
      if (isNaN(parsedDeposit) || parsedDeposit < 0) {
        return { status: 400, error: 'La fianza debe ser un número positivo' }
      }
    }
    if (seats !== undefined) {
      const parsedSeats = parseInt(seats, 10)
      if (isNaN(parsedSeats) || parsedSeats < 1) {
        return { status: 400, error: 'Las plazas deben ser un número mayor a 0' }
      }
    }
    if (beds !== undefined) {
      const parsedBeds = parseInt(beds, 10)
      if (isNaN(parsedBeds) || parsedBeds < 1) {
        return { status: 400, error: 'Las camas deben ser un número mayor a 0' }
      }
    }

    return { status: 200, valid: true }
  }

  it('should reject camper creation with missing or empty name', () => {
    assert.equal(validateCamperCreate({}).status, 400)
    assert.equal(validateCamperCreate({ name: '' }).status, 400)
    assert.equal(validateCamperCreate({ name: '   ' }).status, 400)
  })

  it('should auto-derive slug when slug is omitted but name is provided', () => {
    const res = validateCamperCreate({ name: 'Utopia Horizon Edition' })
    assert.equal(res.status, 201)
    assert.equal(res.slug, 'utopia-horizon-edition')
  })

  it('should sanitize custom slug with spaces or invalid symbols', () => {
    const res = validateCamperCreate({ name: 'Test', slug: 'Utopia Space & Sun 2026!' })
    assert.equal(res.status, 201)
    assert.equal(res.slug, 'utopia-space---sun-2026-')
  })

  it('should reject negative or zero seats in creation', () => {
    assert.equal(validateCamperCreate({ name: 'Test', seats: -1 }).status, 400)
    assert.equal(validateCamperCreate({ name: 'Test', seats: 0 }).status, 400)
    assert.equal(validateCamperCreate({ name: 'Test', seats: 'invalid' }).status, 400)
  })

  it('should reject negative or zero beds in creation', () => {
    assert.equal(validateCamperCreate({ name: 'Test', beds: -2 }).status, 400)
    assert.equal(validateCamperCreate({ name: 'Test', beds: 0 }).status, 400)
  })

  it('should reject negative deposit amount in creation', () => {
    assert.equal(validateCamperCreate({ name: 'Test', deposit_amount: -500 }).status, 400)
    assert.equal(validateCamperCreate({ name: 'Test', deposit_amount: 'abc' }).status, 400)
  })

  it('should accept 0 deposit amount in creation', () => {
    const res = validateCamperCreate({ name: 'Test', deposit_amount: 0 })
    assert.equal(res.status, 201)
    assert.equal(res.deposit_amount, 0)
  })

  it('should reject empty slug in camper patch update', () => {
    assert.equal(validateCamperPatch({ slug: '' }).status, 400)
    assert.equal(validateCamperPatch({ slug: '   ' }).status, 400)
  })

  it('should reject empty name in camper patch update', () => {
    assert.equal(validateCamperPatch({ name: '' }).status, 400)
  })

  it('should reject negative seats, beds, or deposit in camper patch update', () => {
    assert.equal(validateCamperPatch({ seats: -1 }).status, 400)
    assert.equal(validateCamperPatch({ beds: -1 }).status, 400)
    assert.equal(validateCamperPatch({ deposit_amount: -100 }).status, 400)
  })
})

describe('Admin Area Stress Test — Verification Rejection Payload Logic', () => {
  function validateVerifyDoc(body: any) {
    const { userId, action, reason } = body || {}

    if (!userId || !['approve', 'reject'].includes(action)) {
      return { status: 400, error: 'Parámetros inválidos' }
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected'
    const rejectionReason = action === 'reject' ? (reason || 'Rechazado por administración') : null

    return {
      status: 200,
      newStatus,
      rejectionReason
    }
  }

  it('should reject verification with missing userId', () => {
    assert.equal(validateVerifyDoc({ action: 'approve' }).status, 400)
    assert.equal(validateVerifyDoc({ userId: '', action: 'approve' }).status, 400)
  })

  it('should reject verification with invalid action', () => {
    assert.equal(validateVerifyDoc({ userId: 'u1', action: 'deny' }).status, 400)
    assert.equal(validateVerifyDoc({ userId: 'u1', action: 'delete' }).status, 400)
    assert.equal(validateVerifyDoc({ userId: 'u1', action: '' }).status, 400)
    assert.equal(validateVerifyDoc({ userId: 'u1' }).status, 400)
  })

  it('should accept approve action with status "verified" and null reason', () => {
    const res = validateVerifyDoc({ userId: 'u1', action: 'approve' })
    assert.equal(res.status, 200)
    assert.equal(res.newStatus, 'verified')
    assert.equal(res.rejectionReason, null)
  })

  it('should accept reject action and preserve custom explicit reason', () => {
    const res = validateVerifyDoc({
      userId: 'u1',
      action: 'reject',
      reason: 'Carnet de conducir caducado'
    })
    assert.equal(res.status, 200)
    assert.equal(res.newStatus, 'rejected')
    assert.equal(res.rejectionReason, 'Carnet de conducir caducado')
  })

  it('should fall back to default rejection reason when reason is omitted or empty', () => {
    const resNoReason = validateVerifyDoc({ userId: 'u1', action: 'reject' })
    assert.equal(resNoReason.status, 200)
    assert.equal(resNoReason.newStatus, 'rejected')
    assert.equal(resNoReason.rejectionReason, 'Rechazado por administración')

    const resEmptyReason = validateVerifyDoc({ userId: 'u1', action: 'reject', reason: '' })
    assert.equal(resEmptyReason.status, 200)
    assert.equal(resEmptyReason.rejectionReason, 'Rechazado por administración')
  })
})

describe('Admin Area Stress Test — Season Price & Nightly Rates Validation', () => {
  function validateSeasonPatch(body: any) {
    const { min_nights, discount_7days_pct, price_per_night } = body || {}
    const updatePayload: Record<string, any> = {}
    let parsedPrice: number | undefined

    if (min_nights !== undefined) {
      const parsedMinNights = parseInt(min_nights, 10)
      if (isNaN(parsedMinNights) || parsedMinNights < 1 || parsedMinNights > 30) {
        return { status: 400, error: 'El valor de noches mínimas debe ser un número entero entre 1 y 30' }
      }
      updatePayload.min_nights = parsedMinNights
    }

    if (discount_7days_pct !== undefined) {
      const parsedDiscount = parseFloat(discount_7days_pct)
      if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
        return { status: 400, error: 'El descuento debe ser un porcentaje válido entre 0 y 100' }
      }
      updatePayload.discount_7days_pct = parsedDiscount
    }

    if (price_per_night !== undefined) {
      parsedPrice = parseFloat(price_per_night)
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return { status: 400, error: 'El precio por noche debe ser un número válido mayor o igual a 0' }
      }
      updatePayload.price_per_night = parsedPrice
    }

    if (Object.keys(updatePayload).length === 0) {
      return { status: 400, error: 'No se enviaron campos válidos para actualizar' }
    }

    return { status: 200, payload: updatePayload, parsedPrice }
  }

  it('should reject negative price_per_night', () => {
    assert.equal(validateSeasonPatch({ price_per_night: -10 }).status, 400)
    assert.equal(validateSeasonPatch({ price_per_night: -0.01 }).status, 400)
  })

  it('should reject non-numeric price_per_night', () => {
    assert.equal(validateSeasonPatch({ price_per_night: 'abc' }).status, 400)
    assert.equal(validateSeasonPatch({ price_per_night: 'NaN' }).status, 400)
  })

  it('should reject out-of-bounds min_nights (< 1 or > 30)', () => {
    assert.equal(validateSeasonPatch({ min_nights: 0 }).status, 400)
    assert.equal(validateSeasonPatch({ min_nights: -3 }).status, 400)
    assert.equal(validateSeasonPatch({ min_nights: 31 }).status, 400)
  })

  it('should reject out-of-bounds discount percentage (< 0 or > 100)', () => {
    assert.equal(validateSeasonPatch({ discount_7days_pct: -1 }).status, 400)
    assert.equal(validateSeasonPatch({ discount_7days_pct: 101 }).status, 400)
  })

  it('should reject empty update payloads', () => {
    assert.equal(validateSeasonPatch({}).status, 400)
    assert.equal(validateSeasonPatch({ unknown_prop: 123 }).status, 400)
  })

  it('should accept valid price_per_night updates (including 0)', () => {
    const res0 = validateSeasonPatch({ price_per_night: 0 })
    assert.equal(res0.status, 200)
    assert.equal(res0.parsedPrice, 0)

    const res150 = validateSeasonPatch({ price_per_night: 155.5 })
    assert.equal(res150.status, 200)
    assert.equal(res150.parsedPrice, 155.5)
  })
})

describe('Admin Area Stress Test — Driver License Seniority & Expiration Checks', () => {
  it('should mark license expired if expiryDate is in the past', () => {
    const res = validateDriverLicenseExpiration('2020-01-01', '2015-01-01')
    assert.equal(res.isExpired, true)
    assert.equal(res.isValid, false)
  })

  it('should mark novice driver if seniority < 2 years', () => {
    // 6 months ago
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const futureExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const res = validateDriverLicenseExpiration(futureExpiry, sixMonthsAgo)
    assert.equal(res.isNovice, true)
    assert.equal(res.isValid, false)
  })

  it('should validate experienced driver with valid future license (> 2 years)', () => {
    // 5 years ago
    const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const futureExpiry = new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const res = validateDriverLicenseExpiration(futureExpiry, fiveYearsAgo)
    assert.equal(res.isValid, true)
    assert.equal(res.isExpired, false)
    assert.equal(res.isNovice, false)
    assert.ok((res.yearsOfExperience ?? 0) >= 4.9)
  })

  it('should handle missing license expiry gracefully', () => {
    const res = validateDriverLicenseExpiration(null, null)
    assert.equal(res.isValid, false)
    assert.equal(res.isExpired, false)
    assert.equal(res.isNovice, false)
  })
})
