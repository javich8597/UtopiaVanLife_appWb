/**
 * Motor de Generación de XML para SES.HOSPEDAJES / Real Decreto 933/2021
 * Plataforma del Ministerio del Interior - Comunicación de Alquiler de Vehículos
 *
 * Flota Camper: NEO y SPACE (Utopia Van Life - Palma de Mallorca)
 */

export interface VehicleFleetInfo {
  modelKey: 'SPACE' | 'NEO'
  categoria: string
  tipo: string
  marca: string
  modelo: string
  matricula: string
  numeroBastidor: string
  color: string
}

/**
 * Especificaciones de flota oficial registradas ante las autoridades
 */
export const FLEET_VEHICLES: Record<'SPACE' | 'NEO', VehicleFleetInfo> = {
  SPACE: {
    modelKey: 'SPACE',
    categoria: 'Vehículo vivienda',
    tipo: 'CAMPER',
    marca: 'Fiat',
    modelo: 'Ducato',
    matricula: '4618NHX',
    numeroBastidor: 'ZFA250006SG060635',
    color: 'GRIS',
  },
  NEO: {
    modelKey: 'NEO',
    categoria: 'Vehículo vivienda',
    tipo: 'CAMPER',
    marca: 'Fiat',
    modelo: 'Ducato',
    matricula: '4630NHX',
    numeroBastidor: 'ZFA250003SMC13122',
    color: 'GRIS',
  },
}

/**
 * Base de operaciones y entrega oficial de Utopia Van Life en Mallorca
 */
export const SON_OMS_LOCATION = {
  direccion: 'Carrer del Camp Franc, 8',
  direccionComplementaria: 'Poligono Son Oms',
  codigoMunicipio: '07040',
  codigoPostal: '07199',
  pais: 'ESP',
}

/**
 * Saneamiento seguro de entidades XML (&, <, >, ", ')
 */
export function escapeXml(unsafe?: string | number | null): string {
  if (unsafe === null || unsafe === undefined) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * División inteligente de nombre completo en nombre de pila y dos apellidos
 */
export function splitSpanishName(fullName?: string | null): {
  nombre: string
  apellido1: string
  apellido2?: string
} {
  if (!fullName || !fullName.trim()) {
    return {
      nombre: 'Nombre',
      apellido1: 'Apellido1',
      apellido2: 'Apellido2',
    }
  }

  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 1) {
    return {
      nombre: parts[0],
      apellido1: parts[0],
    }
  }

  if (parts.length === 2) {
    return {
      nombre: parts[0],
      apellido1: parts[1],
    }
  }

  if (parts.length === 3) {
    return {
      nombre: parts[0],
      apellido1: parts[1],
      apellido2: parts[2],
    }
  }

  // Si hay 4 o más partes (ej. "Juan Carlos Pérez Gómez")
  const apellido2 = parts[parts.length - 1]
  const apellido1 = parts[parts.length - 2]
  const nombre = parts.slice(0, parts.length - 2).join(' ')
  return {
    nombre,
    apellido1,
    apellido2,
  }
}

/**
 * Detección del tipo de documento según formato (NIF, NIE, PAS, OTR)
 */
export function detectTipoDocumento(docNumber?: string | null): 'NIF' | 'NIE' | 'PAS' | 'OTR' {
  if (!docNumber) return 'NIF'
  const clean = docNumber.trim().toUpperCase()
  if (/^[0-9]{8}[A-Z]$/.test(clean)) return 'NIF'
  if (/^[XYZ][0-9]{7}[A-Z]$/.test(clean)) return 'NIE'
  if (/^[A-Z0-9]{6,12}$/.test(clean) && !/^[0-9]+$/.test(clean)) return 'PAS'
  return 'NIF'
}

/**
 * Obtiene el offset de huso horario oficial de Madrid (Europe/Madrid) para una fecha
 * Devuelve formato ISO "+01:00" o "+02:00" según horario de invierno o verano
 */
export function getMadridTimezoneOffset(dateStr: string): string {
  try {
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
    const d = new Date(`${cleanDate}T12:00:00Z`)
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      timeZoneName: 'longOffset',
    })
    const parts = dtf.formatToParts(d)
    const tzPart = parts.find((p) => p.type === 'timeZoneName')
    if (tzPart && tzPart.value) {
      const match = tzPart.value.match(/GMT([+-]\d{2}:\d{2})/)
      if (match) return match[1]
      const matchShort = tzPart.value.match(/GMT([+-])(\d+)/)
      if (matchShort) {
        const sign = matchShort[1]
        const hours = matchShort[2].padStart(2, '0')
        return `${sign}${hours}:00`
      }
    }
  } catch {
    // fallback seguro
  }
  return '+01:00'
}

