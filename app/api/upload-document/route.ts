import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const formData = await request.formData()
        const front = formData.get('front') as File
        const back = formData.get('back') as File

        if (!front || !back) {
            return NextResponse.json({ error: 'Faltan archivos (frontal o trasero)' }, { status: 400 })
        }

        // Usamos el Service Role para bypass RLS de Storage
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Intentamos crear el bucket si no existe (puede fallar si ya existe o no hay permisos, lo ignoramos)
        try {
            await supabaseAdmin.storage.createBucket('documents', { public: false })
        } catch (e) {
            // Ignorar
        }

        const timestamp = Date.now()
        const frontExt = front.name.split('.').pop() || 'jpg'
        const backExt = back.name.split('.').pop() || 'jpg'

        const frontPath = `${user.id}/front_${timestamp}.${frontExt}`
        const backPath = `${user.id}/back_${timestamp}.${backExt}`

        // Subir frontal
        const { error: frontErr } = await supabaseAdmin.storage
            .from('documents')
            .upload(frontPath, front, { upsert: true })

        if (frontErr) throw new Error(`Error subiendo frontal: ${frontErr.message}`)

        // Subir trasero
        const { error: backErr } = await supabaseAdmin.storage
            .from('documents')
            .upload(backPath, back, { upsert: true })

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

    } catch (error: any) {
        console.error('Upload Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
