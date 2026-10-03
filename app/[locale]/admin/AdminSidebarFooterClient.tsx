'use client'

import { useState } from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { LogOut, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  email?: string
  /** Acciones extra (p. ej. el selector de tema) */
  children?: React.ReactNode
}

export default function AdminSidebarFooterClient({ email, children }: Props) {
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

  const initial = (email || 'A').trim().charAt(0).toUpperCase()

  return (
    <div className="admin-sidebar__footer">
      <div className="admin-user">
        <span className="admin-user__avatar" aria-hidden="true">{initial}</span>
        <span className="admin-user__info">
          <span className="admin-user__email">{email || 'Administrador'}</span>
          <span className="admin-user__role">Administrador</span>
        </span>
      </div>

      <div className="admin-sidebar__footer-actions">
        {children}
        <Link href="/" className="admin-footer-link">
          <Globe size={16} />
          <span>Ver la web</span>
        </Link>

        <button
          id="admin-logout-btn"
          name="admin_logout_btn"
          type="button"
          aria-label="Cerrar sesión de administrador"
          onClick={handleSignOut}
          disabled={loggingOut}
          className="admin-footer-link admin-footer-link--danger"
        >
          <LogOut size={16} />
          <span>{loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
        </button>
      </div>
    </div>
  )
}
