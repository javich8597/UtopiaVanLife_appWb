import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/routing'
import AccountClient from './AccountClient'

export const metadata = {
    title: 'Mi perfil | Utopia Van Life',
    description: 'Tu cuenta de Utopia Van Life: contraseña, tema y sesión.'
}

export default async function ProfilePage({
    params,
    searchParams
}: {
    params: Promise<{ locale: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { locale } = await params
    const query = await searchParams

    // Enlaces antiguos al formulario del carnet (emails, avisos) llevan estos parámetros: van a Datos y carnet
    if (query.redirect || query.reason) {
        const qs = new URLSearchParams(Object.entries(query).flatMap(([k, v]) => (Array.isArray(v) ? v : v ? [v] : []).map(x => [k, x] as [string, string])))
        redirect({ href: `/dashboard/datos?${qs.toString()}`, locale })
        return null
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect({ href: '/auth/login?redirect=/dashboard/profile', locale })
        return null
    }

    const { data: profile } = await supabase
        .from('users')
        .select('full_name, role, verification_status')
        .eq('id', user.id)
        .maybeSingle()

    return (
        <AccountClient
            email={user.email || ''}
            fullName={profile?.full_name || ''}
            isAdmin={profile?.role === 'admin' || user.app_metadata?.role === 'admin'}
            verificationStatus={profile?.verification_status || null}
        />
    )
}
