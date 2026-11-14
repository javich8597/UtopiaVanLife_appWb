import { DOCUMENT_LIST_OPTIONS, type StoredFile } from '@/lib/admin/documents'
import { madridDay } from '@/lib/booking/secondDriver'
import {
  BOOKING_IDENTITY_NOT_PURGED,
  HOLDER_IDENTITY_PREFIXES,
  IDENTITY_IMAGE_RETENTION_DAYS,
  LEGAL_DATA_RETENTION_YEARS,
  RETENTION_AUDIT_COLUMNS,
  SECOND_DRIVER_IDENTITY_PREFIXES,
  bookingRetentionPlan,
  describeUnknownNames,
  holderImagePurgeDecision,
  imageCandidateCutoffDay,
  legalCandidateCutoffDay,
  legalDataPurgeColumns,
  legalDataPurgePatch,
  pendingImagePurges,
  pendingLegalPurges,
  selectIdentityFiles,
  storagePaths,
  summarizePurge,
  type BookingRetentionPlan,
  type HolderPurgeReason,
  type RetentionPurgeEntry,
} from '@/lib/booking/dataRetention'

/**
 * NÚCLEO DE LA PURGA DE CONSERVACIÓN (una pasada).
 *
 * Es el cuerpo de `POST /api/admin/retention/documents`, movido aquí SIN cambiar su lógica para que
 * lo puedan llamar dos puertas con autenticación distinta: la ruta de administrador (sesión) y la
 * tarea semanal (`/api/cron/retention/documents`, secreto). Quien llama es quien autentica y quien
 * pasa el cliente de base de datos con la clave de servicio; aquí dentro no se decide quién puede.
 *
 * Los plazos y el reparto están en `lib/booking/dataRetention.ts`; aquí solo se ejecuta. El
 * comentario de cabecera original de la ruta (por defecto simula, no borra si no puede dejar
 * constancia, idempotente) sigue valiendo punto por punto: ver `app/api/admin/retention/documents/route.ts`.
 *
 * Los errores inesperados se LANZAN: cada puerta los captura y responde con un mensaje genérico.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Máximo de reservas que se revisan por plazo y por ejecución: acota las llamadas a Storage */
export const RETENTION_DEFAULT_LIMIT = 50
export const RETENTION_MAX_LIMIT = 500

/** `storage.remove` en tandas: una lista enorme de rutas no cabe en una sola petición */
const REMOVE_CHUNK = 100

/** Migración que crea la constancia. Se nombra en el 409 para que se sepa qué aplicar */
export const RETENTION_MIGRATION = 'supabase/migrations/20261110_document_retention_policy.sql'

/** Quién lanza la pasada. `id` es null cuando la lanza la tarea programada: ninguna persona */
export interface RetentionActor {
  id: string | null
  via: 'admin' | 'cron'
}

export interface RetentionPassInput {
  confirm: boolean
  bookingId: string | null
  userId: string | null
  limit: number
}

export interface RetentionPassResult {
  status: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>
}

type Row = Record<string, unknown>

const isSafeSegment = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && !value.includes('/') && !value.includes('\\') && !value.includes('..')

interface FolderReport {
  scope: 'booking_images' | 'holder_images'
  bookingId: string | null
  userId: string
  folder: string
  purgeDay: string
  /** Nombres que se borrarían (o se han borrado): todas las copias de cada documento */
  files: string[]
  /**
   * Cuántos archivos NO se reconocen como documentación de identidad, con sus extensiones y las
   * longitudes de sus nombres. NUNCA el nombre, ni un trozo: puede ser un dato personal
   */
  unknown: number
  unknownExtensions: string[]
  unknownLengths: number[]
  /** Storage falló al listar: lo que diga esta carpeta no es de fiar y no se borra nada en ella */
  unreadable: boolean
  deleted: number
  /** Qué quedó marcado en la reserva: nada, «revisada» o «purgada del todo» */
  sealed?: 'reviewed' | 'purged'
  error?: string
}

interface LegalReport {
  bookingId: string
  purgeDay: string
  columns: string[]
  updated: boolean
  error?: string
}

interface HolderReport {
  userId: string
  purgeDay: string
  due: boolean
  reason: HolderPurgeReason
}

