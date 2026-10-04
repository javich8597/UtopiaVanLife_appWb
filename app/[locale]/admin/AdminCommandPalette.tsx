'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { Search, BookOpen, User, CornerDownLeft } from 'lucide-react'
import { navItems } from './AdminNavClient'

interface Props {
  open: boolean
  onClose: () => void
}

interface ResultItem {
  key: string
  group: string
  title: string
  subtitle?: string
  href: string
  icon: React.ComponentType<{ size?: number }>
}

const formatDay = (value: string) =>
  new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** Buscador / acceso rápido: secciones del panel, reservas y clientes */
export default function AdminCommandPalette({ open, onClose }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<{ bookings: any[]; customers: any[] }>({ bookings: [], customers: [] })
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)

  // Foco, bloqueo de scroll del fondo (AGENTS.md) y reinicio al abrir
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => inputRef.current?.focus(), 20)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = ''
    }
  }, [open])

  // Búsqueda remota con retardo
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setRemote({ bookings: [], customers: [] })
      return
    }
    setLoading(true)
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (res.ok) setRemote(await res.json())
      } catch {
        /* búsqueda cancelada */
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query, open])

  const results = useMemo<ResultItem[]>(() => {
    const q = query.trim().toLowerCase()
    const pages: ResultItem[] = navItems
      .filter(item => !q || item.label.toLowerCase().includes(q))
      .map(item => ({ key: `p-${item.href}`, group: 'Secciones', title: item.label, href: item.href, icon: item.icon }))

    const bookings: ResultItem[] = remote.bookings.map(b => ({
      key: `b-${b.id}`,
      group: 'Reservas',
      title: `${b.customer_name || 'Cliente'} · ${b.campers?.name || 'Camper'}`,
      subtitle: `${formatDay(b.start_date)} – ${formatDay(b.end_date)} · #${String(b.id).split('-')[0].toUpperCase()}`,
      href: `/admin/bookings?search=${b.id}&open=true`,
      icon: BookOpen,
    }))
    const customers: ResultItem[] = remote.customers.map(c => ({
      key: `c-${c.id}`,
      group: 'Clientes',
      title: c.full_name || c.email,
      subtitle: [c.email, c.dni_nie].filter(Boolean).join(' · '),
      href: `/admin/users?search=${encodeURIComponent(c.email || '')}`,
      icon: User,
    }))
    return [...pages, ...bookings, ...customers]
  }, [query, remote])

  useEffect(() => {
    setActive(a => Math.min(a, Math.max(results.length - 1, 0)))
  }, [results.length])

  if (!open) return null

  const go = (item?: ResultItem) => {
    if (!item) return
    onClose()
    router.push(item.href as any)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[active])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  let lastGroup = ''

  return (
    <div className="cmdk" role="dialog" aria-modal="true" aria-label="Buscar en el panel">
      <div className="cmdk__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="cmdk__panel">
        <div className="cmdk__field">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            id="admin-cmdk-input"
            type="search"
            className="cmdk__input"
            placeholder="Busca una sección, reserva o cliente"
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={onKeyDown}
            aria-controls="admin-cmdk-list"
            aria-activedescendant={results[active] ? `cmdk-${results[active].key}` : undefined}
          />
          <span className="admin-kbd">Esc</span>
        </div>

        <ul id="admin-cmdk-list" className="cmdk__list" role="listbox">
          {results.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            const Icon = item.icon
            return (
              <li key={item.key} role="presentation">
                {header && <div className="cmdk__group">{header}</div>}
                <button
                  type="button"
                  id={`cmdk-${item.key}`}
                  role="option"
                  aria-selected={i === active}
                  className={`cmdk__item ${i === active ? 'cmdk__item--active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                >
                  <span className="cmdk__icon"><Icon size={16} /></span>
                  <span className="cmdk__text">
                    <span className="cmdk__title">{item.title}</span>
                    {item.subtitle && <span className="cmdk__sub">{item.subtitle}</span>}
                  </span>
                  {i === active && <CornerDownLeft size={14} className="cmdk__enter" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
          {results.length === 0 && (
            <li className="cmdk__empty">{loading ? 'Buscando…' : 'Sin resultados. Prueba con un nombre, email o localizador.'}</li>
          )}
        </ul>
      </div>
    </div>
  )
}
