import { NextResponse } from 'next/server'
import { isValidServiceRoleKey } from '@/lib/admin/auth'
import { secondDriverInformedReset } from '@/lib/booking/secondDriver'
import { requireAdmin } from '@/lib/admin/requireAdmin'
import {
  secondDriverRecordBlock,
  secondDriverRecordChanges,
  secondDriverRecordPatch,
  validateSecondDriverRecord,
} from '@/lib/admin/secondDriverRecord'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Columnas que tienen que existir en `bookings` (migraciones 20261108 y 20261109, preparadas sin aplicar) */
const RECORD_COLUMNS = ['has_second_driver', 'second_driver_name', 'second_driver_dni', 'second_driver_license', 'second_driver_birth_date', 'second_driver_license_date']
const AUDIT_COLUMNS = ['second_driver_updated_by', 'second_driver_updated_at']

const RETURNED_COLUMNS = [...RECORD_COLUMNS, ...AUDIT_COLUMNS].join(', ')

/**
 * Completa o corrige la ficha del segundo conductor de UNA reserva.
 * Body: { bookingId, fullName, document, licenseId?, birthDate, licenseDate }
 *
 * Solo escribe en esa reserva y con el acceso privilegiado (las columnas `second_driver_*` están
 * protegidas frente al cliente por el trigger de la migración 20261108). Deja constancia de quién y
 * cuándo la cambió en `second_driver_updated_by` / `second_driver_updated_at`. No añade un segundo
 * conductor a una reserva que no lo llevaba.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    // Sin la clave de servicio, `auth.db` es la sesión del administrador y RLS puede dejar la
    // escritura a medias o rechazarla sin decir por qué: se dice claro en lugar de intentarlo
    if (!isValidServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      console.error('second-driver: sin SUPABASE_SERVICE_ROLE_KEY válida; no se puede escribir la ficha')
      return NextResponse.json({ error: 'El servidor no tiene el acceso privilegiado a la base de datos configurado: no se puede guardar la ficha.' }, { status: 503 })
    }
    const db = auth.db

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Petición no válida' }, { status: 400 })
    const { bookingId } = body as Record<string, unknown>
    if (typeof bookingId !== 'string' || !UUID_RE.test(bookingId)) {
      return NextResponse.json({ error: 'Reserva no válida' }, { status: 400 })
    }

    // `*` para saber qué columnas existen de verdad en la base
    const { data: booking, error: readError } = await db.from('bookings').select('*').eq('id', bookingId).maybeSingle()
    if (readError) throw new Error(readError.message)
    if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })

    const missingColumns = [...RECORD_COLUMNS, ...AUDIT_COLUMNS].filter(column => !(column in booking))
    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `La base de datos aún no tiene las columnas de la ficha del segundo conductor por reserva (${missingColumns.join(', ')}). Faltan por aplicar las migraciones 20261108_booking_second_driver_columns.sql y 20261109_booking_second_driver_audit.sql.`,
        },
        { status: 409 }
      )
    }

    const blocked = secondDriverRecordBlock(booking)
    if (blocked) return NextResponse.json({ error: blocked }, { status: 409 })

    const checked = validateSecondDriverRecord(body, booking.start_date)
    if (!checked.ok) return NextResponse.json({ error: checked.error, field: checked.field }, { status: 400 })

    const patch = secondDriverRecordPatch(checked.record)
    const changed = secondDriverRecordChanges(booking, checked.record)
    const alreadyStored = (Object.keys(patch) as Array<keyof typeof patch>).every(key => booking[key] === patch[key])
    if (alreadyStored) return NextResponse.json({ success: true, changed: [], booking: pick(booking) })

    // Si la reserva pasa a autorizar a OTRA persona, la constancia de que el titular declaró haber
    // informado al 2º conductor deja de valer: informó a quien constaba antes. Solo se escribe si la
    // columna existe en la fila (migración 20261114, preparada sin aplicar) y si había algo que
    // invalidar; no entra en `missingColumns` para no bloquear la edición de la ficha por ella
    const informedReset = secondDriverInformedReset(booking, changed.includes('nombre') || changed.includes('documento'))

    const { data: updated, error: updateError } = await db
      .from('bookings')
      .update({ ...patch, ...informedReset, second_driver_updated_by: auth.user.id, second_driver_updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select(RETURNED_COLUMNS)
    if (updateError) throw new Error(updateError.message)
    if (!updated || updated.length !== 1) {
      return NextResponse.json({ error: 'No se pudo guardar la ficha: la reserva no se ha modificado. Ábrela de nuevo y repite la acción.' }, { status: 409 })
    }

    // Constancia en el log del servidor: quién, qué reserva y qué campos (nunca los valores)
    console.info('[admin] ficha del segundo conductor editada', { bookingId, adminId: auth.user.id, changed })

    // La comunicación a SES.Hospedajes ya salió con los datos anteriores: se avisa, no se bloquea
    const sesSent = typeof booking.notes === 'string' && /\[SES\.HOSPEDAJES ENVIADO/i.test(booking.notes)
    return NextResponse.json({
      success: true,
      changed,
      booking: updated[0],
      ...(sesSent && changed.length > 0
        ? { warning: 'Esta reserva ya se comunicó a SES.Hospedajes con los datos anteriores: hay que corregirlo allí si cambia la identidad.' }
        : {}),
    })
  } catch (error) {
    console.error('Second driver record error:', error)
    return NextResponse.json({ error: 'No se pudo guardar la ficha del segundo conductor' }, { status: 500 })
  }
}

function pick(booking: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries([...RECORD_COLUMNS, ...AUDIT_COLUMNS].map(column => [column, booking[column] ?? null]))
}
