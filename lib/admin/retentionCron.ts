import { createHash, timingSafeEqual } from 'node:crypto'
import { storagePaths } from '@/lib/booking/dataRetention'
import {
  RETENTION_DEFAULT_LIMIT,
  RETENTION_MIGRATION,
  runRetentionPass,
  type RetentionActor,
  type RetentionPassInput,
  type RetentionPassResult,
} from '@/lib/admin/retentionPass'

/**
 * TAREA SEMANAL DE CONSERVACIÓN: autenticación por secreto, modo y bucle de pasadas.
 *
 * Vercel llama a `GET /api/cron/retention/documents` según `vercel.json` y, si existe la variable
 * `CRON_SECRET`, añade `Authorization: Bearer <CRON_SECRET>`. Este módulo decide si esa cabecera es
 * válida, en qué modo corre la tarea y cuántas pasadas encadena. La purga en sí es
 * `runRetentionPass` (la misma que usa el botón del panel): aquí no se decide qué se borra.
 *
 * VARIABLES DE ENTORNO (nombres, nunca valores):
 *   CRON_SECRET              Obligatoria. Sin ella, o con menos de 16 caracteres, la tarea DENIEGA.
 *   RETENTION_CRON_CONFIRM   «true» (exacto) = la tarea BORRA. Cualquier otra cosa, o ausente =
 *                            SIMULA y deja el resultado registrado. Por defecto simula a propósito:
 *                            Javier quiere revisar las primeras semanas antes de dar permiso de
 *                            borrar (Storage no tiene papelera).
 *   SUPABASE_SERVICE_ROLE_KEY Válida, o la tarea responde 503: igual que la ruta del administrador.
 */

/** Longitud mínima del secreto: la que recomienda Vercel para CRON_SECRET */
export const CRON_MIN_SECRET_LENGTH = 16

/**
 * Tope de vueltas por ejecución. 10 pasadas x 50 reservas por plazo = 500 reservas por plazo en una
 * semana, más que de sobra para el ritmo real de la flota; lo que sobre sigue la semana siguiente.
 */
export const CRON_MAX_PASSES = 10

/**
 * Presupuesto de tiempo. La ruta declara `maxDuration = 60` s (el máximo que admiten todos los
 * planes de Vercel) y la tarea no empieza una pasada nueva si, sumando 1,5 veces lo que tardó la
 * más lenta hasta ahora, se pasaría de 45 s: deja 15 s de margen para registrar el resultado.
 */
export const CRON_TIME_BUDGET_MS = 45_000

/**
 * Cuándo corre, para mostrarlo en el panel. Es `vercel.json` ("0 3 * * 1"): lunes a las 03:00 UTC,
 * es decir las 04:00 en invierno y las 05:00 en verano en la España peninsular. Vercel Cron va en UTC
 * y no tiene zona horaria, así que se eligió una hora que es madrugada en las dos. En el plan Hobby
 * la hora exacta puede desviarse hasta 59 minutos. Un test comprueba que este texto y `vercel.json`
 * no se desvían.
 */
export const CRON_SCHEDULE_LABEL = 'Lunes de madrugada (03:00 UTC: 04:00 en invierno, 05:00 en verano, hora peninsular)'

/** Entradas de detalle que se guardan por ejecución (rutas y columnas, nunca valores) */
export const CRON_MAX_DETAIL_ENTRIES = 300
const CRON_MAX_STALLED = 200

type Env = Record<string, string | undefined>

/** El secreto configurado, o null si falta o es demasiado corto (en ese caso la tarea deniega) */
export function cronSecret(env: Env = process.env): string | null {
  const secret = (env.CRON_SECRET ?? '').trim()
  return secret.length >= CRON_MIN_SECRET_LENGTH ? secret : null
}

export function cronSecretConfigured(env: Env = process.env): boolean {
  return cronSecret(env) !== null
}

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest()

/**
 * ¿Trae la petición el secreto correcto?
 *
 * Se comparan los SHA-256 de ambos con `timingSafeEqual`: la comparación es de tiempo constante y
 * no depende de dónde difieren ni de la longitud del secreto que se prueba. Si `CRON_SECRET` no está
 * definido (o es corto) NUNCA se acepta: la ausencia de secreto no es una credencial vacía válida.
 */
export function isCronAuthorized(authorization: string | null | undefined, env: Env = process.env): boolean {
  const secret = cronSecret(env)
  if (!secret) return false
  if (typeof authorization !== 'string') return false
  const match = /^Bearer[ \t]+(.+)$/i.exec(authorization.trim())
  if (!match) return false
  return timingSafeEqual(digest(match[1].trim()), digest(secret))
}

