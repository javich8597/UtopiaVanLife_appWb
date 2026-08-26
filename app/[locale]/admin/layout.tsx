import { redirect, Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { Calendar, LayoutDashboard, Truck, Settings, Users as UsersIcon, LogOut, BookOpen, ShieldCheck } from 'lucide-react'

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

    // Si no es admin y no es el email principal de administración
    const isUserAdmin = dbUser?.role === 'admin' || user.email === 'javipn85@gmail.com' || user.user_metadata?.is_admin === 'true'

    if (!isUserAdmin) {
        redirect({ href: '/dashboard', locale })
        return null
    }

    const navItems = [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { label: 'Calendario Maestro', href: '/admin/calendar', icon: Calendar },
        { label: 'Reservas', href: '/admin/bookings', icon: BookOpen },
        { label: 'Verificaciones', href: '/admin/verifications', icon: ShieldCheck },
        { label: 'Flota', href: '/admin/campers', icon: Truck },
        { label: 'Clientes', href: '/admin/users', icon: UsersIcon },
        { label: 'Ajustes', href: '/admin/settings', icon: Settings },
    ]

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

                <nav className="admin-nav">
                    <ul>
                        {navItems.map(item => (
                            <li key={item.href}>
                                <Link href={item.href as any} className="admin-nav__link">
                                    <item.icon size={18} />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="admin-sidebar__footer">
                    <div className="admin-user-info">
                        <span className="text-small" style={{ fontWeight: 600 }}>{user.email}</span>
                        <span className="text-xs" style={{ color: 'var(--gray-400)' }}>Administrator</span>
                    </div>
                    <Link href="/" className="admin-nav__link" style={{ color: 'var(--gray-400)', marginTop: 'var(--space-2)' }}>
                        <LogOut size={18} />
                        <span>Volver a la Web</span>
                    </Link>
                </div>
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
