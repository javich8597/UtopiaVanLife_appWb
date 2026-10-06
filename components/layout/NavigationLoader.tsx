'use client'

import React, { useEffect, useState, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import LoadingScreen from '@/components/ui/LoadingScreen'

/**
 * Global helpers to trigger the loading screen programmatically from any component
 */
export function startLoading() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('utopia:start-loading'))
  }
}

export function stopLoading() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('utopia:stop-loading'))
  }
}

function NavigationLoaderContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Clear all active timers helper
  const clearAllTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = null
    }
  }

  // When pathname or searchParams change, navigation has completed
  useEffect(() => {
    clearAllTimers()
    setIsLoading(false)
  }, [pathname, searchParams])

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      // Find nearest anchor tag
      const anchor = (e.target as HTMLElement)?.closest('a')
      if (!anchor) return

      // Ignore modified clicks (new tab, etc.)
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      ) {
        return
      }

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
        return
      }

      try {
        const targetUrl = new URL(anchor.href, window.location.href)

        // Ignore external links
        if (targetUrl.origin !== window.location.origin) return

        const currentPath = window.location.pathname
        const currentSearch = window.location.search

        // If clicking same page hash link (e.g. /#faqs) or same exact url, ignore
        const isSamePath = targetUrl.pathname === currentPath
        const isSameSearch = targetUrl.search === currentSearch
        if (isSamePath && (isSameSearch || targetUrl.hash)) return

        // Delay showing: instant routes won't flicker, but slower routes show loading
        clearAllTimers()
        timerRef.current = setTimeout(() => {
          setIsLoading(true)
        }, 160)

        // Safety timeout so user is never stuck if navigation is cancelled or interrupted
        safetyTimerRef.current = setTimeout(() => {
          setIsLoading(false)
        }, 4000)
      } catch (err) {
        // Fallback on invalid url
      }
    }

    const handlePopState = () => {
      // Browser Back/Forward navigation:
      // NEVER trigger full-screen loader on history traversal to prevent freezing.
      clearAllTimers()
      setIsLoading(false)
    }

    const handlePageShow = () => {
      // Clear loading screen on bfcache restoration or page show
      clearAllTimers()
      setIsLoading(false)
    }

    const handleCustomStart = () => {
      clearAllTimers()
      setIsLoading(true)
      safetyTimerRef.current = setTimeout(() => {
        setIsLoading(false)
      }, 5000)
    }

    const handleCustomStop = () => {
      clearAllTimers()
      setIsLoading(false)
    }

    document.addEventListener('click', handleAnchorClick, true)
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('utopia:start-loading', handleCustomStart)
    window.addEventListener('utopia:stop-loading', handleCustomStop)

    return () => {
      document.removeEventListener('click', handleAnchorClick, true)
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('utopia:start-loading', handleCustomStart)
      window.removeEventListener('utopia:stop-loading', handleCustomStop)
      clearAllTimers()
    }
  }, [])

  if (!isLoading) return null

  return <LoadingScreen fullScreen={true} />
}

export default function NavigationLoader() {
  return (
    <Suspense fallback={null}>
      <NavigationLoaderContent />
    </Suspense>
  )
}
