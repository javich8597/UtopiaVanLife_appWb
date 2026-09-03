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
        'Vehículo base: Fiat Ducato L3H2 (Longitud 5.99m / Altura 2.52m)',
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
      'Vehículo base: Fiat Ducato L3H2 (Longitud 5.99m / Altura 2.52m)',
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

export function getOfficialContractArticles(): ContractArticle[] {
  return [
    {
      number: 1,
      title: 'Identificación del Arrendador',
      chapter: 'CAPÍTULO I – DISPOSICIONES GENERALES',
      content: [
        'UTOPIA VAN LIFE SL, CIF B24902637, con domicilio social en C\\ Cristo de los remedios, nº2, Planta 0, Puerta 2, CP.: 28703 San Sebastián de los Reyes, Madrid, España, en adelante "el ARRENDADOR", desarrolla la actividad de arrendamiento de vehículos vivienda sin conductor en la isla de Mallorca.',
        'Las presentes Condiciones Generales regulan íntegramente la reserva y el contrato de arrendamiento formalizado con el cliente (en adelante, el "ARRENDATARIO").'
      ]
    },
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
        'Condiciones de Cancelación:',
        '• Más de 30 días antes del inicio del alquiler: Se devolverá íntegramente el importe abonado en concepto de reserva.',
        '• Entre 29 y 15 días antes del inicio del alquiler: Se retendrá el 50% del importe de la reserva.',
        '• 14 días o menos antes del inicio del alquiler: Se retendrá el 100% del importe de la reserva.',
        'En caso de no presentación del cliente en la fecha y hora acordadas, se aplicará la misma condición que para cancelaciones de menos de 14 días.',
        'Cambio de fechas: Podrás solicitar un único cambio de fechas sin coste con más de 15 días de antelación, sujeto a disponibilidad. Importante: el cambio de fechas no modifica ni reinicia las condiciones de cancelación originales de la reserva.'
      ]
    },
    {
      number: 4,
      title: 'Conductores autorizados',
      chapter: 'CAPÍTULO III – CONDUCTORES Y USO',
      content: [
        'El conductor deberá cumplir obligatoriamente los siguientes requisitos:',
        '• Edad mínima: 25 años.',
        '• Permiso de conducir tipo B en vigor.',
        '• Antigüedad mínima de carné: 2 años.',
        'Solo podrán conducir las personas expresamente autorizadas e identificadas en el contrato. El incumplimiento de estos requisitos implicará la pérdida de cobertura del seguro en daños propios, siendo el arrendatario responsable de la totalidad de los daños ocasionados.'
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
        '• Circular por caminos no asfaltados no aptos para turismos o de riesgo evidente.',
        '• Acceder a pistas forestales, agrícolas o zonas de difícil acceso.',
        '• Circular fuera de vías accesibles a servicios de asistencia en carretera.',
        '• Transportar más ocupantes de los homologados y autorizados.',
        '• Subarrendar el vehículo o destinarlo a actividades comerciales o ilícitas.',
        'El incumplimiento de estas condiciones implicará la asunción total de daños, costes de rescate y responsabilidades por parte del arrendatario.'
      ]
    },
    {
      number: 6,
      title: 'Entrega y verificación inicial',
      chapter: 'CAPÍTULO IV – ENTREGA, FIANZA Y DEVOLUCIÓN',
      content: [
        'El arrendatario deberá recibir instrucciones de uso del vehículo. Para ello se pondrá a disposición del ARRENDATARIO videos explicativos detallados de cada accesorio integrado en el vehículo, quien con la firma de este contrato da fe de su visualización y comprensión previa a la entrega.',
        'Participar activamente en el checklist de entrega y devolución.',
        'Aceptación de un video del estado del vehículo in situ, tanto interior como exterior, que será válido como prueba documental.',
        'El arrendatario declara recibir el vehículo en perfecto estado, salvo incidencias reflejadas en el checklist, renunciando a reclamaciones posteriores no comunicadas en el momento de la entrega.',
        'Para la retirada del vehículo será obligatorio presentar DNI/pasaporte original y permiso de conducir original en vigor.'
      ]
    },
    {
      number: 7,
      title: 'Fianza',
      chapter: 'CAPÍTULO IV – ENTREGA, FIANZA Y DEVOLUCIÓN',
      content: [
        'A la firma del contrato, previo a la retirada del vehículo, se depositará una fianza mediante tarjeta bancaria por importe de 1.000 €.',
        'La fianza garantiza la franquicia del seguro, posibles daños causados durante el alquiler, multas o sanciones atribuibles al arrendatario, combustible faltante, limpieza especial o retraso en la devolución.',
        'La fianza se devolverá tras la revisión completa del vehículo en un plazo máximo de 48 horas hábiles tras la finalización del alquiler.'
      ]
    },
    {
      number: 8,
      title: 'Devolución del vehículo',
      chapter: 'CAPÍTULO IV – ENTREGA, FIANZA Y DEVOLUCIÓN',
      content: [
        'El vehículo se devolverá en el mismo estado en el que fue entregado, con el depósito de combustible lleno y depósitos de aguas grises y WC químico vaciados y limpios.',
        'Horario de devolución: La entrega posterior a la hora acordada sin autorización previa conllevará una penalización económica de 30 €/hora o fracción.',
        'Limpieza: El vehículo debe devolverse en condiciones razonables de limpieza. En caso de suciedad extraordinaria, barro severo, manchas en tapicería o residuos no retirados, se aplicará un recargo de limpieza de 80 € a 150 € deducible de la fianza.'
      ]
    },
    {
      number: 9,
      title: 'Kilometraje y ámbito territorial',
      chapter: 'CAPÍTULO V – CONDICIONES DE CIRCULACIÓN',
      content: [
        'El alquiler incluye 150 km diarios acumulables durante todo el periodo contratado.',
        'Ámbito territorial: El vehículo únicamente podrá circular dentro de la isla de Mallorca (Illes Balears). Queda terminantemente prohibido el traslado marítimo en ferry o embarque a otras islas o a la península sin autorización expresa y por escrito de UTOPIA VAN LIFE SL.',
        'El coste del kilómetro adicional no incluido se facturará a 0,30 €/km.'
      ]
    },
    {
      number: 10,
      title: 'Seguro y coberturas',
      chapter: 'CAPÍTULO VI – SEGURO Y COBERTURAS',
      content: [
        'El vehículo dispone de seguro a todo riesgo con franquicia de 1.000 € por siniestro.',
        'El seguro cubre responsabilidad civil obligatoria, daños propios al vehículo con franquicia y asistencia en carretera 24 horas en Mallorca.',
        'Exclusiones del seguro: Daños producidos por conducción temeraria o bajo los efectos de alcohol, drogas o estupefacientes; daños derivados de circular por pistas no asfaltadas, arena o agua de mar; pinchazos o daños en neumáticos no atribuibles a defecto; pérdida o rotura de llaves; y errores en el repostaje de combustible.'
      ]
    },
    {
      number: 11,
      title: 'Infracciones de tráfico y responsabilidades',
      chapter: 'CAPÍTULO VII – RESPONSABILIDADES',
      content: [
        'El arrendatario es el único responsable de todas las infracciones de tráfico cometidas durante el periodo de alquiler (velocidad, estacionamiento, accesos restringidos ACIRE, etc.).',
        'UTOPIA VAN LIFE SL identificará formalmente al conductor ante las autoridades competentes. Por la gestión administrativa de cada notificación de sanción se aplicará un cargo de 25 € en concepto de gastos de tramitación.'
      ]
    },
    {
      number: 12,
      title: 'Prohibición expresa de fumar, fiestas y mascotas',
      chapter: 'CAPÍTULO VIII – NORMAS DE CONVIVENCIA Y VEHÍCULO',
      content: [
        'Queda terminantemente prohibido fumar o vapear en el interior del vehículo. El incumplimiento supondrá una penalización directa de 200 € para higienización con generador de ozono y tratamiento de tapicerías.',
        'Queda prohibido el uso del vehículo para fiestas, despedidas de soltero, macroeventos o cualquier actividad que comprometa la integridad del vehículo.',
        'Mascotas: Solo se permiten animales de compañía bajo solicitud previa y autorización expresa por escrito, con suplemento de limpieza.'
      ]
    },
    {
      number: 13,
      title: 'Averías mecánicas y asistencia',
      chapter: 'CAPÍTULO IX – ASISTENCIA Y MANTENIMIENTO',
      content: [
        'En caso de avería, luz de advertencia en el cuadro de mandos o accidente, el cliente debe detener el vehículo en lugar seguro y avisar inmediatamente a UTOPIA VAN LIFE SL y al teléfono de asistencia 24h facilitado.',
        'Queda prohibida cualquier reparación o intervención mecánica por cuenta propia sin autorización previa de la empresa.'
      ]
    },
    {
      number: 14,
      title: 'Resolución anticipada',
      chapter: 'CAPÍTULO X – RESOLUCIÓN CONTRACTUAL',
      content: [
        'El arrendador se reserva el derecho a rescindir el contrato de forma inmediata y retirar el vehículo sin reembolso en caso de uso negligente grave, conducción no autorizada, embriaguez o reiterado incumplimiento de las normas de circulación y del presente contrato.'
      ]
    },
    {
      number: 15,
      title: 'Legislación aplicable y jurisdicción',
      chapter: 'CAPÍTULO XI – JURISDICCIÓN',
      content: [
        'El presente contrato se rige por la legislación española. Para cualquier controversia derivada del mismo, las partes se someten expresamente a los Juzgados y Tribunales de Palma de Mallorca (Illes Balears), con renuncia a cualquier otro fuero que pudiera corresponderles.'
      ]
    },
    {
      number: 16,
      title: 'Validez y perfección del contrato',
      chapter: 'CAPÍTULO XII – FORMALIZACIÓN',
      content: [
        'La firma digital estampada en el presente documento, unida a los registros electrónicos de confirmación, tiene plena validez jurídica vinculante conforme a la Ley 6/2020 de servicios electrónicos de confianza y el Reglamento (UE) 910/2014 (eIDAS).'
      ]
    },
    {
      number: 17,
      title: 'Protección de Datos de Carácter Personal (RGPD)',
      chapter: 'CAPÍTULO XIII – PRIVACIDAD Y PROTECCIÓN DE DATOS',
      content: [
        'Responsable del tratamiento: UTOPIA VAN LIFE SL, CIF B24902637, C\\ Cristo de los remedios, nº2, Planta 0, Puerta 2, 28703 San Sebastián de los Reyes, Madrid.',
        'Finalidad: Gestión integral de la relación contractual, emisión de facturación, cumplimiento legal y seguro del vehículo.',
        'Legitimación: Ejecución de contrato de arrendamiento y cumplimiento de obligaciones legales.',
        'Conservación: Durante la vigencia del contrato y plazos legales tributarios y de tráfico.',
        'Derechos: Acceso, rectificación, supresión, limitación y portabilidad a través de administracion@utopiavanlife.com.'
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
    phone: '+34 611 560 916',
    email: 'administracion@utopiavanlife.com',
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
    responsable: 'UTOPIA VAN LIFE SL (CIF B24902637)',
    finalidad: 'Ejecución del contrato de alquiler de autocaravana, gestión de seguro, facturación y contacto.',
    legitimacion: 'Ejecución de contrato de arrendamiento y cumplimiento de obligaciones legales aplicables.',
    conservacion: 'Durante la relación contractual y los plazos legales tributarios y de responsabilidades administrativas.',
    destinatarios: 'Compañía aseguradora Allianz, entidades financieras y autoridades públicas cuando sea legalmente exigible.',
    derechos: 'Acceso, rectificación, supresión, limitación y oposición dirigiendo escrito a administracion@utopiavanlife.com.',
    contacto: 'administracion@utopiavanlife.com'
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
