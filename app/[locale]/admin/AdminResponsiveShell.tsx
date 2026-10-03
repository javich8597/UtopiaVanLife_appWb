'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import {
  Menu, X, Globe, Home, Search, Plus, CalendarX2, Truck, ShieldCheck, Sparkles, Clock, LogOut,
} from 'lucide-react'
import AdminNavClient, { AdminNavCounts, currentSectionLabel, isNavItemActive, navItems } from './AdminNavClient'
import AdminSidebarFooterClient, { signOutAdmin } from './AdminSidebarFooterClient'
import AdminThemeToggle from './AdminThemeToggle'
import AdminCommandPalette from './AdminCommandPalette'
import { ADMIN_THEME_COOKIE, type AdminTheme } from '@/lib/admin/theme'
import './shell.css'
import './command-palette.css'

interface Props {
  userEmail?: string
  counts?: AdminNavCounts
  initialTheme?: AdminTheme
  children: React.ReactNode
}

// Accesos de la barra inferior móvil (el resto vive en el menú "Más")
const TAB_HREFS = ['/admin', '/admin/calendar', '/admin/bookings', '/admin/verifications']

// Acciones rápidas del botón "+"
const QUICK_ACTIONS = [
  { label: 'Bloquear fechas', hint: 'Taller o uso propio', href: '/admin/calendar', icon: CalendarX2 },
  { label: 'Cobros pendientes', hint: 'Reservas sin pagar', href: '/admin/bookings?status=pending', icon: Clock },
  { label: 'Validar carnets', hint: 'Documentación por revisar', href: '/admin/verifications', icon: ShieldCheck },
  { label: 'Añadir camper', hint: 'Nueva ficha de vehículo', href: '/admin/campers', icon: Truck },
  { label: 'Añadir extra', hint: 'Catálogo del checkout', href: '/admin/settings#extras', icon: Sparkles },
]

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/admin" onClick={onClick} className="admin-brand">
      <span className="admin-brand__mark" aria-hidden="true">U</span>
      <span className="admin-brand__text">
        <span className="admin-brand__name">Utopia</span>
        <span className="admin-brand__tag">Backoffice</span>
      </span>
    </Link>
  )
}

/** Cierra un menú desplegable al pulsar fuera o Escape */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return ref
}

