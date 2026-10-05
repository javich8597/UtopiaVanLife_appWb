import { cookies } from 'next/headers'
import { redirect } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import AdminResponsiveShell from './AdminResponsiveShell'
import './admin.css'
import { isAdminUser } from '@/lib/admin/auth'
import { actionablePendingFilter } from '@/lib/admin/bookingStatus'
import { ADMIN_THEME_COOKIE } from '@/lib/admin/theme'

export const metadata = {
    title: 'Backoffice | Utopia Van Life',
}

export default async function AdminLayout({
    children,
    params
}: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params

    // El panel de administración solo existe y se gestiona en español
    if (locale !== 'es') {
        redirect({ href: '/admin', locale: 'es' })
        return null
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect({ href: '/auth/login?redirect=/admin', locale: 'es' })
        return null
    }

    // Verifica el rol en la DB
    const { data: dbUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    const isAuthorized = isAdminUser({
        id: user.id,
        email: user.email,
        role: dbUser?.role,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
    })

    if (!isAuthorized) {
        redirect({ href: '/dashboard', locale })
        return null
    }

    // Contadores para los avisos de la navegación
    const [{ count: pendingBookings }, { count: pendingVerifications }] = await Promise.all([
        // Pendientes que requieren atención: pagadas por confirmar o aún vivas
        // (las abandonadas en Redsys se consideran caducadas)
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending').or(actionablePendingFilter()),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending_validation'),
    ])

    const initialTheme = (await cookies()).get(ADMIN_THEME_COOKIE)?.value === 'dark' ? 'dark' : 'light'

    return (
        <AdminResponsiveShell
            userEmail={user.email}
            initialTheme={initialTheme}
            counts={{ pendingBookings: pendingBookings || 0, pendingVerifications: pendingVerifications || 0 }}
        >
            {children}
        </AdminResponsiveShell>
    )
}
