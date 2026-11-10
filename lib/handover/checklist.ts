/**
 * Entrega (pickup) y devolución (return) de la camper.
 * Define los pasos obligatorios y valida que todo esté hecho antes de cerrar la entrega.
 */

export type HandoverKind = 'pickup' | 'return'

export interface ChecklistItem {
  id: string
  label: string
}

export const FUEL_LEVELS = ['Lleno', '3/4', '1/2', '1/4', 'Reserva'] as const

export const CHECKLIST: Record<HandoverKind, ChecklistItem[]> = {
  pickup: [
    { id: 'water', label: 'Depósito de agua limpia lleno' },
    { id: 'gas', label: 'Gas comprobado' },
    { id: 'clean', label: 'Camper limpia por dentro y por fuera' },
    { id: 'damages', label: 'Daños previos revisados con el cliente' },
    { id: 'keys', label: 'Llaves entregadas' },
    { id: 'papers', label: 'Documentación del vehículo a bordo' },
    { id: 'extras', label: 'Extras contratados entregados' },
    { id: 'explained', label: 'Funcionamiento explicado al cliente' },
  ],
  return: [
    { id: 'water', label: 'Aguas grises vaciadas' },
    { id: 'wc', label: 'WC químico vaciado' },
    { id: 'clean', label: 'Interior limpio' },
    { id: 'damages', label: 'Daños nuevos revisados con el cliente' },
    { id: 'keys', label: 'Llaves devueltas' },
    { id: 'extras', label: 'Extras devueltos completos' },
  ],
}

/**
 * Comprobación del SEGUNDO conductor en la entrega de recogida. Solo existe si la reserva lleva uno.
 *
 * Las casillas se guardan dentro de `handovers.checklist` (jsonb) con estos ids, aparte de los de
 * `CHECKLIST`: así no hace falta una columna nueva y el paso «Revisión» (que recorre solo
 * `CHECKLIST`) no cambia. La ruta solo las admite si la reserva lleva segundo conductor.
 */
export const SECOND_DRIVER_CHECK_IDS = {
  license: 'second_driver_license',
  document: 'second_driver_document',
  noPhotos: 'second_driver_no_photos_ack',
} as const

export const SECOND_DRIVER_CHECKS: ChecklistItem[] = [
  {
    id: SECOND_DRIVER_CHECK_IDS.license,
    label: 'He visto el carnet físico del segundo conductor: su número coincide con el de la reserva, está en vigor y tiene más de 2 años',
  },
  {
    id: SECOND_DRIVER_CHECK_IDS.document,
    label: 'He visto su DNI, NIE o pasaporte físico: nombre y número coinciden con los de la reserva',
  },
]

export const SECOND_DRIVER_NO_PHOTOS_CHECK: ChecklistItem = {
  id: SECOND_DRIVER_CHECK_IDS.noPhotos,
  label: 'En el sistema no hay todas sus fotos: lo compruebo solo con los documentos físicos, delante de la persona',
}

/** Ids de casilla del segundo conductor que la ruta admite guardar en la entrega de recogida */
export const SECOND_DRIVER_CHECK_ID_LIST: string[] = [
  SECOND_DRIVER_CHECK_IDS.license,
  SECOND_DRIVER_CHECK_IDS.document,
  SECOND_DRIVER_CHECK_IDS.noPhotos,
]

/** Qué fotos del segundo conductor hay en Storage para esta reserva (mismas claves que `secondDriverPhotoPresence`) */
export interface SecondDriverPhotoFlags {
  dniFrontUrl: boolean
  dniBackUrl: boolean
  licenseFrontUrl: boolean
  licenseBackUrl: boolean
}

const SECOND_DRIVER_PHOTO_LABELS: Array<[keyof SecondDriverPhotoFlags, string]> = [
  ['dniFrontUrl', 'DNI/NIE (anverso)'],
  ['dniBackUrl', 'DNI/NIE (reverso)'],
  ['licenseFrontUrl', 'carnet (anverso)'],
  ['licenseBackUrl', 'carnet (reverso)'],
]

/** Lo que consta en la reserva sobre su segundo conductor y lo que hay en Storage: contra eso se compara */
export interface SecondDriverStepInput {
  fullName: string
  document: string
  licenseId: string
  birthDate: string | null
  licenseDate: string | null
  /** null: no se pudo leer Storage, así que no se sabe qué fotos hay */
  photos: SecondDriverPhotoFlags | null
  /** Requisito de la póliza que la ficha no cumple (edad o antigüedad del carnet): aviso, no bloquea */
  requirementWarning?: string | null
}

export interface SecondDriverStepProblems {
  /** Datos que la ficha de la reserva no trae: sin ellos no hay contra qué comparar */
  missingData: string[]
  missingPhotos: string[]
  photosUnknown: boolean
}

