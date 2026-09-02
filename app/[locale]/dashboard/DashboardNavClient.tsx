'use client'

import { Link, usePathname, useRouter } from '@/i18n/routing'
import { BookOpen, MapPin, Compass, UserCircle, LogOut, MessageCircle, FileText, ShieldCheck, Phone, LifeBuoy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface Props {
  user: any
  profile: any
}

export default function DashboardNavClient({ user, profile }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  
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
    <aside className="dashboard-sidebar">
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

      <style jsx>{`
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
      `}</style>
    </aside>
  )
}
