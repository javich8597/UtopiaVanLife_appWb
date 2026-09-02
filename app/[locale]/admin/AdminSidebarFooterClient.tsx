'use client'

import { useState } from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { LogOut, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  email?: string
}

export default function AdminSidebarFooterClient({ email }: Props) {
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  const handleSignOut = async (e: React.MouseEvent) => {
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

  return (
    <div className="admin-sidebar__footer">
      <div className="admin-user-info" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="text-small" style={{ fontWeight: 600, color: '#FFFFFF', wordBreak: 'break-all' }}>
          {email || 'Administrador'}
        </span>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Backoffice Admin</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Link
          href="/"
          className="admin-nav__link"
          style={{ color: 'rgba(255, 255, 255, 0.75)', padding: '8px 12px', fontSize: '0.85rem' }}
        >
          <Globe size={16} />
          <span>Volver a la Web</span>
        </Link>

        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          className="admin-nav__link"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#F87171',
            cursor: 'pointer',
            width: '100%',
            padding: '8px 12px',
            fontSize: '0.85rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)'
          }}
        >
          <LogOut size={16} />
          <span>{loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
        </button>
      </div>
    </div>
  )
}
