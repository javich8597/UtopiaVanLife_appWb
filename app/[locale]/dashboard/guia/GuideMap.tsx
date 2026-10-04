'use client'

import { useEffect, useRef } from 'react'
import type * as Leaflet from 'leaflet'
import { Maximize2 } from 'lucide-react'
import { CATEGORY_COLORS, CATEGORY_LABELS, type GuideSpot, type SpotCategory } from '@/lib/guide/mallorcaSpots'

interface Props {
  spots: GuideSpot[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Ids en orden para dibujar una ruta */
  routeIds?: string[]
  dark?: boolean
}

// Con token de Mapbox se usan sus estilos claro/oscuro; sin token, las teselas estándar de OpenStreetMap
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const tileUrl = (dark: boolean) =>
  MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/${dark ? 'dark-v11' : 'light-v11'}/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = MAPBOX_TOKEN
  ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

/** Encuadre de toda la isla */
const MALLORCA_BOUNDS: [[number, number], [number, number]] = [[39.25, 2.33], [39.97, 3.48]]

/** Iconos (trazos de Lucide) dibujados dentro de cada marcador */
const ICON_PATHS: Record<SpotCategory, string> = {
  calas: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  miradores: '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
  naturaleza: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
  pueblos: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  dormir: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
}

const pinHtml = (spot: GuideSpot, selected: boolean, label: string) => `
  <span class="gmap-pin${selected ? ' is-selected' : ''}" style="--pin:${CATEGORY_COLORS[spot.category]}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[spot.category]}</svg>
    ${label ? `<span class="gmap-pin__num">${label}</span>` : ''}
  </span>`

export default function GuideMap({ spots, selectedId, onSelect, routeIds, dark = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const leafletRef = useRef<typeof Leaflet | null>(null)
  const tileRef = useRef<Leaflet.TileLayer | null>(null)
  const layerRef = useRef<Leaflet.LayerGroup | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const drawRef = useRef<(refit?: boolean) => void>(() => {})

  // Crear el mapa una sola vez
  useEffect(() => {
    let cancelled = false
    let resizeObs: ResizeObserver | null = null
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current || mapRef.current) return
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      leafletRef.current = L
      const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: false, zoomSnap: 0.25, zoomDelta: 0.5 })
      map.fitBounds(MALLORCA_BOUNDS)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      tileRef.current = L.tileLayer(tileUrl(dark), { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      // Leaflet necesita recalcular su tamaño si el contenedor cambia (pestañas, responsive)
      let lastSize = { w: 0, h: 0 }
      resizeObs = new ResizeObserver(([entry]) => {
        const { width: w, height: h } = entry.contentRect
        map.invalidateSize()
        // Reencuadrar solo si el tamaño cambia de verdad (primera pintura, pestañas, giro del móvil)
        if (Math.abs(w - lastSize.w) > 40 || Math.abs(h - lastSize.h) > 40) drawRef.current(true)
        lastSize = { w, h }
      })
      resizeObs.observe(containerRef.current)
      requestAnimationFrame(() => {
        map.invalidateSize()
        drawRef.current(true)
      })
    })()
    return () => {
      cancelled = true
      resizeObs?.disconnect()
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cambiar las teselas con el tema
  useEffect(() => {
    tileRef.current?.setUrl(tileUrl(dark))
  }, [dark])

  // Al cambiar de filtro o de ruta se reencuadra; al seleccionar un lugar solo se centra en él
  useEffect(() => {
    drawRef.current(true)
  }, [spots, routeIds])
  useEffect(() => {
    drawRef.current(false)
  }, [selectedId])

  const ordered = routeIds?.length
    ? (routeIds.map(id => spots.find(s => s.id === id)).filter(Boolean) as GuideSpot[])
    : spots

  drawRef.current = (refit = false) => {
    const L = leafletRef.current
    const map = mapRef.current
    const layer = layerRef.current
    if (!L || !map || !layer) return
    layer.clearLayers()

    if (routeIds?.length && ordered.length > 1) {
      L.polyline(ordered.map(s => [s.lat, s.lng] as [number, number]), {
        color: '#C8932F',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '2 9',
        lineCap: 'round',
      }).addTo(layer)
    }

    ordered.forEach((spot, index) => {
      const selected = spot.id === selectedId
      const size = selected ? 46 : 36
      const icon = L.divIcon({
        className: 'gmap-pin-wrap',
        html: pinHtml(spot, selected, routeIds?.length ? String(index + 1) : ''),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
      const marker = L.marker([spot.lat, spot.lng], {
        icon,
        title: `${spot.name} · ${CATEGORY_LABELS[spot.category]}`,
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : 0,
      })
      marker.on('click', () => onSelectRef.current(spot.id))
      marker.addTo(layer)
    })

    const focus = ordered.find(s => s.id === selectedId)
    if (focus && !refit) {
      map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 11), { duration: 0.6 })
    } else if (refit) {
      fitAll()
    }
  }

  function fitAll() {
    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map) return
    if (ordered.length > 1) {
      map.flyToBounds(L.latLngBounds(ordered.map(s => [s.lat, s.lng] as [number, number])), { padding: [28, 28], maxZoom: 11, duration: 0.6 })
    } else {
      map.flyToBounds(MALLORCA_BOUNDS, { duration: 0.6 })
    }
  }

  const resetIsland = () => mapRef.current?.flyToBounds(MALLORCA_BOUNDS, { duration: 0.7 })

  const legend = (Object.keys(CATEGORY_LABELS) as SpotCategory[]).filter(c => ordered.some(s => s.category === c))

  return (
    <div className={`gmap ${dark && !MAPBOX_TOKEN ? 'gmap--dim' : ''}`}>
      <div ref={containerRef} className="gmap__canvas" role="region" aria-label="Mapa de los lugares de la guía" />

      <button type="button" className="gmap-reset" onClick={resetIsland}>
        <Maximize2 size={15} aria-hidden="true" />
        Toda la isla
      </button>

      {legend.length > 1 && (
        <ul className="gmap-legend" aria-label="Leyenda del mapa">
          {legend.map(c => (
            <li key={c}>
              <span className="gmap-legend__dot" style={{ '--pin': CATEGORY_COLORS[c] } as React.CSSProperties}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICON_PATHS[c] }} />
              </span>
              {CATEGORY_LABELS[c]}
            </li>
          ))}
        </ul>
      )}

