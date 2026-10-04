/**
 * Estado "de negocio" de una reserva tal y como lo ve el backoffice.
 *
 * Una reserva queda en 'pending' mientras el cliente paga en Redsys. Si nunca paga,
 * el bloqueo de fechas caduca (blocked_dates.expires_at, 30 min) pero la fila sigue en
 * 'pending'. Esas reservas abandonadas se tratan aquí como 'expired' para que no inflen
 * cobros pendientes, contadores ni el calendario.
 */

/** Margen tras crear la reserva para considerarla abandonada (hold de 30 min + colchón de Redsys) */
export const ABANDONED_AFTER_MINUTES = 60

export type AdminBookingStatus = 'pending' | 'expired' | 'confirmed' | 'active' | 'completed' | 'cancelled'

export interface StatusBookingLike {
  status: string
  payment_status?: string | null
  created_at?: string | null
}

export function isAbandonedPending(b: StatusBookingLike, now: Date = new Date()): boolean {
  if (b.status !== 'pending') return false
  if (b.payment_status === 'paid') return false
  if (!b.created_at) return false
  const created = new Date(b.created_at).getTime()
  if (isNaN(created)) return false
  return now.getTime() - created > ABANDONED_AFTER_MINUTES * 60 * 1000
}

export function getAdminBookingStatus(b: StatusBookingLike, now: Date = new Date()): AdminBookingStatus {
  if (isAbandonedPending(b, now)) return 'expired'
  if (['pending', 'confirmed', 'active', 'completed', 'cancelled'].includes(b.status)) {
    return b.status as AdminBookingStatus
  }
  return 'pending'
}

/** Fecha ISO a partir de la cual una reserva 'pending' sigue viva (para filtrar en Supabase) */
export function livePendingSince(now: Date = new Date()): string {
  return new Date(now.getTime() - ABANDONED_AFTER_MINUTES * 60 * 1000).toISOString()
}

export const ADMIN_STATUS_LABELS: Record<AdminBookingStatus, string> = {
  pending: 'Pendiente de pago',
  expired: 'Caducada',
  confirmed: 'Confirmada',
  active: 'En viaje',
  completed: 'Completada',
  cancelled: 'Cancelada',
}
