import { validateDriverLicense } from './licenseValidator'

export interface CamperModelSpecs {
  modelKey: 'neo' | 'space' | 'general'
  modelName: string
  vehicleType: string
  lengthMeters: number
  capacity: string
  layoutDescription: string
  specsList: string[]
}

export interface ContractArticle {
  number: number
  title: string
  chapter: string
  content: string[]
}

export interface ContractData {
  contractNumber: string
  generatedAt: string
  lessor: {
    companyName: string
    cif: string
    address: string
    city: string
    phone: string
    email: string
    representative: string
    activity: string
  }
  lessee: {
    fullName: string
    dniNie: string
    driverLicenseId: string
    driverLicenseIssueDate: string
    driverLicenseExpiryDate: string
    yearsHeld: number
    address: string
    phone: string
    email: string
  }
  secondDriver?: {
    fullName: string
    dniNie: string
    driverLicenseId: string
  }
  vehicle: {
    modelName: string
    vehicleType: string
    capacity: string
    plateNumber: string
    specsList: string[]
  }
  booking: {
    bookingId: string
    startDate: string
    endDate: string
    pickupTime: string
    dropoffTime: string
    pickupLocation: string
    dropoffLocation: string
  }
  pricing: {
    totalPrice: number
    depositAmount: number
    extras: string[]
  }
  articles: ContractArticle[]
  rgpdText: {
    responsable: string
    cif: string
    domicilio: string
    email: string
    telefono: string
    finalidad: string
    legitimacion: string
    conservacion: string
    destinatarios: string
    derechos: string
    contacto: string
  }
  clauses: string[]
}

export interface ContractValidationResult {
  isValid: boolean
  missingFields: string[]
  issues: string[]
  errorMessage?: string
}

export function validateContractRequirements(profile: any): ContractValidationResult {
  const missingFields: string[] = []
  const issues: string[] = []

  if (!profile?.full_name?.trim()) missingFields.push('full_name')
  if (!profile?.dni_nie?.trim()) missingFields.push('dni_nie')
  if (!profile?.phone?.trim()) missingFields.push('phone')
  if (!profile?.address?.trim()) missingFields.push('address')
  if (!profile?.driver_license_id?.trim()) missingFields.push('driver_license_id')
  if (!profile?.driver_license_issue_date?.trim()) missingFields.push('driver_license_issue_date')
  if (!profile?.driver_license_expiry_date?.trim()) missingFields.push('driver_license_expiry_date')

  if (profile?.driver_license_issue_date && profile?.driver_license_expiry_date) {
    const licenseCheck = validateDriverLicense(
      profile.driver_license_issue_date,
      profile.driver_license_expiry_date
    )

    if (licenseCheck.isExpired) {
      issues.push('license_expired')
    }
    if (licenseCheck.yearsHeld < 2) {
      issues.push('license_too_novel')
    }
  }

  let errorMessage: string | undefined
  if (missingFields.length > 0) {
    errorMessage = 'Faltan datos obligatorios en tu perfil para formalizar el contrato.'
  } else if (issues.includes('license_expired')) {
    errorMessage = 'El carnet de conducir registrado se encuentra caducado.'
  } else if (issues.includes('license_too_novel')) {
    errorMessage = 'El carnet de conducir debe tener un mínimo de 2 años de antigüedad según los términos de seguro.'
  }

  return {
    isValid: missingFields.length === 0 && issues.length === 0,
    missingFields,
    issues,
    errorMessage
  }
}

