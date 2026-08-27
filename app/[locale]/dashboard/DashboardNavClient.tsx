'use client'

import { Link, usePathname, useRouter } from '@/i18n/routing'
import { BookOpen, MapPin, Compass, UserCircle, LogOut, MessageCircle } from 'lucide-react'
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
      router.push('/auth/login')
    } catch {
      window.location.href = '/es/auth/signout'
    }
  }

  const isVerified = profile?.verification_status === 'verified'
  const isPending = profile?.verification_status === 'pending'

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
        <Link 
          href="/dashboard" 
          className={`sidebar-link ${isReservations ? 'sidebar-link--active' : ''}`}
        >
          <BookOpen size={18} />
          <span>Mi Reserva</span>
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

      {/* WhatsApp Help Card */}
      <div className="sidebar-support-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div className="support-dot" />
          <span className="text-xs" style={{ fontWeight: 600, color: 'var(--forest-green)' }}>Atención Utopia</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--gray-600)', marginBottom: 8, lineHeight: 1.4 }}>
          ¿Dudas sobre tu ruta o tu camper?
        </p>
        <a 
          href="https://wa.me/34611560916" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn btn-outline btn-sm"
          style={{ width: '100%', justifyContent: 'center', gap: 6, fontSize: '0.75rem', padding: '6px 12px' }}
        >
          <MessageCircle size={14} />
          <span>WhatsApp Soporte</span>
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
      `}</style>
    </aside>
  )
}
