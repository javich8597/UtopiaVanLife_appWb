/**
 * Guía de Mallorca del panel de cliente.
 *
 * Coordenadas comprobadas en OpenStreetMap / Wikipedia (octubre 2026).
 * Fotos de Wikimedia Commons con su autor y licencia (se muestran como crédito).
 * Normativa revisada en octubre 2026: repasar cada temporada (Formentor cambia de fechas cada año).
 */

export type SpotCategory = 'calas' | 'miradores' | 'pueblos' | 'dormir'

export interface GuideSpot {
  id: string
  name: string
  category: SpotCategory
  area: string
  lat: number
  lng: number
  /** Qué es y por qué merece la pena, en una o dos frases */
  summary: string
  /** Consejo práctico para llegar y aparcar con la camper */
  camperTip: string
  /** Aviso importante (restricciones, accesos), si lo hay */
  warning?: string
  /** Si hay que aparcar lejos del lugar, a dónde navegar con la camper */
  parking?: { lat: number; lng: number }
  /** Etiquetas cortas de servicios o características */
  tags?: string[]
  image: string
  credit?: { author: string; license: string; source: string }
}

export const CATEGORY_LABELS: Record<SpotCategory, string> = {
  calas: 'Calas y playas',
  miradores: 'Miradores',
  pueblos: 'Pueblos',
  dormir: 'Dormir y servicios',
}

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`

export const GUIDE_SPOTS: GuideSpot[] = [
  // ── Calas y playas ──
  {
    id: 'calo-des-moro',
    name: 'Caló des Moro',
    category: 'calas',
    area: 'Santanyí',
    lat: 39.3137,
    lng: 3.1216,
    summary: 'Una de las calas más fotografiadas de la isla: agua turquesa entre paredes de roca y pinos. Es pequeña y en verano se llena muy pronto.',
    camperTip: 'Deja la camper en el aparcamiento gratuito de s’Almunia y Cala Llombards y camina unos 20 minutos. Cerca de la cala no se puede aparcar y se multa.',
    parking: { lat: 39.3210, lng: 3.1264 },
    tags: ['Sin servicios', 'Llega a pie'],
    image: '/images/guia/calo-des-moro.jpg',
    credit: { author: 'Tommie Hansen', license: 'CC BY 2.0', source: commons('View of the bay at Calo des Moro, Mallorca (Spain) (23899506181).jpg') },
  },
  {
    id: 'cala-llombards',
    name: 'Cala Llombards',
    category: 'calas',
    area: 'Santanyí',
    lat: 39.3238,
    lng: 3.1389,
    summary: 'Cala de arena blanca con casetas de pescadores y agua tranquila, más amplia y familiar que su vecina Caló des Moro.',
    camperTip: 'Usa el mismo aparcamiento grande de s’Almunia y Cala Llombards; las calles junto a la playa son estrechas y con plazas limitadas.',
    parking: { lat: 39.3210, lng: 3.1264 },
    tags: ['Arena', 'Casetas de pescadores'],
    image: '/images/guia/cala-llombards.jpg',
    credit: { author: 'Olaf Tausch', license: 'CC BY 3.0', source: commons('Cala Llombards 04.jpg') },
  },
  {
    id: 'cala-mondrago',
    name: 'Cala Mondragó',
    category: 'calas',
    area: 'Parc Natural de Mondragó, Santanyí',
    lat: 39.3522,
    lng: 3.1883,
    summary: 'Dos playas dentro de un parque natural, rodeadas de pinar, con caminos para pasear entre calas.',
    camperTip: 'Hay dos aparcamientos de pago: S’Amarador y Ses Fonts de n’Alis. Llega antes de las 10 en temporada alta.',
    tags: ['Parque natural', 'Parking de pago'],
    image: '/images/guia/cala-mondrago.jpg',
    credit: { author: 'Kawamondrago', license: 'CC BY-SA 3.0', source: commons('Mondragó in 4.JPG') },
  },
  {
    id: 'es-trenc',
    name: 'Es Trenc',
    category: 'calas',
    area: 'Campos',
    lat: 39.3405,
    lng: 2.9951,
    summary: 'Varios kilómetros de arena fina y dunas sin edificios. La playa larga más natural de Mallorca.',
    camperTip: 'Aparca en los aparcamientos de pago señalizados. Las dunas están protegidas: no se puede pisar ni aparcar fuera de las zonas marcadas.',
    tags: ['Playa larga', 'Parking de pago'],
    image: '/images/guia/es-trenc.jpg',
    credit: { author: 'Yaroslav Syubayev', license: 'CC BY-SA 4.0', source: commons('Es Trenc Winter.jpg') },
  },
  {
    id: 'cala-varques',
    name: 'Cala Varques',
    category: 'calas',
    area: 'Manacor',
    lat: 39.4999,
    lng: 3.2960,
    summary: 'Cala virgen sin edificios ni servicios, con cuevas y un arco de roca natural en los acantilados cercanos.',
    camperTip: 'No hay carretera hasta la cala. Se aparca junto a la carretera de acceso y se sigue un camino de tierra de unos 20 minutos.',
    tags: ['Virgen', 'Sin servicios', 'Llega a pie'],
    image: '/images/guia/cala-varques.jpg',
    credit: { author: 'Olaf Tausch', license: 'CC BY 3.0', source: commons('Cala Varques 29.jpg') },
  },
  {
    id: 'cala-agulla',
    name: 'Cala Agulla',
    category: 'calas',
    area: 'Capdepera',
    lat: 39.7227,
    lng: 3.4522,
    summary: 'Playa amplia de arena con dunas y pinar junto a Cala Rajada. Desde aquí salen senderos a calas más escondidas.',
    camperTip: 'Aparcamiento grande de pago junto a la playa, cómodo para campers.',
    tags: ['Arena', 'Servicios', 'Parking de pago'],
    image: '/images/guia/cala-agulla.jpg',
    credit: { author: 'Olaf Tausch', license: 'CC BY-SA 3.0', source: commons('Cala Agulla 01.jpg') },
  },
  {
    id: 'platja-formentor',
    name: 'Platja de Formentor',
    category: 'calas',
    area: 'Pollença',
    lat: 39.9270,
    lng: 3.1422,
    summary: 'Playa de agua muy clara bajo un pinar, en la península de Formentor.',
    camperTip: 'Fuera del horario restringido se llega por la Ma-2210, una carretera estrecha y con curvas. Si vas en temporada, entra antes de las 10 o usa el bus desde el Port de Pollença.',
    warning: 'Del 15 de mayo al 18 de octubre de 2026 no se puede circular en vehículo privado por la carretera de Formentor de 10:00 a 22:00.',
    tags: ['Acceso restringido en temporada'],
    image: '/images/guia/platja-formentor.jpg',
    credit: { author: 'HejaSverige!', license: 'CC BY-SA 3.0', source: commons('Platja de Formentor.JPG') },
  },
  {
    id: 'cala-sant-vicenc',
    name: 'Cala Sant Vicenç',
    category: 'calas',
    area: 'Pollença',
    lat: 39.9208,
    lng: 3.0560,
    summary: 'Pequeño pueblo con cuatro calas de agua transparente a los pies de los acantilados del Cavall Bernat.',
    camperTip: 'Las plazas cerca del agua son pocas. Aparca en la entrada del pueblo y baja andando.',
    tags: ['Cuatro calas', 'Servicios'],
    image: '/images/guia/cala-sant-vicenc.jpg',
    credit: { author: 'Silar', license: 'CC BY-SA 4.0', source: commons('02017 0139 Cala Sant Vicenç, Majorca.jpg') },
  },
  {
    id: 'cala-tuent',
    name: 'Cala Tuent',
    category: 'calas',
    area: 'Escorca',
    lat: 39.8401,
    lng: 2.7760,
    summary: 'Cala tranquila de canto rodado y arena en plena Serra de Tramuntana, con el Puig Major de fondo.',
    camperTip: 'Se llega por un desvío de la carretera de Sa Calobra: estrecho y con muchas curvas. Ve sin prisa y con el depósito lleno.',
    tags: ['Tranquila', 'Carretera de montaña'],
    image: '/images/guia/cala-tuent.jpg',
    credit: { author: 'Olaf Tausch', license: 'CC BY 3.0', source: commons('Cala Tuent 13.JPG') },
  },
  {
    id: 'portals-vells',
    name: 'Portals Vells',
    category: 'calas',
    area: 'Calvià',
    lat: 39.4723,
    lng: 2.5202,
    summary: 'Cala resguardada entre pinos con una antigua cueva-cantera excavada en la roca, a media hora de Palma.',
    camperTip: 'Hay aparcamiento junto a la cala, pequeño y que se llena en verano. Llega temprano.',
    tags: ['Cerca de Palma'],
    image: '/images/guia/portals-vells.jpg',
    credit: { author: 'Autor desconocido', license: 'CC BY-SA 3.0', source: commons('Portals vells 01.jpg') },
  },

  // ── Miradores ──
  {
    id: 'sa-calobra',
    name: 'Sa Calobra y Torrent de Pareis',
    category: 'miradores',
    area: 'Escorca',
    lat: 39.8522,
    lng: 2.8058,
    summary: 'La desembocadura del Torrent de Pareis entre paredes de roca de cientos de metros. La carretera de bajada, con el famoso Nus de sa Corbata, es un espectáculo.',
    camperTip: 'La Ma-2141 tiene curvas muy cerradas y mucho tráfico de autobuses y ciclistas. Baja a primera hora y aparca en el parking de pago del final.',
    warning: 'Carretera exigente: solo si te sientes cómodo conduciendo la camper en curvas de montaña.',
    tags: ['Parking de pago', 'Carretera de montaña'],
    image: '/images/guia/sa-calobra.jpg',
    credit: { author: 'Olaf Tausch', license: 'CC BY-SA 3.0', source: commons('Torrent de Pareis 07a.jpg') },
  },
  {
    id: 'mirador-colomer',
    name: 'Mirador d’es Colomer',
    category: 'miradores',
    area: 'Formentor, Pollença',
    lat: 39.9310,
    lng: 3.1124,
    summary: 'La vista clásica de los acantilados de Formentor y el islote del Colomer. Imprescindible al amanecer.',
    camperTip: 'El aparcamiento es pequeño. En temporada, ve antes de las 10 o sube en el bus que sale del Port de Pollença.',
    warning: 'Del 15 de mayo al 18 de octubre de 2026 no se puede circular en vehículo privado por la carretera de Formentor de 10:00 a 22:00.',
    tags: ['Amanecer', 'Acceso restringido en temporada'],
    image: '/images/guia/mirador-colomer.jpg',
    credit: { author: 'pjt56', license: 'CC BY-SA 3.0', source: commons('CapFormentor-pjt2.jpg') },
  },
  {
    id: 'sa-foradada',
    name: 'Sa Foradada (Son Marroig)',
    category: 'miradores',
    area: 'Deià',
    lat: 39.7511,
    lng: 2.6290,
    summary: 'La roca agujereada que entra en el mar, vista desde la finca del Archiduque Luis Salvador. Uno de los mejores atardeceres de la isla.',
    camperTip: 'Aparca en el apartadero de la Ma-10 junto a Son Marroig. No bajes con la camper por el camino hacia la península.',
    parking: { lat: 39.7511, lng: 2.6300 },
    tags: ['Atardecer'],
    image: '/images/guia/sa-foradada.jpg',
    credit: { author: 'Antoni Sureda', license: 'CC BY-SA 3.0', source: commons('NaForadada.jpg') },
  },
  {
    id: 'mirador-ses-animes',
    name: 'Mirador de ses Ànimes',
    category: 'miradores',
    area: 'Banyalbufar',
    lat: 39.6837,
    lng: 2.5000,
    summary: 'La Torre del Verger, una atalaya del siglo XVI colgada sobre el mar, con vistas a toda la costa de Tramuntana.',
    camperTip: 'Está junto a la Ma-10 entre Banyalbufar y Estellencs. El aparcamiento es pequeño: para un rato y continúa.',
    tags: ['Atardecer', 'Parada corta'],
    image: '/images/guia/mirador-ses-animes.jpg',
    credit: { author: 'Antonio De Lorenzo', license: 'CC BY 2.5', source: commons('Torre Verger Banyalbufar 4.JPG') },
  },
  {
    id: 'far-ses-salines',
    name: 'Far de ses Salines',
    category: 'miradores',
    area: 'Ses Salines',
    lat: 39.2652,
    lng: 3.0534,
    summary: 'El extremo sur de Mallorca. Desde el faro sale un paseo junto al mar hasta playas vírgenes de arena blanca.',
    camperTip: 'Hay poco sitio para aparcar junto al faro; si está lleno, deja la camper algo antes, en un lugar permitido.',
    tags: ['Paseo costero'],
    image: '/images/guia/far-ses-salines.jpg',
    credit: { author: 'Olaf Tausch', license: 'CC BY-SA 3.0', source: commons('Far des Cap Salines 02.jpg') },
  },

  // ── Pueblos ──
  {
    id: 'valldemossa',
    name: 'Valldemossa',
    category: 'pueblos',
    area: 'Serra de Tramuntana',
    lat: 39.7117,
    lng: 2.6226,
    summary: 'Pueblo de piedra y calles con flores, famoso por la Cartuja donde vivieron Chopin y George Sand.',
    camperTip: 'No entres en el casco antiguo. Usa los aparcamientos de pago de la entrada del pueblo.',
    tags: ['Cartuja', 'Parking de pago'],
    image: '/images/guia/valldemossa.jpg',
    credit: { author: 'Abrget47j', license: 'CC BY-SA 3.0', source: commons('Valdemosa, en Baleares (España).jpg') },
  },
  {
    id: 'deia',
    name: 'Deià',
    category: 'pueblos',
    area: 'Serra de Tramuntana',
    lat: 39.7500,
    lng: 2.6331,
    summary: 'Casas de piedra escalonadas sobre una colina frente al mar. Aquí vivió el escritor Robert Graves.',
    camperTip: 'Aparcar es muy complicado. Si no encuentras sitio en la entrada, verlo desde la carretera y seguir es mejor plan.',
    tags: ['Aparcamiento escaso'],
    image: '/images/guia/deia.jpg',
    credit: { author: 'Fr. Diana Korn', license: 'CC BY-SA 4.0', source: commons('Deyá, en Baleares (España).jpg') },
  },
  {
    id: 'fornalutx',
    name: 'Fornalutx',
    category: 'pueblos',
    area: 'Serra de Tramuntana',
    lat: 39.7827,
    lng: 2.7409,
    summary: 'Pequeño pueblo de montaña entre naranjos, considerado uno de los más bonitos de España.',
    camperTip: 'Las calles son muy estrechas y empinadas. Aparca en la entrada y sube andando.',
    tags: ['Calles estrechas'],
    image: '/images/guia/fornalutx.jpg',
    credit: { author: 'Paucabot', license: 'CC BY-SA 3.0', source: commons('Fornalutx-cropped.jpeg') },
  },
  {
    id: 'port-soller',
    name: 'Port de Sóller',
    category: 'pueblos',
    area: 'Sóller',
    lat: 39.7986,
    lng: 2.6936,
    summary: 'Bahía redonda rodeada de montañas, con paseo marítimo y el tranvía de madera que sube a Sóller.',
    camperTip: 'Hay aparcamientos grandes a la entrada del puerto. Deja la camper ahí y muévete a pie o en tranvía.',
    tags: ['Tranvía', 'Servicios'],
    image: '/images/guia/port-soller.jpg',
    credit: { author: 'BuzzWoof', license: 'Dominio público', source: commons('Port de Sóller.JPG') },
  },
  {
    id: 'santuari-lluc',
    name: 'Santuari de Lluc',
    category: 'pueblos',
    area: 'Escorca',
    lat: 39.8229,
    lng: 2.8844,
    summary: 'Monasterio en el corazón de la Serra de Tramuntana, punto de partida de excursiones y casa de la Escolania dels Blauets.',
    camperTip: 'Tiene aparcamiento de pago amplio. La carretera de subida (Ma-10) es de montaña: conduce con calma.',
    tags: ['Excursiones', 'Parking de pago'],
    image: '/images/guia/santuari-lluc.jpg',
    credit: { author: 'H. Zell', license: 'CC BY-SA 3.0', source: commons('Santuari de Lluc - View from Monte del Rosario.jpg') },
  },
  {
    id: 'arta',
    name: 'Artà',
    category: 'pueblos',
    area: 'Llevant',
    lat: 39.6952,
    lng: 3.3512,
    summary: 'Pueblo señorial coronado por el santuario amurallado de Sant Salvador, con vistas a toda la bahía.',
    camperTip: 'Aparca en las afueras y sube andando por las escaleras hasta Sant Salvador.',
    tags: ['Vistas'],
    image: '/images/guia/arta.jpg',
    credit: { author: 'Olaf Tausch', license: 'CC BY 3.0', source: commons('Artá, en Baleares (España).jpg') },
  },
  {
    id: 'alcudia',
    name: 'Alcúdia',
    category: 'pueblos',
    area: 'Norte',
    lat: 39.8525,
    lng: 3.1192,
    summary: 'Ciudad amurallada medieval junto a las ruinas de Pollentia, la ciudad romana más importante de la isla.',
    camperTip: 'Aparca fuera de las murallas; el casco antiguo es peatonal en gran parte.',
    tags: ['Historia'],
    image: '/images/guia/alcudia.jpg',
    credit: { author: 'Antonio De Lorenzo', license: 'CC BY 2.5', source: commons('Alcudia, en Mallorca (Baleares, España).jpg') },
  },
  {
    id: 'catedral-palma',
    name: 'Palma y la Catedral',
    category: 'pueblos',
    area: 'Palma',
    lat: 39.5675,
    lng: 2.6481,
    summary: 'La Seu, la catedral gótica frente al mar, y el casco antiguo de Palma para un día de paseo.',
    camperTip: 'Los parkings subterráneos del centro suelen tener límite de altura. Aparca fuera del casco antiguo y entra a pie o en bus.',
    warning: 'Revisa la altura de la camper antes de entrar en cualquier parking cubierto.',
    tags: ['Ciudad'],
    image: '/images/guia/catedral-palma.jpg',
    credit: { author: 'Javier Pérez Montes', license: 'CC BY-SA 4.0', source: commons('Catedral de Palma de Mallorca 01.jpg') },
  },

  // ── Dormir y servicios ──
  {
    id: 'area-son-serra',
    name: 'Área camper de Son Serra de Marina',
    category: 'dormir',
    area: 'Santa Margalida',
    lat: 39.7353,
    lng: 3.2258,
    summary: 'La primera área equipada para campers de Mallorca, a unos 200 m de la playa. Puedes dormir con todas las de la ley.',
    camperTip: 'Carrer Llarg, 3. Reserva y paga desde la app TripStop (16 € la noche, máximo 10 noches seguidas). En verano, reserva con antelación.',
    tags: ['Agua', 'Vaciado', 'Electricidad', 'De pago'],
    image: '/images/guia/area-son-serra.jpg',
    credit: { author: 'Olaf Tausch', license: 'CC BY 3.0', source: commons('Son Serra de Marina, en Santa Margarita (Baleares, España).jpg') },
  },
  {
    id: 'area-muro',
    name: 'Área de autocaravanas de Muro',
    category: 'dormir',
    area: 'Muro',
    lat: 39.7285,
    lng: 3.0594,
    summary: 'Explanada municipal junto a la antigua Escola Graduada, en el pueblo de Muro, para pasar la noche y hacer servicios.',
    camperTip: 'Gratuita y sin reserva: se ocupa por orden de llegada. Tiene toma de agua potable y vaciado de aguas grises.',
    tags: ['Agua', 'Vaciado', 'Gratis'],
    image: '/images/guia/area-muro.jpg',
    credit: { author: 'Chixoy', license: 'CC BY-SA 3.0', source: commons('Muro, en Mallorca (Baleares, España).jpg') },
  },
  {
    id: 'base-utopia',
    name: 'Base Utopia Van Life',
    category: 'dormir',
    area: 'Son Oms, Palma',
    lat: 39.5359,
    lng: 2.7356,
    summary: 'Nuestro punto de recogida y devolución, a 5 minutos del aeropuerto.',
    camperTip: 'Si necesitas agua, vaciar depósitos o cualquier ayuda durante el viaje, llámanos o escríbenos por WhatsApp y te indicamos la mejor opción.',
    tags: ['Recogida', 'Devolución'],
    image: '/images/campers/neo/neo-ext.png',
  },
]

export interface GuideRoute {
  id: string
  name: string
  days: string
  summary: string
  spotIds: string[]
}

export const GUIDE_ROUTES: GuideRoute[] = [
  {
    id: 'tramuntana',
    name: 'Serra de Tramuntana',
    days: '2–3 días',
    summary: 'La Ma-10 de oeste a norte: miradores sobre el mar, pueblos de piedra y la bajada a Sa Calobra.',
    spotIds: ['mirador-ses-animes', 'valldemossa', 'sa-foradada', 'deia', 'port-soller', 'fornalutx', 'santuari-lluc', 'sa-calobra'],
  },
  {
    id: 'sur',
    name: 'Calas del sur',
    days: '2 días',
    summary: 'Agua turquesa y playas vírgenes entre Es Trenc y Mondragó. Madruga para aparcar sin agobios.',
    spotIds: ['es-trenc', 'far-ses-salines', 'calo-des-moro', 'cala-llombards', 'cala-mondrago'],
  },
  {
    id: 'norte',
    name: 'Norte y Llevant',
    days: '2–3 días',
    summary: 'Formentor a primera hora, la Alcúdia medieval, una noche en Son Serra y las calas de Capdepera.',
    spotIds: ['mirador-colomer', 'platja-formentor', 'cala-sant-vicenc', 'alcudia', 'area-son-serra', 'arta', 'cala-agulla'],
  },
]

export interface GuideRule {
  title: string
  body: string
}

export const GUIDE_RULES: GuideRule[] = [
  {
    title: 'Aparcar sí, acampar no',
    body: 'Puedes aparcar la camper donde se permita aparcar cualquier coche y descansar dentro. Se considera acampada sacar toldo, mesas o sillas, poner calzos, abrir ventanas proyectables hacia fuera o verter agua. Fuera de las áreas autorizadas, acampar está prohibido y se multa.',
  },
  {
    title: 'Muchos municipios prohíben pasar la noche',
    body: 'En buena parte de la costa hay ordenanzas y señales que impiden estacionar autocaravanas y campers de noche, sobre todo en verano. Respeta siempre la señalización. Para dormir tranquilo, usa las áreas de Son Serra de Marina o de Muro.',
  },
  {
    title: 'Espacios naturales',
    body: 'En parques naturales y zonas protegidas (Mondragó, Es Trenc, Llevant…) no se puede pernoctar ni circular por caminos de tierra cerrados. Aparca solo en los aparcamientos habilitados.',
  },
  {
    title: 'Formentor en temporada',
    body: 'Del 15 de mayo al 18 de octubre de 2026, la carretera de Formentor (Ma-2210) está cerrada al vehículo privado de 10:00 a 22:00. Entra antes de las 10 o sube en el bus que sale del Port de Pollença.',
  },
  {
    title: 'Aguas grises y negras',
    body: 'Nunca vacíes los depósitos en la calle, en el campo o en alcantarillas: es una infracción grave. Hazlo en las áreas de Son Serra de Marina o Muro, o pregúntanos.',
  },
]

export const GUIDE_TIPS: string[] = [
  'Madruga: las calas más conocidas tienen aparcamientos pequeños y en verano se llenan antes de las 10.',
  'En la Serra de Tramuntana las carreteras son estrechas. Conduce sin prisa, usa marchas cortas en las bajadas y deja pasar a los ciclistas con margen.',
  'No dejes objetos de valor a la vista dentro de la camper cuando la aparques en zonas de playa.',
  'Lleva siempre agua y algo de comida: en muchas calas vírgenes no hay ningún servicio.',
  'Llévate tu basura y deja cada sitio como lo encontraste. Así seguirá habiendo lugares donde las campers son bienvenidas.',
]
