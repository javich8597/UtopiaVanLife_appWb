import { SECOND_DRIVER_RATE_PER_DAY } from '@/lib/pricing/engine'

export interface CamperGalleryItem {
  src: string
  tag: string
}

export interface CamperCardSummarySpec {
  icon: string
  text: string
  wide?: boolean
}

export interface CamperCardPill {
  icon: string
  label: string
}

export interface CamperFeatureItem {
  icon: string
  label: string
  value: string
}

export interface CamperRentalConfig {
  basePricePerNight: number
  standardDepositAmount: number
  flexDepositAmount: number
  flexDepositRatePerDay: number
  secondDriverRatePerDay: number
  included: string[]
}

export interface CamperResolvedContent {
  slug: string
  name: string
  card: {
    tagline: string
    summarySpecs: CamperCardSummarySpec[]
    pills: CamperCardPill[]
    wizardHighlights: string[]
  }
  thumbnailUrl: string
  galleryImages: CamperGalleryItem[]
  cardImages: string[]
  descriptionParagraphs: string[]
  descriptionInlineImage: { src: string; alt: string }
  floorplanDay: string
  floorplanNight: string
  features: CamperFeatureItem[]
  technicalFeatures: CamperFeatureItem[]
  rental: CamperRentalConfig
  included: string[]
}

export const DEFAULT_STANDARD_DEPOSIT = 2000
export const DEFAULT_FLEX_DEPOSIT = 1000
export const DEFAULT_FLEX_DEPOSIT_RATE_PER_DAY = 10

interface CamperDefaultPreset {
  tagline: string
  pills: CamperCardPill[]
  wizardHighlights: string[]
  galleryImages: CamperGalleryItem[]
  description: string[]
  descriptionInlineImage: { src: string; alt: string }
  floorplanDay: string
  floorplanNight: string
  features: CamperFeatureItem[]
  technicalFeatures: CamperFeatureItem[]
  included: string[]
  defaultBedSummary: string
  defaultBasePrice: number
  defaultSeats: number
  defaultBeds: number
}

function buildDefaultIncludedItems(standardDeposit: number, flexDeposit: number): string[] {
  return [
    `Seguro a todo riesgo con asistencia en viaje (fianza de ${formatDepositEuros(standardDeposit)} o ${formatDepositEuros(flexDeposit)} con opción Flex)`,
    '150 km al día incluidos',
    'Asistencia telefónica durante el viaje (16 h)',
    'Almohadas, sábanas y toallas',
    'Menaje completo premium',
    'Dos sillas de camping para exterior',
    '2 máscaras de snorkel',
    'Set de limpieza',
    'Gastos de gestión',
  ]
}

