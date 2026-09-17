'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import {
  MapPin,
  Navigation,
  Layers,
  Sparkles,
  Waves,
  Moon,
  Droplets,
  AlertTriangle,
  Compass,
  Check,
  Route,
  X,
  Truck,
  Plus,
  Minus,
  RotateCcw,
  LayoutGrid,
  ExternalLink,
  Mountain,
} from 'lucide-react'

export interface Spot {
  id: string
  name: string
  zone: 'tramuntana' | 'norte' | 'levante' | 'sureste' | 'palma'
  zoneLabel: string
  category: 'calas' | 'miradores' | 'pernocta' | 'servicios'
  categoryLabel: string
  area: string
  description: string
  camperAccess: 'Acceso Fácil' | 'Camper Compacta' | 'Carretera Panorámica'
  accessTip: string
  sergioNote?: string
  hasWater: boolean
  hasOvernight: boolean
  isSpecialWarning?: boolean
  coordinates: { lat: number; lng: number }
  image: string
  googleMapsUrl: string
}

export interface SuggestedRoute {
  id: string
  name: string
  days: string
  distance: string
  description: string
  highlightSpotIds: string[]
  color: string
}

// ─── Custom Cartographic Line Icons Matching Stitch Aesthetic ───
const SunsetIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 9V3" />
    <path d="M4.93 10.93L3.51 9.51" />
    <path d="M19.07 10.93L20.49 9.51" />
    <path d="M2 17H22" />
    <path d="M16 17C16 14.79 14.21 13 12 13C9.79 13 8 14.79 8 17" />
    <path d="M6 21H18" />
  </svg>
)

const CrescentMoonIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>
)

const WrenchIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

const ZONES = [
  { id: 'all', label: 'Toda Mallorca' },
  { id: 'tramuntana', label: 'Tramuntana' },
  { id: 'norte', label: 'Norte' },
  { id: 'levante', label: 'Levante' },
  { id: 'sureste', label: 'Sureste' },
  { id: 'palma', label: 'Palma & Sur' },
]

export interface CategoryMeta {
  id: string
  label: string
  icon: any
  color: string
  bg: string
  border: string
  text: string
  pulse: string
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'all',
    label: 'Todos',
    icon: LayoutGrid,
    color: '#1A2B21',
    bg: '#F5F5F3',
    border: '#E2E8F0',
    text: '#1A2B21',
    pulse: 'rgba(26, 43, 33, 0.3)',
  },
  {
    id: 'calas',
    label: 'Calas',
    icon: Waves,
    color: '#0284C7',
    bg: '#E0F2FE',
    border: '#BAE6FD',
    text: '#0369A1',
    pulse: 'rgba(2, 132, 199, 0.35)',
  },
  {
    id: 'miradores',
    label: 'Miradores',
    icon: SunsetIcon,
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#B45309',
    pulse: 'rgba(217, 119, 6, 0.35)',
  },
  {
    id: 'pernocta',
    label: 'Pernocta',
    icon: CrescentMoonIcon,
    color: '#7C3AED',
    bg: '#EDE9FE',
    border: '#DDD6FE',
    text: '#6D28D9',
    pulse: 'rgba(124, 58, 237, 0.35)',
  },
  {
    id: 'servicios',
    label: 'Servicios',
    icon: WrenchIcon,
    color: '#059669',
    bg: '#D1FAE5',
    border: '#A7F3D0',
    text: '#047857',
    pulse: 'rgba(5, 150, 105, 0.35)',
  },
]

const getCategoryMeta = (categoryId: string) => {
  return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0]
}

// ─── 3 Rutas Sugeridas para Camper ───
const SUGGESTED_ROUTES: SuggestedRoute[] = [
  {
    id: 'tramuntana-sunset',
    name: 'Serra de Tramuntana & Atardeceres Míticos',
    days: '3 Días / 2 Noches',
    distance: '140 km',
    description: 'La ruta reina de Mallorca por la legendaria carretera Ma-10 (Patrimonio UNESCO). Acantilados sobrecogedores, pueblos de piedra y las puestas de sol más mágicas.',
    highlightSpotIds: ['sant-elm-dragonera', 'mirador-des-grau', 'mirador-ses-animes', 'port-valldemossa', 'mirador-sa-foradada', 'soller-santa-catalina', 'sa-calobra-torrent', 'nus-sa-corbata', 'santuari-lluc', 'mirador-colomer'],
    color: '#0284C7'
  },
  {
    id: 'calas-levante',
    name: 'Calas Vírgenes & Levante Salvaje',
    days: '2 Días / 1 Noche',
    distance: '95 km',
    description: 'Aguas cristalinas, piscinas naturales entre acantilados de roca blanca, cuevas marinas secretas y la tranquilidad virgen del Parque Natural de Llevant.',
    highlightSpotIds: ['cala-pi-torre', 'far-ses-salines', 'cala-llombards-almunia', 'cala-mondrago', 'cala-varques', 'torre-serral-falcons', 'cuevas-arta-canyamel', 'cala-lliteres-agulla', 'cala-mitjana-duaia', 'betlem-arta', 'son-serra-marina'],
    color: '#10B981'
  },
  {
    id: 'norte-faros',
    name: 'Bahías del Norte & Faros de Mallorca',
    days: '2 Días / 1 Noche',
    distance: '85 km',
    description: 'Desde la inmensa playa virgen de Son Serra hasta los acantilados infinitos de Formentor, recorriendo las bahías de Alcúdia y Pollença con atalayas defensivas.',
    highlightSpotIds: ['son-serra-marina', 'parking-la-victoria', 'cami-vell-victoria', 'sant-vicenc-pollença', 'playa-formentor', 'atalaya-albercutx', 'mirador-colomer'],
    color: '#F59E0B'
  }
]

// ─── Estilos de Capas de Mapa en Alta Resolución (Retina HD 2x) ───
const MAP_LAYERS = [
  {
    id: 'terrain',
    label: 'Relieve Topográfico 3D (HD)',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&scale=2',
    icon: Mountain,
    description: 'Montañas sombreadas y curvas de nivel de la Serra de Tramuntana en alta resolución'
  },
  {
    id: 'satellite',
    label: 'Satélite Híbrido Ultra-HD',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&scale=2',
    icon: Layers,
    description: 'Fotografía aérea real de máxima nitidez con detalle de calas y aguas cristalinas'
  },
  {
    id: 'roadmap',
    label: 'Callejero Nítido Google (HD)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&scale=2',
    icon: Compass,
    description: 'Carreteras y pueblos con tipografía nítida y máxima claridad de navegación'
  }
]

