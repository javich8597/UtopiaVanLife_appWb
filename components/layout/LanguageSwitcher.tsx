'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import { Check } from 'lucide-react'

const LOCALES = [
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'fr', label: 'Français', short: 'FR' }
]

function FlagIcon({ code, size = 15 }: { code: string; size?: number }) {
  const width = Math.round(size * 1.35)
  const height = size

  if (code === 'es') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 750 500"
        style={{ borderRadius: 2, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 0 1px rgba(0,0,0,0.2)' }}
      >
        <rect width="750" height="500" fill="#AA151B" />
        <rect y="125" width="750" height="250" fill="#F1BF00" />
      </svg>
    )
  }

  if (code === 'en') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 60 30"
        style={{ borderRadius: 2, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 0 1px rgba(0,0,0,0.2)' }}
      >
        <clipPath id="s-en"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
        <clipPath id="t-en"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
        <g clipPath="url(#s-en)">
          <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
          <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t-en)" stroke="#C8102E" strokeWidth="4"/>
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
        </g>
      </svg>
    )
  }

  if (code === 'de') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 5 3"
        style={{ borderRadius: 2, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 0 1px rgba(0,0,0,0.2)' }}
      >
        <rect width="5" height="1" y="0" x="0" fill="#000000"/>
        <rect width="5" height="1" y="1" x="0" fill="#DD0000"/>
        <rect width="5" height="1" y="2" x="0" fill="#FFCE00"/>
      </svg>
    )
  }

  if (code === 'fr') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 3 2"
        style={{ borderRadius: 2, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 0 1px rgba(0,0,0,0.2)' }}
      >
        <rect width="1" height="2" x="0" fill="#002654"/>
        <rect width="1" height="2" x="1" fill="#FFFFFF"/>
        <rect width="1" height="2" x="2" fill="#ED2939"/>
      </svg>
    )
  }

  return null
}

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
                  gap: 6,
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
                <FlagIcon code={loc.code} size={13} />
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
        <FlagIcon code={currentObj.code} size={13} />
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
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FlagIcon code={loc.code} size={13} />
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
