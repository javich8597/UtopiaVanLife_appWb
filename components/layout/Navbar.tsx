'use client'

import { useState, useEffect } from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from './LanguageSwitcher'

interface NavbarProps {
  variant?: 'light' | 'dark'
}

export default function Navbar({ variant }: NavbarProps) {
  const t = useTranslations('Navigation')
  const pathname = usePathname()
  const isHomePage = pathname === '/' || pathname === ''
  const isDark = variant ? variant === 'dark' : (isHomePage || pathname?.includes('/campers/'))

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()

      const checkUser = async (u: any) => {
        setUser(u)
        if (!u) {
          setIsAdmin(false)
          return
        }
        if (u.email === 'javipn85@gmail.com' || u.user_metadata?.is_admin === 'true') {
          setIsAdmin(true)
          return
        }
        const { data: dbUser } = await supabase.from('users').select('role').eq('id', u.id).maybeSingle()
        setIsAdmin(dbUser?.role === 'admin')
      }

      supabase.auth.getUser().then(({ data }) => {
        checkUser(data?.user || null)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        checkUser(session?.user || null)
      })

      return () => subscription.unsubscribe()
    })
  }, [])

  return (
    <>
      <nav className={`navbar ${isDark ? 'navbar--dark' : ''} ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner container">
          {/* Logo */}
          <Link href="/" className="navbar__logo">
            <img
              src={isDark ? "/images/logo-white.png" : "/images/logo.png"}
              alt="Utopia Van Life"
              style={{ height: '42px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </Link>

          {/* Desktop links */}
          <ul className="navbar__links hide-mobile">
            <li><Link href="/" className="navbar__link">{t('home')}</Link></li>
            <li><Link href="/campers" className="navbar__link">{t('campers')}</Link></li>
            <li><Link href="/conocenos" className="navbar__link">{t('about')}</Link></li>
            <li><Link href="/venta" className="navbar__link">{t('venta')}</Link></li>
            <li><Link href="/contacto" className="navbar__link">{t('contact')}</Link></li>
            <li><Link href="/#faqs" className="navbar__link">{t('faq')}</Link></li>
          </ul>

          {/* CTA + Menu */}
          <div className="navbar__actions">
            {/* Discreet Language Switcher */}
            <LanguageSwitcher isSolid={!isDark} isDark={isDark} />

            {isAdmin && (
              <Link
                href="/admin"
                className="btn btn-outline btn-sm hide-mobile"
                style={{
                  borderColor: isDark ? '#E5C07B' : 'var(--forest-green)',
                  color: isDark ? '#E5C07B' : 'var(--forest-green)',
                  fontWeight: 700
                }}
              >
                Panel Admin
              </Link>
            )}
            {user ? (
              <Link
                href="/dashboard"
                className="btn btn-ghost btn-sm hide-mobile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                  color: isDark ? 'rgba(255, 255, 255, 0.9)' : undefined
                }}
              >
                Mi Aventura
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="btn btn-ghost btn-sm hide-mobile"
                style={{ color: isDark ? 'rgba(255, 255, 255, 0.85)' : undefined }}
              >
                {t('login')}
              </Link>
            )}
            <Link
              href="/campers"
              className="btn btn-sm"
              style={isDark ? {
                background: 'linear-gradient(135deg, #E5C07B 0%, #C8A882 100%)',
                color: '#0B0D11',
                fontWeight: 700,
                border: 'none',
                boxShadow: '0 4px 14px rgba(229, 192, 123, 0.3)'
              } : {}}
            >
              Reservar
            </Link>
            <button
              className="navbar__burger hide-desktop"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menú"
              style={isDark ? { color: 'white', background: 'rgba(255, 255, 255, 0.08)' } : {}}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={`mobile-menu ${isDark ? 'mobile-menu--dark' : ''}`} onClick={() => setMenuOpen(false)}>
          <nav className="mobile-menu__nav" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu__header">
              <Link href="/" onClick={() => setMenuOpen(false)} style={{ display: 'block', flex: 1, paddingRight: '12px' }}>
                <img
                  src={isDark ? "/images/logo-white.png" : "/images/logo-bold.png"}
                  alt="Utopia Van Life"
                  style={{
                    height: 'auto',
                    width: '100%',
                    maxHeight: '75px',
                    objectFit: 'contain',
                    objectPosition: 'left center',
                    display: 'block'
                  }}
                />
              </Link>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  borderRadius: '8px',
                  color: isDark ? '#FFFFFF' : 'var(--black-matte)',
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.04)',
                  flexShrink: 0
                }}
              >
                <X size={24} />
              </button>
            </div>
            <ul className="mobile-menu__links">
              <li><Link href="/" onClick={() => setMenuOpen(false)}>{t('home')}</Link></li>
              <li><Link href="/campers" onClick={() => setMenuOpen(false)}>{t('campers')}</Link></li>
              <li><Link href="/conocenos" onClick={() => setMenuOpen(false)}>{t('about')}</Link></li>
              <li><Link href="/venta" onClick={() => setMenuOpen(false)}>{t('venta')}</Link></li>
              <li><Link href="/contacto" onClick={() => setMenuOpen(false)}>{t('contact')}</Link></li>
              <li><Link href="/#faqs" onClick={() => setMenuOpen(false)}>{t('faq')}</Link></li>
              {isAdmin && (
                <li><Link href="/admin" onClick={() => setMenuOpen(false)} style={{ color: 'var(--forest-green)', fontWeight: 700 }}>🛡️ Panel Admin</Link></li>
              )}
              {user ? (
                <li><Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: 'var(--forest-green)', fontWeight: 600 }}>Mi Aventura</Link></li>
              ) : (
                <li><Link href="/auth/login" onClick={() => setMenuOpen(false)}>{t('login')}</Link></li>
              )}
            </ul>

            {/* Mobile language switcher */}
            <LanguageSwitcher isMobile />

            <Link href="/campers" className="btn btn-forest btn-lg" style={{ width: '100%', marginTop: 8 }}
              onClick={() => setMenuOpen(false)}>
              {t('bookNow')}
            </Link>
          </nav>
        </div>
      )}

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: var(--z-navbar);
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 1px 20px rgba(26, 26, 26, 0.06);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          transition: background var(--transition-base), box-shadow var(--transition-base);
        }
        .navbar--scrolled {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 1px 20px rgba(26, 26, 26, 0.06);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .navbar--dark {
          background: rgba(11, 13, 17, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }
        .navbar--dark.navbar--scrolled {
          background: rgba(11, 13, 17, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }
        .navbar--dark .navbar__link {
          color: rgba(255, 255, 255, 0.85);
        }
        .navbar--dark .navbar__link:hover {
          color: #E5C07B;
          opacity: 1;
        }
        .navbar--dark .btn-ghost {
          color: rgba(255, 255, 255, 0.85);
        }
        .navbar--dark .btn-ghost:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #FFFFFF;
        }
        .navbar__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 72px;
        }
        .navbar__logo {
          display: flex;
          flex-direction: column;
          line-height: 1;
          gap: 1px;
        }
        .navbar__links {
          display: flex;
          align-items: center;
          gap: var(--space-8);
        }
        .navbar__link {
          font-size: 0.9rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: var(--black-matte);
          transition: opacity var(--transition-fast), color var(--transition-fast);
          opacity: 0.9;
        }
        .navbar__link:hover { 
          opacity: 1; 
          color: var(--forest-green);
        }
        .navbar__actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .navbar__burger {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px; height: 40px;
          border-radius: var(--radius-md);
          transition: background var(--transition-fast);
          color: var(--black-matte);
        }
        .navbar__burger:hover { background: var(--gray-100); }

        /* Mobile menu */
        .mobile-menu {
          position: fixed;
          inset: 0;
          background: rgba(26,26,26,0.5);
          z-index: calc(var(--z-navbar) + 10);
          display: flex;
          justify-content: flex-end;
        }
        .mobile-menu__nav {
          width: min(340px, 90vw);
          height: 100%;
          background: var(--white-broken);
          display: flex;
          flex-direction: column;
          padding: 0.75rem 1.25rem 1.5rem 1.25rem;
          gap: var(--space-4);
          animation: slideFromRight 0.25s ease;
        }
        @keyframes slideFromRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .mobile-menu__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0 0.65rem 0;
          margin-bottom: 0.25rem;
          border-bottom: 1px solid var(--gray-200);
        }
        .mobile-menu__links {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          flex: 1;
        }
        .mobile-menu__links li a {
          display: block;
          padding: var(--space-3) var(--space-2);
          font-size: 1.1rem;
          font-weight: 500;
          border-radius: var(--radius-md);
          transition: background var(--transition-fast);
        }
        .mobile-menu__links li a:hover { background: var(--gray-100); }

        .mobile-menu--dark .mobile-menu__nav {
          background: #0F1115;
          color: white;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }
        .mobile-menu--dark .mobile-menu__header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .mobile-menu--dark .mobile-menu__links li a {
          color: rgba(255, 255, 255, 0.9);
        }
        .mobile-menu--dark .mobile-menu__links li a:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #E5C07B;
        }
      `}</style>
    </>
  )
}
