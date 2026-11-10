import { isValidDateString } from '../booking/checkoutRules'
import { bookingSecondDriver, canonicalDocument, isLiveBooking, sameDriverName, secondDriverRequirementError } from '../booking/secondDriver'
import { driverFieldError, normalizeDriverText } from '../driverDocuments'
import { getAdminBookingStatus } from './bookingStatus'

/**
 * Ficha del segundo conductor de UNA reserva, editada por el administrador desde el detalle de la
 * reserva. Cuando la ficha llega incompleta (sin documento, sin nº de carnet o sin fechas) ni el
 * cliente puede subir su documentación ni el contrato dice a quién autoriza: esta es la vía para
 * completarla.
 *
 * Valida con las mismas reglas que el checkout y la subida de documentos:
 *  - nombre, documento y nº de carnet: `driverFieldError` (la regla de la subida) y la letra de
 *    control del DNI/NIE o el formato del pasaporte (la del checkout);
 *  - fechas: YYYY-MM-DD reales y los requisitos de la póliza (25 años cumplidos y 2 de carnet en la
 *    fecha de recogida), con `secondDriverRequirementError`.
 */

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

/**
 * Mismo criterio que `isValidDniNieOrPassport` del checkout (que vive en una ruta y no se puede
 * importar desde `lib/`): DNI con su letra, NIE con su letra o pasaporte de 6 a 15 caracteres.
 * `tests/adminSecondDriverRecord.test.ts` los compara con una batería de casos para que no se
 * separen.
 */
export function isValidIdentityDocument(value: string): { isValid: boolean; error?: string } {
  const clean = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (!clean) return { isValid: false, error: 'Documento de identidad requerido' }

  const dni = clean.match(/^(\d{8})([A-Z])$/)
  if (dni) {
    const expected = DNI_LETTERS[parseInt(dni[1], 10) % 23]
    return dni[2] === expected
      ? { isValid: true }
      : { isValid: false, error: `Letra de DNI incorrecta. Para el número ${dni[1]}, la letra debe ser ${expected}` }
  }

  const nie = clean.match(/^([XYZ])(\d{7})([A-Z])$/)
  if (nie) {
    const prefix: Record<string, string> = { X: '0', Y: '1', Z: '2' }
    const expected = DNI_LETTERS[parseInt(prefix[nie[1]] + nie[2], 10) % 23]
    return nie[3] === expected
      ? { isValid: true }
      : { isValid: false, error: `Letra de NIE incorrecta. Se esperaba ${expected}` }
  }

  if (/^[A-Z0-9]{6,15}$/.test(clean)) return { isValid: true }
  return { isValid: false, error: 'Formato de DNI, NIE o Pasaporte no válido' }
}

export interface SecondDriverRecord {
  fullName: string
  document: string
  /** Vacío = no se toca el que ya constara (como en la subida, donde vacío significa «no cambia») */
  licenseId: string
  birthDate: string
  licenseDate: string
}

export type SecondDriverRecordResult =
  | { ok: true; record: SecondDriverRecord }
  | { ok: false; error: string; field: keyof SecondDriverRecord }

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Valida la ficha que manda el administrador. Nombre, documento y las dos fechas son obligatorios
 * (el checkout los exige para marcar a alguien como segundo conductor); el nº de carnet es opcional
 * pero, si viene, debe cumplir el patrón de la subida.
 */
