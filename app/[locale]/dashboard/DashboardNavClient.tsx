'use client'

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
  PhoneCall,
  X,
  ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface Props {
  user: any
  profile: any
}

export default function DashboardNavClient({ user, profile }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)

  // Bloquear scroll de la página al abrir el modal SOS en móvil
  useEffect(() => {
    if (showEmergencyModal) {
      const orig = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = orig
      }
    }
  }, [showEmergencyModal])

  const isReservations = pathname === '/dashboard'
  const isDocuments = pathname.startsWith('/dashboard/documentos')
  const isGuide = pathname.startsWith('/dashboard/guia')
  const isManual = pathname.startsWith('/dashboard/manual')
  const isProfile = pathname.startsWith('/dashboard/profile')

  const handleClientSignOut = async (e: React.MouseEvent) => {
    e.preventDefault()
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
  const isAdmin = profile?.role === 'admin' || user?.email === 'javipn85@gmail.com' || user?.user_metadata?.is_admin === 'true'

  return (
    <>
      {/* ─── 1. VISTA ESCRITORIO (SIDEBAR FIJO >= 861px) ─── */}
      <aside className="dashboard-sidebar dashboard-sidebar--desktop">
        <div className="user-card">
          <div className="user-avatar">
            {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--black-matte)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || 'Viajero Utopia'}
            </div>
            <div className="text-xs" style={{ color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
          </div>
        </div>

        <div className="sidebar-links">
          {isAdmin && (
            <Link 
              href="/admin" 
              className="sidebar-link"
              style={{ 
                background: 'linear-gradient(135deg, #1A2B21 0%, #2D4A39 100%)', 
                color: '#FFFFFF', 
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                boxShadow: '0 2px 6px rgba(26, 43, 33, 0.15)',
                marginBottom: 4,
              }}
            >
              <ShieldCheck size={18} style={{ color: '#A7F3D0' }} />
              <span>Panel Admin</span>
              <span className="sidebar-pill" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}>Backoffice</span>
            </Link>
          )}

          <Link 
            href="/dashboard" 
            className={`sidebar-link ${isReservations ? 'sidebar-link--active' : ''}`}
          >
            <BookOpen size={18} />
            <span>Mi Reserva</span>
          </Link>

          <Link 
            href="/dashboard/documentos" 
            className={`sidebar-link ${isDocuments ? 'sidebar-link--active' : ''}`}
          >
            <FileText size={18} />
            <span>Documentos</span>
            <span className="sidebar-pill">PDF</span>
          </Link>

          <Link 
            href="/dashboard/guia" 
            className={`sidebar-link ${isGuide ? 'sidebar-link--active' : ''}`}
          >
            <MapPin size={18} />
            <span>Guía Mallorca</span>
            <span className="sidebar-pill">Rutas</span>
          </Link>

          <Link 
            href="/dashboard/manual" 
            className={`sidebar-link ${isManual ? 'sidebar-link--active' : ''}`}
          >
            <Compass size={18} />
            <span>Manual Camper</span>
          </Link>

          <Link 
            href="/dashboard/profile" 
            className={`sidebar-link ${isProfile ? 'sidebar-link--active' : ''}`}
          >
            <UserCircle size={18} />
            <span>Perfil & Carnet</span>
            {!isVerified && !isPending && (
              <span className="sidebar-badge sidebar-badge--warning">Pendiente</span>
            )}
            {isPending && (
              <span className="sidebar-badge sidebar-badge--info">En revisión</span>
            )}
            {isVerified && (
              <span className="sidebar-badge sidebar-badge--success">✓</span>
            )}
          </Link>
        </div>

        {/* Emergency & Support Card */}
        <div className="sidebar-support-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div className="support-dot" />
            <span className="text-xs" style={{ fontWeight: 700, color: 'var(--forest-green)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Emergencias & Ayuda
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Utopia Van Life */}
            <a 
              href="tel:+34611560916" 
              className="sidebar-emergency-btn"
              title="Llamar a Utopia Van Life"
            >
              <Phone size={13} style={{ color: 'var(--forest-green)' }} />
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '0.72rem', color: 'var(--black-matte)' }}>UTOPIA VAN LIFE</strong>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--forest-green)' }}>+34 611 560 916</span>
              </div>
            </a>

            {/* ARAG Asistencia 24h */}
            <a 
              href="tel:+34662992060" 
              className="sidebar-emergency-btn sidebar-emergency-btn--arag"
              title="Llamar a ARAG Asistencia 24h"
            >
              <LifeBuoy size={13} style={{ color: '#dc2626' }} />
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '0.72rem', color: '#991b1b' }}>ARAG ASISTENCIA 24H</strong>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>+34 662 992 060</span>
              </div>
            </a>
          </div>

          <a 
            href="https://wa.me/34611560916" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, fontSize: '0.72rem', color: 'var(--gray-600)', textDecoration: 'none' }}
          >
            <MessageCircle size={12} style={{ color: '#16a34a' }} />
            <span>Abrir WhatsApp Utopia</span>
          </a>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--gray-200)' }}>
          <button 
            onClick={handleClientSignOut}
            disabled={loggingOut}
            className="sidebar-link" 
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gray-500)', padding: 'var(--space-2) var(--space-3)' }}
          >
            <LogOut size={16} />
            <span style={{ fontSize: '0.85rem' }}>{loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
          </button>
        </div>
      </aside>

      {/* ─── 2. VISTA MÓVIL (HORIZONTAL APP-BAR <= 860px) ─── */}
      <nav className="dashboard-mobile-nav" aria-label="Navegación Móvil de Usuario">
        {/* Fila superior compacta de usuario */}
        <div className="dash-mob-header">
          <div className="dash-mob-user">
            <div className="dash-mob-avatar">
              {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
            </div>
            <div className="dash-mob-user-info">
              <span className="dash-mob-user-name">
                {profile?.full_name?.split(' ')[0] || 'Viajero'}
              </span>
              {isVerified && (
                <span className="dash-mob-chip dash-mob-chip--verified">
                  ✓ Validado
                </span>
              )}
              {isPending && (
                <span className="dash-mob-chip dash-mob-chip--pending">
                  En revisión
                </span>
              )}
              {!isVerified && !isPending && (
                <span className="dash-mob-chip dash-mob-chip--warning">
                  Sin carnet
                </span>
              )}
            </div>
          </div>

          <div className="dash-mob-actions">
            <button
              type="button"
              onClick={() => setShowEmergencyModal(true)}
              className="dash-mob-sos-btn"
              title="Asistencia y teléfonos 24h"
            >
              <PhoneCall size={14} />
              <span>Ayuda 24h</span>
            </button>

            <button
              type="button"
              onClick={handleClientSignOut}
              disabled={loggingOut}
              className="dash-mob-logout-btn"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Carrusel Horizontal de Pestañas Táctiles */}
        <div className="dash-mob-tabs-container">
          <div className="dash-mob-tabs">
            {isAdmin && (
              <Link
                href="/admin"
                className="dash-mob-tab dash-mob-tab--admin"
              >
                <ShieldCheck size={16} />
                <span>Panel Admin</span>
              </Link>
            )}

            <Link
              href="/dashboard"
              className={`dash-mob-tab ${isReservations ? 'dash-mob-tab--active' : ''}`}
            >
              <BookOpen size={16} />
              <span>Mi Reserva</span>
            </Link>

            <Link
              href="/dashboard/documentos"
              className={`dash-mob-tab ${isDocuments ? 'dash-mob-tab--active' : ''}`}
            >
              <FileText size={16} />
              <span>Documentos</span>
            </Link>

            <Link
              href="/dashboard/guia"
              className={`dash-mob-tab ${isGuide ? 'dash-mob-tab--active' : ''}`}
            >
              <MapPin size={16} />
              <span>Guía Mallorca</span>
            </Link>

            <Link
              href="/dashboard/manual"
              className={`dash-mob-tab ${isManual ? 'dash-mob-tab--active' : ''}`}
            >
              <Compass size={16} />
              <span>Manual Camper</span>
            </Link>

            <Link
              href="/dashboard/profile"
              className={`dash-mob-tab ${isProfile ? 'dash-mob-tab--active' : ''}`}
            >
              <UserCircle size={16} />
              <span>Perfil</span>
              {isVerified ? (
                <span className="dash-mob-tab-dot dash-mob-tab-dot--success" />
              ) : isPending ? (
                <span className="dash-mob-tab-dot dash-mob-tab-dot--info" />
              ) : (
                <span className="dash-mob-tab-dot dash-mob-tab-dot--warning" />
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── 3. MODAL / BOTTOM SHEET DE ASISTENCIA 24H EN MÓVIL ─── */}
      {showEmergencyModal && (
        <div className="dash-sos-backdrop" onClick={() => setShowEmergencyModal(false)}>
          <div className="dash-sos-sheet" onClick={e => e.stopPropagation()}>
            <div className="dash-sos-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="dash-sos-icon-circle">
                  <LifeBuoy size={20} />
                </div>
                <div>
                  <h3 className="dash-sos-title">Asistencia en Ruta & Ayuda 24h</h3>
                  <p className="dash-sos-sub">Coordinación directa y grúa para tu viaje en Mallorca</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="dash-sos-close-btn"
                aria-label="Cerrar asistencia"
              >
                <X size={20} />
              </button>
            </div>

            <div className="dash-sos-body">
              {/* Utopia Van Life */}
              <a href="tel:+34611560916" className="dash-sos-card dash-sos-card--utopia">
                <div className="dash-sos-card-icon">
                  <Phone size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="dash-sos-card-tag">Atención Utopia Van Life</span>
                  <strong className="dash-sos-card-phone">+34 611 560 916</strong>
                  <span className="dash-sos-card-hint">Entregas, check-in, dudas y operativas</span>
                </div>
                <ChevronRight size={18} className="dash-sos-arrow" />
              </a>

              {/* ARAG Asistencia */}
              <a href="tel:+34662992060" className="dash-sos-card dash-sos-card--arag">
                <div className="dash-sos-card-icon dash-sos-card-icon--arag">
                  <LifeBuoy size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="dash-sos-card-tag" style={{ color: '#dc2626' }}>ARAG Seguro & Asistencia 24H</span>
                  <strong className="dash-sos-card-phone" style={{ color: '#991b1b' }}>+34 662 992 060</strong>
                  <span className="dash-sos-card-hint">Avería mecánica grave, pinchazo o grúa en isla</span>
                </div>
                <ChevronRight size={18} className="dash-sos-arrow" />
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/34611560916"
                target="_blank"
                rel="noopener noreferrer"
                className="dash-sos-card dash-sos-card--wa"
              >
                <div className="dash-sos-card-icon dash-sos-card-icon--wa">
                  <MessageCircle size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="dash-sos-card-tag" style={{ color: '#16a34a' }}>WhatsApp Utopia Van Life</span>
                  <strong className="dash-sos-card-phone" style={{ color: '#15803d' }}>Chat Directo</strong>
                  <span className="dash-sos-card-hint">Envía fotos o vídeos de cualquier duda de la camper</span>
                </div>
                <ChevronRight size={18} className="dash-sos-arrow" />
              </a>
            </div>

            <div className="dash-sos-footer">
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="dash-sos-dismiss-btn"
              >
                Volver al Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. BARRA DE NAVEGACIÓN INFERIOR PERSISTENTE (BOTTOM TABBAR <= 860px) ─── */}
      <nav className="dashboard-bottom-bar" aria-label="Navegación Móvil Principal">
        <Link
          href="/dashboard"
          className={`dash-bottom-item ${isReservations ? 'dash-bottom-item--active' : ''}`}
        >
          <BookOpen size={20} />
          <span>Reserva</span>
        </Link>

        <Link
          href="/dashboard/documentos"
          className={`dash-bottom-item ${isDocuments ? 'dash-bottom-item--active' : ''}`}
        >
          <FileText size={20} />
          <span>Documentos</span>
          {!isVerified && <span className="dash-bottom-dot" />}
        </Link>

        <Link
          href="/dashboard/guia"
          className={`dash-bottom-item ${isGuide ? 'dash-bottom-item--active' : ''}`}
        >
          <MapPin size={20} />
          <span>Guía</span>
        </Link>

        <Link
          href="/dashboard/manual"
          className={`dash-bottom-item ${isManual ? 'dash-bottom-item--active' : ''}`}
        >
          <Compass size={20} />
          <span>Manual</span>
        </Link>

        <Link
          href="/dashboard/profile"
          className={`dash-bottom-item ${isProfile ? 'dash-bottom-item--active' : ''}`}
        >
          <UserCircle size={20} />
          <span>Perfil</span>
          {!isVerified && !isPending && (
            <span className="dash-bottom-dot dash-bottom-dot--warning" />
          )}
          {isPending && (
            <span className="dash-bottom-dot dash-bottom-dot--info" />
          )}
        </Link>
      </nav>

      {/* ─── STYLES ─── */}
      <style jsx>{`
        /* Desktop styles */
        .dashboard-sidebar--desktop {
          display: flex;
        }
        .dashboard-mobile-nav {
          display: none;
        }
        .dashboard-bottom-bar {
          display: none;
        }

        .sidebar-link--active {
          background: rgba(45,58,45,0.08) !important;
          color: var(--forest-green) !important;
          font-weight: 600 !important;
        }
        .sidebar-pill {
          margin-left: auto;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          background: rgba(200, 168, 130, 0.2);
          color: var(--sand-dark);
          padding: 2px 6px;
          border-radius: var(--radius-full);
        }
        .sidebar-badge {
          margin-left: auto;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .sidebar-badge--warning {
          background: rgba(230, 126, 34, 0.12);
          color: var(--warning);
        }
        .sidebar-badge--info {
          background: rgba(52, 152, 219, 0.12);
          color: #2980b9;
        }
        .sidebar-badge--success {
          background: rgba(39, 174, 96, 0.15);
          color: var(--success);
          font-weight: 700;
        }
        .sidebar-support-card {
          margin-top: var(--space-4);
          background: rgba(45, 58, 45, 0.04);
          border: 1px solid rgba(45, 58, 45, 0.1);
          border-radius: var(--radius-md);
          padding: var(--space-3);
        }
        .support-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #27ae60;
          box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.2);
        }
        .sidebar-emergency-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-sm);
          padding: 6px 8px;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .sidebar-emergency-btn:hover {
          border-color: var(--forest-green);
          background: rgba(45, 58, 45, 0.03);
          transform: translateY(-1px);
        }
        .sidebar-emergency-btn--arag {
          border-color: rgba(220, 38, 38, 0.2);
          background: #FFFDFD;
        }
        .sidebar-emergency-btn--arag:hover {
          border-color: #dc2626;
          background: #FEF2F2;
        }

        /* ─── Mobile View Rules (<= 860px) ─── */
        @media (max-width: 860px) {
          .dashboard-sidebar--desktop {
            display: none !important;
          }

          .dashboard-mobile-nav {
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
            margin-bottom: 16px;
          }

          .dash-mob-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 14px;
            padding: 10px 14px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          }

          .dash-mob-user {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
          }

          .dash-mob-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--forest-green);
            color: #FFFFFF;
            font-weight: 700;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            text-transform: uppercase;
          }

          .dash-mob-user-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
          }

          .dash-mob-user-name {
            font-size: 0.88rem;
            font-weight: 700;
            color: #1A2B21;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .dash-mob-chip {
            display: inline-flex;
            align-items: center;
            font-size: 0.68rem;
            font-weight: 700;
            padding: 1px 7px;
            border-radius: 9999px;
            align-self: flex-start;
          }
          .dash-mob-chip--verified {
            background: #DCFCE7;
            color: #166534;
          }
          .dash-mob-chip--pending {
            background: #FEF3C7;
            color: #854D0E;
          }
          .dash-mob-chip--warning {
            background: #FEE2E2;
            color: #991B1B;
          }

          .dash-mob-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }

          .dash-mob-sos-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: #ECFDF5;
            color: #065F46;
            border: 1px solid #A7F3D0;
            padding: 6px 10px;
            border-radius: 9999px;
            font-size: 0.74rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .dash-mob-sos-btn:hover {
            background: #D1FAE5;
          }

          .dash-mob-logout-btn {
            background: transparent;
            border: none;
            color: #64748B;
            padding: 6px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }

          /* Tabs Carousel */
          .dash-mob-tabs-container {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 2px;
          }
          .dash-mob-tabs-container::-webkit-scrollbar {
            display: none;
          }

          .dash-mob-tabs {
            display: inline-flex;
            gap: 8px;
            white-space: nowrap;
          }

          .dash-mob-tab {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 14px;
            border-radius: 9999px;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            color: #475569;
            font-size: 0.8rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.15s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            flex-shrink: 0;
          }
          .dash-mob-tab:hover {
            border-color: #CBD5E1;
            color: #1A2B21;
          }
          .dash-mob-tab--active {
            background: var(--forest-green);
            color: #FFFFFF !important;
            border-color: var(--forest-green);
            box-shadow: 0 2px 6px rgba(45, 58, 45, 0.2);
          }
          .dash-mob-tab--admin {
            background: #1A2B21;
            color: #FFFFFF;
            border-color: #1A2B21;
          }

          .dash-mob-tab-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
          }
          .dash-mob-tab-dot--success { background: #22C55E; }
          .dash-mob-tab-dot--info { background: #3B82F6; }
          .dash-mob-tab-dot--warning { background: #EF4444; }

          /* Bottom sheet SOS modal */
          .dash-sos-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(5px);
            z-index: 2100;
            display: flex;
            align-items: flex-end;
            animation: dashFade 0.2s ease-out;
          }

          @keyframes dashFade {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .dash-sos-sheet {
            background: #FFFFFF;
            width: 100%;
            border-radius: 20px 20px 0 0;
            max-height: 88vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            animation: dashSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.2);
          }

          @keyframes dashSlideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }

          .dash-sos-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 20px;
            border-bottom: 1px solid #E2E8F0;
            background: #FAFAFA;
          }

          .dash-sos-icon-circle {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #DCFCE7;
            color: #166534;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .dash-sos-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: #1A2B21;
            margin: 0;
          }

          .dash-sos-sub {
            font-size: 0.78rem;
            color: #64748B;
            margin: 2px 0 0;
          }

          .dash-sos-close-btn {
            background: transparent;
            border: none;
            color: #94A3B8;
            padding: 6px;
            border-radius: 50%;
            cursor: pointer;
          }

          .dash-sos-body {
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .dash-sos-card {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            text-decoration: none;
            transition: all 0.15s ease;
          }
          .dash-sos-card--utopia {
            border-color: #A7F3D0;
            background: #F0FDF4;
          }
          .dash-sos-card--arag {
            border-color: #FECACA;
            background: #FEF2F2;
          }
          .dash-sos-card--wa {
            border-color: #BBF7D0;
            background: #F7FEE7;
          }

          .dash-sos-card-icon {
            width: 42px;
            height: 42px;
            border-radius: 10px;
            background: #DCFCE7;
            color: #166534;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .dash-sos-card-icon--arag {
            background: #FEE2E2;
            color: #DC2626;
          }
          .dash-sos-card-icon--wa {
            background: #DCFCE7;
            color: #15803D;
          }

          .dash-sos-card-tag {
            display: block;
            font-size: 0.72rem;
            font-weight: 700;
            color: #166534;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }

          .dash-sos-card-phone {
            display: block;
            font-size: 1.05rem;
            font-weight: 800;
            color: #1A2B21;
            letter-spacing: 0.02em;
            margin: 1px 0;
          }

          .dash-sos-card-hint {
            display: block;
            font-size: 0.75rem;
            color: #64748B;
          }

          .dash-sos-arrow {
            color: #94A3B8;
          }

          .dash-sos-footer {
            padding: 12px 20px 20px;
            border-top: 1px solid #E2E8F0;
            background: #FAFAFA;
          }

          .dash-sos-dismiss-btn {
            width: 100%;
            padding: 12px;
            border: 1px solid #CBD5E1;
            background: #FFFFFF;
            border-radius: 10px;
            font-size: 0.88rem;
            font-weight: 600;
            color: #475569;
            cursor: pointer;
          }

          /* Bottom Persistent TabBar */
          .dashboard-bottom-bar {
            display: flex;
            align-items: center;
            justify-content: space-around;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 58px;
            background: rgba(255, 255, 255, 0.97);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-top: 1px solid rgba(0, 0, 0, 0.08);
            box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.05);
            z-index: 1000;
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }

          .dash-bottom-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            height: 100%;
            text-decoration: none;
            color: #64748B;
            font-size: 0.68rem;
            font-weight: 600;
            position: relative;
            transition: color 0.15s ease, transform 0.15s ease;
            -webkit-tap-highlight-color: transparent;
          }

          .dash-bottom-item:active {
            transform: scale(0.92);
          }

          .dash-bottom-item--active {
            color: var(--forest-green);
            font-weight: 700;
          }

          .dash-bottom-dot {
            position: absolute;
            top: 7px;
            right: calc(50% - 13px);
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #EF4444;
            border: 1.5px solid #FFFFFF;
          }
          .dash-bottom-dot--warning {
            background: #F59E0B;
          }
          .dash-bottom-dot--info {
            background: #3B82F6;
          }
        }
      `}</style>
    </>
  )
}
