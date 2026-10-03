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
      <div className="mobile-lang-switcher">
        <span className="mobile-lang-label">
          Idioma / Language
        </span>
        <div className="mobile-lang-grid">
          {LOCALES.map(loc => {
            const isSelected = loc.code === currentLocale
            return (
              <button
                key={loc.code}
                onClick={() => selectLocale(loc.code)}
                className={`mobile-lang-btn ${isSelected ? 'mobile-lang-btn--selected' : ''}`}
              >
                <FlagIcon code={loc.code} size={13} />
                <span>{loc.short}</span>
              </button>
            )
          })}
        </div>

        <style jsx>{`
          .mobile-lang-switcher {
            margin-top: auto;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }
          .mobile-lang-label {
            font-size: 0.72rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.5);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            display: block;
            margin-bottom: 8px;
          }
          .mobile-lang-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
          }
          .mobile-lang-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 4px;
            border-radius: var(--radius-md);
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: #131518;
            color: rgba(255, 255, 255, 0.85);
            font-weight: 500;
            font-size: 0.82rem;
            cursor: pointer;
            transition: all 160ms cubic-bezier(0.23, 1, 0.32, 1);
          }
          .mobile-lang-btn:active {
            transform: scale(0.96);
          }
          .mobile-lang-btn--selected {
            border: 1.5px solid #e6ca65;
            background: rgba(230, 202, 101, 0.12);
            color: #e6ca65;
            font-weight: 700;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="lang-switcher">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Cambiar idioma / Switch language"
        aria-expanded={isOpen}
        className="lang-trigger-btn"
      >
        <FlagIcon code={currentObj.code} size={13} />
        <span>{currentObj.short}</span>
      </button>

      {isOpen && (
        <div className="lang-dropdown">
          {LOCALES.map(loc => {
            const isSelected = loc.code === currentLocale
            return (
              <button
                key={loc.code}
                onClick={() => selectLocale(loc.code)}
                className={`lang-dropdown-btn ${isSelected ? 'lang-dropdown-btn--selected' : ''}`}
              >
                <span className="lang-dropdown-item">
                  <FlagIcon code={loc.code} size={13} />
                  <span>{loc.label}</span>
                </span>
                {isSelected && <Check size={14} className="lang-dropdown-check" />}
              </button>
            )
          })}
        </div>
      )}

      <style jsx>{`
        .lang-switcher {
          position: relative;
          display: inline-block;
        }

        .lang-trigger-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease, border-color 160ms ease;
          user-select: none;
          -webkit-user-select: none;
        }

        .lang-trigger-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(230, 202, 101, 0.4);
          transform: translateY(-1px);
        }

        .lang-trigger-btn:active {
          transform: scale(0.96);
        }

        .lang-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: rgba(19, 21, 24, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          padding: 5px;
          min-width: 145px;
          z-index: 100;
          animation: dropdownFadeIn 180ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .lang-dropdown-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 10px;
          border: none;
          border-radius: var(--radius-md);
          background: transparent;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: background-color 140ms ease, color 140ms ease;
        }

        .lang-dropdown-btn:hover {
          background: rgba(230, 202, 101, 0.1);
          color: #e6ca65;
        }

        .lang-dropdown-btn--selected {
          background: rgba(230, 202, 101, 0.15);
          color: #e6ca65;
          font-weight: 600;
        }

        .lang-dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        :global(.lang-dropdown-check) {
          color: #e6ca65;
        }
      `}</style>
    </div>
  )
}
