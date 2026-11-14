/**
 * Lo que la pantalla /admin/conservacion necesita saber de la respuesta de la purga: tipos, textos y
 * las pocas decisiones que no son de maquetación (cuándo se puede pedir el borrado, qué escribir
 * para confirmarlo). Sin React ni red, para poder probarlo.
 *
 * Los plazos y el reparto NO están aquí: vienen en `policy` de la respuesta, que sale de
 * `lib/booking/dataRetention.ts`. La pantalla solo los enseña.
 */

export interface RetentionFolder {
  scope: 'booking_images' | 'holder_images'
  bookingId: string | null
  userId: string
  folder: string
  purgeDay: string
  files: string[]
  unknown: number
  unknownExtensions: string[]
  unknownLengths: number[]
  unreadable: boolean
  deleted: number
  sealed?: 'reviewed' | 'purged'
  error?: string
}

export interface RetentionLegal {
  bookingId: string
  purgeDay: string
  columns: string[]
  updated: boolean
  error?: string
}

export interface RetentionStalled {
  bookingId: string | null
  reason: string
}

export interface RetentionReport {
  mode: 'simulacion' | 'purga'
  policy: {
    imageRetentionDays: number
    legalRetentionYears: number
    today: string
    notPurged?: string[]
    note?: string
    holderFoldersExcluded?: string
  }
  scope: { bookingId: string | null; userId: string | null; limit: number; truncated: boolean; reviewed: number; holderFolders: boolean }
  schema: { ready: boolean; columnsReady: boolean; verified: boolean; missing: string[] }
  reviewed: number
  truncated: boolean
  advanceable: number
  summary: { files: number; columns: number; bookings: number; holders: number }
  folders: RetentionFolder[]
  legal: RetentionLegal[]
  skipped: Array<{ bookingId: string | null; userId: string | null; reason: string; detail: string; status: string | null }>
  stalled: RetentionStalled[]
  stalledReasons: Record<string, number>
  hint?: string
  stalledWarning?: string
  truncatedWarning?: string
  // Solo en la purga de verdad
  sealed?: number
  sealProbe?: 'ok' | 'skipped' | 'failed'
  sealFailed?: string[]
  closedByHolder?: string[]
  logged?: boolean
  logWarning?: string
  sealWarning?: string
  reviewedWarning?: string
  reviewedOnly?: string[]
}

/** Cuerpo de un error de la API (409 de la purga incluido): el mensaje se enseña TAL CUAL */
export interface RetentionApiError {
  error: string
  missing?: string[]
  migration?: string
  sealProbe?: string
  sealProbeBookingId?: string
}

export const SCOPE_LABEL: Record<string, string> = {
  booking_images: 'Fotos del 2º conductor (carpeta de la reserva)',
  holder_images: 'Fotos del titular (carpeta de la cuenta)',
  booking_legal_data: 'Datos del registro de viajeros',
}

/** Por qué una candidata no puede avanzar sola, y qué hacer. Son los motivos de `stalled` */
export const STALLED_REASON: Record<string, { title: string; fix: string }> = {
  no_user: {
    title: 'Reserva sin cliente asignado',
    fix: 'No se sabe en qué carpeta de Storage está su documentación. Asigna el cliente a la reserva, o confirma a mano en Storage que no hay nada, y la próxima pasada la marcará.',
  },
  no_dates: {
    title: 'Reserva sin fechas',
    fix: 'No se puede situar el plazo. Corrige las fechas de la reserva (o cancélala si no se hizo) y la próxima pasada la tratará.',
  },
  no_id: {
    title: 'Fila sin identificador',
    fix: 'La fila de la base no trae id de reserva. Es un dato corrupto: revísalo en la base.',
  },
  holder_undatable: {
    title: 'La cuenta tiene otra reserva viva sin fechas',
    fix: 'Esa reserva sin fechas protege la carpeta de documentos del titular y bloquea a todas las de su cuenta. Ponle las fechas (o cancélala) y se desbloquean.',
  },
}

export const stalledReasonText = (reason: string) =>
  STALLED_REASON[reason] ?? { title: reason, fix: 'Motivo no reconocido: revísala a mano.' }

export const CRON_STOP_REASON: Record<string, string> = {
  completa: 'Terminó: no quedan candidatas',
  simulacion_acotada: 'Simulación de una pasada (quedan más candidatas por ver)',
  solo_atascadas: 'Paró: lo que queda está atascado y necesita mano humana',
  tope_vueltas: 'Paró por el tope de vueltas; continúa la próxima semana',
  tope_tiempo: 'Paró por el límite de tiempo; continúa la próxima semana',
  sin_avance: 'Paró porque una pasada no avanzó',
  bloqueada: 'La purga se negó: no se borró nada',
  error: 'Falló una pasada',
}

export const CRON_OUTCOME: Record<string, { label: string; tone: 'sage' | 'amber' | 'rose' }> = {
  ok: { label: 'Sin novedad', tone: 'sage' },
  attention: { label: 'Revisar', tone: 'amber' },
  blocked: { label: 'Bloqueada', tone: 'rose' },
  error: { label: 'Error', tone: 'rose' },
}

/** Lo que hay que escribir en el segundo paso del borrado: no es un interruptor, es una frase */
export const PURGE_CONFIRM_WORD = 'BORRAR'

export const isPurgeConfirmText = (text: string) => text.trim() === PURGE_CONFIRM_WORD

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value: string) => UUID_RE.test(value.trim())

/** Alcance escrito en los campos de la pantalla: vacío = sin filtro; si no es un UUID, no vale */
export function parseScopeField(value: string): { ok: true; value: string | null } | { ok: false } {
  const trimmed = value.trim()
  if (trimmed === '') return { ok: true, value: null }
  return isUuid(trimmed) ? { ok: true, value: trimmed.toLowerCase() } : { ok: false }
}

/** Lo que una simulación dice que se borraría */
export const plannedTotal = (report: Pick<RetentionReport, 'summary'> | null) =>
  report ? report.summary.files + report.summary.columns : 0

/**
 * ¿Se puede ofrecer el borrado? Solo desde una SIMULACIÓN reciente, con algo que borrar y con la
 * constancia posible. Si la base no tiene la migración, la ruta responde 409 igualmente, pero la
 * pantalla ni siquiera lo ofrece: no se invita a pulsar algo que está condenado a fallar.
 */
export function canOfferPurge(report: RetentionReport | null, busy: boolean): { ok: boolean; reason: string | null } {
  if (busy) return { ok: false, reason: 'Hay una operación en curso.' }
  if (!report) return { ok: false, reason: 'Primero hace falta una simulación.' }
  if (report.mode !== 'simulacion') return { ok: false, reason: 'Vuelve a simular para ver lo que queda.' }
  if (report.schema.missing.length > 0) {
    return { ok: false, reason: `Falta ${report.schema.missing.join(', ')} en la base: aplica antes la migración. Sin constancia no se borra.` }
  }
  if (plannedTotal(report) === 0) return { ok: false, reason: 'No hay nada que borrar ahora mismo.' }
  return { ok: true, reason: null }
}

/** Nombres de archivo de un documento: la ruta completa menos la carpeta, para no ocupar la fila entera */
export const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1)
