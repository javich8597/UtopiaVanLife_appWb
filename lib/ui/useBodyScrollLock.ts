'use client'

import { useEffect } from 'react'

/** Bloquea el scroll del fondo mientras un modal o bottom sheet está abierto (AGENTS.md, regla 5). */
export function useBodyScrollLock(active: boolean = true) {
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])
}
