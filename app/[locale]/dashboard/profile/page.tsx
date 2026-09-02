import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/routing'
import ProfileClient from './ProfileClient'

export default async function ProfilePage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect({ href: '/auth/login?redirect=/dashboard/profile', locale })
        return null
    }

    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    return (
        <ProfileClient user={user} profile={profile} />
    )
}
