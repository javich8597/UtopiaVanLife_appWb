export interface UserLike {
  id?: string
  email?: string
  role?: string
  user_metadata?: Record<string, any>
  verification_status?: string
}

/**
 * Checks if a user has administrator access rights.
 */
export function isAdminUser(user: UserLike | null | undefined): boolean {
  if (!user) return false

  if (user.role === 'admin') return true
  if (user.email === 'javipn85@gmail.com') return true
  if (user.user_metadata?.is_admin === 'true' || user.user_metadata?.is_admin === true) return true

  return false
}

/**
 * Normalizes verification status strings across database, storage, and UI states.
 */
export function normalizeVerificationStatus(
  status: string | null | undefined
): 'verified' | 'pending' | 'rejected' | 'not_submitted' {
  if (!status) return 'not_submitted'

  const s = status.trim().toLowerCase()
  if (s === 'verified' || s === 'approved') return 'verified'
  if (s === 'pending_validation' || s === 'pending') return 'pending'
  if (s === 'rejected') return 'rejected'

  return 'not_submitted'
}

/**
 * Validates whether a booking can be refunded or cancelled from the admin panel.
 */
export function canRefundBooking(status: string | null | undefined): {
  allowed: boolean
  reason?: string
} {
  if (!status) {
    return { allowed: false, reason: 'Estado de reserva no especificado' }
  }

  const s = status.trim().toLowerCase()
  if (s === 'cancelled') {
    return { allowed: false, reason: 'La reserva ya está cancelada' }
  }

  if (['confirmed', 'active', 'pending', 'completed'].includes(s)) {
    return { allowed: true }
  }

  return { allowed: false, reason: `Estado '${status}' no permite reembolso` }
}
