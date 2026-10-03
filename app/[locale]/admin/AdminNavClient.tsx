'use client'

import { Link, usePathname } from '@/i18n/routing'
import { Calendar, LayoutDashboard, Truck, Settings, Users as UsersIcon, BookOpen, ShieldCheck, FileText } from 'lucide-react'

export interface AdminNavCounts {
  pendingBookings?: number
  pendingVerifications?: number
}

export const navItems = [
  { label: 'Inicio', short: 'Inicio', href: '/admin', icon: LayoutDashboard, exact: true, countKey: null, group: 'main' },
  { label: 'Calendario', short: 'Calendario', href: '/admin/calendar', icon: Calendar, exact: false, countKey: null, group: 'main' },
  { label: 'Reservas', short: 'Reservas', href: '/admin/bookings', icon: BookOpen, exact: false, countKey: 'pendingBookings', group: 'main' },
  { label: 'Verificaciones', short: 'Carnets', href: '/admin/verifications', icon: ShieldCheck, exact: false, countKey: 'pendingVerifications', group: 'main' },
  { label: 'Clientes', short: 'Clientes', href: '/admin/users', icon: UsersIcon, exact: false, countKey: null, group: 'main' },
  { label: 'Flota', short: 'Flota', href: '/admin/campers', icon: Truck, exact: false, countKey: null, group: 'config' },
  { label: 'Contrato', short: 'Contrato', href: '/admin/contrato', icon: FileText, exact: false, countKey: null, group: 'config' },
  { label: 'Ajustes', short: 'Ajustes', href: '/admin/settings', icon: Settings, exact: false, countKey: null, group: 'config' },
] as const

const GROUPS = [
  { id: 'main', label: null },
  { id: 'config', label: 'Configuración' },
] as const

export function isNavItemActive(pathname: string, href: string, exact: boolean) {
  return exact
    ? pathname === href || pathname === `/es${href}`
    : pathname.startsWith(href) || pathname.startsWith(`/es${href}`)
}

/** Nombre de la sección actual (para la ruta de la barra superior) */
export function currentSectionLabel(pathname: string) {
  return navItems.find(item => isNavItemActive(pathname, item.href, item.exact))?.label || 'Inicio'
}

export default function AdminNavClient({ onNavigate, counts = {} }: { onNavigate?: () => void; counts?: AdminNavCounts } = {}) {
  const pathname = usePathname()

  return (
    <nav className="admin-nav" aria-label="Navegación de administración">
      {GROUPS.map(group => (
        <div key={group.id} className="admin-nav__group">
          {group.label && <span className="admin-nav__group-label">{group.label}</span>}
          <ul>
            {navItems.filter(item => item.group === group.id).map(item => {
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
                    <Icon size={20} className="admin-nav__icon" />
                    <span className="admin-nav__label">{item.label}</span>
                    {count > 0 && <span className="admin-nav__count">{count}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
