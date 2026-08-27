'use client'

import { useState } from 'react'
import { MapPin, Navigation, Compass, ExternalLink, Waves, Moon, Droplets, Sun, Sparkles } from 'lucide-react'

interface Spot {
  id: string
  name: string
  category: 'calas' | 'pernocta' | 'servicios' | 'gastro'
  categoryLabel: string
  area: string
  description: string
  camperAccess: 'Acceso Fácil' | 'Camper Compacta' | 'Carretera Estrecha'
  hasWater: boolean
  hasOvernight: boolean
  googleMapsUrl: string
  image: string
}

const SPOTS: Spot[] = [
  {
    id: '1',
    name: 'Cala Varques',
    category: 'calas',
    categoryLabel: 'Cala Virgen',
    area: 'Sureste (Manacor)',
    description: 'Una de las calas más espectaculares de aguas turquesas y formaciones rocosas. Ideal para pasar el día y caminar.',
    camperAccess: 'Acceso Fácil',
    hasWater: false,
    hasOvernight: false,
    googleMapsUrl: 'https://maps.google.com/?q=Cala+Varques+Mallorca',
    image: '/images/experiences/exp2.png',
  },
  {
    id: '2',
    name: 'Mirador de Ses Ánimes',
    category: 'pernocta',
    categoryLabel: 'Punto de Pernocta',
    area: 'Serra de Tramuntana (Banyalbufar)',
    description: 'Puesta de sol inolvidable con vistas a la torre histórica y acantilados. Aparcamiento plano con vistas panorámicas.',
    camperAccess: 'Camper Compacta',
    hasWater: false,
    hasOvernight: true,
    googleMapsUrl: 'https://maps.google.com/?q=Torre+del+Verger+Mallorca',
    image: '/images/campers/neo-s-b.jpg',
  },
  {
    id: '3',
    name: 'Área de Servicios Camper Manacor',
    category: 'servicios',
    categoryLabel: 'Punto de Servicio',
    area: 'Centro-Este (Manacor)',
    description: 'Estación completa de carga de agua potable y vaciado higiénico de aguas grises y negras.',
    camperAccess: 'Acceso Fácil',
    hasWater: true,
    hasOvernight: false,
    googleMapsUrl: 'https://maps.google.com/?q=Area+Autocaravanas+Manacor',
    image: '/images/about/transit.jpg',
  },
  {
    id: '4',
    name: 'Sa Foradada & Deià',
    category: 'gastro',
    categoryLabel: 'Atardecer & Chiringuito',
    area: 'Serra de Tramuntana',
    description: 'El atardecer más famoso de la isla frente a la roca agujereada. Arroces a leña en el mirador.',
    camperAccess: 'Camper Compacta',
    hasWater: false,
    hasOvernight: false,
    googleMapsUrl: 'https://maps.google.com/?q=Sa+Foradada+Mallorca',
    image: '/images/experiences/exp3.png',
  },
  {
    id: '5',
    name: 'Cala Tuent & Sa Calobra',
    category: 'calas',
    categoryLabel: 'Cala de Montaña',
    area: 'Norte (Escorca)',
    description: 'Ruta mítica por la carretera del Nus de Sa Corbata hacia una cala de piedras bajo el Puig Major.',
    camperAccess: 'Carretera Estrecha',
    hasWater: false,
    hasOvernight: true,
    googleMapsUrl: 'https://maps.google.com/?q=Cala+Tuent+Mallorca',
    image: '/images/experiences/exp4.png',
  },
  {
    id: '6',
    name: 'Pernocta en Betlem (Artà)',
    category: 'pernocta',
    categoryLabel: 'Punto de Pernocta',
    area: 'Noreste (Bahía de Alcúdia)',
    description: 'Tranquilidad absoluta junto a la costa con el Parque Natural de Llevant a tus espaldas.',
    camperAccess: 'Acceso Fácil',
    hasWater: false,
    hasOvernight: true,
    googleMapsUrl: 'https://maps.google.com/?q=Betlem+Mallorca',
    image: '/images/campers/space/space-ext.png',
  }
]