export async function runRetentionPass(
  // El cliente de Supabase con la clave de servicio, que el llamador ya ha comprobado. `any` como en el resto del archivo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  input: RetentionPassInput,
  actor: RetentionActor
): Promise<RetentionPassResult> {
  const { confirm, bookingId: onlyBooking, userId: onlyUser, limit } = input
  const now = new Date()
  const today = madridDay(now)
  const imageCutoff = imageCandidateCutoffDay(now)
  const legalCutoff = legalCandidateCutoffDay(now)

  /**
   * Pedir una reserva concreta NO puede arrastrar la carpeta de CUENTA del titular: esa carpeta es
   * de todas sus reservas, y una purga «dirigida a una reserva» que se lleva el DNI del titular
   * mientras otra reserva vencida conserva su subcarpeta engaña a quien la lanzó (hallazgo de
   * `seguridad-auditor`, 2026-11-10). Para tocarla hay que pedir el cliente a propósito.
   */
  const includeHolderFolders = !onlyBooking || !!onlyUser

  /**
   * 1. ¿Existe en la base lo que hace falta para dejar constancia?
   *
   * Va PRIMERO, antes de construir las consultas de candidatas, porque esas consultas filtran por
   * las columnas de constancia: en PostgREST real, filtrar por una columna que no existe es un
   * 42703, la ruta respondía 500 genérico y el 409 que explica qué migración falta era inalcanzable
   * justo en la base para la que se escribió (hallazgo de `seguridad-auditor` y `qa-verificador`,
   * 2026-11-12). El testigo es una fila cualquiera de `bookings` leída con `select('*')`: si una
   * columna no está en la fila, no está en la tabla.
   */
  const schema = await checkRetentionSchema(db)
  if (schema.error) throw new Error(schema.error)

  // 2. Candidatas. Una consulta por plazo, cada una ordenada, con su propio tope y excluyendo lo
  //    que ya está revisado o purgado (es el filtro de los índices parciales de la migración). Así
  //    60 reservas de 100 días no pueden dejar sin purgar los datos legales de una de 3 años.
  //    Si las columnas no existen todavía, NO se filtra por ellas: así la simulación sigue
  //    sirviendo para ver qué habría que purgar, y el `confirm` se rechaza con el 409 de abajo.
  //    `filterPurged` depende SOLO de que existan las columnas, no de que esté todo listo: si lo
  //    único que falta es la tabla del registro, filtrar sigue siendo correcto y, si no, la
  //    simulación exageraba lo que queda por purgar (hallazgo C-2 de `seguridad-auditor`).
  const candidates = await loadCandidates(db, {
    imageCutoff, legalCutoff, limit, onlyBooking, onlyUser, filterPurged: schema.columnsReady,
  })
  if (candidates.error) throw new Error(candidates.error)

  const rows = candidates.rows
  const byId = new Map<string, Row>()
  for (const row of rows) if (typeof row.id === 'string') byId.set(row.id, row)

  const skipped: Array<{ bookingId: string | null; userId: string | null; reason: string; detail: string; status: string | null }> = []
  const note = (row: Row, plan: BookingRetentionPlan, reason: string, detail: string) =>
    skipped.push({
      bookingId: plan.bookingId || null,
      userId: plan.userId,
      reason,
      detail,
      status: typeof row.status === 'string' ? row.status : null,
    })

  for (const row of rows) {
    const plan = bookingRetentionPlan(row, now)
    if (plan.blocked === 'no_dates') {
      note(row, plan, 'no_dates', 'La reserva no tiene fechas: no se puede situar el plazo. Revisar a mano.')
    } else if (plan.blocked === 'no_id') {
      note(row, plan, 'no_id', 'La fila no trae id de reserva.')
    }
  }

  // 3. Imágenes del 2º conductor: una carpeta por reserva (`documents/<cliente>/<reserva>/`)
  const imagePlans = pendingImagePurges(rows, now)
  const folders: FolderReport[] = []
  const ownFolderByBooking = new Map<string, FolderReport>()

  for (const plan of imagePlans) {
    const row = byId.get(plan.bookingId) || {}
    // Sin cuenta no hay carpeta: antes se descartaba en silencio y no aparecía en ningún sitio
    if (!plan.userId || !isSafeSegment(plan.userId) || !isSafeSegment(plan.bookingId)) {
      note(row, plan, 'no_user',
        plan.userId
          ? 'El id de cliente o de reserva no puede ser una carpeta de Storage: no se abre ninguna carpeta.'
          : 'La reserva no tiene cliente (`user_id`): no se sabe en qué carpeta está su documentación. Revisar a mano.')
      continue
    }
    const report = await readFolder(db, {
      scope: 'booking_images',
      bookingId: plan.bookingId,
      userId: plan.userId,
      folder: `${plan.userId}/${plan.bookingId.toLowerCase()}`,
      purgeDay: plan.imagePurgeDay,
      prefixes: SECOND_DRIVER_IDENTITY_PREFIXES,
    })
    folders.push(report)
    ownFolderByBooking.set(plan.bookingId, report)
  }

  // 4. Imágenes del titular: UNA carpeta por cuenta (`documents/<cliente>/`), compartida por todas
  //    sus reservas. Hace falta mirar TODAS las reservas de la cuenta, no solo las vencidas, o se
  //    borraría el DNI que la reserva siguiente del mismo cliente todavía necesita.
  const holderIds = includeHolderFolders
    ? [...new Set(imagePlans.map(plan => plan.userId).filter((id): id is string => !!id && isSafeSegment(id)))]
    : []
  const holders: HolderReport[] = []
  const holderFolderByUser = new Map<string, FolderReport>()
  /**
   * Reservas de cada cuenta que ya están REVISADAS y todavía no «purgadas», con sus ids. Si la
   * carpeta de cuenta se purga en esta pasada, de ellas tampoco queda ninguna imagen y su marca se
   * puede cerrar: de otro modo se quedaba en null para siempre, porque el barrido general ya no las
   * ve y una auditoría por `identity_images_purged_at IS NOT NULL` nunca llegaba al sí
   * (hallazgo QA-RET-10).
   */
  const reviewedPendingByUser = new Map<string, string[]>()

  if (holderIds.length > 0) {
    /**
     * `select('*')` y no una lista de columnas, por dos motivos: las de constancia pueden no
     * existir todavía y nombrarlas sería un 42703 (el mismo error que tapaba el 409), y hacen
     * falta `payment_status`, `created_at` y `notes` para `isAbandonedPending`, porque una
     * `pending` abandonada no puede alargar la conservación de la carpeta del titular.
     */
    const { data: accountBookings, error: accountError } = await db
      .from('bookings')
      .select('*')
      .in('user_id', holderIds)
    if (accountError) throw new Error(accountError.message)

    for (const userId of holderIds) {
      const own = (accountBookings || []).filter((b: Row) => b.user_id === userId)
      reviewedPendingByUser.set(
        userId,
        own
          .filter((b: Row) => b.identity_images_reviewed_at && !b.identity_images_purged_at && typeof b.id === 'string')
          .map((b: Row) => String(b.id))
      )
      const decision = holderImagePurgeDecision(own, now)
      holders.push({ userId, purgeDay: decision.purgeDay, due: decision.due, reason: decision.reason })
      if (!decision.due) continue
      const report = await readFolder(db, {
        scope: 'holder_images',
        bookingId: null,
        userId,
        folder: userId,
        purgeDay: decision.purgeDay,
        // Las sueltas `second_*` de las subidas antiguas viven aquí, al lado de las del titular
        prefixes: [...HOLDER_IDENTITY_PREFIXES, ...SECOND_DRIVER_IDENTITY_PREFIXES],
      })
      folders.push(report)
      holderFolderByUser.set(userId, report)
    }
  }

  // 5. Datos legales del registro de viajeros, a los 3 años
  const legal: LegalReport[] = pendingLegalPurges(rows, now)
    .map(plan => ({
      bookingId: plan.bookingId,
      purgeDay: plan.legalPurgeDay,
      columns: legalDataPurgeColumns(byId.get(plan.bookingId)),
      updated: false,
    }))
    .filter(report => report.columns.length > 0)

  const wouldPurge = folders.length > 0 || legal.length > 0

  /**
   * ¿Sirve de algo repetir? Hay candidatas que NUNCA se pueden marcar y que la consulta devuelve
   * igual en cada pasada: una reserva sin `user_id` (no se sabe en qué carpeta está su
   * documentación) y una cuenta con una reserva viva sin fechas (que con razón protege la carpeta
   * del titular). El aviso anterior mandaba «vuelve a ejecutar hasta que truncated sea false», y en
   * esos casos ese bucle no termina (hallazgo de `qa-verificador`, 2026-11-12).
   */
  const stalled: Array<{ bookingId: string | null; reason: string }> = [
    ...skipped.map(s => ({ bookingId: s.bookingId, reason: s.reason })),
    ...imagePlans
      .filter(plan => {
        if (!plan.userId) return false // ya contado arriba como `no_user`
        const holder = holders.find(h => h.userId === plan.userId)
        return !!holder && holder.reason === 'undatable_booking'
      })
      .map(plan => ({ bookingId: plan.bookingId, reason: 'holder_undatable' })),
  ]
  const stalledReasons = stalled.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.reason] = (acc[entry.reason] || 0) + 1
    return acc
  }, {})
  /** ¿Queda alguna candidata revisada que esta pasada sí puede dejar resuelta? Lo lee la tarea semanal para decidir si repite */
  const advanceable = rows.length - new Set(stalled.map(s => s.bookingId)).size
  const stalledWarning = stalled.length > 0
    ? `${stalled.length} de las ${rows.length} reservas revisadas no se pueden marcar solas y volverán en cada pasada: repetir la purga NO las arregla, hay que revisarlas a mano (${Object.entries(stalledReasons).map(([reason, count]) => `${reason}: ${count}`).join(', ')}).`
    : null
  const truncatedWarning = candidates.truncated
    ? advanceable > 0
      ? `Se ha alcanzado el tope de ${limit} reservas por plazo: quedan candidatas sin revisar. Vuelve a ejecutar hasta que "truncated" sea false.`
      : `Se ha alcanzado el tope de ${limit} reservas por plazo, pero NINGUNA de las revisadas puede avanzar: repetir devolvería siempre las mismas. Hay que resolver a mano las de "stalled" antes de que el barrido pueda seguir.`
    : null

  const policy = {
    decision: 'Javier, 2026-11-10: purgar imágenes de Storage a los 100 días tras la devolución; retener datos legales 3 años por RD 933/2021.',
    imageRetentionDays: IDENTITY_IMAGE_RETENTION_DAYS,
    legalRetentionYears: LEGAL_DATA_RETENTION_YEARS,
    today,
    imageCandidateCutoffDay: imageCutoff,
    legalCandidateCutoffDay: legalCutoff,
    bucket: 'documents',
    notPurged: [...BOOKING_IDENTITY_NOT_PURGED],
    note: 'Las fotos de entregas y del estado del vehículo están en los buckets handovers y vehicle-docs y no entran en esta purga.',
    ...(includeHolderFolders
      ? {}
      : { holderFoldersExcluded: 'Modo dirigido por bookingId: la carpeta de cuenta del titular (documents/<cliente>/) NO se toca, porque es de todas sus reservas. Añade "userId" para incluirla.' }),
  }

  const scope = {
    bookingId: onlyBooking,
    userId: onlyUser,
    limit,
    truncated: candidates.truncated,
    reviewed: rows.length,
    holderFolders: includeHolderFolders,
  }

  if (confirm && wouldPurge && schema.missing.length > 0) {
    console.error('retention: purga rechazada, falta la constancia', schema.missing)
    return {
      status: 409,
      body: {
        error: `No se puede purgar sin poder dejar constancia: falta ${schema.missing.join(', ')}. Aplica antes ${RETENTION_MIGRATION}. No se ha borrado nada.`,
        missing: schema.missing,
        migration: RETENTION_MIGRATION,
        policy,
        scope,
        summary: { files: 0, columns: 0, bookings: 0, holders: 0 },
      },
    }
  }

  if (!confirm) {
    const planned: RetentionPurgeEntry[] = [
      ...folders
        .filter(f => !f.unreadable && f.files.length > 0)
        .map(f => ({ scope: f.scope, bookingId: f.bookingId, userId: f.userId, purgeDay: f.purgeDay, items: storagePaths(f.folder, f.files) })),
      ...legal.map(l => ({ scope: 'booking_legal_data' as const, bookingId: l.bookingId, userId: null, purgeDay: l.purgeDay, items: l.columns })),
    ]
    return {
      status: 200,
      body: {
      mode: 'simulacion',
      policy,
      scope,
      schema,
      reviewed: rows.length,
      truncated: candidates.truncated,
      summary: summarizePurge(planned),
      folders,
      holders,
      legal,
      skipped,
      stalled,
      stalledReasons,
      advanceable,
      ...(stalledWarning ? { stalledWarning } : {}),
      ...(truncatedWarning ? { truncatedWarning } : {}),
      hint: schema.missing.length > 0 && wouldPurge
        ? `No se ha borrado nada, y con { "confirm": true } se rechazaría con un 409: falta ${schema.missing.join(', ')}. Aplica antes ${RETENTION_MIGRATION}.`
        : 'No se ha borrado nada. Repite la llamada con { "confirm": true } para ejecutar la purga.',
      },
    }
  }

  // 6. Purga de verdad
  const done: RetentionPurgeEntry[] = []
  let sealed = 0
  const sealFailed: string[] = []

  /**
   * SONDA DE SELLO, antes de borrar un solo archivo.
   *
   * Los archivos se borraban primero y se sellaba después, así que un trigger mal calibrado que
   * rechazara el `UPDATE` con 42501 dejaba las fotos borradas, `sealed: 0` y un 200 sin ningún
   * aviso; y la comprobación funcional de la propia migración habría sido destructiva, porque
   * Javier perdería las fotos justo al probar que todo funciona (hallazgo de `seguridad-auditor`,
   * 2026-11-12). Mi «falla cerrado» era falso.
   *
   * Se elige la sonda, y no «marcar antes de borrar carpeta a carpeta», porque marcar primero
   * haría que la fila afirmara «revisada, subcarpeta limpia» ANTES de que los archivos se fueran:
   * si el borrado fallara después, esa reserva quedaría fuera del filtro de candidatas y sus fotos
   * se quedarían en el bucket para siempre con la auditoría diciendo lo contrario. Cambia una
   * omisión (no consta lo borrado) por una afirmación falsa, que es peor. La sonda, además, cuesta
   * dos escrituras por ejecución en lugar de duplicarlas por carpeta, y deja un error único que
   * dice qué hacer.
   */
  /**
   * La sonda solo hace falta si de verdad se va a BORRAR algo: el problema que arregla es el orden
   * «borrar y luego sellar». Un sello que falle sin haber borrado nada no pierde nada (la reserva
   * simplemente no avanza), y la purga de datos legales escribe el vaciado y su marca en el mismo
   * `UPDATE`, así que ahí no hay nada que pueda quedar a medias.
   */
  const willDelete = folders.some(folder => !folder.unreadable && folder.files.length > 0)
  const probe = willDelete ? await probeSealPermission(db, rows) : { ok: true as const }
  if (!probe.ok) {
    console.error('retention: la sonda de sello ha fallado; no se borra nada', probe.error)
    return {
      status: 409,
      body: {
        error: `No se puede dejar constancia de la purga: el intento de escribir la constancia en la reserva ${probe.bookingId || '(desconocida)'} ha fallado (${probe.error}). No se ha borrado nada. Si el mensaje dice que la prueba no se pudo deshacer, esa reserva se queda con una marca de prueba (identity_images_reviewed_at de 1970 y un recuento negativo) que no afirma ninguna purga y que la siguiente pasada sobrescribe. Revisa el trigger protect_bookings_retention_columns de ${RETENTION_MIGRATION}: el sello solo lo admite el rol service_role, así que la purga necesita una SUPABASE_SERVICE_ROLE_KEY válida y, desde SQL, un «SET LOCAL ROLE service_role».`,
        sealProbe: 'failed',
        sealProbeBookingId: probe.bookingId,
        policy,
        scope,
        schema,
        summary: { files: 0, columns: 0, bookings: 0, holders: 0 },
      },
    }
  }

  for (const folder of folders) {
    if (folder.unreadable || folder.files.length === 0) continue
    const paths = storagePaths(folder.folder, folder.files)
    // Cada tanda que sale bien se cuenta y se registra ANTES de seguir: si la siguiente falla, los
    // archivos de las anteriores están borrados de verdad y tienen que constar (hallazgo QA-RET-1)
    const deleted: string[] = []
    for (let i = 0; i < paths.length; i += REMOVE_CHUNK) {
      const chunk = paths.slice(i, i + REMOVE_CHUNK)
      const { error } = await db.storage.from('documents').remove(chunk)
      if (error) {
        folder.error = error.message
        console.error('retention: tanda de borrado fallida', folder.folder, error.message)
        break
      }
      deleted.push(...chunk)
    }
    folder.deleted = deleted.length
    if (deleted.length > 0) {
      done.push({ scope: folder.scope, bookingId: folder.bookingId, userId: folder.userId, purgeDay: folder.purgeDay, items: deleted })
    }
  }

  /**
   * Constancia por reserva, con DOS marcas que dicen cosas distintas:
   *
   *   - `identity_images_reviewed_at`: esta reserva se revisó y de SU subcarpeta no queda nada. Se
   *     pone también cuando no había nada que borrar: si no, la reserva no se marca nunca, el
   *     filtro de candidatas la devuelve en cada pasada y una auditoría no puede distinguir
   *     «revisada y sin nada» de «sin revisar» (hallazgo de `qa-verificador`, 2026-11-10).
   *   - `identity_images_purged_at`: además, de esta reserva no queda NINGUNA imagen de identidad,
   *     ni siquiera en la carpeta de cuenta del titular. Solo se puede afirmar cuando esa carpeta
   *     también se ha purgado. Con una reserva viva por delante se conserva a propósito
   *     (`retained`), y sellar entonces como «purgada» afirmaba más de lo que había pasado: el
   *     `dni_front` del titular seguía en el bucket (hallazgo de `seguridad-auditor`, 2026-11-12).
   *
   * No se marca nada si algo quedó sin resolver: carpeta ilegible, tanda de borrado fallida, cuenta
   * con una reserva viva sin fechas, o modo dirigido en el que la carpeta del titular no se miró.
   */
  for (const plan of imagePlans) {
    const row = byId.get(plan.bookingId)
    if (!row || !plan.userId) continue
    if (!('identity_images_reviewed_at' in row)) continue
    if (row.identity_images_reviewed_at && row.identity_images_purged_at) continue

    const ownFolder = ownFolderByBooking.get(plan.bookingId)
    if (!ownFolder || ownFolder.unreadable || ownFolder.error) continue

    // La carpeta de cuenta tiene que haberse resuelto en esta pasada. `holders` está vacío en modo
    // dirigido, así que este `find` ya cubre ese caso
    const holder = holders.find(h => h.userId === plan.userId)
    if (!holder || holder.reason === 'undatable_booking' || holder.reason === 'no_bookings') continue
    const holderFolder = holderFolderByUser.get(plan.userId)
    if (holder.due && (!holderFolder || holderFolder.unreadable || holderFolder.error)) continue

    // `retained`: la cuenta conserva su carpeta por otra reserva viva, así que de esta reserva
    // todavía pueden quedar imágenes del titular. Queda revisada, no purgada
    const fullyPurged = holder.due
    const stamp = new Date().toISOString()
    const patch: Row = { identity_images_reviewed_at: stamp }
    if (fullyPurged && 'identity_images_purged_at' in row) patch.identity_images_purged_at = stamp
    if ('identity_images_purged_count' in row) patch.identity_images_purged_count = ownFolder.deleted
    const { error } = await db.from('bookings').update(patch).eq('id', plan.bookingId)
    if (error) {
      console.error('retention: no se pudo marcar la reserva revisada', plan.bookingId, error.message)
      sealFailed.push(plan.bookingId)
      continue
    }
    ownFolder.sealed = fullyPurged ? 'purged' : 'reviewed'
    sealed++
  }

  /**
   * Cierre de las reservas que ya estaban REVISADAS cuando se purga la carpeta de su cuenta: de
   * ellas tampoco queda ninguna imagen, así que su marca de «purgada» se puede cerrar. Sin esto se
   * quedaba en null para siempre (el barrido general ya no las ve) y una auditoría por
   * `identity_images_purged_at IS NOT NULL` nunca llegaba al sí, que es para lo que existe esa
   * columna (hallazgo QA-RET-10). Los ids se tienen de la consulta de la cuenta, así que es un
   * `UPDATE` filtrado por `in('id', …)`, nunca un filtro ancho.
   */
  const closedByHolder: string[] = []
  for (const [userId, bookingIds] of reviewedPendingByUser) {
    if (bookingIds.length === 0) continue
    const holderFolder = holderFolderByUser.get(userId)
    // Solo si la carpeta de cuenta se ha resuelto de verdad en esta pasada
    if (!holderFolder || holderFolder.unreadable || holderFolder.error) continue
    const stamp = new Date().toISOString()
    const { error } = await db
      .from('bookings')
      .update({ identity_images_purged_at: stamp })
      .in('id', bookingIds)
    if (error) {
      console.error('retention: no se pudo cerrar la marca de las reservas ya revisadas', userId, error.message)
      sealFailed.push(...bookingIds)
      continue
    }
    closedByHolder.push(...bookingIds)
  }

  for (const report of legal) {
    const row = byId.get(report.bookingId)
    const patch = legalDataPurgePatch(row)
    if (Object.keys(patch).length === 0) continue
    if (row && 'legal_data_purged_at' in row) patch.legal_data_purged_at = new Date().toISOString()
    const { error } = await db.from('bookings').update(patch).eq('id', report.bookingId)
    if (error) {
      report.error = error.message
      console.error('retention: no se pudieron borrar los datos legales', report.bookingId, error.message)
      sealFailed.push(report.bookingId)
      continue
    }
    report.updated = true
    done.push({ scope: 'booking_legal_data', bookingId: report.bookingId, userId: null, purgeDay: report.purgeDay, items: report.columns })
  }

  const summary = summarizePurge(done)

  /**
   * Carpetas que se resolvieron (se leyeron y se borró todo lo que había) y por tanto tenían que
   * dejar constancia. Si se sellaron menos, hay archivos borrados de los que no consta nada: un
   * `sealed: 0` con `files: 2` no disparaba ningún aviso (hallazgo de `seguridad-auditor`).
   */
  const resolvedBookingFolders = folders.filter(
    f => f.scope === 'booking_images' && !f.unreadable && !f.error
  ).length
  const unsealed = [...new Set(sealFailed)]
  /** Reservas que se quedan en «revisada»: el aviso tiene que NOMBRARLAS, o no hay lista por la que volver */
  const reviewedOnly = folders
    .filter(f => f.sealed === 'reviewed' && f.bookingId)
    .map(f => f.bookingId as string)
  const sealWarning = unsealed.length > 0 || sealed < resolvedBookingFolders
    ? `Se han purgado archivos sin poder dejar constancia en ${Math.max(unsealed.length, resolvedBookingFolders - sealed)} reserva(s): ${unsealed.length > 0 ? `${unsealed.join(', ')}. ` : ''}Revisa el trigger protect_bookings_retention_columns y la clave de servicio; esas reservas volverán a salir como candidatas.`
    : null

  // 7. Constancia de la ejecución: fecha, quién, con qué alcance y qué se purgó (rutas y nombres
  //    de columna, nunca valores). El alcance hace falta para poder concluir «todas las reservas
  //    de más de 100 días están purgadas»: sin él, una fila no dice qué se llegó a revisar.
  let logged = false
  if (done.length > 0) {
    const { error } = await db.from('retention_purge_log').insert({
      ran_at: new Date().toISOString(),
      ran_by: actor.id,
      policy_day: today,
      image_retention_days: IDENTITY_IMAGE_RETENTION_DAYS,
      legal_retention_years: LEGAL_DATA_RETENTION_YEARS,
      scope_booking_id: onlyBooking,
      scope_user_id: onlyUser,
      scope_limit: limit,
      scope_truncated: candidates.truncated,
      candidates_reviewed: rows.length,
      holder_folders_included: includeHolderFolders,
      files_deleted: summary.files,
      columns_cleared: summary.columns,
      bookings_affected: summary.bookings,
      holders_affected: summary.holders,
      bookings_sealed: sealed,
      candidates_stalled: stalled.length,
      // Reservas con archivos borrados de los que NO se pudo dejar constancia en su fila, y
      // reservas ya revisadas cuya marca de «purgada» se ha cerrado al purgar su carpeta de cuenta
      seal_failed: unsealed,
      closed_by_holder: closedByHolder,
      detail: done,
    })
    if (error) console.error('retention: no se pudo registrar la purga en retention_purge_log', error.message)
    else logged = true
  }

  console.info('[retención] purga de conservación ejecutada', {
    via: actor.via,
    actorId: actor.id,
    today,
    files: summary.files,
    columns: summary.columns,
    bookings: summary.bookings,
    holders: summary.holders,
    truncated: candidates.truncated,
  })

  return {
    status: 200,
    body: {
    mode: 'purga',
    policy,
    scope,
    schema,
    reviewed: rows.length,
    truncated: candidates.truncated,
    summary,
    folders,
    holders,
    legal,
    skipped,
    stalled,
    stalledReasons,
    advanceable,
    sealed,
    sealProbe: willDelete ? 'ok' : 'skipped',
    sealFailed: unsealed,
    closedByHolder,
    logged,
    ...(done.length > 0 && !logged
      ? { logWarning: 'No se pudo escribir en retention_purge_log aunque sí se purgó: revísalo antes de volver a ejecutar.' }
      : {}),
    ...(sealWarning ? { sealWarning } : {}),
    ...(stalledWarning ? { stalledWarning } : {}),
    ...(truncatedWarning ? { truncatedWarning } : {}),
    ...(reviewedOnly.length > 0
      ? {
          reviewedWarning: `Estas reservas quedan marcadas como REVISADAS y no como purgadas, porque su cuenta conserva la carpeta del titular por otra reserva viva y todavía pueden quedar imágenes suyas: ${reviewedOnly.join(', ')}. Su marca de purgada se cierra sola cuando venza el plazo de esa cuenta.`,
          reviewedOnly,
        }
      : {}),
    },
  }
}

