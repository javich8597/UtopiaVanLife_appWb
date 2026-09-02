import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isAdminUser, normalizeVerificationStatus, canRefundBooking } from '../lib/admin/auth'

describe('Admin Panel Authorization & Security (TDD)', () => {
  it('should authorize user with role === "admin"', () => {
    const user = { id: 'u1', role: 'admin', email: 'admin@utopia.com' }
    assert.equal(isAdminUser(user), true)
  })

  it('should authorize the master admin email (javipn85@gmail.com) regardless of role', () => {
    const user = { id: 'u2', email: 'javipn85@gmail.com', role: 'customer' }
    assert.equal(isAdminUser(user), true)
  })

  it('should authorize user with is_admin === "true" in user_metadata', () => {
    const user = { id: 'u3', email: 'staff@utopia.com', user_metadata: { is_admin: 'true' } }
    assert.equal(isAdminUser(user), true)
  })

  it('should reject non-admin customer users', () => {
    const user = { id: 'u4', email: 'traveler@gmail.com', role: 'customer' }
    assert.equal(isAdminUser(user), false)
  })

  it('should reject null or undefined user', () => {
    assert.equal(isAdminUser(null), false)
    assert.equal(isAdminUser(undefined), false)
  })
})

describe('Verification Status Normalization (TDD)', () => {
  it('should normalize "approved" and "verified" to "verified"', () => {
    assert.equal(normalizeVerificationStatus('approved'), 'verified')
    assert.equal(normalizeVerificationStatus('verified'), 'verified')
  })

  it('should normalize "pending_validation" and "pending" to "pending"', () => {
    assert.equal(normalizeVerificationStatus('pending_validation'), 'pending')
    assert.equal(normalizeVerificationStatus('pending'), 'pending')
  })

  it('should normalize "rejected" to "rejected"', () => {
    assert.equal(normalizeVerificationStatus('rejected'), 'rejected')
  })

  it('should default missing or invalid statuses to "not_submitted"', () => {
    assert.equal(normalizeVerificationStatus(null), 'not_submitted')
    assert.equal(normalizeVerificationStatus(undefined), 'not_submitted')
    assert.equal(normalizeVerificationStatus(''), 'not_submitted')
    assert.equal(normalizeVerificationStatus('unknown'), 'not_submitted')
  })
})

describe('Refund Validation Rules (TDD)', () => {
  it('should allow refund on confirmed bookings', () => {
    const result = canRefundBooking('confirmed')
    assert.equal(result.allowed, true)
  })

  it('should allow refund on pending or active bookings', () => {
    assert.equal(canRefundBooking('pending').allowed, true)
    assert.equal(canRefundBooking('active').allowed, true)
  })

  it('should reject refund on already cancelled bookings', () => {
    const result = canRefundBooking('cancelled')
    assert.equal(result.allowed, false)
    assert.equal(result.reason, 'La reserva ya está cancelada')
  })

  it('should reject refund on empty or missing status', () => {
    const result = canRefundBooking(null)
    assert.equal(result.allowed, false)
  })
})