export const CAMPER_DEFAULT_PRESETS: Record<string, CamperDefaultPreset> = {
  space: {
    tagline:
      'Más espacio, más comodidad y una experiencia pensada para viajar sin límites.',
    pills: [
      { icon: 'users', label: '2 Plazas viaje / 2 dormir' },
      { icon: 'bed', label: 'Cama elevable + interbanco' },
      { icon: 'droplets', label: 'Ducha interior + WC' },
      { icon: 'zap', label: 'Sistema eléctrico Pro 540Ah' },
    ],
    wizardHighlights: [
      'Cama elevable + cama interbanco (2 plazas)',
      'Máximo espacio interior diurno + Baño con WC y ducha',
      'Sistema eléctrico Pro 540Ah + A/C 12V Dometic',
    ],
    galleryImages: [
      { src: '/images/campers/space/exterior/space-vehicle-hero-lanzarote.webp', tag: 'Exterior SPACE' },
      { src: '/images/campers/space/interior/space-dining-lounge-frontview.jpg', tag: 'Salón comedor con luz natural' },
      { src: '/images/campers/space/interior/space-electric-drop-down-bed.jpg', tag: 'Cama eléctrica suspendida' },
      { src: '/images/campers/space/interior/space-cinema-projector-lounge.jpg', tag: 'Salón amplio SPACE' },
      { src: '/images/campers/space/interior/space-kitchen-counter-cabin.jpg', tag: 'Cocina equipada con nevera 86L y 2 fogones' },
      { src: '/images/campers/space/interior/space-bathroom-shower.webp', tag: 'Baño completo con ducha interior y WC' },
    ],
    description: [
      'Máximo confort en una camper. Gracias a su cama elevable, durante el día disfrutas de todo el espacio interior, como si estuvieras en una autocaravana… pero con la libertad de una camper. Menos maletero. Más calidad de vida en el día a día. Camper diseñada para dos personas, primando el máximo confort en todo momento.',
      'Más espacio. Más comodidad. Más libertad. La SPACE está diseñada para quienes quieren viajar sin renunciar a nada. Una camper amplia, equipada y preparada para convertir cualquier destino en tu propio lugar. Cocina completa, baño con ducha, climatización y un sistema eléctrico que te permite desconectar… sin dejar de tenerlo todo.',
      'Diseño en cada detalle: amplitud real con espacios abiertos que aportan libertad de movimiento; confort superior con cada zona pensada para disfrutar sin renunciar a nada; y funcionalidad total con todo organizado para un uso práctico y sencillo. Perfecta para viajes largos, rutas sin prisa y planes que simplemente surgen. Si la NEO es libertad, la SPACE es dar un paso más allá.',
      'El corazón de la camper incorpora el sistema electrónico más avanzado: dos baterías de litio (540Ah), doble placa solar monocristalina (400W), inversor Multiplus 2.000W Victron, centralita Cerbo GX, cargador de batería Orion XS 12/12-50A y regulador SmartSolar MPPT 100/30.',
    ],
    descriptionInlineImage: {
      src: '/images/campers/space/interior/space-lounge-spacious-daylight.jpg',
      alt: 'Salón panorámico SPACE con luz natural',
    },
    floorplanDay: '/images/campers/space/exterior/space-vehicle-dimensions-top.webp',
    floorplanNight: '/images/campers/space/exterior/space-vehicle-dimensions-side.webp',
    features: [
      { icon: 'users', label: 'Plazas de viaje', value: '2 personas homologadas' },
      { icon: 'bed', label: 'Plazas para dormir', value: '2 personas en máximo confort' },
      { icon: 'bed', label: 'Tipo de cama', value: 'Cama elevable + cama interbanco' },
      { icon: 'utensils', label: 'Cocina equipada', value: 'Nevera 86L y dos fogones a gas GLP' },
      { icon: 'droplets', label: 'Baño completo', value: 'Ducha interior, WC químico/portátil y ducha exterior' },
      { icon: 'snowflake', label: 'Aire acondicionado', value: '12 V Dometic integrado' },
      { icon: 'wind', label: 'Calefacción y aislamiento', value: 'Calefacción diésel y aislamiento completo 360º' },
      { icon: 'sun', label: 'Ventanas y luz', value: 'Claraboya panorámica, mosquiteras y oscurecedores' },
    ],
    technicalFeatures: [
      { icon: 'ruler', label: 'Longitud del vehículo', value: '5,99 m (Fiat Ducato · Mayor amplitud interior)' },
      { icon: 'gauge', label: 'Motor y cambio', value: 'Motor diésel 8L/100 km · Cambio manual 140 CV' },
      { icon: 'battery', label: 'Sistema eléctrico Pro', value: '2 baterías de litio (540Ah) + Centralita Cerbo GX' },
      { icon: 'sun', label: 'Placas solares', value: 'Doble placa solar monocristalina (400W) · SmartSolar MPPT 100/30' },
      { icon: 'zap', label: 'Inversor y cargador', value: 'Inversor Multiplus 2.000W Victron + Cargador Orion XS 12/12-50A' },
      { icon: 'droplets', label: 'Depósitos de agua', value: 'Aguas limpias 113L y aguas grises 90L' },
      { icon: 'thermometer', label: 'Gas GLP y seguridad', value: 'Gas GLP para cocina y agua caliente + alarma de gases' },
      { icon: 'shield', label: 'Seguridad en ruta', value: 'Rueda de repuesto y mini extintor' },
    ],
    included: buildDefaultIncludedItems(DEFAULT_STANDARD_DEPOSIT, DEFAULT_FLEX_DEPOSIT),
    defaultBedSummary: 'Elevable + interbanco',
    defaultBasePrice: 135,
    defaultSeats: 2,
    defaultBeds: 2,
  },
  neo: {
    tagline:
      'La camper perfecta para quienes buscan equilibrio entre confort, autonomía y libertad.',
    pills: [
      { icon: 'users', label: '3 Plazas viaje / 3 dormir' },
      { icon: 'bed', label: 'Cama doble fija + auxiliar' },
      { icon: 'droplets', label: 'Ducha interior + WC' },
      { icon: 'zap', label: 'Sistema eléctrico Pro 540Ah' },
    ],
    wizardHighlights: [
      'Cama doble fija + cama auxiliar (3 plazas)',
      'Gran maletero + Baño con WC y ducha',
      'Sistema eléctrico Pro 540Ah + A/C 12V Dometic',
    ],
    galleryImages: [
      { src: '/images/campers/neo/exterior/neo-exterior-front-three-quarter.jpg', tag: 'Exterior NEO' },
      { src: '/images/campers/neo/interior/neo-dining-room-daylight.jpg', tag: 'Salón comedor NEO' },
      { src: '/images/campers/neo/interior/neo-interior-hero-anthracite.webp', tag: 'Interior NEO' },
      { src: '/images/campers/neo/details/neo-garage-bike-storage.jpg', tag: 'Gran maletero trasero' },
      { src: '/images/campers/neo/details/solar-tech.webp', tag: 'Doble placa solar 400W' },
      { src: '/images/campers/neo/interior/neo-bathroom-shower.webp', tag: 'Baño completo con ducha interior y WC' },
    ],
    description: [
      'No es sólo una camper. La NEO ofrece más espacio, más capacidad y más libertad, gracias a su gran maletero, ideal para llevar todo lo que forma parte de tu aventura: desde equipo deportivo hasta escapadas más largas sin renunciar a nada. Equipada con uno de los sistemas eléctricos más top del mercado para ofrecer autonomía real. Camper ideal para dos personas, que se adapta de forma perfecta para 3.',
      'La NEO no es solo una camper. Es libertad. Diseñada para viajar sin depender de nada ni de nadie, combina autonomía total, confort y un equipamiento que marca la diferencia desde el primer kilómetro. Sistema eléctrico completo, aire acondicionado, baño con ducha interior, cocina equipada y una distribución pensada para disfrutar de verdad cada viaje.',
      'Diseño en cada detalle: materiales de calidad resistentes a los golpes, a las manchas y a las humedades; uso del espacio con una distribución interior compensada para sacar el máximo partido; y máximo confort en cada estancia preparada para que puedas disfrutar de la máxima comodidad.',
      'El corazón de la camper incorpora el sistema electrónico PRO más avanzado: dos baterías de litio (540Ah), doble placa solar monocristalina (400W), inversor Multiplus 2.000W Victron, centralita Cerbo GX, cargador de batería Orion XS 12/12-50A y regulador SmartSolar MPPT 100/30. Compacta, potente y preparada para cualquier plan. Sube, arranca… y olvídate de todo lo demás.',
    ],
    descriptionInlineImage: {
      src: '/images/campers/neo/details/neo-garage-bike-storage.jpg',
      alt: 'Gran maletero trasero NEO para equipamiento deportivo',
    },
    floorplanDay: '/images/campers/neo/blueprints/day-layout.webp',
    floorplanNight: '/images/campers/neo/blueprints/night-layout.webp',
    features: [
      { icon: 'users', label: 'Plazas de viaje', value: '3 personas homologadas' },
      { icon: 'bed', label: 'Plazas para dormir', value: '3 personas (ideal para 2, adaptable a 3)' },
      { icon: 'bed', label: 'Tipo de cama', value: 'Cama doble fija + cama auxiliar (interbanco)' },
      { icon: 'utensils', label: 'Cocina equipada', value: 'Nevera 86L y dos fogones a gas GLP' },
      { icon: 'droplets', label: 'Baño completo', value: 'Ducha interior, WC químico y ducha exterior' },
      { icon: 'snowflake', label: 'Aire acondicionado', value: '12 V Dometic integrado' },
      { icon: 'wind', label: 'Calefacción y aislamiento', value: 'Calefacción diésel y aislamiento completo 360º' },
      { icon: 'sun', label: 'Ventanas y luz', value: 'Claraboya panorámica, mosquiteras y oscurecedores' },
    ],
    technicalFeatures: [
      { icon: 'ruler', label: 'Longitud del vehículo', value: '5,99 m (Fiat Ducato · Gran maletero 2.230L)' },
      { icon: 'gauge', label: 'Motor y cambio', value: 'Motor diésel 8L/100 km · Cambio manual 140 CV' },
      { icon: 'battery', label: 'Sistema eléctrico Pro', value: '2 baterías de litio (540Ah) + Centralita Cerbo GX' },
      { icon: 'sun', label: 'Placas solares', value: 'Doble placa solar monocristalina (400W) · SmartSolar MPPT 100/30' },
      { icon: 'zap', label: 'Inversor y cargador', value: 'Inversor Multiplus 2.000W Victron + Cargador Orion XS 12/12-50A' },
      { icon: 'droplets', label: 'Depósitos de agua', value: 'Aguas limpias 113L y aguas grises 90L' },
      { icon: 'thermometer', label: 'Gas GLP y seguridad', value: 'Gas GLP para cocina y agua caliente + alarma de gases' },
      { icon: 'shield', label: 'Seguridad en ruta', value: 'Rueda de repuesto y mini extintor' },
    ],
    included: buildDefaultIncludedItems(DEFAULT_STANDARD_DEPOSIT, DEFAULT_FLEX_DEPOSIT),
    defaultBedSummary: 'Doble fija + auxiliar',
    defaultBasePrice: 110,
    defaultSeats: 3,
    defaultBeds: 3,
  },
}