      <style jsx global>{`
        .gmap {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 20px;
          overflow: hidden;
          background: var(--usr-surface-2);
          box-shadow: var(--usr-card-shadow);
          border: 1px solid var(--usr-card-border);
          isolation: isolate;
        }
        .gmap__canvas {
          position: absolute;
          inset: 0;
        }
        /* Sin Mapbox, en tema oscuro se oscurecen las teselas de OSM */
        .gmap--dim .leaflet-tile-pane {
          filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.88) saturate(0.6);
        }
        .gmap .leaflet-control-attribution {
          font-size: 10px;
          background: var(--usr-glass);
          color: var(--usr-text-3);
        }
        .gmap .leaflet-control-attribution a {
          color: var(--usr-text-2);
        }
        .gmap .leaflet-bar {
          border: 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 6px 18px -6px rgba(0, 0, 0, 0.35);
        }
        .gmap .leaflet-bar a {
          width: 40px;
          height: 40px;
          line-height: 40px;
          background: var(--usr-surface);
          color: var(--usr-text);
          border-color: var(--usr-border);
        }

        /* Marcadores */
        .gmap-pin-wrap {
          background: none;
          border: 0;
        }
        .gmap-pin {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: var(--pin);
          color: #FFFFFF;
          border: 3px solid #FFFFFF;
          box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.06);
          box-sizing: border-box;
          cursor: pointer;
          transition: transform 160ms var(--ease-out);
        }
        .gmap-pin svg {
          width: 55%;
          height: 55%;
        }
        .gmap-pin:hover {
          transform: scale(1.12);
        }
        .gmap-pin.is-selected {
          box-shadow: 0 0 0 5px color-mix(in srgb, var(--pin) 35%, transparent), 0 8px 20px -4px rgba(0, 0, 0, 0.45);
        }
        .gmap-pin__num {
          position: absolute;
          top: -7px;
          right: -7px;
          min-width: 19px;
          height: 19px;
          padding: 0 4px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1A1714;
          color: #FFFFFF;
          border: 2px solid #FFFFFF;
          font: 700 10px/1 var(--font-sans);
        }

        /* Botón de vista completa */
        .gmap-reset {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 500;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 40px;
          padding: 8px 14px;
          border: 0;
          border-radius: 12px;
          background: var(--usr-surface);
          color: var(--usr-text);
          font: inherit;
          font-size: 0.82rem;
          font-weight: 600;
          box-shadow: 0 6px 18px -6px rgba(0, 0, 0, 0.35);
          cursor: pointer;
        }
        .gmap-reset:hover {
          background: var(--usr-surface-2);
        }

        /* Leyenda */
        .gmap-legend {
          position: absolute;
          left: 12px;
          bottom: 12px;
          z-index: 500;
          display: flex;
          flex-wrap: wrap;
          gap: 6px 12px;
          max-width: calc(100% - 80px);
          margin: 0;
          padding: 8px 12px;
          list-style: none;
          border-radius: 12px;
          background: var(--usr-glass);
          backdrop-filter: blur(8px);
          box-shadow: 0 6px 18px -8px rgba(0, 0, 0, 0.3);
        }
        .gmap-legend li {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.74rem;
          font-weight: 600;
          color: var(--usr-text);
        }
        .gmap-legend__dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--pin);
          color: #FFFFFF;
        }
        .gmap-legend__dot svg {
          width: 12px;
          height: 12px;
        }
        @media (max-width: 640px) {
          .gmap-legend {
            display: none;
          }
          .gmap-reset {
            top: 10px;
            right: 10px;
          }
        }
      `}</style>
    </div>
  )
}
