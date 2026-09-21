import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'

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

        const body = await request.json()
        const { userId, action, reason } = body

        if (!userId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
        }

        const clientToUse = getAdminClientOrSession(supabase)

        const newStatus = action === 'approve' ? 'verified' : 'rejected'
        const rejectionReason = action === 'reject' ? (reason || 'Rechazado por administración') : null

        // 1. Update users table with fallback if rejection_reason column does not exist
        let updateErr: any = null
        try {
            const { error } = await clientToUse
                .from('users')
                .update({
                    verification_status: newStatus,
                    rejection_reason: rejectionReason,
                })
                .eq('id', userId)

            if (error) {
                // If column rejection_reason is unknown, fall back to updating verification_status only
                if (error.message?.includes('rejection_reason') || error.code === '42703') {
                    const fallback = await clientToUse
                        .from('users')
                        .update({ verification_status: newStatus })
                        .eq('id', userId)
                    updateErr = fallback.error
                } else {
                    updateErr = error
                }
            }
        } catch (e: any) {
            updateErr = e
        }

        if (updateErr) {
            throw new Error(`Error al actualizar estado del usuario: ${updateErr.message || updateErr}`)
        }

        // 2. Persist to document_validations log table if available
        try {
            await clientToUse
                .from('document_validations')
                .insert({
                    user_id: userId,
                    document_type: 'identity_and_driver_license',
                    document_url: 'documents',
                    status: action === 'approve' ? 'approved' : 'rejected',
                    rejected_reason: rejectionReason,
                    validated_by: user.id,
                    validated_at: new Date().toISOString(),
                })
        } catch (docLogErr) {
            console.warn('Could not log to document_validations:', docLogErr)
        }

        return NextResponse.json({
            success: true,
            status: newStatus,
            reason: rejectionReason,
            message: action === 'approve'
                ? 'Documentación aprobada correctamente'
                : 'Documentación rechazada con motivo registrado',
        })

    } catch (error: any) {
        console.error('Verify Doc Error:', error)
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
    }
}
