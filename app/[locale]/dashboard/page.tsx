import { redirect } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export const metadata = {
    title: 'Mi Aventura | Utopia Van Life',
    description: 'Gestiona tus reservas, completa tu check-in y accede a las guías de viaje de Utopia Van Life en Mallorca.'
}

export default async function DashboardPage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect({ href: '/auth/login?redirect=/dashboard', locale })
        return null
    }

    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            *,
            camper:campers (slug, name, thumbnail_url, specs)
        `)
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })

    return <DashboardClient bookings={bookings || []} profile={profile} user={user} />
}
