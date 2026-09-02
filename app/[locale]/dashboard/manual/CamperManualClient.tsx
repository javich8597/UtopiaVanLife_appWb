'use client'

import { useState } from 'react'
import { Search, Zap, Droplets, Flame, Bed, Bath, Fuel, FileDown, MessageCircle, ChevronDown, ChevronUp, AlertTriangle, Sparkles, BookOpen, Play, Video, Phone, LifeBuoy, PhoneCall } from 'lucide-react'

interface GuideSection {
  id: string
  icon: any
  title: string
  systemName: string
  summary: string
  tags: string[]
  videoUrl: string
  videoDuration: string
  posterUrl: string
  steps: string[]
  proTip?: string
  warning?: string
}

const GUIDES: GuideSection[] = [
  {
    id: 'victron',
    icon: Zap,
    title: 'Sistema Eléctrico Autónomo Victron',
    systemName: 'Victron Energy & Litio 540Ah',
    summary: 'Tu camper cuenta con autonomía 100% gracias a placas solares monocristalinas de 400W, 540Ah de litio Victron e inversor Multiplus 2000W.',
    tags: ['batería', 'pantalla', 'enchufes', 'solar', 'victron', 'electricidad', '230v', 'inversor', 'garmin'],
    videoUrl: '/videos/hero-bg.mov',
    videoDuration: '1:45 min',
    posterUrl: '/images/campers/neo/neo-interior.png',
    steps: [
      'Lectura de batería: En la pantalla táctil Garmin SERV verás el porcentaje de batería actual, el consumo y la entrada solar en tiempo real.',
      'Enchufes a 230V: Para utilizar electrodomésticos (cafetera, secador, portátil), activa el inversor Multiplus de 2000W.',
      'Carga en marcha y solar: La batería se recarga automáticamente mientras conduces (cargador Orión 50A) y mediante las placas solares de 400W.',
      'Ahorro nocturno: Desconecta el inversor de 230V antes de dormir si solo necesitas luces y tomas USB de 12V.'
    ],
    proTip: 'En un día soleado de Mallorca, la batería de litio de 540Ah se mantendrá con carga continua gracias a los 400W de placas solares.',
    warning: 'Evita conectar aparatos de más de 2000W simultáneamente para proteger el inversor.'
  },
  {
    id: 'aguas',
    icon: Droplets,
    title: 'Gestión de Aguas & Ducha Caliente',
    systemName: 'Depósito 113L (NEO) / 160L (SPACE) & Boiler Truma',
    summary: 'Control de nivel de agua limpia, activación de la bomba y vaciado ecológico en puntos autorizados.',
    tags: ['agua', 'ducha', 'grifo', 'bomba', 'vaciado', 'caliente', 'boiler', 'fregadero'],
    videoUrl: '/videos/video_noche_min.mp4',
    videoDuration: '2:10 min',
    posterUrl: '/images/about/interior-about.png',
    steps: [
      'Bomba de agua: Pulsa el botón "PUMP" en la pantalla de control antes de abrir cualquier grifo o usar la ducha.',
      'Agua caliente: Activa el boiler Truma Combi 4D diésel 15 minutos antes de ducharte para alcanzar la temperatura óptima.',
      'Llenado de agua limpia: Utiliza la manguera y bocana exterior (113L en NEO, 160L en SPACE).',
      'Vaciado de aguas grises: Abre la palanca inferior situada en el chasis cuando te encuentres en una rejilla de punto de vaciado autorizado (90-93L).'
    ],
    proTip: 'Una carga completa de agua da para 3-5 días de uso moderado para 2 personas.',
    warning: 'Apaga siempre la bomba de agua ("PUMP OFF") antes de circular para evitar goteos por presión.'
  },
  {
    id: 'clima',
    icon: Flame,
    title: 'Calefacción Estacionaria & Nevera',
    systemName: 'Calefacción Diésel & Nevera Indel B 86L',
    summary: 'Mantenimiento del clima perfecto en cualquier estación y uso eficiente de la nevera de compresor.',
    tags: ['calefacción', 'frío', 'nevera', 'temperatura', 'calor', 'invierno', 'congelador'],
    videoUrl: '/videos/hero-bg-2.mov',
    videoDuration: '1:20 min',
    posterUrl: '/images/campers/space/space-interior.png',
    steps: [
      'Calefacción estacionaria: Funciona con el combustible del depósito sin necesidad de tener el motor encendido.',
      'Termostato: Gira la rueda digital y selecciona la temperatura deseada (recomendado 20ºC - 22ºC).',
      'Nevera Indel B: Nevera de compresor a 12V que enfría rápidamente. Mantén la rueda en el nivel 3 o 4.',
      'Cierre seguro: Asegúrate de que el pestillo de la nevera hace "click" antes de arrancar para que no se abra en curvas.'
    ],
    proTip: 'La calefacción consume menos de 0.2L de diésel por hora en funcionamiento continuo.'
  },
  {
    id: 'cama',
    icon: Bed,
    title: 'Salón Convertible & Claraboya',
    systemName: 'Cama Abatible & Ventilación',
    summary: 'Cómo desplegar la cama en menos de 1 minuto y disfrutar de la vista nocturna por la claraboya panorámica.',
    tags: ['cama', 'dormir', 'salón', 'mesa', 'claraboya', 'estrellas', 'mosquitera'],
    videoUrl: '/videos/hero-bg.mov',
    videoDuration: '1:15 min',
    posterUrl: '/images/campers/neo-s-b.jpg',
    steps: [
      'Bajar la mesa: Desbloquea la pestaña de la pata de la mesa y bájala para apoyarla sobre las guías de los asientos.',
      'Colocar cojines: Extiende los cojines ergonómicos de alta densidad formando el colchón continuo.',
      'Claraboya panorámica: Abre la manivela superior para ventilar y acciona la mosquitera o el oscurecedor según la hora del día.'
    ],
    proTip: 'Usa el oscurecedor térmico en la luna delantera durante el día para mantener el interior fresco.'
  },
  {
    id: 'bano',
    icon: Bath,
    title: 'Baño Interior & WC Portátil',
    systemName: 'Cabina de Ducha & Porta Potti',
    summary: 'Uso del inodoro químico portátil y mantenimiento de la cabina de ducha interior.',
    tags: ['wc', 'baño', 'químico', 'váter', 'ducha', 'pastillas', 'limpieza'],
    videoUrl: '/videos/video_noche_min.mp4',
    videoDuration: '1:50 min',
    posterUrl: '/images/campers/neo/360-panorama.png',
    steps: [
      'Uso del WC: Abre la guillotina con la palanca frontal antes de usar y presiona la bomba de descarga de agua.',
      'Pastilla química ecológica: Incluimos pastillas biodegradables en el kit de bienvenida para descomponer residuos.',
      'Vaciado de casete: Vacía el depósito en las zonas habilitadas (química) en áreas camper o gasolineras autorizadas.'
    ],
    warning: 'Nunca arrojes toallitas húmedas ni papel no biodegradable al WC.'
  },
  {
    id: 'conduccion',
    icon: Fuel,
    title: 'Conducción, Combustible & Medidas',
    systemName: 'Fiat Ducato 140 CV / Dimensiones',
    summary: 'Consejos de conducción, altura libre, tipo de combustible (Diésel + AdBlue) y aparcamiento en Mallorca.',
    tags: ['conducción', 'diésel', 'gasolina', 'adblue', 'altura', 'medidas', 'parking', 'marchas'],
    videoUrl: '/videos/hero-bg-2.mov',
    videoDuration: '2:30 min',
    posterUrl: '/images/campers/space/space-ext.png',
    steps: [
      'Combustible: Reposta únicamente Diésel (Gasóleo A). El depósito se entrega y devuelve lleno.',
      'Altura libre: Camper NEO: 2.65m de altura / Camper SPACE: 2.75m. Tenlo en cuenta en túneles bajos y parkings cubiertos.',
      'Pueblos estrechos: En cascos antiguos de pueblos como Deià, Valldemossa o Fornalutx, aparca siempre en las afueras.'
    ],
    proTip: 'La camper cuenta con cámara de visión trasera y sensores para facilitar cualquier maniobra.'
  }
]

