import type { ComponentType } from 'react'
import { Link } from '@/i18n/routing'

export interface StatTile {
  key: string
  label: string
  value: string | number
  hint?: string
  tone: 'gold' | 'sage' | 'amber' | 'rose' | 'sky' | 'neutral'
  icon: ComponentType<{ size?: number }>
  href?: string
}

/** Fila de tiles de resumen (cifra grande + icono de color), común a todas las ventanas */
export default function AdminStatTiles({ tiles, label }: { tiles: StatTile[]; label: string }) {
  return (
    <section className="adm-stats" aria-label={label}>
      {tiles.map(t => {
        const Icon = t.icon
        const body = (
          <>
            <span className={`adm-icon-dot adm-icon-dot--${t.tone}`}><Icon size={19} /></span>
            <span className="adm-stat__value">{t.value}</span>
            <span className="adm-stat__label">{t.label}</span>
            {t.hint && <span className="adm-stat__hint">{t.hint}</span>}
          </>
        )
        return t.href ? (
          <Link key={t.key} href={t.href as any} className="adm-stat">{body}</Link>
        ) : (
          <div key={t.key} className="adm-stat adm-stat--static">{body}</div>
        )
      })}
    </section>
  )
}