/**
 * Formatea una fecha en formato XML con offset de huso horario (YYYY-MM-DD+01:00)
 */
export function formatDateWithOffset(
  dateVal?: string | Date | null,
  fallback = '2026-11-04'
): string {
  if (!dateVal) {
    const offset = getMadridTimezoneOffset(fallback)
    return `${fallback}${offset}`
  }

  let datePart = fallback
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/(\d{4}-\d{2}-\d{2})/)
    if (match) datePart = match[1]
  } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const y = dateVal.getFullYear()
    const m = String(dateVal.getMonth() + 1).padStart(2, '0')
    const d = String(dateVal.getDate()).padStart(2, '0')
    datePart = `${y}-${m}-${d}`
  }

  const offset = getMadridTimezoneOffset(datePart)
  return `${datePart}${offset}`
}

/**
 * Formatea fecha y hora en formato XML (YYYY-MM-DDTHH:mm:ss+01:00)
 */
export function formatDateTimeWithOffset(
  dateVal?: string | Date | null,
  timeVal?: string | null,
  fallbackTime = '12:00:00'
): string {
  let datePart = '2026-11-04'
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/(\d{4}-\d{2}-\d{2})/)
    if (match) datePart = match[1]
  } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const y = dateVal.getFullYear()
    const m = String(dateVal.getMonth() + 1).padStart(2, '0')
    const d = String(dateVal.getDate()).padStart(2, '0')
    datePart = `${y}-${m}-${d}`
  }

  let cleanTime = fallbackTime
  if (timeVal && timeVal.trim()) {
    const raw = timeVal.trim()
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(raw)) {
      const [h, m, s] = raw.split(':')
      cleanTime = `${h.padStart(2, '0')}:${m}:${s}`
    } else if (/^\d{1,2}:\d{2}$/.test(raw)) {
      const [h, m] = raw.split(':')
      cleanTime = `${h.padStart(2, '0')}:${m}:00`
    }
  }

  const offset = getMadridTimezoneOffset(datePart)
  return `${datePart}T${cleanTime}${offset}`
}

/**
 * Extrae dos dígitos para día y dos para mes (DDMM) de una fecha
 */
