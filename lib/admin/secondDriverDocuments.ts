import { bookingSecondDriver, isLiveBooking } from '../booking/secondDriver'
import {
  DOCUMENT_LIST_OPTIONS,
  latestDocument,
  type CustomerDocumentUrls,
  type StoredFile,
} from './documents'

/**
 * Fotos del segundo conductor para el backoffice.
 *
 * El segundo conductor pertenece a la RESERVA, y /api/upload-driver-docs guarda sus fotos en
 * `documents/<cliente>/<reserva>/second_*_<uuid>.<ext>` (un nivel por debajo de las del titular).
 * `storage.list(<cliente>)` no baja a las subcarpetas: devuelve cada reserva como una entrada
 * sin extensión cuyo nombre es el UUID de la reserva. Sin este módulo, quien valida un carnet o
 * entrega la camper no llega a ver el documento de la persona que el contrato autoriza a conducir.
 *
 * Las subidas anteriores a ese cambio dejaron `second_*` sueltas en la carpeta del cliente: se
 * enseñan aparte, sin reserva asociada, para que tampoco queden invisibles.
 */

/** Prefijos exactos de cada foto del segundo conductor (los del titular no los comparten) */
export const SECOND_DRIVER_DOCUMENT_PREFIXES: Record<keyof CustomerDocumentUrls, string[]> = {
  dniFrontUrl: ['second_dni_front'],
  dniBackUrl: ['second_dni_back'],
  licenseFrontUrl: ['second_license_front'],
  licenseBackUrl: ['second_license_back'],
}

/** Máximo de carpetas de reserva que se recorren por cliente: acota las llamadas a Storage */
export const MAX_BOOKING_FOLDERS = 25

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const emptyUrls = (): CustomerDocumentUrls => ({
  dniFrontUrl: null,
  dniBackUrl: null,
  licenseFrontUrl: null,
  licenseBackUrl: null,
})

const hasAnyUrl = (urls: CustomerDocumentUrls): boolean => Object.values(urls).some(Boolean)

const asFiles = (value: unknown): StoredFile[] => (Array.isArray(value) ? (value as StoredFile[]) : [])

/** Ids de reserva que aparecen como subcarpetas en el listado de la carpeta del cliente */
export function bookingFolderNames(files: StoredFile[]): string[] {
  const seen = new Set<string>()
  for (const f of files || []) {
    if (UUID_RE.test(f?.name || '')) seen.add(f.name.toLowerCase())
  }
  return [...seen]
}

/** Un id de cliente o de reserva con `/` o `..` nunca llega a una ruta de Storage */
const isSafeSegment = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && !value.includes('/') && !value.includes('\\') && !value.includes('..')

async function signSecondDriverFiles(
  client: any,
  folderPath: string,
  files: StoredFile[]
): Promise<{ urls: CustomerDocumentUrls; failed: boolean }> {
  const urls = emptyUrls()
  let failed = false
  await Promise.all(
    (Object.keys(SECOND_DRIVER_DOCUMENT_PREFIXES) as (keyof CustomerDocumentUrls)[]).map(async key => {
      const name = latestDocument(files, SECOND_DRIVER_DOCUMENT_PREFIXES[key])
      if (!name) return
      const { data, error } = await client.storage.from('documents').createSignedUrl(`${folderPath}/${name}`, 3600)
      urls[key] = data?.signedUrl || null
      // El archivo existe pero no se pudo firmar: no es lo mismo que «No adjuntado»
      if (!urls[key] || error) failed = true
    })
  )
  return { urls, failed }
}

export interface SecondDriverFolderDocs {
  /** Reserva a la que pertenecen las fotos; null en las subidas antiguas, sueltas en la carpeta del cliente */
  bookingId: string | null
  urls: CustomerDocumentUrls
}

export interface SecondDriverDocsResult {
  folders: SecondDriverFolderDocs[]
  /** Carpetas de reservas del cliente que NO se recorrieron por el tope: sus fotos no están en `folders` */
  skippedFolders: number
  /** Carpetas con nombre de reserva que no son de ninguna reserva de este cliente: no se leen ni se enseñan */
  unlinkedFolders: number
  /** Storage falló al listar o firmar: un «No adjuntado» de esta lectura puede no ser verdad */
  failed: boolean
}