/**
 * ¿Puede esta conexión ESCRIBIR la constancia? Se comprueba antes de borrar nada.
 *
 * No basta con que las columnas existan: el trigger `protect_bookings_retention_columns` solo admite
 * el rol `service_role`, y si está mal calibrado (o la clave no es la de servicio) el `UPDATE` del
 * sello se rechaza con 42501. Antes eso ocurría DESPUÉS de borrar los archivos.
 *
 * La sonda escribe un valor imposible en `identity_images_purged_count` (un recuento negativo, que
 * no afirma nada: `reviewed_at` y `purged_at` siguen intactos) y lo deja como estaba. Tiene que ser
 * un cambio REAL de valor, porque el trigger solo salta con `IS DISTINCT FROM`: un patch idéntico
 * pasaría también para un cliente y no probaría nada (aviso de `seguridad-auditor`).
 *
 * Si la restauración fallara, la fila se queda con ese recuento negativo, que es imposible de
 * confundir con uno real y no afirma ninguna purga: se devuelve el fallo igual y no se borra nada.
 */
/**
 * Marcas con las que la sonda prueba `identity_images_reviewed_at`. Son fechas imposibles (año 1970)
 * para que, si la restauración fallara, nadie las confunda con una revisión real; y hay dos para
 * poder invertir una por la otra, porque el trigger solo salta con `IS DISTINCT FROM`.
 */
