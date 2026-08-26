'use client'

import { Link, usePathname, useRouter } from '@/i18n/routing'
import { BookOpen, UserCircle, LogOut } from 'lucide-react'
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

  return (
    <aside className="dashboard-sidebar">
      <div className="user-card">
        <div className="user-avatar">
          {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--black-matte)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile?.full_name || 'Viajero'}
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
          <span>Mis Reservas</span>
        </Link>
        <Link 
          href="/dashboard/profile" 
          className={`sidebar-link ${isProfile ? 'sidebar-link--active' : ''}`}
        >
          <UserCircle size={18} />
          <span>Mi Perfil & Carnet</span>
          {profile?.verification_status === 'not_submitted' && (
            <span className="badge-warning">!</span>
          )}
        </Link>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--gray-100)' }}>
        <button 
          onClick={handleClientSignOut}
          disabled={loggingOut}
          className="sidebar-link" 
          style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--error)', padding: 'var(--space-3) var(--space-4)' }}
        >
          <LogOut size={18} />
          <span>{loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
        </button>
      </div>

      <style jsx>{`
        .sidebar-link--active {
          background: rgba(45,58,45,0.08) !important;
          color: var(--forest-green) !important;
          font-weight: 600 !important;
        }
      `}</style>
    </aside>
  )
}
