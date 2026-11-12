import { NextResponse } from 'next/server'
import { isValidServiceRoleKey } from '@/lib/admin/auth'
import { requireAdmin } from '@/lib/admin/requireAdmin'
import { BOOKING_STATUS_COLUMNS } from '@/lib/admin/bookingStatus'
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
 * POLÍTICA DE CONSERVACIÓN: purga de la documentación de identidad de las reservas.
 *
 * Decisión de Javier (2026-11-10): «Purgar imágenes de Storage a los 100 días tras la devolución;
 * retener datos legales 3 años por RD 933/2021». Los plazos y el reparto están en
 * `lib/booking/dataRetention.ts`; aquí solo se ejecuta.
 *
 * POST /api/admin/retention/documents
 *   { confirm?: boolean, bookingId?: string, userId?: string, limit?: number }
 *
 * POR DEFECTO ES UNA SIMULACIÓN: dice qué borraría y no borra nada. Solo con `confirm: true` borra.
 * Nunca devuelve una URL firmada, el valor de ningún dato ni el nombre completo de un archivo que no
 * reconoce (podría llevar datos personales en el propio nombre).
 *
 * Exige administrador y clave de servicio válida (503 si no la hay), igual que
 * /api/admin/bookings/second-driver.
 *
 * NO BORRA SI NO PUEDE DEJAR CONSTANCIA (hallazgo de `seguridad-auditor`, 2026-11-10): antes de
 * tocar nada comprueba que existen las tres columnas de constancia y la tabla
 * `retention_purge_log`; si falta algo responde 409 y no borra. Storage no tiene papelera: borrar
 * fotos de DNI sin rastro es peor que no borrarlas.
 *
 * Es idempotente: las consultas excluyen lo ya purgado, lo que no está en Storage no se vuelve a
 * contar y una reserva con las columnas ya vacías no genera ningún `UPDATE`.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Máximo de reservas que se revisan por plazo y por ejecución: acota las llamadas a Storage */
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500

/** `storage.remove` en tandas: una lista enorme de rutas no cabe en una sola petición */
const REMOVE_CHUNK = 100

/**
 * Columnas de las reservas de una cuenta que necesita `holderImagePurgeDecision`. `payment_status`,
 * `created_at` y `notes` son las de `BOOKING_STATUS_COLUMNS`: hacen falta para `isAbandonedPending`,
 * porque una `pending` abandonada no puede alargar la conservación de la carpeta del titular.
 */
const BOOKING_FIELDS = `user_id, start_date, end_date, ${BOOKING_STATUS_COLUMNS}`

