'use client'

import { useEffect, useRef } from 'react'
import type * as Leaflet from 'leaflet'
import type { GuideSpot } from '@/lib/guide/mallorcaSpots'

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
const MALLORCA_CENTER: [number, number] = [39.62, 2.98]

export default function GuideMap({ spots, selectedId, onSelect, routeIds, dark = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const leafletRef = useRef<typeof Leaflet | null>(null)
  const tileRef = useRef<Leaflet.TileLayer | null>(null)
  const layerRef = useRef<Leaflet.LayerGroup | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

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
      const map = L.map(containerRef.current, {
        center: MALLORCA_CENTER,
        zoom: 9,
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true,
      })
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      tileRef.current = L.tileLayer(tileUrl(dark), { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      // Leaflet necesita recalcular su tamaño si el contenedor cambia (pestañas, responsive)
      resizeObs = new ResizeObserver(() => { map.invalidateSize(); drawRef.current() })
      resizeObs.observe(containerRef.current)
      requestAnimationFrame(() => { map.invalidateSize(); drawRef.current() })
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

  // Redibujar marcadores y ruta
  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots, selectedId, routeIds])

  const drawRef = useRef<() => void>(() => {})
  drawRef.current = draw

  function draw() {
    const L = leafletRef.current
    const map = mapRef.current
    const layer = layerRef.current
    if (!L || !map || !layer) return
    layer.clearLayers()

    const ordered = routeIds?.length
      ? routeIds.map(id => spots.find(s => s.id === id)).filter(Boolean) as GuideSpot[]
      : spots

    if (routeIds?.length && ordered.length > 1) {
      L.polyline(ordered.map(s => [s.lat, s.lng] as [number, number]), {
        color: getComputedStyle(containerRef.current!).getPropertyValue('--usr-gold').trim() || '#B8893A',
        weight: 3,
        opacity: 0.85,
        dashArray: '6 8',
      }).addTo(layer)
    }

    ordered.forEach((spot, index) => {
      const selected = spot.id === selectedId
      const label = routeIds?.length ? String(index + 1) : ''
      const icon = L.divIcon({
        className: '',
        html: `<span class="gmap-pin gmap-pin--${spot.category}${selected ? ' is-selected' : ''}">${label}</span>`,
        iconSize: selected ? [30, 30] : [22, 22],
        iconAnchor: selected ? [15, 15] : [11, 11],
      })
      const marker = L.marker([spot.lat, spot.lng], { icon, title: spot.name, keyboard: true, zIndexOffset: selected ? 1000 : 0 })
      marker.on('click', () => onSelectRef.current(spot.id))
      marker.addTo(layer)
    })

    const focus = ordered.find(s => s.id === selectedId)
    if (focus) {
      map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 11), { duration: 0.6 })
    } else if (ordered.length > 0) {
      map.fitBounds(L.latLngBounds(ordered.map(s => [s.lat, s.lng] as [number, number])), { padding: [36, 36], maxZoom: 11 })
    }
  }

  return (
    <div className={`gmap ${dark && !MAPBOX_TOKEN ? 'gmap--dim' : ''}`}>
      <div ref={containerRef} className="gmap__canvas" role="region" aria-label="Mapa de los lugares de la guía" />
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
        .gmap .leaflet-bar a {
          width: 36px;
          height: 36px;
          line-height: 36px;
          background: var(--usr-surface);
          color: var(--usr-text);
          border-color: var(--usr-border);
        }
        .gmap-pin {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2.5px solid #FFFFFF;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          color: #FFFFFF;
          font: 700 11px/1 var(--font-sans);
          cursor: pointer;
          transition: transform 160ms var(--ease-out);
        }
        .gmap-pin:hover {
          transform: scale(1.12);
        }
        .gmap-pin--calas { background: #3F6683; }
        .gmap-pin--miradores { background: #9A5F22; }
        .gmap-pin--pueblos { background: #4F6E55; }
        .gmap-pin--dormir { background: #1A1714; }
        .gmap-pin.is-selected {
          box-shadow: 0 0 0 4px rgba(204, 160, 83, 0.55), 0 4px 14px rgba(0, 0, 0, 0.35);
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}