/**
 * Orden en que se recorren las reservas: las vivas antes que las canceladas o rechazadas y, dentro de
 * cada grupo, de la salida más reciente o próxima a la más antigua. Así, si el tope recorta, lo que
 * se queda fuera son las reservas más viejas y muertas, no la que sale mañana.
 */
export function orderBookingsForFolders<T extends BookingForSecondDriverDocs>(bookings: readonly T[]): T[] {
  return [...bookings].sort((a, b) => {
    const live = Number(isLiveBooking(b)) - Number(isLiveBooking(a))
    if (live !== 0) return live
    return (
      String(b.start_date || '').localeCompare(String(a.start_date || '')) ||
      String(a.id || '').localeCompare(String(b.id || ''))
    )
  })
}

/**
 * URLs firmadas (1 h) de las fotos del segundo conductor de un cliente, una entrada por reserva.
 *
 * Solo se recorren las carpetas cuyo nombre es el id de una de las `bookings` del cliente (las del
 * MISMO `user_id`): una subcarpeta con nombre de UUID que no es de ninguna de ellas no es
 * documentación de nadie y no se lee. Si hay más de `MAX_BOOKING_FOLDERS` carpetas se recorren las
 * de las reservas vivas primero y el resto se cuenta en `skippedFolders`, para decirlo en pantalla.
 * Con `onlyBookingId` solo se recorre esa reserva (más las sueltas antiguas).
 *
 * Un fallo de Storage no rompe la pantalla: se registra, se marca `failed` y se devuelve lo que se
 * haya podido resolver.
 */
export async function resolveSecondDriverDocuments(
  client: any,
  userId: string,
  bookings: readonly BookingForSecondDriverDocs[],
  options: { onlyBookingId?: string | null } = {}
): Promise<SecondDriverDocsResult> {
  const result: SecondDriverDocsResult = { folders: [], skippedFolders: 0, unlinkedFolders: 0, failed: false }
  if (!isSafeSegment(userId)) return result

  try {
    const { data: rootFiles, error: rootError } = await client.storage.from('documents').list(userId, DOCUMENT_LIST_OPTIONS)
    if (rootError) result.failed = true
    const root = asFiles(rootFiles)
    const present = new Set(bookingFolderNames(root))

    // Reservas de este cliente con un id que pueda ser carpeta de Storage
    const own = (bookings || []).filter(
      b => b && isSafeSegment(b.id) && UUID_RE.test(String(b.id)) && (!b.user_id || b.user_id === userId)
    )
    const ownIds = new Set(own.map(b => String(b.id).toLowerCase()))
    const wanted = options.onlyBookingId ? options.onlyBookingId.toLowerCase() : null
    if (!wanted) result.unlinkedFolders = [...present].filter(id => !ownIds.has(id)).length

    const candidates = orderBookingsForFolders(own)
      .map(b => String(b.id).toLowerCase())
      .filter((id, i, all) => all.indexOf(id) === i && present.has(id) && (!wanted || id === wanted))
    const toWalk = candidates.slice(0, MAX_BOOKING_FOLDERS)
    result.skippedFolders = candidates.length - toWalk.length

    for (const bookingId of toWalk) {
      const folderPath = `${userId}/${bookingId}`
      const { data: files, error: listError } = await client.storage.from('documents').list(folderPath, DOCUMENT_LIST_OPTIONS)
      if (listError) result.failed = true
      const signed = await signSecondDriverFiles(client, folderPath, asFiles(files))
      if (signed.failed) result.failed = true
      if (hasAnyUrl(signed.urls)) result.folders.push({ bookingId, urls: signed.urls })
    }

    // Subidas antiguas: `second_*` directamente en la carpeta del cliente
    const legacy = await signSecondDriverFiles(client, userId, root)
    if (legacy.failed) result.failed = true
    if (hasAnyUrl(legacy.urls)) result.folders.push({ bookingId: null, urls: legacy.urls })
  } catch (e) {
    console.error('Error resolviendo las fotos del segundo conductor', userId, e)
    result.failed = true
  }

  return result
}

/**
 * Avisos que la pantalla debe enseñar junto a las fotos. Sin ellos, un recorte o un fallo de
 * Storage se leería como «este cliente no ha subido nada».
 */
