import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/routing'
import DriverDataClient from './DriverDataClient'
import { getAdminClientOrSession } from '@/lib/admin/auth'

export const metadata = {
    title: 'Datos y carnet | Utopia Van Life',
    description: 'Tus datos de conductor y la documentación para formalizar el contrato de alquiler.'
}

export default async function DriverDataPage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect({ href: '/auth/login?redirect=/dashboard/datos', locale })
        return null
    }

    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    // Motivo del último rechazo del carnet, para que el cliente sepa qué corregir
    let rejectionReason: string | null = profile?.rejection_reason || null
    if (!rejectionReason && profile?.verification_status === 'rejected') {
        const { data: lastRejection } = await getAdminClientOrSession(supabase)
            .from('document_validations')
            .select('rejected_reason')
            .eq('user_id', user.id)
            .eq('status', 'rejected')
            .order('validated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        rejectionReason = lastRejection?.rejected_reason || null
    }

    return (
        <DriverDataClient user={user} profile={profile} rejectionReason={rejectionReason} />
    )
}
