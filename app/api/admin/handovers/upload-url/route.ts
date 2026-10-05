import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/requireAdmin'

const FIELDS = ['dashboard', 'exterior', 'interior', 'damage'] as const
const EXT = /^(jpg|jpeg|png|webp|webm|mp4|mov)$/

/**
 * Devuelve una URL firmada para subir una foto o vídeo de la entrega directamente a Storage.
 * Así los vídeos no pasan por el servidor (Vercel limita el cuerpo de las peticiones).
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { bookingId, kind, field, ext } = await request.json()
    if (!bookingId || !['pickup', 'return'].includes(kind) || !FIELDS.includes(field) || !EXT.test(String(ext || '').toLowerCase())) {
      return NextResponse.json({ error: 'Parámetros no válidos' }, { status: 400 })
    }
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return NextResponse.json({ error: 'Reserva no válida' }, { status: 400 })

    const path = `${bookingId}/${kind}/${field}_${Date.now()}.${String(ext).toLowerCase()}`
    const { data, error } = await auth.db.storage.from('handovers').createSignedUploadUrl(path)
    if (error) throw new Error(error.message)

    return NextResponse.json({ path, token: data.token })
  } catch (error: any) {
    console.error('Handover upload-url error:', error)
    return NextResponse.json({ error: error.message || 'No se pudo preparar la subida' }, { status: 500 })
  }
}