const GENERIC_PRESET: CamperDefaultPreset = {
  ...CAMPER_DEFAULT_PRESETS.neo,
  tagline: 'Camper de lujo totalmente equipada para recorrer Mallorca con total autonomía.',
  defaultBedSummary: 'Doble confort',
  defaultBasePrice: 120,
  defaultSeats: 2,
  defaultBeds: 2,
}

function getPreset(slug?: string | null): CamperDefaultPreset {
  const key = (slug || '').toLowerCase()
  return CAMPER_DEFAULT_PRESETS[key] || GENERIC_PRESET
}

function asNonEmptyNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed
  }
  return undefined
}

export function formatDepositEuros(amount: number): string {
  const num = Number(amount) || 0
  return `${new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
    useGrouping: 'always' as any,
  }).format(num)} €`
}

/**
 * Resuelve la configuración de tarifas y fianza de una camper.
 * Si el admin aún no ha guardado `specs.rental`, respeta la convención actual
 * (2.000 € estándar, 1.000 € flex a +10 €/día, 2º conductor +5 €/día) sin que
 * el valor heredado `deposit_amount = 1000` de la semilla inicial rompa la fianza Estándar.
 */
export function resolveCamperRentalConfig(camper: any): CamperRentalConfig {
  const slug = String(camper?.slug || '').toLowerCase()
  const preset = getPreset(slug)
  const specs = (camper?.specs && typeof camper.specs === 'object') ? camper.specs : {}
  const rental = (specs?.rental && typeof specs.rental === 'object') ? specs.rental : {}

  const basePricePerNight =
    asNonEmptyNumber(camper?.base_price_per_night) ??
    asNonEmptyNumber(camper?.price_per_night) ??
    asNonEmptyNumber(camper?.pricePerNight) ??
    preset.defaultBasePrice

  const explicitStandard = asNonEmptyNumber(rental.standard_deposit_amount)
  const rawDepositCol = asNonEmptyNumber(camper?.deposit_amount)
  const standardDepositAmount =
    explicitStandard !== undefined
      ? explicitStandard
      : (rawDepositCol !== undefined && rawDepositCol !== 1000
        ? rawDepositCol
        : DEFAULT_STANDARD_DEPOSIT)

  const flexDepositAmount =
    asNonEmptyNumber(rental.flex_deposit_amount) ?? DEFAULT_FLEX_DEPOSIT

  const flexDepositRatePerDay =
    asNonEmptyNumber(rental.flex_deposit_rate_per_day) ?? DEFAULT_FLEX_DEPOSIT_RATE_PER_DAY

  const secondDriverRatePerDay =
    asNonEmptyNumber(rental.second_driver_rate_per_day) ?? SECOND_DRIVER_RATE_PER_DAY

  const included =
    Array.isArray(rental.included) && rental.included.length > 0
      ? rental.included.filter((i: unknown): i is string => typeof i === 'string' && i.trim().length > 0)
      : buildDefaultIncludedItems(standardDepositAmount, flexDepositAmount)

  return {
    basePricePerNight,
    standardDepositAmount,
    flexDepositAmount,
    flexDepositRatePerDay,
    secondDriverRatePerDay,
    included,
  }
}

