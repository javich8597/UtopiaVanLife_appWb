import { redirect, Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import AdminNavClient from './AdminNavClient'
import AdminSidebarFooterClient from './AdminSidebarFooterClient'
import { isAdminUser } from '@/lib/admin/auth'

export default async function AdminLayout({
    children,
    params
}: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect({ href: '/auth/login?redirect=/admin', locale })
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
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar__header">
                    <Link href="/admin" className="navbar__logo" style={{ color: 'white' }}>
                        <span className="navbar__logo-text" style={{ color: 'white' }}>Utopia Admin</span>
                        <span className="navbar__logo-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>Backoffice</span>
                    </Link>
                </div>

                <AdminNavClient />

                <AdminSidebarFooterClient email={user.email} />
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <div className="admin-main__inner">
                    {children}
                </div>
            </main>
        </div>
    )
}
