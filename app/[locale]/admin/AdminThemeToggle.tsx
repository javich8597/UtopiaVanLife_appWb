'use client'

import { Moon, Sun } from 'lucide-react'
import type { AdminTheme } from '@/lib/admin/theme'

interface Props {
  theme: AdminTheme
  onChange: (theme: AdminTheme) => void
  /** full: pastilla con texto (menú lateral) · compact: solo icono (cabecera móvil) */
  variant?: 'full' | 'compact'
}

export default function AdminThemeToggle({ theme, onChange, variant = 'full' }: Props) {
  const next: AdminTheme = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? 'Cambiar a tema oscuro grafito' : 'Cambiar a tema claro marfil'
  const Icon = theme === 'dark' ? Moon : Sun

  return (
    <button
      type="button"
      className={`admin-theme-toggle admin-theme-toggle--${variant}`}
      onClick={() => onChange(next)}
      aria-label={label}
      title={label}
    >
      <Icon size={variant === 'full' ? 14 : 18} aria-hidden="true" />
      {variant === 'full' && <span>{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>}
    </button>
  )
}
