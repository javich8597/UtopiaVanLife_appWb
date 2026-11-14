import { NextResponse } from 'next/server'
import { isValidServiceRoleKey } from '@/lib/admin/auth'
import { requireAdmin } from '@/lib/admin/requireAdmin'
import {
  RETENTION_DEFAULT_LIMIT,
  RETENTION_MAX_LIMIT,
  UUID_RE,
  runRetentionPass,
  type BookingRetentionPlan,
} from '@/lib/admin/retentionPass'

/**
 * POLÍTICA DE CONSERVACIÓN: purga de la documentación de identidad de las reservas.
 *
 * Decisión de Javier (2026-11-10): «Purgar imágenes de Storage a los 100 días tras la devolución;
 * retener datos legales 3 años por RD 933/2021». Los plazos y el reparto están en
 * `lib/booking/dataRetention.ts`; la ejecución de una pasada, en `lib/admin/retentionPass.ts`
 * (movida desde esta ruta sin cambiar su lógica, para compartirla con la tarea semanal).
 *
 * POST /api/admin/retention/documents
 *   { confirm?: boolean, bookingId?: string, userId?: string, limit?: number }
 *
 * POR DEFECTO ES UNA SIMULACIÓN: dice qué borraría y no borra nada. Solo con `confirm: true` borra.
 * Nunca devuelve una URL firmada, el valor de ningún dato ni el nombre completo de un archivo que no
 * reconoce (podría llevar datos personales en el propio nombre).
 *
 * Esta es la puerta del ADMINISTRADOR: exige sesión de admin y clave de servicio válida (503 si no
 * la hay), igual que /api/admin/bookings/second-driver. La tarea programada tiene su propia puerta,
 * con secreto, en /api/cron/retention/documents, y no pasa por aquí.
 *
 * NO BORRA SI NO PUEDE DEJAR CONSTANCIA (hallazgo de `seguridad-auditor`, 2026-11-10): antes de
 * tocar nada comprueba que existen las tres columnas de constancia y la tabla
 * `retention_purge_log`; si falta algo responde 409 y no borra. Storage no tiene papelera: borrar
 * fotos de DNI sin rastro es peor que no borrarlas.
 *
 * Es idempotente: las consultas excluyen lo ya purgado, lo que no está en Storage no se vuelve a
 * contar y una reserva con las columnas ya vacías no genera ningún `UPDATE`.
 */

type Row = Record<string, unknown>

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
    // de la cuenta. `isSafeSegment` dejaba pasar cualquier texto sin barras.
    // `onlyUser !== null` y no `onlyUser`: una cadena vacía es falsa, así que `userId: ''` se
    // colaba como «sin filtro de cliente» y ampliaba el alcance en silencio a toda la base, con el
    // alcance registrado en blanco en vez de en el cliente pedido (hallazgo QA-RET-11)
    if (onlyUser !== null && !UUID_RE.test(onlyUser)) {
      return NextResponse.json({ error: 'Cliente no válido' }, { status: 400 })
    }
    const limit = Math.min(Math.max(Number(body.limit) || RETENTION_DEFAULT_LIMIT, 1), RETENTION_MAX_LIMIT)

    const result = await runRetentionPass(
      db,
      { confirm, bookingId: onlyBooking, userId: onlyUser, limit },
      { id: auth.user.id, via: 'admin' }
    )
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('Retention purge error:', error)
    return NextResponse.json({ error: 'No se pudo ejecutar la purga de conservación' }, { status: 500 })
  }
}

/** Tipo exportado solo para los tests del plan de purga */
export type { BookingRetentionPlan }
