import { redirect, Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import AdminNavClient from './AdminNavClient'
import AdminSidebarFooterClient from './AdminSidebarFooterClient'
import AdminResponsiveShell from './AdminResponsiveShell'
import { isAdminUser } from '@/lib/admin/auth'

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
        user_metadata: user.user_metadata
    })

    if (!isAuthorized) {
        redirect({ href: '/dashboard', locale })
        return null
    }

    return (
        <AdminResponsiveShell userEmail={user.email}>
            {children}
        </AdminResponsiveShell>
    )
}
