'use client'

import { Link, usePathname } from '@/i18n/routing'
import { Calendar, LayoutDashboard, Truck, Settings, Users as UsersIcon, BookOpen, ShieldCheck, FileText } from 'lucide-react'

export interface AdminNavCounts {
  pendingBookings?: number
  pendingVerifications?: number
}

export const navItems = [
  { label: 'Dashboard', short: 'Inicio', href: '/admin', icon: LayoutDashboard, exact: true, countKey: null },
  { label: 'Calendario', short: 'Calendario', href: '/admin/calendar', icon: Calendar, exact: false, countKey: null },
  { label: 'Reservas', short: 'Reservas', href: '/admin/bookings', icon: BookOpen, exact: false, countKey: 'pendingBookings' },
  { label: 'Verificaciones', short: 'Carnets', href: '/admin/verifications', icon: ShieldCheck, exact: false, countKey: 'pendingVerifications' },
  { label: 'Flota', short: 'Flota', href: '/admin/campers', icon: Truck, exact: false, countKey: null },
  { label: 'Clientes', short: 'Clientes', href: '/admin/users', icon: UsersIcon, exact: false, countKey: null },
  { label: 'Plantilla contrato', short: 'Contrato', href: '/admin/contrato', icon: FileText, exact: false, countKey: null },
  { label: 'Ajustes', short: 'Ajustes', href: '/admin/settings', icon: Settings, exact: false, countKey: null },
] as const

export function isNavItemActive(pathname: string, href: string, exact: boolean) {
  return exact
    ? pathname === href || pathname === `/es${href}`
    : pathname.startsWith(href) || pathname.startsWith(`/es${href}`)
}

export default function AdminNavClient({ onNavigate, counts = {} }: { onNavigate?: () => void; counts?: AdminNavCounts } = {}) {
  const pathname = usePathname()

  return (
    <nav className="admin-nav" aria-label="Navegación de administración">
      <ul>
        {navItems.map(item => {
          const isActive = isNavItemActive(pathname, item.href, item.exact)
          const Icon = item.icon
          const count = item.countKey ? counts[item.countKey] || 0 : 0

          return (
            <li key={item.href}>
              <Link
                href={item.href as any}
                onClick={onNavigate}
                className={`admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} className="admin-nav__icon" />
                <span className="admin-nav__label">{item.label}</span>
                {count > 0 && <span className="admin-nav__count">{count}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
