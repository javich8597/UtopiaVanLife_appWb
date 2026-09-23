'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import {
  Sparkles,
  ChevronRight,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Compass,
  Zap,
  Sun,
  Shield,
  Layers,
  Eye,
  Info,
  Check,
  Disc,
  ArrowRight,
  BedDouble,
  Users,
  Droplets,
  Gauge
} from 'lucide-react'

type CamperModel = 'neo' | 'space'
type ExplorationMode = 'exterior' | 'interior' | 'blueprint' | 'video'

interface Hotspot {
  id: string
  title: string
  specBadge: string
  category: 'electrical' | 'comfort' | 'interior' | 'tech' | 'storage'
  description: string
  image: string
  x: number // percentage 0 - 100
  y: number // percentage 0 - 100
}

interface WheelOption {
  id: string
  name: string
  desc: string
  image: string
}

interface GalleryItem {
  id: string
  title: string
  category: string
  image: string
}

interface VideoTourClip {
  id: string
  title: string
  duration: string
  src: string
  poster: string
  aspect: 'portrait' | 'landscape'
}

interface CamperData {
  slug: CamperModel
  name: string
  tagline: string
  subtitle: string
  startingPrice: number
  specs: {
    beds: number
    seats: number
    length: string
    water: string
    battery: string
    storage: string
  }
  exteriorPhotos: { id: string; title: string; image: string }[]
  wheelOptions: WheelOption[]
  interiorGallery: GalleryItem[]
  blueprints: {
    day: string
    night: string
    open: string
    topDimensions?: string
  }
  hotspots: Hotspot[]
  videoClips: VideoTourClip[]
}

