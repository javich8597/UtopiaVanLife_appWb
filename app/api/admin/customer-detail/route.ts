import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'
import { resolveCustomerDocumentUrls } from '@/lib/admin/documents'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'Falta userId' }, { status: 400 })
        }

        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        const isAuthorized = isAdminUser({
            id: user.id,
            email: user.email,
            role: profile?.role,
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata
        })

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
        }

        const clientToUse = getAdminClientOrSession(supabase)

        // 1. Fetch user data
        const { data: targetUser, error: userError } = await clientToUse
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()

        if (userError || !targetUser) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
        }

        // 2. Fetch bookings of the user
        const { data: bookings } = await clientToUse
            .from('bookings')
            .select(`
                *,
                campers (id, name, slug)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        // 3. Resolve document URLs from Supabase Storage
        const documents = await resolveCustomerDocumentUrls(clientToUse, userId)

        return NextResponse.json({
            user: targetUser,
            bookings: bookings || [],
            documents
        })

    } catch (error: any) {
        console.error('Customer Detail API Error:', error)
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
    }
}
