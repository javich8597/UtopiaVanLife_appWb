'use client'

import React, { useState, useEffect } from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { Menu, X, Globe } from 'lucide-react'
import AdminNavClient, { AdminNavCounts, isNavItemActive, navItems } from './AdminNavClient'
import AdminSidebarFooterClient from './AdminSidebarFooterClient'
import AdminThemeToggle from './AdminThemeToggle'
import { ADMIN_THEME_COOKIE, type AdminTheme } from '@/lib/admin/theme'

interface Props {
  userEmail?: string
  counts?: AdminNavCounts
  initialTheme?: AdminTheme
  children: React.ReactNode
}

// Accesos de la barra inferior móvil (el resto vive en el menú "Más")
const TAB_HREFS = ['/admin', '/admin/calendar', '/admin/bookings', '/admin/verifications']

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/admin" onClick={onClick} className="admin-brand">
      <span className="admin-brand__name">Utopia</span>
      <span className="admin-brand__tag">Admin</span>
    </Link>
  )
}

export default function AdminResponsiveShell({ userEmail, counts = {}, initialTheme = 'light', children }: Props) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [theme, setTheme] = useState<AdminTheme>(initialTheme)

  // El tema se guarda en cookie para que el servidor lo pinte sin parpadeo en la siguiente carga
  const changeTheme = (next: AdminTheme) => {
    setTheme(next)
    document.cookie = `${ADMIN_THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
  }
  const pathname = usePathname()

  // Cerrar drawer al cambiar de ruta
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [pathname])

  // Bloquear scroll del body cuando el drawer esté abierto en móvil
  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen])

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) setIsDrawerOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen])

  const tabs = navItems.filter(item => TAB_HREFS.includes(item.href))
  const moreIsActive = !tabs.some(item => isNavItemActive(pathname, item.href, item.exact))

  return (
    <div className="admin-layout" data-theme={theme}>
      {/* 1. Sidebar fijo de escritorio (>= 861px) */}
      <aside className="admin-sidebar admin-sidebar--desktop">
        <div className="admin-sidebar__header">
          <Brand />
        </div>
        <AdminNavClient counts={counts} />
        <AdminSidebarFooterClient email={userEmail}>
          <AdminThemeToggle theme={theme} onChange={changeTheme} />
        </AdminSidebarFooterClient>
      </aside>

      {/* 2. Cabecera móvil (<= 860px) */}
      <header className="admin-mobile-header">
        <Brand />
        <div className="admin-mobile-header__actions">
          <AdminThemeToggle theme={theme} onChange={changeTheme} variant="compact" />
          <Link href="/" target="_blank" className="admin-mobile-header__link" title="Ver la web pública">
            <Globe size={16} />
            <span>Ver web</span>
          </Link>
        </div>
      </header>

      {/* 3. Drawer móvil con la navegación completa */}
      {isDrawerOpen && (
        <div className="admin-drawer">
          <div className="admin-drawer__backdrop" onClick={() => setIsDrawerOpen(false)} aria-hidden="true" />
          <aside className="admin-drawer__panel" role="dialog" aria-modal="true" aria-label="Menú de administración">
            <div className="admin-drawer__header">
              <Brand onClick={() => setIsDrawerOpen(false)} />
              <button
                type="button"
                className="admin-drawer__close"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>
            <div className="admin-drawer__nav-wrap">
              <AdminNavClient counts={counts} onNavigate={() => setIsDrawerOpen(false)} />
            </div>
            <div className="admin-drawer__footer">
              <AdminSidebarFooterClient email={userEmail} />
            </div>
          </aside>
        </div>
      )}

      {/* 4. Contenido principal */}
      <main className="admin-main">
        <div className="admin-main__inner">{children}</div>
      </main>

      {/* 5. Barra inferior móvil (<= 860px) */}
      <nav className="admin-tabbar" aria-label="Accesos rápidos">
        {tabs.map(item => {
          const Icon = item.icon
          const active = isNavItemActive(pathname, item.href, item.exact)
          const count = item.countKey ? counts[item.countKey] || 0 : 0
          return (
            <Link
              key={item.href}
              href={item.href as any}
              className={`admin-tabbar__item ${active ? 'admin-tabbar__item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="admin-tabbar__icon">
                <Icon size={20} />
                {count > 0 && <span className="admin-tabbar__dot">{count}</span>}
              </span>
              <span className="admin-tabbar__label">{item.short}</span>
            </Link>
          )
        })}
        <button
          type="button"
          className={`admin-tabbar__item ${moreIsActive ? 'admin-tabbar__item--active' : ''}`}
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Abrir menú completo"
          aria-expanded={isDrawerOpen}
        >
          <span className="admin-tabbar__icon"><Menu size={20} /></span>
          <span className="admin-tabbar__label">Más</span>
        </button>
      </nav>
    </div>
  )
}