const PROBE_STAMP = '1970-01-01T00:00:00.000Z'
const PROBE_STAMP_ALT = '1970-01-02T00:00:00.000Z'

async function probeSealPermission(
  db: any,
  rows: Row[]
): Promise<{ ok: true } | { ok: false; error: string; bookingId?: string }> {
  const sealable = (row: Row) => typeof row.id === 'string' && 'identity_images_purged_count' in row
  // Primero una fila SIN constancia: si la restauración fallara, el centinela se queda en una fila
  // que no afirma nada. Una reserva ya purgada tiene un recuento real que perder, y el bucle de
  // sellado la salta, así que ahí el centinela se quedaría para siempre (aviso de seguridad)
  const witness =
    rows.find(row => sealable(row) && row.identity_images_reviewed_at == null && row.identity_images_purged_count == null) ||
    rows.find(sealable)
  // Sin ninguna fila que sellar no hay nada que probar: el 409 del esquema ya cubre lo demás
  if (!witness) return { ok: true }

  const bookingId = String(witness.id)
  const original = typeof witness.identity_images_purged_count === 'number' ? witness.identity_images_purged_count : null
  const probeValue = original === -1 ? -2 : -1
  const originalStamp = typeof witness.identity_images_reviewed_at === 'string' ? witness.identity_images_reviewed_at : null
  // El sello escribe sobre todo `identity_images_reviewed_at`, así que la sonda tiene que probar ESA
  // columna además del recuento: si el trigger rechazara solo esa, la sonda pasaba y el sello
  // fallaba DESPUÉS de borrar (hallazgo QA-RET-14). Se alterna entre las dos marcas de prueba
  // porque con IS DISTINCT FROM un patch idéntico no dispara el trigger y no probaría nada
  const probeStamp = originalStamp === PROBE_STAMP ? PROBE_STAMP_ALT : PROBE_STAMP
  const probePatch: Row = { identity_images_purged_count: probeValue, identity_images_reviewed_at: probeStamp }
  const restorePatch: Row = { identity_images_purged_count: original, identity_images_reviewed_at: originalStamp }

  const { error: writeError } = await db.from('bookings').update(probePatch).eq('id', bookingId)
  if (writeError) return { ok: false, error: writeError.message, bookingId }

  const { error: restoreError } = await db.from('bookings').update(restorePatch).eq('id', bookingId)
  if (restoreError) {
    return {
      ok: false,
      error: `la constancia se pudo escribir pero no deshacer la prueba (${restoreError.message})`,
      bookingId,
    }
  }
  return { ok: true }
}

