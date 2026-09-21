'use client'

import React, { useState, useEffect } from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { Menu, X, Globe, Sparkles } from 'lucide-react'
import AdminNavClient from './AdminNavClient'
import AdminSidebarFooterClient from './AdminSidebarFooterClient'

interface Props {
  userEmail?: string
  children: React.ReactNode
}

export default function AdminResponsiveShell({ userEmail, children }: Props) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar drawer al cambiar de ruta
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [pathname])

  // Bloquear scroll del body cuando el drawer esté abierto en móvil
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen])

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen])

  return (
    <div className="admin-layout">
      {/* 1. Sidebar Fijo de Escritorio (>= 1024px) */}
      <aside className="admin-sidebar admin-sidebar--desktop">
        <div className="admin-sidebar__header">
          <Link href="/admin" className="navbar__logo" style={{ color: 'white' }}>
            <span className="navbar__logo-text" style={{ color: 'white' }}>Utopia Admin</span>
            <span className="navbar__logo-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>Backoffice</span>
          </Link>
        </div>

        <AdminNavClient />

        <AdminSidebarFooterClient email={userEmail} />
      </aside>

      {/* 2. Cabecera Móvil Sticky (< 1024px) */}
      <header className="admin-mobile-header">
        <div className="admin-mobile-header__left">
          <button
            type="button"
            className="admin-mobile-header__toggle"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Abrir menú de administración"
            aria-expanded={isDrawerOpen}
          >
            <Menu size={22} />
          </button>

          <Link href="/admin" className="admin-mobile-header__brand">
            <span className="admin-mobile-header__title">Utopia Admin</span>
            <span className="admin-mobile-header__badge">Panel</span>
          </Link>
        </div>

        <div className="admin-mobile-header__right">
          <Link
            href="/"
            target="_blank"
            className="admin-mobile-header__link"
            title="Ver Sitio Web Público"
          >
            <Globe size={16} />
            <span className="admin-mobile-header__link-text">Ver Web</span>
          </Link>
        </div>
      </header>

      {/* 3. Mobile Drawer & Backdrop (< 1024px) */}
      {isDrawerOpen && (
        <div className="admin-drawer">
          {/* Backdrop con Blur */}
          <div
            className="admin-drawer__backdrop"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel Deslizante */}
          <aside
            className="admin-drawer__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de Navegación Móvil"
          >
            <div className="admin-drawer__header">
              <Link href="/admin" onClick={() => setIsDrawerOpen(false)} className="navbar__logo" style={{ color: 'white' }}>
                <span className="navbar__logo-text" style={{ color: 'white' }}>Utopia Admin</span>
                <span className="navbar__logo-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>Backoffice</span>
              </Link>

              <button
                type="button"
                className="admin-drawer__close"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Cerrar menú"
              >
                <X size={22} />
              </button>
            </div>

            <div className="admin-drawer__nav-wrap">
              <AdminNavClient onNavigate={() => setIsDrawerOpen(false)} />
            </div>

            <div className="admin-drawer__footer">
              <AdminSidebarFooterClient email={userEmail} />
            </div>
          </aside>
        </div>
      )}

      {/* 4. Contenido Principal */}
      <main className="admin-main">
        <div className="admin-main__inner">
          {children}
        </div>
      </main>
    </div>
  )
}
