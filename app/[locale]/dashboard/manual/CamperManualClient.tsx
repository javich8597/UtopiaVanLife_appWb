'use client'

import { useState } from 'react'
import {
  Search,
  Zap,
  Droplets,
  Flame,
  Bed,
  Bath,
  Fuel,
  FileDown,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Play,
  Video,
  Phone,
  LifeBuoy,
  PhoneCall,
  Wrench,
  HelpCircle,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  ThermometerSnowflake,
  Layers,
  UtensilsCrossed,
  Loader2,
  ArrowUpDown,
  Check,
  BatteryCharging
} from 'lucide-react'

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
    posterUrl: '/images/campers/neo/interior/neo-bathroom-shower.webp',
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
  },
  {
    id: 'cocina',
    icon: UtensilsCrossed,
    title: 'Cocina de Gas, Cartuchos & Seguridad',
    systemName: 'Fuegos Integrados & Cartucho CP250 / Válvula de Seguridad',
    summary: 'Procedimiento de apertura de la llave de paso, cambio y fijación de cartuchos de gas, encendido piezoeléctrico y protocolos de ventilación.',
    tags: ['gas', 'cocina', 'fuegos', 'cartucho', 'seguridad', 'comida', 'ventilación', 'piezoeléctrico', 'llave de paso', 'butano'],
    videoUrl: '/videos/hero-bg.mov',
    videoDuration: '1:35 min',
    posterUrl: '/images/campers/neo/neo-interior.png',
    steps: [
      'Apertura de la llave de paso: Accede al armario bajo el fregadero y gira la llave roja de seguridad a posición abierta (paralela a la tubería).',
      'Inserción del cartucho de gas: Abre el compartimento lateral, encaja la muesca del cartucho CP250 en la guía metálica y baja la palanca frontal a posición "LOCK".',
      'Encendido piezoeléctrico: Presiona el mando giratorio hacia adentro y gíralo en sentido antihorario hasta el tope con "clic". Mantén presionado 3 segundos hasta que la llama azul prenda de manera uniforme.',
      'Ventilación obligatoria: Abre SIEMPRE la claraboya superior o la ventana lateral mientras los fuegos estén encendidos para asegurar una renovación constante de aire.',
      'Cierre de seguridad tras cocinar: Gira el mando a la posición "OFF", sube la palanca a "UNLOCK" y cierra la llave roja de paso si vas a iniciar la marcha.'
    ],
    proTip: 'Incluimos 2 cartuchos de gas CP250 precintados de repuesto en el kit de menaje de cocina.',
    warning: 'NUNCA cocines con todas las ventanas y claraboyas cerradas. Ante cualquier olor a gas, cierra de inmediato la llave roja y ventila por completo el vehículo.'
  },
  {
    id: 'techo-space',
    icon: ArrowUpDown,
    title: 'Cama de Techo Elevable Eléctrica (SPACE)',
    systemName: 'Cama de Techo Motorizada Project 2000 & Claraboyas',
    summary: 'Guía de uso para subir y bajar la cama de techo eléctrica exclusiva de la Camper SPACE, colocación de anclajes en marcha y redes de protección.',
    tags: ['cama', 'techo', 'space', 'elevable', 'eléctrica', 'motor', 'dormir', 'anclajes', 'claraboya', 'red', 'escalera'],
    videoUrl: '/videos/hero-bg-2.mov',
    videoDuration: '1:45 min',
    posterUrl: '/images/campers/space/space-interior.png',
    steps: [
      'Desbloqueo de cinchas de seguridad: Antes de pulsar el interruptor, suelta las correas mecánicas de seguridad situadas a ambos lados del techo.',
      'Despejar el salón inferior: Comprueba que la mesa del salón esté en su posición más baja y que no haya botellas ni objetos altos sobre ella.',
      'Descenso eléctrico: En el panel lateral junto a la puerta corredera, mantén presionado el botón "DOWN" hasta que la cama baje a la altura de descanso (topes automáticos).',
      'Red anticaída y escalera: Para dormir seguro, engarza los ganchos de la red perimetral en los anclajes del techo y coloca la escalera de aluminio suministrada.',
      'Elevación y bloqueo para la marcha: Retira la escalera, mantén presionado el botón "UP" hasta que la cama quede pegada al techo y fija OBLIGATORIAMENTE las cinchas mecánicas de bloqueo antes de arrancar.'
    ],
    proTip: 'Puedes dejar las sábanas y el nórdico hechos sobre la cama al subirla; solo retira las almohadas para un cierre perfecto.',
    warning: 'NUNCA pongas el vehículo en marcha sin haber abrochado los anclajes de seguridad mecánicos de la cama de techo.'
  }
]