/**
 * ¿Existe en la base lo que hace falta para dejar constancia de la purga?
 *
 * Se llama ANTES de construir las consultas de candidatas, porque esas filtran por las columnas de
 * constancia y en PostgREST filtrar por una columna que no existe es un 42703: el 409 que explica
 * qué falta quedaba detrás de un 500 genérico.
 *
 * El testigo es UNA fila cualquiera de `bookings` leída con `select('*')`, sin filtros: si una
 * columna no está en la fila, no está en la tabla. La tabla del registro se comprueba leyendo una
 * fila: si no existe, PostgREST responde con un error.
 *
 * No se usa `to_regclass` porque desde la aplicación no hay forma de ejecutar SQL suelto; esta es la
 * comprobación equivalente con los medios de PostgREST.
 *
 * Si la base no tiene ni una reserva, `verified` es false y `missing` queda vacío: no hay nada que
 * purgar, así que tampoco hay nada que comprobar.
 */
async function checkRetentionSchema(
  db: any
): Promise<{ ready: boolean; columnsReady: boolean; verified: boolean; missing: string[]; error?: string }> {
  const missing: string[] = []

  const { data, error: witnessError } = await db.from('bookings').select('*').limit(1)
  // Un fallo real de la base no es «faltan columnas»: se propaga y la ruta responde 500
  if (witnessError) {
    return { ready: false, columnsReady: false, verified: false, missing, error: witnessError.message }
  }

  const witness = (Array.isArray(data) ? data : []).find((row: Row) => row && typeof row === 'object') || null
  if (witness) {
    for (const column of RETENTION_AUDIT_COLUMNS) {
      if (!(column in witness)) missing.push(`bookings.${column}`)
    }
  }
  // Se puede filtrar por las columnas en cuanto existen, aunque falte la tabla del registro
  const columnsReady = missing.length === 0

  const { error } = await db.from('retention_purge_log').select('id').limit(1)
  if (error) missing.push('la tabla retention_purge_log')

  return { ready: missing.length === 0, columnsReady, verified: !!witness, missing }
}

