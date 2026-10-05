import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/requireAdmin'
import { CHECKLIST, FUEL_LEVELS, missingSteps, type HandoverKind } from '@/lib/handover/checklist'

const EDITABLE = [
  'license_checked', 'km', 'fuel_level', 'dashboard_photo_path', 'exterior_video_path',
  'interior_video_path', 'damage_photo_paths', 'checklist', 'notes', 'customer_signature',
] as const

/**
 * Guarda los datos de la entrega/devolución paso a paso y, con complete=true,
 * la cierra si están todos los pasos (la reserva pasa a "En viaje" o "Completada").
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

    const { data: booking } = await db.from('bookings').select('id, status').eq('id', bookingId).maybeSingle()
    if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    if (['cancelled'].includes(booking.status)) {
      return NextResponse.json({ error: 'La reserva está cancelada' }, { status: 400 })
    }

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
        const allowed = new Set(CHECKLIST[kind as HandoverKind].map(i => i.id))
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
      const missing = missingSteps(merged)
      if (missing.length > 0) {
        return NextResponse.json({ error: `Faltan pasos: ${missing.join(', ')}`, missing }, { status: 400 })
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