export default function MallorcaGuideClient() {
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filteredSpots = activeCategory === 'all' 
    ? SPOTS 
    : SPOTS.filter(s => s.category === activeCategory)

  return (
    <div className="guide-container">
      {/* Header */}
      <div className="guide-header">
        <div>
          <div className="guide-kicker">
            <Sparkles size={13} />
            <span>Guía Exclusiva Utopia</span>
          </div>
          <h1 className="text-h2" style={{ marginTop: 'var(--space-1)', textWrap: 'balance' }}>
            Rutas & Rincones de Mallorca
          </h1>
          <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-1)', maxWidth: 620 }}>
            Nuestra selección privada de calas vírgenes, pernoctas mágicas y puntos de servicio recomendados para tu camper.
          </p>
        </div>

        <a 
          href="https://maps.app.goo.gl/JnVmcVMGndYc5Mse8?g_st=i" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-forest btn-lg guide-map-btn"
        >
          <Navigation size={18} />
          <span>Abrir Mapa en Google Maps</span>
          <ExternalLink size={14} style={{ opacity: 0.7 }} />
        </a>
      </div>

      {/* Official Map Highlight Banner */}
      <div className="map-banner">
        <div className="map-banner__content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--sand)' }}>
            <MapPin size={16} />
            <span className="text-xs" style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Mapa Oficial Utopia Van Life
            </span>
          </div>
          <h3 className="text-h3" style={{ color: 'white', marginTop: 6, marginBottom: 8 }}>
            +45 Puntos Marcados por Expertos Locales
          </h3>
          <p className="text-small" style={{ color: 'rgba(255,255,255,0.8)', maxWidth: 520, lineHeight: 1.6 }}>
            Accede al mapa sincronizado directamente en tu aplicación de Google Maps con accesos, parkings aptos para campers, fuentes de agua y atardeceres.
          </p>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <a 
              href="https://maps.app.goo.gl/JnVmcVMGndYc5Mse8?g_st=i" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-sand btn-sm"
              style={{ fontWeight: 600 }}
            >
              Ver en Google Maps App
            </a>
          </div>
        </div>
        <div className="map-banner__graphic">
          <div className="map-badge-pill">
            <Navigation size={14} style={{ color: 'var(--forest-green)' }} />
            <span>Navegación GPS directa</span>
          </div>
        </div>
      </div>

      {/* Categories Filter */}
      <div className="category-filters">
        <button 
          onClick={() => setActiveCategory('all')}
          className={`filter-btn ${activeCategory === 'all' ? 'filter-btn--active' : ''}`}
        >
          Todos los rincones ({SPOTS.length})
        </button>
        <button 
          onClick={() => setActiveCategory('calas')}
          className={`filter-btn ${activeCategory === 'calas' ? 'filter-btn--active' : ''}`}
        >
          <Waves size={15} />
          <span>Calas & Playas</span>
        </button>
        <button 
          onClick={() => setActiveCategory('pernocta')}
          className={`filter-btn ${activeCategory === 'pernocta' ? 'filter-btn--active' : ''}`}
        >
          <Moon size={15} />
          <span>Pernocta Recomendada</span>
        </button>
        <button 
          onClick={() => setActiveCategory('servicios')}
          className={`filter-btn ${activeCategory === 'servicios' ? 'filter-btn--active' : ''}`}
        >
          <Droplets size={15} />
          <span>Puntos de Agua & Vaciado</span>
        </button>
        <button 
          onClick={() => setActiveCategory('gastro')}
          className={`filter-btn ${activeCategory === 'gastro' ? 'filter-btn--active' : ''}`}
        >
          <Sun size={15} />
          <span>Atardeceres & Gastro</span>
        </button>
      </div>

      {/* Spots Grid */}
      <div className="spots-grid">
        {filteredSpots.map(spot => (
          <article key={spot.id} className="spot-card">
            <div className="spot-card__img-wrap">
              <img src={spot.image} alt={spot.name} className="spot-card__img" />
              <span className="spot-card__category-badge">{spot.categoryLabel}</span>
            </div>

            <div className="spot-card__body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <span className="text-xs" style={{ color: 'var(--sand-dark)', fontWeight: 600 }}>{spot.area}</span>
                  <h3 className="text-h4" style={{ marginTop: 2 }}>{spot.name}</h3>
                </div>
              </div>

              <p className="text-small" style={{ color: 'var(--gray-600)', lineHeight: 1.6, marginTop: 6, flex: 1 }}>
                {spot.description}
              </p>

              <div className="spot-card__tags">
                <span className={`tag-pill ${spot.camperAccess === 'Acceso Fácil' ? 'tag-pill--easy' : 'tag-pill--tight'}`}>
                  {spot.camperAccess}
                </span>
                {spot.hasWater && (
                  <span className="tag-pill tag-pill--water">💧 Agua potable</span>
                )}
                {spot.hasOvernight && (
                  <span className="tag-pill tag-pill--moon">🌙 Pernocta apta</span>
                )}
              </div>

              <a 
                href={spot.googleMapsUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
                style={{ width: '100%', justifyContent: 'center', gap: 6, marginTop: 'var(--space-3)' }}
              >
                <Navigation size={14} />
                <span>Cómo Llegar en GPS</span>
              </a>
            </div>
          </article>
        ))}
      </div>

      <style jsx>{`
        .guide-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        .guide-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: var(--space-6);
          flex-wrap: wrap;
          padding-bottom: var(--space-4);
          border-bottom: 1px solid var(--gray-200);
        }
        .guide-kicker {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--sand-dark);
          background: rgba(200, 168, 130, 0.15);
          padding: 3px 10px;
          border-radius: var(--radius-full);
        }
        .guide-map-btn {
          flex-shrink: 0;
          gap: 8px;
        }
        
        .map-banner {
          background: linear-gradient(135deg, var(--forest-green) 0%, #1a251a 100%);
          border-radius: var(--radius-lg);
          padding: var(--space-8);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(45, 58, 45, 0.15);
        }
        .map-badge-pill {
          background: rgba(255, 255, 255, 0.95);
          color: var(--black-matte);
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-size: 0.82rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .category-filters {
          display: flex;
          gap: var(--space-2);
          overflow-x: auto;
          padding-bottom: var(--space-1);
        }
        .filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          border: 1px solid var(--gray-200);
          background: white;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--gray-700);
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .filter-btn:hover {
          border-color: var(--forest-green);
          color: var(--forest-green);
        }
        .filter-btn--active {
          background: var(--forest-green) !important;
          color: var(--sand) !important;
          border-color: var(--forest-green) !important;
          font-weight: 600;
        }

        .spots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--space-6);
        }
        .spot-card {
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .spot-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(45, 58, 45, 0.08);
          border-color: rgba(45, 58, 45, 0.2);
        }
        .spot-card__img-wrap {
          position: relative;
          aspect-ratio: 16/10;
          background: var(--gray-100);
          overflow: hidden;
        }
        .spot-card__img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .spot-card:hover .spot-card__img {
          transform: scale(1.04);
        }
        .spot-card__category-badge {
          position: absolute;
          top: var(--space-3);
          left: var(--space-3);
          background: rgba(245, 245, 243, 0.95);
          color: var(--black-matte);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.72rem;
          font-weight: 600;
          border: 1px solid rgba(0,0,0,0.06);
        }
        .spot-card__body {
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .spot-card__tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: var(--space-3);
        }
        .tag-pill {
          font-size: 0.72rem;
          font-weight: 500;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          background: var(--gray-100);
          color: var(--gray-700);
        }
        .tag-pill--easy {
          background: rgba(39, 174, 96, 0.12);
          color: #1a7a40;
        }
        .tag-pill--tight {
          background: rgba(230, 126, 34, 0.12);
          color: #c0620a;
        }
        .tag-pill--water {
          background: rgba(52, 152, 219, 0.12);
          color: #2980b9;
        }
        .tag-pill--moon {
          background: rgba(155, 89, 182, 0.12);
          color: #8e44ad;
        }

        @media (max-width: 768px) {
          .map-banner__graphic { display: none; }
          .guide-map-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  )
}