const CAMPERS_DATA: Record<CamperModel, CamperData> = {
  neo: {
    slug: 'neo',
    name: 'NEO',
    tagline: 'Versatilidad Nómada & Gran Almacenaje',
    subtitle: 'La camper más polivalente y con mayor almacenaje de su categoría. 2.230 Litros de maletero, separación acústica de cabina y 540Ah Litio Victron.',
    startingPrice: 110,
    specs: {
      beds: 3,
      seats: 3,
      length: '5.99 m',
      water: '100 L',
      battery: '540Ah LiFePO4',
      storage: '2.230 L XXL'
    },
    exteriorPhotos: [
      { id: 'ext-1', title: 'Render Exterior Perfil', image: '/images/campers/neo/neo-ext.png' },
      { id: 'ext-2', title: 'Lanzarote Horizon 2K', image: '/images/campers/neo/exterior/neo-vehicle-hero-lanzarote.webp' },
      { id: 'ext-3', title: 'Frontal 3/4 Dinámico', image: '/images/campers/neo/exterior/neo-exterior-front-three-quarter.webp' },
      { id: 'ext-4', title: 'Perfil Cenital Aéreo', image: '/images/campers/neo/exterior/neo-exterior-aerial-profile.jpg' }
    ],
    wheelOptions: [
      {
        id: 'at',
        name: 'All-Terrain Off-Road',
        desc: 'Neumáticos todoterreno con tacos reforzados para caminos rurales y pistas pedregosas.',
        image: '/images/campers/neo/exterior/neo-design-wheels-premium-at.webp'
      },
      {
        id: 'silver',
        name: 'Aleación Plata Cromadas',
        desc: 'Llantas de aleación ligera de 16" pulidas para máxima eficiencia aerodinámica.',
        image: '/images/campers/neo/exterior/neo-design-wheels-cromadas-silver.webp'
      },
      {
        id: 'tapacubos',
        name: 'Tapacubos Serie',
        desc: 'Configuración clásica original de alta resistencia y durabilidad en carretera.',
        image: '/images/campers/neo/exterior/neo-design-wheels-tapacubos.webp'
      }
    ],
    interiorGallery: [
      { id: 'int-1', title: 'Salón Comedor con Luz Natural', category: 'Salón', image: '/images/campers/neo/interior/neo-dining-room-daylight.webp' },
      { id: 'int-2', title: 'Cama Fija con Vistas Abiertas', category: 'Dormitorio', image: '/images/campers/neo/interior/neo-bed-view-outdoors.webp' },
      { id: 'int-3', title: 'Módulo de Cocina Integrado', category: 'Cocina', image: '/images/campers/neo/interior/neo-kitchen-module-bathroom.webp' },
      { id: 'int-4', title: 'Baño Completo con Cabina de Ducha', category: 'Baño', image: '/images/campers/neo/interior/neo-bathroom-shower.webp' },
      { id: 'int-5', title: 'Maletero XXL 2.230L para Bicicletas', category: 'Garaje', image: '/images/campers/neo/details/neo-garage-bike-storage.webp' },
      { id: 'int-6', title: 'Separación Acústica de Cabina', category: 'Confort', image: '/images/campers/neo/details/neo-cabin-separation.webp' }
    ],
    blueprints: {
      day: '/images/campers/neo/blueprints/day-layout.webp',
      night: '/images/campers/neo/blueprints/night-layout.webp',
      open: '/images/campers/neo/blueprints/floorplan-open.webp'
    },
    hotspots: [
      {
        id: 'victron',
        title: '540Ah Litio Victron Energy',
        specBadge: 'Energía 100% Off-Grid',
        category: 'electrical',
        description: 'Batería Victron LiFePO4 Smart 540Ah con inversor MultiPlus 2000W y booster DC-DC 30A. Autonomía ilimitada para cafeteras, secador y portátiles a 230V.',
        image: '/images/campers/neo/tech-details/neo-electrical-rooftop.webp',
        x: 48,
        y: 62
      },
      {
        id: 'solar',
        title: '400W Placas Solares Monocristalinas',
        specBadge: 'Carga Solar Continua',
        category: 'electrical',
        description: 'Células solares de silicio monocristalino de alta eficiencia emparejadas con controlador MPPT SmartSolar 100/30 con telemetría Bluetooth.',
        image: '/images/campers/neo/details/solar-tech.webp',
        x: 48,
        y: 35
      },
      {
        id: 'dometic-ac',
        title: 'Aire Acondicionado 12V Dometic FreshJet',
        specBadge: 'Climatización Silenciosa',
        category: 'comfort',
        description: 'Equipo de climatización por compresor 12V de bajo consumo instalado en el techo. Funciona en estático alimentado 100% por la batería de litio.',
        image: '/images/campers/neo/tech-details/neo-comfort-air-conditioning.webp',
        x: 35,
        y: 35
      },
      {
        id: 'heating',
        title: 'Calefacción Diésel Webasto con Kit Altitud',
        specBadge: 'Confort Todo el Año',
        category: 'comfort',
        description: 'Calefacción estacionaria conectada directamente al depósito del vehículo. Termostato digital programable y silencioso funcionamiento nocturno.',
        image: '/images/campers/neo/tech-details/neo-comfort-heating.webp',
        x: 28,
        y: 52
      },
      {
        id: 'garmin',
        title: 'Domótica Garmin EmpirBus 7"',
        specBadge: 'Control Centralizado',
        category: 'tech',
        description: 'Pantalla táctil digital central para monitoreo de niveles de agua (100L limpias / 80L grises), estado de baterías e iluminación regulable.',
        image: '/images/campers/neo/details/garmin-screen.webp',
        x: 24,
        y: 42
      },
      {
        id: 'kaiflex',
        title: 'Aislamiento Kaiflex 20mm Célula Cerrada',
        specBadge: 'Aislamiento Acústico/Térmico',
        category: 'comfort',
        description: 'Barrera elastomérica de 20mm en paredes, techo, suelo y pasos de rueda para eliminar puentes térmicos y condensaciones.',
        image: '/images/campers/neo/tech-details/neo-comfort-insulation.webp',
        x: 65,
        y: 32
      },
      {
        id: 'garage',
        title: 'Maletero XXL 2.230L con Guías de Carga',
        specBadge: 'Capacidad Récord',
        category: 'storage',
        description: 'El mayor maletero del mercado camperizado con volumen para 2 bicicletas de montaña sin desmontar o tablas de surf y equipaje.',
        image: '/images/campers/neo/details/neo-garage-bike-storage.webp',
        x: 80,
        y: 50
      },
      {
        id: 'starlink',
        title: 'Conectividad Starlink Roam Satelital',
        specBadge: 'Internet Alta Velocidad',
        category: 'tech',
        description: 'Conexión a internet vía satélite con velocidades de 150 a 250 Mbps para teletrabajar desde cualquier cala remota de la isla.',
        image: '/images/campers/neo/tech-details/neo-tech-starlink.webp',
        x: 18,
        y: 35
      }
    ],
    videoClips: [
      {
        id: 'v-neo-1',
        title: 'Tour Salón e Interior',
        duration: '0:08',
        src: '/videos/campers/neo/neo-interior-highlight-tour.mp4',
        poster: '/images/campers/neo/interior/neo-dining-room-daylight.webp',
        aspect: 'portrait'
      },
      {
        id: 'v-neo-2',
        title: 'Cocina & Acabados de Madera',
        duration: '0:10',
        src: '/videos/campers/neo/neo-kitchen-details.mp4',
        poster: '/images/campers/neo/interior/neo-kitchen-module-bathroom.webp',
        aspect: 'portrait'
      },
      {
        id: 'v-neo-3',
        title: 'Baño Completo & Ducha',
        duration: '0:11',
        src: '/videos/campers/neo/neo-bathroom-tour.mp4',
        poster: '/images/campers/neo/interior/neo-bathroom-shower.webp',
        aspect: 'portrait'
      },
      {
        id: 'v-neo-4',
        title: 'Maletero 2.230L & Bicis',
        duration: '0:05',
        src: '/videos/campers/neo/neo-garage-bike-loading.mp4',
        poster: '/images/campers/neo/details/neo-garage-bike-storage.webp',
        aspect: 'portrait'
      }
    ]
  },
  space: {
    slug: 'space',
    name: 'SPACE',
    tagline: 'Amplitud 7m² Open Concept & Cama Eléctrica',
    subtitle: 'Distribución abierta revolucionaria de 7m² con cama elevable motorizada sobre salón panorámico en U, 160L de agua limpia y Pack Cine.',
    startingPrice: 135,
    specs: {
      beds: 2,
      seats: 2,
      length: '5.99 m',
      water: '160 L XXL',
      battery: '540Ah LiFePO4',
      storage: 'Salón U 7m²'
    },
    exteriorPhotos: [
      { id: 'ext-s1', title: 'Render Exterior SPACE', image: '/images/campers/space/space-ext.png' },
      { id: 'ext-s2', title: 'Puerta Abierta 2K Paisaje', image: '/images/campers/space/exterior/2k_Space_landscape_door_open.jpeg' },
      { id: 'ext-s3', title: 'Puerta Cerrada 2K Paisaje', image: '/images/campers/space/exterior/2k_Space_landscape_door_closed.jpeg' },
      { id: 'ext-s4', title: 'Lanzarote Costa 2K', image: '/images/campers/space/exterior/space-vehicle-hero-lanzarote.webp' }
    ],
    wheelOptions: [
      {
        id: 'at',
        name: 'All-Terrain Off-Road',
        desc: 'Tracción reforzada con estética robusta camperizada para terrenos variados.',
        image: '/images/campers/space/exterior/space-design-wheels-premium-at.webp'
      },
      {
        id: 'silver',
        name: 'Aleación Plata Cromadas',
        desc: 'Llantas de aleación con acabado pulido mate de máxima sofisticación.',
        image: '/images/campers/space/exterior/space-design-wheels-cromadas-silver.webp'
      },
      {
        id: 'tapacubos',
        name: 'Tapacubos Serie',
        desc: 'Montaje de fábrica resistente para un rodar equilibrado y silencioso.',
        image: '/images/campers/space/exterior/space-design-wheels-tapacubos.webp'
      }
    ],
    interiorGallery: [
      { id: 'int-s1', title: 'Salón Panorámico en U con Portones Abiertos', category: 'Salón', image: '/images/campers/space/interior/space-saloon-rear-doors-open.webp' },
      { id: 'int-s2', title: 'Cama Elevable Eléctrica de Techo', category: 'Dormitorio', image: '/images/campers/space/interior/space-electric-drop-down-bed.webp' },
      { id: 'int-s3', title: 'Espacio Abierto 7m² Open Concept', category: 'Salón', image: '/images/campers/space/interior/space-lounge-spacious-daylight.webp' },
      { id: 'int-s4', title: 'Pack Cine con Proyector HD', category: 'Cine', image: '/images/campers/space/interior/space-cinema-projector-lounge.webp' },
      { id: 'int-s5', title: 'Cocina de Autor con Repisa Botánica', category: 'Cocina', image: '/images/campers/space/details/space-faucet-herb-shelf.webp' },
      { id: 'int-s6', title: 'Cabina de Ducha Independiente', category: 'Baño', image: '/images/campers/space/interior/space-bathroom-shower.webp' }
    ],
    blueprints: {
      day: '/images/campers/space/interior/space-spaces-floorplan.webp',
      night: '/images/campers/space/interior/space-spaces-floorplan.webp',
      open: '/images/campers/space/exterior/space-vehicle-dimensions-top.webp',
      topDimensions: '/images/campers/space/exterior/space-vehicle-dimensions-top.webp'
    },
    hotspots: [
      {
        id: 'dropbed',
        title: 'Cama Elevable Eléctrica (Drop-Down Bed)',
        specBadge: 'Descenso en 15 Segundos',
        category: 'interior',
        description: 'Cama de matrimonio suspendida del techo con motor eléctrico integrado y soporte de hasta 600 kg. Permite dormir sin desmontar el salón.',
        image: '/images/campers/space/interior/space-electric-drop-down-bed.webp',
        x: 70,
        y: 45
      },
      {
        id: 'lounge',
        title: 'Salón Panorámico en U (Open Concept 7m²)',
        specBadge: 'Vistas 270° al Mar',
        category: 'comfort',
        description: 'Amplitud sin precedentes con capacidad para hasta 6 comensales y mesa telescópica con giro 360°. Vistas panorámicas abriendo los portones traseros.',
        image: '/images/campers/space/interior/space-saloon-rear-doors-open.webp',
        x: 75,
        y: 65
      },
      {
        id: 'cinema',
        title: 'Pack Cine: Proyector HD & Pantalla 60"',
        specBadge: 'Cine Bajo las Estrellas',
        category: 'tech',
        description: 'Proyector LED FullHD integrado en techo y pantalla enrollable de 60" sobre el salón en U con altavoces estéreo Bluetooth envolventes.',
        image: '/images/campers/space/details/cinema-projector.webp',
        x: 60,
        y: 35
      },
      {
        id: 'victron-space',
        title: '540Ah Litio Victron + MultiPlus 2000W',
        specBadge: 'Autonomía Total',
        category: 'electrical',
        description: 'Mismo sistema de baterías de litio de grado militar que la NEO para garantizar energía a 230V ilimitada para todos tus dispositivos.',
        image: '/images/campers/space/tech-details/space-electrical-rooftop.webp',
        x: 45,
        y: 60
      },
      {
        id: 'ac-space',
        title: 'Aire Acondicionado Dometic 12V',
        specBadge: 'Climatización 12V',
        category: 'comfort',
        description: 'Climatizador silencioso ubicado sobre el salón diurno con difusores orientables para enfriar el habitáculo en noches cálidas de verano.',
        image: '/images/campers/space/tech-details/space-comfort-air-conditioning.webp',
        x: 48,
        y: 35
      },
      {
        id: 'shower-space',
        title: 'Cabina de Ducha Independiente',
        specBadge: 'Ducha Termoformada',
        category: 'comfort',
        description: 'Cabina de baño completamente estanca con mampara de cierre magnético, plato de ducha antideslizante y agua caliente con depósito de 160L.',
        image: '/images/campers/space/interior/space-bathroom-shower.webp',
        x: 35,
        y: 50
      },
      {
        id: 'wine',
        title: 'Cocina de Autor con Vinoteca Integrada',
        specBadge: 'Cava Refrigerada',
        category: 'comfort',
        description: 'Encimera de madera maciza tratada, fregadero profundo negro mate y vinoteca climatizada para 4 botellas de vino mallorquín.',
        image: '/images/campers/space/interior/space-kitchen-wine-cooler.webp',
        x: 35,
        y: 30
      },
      {
        id: 'carplay',
        title: 'Apple CarPlay & Domótica Móvil',
        specBadge: 'Infotainment Conectado',
        category: 'tech',
        description: 'Sistema multimedia de 10" con navegación GPS en tiempo real por Mallorca y sincronización con app móvil para vigilar el estado del vehículo.',
        image: '/images/campers/space/tech-details/space-tech-garmin-app.webp',
        x: 15,
        y: 45
      }
    ],
    videoClips: [
      {
        id: 'v-space-1',
        title: 'Tour Completo Panorámico',
        duration: '0:12',
        src: '/videos/campers/space/space-complete-tour.mp4',
        poster: '/images/campers/space/interior/space-saloon-rear-doors-open.webp',
        aspect: 'landscape'
      },
      {
        id: 'v-space-2',
        title: 'Paseo Interior Diurno',
        duration: '0:07',
        src: '/videos/campers/space/space-walkthrough-interior.mp4',
        poster: '/images/campers/space/interior/space-lounge-spacious-daylight.webp',
        aspect: 'portrait'
      },
      {
        id: 'v-space-3',
        title: 'Cocina de Autor & Cava',
        duration: '0:06',
        src: '/videos/campers/space/space-kitchen-counter-tour.mp4',
        poster: '/images/campers/space/details/space-faucet-herb-shelf.webp',
        aspect: 'portrait'
      },
      {
        id: 'v-space-4',
        title: 'Cabina de Ducha Spa',
        duration: '0:08',
        src: '/videos/campers/space/space-shower-cabin-tour.mp4',
        poster: '/images/campers/space/interior/space-bathroom-shower.webp',
        aspect: 'portrait'
      },
      {
        id: 'v-space-5',
        title: 'Tecnología & CarPlay',
        duration: '0:19',
        src: '/videos/campers/space/space-tech-carplay.mp4',
        poster: '/images/campers/space/tech-details/space-tech-garmin-app.webp',
        aspect: 'landscape'
      }
    ]
  }
}

