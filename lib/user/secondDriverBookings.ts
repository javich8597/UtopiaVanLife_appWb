/**
 * Reservas entre las que /dashboard/datos deja subir la documentación de un 2º conductor.
 *
 * El 2º conductor es un dato de la RESERVA, no del perfil. Un cliente puede tener un viaje ya
 * terminado con un 2º conductor y una reserva próxima con otra persona: el formulario tiene que
 * ofrecer la próxima (y la ruta `/api/upload-driver-docs` solo acepta el documento de la reserva
 * cuyo `bookingId` recibe). Esta lógica es pura para poder probarla sin servidor ni Supabase.
 */
import { bookingSecondDriver, isPaidBooking, LIVE_BOOKING_STATUSES, madridDay } from '@/lib/booking/secondDriver'

/** El día de Mallorca lo decide una sola función, la del dominio de reservas */
export { madridDay }

/** Reserva que autoriza a un 2º conductor, con su ficha tal y como se validó al reservar */
export interface SecondDriverBooking {
  bookingId: string
  startDate: string
  endDate: string
  fullName: string
  dniNie: string
  licenseId: string
}

/**
 * Estados de una reserva con un viaje por delante o en curso. `completed` queda fuera: es un viaje
 * terminado aunque la ruta aún admita documentación sobre él.
 */
const UPCOMING_STATUSES: readonly string[] = LIVE_BOOKING_STATUSES.filter(status => status !== 'completed')

const DAY = /^\d{4}-\d{2}-\d{2}/

const day = (value: unknown): string => (typeof value === 'string' && DAY.test(value) ? value.slice(0, 10) : '')

interface BookingRowLike {
  id?: string | null
  status?: string | null
  payment_status?: string | null
  start_date?: string | null
  end_date?: string | null
  [key: string]: unknown
}

/**
 * Reservas pagadas y con viaje por delante cuyo 2º conductor consta con documento, de la más
 * próxima a la más lejana. La primera es la que se ofrece por defecto.
 *
 * Una cancelada, una sin pagar, un viaje terminado (`completed` o con la devolución ya pasada) y un
 * 2º conductor cobrado pero sin documento no se ofrecen: no hay a quién comparar la subida.
 */
export function upcomingSecondDriverBookings(rows: unknown[], now: Date = new Date()): SecondDriverBooking[] {
  const today = madridDay(now)

  return (rows as BookingRowLike[])
    .filter(row => row && typeof row === 'object' && typeof row.id === 'string' && row.id)
    .filter(row => isPaidBooking(row) && UPCOMING_STATUSES.includes(String(row.status || '')))
    .map(row => {
      const startDate = day(row.start_date)
      const endDate = day(row.end_date) || startDate
      return { row, startDate, endDate, driver: bookingSecondDriver(row) }
    })
    // Sin fecha no se sabe si el viaje está por delante; con la devolución pasada ya no es el viaje
    .filter(({ startDate, endDate }) => startDate !== '' && endDate >= today)
    .filter(({ driver }) => Boolean(driver?.document))
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))
    .map(({ row, startDate, endDate, driver }) => ({
      bookingId: row.id as string,
      startDate,
      endDate,
      fullName: driver!.fullName,
      dniNie: driver!.document,
      licenseId: driver!.licenseId,
    }))
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function parts(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  return m >= 1 && m <= 12 ? { y, m, d } : null
}

/**
 * Fechas del viaje para leerlas de un vistazo: "del 12 al 19 de noviembre de 2026". Se leen como
 * día de calendario, sin pasar por `Date`, para que no se desplacen un día fuera de Europa.
 */
export function formatTripRange(startDate: string, endDate: string): string {
  const start = parts(startDate)
  const end = parts(endDate)
  if (!start) return ''
  if (!end || (start.y === end.y && start.m === end.m && start.d === end.d)) {
    return `el ${start.d} de ${MONTHS[start.m - 1]} de ${start.y}`
  }
  if (start.y === end.y && start.m === end.m) {
    return `del ${start.d} al ${end.d} de ${MONTHS[end.m - 1]} de ${end.y}`
  }
  if (start.y === end.y) {
    return `del ${start.d} de ${MONTHS[start.m - 1]} al ${end.d} de ${MONTHS[end.m - 1]} de ${end.y}`
  }
  return `del ${start.d} de ${MONTHS[start.m - 1]} de ${start.y} al ${end.d} de ${MONTHS[end.m - 1]} de ${end.y}`
}

/**
 * ¿Pueden viajar las fotos del 2º conductor? Solo si el interruptor está activo y el titular
 * confirmó que ha informado a esa persona (no tiene cuenta y no le escribimos nosotros: art. 14
 * RGPD). Es una garantía de la pantalla, no de la ruta: la ruta no recibe esa confirmación.
 */
export function mayUploadSecondDriverPhotos(hasSecondDriver: boolean, informed: boolean): boolean {
  return hasSecondDriver && informed
}