export function detectCamperModelSpecs(slugOrName?: string | null): CamperModelSpecs {
  const normalized = (slugOrName || '').toLowerCase()

  if (normalized.includes('space')) {
    return {
      modelKey: 'space',
      modelName: 'Nomade SPACE',
      vehicleType: 'Fiat Ducato L3H2 (5.99m)',
      lengthMeters: 5.99,
      capacity: '2 Plazas (adaptable a 3)',
      layoutDescription: 'Distribución abierta "Open Concept" (7m²) con cama elevable eléctrica de techo, salón panorámico en U con mesa 360°, aire acondicionado Dometic 12V y depósito de 160L.',
      specsList: [
        'Vehículo base: Fiat Ducato L3H2 (Longitud 5.99m / Altura 2.80m con accesorios)',
        'Motor Multijet 140 CV Diésel (8L/100km) con cambio manual y tracción delantera',
        'Cama elevable eléctrica de techo (185 x 135 cm, soporte 600kg) sobre salón panorámico en U',
        'Sistema Eléctrico PRO Victron: 2 baterías litio 540Ah, 2 placas solares 400W e inversor Multiplus 2000W',
        'Pantalla táctil Garmin SERV con control domótico integral y app móvil Garmin RV Controls',
        'Aire acondicionado 12V Dometic y calefacción/agua caliente diésel Truma Combi 4D + E',
        'Depósito de aguas limpias de gran autonomía (160L) y depósito de aguas grises (93L)',
        'Cocina con 2 fogones, encimera en L, nevera compresor 86L con congelador y gas GLP',
        'Baño completo tipo spa con ducha interior de agua caliente, WC químico y ducha exterior',
        'Sonido envolvente con 4 altavoces coaxiales JBL con amplificador y Pack Cine con proyector'
      ]
    }
  }

  // Default to NEO
  return {
    modelKey: 'neo',
    modelName: 'Nomade NEO',
    vehicleType: 'Fiat Ducato L3H2 (5.99m)',
    lengthMeters: 5.99,
    capacity: '2-3 Plazas (ideal 2 personas, adaptable a 3)',
    layoutDescription: 'Camper con habitáculo y cabina separados para máximo aislamiento e intimidad, cama doble fija trasera viscoelástica, 2.230L de maletero, aire acondicionado 12V Dometic y sistema Victron.',
    specsList: [
      'Vehículo base: Fiat Ducato L3H2 (Longitud 5.99m / Altura 2.80m con accesorios)',
      'Motor Multijet 140 CV Diésel (8L/100km) con cambio manual y tracción delantera',
      'Habitáculo independiente con separación total de cabina para máximo aislamiento térmico y acústico',
      'Cama doble fija trasera (192 x 130 cm) con colchón viscoelástico + cama auxiliar para 3ª plaza',
      'Gran capacidad de almacenaje: 2.230 Litros de maletero bajo la cama con acceso interior y exterior',
      'Sistema Eléctrico PRO Victron: 2 baterías litio 540Ah, 2 placas solares 400W e inversor Multiplus 2000W',
      'Pantalla táctil Garmin SERV con control domótico centralizado y app móvil Garmin RV Controls',
      'Aire acondicionado 12V Dometic CoolAir y calefacción/agua caliente diésel Truma Combi 4D + E',
      'Depósito de aguas limpias de 113L y depósito de aguas grises de 90L con vaciado manual',
      'Cocina con 2 fogones, nevera compresor 86L con congelador, gas GLP con alarma de gases',
      'Baño completo con ducha interior caliente, WC químico y ducha exterior',
      'Sonido envolvente con 4 altavoces coaxiales JBL, pantalla táctil 10" Apple CarPlay y cámara trasera dinámica'
    ]
  }
}

/**
 * Retorna los 31 artículos oficiales agrupados en los 10 capítulos
 * tal como constan en docs/Contract/CONTRATO ALQUILER.md
 */