export default function CamperManualClient() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGuide, setExpandedGuide] = useState<string | null>('victron')
  const [filterVideosOnly, setFilterVideosOnly] = useState(false)

  const toggleGuide = (id: string) => {
    setExpandedGuide(prev => prev === id ? null : id)
  }

  const filteredGuides = GUIDES.filter(guide => {
    if (filterVideosOnly && !guide.videoUrl) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      guide.title.toLowerCase().includes(q) ||
      guide.summary.toLowerCase().includes(q) ||
      guide.systemName.toLowerCase().includes(q) ||
      guide.tags.some(tag => tag.includes(q))
    )
  })

  return (
    <div className="manual-container">
      {/* Header */}
      <div className="manual-header">
        <div>
          <div className="manual-kicker">
            <BookOpen size={13} />
            <span>Videotutoriales & Guías Oficiales</span>
          </div>
          <h1 className="text-h2" style={{ marginTop: 'var(--space-1)', textWrap: 'balance' }}>
            Manual de Uso & Videotutoriales
          </h1>
          <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-1)', maxWidth: 620 }}>
            Aprende a utilizar todos los sistemas de tu camper (NEO & SPACE) con mini videotutoriales explicativos y pasos rápidos.
          </p>
        </div>

        <div className="manual-header__actions">
          <a 
            href="/legal/terminos" 
            target="_blank" 
            className="btn btn-outline btn-sm"
            style={{ gap: 6 }}
          >
            <FileDown size={15} />
            <span>Guía PDF</span>
          </a>
          <a 
            href="https://wa.me/34611560916" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-forest btn-sm"
            style={{ gap: 6 }}
          >
            <MessageCircle size={15} />
            <span>Dudas por WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Emergency Assistance Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
        border: '1px solid #BBF7D0',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <PhoneCall size={17} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '0.86rem', color: '#14532D' }}>¿Tienes una incidencia o avería en ruta?</strong>
            <span style={{ fontSize: '0.78rem', color: '#166534' }}>Llámanos directamente o contacta con asistencia 24h</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a 
            href="tel:+34611560916"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#16a34a',
              color: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <Phone size={13} />
            <span>Utopia: +34 611 560 916</span>
          </a>

          <a 
            href="tel:+34662992060"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#dc2626',
              color: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <LifeBuoy size={13} />
            <span>ARAG 24h: +34 662 992 060</span>
          </a>
        </div>
      </div>

      {/* Top Filter & Search Card */}
      <div className="search-row">
        <div className="search-card">
          <Search size={18} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
          <input 
            type="text"
            placeholder="¿Qué necesitas consultar? (ej. batería, agua caliente, calefacción, cama, diésel...)"
            className="search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="btn-clear">Limpiar</button>
          )}
        </div>

        <button 
          onClick={() => setFilterVideosOnly(!filterVideosOnly)}
          className={`filter-video-btn ${filterVideosOnly ? 'filter-video-btn--active' : ''}`}
        >
          <Video size={16} />
          <span>Solo con Videotutorial</span>
        </button>
      </div>

      {/* Results Count if searching */}
      {searchQuery && (
        <div className="text-small" style={{ color: 'var(--gray-600)' }}>
          Mostrando {filteredGuides.length} resultado{filteredGuides.length !== 1 ? 's' : ''} para &quot;<strong>{searchQuery}</strong>&quot;
        </div>
      )}

      {/* Guides List */}
      <div className="guides-list">
        {filteredGuides.map(guide => {
          const isExpanded = expandedGuide === guide.id
          const Icon = guide.icon

          return (
            <div key={guide.id} className={`guide-card ${isExpanded ? 'guide-card--expanded' : ''}`}>
              <button 
                type="button"
                className="guide-card__header"
                onClick={() => toggleGuide(guide.id)}
              >
                <div className="guide-card__icon-wrap">
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <div className="guide-card__title-area">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="guide-system-name">{guide.systemName}</span>
                    {guide.videoUrl && (
                      <span className="video-pill">
                        <Play size={10} fill="currentColor" />
                        <span>Vídeo {guide.videoDuration}</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-h4" style={{ marginTop: 2 }}>{guide.title}</h3>
                  {!isExpanded && (
                    <p className="text-small" style={{ color: 'var(--gray-600)', marginTop: 4, lineHeight: 1.5 }}>
                      {guide.summary}
                    </p>
                  )}
                </div>
                <div className="guide-card__chevron">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {isExpanded && (
                <div className="guide-card__content">
                  {/* Embedded Video Tutorial Player */}
                  {guide.videoUrl && (
                    <div className="video-player-box">
                      <div className="video-player-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Video size={15} style={{ color: 'var(--forest-green)' }} />
                          <span className="text-xs" style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--black-matte)' }}>
                            Videotutorial Explicativo ({guide.videoDuration})
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--gray-500)' }}>Vídeo HD</span>
                      </div>

                      <div className="video-wrapper">
                        <video 
                          controls 
                          playsInline
                          preload="metadata"
                          poster={guide.posterUrl}
                          className="embedded-video"
                        >
                          <source src={guide.videoUrl} type="video/mp4" />
                          <source src={guide.videoUrl} type="video/quicktime" />
                          Tu navegador no soporta reproducción de vídeo HTML5.
                        </video>
                      </div>
                    </div>
                  )}

                  <p className="text-body" style={{ color: 'var(--gray-700)', lineHeight: 1.6, marginTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    {guide.summary}
                  </p>

                  <h4 className="text-label" style={{ color: 'var(--sand-dark)', marginBottom: 'var(--space-2)' }}>
                    Puntos Clave y Pasos de Uso
                  </h4>
                  <div className="steps-list">
                    {guide.steps.map((step, idx) => (
                      <div key={idx} className="step-item">
                        <div className="step-number">{idx + 1}</div>
                        <p className="text-small" style={{ color: 'var(--gray-800)', lineHeight: 1.6 }}>{step}</p>
                      </div>
                    ))}
                  </div>

                  {guide.proTip && (
                    <div className="tip-box">
                      <Sparkles size={16} style={{ color: 'var(--forest-green)', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--forest-green)', marginBottom: 2 }}>Consejo Utopia</strong>
                        <span className="text-small" style={{ color: 'var(--gray-700)' }}>{guide.proTip}</span>
                      </div>
                    </div>
                  )}

                  {guide.warning && (
                    <div className="warning-box">
                      <AlertTriangle size={16} style={{ color: '#c0392b', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.8rem', color: '#c0392b', marginBottom: 2 }}>Importante</strong>
                        <span className="text-small" style={{ color: 'var(--gray-700)' }}>{guide.warning}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredGuides.length === 0 && (
          <div className="empty-guides">
            <p className="text-body" style={{ color: 'var(--gray-600)' }}>No encontramos ninguna guía para esa búsqueda.</p>
            <button onClick={() => { setSearchQuery(''); setFilterVideosOnly(false); }} className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-3)' }}>
              Ver todas las guías
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .manual-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        .manual-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: var(--space-6);
          flex-wrap: wrap;
          padding-bottom: var(--space-4);
          border-bottom: 1px solid var(--gray-200);
        }
        .manual-kicker {
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
        .manual-header__actions {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
        }

        .search-row {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
        }
        .search-card {
          flex: 1;
          min-width: 280px;
          display: flex;
          align-items: center;
          gap: var(--space-3);
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          padding: var(--space-3) var(--space-4);
          box-shadow: var(--shadow-sm);
        }
        .search-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.95rem;
          width: 100%;
          color: var(--black-matte);
        }
        .btn-clear {
          border: none;
          background: var(--gray-100);
          color: var(--gray-600);
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }

        .filter-video-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 var(--space-4);
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          background: white;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--gray-700);
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .filter-video-btn:hover {
          border-color: var(--forest-green);
          color: var(--forest-green);
        }
        .filter-video-btn--active {
          background: var(--forest-green) !important;
          color: var(--sand) !important;
          border-color: var(--forest-green) !important;
        }

        .video-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          background: rgba(45, 58, 45, 0.08);
          color: var(--forest-green);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .guides-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .guide-card {
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .guide-card--expanded {
          border-color: rgba(45, 58, 45, 0.25);
          box-shadow: 0 4px 20px rgba(45, 58, 45, 0.06);
        }
        .guide-card__header {
          width: 100%;
          border: none;
          background: transparent;
          display: flex;
          align-items: flex-start;
          gap: var(--space-4);
          padding: var(--space-5);
          cursor: pointer;
          text-align: left;
        }
        .guide-card__icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: rgba(45, 58, 45, 0.06);
          color: var(--forest-green);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .guide-card__title-area {
          flex: 1;
        }
        .guide-system-name {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--sand-dark);
        }
        .guide-card__chevron {
          color: var(--gray-400);
          padding-top: 4px;
        }
        .guide-card__content {
          padding: 0 var(--space-5) var(--space-5) calc(var(--space-5) + 44px + var(--space-4));
          border-top: 1px solid var(--gray-100);
          padding-top: var(--space-4);
        }

        .video-player-box {
          background: var(--gray-50);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: var(--space-4);
        }
        .video-player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: white;
          border-bottom: 1px solid var(--gray-200);
        }
        .video-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          background: #000;
        }
        .embedded-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .steps-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .step-item {
          display: flex;
          gap: var(--space-3);
          align-items: flex-start;
        }
        .step-number {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--forest-green);
          color: var(--sand);
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .tip-box {
          display: flex;
          gap: var(--space-3);
          background: rgba(45, 58, 45, 0.05);
          border: 1px solid rgba(45, 58, 45, 0.12);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
          margin-top: var(--space-3);
        }
        .warning-box {
          display: flex;
          gap: var(--space-3);
          background: rgba(192, 57, 43, 0.05);
          border: 1px solid rgba(192, 57, 43, 0.15);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
          margin-top: var(--space-3);
        }
        .empty-guides {
          background: white;
          padding: var(--space-12);
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          text-align: center;
        }

        @media (max-width: 768px) {
          .guide-card__content {
            padding-left: var(--space-5);
          }
          .manual-header__actions {
            width: 100%;
          }
          .manual-header__actions a {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