/**
 * Reservas candidatas, una consulta por plazo.
 *
 * Cada plazo tiene su propio tope, su propio orden (devolución más antigua primero) y su propio
 * filtro de «todavía sin purgar», que es justo el de los índices parciales de la migración. Antes
 * era una sola pareja de consultas sin orden y sin ese filtro, y con más candidatas que el tope los
 * datos legales de una reserva de 3 años podían no purgarse nunca; además, sin orden la lista que el
 * administrador revisaba en la simulación no era necesariamente la que se borraba después
 * (hallazgo QA-RET-2).
 *
 * Dos consultas por plazo porque una reserva sin `end_date` se sitúa por `start_date`.
 *
 * Cada consulta pide `limit + 1` filas y se queda con `limit`: así `truncated` dice la verdad.
 * Comparar `length >= limit` daba `true` con exactamente `limit` candidatas y pedía una pasada de
 * más (hallazgo de `seguridad-auditor`, 2026-11-12).
 *
 * `filterPurged: false` cuando las columnas de constancia todavía no existen: filtrar por ellas
 * sería un 42703 y taparía el 409 que explica qué migración falta.
 */
async function loadCandidates(
  db: any,
  options: {
    imageCutoff: string
    legalCutoff: string
    limit: number
    onlyBooking: string | null
    onlyUser: string | null
    filterPurged: boolean
  }
): Promise<{ rows: Row[]; truncated: boolean; error?: string }> {
  const { imageCutoff, legalCutoff, limit, onlyBooking, onlyUser, filterPurged } = options

  if (onlyBooking) {
    const { data, error } = await db.from('bookings').select('*').eq('id', onlyBooking).maybeSingle()
    if (error) return { rows: [], truncated: false, error: error.message }
    return { rows: data ? [data] : [], truncated: false }
  }

  /** Filas sin resolver de ese plazo, opcionalmente de un solo cliente */
  const pending = (pendingColumn: string) => {
    let query = db.from('bookings').select('*')
    if (onlyUser) query = query.eq('user_id', onlyUser)
    return filterPurged ? query.is(pendingColumn, null) : query
  }
  /** Orden estable: la devolución más antigua primero y, a igualdad, por id */
  const ordered = (query: any) =>
    query.order('end_date', { ascending: true }).order('id', { ascending: true }).limit(limit + 1)

  const queries = [
    // Imágenes: lo que marca que una reserva ya está resuelta es `identity_images_reviewed_at`,
    // no `..._purged_at` (una reserva revisada cuya cuenta conserva la carpeta del titular nunca
    // llega a «purgada» y, filtrando por esa, volvería en cada pasada)
    ordered(pending('identity_images_reviewed_at').lte('end_date', imageCutoff)),
    ordered(pending('identity_images_reviewed_at').is('end_date', null).lte('start_date', imageCutoff)),
    ordered(pending('legal_data_purged_at').lte('end_date', legalCutoff)),
    ordered(pending('legal_data_purged_at').is('end_date', null).lte('start_date', legalCutoff)),
  ]
  const results = await Promise.all(queries)
  const failed = results.find(result => result.error)
  if (failed) return { rows: [], truncated: false, error: failed.error.message }

  // Se pidió `limit + 1`: si vino la de más, quedan candidatas sin revisar, y esa no entra
  const truncated = results.some(result => (result.data || []).length > limit)
  const byId = new Map<string, Row>()
  for (const result of results) {
    for (const row of (result.data || []).slice(0, limit)) if (row?.id) byId.set(String(row.id), row)
  }
  return { rows: [...byId.values()], truncated }
}

