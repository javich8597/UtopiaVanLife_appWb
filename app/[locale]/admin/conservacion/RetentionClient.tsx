'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, FileText, FolderOpen, Info, Loader2,
  RefreshCw, ShieldAlert, Target, Trash2, UserRound, X,
} from 'lucide-react'
import { useBodyScrollLock } from '@/lib/ui/useBodyScrollLock'
import AdminStatTiles from '../AdminStatTiles'
import {
  CRON_OUTCOME,
  CRON_STOP_REASON,
  PURGE_CONFIRM_WORD,
  SCOPE_LABEL,
  canOfferPurge,
  fileName,
  isPurgeConfirmText,
  parseScopeField,
  stalledReasonText,
  type RetentionApiError,
  type RetentionFolder,
  type RetentionReport,
} from '@/lib/admin/retentionView'

/* -------------------------------------------------------------------------- */
/* Llamadas a la API                                                           */
/* -------------------------------------------------------------------------- */

interface ApiResult<T> {
  ok: boolean
  status: number
  data: T | null
}

async function api<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init)
    const data = (await res.json().catch(() => null)) as T | null
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

/** El mensaje de la API se enseña tal cual; sin él, uno genérico según el código */
function apiErrorMessage(result: ApiResult<unknown>): string {
  const body = result.data as Partial<RetentionApiError> | null
  if (body && typeof body.error === 'string' && body.error) return body.error
  if (result.status === 0) return 'No se pudo conectar con el servidor. No se sabe si la operación llegó a hacerse: comprueba el historial antes de repetirla.'
  if (result.status === 401 || result.status === 403) return 'Tu sesión no tiene permiso para esto. Vuelve a entrar como administrador.'
  return `El servidor respondió con un error (${result.status}).`
}

/* -------------------------------------------------------------------------- */
/* Historial                                                                   */
/* -------------------------------------------------------------------------- */

interface PurgeRow {
  id: string
  ran_at: string
  ran_by: string | null
  policy_day: string | null
  scope_booking_id: string | null
  scope_user_id: string | null
  scope_limit: number | null
  scope_truncated: boolean
  candidates_reviewed: number
  holder_folders_included: boolean
  files_deleted: number
  columns_cleared: number
  bookings_affected: number
  holders_affected: number
  bookings_sealed: number
  candidates_stalled: number
  seal_failed: string[]
  closed_by_holder: string[]
}

interface CronRow {
  id: string
  ran_at: string
  mode: 'simulacion' | 'purga'
  outcome: 'ok' | 'attention' | 'blocked' | 'error'
  stop_reason: string
  passes: number
  duration_ms: number
  candidates_reviewed: number
  truncated: boolean
  advanceable: number
  files_count: number
  columns_count: number
  bookings_count: number
  holders_count: number
  bookings_sealed: number
  stalled_count: number
  stalled: Array<{ bookingId: string | null; reason: string }>
  reviewed_only: string[]
  warnings: string[]
  blocked: { code: string; status: number; missing?: string[]; bookingId?: string } | null
  detail_truncated: boolean
}

interface Section<T> {
  status: 'ok' | 'missing' | 'error'
  rows: T[]
}

interface History {
  task: { schedule: string; secretConfigured: boolean; mode: 'simulacion' | 'purga' }
  purges: Section<PurgeRow>
  cronRuns: Section<CronRow>
  admins: Record<string, string>
}

interface DetailEntry {
  scope: string
  bookingId: string | null
  userId: string | null
  purgeDay: string
  items: string[]
}

type DetailState = { loading: boolean; entries?: DetailEntry[]; error?: string }

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

const formatTime = (date: Date) =>
  date.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' })

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/* -------------------------------------------------------------------------- */
/* Pantalla                                                                    */
/* -------------------------------------------------------------------------- */