/** ¿Está la tarea autorizada a BORRAR? Solo con RETENTION_CRON_CONFIRM exactamente «true» */
export function cronConfirmEnabled(env: Env = process.env): boolean {
  return (env.RETENTION_CRON_CONFIRM ?? '').trim() === 'true'
}

/* -------------------------------------------------------------------------- */
/* Bucle de pasadas                                                            */
/* -------------------------------------------------------------------------- */

export type CronStopReason =
  /** No quedan candidatas (`truncated` false) */
  | 'completa'
  /** Simulación: una sola pasada, porque simular no marca nada y repetir devolvería las mismas */
  | 'simulacion_acotada'
  /** Quedan candidatas, pero NINGUNA puede avanzar: hay que resolverlas a mano (`stalled`) */
  | 'solo_atascadas'
  | 'tope_vueltas'
  | 'tope_tiempo'
  /** Una pasada completa no marcó ni borró nada aunque decía poder avanzar: se para para no girar en vacío */
  | 'sin_avance'
  /** La pasada se negó (409): falta la constancia o la sonda de sello falló. No se borró nada */
  | 'bloqueada'
  | 'error'

export interface CronBlocked {
  code: 'schema_missing' | 'seal_probe_failed' | 'otro'
  status: number
  missing?: string[]
  bookingId?: string
}

export interface CronEntry {
  scope: string
  bookingId: string | null
  userId: string | null
  purgeDay: string
  items: string[]
}

export interface CronRunResult {
  mode: 'simulacion' | 'purga'
  /** Pasadas que llegaron a responder */
  passes: number
  stopReason: CronStopReason
  outcome: 'ok' | 'attention' | 'blocked' | 'error'
  durationMs: number
  totals: { reviewed: number; files: number; columns: number; bookings: number; holders: number; sealed: number }
  /** De la última pasada */
  truncated: boolean
  advanceable: number
  stalled: Array<{ bookingId: string | null; reason: string }>
  stalledTotal: number
  reviewedOnly: string[]
  warnings: string[]
  schemaMissing: string[]
  blocked?: CronBlocked
  /** Qué se borraría (simulación) o qué se borró (purga): rutas y nombres de columna */
  entries: CronEntry[]
  entriesTruncated: boolean
}

export interface CronRunOptions {
  confirm: boolean
  maxPasses?: number
  budgetMs?: number
  limit?: number
  now?: () => number
  /** Inyectable para los tests; en producción es `runRetentionPass` */
  pass?: (db: unknown, input: RetentionPassInput, actor: RetentionActor) => Promise<RetentionPassResult>
}

const CRON_ACTOR: RetentionActor = { id: null, via: 'cron' }

/**
 * Entradas de detalle de UNA pasada, con las mismas rutas que `retention_purge_log.detail`.
 *
 * Simulación: lo que se borraría (carpetas legibles con archivos, y columnas legales). Purga: solo lo
 * que de verdad se borró; el borrado de una carpeta va por tandas en orden y se detiene en la
 * primera que falla, así que lo borrado son las primeras `deleted` rutas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function entriesFromPass(body: Record<string, any>): CronEntry[] {
  const purged = body.mode === 'purga'
  const entries: CronEntry[] = []
  for (const folder of Array.isArray(body.folders) ? body.folders : []) {
    if (!folder || folder.unreadable || !Array.isArray(folder.files) || folder.files.length === 0) continue
    const paths = storagePaths(String(folder.folder), folder.files)
    const items = purged ? paths.slice(0, Number(folder.deleted) || 0) : paths
    if (items.length === 0) continue
    entries.push({ scope: folder.scope, bookingId: folder.bookingId ?? null, userId: folder.userId ?? null, purgeDay: folder.purgeDay, items })
  }
  for (const legal of Array.isArray(body.legal) ? body.legal : []) {
    if (!legal || !Array.isArray(legal.columns) || legal.columns.length === 0) continue
    if (purged && !legal.updated) continue
    entries.push({ scope: 'booking_legal_data', bookingId: legal.bookingId ?? null, userId: null, purgeDay: legal.purgeDay, items: legal.columns })
  }
  return entries
}

/**
 * Encadena pasadas hasta vaciar la cola, con tope de vueltas y de tiempo.
 *
 * «Repetir hasta que no quede nada» tiene que distinguir tres situaciones que `truncated` por sí
 * solo no distingue, o el bucle no termina:
 *   - quedan y AVANZARÁN  (`truncated` y `advanceable > 0`)  -> otra vuelta;
 *   - quedan y están BLOQUEADAS (`truncated` y `advanceable === 0`, las de `stalled`) -> se para:
 *     repetir devolvería siempre las mismas;
 *   - dicen poder avanzar pero la pasada no marcó ni borró nada -> se para (`sin_avance`).
 *
 * SIMULACIÓN: una sola pasada. Simular no marca nada, así que una segunda pasada devolvería
 * exactamente las mismas 50 candidatas y `truncated` seguiría en true para siempre.
 */
