/**
 * Estado "de negocio" de una reserva tal y como lo ve el backoffice.
 *
 * Una reserva queda en 'pending' mientras el cliente paga en Redsys. Si nunca paga,
 * el bloqueo de fechas caduca (blocked_dates.expires_at, 30 min) pero la fila sigue en
 * 'pending'. Esas reservas abandonadas se tratan aquí como 'expired' para que no inflen
 * cobros pendientes, contadores ni el calendario.
 *
 * Cuando Redsys confirma el pago, el webhook deja la reserva en 'pending' con
 * payment_status 'paid' a la espera de que el admin la confirme: eso es 'review'
 * (pagada, por confirmar), no un cobro pendiente.
 *
 * Aparte del estado, una reserva puede llevar un aviso de pago a revisar: el webhook de Redsys
 * lo escribe en `notes` cuando el cobro no cuadra (importe distinto) o llega a una reserva
 * cancelada o reembolsada. Ese cobro es dinero real sin conciliar: la reserva no se da por
 * abandonada ni se archiva en lote, y se señala en la lista y en la portada hasta que el
 * admin la marca como revisada.
 */

/** Margen tras crear la reserva para considerarla abandonada (hold de 30 min + colchón de Redsys) */
export const ABANDONED_AFTER_MINUTES = 60

/** Prefijo con el que lib/redsysNotification.ts (appendPaymentAlert) escribe cada aviso en `notes` */
export const PAYMENT_ALERT_MARKER = '[PAGO A REVISAR]'
/** Prefijo de la línea que añade el admin al marcar un aviso como revisado */
export const PAYMENT_REVIEWED_MARKER = '[PAGO REVISADO]'

/** Columnas que necesita getAdminBookingStatus: toda consulta que lo use debe pedirlas */
export const BOOKING_STATUS_COLUMNS = 'id, status, payment_status, created_at, notes'

export type AdminBookingStatus = 'review' | 'pending' | 'expired' | 'confirmed' | 'active' | 'completed' | 'cancelled'

export interface StatusBookingLike {
  status: string
  payment_status?: string | null
  created_at?: string | null
  notes?: string | null
}

const markerText = (line: string, marker: string): string | null => {
  const trimmed = line.trim()
  return trimmed.startsWith(marker) ? trimmed.slice(marker.length).trim() : null
}

/**
 * Textos de los avisos de pago que siguen sin revisar. Solo cuentan las líneas que empiezan
 * por el marcador; un aviso deja de estar activo cuando existe su línea [PAGO REVISADO] con el
 * mismo texto. La línea original se conserva: appendPaymentAlert la usa para no repetirla si
 * Redsys reenvía la notificación.
 */
export function activePaymentAlerts(notes: string | null | undefined): string[] {
  if (!notes) return []
  const lines = notes.split(/\r?\n/)
  const reviewed = new Set(lines.map(l => markerText(l, PAYMENT_REVIEWED_MARKER)).filter((t): t is string => t !== null))
  const active: string[] = []
  for (const line of lines) {
    const text = markerText(line, PAYMENT_ALERT_MARKER)
    if (text !== null && !reviewed.has(text) && !active.includes(text)) active.push(text)
  }
  return active
}

export function hasPaymentAlert(b: { notes?: string | null }): boolean {
  return activePaymentAlerts(b.notes).length > 0
}

/** Notas con cada aviso activo marcado como revisado. Devuelve null si no hay nada que revisar */
export function markPaymentAlertsReviewed(notes: string | null | undefined): string | null {
  const active = activePaymentAlerts(notes)
  if (active.length === 0) return null
  return [notes!.replace(/\s+$/, ''), ...active.map(text => `${PAYMENT_REVIEWED_MARKER} ${text}`)].join('\n')
}

export function isAbandonedPending(b: StatusBookingLike, now: Date = new Date()): boolean {
  if (b.status !== 'pending') return false
  if (b.payment_status === 'paid') return false
  // Cobro con incidencia: hay dinero de por medio, nunca es una reserva abandonada
  if (hasPaymentAlert(b)) return false
  if (!b.created_at) return false
  const created = new Date(b.created_at).getTime()
  if (isNaN(created)) return false
  return now.getTime() - created > ABANDONED_AFTER_MINUTES * 60 * 1000
}

export function getAdminBookingStatus(b: StatusBookingLike, now: Date = new Date()): AdminBookingStatus {
  if (b.status === 'pending' && b.payment_status === 'paid') return 'review'
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

/** Reserva 'pending' que requiere atención: pagada o aún viva (lo mismo que actionablePendingFilter, en memoria) */
export function isActionablePending(b: StatusBookingLike, now: Date = new Date()): boolean {
  if (b.status !== 'pending') return false
  if (b.payment_status === 'paid') return true
  const created = b.created_at ? new Date(b.created_at).getTime() : NaN
  return !isNaN(created) && created >= now.getTime() - ABANDONED_AFTER_MINUTES * 60 * 1000
}

/** Filtro PostgREST (.or) de las reservas 'pending' que requieren atención: pagadas o aún vivas */
export function actionablePendingFilter(now: Date = new Date()): string {
  return `payment_status.eq.paid,created_at.gte.${livePendingSince(now)}`
}

export const ADMIN_STATUS_LABELS: Record<AdminBookingStatus, string> = {
  review: 'Pagada, por confirmar',
  pending: 'Pendiente de pago',
  expired: 'Caducada',
  confirmed: 'Confirmada',
  active: 'En viaje',
  completed: 'Completada',
  cancelled: 'Cancelada',
}