export function buildDefaultSummarySpecs(camper: any): CamperCardSummarySpec[] {
  const slug = String(camper?.slug || '').toLowerCase()
  const preset = getPreset(slug)
  const specs = (camper?.specs && typeof camper.specs === 'object') ? camper.specs : {}

  const seats = asNonEmptyNumber(specs.seats) ?? preset.defaultSeats
  const beds = asNonEmptyNumber(specs.beds) ?? preset.defaultBeds
  const lengthM = asNonEmptyNumber(specs.length_m) ?? 5.99
  const formattedLength = `${String(lengthM).replace('.', ',')} m`
  const solarW = asNonEmptyNumber(specs.solar_w) ?? 400
  const batteryAh = asNonEmptyNumber(specs.battery_ah ?? specs.lithium_ah) ?? 540

  return [
    { icon: 'bus', text: `Plazas de viaje: ${seats}` },
    { icon: 'moon', text: `Plazas para dormir: ${beds}` },
    { icon: 'utensils', text: 'Cocina + nevera 86L' },
    { icon: 'shower', text: 'WC químico y ducha' },
    { icon: 'ruler', text: formattedLength },
    { icon: 'bed', text: preset.defaultBedSummary },
    {
      icon: 'battery',
      text: `Gran autonomía: baterías ${batteryAh}Ah y placas solares ${solarW}W`,
      wide: true,
    },
  ]
}