export function extractDDMM(dateVal?: string | Date | null, fallback = '0111'): string {
  if (!dateVal) return fallback
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const month = match[2].padStart(2, '0')
      const day = match[3].padStart(2, '0')
      return `${day}${month}`
    }
  }
  const d = new Date(dateVal)
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${day}${month}`
  }
  return fallback
}

/**
 * Genera la referencia oficial de contrato para SES.HOSPEDAJES
 * Formato: UVL-[MODELO]-[DDMM_INI]-[DDMM_FIN]-[NUM_RESERVA]
 * Ejemplo: UVL-SPACE-0111-0711-12
 */
export function generateSesReference(booking: any, camper?: any): string {
  // 1. Modelo ('SPACE' o 'NEO')
  const camperIdentifier = (
    camper?.name ||
    camper?.slug ||
    booking?.camper_slug ||
    booking?.camper?.name ||
    booking?.campers?.name ||
    ''
  ).toUpperCase()

  const modelo: 'SPACE' | 'NEO' = camperIdentifier.includes('SPACE') ? 'SPACE' : 'NEO'

  // 2. DDMM_INI (start_date)
  const ddmmIni = extractDDMM(booking?.start_date, '0111')

  // 3. DDMM_FIN (end_date)
  const ddmmFin = extractDDMM(booking?.end_date, '0711')

  // 4. NUM_RESERVA
  let numReserva = '12'
  const explicitNumber =
    booking?.booking_number ||
    booking?.sequence_number ||
    booking?.num_reserva ||
    booking?.bookingNumber

  if (explicitNumber !== undefined && explicitNumber !== null && String(explicitNumber).trim() !== '') {
    numReserva = String(explicitNumber).trim()
  } else if (booking?.reference && typeof booking.reference === 'string' && booking.reference.trim() !== '') {
    numReserva = booking.reference.trim()
  } else if (booking?.id) {
    const idStr = String(booking.id).trim()
    // Si es un número o código corto (ej. "12", "101", "B42")
    if (idStr.length <= 6) {
      numReserva = idStr
    } else {
      // Si es un UUID o código largo, derivar un correlativo limpio de 4 caracteres
      numReserva = idStr.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '12'
    }
  }

  return `UVL-${modelo}-${ddmmIni}-${ddmmFin}-${numReserva}`
}

/**
 * Alias de compatibilidad para buildSesHospedajesReference
 */
export const buildSesHospedajesReference = generateSesReference

export interface SesXmlOptions {
  includeXmlDeclaration?: boolean
  includeSecondDriver?: boolean
}

/**
 * Genera el XML oficial para comunicación de alquiler de vehículos con el Ministerio del Interior
 * (SES.HOSPEDAJES / Real Decreto 933/2021)
 */
export function generateSesHospedajesXml(
  booking: any,
  user: any,
  camper: any,
  options?: SesXmlOptions
): { reference: string; xml: string; fileName: string } {
  // 1. Referencia oficial y nombre de archivo
  const reference = generateSesReference(booking, camper)
  const fileName = `${reference}.xml`

  // 2. Identificar vehículo oficial
  const camperIdentifier = (
    camper?.name ||
    camper?.slug ||
    booking?.camper_slug ||
    booking?.camper?.name ||
    booking?.campers?.name ||
    ''
  ).toUpperCase()
  const modeloKey: 'SPACE' | 'NEO' = camperIdentifier.includes('SPACE') ? 'SPACE' : 'NEO'
  const fleet = FLEET_VEHICLES[modeloKey]

  // 3. Fechas del contrato y reserva
  const fechaContratoBase = booking?.contract_signed_at || booking?.created_at || booking?.start_date
  const fechaContrato = formatDateWithOffset(fechaContratoBase, '2026-11-04')

  const pickupTime = booking?.pickup_time || '12:00:00'
  const dropoffTime = booking?.dropoff_time || '11:00:00'
  const fechaRecogida = formatDateTimeWithOffset(booking?.start_date, pickupTime, '12:00:00')
  const fechaDevolucion = formatDateTimeWithOffset(booking?.end_date, dropoffTime, '11:00:00')

  // 4. Pago
  const fechaPagoBase = booking?.paid_at || booking?.created_at || booking?.start_date
  const fechaPago = formatDateWithOffset(fechaPagoBase, '2026-11-04')
  const tipoPago = 'TARJT'
  const medioPago = booking?.payment_method || 'Redsys TPV'
  const titularPago = booking?.customer_name || user?.full_name || 'Nombre Cliente'

  // 5. Datos del Titular y Conductor Principal
  const fullName = user?.full_name || booking?.customer_name || 'Nombre Apellido1 Apellido2'
  const names = splitSpanishName(fullName)

  const docNumber = (
    user?.dni_nie ||
    booking?.customer_dni ||
    user?.driver_license_id ||
    '00000000T'
  ).replace(/[\s-]/g, '').toUpperCase()

  const tipoDocumento = detectTipoDocumento(docNumber)
  const fechaNacimiento = formatDateWithOffset(
    user?.birth_date || booking?.customer_birth_date,
    '1990-01-01'
  )
  const nacionalidad = (user?.nationality || booking?.nationality || 'ESP').toUpperCase().slice(0, 3)
  const sexo = (user?.sex || user?.gender || booking?.customer_gender || 'H').toUpperCase().slice(0, 1)

  // Dirección del cliente
  const rawAddress = user?.address || booking?.customer_address || 'Direccion'
  let codigoPostal = user?.postal_code || booking?.postal_code || ''
  if (!codigoPostal && typeof rawAddress === 'string') {
    const cpMatch = rawAddress.match(/\b(\d{5})\b/)
    if (cpMatch) codigoPostal = cpMatch[1]
  }
  if (!codigoPostal) codigoPostal = '07199'

  const codigoMunicipio = user?.municipality_code || booking?.municipality_code || '07040'
  const pais = (user?.country_code || booking?.country_code || 'ESP').toUpperCase().slice(0, 3)
  const telefono = (user?.phone || booking?.customer_phone || '600000000').replace(/\s+/g, '')
  const correo = user?.email || booking?.customer_email || 'email@example.com'

  // Permiso de conducir del conductor principal
  const permisoNumero = (
    user?.driver_license_id ||
    docNumber ||
    '00000000T'
  ).replace(/[\s-]/g, '').toUpperCase()

  const permisoValidez = formatDateWithOffset(
    user?.driver_license_expiry_date || booking?.driver_license_expiry_date,
    '2030-01-01'
  )

  // 6. Segundo Conductor opcional (rol CS)
  let secondDriverXml = ''
  const hasSecondDriver =
    options?.includeSecondDriver !== false &&
    (user?.has_second_driver ||
      (Array.isArray(booking?.passengers) &&
        booking.passengers.some((p: any) => p?.isSecondDriver)))

  if (hasSecondDriver) {
    let secName = user?.second_driver_name || ''
    let secDni = user?.second_driver_dni || ''
    let secLicense = user?.second_driver_license || ''
    let secBirth = ''
    let secValidez = '2030-01-01'

    if (Array.isArray(booking?.passengers)) {
      const passengerSecond = booking.passengers.find((p: any) => p?.isSecondDriver)
      if (passengerSecond) {
        secName = secName || passengerSecond.fullName || ''
        secDni = secDni || passengerSecond.dniNie || ''
        secBirth = passengerSecond.birthDate || ''
        secLicense = secLicense || secDni
      }
    }

    if (secName) {
      const secSplit = splitSpanishName(secName)
      const secDoc = (secDni || '00000000T').replace(/[\s-]/g, '').toUpperCase()
      const secTipoDoc = detectTipoDocumento(secDoc)
      const secFechaNac = formatDateWithOffset(secBirth, '1992-01-01')
      const secValidezFormatted = formatDateWithOffset(secValidez, '2030-01-01')

      secondDriverXml = `
      <persona>
        <datosPersona>
          <rol>CS</rol>
          <nombre>${escapeXml(secSplit.nombre)}</nombre>
          <apellido1>${escapeXml(secSplit.apellido1)}</apellido1>
