import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    try {
        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Verify user is admin
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
        }

        const { userId, action } = await request.json()

        if (!userId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
        }

        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const newStatus = action === 'approve' ? 'verified' : 'rejected'

        const { error: updateErr } = await supabaseAdmin
            .from('users')
            .update({ verification_status: newStatus })
            .eq('id', userId)

        if (updateErr) throw new Error(updateErr.message)

        return NextResponse.json({ success: true, status: newStatus })

    } catch (error: any) {
        console.error('Verify Doc Error:', error)
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
    }
}
