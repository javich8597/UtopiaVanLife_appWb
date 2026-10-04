'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import {
  AlertTriangle, ChevronDown, Navigation, X, MapPin, Route, ShieldCheck, Waves, Sunset, Mountain, Home, Moon,
  CircleParking, Footprints, Ban, Store, Sunrise, TriangleAlert, Droplets, Recycle, Zap, Fish, Trees, Landmark,
  Feather, UtensilsCrossed, Users, SquareParking, type LucideIcon,
} from 'lucide-react'
import {
  GUIDE_SPOTS, GUIDE_ROUTES, GUIDE_RULES, GUIDE_TIPS, CATEGORY_LABELS, CATEGORY_COLORS, TAG_META,
  type GuideSpot, type SpotCategory, type SpotTag, type TagKey,
} from '@/lib/guide/mallorcaSpots'
import { useUserTheme } from '@/lib/user/themeContext'

const GuideMap = dynamic(() => import('./GuideMap'), { ssr: false })

type Tab = 'explorar' | 'rutas' | 'normas'
type Filter = 'all' | SpotCategory

const CATEGORY_ICONS: Record<SpotCategory, LucideIcon> = {
  calas: Waves,
  miradores: Sunset,
  naturaleza: Mountain,
  pueblos: Home,
  dormir: Moon,
}

const TAG_ICONS: Record<TagKey, LucideIcon> = {
  'parking-free': CircleParking,
  'parking-paid': SquareParking,
  walk: Footprints,
  'no-services': Ban,
  services: Store,
  sunset: Sunset,
  sunrise: Sunrise,
  restricted: TriangleAlert,
  'mountain-road': Mountain,
  narrow: TriangleAlert,
  water: Droplets,
  dump: Recycle,
  power: Zap,
  swim: Fish,
  hike: Trees,
  history: Landmark,
  quiet: Feather,
  food: UtensilsCrossed,
  family: Users,
}

const CATEGORIES: SpotCategory[] = ['calas', 'miradores', 'naturaleza', 'pueblos', 'dormir']