${secSplit.apellido2 ? `          <apellido2>${escapeXml(secSplit.apellido2)}</apellido2>\n` : ''}          <tipoDocumento>${escapeXml(secTipoDoc)}</tipoDocumento>
          <numeroDocumento>${escapeXml(secDoc)}</numeroDocumento>
          <fechaNacimiento>${escapeXml(secFechaNac)}</fechaNacimiento>
          <nacionalidad>ESP</nacionalidad>
          <sexo>H</sexo>
          <direccion>
            <direccion>${escapeXml(rawAddress)}</direccion>
            <codigoMunicipio>${escapeXml(codigoMunicipio)}</codigoMunicipio>
            <codigoPostal>${escapeXml(codigoPostal)}</codigoPostal>
            <pais>${escapeXml(pais)}</pais>
          </direccion>
          <telefono>${escapeXml(telefono)}</telefono>
          <correo>${escapeXml(correo)}</correo>
        </datosPersona>
        <permisoConducir>
          <tipo>B</tipo>
          <validez>${escapeXml(secValidezFormatted)}</validez>
          <numero>${escapeXml(secLicense || secDoc)}</numero>
        </permisoConducir>
      </persona>`
    }
  }

  // 7. Ensamblado del cuerpo XML según plantilla oficial del Ministerio
  const xmlBody = `<ns2:peticion xmlns:ns2="http://www.neg.hospedajes.mir.es/altaAlquilerVehiculo">
  <solicitud>
    <comunicacion>
      <contrato>
        <referencia>${escapeXml(reference)}</referencia>
        <fechaContrato>${escapeXml(fechaContrato)}</fechaContrato>
        <fechaRecogida>${escapeXml(fechaRecogida)}</fechaRecogida>
        <direccionRecogida>
          <direccion>${escapeXml(SON_OMS_LOCATION.direccion)}</direccion>
          <direccionComplementaria>${escapeXml(SON_OMS_LOCATION.direccionComplementaria)}</direccionComplementaria>
          <codigoMunicipio>${escapeXml(SON_OMS_LOCATION.codigoMunicipio)}</codigoMunicipio>
          <codigoPostal>${escapeXml(SON_OMS_LOCATION.codigoPostal)}</codigoPostal>
          <pais>${escapeXml(SON_OMS_LOCATION.pais)}</pais>
        </direccionRecogida>
        <direccionDevolucion>
          <direccion>${escapeXml(SON_OMS_LOCATION.direccion)}</direccion>
          <direccionComplementaria>${escapeXml(SON_OMS_LOCATION.direccionComplementaria)}</direccionComplementaria>
          <codigoMunicipio>${escapeXml(SON_OMS_LOCATION.codigoMunicipio)}</codigoMunicipio>
          <codigoPostal>${escapeXml(SON_OMS_LOCATION.codigoPostal)}</codigoPostal>
          <pais>${escapeXml(SON_OMS_LOCATION.pais)}</pais>
        </direccionDevolucion>
        <fechaDevolucion>${escapeXml(fechaDevolucion)}</fechaDevolucion>
        <pago>
          <tipoPago>${escapeXml(tipoPago)}</tipoPago>
          <fechaPago>${escapeXml(fechaPago)}</fechaPago>
          <medioPago>${escapeXml(medioPago)}</medioPago>
          <titular>${escapeXml(titularPago)}</titular>
        </pago>
      </contrato>
      <vehiculo>
        <categoria>${escapeXml(fleet.categoria)}</categoria>
        <tipo>${escapeXml(fleet.tipo)}</tipo>
        <marca>${escapeXml(fleet.marca)}</marca>
        <modelo>${escapeXml(fleet.modelo)}</modelo>
        <matricula>${escapeXml(fleet.matricula)}</matricula>
        <numeroBastidor>${escapeXml(fleet.numeroBastidor)}</numeroBastidor>
        <color>${escapeXml(fleet.color)}</color>
      </vehiculo>
      <persona>
        <datosPersona>
          <rol>TI</rol>
          <nombre>${escapeXml(names.nombre)}</nombre>
          <apellido1>${escapeXml(names.apellido1)}</apellido1>
