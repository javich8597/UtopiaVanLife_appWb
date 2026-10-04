'use client'

import { useState } from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { LogOut, Globe, SunMoon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  /** Selector de tema que se muestra en la fila "Tema" */
  themeToggle?: React.ReactNode
  /** Mostrar "Cerrar sesión" (en escritorio vive en el menú del avatar) */
  showSignOut?: boolean
}

export async function signOutAdmin(router: ReturnType<typeof useRouter>) {
  try {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/')
  } catch {
    window.location.href = '/es/auth/signout'
  }
}

export default function AdminSidebarFooterClient({ themeToggle, showSignOut = false }: Props) {
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (loggingOut) return
    setLoggingOut(true)
    await signOutAdmin(router)
  }

  return (
    <div className="admin-sidebar__footer">
      {themeToggle && (
        <div className="admin-footer-row">
          <span className="admin-footer-row__label">
            <SunMoon size={20} />
            Tema
          </span>
          {themeToggle}
        </div>
      )}

      <Link href="/" target="_blank" className="admin-footer-link">
        <Globe size={20} />
        <span>Ir a la web</span>
      </Link>

      {showSignOut && (
        <button
          id="admin-logout-btn"
          name="admin_logout_btn"
          type="button"
          aria-label="Cerrar sesión de administrador"
          onClick={handleSignOut}
          disabled={loggingOut}
          className="admin-footer-link admin-footer-link--danger"
        >
          <LogOut size={20} />
          <span>{loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
        </button>
      )}
    </div>
  )
}
