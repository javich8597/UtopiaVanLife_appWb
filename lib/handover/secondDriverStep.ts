import { bookingSecondDriver, secondDriverRequirementError } from '../booking/secondDriver'
import type { SecondDriverPhotoFlags, SecondDriverStepInput } from './checklist'

/**
 * Lo que la entrega de recogida compara del segundo conductor: la ficha de ESA reserva (la misma que
 * lee el contrato) y las fotos que hay realmente en Storage. Lo usan la página de la entrega, para
 * enseñarlo, y la ruta que cierra la entrega, para exigirlo: las dos con la misma función, de modo
 * que lo que la pantalla da por hecho es lo que el servidor da por hecho.
 *
 * Devuelve null si la reserva no lleva segundo conductor: entonces no hay paso que comprobar.
 */
export function secondDriverStepInput(
  booking: unknown,
  photos: SecondDriverPhotoFlags | null
): SecondDriverStepInput | null {
  const driver = bookingSecondDriver(booking)
  if (!driver) return null
  const startDate = (booking as { start_date?: string | null }).start_date
  // Solo el incumplimiento real (25 años, 2 de carnet): los avisos de «falta tal dato» ya salen aparte
  const requirement = driver.birthDate && driver.licenseDate ? secondDriverRequirementError(driver, startDate) : null
  return {
    fullName: driver.fullName,
    document: driver.document,
    licenseId: driver.licenseId,
    birthDate: driver.birthDate,
    licenseDate: driver.licenseDate,
    photos,
    requirementWarning: requirement && /^El segundo conductor debe/.test(requirement) ? requirement : null,
  }
}