export function secondDriverStepProblems(input: SecondDriverStepInput): SecondDriverStepProblems {
  const missingData: string[] = []
  if (!input.fullName.trim()) missingData.push('nombre')
  if (!input.document.trim()) missingData.push('documento')
  if (!input.licenseId.trim()) missingData.push('número de carnet')
  if (!input.birthDate) missingData.push('fecha de nacimiento')
  if (!input.licenseDate) missingData.push('fecha de expedición del carnet')
  const missingPhotos = input.photos
    ? SECOND_DRIVER_PHOTO_LABELS.filter(([key]) => !input.photos![key]).map(([, label]) => label)
    : []
  return { missingData, missingPhotos, photosUnknown: input.photos === null }
}

export interface HandoverLike {
  kind: HandoverKind
  license_checked?: boolean | null
  km?: number | null
  fuel_level?: string | null
  dashboard_photo_path?: string | null
  exterior_video_path?: string | null
  interior_video_path?: string | null
  checklist?: Record<string, boolean> | null
  customer_signature?: string | null
}

export interface HandoverStep {
  id: 'license' | 'second_driver' | 'km' | 'exterior' | 'interior' | 'checklist' | 'signature'
  label: string
  done: boolean
  /** Por qué no está hecho, cuando hay algo concreto que decir (solo el segundo conductor lo rellena) */
  detail?: string
}

export interface HandoverStepOptions {
  /**
   * Segundo conductor de la reserva. Sin él (o en la devolución) no hay paso del segundo conductor:
   * quien llama sin esta opción obtiene exactamente los pasos de siempre.
   */
  secondDriver?: SecondDriverStepInput | null
}

function secondDriverStep(checks: Record<string, boolean>, input: SecondDriverStepInput): HandoverStep {
  const { missingData, missingPhotos, photosUnknown } = secondDriverStepProblems(input)
  const base = { id: 'second_driver' as const, label: 'Segundo conductor comprobado' }

  if (missingData.length > 0) {
    return {
      ...base,
      done: false,
      detail: `Falta en la ficha de la reserva: ${missingData.join(', ')}. Complétala desde el detalle de la reserva antes de cerrar la entrega.`,
    }
  }
  if ((missingPhotos.length > 0 || photosUnknown) && checks[SECOND_DRIVER_CHECK_IDS.noPhotos] !== true) {
    return {
      ...base,
      done: false,
      detail: photosUnknown
        ? 'No se pudo leer el almacenamiento: no se sabe qué fotos hay. Recarga la página o confirma que lo compruebas solo con los documentos físicos.'
        : `Faltan fotos: ${missingPhotos.join(', ')}. Confirma que lo compruebas solo con los documentos físicos o pide que las suban.`,
    }
  }
  if (checks[SECOND_DRIVER_CHECK_IDS.license] !== true || checks[SECOND_DRIVER_CHECK_IDS.document] !== true) {
    return { ...base, done: false, detail: 'Marca las dos comprobaciones del segundo conductor.' }
  }
  return { ...base, done: true }
}

export function handoverSteps(h: HandoverLike, options: HandoverStepOptions = {}): HandoverStep[] {
  const items = CHECKLIST[h.kind]
  const checks = h.checklist || {}
  const steps: HandoverStep[] = []
  if (h.kind === 'pickup') {
    steps.push({ id: 'license', label: 'Carnet del titular comprobado', done: Boolean(h.license_checked) })
    if (options.secondDriver) steps.push(secondDriverStep(checks, options.secondDriver))
  }
  steps.push(
    { id: 'km', label: 'Kilómetros y cuadro', done: Number.isFinite(h.km) && (h.km as number) >= 0 && Boolean(h.fuel_level) && Boolean(h.dashboard_photo_path) },
    { id: 'exterior', label: 'Vídeo exterior', done: Boolean(h.exterior_video_path) },
    { id: 'interior', label: 'Vídeo interior', done: Boolean(h.interior_video_path) },
    { id: 'checklist', label: 'Revisión', done: items.every(i => checks[i.id] === true) },
    { id: 'signature', label: 'Firma del cliente', done: Boolean(h.customer_signature) },
  )
  return steps
}

/** Pasos sin hacer, con el motivo cuando lo hay */
export function incompleteSteps(h: HandoverLike, options: HandoverStepOptions = {}): HandoverStep[] {
  return handoverSteps(h, options).filter(s => !s.done)
}

export function missingSteps(h: HandoverLike, options: HandoverStepOptions = {}): string[] {
  return incompleteSteps(h, options).map(s => s.label)
}

/** En la devolución: km recorridos y si se pasó del paquete de 150 km/día */
export function kmSummary(pickupKm?: number | null, returnKm?: number | null, nights?: number, kmPackage?: string | null) {
  if (!Number.isFinite(pickupKm) || !Number.isFinite(returnKm)) return null
  const driven = Math.max(0, (returnKm as number) - (pickupKm as number))
  const allowance = kmPackage === 'unlimited' ? null : Math.max(1, nights || 1) * 150
  return { driven, allowance, extra: allowance === null ? 0 : Math.max(0, driven - allowance) }
}