const directionsUrl = (to: { lat: number; lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}`

const pinStyle = (c: SpotCategory) => ({ '--pin': CATEGORY_COLORS[c] }) as React.CSSProperties

function TagPill({ tag, compact = false }: { tag: SpotTag; compact?: boolean }) {
  const key = typeof tag === 'string' ? tag : tag.key
  const label = typeof tag === 'string' ? TAG_META[key].label : tag.label
  const Icon = TAG_ICONS[key]
  return (
    <span className={`guide-tag guide-tag--${TAG_META[key].tone} ${compact ? 'guide-tag--compact' : ''}`}>
      <Icon size={compact ? 12 : 14} aria-hidden="true" />
      {label}
    </span>
  )
}

/** Portada de color con el icono de la categoría cuando aún no hay foto */
function SpotCover({ spot, large = false }: { spot: GuideSpot; large?: boolean }) {
  const Icon = CATEGORY_ICONS[spot.category]
  return (
    <span className="guide-cover" style={pinStyle(spot.category)}>
      <Icon size={large ? 56 : 30} strokeWidth={1.6} aria-hidden="true" />
    </span>
  )
}

const tagKey = (t: SpotTag) => (typeof t === 'string' ? t : t.key)

export default function MallorcaGuideClient() {
  const theme = useUserTheme()
  const [tab, setTab] = useState<Tab>('explorar')
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openSpot, setOpenSpot] = useState<GuideSpot | null>(null)
  const [routeId, setRouteId] = useState<string>(GUIDE_ROUTES[0].id)
  const [openRule, setOpenRule] = useState<number | null>(0)

  const visibleSpots = useMemo(
    () => (filter === 'all' ? GUIDE_SPOTS : GUIDE_SPOTS.filter(s => s.category === filter)),
    [filter]
  )
  const route = GUIDE_ROUTES.find(r => r.id === routeId) || GUIDE_ROUTES[0]
  const routeSpots = route.spotIds.map(id => GUIDE_SPOTS.find(s => s.id === id)).filter(Boolean) as GuideSpot[]

  // Bloquear el scroll del fondo con la ficha abierta
  useEffect(() => {
    if (!openSpot) return
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenSpot(null)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = orig
      window.removeEventListener('keydown', onKey)
    }
  }, [openSpot])

  const openFromMap = (id: string) => {
    setSelectedId(id)
    const spot = GUIDE_SPOTS.find(s => s.id === id)
    if (spot) setOpenSpot(spot)
  }

  const countFor = (c: Filter) => (c === 'all' ? GUIDE_SPOTS.length : GUIDE_SPOTS.filter(s => s.category === c).length)

  return (
    <div className="guide">
      <header className="usr-page-head">
        <div>
          <span className="usr-page-head__eyebrow">Guía de Mallorca</span>
          <h1 className="usr-page-head__title">La isla en camper</h1>
          <p className="usr-page-head__desc">
            Nuestros sitios favoritos, con consejos reales para llegar y aparcar, y lo que debes saber para dormir sin problemas.
          </p>
        </div>
      </header>

      <div className="guide-tabs" role="tablist" aria-label="Secciones de la guía">
        {([
          ['explorar', 'Explorar', MapPin],
          ['rutas', 'Rutas', Route],
          ['normas', 'Normas', ShieldCheck],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`guide-tab ${tab === id ? 'is-active' : ''}`}
            onClick={() => { setTab(id); setSelectedId(null) }}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'explorar' && (
        <>
          <div className="guide-filters" role="group" aria-label="Filtrar por tipo de lugar">
            {(['all', ...CATEGORIES] as Filter[]).map(c => (
              <button
                key={c}
                type="button"
                className={`guide-filter ${filter === c ? 'is-active' : ''}`}
                aria-pressed={filter === c}
                onClick={() => { setFilter(c); setSelectedId(null) }}
              >
                {c !== 'all' && <CategoryDot category={c} />}
                {c === 'all' ? 'Todo' : CATEGORY_LABELS[c]}
                <span className="guide-filter__count">{countFor(c)}</span>
              </button>
            ))}
          </div>

          <div className="guide-layout">
            <div className="guide-map">
              <GuideMap spots={visibleSpots} selectedId={selectedId} onSelect={openFromMap} dark={theme === 'dark'} />
            </div>
            <ul className="guide-list">
              {visibleSpots.map(spot => (
                <li key={spot.id}>
                  <SpotCard
                    spot={spot}
                    active={spot.id === selectedId}
                    onOpen={() => { setSelectedId(spot.id); setOpenSpot(spot) }}
                    onHover={() => setSelectedId(spot.id)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tab === 'rutas' && (
        <>
          <div className="guide-routes" role="group" aria-label="Elige una ruta">
            {GUIDE_ROUTES.map(r => (
              <button
                key={r.id}
                type="button"
                className={`usr-card guide-route ${r.id === routeId ? 'is-active' : ''}`}
                aria-pressed={r.id === routeId}
                onClick={() => { setRouteId(r.id); setSelectedId(null) }}
              >
                <span className="guide-route__days">{r.days}</span>
                <strong className="guide-route__name">{r.name}</strong>
                <span className="guide-route__text">{r.summary}</span>
              </button>
            ))}
          </div>
          <div className="guide-layout">
            <div className="guide-map">
              <GuideMap spots={routeSpots} routeIds={route.spotIds} selectedId={selectedId} onSelect={openFromMap} dark={theme === 'dark'} />
            </div>
            <ol className="usr-card guide-steps">
              {routeSpots.map((spot, i) => (
                <li key={spot.id}>
                  <button
                    type="button"
                    className={`guide-step ${spot.id === selectedId ? 'is-active' : ''}`}
                    onClick={() => { setSelectedId(spot.id); setOpenSpot(spot) }}
                  >
                    <span className="guide-step__num">{i + 1}</span>
                    <span className="guide-step__text">
                      <strong>{spot.name}</strong>
                      <span>{spot.area}</span>
                    </span>
                    {spot.warning && <AlertTriangle size={16} className="guide-step__warn" aria-label="Tiene un aviso" />}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {tab === 'normas' && (
        <div className="guide-rules">
          <section className="usr-card guide-acc">
            {GUIDE_RULES.map((rule, i) => (
              <div key={rule.title} className="guide-acc__item">
                <button
                  type="button"
                  className="guide-acc__head"
                  aria-expanded={openRule === i}
                  onClick={() => setOpenRule(openRule === i ? null : i)}
                >
                  <span>{rule.title}</span>
                  <ChevronDown size={18} className={`guide-acc__chev ${openRule === i ? 'is-open' : ''}`} aria-hidden="true" />
                </button>
                {openRule === i && <p className="guide-acc__body">{rule.body}</p>}
              </div>
            ))}
          </section>

          <section className="usr-card guide-tips">
            <h2 className="usr-card-title">
              <span className="usr-icon-square usr-icon-square--soft"><ShieldCheck size={18} aria-hidden="true" /></span>
              Consejos de la casa
            </h2>
            <ul>
              {GUIDE_TIPS.map(tip => <li key={tip}>{tip}</li>)}
            </ul>
            <p className="guide-note">
              Normativa revisada en octubre de 2026. Las restricciones cambian cada temporada: ante cualquier duda, pregúntanos.
            </p>
          </section>
        </div>
      )}

      {openSpot && <SpotSheet spot={openSpot} onClose={() => setOpenSpot(null)} />}

      <GuideStyles />
    </div>
  )
}

function CategoryDot({ category }: { category: SpotCategory }) {
  const Icon = CATEGORY_ICONS[category]
  return (
    <span className="guide-dot" style={pinStyle(category)} aria-hidden="true">
      <Icon size={12} strokeWidth={2.4} />
    </span>
  )
}

function SpotCard({ spot, active, onOpen, onHover }: { spot: GuideSpot; active: boolean; onOpen: () => void; onHover: () => void }) {
  const Icon = CATEGORY_ICONS[spot.category]
  return (
    <button type="button" className={`usr-card guide-card ${active ? 'is-active' : ''}`} onClick={onOpen} onMouseEnter={onHover} onFocus={onHover}>
      <span className="guide-card__media">
        {spot.image
          ? <Image src={spot.image} alt="" fill sizes="(max-width: 640px) 120px, 160px" className="guide-card__img" />
          : <SpotCover spot={spot} />}
        <span className="guide-card__badge" style={pinStyle(spot.category)}>
          <Icon size={13} strokeWidth={2.4} aria-hidden="true" />
        </span>
      </span>
      <span className="guide-card__body">
        <span className="guide-card__cat">{CATEGORY_LABELS[spot.category]} · {spot.area}</span>
        <strong className="guide-card__name">{spot.name}</strong>
        <span className="guide-card__summary">{spot.summary}</span>
        <span className="guide-card__tags">
          {spot.tags.slice(0, 3).map(t => <TagPill key={tagKey(t)} tag={t} compact />)}
        </span>
      </span>
    </button>
  )
}

function SpotSheet({ spot, onClose }: { spot: GuideSpot; onClose: () => void }) {
  return (
    <div className="usr-sheet" onClick={onClose}>
      <div className="usr-sheet__panel guide-sheet" role="dialog" aria-modal="true" aria-labelledby="guide-sheet-title" onClick={e => e.stopPropagation()}>
        <div className="guide-sheet__media">
          {spot.image
            ? <Image src={spot.image} alt={spot.name} fill sizes="(max-width: 640px) 100vw, 520px" className="guide-card__img" />
            : <SpotCover spot={spot} large />}
          <button type="button" className="guide-sheet__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="guide-sheet__body">
          <span className="guide-sheet__cat" style={pinStyle(spot.category)}>
            <CategoryDot category={spot.category} />
            {CATEGORY_LABELS[spot.category]} · {spot.area}
          </span>
          <h2 id="guide-sheet-title" className="guide-sheet__title">{spot.name}</h2>
          <div className="guide-sheet__tags">
            {spot.tags.map(t => <TagPill key={tagKey(t)} tag={t} />)}
          </div>
          <p className="guide-sheet__summary">{spot.summary}</p>

          <div className="guide-utopia">
            <span className="guide-utopia__mark" aria-hidden="true">U</span>
            <div>
              <span className="guide-utopia__label">Consejo Utopia</span>
              <p>{spot.utopiaTip}</p>
            </div>
          </div>

          {spot.warning && (
            <p className="guide-sheet__warn"><AlertTriangle size={16} aria-hidden="true" /> {spot.warning}</p>
          )}

          <div className="guide-sheet__tip">
            <span className="guide-sheet__tip-label">Con la camper</span>
            <p>{spot.camperTip}</p>
          </div>

          <div className="guide-sheet__actions">
            <a href={directionsUrl(spot.parking || spot)} target="_blank" rel="noopener noreferrer" className="usr-btn usr-btn--primary">
              <Navigation size={16} aria-hidden="true" /> {spot.parking ? 'Ir al aparcamiento' : 'Cómo llegar'}
            </a>
            {spot.parking && (
              <a href={directionsUrl(spot)} target="_blank" rel="noopener noreferrer" className="usr-btn">
                <MapPin size={16} aria-hidden="true" /> Ver el lugar
              </a>
            )}
          </div>

          {spot.credit && (
            <p className="guide-sheet__credit">
              Foto: <a href={spot.credit.source} target="_blank" rel="noopener noreferrer">{spot.credit.author}</a> · {spot.credit.license}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function GuideStyles() {
  return (
    <style jsx global>{`
      .guide {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        max-width: 1160px;
        margin: 0 auto;
      }

      /* Pestañas */
      .guide-tabs {
        display: inline-flex;
        align-self: flex-start;
        gap: 4px;
        padding: 4px;
        border-radius: 14px;
        background: var(--usr-surface-3);
      }
      .guide-tab {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 40px;
        padding: 8px 16px;
        border: 0;
        border-radius: 11px;
        background: transparent;
        font: inherit;
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--usr-text-2);
        cursor: pointer;
        transition: background-color 160ms var(--ease-out), color 160ms var(--ease-out);
      }
      .guide-tab.is-active {
        background: var(--usr-surface);
        color: var(--usr-text);
        box-shadow: var(--usr-card-shadow);
      }

      /* Filtros */
      .guide-filters {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: none;
        padding-bottom: 2px;
      }
      .guide-filters::-webkit-scrollbar { display: none; }
      .guide-filter {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 40px;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid var(--usr-border);
        background: var(--usr-surface);
        font: inherit;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--usr-text-2);
        white-space: nowrap;
        cursor: pointer;
        flex-shrink: 0;
      }
      .guide-filter.is-active {
        background: var(--usr-primary-bg);
        border-color: var(--usr-primary-bg);
        color: var(--usr-primary-text);
      }
      .guide-filter__count {
        font-size: 0.72rem;
        opacity: 0.7;
        font-variant-numeric: tabular-nums;
      }
      .guide-dot {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: var(--pin);
        color: #FFFFFF;
      }
      .guide-filter.is-active .guide-dot {
        box-shadow: 0 0 0 2px var(--usr-primary-bg), 0 0 0 3.5px rgba(255, 255, 255, 0.6);
      }

      /* Etiquetas */
      .guide-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        padding: 5px 11px;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
        white-space: nowrap;
        background: var(--usr-surface-2);
        color: var(--usr-text-2);
      }
      .guide-tag--compact {
        min-height: 24px;
        padding: 3px 8px;
        font-size: 0.7rem;
        gap: 4px;
      }
      .guide-tag--sky { background: var(--usr-sky-soft); color: var(--usr-sky); }
      .guide-tag--amber { background: var(--usr-amber-soft); color: var(--usr-amber); }
      .guide-tag--sage { background: var(--usr-sage-soft); color: var(--usr-sage); }
      .guide-tag--rose { background: var(--usr-rose-soft); color: var(--usr-rose); }
      .guide-tag--gold { background: var(--usr-gold-soft); color: var(--usr-gold-text); }
      .guide-tag--violet { background: rgba(115, 86, 214, 0.12); color: #6247C2; }
      .user-layout[data-theme='dark'] .guide-tag--violet { color: #B3A2F2; }

      /* Portada sin foto */
      .guide-cover {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.92);
        background:
          radial-gradient(120% 90% at 20% 10%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 55%),
          linear-gradient(140deg, var(--pin) 0%, color-mix(in srgb, var(--pin) 70%, #1A1714) 100%);
      }

      /* Mapa + lista */
      .guide-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
        gap: 20px;
        align-items: start;
      }
      .guide-map {
        position: sticky;
        top: 24px;
        height: calc(100vh - 120px);
        max-height: 720px;
        min-height: 420px;
        order: 2;
      }
      .guide-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .guide-card {
        display: grid;
        grid-template-columns: 148px minmax(0, 1fr);
        width: 100%;
        min-height: 128px;
        padding: 0;
        overflow: hidden;
        font: inherit;
        text-align: left;
        color: inherit;
        cursor: pointer;
        transition: border-color 160ms var(--ease-out), transform 160ms var(--ease-out);
      }
      .guide-card:hover,
      .guide-card.is-active {
        border-color: var(--usr-gold-line);
      }
      .guide-card:active {
        transform: scale(0.99);
      }
      .guide-card__media {
        position: relative;
        background: var(--usr-surface-2);
      }
      .guide-card__img {
        object-fit: cover;
      }
      .guide-card__body {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 14px 16px;
        min-width: 0;
      }
      .guide-card__cat {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--usr-text-3);
      }
      .guide-card__name {
        font-family: var(--font-heading);
        font-size: 1.02rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--usr-text);
      }
      .guide-card__summary {
        font-size: 0.84rem;
        line-height: 1.45;
        color: var(--usr-text-2);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .guide-card__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 4px;
      }
      .guide-card__badge {
        position: absolute;
        top: 8px;
        left: 8px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--pin);
        color: #FFFFFF;
        border: 2px solid #FFFFFF;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }

      /* Rutas */
      .guide-routes {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .guide-route {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 18px 20px;
        font: inherit;
        text-align: left;
        color: inherit;
        cursor: pointer;
        border-width: 1.5px;
      }
      .guide-route.is-active {
        border-color: var(--usr-gold);
      }
      .guide-route__days {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--usr-gold-text);
      }
      .guide-route__name {
        font-family: var(--font-heading);
        font-size: 1.05rem;
        font-weight: 600;
        color: var(--usr-text);
      }
      .guide-route__text {
        font-size: 0.84rem;
        line-height: 1.45;
        color: var(--usr-text-2);
      }
      .guide-steps {
        margin: 0;
        padding: 8px;
        list-style: none;
      }
      .guide-step {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        min-height: 60px;
        padding: 10px 12px;
        border: 0;
        border-radius: 14px;
        background: transparent;
        font: inherit;
        text-align: left;
        color: inherit;
        cursor: pointer;
      }
      .guide-step:hover,
      .guide-step.is-active {
        background: var(--usr-surface-2);
      }
      .guide-step__num {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: var(--usr-primary-bg);
        color: var(--usr-primary-text);
        font-weight: 700;
        font-size: 0.82rem;
      }
      .guide-step__text {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }
      .guide-step__text strong {
        font-weight: 600;
        font-size: 0.92rem;
        color: var(--usr-text);
      }
      .guide-step__text span {
        font-size: 0.78rem;
        color: var(--usr-text-3);
      }
      .guide-step__warn {
        color: var(--usr-amber);
        flex-shrink: 0;
      }

      /* Normas */
      .guide-rules {
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
        gap: 20px;
        align-items: start;
      }
      .guide-acc {
        padding: 6px 22px;
      }
      .guide-acc__item + .guide-acc__item {
        border-top: 1px solid var(--usr-border);
      }
      .guide-acc__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        min-height: 58px;
        padding: 12px 0;
        border: 0;
        background: transparent;
        font: inherit;
        font-weight: 600;
        font-size: 0.95rem;
        text-align: left;
        color: var(--usr-text);
        cursor: pointer;
      }
      .guide-acc__chev {
        color: var(--usr-text-3);
        flex-shrink: 0;
        transition: transform 200ms var(--ease-out);
      }
      .guide-acc__chev.is-open {
        transform: rotate(180deg);
      }
      .guide-acc__body {
        margin: 0 0 16px;
        font-size: 0.9rem;
        line-height: 1.6;
        color: var(--usr-text-2);
      }
      .guide-tips {
        padding: 22px 24px;
      }
      .guide-tips ul {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 16px 0 0;
        padding: 0;
        list-style: none;
      }
      .guide-tips li {
        position: relative;
        padding-left: 18px;
        font-size: 0.9rem;
        line-height: 1.55;
        color: var(--usr-text-2);
      }
      .guide-tips li::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0.6em;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--usr-gold);
      }
      .guide-note {
        margin: 18px 0 0;
        padding-top: 14px;
        border-top: 1px solid var(--usr-border);
        font-size: 0.78rem;
        color: var(--usr-text-3);
      }

      /* Ficha del lugar */
      .guide-sheet {
        padding-bottom: 0;
      }
      .guide-sheet__media {
        position: relative;
        aspect-ratio: 16 / 10;
        background: var(--usr-surface-2);
      }
      .guide-sheet__close {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(20, 17, 14, 0.55);
        color: #FFFFFF;
        backdrop-filter: blur(6px);
        cursor: pointer;
      }
      .guide-sheet__body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 20px 22px calc(22px + env(safe-area-inset-bottom, 0px));
      }
      .guide-sheet__title {
        margin: 0;
        font-family: var(--font-heading);
        font-size: 1.45rem;
        font-weight: 600;
        letter-spacing: -0.02em;
        color: var(--usr-text);
      }
      .guide-sheet__summary {
        margin: 0;
        font-size: 0.94rem;
        line-height: 1.6;
        color: var(--usr-text-2);
      }
      .guide-sheet__warn {
        display: flex;
        gap: 8px;
        margin: 0;
        padding: 12px 14px;
        border-radius: 12px;
        background: var(--usr-amber-soft);
        color: var(--usr-text);
        font-size: 0.86rem;
        line-height: 1.5;
      }
      .guide-sheet__warn svg {
        color: var(--usr-amber);
        flex-shrink: 0;
        margin-top: 2px;
      }
      .guide-sheet__tip {
        padding: 14px 16px;
        border-radius: 14px;
        background: var(--usr-surface-2);
      }
      .guide-sheet__tip-label {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--usr-gold-text);
      }
      .guide-sheet__tip p {
        margin: 4px 0 0;
        font-size: 0.9rem;
        line-height: 1.55;
        color: var(--usr-text);
      }
      .guide-sheet__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .guide-sheet__cat {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--pin);
      }
      .guide-sheet__actions {
        display: flex;
        gap: 8px;
      }
      .guide-sheet__actions .usr-btn {
        flex: 1;
      }

      /* Consejo Utopia */
      .guide-utopia {
        display: flex;
        gap: 14px;
        padding: 16px 18px;
        border-radius: 16px;
        background: linear-gradient(135deg, var(--usr-gold-soft) 0%, var(--usr-surface-2) 100%);
        border: 1px solid var(--usr-gold-line);
      }
      .guide-utopia__mark {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: var(--usr-primary-bg);
        color: var(--usr-primary-text);
        font-family: var(--font-heading);
        font-weight: 700;
      }
      .guide-utopia__label {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--usr-gold-text);
      }
      .guide-utopia p {
        margin: 3px 0 0;
        font-size: 0.92rem;
        line-height: 1.55;
        color: var(--usr-text);
      }
      .guide-sheet__credit {
        margin: 0;
        font-size: 0.72rem;
        color: var(--usr-text-3);
        text-align: center;
      }
      .guide-sheet__credit a {
        color: var(--usr-text-2);
      }

      /* Tablet */
      @media (max-width: 1100px) {
        .guide-layout {
          grid-template-columns: minmax(0, 1fr);
        }
        .guide-map {
          position: relative;
          top: 0;
          order: 0;
          height: 380px;
          min-height: 0;
        }
        .guide-rules {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      /* Móvil */
      @media (max-width: 640px) {
        .guide-tabs {
          align-self: stretch;
        }
        .guide-tab {
          flex: 1;
          justify-content: center;
          padding: 8px 6px;
          font-size: 0.8rem;
        }
        .guide-tab svg {
          display: none;
        }
        .guide-map {
          height: 260px;
        }
        .guide-routes {
          grid-template-columns: minmax(0, 1fr);
        }
        .guide-card {
          grid-template-columns: 112px minmax(0, 1fr);
          min-height: 112px;
        }
        .guide-card__body {
          padding: 12px 14px;
        }
        .guide-acc {
          padding: 4px 16px;
        }
        .guide-tips {
          padding: 18px 16px;
        }
      }
    `}</style>
  )
}