export default function RetentionClient() {
  // Alcance: vacío = toda la base. Con una reserva concreta es la «ejecución dirigida»
  const [bookingField, setBookingField] = useState('')
  const [userField, setUserField] = useState('')
  const [scopeError, setScopeError] = useState('')

  const [sim, setSim] = useState<RetentionReport | null>(null)
  const [simAt, setSimAt] = useState<Date | null>(null)
  const [simError, setSimError] = useState('')
  const [simLoading, setSimLoading] = useState(true)
  const simRequest = useRef(0)

  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<RetentionReport | null>(null)
  const [purgeError, setPurgeError] = useState('')
  const [modalStep, setModalStep] = useState<0 | 1 | 2>(0)
  const [confirmText, setConfirmText] = useState('')

  const [history, setHistory] = useState<History | null>(null)
  const [historyError, setHistoryError] = useState('')
  const [historyLoading, setHistoryLoading] = useState(true)
  const [tab, setTab] = useState<'cron' | 'purges'>('cron')
  const [details, setDetails] = useState<Record<string, DetailState>>({})

  useBodyScrollLock(modalStep !== 0)

  /** Simula. NUNCA borra: es la vista por defecto y se lanza sola al entrar */
  const runSimulation = useCallback(async (override?: { bookingId: string; userId: string }) => {
    const bookingText = override ? override.bookingId : bookingField
    const userText = override ? override.userId : userField
    const booking = parseScopeField(bookingText)
    const user = parseScopeField(userText)
    if (!booking.ok || !user.ok) {
      setScopeError('El identificador no es válido: tiene que ser un UUID completo, como 3f2a9c1e-5b7d-4e2a-9c61-0a1b2c3d4e5f. Déjalo vacío para revisar todas las reservas.')
      return
    }
    setScopeError('')
    const request = ++simRequest.current
    setSimLoading(true)
    setSimError('')
    const result = await api<RetentionReport>('/api/admin/retention/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(booking.value ? { bookingId: booking.value } : {}),
        ...(user.value ? { userId: user.value } : {}),
      }),
    })
    // Una simulación más reciente ya está en marcha: esta respuesta ya no vale
    if (request !== simRequest.current) return
    if (result.ok && result.data?.mode === 'simulacion') {
      setSim(result.data)
      setSimAt(new Date())
    } else {
      setSim(null)
      setSimError(apiErrorMessage(result))
    }
    setSimLoading(false)
  }, [bookingField, userField])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError('')
    const result = await api<History>('/api/admin/retention/history')
    if (result.ok && result.data) setHistory(result.data)
    else setHistoryError(apiErrorMessage(result))
    setHistoryLoading(false)
  }, [])

  useEffect(() => {
    // Al entrar: simulación (solo lectura) e historial. Nada se borra sin pasar por el modal
    void runSimulation()
    void loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lo que se borra es el alcance de la simulación revisada: si los campos ya no coinciden con él,
  // hay que volver a simular antes de ofrecer el borrado
  const fieldBooking = parseScopeField(bookingField)
  const fieldUser = parseScopeField(userField)
  const scopeDirty = !!sim && (
    !fieldBooking.ok || !fieldUser.ok ||
    fieldBooking.value !== sim.scope.bookingId || fieldUser.value !== sim.scope.userId
  )
  const offer = scopeDirty
    ? { ok: false, reason: 'Has cambiado el alcance: vuelve a simular antes de borrar.' }
    : canOfferPurge(sim, simLoading || purging)

  const closeModal = () => {
    if (purging) return
    setModalStep(0)
    setConfirmText('')
  }

  useEffect(() => {
    if (modalStep === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !purging) {
        setModalStep(0)
        setConfirmText('')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modalStep, purging])

  /** Borra de verdad. Solo desde el segundo paso del modal, con el alcance de la simulación revisada */
  const executePurge = async () => {
    if (!sim || !offer.ok || !isPurgeConfirmText(confirmText) || purging) return
    setPurging(true)
    setPurgeError('')
    setPurgeResult(null)
    const result = await api<RetentionReport>('/api/admin/retention/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirm: true,
        ...(sim.scope.bookingId ? { bookingId: sim.scope.bookingId } : {}),
        ...(sim.scope.userId ? { userId: sim.scope.userId } : {}),
      }),
    })
    setPurging(false)
    setModalStep(0)
    setConfirmText('')
    // Un fallo (409 incluido) se enseña con el mensaje de la API y NUNCA se da por hecha la purga
    if (result.ok && result.data?.mode === 'purga') setPurgeResult(result.data)
    else setPurgeError(apiErrorMessage(result))
    // Contadores y lista al día con lo que ha pasado de verdad
    await Promise.all([
      runSimulation({ bookingId: sim.scope.bookingId ?? '', userId: sim.scope.userId ?? '' }),
      loadHistory(),
    ])
  }

  const loadDetail = async (kind: 'purge' | 'cron', id: string) => {
    const key = `${kind}:${id}`
    if (details[key]?.entries || details[key]?.loading) return
    setDetails(prev => ({ ...prev, [key]: { loading: true } }))
    const result = await api<{ detail: DetailEntry[] }>(`/api/admin/retention/history?kind=${kind}&id=${id}`)
    setDetails(prev => ({
      ...prev,
      [key]: result.ok && result.data
        ? { loading: false, entries: result.data.detail }
        : { loading: false, error: apiErrorMessage(result) },
    }))
  }

  const pointAt = (folder: RetentionFolder) => {
    if (!folder.bookingId) return
    setBookingField(folder.bookingId)
    setUserField('')
    void runSimulation({ bookingId: folder.bookingId, userId: '' })
  }

  const clearScope = () => {
    setBookingField('')
    setUserField('')
    setScopeError('')
    void runSimulation({ bookingId: '', userId: '' })
  }

  const targeted = !!(sim?.scope.bookingId || sim?.scope.userId)
  const folderCount = sim ? sim.folders.filter(f => f.files.length > 0 || f.unknown > 0 || f.unreadable).length : 0

  return (
    <div className="ret">
      <div className="adm-note ret-intro">
        <Info size={18} aria-hidden="true" />
        <div className="adm-note__text">
          Aquí se ve y se lanza la purga de la documentación de identidad: las fotos de DNI, pasaporte y carnet se borran de
          Storage a los <strong>100 días</strong> de la devolución, y los datos del registro de viajeros se vacían a los <strong>3 años</strong>.
          Primero se <strong>simula</strong> (no toca nada) y el borrado se confirma en dos pasos. <strong>Es irreversible:
          Storage no tiene papelera.</strong>
        </div>
      </div>

      {/* ---------------- Tarea semanal ---------------- */}
      <section className="adm-card" aria-labelledby="ret-task-title">
        <div className="adm-card-head adm-card-head--line">
          <h2 className="adm-card-title" id="ret-task-title">
            <span className="adm-icon-square adm-icon-square--soft"><CalendarClock size={18} /></span>
            Tarea semanal
          </h2>
          {history && (
            <span className={`adm-chip ${history.task.mode === 'purga' ? 'adm-chip--rose' : 'adm-chip--sage'}`}>
              {history.task.mode === 'purga' ? 'Borra al ejecutarse' : 'Solo simula'}
            </span>
          )}
        </div>
        <div className="ret-body">
          {historyLoading && !history && <p className="ret-muted"><Loader2 size={15} className="ret-spin" /> Cargando el estado de la tarea…</p>}
          {historyError && !history && (
            <div className="adm-note adm-note--alert" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <div className="adm-note__text">{historyError}</div>
            </div>
          )}
          {history && (
            <>
              <p className="ret-line">
                <strong>Cuándo:</strong> {history.task.schedule}.
              </p>
              <p className="ret-line">
                <strong>Qué hace:</strong>{' '}
                {history.task.mode === 'purga'
                  ? 'tiene permiso de borrar: cada lunes repite pasadas hasta vaciar la cola (con tope de vueltas y de tiempo) y deja el resultado en el historial.'
                  : 'solo simula: cada lunes mira qué habría que borrar y lo deja en el historial, sin tocar nada. Cuando hayas revisado varias semanas, puedes darle permiso de borrar.'}
              </p>
              <p className="ret-line ret-muted">
                Para cambiar el modo: en Vercel, Settings, Environment Variables, define <code>RETENTION_CRON_CONFIRM=true</code> en
                Production y vuelve a desplegar. Para volver a simular, bórrala y vuelve a desplegar. El modo de cada ejecución queda
                escrito en el historial.
              </p>
              {!history.task.secretConfigured && (
                <div className="adm-note adm-note--alert" role="alert">
                  <ShieldAlert size={18} aria-hidden="true" />
                  <div className="adm-note__text">
                    <strong>La tarea no se ejecutará:</strong> <code>CRON_SECRET</code> no está definido (o tiene menos de 16 caracteres) en este
                    entorno y la tarea rechaza toda petición sin él. Defínelo en Vercel y vuelve a desplegar.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ---------------- Resultado de un borrado ---------------- */}
      {purgeError && (
        <div className="adm-note adm-note--alert ret-block" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div className="adm-note__text">
            <strong>El borrado no se ha completado.</strong> No des por hecho que se haya borrado algo: mira el historial y la simulación de abajo.
            <p className="ret-quote">{purgeError}</p>
          </div>
        </div>
      )}

      {purgeResult && (
        <section className="adm-card" aria-labelledby="ret-result-title">
          <div className="adm-card-head adm-card-head--line">
            <h2 className="adm-card-title" id="ret-result-title">
              <span className="adm-icon-square adm-icon-square--rose"><Trash2 size={18} /></span>
              Resultado del borrado
            </h2>
            <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setPurgeResult(null)}>
              <X size={15} /> Cerrar
            </button>
          </div>
          <div className="ret-body">
            <p className="ret-line">
              Se han borrado <strong>{plural(purgeResult.summary.files, 'archivo', 'archivos')}</strong> y vaciado{' '}
              <strong>{plural(purgeResult.summary.columns, 'columna', 'columnas')}</strong> de datos del registro de viajeros, en{' '}
              {plural(purgeResult.summary.bookings, 'reserva', 'reservas')} y {plural(purgeResult.summary.holders, 'cuenta de titular', 'cuentas de titular')}.
              Reservas con constancia: <strong>{purgeResult.sealed ?? 0}</strong>. Prueba de sello: {purgeResult.sealProbe === 'ok' ? 'correcta' : purgeResult.sealProbe === 'skipped' ? 'no hizo falta' : 'fallida'}.
              Registrada en el historial de purgas: <strong>{purgeResult.logged ? 'sí' : 'NO'}</strong>.
            </p>
            {purgeResult.logWarning && <div className="adm-note adm-note--alert" role="alert"><AlertTriangle size={18} aria-hidden="true" /><div className="adm-note__text">{purgeResult.logWarning}</div></div>}
            {purgeResult.sealWarning && <div className="adm-note adm-note--alert" role="alert"><AlertTriangle size={18} aria-hidden="true" /><div className="adm-note__text">{purgeResult.sealWarning}</div></div>}
            {purgeResult.stalledWarning && <div className="adm-note ret-warn" role="status"><AlertTriangle size={18} aria-hidden="true" /><div className="adm-note__text">{purgeResult.stalledWarning}</div></div>}
            {purgeResult.truncatedWarning && <div className="adm-note ret-warn" role="status"><AlertTriangle size={18} aria-hidden="true" /><div className="adm-note__text">{purgeResult.truncatedWarning}</div></div>}
            {purgeResult.sealFailed && purgeResult.sealFailed.length > 0 && (
              <div>
                <p className="ret-line"><strong>Sin constancia en su fila</strong> (se borraron archivos y no consta; volverán a salir como candidatas):</p>
                <ul className="ret-ids">
                  {purgeResult.sealFailed.map(id => <li key={id}><code>{id}</code></li>)}
                </ul>
              </div>
            )}
            {purgeResult.closedByHolder && purgeResult.closedByHolder.length > 0 && (
              <p className="ret-line ret-muted">
                Marca de «purgada» cerrada en {plural(purgeResult.closedByHolder.length, 'reserva ya revisada', 'reservas ya revisadas')}:
                se ha borrado la carpeta de su cuenta.
              </p>
            )}
            {purgeResult.reviewedOnly && purgeResult.reviewedOnly.length > 0 && (
              <div>
                <h3 className="ret-subtitle">Revisadas sin purgar ({purgeResult.reviewedOnly.length})</h3>
                {purgeResult.reviewedWarning && <p className="ret-line ret-muted">{purgeResult.reviewedWarning}</p>}
                <ul className="ret-ids">
                  {purgeResult.reviewedOnly.map(id => <li key={id}><code>{id}</code></li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------------- Simulación ---------------- */}
      <section className="adm-card" aria-labelledby="ret-sim-title" aria-busy={simLoading}>
        <div className="adm-card-head adm-card-head--line">
          <h2 className="adm-card-title" id="ret-sim-title">
            <span className="adm-icon-square adm-icon-square--gold"><FolderOpen size={18} /></span>
            Simulación
            <span className="adm-chip adm-chip--sage">No se borra nada</span>
          </h2>
          <div className="ret-head-actions">
            {simAt && !simLoading && <span className="ret-muted">Simulado a las {formatTime(simAt)}</span>}
            <button type="button" className="adm-btn adm-btn--sm" onClick={() => void runSimulation()} disabled={simLoading || purging}>
              {simLoading ? <Loader2 size={15} className="ret-spin" /> : <RefreshCw size={15} />}
              Volver a simular
            </button>
          </div>
        </div>

        <div className="ret-body">
          {/* Alcance */}
          <div className="ret-scope" role="group" aria-labelledby="ret-scope-title">
            <p className="ret-scope__legend" id="ret-scope-title"><Target size={14} aria-hidden="true" /> Alcance (opcional)</p>
            <label className="ret-field">
              <span className="ret-field__label">Solo esta reserva (id)</span>
              <input
                className="adm-input"
                value={bookingField}
                onChange={e => setBookingField(e.target.value)}
                placeholder="Vacío = todas las reservas vencidas"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <label className="ret-field">
              <span className="ret-field__label">Incluir carpeta de esta cuenta (id de cliente)</span>
              <input
                className="adm-input"
                value={userField}
                onChange={e => setUserField(e.target.value)}
                placeholder="Vacío = no se toca la carpeta del titular"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <div className="ret-scope__actions">
              <button type="button" className="adm-btn adm-btn--sm" onClick={() => void runSimulation()} disabled={simLoading || purging}>
                Simular con este alcance
              </button>
              {(targeted || bookingField || userField) && (
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={clearScope} disabled={simLoading || purging}>
                  Quitar alcance
                </button>
              )}
            </div>
            {scopeError && <p className="ret-error" role="alert">{scopeError}</p>}
          </div>

          {simLoading && !sim && <p className="ret-muted"><Loader2 size={15} className="ret-spin" /> Simulando: leyendo reservas y carpetas de Storage…</p>}

          {simError && (
            <div className="adm-note adm-note--alert" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <div className="adm-note__text">
                <strong>No se ha podido simular.</strong>
                <p className="ret-quote">{simError}</p>
              </div>
            </div>
          )}

          {sim && (
            <>
              <p className="ret-line ret-muted">
                Plazos vigentes: imágenes {sim.policy.imageRetentionDays} días tras la devolución · datos del registro de viajeros{' '}
                {sim.policy.legalRetentionYears} años. Hoy es {sim.policy.today}.
                {targeted && <> Alcance activo: {sim.scope.bookingId ? 'una reserva' : 'un cliente'}.</>}
              </p>

              {/* Avisos de la respuesta, tal cual */}
              {sim.schema.missing.length > 0 && (
                <div className="adm-note adm-note--alert" role="alert">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <div className="adm-note__text">
                    <strong>Falta la constancia en la base: no se puede borrar.</strong>
                    {sim.hint && <p className="ret-quote">{sim.hint}</p>}
                    <p className="ret-line">Pendiente: {sim.schema.missing.join(', ')}.</p>
                  </div>
                </div>
              )}
              {!sim.schema.verified && sim.schema.missing.length === 0 && (
                <div className="adm-note ret-warn" role="status">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <div className="adm-note__text">La base no tiene ninguna reserva: no se ha podido comprobar que existan las columnas de constancia.</div>
                </div>
              )}
              {sim.truncatedWarning && <div className="adm-note ret-warn" role="status"><AlertTriangle size={18} aria-hidden="true" /><div className="adm-note__text">{sim.truncatedWarning}</div></div>}
              {sim.stalledWarning && <div className="adm-note ret-warn" role="status"><AlertTriangle size={18} aria-hidden="true" /><div className="adm-note__text">{sim.stalledWarning}</div></div>}
              {sim.policy.holderFoldersExcluded && <div className="adm-note" role="status"><Info size={18} aria-hidden="true" /><div className="adm-note__text">{sim.policy.holderFoldersExcluded}</div></div>}

              <AdminStatTiles
                label="Resumen de la simulación"
                tiles={[
                  { key: 'files', label: 'Archivos que se borrarían', value: sim.summary.files, tone: sim.summary.files > 0 ? 'rose' : 'neutral', icon: FileText },
                  { key: 'columns', label: 'Columnas de datos a vaciar', value: sim.summary.columns, tone: sim.summary.columns > 0 ? 'rose' : 'neutral', icon: FileText },
                  { key: 'bookings', label: 'Reservas afectadas', value: sim.summary.bookings, tone: 'gold', icon: FolderOpen },
                  { key: 'holders', label: 'Cuentas de titular', value: sim.summary.holders, tone: 'sky', icon: UserRound },
                ]}
              />
              <p className="ret-line ret-muted">
                Reservas revisadas en esta simulación: {sim.reviewed}{sim.truncated ? ' (hay más; se ven por tandas de ' + sim.scope.limit + ' por plazo)' : ''}.
              </p>

              {folderCount === 0 && sim.legal.length === 0 && (
                <div className="adm-empty">
                  <CheckCircle2 size={22} aria-hidden="true" />
                  <p>No hay nada que borrar ahora mismo.</p>
                </div>
              )}

              {folderCount > 0 && (
                <div className="adm-table-wrap">
                  <table className="adm-table adm-table--cards">
                    <caption className="ret-sr">Carpetas de Storage que se borrarían</caption>
                    <thead>
                      <tr>
                        <th scope="col">Qué</th>
                        <th scope="col">Reserva / cuenta</th>
                        <th scope="col">Se borra desde</th>
                        <th scope="col" className="adm-table__num">Cantidad</th>
                        <th scope="col">Archivos</th>
                        <th scope="col"><span className="ret-sr">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.folders.filter(f => f.files.length > 0 || f.unknown > 0 || f.unreadable).map(folder => (
                        <tr key={`${folder.scope}:${folder.folder}`}>
                          <td data-label="Qué"><span className="adm-table__strong">{SCOPE_LABEL[folder.scope]}</span></td>
                          <td data-label="Reserva / cuenta">
                            {folder.bookingId ? <code className="ret-id">{folder.bookingId}</code> : <span className="adm-table__muted">Cuenta</span>}
                            <code className="ret-id ret-id--muted">{folder.userId}</code>
                          </td>
                          <td data-label="Se borra desde">{folder.purgeDay}</td>
                          <td data-label="Nº de archivos" className="adm-table__num">{folder.files.length}</td>
                          <td data-label="Archivos">
                            {folder.unreadable ? (
                              <span className="adm-chip adm-chip--rose">No se pudo leer: no se borra nada</span>
                            ) : (
                              <details className="ret-files">
                                <summary>{plural(folder.files.length, 'archivo', 'archivos')}</summary>
                                <ul>{folder.files.map(name => <li key={name}><code>{fileName(name)}</code></li>)}</ul>
                              </details>
                            )}
                            {folder.unknown > 0 && (
                              <span className="adm-table__muted">
                                {plural(folder.unknown, 'archivo no reconocido', 'archivos no reconocidos')}
                                {folder.unknownExtensions.length > 0 ? ` (${folder.unknownExtensions.join(', ')})` : ''}: no se tocan.
                              </span>
                            )}
                            {folder.error && <span className="ret-error">{folder.error}</span>}
                          </td>
                          <td className="adm-table__actions">
                            {folder.bookingId && (
                              <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => pointAt(folder)} disabled={simLoading || purging}>
                                Dirigir a esta
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sim.legal.length > 0 && (
                <div className="adm-table-wrap">
                  <table className="adm-table adm-table--cards">
                    <caption className="ret-sr">Datos del registro de viajeros que se vaciarían</caption>
                    <thead>
                      <tr>
                        <th scope="col">Qué</th>
                        <th scope="col">Reserva</th>
                        <th scope="col">Se vacía desde</th>
                        <th scope="col">Columnas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.legal.map(item => (
                        <tr key={item.bookingId}>
                          <td data-label="Qué"><span className="adm-table__strong">{SCOPE_LABEL.booking_legal_data}</span></td>
                          <td data-label="Reserva"><code className="ret-id">{item.bookingId}</code></td>
                          <td data-label="Se vacía desde">{item.purgeDay}</td>
                          <td data-label="Columnas">{item.columns.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sim.policy.notPurged && sim.policy.notPurged.length > 0 && (
                <p className="ret-line ret-muted">
                  No entran en esta purga: {sim.policy.notPurged.join(', ')}. {sim.policy.note}
                </p>
              )}
            </>
          )}

          {/* El borrado: nunca un interruptor */}
          <div className="ret-purge">
            <button type="button" className="ret-btn-danger" onClick={() => setModalStep(1)} disabled={!offer.ok}>
              <Trash2 size={16} aria-hidden="true" /> Borrar definitivamente…
            </button>
            {offer.reason && <p className="ret-muted">{offer.reason}</p>}
          </div>
        </div>
      </section>

      {/* ---------------- Atascadas ---------------- */}
      {sim && sim.stalled.length > 0 && (
        <section className="adm-card" aria-labelledby="ret-stalled-title">
          <div className="adm-card-head adm-card-head--line">
            <h2 className="adm-card-title" id="ret-stalled-title">
              <span className="adm-icon-square adm-icon-square--rose"><AlertTriangle size={18} /></span>
              Atascadas: hay que arreglarlas a mano
              <span className="adm-card-count">{sim.stalled.length}</span>
            </h2>
          </div>
          <div className="ret-body">
            <p className="ret-line ret-muted">
              Ninguna ejecución, ni la tarea semanal, puede resolver estas reservas: vuelven en cada pasada hasta que alguien las corrija.
            </p>
            <ul className="ret-stalled">
              {sim.stalled.map((entry, index) => {
                const text = stalledReasonText(entry.reason)
                return (
                  <li key={`${entry.bookingId ?? 'sin-id'}:${entry.reason}:${index}`} className="ret-stalled__item">
                    <div className="ret-stalled__head">
                      <span className="adm-chip adm-chip--amber">{text.title}</span>
                      {entry.bookingId ? <code className="ret-id">{entry.bookingId}</code> : <span className="ret-muted">(sin identificador)</span>}
                    </div>
                    <p className="ret-line">{text.fix}</p>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {/* ---------------- Historial ---------------- */}
      <section className="adm-card" aria-labelledby="ret-history-title">
        <div className="adm-card-head">
          <h2 className="adm-card-title" id="ret-history-title">
            <span className="adm-icon-square adm-icon-square--soft"><FileText size={18} /></span>
            Historial
          </h2>
          <button type="button" className="adm-btn adm-btn--sm" onClick={() => void loadHistory()} disabled={historyLoading}>
            {historyLoading ? <Loader2 size={15} className="ret-spin" /> : <RefreshCw size={15} />}
            Actualizar
          </button>
        </div>
        <div className="adm-card-tabs ret-tabs">
          <div className="adm-tabs" role="tablist" aria-label="Historial">
            <button type="button" role="tab" aria-selected={tab === 'cron'} className={`adm-tab ${tab === 'cron' ? 'adm-tab--on' : ''}`} onClick={() => setTab('cron')}>
              Ejecuciones de la tarea
              {history?.cronRuns.status === 'ok' && <span className="adm-tab__count">{history.cronRuns.rows.length}</span>}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'purges'} className={`adm-tab ${tab === 'purges' ? 'adm-tab--on' : ''}`} onClick={() => setTab('purges')}>
              Purgas ejecutadas
              {history?.purges.status === 'ok' && <span className="adm-tab__count">{history.purges.rows.length}</span>}
            </button>
          </div>
        </div>

        {historyLoading && !history && <p className="ret-body ret-muted"><Loader2 size={15} className="ret-spin" /> Cargando el historial…</p>}
        {historyError && (
          <div className="ret-body">
            <div className="adm-note adm-note--alert" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <div className="adm-note__text">No se ha podido cargar el historial: {historyError}</div>
            </div>
          </div>
        )}

        {history && tab === 'cron' && (
          <div role="tabpanel">
            {history.cronRuns.status === 'missing' && (
              <div className="ret-body">
                <div className="adm-note ret-warn" role="status">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <div className="adm-note__text">
                    Todavía no existe la tabla <code>retention_cron_runs</code>: sin ella la tarea no puede guardar sus resultados. Aplica{' '}
                    <code>supabase/migrations/20261115_retention_cron_runs.sql</code>.
                  </div>
                </div>
              </div>
            )}
            {history.cronRuns.status === 'error' && (
              <div className="ret-body"><div className="adm-note adm-note--alert" role="alert"><AlertTriangle size={18} aria-hidden="true" /><div className="adm-note__text">No se han podido leer las ejecuciones de la tarea. Mira el log del servidor.</div></div></div>
            )}
            {history.cronRuns.status === 'ok' && history.cronRuns.rows.length === 0 && (
              <div className="adm-empty">La tarea todavía no se ha ejecutado. La primera ejecución será el próximo lunes.</div>
            )}
            {history.cronRuns.status === 'ok' && history.cronRuns.rows.length > 0 && (
              <div className="adm-table-wrap">
                <table className="adm-table adm-table--cards">
                  <caption className="ret-sr">Ejecuciones de la tarea semanal</caption>
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Modo</th>
                      <th scope="col">Resultado</th>
                      <th scope="col" className="adm-table__num">Pasadas</th>
                      <th scope="col" className="adm-table__num">Archivos</th>
                      <th scope="col" className="adm-table__num">Datos</th>
                      <th scope="col" className="adm-table__num">Atascadas</th>
                      <th scope="col"><span className="ret-sr">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.cronRuns.rows.map(run => {
                      const outcome = CRON_OUTCOME[run.outcome] ?? { label: run.outcome, tone: 'amber' as const }
                      const detail = details[`cron:${run.id}`]
                      return (
                        <tr key={run.id}>
                          <td data-label="Fecha"><span className="adm-table__strong">{formatDateTime(run.ran_at)}</span></td>
                          <td data-label="Modo">
                            <span className={`adm-chip ${run.mode === 'purga' ? 'adm-chip--rose' : 'adm-chip--sage'}`}>{run.mode === 'purga' ? 'Purga' : 'Simulación'}</span>
                          </td>
                          <td data-label="Resultado">
                            <span className={`adm-chip adm-chip--${outcome.tone}`}>{outcome.label}</span>
                            <span className="adm-table__muted">{CRON_STOP_REASON[run.stop_reason] ?? run.stop_reason}</span>
                            {run.blocked && (
                              <span className="ret-error">
                                {run.blocked.code === 'schema_missing' && run.blocked.missing ? `Falta ${run.blocked.missing.join(', ')}.` : run.blocked.code === 'seal_probe_failed' ? 'Falló la sonda de sello: revisa el trigger y la clave de servicio.' : 'La purga se negó.'}
                              </span>
                            )}
                            {run.warnings.length > 0 && (
                              <details className="ret-files">
                                <summary>{plural(run.warnings.length, 'aviso', 'avisos')}</summary>
                                <ul>{run.warnings.map(w => <li key={w}>{w}</li>)}</ul>
                              </details>
                            )}
                            {run.stalled.length > 0 && (
                              <details className="ret-files">
                                <summary>{plural(run.stalled_count, 'atascada', 'atascadas')}</summary>
                                <ul>{run.stalled.map((s, i) => <li key={`${s.bookingId}:${s.reason}:${i}`}><code>{s.bookingId ?? 'sin id'}</code> · {stalledReasonText(s.reason).title}</li>)}</ul>
                              </details>
                            )}
                            {run.reviewed_only.length > 0 && (
                              <details className="ret-files">
                                <summary>{plural(run.reviewed_only.length, 'revisada sin purgar', 'revisadas sin purgar')}</summary>
                                <ul>{run.reviewed_only.map(id => <li key={id}><code>{id}</code></li>)}</ul>
                              </details>
                            )}
                            {detail?.entries && (
                              <details className="ret-files" open>
                                <summary>{run.mode === 'purga' ? 'Lo que se borró' : 'Lo que se habría borrado'} ({detail.entries.length}{run.detail_truncated ? '+' : ''})</summary>
                                <ul>{detail.entries.map((e, i) => <li key={`${e.bookingId}:${e.userId}:${i}`}>{SCOPE_LABEL[e.scope] ?? e.scope} · <code>{e.bookingId ?? e.userId}</code> · {e.items.length} {e.scope === 'booking_legal_data' ? 'columnas' : 'archivos'}</li>)}</ul>
                              </details>
                            )}
                            {detail?.error && <span className="ret-error">{detail.error}</span>}
                          </td>
                          <td data-label="Pasadas" className="adm-table__num">{run.passes}</td>
                          <td data-label={run.mode === 'purga' ? 'Archivos borrados' : 'Archivos que se borrarían'} className="adm-table__num">{run.files_count}</td>
                          <td data-label={run.mode === 'purga' ? 'Columnas vaciadas' : 'Columnas que se vaciarían'} className="adm-table__num">{run.columns_count}</td>
                          <td data-label="Atascadas" className="adm-table__num">{run.stalled_count}</td>
                          <td className="adm-table__actions">
                            {(run.files_count > 0 || run.columns_count > 0) && !detail?.entries && (
                              <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => void loadDetail('cron', run.id)} disabled={detail?.loading}>
                                {detail?.loading ? <Loader2 size={14} className="ret-spin" /> : null} Ver detalle
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {history && tab === 'purges' && (
          <div role="tabpanel">
            {history.purges.status === 'missing' && (
              <div className="ret-body">
                <div className="adm-note adm-note--alert" role="alert">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <div className="adm-note__text">
                    Todavía no existe la tabla <code>retention_purge_log</code>: sin ella la purga se niega a borrar. Aplica{' '}
                    <code>supabase/migrations/20261110_document_retention_policy.sql</code>.
                  </div>
                </div>
              </div>
            )}
            {history.purges.status === 'error' && (
              <div className="ret-body"><div className="adm-note adm-note--alert" role="alert"><AlertTriangle size={18} aria-hidden="true" /><div className="adm-note__text">No se ha podido leer el registro de purgas. Mira el log del servidor.</div></div></div>
            )}
            {history.purges.status === 'ok' && history.purges.rows.length === 0 && (
              <div className="adm-empty">Todavía no se ha purgado nada: no hay ninguna fila en el registro.</div>
            )}
            {history.purges.status === 'ok' && history.purges.rows.length > 0 && (
              <div className="adm-table-wrap">
                <table className="adm-table adm-table--cards">
                  <caption className="ret-sr">Purgas ejecutadas</caption>
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Lanzada por</th>
                      <th scope="col">Alcance</th>
                      <th scope="col" className="adm-table__num">Archivos</th>
                      <th scope="col" className="adm-table__num">Datos</th>
                      <th scope="col" className="adm-table__num">Reservas</th>
                      <th scope="col">Constancia</th>
                      <th scope="col"><span className="ret-sr">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.purges.rows.map(row => {
                      const detail = details[`purge:${row.id}`]
                      const unsealed = Array.isArray(row.seal_failed) ? row.seal_failed.length : 0
                      return (
                        <tr key={row.id}>
                          <td data-label="Fecha"><span className="adm-table__strong">{formatDateTime(row.ran_at)}</span></td>
                          <td data-label="Lanzada por">
                            {row.ran_by === null
                              ? <span className="adm-chip adm-chip--sky">Tarea programada</span>
                              : <><span className="adm-table__strong">{history.admins[row.ran_by] ?? 'Administrador'}</span><code className="ret-id ret-id--muted">{row.ran_by}</code></>}
                          </td>
                          <td data-label="Alcance">
                            {row.scope_booking_id
                              ? <>Una reserva<code className="ret-id ret-id--muted">{row.scope_booking_id}</code></>
                              : row.scope_user_id
                                ? <>Un cliente<code className="ret-id ret-id--muted">{row.scope_user_id}</code></>
                                : <>Toda la base{row.scope_limit ? ` (tope ${row.scope_limit} por plazo)` : ''}</>}
                            {row.scope_truncated && <span className="adm-chip adm-chip--amber">Quedaban más</span>}
                          </td>
                          <td data-label="Archivos borrados" className="adm-table__num">{row.files_deleted}</td>
                          <td data-label="Columnas vaciadas" className="adm-table__num">{row.columns_cleared}</td>
                          <td data-label="Reservas" className="adm-table__num">{row.bookings_affected}</td>
                          <td data-label="Constancia">
                            {unsealed > 0
                              ? <span className="adm-chip adm-chip--rose">Sin constancia en {unsealed}</span>
                              : <span className="adm-chip adm-chip--sage">{row.bookings_sealed} selladas</span>}
                            {row.candidates_stalled > 0 && <span className="adm-chip adm-chip--amber">{row.candidates_stalled} atascadas</span>}
                            {detail?.entries && (
                              <details className="ret-files" open>
                                <summary>Lo que se borró ({detail.entries.length})</summary>
                                <ul>{detail.entries.map((e, i) => <li key={`${e.bookingId}:${e.userId}:${i}`}>{SCOPE_LABEL[e.scope] ?? e.scope} · <code>{e.bookingId ?? e.userId}</code> · {e.items.length} {e.scope === 'booking_legal_data' ? 'columnas' : 'archivos'}</li>)}</ul>
                              </details>
                            )}
                            {detail?.error && <span className="ret-error">{detail.error}</span>}
                          </td>
                          <td className="adm-table__actions">
                            {!detail?.entries && (
                              <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => void loadDetail('purge', row.id)} disabled={detail?.loading}>
                                {detail?.loading ? <Loader2 size={14} className="ret-spin" /> : null} Ver detalle
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---------------- Confirmación en dos pasos ---------------- */}
      {modalStep !== 0 && sim && (
        <div className="ret-backdrop" onClick={closeModal}>
          <div className="ret-sheet" role="dialog" aria-modal="true" aria-labelledby="ret-modal-title" onClick={e => e.stopPropagation()}>
            <div className="ret-sheet__head">
              <h2 className="ret-sheet__title" id="ret-modal-title">
                <span className="adm-icon-dot adm-icon-dot--rose"><Trash2 size={18} /></span>
                {modalStep === 1 ? 'Paso 1 de 2: revisa lo que se va a borrar' : 'Paso 2 de 2: confirma el borrado'}
              </h2>
              <button type="button" className="ret-sheet__close" onClick={closeModal} aria-label="Cerrar" disabled={purging}>
                <X size={18} />
              </button>
            </div>

            {modalStep === 1 && (
              <div className="ret-sheet__body">
                <p className="ret-line">
                  La simulación de las {simAt ? formatTime(simAt) : ''} dice que se borrarían{' '}
                  <strong>{plural(sim.summary.files, 'archivo', 'archivos')}</strong> de Storage y se vaciarían{' '}
                  <strong>{plural(sim.summary.columns, 'columna', 'columnas')}</strong> de datos del registro de viajeros, en{' '}
                  {plural(sim.summary.bookings, 'reserva', 'reservas')}
                  {sim.summary.holders > 0 ? ` y ${plural(sim.summary.holders, 'cuenta de titular', 'cuentas de titular')}` : ''}.
                </p>
                <div className="adm-note adm-note--alert" role="alert">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <div className="adm-note__text">
                    <strong>No se puede deshacer.</strong> Storage no tiene papelera: las fotos de DNI y de carnet borradas no se recuperan, ni
                    por ti ni por nosotros. Los datos del registro de viajeros que se vacían tampoco.
                  </div>
                </div>
                <ul className="ret-bullets">
                  <li>El borrado vuelve a leer la base y Storage <strong>ahora</strong>: puede diferir de la simulación si algo cambió entre medias.</li>
                  <li>{targeted ? 'Solo afecta al alcance de esta simulación (una reserva o un cliente).' : 'Afecta a todas las reservas vencidas, hasta 50 por plazo en esta pasada.'}</li>
                  <li>Queda constancia en el registro de purgas, con tu usuario. Si no se puede dejar constancia, no se borra nada.</li>
                </ul>
                <div className="ret-sheet__actions">
                  <button type="button" className="adm-btn" onClick={closeModal}>Cancelar</button>
                  <button type="button" className="adm-btn adm-btn--primary" onClick={() => setModalStep(2)}>Continuar</button>
                </div>
              </div>
            )}

            {modalStep === 2 && (
              <div className="ret-sheet__body">
                <p className="ret-line">
                  Para confirmar, escribe <strong>{PURGE_CONFIRM_WORD}</strong> en mayúsculas.
                </p>
                <label className="ret-field">
                  <span className="ret-field__label">Confirmación</span>
                  <input
                    className="adm-input"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder={PURGE_CONFIRM_WORD}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    disabled={purging}
                  />
                </label>
                <div className="ret-sheet__actions">
                  <button type="button" className="adm-btn" onClick={() => setModalStep(1)} disabled={purging}>
                    <ChevronLeft size={15} /> Atrás
                  </button>
                  <button type="button" className="ret-btn-danger" onClick={() => void executePurge()} disabled={!isPurgeConfirmText(confirmText) || purging}>
                    {purging ? <Loader2 size={16} className="ret-spin" /> : <Trash2 size={16} />}
                    {purging ? 'Borrando…' : 'Borrar ahora'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .ret {
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-width: 0;
        }
        .ret-intro {
          align-items: flex-start;
        }
        .ret-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 22px 30px 26px;
          min-width: 0;
        }
        .ret-block {
          margin: 0;
        }
        .ret-line {
          margin: 0;
          font-size: 0.86rem;
          line-height: 1.5;
          color: var(--adm-text);
        }
        .ret-muted {
          margin: 0;
          font-size: 0.8rem;
          line-height: 1.5;
          color: var(--adm-text-3);
        }
        .ret-line.ret-muted {
          color: var(--adm-text-3);
        }
        .ret-quote {
          margin: 6px 0 0;
          font-size: 0.82rem;
          line-height: 1.5;
          color: var(--adm-text);
          overflow-wrap: anywhere;
        }
        .ret-error {
          display: block;
          margin: 6px 0 0;
          font-size: 0.8rem;
          color: var(--adm-rose);
          overflow-wrap: anywhere;
        }
        .ret-warn {
          background: var(--adm-amber-soft);
          border-color: var(--adm-amber);
          color: var(--adm-text);
        }
        .ret-subtitle {
          margin: 4px 0 6px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--adm-text);
        }
        .ret-sr {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }
        .ret-spin {
          animation: ret-spin 1s linear infinite;
        }
        @keyframes ret-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .ret-head-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ret-scope {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
          gap: 12px 14px;
          align-items: end;
          margin: 0;
          padding: 14px 16px 16px;
          border: 1px solid var(--adm-border);
          border-radius: 12px;
          background: var(--adm-surface-2);
          min-width: 0;
        }
        .ret-scope__legend {
          grid-column: 1 / -1;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 6px;
          font-size: 0.74rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--adm-text-3);
        }
        .ret-scope__actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ret-scope .ret-error {
          grid-column: 1 / -1;
          margin: 0;
        }
        .ret-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }
        .ret-field__label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--adm-text-2);
        }

        .ret-id {
          display: block;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: 0.74rem;
          color: var(--adm-text);
          overflow-wrap: anywhere;
        }
        .ret-id--muted {
          color: var(--adm-text-3);
        }
        .ret-files {
          font-size: 0.8rem;
        }
        .ret-files summary {
          cursor: pointer;
          color: var(--adm-gold-text);
          font-weight: 600;
        }
        .ret-files ul {
          margin: 6px 0 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          color: var(--adm-text-2);
          overflow-wrap: anywhere;
        }
        .ret-ids {
          margin: 6px 0 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ret-stalled {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ret-stalled__item {
          padding: 12px 14px;
          border: 1px solid var(--adm-border);
          border-radius: 12px;
          background: var(--adm-surface-2);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ret-stalled__head {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ret-purge {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          padding-top: 6px;
          border-top: 1px solid var(--adm-border);
        }
        .ret-btn-danger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 40px;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid var(--adm-rose);
          background: var(--adm-rose);
          color: var(--adm-surface);
          font: inherit;
          font-size: 0.86rem;
          font-weight: 600;
          cursor: pointer;
        }
        .ret-btn-danger:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .ret-tabs {
          padding-bottom: 14px;
        }

        .ret-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: var(--adm-scrim);
        }
        .ret-sheet {
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 16px;
          background: var(--adm-surface);
          color: var(--adm-text);
          box-shadow: 0 20px 40px -12px var(--adm-shadow);
        }
        .ret-sheet__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--adm-border);
        }
        .ret-sheet__title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: var(--adm-text);
        }
        .ret-sheet__close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: var(--adm-text-3);
          cursor: pointer;
        }
        .ret-sheet__body {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 20px;
        }
        .ret-sheet__actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          padding-top: 6px;
        }
        .ret-bullets {
          margin: 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.84rem;
          line-height: 1.5;
          color: var(--adm-text-2);
        }

        @media (max-width: 860px) {
          .ret-body {
            padding: 18px 16px 22px;
          }
          .ret-scope {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        @media (max-width: 640px) {
          .ret {
            gap: 16px;
          }
          .ret-head-actions {
            width: 100%;
          }
          .ret-head-actions :global(.adm-btn) {
            flex: 1;
          }
          .ret-scope__actions {
            flex-direction: column;
          }
          .ret-scope__actions :global(.adm-btn) {
            width: 100%;
            min-height: 44px;
          }
          .ret-purge {
            flex-direction: column;
            align-items: stretch;
          }
          .ret-btn-danger {
            width: 100%;
            min-height: 44px;
          }
          /* Hoja inferior */
          .ret-backdrop {
            align-items: flex-end;
            padding: 0;
          }
          .ret-sheet {
            max-width: none;
            max-height: 92vh;
            border-radius: 16px 16px 0 0;
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
          .ret-sheet__actions {
            flex-direction: column-reverse;
          }
          .ret-sheet__actions :global(.adm-btn),
          .ret-sheet__actions .ret-btn-danger {
            width: 100%;
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  )
}
