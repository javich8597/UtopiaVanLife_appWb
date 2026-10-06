'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'

/** Cierre de sesión del panel de cliente, compartido por el menú lateral y Mi perfil */
export function useSignOut() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const signOut = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await createClient().auth.signOut()
      router.refresh()
      router.push('/')
    } catch {
      window.location.href = '/es/auth/signout'
    }
  }

  return { signOut, loggingOut }
}
