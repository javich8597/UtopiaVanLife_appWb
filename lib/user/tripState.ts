/**
 * Estado del viaje tal y como lo ve el cliente en "Mi reserva".
 * Decide qué reserva mostrar y cuál es el único siguiente paso que tiene que dar.
 */
import { isAbandonedPending } from '@/lib/admin/bookingStatus'

export type LicenseState = 'missing' | 'review' | 'verified' | 'rejected'

export type NextStep =
  | 'pay'          // reserva creada pero sin pagar (pago en curso)
  | 'license'      // falta subir el carnet
  | 'license-fix'  // el carnet fue rechazado
  | 'contract'     // falta firmar el contrato
  | 'waiting'      // todo enviado, falta que el equipo valide carnet o reserva
  | 'ready'        // todo listo para la recogida
  | 'on-trip'      // el viaje está en curso
  | 'returned'     // viaje terminado, pendiente de cerrar (fianza)

export interface TripBookingLike {
  id?: string
  status: string
  payment_status?: string | null
  created_at?: string | null
  start_date: string
  end_date: string
  contract_signed_at?: string | null
}

export interface TripProfileLike {
  verification_status?: string | null
}

export interface Milestone {
  key: 'paid' | 'license' | 'contract' | 'pickup'
  label: string
  done: boolean
  current: boolean
}

export interface TripState {
  step: NextStep
  license: LicenseState
  isPaid: boolean
  isConfirmed: boolean
  isSigned: boolean
  daysToStart: number
  nights: number
  milestones: Milestone[]
}

const DAY = 24 * 60 * 60 * 1000

export function getLicenseState(profile?: TripProfileLike | null): LicenseState {
  const s = profile?.verification_status
  if (s === 'verified') return 'verified'
  if (s === 'pending' || s === 'pending_validation') return 'review'
  if (s === 'rejected') return 'rejected'
  return 'missing'
}

/** Días naturales hasta el inicio (0 = hoy, negativo = ya empezó) */
export function daysUntil(dateIso: string, now: Date = new Date()): number {
  // 'YYYY-MM-DD' es un día de calendario: se lee tal cual (new Date() lo trataría como
  // medianoche UTC y fuera de Europa daría el día anterior). "Hoy" es el día local del cliente.
  const [y, m, d] = dateIso.slice(0, 10).split('-').map(Number)
  const a = Date.UTC(y, m - 1, d)
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((a - b) / DAY)
}

const localDayStr = (now: Date) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

/** Reservas vivas que el cliente debe ver (sin canceladas ni pagos abandonados) */
export function isLiveBooking(b: TripBookingLike, now: Date = new Date()): boolean {
  if (b.status === 'cancelled' || b.status === 'completed') return false
  if (isAbandonedPending(b, now)) return false
  return ['pending', 'confirmed', 'active'].includes(b.status)
}

/** La reserva a mostrar: la más próxima que no haya terminado; si no, la última en curso */
export function pickCurrentBooking<T extends TripBookingLike>(bookings: T[], now: Date = new Date()): T | undefined {
  const live = bookings
    .filter(b => isLiveBooking(b, now))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  const today = localDayStr(now)
  return live.find(b => b.end_date.slice(0, 10) >= today) || live[live.length - 1]
}

export function getTripState(booking: TripBookingLike, profile?: TripProfileLike | null, now: Date = new Date()): TripState {
  const license = getLicenseState(profile)
  const isPaid = booking.payment_status === 'paid' || booking.status === 'confirmed' || booking.status === 'active'
  const isConfirmed = booking.status === 'confirmed' || booking.status === 'active'
  const isSigned = Boolean(booking.contract_signed_at)
  const daysToStart = daysUntil(booking.start_date, now)
  const daysToEnd = daysUntil(booking.end_date, now)
  const nights = Math.max(1, Math.round((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / DAY))

  let step: NextStep
  if (!isPaid) step = 'pay'
  else if (daysToEnd < 0) step = 'returned'
  else if (daysToStart <= 0) step = 'on-trip'
  else if (license === 'rejected') step = 'license-fix'
  else if (license === 'missing') step = 'license'
  else if (!isSigned) step = 'contract'
  else if (license === 'review' || !isConfirmed) step = 'waiting'
  else step = 'ready'

  const order: Milestone['key'][] = ['paid', 'license', 'contract', 'pickup']
  const done: Record<Milestone['key'], boolean> = {
    paid: isPaid,
    license: license === 'verified',
    contract: isSigned,
    pickup: daysToStart <= 0 && isPaid,
  }
  const currentKey = order.find(k => !done[k])
  const labels: Record<Milestone['key'], string> = {
    paid: 'Pago',
    license: 'Carnet',
    contract: 'Contrato',
    pickup: 'Recogida',
  }
  const milestones = order.map(key => ({ key, label: labels[key], done: done[key], current: key === currentKey }))

  return { step, license, isPaid, isConfirmed, isSigned, daysToStart, nights, milestones }
}
