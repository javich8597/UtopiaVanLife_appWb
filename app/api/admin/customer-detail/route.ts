import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'
import { resolveCustomerDocumentUrls } from '@/lib/admin/documents'
import { buildSecondDriverGroups, resolveSecondDriverDocuments, secondDriverDocsNotices } from '@/lib/admin/secondDriverDocuments'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'Falta userId' }, { status: 400 })
        }

        // 1. Verificación de autenticación de usuario (sesión admin o Bearer service role)
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
        const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim()
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

        let isAuthorized = false
        let clientToUse: any = null

        if (bearerToken && serviceKey && bearerToken === serviceKey) {
            isAuthorized = true
            clientToUse = getAdminClientOrSession(null)
        } else {
            let supabase: any = null
            try {
                supabase = await createServerClient()
            } catch {
                supabase = null
            }

            if (supabase) {
                const { data: { user }, error: authError } = bearerToken
                    ? await supabase.auth.getUser(bearerToken)
                    : await supabase.auth.getUser()

                if (!authError && user) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', user.id)
                        .maybeSingle()

                    isAuthorized = isAdminUser({
                        id: user.id,
                        email: user.email,
                        role: profile?.role,
                        app_metadata: user.app_metadata
                    })

                    if (isAuthorized) {
                        clientToUse = getAdminClientOrSession(supabase)
                    }
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        if (!clientToUse) {
            clientToUse = getAdminClientOrSession(null)
        }

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
        const { data: bookings, error: bookingsError } = await clientToUse
            .from('bookings')
            .select(`
                *,
                campers (id, name, slug)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        // 3. Resolve document URLs from Supabase Storage
        const documents = await resolveCustomerDocumentUrls(clientToUse, userId)

        // 4. Fotos del segundo conductor de cada reserva (documents/<cliente>/<reserva>/second_*)
        // Si no se pudieron leer las reservas no se sabe qué carpetas son del cliente: se dice, no se calla
        const secondDriverDocs = bookingsError
            ? null
            : await resolveSecondDriverDocuments(clientToUse, userId, bookings || [])
        const secondDriverGroups = secondDriverDocs ? buildSecondDriverGroups(secondDriverDocs.folders, bookings || []) : []
        const secondDriverNotices = secondDriverDocs
            ? secondDriverDocsNotices(secondDriverDocs)
            : ['No se pudieron leer las reservas del cliente: no se muestran las fotos ni los datos de su segundo conductor.']

        return NextResponse.json({
            user: targetUser,
            bookings: bookings || [],
            documents,
            secondDriverGroups,
            secondDriverNotices
        })

    } catch (error: any) {
        // El detalle va al registro del servidor; al navegador nunca
        console.error('Customer Detail API Error:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
