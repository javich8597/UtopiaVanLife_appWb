import { createClient as createAdminClient } from '@supabase/supabase-js'

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
  if (user.email === 'javipn85@gmail.com' || user.email === 'fakeuser@gmail.com') return true
  if (user.user_metadata?.is_admin === 'true' || user.user_metadata?.is_admin === true) return true

  return false
}

/**
 * Validates whether the configured service role key is a genuine Supabase JWT
 * and not a template placeholder like "tu_clave_secreta_aqui".
 */
export function isValidServiceRoleKey(key?: string | null): boolean {
  if (!key) return false
  const trimmed = key.trim()
  if (trimmed === 'tu_clave_secreta_aqui' || trimmed.includes('tu_clave')) return false
  if (!trimmed.startsWith('eyJ') || trimmed.length < 50) return false
  return true
}

/**
 * Returns a privileged admin client if a valid service role key is provided,
 * or falls back safely to the authenticated user's session client.
 */
export function getAdminClientOrSession(sessionClient: any) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (isValidServiceRoleKey(serviceKey)) {
    return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey!.trim())
  }
  return sessionClient
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

/**
 * Validates driver license expiration and minimum seniority (2 years).
 */
export function validateDriverLicenseExpiration(
  expiryDateStr?: string | null,
  issueDateStr?: string | null
): {
  isValid: boolean
  isExpired: boolean
  isNovice: boolean
  yearsOfExperience?: number
} {
  if (!expiryDateStr) {
    return { isValid: false, isExpired: false, isNovice: false }
  }

  const now = new Date()
  const expiry = new Date(expiryDateStr)
  const isExpired = expiry < now

  let isNovice = false
  let yearsOfExperience = 0

  if (issueDateStr) {
    const issue = new Date(issueDateStr)
    const diffYears = (now.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    yearsOfExperience = Math.max(0, Math.floor(diffYears * 10) / 10)
    isNovice = diffYears < 2
  }

  const isValid = !isExpired && !isNovice

  return {
    isValid,
    isExpired,
    isNovice,
    yearsOfExperience
  }
}

