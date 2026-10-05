import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/requireAdmin'

const KINDS = ['ficha_tecnica', 'permiso_circulacion'] as const
const EXT = /^(pdf|jpg|jpeg|png|webp)$/

/**
 * Documentación del vehículo (ficha técnica, permiso de circulación).
 * action 'upload-url': URL firmada para subir el archivo a Storage.
 * action 'save': registra el archivo subido para esa camper (sustituye al anterior).
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    const db = auth.db

    const { action, camperId, kind, ext, path, fileName } = await request.json()
    if (!camperId || !/^[0-9a-f-]{36}$/i.test(camperId) || !KINDS.includes(kind)) {
      return NextResponse.json({ error: 'Parámetros no válidos' }, { status: 400 })
    }

    if (action === 'upload-url') {
      if (!EXT.test(String(ext || '').toLowerCase())) return NextResponse.json({ error: 'Sube un PDF o una foto' }, { status: 400 })
      const filePath = `${camperId}/${kind}_${Date.now()}.${String(ext).toLowerCase()}`
      const { data, error } = await db.storage.from('vehicle-docs').createSignedUploadUrl(filePath)
      if (error) throw new Error(error.message)
      return NextResponse.json({ path: filePath, token: data.token })
    }

    if (action === 'save') {
      if (typeof path !== 'string' || !path.startsWith(`${camperId}/${kind}_`)) {
        return NextResponse.json({ error: 'Archivo no válido' }, { status: 400 })
      }
      const { data, error } = await db
        .from('camper_documents')
        .upsert({ camper_id: camperId, kind, file_path: path, file_name: String(fileName || '').slice(0, 200), uploaded_at: new Date().toISOString() }, { onConflict: 'camper_id,kind' })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true, document: data })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error: any) {
    console.error('Camper docs error:', error)
    return NextResponse.json({ error: error.message || 'No se pudo guardar el documento' }, { status: 500 })
  }
}
