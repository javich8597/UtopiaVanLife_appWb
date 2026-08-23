'use client'

import { useEffect, useRef, useState } from 'react'

const POI_COLORS: Record<string, string> = {
    cala: '#2D3A2D',
    gastronomia: '#C8A882',
    pernocta: '#1A1A1A',
    aventura: '#3D5040',
    cultura: '#9E9690',
}

const POI_EMOJIS: Record<string, string> = {
    cala: '🏖',
    gastronomia: '🍽',
    pernocta: '🌙',
    aventura: '⛰',
    cultura: '🏛',
}

interface POI {
    id: string
    name_es: string
    lat: number
    lng: number
    category: string
}

interface MapboxExperiencesProps {
    pois?: POI[]
}

const DEFAULT_POIS: POI[] = [
    { id: '1', name_es: 'Cala Mesquida', lat: 39.7219, lng: 3.4701, category: 'cala' },
    { id: '2', name_es: 'Cala Agulla', lat: 39.7158, lng: 3.4680, category: 'cala' },
    { id: '3', name_es: 'Cala Mondragó', lat: 39.3400, lng: 3.1862, category: 'cala' },
    { id: '4', name_es: 'Cap de Formentor', lat: 39.9572, lng: 3.2119, category: 'aventura' },
    { id: '5', name_es: 'Serra de Tramuntana', lat: 39.7956, lng: 2.7744, category: 'aventura' },
    { id: '6', name_es: 'Port de Pollença', lat: 39.9088, lng: 3.0916, category: 'gastronomia' },
    { id: '7', name_es: 'Deià', lat: 39.7476, lng: 2.6488, category: 'cultura' },
    { id: '8', name_es: 'Valldemossa', lat: 39.7097, lng: 2.6219, category: 'cultura' },
    { id: '9', name_es: "Área Pernocta S'Albufera", lat: 39.7954, lng: 3.0897, category: 'pernocta' },
]

export default function MapboxExperiences({ pois = DEFAULT_POIS }: MapboxExperiencesProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)
    const [selectedPOI, setSelectedPOI] = useState<POI | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted || !mapRef.current) return

        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        if (!token) return

        let mapInstance: any = null

        import('mapbox-gl').then(mapboxgl => {
            if (!mapRef.current) return
            mapboxgl.default.accessToken = token

            mapInstance = new mapboxgl.default.Map({
                container: mapRef.current,
                style: 'mapbox://styles/mapbox/outdoors-v12',
                center: [2.9896, 39.6953], // Mallorca center
                zoom: 9,
                pitch: 0,
                attributionControl: false,
            })

            mapInstance.addControl(new mapboxgl.default.NavigationControl({ showCompass: false }), 'bottom-right')

            mapInstance.on('load', () => {
                // Add custom markers for each POI
                pois.forEach(poi => {
                    const el = document.createElement('div')
                    el.className = 'map-marker'
                    el.style.cssText = `
            width: 36px; height: 36px;
            background: ${POI_COLORS[poi.category]};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: transform 0.2s;
          `
                    const inner = document.createElement('div')
                    inner.style.cssText = 'transform: rotate(45deg); font-size: 14px; text-align: center; line-height: 1;'
                    inner.textContent = POI_EMOJIS[poi.category] ?? '📍'
                    el.appendChild(inner)

                    el.addEventListener('mouseenter', () => {
                        el.style.transform = 'rotate(-45deg) scale(1.2)'
                        setSelectedPOI(poi)
                    })
                    el.addEventListener('mouseleave', () => {
                        el.style.transform = 'rotate(-45deg) scale(1)'
                    })

                    new mapboxgl.default.Marker({ element: el })
                        .setLngLat([poi.lng, poi.lat])
                        .addTo(mapInstance)
                })
            })
        })

        return () => {
            if (mapInstance) mapInstance.remove()
        }
    }, [mounted, pois])

    const categories = [...new Set(pois.map(p => p.category))]

    return (
        <div className="map-section">
            <div className="map-legend">
                {categories.map(cat => (
                    <div key={cat} className="map-legend__item">
                        <span className="map-legend__dot" style={{ background: POI_COLORS[cat] }} />
                        <span className="map-legend__label">{POI_EMOJIS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                    </div>
                ))}
            </div>

            <div ref={mapRef} className="map-container" />

            {selectedPOI && (
                <div className="map-tooltip">
                    <strong>{selectedPOI.name_es}</strong>
                    <span className="badge badge-sand" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                        {selectedPOI.category}
                    </span>
                </div>
            )}

            <style jsx>{`
        .map-section {
          position: relative;
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--gray-200);
        }
        .map-container {
          height: 400px;
          width: 100%;
        }
        .map-legend {
          position: absolute;
          top: var(--space-4);
          left: var(--space-4);
          z-index: 10;
          background: rgba(245,245,243,0.9);
          backdrop-filter: blur(12px);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          box-shadow: var(--shadow-md);
        }
        .map-legend__item {
          display: flex; align-items: center; gap: var(--space-2);
        }
        .map-legend__dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .map-legend__label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--black-matte);
          text-transform: capitalize;
        }
        .map-tooltip {
          position: absolute;
          bottom: var(--space-4);
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-4);
          box-shadow: var(--shadow-lg);
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
        }
      `}</style>
        </div>
    )
}