export function validateSecondDriverRecord(input: unknown, startDate: string | null | undefined): SecondDriverRecordResult {
  const raw = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}

  const fullName = normalizeDriverText(text(raw.fullName)) ?? ''
  if (!fullName) return { ok: false, field: 'fullName', error: 'El nombre y apellidos del segundo conductor son obligatorios.' }

  const document = text(raw.document).trim().toUpperCase()
  if (!document) return { ok: false, field: 'document', error: 'El DNI, NIE o pasaporte del segundo conductor es obligatorio.' }

  const licenseId = text(raw.licenseId).trim()
  const birthDate = text(raw.birthDate).trim()
  const licenseDate = text(raw.licenseDate).trim()

  // La regla de la subida de documentos, la misma para el nombre, el documento y el nº de carnet
  const form = new FormData()
  form.set('secondDriverFullName', text(raw.fullName))
  form.set('secondDriverDni', document)
  form.set('secondDriverLicense', licenseId)
  const fieldError = driverFieldError(form)
  if (fieldError) {
    const field: keyof SecondDriverRecord = /nombre/.test(fieldError) ? 'fullName' : /documento/.test(fieldError) ? 'document' : 'licenseId'
    return { ok: false, field, error: fieldError }
  }
  const identity = isValidIdentityDocument(document)
  if (!identity.isValid) {
    return { ok: false, field: 'document', error: `El documento de identidad del segundo conductor no es válido: ${identity.error}` }
  }

  if (!birthDate) return { ok: false, field: 'birthDate', error: 'La fecha de nacimiento del segundo conductor es obligatoria para comprobar los 25 años que exige la póliza.' }
  if (!isValidDateString(birthDate)) return { ok: false, field: 'birthDate', error: 'La fecha de nacimiento del segundo conductor no es válida.' }
  if (!licenseDate) return { ok: false, field: 'licenseDate', error: 'La fecha de expedición del carnet del segundo conductor es obligatoria para comprobar los 2 años de antigüedad que exige la póliza.' }
  if (!isValidDateString(licenseDate)) return { ok: false, field: 'licenseDate', error: 'La fecha de expedición del carnet del segundo conductor no es válida.' }

  const requirement = secondDriverRequirementError({ birthDate, licenseDate }, startDate)
  if (requirement) {
    return { ok: false, field: /antigüedad|expedición/.test(requirement) ? 'licenseDate' : 'birthDate', error: requirement }
  }

  return { ok: true, record: { fullName, document, licenseId, birthDate, licenseDate } }
}

/**
 * Motivo por el que la ficha de esta reserva no se puede editar, o null si se puede. No se añade un
 * segundo conductor a una reserva que no lo llevaba (cambia el precio y la póliza) ni se reescribe
 * quién conducía en una reserva cancelada, caducada o ya completada.
 */
export function secondDriverRecordBlock(booking: unknown, now: Date = new Date()): string | null {
  if (!booking || typeof booking !== 'object') return 'Reserva no válida.'
  if (!bookingSecondDriver(booking)) {
    return 'Esta reserva no lleva segundo conductor. No se puede añadir uno desde aquí: cambia el precio y la póliza.'
  }
  const row = booking as Record<string, unknown>
  if (!isLiveBooking(row)) return 'La reserva está cancelada o rechazada: su ficha del segundo conductor ya no se modifica.'
  if (getAdminBookingStatus(row as never, now) === 'expired') return 'La reserva está caducada: su ficha del segundo conductor ya no se modifica.'
  if (row.status === 'completed') return 'La reserva está completada: su ficha del segundo conductor ya no se modifica.'
  return null
}

/** Campos de la reserva que se escriben; el último par es la constancia de quién lo cambió */
export interface SecondDriverRecordPatch {
  has_second_driver: true
  second_driver_name: string
  second_driver_dni: string
  second_driver_birth_date: string
  second_driver_license_date: string
  second_driver_license?: string
}

export function secondDriverRecordPatch(record: SecondDriverRecord): SecondDriverRecordPatch {
  const patch: SecondDriverRecordPatch = {
    has_second_driver: true,
    second_driver_name: record.fullName,
    second_driver_dni: record.document,
    second_driver_birth_date: record.birthDate,
    second_driver_license_date: record.licenseDate,
  }
  // Vacío no borra: el nº de carnet que ya constara se queda
  if (record.licenseId) patch.second_driver_license = record.licenseId
  return patch
}

/** Qué datos cambian respecto a la ficha que hoy lee el contrato (solo nombres de campo, nunca valores) */
export function secondDriverRecordChanges(booking: unknown, record: SecondDriverRecord): string[] {
  const current = bookingSecondDriver(booking)
  const changed: string[] = []
  if (!current || !sameDriverName(current.fullName, record.fullName)) changed.push('nombre')
  if (!current || canonicalDocument(current.document) !== canonicalDocument(record.document)) changed.push('documento')
  if (record.licenseId && (!current || current.licenseId !== record.licenseId)) changed.push('número de carnet')
  if (!current || current.birthDate !== record.birthDate) changed.push('fecha de nacimiento')
  if (!current || current.licenseDate !== record.licenseDate) changed.push('fecha de expedición del carnet')
  return changed
}