export function getOfficialContractArticles(): ContractArticle[] {
  return [
    // CAPÍTULO I – DISPOSICIONES GENERALES
    {
      number: 1,
      title: 'Identificación del Arrendador',
      chapter: 'CAPÍTULO I – DISPOSICIONES GENERALES',
      content: [
        'UTOPIA VAN LIFE SL, CIF B24902637, con domicilio social en C\\ Cristo de los remedios, nº2, Planta 0, Puerta 2, CP.: 28703 San Sebastián de los Reyes, Madrid, España, en adelante "el ARRENDADOR", desarrolla la actividad de arrendamiento de vehículos vivienda sin conductor en la isla de Mallorca.',
        'Las presentes Condiciones Generales regulan íntegramente la reserva y el contrato de arrendamiento formalizado con el cliente (en adelante, el "ARRENDATARIO").'
      ]
    },

    // CAPÍTULO II – RESERVA Y PERFECCIONAMIENTO CONTRACTUAL
    {
      number: 2,
      title: 'Proceso de reserva',
      chapter: 'CAPÍTULO II – RESERVA Y PERFECCIONAMIENTO CONTRACTUAL',
      content: [
        'Para confirmar la reserva, será necesario abonar el 100% del importe total del alquiler en el momento de la solicitud y firmar el presente contrato de forma digital y remitirlo a UTOPIA VAN LIFE SL.'
      ]
    },
    {
      number: 3,
      title: 'Precio, cancelación y cambio de fechas',
      chapter: 'CAPÍTULO II – RESERVA Y PERFECCIONAMIENTO CONTRACTUAL',
      content: [
        'El precio será el vigente en el momento de la reserva.',
        'Cancelaciones: Las condiciones de cancelación serán las siguientes:',
        '• Más de 30 días antes del inicio del alquiler: Se devolverá íntegramente el importe abonado en concepto de reserva.',
        '• Entre 29 y 15 días antes del inicio del alquiler: Se retendrá el 50% del importe de la reserva.',
        '• 14 días o menos antes del inicio del alquiler: Se retendrá el 100% del importe de la reserva.',
        'En caso de no presentación del cliente en la fecha y hora acordadas, se aplicará la misma condición que para cancelaciones de menos de 14 días.',
        'Cambio de fechas: Podrás solicitar un único cambio de fechas sin coste con más de 15 días de antelación, sujeto a disponibilidad. Importante: el cambio de fechas no modifica ni reinicia las condiciones de cancelación originales de la reserva.'
      ]
    },

    // CAPÍTULO III – CONDUCTORES Y USO
    {
      number: 4,
      title: 'Conductores autorizados',
      chapter: 'CAPÍTULO III – CONDUCTORES Y USO',
      content: [
        'El conductor deberá cumplir obligatoriamente:',
        '• Edad mínima: 25 años.',
        '• Permiso de conducir tipo B en vigor.',
        '• Antigüedad mínima: 2 años.',
        'Solo podrán conducir las personas expresamente autorizadas en el contrato. El incumplimiento de estos requisitos implicará la pérdida de cobertura del seguro en daños propios, siendo el arrendatario responsable de la totalidad de los daños ocasionados.'
      ]
    },
    {
      number: 5,
      title: 'Usos permitidos y prohibidos',
      chapter: 'CAPÍTULO III – CONDUCTORES Y USO',
      content: [
        'El vehículo deberá utilizarse de forma responsable y conforme a la normativa vigente.',
        'Queda expresamente prohibido:',
        '• Circular por playas, arena o dunas.',
        '• Circular por caminos no asfaltados no aptos para turismos.',
        '• Acceder a pistas forestales, agrícolas o zonas de difícil acceso.',
        '• Circular fuera de vías accesibles a servicios de asistencia.',
        '• Transportar más ocupantes de los permitidos.',
        '• Subarrendar el vehículo o destinarlo a actividades no autorizadas.',
        'El incumplimiento de estas condiciones implicará la asunción total de daños, costes y responsabilidades por parte del arrendatario.'
      ]
    },

    // CAPÍTULO IV – ENTREGA, FIANZA Y DEVOLUCIÓN
    {
      number: 6,
      title: 'Entrega y verificación inicial',
      chapter: 'CAPÍTULO IV – ENTREGA, FIANZA Y DEVOLUCIÓN',
      content: [
        'El arrendatario deberá recibir instrucciones de uso del vehículo, para ello se pondrá a disposición del ARRENDATARIO, tras realización de la reserva, videos explicativos detallados de cada accesorio integrado en el vehículo, quien con la firma de este contrato da fe de su visualización y comprensión previa a la entrega.',
        'Participar en el checklist de entrega y devolución.',
        'Aceptación de un video del estado del vehículo in situ, tanto interior como exterior, que será válido como prueba documental.',
        'El arrendatario declara recibir el vehículo en perfecto estado, salvo incidencias reflejadas en el checklist, renunciando a reclamaciones posteriores no comunicadas en el momento de la entrega.',
        'La no presentación del cliente en el lugar y fecha acordados supondrá: cancelación automática y pérdida del 100% del importe de la reserva.',
        'Para la retirada del vehículo será obligatorio presentar DNI o pasaporte original y permiso de conducir original en vigor. En caso de no poder presentar la documentación requerida en el momento de la entrega, no será posible formalizar el alquiler, aplicándose las condiciones de cancelación establecidas en la reserva.'
      ]
    },
    {
      number: 7,
      title: 'Fianza',
      chapter: 'CAPÍTULO IV – ENTREGA, FIANZA Y DEVOLUCIÓN',
      content: [
        'A la firma del contrato, previo a la retirada del vehículo, se depositará una fianza mediante tarjeta bancaria por importe de 1.000 €.',
        'La fianza garantiza: Franquicia del seguro, daños no cubiertos por la póliza, daños interiores del vehículo, penalizaciones contractuales, costes de rescate y asistencia no cubiertos y cualquier perjuicio económico derivado.',
        'La fianza podrá ser retenida total o parcialmente hasta la completa verificación del estado del vehículo y liquidación de posibles cargos.',
        'La fianza será devuelta tras la positiva revisión del vehículo. El arrendador podrá disponer de hasta 30 días para su devolución en caso de daños pendientes de valoración.'
      ]
    },
    {
      number: 8,
      title: 'Combustible',
      chapter: 'CAPÍTULO IV – ENTREGA, FIANZA Y DEVOLUCIÓN',
      content: [
        'El vehículo se entrega con el depósito de DIESEL lleno y deberá devolverse en las mismas condiciones.',
        'Penalización: En caso contrario, se facturará el combustible necesario, más 40 € en concepto de gestión.'
      ]
    },
    {
      number: 9,
      title: 'Llaves',
      chapter: 'CAPÍTULO IV – ENTREGA, FIANZA Y DEVOLUCIÓN',
      content: [
        'El ARRENDATARIO es responsable de la custodia de llaves, mandos y documentación.',
        'En caso de pérdida o inutilización, se aplicará penalización de 400 € por las llaves, sin perjuicio de costes acreditados adicionales. Y 200 € por la documentación.'
      ]
    },

    // CAPÍTULO V – DURACIÓN Y ÁMBITO TERRITORIAL
    {
      number: 10,
      title: 'Duración',
      chapter: 'CAPÍTULO V – DURACIÓN Y ÁMBITO TERRITORIAL',
      content: [
        'El arrendamiento comienza y finaliza según acuerdo pactado en contrato, para ampliación de la misma es necesario solicitarlo con una antelación mínima de 32 horas, y solo será aprobado según disponibilidad.',
        'Retraso: penalización de 50 € de gestión + 25 € por hora completa, sin perjuicio de daños mayores si afecta a reservas posteriores.',
        'Tras cuatro horas sin comunicación, el ARRENDADOR podrá iniciar procedimientos de recuperación.',
        'La finalización anticipada voluntaria no genera derecho a devolución.',
        'Si el vehículo quedara inutilizado por siniestro imputable al ARRENDATARIO, el contrato se resolverá sin derecho a reembolso.'
      ]
    },
    {
      number: 11,
      title: 'Ámbito territorial',
      chapter: 'CAPÍTULO V – DURACIÓN Y ÁMBITO TERRITORIAL',
      content: [
        'Uso exclusivo dentro de Mallorca, salvo acuerdo previo. Se podrá hacer uso del vehículo en la península y países europeos amparados en la carta verde, previa notificación y aprobación por parte del ARRENDADOR.',
        'El ámbito territorial constituye elemento esencial del contrato y está vinculado a las condiciones de la póliza de seguro.',
        'Queda prohibido trasladar el vehículo fuera de Mallorca sin autorización expresa y escrita del ARRENDADOR.',
        'El incumplimiento será considerado incumplimiento grave y facultará resolución inmediata, activación de sistemas de localización y reclamación de costes de recuperación.'
      ]
    },
    {
      number: 12,
      title: 'Kilometraje',
      chapter: 'CAPÍTULO V – DURACIÓN Y ÁMBITO TERRITORIAL',
      content: [
        'El kilometraje incluido será de 150 km por día de alquiler, acumulables durante todo el periodo contratado.',
        'El cómputo total se calculará multiplicando los kilómetros diarios por el número de días de alquiler.',
        'En caso de superarse el kilometraje incluido: Se aplicará un cargo de 0,25 € por kilómetro adicional.',
        'El kilometraje ilimitado deberá contratarse previamente, con un coste de 20 € por día.',
        'En caso de uso manifiestamente abusivo o contrario a la finalidad del alquiler, el arrendador podrá aplicar cargos adicionales debidamente justificados.'
      ]
    },

    // CAPÍTULO VI – SEGURO, TELEMETRÍA, AVERÍAS Y ASISTENCIA
    {
      number: 13,
      title: 'Seguro',
      chapter: 'CAPÍTULO VI – SEGURO, TELEMETRÍA, AVERÍAS Y ASISTENCIA',
      content: [
        'El vehículo dispone de seguro a todo riesgo con franquicia de 1.000 € por siniestro, que cubre las incidencias habituales durante el viaje. En condiciones normales de uso, el cliente está cubierto.',
        'En caso de siniestro culpable, el arrendatario asumirá la franquicia correspondiente y aquellos daños derivados de un uso indebido o fuera de las condiciones de alquiler.',
        'Situaciones no cubiertas por el seguro: Daños en el interior del vehículo (mobiliario, cocina, baño, etc.), uso negligente o inadecuado, circulación por vías no aptas e incumplimiento de las condiciones de uso. Estas situaciones son poco habituales y se evitan fácilmente haciendo un uso responsable del vehículo.'
      ]
    },
    {
      number: 14,
      title: 'Asistencia en carretera',
      chapter: 'CAPÍTULO VI – SEGURO, TELEMETRÍA, AVERÍAS Y ASISTENCIA',
      content: [
        'La asistencia en carretera está sujeta a las condiciones y límites de la póliza de seguro.',
        'El arrendatario será responsable de: Rescates fuera de vías aptas, costes que excedan los límites del seguro e incidencias derivadas de uso indebido del vehículo, incluyendo costes directos, logísticos y pérdida de explotación.'
      ]
    },
    {
      number: 15,
      title: 'Averías y obligación de aviso',
      chapter: 'CAPÍTULO VI – SEGURO, TELEMETRÍA, AVERÍAS Y ASISTENCIA',
      content: [
        'El arrendatario deberá informar de forma inmediata al arrendador ante cualquier avería, incidencia o anomalía en el funcionamiento del vehículo.',
        'En caso de advertencias del vehículo (testigos, ruidos, funcionamiento anómalo), el arrendatario deberá detener el uso del mismo y contactar con el arrendador antes de continuar la marcha.',
        'Queda expresamente prohibido: Manipular el vehículo y realizar reparaciones sin autorización, y continuar la marcha ignorando avisos o señales de fallo.',
        'Los daños derivados de la falta de comunicación, manipulación o uso negligente serán imputables íntegramente al arrendatario. El incumplimiento de esta obligación podrá ser considerado negligencia grave.'
      ]
    },
    {
      number: 16,
      title: 'Sistemas GPS y protección de datos',
      chapter: 'CAPÍTULO VI – SEGURO, TELEMETRÍA, AVERÍAS Y ASISTENCIA',
      content: [
        'El vehículo dispone de un sistema de geolocalización (GPS) con la finalidad de garantizar la seguridad del vehículo, facilitar su recuperación en caso de robo, pérdida o apropiación indebida y gestionar incidencias durante el periodo de alquiler.',
        'El sistema no se utiliza para monitorización continua del cliente ni para el seguimiento de su ubicación salvo en caso de necesidad justificada relacionada con la seguridad o ejecución del contrato, se podrá hacer uso de la localización cuando sea imprescindible y necesario (Artículo 6.1.f. RGPD – interés legítimo).',
        'El tratamiento se limita a fines de seguridad y cumplimiento contractual. Estos datos podrán utilizarse como medio de prueba contractual. Los datos se conservarán conforme a normativa aplicable, aplicando protocolo de protección de datos en todo momento.'
      ]
    },

    // CAPÍTULO VII – INVENTARIO Y EQUIPAMIENTO
    {
      number: 17,
      title: 'Inventario contractual',
      chapter: 'CAPÍTULO VII – INVENTARIO Y EQUIPAMIENTO',
      content: [
        'El vehículo se entrega con el equipamiento fijo y móvil correspondiente al modelo reservado y, en su caso, a los extras contratados.',
        'El inventario se considerará parte integrante del contrato y quedará incorporado mediante: descripción estándar por modelo, formulario de inspección inicial, y soporte fotográfico/videográfico aportado por las partes.',
        'El ARRENDATARIO declara recibir el vehículo con el equipamiento completo y en correcto estado de uso, salvo las incidencias comunicadas conforme al Artículo 6.'
      ]
    },
    {
      number: 18,
      title: 'Equipamiento fijo',
      chapter: 'CAPÍTULO VII – INVENTARIO Y EQUIPAMIENTO',
      content: [
        'Se consideran elementos de equipamiento fijo, entre otros: mobiliario interior, armarios y puertas, encimera, frigorífico, instalación eléctrica interior y exterior, ventanas, claraboyas con mosquitera y oscurecedores, estructuras de cama, sistemas de anclaje y fijación, instalación de agua y bomba, depósitos integrados, asientos, WC químico y ducha interior.',
        'Estos elementos no podrán desmontarse ni manipularse.',
        'Cualquier daño derivado de uso indebido, manipulación o negligencia será imputable al ARRENDATARIO.'
      ]
    },
    {
      number: 19,
      title: 'Equipamiento móvil y responsabilidad',
      chapter: 'CAPÍTULO VII – INVENTARIO Y EQUIPAMIENTO',
      content: [
        'Se consideran elementos de equipamiento móvil, según modelo y extras contratados: colchón, cama interbanco y soporte, alfombrillas, kit de vajilla, sartenes y cafetera, ropa de cama, almohadas, toallas, ducha exterior desmontable con alcachofa, y WC químico cuando se contrate como extra.',
        'El ARRENDATARIO responderá por pérdida, rotura o deterioro derivado de mal uso, manipulación indebida o negligencia.',
        'La reposición se valorará conforme a precio de mercado o coste real acreditado, más un incremento del 25% en concepto de gestión.'
      ]
    },

    // CAPÍTULO VIII – SEGURIDAD Y PROHIBICIONES ESPECÍFICAS
    {
      number: 20,
      title: 'Prohibición de fumar y llamas abiertas',
      chapter: 'CAPÍTULO VIII – SEGURIDAD Y PROHIBICIONES ESPECÍFICAS',
      content: [
        'Queda prohibido el uso de velas, incienso o cualquier llama abierta en el interior.',
        'Queda terminantemente prohibido fumar en el interior del vehículo.',
        'El incumplimiento dará lugar a una penalización mínima de 300 €, sin perjuicio de los costes superiores acreditados derivados de limpieza especializada, eliminación de olores o reparación de daños.'
      ]
    },
    {
      number: 21,
      title: 'Mascotas',
      chapter: 'CAPÍTULO VIII – SEGURIDAD Y PROHIBICIONES ESPECÍFICAS',
      content: [
        'No está permitido viajar con mascotas sin autorización previa y expresa del arrendador por escrito.',
        'En caso de autorización, el arrendatario será responsable de: cualquier daño, deterioro o suciedad ocasionada, u olores persistentes o necesidad de limpieza especializada.',
        'En caso de incumplimiento o introducción de mascotas sin autorización: Se aplicarán los costes de limpieza correspondientes, podrán aplicarse penalizaciones adicionales y, en casos graves, podrá considerarse incumplimiento contractual, facultando la resolución anticipada del contrato.'
      ]
    },

    // CAPÍTULO IX – LIMPIEZA Y SANCIONES
    {
      number: 22,
      title: 'Limpieza',
      chapter: 'CAPÍTULO IX – LIMPIEZA Y SANCIONES',
      content: [
        'El vehículo se entrega en condiciones óptimas de limpieza y deberá devolverse en un estado razonable de uso, incluyendo: Interior limpio (sin restos de basura, arena, manchas o suciedad visible); menaje y utensilios limpios y nevera vacía y limpia; WC químico completamente vaciado y limpio y depósito de aguas grises vaciado.',
        'No se exige una limpieza profesional, pero sí un estado adecuado para su uso inmediato.',
        'Cargos por incumplimiento: En caso de no cumplirse estas condiciones, se aplicarán los siguientes cargos:',
        '• Limpieza básica: 50 €.',
        '• Limpieza intensiva (suciedad excesiva): 150 €.',
        '• WC no vaciado o en mal estado: 200 €.',
        'En casos graves, se podrán aplicar cargos adicionales debidamente acreditados.'
      ]
    },
    {
      number: 23,
      title: 'Multas y gastos administrativos',
      chapter: 'CAPÍTULO IX – LIMPIEZA Y SANCIONES',
      content: [
        'El arrendatario será responsable de cualquier multa o sanción derivada del uso del vehículo.',
        'En caso de inmovilización, retención o embargo del vehículo por causa imputable al arrendatario, este deberá asumir todos los gastos derivados y el importe diario del alquiler durante el tiempo de indisponibilidad.',
        'Con la firma del contrato, el ARRENDATARIO autoriza expresamente al ARRENDADOR a facilitar sus datos personales a las autoridades competentes para la correcta identificación del conductor responsable.',
        'La gestión administrativa de sanciones podrá generar gastos de tramitación razonables y proporcionados.'
      ]
    },
    {
      number: 24,
      title: 'Errores graves',
      chapter: 'CAPÍTULO IX – LIMPIEZA Y SANCIONES',
      content: [
        '• Introducir combustible en el depósito de agua: Penalización mínima de 2.000 €.',
        '• El vehículo usa combustible DIESEL: En caso de llenar el depósito con otro combustible, el ARRENDATARIO correrá con todos los gastos por los daños ocasionados.',
        '• El vehículo tiene una altura de 2,80 metros: Queda terminantemente prohibido circular por ningún lugar con una altura inferior; en caso de hacerlo, el cliente correrá con todos los gastos ocasionados por los daños y su repercusión.',
        '• Importantísimo: Solo utilizar la bomba de agua cuando el depósito de aguas limpias no esté vacío; en caso contrario la bomba tragará aire y se quemará, dejando al cliente sin agua el resto del viaje, corriendo además con todos los gastos de la reparación.',
        '• El vehículo cuenta con cambio de marchas manual, no cambio automático: En caso de detectar en la entrega que el cliente no sabe conducir un vehículo de estas características, la empresa se reserva el derecho de cancelar la reserva en aras de la seguridad del cliente, el vehículo y terceras partes.',
        'Para evitar estos errores se explicará detalladamente el funcionamiento del vehículo y sus accesorios antes de su entrega.'
      ]
    },

    // CAPÍTULO X – RESOLUCIÓN Y MECANISMOS DE SOLUCIÓN
    {
      number: 25,
      title: 'Limitación de responsabilidad',
      chapter: 'CAPÍTULO X – RESOLUCIÓN Y MECANISMOS DE SOLUCIÓN',
      content: [
        'Si por causas ajenas al ARRENDADOR, tales como avería, accidente u otras circunstancias no imputables al mismo, no fuera posible entregar el vehículo en la fecha acordada, se ofrecerá al cliente: cambio de fechas, vehículo de características similares (si existe disponible), o la devolución íntegra de las cantidades abonadas.',
        'En estos supuestos, el arrendador no será responsable de gastos adicionales, daños indirectos o perjuicios derivados de la imposibilidad de prestación del servicio. Siempre que sea posible, el arrendador informará con la máxima antelación.',
        'Lo anterior se entiende sin perjuicio de los derechos irrenunciables reconocidos al consumidor por la normativa aplicable.'
      ]
    },
    {
      number: 26,
      title: 'Resolución por incumplimiento',
      chapter: 'CAPÍTULO X – RESOLUCIÓN Y MECANISMOS DE SOLUCIÓN',
      content: [
        'El ARRENDADOR podrá resolver de forma inmediata el contrato ante incumplimiento grave, sin derecho a reembolso y con exigencia de daños adicionales.',
        'Se considerarán incumplimientos graves, entre otros: uso fuera del ámbito territorial pactado, conducción bajo sustancias, manipulación técnica, subarrendamiento, ocultación de daños y negativa a devolver el vehículo.',
        'El incumplimiento implicará responsabilidad total del arrendatario.'
      ]
    },
    {
      number: 27,
      title: 'Apropiación indebida',
      chapter: 'CAPÍTULO X – RESOLUCIÓN Y MECANISMOS DE SOLUCIÓN',
      content: [
        'La no devolución del vehículo en la fecha acordada podrá ser considerada apropiación indebida.',
        'Se podrán iniciar acciones legales y activar el sistema de localización.'
      ]
    },
    {
      number: 28,
      title: 'Legislación y jurisdicción',
      chapter: 'CAPÍTULO X – RESOLUCIÓN Y MECANISMOS DE SOLUCIÓN',
      content: [
        'El contrato se rige por la legislación española.',
        'Para consumidores residentes en la Unión Europea, serán competentes los tribunales de su domicilio conforme a la normativa aplicable.'
      ]
    },
    {
      number: 29,
      title: 'Resolución extrajudicial previa',
      chapter: 'CAPÍTULO X – RESOLUCIÓN Y MECANISMOS DE SOLUCIÓN',
      content: [
        'Con carácter previo a cualquier acción judicial, las partes se comprometen a intentar resolver la controversia mediante comunicación escrita y negociación durante un plazo mínimo de 15 días naturales desde la notificación fehaciente del conflicto.',
        'Este compromiso no limita el derecho de las partes a acudir posteriormente a la vía judicial competente.'
      ]
    },
    {
      number: 30,
      title: 'Idioma del contrato',
      chapter: 'CAPÍTULO X – RESOLUCIÓN Y MECANISMOS DE SOLUCIÓN',
      content: [
        'El presente contrato se redacta originalmente en idioma español, que será la versión jurídicamente válida y vinculante entre las partes.',
        'El ARRENDADOR podrá facilitar traducciones del contrato a otros idiomas, incluidos inglés o francés, con carácter meramente informativo y para facilitar la comprensión por parte del ARRENDATARIO.',
        'En caso de discrepancia, contradicción o diferencia de interpretación entre la versión en español y cualquier traducción, prevalecerá en todo caso la versión redactada en idioma español.'
      ]
    },
    {
      number: 31,
      title: 'Protección de datos',
      chapter: 'CAPÍTULO X – RESOLUCIÓN Y MECANISMOS DE SOLUCIÓN',
      content: [
        'Responsable del tratamiento: UTOPIA VAN LIFE S.L., CIF: B24902637, Domicilio: C/ Cristo de los Remedios nº2, Planta 0, Puerta 2, 28703, San Sebastián de los Reyes, Madrid, España. Email: info@utopiavanlife.com, Teléfono: 611 560 916.',
        'Finalidad del tratamiento: Gestionar solicitudes de información, tramitar reservas y servicios contratados, gestionar pagos y facturación, enviar comunicaciones relacionadas con el servicio contratado, enviar comunicaciones comerciales (siempre que exista consentimiento), garantizar la seguridad del servicio y prevenir usos indebidos o fraudulentos, y cumplir obligaciones legales.',
        'Legitimación: La base legal para el tratamiento es: ejecución de contrato, consentimiento del usuario, cumplimiento de obligaciones legales e interés legítimo del responsable (seguridad, prevención de fraude y protección de activos).',
        'Conservación de los datos: Los datos se conservarán durante la relación contractual, durante los plazos legales aplicables (fiscales, contables, etc.) y mientras no se solicite su supresión cuando proceda.',
        'Destinatarios: Los datos podrán ser comunicados a entidades financieras (como CaixaBank) para la gestión de pagos, proveedores tecnológicos necesarios para la prestación del servicio (hosting, plataforma web, herramientas de gestión), herramientas de análisis como Google Analytics y administraciones públicas cuando sea obligatorio. Algunos proveedores pueden estar ubicados fuera del EEE, aplicándose las garantías adecuadas conforme al RGPD.',
        'Derechos del usuario: El usuario puede ejercer sus derechos de acceso, rectificación, supresión, limitación, oposición y portabilidad, así como retirar el consentimiento en cualquier momento, contactando en: info@utopiavanlife.com.',
        'Seguridad: UTOPIA VAN LIFE S.L. aplica medidas técnicas y organizativas adecuadas para garantizar la seguridad, confidencialidad e integridad de los datos personales.'
      ]
    }
  ]
}