export default function CamperShowcase() {
  const locale = useLocale()
  const [selectedModel, setSelectedModel] = useState<CamperModel>('neo')
  const [activeMode, setActiveMode] = useState<ExplorationMode>('exterior')
  const [selectedWheel, setSelectedWheel] = useState<string>('at')
  const [exteriorIdx, setExteriorIdx] = useState<number>(0)
  const [interiorIdx, setInteriorIdx] = useState<number>(0)
  const [blueprintDayMode, setBlueprintDayMode] = useState<boolean>(true)
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null)
  
  // Video player states
  const [currentClipIdx, setCurrentClipIdx] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const camper = CAMPERS_DATA[selectedModel]

  // Reset indices on model change
  const handleModelChange = (model: CamperModel) => {
    setSelectedModel(model)
    setExteriorIdx(0)
    setInteriorIdx(0)
    setCurrentClipIdx(0)
    setActiveHotspot(null)
    setIsPlaying(false)
  }

  // Handle video playback
  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const currentClip = camper.videoClips[currentClipIdx] || camper.videoClips[0]

  return (
    <section className="showcase-section" id="campers">
      {/* Background ambient lighting */}
      <div className="showcase-ambient-glow" />

      <div className="container showcase-container">
        
        {/* Header with Editorial Badge */}
        <div className="showcase-header">
          <div className="showcase-eyebrow-pill">
            <Sparkles size={12} className="text-gold" />
            <span>FLOTA ARTESANAL UTOPIA</span>
          </div>

          <h2 className="showcase-title">
            Elige tu compañera de <em className="text-gold italic">expedición</em>
          </h2>

          <p className="showcase-subtitle">
            Dos filosofías de viaje construidas sobre la misma excelencia de ingeniería. 100% autónomas, aisladas con Kaiflex y alimentadas por litio Victron.
          </p>

          {/* Model Switcher with Framer Motion Spring */}
          <div className="model-selector-bar">
            {(['neo', 'space'] as CamperModel[]).map((modelKey) => {
              const isSelected = selectedModel === modelKey
              const modelData = CAMPERS_DATA[modelKey]
              return (
                <button
                  key={modelKey}
                  onClick={() => handleModelChange(modelKey)}
                  className={`model-selector-btn ${isSelected ? 'model-selector-btn--active' : ''}`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeModelIndicator"
                      className="model-selector-glider"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="model-btn-name">{modelData.name}</span>
                  <span className="model-btn-price">desde {modelData.startingPrice} €/noche</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Interactive Showcase Card */}
        <div className="showcase-card">
          
          {/* Top Bar: Exploration Modes Navigation */}
          <div className="showcase-modes-nav">
            <div className="modes-nav-pill-group">
              {[
                { key: 'exterior' as ExplorationMode, label: '1. Exterior & Llantas', icon: Compass },
                { key: 'interior' as ExplorationMode, label: '2. Habitáculo Panorámico', icon: Eye },
                { key: 'blueprint' as ExplorationMode, label: '3. Blueprint & Hotspots', icon: Layers },
                { key: 'video' as ExplorationMode, label: '4. Tour de Vídeo', icon: Play },
              ].map(({ key, label, icon: Icon }) => {
                const isActive = activeMode === key
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveMode(key)
                      if (key !== 'video' && isPlaying && videoRef.current) {
                        videoRef.current.pause()
                        setIsPlaying(false)
                      }
                    }}
                    className={`mode-nav-btn ${isActive ? 'mode-nav-btn--active' : ''}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeModeIndicator"
                        className="mode-nav-glider"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon size={14} className="mode-nav-icon" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Quick specs snippet */}
            <div className="showcase-quick-specs hide-mobile">
              <span className="spec-badge">
                <Users size={12} className="text-gold" />
                {camper.specs.seats} plazas
              </span>
              <span className="spec-badge">
                <BedDouble size={12} className="text-gold" />
                {camper.specs.beds} camas
              </span>
              <span className="spec-badge">
                <Zap size={12} className="text-gold" />
                {camper.specs.battery}
              </span>
            </div>
          </div>

          {/* Main Stage Viewport */}
          <div className="showcase-viewport">
            <AnimatePresence mode="wait">
              
              {/* MODE 1: EXTERIOR */}
              {activeMode === 'exterior' && (
                <motion.div
                  key={`ext-${selectedModel}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="mode-exterior-stage"
                >
                  <div className="exterior-canvas">
                    <div className="exterior-main-image-wrap">
                      <Image
                        src={camper.exteriorPhotos[exteriorIdx]?.image || camper.exteriorPhotos[0].image}
                        alt={`${camper.name} Exterior`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 900px"
                        priority
                      />
                    </div>

                    {/* Photo selector thumbnails */}
                    <div className="exterior-thumbs-bar">
                      {camper.exteriorPhotos.map((photo, i) => (
                        <button
                          key={photo.id}
                          onClick={() => setExteriorIdx(i)}
                          className={`exterior-thumb-btn ${i === exteriorIdx ? 'exterior-thumb-btn--active' : ''}`}
                        >
                          <Image
                            src={photo.image}
                            alt={photo.title}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                          <span className="thumb-label">{photo.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wheel Selector Sidebar */}
                  <div className="exterior-wheels-panel">
                    <div className="panel-title-row">
                      <Disc size={16} className="text-gold" />
                      <h4 className="panel-title">Configuración de Llantas</h4>
                    </div>
                    <p className="panel-desc">
                      Selecciona el juego de neumáticos adaptado a tu estilo de ruta en Mallorca:
                    </p>

                    <div className="wheels-list">
                      {camper.wheelOptions.map((wheel) => {
                        const isChosen = selectedWheel === wheel.id
                        return (
                          <div
                            key={wheel.id}
                            onClick={() => setSelectedWheel(wheel.id)}
                            className={`wheel-card ${isChosen ? 'wheel-card--selected' : ''}`}
                          >
                            <div className="wheel-thumb-wrap">
                              <Image
                                src={wheel.image}
                                alt={wheel.name}
                                fill
                                className="object-cover"
                                sizes="70px"
                              />
                            </div>
                            <div className="wheel-info">
                              <div className="wheel-name-row">
                                <span className="wheel-name">{wheel.name}</span>
                                {isChosen && <Check size={14} className="text-gold" />}
                              </div>
                              <p className="wheel-desc">{wheel.desc}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* MODE 2: INTERIOR */}
              {activeMode === 'interior' && (
                <motion.div
                  key={`int-${selectedModel}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="mode-interior-stage"
                >
                  <div className="interior-main-view">
                    <div className="interior-image-canvas">
                      <Image
                        src={camper.interiorGallery[interiorIdx]?.image || camper.interiorGallery[0].image}
                        alt={camper.interiorGallery[interiorIdx]?.title || 'Interior'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 950px"
                        priority
                      />
                      <div className="interior-vignette" />
                      <div className="interior-caption-pill">
                        <span className="caption-tag">{camper.interiorGallery[interiorIdx]?.category}</span>
                        <span className="caption-title">{camper.interiorGallery[interiorIdx]?.title}</span>
                      </div>
                    </div>

                    {/* Interior thumbnails ribbon */}
                    <div className="interior-thumbs-ribbon">
                      {camper.interiorGallery.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => setInteriorIdx(idx)}
                          className={`interior-thumb ${idx === interiorIdx ? 'interior-thumb--active' : ''}`}
                        >
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="120px"
                          />
                          <span className="thumb-caption">{item.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* MODE 3: TECHNICAL BLUEPRINT */}
              {activeMode === 'blueprint' && (
                <motion.div
                  key={`bp-${selectedModel}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="mode-blueprint-stage"
                >
                  {/* Blueprint toolbar */}
                  <div className="blueprint-toolbar">
                    <div className="blueprint-mode-toggles">
                      <button
                        onClick={() => setBlueprintDayMode(true)}
                        className={`bp-toggle-btn ${blueprintDayMode ? 'bp-toggle-btn--active' : ''}`}
                      >
                        <Sun size={13} />
                        <span>Vista Distribución Día</span>
                      </button>
                      <button
                        onClick={() => setBlueprintDayMode(false)}
                        className={`bp-toggle-btn ${!blueprintDayMode ? 'bp-toggle-btn--active' : ''}`}
                      >
                        <Zap size={13} />
                        <span>Vista Distribución Noche</span>
                      </button>
                    </div>

                    <div className="blueprint-legend hide-mobile">
                      <span className="legend-dot" />
                      <span>Haz clic en los puntos interactivos para explorar ingeniería</span>
                    </div>
                  </div>

                  {/* Blueprint Canvas with Interactive Pulsing Hotspots */}
                  <div className="blueprint-canvas-wrap">
                    <div className="blueprint-image-container">
                      <Image
                        src={blueprintDayMode ? camper.blueprints.day : camper.blueprints.night}
                        alt={`Blueprint ${camper.name}`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 1000px"
                        priority
                      />

                      {/* Hotspots layer */}
                      {camper.hotspots.map((hs) => {
                        const isCurrent = activeHotspot?.id === hs.id
                        return (
                          <div
                            key={hs.id}
                            style={{ top: `${hs.y}%`, left: `${hs.x}%` }}
                            className="hotspot-anchor"
                          >
                            <button
                              type="button"
                              onClick={() => setActiveHotspot(isCurrent ? null : hs)}
                              className={`hotspot-btn ${isCurrent ? 'hotspot-btn--active' : ''}`}
                              aria-label={hs.title}
                            >
                              <span className="hotspot-radar" />
                              <span className="hotspot-core" />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {/* Floating Hotspot Details Card */}
                    <AnimatePresence>
                      {activeHotspot && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.96 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="hotspot-card"
                        >
                          <div className="hotspot-card-header">
                            <span className="hotspot-badge">{activeHotspot.specBadge}</span>
                            <button
                              onClick={() => setActiveHotspot(null)}
                              className="hotspot-close"
                            >
                              ✕
                            </button>
                          </div>
                          
                          <div className="hotspot-card-body">
                            <div className="hotspot-img-thumb">
                              <Image
                                src={activeHotspot.image}
                                alt={activeHotspot.title}
                                fill
                                className="object-cover"
                                sizes="120px"
                              />
                            </div>
                            <div className="hotspot-text">
                              <h5 className="hotspot-title">{activeHotspot.title}</h5>
                              <p className="hotspot-desc">{activeHotspot.description}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* MODE 4: VIDEO TOUR */}
              {activeMode === 'video' && (
                <motion.div
                  key={`vid-${selectedModel}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="mode-video-stage"
                >
                  <div className="video-player-container">
                    <div className={`video-bezel ${currentClip.aspect === 'landscape' ? 'video-bezel--landscape' : 'video-bezel--portrait'}`}>
                      <video
                        ref={videoRef}
                        key={currentClip.src}
                        src={currentClip.src}
                        poster={currentClip.poster}
                        playsInline
                        muted={isMuted}
                        loop
                        preload="none"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        className="player-video-element"
                      />

                      {/* Video control overlay */}
                      <div className="video-controls-overlay">
                        <button
                          onClick={togglePlay}
                          className="video-action-btn play-pause-btn"
                          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                        >
                          {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
                        </button>

                        <button
                          onClick={toggleMute}
                          className="video-action-btn mute-btn"
                          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                        >
                          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Clip selector playlist */}
                    <div className="video-playlist">
                      <div className="playlist-header">
                        <Play size={14} className="text-gold" />
                        <h4 className="playlist-title">Clips de Demostración</h4>
                      </div>

                      <div className="playlist-items">
                        {camper.videoClips.map((clip, idx) => {
                          const isCurrent = idx === currentClipIdx
                          return (
                            <button
                              key={clip.id}
                              onClick={() => {
                                setCurrentClipIdx(idx)
                                setIsPlaying(false)
                              }}
                              className={`playlist-card ${isCurrent ? 'playlist-card--active' : ''}`}
                            >
                              <div className="playlist-thumb">
                                <Image
                                  src={clip.poster}
                                  alt={clip.title}
                                  fill
                                  className="object-cover"
                                  sizes="80px"
                                />
                                <span className="clip-time">{clip.duration}</span>
                              </div>
                              <div className="playlist-info">
                                <span className="clip-title">{clip.title}</span>
                                <span className="clip-status">{isCurrent && isPlaying ? 'Reproduciendo...' : 'Ver clip'}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Bottom Bar: Action CTAs and Price Summary */}
          <div className="showcase-footer">
            <div className="footer-summary">
              <div className="footer-price-tag">
                <span className="price-label">Tarifa base desde</span>
                <div className="price-number-row">
                  <span className="price-amount">{camper.startingPrice} €</span>
                  <span className="price-period">/ noche</span>
                </div>
              </div>

              <div className="footer-specs-list hide-mobile">
                <span className="footer-spec-item">
                  <Users size={14} className="text-gold" />
                  {camper.specs.seats} Asientos
                </span>
                <span className="footer-spec-divider">•</span>
                <span className="footer-spec-item">
                  <BedDouble size={14} className="text-gold" />
                  {camper.specs.beds} Plazas Cama
                </span>
                <span className="footer-spec-divider">•</span>
                <span className="footer-spec-item">
                  <Droplets size={14} className="text-gold" />
                  {camper.specs.water} Agua
                </span>
                <span className="footer-spec-divider">•</span>
                <span className="footer-spec-item">
                  <Gauge size={14} className="text-gold" />
                  {camper.specs.storage}
                </span>
              </div>
            </div>

            <div className="footer-actions">
              <Link
                href={`/campers/${camper.slug}`}
                className="btn btn-outline btn-md secondary-cta"
              >
                <span>Ficha Técnica Completa</span>
              </Link>

              <Link
                href={`/reserva/${camper.slug}`}
                className="btn btn-md primary-reserve-cta"
              >
                <Sparkles size={16} style={{ color: '#0B0D11' }} />
                <span>Configurar y Reservar {camper.name}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .showcase-section {
          position: relative;
          background: #0B0D11;
          color: white;
          padding-block: var(--space-20);
          overflow: hidden;
        }
        .showcase-ambient-glow {
          position: absolute;
          top: 10%;
          left: 50%;
          translate: -50% 0;
          width: 800px;
          height: 400px;
          background: radial-gradient(circle, rgba(229, 192, 123, 0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .showcase-container {
          position: relative;
          z-index: 1;
        }

        /* Header */
        .showcase-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 720px;
          margin-inline: auto;
          margin-bottom: var(--space-10);
          gap: var(--space-3);
        }
        .showcase-eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: var(--radius-full);
          background: rgba(229, 192, 123, 0.1);
          border: 1px solid rgba(229, 192, 123, 0.22);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #E5C07B;
        }
        .showcase-title {
          font-size: clamp(2rem, 4.5vw, 3.4rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.15;
          text-wrap: balance;
        }
        .showcase-subtitle {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.65;
          max-width: 600px;
          text-wrap: balance;
        }

        /* Model Selector */
        .model-selector-bar {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(20, 23, 29, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 5px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-top: var(--space-4);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        }
        .model-selector-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 24px;
          border-radius: var(--radius-full);
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.75);
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 600;
          transition: color 0.2s ease;
          z-index: 1;
        }
        .model-selector-btn:hover {
          color: white;
        }
        .model-selector-btn--active {
          color: #0B0D11 !important;
          font-weight: 700;
        }
        .model-btn-name {
          font-size: 1.05rem;
          letter-spacing: 0.04em;
        }
        .model-btn-price {
          font-size: 0.75rem;
          opacity: 0.85;
        }
        .model-selector-btn--active .model-btn-price {
          opacity: 0.95;
          font-weight: 600;
        }
        :global(.model-selector-glider) {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #E5C07B 0%, #D4AF37 100%);
          border-radius: 9999px;
          z-index: -1;
          box-shadow: 0 4px 16px rgba(229, 192, 123, 0.35);
        }

        /* Showcase Card */
        .showcase-card {
          background: #14171D;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-2xl, 24px);
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
        }

        /* Top modes navigation */
        .showcase-modes-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-6);
          background: rgba(11, 13, 17, 0.75);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-wrap: wrap;
          gap: var(--space-3);
        }
        .modes-nav-pill-group {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          padding: 4px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .mode-nav-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.18s ease;
          z-index: 1;
        }
        .mode-nav-btn:hover {
          color: white;
        }
        .mode-nav-btn--active {
          color: #FFFFFF !important;
          font-weight: 600;
        }
        :global(.mode-nav-glider) {
          position: absolute;
          inset: 0;
          background: rgba(229, 192, 123, 0.16);
          border: 1px solid rgba(229, 192, 123, 0.35);
          border-radius: 9999px;
          z-index: -1;
        }
        .mode-nav-icon {
          color: #E5C07B;
        }

        .showcase-quick-specs {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .spec-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.75);
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        /* Viewport */
        .showcase-viewport {
          position: relative;
          min-height: 520px;
          padding: var(--space-6);
        }

        /* MODE 1: EXTERIOR */
        .mode-exterior-stage {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: var(--space-6);
          align-items: center;
        }
        .exterior-canvas {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .exterior-main-image-wrap {
          position: relative;
          width: 100%;
          height: 380px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 75%);
          border-radius: var(--radius-xl);
        }
        .exterior-thumbs-bar {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .exterior-thumb-btn {
          position: relative;
          width: 110px;
          height: 65px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.4);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .exterior-thumb-btn:hover {
          border-color: rgba(229, 192, 123, 0.4);
        }
        .exterior-thumb-btn--active {
          border-color: #E5C07B !important;
          box-shadow: 0 0 12px rgba(229, 192, 123, 0.35);
        }
        .thumb-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(11, 13, 17, 0.85);
          font-size: 0.62rem;
          color: white;
          padding: 2px 4px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Wheels Sidebar */
        .exterior-wheels-panel {
          background: rgba(11, 13, 17, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .panel-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .panel-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }
        .panel-desc {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.5;
          margin: 0;
        }
        .wheels-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }
        .wheel-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: var(--radius-lg);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .wheel-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(229, 192, 123, 0.25);
        }
        .wheel-card--selected {
          background: rgba(229, 192, 123, 0.1) !important;
          border-color: #E5C07B !important;
        }
        .wheel-thumb-wrap {
          position: relative;
          width: 52px;
          height: 52px;
          border-radius: var(--radius-md);
          overflow: hidden;
          flex-shrink: 0;
        }
        .wheel-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .wheel-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .wheel-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: white;
        }
        .wheel-desc {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.35;
          margin: 0;
        }

        /* MODE 2: INTERIOR */
        .mode-interior-stage {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .interior-main-view {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .interior-image-canvas {
          position: relative;
          width: 100%;
          height: 420px;
          border-radius: var(--radius-xl);
          overflow: hidden;
          background: #000;
        }
        .interior-vignette {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(11, 13, 17, 0.75) 0%, transparent 40%);
          pointer-events: none;
        }
        .interior-caption-pill {
          position: absolute;
          bottom: 16px;
          left: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(15, 17, 21, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 6px 14px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .caption-tag {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #E5C07B;
          letter-spacing: 0.05em;
        }
        .caption-title {
          font-size: 0.85rem;
          font-weight: 500;
          color: white;
        }
        .interior-thumbs-ribbon {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 6px;
        }
        .interior-thumb {
          position: relative;
          width: 140px;
          height: 80px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.5);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .interior-thumb:hover {
          border-color: rgba(229, 192, 123, 0.4);
        }
        .interior-thumb--active {
          border-color: #E5C07B !important;
          box-shadow: 0 0 14px rgba(229, 192, 123, 0.4);
        }
        .thumb-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(11, 13, 17, 0.85);
          font-size: 0.65rem;
          color: white;
          padding: 2px 4px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* MODE 3: BLUEPRINT */
        .mode-blueprint-stage {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .blueprint-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-3);
        }
        .blueprint-mode-toggles {
          display: flex;
          gap: 6px;
        }
        .bp-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .bp-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .bp-toggle-btn--active {
          background: rgba(229, 192, 123, 0.15) !important;
          border-color: #E5C07B !important;
          color: #E5C07B !important;
          font-weight: 600;
        }
        .blueprint-legend {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #E5C07B;
          box-shadow: 0 0 8px #E5C07B;
        }

        .blueprint-canvas-wrap {
          position: relative;
          width: 100%;
          height: 420px;
          background: radial-gradient(circle, rgba(229, 192, 123, 0.04) 0%, rgba(11, 13, 17, 0.8) 80%);
          border-radius: var(--radius-xl);
          border: 1px solid rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        .blueprint-image-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        /* Hotspots */
        .hotspot-anchor {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 10;
        }
        .hotspot-btn {
          position: relative;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        .hotspot-radar {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(229, 192, 123, 0.35);
          animation: hotspotPulse 2s infinite ease-out;
        }
        .hotspot-core {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #E5C07B;
          border: 2px solid #0B0D11;
          box-shadow: 0 0 10px rgba(229, 192, 123, 0.8);
          transition: transform 0.2s ease;
        }
        .hotspot-btn:hover .hotspot-core,
        .hotspot-btn--active .hotspot-core {
          transform: scale(1.3);
          background: #FFFFFF;
        }
        @keyframes hotspotPulse {
          0% { transform: scale(0.8); opacity: 0.9; }
          100% { transform: scale(2.4); opacity: 0; }
        }

        /* Hotspot popup card */
        .hotspot-card {
          position: absolute;
          bottom: 20px;
          right: 20px;
          width: 320px;
          max-width: calc(100% - 40px);
          background: rgba(20, 23, 29, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(229, 192, 123, 0.3);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
          z-index: 20;
        }
        .hotspot-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .hotspot-badge {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #E5C07B;
          background: rgba(229, 192, 123, 0.15);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .hotspot-close {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.8rem;
          cursor: pointer;
        }
        .hotspot-close:hover {
          color: white;
        }
        .hotspot-card-body {
          display: flex;
          gap: 10px;
        }
        .hotspot-img-thumb {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: var(--radius-md);
          overflow: hidden;
          flex-shrink: 0;
        }
        .hotspot-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .hotspot-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }
        .hotspot-desc {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.4;
          margin: 0;
        }

        /* MODE 4: VIDEO TOUR */
        .mode-video-stage {
          display: flex;
          flex-direction: column;
        }
        .video-player-container {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: var(--space-6);
          align-items: center;
        }
        .video-bezel {
          position: relative;
          width: 100%;
          background: #000;
          border-radius: var(--radius-xl);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .video-bezel--landscape {
          height: 380px;
        }
        .video-bezel--portrait {
          height: 440px;
        }
        .player-video-element {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .video-controls-overlay {
          position: absolute;
          bottom: 16px;
          left: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
        }
        .video-action-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(15, 17, 21, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .video-action-btn:hover {
          background: #E5C07B;
          color: #0B0D11;
          border-color: #E5C07B;
          transform: scale(1.05);
        }

        /* Playlist */
        .video-playlist {
          background: rgba(11, 13, 17, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .playlist-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .playlist-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }
        .playlist-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .playlist-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: var(--radius-lg);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .playlist-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(229, 192, 123, 0.25);
        }
        .playlist-card--active {
          background: rgba(229, 192, 123, 0.1) !important;
          border-color: #E5C07B !important;
        }
        .playlist-thumb {
          position: relative;
          width: 54px;
          height: 48px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          flex-shrink: 0;
        }
        .clip-time {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: rgba(0, 0, 0, 0.85);
          font-size: 0.6rem;
          color: white;
          padding: 1px 3px;
          border-radius: 2px;
        }
        .playlist-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .clip-title {
          font-size: 0.82rem;
          font-weight: 600;
          color: white;
        }
        .clip-status {
          font-size: 0.7rem;
          color: #E5C07B;
        }

        /* Showcase Footer */
        .showcase-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-5) var(--space-6);
          background: rgba(11, 13, 17, 0.95);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          flex-wrap: wrap;
          gap: var(--space-4);
        }
        .footer-summary {
          display: flex;
          align-items: center;
          gap: var(--space-6);
        }
        .footer-price-tag {
          display: flex;
          flex-direction: column;
        }
        .price-label {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.55);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .price-number-row {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .price-amount {
          font-size: 1.6rem;
          font-weight: 700;
          color: #E5C07B;
          letter-spacing: -0.02em;
        }
        .price-period {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .footer-specs-list {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .footer-spec-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.75);
        }
        .footer-spec-divider {
          opacity: 0.3;
          font-size: 0.7rem;
        }

        .footer-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .secondary-cta {
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 10px 18px;
          font-size: 0.88rem;
          border-radius: var(--radius-full);
          transition: all 0.2s ease;
        }
        .secondary-cta:hover {
          border-color: #E5C07B;
          color: #E5C07B;
          background: rgba(229, 192, 123, 0.08);
        }
        .primary-reserve-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #E5C07B 0%, #D4AF37 100%);
          color: #0B0D11;
          font-weight: 700;
          font-size: 0.92rem;
          padding: 12px 24px;
          border-radius: var(--radius-full);
          box-shadow: 0 4px 20px rgba(229, 192, 123, 0.35);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .primary-reserve-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(229, 192, 123, 0.5);
        }
        .primary-reserve-cta:active {
          transform: scale(0.97);
        }

        @media (max-width: 900px) {
          .mode-exterior-stage,
          .video-player-container {
            grid-template-columns: 1fr;
          }
          .showcase-modes-nav {
            justify-content: center;
          }
          .modes-nav-pill-group {
            overflow-x: auto;
            max-width: 100%;
          }
          .showcase-footer {
            flex-direction: column;
            align-items: stretch;
          }
          .footer-actions {
            flex-direction: column;
          }
          .footer-actions a {
            width: 100%;
            justify-content: center;
          }
          .exterior-main-image-wrap {
            height: 260px;
          }
          .interior-image-canvas {
            height: 280px;
          }
          .blueprint-canvas-wrap {
            height: 320px;
          }
        }
      `}</style>
    </section>
  )
}
