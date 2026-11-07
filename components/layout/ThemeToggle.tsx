'use client'

import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useSiteTheme } from '@/lib/theme/siteThemeContext'

interface Props {
  variant?: 'full' | 'compact'
  className?: string
}

export default function ThemeToggle({ variant = 'full', className = '' }: Props) {
  const { theme, toggleTheme } = useSiteTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro arena'
  const Icon = theme === 'dark' ? Moon : Sun

  return (
    <button
      type="button"
      className={`site-theme-toggle site-theme-toggle--${variant} ${className}`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <Icon
        size={variant === 'full' ? 14 : 17}
        className="site-theme-toggle__icon"
        aria-hidden="true"
      />
      {variant === 'full' && (
        <span className="site-theme-toggle__label">
          {theme === 'dark' ? 'Oscuro' : 'Claro'}
        </span>
      )}

      <style jsx>{`
        .site-theme-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #E2DDD5;
          font-size: 0.76rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          user-select: none;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .site-theme-toggle--full {
          height: 34px;
          padding: 0 13px;
        }

        .site-theme-toggle--compact {
          width: 34px;
          height: 34px;
          padding: 0;
        }

        .site-theme-toggle:hover {
          border-color: rgba(204, 160, 83, 0.45);
          background: rgba(204, 160, 83, 0.12);
          color: #CCA053;
          transform: translateY(-1px);
        }

        .site-theme-toggle:active {
          transform: translateY(0);
        }

        .site-theme-toggle__icon {
          flex-shrink: 0;
          color: #CCA053;
          transition: transform 0.3s ease;
        }

        .site-theme-toggle:hover .site-theme-toggle__icon {
          transform: rotate(15deg);
        }

        .site-theme-toggle__label {
          line-height: 1;
          white-space: nowrap;
        }
      `}</style>
    </button>
  )
}