export async function runCronRetention(db: unknown, options: CronRunOptions): Promise<CronRunResult> {
  const now = options.now ?? Date.now
  const pass = options.pass ?? runRetentionPass
  const maxPasses = Math.max(1, options.maxPasses ?? CRON_MAX_PASSES)
  const budgetMs = options.budgetMs ?? CRON_TIME_BUDGET_MS
  const limit = options.limit ?? RETENTION_DEFAULT_LIMIT
  const mode = options.confirm ? 'purga' : 'simulacion'
  const startedAt = now()

  const totals = { reviewed: 0, files: 0, columns: 0, bookings: 0, holders: 0, sealed: 0 }
  const warnings = new Set<string>()
  const stalledMap = new Map<string, { bookingId: string | null; reason: string }>()
  const reviewedOnly = new Set<string>()
  const entries: CronEntry[] = []
  let entriesTruncated = false
  let schemaMissing: string[] = []
  let truncated = false
  let advanceable = 0
  let passes = 0
  let longest = 0
  let stopReason: CronStopReason | null = null
  let blocked: CronBlocked | undefined

  for (let i = 0; i < maxPasses; i++) {
    if (i > 0 && now() - startedAt + longest * 1.5 >= budgetMs) {
      stopReason = 'tope_tiempo'
      break
    }

    const passStart = now()
    let result: RetentionPassResult
    try {
      result = await pass(db, { confirm: options.confirm, bookingId: null, userId: null, limit }, CRON_ACTOR)
    } catch (error) {
      // El detalle va al log del servidor; lo que se registra y se devuelve es genérico
      console.error('retention cron: la pasada ha fallado', error)
      stopReason = 'error'
      break
    }
    longest = Math.max(longest, now() - passStart)

    const body = result.body ?? {}
    if (result.status !== 200) {
      stopReason = 'bloqueada'
      const missing = Array.isArray(body.missing) ? body.missing.map(String) : undefined
      blocked = {
        code: missing ? 'schema_missing' : body.sealProbe === 'failed' ? 'seal_probe_failed' : 'otro',
        status: result.status,
        ...(missing ? { missing } : {}),
        ...(typeof body.sealProbeBookingId === 'string' ? { bookingId: body.sealProbeBookingId } : {}),
      }
      if (missing) schemaMissing = missing
      break
    }

    passes++
    const summary = body.summary ?? {}
    totals.reviewed += Number(body.reviewed) || 0
    totals.files += Number(summary.files) || 0
    totals.columns += Number(summary.columns) || 0
    totals.bookings += Number(summary.bookings) || 0
    totals.holders += Number(summary.holders) || 0
    totals.sealed += Number(body.sealed) || 0
    truncated = body.truncated === true
    advanceable = Number(body.advanceable) || 0
    if (Array.isArray(body.schema?.missing) && body.schema.missing.length > 0) schemaMissing = body.schema.missing.map(String)

    for (const s of Array.isArray(body.stalled) ? body.stalled : []) {
      const key = `${s?.bookingId ?? ''}:${s?.reason ?? ''}`
      if (!stalledMap.has(key)) stalledMap.set(key, { bookingId: s?.bookingId ?? null, reason: String(s?.reason ?? '') })
    }
    for (const id of Array.isArray(body.reviewedOnly) ? body.reviewedOnly : []) reviewedOnly.add(String(id))
    for (const key of ['stalledWarning', 'sealWarning', 'logWarning', 'reviewedWarning'] as const) {
      if (typeof body[key] === 'string') warnings.add(body[key])
    }

    for (const entry of entriesFromPass(body)) {
      if (entries.length >= CRON_MAX_DETAIL_ENTRIES) { entriesTruncated = true; break }
      entries.push(entry)
    }

    if (!truncated) { stopReason = 'completa'; break }
    if (!options.confirm) { stopReason = 'simulacion_acotada'; break }
    if (advanceable <= 0) { stopReason = 'solo_atascadas'; break }
    const progress = (Number(body.sealed) || 0) + (Number(summary.files) || 0) + (Number(summary.columns) || 0)
      + (Array.isArray(body.closedByHolder) ? body.closedByHolder.length : 0)
    if (progress === 0) { stopReason = 'sin_avance'; break }
  }
  if (stopReason === null) stopReason = 'tope_vueltas'

  if (schemaMissing.length > 0) {
    warnings.add(`Falta ${schemaMissing.join(', ')} en la base: sin ello la tarea no puede borrar. Aplica antes ${RETENTION_MIGRATION}.`)
  }
  if (stopReason === 'simulacion_acotada') {
    warnings.add('Simulación acotada: hay más candidatas de las que caben en una pasada. El resto se verá cuando las primeras se purguen.')
  } else if (stopReason === 'tope_vueltas') {
    warnings.add(`La tarea se detuvo tras ${passes} pasadas con candidatas pendientes: la próxima ejecución continúa.`)
  } else if (stopReason === 'tope_tiempo') {
    warnings.add('La tarea se detuvo por el límite de tiempo con candidatas pendientes: la próxima ejecución continúa.')
  } else if (stopReason === 'sin_avance') {
    warnings.add('Una pasada completa no pudo marcar ni borrar nada aunque quedaban candidatas: revisa las advertencias y el registro de purgas.')
  } else if (stopReason === 'solo_atascadas') {
    warnings.add('Quedan candidatas pero ninguna puede avanzar sola: hay que resolver a mano las atascadas.')
  }

  const stalledAll = [...stalledMap.values()]
  const outcome: CronRunResult['outcome'] =
    stopReason === 'error' ? 'error'
      : stopReason === 'bloqueada' ? 'blocked'
        : warnings.size > 0 || stalledAll.length > 0 ? 'attention'
          : 'ok'

  return {
    mode,
    passes,
    stopReason,
    outcome,
    durationMs: Math.max(0, now() - startedAt),
    totals,
    truncated,
    advanceable,
    stalled: stalledAll.slice(0, CRON_MAX_STALLED),
    stalledTotal: stalledAll.length,
    reviewedOnly: [...reviewedOnly],
    warnings: [...warnings],
    schemaMissing,
    ...(blocked ? { blocked } : {}),
    entries,
    entriesTruncated,
  }
}

