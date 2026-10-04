'use client'

import { useState, useEffect } from 'react'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import {
  BookOpen,
  MapPin,
  Compass,
  UserCircle,
  LogOut,
  MessageCircle,
  FileText,
  ShieldCheck,
  Phone,
  LifeBuoy,
  X,
  ChevronRight,
  Globe,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { USER_THEME_COOKIE, type UserTheme } from '@/lib/user/theme'
import './user-shell.css'

interface Props {
  user: any
  profile: any
  initialTheme?: UserTheme
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  short: string
  icon: LucideIcon
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Mi reserva', short: 'Reserva', icon: BookOpen, exact: true },
  { href: '/dashboard/documentos', label: 'Documentos', short: 'Documentos', icon: FileText },
  { href: '/dashboard/guia', label: 'Guía de Mallorca', short: 'Guía', icon: MapPin },
  { href: '/dashboard/manual', label: 'Manual de la camper', short: 'Manual', icon: Compass },
  { href: '/dashboard/profile', label: 'Mi perfil', short: 'Perfil', icon: UserCircle },
]

const UTOPIA_PHONE = { href: 'tel:+34611560916', label: '+34 611 560 916' }
const ARAG_PHONE = { href: 'tel:+34662992060', label: '+34 662 992 060' }
const WHATSAPP_URL = 'https://wa.me/34611560916'

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}

function Brand() {
  return (
    <Link href="/dashboard" className="usr-brand">
      <span className="usr-brand__mark" aria-hidden="true">U</span>
      <span className="usr-brand__text">
        <span className="usr-brand__name">Utopia</span>
        <span className="usr-brand__tag">Mi viaje</span>
      </span>
    </Link>
  )
}