${names.apellido2 ? `          <apellido2>${escapeXml(names.apellido2)}</apellido2>\n` : ''}          <tipoDocumento>${escapeXml(tipoDocumento)}</tipoDocumento>
          <numeroDocumento>${escapeXml(docNumber)}</numeroDocumento>
          <fechaNacimiento>${escapeXml(fechaNacimiento)}</fechaNacimiento>
          <nacionalidad>${escapeXml(nacionalidad)}</nacionalidad>
          <sexo>${escapeXml(sexo)}</sexo>
          <direccion>
            <direccion>${escapeXml(rawAddress)}</direccion>
            <codigoMunicipio>${escapeXml(codigoMunicipio)}</codigoMunicipio>
            <codigoPostal>${escapeXml(codigoPostal)}</codigoPostal>
            <pais>${escapeXml(pais)}</pais>
          </direccion>
          <telefono>${escapeXml(telefono)}</telefono>
          <correo>${escapeXml(correo)}</correo>
        </datosPersona>
      </persona>
      <persona>
        <datosPersona>
          <rol>CP</rol>
          <nombre>${escapeXml(names.nombre)}</nombre>
          <apellido1>${escapeXml(names.apellido1)}</apellido1>
${names.apellido2 ? `          <apellido2>${escapeXml(names.apellido2)}</apellido2>\n` : ''}          <tipoDocumento>${escapeXml(tipoDocumento)}</tipoDocumento>
          <numeroDocumento>${escapeXml(docNumber)}</numeroDocumento>
          <fechaNacimiento>${escapeXml(fechaNacimiento)}</fechaNacimiento>
          <nacionalidad>${escapeXml(nacionalidad)}</nacionalidad>
          <sexo>${escapeXml(sexo)}</sexo>
          <direccion>
            <direccion>${escapeXml(rawAddress)}</direccion>
            <codigoMunicipio>${escapeXml(codigoMunicipio)}</codigoMunicipio>
            <codigoPostal>${escapeXml(codigoPostal)}</codigoPostal>
            <pais>${escapeXml(pais)}</pais>
          </direccion>
          <telefono>${escapeXml(telefono)}</telefono>
          <correo>${escapeXml(correo)}</correo>
        </datosPersona>
        <permisoConducir>
          <tipo>B</tipo>
          <validez>${escapeXml(permisoValidez)}</validez>
          <numero>${escapeXml(permisoNumero)}</numero>
        </permisoConducir>
      </persona>${secondDriverXml}
    </comunicacion>
  </solicitud>
</ns2:peticion>`

  const xml = options?.includeXmlDeclaration
    ? `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`
    : xmlBody

  return {
    reference,
    xml,
    fileName,
  }
}