// ─── 35 Spots con Coordenadas GPS Exactas de Mallorca (WGS84) ───
export const SPOTS_34: Spot[] = [
  // ─── 1. SURESTE & MIGJORN ───
  {
    id: 'cala-llombards-almunia',
    name: "Caló des Moro & Cala S'Almunia",
    zone: 'sureste',
    zoneLabel: 'Sureste (Santanyí)',
    category: 'calas',
    categoryLabel: 'Cala Virgen & Piscina Natural',
    area: 'Santanyí',
    description: 'Acceso principal al conjunto de Caló des Moro y Cala S’Almunia. Auténticas piscinas naturales de aguas turquesa encajadas entre acantilados calcáreos.',
    camperAccess: 'Camper Compacta',
    accessTip: 'Aparca en el estacionamiento señalizado de Cala Llombards y camina 15 min por el sendero; nunca intentes entrar por el callejón residencial.',
    sergioNote: 'Aparcamiento oficial amplio. Ideal para madrugar y disfrutar del agua en calma antes de las 10:00h.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.3132, lng: 3.1209 },
    image: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Calo+des+Moro+Mallorca',
  },
  {
    id: 'aparcament-cala-llombards',
    name: 'Aparcament Cala Llombards (A pie de playa)',
    zone: 'sureste',
    zoneLabel: 'Sureste (Santanyí)',
    category: 'calas',
    categoryLabel: 'Playa de Arena & Varaderos',
    area: 'Santanyí',
    description: 'Cala recogida con arena blanca fina, casetas de pescadores tradicionales y aguas transparentes perfectas para paddle surf y snorkel.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Acceso directo asfaltado. Parking nivelado junto a la playa con chiringuito rústico de temporada.',
    sergioNote: 'Perfecto para pasar la mañana y bañarse junto a los antiguos varaderos de pescadores.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.3245, lng: 3.1388 },
    image: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Aparcament+Cala+Llombards',
  },
  {
    id: 'cala-mondrago',
    name: 'Parking Cala Mondragó & S’Amarador',
    zone: 'sureste',
    zoneLabel: 'Sureste (Santanyí)',
    category: 'calas',
    categoryLabel: 'Parque Natural Protegido',
    area: 'P.N. de Mondragó',
    description: 'Doble bahía virgen rodeada de pinares protegidos, dunas y humedales con aves migratorias dentro del Parque Natural.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Utilizar el parking principal habilitado de Ses Fonts de n’Alis (de pago regulado en temporada alta).',
    sergioNote: 'Aviso: el antiguo parking libre junto a la cala está cerrado/restringido. Usar siempre el parking oficial del Parque Natural.',
    isSpecialWarning: true,
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.3524, lng: 3.1872 },
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Parc+Natural+de+Mondrago+Parking',
  },
  {
    id: 'cala-pi-torre',
    name: 'Torre de Cala Pi & Acantilados',
    zone: 'sureste',
    zoneLabel: 'Sureste / Sur (Llucmajor)',
    category: 'miradores',
    categoryLabel: 'Torre Defensiva & Fiordo',
    area: 'Llucmajor',
    description: 'Estrecha entrada de mar entre paredes verticales coronada por una torre vigía del siglo XVI con vistas abiertas al mar hacia Cabrera.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Aparcamiento amplio en las calles perimetrales de la urbanización y paseo llano de 3 minutos hasta el mirador.',
    sergioNote: 'Las mejores fotos de la cala se toman desde el sendero alto junto a la torre.',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.3638, lng: 2.8362 },
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Torre+de+Cala+Pi+Mallorca',
  },
  {
    id: 'far-ses-salines',
    name: 'Far de Ses Salines & Playas del Sur',
    zone: 'sureste',
    zoneLabel: 'Sureste (Santanyí)',
    category: 'miradores',
    categoryLabel: 'Finisterre Sur & Cabrera',
    area: 'Ses Salines',
    description: 'El punto más meridional de Mallorca. Acantilados bajos, roquedales solitarios y un sendero costero virgen que lleva a Es Caragol.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Carretera asfaltada recta hasta el faro. Estacionamiento en los márgenes de la calzada.',
    sergioNote: 'Puesta de sol espectacular y cielos nocturnos completamente libres de luz artificial.',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.2647, lng: 3.0544 },
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Far+de+ses+Salines+Mallorca',
  },

  // ─── 2. LEVANTE & ARTÀ ───
  {
    id: 'cala-varques',
    name: 'Cala Varques & Es Pont Natural',
    zone: 'levante',
    zoneLabel: 'Levante (Manacor)',
    category: 'calas',
    categoryLabel: 'Cala Virgen & Cuevas Marinas',
    area: 'Manacor',
    description: 'Playa virgen de arena blanca, cuevas marinas para explorar y el icónico arco de piedra natural sobre el mar más famoso de Mallorca.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Aparcar en los márgenes habilitados de la Ma-4014. Sendero llano y sombreado de unos 20 min atravesando el pinar.',
    sergioNote: 'Llevar calzado cómodo para el sendero y agua suficiente. Imprescindible visitar Es Pont Natural.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.4975, lng: 3.2986 },
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Cala+Varques+Mallorca',
  },
  {
    id: 'cuevas-arta-canyamel',
    name: 'Aparcamiento Cuevas de Artà & Cap Vermell',
    zone: 'levante',
    zoneLabel: 'Levante (Capdepera)',
    category: 'miradores',
    categoryLabel: 'Acantilados & Mirador Marino',
    area: 'Capdepera / Canyamel',
    description: 'Explanada panorámica suspendida sobre el mar frente a los imponentes acantilados de Cap Vermell y la bahía de Canyamel.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Aparcamiento asfaltado gratuito con excelente maniobrabilidad para cualquier tipo de camper.',
    sergioNote: 'Muy tranquilo al atardecer cuando cierran las cuevas. Vistas abiertas al horizonte este.',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.6542, lng: 3.4475 },
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Coves+d+Arta+Parking',
  },
  {
    id: 'cala-mitjana-duaia',
    name: 'Sa Duaia, Camí de Cala Mitjana & Torta',
    zone: 'levante',
    zoneLabel: 'Levante (Artà)',
    category: 'pernocta',
    categoryLabel: 'Parque Natural & Calas Vírgenes',
    area: 'P.N. de Llevant (Artà)',
    description: 'El corazón virgen del noreste de Mallorca. Playas salvajes de dunas, vegetación autóctona y ausencia total de construcciones.',
    camperAccess: 'Camper Compacta',
    accessTip: 'Pista de acceso asfaltada con tramos bacheados al final. Conducir a baja velocidad.',
    sergioNote: 'Nota de Sergio: Marcador especial. Entorno 100% natural para desconectar y dormir con el sonido de la brisa marina.',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.7431, lng: 3.3982 },
    image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Sa+Duaia+Arta+Mallorca',
  },
  {
    id: 'cala-lliteres-agulla',
    name: 'Cala Lliteres & Cala Agulla',
    zone: 'levante',
    zoneLabel: 'Levante (Capdepera)',
    category: 'calas',
    categoryLabel: 'Aguas Cristalinas & Pinar',
    area: 'Capdepera',
    description: 'Cala rocosa de aguas transparentes ideal para buceo y snorkel junto al extenso arenal protegido de Cala Agulla.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Aparcamiento en las calles de Cala Lliteres o en el gran pinar habilitado de Cala Agulla.',
    sergioNote: 'Excelente para un baño matutino temprano antes de que sople el viento térmico.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.7188, lng: 3.4542 },
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Cala+Lliteres+Capdepera',
  },
  {
    id: 'son-serra-marina',
    name: 'Aparcamiento Son Serra de Marina & Sa Canova',
    zone: 'levante',
    zoneLabel: 'Levante / Bahía Alcúdia',
    category: 'pernocta',
    categoryLabel: 'Playa Salvaje & Espíritu Libre',
    area: 'Santa Margalida',
    description: 'Una de las playas vírgenes más extensas del norte de Mallorca. Ambiente libre, dunas protegidas y olas para surf y kitesurf.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Aparcamiento amplio y nivelado a pie de playa. Respetar estrictamente el cordón dunar.',
    sergioNote: 'Uno de los puntos favoritos de la comunidad camper en Mallorca. Noches estrelladas mágicas.',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.7335, lng: 3.2215 },
    image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Son+Serra+de+Marina+Mallorca',
  },
  {
    id: 'betlem-arta',
    name: 'Betlem & Cap de Ferrutx',
    zone: 'levante',
    zoneLabel: 'Levante (Artà)',
    category: 'pernocta',
    categoryLabel: 'Fin del Camino & Silencio',
    area: 'Artà',
    description: 'Tranquila colonia marinera al final de la carretera costera frente a la majestuosa silueta del Cap de Ferrutx.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Carretera asfaltada sin salida. Plazas llanas frente al mar al final de la travesía.',
    sergioNote: 'Paz absoluta. Sendero a pie hacia calas vírgenes solitarias como Na Clara.',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.7538, lng: 3.3122 },
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Betlem+Arta+Mallorca',
  },
  {
    id: 'iglesia-sant-llorenc',
    name: 'Església de Sant Llorenç & Mirador',
    zone: 'levante',
    zoneLabel: 'Levante Interior',
    category: 'pernocta',
    categoryLabel: 'Pernocta en Altura & Vistas',
    area: 'Sant Llorenç des Cardassar',
    description: 'Entorno apacible en el interior de Mallorca con vistas panorámicas sobre los campos de almendros y colinas de Llevant.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Plazas tranquilas y niveladas junto al templo con sombra de árboles.',
    sergioNote: 'Nota de Sergio: "Vistas perfectas para dormir, comer y descansar con máxima tranquilidad."',
    hasWater: true,
    hasOvernight: true,
    coordinates: { lat: 39.6175, lng: 3.2842 },
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Esglesia+Sant+Llorenc+des+Cardassar',
  },
  {
    id: 'torre-serral-falcons',
    name: 'Torre del Serral dels Falcons',
    zone: 'levante',
    zoneLabel: 'Levante (Porto Cristo)',
    category: 'miradores',
    categoryLabel: 'Atalaya sobre Acantilados',
    area: 'Porto Cristo',
    description: 'Torre de vigilancia construida en 1577 sobre altos acantilados con vistas abiertas hacia el mar abierto y la entrada del puerto.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Explanada asfaltada con fácil giro para campers junto a la torre.',
    sergioNote: 'Muy buen punto para contemplar el amanecer en la costa este de la isla.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.5385, lng: 3.3368 },
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Torre+del+Serral+dels+Falcons',
  },
  {
    id: 'area-camper-manacor',
    name: 'Área de Servicio Camper Manacor / Son Servera',
    zone: 'levante',
    zoneLabel: 'Levante (Manacor)',
    category: 'servicios',
    categoryLabel: 'Punto Técnico Integral',
    area: 'Manacor',
    description: 'Estación moderna y equipada para el mantenimiento técnico de la furgoneta camper en Mallorca.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Fácil acceso desde la carretera principal con borne de servicio operativo.',
    sergioNote: 'Esencial para vaciar aguas grises/negras y reponer agua limpia antes de las calas.',
    hasWater: true,
    hasOvernight: false,
    coordinates: { lat: 39.5695, lng: 3.2085 },
    image: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Area+Autocaravanas+Manacor',
  },

  // ─── 3. NORTE & FORMENTOR ───
  {
    id: 'mirador-colomer',
    name: "Mirador d'Es Colomer (Cap Formentor)",
    zone: 'norte',
    zoneLabel: 'Norte (Pollença)',
    category: 'miradores',
    categoryLabel: 'Acantilados de 200m & Sunset',
    area: 'Península de Formentor',
    description: 'El mirador más espectacular de Mallorca. Pasarelas de piedra sobre acantilados verticales que caen a plomo sobre el azul cobalto.',
    camperAccess: 'Carretera Panorámica',
    accessTip: 'Gran parking asfaltado en el mirador. En verano hay restricciones para seguir hasta el faro entre 10:00 y 19:00 h.',
    sergioNote: 'Imprescindible llegar al atardecer cuando la luz dorada baña los acantilados de Formentor.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.9288, lng: 3.1118 },
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Mirador+des+Colomer+Formentor',
  },
  {
    id: 'atalaya-albercutx',
    name: 'Atalaya de Albercutx (Formentor 360º)',
    zone: 'norte',
    zoneLabel: 'Norte (Pollença)',
    category: 'miradores',
    categoryLabel: 'Mirador 360º & Torre Militar',
    area: 'Pollença',
    description: 'Torre vigía a 380 metros de altitud con vistas panorámicas de 360 grados sobre toda la bahía de Pollença, Formentor y la Tramuntana.',
    camperAccess: 'Carretera Panorámica',
    accessTip: 'Subida por pista estrecha desde el parking d’Es Colomer. Se puede subir caminando 20 min.',
    sergioNote: 'Las vistas más altas e impactantes de todo el norte de Mallorca.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.9328, lng: 3.1165 },
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Talaia+d+Albercutx',
  },
  {
    id: 'playa-formentor',
    name: 'Parking Playa de Formentor',
    zone: 'norte',
    zoneLabel: 'Norte (Pollença)',
    category: 'calas',
    categoryLabel: 'Playa de Arena & Pinar de Lujo',
    area: 'Formentor',
    description: 'Arenal idílico flanqueado por encinas y pinos cuyas ramas acarician el agua cristalina del Mediterráneo.',
    camperAccess: 'Carretera Panorámica',
    accessTip: 'Gran aparcamiento sombreado bajo los árboles (de pago en temporada estival).',
    sergioNote: 'Ideal para madrugar y bañarse en aguas tranquilas como un espejo.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.9272, lng: 3.1396 },
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Playa+de+Formentor+Parking',
  },
  {
    id: 'sant-vicenc-pollença',
    name: 'Aparcamiento Cala Sant Vicenç',
    zone: 'norte',
    zoneLabel: 'Norte (Pollença)',
    category: 'calas',
    categoryLabel: 'Cuatro Calas & Cavall Bernat',
    area: 'Pollença',
    description: 'Conjunto de calas (Cala Barques, Cala Molins, Cala Clara) bajo la imponente cordillera dentada del Cavall Bernat.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Varios aparcamientos asfaltados gratuitos distribuidos en la pequeña localidad costera.',
    sergioNote: 'Aguas cristalinas con fondos de roca ideales para snorkel y paddle surf.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.9197, lng: 3.0545 },
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Cala+Sant+Vicenc+Mallorca',
  },
  {
    id: 'parking-la-victoria',
    name: 'Parking La Victòria & Ermita',
    zone: 'norte',
    zoneLabel: 'Norte (Alcúdia)',
    category: 'pernocta',
    categoryLabel: 'Pernocta en Naturaleza & Vistas',
    area: 'Península de la Victòria (Alcúdia)',
    description: 'Mirador elevado entre las bahías de Alcúdia y Pollença rodeado de pinares con ermita histórica y senderos a calas vírgenes.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Carretera asfaltada tranquila. Parking llano rodeado de sombra.',
    sergioNote: 'Punto excelente para pernoctar con total tranquilidad y brisa marina.',
    hasWater: true,
    hasOvernight: true,
    coordinates: { lat: 39.8732, lng: 3.1678 },
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Ermita+de+la+Victoria+Alcudia',
  },
  {
    id: 'cami-vell-victoria',
    name: 'Camí Vell de la Victòria & Calas Escondidas',
    zone: 'norte',
    zoneLabel: 'Norte (Alcúdia)',
    category: 'calas',
    categoryLabel: 'Calas Salvajes & Pinar',
    area: 'Alcúdia',
    description: 'Acceso a calas de piedra poco concurridas (S’Illot, Platja des Morer Vermell) con aguas cristalinas para buceo.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Aparcamiento en los miradores de la costa con vistas a la bahía de Pollença.',
    sergioNote: 'Nota de Sergio: Parada muy agradable frente al mar con mesas de pícnic a la sombra.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.8665, lng: 3.1550 },
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Cami+Vell+Victoria+Alcudia',
  },

  // ─── 4. SERRA DE TRAMUNTANA ───
  {
    id: 'sa-calobra-torrent',
    name: 'Ruta a Sa Calobra & Torrent de Pareis',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Escorca)',
    category: 'calas',
    categoryLabel: 'Cañón Natural & Desfiladero',
    area: 'Escorca',
    description: 'Una de las carreteras más espectaculares del mundo que desciende hasta una cala escondida entre altas paredes de roca.',
    camperAccess: 'Carretera Panorámica',
    accessTip: 'Descenso por la icónica Ma-2141. Conducir relajado y aparcar en el gran parking habilitado.',
    sergioNote: 'Cruzar el túnel excavado en la roca para llegar a la desembocadura es una experiencia inolvidable.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.8524, lng: 2.7985 },
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Port+de+Sa+Calobra+Mallorca',
  },
  {
    id: 'nus-sa-corbata',
    name: 'Mirador Nus de Sa Corbata (Carretera Sa Calobra)',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Escorca)',
    category: 'miradores',
    categoryLabel: 'Curva 360º & Obra de Ingeniería',
    area: 'Escorca',
    description: 'Famoso lazo de 360 grados diseñado por Antonio Parietti en 1932 para salvar el desnivel de la montaña sin túneles.',
    camperAccess: 'Carretera Panorámica',
    accessTip: 'Mirador asfaltado con barandilla para detener la camper y fotografiar la curva.',
    sergioNote: 'Uno de los puntos fotográficos más emblemáticos para amantes de la conducción camper.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.8272, lng: 2.8188 },
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Nus+de+sa+Corbata+Mallorca',
  },
  {
    id: 'escorca-desayuno',
    name: 'Parada Panorámica Ma-2141 Escorca',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Escorca)',
    category: 'pernocta',
    categoryLabel: 'Mirador de Alta Montaña',
    area: 'Escorca',
    description: 'Explanada panorámica suspendida sobre las cumbres de la Tramuntana con vistas al Puig Major.',
    camperAccess: 'Carretera Panorámica',
    accessTip: 'Apartadero ancho y llano en el tramo alto de la Ma-2141.',
    sergioNote: 'Nota de Sergio: "Ideal para parar y desayunar con vistas despejadas a toda la cordillera."',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.8182, lng: 2.8425 },
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Escorca+Mallorca',
  },
  {
    id: 'cala-tuent',
    name: 'Cala Tuent & Bosque de Pinos',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Escorca)',
    category: 'calas',
    categoryLabel: 'Cala Salvaje de Montaña',
    area: 'Escorca',
    description: 'Una de las calas más vírgenes y tranquilas de la Tramuntana bajo la imponente cumbre del Puig Major.',
    camperAccess: 'Carretera Panorámica',
    accessTip: 'Desvío señalizado antes de llegar a Sa Calobra. Parking sombreado bajo los árboles.',
    sergioNote: 'Mucha menos afluencia que Sa Calobra. Ideal para pasar el día completo en silencio.',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.8395, lng: 2.7758 },
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Cala+Tuent+Mallorca',
  },
  {
    id: 'santuari-lluc',
    name: 'Santuari de Lluc & Área de Acampada',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Escorca)',
    category: 'pernocta',
    categoryLabel: 'Pernocta en Bosque & Silencio',
    area: 'Escorca',
    description: 'Corazón natural y cultural de la Tramuntana rodeado de encinares centenarios y aire puro de montaña.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Excelente acceso por la Ma-2130. Área habilitada con baños, agua y zona de picnic.',
    sergioNote: 'El mejor punto de pernocta en plena naturaleza de toda la Serra de Tramuntana.',
    hasWater: true,
    hasOvernight: true,
    coordinates: { lat: 39.8228, lng: 2.8842 },
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Santuari+de+Lluc+Mallorca',
  },
  {
    id: 'mirador-sa-foradada',
    name: 'Sa Foradada & Son Marroig (Parkoviště)',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Deià)',
    category: 'miradores',
    categoryLabel: 'Puesta de Sol Mítica',
    area: 'Deià',
    description: 'La península perforada más famosa de Mallorca y el atardecer dorado más icónico de todo el Mediterráneo.',
    camperAccess: 'Camper Compacta',
    accessTip: 'Aparcamiento junto al mirador en la carretera costera Ma-10. Llegar con antelación.',
    sergioNote: 'Llegar 1 hora antes de la puesta de sol para aparcar cómodamente y disfrutar del chill out.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.7525, lng: 2.6368 },
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Mirador+de+Sa+Foradada+Mallorca',
  },
  {
    id: 'soller-santa-catalina',
    name: 'Sóller, Port de Sóller & Mirador Santa Catalina',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Sóller)',
    category: 'miradores',
    categoryLabel: 'Bahía Natural & Puerto Histórico',
    area: 'Sóller',
    description: 'Puerto natural semicircular rodeado de huertos de naranjos con tranvía histórico de madera y faros.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Aparcar en los parkings de la entrada al puerto o subir al mirador del Museu de la Mar.',
    sergioNote: 'Subir al mirador de Santa Catalina para contemplar toda la bahía y el atardecer sobre el mar.',
    hasWater: true,
    hasOvernight: false,
    coordinates: { lat: 39.7942, lng: 2.6958 },
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Port+de+Soller+Mallorca',
  },
  {
    id: 'port-valldemossa',
    name: 'Port de Valldemossa (Sa Marina)',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Valldemossa)',
    category: 'pernocta',
    categoryLabel: 'Pueblo Marinero Escondido',
    area: 'Valldemossa',
    description: 'Pequeño puerto pesquero tradicional con aguas cristalinas al pie de impresionantes acantilados verticales.',
    camperAccess: 'Carretera Panorámica',
    accessTip: 'Descenso por carretera estrecha y sinuosa. Conducir despacio; recomendable para campers compactas.',
    sergioNote: 'Un rincón secreto y muy auténtico para cenar marisco fresco junto a los botes.',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.7215, lng: 2.5975 },
    image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Port+de+Valldemossa+Mallorca',
  },
  {
    id: 'mirador-ses-animes',
    name: 'Mirador de Ses Ánimes - Pernocta & Vistas',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Banyalbufar)',
    category: 'miradores',
    categoryLabel: 'Atalaya del Siglo XVI',
    area: 'Banyalbufar',
    description: 'Vistas espectaculares al mar en la Serra de Tramuntana. Espacio limitado, se recomienda llegar al atardecer para asegurar sitio.',
    camperAccess: 'Camper Compacta',
    accessTip: 'Explanada asfaltada junto a la Ma-10 con mirador de piedra.',
    sergioNote: 'Parada obligatoria en la ruta Ma-10. Sensación de libertad y vistas sobrecogedoras.',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.6912, lng: 2.4975 },
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Torre+del+Verger+Banyalbufar',
  },
  {
    id: 'mirador-des-grau',
    name: 'Mirador des Grau & Costa de Estellencs',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Estellencs)',
    category: 'miradores',
    categoryLabel: 'Balcón al Mediterráneo',
    area: 'Estellencs',
    description: 'Punto panorámico en la carretera Ma-10 con vistas a bancales milenarios de piedra seca y mar abierto.',
    camperAccess: 'Camper Compacta',
    accessTip: 'Apartadero en la carretera Ma-10 señalizado como mirador panorámico.',
    sergioNote: 'Excelente parada para tomar un café con vistas a la inmensidad del mar.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.6642, lng: 2.4585 },
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Mirador+des+Grau+Estellencs',
  },
  {
    id: 'sant-elm-dragonera',
    name: 'Sant Elm & Cala Conills (Vistas Sa Dragonera)',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Andratx)',
    category: 'pernocta',
    categoryLabel: 'Frente al P.N. Sa Dragonera',
    area: 'Andratx',
    description: 'Pintoresco pueblo costero frente a la silueta de dragón de la isla protegida de Sa Dragonera.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Aparcamientos al final del pueblo y senderos hacia la Torre de Cala en Basset.',
    sergioNote: 'Puesta de sol mágica con el sol cayendo justo detrás de Sa Dragonera.',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.5788, lng: 2.3512 },
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Sant+Elm+Mallorca',
  },
  {
    id: 'cala-blanca-andratx',
    name: 'Camí Cala Blanca & Camp de Mar',
    zone: 'tramuntana',
    zoneLabel: 'Serra de Tramuntana (Andratx)',
    category: 'calas',
    categoryLabel: 'Calas Rocosas & Pinar',
    area: 'Andratx',
    description: 'Pequeñas calas de cantos rodados y aguas transparentes rodeadas de pinos en la costa suroeste.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Pista tranquila con aparcamientos sombreados antes de bajar al mar.',
    sergioNote: 'Lugar muy tranquilo para un baño rápido al salir o entrar de la ruta de Tramuntana.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.5385, lng: 2.4215 },
    image: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Cala+Blanca+Andratx',
  },

  // ─── 5. PALMA & BAHÍA SUR ───
  {
    id: 'portals-vells',
    name: 'Plageta de Portals Vells & Cuevas de la Mare de Déu',
    zone: 'palma',
    zoneLabel: 'Palma & Bahía Sur (Calvià)',
    category: 'calas',
    categoryLabel: 'Cala de Arena & Cuevas Históricas',
    area: 'Calvià',
    description: 'Bahía abrigada de aguas color turquesa rodeada de pinares con impresionantes cuevas artificiales excavadas en la Edad Media.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Aparcamiento amplio y sombreado bajo los pinos junto al arenal.',
    sergioNote: 'Aguas cristalinas como una piscina natural. Visitar las cuevas caminando por el sendero lateral.',
    hasWater: false,
    hasOvernight: true,
    coordinates: { lat: 39.4758, lng: 2.5208 },
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Platja+de+Portals+Vells',
  },
  {
    id: 'aparcament-palma-dique',
    name: 'Aparcamiento Palma / Dique del Oeste',
    zone: 'palma',
    zoneLabel: 'Palma Ciudad',
    category: 'servicios',
    categoryLabel: 'Aparcamiento Estratégico Palma',
    area: 'Palma',
    description: 'Punto cómodo para estacionar la camper y acceder a la ciudad, el puerto y el Castillo de Bellver.',
    camperAccess: 'Acceso Fácil',
    accessTip: 'Explanada amplia y gratuita cercana al paseo marítimo y transporte público.',
    sergioNote: 'Ideal para visitar el centro de Palma sin meter la furgoneta en calles estrechas.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.5525, lng: 2.6242 },
    image: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Dique+del+Oeste+Palma',
  },
  {
    id: 'pedreres-la-seu',
    name: 'Aparcament Pedreres de la Seu & Paseo Marítimo',
    zone: 'palma',
    zoneLabel: 'Palma Ciudad',
    category: 'servicios',
    categoryLabel: 'Catedral & Casco Antiguo',
    area: 'Palma',
    description: 'Ubicación cercana a la impresionante Catedral gótica La Seu y el Parque del Mar.',
    camperAccess: 'Camper Compacta',
    accessTip: 'Plazas de aparcamiento urbano. Recomendable acudir a primera hora de la mañana.',
    sergioNote: 'Muy cómodo para dar un paseo por el casco antiguo y probar ensaimadas tradicionales.',
    hasWater: false,
    hasOvernight: false,
    coordinates: { lat: 39.5668, lng: 2.6455 },
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    googleMapsUrl: 'https://maps.google.com/?q=Catedral+de+Palma+La+Seu',
  },
]