export default function AdminResponsiveShell({ userEmail, counts = {}, initialTheme = 'light', children }: Props) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isPlusOpen, setIsPlusOpen] = useState(false)
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [theme, setTheme] = useState<AdminTheme>(initialTheme)
  const pathname = usePathname()
  const router = useRouter()

  const plusRef = useDismiss(isPlusOpen, () => setIsPlusOpen(false))
  const userRef = useDismiss(isUserOpen, () => setIsUserOpen(false))

  // El tema se guarda en cookie para que el servidor lo pinte sin parpadeo en la siguiente carga
  const changeTheme = (next: AdminTheme) => {
    setTheme(next)
    document.cookie = `${ADMIN_THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
  }

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setIsDrawerOpen(false)
    setIsPlusOpen(false)
    setIsUserOpen(false)
  }, [pathname])

  // Bloquear scroll del body cuando el drawer esté abierto en móvil
  useEffect(() => {
    if (!isDrawerOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen])

  // Atajos: "/" o Ctrl/⌘+K abren el buscador; Escape cierra el drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      if (e.key === 'Escape' && isDrawerOpen) setIsDrawerOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen])

  const tabs = navItems.filter(item => TAB_HREFS.includes(item.href))
  const moreIsActive = !tabs.some(item => isNavItemActive(pathname, item.href, item.exact))
  const initial = (userEmail || 'A').trim().charAt(0).toUpperCase()
  const section = currentSectionLabel(pathname)

  return (
    <div className="admin-layout" data-theme={theme}>
      {/* 1. Menú lateral de escritorio (>= 861px) */}
      <aside className="admin-sidebar admin-sidebar--desktop">
        <div className="admin-sidebar__header">
          <Brand />
        </div>
        <AdminNavClient counts={counts} />
        <AdminSidebarFooterClient themeToggle={<AdminThemeToggle theme={theme} onChange={changeTheme} />} />
      </aside>

      {/* 2. Cabecera móvil (<= 860px) */}
      <header className="admin-mobile-header">
        <Brand />
        <div className="admin-mobile-header__actions">
          <button type="button" className="admin-icon-btn" onClick={() => setIsSearchOpen(true)} aria-label="Buscar">
            <Search size={18} />
          </button>
          <AdminThemeToggle theme={theme} onChange={changeTheme} variant="compact" />
        </div>
      </header>

      {/* 3. Drawer móvil con la navegación completa */}
      {isDrawerOpen && (
        <div className="admin-drawer">
          <div className="admin-drawer__backdrop" onClick={() => setIsDrawerOpen(false)} aria-hidden="true" />
          <aside className="admin-drawer__panel" role="dialog" aria-modal="true" aria-label="Menú de administración">
            <div className="admin-drawer__header">
              <Brand onClick={() => setIsDrawerOpen(false)} />
              <button type="button" className="admin-drawer__close" onClick={() => setIsDrawerOpen(false)} aria-label="Cerrar menú">
                <X size={20} />
              </button>
            </div>
            <div className="admin-drawer__nav-wrap">
              <AdminNavClient counts={counts} onNavigate={() => setIsDrawerOpen(false)} />
            </div>
            <AdminSidebarFooterClient
              showSignOut
              themeToggle={<AdminThemeToggle theme={theme} onChange={changeTheme} />}
            />
          </aside>
        </div>
      )}

      {/* 4. Contenido principal con barra superior */}
      <main className="admin-main">
        <div className="admin-topbar">
          <nav className="admin-crumb" aria-label="Ruta">
            <Link href="/admin" className="admin-crumb__home" aria-label="Inicio del panel">
              <Home size={18} />
            </Link>
            <span className="admin-crumb__current">{section}</span>
          </nav>

          <button type="button" className="admin-searchbox" onClick={() => setIsSearchOpen(true)}>
            <Search size={18} aria-hidden="true" />
            <span className="admin-searchbox__text">Buscar / Acceso rápido</span>
            <span className="admin-kbd" aria-hidden="true">/</span>
          </button>

          <div className="admin-topbar__actions">
            <div className="admin-pop" ref={plusRef}>
              <button
                type="button"
                className="admin-plus"
                aria-label="Acciones rápidas"
                aria-haspopup="menu"
                aria-expanded={isPlusOpen}
                onClick={() => { setIsPlusOpen(o => !o); setIsUserOpen(false) }}
              >
                <Plus size={22} />
              </button>
              {isPlusOpen && (
                <div className="admin-pop__menu" role="menu">
                  <div className="admin-pop__head">
                    <span className="admin-pop__title">Acciones rápidas</span>
                  </div>
                  {QUICK_ACTIONS.map(a => {
                    const Icon = a.icon
                    return (
                      <Link key={a.label} href={a.href as any} className="admin-pop__item" role="menuitem" onClick={() => setIsPlusOpen(false)}>
                        <span className="admin-pop__item-icon"><Icon size={16} /></span>
                        <span className="admin-pop__item-text">
                          {a.label}
                          <span className="admin-pop__sub">{a.hint}</span>
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            <span className="admin-topbar__divider" aria-hidden="true" />

            <div className="admin-pop" ref={userRef}>
              <button
                type="button"
                className="admin-avatar"
                aria-label="Menú de la cuenta"
                aria-haspopup="menu"
                aria-expanded={isUserOpen}
                onClick={() => { setIsUserOpen(o => !o); setIsPlusOpen(false) }}
              >
                {initial}
              </button>
              {isUserOpen && (
                <div className="admin-pop__menu" role="menu">
                  <div className="admin-pop__head">
                    <span className="admin-pop__title">{userEmail || 'Administrador'}</span>
                    <span className="admin-pop__sub">Administrador</span>
                  </div>
                  <Link href="/" target="_blank" className="admin-pop__item" role="menuitem">
                    <span className="admin-pop__item-icon"><Globe size={16} /></span>
                    Ver la web pública
                  </Link>
                  <button type="button" className="admin-pop__item admin-pop__item--danger" role="menuitem" onClick={() => signOutAdmin(router)}>
                    <span className="admin-pop__item-icon"><LogOut size={16} /></span>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

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

      <AdminCommandPalette open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  )
}