export interface TroubleshootingItem {
  id: string
  category: 'electricidad' | 'aguas' | 'clima' | 'bateria'
  categoryLabel: string
  title: string
  symptom: string
  cause: string
  steps: string[]
  note?: string
}

export const TROUBLESHOOTING_ITEMS: TroubleshootingItem[] = [
  {
    id: 'inversor-230v',
    category: 'electricidad',
    categoryLabel: 'Electricidad 230V',
    title: 'Inversor 230V salta, pita o no entrega corriente',
    symptom: 'Los enchufes de 230V no funcionan, el inversor emite pitido continuo o la pantalla Garmin muestra aviso de sobrecarga.',
    cause: 'Se ha conectado un aparato o suma de aparatos superior a 2.000W simultáneos (p.ej. cafetera + secador de pelo), o el inversor ha entrado en modo protección térmica.',
    steps: [
      'Desconecta inmediatamente todos los aparatos de las tomas de 230V del interior del vehículo.',
      'Localiza el interruptor basculante principal del inversor Victron Multiplus en el panel técnico del maletero o el control virtual en la pantalla Garmin SERV.',
      'Coloca el conmutador en posición "OFF" y espera 10 segundos completos para que se descarguen los condensadores.',
      'Vuelve a colocar el conmutador en "ON" (o modo "CHARGER ONLY / ON"). Comprueba que el LED verde "Inverter ON" quede fijo.',
      'Reconecta tus dispositivos de forma individual, verificando que ninguno supere los 2.000W de potencia pico.'
    ],
    note: 'Si el inversor parpadea con luz roja de "Low Battery", consulta la sección de gestión de batería.'
  },
  {
    id: 'bomba-agua',
    category: 'aguas',
    categoryLabel: 'Circuito de Aguas',
    title: 'Bomba de agua no arranca o funciona en vacío sin salir agua',
    symptom: 'Al abrir los grifos no sale caudal, la bomba vibra continuamente sin detenerse o sale aire con salpicaduras bruscas.',
    cause: 'Interruptor general "PUMP" desactivado, nivel de agua limpia agotado (depósito vacío) o aire atrapado en las tuberías (descebado de la bomba).',
    steps: [
      'Verifica en la pantalla táctil que el icono o interruptor "PUMP" esté encendido en verde. Si está apagado, presiónalo.',
      'Comprueba el indicador de nivel de agua limpia (113L en NEO / 160L en SPACE). Si está al 0%, NO mantengas la bomba encendida para evitar sobrecalentamiento y rellena en el punto de agua más cercano.',
      'Si el depósito tiene agua pero solo sale aire: abre simultáneamente el grifo del fregadero y el grifo de la ducha en posición intermedia fría/caliente durante 30 segundos.',
      'El circuito purgará las bolsas de aire y comenzará a salir un chorro continuo. Cierra los grifos y la bomba se apagará automáticamente al presurizarse (hará "stop" en 2-3 segundos).'
    ],
    note: 'Si la bomba sigue sonando con los grifos cerrados, revisa que la toma de ducha exterior trasera esté bien cerrada.'
  },
  {
    id: 'calefaccion-diesel',
    category: 'clima',
    categoryLabel: 'Calefacción Estacionaria',
    title: 'Calefacción diésel marca error o se apaga a los pocos minutos',
    symptom: 'El termostato digital muestra parpadeo, código de error (E08, E10 o luz roja intermitente) o el quemador se detiene tras el arranque inicial.',
    cause: 'Nivel de combustible de la furgoneta inferior al 25% (bloqueo por seguridad de reserva) o rejillas de difusión de aire obstruidas.',
    steps: [
      'Revisa el nivel de gasóleo en el cuadro de mandos del vehículo. El espadín de succión de la calefacción está calibrado para no vaciar el tanque de marcha. Si estás en reserva o con menos de 1/4 de depósito, reposta Diésel.',
      'Comprueba que ninguna bolsa, zapato o manta esté bloqueando las toberas negras de salida de aire caliente bajo los asientos.',
      'Procedimiento de reinicio (Reset): Apaga la calefacción desde la rueda digital (posición "0" o pulsación larga).',
      'Desconecta el fusible general de confort en la pantalla o espera 2 minutos con el motor del vehículo en marcha.',
      'Vuelve a encender la calefacción seleccionando una temperatura de 21ºC y deja que complete el ciclo de cebado diésel durante 4 minutos.'
    ],
    note: 'El primer arranque tras repostar puede tardar hasta 3-5 minutos en alcanzar llama óptima.'
  },
  {
    id: 'nevera-compresor',
    category: 'clima',
    categoryLabel: 'Refrigeración 12V',
    title: 'Nevera de compresor no enfría o se apaga intermitentemente',
    symptom: 'Los alimentos no están fríos, el compresor no arranca o la luz interior parpadea.',
    cause: 'Termostato en nivel insuficiente, pestillo de ventilación "Vent" activado por error o rejillas de disipación trasera tapadas.',
    steps: [
      'Gira la rueda selectora interior del termostato al nivel 3 o 4 (en verano no se recomienda fijarlo al máximo 5-6 continuamente para evitar congelación del evaporador y sobrecalentamiento del compresor).',
      'Verifica el cierre de la puerta: la cerradura dispone de dos posiciones: "Vent" (semiabierta para guardar la camper) y "Lock" (cierre hermético completo). Asegúrate de escuchar el "click" firme de cierre hermético.',
      'Comprueba que las rejillas de ventilación de la base del mueble de cocina tengan circulación libre de aire.',
      'Comprueba en la pantalla táctil que la tensión de batería de 12V sea superior a 12.2V (el compresor cuenta con corte automático de protección si la batería está muy descargada).'
    ],
    note: 'Para enfriar más rápido tras hacer la compra, evita meter alimentos excesivamente calientes recién cocinados.'
  },
  {
    id: 'gestion-bateria',
    category: 'bateria',
    categoryLabel: 'Batería Victron & Autonomía',
    title: 'Batería baja (<20% SOC) tras días nublados o invierno',
    symptom: 'La pantalla Garmin indica porcentaje inferior al 20%, o suena el pitido preventivo de corte de bajo voltaje.',
    cause: 'Múltiples días consecutivos de cielo muy cubierto o lluvia continua en la Serra de Tramuntana, combinados con uso intensivo de 230V.',
    steps: [
      'Desconecta el inversor Multiplus de 230V de inmediato: el consumo en vacío del inversor se detendrá y preservarás el litio para luces, agua y nevera.',
      'Opción A (Recarga en Ruta): Arranca el motor de la furgoneta y realiza un trayecto de 45 a 60 minutos. El cargador booster Victron Orión de 50A cargará a máxima velocidad mientras conduces por las carreteras de la isla.',
      'Opción B (Conexión a Red 230V): Si estás en un camping o área de autocaravanas, extrae el cable azul de toma de corriente exterior del maletero y conéctalo a la toma exterior del lateral del vehículo. La batería se cargará al 100% en unas 3-4 horas.'
    ],
    note: 'Nuestras campers cuentan con baterías LiFePO4 de última generación que no sufren degradación por descargas profundas puntuales.'
  }
]

