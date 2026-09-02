export interface CamperModelSpecs {
  modelKey: 'neo' | 'space' | 'general'
  modelName: string
  vehicleType: string
  lengthMeters: number
  capacity: string
  layoutDescription: string
  specsList: string[]
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
  }
  lessee: {
    fullName: string
    dniNie: string
    driverLicenseId: string
    driverLicenseIssueDate: string
    driverLicenseExpiryDate: string
    address: string
    phone: string
    email: string
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
  clauses: string[]
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

export function generateContractData(booking: any, userProfile?: any, camperOverride?: any): ContractData {
  const camperData = camperOverride || booking?.camper || booking?.campers || {}
  const camperSlug = camperData?.slug || camperData?.name || booking?.camper_slug || 'neo'
  const specs = detectCamperModelSpecs(camperSlug)

  const rawBookingId = booking?.id || 'REF-PENDIENTE'
  const shortId = rawBookingId.replace(/-/g, '').substring(0, 8).toUpperCase()
  const contractNumber = `CTR-BOOK-${shortId}`

  const lessor = {
    companyName: 'Utopia Van Life S.L.',
    cif: 'B-72891245',
    address: 'Carrer Son Oms, s/n',
    city: '07610 Palma de Mallorca, Illes Balears (España)',
    phone: '+34 611 560 916',
    email: 'administracion@utopiavanlife.com'
  }

  const lessee = {
    fullName: userProfile?.full_name || booking?.customer_name || 'Arrendatario Utopia',
    dniNie: userProfile?.dni_nie || 'Pendiente de verificación',
    driverLicenseId: userProfile?.driver_license_id || 'Pendiente',
    driverLicenseIssueDate: userProfile?.driver_license_issue_date || '',
    driverLicenseExpiryDate: userProfile?.driver_license_expiry_date || '',
    address: userProfile?.address || 'No especificada',
    phone: userProfile?.phone || booking?.customer_phone || '+34 000 000 000',
    email: userProfile?.email || booking?.customer_email || 'cliente@ejemplo.com'
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

  const clauses = [
    '1. OBJETO DEL CONTRATO: La parte arrendadora cede en régimen de arrendamiento de temporada sin conductor el vehículo camper detallado en las condiciones particulares, en perfecto estado de funcionamiento, limpieza y conservación.',
    '2. FIANZA Y COBERTURA: El arrendatario deposita una fianza obligatoria de 1.000 € antes de la entrega del vehículo mediante tarjeta bancaria o Bizum. Dicha fianza responderá de posibles daños, franquicia del seguro, multas o desperfectos imputables al arrendatario.',
    '3. KILOMETRAJE Y ÁMBITO TERRITORIAL: El alquiler incluye 150 km diarios acumulables durante el periodo contratado. El vehículo únicamente podrá circular dentro de la isla de Mallorca (Illes Balears). Queda expresamente prohibido el traslado marítimo o embarque a otras islas o península sin autorización previa por escrito.',
    '4. REQUISITOS DEL CONDUCTOR: El conductor debe disponer de carnet de conducir clase B vigente con al menos 2 años de antigüedad y ser mayor de 23 años. Los conductores noveles requerirán autorización y validación expresa.',
    '5. EQUIPAMIENTO Y SISTEMAS: El vehículo se entrega equipado con sistema eléctrico Victron de litio (540Ah), energía solar 400W, aire acondicionado 12V Dometic, calefacción diésel y depósitos de agua (limpias y grises). El arrendatario se compromete a vaciar las aguas grises y negras exclusivamente en puntos autorizados.',
    '6. PROHIBICIONES EXPRESAS: Queda terminantemente prohibido fumar en el interior del vehículo, circular por caminos no asfaltados de riesgo o pistas forestales no aptas, subarrendar el vehículo o transportar sustancias peligrosas.',
    '7. DEVOLUCIÓN DEL VEHÍCULO: La camper se devolverá en el mismo estado de limpieza y con el mismo nivel de combustible con el que fue entregada. El retraso no autorizado en la entrega conllevará una penalización económica según las tarifas vigentes.'
  ]

  return {
    contractNumber,
    generatedAt: new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    lessor,
    lessee,
    vehicle,
    booking: bookingDetails,
    pricing,
    clauses
  }
}
