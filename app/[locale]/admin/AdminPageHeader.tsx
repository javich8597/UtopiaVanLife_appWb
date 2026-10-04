import type { ReactNode } from 'react'

interface Props {
  title: string
  /** Una sola línea que diga qué se hace en esta pantalla */
  description?: string
  /** Acción principal (y secundarias) alineadas a la derecha */
  actions?: ReactNode
}

/** Cabecera común de todas las ventanas del backoffice */
export default function AdminPageHeader({ title, description, actions }: Props) {
  return (
    <header className="adm-page-head">
      <div className="adm-page-head__text">
        <h1 className="adm-page-head__title">{title}</h1>
        {description && <p className="adm-page-head__desc">{description}</p>}
      </div>
      {actions && <div className="adm-page-head__actions">{actions}</div>}
    </header>
  )
}