export default function CamperManualClient() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGuide, setExpandedGuide] = useState<string | null>('victron')
  const [filterVideosOnly, setFilterVideosOnly] = useState(false)
  const [activeTroubleshoot, setActiveTroubleshoot] = useState<string | null>('inversor-230v')
  const [troubleshootFilter, setTroubleshootFilter] = useState<string>('all')
  const [troubleshootSearch, setTroubleshootSearch] = useState<string>('')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false)

  const toggleGuide = (id: string) => {
    setExpandedGuide(prev => prev === id ? null : id)
  }

  const handleDownloadManualPdf = async () => {
    try {
      setIsGeneratingPdf(true)
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // Page 1: Header, branding, quick specs, and system guides
      pdf.setFillColor(26, 43, 33) // #1A2B21 forest
      pdf.rect(0, 0, 210, 26, 'F')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.setTextColor(255, 255, 255)
      pdf.text('UTOPIA VAN LIFE', 16, 12)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(200, 168, 130)
      pdf.text('MANUAL OFICIAL DE USUARIO & OPERACIÓN CAMPER (NEO & SPACE)', 16, 19)

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7.5)
      pdf.setTextColor(255, 255, 255)
      pdf.text('ASISTENCIA 24H: +34 611 560 916 | ARAG: +34 662 992 060', 194, 19, { align: 'right' })

      let y = 34
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(26, 43, 33)
      pdf.text('1. Guías de Operación de Sistemas', 16, y)
      y += 6

      GUIDES.forEach((guide, i) => {
        if (y > 265) {
          pdf.addPage()
          y = 20
        }

        pdf.setFillColor(248, 250, 252)
        pdf.setDrawColor(226, 232, 240)
        pdf.roundedRect(16, y, 178, 22, 2, 2, 'FD')

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8.5)
        pdf.setTextColor(26, 43, 33)
        pdf.text(`${i + 1}. ${guide.title}`, 20, y + 5.5)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor(100, 116, 139)
        pdf.text(guide.systemName, 190, y + 5.5, { align: 'right' })

        pdf.setTextColor(51, 65, 85)
        const summaryLines = pdf.splitTextToSize(guide.summary, 170)
        pdf.text(summaryLines, 20, y + 10.5)

        if (guide.steps && guide.steps.length > 0) {
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(7)
          pdf.setTextColor(22, 101, 52)
          pdf.text(`Paso clave: ${guide.steps[0]}`, 20, y + 18)
        }

        y += 25
      })

      // Troubleshooting Section on next Page
      pdf.addPage()
      pdf.setFillColor(26, 43, 33)
      pdf.rect(0, 0, 210, 16, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(255, 255, 255)
      pdf.text('2. Resolución de Averías Frecuentes en Ruta (Troubleshooting)', 16, 11)

      let ty = 24
      TROUBLESHOOTING_ITEMS.forEach(item => {
        pdf.setFillColor(254, 252, 248)
        pdf.setDrawColor(234, 229, 220)
        const boxH = 46
        pdf.roundedRect(16, ty, 178, boxH, 2, 2, 'FD')

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8.5)
        pdf.setTextColor(180, 83, 9)
        pdf.text(`[${item.categoryLabel}] ${item.title}`, 20, ty + 6)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7.2)
        pdf.setTextColor(71, 85, 105)
        pdf.text(`Síntoma: ${item.symptom}`, 20, ty + 11.5)
        pdf.text(`Causa: ${item.cause}`, 20, ty + 16.5)

        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(26, 43, 33)
        pdf.text('Pasos de resolución:', 20, ty + 22.5)

        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(51, 65, 85)
        item.steps.slice(0, 3).forEach((st, sIdx) => {
          const stLines = pdf.splitTextToSize(`• ${st}`, 168)
          pdf.text(stLines, 22, ty + 27.5 + (sIdx * 5))
        })

        ty += boxH + 6
      })

      // Footer
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.5)
      pdf.setTextColor(100, 116, 139)
      pdf.text('Utopia Van Life S.L. · Carrer Son Oms, Palma de Mallorca · info@utopiavanlife.com · +34 611 560 916', 105, 290, { align: 'center' })

      pdf.save('Manual_Camper_Utopia_Van_Life_2026.pdf')
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Hubo un problema generando la guía PDF. Por favor, contáctanos directamente.')
    } finally {
      setIsGeneratingPdf(false)
    }
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

  const filteredTroubleshooting = TROUBLESHOOTING_ITEMS.filter(item => {
    if (troubleshootFilter !== 'all' && item.category !== troubleshootFilter) return false
    if (!troubleshootSearch.trim()) return true
    const q = troubleshootSearch.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      item.symptom.toLowerCase().includes(q) ||
      item.cause.toLowerCase().includes(q) ||
      item.steps.some(st => st.toLowerCase().includes(q))
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
          <button 
            type="button"
            onClick={handleDownloadManualPdf}
            disabled={isGeneratingPdf}
            className="btn btn-outline btn-sm"
            style={{ gap: 6, cursor: isGeneratingPdf ? 'wait' : 'pointer' }}
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <FileDown size={15} />
                <span>Guía PDF</span>
              </>
            )}
          </button>
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

      {/* ─── Interactive Troubleshooting Section ─── */}
      <section className="troubleshoot-section">
        <div className="troubleshoot-header">
          <div>
            <div className="troubleshoot-kicker">
              <Wrench size={13} />
              <span>Resolución Autónoma de Incidencias</span>
            </div>
            <h2 className="text-h3" style={{ marginTop: 'var(--space-1)', color: 'var(--forest-green)' }}>
              Resolución de Averías Frecuentes (Troubleshooting)
            </h2>
            <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-1)', maxWidth: 680 }}>
              Protocolos guiados paso a paso para solucionar de inmediato las incidencias más comunes en ruta (inversor 230V, bomba de agua, calefacción, nevera y batería).
            </p>
          </div>

          <div className="troubleshoot-badge-total">
            <HelpCircle size={15} />
            <span>{TROUBLESHOOTING_ITEMS.length} Protocolos Disponibles</span>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="troubleshoot-controls-row">
          <div className="troubleshoot-pills">
            {[
              { id: 'all', label: 'Todas las averías' },
              { id: 'electricidad', label: 'Inversor & 230V' },
              { id: 'aguas', label: 'Bomba & Aguas' },
              { id: 'clima', label: 'Calefacción & Nevera' },
              { id: 'bateria', label: 'Batería & Autonomía' },
            ].map(pill => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setTroubleshootFilter(pill.id)}
                className={`troubleshoot-pill ${troubleshootFilter === pill.id ? 'troubleshoot-pill--active' : ''}`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="troubleshoot-search-box">
            <Search size={15} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar síntoma (ej. pita, no enfría, error...)"
              value={troubleshootSearch}
              onChange={e => setTroubleshootSearch(e.target.value)}
              className="troubleshoot-search-input"
            />
            {troubleshootSearch && (
              <button onClick={() => setTroubleshootSearch('')} className="troubleshoot-clear-btn">✕</button>
            )}
          </div>
        </div>

        {/* Troubleshooting Accordion Cards */}
        <div className="troubleshoot-cards-stack">
          {filteredTroubleshooting.map(item => {
            const isExpanded = activeTroubleshoot === item.id

            return (
              <div key={item.id} className={`troubleshoot-card ${isExpanded ? 'troubleshoot-card--expanded' : ''}`}>
                <button
                  type="button"
                  className="troubleshoot-card__header"
                  onClick={() => setActiveTroubleshoot(prev => prev === item.id ? null : item.id)}
                >
                  <div className={`troubleshoot-icon-box troubleshoot-icon-box--${item.category}`}>
                    {item.category === 'electricidad' && <Zap size={18} />}
                    {item.category === 'aguas' && <Droplets size={18} />}
                    {item.category === 'clima' && <Flame size={18} />}
                    {item.category === 'bateria' && <BatteryCharging size={18} />}
                  </div>

                  <div className="troubleshoot-card__title-area">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span className={`troubleshoot-cat-tag troubleshoot-cat-tag--${item.category}`}>
                        {item.categoryLabel}
                      </span>
                      <span className="troubleshoot-steps-badge">
                        {item.steps.length} pasos de resolución
                      </span>
                    </div>
                    <h3 className="troubleshoot-card__title">{item.title}</h3>
                    {!isExpanded && (
                      <p className="troubleshoot-card__symptom-preview">
                        <strong>Síntoma:</strong> {item.symptom}
                      </p>
                    )}
                  </div>

                  <div className="troubleshoot-card__chevron">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="troubleshoot-card__body">
                    <div className="troubleshoot-diagnosis-grid">
                      <div className="diagnosis-box diagnosis-box--symptom">
                        <span className="diagnosis-badge diagnosis-badge--symptom">⚠️ Síntoma observado</span>
                        <p className="diagnosis-text">{item.symptom}</p>
                      </div>
                      <div className="diagnosis-box diagnosis-box--cause">
                        <span className="diagnosis-badge diagnosis-badge--cause">🔍 Causa más probable</span>
                        <p className="diagnosis-text">{item.cause}</p>
                      </div>
                    </div>

                    <div className="troubleshoot-steps-box">
                      <div className="troubleshoot-steps-header">
                        <CheckCircle2 size={16} style={{ color: '#059669' }} />
                        <span>Protocolo de resolución paso a paso:</span>
                      </div>
                      <ol className="troubleshoot-steps-list">
                        {item.steps.map((st, idx) => (
                          <li key={idx} className="troubleshoot-step-item">
                            <span className="troubleshoot-step-circle">{idx + 1}</span>
                            <span className="troubleshoot-step-desc">{st}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {item.note && (
                      <div className="troubleshoot-tip-box">
                        <Sparkles size={16} style={{ color: 'var(--sand-dark)', flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--sand-dark)', marginBottom: 2 }}>Nota del equipo Utopia:</strong>
                          <span className="text-small" style={{ color: 'var(--gray-700)' }}>{item.note}</span>
                        </div>
                      </div>
                    )}

                    <div className="troubleshoot-action-footer">
                      <span className="text-xs" style={{ color: 'var(--gray-600)' }}>
                        ¿Has completado el protocolo y la incidencia persiste?
                      </span>
                      <a href="tel:+34611560916" className="btn btn-forest btn-sm" style={{ gap: 6, textDecoration: 'none' }}>
                        <PhoneCall size={13} />
                        <span>Llamar a Soporte Utopia (+34 611 560 916)</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {filteredTroubleshooting.length === 0 && (
            <div className="empty-troubleshoot">
              <p className="text-body" style={{ color: 'var(--gray-600)' }}>No hay averías que coincidan con &quot;{troubleshootSearch}&quot;.</p>
              <button onClick={() => { setTroubleshootSearch(''); setTroubleshootFilter('all'); }} className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-2)' }}>
                Ver todas las averías
              </button>
            </div>
          )}
        </div>
      </section>

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
          .manual-header__actions a,
          .manual-header__actions button {
            flex: 1;
            justify-content: center;
          }
        }

        /* ─── Troubleshooting Section Styles ─── */
        .troubleshoot-section {
          background: #FAF8F5;
          border: 1px solid #EAE5DC;
          border-radius: var(--radius-xl, 16px);
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
          margin-top: var(--space-4);
        }
        .troubleshoot-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          padding-bottom: var(--space-4);
          border-bottom: 1px solid #E5DFD5;
        }
        .troubleshoot-kicker {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #B45309;
          background: #FEF3C7;
          padding: 3px 10px;
          border-radius: 9999px;
        }
        .troubleshoot-badge-total {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--forest-green);
          background: #E8F5E9;
          padding: 5px 12px;
          border-radius: 9999px;
        }
        .troubleshoot-controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .troubleshoot-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .troubleshoot-pill {
          padding: 6px 14px;
          border-radius: 9999px;
          border: 1px solid #D8D2C6;
          background: #FFFFFF;
          font-size: 0.78rem;
          font-weight: 600;
          color: #4A5568;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .troubleshoot-pill:hover {
          border-color: var(--forest-green);
          color: var(--forest-green);
        }
        .troubleshoot-pill--active {
          background: var(--forest-green) !important;
          color: #FFFFFF !important;
          border-color: var(--forest-green) !important;
        }
        .troubleshoot-search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          border: 1px solid #D8D2C6;
          border-radius: var(--radius-lg, 10px);
          padding: 6px 12px;
          min-width: 260px;
        }
        .troubleshoot-search-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.82rem;
          width: 100%;
          color: var(--black-matte);
        }
        .troubleshoot-clear-btn {
          border: none;
          background: transparent;
          color: #9CA3AF;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 0 4px;
        }
        .troubleshoot-cards-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .troubleshoot-card {
          background: #FFFFFF;
          border: 1px solid #E5DFD5;
          border-radius: var(--radius-lg, 12px);
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .troubleshoot-card--expanded {
          border-color: #B45309;
          box-shadow: 0 4px 16px rgba(180, 83, 9, 0.08);
        }
        .troubleshoot-card__header {
          width: 100%;
          border: none;
          background: transparent;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px 18px;
          cursor: pointer;
          text-align: left;
        }
        .troubleshoot-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .troubleshoot-icon-box--electricidad { background: #FEF3C7; color: #D97706; }
        .troubleshoot-icon-box--aguas { background: #E0F2FE; color: #0284C7; }
        .troubleshoot-icon-box--clima { background: #FEE2E2; color: #DC2626; }
        .troubleshoot-icon-box--bateria { background: #DCFCE7; color: #16A34A; }

        .troubleshoot-card__title-area {
          flex: 1;
        }
        .troubleshoot-cat-tag {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .troubleshoot-cat-tag--electricidad { background: #FFFBEB; color: #B45309; }
        .troubleshoot-cat-tag--aguas { background: #F0F9FF; color: #0369A1; }
        .troubleshoot-cat-tag--clima { background: #FEF2F2; color: #B91C1C; }
        .troubleshoot-cat-tag--bateria { background: #F0FDF4; color: #15803D; }

        .troubleshoot-steps-badge {
          font-size: 0.68rem;
          font-weight: 600;
          color: #6B7280;
        }
        .troubleshoot-card__title {
          font-size: 0.96rem;
          font-weight: 700;
          color: #1A2B21;
          margin: 4px 0 0 0;
        }
        .troubleshoot-card__symptom-preview {
          font-size: 0.8rem;
          color: #64748B;
          margin: 4px 0 0 0;
          line-height: 1.4;
        }
        .troubleshoot-card__chevron {
          color: var(--gray-400);
          padding-top: 2px;
        }
        .troubleshoot-card__body {
          padding: 0 18px 18px calc(18px + 40px + 14px);
          border-top: 1px solid #F1EFE9;
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .troubleshoot-diagnosis-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .diagnosis-box {
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid transparent;
        }
        .diagnosis-box--symptom {
          background: #FEF2F2;
          border-color: #FECACA;
        }
        .diagnosis-box--cause {
          background: #FFFBEB;
          border-color: #FDE68A;
        }
        .diagnosis-badge {
          font-size: 0.72rem;
          font-weight: 700;
          display: block;
          margin-bottom: 4px;
        }
        .diagnosis-badge--symptom { color: #991B1B; }
        .diagnosis-badge--cause { color: #92400E; }
        .diagnosis-text {
          font-size: 0.82rem;
          color: #1F2937;
          margin: 0;
          line-height: 1.45;
        }
        .troubleshoot-steps-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 14px 16px;
        }
        .troubleshoot-steps-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.84rem;
          font-weight: 700;
          color: #1A2B21;
          margin-bottom: 10px;
        }
        .troubleshoot-steps-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .troubleshoot-step-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .troubleshoot-step-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--forest-green);
          color: #FFFFFF;
          font-size: 0.7rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .troubleshoot-step-desc {
          font-size: 0.82rem;
          color: #334155;
          line-height: 1.5;
        }
        .troubleshoot-tip-box {
          display: flex;
          gap: 10px;
          background: #F5F1EB;
          border: 1px solid #E2DDD5;
          border-radius: 8px;
          padding: 10px 14px;
        }
        .troubleshoot-action-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding-top: 6px;
          border-top: 1px dashed #E2E8F0;
        }
        .empty-troubleshoot {
          background: #FFFFFF;
          padding: var(--space-8);
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          text-align: center;
        }
        @media (max-width: 768px) {
          .troubleshoot-card__body {
            padding-left: 18px;
          }
          .troubleshoot-diagnosis-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .manual-header {
            gap: 12px;
            padding-bottom: 12px;
          }
          .search-card {
            min-width: 0;
            width: 100%;
          }
          .filter-video-btn {
            width: 100%;
            justify-content: center;
            padding: 10px 14px;
          }
          .guide-card__header {
            padding: 14px 16px;
          }
          .guide-card__content {
            padding: 12px 16px 16px 16px;
          }
          .troubleshoot-section {
            padding: 16px 12px;
          }
          .troubleshoot-controls-row {
            flex-direction: column;
            align-items: stretch;
          }
          .troubleshoot-pills {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            flex-wrap: nowrap;
            padding-bottom: 4px;
            scrollbar-width: none;
          }
          .troubleshoot-pills::-webkit-scrollbar {
            display: none;
          }
          .troubleshoot-pill {
            flex-shrink: 0;
            white-space: nowrap;
          }
          .troubleshoot-search-box {
            min-width: 0;
            width: 100%;
          }
          .troubleshoot-card__header {
            padding: 14px;
          }
          .troubleshoot-card__body {
            padding: 12px 14px 14px 14px;
          }
          .troubleshoot-action-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .troubleshoot-action-footer a {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