export function splitDescriptionParagraphs(text?: string | null): string[] {
  if (typeof text !== 'string') return []
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
}

export function resolveCamperContent(camper: any): CamperResolvedContent {
  const slug = String(camper?.slug || 'neo').toLowerCase()
  const name = String(camper?.name || slug.toUpperCase())
  const preset = getPreset(slug)
  const specs = (camper?.specs && typeof camper.specs === 'object') ? camper.specs : {}
  const card = (specs?.card && typeof specs.card === 'object') ? specs.card : {}

  const seats = asNonEmptyNumber(specs.seats) ?? preset.defaultSeats
  const beds = asNonEmptyNumber(specs.beds) ?? preset.defaultBeds

  // 1. Tagline & Tarjeta resumen
  const dbDescriptionParagraphs = splitDescriptionParagraphs(camper?.description_es)
  const explicitParagraphs =
    Array.isArray(specs.description_paragraphs) && specs.description_paragraphs.length > 0
      ? specs.description_paragraphs.filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0)
      : null

  const descriptionParagraphs =
    explicitParagraphs && explicitParagraphs.length > 0
      ? explicitParagraphs
      : (dbDescriptionParagraphs.length > 0 ? dbDescriptionParagraphs : preset.description)

  const customTagline =
    typeof card.tagline === 'string' && card.tagline.trim()
      ? card.tagline.trim()
      : (typeof specs.tagline === 'string' && specs.tagline.trim() ? specs.tagline.trim() : null)

  const tagline =
    customTagline ??
    (CAMPER_DEFAULT_PRESETS[slug]
      ? preset.tagline
      : (descriptionParagraphs[0]
        ? (descriptionParagraphs[0].length > 140
          ? `${descriptionParagraphs[0].slice(0, 137)}...`
          : descriptionParagraphs[0])
        : preset.tagline))

  const summarySpecs: CamperCardSummarySpec[] =
    Array.isArray(card.summarySpecs) && card.summarySpecs.length > 0
      ? card.summarySpecs
        .filter((s: any) => s && typeof s.text === 'string' && s.text.trim())
        .map((s: any) => ({
          icon: String(s.icon || 'zap'),
          text: String(s.text),
          wide: Boolean(s.wide),
        }))
      : buildDefaultSummarySpecs(camper)

  const pills: CamperCardPill[] =
    Array.isArray(card.pills) && card.pills.length > 0
      ? card.pills
        .filter((p: any) => p && typeof p.label === 'string' && p.label.trim())
        .map((p: any) => ({ icon: String(p.icon || 'zap'), label: String(p.label) }))
      : (CAMPER_DEFAULT_PRESETS[slug]
        ? preset.pills.map((pill, i) => {
          if (i === 0) return { ...pill, label: `${seats} Plazas viaje / ${beds} dormir` }
          return pill
        })
        : [
          { icon: 'users', label: `${seats} Plazas viaje / ${beds} dormir` },
          { icon: 'bed', label: 'Cama doble confort' },
          { icon: 'droplets', label: 'Ducha interior + WC' },
          { icon: 'zap', label: `Sistema eléctrico ${specs.battery_ah || 540}Ah` },
        ])

  const wizardHighlights: string[] =
    Array.isArray(card.wizardHighlights) && card.wizardHighlights.length > 0
      ? card.wizardHighlights.filter((h: unknown): h is string => typeof h === 'string' && h.trim().length > 0)
      : preset.wizardHighlights

  // 2. Fotos y galería
  const explicitGallery: CamperGalleryItem[] | null =
    Array.isArray(specs.gallery_items) && specs.gallery_items.length > 0
      ? specs.gallery_items
        .filter((g: any) => g && typeof g.src === 'string' && g.src.trim())
        .map((g: any, idx: number) => ({
          src: String(g.src).trim(),
          tag: String(g.tag || `${name} — Foto ${idx + 1}`),
        }))
      : null

  const dbImages: string[] = Array.isArray(camper?.images)
    ? camper.images.filter((src: unknown): src is string => typeof src === 'string' && src.trim().length > 0)
    : []

  const rawThumbnail = typeof camper?.thumbnail_url === 'string' && camper.thumbnail_url.trim()
    ? camper.thumbnail_url.trim()
    : ''

  let galleryImages: CamperGalleryItem[]
  if (explicitGallery) {
    galleryImages = explicitGallery
  } else if (dbImages.length >= 3 || (!CAMPER_DEFAULT_PRESETS[slug] && dbImages.length > 0)) {
    galleryImages = dbImages.map((src, idx) => ({
      src,
      tag: `${name} — Foto ${idx + 1}`,
    }))
  } else {
    // Filas heredadas de seed con 2 fotos: conservar la portada/fotos de BD y completar con la galería curada
    const seen = new Set<string>()
    const merged: CamperGalleryItem[] = []
    const pushItem = (src: string, tag: string) => {
      if (!src || seen.has(src)) return
      seen.add(src)
      merged.push({ src, tag })
    }
    if (rawThumbnail) pushItem(rawThumbnail, `${name} — Portada`)
    dbImages.forEach((src, i) => pushItem(src, `${name} — Vista ${i + 1}`))
    preset.galleryImages.forEach(item => pushItem(item.src, item.tag))
    galleryImages = merged
  }

  const thumbnailUrl = rawThumbnail || galleryImages[0]?.src || preset.galleryImages[0]?.src || '/images/campers/neo/neo-ext.png'

  // Para la CamperCard: si hay portada definida va primero, seguida del resto de fotos únicas
  const cardImagesSet = new Set<string>()
  const cardImages: string[] = []
  const addCardImg = (src?: string) => {
    if (src && !cardImagesSet.has(src)) {
      cardImagesSet.add(src)
      cardImages.push(src)
    }
  }
  addCardImg(thumbnailUrl)
  if (explicitGallery) {
    explicitGallery.forEach(item => addCardImg(item.src))
  } else if (dbImages.length > 0) {
    dbImages.forEach(src => addCardImg(src))
    if (CAMPER_DEFAULT_PRESETS[slug] && cardImages.length < 4) {
      preset.galleryImages.forEach(item => addCardImg(item.src))
    }
  } else {
    preset.galleryImages.forEach(item => addCardImg(item.src))
  }

  const descriptionInlineImage =
    specs.description_inline_image && typeof specs.description_inline_image.src === 'string' && specs.description_inline_image.src.trim()
      ? {
        src: String(specs.description_inline_image.src).trim(),
        alt: String(specs.description_inline_image.alt || `Interior ${name}`),
      }
      : preset.descriptionInlineImage

  const floorplanDay =
    typeof specs.floorplan_day === 'string' && specs.floorplan_day.trim()
      ? specs.floorplan_day.trim()
      : preset.floorplanDay

  const floorplanNight =
    typeof specs.floorplan_night === 'string' && specs.floorplan_night.trim()
      ? specs.floorplan_night.trim()
      : preset.floorplanNight

  // 3. Características / Equipamiento
  const features: CamperFeatureItem[] =
    Array.isArray(specs.features) && specs.features.length > 0
      ? specs.features
        .filter((f: any) => f && typeof f.label === 'string' && f.label.trim())
        .map((f: any) => ({
          icon: String(f.icon || 'zap'),
          label: String(f.label),
          value: String(f.value || ''),
        }))
      : preset.features.map(f => {
        if (f.label === 'Plazas de viaje' && asNonEmptyNumber(specs.seats)) {
          return { ...f, value: `${seats} personas homologadas` }
        }
        if (f.label === 'Plazas para dormir' && asNonEmptyNumber(specs.beds)) {
          return { ...f, value: `${beds} personas` }
        }
        if (f.label === 'Aire acondicionado' && typeof specs.ac === 'string' && specs.ac.trim()) {
          return { ...f, value: specs.ac.trim() }
        }
        return f
      })

  // 4. Características Técnicas
  const technicalFeatures: CamperFeatureItem[] =
    Array.isArray(specs.technical_features) && specs.technical_features.length > 0
      ? specs.technical_features
        .filter((f: any) => f && typeof f.label === 'string' && f.label.trim())
        .map((f: any) => ({
          icon: String(f.icon || 'gauge'),
          label: String(f.label),
          value: String(f.value || ''),
        }))
      : preset.technicalFeatures.map(f => {
        if (f.label === 'Longitud del vehículo' && asNonEmptyNumber(specs.length_m)) {
          const len = `${String(specs.length_m).replace('.', ',')} m`
          const baseV = typeof specs.base_vehicle === 'string' && specs.base_vehicle.trim() ? specs.base_vehicle.trim() : 'Fiat Ducato'
          return { ...f, value: `${len} (${baseV})` }
        }
        if (f.label === 'Motor y cambio' && (specs.engine || specs.transmission)) {
          return {
            ...f,
            value: [specs.engine, specs.transmission].filter(Boolean).join(' · ') || f.value,
          }
        }
        if (f.label === 'Depósitos de agua' && (asNonEmptyNumber(specs.fresh_water_l) || asNonEmptyNumber(specs.grey_water_l))) {
          const fresh = asNonEmptyNumber(specs.fresh_water_l) ?? 113
          const grey = asNonEmptyNumber(specs.grey_water_l) ?? 90
          return { ...f, value: `Aguas limpias ${fresh}L y aguas grises ${grey}L` }
        }
        return f
      })

  // 5. Alquiler
  const rental = resolveCamperRentalConfig(camper)

  return {
    slug,
    name,
    card: {
      tagline,
      summarySpecs,
      pills,
      wizardHighlights,
    },
    thumbnailUrl,
    galleryImages,
    cardImages,
    descriptionParagraphs,
    descriptionInlineImage,
    floorplanDay,
    floorplanNight,
    features,
    technicalFeatures,
    rental,
    included: rental.included,
  }
}
