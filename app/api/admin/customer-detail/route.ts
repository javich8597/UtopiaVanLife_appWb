import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isAdminUser } from '@/lib/admin/auth'

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
            user_metadata: user.user_metadata
        })

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
        }

        const clientToUse = process.env.SUPABASE_SERVICE_ROLE_KEY
            ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
            : supabase

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
        let dniFrontUrl = null
        let dniBackUrl = null
        let licenseFrontUrl = null
        let licenseBackUrl = null

        try {
            const { data: files } = await clientToUse.storage.from('documents').list(userId)
            if (files && files.length > 0) {
                const findSignedUrl = async (pattern: string) => {
                    const file = files.filter((f: any) => f.name.includes(pattern)).sort((a: any, b: any) => b.name.localeCompare(a.name))[0]
                    if (file) {
                        const { data } = await clientToUse.storage.from('documents').createSignedUrl(`${userId}/${file.name}`, 3600)
                        return data?.signedUrl || null
                    }
                    return null
                }

                dniFrontUrl = await findSignedUrl('dni_front')
                dniBackUrl = await findSignedUrl('dni_back')
                licenseFrontUrl = await findSignedUrl('license_front') || await findSignedUrl('front_')
                licenseBackUrl = await findSignedUrl('license_back') || await findSignedUrl('back_')
            }
        } catch (e) {
            console.error('Error fetching docs in customer details:', e)
        }

        return NextResponse.json({
            user: targetUser,
            bookings: bookings || [],
            documents: {
                dniFrontUrl,
                dniBackUrl,
                licenseFrontUrl,
                licenseBackUrl
            }
        })

    } catch (error: any) {
        console.error('Customer Detail API Error:', error)
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
    }
}