function ThemeToggle({ theme, onChange, variant }: { theme: UserTheme; onChange: (t: UserTheme) => void; variant: 'full' | 'compact' }) {
  const next: UserTheme = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'
  const Icon = theme === 'dark' ? Moon : Sun
  return (
    <button
      type="button"
      className={`usr-theme-toggle usr-theme-toggle--${variant}`}
      onClick={() => onChange(next)}
      aria-label={label}
      title={label}
    >
      <Icon size={variant === 'full' ? 14 : 18} aria-hidden="true" />
      {variant === 'full' && <span>{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>}
    </button>
  )
}

export default function DashboardNavClient({ user, profile, initialTheme = 'light', children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [theme, setTheme] = useState<UserTheme>(initialTheme)

  // El tema se guarda en cookie para que el servidor lo pinte sin parpadeo en la siguiente carga
  const changeTheme = (next: UserTheme) => {
    setTheme(next)
    document.cookie = `${USER_THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
  }

  // Bloquear el scroll del fondo mientras la hoja de ayuda está abierta
  useEffect(() => {
    if (!showHelp) return
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowHelp(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = orig
      window.removeEventListener('keydown', onKey)
    }
  }, [showHelp])

  useEffect(() => {
    setShowHelp(false)
  }, [pathname])

  const handleSignOut = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.refresh()
      router.push('/')
    } catch {
      window.location.href = '/es/auth/signout'
    }
  }

  const isVerified = profile?.verification_status === 'verified'
  const isPending = profile?.verification_status === 'pending'
  const isAdmin = profile?.role === 'admin' || user?.app_metadata?.role === 'admin'
  const displayName = profile?.full_name || 'Viajero Utopia'
  const initial = (profile?.full_name || user?.email || 'U').trim().charAt(0)

  const profileTag = isVerified
    ? { text: 'Validado', tone: 'sage' }
    : isPending
      ? { text: 'En revisión', tone: 'sky' }
      : { text: 'Pendiente', tone: 'amber' }

  return (
    <div className="user-layout" data-theme={theme}>
      {/* 1. Menú lateral de escritorio (>= 861px) */}
      <aside className="usr-sidebar" aria-label="Panel de cliente">
        <div className="usr-sidebar__header">
          <Brand />
        </div>

        <div className="usr-user">
          <div className="usr-avatar" aria-hidden="true">{initial}</div>
          <div className="usr-user__text">
            <span className="usr-user__name">{displayName}</span>
            <span className="usr-user__mail">{user?.email}</span>
          </div>
        </div>

        <nav className="usr-nav" aria-label="Secciones del panel">
          <span className="usr-nav__label">Tu viaje</span>
          <ul>
            {NAV_ITEMS.map(item => {
              const active = isActive(pathname, item)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`usr-nav__link ${active ? 'usr-nav__link--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={18} className="usr-nav__icon" aria-hidden="true" />
                    <span className="usr-nav__text">{item.label}</span>
                    {item.href === '/dashboard/profile' && (
                      <span className={`usr-tag usr-tag--${profileTag.tone}`}>{profileTag.text}</span>
                    )}
                  </Link>
                </li>
              )
            })}
            {isAdmin && (
              <li>
                <Link href="/admin" className="usr-nav__link usr-nav__link--admin">
                  <ShieldCheck size={18} className="usr-nav__icon" aria-hidden="true" />
                  <span className="usr-nav__text">Panel admin</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="usr-help">
          <span className="usr-help__head">
            <span className="usr-help__dot" aria-hidden="true" />
            Ayuda 24 h
          </span>
          <a href={UTOPIA_PHONE.href} className="usr-help__row">
            <span className="usr-help__icon"><Phone size={15} aria-hidden="true" /></span>
            <span className="usr-help__text">
              <span className="usr-help__name">Utopia Van Life</span>
              <span className="usr-help__phone">{UTOPIA_PHONE.label}</span>
            </span>
          </a>
          <a href={ARAG_PHONE.href} className="usr-help__row">
            <span className="usr-help__icon usr-help__icon--rose"><LifeBuoy size={15} aria-hidden="true" /></span>
            <span className="usr-help__text">
              <span className="usr-help__name">ARAG asistencia en ruta</span>
              <span className="usr-help__phone">{ARAG_PHONE.label}</span>
            </span>
          </a>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="usr-help__row">
            <span className="usr-help__icon usr-help__icon--sage"><MessageCircle size={15} aria-hidden="true" /></span>
            <span className="usr-help__text">
              <span className="usr-help__name">WhatsApp</span>
              <span className="usr-help__phone">Escríbenos</span>
            </span>
          </a>
        </div>

        <div className="usr-sidebar__footer">
          <div className="usr-footer-row">
            <span className="usr-footer-row__label">Tema</span>
            <ThemeToggle theme={theme} onChange={changeTheme} variant="full" />
          </div>
          <Link href="/" className="usr-footer-link">
            <Globe size={17} aria-hidden="true" />
            <span>Volver a la web</span>
          </Link>
          <button
            id="dashboard-logout-btn"
            type="button"
            onClick={handleSignOut}
            disabled={loggingOut}
            className="usr-footer-link usr-footer-link--danger"
          >
            <LogOut size={17} aria-hidden="true" />
            <span>{loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
          </button>
        </div>
      </aside>

      {/* 2. Cabecera móvil (<= 860px) */}
      <header className="usr-mobile-header">
        <Brand />
        <div className="usr-mobile-header__actions">
          <button
            id="dash-mob-sos-btn"
            type="button"
            className="usr-help-btn"
            onClick={() => setShowHelp(true)}
            aria-label="Ayuda y teléfonos 24 horas"
          >
            <span className="usr-help-btn__dot" aria-hidden="true" />
            Ayuda 24h
          </button>
          <ThemeToggle theme={theme} onChange={changeTheme} variant="compact" />
        </div>
      </header>

      {/* 3. Contenido */}
      <main className="usr-main">
        <div className="usr-main__inner">{children}</div>
      </main>

      {/* 4. Barra inferior flotante (<= 860px) */}
      <nav className="usr-tabbar" aria-label="Navegación principal">
        {NAV_ITEMS.map(item => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          const dot = item.href === '/dashboard/profile' && !isVerified
            ? (isPending ? 'sky' : 'amber')
            : null
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`usr-tabbar__item ${active ? 'usr-tabbar__item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="usr-tabbar__icon">
                <Icon size={20} aria-hidden="true" />
                {dot && <span className={`usr-tabbar__dot ${dot === 'sky' ? 'usr-tabbar__dot--sky' : ''}`} />}
              </span>
              <span className="usr-tabbar__label">{item.short}</span>
            </Link>
          )
        })}
      </nav>

      {/* 5. Hoja de ayuda 24 h */}
      {showHelp && (
        <div className="usr-sheet" onClick={() => setShowHelp(false)}>
          <div
            className="usr-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="usr-help-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="usr-sheet__grabber" aria-hidden="true" />
            <div className="usr-sheet__head">
              <div>
                <h2 id="usr-help-title" className="usr-sheet__title">Ayuda 24 horas</h2>
                <p className="usr-sheet__sub">Estamos contigo durante todo el viaje.</p>
              </div>
              <button type="button" className="usr-icon-btn" onClick={() => setShowHelp(false)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="usr-sheet__body">
              <a href={UTOPIA_PHONE.href} className="usr-contact">
                <span className="usr-contact__icon"><Phone size={18} aria-hidden="true" /></span>
                <span className="usr-contact__text">
                  <span className="usr-contact__tag">Utopia Van Life</span>
                  <strong className="usr-contact__value">{UTOPIA_PHONE.label}</strong>
                  <span className="usr-contact__hint">Entregas, check-in y cualquier duda</span>
                </span>
                <ChevronRight size={18} className="usr-contact__arrow" aria-hidden="true" />
              </a>
              <a href={ARAG_PHONE.href} className="usr-contact">
                <span className="usr-contact__icon usr-contact__icon--rose"><LifeBuoy size={18} aria-hidden="true" /></span>
                <span className="usr-contact__text">
                  <span className="usr-contact__tag">ARAG · asistencia en ruta</span>
                  <strong className="usr-contact__value">{ARAG_PHONE.label}</strong>
                  <span className="usr-contact__hint">Avería, pinchazo o grúa en la isla</span>
                </span>
                <ChevronRight size={18} className="usr-contact__arrow" aria-hidden="true" />
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="usr-contact">
                <span className="usr-contact__icon usr-contact__icon--sage"><MessageCircle size={18} aria-hidden="true" /></span>
                <span className="usr-contact__text">
                  <span className="usr-contact__tag">WhatsApp</span>
                  <strong className="usr-contact__value">Chat directo</strong>
                  <span className="usr-contact__hint">Envíanos fotos o vídeos de cualquier duda</span>
                </span>
                <ChevronRight size={18} className="usr-contact__arrow" aria-hidden="true" />
              </a>
              {isAdmin && (
                <Link href="/admin" className="usr-contact">
                  <span className="usr-contact__icon"><ShieldCheck size={18} aria-hidden="true" /></span>
                  <span className="usr-contact__text">
                    <span className="usr-contact__tag">Equipo</span>
                    <strong className="usr-contact__value">Panel admin</strong>
                  </span>
                  <ChevronRight size={18} className="usr-contact__arrow" aria-hidden="true" />
                </Link>
              )}
              <Link href="/" className="usr-contact">
                <span className="usr-contact__icon usr-contact__icon--sage"><Globe size={18} aria-hidden="true" /></span>
                <span className="usr-contact__text">
                  <span className="usr-contact__tag">Utopia Van Life</span>
                  <strong className="usr-contact__value">Volver a la web</strong>
                </span>
                <ChevronRight size={18} className="usr-contact__arrow" aria-hidden="true" />
              </Link>
              <button
                id="dash-mob-logout-btn"
                type="button"
                className="usr-btn usr-btn--block"
                onClick={handleSignOut}
                disabled={loggingOut}
              >
                <LogOut size={16} aria-hidden="true" />
                {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
