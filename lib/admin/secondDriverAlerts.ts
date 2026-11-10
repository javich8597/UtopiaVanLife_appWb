import {
  bookingSecondDriver,
  isLiveBooking,
  isUploadWindowOpen,
  secondDriverRequirementError,
} from '../booking/secondDriver'
import type { SecondDriverPhotoPresence } from './secondDriverDocuments'

/**
 * Avisos del segundo conductor para el detalle de la reserva del backoffice.
 *
 * Se calculan SIEMPRE desde la propia reserva (columnas `second_driver_*`, `passengers`, desglose
 * y fechas), con las mismas reglas que el contrato y la subida de documentos. No dependen de que
 * ninguna ruta haya escrito nada en `notes`: lo que solo queda en los logs del servidor no llega aquí.
 */

export interface SecondDriverAlert {
  code: 'missing_document' | 'missing_name' | 'missing_dates' | 'requirement' | 'docs_pending' | 'docs_incomplete' | 'upload_closed'
  /** `danger` obliga a actuar antes de la entrega; `warn` es algo que comprobar con el documento físico */
  severity: 'danger' | 'warn'
  text: string
}

const DOCS_COLUMN = 'second_driver_docs_uploaded_at'

const PHOTO_LABELS: Array<[keyof SecondDriverPhotoPresence, string]> = [
  ['dniFrontUrl', 'DNI/NIE (anverso)'],
  ['dniBackUrl', 'DNI/NIE (reverso)'],
  ['licenseFrontUrl', 'carnet (anverso)'],
  ['licenseBackUrl', 'carnet (reverso)'],
]

/**
 * `photos` es lo que hay REALMENTE en Storage para esta reserva (`secondDriverPhotoPresence`). Si se
 * pasa, manda sobre la columna `second_driver_docs_uploaded_at`: la columna solo recuerda que una
 * subida pasó por la ruta, no que hubiera fotos (una subida sin archivos también la rellenaba), y no
 * distingue «falta una» de «faltan todas». Sin `photos` (aún cargando, o Storage no respondió) se
 * usa la columna y no se afirma nada más.
 */
export function secondDriverAlerts(
  booking: unknown,
  now: Date = new Date(),
  photos: SecondDriverPhotoPresence | null = null
): SecondDriverAlert[] {
  if (!booking || typeof booking !== 'object' || !isLiveBooking(booking)) return []
  const row = booking as Record<string, unknown>
  const driver = bookingSecondDriver(row)
  if (!driver) return []

  const alerts: SecondDriverAlert[] = []

  if (!driver.document) {
    alerts.push({
      code: 'missing_document',
      severity: 'danger',
      text: 'Consta un segundo conductor, pero no su documento: el contrato no puede decir a quién autoriza. Pide sus datos al titular antes de la entrega.',
    })
  } else if (!driver.fullName) {
    alerts.push({
      code: 'missing_name',
      severity: 'warn',
      text: 'La ficha del segundo conductor no trae el nombre: el contrato saldrá con «Pendiente de verificación».',
    })
  }

  // Las dos fechas son obligatorias: sin ellas no se validó nunca la ficha contra la póliza y la
  // subida de documentos del cliente se bloquea hasta que alguien la complete
  if (!driver.birthDate || !driver.licenseDate) {
    const missing = [!driver.birthDate && 'fecha de nacimiento', !driver.licenseDate && 'fecha de expedición del carnet']
      .filter(Boolean)
      .join(' ni ')
    alerts.push({
      code: 'missing_dates',
      severity: 'danger',
      text: `La ficha no trae ${missing}: no se puede comprobar el requisito de 25 años de edad y 2 de carnet, y el cliente no podrá subir su documentación hasta que se complete. Pídele el dato y compruébalo con su documento.`,
    })
  } else {
    // Requisitos de la póliza contra la fecha de recogida
    const requirementError = secondDriverRequirementError(driver, row.start_date as string | null | undefined)
    if (requirementError && /^El segundo conductor debe/.test(requirementError)) {
      alerts.push({ code: 'requirement', severity: 'danger', text: requirementError })
    }
  }

  // Documentación subida: lo que hay en Storage, o la columna si no se ha podido mirar (migración 20261108)
  const missingPhotos = photos ? PHOTO_LABELS.filter(([key]) => !photos[key]).map(([, label]) => label) : []
  const nothingUploaded = photos ? missingPhotos.length === PHOTO_LABELS.length : DOCS_COLUMN in row && !row[DOCS_COLUMN]
  // Sin las filas de `handovers` aquí solo se puede aplicar el cierre por fechas (el día de la
  // devolución): si la entrega ya cerró el plazo antes, el aviso sale suave en vez de grave
  const windowOpen = isUploadWindowOpen(row, { now })

  if (photos && missingPhotos.length > 0 && !nothingUploaded) {
    alerts.push({
      code: 'docs_incomplete',
      severity: windowOpen ? 'warn' : 'danger',
      text: `Faltan fotos del segundo conductor: ${missingPhotos.join(', ')}.${windowOpen ? '' : ' Ya pasó el plazo de subida: se cierra con la entrega de llaves y, como muy tarde, el día de la devolución.'}`,
    })
  } else if (nothingUploaded) {
    if (windowOpen) {
      alerts.push({
        code: 'docs_pending',
        severity: 'warn',
        text: 'El segundo conductor aún no ha subido su documentación.',
      })
    } else {
      alerts.push({
        code: 'upload_closed',
        severity: 'danger',
        text: 'Ya pasó el plazo de subida: se cierra con la entrega de llaves y, como muy tarde, el día de la devolución. El segundo conductor no subió su documentación.',
      })
    }
  }

  return alerts
}
