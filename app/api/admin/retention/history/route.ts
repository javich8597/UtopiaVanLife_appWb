import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/requireAdmin'
import { UUID_RE } from '@/lib/admin/retentionPass'
import { CRON_SCHEDULE_LABEL, cronConfirmEnabled, cronSecretConfigured } from '@/lib/admin/retentionCron'

/**
 * Historial de la conservación para la pantalla /admin/conservacion. Solo lectura.
 *
 *   GET /api/admin/retention/history              -> estado de la tarea + últimas purgas y ejecuciones
 *   GET /api/admin/retention/history?kind=purge&id=<uuid>   -> el detalle (rutas) de una purga
 *   GET /api/admin/retention/history?kind=cron&id=<uuid>    -> el detalle de una ejecución de la tarea
 *
 * Exige administrador (`requireAdmin`). Las tablas las crean migraciones PREPARADAS, SIN APLICAR
 * (20261110 y 20261115): si no existen no es un error de la pantalla, es información, y se devuelve
 * `missing`. El detalle son rutas de Storage y nombres de columna, nunca valores de datos personales.
 * Nunca se devuelve `error.message`: el detalle va al log del servidor.
 */

const PURGE_COLUMNS =
  'id, ran_at, ran_by, policy_day, scope_booking_id, scope_user_id, scope_limit, scope_truncated, candidates_reviewed, holder_folders_included, files_deleted, columns_cleared, bookings_affected, holders_affected, bookings_sealed, candidates_stalled, seal_failed, closed_by_holder'
const CRON_COLUMNS =
  'id, ran_at, mode, outcome, stop_reason, passes, duration_ms, candidates_reviewed, truncated, advanceable, files_count, columns_count, bookings_count, holders_count, bookings_sealed, stalled_count, stalled, reviewed_only, warnings, blocked, detail_truncated'

const HISTORY_LIMIT = 20

type Row = Record<string, unknown>
type Section = { status: 'ok' | 'missing' | 'error'; rows: Row[] }

/** PGRST205: tabla fuera de la caché del esquema · 42P01: la tabla no existe */
const isMissingTable = (error: { code?: string } | null) => error?.code === 'PGRST205' || error?.code === '42P01'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readSection(db: any, table: string, columns: string): Promise<Section> {
  const { data, error } = await db.from(table).select(columns).order('ran_at', { ascending: false }).limit(HISTORY_LIMIT)
  if (error) {
    console.error(`retention history: no se pudo leer ${table}`, error.code, error.message)
    return { status: isMissingTable(error) ? 'missing' : 'error', rows: [] }
  }
  return { status: 'ok', rows: Array.isArray(data) ? data : [] }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    const db = auth.db

    const params = new URL(request.url).searchParams
    const kind = params.get('kind')
    if (kind) {
      const id = params.get('id') || ''
      if ((kind !== 'purge' && kind !== 'cron') || !UUID_RE.test(id)) {
        return NextResponse.json({ error: 'Petición no válida' }, { status: 400 })
      }
      const table = kind === 'purge' ? 'retention_purge_log' : 'retention_cron_runs'
      const { data, error } = await db.from(table).select('id, detail').eq('id', id).maybeSingle()
      if (error) {
        console.error('retention history: no se pudo leer el detalle', table, error.code, error.message)
        return NextResponse.json({ error: 'No se pudo leer el detalle' }, { status: 500 })
      }
      if (!data) return NextResponse.json({ error: 'No existe' }, { status: 404 })
      return NextResponse.json({ id: data.id, detail: Array.isArray(data.detail) ? data.detail : [] })
    }

    const [purges, cronRuns] = await Promise.all([
      readSection(db, 'retention_purge_log', PURGE_COLUMNS),
      readSection(db, 'retention_cron_runs', CRON_COLUMNS),
    ])

    // Nombre de quien lanzó cada purga a mano. `ran_by` NULL = la tarea programada
    const adminIds = [...new Set(purges.rows.map(r => r.ran_by).filter((id): id is string => typeof id === 'string'))]
    const admins: Record<string, string> = {}
    if (adminIds.length > 0) {
      const { data } = await db.from('users').select('id, full_name').in('id', adminIds)
      for (const user of Array.isArray(data) ? data : []) {
        if (typeof user.id === 'string' && typeof user.full_name === 'string' && user.full_name) admins[user.id] = user.full_name
      }
    }

    return NextResponse.json({
      task: {
        schedule: CRON_SCHEDULE_LABEL,
        secretConfigured: cronSecretConfigured(),
        mode: cronConfirmEnabled() ? 'purga' : 'simulacion',
      },
      purges,
      cronRuns,
      admins,
    })
  } catch (error) {
    console.error('retention history error:', error)
    return NextResponse.json({ error: 'No se pudo leer el historial' }, { status: 500 })
  }
}