/** Migración que crea la constancia. Se nombra en el 409 para que se sepa qué aplicar */
const RETENTION_MIGRATION = 'supabase/migrations/20261110_document_retention_policy.sql'

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

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    if (!isValidServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      console.error('retention: sin SUPABASE_SERVICE_ROLE_KEY válida; no se puede purgar')
      return NextResponse.json(
        { error: 'El servidor no tiene el acceso privilegiado a la base de datos configurado: no se puede ejecutar la purga.' },
        { status: 503 }
      )
    }
    const db = auth.db

    const body = (await request.json().catch(() => ({}))) as Row
    if (body === null || typeof body !== 'object') {
      return NextResponse.json({ error: 'Petición no válida' }, { status: 400 })
    }
    const confirm = body.confirm === true
    const onlyBooking = typeof body.bookingId === 'string' ? body.bookingId : null
    const onlyUser = typeof body.userId === 'string' ? body.userId : null
    if (onlyBooking && !UUID_RE.test(onlyBooking)) {
      return NextResponse.json({ error: 'Reserva no válida' }, { status: 400 })
    }
    // UUID, igual que `bookingId`: `scope_user_id` es de tipo uuid y la carpeta de Storage es el id
    // de la cuenta. `isSafeSegment` dejaba pasar cualquier texto sin barras
    if (onlyUser && !UUID_RE.test(onlyUser)) {
      return NextResponse.json({ error: 'Cliente no válido' }, { status: 400 })
    }
    const limit = Math.min(Math.max(Number(body.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT)

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
    const candidates = await loadCandidates(db, {
      imageCutoff, legalCutoff, limit, onlyBooking, onlyUser, filterPurged: schema.ready,
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

    if (holderIds.length > 0) {
      const { data: accountBookings, error: accountError } = await db
        .from('bookings')
        .select(BOOKING_FIELDS)
        .in('user_id', holderIds)
      if (accountError) throw new Error(accountError.message)

      for (const userId of holderIds) {
        const own = (accountBookings || []).filter((b: Row) => b.user_id === userId)
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
    /** ¿Queda alguna candidata revisada que esta pasada sí puede dejar resuelta? */
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
      return NextResponse.json(
        {
          error: `No se puede purgar sin poder dejar constancia: falta ${schema.missing.join(', ')}. Aplica antes ${RETENTION_MIGRATION}. No se ha borrado nada.`,
          missing: schema.missing,
          migration: RETENTION_MIGRATION,
          policy,
          scope,
          summary: { files: 0, columns: 0, bookings: 0, holders: 0 },
        },
        { status: 409 }
      )
    }

    if (!confirm) {
      const planned: RetentionPurgeEntry[] = [
        ...folders
          .filter(f => !f.unreadable && f.files.length > 0)
          .map(f => ({ scope: f.scope, bookingId: f.bookingId, userId: f.userId, purgeDay: f.purgeDay, items: storagePaths(f.folder, f.files) })),
        ...legal.map(l => ({ scope: 'booking_legal_data' as const, bookingId: l.bookingId, userId: null, purgeDay: l.purgeDay, items: l.columns })),
      ]
      return NextResponse.json({
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
        ...(stalledWarning ? { stalledWarning } : {}),
        ...(truncatedWarning ? { truncatedWarning } : {}),
        hint: schema.missing.length > 0 && wouldPurge
          ? `No se ha borrado nada, y con { "confirm": true } se rechazaría con un 409: falta ${schema.missing.join(', ')}. Aplica antes ${RETENTION_MIGRATION}.`
          : 'No se ha borrado nada. Repite la llamada con { "confirm": true } para ejecutar la purga.',
      })
    }

    // 6. Purga de verdad
    const done: RetentionPurgeEntry[] = []
    let sealed = 0

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
        continue
      }
      ownFolder.sealed = fullyPurged ? 'purged' : 'reviewed'
      sealed++
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
        continue
      }
      report.updated = true
      done.push({ scope: 'booking_legal_data', bookingId: report.bookingId, userId: null, purgeDay: report.purgeDay, items: report.columns })
    }

    const summary = summarizePurge(done)

    // 7. Constancia de la ejecución: fecha, quién, con qué alcance y qué se purgó (rutas y nombres
    //    de columna, nunca valores). El alcance hace falta para poder concluir «todas las reservas
    //    de más de 100 días están purgadas»: sin él, una fila no dice qué se llegó a revisar.
    let logged = false
    if (done.length > 0) {
      const { error } = await db.from('retention_purge_log').insert({
        ran_at: new Date().toISOString(),
        ran_by: auth.user.id,
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
        detail: done,
      })
      if (error) console.error('retention: no se pudo registrar la purga en retention_purge_log', error.message)
      else logged = true
    }

    console.info('[admin] purga de conservación ejecutada', {
      adminId: auth.user.id,
      today,
      files: summary.files,
      columns: summary.columns,
      bookings: summary.bookings,
      holders: summary.holders,
      truncated: candidates.truncated,
    })

    return NextResponse.json({
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
      sealed,
      logged,
      ...(done.length > 0 && !logged
        ? { logWarning: 'No se pudo escribir en retention_purge_log aunque sí se purgó: revísalo antes de volver a ejecutar.' }
        : {}),
      ...(stalledWarning ? { stalledWarning } : {}),
      ...(truncatedWarning ? { truncatedWarning } : {}),
      ...(folders.some(f => f.sealed === 'reviewed')
        ? { reviewedWarning: 'Alguna reserva queda marcada como REVISADA y no como purgada: su cuenta conserva la carpeta del titular por otra reserva viva, así que todavía pueden quedar imágenes del titular. Lo dice "sealed" de cada carpeta y el motivo "retained" en "holders".' }
        : {}),
    })
  } catch (error) {
    console.error('Retention purge error:', error)
    return NextResponse.json({ error: 'No se pudo ejecutar la purga de conservación' }, { status: 500 })
  }
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
): Promise<{ ready: boolean; verified: boolean; missing: string[]; error?: string }> {
  const missing: string[] = []

  const { data, error: witnessError } = await db.from('bookings').select('*').limit(1)
  // Un fallo real de la base no es «faltan columnas»: se propaga y la ruta responde 500
  if (witnessError) return { ready: false, verified: false, missing, error: witnessError.message }

  const witness = (Array.isArray(data) ? data : []).find((row: Row) => row && typeof row === 'object') || null
  if (witness) {
    for (const column of RETENTION_AUDIT_COLUMNS) {
      if (!(column in witness)) missing.push(`bookings.${column}`)
    }
  }

  const { error } = await db.from('retention_purge_log').select('id').limit(1)
  if (error) missing.push('la tabla retention_purge_log')

  return { ready: missing.length === 0, verified: !!witness, missing }
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

/** Tipo exportado solo para los tests del plan de purga */
export type { BookingRetentionPlan }
