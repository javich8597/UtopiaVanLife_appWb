import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, LayoutDashboard, Truck, Settings, Users as UsersIcon, LogOut } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/auth/login?redirect=/admin')
    }

    // Verifica el rol en la DB
    const { data: dbUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    // Seguridad: si no es admin, fuera (para testear, puedes cambiar tu rol en Supabase a 'admin')
    if (dbUser?.role !== 'admin') {
        // Para simplificar local MVP sin tocar DB manualmente si el usuario se atasca:
        // redirect('/') 
        // Lo comento momentáneamente o lo dejamos estricto. Mejor estricto por seguridad.
        redirect('/dashboard')
    }

    const navItems = [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { label: 'Calendario Maestro', href: '/admin/calendar', icon: Calendar },
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
                                <Link href={item.href} className="admin-nav__link">
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
