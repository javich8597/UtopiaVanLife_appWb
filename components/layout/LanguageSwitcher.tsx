'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import { Globe, Check } from 'lucide-react'

const LOCALES = [
  { code: 'es', label: 'Español', flag: '🇪🇸', short: 'ES' },
  { code: 'en', label: 'English', flag: '🇬🇧', short: 'EN' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', short: 'DE' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', short: 'FR' }
]

interface Props {
  isSolid?: boolean
  isMobile?: boolean
}

export default function LanguageSwitcher({ isSolid = true, isMobile = false }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const currentLocale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const currentObj = LOCALES.find(l => l.code === currentLocale) || LOCALES[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectLocale = (code: string) => {
    setIsOpen(false)
    if (code === currentLocale) return
    router.replace(pathname, { locale: code })
  }

  if (isMobile) {
    return (
      <div className="mobile-lang-switcher" style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
          Idioma / Language
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {LOCALES.map(loc => {
            const isSelected = loc.code === currentLocale
            return (
              <button
                key={loc.code}
                onClick={() => selectLocale(loc.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '1.5px solid var(--forest-green)' : '1px solid var(--gray-200)',
                  background: isSelected ? 'rgba(45, 58, 45, 0.06)' : 'white',
                  color: isSelected ? 'var(--forest-green)' : 'var(--gray-700)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <span>{loc.flag}</span>
                <span>{loc.short}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Cambiar idioma / Switch language"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 'var(--radius-full)',
          background: isSolid ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.15)',
          color: isSolid ? 'var(--black-matte)' : '#FFFFFF',
          border: isSolid ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          fontSize: '0.78rem',
          fontWeight: 600,
          letterSpacing: '0.03em',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        className="lang-trigger-btn"
      >
        <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{currentObj.flag}</span>
        <span>{currentObj.short}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'white',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            padding: '4px',
            minWidth: 140,
            zIndex: 100,
            animation: 'dropdownFadeIn 0.15s ease'
          }}
        >
          {LOCALES.map(loc => {
            const isSelected = loc.code === currentLocale
            return (
              <button
                key={loc.code}
                onClick={() => selectLocale(loc.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '7px 10px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(45, 58, 45, 0.06)' : 'transparent',
                  color: isSelected ? 'var(--forest-green)' : 'var(--black-matte)',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--gray-100)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{loc.flag}</span>
                  <span>{loc.label}</span>
                </span>
                {isSelected && <Check size={14} style={{ color: 'var(--forest-green)' }} />}
              </button>
            )
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .lang-trigger-btn:hover {
          background: ${isSolid ? 'rgba(0, 0, 0, 0.09)' : 'rgba(255, 255, 255, 0.25)'} !important;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  )
}