export default function MallorcaGuideClient() {
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null)
  const [activeSpotId, setActiveSpotId] = useState<string | null>('mirador-ses-animes')
  const [activeLayer, setActiveLayer] = useState<string>('terrain')
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const polylineRef = useRef<any>(null)

  // Filtered list of spots
  const filteredSpots = useMemo(() => {
    return SPOTS_34.filter(spot => {
      // Zone match
      if (selectedZone !== 'all' && spot.zone !== selectedZone) return false
      // Category match
      if (selectedCategory !== 'all' && spot.category !== selectedCategory) return false
      // Active route filter
      if (activeRouteId) {
        const route = SUGGESTED_ROUTES.find(r => r.id === activeRouteId)
        if (route && !route.highlightSpotIds.includes(spot.id)) return false
      }
      return true
    })
  }, [selectedZone, selectedCategory, activeRouteId])

  const activeSpot = useMemo(() => SPOTS_34.find(s => s.id === activeSpotId), [activeSpotId])
  const activeRoute = useMemo(() => SUGGESTED_ROUTES.find(r => r.id === activeRouteId), [activeRouteId])

  // ─── Initialize Leaflet Map ───
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return
    let isCancelled = false

    const initMap = async () => {
      const L = (await import('leaflet')).default

      // Inject Leaflet CSS if not already present
      if (!document.getElementById('leaflet-custom-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-custom-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      if (isCancelled || !mapContainerRef.current) return

      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }

      // Create Leaflet Map with Mallorca bounding box lock
      const map = L.map(mapContainerRef.current, {
        center: [39.6953, 2.9896],
        zoom: 10,
        minZoom: 9.2,
        maxZoom: 20,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        zoomControl: false,
        attributionControl: false,
        maxBounds: [
          [39.05, 2.10], // South-West
          [40.08, 3.60], // North-East
        ],
        maxBoundsViscosity: 0.85,
      })

      leafletMapRef.current = map

      // Add default tile layer (Google Terrain / 3D Relief 2x HD)
      const currentLayer = MAP_LAYERS.find(l => l.id === activeLayer) || MAP_LAYERS[0]
      L.tileLayer(currentLayer.url, {
        maxZoom: 20,
        maxNativeZoom: 19,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        detectRetina: true,
        tileSize: 256,
      }).addTo(map)

      // Fit Mallorca island boundaries
      map.fitBounds([
        [39.2400, 2.3200],
        [39.9700, 3.5000]
      ], { padding: [16, 16] })

      // Close active popover card when clicking anywhere on the map
      map.on('click', () => {
        setActiveSpotId(null)
      })

      setIsMapLoaded(true)
    }

    initMap()

    return () => {
      isCancelled = true
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [])

  // ─── Offset focus so selected marker is never covered by the floating card ───
  const focusSpotOnMap = (lat: number, lng: number) => {
    if (!leafletMapRef.current) return
    const map = leafletMapRef.current
    const container = map.getContainer()
    const width = container.clientWidth
    const isMobile = width < 768

    const zoom = map.getZoom()
    const targetPoint = map.project([lat, lng], zoom)
    let offsetPoint
    if (isMobile) {
      // On mobile, card is at bottom: shift center down by 100px so marker is in the top 50%
      offsetPoint = targetPoint.add([0, 100])
    } else {
      // On desktop, card is at top-left: shift center left by 150px so marker is in the open right area
      offsetPoint = targetPoint.add([-150, 0])
    }
    const targetLatLng = map.unproject(offsetPoint, zoom)
    map.panTo(targetLatLng, { animate: true, duration: 0.45 })
  }

  // ─── Change Tile Layer ───
  useEffect(() => {
    if (!leafletMapRef.current || !isMapLoaded) return
    const map = leafletMapRef.current

    map.eachLayer((layer: any) => {
      if (layer._url) {
        map.removeLayer(layer)
      }
    })

    import('leaflet').then(({ default: L }) => {
      const currentLayer = MAP_LAYERS.find(l => l.id === activeLayer) || MAP_LAYERS[0]
      L.tileLayer(currentLayer.url, {
        maxZoom: 20,
        maxNativeZoom: 19,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        detectRetina: true,
        tileSize: 256,
      }).addTo(map)
    })
  }, [activeLayer, isMapLoaded])

  // ─── Render Markers & Active Routes ───
  useEffect(() => {
    if (!leafletMapRef.current || !isMapLoaded) return
    const map = leafletMapRef.current

    import('leaflet').then(({ default: L }) => {
      // Clear old markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current.clear()

      // Clear old polyline
      if (polylineRef.current) {
        polylineRef.current.remove()
        polylineRef.current = null
      }

      // Add Custom Stitch-Style Circular Markers with Soft Category Palettes
      filteredSpots.forEach(spot => {
        const isSelected = spot.id === activeSpotId
        const catMeta = getCategoryMeta(spot.category)

        let iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>'
        if (spot.category === 'calas') {
          iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12q2.5 2 5 0t5 0 5 0 5 0"></path><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0"></path><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0"></path></svg>'
        } else if (spot.category === 'miradores') {
          iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10V2"></path><path d="m4.93 10.93 1.41 1.41"></path><path d="M2 18h2"></path><path d="M20 18h2"></path><path d="m19.07 10.93-1.41 1.41"></path><path d="M22 22H2"></path><path d="m16 6-4 4-4-4"></path><path d="M16 18a4 4 0 0 0-8 0"></path></svg>'
        } else if (spot.category === 'pernocta') {
          iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path></svg>'
        } else if (spot.category === 'servicios') {
          iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"></path></svg>'
        }

        const iconHtml = `
          <div class="stitch-leaflet-pin ${isSelected ? 'stitch-leaflet-pin--active' : ''}">
            ${isSelected ? `<div class="stitch-leaflet-pulse" style="background: ${catMeta.pulse};"></div>` : ''}
            <div class="stitch-leaflet-circle ${isSelected ? 'stitch-leaflet-circle--selected' : ''}" style="background: ${isSelected ? '#1A2B21' : catMeta.bg}; border-color: ${isSelected ? catMeta.color : catMeta.border}; color: ${isSelected ? '#FFFFFF' : catMeta.color};">
              ${iconSvg}
            </div>
            ${isSelected ? `<div class="stitch-leaflet-label" style="border: 1px solid ${catMeta.border};">${spot.name}</div>` : ''}
          </div>
        `

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'stitch-leaflet-marker-wrapper',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        })

        const marker = L.marker([spot.coordinates.lat, spot.coordinates.lng], { icon: customIcon })
          .addTo(map)
          .on('click', (e: any) => {
            if (e && e.originalEvent) {
              e.originalEvent.stopPropagation()
            }
            setActiveSpotId(spot.id)
            focusSpotOnMap(spot.coordinates.lat, spot.coordinates.lng)
          })

        markersRef.current.set(spot.id, marker)
      })

      // Draw Suggested Route if active
      if (activeRoute) {
        const routeSpots = activeRoute.highlightSpotIds
          .map(id => SPOTS_34.find(s => s.id === id))
          .filter(Boolean) as Spot[]

        if (routeSpots.length >= 2) {
          const latLngs: [number, number][] = routeSpots.map(s => [s.coordinates.lat, s.coordinates.lng])
          const poly = L.polyline(latLngs, {
            color: activeRoute.color,
            weight: 4.5,
            dashArray: '8, 6',
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map)

          polylineRef.current = poly
          map.fitBounds(poly.getBounds(), { padding: [40, 40] })
        }
      }
    })
  }, [filteredSpots, activeSpotId, activeRoute, isMapLoaded])

  // Center on selected spot with offset so card never covers it
  const handleSpotSelect = (spotId: string) => {
    const nextSpotId = activeSpotId === spotId ? null : spotId
    setActiveSpotId(nextSpotId)
    if (nextSpotId) {
      const spot = SPOTS_34.find(s => s.id === spotId)
      if (spot) {
        focusSpotOnMap(spot.coordinates.lat, spot.coordinates.lng)
      }
    }
  }

  const handleViewOnMap = (spotId: string) => {
    setActiveSpotId(spotId)
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const spot = SPOTS_34.find(s => s.id === spotId)
    if (spot) {
      setTimeout(() => {
        focusSpotOnMap(spot.coordinates.lat, spot.coordinates.lng)
      }, 250)
    }
  }

  const handleToggleRoute = (routeId: string) => {
    if (activeRouteId === routeId) {
      setActiveRouteId(null)
    } else {
      setActiveRouteId(routeId)
      setActiveSpotId(null)
      mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Zoom controls
  const handleZoomIn = () => leafletMapRef.current?.zoomIn()
  const handleZoomOut = () => leafletMapRef.current?.zoomOut()
  const handleZoomReset = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.fitBounds([
        [39.2400, 2.3200],
        [39.9700, 3.5000]
      ], { padding: [16, 16] })
    }
  }

  return (
    <div className="guia-root">
      {/* ─── Header Section (Stitch Style) ─── */}
      <header className="guia-header">
        <div className="guia-header__content">
          <div className="guia-header__badge">
            <Compass size={14} className="text-[#B88746]" />
            <span>Guía de Viaje · Mallorca Edition</span>
          </div>
          <h1 className="guia-header__title">
            Mapa Interactivo Premium –<br className="hidden sm:inline" /> Utopia Van Life
          </h1>
          <p className="guia-header__subtitle">
            Descubre las mejores calas vírgenes, áreas de pernocta seleccionadas y puntos de servicio camper en la isla. Una selección cuidada para una experiencia nómada de lujo silencioso con cartografía y relieve real.
          </p>
        </div>

        <div className="guia-header__actions">
          <a
            href="https://maps.app.goo.gl/JnVmcVMGndYc5Mse8?g_st=i"
            target="_blank"
            rel="noopener noreferrer"
            className="stitch-btn-primary"
            title="Abrir en Google Maps"
          >
            <ExternalLink size={16} />
            <span>Abrir en Google Maps</span>
          </a>
        </div>
      </header>

      {/* ─── Category Filter Pills (Stitch Design) ─── */}
      <div className="filter-section">
        <div className="category-pills-row">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const count = cat.id === 'all' ? SPOTS_34.length : SPOTS_34.filter(s => s.category === cat.id).length
            const isActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`stitch-category-pill ${isActive ? 'stitch-category-pill--active' : ''}`}
                style={{
                  backgroundColor: isActive ? cat.bg : '#FFFFFF',
                  borderColor: isActive ? cat.border : '#E2E8F0',
                  color: isActive ? cat.text : '#4A5568',
                }}
              >
                <Icon size={15} style={{ color: cat.color }} />
                <span>{cat.label}</span>
                <span
                  className="pill-count"
                  style={{
                    backgroundColor: isActive ? 'rgba(0,0,0,0.06)' : '#F1F5F9',
                    color: isActive ? cat.text : '#64748B',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Zone Filters Capsule Bar */}
        <div className="zone-pills-container">
          {ZONES.map(z => {
            const count = z.id === 'all' ? SPOTS_34.length : SPOTS_34.filter(s => s.zone === z.id).length
            const isActive = selectedZone === z.id
            return (
              <button
                key={z.id}
                onClick={() => setSelectedZone(z.id)}
                className={`zone-pill ${isActive ? 'zone-pill--active' : ''}`}
              >
                <span>{z.label}</span>
                <span className="zone-pill__count">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Interactive Real Geographic Map (Stitch Aesthetic + Real Relief) ─── */}
      <div className="stitch-map-card" ref={mapRef}>
        {/* Layer Switcher Top Bar */}
        <div className="map-layer-bar">
          <div className="map-layer-tabs">
            {MAP_LAYERS.map(layer => {
              const Icon = layer.icon
              const isActive = activeLayer === layer.id
              return (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`map-layer-btn ${isActive ? 'map-layer-btn--active' : ''}`}
                  title={layer.description}
                >
                  <Icon size={14} />
                  <span>{layer.label}</span>
                </button>
              )
            })}
          </div>

          <span className="map-spots-counter">
            {filteredSpots.length} lugares en Mallorca
          </span>
        </div>

        {/* Leaflet Map Canvas */}
        <div className="map-canvas-wrapper">
          <div ref={mapContainerRef} className="leaflet-map-canvas" />

          {/* Floating Stitch Popover Card for Active Spot */}
          {activeSpot && (
            <div className="stitch-floating-modal" onClick={(e) => e.stopPropagation()}>
              <div className="stitch-popover__card">
                <div className="stitch-popover__img-wrap">
                  <Image
                    src={activeSpot.image}
                    alt={activeSpot.name}
                    fill
                    sizes="320px"
                    style={{ objectFit: 'cover' }}
                  />
                  {(() => {
                    const catMeta = getCategoryMeta(activeSpot.category)
                    return (
                      <span
                        className="stitch-popover__tag"
                        style={{
                          backgroundColor: catMeta.bg,
                          color: catMeta.text,
                          border: `1px solid ${catMeta.border}`,
                        }}
                      >
                        {activeSpot.categoryLabel}
                      </span>
                    )
                  })()}
                  <button
                    onClick={() => setActiveSpotId(null)}
                    className="stitch-popover__close"
                    title="Cerrar"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="stitch-popover__body">
                  <h3 className="stitch-popover__title">{activeSpot.name}</h3>
                  <span className="stitch-popover__zone">{activeSpot.zoneLabel}</span>

                  <div className="stitch-popover__tags">
                    <span className="stitch-tag">
                      <Truck size={12} /> {activeSpot.camperAccess}
                    </span>
                    {activeSpot.hasOvernight && (
                      <span className="stitch-tag">
                        <Moon size={12} /> Pernocta
                      </span>
                    )}
                    {activeSpot.hasWater && (
                      <span className="stitch-tag">
                        <Droplets size={12} /> Punto de Agua
                      </span>
                    )}
                  </div>

                  <p className="stitch-popover__desc">{activeSpot.description}</p>

                  {activeSpot.sergioNote && (
                    <div className="stitch-popover__note">
                      <span style={{ fontWeight: 700, color: '#1A2B21' }}>⭐ Consejo Utopia:</span> {activeSpot.sergioNote}
                    </div>
                  )}

                  <a
                    href={activeSpot.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="stitch-popover__btn"
                  >
                    <Navigation size={13} /> Cómo llegar por GPS
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Floating Zoom & Recenter Controls */}
          <div className="stitch-map-controls">
            <button onClick={handleZoomIn} className="stitch-ctrl-btn" title="Acercar mapa (+)">
              <Plus size={18} />
            </button>
            <button onClick={handleZoomOut} className="stitch-ctrl-btn" title="Alejar mapa (-)">
              <Minus size={18} />
            </button>
            <button onClick={handleZoomReset} className="stitch-ctrl-btn" title="Centrar Mallorca">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Suggested Routes Bar (Itinerarios Temáticos) ─── */}
      <div className="routes-bar">
        <div className="routes-bar__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Route size={18} style={{ color: '#1A2B21' }} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A2B21' }}>
              Rutas Sugeridas para tu Camper:
            </span>
          </div>
          {activeRouteId && (
            <button onClick={() => setActiveRouteId(null)} className="routes-bar__clear">
              ✕ Desactivar ruta trazada
            </button>
          )}
        </div>

        <div className="routes-pills">
          {SUGGESTED_ROUTES.map(route => {
            const isActive = activeRouteId === route.id
            return (
              <button
                key={route.id}
                onClick={() => handleToggleRoute(route.id)}
                className={`route-pill ${isActive ? 'route-pill--active' : ''}`}
                style={{ borderColor: isActive ? route.color : undefined }}
              >
                <span className="route-pill__indicator" style={{ backgroundColor: route.color }} />
                <div style={{ textAlign: 'left' }}>
                  <div className="route-pill__title">{route.name}</div>
                  <div className="route-pill__meta">{route.days} · {route.distance}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Destacados de la Temporada & Lista Curada ─── */}
      <section className="highlights-section">
        <div className="highlights-header">
          <h2 className="highlights-title">Destacados de la Temporada</h2>
          <span className="highlights-count">{filteredSpots.length} lugares disponibles</span>
        </div>

        {filteredSpots.length === 0 ? (
          <div className="empty-state">
            <p>No se han encontrado lugares con los filtros seleccionados.</p>
            <button onClick={() => { setSelectedZone('all'); setSelectedCategory('all') }} className="empty-state__btn">
              Restablecer todos los filtros
            </button>
          </div>
        ) : (
          <div className="spots-grid">
            {filteredSpots.map(spot => {
              const isSelected = activeSpotId === spot.id
              const spotCat = getCategoryMeta(spot.category)
              return (
                <article
                  key={spot.id}
                  id={`spot-${spot.id}`}
                  className={`spot-card ${isSelected ? 'spot-card--selected' : ''}`}
                  onClick={() => handleSpotSelect(spot.id)}
                >
                  <div className="spot-card__img-wrap">
                    <Image
                      src={spot.image}
                      alt={spot.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                      className="spot-card__img"
                    />
                    <div className="spot-card__gradient" />
                    <span
                      className="spot-card__badge"
                      style={{
                        backgroundColor: spotCat.bg,
                        color: spotCat.text,
                        border: `1px solid ${spotCat.border}`,
                      }}
                    >
                      {spot.categoryLabel}
                    </span>
                    {spot.isSpecialWarning && (
                      <span className="spot-card__warning-badge">
                        <AlertTriangle size={11} /> Restricción
                      </span>
                    )}
                    {isSelected && (
                      <span className="spot-card__active-flag">
                        <Check size={11} /> Activo en mapa
                      </span>
                    )}
                  </div>

                  <div className="spot-card__body">
                    <span className="spot-card__area">{spot.zoneLabel}</span>
                    <h3 className="spot-card__title">{spot.name}</h3>
                    <p className="spot-card__desc">{spot.description}</p>

                    {/* Sergio's authentic note */}
                    {spot.sergioNote && (
                      <div className="spot-card__sergio-box">
                        <span style={{ fontWeight: 700, color: '#1A2B21' }}>⭐ Consejo Utopia:</span> {spot.sergioNote}
                      </div>
                    )}

                    {/* Camper access tip */}
                    <div className="spot-card__tip">
                      <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>🚐 Acceso camper:</span> {spot.accessTip}
                    </div>

                    {/* Metadata tags */}
                    <div className="spot-card__pill-row">
                      <span className={`pill ${spot.camperAccess === 'Acceso Fácil' ? 'pill--green' : spot.camperAccess === 'Camper Compacta' ? 'pill--orange' : 'pill--purple'}`}>
                        🚐 {spot.camperAccess}
                      </span>
                      {spot.hasOvernight && <span className="pill pill--purple">🌙 Pernocta posible</span>}
                      {spot.hasWater && <span className="pill pill--blue">💧 Punto de Agua</span>}
                    </div>

                    {/* Actions */}
                    <div className="spot-card__actions">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewOnMap(spot.id) }}
                        className="spot-card__btn-view"
                      >
                        <MapPin size={13} /> Ver en Mapa
                      </button>
                      <a
                        href={spot.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="spot-card__btn-gmaps"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Navigation size={13} /> GPS
                      </a>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <style jsx global>{`
        /* ─── Leaflet Custom Pin Styling ─── */
        .stitch-leaflet-marker-wrapper {
          background: transparent !important;
          border: none !important;
        }
        .stitch-leaflet-pin {
          position: relative;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .stitch-leaflet-pin:hover {
          transform: scale(1.15);
          z-index: 9999 !important;
        }
        .stitch-leaflet-pin--active {
          transform: scale(1.22);
          z-index: 10000 !important;
        }
        .stitch-leaflet-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #FFFFFF;
          color: #1A2B21;
          border: 2px solid #FFFFFF;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .stitch-leaflet-circle--selected {
          background: #1A2B21 !important;
          color: #FFFFFF !important;
          border-color: #F5E6D3 !important;
          box-shadow: 0 0 0 4px rgba(26, 43, 33, 0.4), 0 8px 20px rgba(0, 0, 0, 0.35);
        }
        .stitch-leaflet-pulse {
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(26, 43, 33, 0.35);
          animation: stitchPinPulse 2s ease-out infinite;
          pointer-events: none;
        }
        @keyframes stitchPinPulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .stitch-leaflet-label {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 4px;
          background: rgba(26, 43, 33, 0.9);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          pointer-events: none;
          backdrop-filter: blur(4px);
        }

        /* Leaflet Container Custom Visual Filters for Mallorca colors & Crisp HD */
        .leaflet-map-canvas .leaflet-tile-pane {
          filter: saturate(1.15) contrast(1.06);
        }
        .leaflet-map-canvas img.leaflet-tile {
          image-rendering: -webkit-optimize-contrast;
        }
      `}</style>

      <style jsx>{`
        /* ─── Root ─── */
        .guia-root {
          display: flex;
          flex-direction: column;
          gap: 28px;
          color: #2D3748;
          max-width: 1240px;
          margin: 0 auto;
          padding-bottom: 60px;
        }

        /* ─── Stitch Header Section ─── */
        .guia-header {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          padding-bottom: 12px;
        }
        @media (min-width: 1024px) {
          .guia-header {
            flex-direction: row;
            align-items: flex-start;
          }
        }
        .guia-header__badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #718096;
          margin-bottom: 8px;
        }
        .guia-header__title {
          font-family: var(--font-heading), sans-serif;
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 700;
          color: #1A2B21;
          line-height: 1.18;
          margin-bottom: 12px;
        }
        .guia-header__subtitle {
          color: #718096;
          max-width: 720px;
          font-size: 0.95rem;
          line-height: 1.6;
        }
        .stitch-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 10px;
          background: #1A2B21;
          color: #FFFFFF;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(26, 43, 33, 0.15);
        }
        .stitch-btn-primary:hover {
          background: #000000;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(26, 43, 33, 0.25);
        }

        /* ─── Filter Section (Compact & No-Scroll) ─── */
        .filter-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .category-pills-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .stitch-category-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 9999px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: #4A5568;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .stitch-category-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
        }
        .stitch-category-pill--active {
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        .pill-count {
          font-size: 0.7rem;
          padding: 1px 6px;
          border-radius: 9999px;
        }

        .zone-pills-container {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          align-items: center;
          padding: 4px 6px;
          background: #F8FAFC;
          border-radius: 9999px;
          border: 1px solid #E2E8F0;
          width: fit-content;
          max-width: 100%;
        }
        .zone-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 9999px;
          border: 1px solid transparent;
          background: transparent;
          color: #64748B;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .zone-pill:hover {
          background: #FFFFFF;
          color: #1A2B21;
          border-color: #E2E8F0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .zone-pill--active {
          background: #1A2B21 !important;
          color: #FFFFFF !important;
          border-color: #1A2B21 !important;
          box-shadow: 0 2px 6px rgba(26, 43, 33, 0.2);
        }
        .zone-pill__count {
          font-size: 0.65rem;
          opacity: 0.85;
          padding: 1px 5px;
          border-radius: 9999px;
          background: rgba(0, 0, 0, 0.06);
        }
        .zone-pill--active .zone-pill__count {
          background: rgba(255, 255, 255, 0.22);
          color: #FFFFFF;
        }

        /* ─── Suggested Routes Bar ─── */
        .routes-bar {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
        }
        .routes-bar__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .routes-bar__clear {
          font-size: 0.75rem;
          color: #E53E3E;
          background: none;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }
        .routes-bar__clear:hover {
          text-decoration: underline;
        }
        .routes-pills {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 10px;
        }
        .route-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: #F7FAFC;
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .route-pill:hover {
          border-color: #CBD5E0;
          transform: translateY(-1px);
        }
        .route-pill--active {
          background: #F0FDF4;
          box-shadow: 0 2px 10px rgba(26, 43, 33, 0.06);
        }
        .route-pill__indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .route-pill__title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #1A2B21;
          line-height: 1.25;
        }
        .route-pill__meta {
          font-size: 0.72rem;
          color: #718096;
          margin-top: 2px;
        }

        /* ─── Stitch Map Card Container ─── */
        .stitch-map-card {
          position: relative;
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          background: #FFFFFF;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid #E2E8F0;
        }

        .map-layer-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
          gap: 10px;
          flex-wrap: wrap;
        }
        .map-layer-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .map-layer-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.76rem;
          font-weight: 600;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          color: #4A5568;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .map-layer-btn:hover {
          border-color: #CBD5E0;
          color: #1A2B21;
        }
        .map-layer-btn--active {
          background: #1A2B21;
          color: #FFFFFF;
          border-color: #1A2B21;
        }
        .map-spots-counter {
          font-size: 0.76rem;
          font-weight: 600;
          color: #718096;
          background: #EDF2F7;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .map-canvas-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          min-height: 480px;
          max-height: 640px;
        }
        .leaflet-map-canvas {
          width: 100%;
          height: 100%;
          background: #E2E8F0;
        }

        /* ─── Floating Popover Card on Map (Stitch Glassmorphism) ─── */
        .stitch-floating-modal {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 1000;
          width: 300px;
          max-width: calc(100% - 32px);
          animation: stitchModalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes stitchModalFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .stitch-popover__card {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 16px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          overflow: hidden;
        }

        @media (max-width: 640px) {
          .stitch-floating-modal {
            top: auto;
            bottom: 12px;
            left: 12px;
            right: 12px;
            width: auto;
            max-width: 100%;
          }
        }
        .stitch-popover__img-wrap {
          position: relative;
          width: 100%;
          height: 120px;
        }
        .stitch-popover__tag {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 3px 8px;
          border-radius: 9999px;
          backdrop-filter: blur(4px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        .stitch-popover__close {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.55);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .stitch-popover__body {
          padding: 12px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .stitch-popover__title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #1A2B21;
          line-height: 1.25;
        }
        .stitch-popover__zone {
          font-size: 0.7rem;
          color: #718096;
          font-weight: 600;
          text-transform: uppercase;
        }
        .stitch-popover__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .stitch-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: 6px;
          background: #F1F5F9;
          font-size: 0.68rem;
          font-weight: 600;
          color: #475569;
        }
        .stitch-popover__desc {
          font-size: 0.75rem;
          color: #64748B;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .stitch-popover__note {
          font-size: 0.72rem;
          color: #334155;
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          padding: 6px 8px;
          border-radius: 8px;
          line-height: 1.35;
        }
        .stitch-popover__btn {
          width: 100%;
          background: #1A2B21;
          color: #FFFFFF;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 8px;
          border-radius: 8px;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.2s;
        }
        .stitch-popover__btn:hover {
          background: #000000;
        }

        /* ─── Stitch Zoom & Reset Controls ─── */
        .stitch-map-controls {
          position: absolute;
          bottom: 16px;
          right: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 1000;
        }
        .stitch-ctrl-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #FFFFFF;
          color: #4A5568;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .stitch-ctrl-btn:hover {
          background: #F7FAFC;
          color: #1A2B21;
          transform: scale(1.05);
        }

        /* ─── Highlights Section & Spots Grid ─── */
        .highlights-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 10px;
        }
        .highlights-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 1px solid #E2E8F0;
          padding-bottom: 12px;
        }
        .highlights-title {
          font-family: var(--font-heading), sans-serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #1A2B21;
        }
        .highlights-count {
          font-size: 0.85rem;
          color: #718096;
          font-weight: 500;
        }

        .spots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }
        .spot-card {
          background: #FFFFFF;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #EDF2F7;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
          cursor: pointer;
        }
        .spot-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
          border-color: #CBD5E0;
        }
        .spot-card--selected {
          border-color: #1A2B21;
          box-shadow: 0 0 0 2px #1A2B21, 0 12px 28px rgba(26, 43, 33, 0.12);
        }
        .spot-card__img-wrap {
          position: relative;
          width: 100%;
          height: 190px;
        }
        .spot-card__img {
          transition: transform 0.4s ease;
        }
        .spot-card:hover .spot-card__img {
          transform: scale(1.04);
        }
        .spot-card__gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%);
        }
        .spot-card__badge {
          position: absolute;
          top: 12px;
          left: 12px;
          backdrop-filter: blur(4px);
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        .spot-card__warning-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .spot-card__active-flag {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: #1A2B21;
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .spot-card__body {
          padding: 18px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 10px;
        }
        .spot-card__area {
          font-size: 0.72rem;
          font-weight: 700;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .spot-card__title {
          font-family: var(--font-heading), sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #1A2B21;
          line-height: 1.3;
        }
        .spot-card__desc {
          font-size: 0.82rem;
          color: #4A5568;
          line-height: 1.5;
          flex: 1;
        }
        .spot-card__sergio-box {
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 0.78rem;
          color: #78350F;
          line-height: 1.4;
        }
        .spot-card__tip {
          font-size: 0.78rem;
          color: #4A5568;
          background: #F8FAFC;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
        }
        .spot-card__pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .pill--green { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
        .pill--orange { background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }
        .pill--purple { background: #F5F3FF; color: #5B21B6; border: 1px solid #DDD6FE; }
        .pill--blue { background: #EFF6FF; color: #1E40AF; border: 1px solid #BFDBFE; }

        .spot-card__actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
          padding-top: 10px;
          border-top: 1px solid #EDF2F7;
        }
        .spot-card__btn-view {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          border-radius: 8px;
          background: #F1F5F9;
          color: #1E293B;
          font-size: 0.78rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .spot-card__btn-view:hover {
          background: #E2E8F0;
        }
        .spot-card__btn-gmaps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          background: #1A2B21;
          color: #FFFFFF;
          font-size: 0.78rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.2s;
        }
        .spot-card__btn-gmaps:hover {
          background: #000000;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px dashed #CBD5E0;
          color: #718096;
        }
        .empty-state__btn {
          margin-top: 12px;
          padding: 8px 18px;
          border-radius: 8px;
          background: #1A2B21;
          color: white;
          font-size: 0.82rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
