'use client'

import { Link, usePathname } from '@/i18n/routing'
import { Calendar, LayoutDashboard, Truck, Settings, Users as UsersIcon, BookOpen, ShieldCheck, FileText } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Calendario Maestro', href: '/admin/calendar', icon: Calendar, exact: false },
  { label: 'Reservas', href: '/admin/bookings', icon: BookOpen, exact: false },
  { label: 'Verificaciones', href: '/admin/verifications', icon: ShieldCheck, exact: false },
  { label: 'Flota', href: '/admin/campers', icon: Truck, exact: false },
  { label: 'Clientes', href: '/admin/users', icon: UsersIcon, exact: false },
  { label: 'Plantilla Contrato', href: '/admin/contrato', icon: FileText, exact: false },
  { label: 'Ajustes', href: '/admin/settings', icon: Settings, exact: false },
]

export default function AdminNavClient() {
  const pathname = usePathname()

  return (
    <nav className="admin-nav">
      <ul>
        {navItems.map(item => {
          const isActive = item.exact
            ? pathname === item.href || pathname === `/es${item.href}`
            : pathname.startsWith(item.href) || pathname.startsWith(`/es${item.href}`)
          const Icon = item.icon

          return (
            <li key={item.href}>
              <Link
                href={item.href as any}
                className={`admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}
                style={{
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.14)' : undefined,
                  color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                  fontWeight: isActive ? 600 : 500,
                  borderLeft: isActive ? '3px solid #34D399' : '3px solid transparent',
                  paddingLeft: isActive ? '13px' : '16px',
                }}
              >
                <Icon size={18} style={{ color: isActive ? '#34D399' : 'inherit' }} />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
