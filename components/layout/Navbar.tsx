'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setUser(data.user)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null)
      })

      return () => subscription.unsubscribe()
    })
  }, [])

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : 'navbar--transparent'}`}>
        <div className="navbar__inner container">
          {/* Logo */}
          <Link href="/" className="navbar__logo">
            <span className="navbar__logo-text">Utopia</span>
            <span className="navbar__logo-sub">Van Life</span>
          </Link>

          {/* Desktop links */}
          <ul className="navbar__links hide-mobile">
            <li><Link href="/campers" className="navbar__link">Campers</Link></li>
            <li><Link href="/#experiences" className="navbar__link">Experiencias</Link></li>
            <li><Link href="/#faqs" className="navbar__link">FAQs</Link></li>
          </ul>

          {/* CTA + Menu */}
          <div className="navbar__actions">
            {user ? (
              <Link href="/dashboard" className="btn btn-ghost btn-sm hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Mi Aventura
              </Link>
            ) : (
              <Link href="/auth/login" className="btn btn-ghost btn-sm hide-mobile">
                Entrar
              </Link>
            )}
            <Link href="/campers" className="btn btn-forest btn-sm">
              Reservar
            </Link>
            <button
              className="navbar__burger hide-desktop"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menú"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <nav className="mobile-menu__nav" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu__header">
              <span className="navbar__logo-text">Utopia Van Life</span>
              <button onClick={() => setMenuOpen(false)} aria-label="Cerrar"><X size={22} /></button>
            </div>
            <ul className="mobile-menu__links">
              <li><Link href="/campers" onClick={() => setMenuOpen(false)}>Campers</Link></li>
              <li><Link href="/#experiences" onClick={() => setMenuOpen(false)}>Experiencias</Link></li>
              <li><Link href="/#faqs" onClick={() => setMenuOpen(false)}>FAQs</Link></li>
              {user ? (
                <li><Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: 'var(--forest-green)' }}>Mi Aventura</Link></li>
              ) : (
                <li><Link href="/auth/login" onClick={() => setMenuOpen(false)}>Entrar</Link></li>
              )}
            </ul>
            <Link href="/campers" className="btn btn-forest btn-lg" style={{ width: '100%', marginTop: 'auto' }}
              onClick={() => setMenuOpen(false)}>
              Reservar ahora
            </Link>
          </nav>
        </div>
      )}

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: var(--z-navbar);
          transition: background var(--transition-base), box-shadow var(--transition-base);
        }
        .navbar--transparent {
          background: transparent;
        }
        .navbar--scrolled {
          background: rgba(245,245,243,0.88);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 1px 24px rgba(26,26,26,0.08);
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
        .navbar__logo-text {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: var(--navbar--transparent) ? white : var(--black-matte);
          transition: color var(--transition-base);
        }
        .navbar--transparent .navbar__logo-text { color: white; }
        .navbar--scrolled .navbar__logo-text { color: var(--black-matte); }
        .navbar__logo-sub {
          font-family: var(--font-sans);
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          opacity: 0.65;
        }
        .navbar--transparent .navbar__logo-sub { color: rgba(255,255,255,0.8); }
        .navbar--scrolled .navbar__logo-sub { color: var(--gray-600); }
        .navbar__links {
          display: flex;
          align-items: center;
          gap: var(--space-8);
        }
        .navbar__link {
          font-size: 0.9rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          transition: opacity var(--transition-fast);
          opacity: 0.85;
        }
        .navbar__link:hover { opacity: 1; }
        .navbar--transparent .navbar__link { color: rgba(255,255,255,0.9); }
        .navbar--scrolled .navbar__link { color: var(--black-matte); }
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
          color: white;
        }
        .navbar--scrolled .navbar__burger { color: var(--black-matte); }
        .navbar__burger:hover { background: rgba(255,255,255,0.15); }
        .navbar--scrolled .navbar__burger:hover { background: var(--gray-100); }

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
          padding: var(--space-6);
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
          padding-bottom: var(--space-4);
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
      `}</style>
    </>
  )
}
