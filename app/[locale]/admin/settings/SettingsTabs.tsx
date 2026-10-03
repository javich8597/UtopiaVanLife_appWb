'use client'

import { useEffect, useState, type ReactNode } from 'react'

interface Tab {
  id: string
  label: string
  content: ReactNode
}

/** Subnavegación de Ajustes: una herramienta visible cada vez. Recuerda la pestaña en la URL (#extras…). */
export default function SettingsTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id)

  useEffect(() => {
    const fromHash = window.location.hash.replace('#', '')
    if (tabs.some(t => t.id === fromHash)) setActive(fromHash)
  }, [tabs])

  const select = (id: string) => {
    setActive(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <>
      <div className="adm-tabs" role="tablist" aria-label="Secciones de ajustes">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`settings-tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`settings-panel-${t.id}`}
            className={`adm-tab ${active === t.id ? 'adm-tab--on' : ''}`}
            onClick={() => select(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map(t => (
        <section
          key={t.id}
          id={`settings-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`settings-tab-${t.id}`}
          hidden={active !== t.id}
        >
          {t.content}
        </section>
      ))}
    </>
  )
}
