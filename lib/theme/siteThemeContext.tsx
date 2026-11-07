'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { SiteTheme, SITE_THEME_COOKIE, SITE_THEME_STORAGE_KEY } from './siteTheme'

interface SiteThemeContextValue {
  theme: SiteTheme
  setTheme: (theme: SiteTheme) => void
  toggleTheme: () => void
}

const SiteThemeContext = createContext<SiteThemeContextValue | undefined>(undefined)

function applyThemeToDocument(theme: SiteTheme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
}

function persistTheme(theme: SiteTheme) {
  try {
    localStorage.setItem(SITE_THEME_STORAGE_KEY, theme)
  } catch {}

  try {
    // 1 year max-age, lax sameSite for cookie
    document.cookie = `${SITE_THEME_COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax`
  } catch {}
}

export function SiteThemeProvider({
  children,
  initialTheme = 'dark',
}: {
  children: React.ReactNode
  initialTheme?: SiteTheme
}) {
  const [theme, setThemeState] = useState<SiteTheme>(initialTheme)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SITE_THEME_STORAGE_KEY) as SiteTheme | null
      if (stored && (stored === 'light' || stored === 'dark') && stored !== theme) {
        setThemeState(stored)
        applyThemeToDocument(stored)
      } else {
        applyThemeToDocument(initialTheme)
      }
    } catch {
      applyThemeToDocument(initialTheme)
    }
  }, [initialTheme])

  const setTheme = useCallback((next: SiteTheme) => {
    setThemeState(next)
    applyThemeToDocument(next)
    persistTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((curr) => {
      const next: SiteTheme = curr === 'dark' ? 'light' : 'dark'
      applyThemeToDocument(next)
      persistTheme(next)
      return next
    })
  }, [])

  return (
    <SiteThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </SiteThemeContext.Provider>
  )
}

export function useSiteTheme(): SiteThemeContextValue {
  const ctx = useContext(SiteThemeContext)
  if (!ctx) {
    return {
      theme: 'dark',
      setTheme: () => {},
      toggleTheme: () => {},
    }
  }
  return ctx
}