export function generateContractData(booking: any, userProfile?: any, camperOverride?: any): ContractData {
  const camperData = camperOverride || booking?.camper || booking?.campers || {}
  const camperSlug = camperData?.slug || camperData?.name || booking?.camper_slug || 'neo'
  const specs = detectCamperModelSpecs(camperSlug)

  const rawBookingId = booking?.id || 'REF-PENDIENTE'
  const shortId = rawBookingId.replace(/-/g, '').substring(0, 8).toUpperCase()
  const contractNumber = `CTR-BOOK-${shortId}`

  const lessor = {
    companyName: 'UTOPIA VAN LIFE SL',
    cif: 'B24902637',
    address: 'C\\ Cristo de los remedios, nº2, Planta 0, Puerta 2',
    city: '28703 San Sebastián de los Reyes, Madrid, España',
    phone: '611 560 916',
    email: 'info@utopiavanlife.com',
    representative: 'ROBERTO ESTEBANEZ BLANCO',
    activity: 'Arrendamiento de vehículos vivienda sin conductor en la isla de Mallorca'
  }

  // Calculate years held for lessee
  let yearsHeld = 2
  if (userProfile?.driver_license_issue_date) {
    const issueDate = new Date(userProfile.driver_license_issue_date)
    if (!isNaN(issueDate.getTime())) {
      const diffMs = Date.now() - issueDate.getTime()
      yearsHeld = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25)))
    }
  }

  const lessee = {
    fullName: userProfile?.full_name || booking?.customer_name || 'Arrendatario Utopia',
    dniNie: userProfile?.dni_nie || 'Pendiente de verificación',
    driverLicenseId: userProfile?.driver_license_id || 'Pendiente',
    driverLicenseIssueDate: userProfile?.driver_license_issue_date || '',
    driverLicenseExpiryDate: userProfile?.driver_license_expiry_date || '',
    yearsHeld,
    address: userProfile?.address || 'No especificada',
    phone: userProfile?.phone || booking?.customer_phone || '+34 000 000 000',
    email: userProfile?.email || booking?.customer_email || 'cliente@ejemplo.com'
  }

  let secondDriver: { fullName: string; dniNie: string; driverLicenseId: string } | undefined
  if (userProfile?.has_second_driver && userProfile?.second_driver_name) {
    secondDriver = {
      fullName: userProfile.second_driver_name,
      dniNie: userProfile.second_driver_dni || 'Pendiente',
      driverLicenseId: userProfile.second_driver_license || 'Pendiente'
    }
  }

  const vehicle = {
    modelName: specs.modelName,
    vehicleType: specs.vehicleType,
    capacity: specs.capacity,
    plateNumber: camperData?.plate_number || (specs.modelKey === 'space' ? '4182-MXP' : '8291-LKN'),
    specsList: specs.specsList
  }

  const bookingDetails = {
    bookingId: rawBookingId,
    startDate: booking?.start_date || new Date().toISOString().split('T')[0],
    endDate: booking?.end_date || new Date().toISOString().split('T')[0],
    pickupTime: booking?.pickup_time || '10:00',
    dropoffTime: booking?.dropoff_time || '18:00',
    pickupLocation: booking?.pickup_location || 'Palma de Mallorca (Aeropuerto PMI / Base Utopia Son Oms)',
    dropoffLocation: booking?.dropoff_location || 'Palma de Mallorca (Aeropuerto PMI / Base Utopia Son Oms)'
  }

  const pricing = {
    totalPrice: Number(booking?.total_price || 0),
    depositAmount: 1000,
    extras: Array.isArray(booking?.extras)
      ? booking.extras
      : (typeof booking?.extras === 'string' ? [booking.extras] : ['Seguro a todo riesgo', 'Menaje completo premium', 'Kit de cama y toallas', '2 Máscaras de snorkel'])
  }

  const articles = getOfficialContractArticles()

  const rgpdText = {
    responsable: 'UTOPIA VAN LIFE S.L.',
    cif: 'B24902637',
    domicilio: 'C/ Cristo de los Remedios nº2, Planta 0, Puerta 2, 28703, San Sebastián de los Reyes, Madrid, España',
    email: 'info@utopiavanlife.com',
    telefono: '611 560 916',
    finalidad: 'Gestionar reservas, servicios contratados, facturación, comunicaciones del servicio y seguridad contractual.',
    legitimacion: 'Ejecución del contrato de alquiler, consentimiento, cumplimiento legal e interés legítimo.',
    conservacion: 'Durante la relación contractual y los plazos legales aplicables (fiscales, contables y de tráfico).',
    destinatarios: 'Entidades financieras (CaixaBank), proveedores tecnológicos (hosting, plataforma), analítica y autoridades públicas competentes.',
    derechos: 'Acceso, rectificación, supresión, limitación, oposición y portabilidad dirigiéndose a info@utopiavanlife.com.',
    contacto: 'info@utopiavanlife.com'
  }

  const clauses = articles.map(a => `${a.number}. ${a.title.toUpperCase()}: ${a.content.join(' ')}`)

  return {
    contractNumber,
    generatedAt: new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    lessor,
    lessee,
    secondDriver,
    vehicle,
    booking: bookingDetails,
    pricing,
    articles,
    rgpdText,
    clauses
  }
}