export function secondDriverDocsNotices(result: SecondDriverDocsResult): string[] {
  const notices: string[] = []
  if (result.failed) {
    notices.push(
      'No se pudo leer del todo el almacenamiento de documentos: un «No adjuntado» puede no ser cierto. Recarga la página y, si sigue igual, no valides sin comprobar las fotos en la ficha del cliente.'
    )
  }
  if (result.skippedFolders > 0) {
    notices.push(
      `Solo se han revisado las ${MAX_BOOKING_FOLDERS} reservas más recientes con carpeta de documentos: ${result.skippedFolders} más no se muestran.`
    )
  }
  if (result.unlinkedFolders > 0) {
    notices.push(
      `Hay ${result.unlinkedFolders} ${result.unlinkedFolders === 1 ? 'carpeta' : 'carpetas'} de documentos que no corresponde${result.unlinkedFolders === 1 ? '' : 'n'} a ninguna reserva de este cliente: no se muestran y no cuentan como documentación.`
    )
  }
  return notices
}

/**
 * Pie del visor ampliado para una foto del segundo conductor: el nombre de ESA persona (no el del
 * titular, que es quien sube la reserva) y, aparte, de qué titular es la reserva.
 */
export function secondDriverViewerCaption(
  group: Pick<SecondDriverDocGroup, 'fullName' | 'document' | 'legacy'>,
  holder: { full_name?: string | null; email?: string | null }
): string {
  const titular = holder.full_name || holder.email || 'sin nombre'
  if (group.legacy) return `Subida anterior: puede no ser la persona de esta reserva · Titular: ${titular}`
  const who = group.fullName || 'Segundo conductor sin nombre en la ficha'
  return `Segundo conductor: ${who}${group.document ? ` · ${group.document}` : ''} · Titular: ${titular}`
}

/** Qué fotos del segundo conductor hay en Storage para UNA reserva (sin firmar nada) */
export type SecondDriverPhotoPresence = Record<keyof CustomerDocumentUrls, boolean>

/**
 * ¿Qué fotos tiene subidas el segundo conductor de esta reserva? Es la verdad: la columna
 * `second_driver_docs_uploaded_at` solo dice que una subida pasó por la ruta. Devuelve null si no
 * se pudo leer Storage (el aviso entonces no debe afirmar que falta nada).
 */
export async function secondDriverPhotoPresence(
  client: any,
  userId: string,
  bookingId: string
): Promise<SecondDriverPhotoPresence | null> {
  if (!isSafeSegment(userId) || !isSafeSegment(bookingId)) return null
  try {
    const { data, error } = await client.storage.from('documents').list(`${userId}/${bookingId.toLowerCase()}`, DOCUMENT_LIST_OPTIONS)
    if (error) return null
    const files = asFiles(data)
    const presence = {} as SecondDriverPhotoPresence
    for (const key of Object.keys(SECOND_DRIVER_DOCUMENT_PREFIXES) as (keyof CustomerDocumentUrls)[]) {
      presence[key] = Boolean(latestDocument(files, SECOND_DRIVER_DOCUMENT_PREFIXES[key]))
    }
    return presence
  } catch (e) {
    console.error('Error leyendo las fotos del segundo conductor', bookingId, e)
    return null
  }
}

/**
 * Lo que enseña la hoja de entrega: las fotos de ESTA reserva por un lado y, aparte, las de una
 * subida anterior (sueltas en la carpeta del cliente, de una persona que puede no ser la de esta
 * reserva). Estas últimas nunca se presentan como documentación de la reserva ni cuentan para la
 * casilla de «he visto el carnet».
 */
export function handoverSecondDriverDocs(
  folders: SecondDriverFolderDocs[],
  booking: BookingForSecondDriverDocs
): { thisBooking: SecondDriverDocGroup[]; earlierUpload: SecondDriverDocGroup | null } {
  const id = String(booking?.id || '').toLowerCase()
  const groups = buildSecondDriverGroups(folders, [booking])
  const thisBooking = groups.filter(g => !g.legacy && g.bookingId?.toLowerCase() === id)
  // Una subida anterior solo importa si esta reserva lleva segundo conductor
  const earlierUpload = bookingSecondDriver(booking) ? groups.find(g => g.legacy && !g.bookingId) || null : null
  return { thisBooking, earlierUpload }
}

export interface BookingForSecondDriverDocs {
  id?: string | null
  user_id?: string | null
  start_date?: string | null
  end_date?: string | null
  status?: string | null
  payment_status?: string | null
  [key: string]: unknown
}

