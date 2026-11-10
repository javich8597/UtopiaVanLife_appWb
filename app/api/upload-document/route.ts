import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { detectDocumentType, DocumentType } from '@/lib/driverDocuments'
import { clientIp, documentUploadBucketKey, registerDocumentUploadAttempt } from '@/lib/booking/checkoutRateLimit'

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
// Dos documentos, más margen para el resto del formulario
const MAX_REQUEST_BYTES = 2 * MAX_DOCUMENT_BYTES + 1024 * 1024

async function readDocument(file: File): Promise<{ content: Buffer; type: DocumentType } | null> {
    if (file.size > MAX_DOCUMENT_BYTES) return null
    const content = Buffer.from(await file.arrayBuffer())
    const type = detectDocumentType(content)
    return type && { content, type }
}

export async function POST(request: Request) {
    try {
        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // El tamaño se comprueba antes de leer el cuerpo
        const declaredBytes = Number(request.headers.get('content-length'))
        if (!Number.isSafeInteger(declaredBytes) || declaredBytes <= 0) {
            return NextResponse.json({ error: 'Falta el tamaño de la petición.' }, { status: 411 })
        }
        if (declaredBytes > MAX_REQUEST_BYTES) {
            return NextResponse.json({ error: 'Cada archivo puede pesar como máximo 10 MB.' }, { status: 413 })
        }

        // El mismo cupo que /api/upload-driver-docs, y por el mismo motivo: aquí cada envío admite
        // 21 MB y se sube con la clave de service role, así que la ruta no puede quedarse sin
        // contador (hallazgo N7). Se apunta con el titular ya resuelto —un 401 no gasta cupo— y
        // antes de leer el cuerpo. Sin cabecera `x-forwarded-for` no hay límite
        if (!registerDocumentUploadAttempt(documentUploadBucketKey(clientIp(request.headers), user.id))) {
            return NextResponse.json(
                { error: 'Demasiados envíos de documentación desde esta conexión. Espera unos minutos y vuelve a intentarlo.' },
                { status: 429 }
            )
        }

        const formData = await request.formData()
        const front = formData.get('front')
        const back = formData.get('back')

        if (!(front instanceof File) || !(back instanceof File)) {
            return NextResponse.json({ error: 'Faltan archivos (frontal o trasero)' }, { status: 400 })
        }

        // Extensión y tipo salen del contenido. Se sube un Buffer: con un File, storage-js usa el tipo del navegador
        const [frontDoc, backDoc] = await Promise.all([readDocument(front), readDocument(back)])
        if (!frontDoc || !backDoc) {
            return NextResponse.json({ error: 'Solo se aceptan fotos reales (JPG, PNG, HEIC) o PDF de hasta 10 MB.' }, { status: 400 })
        }

        // Service Role para bypass RLS de Storage
        const supabaseAdmin = getSupabaseAdmin()

        // Intentamos crear el bucket si no existe (puede fallar si ya existe o no hay permisos, lo ignoramos)
        try {
            await supabaseAdmin.storage.createBucket('documents', { public: false })
        } catch {
            // Ignorar
        }

        const timestamp = Date.now()
        const upload = (name: string, { content, type }: { content: Buffer; type: DocumentType }) =>
            supabaseAdmin.storage
                .from('documents')
                .upload(`${user.id}/${name}_${timestamp}.${type.extension}`, content, { contentType: type.contentType, upsert: true })

        const { error: frontErr } = await upload('front', frontDoc)
        if (frontErr) throw new Error(`Error subiendo frontal: ${frontErr.message}`)

        const { error: backErr } = await upload('back', backDoc)
        if (backErr) throw new Error(`Error subiendo trasero: ${backErr.message}`)

        // Actualizar estado del usuario
        const { error: updateErr } = await supabaseAdmin
            .from('users')
            .update({
                verification_status: 'pending_validation'
            })
            .eq('id', user.id)

        if (updateErr) throw new Error(`Error actualizando estado: ${updateErr.message}`)

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Upload Error:', error)
        return NextResponse.json({ error: 'No hemos podido subir la documentación. Inténtalo de nuevo.' }, { status: 500 })
    }
}