/**
 * Qué hay en una carpeta de Storage y qué de eso es documentación de identidad.
 *
 * Un fallo al listar NO se trata como «la carpeta está vacía»: se marca `unreadable` y no se borra
 * nada de ella (el mismo criterio que `resolveSecondDriverDocuments`, donde un «No adjuntado» por
 * fallo de Storage podía no ser cierto).
 */
async function readFolder(
  db: any,
  options: {
    scope: 'booking_images' | 'holder_images'
    bookingId: string | null
    userId: string
    folder: string
    purgeDay: string
    prefixes: readonly string[]
  }
): Promise<FolderReport> {
  const report: FolderReport = {
    scope: options.scope,
    bookingId: options.bookingId,
    userId: options.userId,
    folder: options.folder,
    purgeDay: options.purgeDay,
    files: [],
    unknown: 0,
    unknownExtensions: [],
    unknownLengths: [],
    unreadable: false,
    deleted: 0,
  }
  try {
    const { data, error } = await db.storage.from('documents').list(options.folder, DOCUMENT_LIST_OPTIONS)
    if (error) {
      report.unreadable = true
      report.error = error.message
      return report
    }
    const files = (Array.isArray(data) ? data : []) as StoredFile[]
    const selection = selectIdentityFiles(files, options.prefixes)
    report.files = selection.purge
    // Ni un trozo del nombre: un archivo subido a mano puede llevar datos personales en el nombre, y
    // 10 caracteres bastaban para entregar un DNI entero. Recuento, extensiones y longitudes
    const unknown = describeUnknownNames(selection.unknown)
    report.unknown = unknown.count
    report.unknownExtensions = unknown.extensions
    report.unknownLengths = unknown.lengths
  } catch (e) {
    report.unreadable = true
    report.error = e instanceof Error ? e.message : 'error al listar'
    console.error('retention: no se pudo listar', options.folder, e)
  }
  return report
}

export type { BookingRetentionPlan }
