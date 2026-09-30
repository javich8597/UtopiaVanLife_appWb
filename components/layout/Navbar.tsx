'use client'

import { useState, useEffect, useRef } from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { Menu, X, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from './LanguageSwitcher'

export default function Navbar() {
  const t = useTranslations('Navigation')
  const pathname = usePathname()

  const [isNavVisible, setIsNavVisible] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const lastScrollY = useRef(0)

  // Smart Auto-Hide: smoothly slide out on scroll down, glide back on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // At top of page: always visible and transparent-tinted
      if (currentScrollY <= 40) {
        setIsNavVisible(true)
        setIsScrolled(false)
      } else {
        setIsScrolled(true)
        const diff = currentScrollY - lastScrollY.current

        // Scroll down (> 8px past 80px) -> hide navbar to let user immerse in content
        if (diff > 8 && currentScrollY > 80) {
          setIsNavVisible(false)
        }
        // Scroll up (> 6px) -> reveal navbar immediately for fluid navigation
        else if (diff < -6) {
          setIsNavVisible(true)
        }
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Lock body scroll while mobile menu is open (AGENTS.md Rule 5)
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

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
      <nav
        className={`navbar ${isScrolled ? 'navbar--scrolled' : ''} ${!isNavVisible && !menuOpen ? 'navbar--hidden' : ''}`}
        aria-label="Navegación principal"
      >
        <div className="navbar__inner container">
          {/* Logo */}
          <Link href="/" className="navbar__logo" aria-label="Utopia Van Life Inicio">
            <img
              src="/images/logo.png"
              alt="Utopia Van Life"
              className="navbar__logo-img"
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
            <LanguageSwitcher isSolid={true} />

            {isAdmin && (
              <Link href="/admin" className="btn btn-outline btn-sm hide-mobile navbar__admin-btn">
                Panel Admin
              </Link>
            )}
            {user ? (
              <Link href="/dashboard" className="btn btn-ghost btn-sm hide-mobile navbar__user-btn">
                Mi Aventura
              </Link>
            ) : (
              <Link href="/auth/login" className="btn btn-ghost btn-sm hide-mobile">
                {t('login')}
              </Link>
            )}

            {/* Senior Button-in-Button CTA */}
            <Link href="/campers" className="navbar__cta-btn">
              <span>Reservar</span>
              <span className="navbar__cta-icon-circle">
                <ArrowRight size={13} className="navbar__cta-arrow" />
              </span>
            </Link>

            <button
              className="navbar__burger hide-desktop"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu modal */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <nav className="mobile-menu__nav" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu__header">
              <Link href="/" onClick={() => setMenuOpen(false)} className="mobile-menu__logo-link">
                <img
                  src="/images/logo.png"
                  alt="Utopia Van Life"
                  className="mobile-menu__logo-img"
                />
              </Link>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar"
                className="mobile-menu__close-btn"
              >
                <X size={22} />
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
                <li><Link href="/admin" onClick={() => setMenuOpen(false)} className="mobile-menu__link--admin">🛡️ Panel Admin</Link></li>
              )}
              {user ? (
                <li><Link href="/dashboard" onClick={() => setMenuOpen(false)} className="mobile-menu__link--user">Mi Aventura</Link></li>
              ) : (
                <li><Link href="/auth/login" onClick={() => setMenuOpen(false)}>{t('login')}</Link></li>
              )}
            </ul>

            {/* Mobile language switcher */}
            <LanguageSwitcher isMobile />

            <Link
              href="/campers"
              className="navbar__cta-btn mobile-menu__book-btn"
              onClick={() => setMenuOpen(false)}
            >
              <span>{t('bookNow')}</span>
              <span className="navbar__cta-icon-circle">
                <ArrowRight size={14} className="navbar__cta-arrow" />
              </span>
            </Link>
          </nav>
        </div>
      )}

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: var(--z-navbar);
          background: rgba(251, 249, 245, 0.94);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(212, 195, 179, 0.4);
          transform: translateY(0);
          transition: transform 280ms cubic-bezier(0.23, 1, 0.32, 1),
                      background-color 220ms ease,
                      box-shadow 220ms ease,
                      border-color 220ms ease;
          will-change: transform;
        }
        .navbar--scrolled {
          background: rgba(251, 249, 245, 0.98);
          border-bottom: 1px solid rgba(212, 195, 179, 0.55);
          box-shadow: 0 4px 20px -2px rgba(24, 36, 27, 0.07);
        }
        .navbar--hidden {
          transform: translateY(-100%);
        }
        .navbar__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 72px;
        }
        .navbar__logo {
          display: flex;
          align-items: center;
          line-height: 1;
          flex-shrink: 0;
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .navbar__logo:active {
          transform: scale(0.97);
        }
        .navbar__logo-img {
          height: 60px;
          width: auto;
          max-width: 200px;
          object-fit: contain;
          display: block;
        }

        .navbar__links {
          display: flex;
          align-items: center;
          gap: var(--space-6);
        }
        .navbar :global(.navbar__link) {
          font-size: 0.88rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: var(--black-matte);
          transition: color 160ms ease, opacity 160ms ease;
          opacity: 0.85;
          position: relative;
          padding-bottom: 2px;
        }
        .navbar :global(.navbar__link:hover) { 
          opacity: 1; 
          color: var(--forest-green);
        }
        .navbar :global(.navbar__link)::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 100%;
          height: 1.5px;
          background: var(--sand-dark);
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .navbar :global(.navbar__link:hover)::after {
          transform: scaleX(1);
          transform-origin: left;
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
          width: 42px; height: 42px;
          border-radius: var(--radius-md);
          transition: background var(--transition-fast), transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
          color: var(--black-matte);
        }
        .navbar__burger:hover { background: rgba(0, 0, 0, 0.05); }
        .navbar__burger:active { transform: scale(0.95); }

        .navbar :global(.navbar__admin-btn) {
          border-color: var(--forest-green);
          color: var(--forest-green);
          font-weight: 700;
          padding: 6px 14px;
        }
        .navbar :global(.navbar__user-btn) {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          padding: 6px 14px;
        }

        /* Senior Button-in-Button CTA */
        .navbar :global(.navbar__cta-btn) {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 7px 7px 7px 18px;
          background: var(--forest-green);
          color: #FBF9F5 !important;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          white-space: nowrap;
          flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(24, 36, 27, 0.2);
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
                      background-color 160ms ease,
                      box-shadow 160ms ease;
          user-select: none;
          -webkit-user-select: none;
          text-decoration: none;
        }
        .navbar :global(.navbar__cta-btn:hover) {
          background: var(--forest-green-light);
          box-shadow: 0 4px 16px rgba(24, 36, 27, 0.28);
        }
        .navbar :global(.navbar__cta-btn:active) {
          transform: scale(0.97);
        }
        .navbar__cta-icon-circle {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease;
          flex-shrink: 0;
        }
        .navbar :global(.navbar__cta-btn:hover) .navbar__cta-icon-circle {
          background: rgba(255, 255, 255, 0.26);
          transform: scale(1.05);
        }
        :global(.navbar__cta-arrow) {
          color: #FBF9F5;
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .navbar :global(.navbar__cta-btn:hover) :global(.navbar__cta-arrow) {
          transform: translateX(2px);
        }

        /* Mobile menu modal */
        .mobile-menu {
          position: fixed;
          inset: 0;
          background: rgba(18, 24, 19, 0.58);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: calc(var(--z-navbar) + 10);
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 200ms ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .mobile-menu__nav {
          width: min(340px, 90vw);
          height: 100%;
          background: #FAF8F5;
          display: flex;
          flex-direction: column;
          padding: 0.85rem 1.25rem 1.75rem 1.25rem;
          gap: var(--space-4);
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
          animation: slideFromRight 260ms cubic-bezier(0.23, 1, 0.32, 1);
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
        .mobile-menu :global(.mobile-menu__logo-link) {
          display: block;
          flex: 1;
          padding-right: 12px;
        }
        .mobile-menu__logo-img {
          height: auto;
          width: 100%;
          max-height: 70px;
          object-fit: contain;
          object-position: left center;
          display: block;
        }
        .mobile-menu__close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 8px;
          color: var(--black-matte);
          background: rgba(0, 0, 0, 0.05);
          flex-shrink: 0;
          transition: background 150ms ease;
        }
        .mobile-menu__close-btn:hover {
          background: rgba(0, 0, 0, 0.1);
        }
        .mobile-menu__links {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          flex: 1;
          overflow-y: auto;
        }
        .mobile-menu :global(.mobile-menu__links li a) {
          display: block;
          padding: 12px 14px;
          font-size: 1.05rem;
          font-weight: 500;
          color: var(--black-matte);
          border-radius: var(--radius-md);
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .mobile-menu :global(.mobile-menu__links li a:hover) { 
          background: rgba(0, 0, 0, 0.04);
          color: var(--forest-green);
        }
        .mobile-menu :global(.mobile-menu__link--admin) {
          color: var(--forest-green);
          font-weight: 700;
        }
        .mobile-menu :global(.mobile-menu__link--user) {
          color: var(--forest-green);
          font-weight: 600;
        }
        .mobile-menu :global(.mobile-menu__book-btn) {
          width: 100%;
          justify-content: center;
          padding: 12px 20px;
          font-size: 0.95rem;
          margin-top: 8px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1100px) and (min-width: 861px) {
          .navbar__logo-img {
            height: 38px;
            max-width: 130px;
          }
          .navbar__links {
            gap: var(--space-4);
          }
        }

        @media (max-width: 860px) {
          .navbar__inner {
            height: 68px;
          }
          .navbar__logo-img {
            height: 36px;
            max-width: 125px;
          }
        }

        @media (max-width: 640px) {
          .navbar__inner {
            height: 64px;
          }
          .navbar__logo-img {
            height: 34px;
            max-width: 120px;
          }
          .navbar :global(.navbar__cta-btn) {
            display: none;
          }
          .navbar__actions {
            gap: 6px;
          }
        }
      `}</style>
    </>
  )
}