/* -------------------------------------------------------------------------- */
/* Registro de cada ejecución                                                  */
/* -------------------------------------------------------------------------- */

/** Fila de `retention_cron_runs` (supabase/migrations/20261115_retention_cron_runs.sql) */
export function cronRunRow(result: CronRunResult, ranAt: Date): Record<string, unknown> {
  return {
    ran_at: ranAt.toISOString(),
    mode: result.mode,
    outcome: result.outcome,
    stop_reason: result.stopReason,
    passes: result.passes,
    duration_ms: result.durationMs,
    candidates_reviewed: result.totals.reviewed,
    truncated: result.truncated,
    advanceable: result.advanceable,
    files_count: result.totals.files,
    columns_count: result.totals.columns,
    bookings_count: result.totals.bookings,
    holders_count: result.totals.holders,
    bookings_sealed: result.totals.sealed,
    stalled_count: result.stalledTotal,
    stalled: result.stalled,
    reviewed_only: result.reviewedOnly,
    warnings: result.warnings,
    blocked: result.blocked ?? null,
    detail: result.entries,
    detail_truncated: result.entriesTruncated,
  }
}

/**
 * Guarda el resultado para poder leerlo después, no solo en los logs. Si la tabla no existe todavía
 * (la migración 20261115 está PREPARADA, SIN APLICAR) o la escritura falla, NO se hace fallar la
 * tarea: la purga ya ocurrió y su constancia legal es `retention_purge_log`. Se devuelve `false` y
 * el llamador lo deja en el log del servidor y en la respuesta.
 */
export async function recordCronRun(db: unknown, result: CronRunResult, ranAt: Date): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any).from('retention_cron_runs').insert(cronRunRow(result, ranAt))
    if (error) {
      console.error('retention cron: no se pudo registrar la ejecución en retention_cron_runs', error.code, error.message)
      return false
    }
    return true
  } catch (error) {
    console.error('retention cron: no se pudo registrar la ejecución', error)
    return false
  }
}
