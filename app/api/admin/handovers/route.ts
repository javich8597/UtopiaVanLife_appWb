import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/requireAdmin'
import { secondDriverPhotoPresence } from '@/lib/admin/secondDriverDocuments'
import {
  CHECKLIST,
  FUEL_LEVELS,
  SECOND_DRIVER_CHECK_ID_LIST,
  incompleteSteps,
  type HandoverKind,
} from '@/lib/handover/checklist'
import { secondDriverStepInput } from '@/lib/handover/secondDriverStep'

const EDITABLE = [
  'license_checked', 'km', 'fuel_level', 'dashboard_photo_path', 'exterior_video_path',
  'interior_video_path', 'damage_photo_paths', 'checklist', 'notes', 'customer_signature',
] as const

/**
 * Guarda los datos de la entrega/devolución paso a paso y, con complete=true,
 * la cierra si están todos los pasos (la reserva pasa a "En viaje" o "Completada").
 *
 * En la entrega de recogida de una reserva con segundo conductor hay un paso más: comprobar su
 * carnet y su documento contra la ficha de la reserva. Se exige aquí, en el servidor, con la ficha
 * y las fotos de Storage leídas en este momento; la pantalla solo lo enseña.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    const db = auth.db

    const { bookingId, kind, patch = {}, complete = false } = await request.json()
    if (!bookingId || !['pickup', 'return'].includes(kind)) {
      return NextResponse.json({ error: 'Parámetros no válidos' }, { status: 400 })
    }

    // `*` porque las columnas second_driver_* pueden no estar aplicadas todavía; el segundo
    // conductor se deduce de la reserva (columnas, acompañantes o desglose de precio)
    const { data: booking } = await db.from('bookings').select('*').eq('id', bookingId).maybeSingle()
    if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    if (['cancelled'].includes(booking.status)) {
      return NextResponse.json({ error: 'La reserva está cancelada' }, { status: 400 })
    }
    // El segundo conductor solo se comprueba al entregar la camper, no al devolverla
    const hasSecondDriver = kind === 'pickup' && secondDriverStepInput(booking, null) !== null

    const { data: existing } = await db.from('handovers').select('*').eq('booking_id', bookingId).eq('kind', kind).maybeSingle()
    if (existing?.completed_at && !complete) {
      return NextResponse.json({ error: 'Esta entrega ya está cerrada' }, { status: 409 })
    }

    // Solo campos conocidos y con tipos razonables
    const clean: Record<string, any> = {}
    for (const key of EDITABLE) {
      if (!(key in patch)) continue
      const v = patch[key]
      if (key === 'km') {
        const n = v === null || v === '' ? null : Math.round(Number(v))
        if (n !== null && (!Number.isFinite(n) || n < 0 || n > 2_000_000)) {
          return NextResponse.json({ error: 'Kilómetros no válidos' }, { status: 400 })
        }
        clean.km = n
      } else if (key === 'fuel_level') {
        if (v && !(FUEL_LEVELS as readonly string[]).includes(v)) return NextResponse.json({ error: 'Nivel de combustible no válido' }, { status: 400 })
        clean.fuel_level = v || null
      } else if (key === 'checklist') {
        // Las casillas del segundo conductor solo valen si esta reserva lleva uno
        const allowed = new Set([
          ...CHECKLIST[kind as HandoverKind].map(i => i.id),
          ...(hasSecondDriver ? SECOND_DRIVER_CHECK_ID_LIST : []),
        ])
        clean.checklist = Object.fromEntries(Object.entries(v || {}).filter(([k]) => allowed.has(k)).map(([k, b]) => [k, b === true]))
      } else if (key === 'customer_signature') {
        if (v && (typeof v !== 'string' || !v.startsWith('data:image/') || v.length > 400_000)) {
          return NextResponse.json({ error: 'Firma no válida' }, { status: 400 })
        }
        clean.customer_signature = v || null
      } else if (key.endsWith('_path')) {
        // Solo rutas dentro de la carpeta de esta reserva
        if (v && (typeof v !== 'string' || !v.startsWith(`${bookingId}/${kind}/`))) {
          return NextResponse.json({ error: 'Archivo no válido' }, { status: 400 })
        }
        clean[key] = v || null
      } else if (key === 'damage_photo_paths') {
        clean.damage_photo_paths = (Array.isArray(v) ? v : []).filter((p: any) => typeof p === 'string' && p.startsWith(`${bookingId}/${kind}/`)).slice(0, 20)
      } else if (key === 'license_checked') {
        clean.license_checked = v === true
      } else if (key === 'notes') {
        clean.notes = typeof v === 'string' ? v.slice(0, 2000) : null
      }
    }

    const merged = { ...(existing || { kind }), ...clean, kind }
    if (complete) {
      // Ficha y fotos del segundo conductor leídas ahora: lo que la pantalla enseñó pudo cambiar
      const photos = hasSecondDriver && booking.user_id ? await secondDriverPhotoPresence(db, booking.user_id, bookingId) : null
      const secondDriver = hasSecondDriver ? secondDriverStepInput(booking, photos) : null
      const pending = incompleteSteps(merged, { secondDriver })
      if (pending.length > 0) {
        const detail = pending.map(s => s.detail).filter(Boolean).join(' ')
        return NextResponse.json(
          { error: `Faltan pasos: ${pending.map(s => s.label).join(', ')}${detail ? `. ${detail}` : ''}`, missing: pending.map(s => s.label) },
          { status: 400 }
        )
      }
      clean.completed_at = new Date().toISOString()
      clean.admin_id = auth.user.id
    }
    clean.updated_at = new Date().toISOString()

    const { data: saved, error } = await db
      .from('handovers')
      .upsert({ booking_id: bookingId, kind, ...clean }, { onConflict: 'booking_id,kind' })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    if (complete) {
      const nextStatus = kind === 'pickup' ? 'active' : 'completed'
      const { error: bErr } = await db.from('bookings').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', bookingId)
      if (bErr) console.warn('No se pudo actualizar el estado de la reserva tras la entrega:', bErr.message)
    }

    return NextResponse.json({ success: true, handover: saved })
  } catch (error: any) {
    console.error('Handover save error:', error)
    return NextResponse.json({ error: error.message || 'No se pudo guardar la entrega' }, { status: 500 })
  }
}