/** Un bloque «segundo conductor de la reserva X» tal y como lo pintan verificaciones, ficha y entrega */
export interface SecondDriverDocGroup {
  bookingId: string | null
  /** Qué reserva es: fechas y estado, o el aviso de que la subida es antigua / la reserva ya no existe */
  bookingLabel: string
  fullName: string
  document: string
  urls: CustomerDocumentUrls
  /** Subida antigua sin reserva asociada: no se puede comprobar a quién autoriza */
  legacy: boolean
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'pendiente',
  confirmed: 'confirmada',
  active: 'en curso',
  completed: 'completada',
  cancelled: 'cancelada',
  rejected: 'rechazada',
  expired: 'caducada',
}

/** `2026-06-12` -> `12/06/2026`, sin pasar por Date (no hay desplazamientos de zona horaria) */
function formatDay(value: unknown): string {
  const m = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim()) : null
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** «Reserva del 12/06/2026 al 19/06/2026 · confirmada (ab12cd34)» */
export function bookingLabel(booking: BookingForSecondDriverDocs | null | undefined, bookingId: string): string {
  const short = bookingId.slice(0, 8)
  if (!booking) return `Reserva ${short} (ya no consta en la base de datos)`
  const from = formatDay(booking.start_date)
  const to = formatDay(booking.end_date)
  const dates = from && to ? `del ${from} al ${to}` : from ? `del ${from}` : ''
  const status = STATUS_LABELS[String(booking.status || '')] || String(booking.status || '')
  return ['Reserva', dates, status ? `· ${status}` : '', `(${short})`].filter(Boolean).join(' ')
}

/**
 * Une las carpetas de Storage con las reservas del cliente. Salen:
 *  - todas las reservas con fotos (aunque estén canceladas: el admin ve a qué reserva pertenecen);
 *  - las reservas vivas que llevan segundo conductor aunque no hayan subido nada, para que
 *    «No adjuntado» se vea antes de validar y no se dé por bueno un documento que nadie ha visto;
 *  - las fotos sueltas de subidas antiguas, marcadas como tales.
 * Las reservas son las del MISMO cliente (`bookings.user_id`): una carpeta cuyo id no pertenece a
 * ninguna de ellas no es documentación de nadie. Si llega hasta aquí se enseña igualmente, pero
 * marcada como `legacy` (no se puede comprobar a quién autoriza), nunca como una reserva válida.
 */
export function buildSecondDriverGroups(
  folders: SecondDriverFolderDocs[],
  bookings: BookingForSecondDriverDocs[]
): SecondDriverDocGroup[] {
  const byId = new Map<string, BookingForSecondDriverDocs>()
  for (const b of bookings || []) if (b?.id) byId.set(String(b.id).toLowerCase(), b)

  const groups: SecondDriverDocGroup[] = []
  const covered = new Set<string>()

  for (const folder of folders || []) {
    if (!folder.bookingId) {
      groups.push({
        bookingId: null,
        bookingLabel: 'Subida anterior, sin reserva asociada',
        fullName: '',
        document: '',
        urls: folder.urls,
        legacy: true,
      })
      continue
    }
    const key = folder.bookingId.toLowerCase()
    const booking = byId.get(key) || null
    if (!booking) {
      groups.push({
        bookingId: folder.bookingId,
        bookingLabel: `Carpeta ${folder.bookingId.slice(0, 8)}: no corresponde a ninguna reserva de este cliente`,
        fullName: '',
        document: '',
        urls: folder.urls,
        legacy: true,
      })
      continue
    }
    const driver = bookingSecondDriver(booking)
    covered.add(key)
    groups.push({
      bookingId: folder.bookingId,
      bookingLabel: bookingLabel(booking, folder.bookingId),
      fullName: driver?.fullName || '',
      document: driver?.document || '',
      urls: folder.urls,
      legacy: false,
    })
  }

  for (const [key, booking] of byId) {
    if (covered.has(key) || !isLiveBooking(booking)) continue
    const driver = bookingSecondDriver(booking)
    if (!driver) continue
    groups.push({
      bookingId: String(booking.id),
      bookingLabel: bookingLabel(booking, String(booking.id)),
      fullName: driver.fullName,
      document: driver.document,
      urls: emptyUrls(),
      legacy: false,
    })
  }

  // Primero las reservas con salida más próxima; las sueltas antiguas, al final
  const startOf = (g: SecondDriverDocGroup) => (g.bookingId ? String(byId.get(g.bookingId.toLowerCase())?.start_date || '9999') : '9999-99')
  return groups.sort((a, b) => startOf(a).localeCompare(startOf(b)))
}
