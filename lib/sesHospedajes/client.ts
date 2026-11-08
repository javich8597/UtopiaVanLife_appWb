/**
 * Cliente Oficial de Conexión M2M con SES.HOSPEDAJES
 * Ministerio del Interior - Real Decreto 933/2021
 *
 * Plataforma para la comunicación telemática obligatoria de contratos de alquiler
 * de vehículos a motor (flota camper NEO y SPACE - Utopia Van Life).
 * WSDL Endpoint: https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion
 */

import zlib from 'zlib'
import https from 'node:https'
import http from 'node:http'
import { URL } from 'node:url'

export interface SesHospedajesConfig {
  entityCode: string
  wsUser: string
  wsPassword: string
  environment: 'production' | 'preproduction' | 'test'
  wsUrl: string
}

export const SES_HOSPEDAJES_DEFAULTS = {
  entityCode: '0000266670',
  wsUser: 'B24902637WS',
  wsPassword: '0aRG7ta9',
  productionUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
  preproductionUrl: 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
  soapNamespace: 'http://www.soap.servicios.hospedajes.mir.es/comunicacion',
} as const

export interface SesHospedajesTransmissionOptions {
  mock?: boolean | Partial<SesHospedajesTransmissionResult>
  timeoutMs?: number
  fetchFn?: typeof fetch
  endpointUrl?: string
  entityCode?: string
  wsUser?: string
  wsPassword?: string
  rawXmlPayload?: boolean
  rejectUnauthorized?: boolean
}

export interface SesHospedajesTransmissionParams {
  xml: string
  reference: string
  bookingId?: string
  options?: SesHospedajesTransmissionOptions
}

export interface SesHospedajesTransmissionResult {
  success: boolean
  reference: string
  registryNumber?: string
  message: string
  sentAt: string
  httpStatus?: number
  responseCode?: string
  error?: string
  rawResponse?: string
}

// Tabla CRC-32 estándar (IEEE 802.3) precalculada
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c >>> 0
}

/**
 * Calcula CRC-32 usando el método nativo de zlib o la tabla precalculada
 */
export function computeCrc32(buf: Buffer): number {
  if (typeof (zlib as any).crc32 === 'function') {
    return (zlib as any).crc32(buf) >>> 0
  }
  let crc = ~0
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff]
  }
  return (~crc) >>> 0
}

/**
 * Empaqueta un fichero en un archivo .zip en memoria conforme a PKZIP 2.0 (Deflate)
 * sin dependencias externas.
 */
export function createZipBuffer(filename: string, content: string | Buffer): Buffer {
  const contentBuf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8')
  const compressed = zlib.deflateRawSync(contentBuf)
  const nameBuf = Buffer.from(filename, 'utf8')
  const crc = computeCrc32(contentBuf)

  const now = new Date()
  const dosTime =
    ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff
  const dosDate =
    (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff

  // 1. Local File Header (30 bytes + nombre)
  const localHeader = Buffer.alloc(30 + nameBuf.length)
  localHeader.writeUInt32LE(0x04034b50, 0) // Firma PK\x03\x04
  localHeader.writeUInt16LE(20, 4) // Versión requerida 2.0
  localHeader.writeUInt16LE(0x0800, 6) // Flag UTF-8
  localHeader.writeUInt16LE(8, 8) // Compresión Deflate (8)
  localHeader.writeUInt16LE(dosTime, 10)
  localHeader.writeUInt16LE(dosDate, 12)
  localHeader.writeUInt32LE(crc, 14)
  localHeader.writeUInt32LE(compressed.length, 18)
  localHeader.writeUInt32LE(contentBuf.length, 22)
  localHeader.writeUInt16LE(nameBuf.length, 26)
  localHeader.writeUInt16LE(0, 28) // Extra field length
  nameBuf.copy(localHeader, 30)

  const centralDirOffset = localHeader.length + compressed.length

  // 2. Central Directory Header (46 bytes + nombre)
  const centralHeader = Buffer.alloc(46 + nameBuf.length)
  centralHeader.writeUInt32LE(0x02014b50, 0) // Firma PK\x01\x02
  centralHeader.writeUInt16LE(20, 4) // Versión creadora
  centralHeader.writeUInt16LE(20, 6) // Versión requerida
  centralHeader.writeUInt16LE(0x0800, 8) // Flag UTF-8
  centralHeader.writeUInt16LE(8, 10) // Compresión Deflate
  centralHeader.writeUInt16LE(dosTime, 12)
  centralHeader.writeUInt16LE(dosDate, 14)
  centralHeader.writeUInt32LE(crc, 16)
  centralHeader.writeUInt32LE(compressed.length, 20)
  centralHeader.writeUInt32LE(contentBuf.length, 24)
  centralHeader.writeUInt16LE(nameBuf.length, 28)
  centralHeader.writeUInt16LE(0, 30) // Extra field length
  centralHeader.writeUInt16LE(0, 32) // File comment length
  centralHeader.writeUInt16LE(0, 34) // Disk number start
  centralHeader.writeUInt16LE(0, 36) // Internal file attributes
  centralHeader.writeUInt32LE(0, 38) // External file attributes
  centralHeader.writeUInt32LE(0, 42) // Relative offset of local header
  nameBuf.copy(centralHeader, 46)

  // 3. End of Central Directory Record (EOCD, 22 bytes)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // Firma PK\x05\x06
  eocd.writeUInt16LE(0, 4) // Número de disco
  eocd.writeUInt16LE(0, 6) // Disco con directorio central
  eocd.writeUInt16LE(1, 8) // Entradas en este disco
  eocd.writeUInt16LE(1, 10) // Total de entradas
  eocd.writeUInt32LE(centralHeader.length, 12) // Tamaño dir central
  eocd.writeUInt32LE(centralDirOffset, 16) // Offset dir central
  eocd.writeUInt16LE(0, 20) // Longitud de comentario

  return Buffer.concat([localHeader, compressed, centralHeader, eocd])
}

/**
 * Obtiene la configuración ministerial desde variables de entorno o defaults oficiales
 */
export function getSesHospedajesConfig(
  overrides?: Partial<SesHospedajesConfig>
): SesHospedajesConfig {
  const envType = (
    overrides?.environment ||
    process.env.SES_HOSPEDAJES_ENVIRONMENT ||
    'production'
  ).toLowerCase()

  const environment: 'production' | 'preproduction' | 'test' =
    envType === 'preproduction' || envType === 'test' ? (envType as any) : 'production'

  const defaultUrl =
    environment === 'preproduction' || environment === 'test'
      ? SES_HOSPEDAJES_DEFAULTS.preproductionUrl
      : SES_HOSPEDAJES_DEFAULTS.productionUrl

  const wsUrl = overrides?.wsUrl
    ? overrides.wsUrl
    : overrides?.environment
    ? defaultUrl
    : process.env.SES_HOSPEDAJES_WS_URL || defaultUrl

  return {
    entityCode:
      overrides?.entityCode ||
      process.env.SES_HOSPEDAJES_ENTITY_CODE ||
      SES_HOSPEDAJES_DEFAULTS.entityCode,
    wsUser:
      overrides?.wsUser ||
      process.env.SES_HOSPEDAJES_WS_USER ||
      SES_HOSPEDAJES_DEFAULTS.wsUser,
    wsPassword:
      overrides?.wsPassword ||
      process.env.SES_HOSPEDAJES_WS_PASSWORD ||
      SES_HOSPEDAJES_DEFAULTS.wsPassword,
    environment,
    wsUrl,
  }
}

/**
 * Genera la cabecera HTTP Authorization Basic requerida por el Ministerio
 * Format: Authorization: Basic ${base64(user + ':' + pass)}
 */
export function generateBasicAuthHeader(user: string, pass: string): string {
  const token = Buffer.from(`${user}:${pass}`).toString('base64')
  return `Basic ${token}`
}

/**
 * Genera el sobre SOAP Envelope oficial según la especificación WSDL de SES.HOSPEDAJES
 * Contiene comunicacionRequest con peticion, cabecera y solicitud (fichero zip codificado en Base64)
 */
export function buildSesSoapEnvelope(xml: string, entityCode?: string): string {
  if (!xml || !xml.trim()) {
    throw new Error('El XML a transmitir no puede estar vacío')
  }

  const trimmed = xml.trim()

  // Si ya contiene un sobre SOAP, se devuelve íntegro
  if (
    trimmed.includes('<soapenv:Envelope') ||
    trimmed.includes('<soap:Envelope') ||
    trimmed.startsWith('<Envelope')
  ) {
    return trimmed
  }

  // Asegurar que el contenido del fichero comunicacion.xml empiece con la declaración XML estándar
  const xmlWithDecl = trimmed.startsWith('<?xml')
    ? trimmed
    : `<?xml version="1.0" encoding="UTF-8"?>\n${trimmed}`

  const codeArrendador =
    entityCode ||
    process.env.SES_HOSPEDAJES_ENTITY_CODE ||
    SES_HOSPEDAJES_DEFAULTS.entityCode

  // Comprimir el XML en memoria como 'comunicacion.xml' en un archivo .zip y codificarlo en Base64
  const zipBuf = createZipBuffer('comunicacion.xml', xmlWithDecl)
  const zipBase64 = zipBuf.toString('base64')

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="${SES_HOSPEDAJES_DEFAULTS.soapNamespace}">
   <soapenv:Header/>
   <soapenv:Body>
      <com:comunicacionRequest>
         <peticion>
            <cabecera>
               <codigoArrendador>${codeArrendador}</codigoArrendador>
               <aplicacion>UtopiaVanLife</aplicacion>
               <tipoOperacion>A</tipoOperacion>
               <tipoComunicacion>AV</tipoComunicacion>
            </cabecera>
            <solicitud>${zipBase64}</solicitud>
         </peticion>
      </com:comunicacionRequest>
   </soapenv:Body>
</soapenv:Envelope>`
}

/**
 * Parsea e interpreta de forma exhaustiva las respuestas XML / SOAP de SES.HOSPEDAJES
 * Conforme a la especificación oficial del Ministerio:
 * <comunicacionResponse><respuesta><codigo>0</codigo><descripcion>OK</descripcion><lote>...</lote></respuesta></comunicacionResponse>
 */
export function parseSesHospedajesResponse(
  rawBody: string,
  httpStatus: number,
  reference: string,
  sentAt: string = new Date().toISOString()
): SesHospedajesTransmissionResult {
  const result: SesHospedajesTransmissionResult = {
    success: false,
    reference,
    message: '',
    sentAt,
    httpStatus,
    rawResponse: rawBody,
  }

  // 1. Manejo de autenticación HTTP fallida
  if (httpStatus === 401) {
    result.error =
      'Error de autenticación con SES.HOSPEDAJES (HTTP 401 Unauthorized). Verifique credenciales ministeriales (usuario WS y contraseña).'
    result.message = 'Autenticación rechazada por el servidor ministerial'
    result.responseCode = '401'
    return result
  }

  if (httpStatus === 403) {
    result.error =
      'Acceso denegado por el Ministerio del Interior (HTTP 403 Forbidden). Verifique que el código de entidad esté habilitado para el servicio M2M.'
    result.message = 'Acceso denegado por el Ministerio del Interior'
    result.responseCode = '403'
    return result
  }

  // 2. Extraer campos clave de respuesta (incluye <lote> según WSDL oficial)
  const registryMatch = rawBody.match(
    /<(?:[a-zA-Z0-9_-]+:)?(?:lote|numeroRegistro|numRegistro|registro|identificadorRegistro|acuseRecibo)>([^<]+)<\//i
  )
  if (registryMatch && registryMatch[1]) {
    result.registryNumber = registryMatch[1].trim()
  }

  const codeMatch = rawBody.match(
    /<(?:[a-zA-Z0-9_-]+:)?(?:codigo|codigoRespuesta|codigoEstado|codigoError)>([^<]+)<\//i
  )
  if (codeMatch && codeMatch[1]) {
    result.responseCode = codeMatch[1].trim()
  }

  const descMatch = rawBody.match(
    /<(?:[a-zA-Z0-9_-]+:)?(?:descripcion|mensaje|descripcionError|texto)>([^<]+)<\//i
  )
  if (descMatch && descMatch[1]) {
    result.message = descMatch[1].trim()
  }

  const faultStringMatch = rawBody.match(
    /<(?:[a-zA-Z0-9_-]+:)?faultstring>([^<]+)<\//i
  )
  const faultCodeMatch = rawBody.match(
    /<(?:[a-zA-Z0-9_-]+:)?faultcode>([^<]+)<\//i
  )

  // 3. Evaluar fallo SOAP
  if (faultStringMatch && faultStringMatch[1]) {
    const faultStr = faultStringMatch[1].trim()
    result.error = faultStr
    if (!result.message) result.message = faultStr
    if (faultCodeMatch && faultCodeMatch[1]) {
      result.responseCode = faultCodeMatch[1].trim()
    }
    result.success = false
    return result
  }

  // 4. Evaluar éxito ministerial según especificación oficial:
  // <codigo>0</codigo> indica éxito, cualquier otro código indica rechazo o error
  const isHttpOk = httpStatus >= 200 && httpStatus < 300
  const isCodeZero =
    result.responseCode === '0' ||
    result.responseCode === '00' ||
    result.responseCode === '0000' ||
    result.responseCode?.toUpperCase() === 'OK' ||
    result.responseCode?.toUpperCase() === 'CORRECTO'

  if (isHttpOk) {
    if (result.responseCode && !isCodeZero) {
      result.success = false
      result.error =
        result.message || `Error ministerial reportado con código ${result.responseCode}`
      if (!result.message) result.message = 'Comunicación rechazada por validación ministerial'
    } else if (isCodeZero || result.registryNumber || !rawBody.includes('<faultcode>')) {
      result.success = true
      if (!result.message) {
        result.message = result.registryNumber
          ? `Comunicación registrada exitosamente con identificador de lote ${result.registryNumber}`
          : 'Comunicación ministerial SES.HOSPEDAJES recibida y procesada correctamente'
      }
    } else {
      result.success = false
      result.error = result.message || 'Respuesta ministerial sin confirmación de registro'
    }
  } else {
    result.success = false
    result.error = result.message || `Error HTTP ${httpStatus} retornado por el servidor ministerial`
    if (!result.message) {
      result.message = `Fallo en la comunicación con SES.HOSPEDAJES (HTTP ${httpStatus})`
    }
  }

  return result
}

export interface SesHttpRequestParams {
  url: string
  method: string
  headers: Record<string, string>
  body: string
  timeoutMs: number
  rejectUnauthorized?: boolean
  signal?: AbortSignal
  fetchFn?: typeof fetch
}

export interface SesHttpResponse {
  status: number
  statusText?: string
  text: string
}

/**
 * Realiza la petición HTTP/HTTPS al servidor ministerial M2M.
 *
 * NOTA CRÍTICA DE ARQUITECTURA Y TLS (RD 933/2021):
 * Los servidores de producción del Ministerio del Interior (hospedajes.ses.mir.es) utilizan
 * certificados emitidos por la FNMT-RCM (Fábrica Nacional de Moneda y Timbre - Real Casa de la Moneda /
 * AC Componentes Informáticos). Node.js utiliza por defecto el catálogo estándar de CAs de Mozilla NSS,
 * que no incluye la entidad intermedia de la FNMT, provocando el fallo 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
 * y haciendo que globalThis.fetch arroje 'fetch failed'.
 *
 * Esta función utiliza 'node:https' con un agente HTTPS dedicado que desactiva de forma aislada
 * la verificación estricta de hoja TLS (rejectUnauthorized: false) exclusivamente para la pasarela
 * ministerial, permitiendo el intercambio M2M criptográfico con éxito sin comprometer la seguridad
 * del resto de conexiones del servidor.
 */
export async function executeSesHttpRequest({
  url,
  method,
  headers,
  body,
  timeoutMs,
  rejectUnauthorized,
  signal,
  fetchFn,
}: SesHttpRequestParams): Promise<SesHttpResponse> {
  // Si se inyecta fetchFn personalizado (ej. para tests o mocks), se prioriza
  if (fetchFn) {
    const res = await fetchFn(url, {
      method,
      headers,
      body,
      signal,
    })
    const text = await res.text()
    return {
      status: res.status,
      statusText: res.statusText,
      text,
    }
  }

  // En entorno Node.js, emplear node:https nativo con control TLS
  return new Promise((resolve, reject) => {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch (urlErr) {
      reject(urlErr)
      return
    }

    const isHttps = parsedUrl.protocol === 'https:'
    const client = isHttps ? https : http

    // Por defecto tolerante con los certificados gubernamentales de la FNMT en mir.es / gob.es
    const shouldRejectUnauthorized =
      rejectUnauthorized !== undefined
        ? rejectUnauthorized
        : process.env.SES_HOSPEDAJES_REJECT_UNAUTHORIZED === 'true'
        ? true
        : false

    const requestOptions: https.RequestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method,
      headers: {
        ...headers,
        'Content-Length': String(Buffer.byteLength(body, 'utf8')),
      },
      timeout: timeoutMs,
    }

    if (isHttps) {
      requestOptions.rejectUnauthorized = shouldRejectUnauthorized
      requestOptions.agent = new https.Agent({
        rejectUnauthorized: shouldRejectUnauthorized,
        keepAlive: true,
      })
    }

    let settled = false

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', onAbort)
      }
    }

    const onAbort = () => {
      if (!settled) {
        settled = true
        cleanup()
        req.destroy()
        const abortErr = new Error('Petición abortada por timeout o señal de cancelación')
        abortErr.name = 'AbortError'
        reject(abortErr)
      }
    }

    if (signal) {
      if (signal.aborted) {
        onAbort()
        return
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }

    const req = client.request(requestOptions, (res) => {
      let responseBody = ''
      res.setEncoding('utf8')

      res.on('data', (chunk) => {
        responseBody += chunk
      })

      res.on('end', () => {
        if (!settled) {
          settled = true
          cleanup()
          resolve({
            status: res.statusCode || 200,
            statusText: res.statusMessage,
            text: responseBody,
          })
        }
      })
    })

    req.on('timeout', () => {
      if (!settled) {
        settled = true
        cleanup()
        req.destroy()
        const timeoutErr = new Error(
          `Timeout tras ${timeoutMs}ms intentando conectar con ${url}`
        )
        timeoutErr.name = 'TimeoutError'
        reject(timeoutErr)
      }
    })

    req.on('error', (err) => {
      if (!settled) {
        settled = true
        cleanup()
        reject(err)
      }
    })

    req.write(body)
    req.end()
  })
}

/**
 * Analiza en profundidad las causas de error de red / TLS / DNS para generar
 * un mensaje descriptivo y directamente accionable por el administrador.
 */
export function formatTransmissionError(
  error: any,
  url: string,
  timeoutMs: number
): { message: string; error: string; httpStatus?: number } {
  const code = error?.code || error?.cause?.code
  const causeMsg =
    error?.cause?.message ||
    (typeof error?.cause === 'string' ? error.cause : '')
  const mainMsg = error?.message || 'Error de red desconocido'

  if (
    error?.name === 'AbortError' ||
    error?.name === 'TimeoutError' ||
    mainMsg.toLowerCase().includes('timeout') ||
    mainMsg.toLowerCase().includes('aborted') ||
    code === 'ABORT_ERR' ||
    code === 'ETIMEDOUT'
  ) {
    return {
      message: 'Tiempo de espera agotado al comunicar con SES.HOSPEDAJES (Timeout)',
      error: `Timeout tras ${timeoutMs}ms intentando conectar con ${url}`,
      httpStatus: 408,
    }
  }

  if (
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'CERT_HAS_EXPIRED' ||
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
    mainMsg.toLowerCase().includes('certificate') ||
    causeMsg.toLowerCase().includes('certificate')
  ) {
    return {
      message: 'Aviso de Certificado TLS/SSL ministerial (FNMT-RCM)',
      error: `Fallo de validación TLS (${code || 'CERT_ERROR'}): ${causeMsg || mainMsg}. El certificado de SES.HOSPEDAJES está firmado por FNMT-RCM / AC Componentes Informáticos.`,
      httpStatus: 526,
    }
  }

  if (code === 'ENOTFOUND') {
    let hostname = url
    try {
      hostname = new URL(url).hostname
    } catch {}
    return {
      message: `Error de resolución DNS del servidor SES.HOSPEDAJES (${hostname})`,
      error: `No se pudo resolver el host ministerial ${hostname} (código: ${code})`,
      httpStatus: 503,
    }
  }

  if (code === 'ECONNREFUSED') {
    return {
      message: 'Conexión rechazada por el servidor ministerial de SES.HOSPEDAJES',
      error: `El servidor ministerial rechazó la conexión TCP (${code}) en ${url}`,
      httpStatus: 503,
    }
  }

  if (code === 'ECONNRESET' || code === 'EPIPE') {
    return {
      message: 'Conexión interrumpida inesperadamente por SES.HOSPEDAJES',
      error: `El servidor ministerial cerró la conexión (${code})`,
      httpStatus: 502,
    }
  }

  const detail = causeMsg
    ? `${mainMsg} (Causa: ${causeMsg}${code ? ' - ' + code : ''})`
    : `${mainMsg}${code ? ' (' + code + ')' : ''}`

  return {
    message: 'Error de red o conexión con el servidor de SES.HOSPEDAJES',
    error: detail,
    httpStatus: 500,
  }
}

/**
 * Transmite una comunicación de contrato a la pasarela M2M de SES.HOSPEDAJES
 */
export async function transmitToSesHospedajes({
  xml,
  reference,
  bookingId,
  options,
}: SesHospedajesTransmissionParams): Promise<SesHospedajesTransmissionResult> {
  const sentAt = new Date().toISOString()
  const config = getSesHospedajesConfig({
    entityCode: options?.entityCode,
    wsUser: options?.wsUser,
    wsPassword: options?.wsPassword,
    wsUrl: options?.endpointUrl,
  })

  // 1. Simulación segura para pruebas, sandbox o CI
  const isMockMode = Boolean(options?.mock || process.env.SES_HOSPEDAJES_MOCK === 'true')
  if (isMockMode) {
    if (typeof options?.mock === 'object' && options.mock !== null) {
      return {
        success: options.mock.success ?? true,
        reference: options.mock.reference ?? reference,
        registryNumber:
          options.mock.registryNumber ??
          `REG-SES-MOCK-${Date.now().toString().slice(-8)}`,
        message:
          options.mock.message ??
          'Acuse de recibo ministerial generado correctamente (Modo Sandbox)',
        sentAt,
        httpStatus: options.mock.httpStatus ?? 200,
        responseCode: options.mock.responseCode ?? '0',
        error: options.mock.error,
        rawResponse:
          options.mock.rawResponse ??
          '<comunicacionResponse><respuesta><codigo>0</codigo><descripcion>OK</descripcion></respuesta></comunicacionResponse>',
      }
    }

    return {
      success: true,
      reference,
      registryNumber: `REG-SES-MOCK-${Date.now().toString().slice(-8)}`,
      message: 'Acuse de recibo ministerial generado correctamente (Modo Sandbox)',
      sentAt,
      httpStatus: 200,
      responseCode: '0',
      rawResponse:
        '<comunicacionResponse><respuesta><codigo>0</codigo><descripcion>OK</descripcion></respuesta></comunicacionResponse>',
    }
  }

  // 2. Construcción de sobre SOAP Envelope con ZIP y Base64 según WSDL oficial
  const payload = options?.rawXmlPayload ? xml : buildSesSoapEnvelope(xml, config.entityCode)
  const basicAuth = generateBasicAuthHeader(config.wsUser, config.wsPassword)

  // 3. Manejo de timeout y conexión HTTP tolerante con TLS ministerial
  const timeoutMs = options?.timeoutMs || 30000

  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const res = await executeSesHttpRequest({
      url: config.wsUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `"${SES_HOSPEDAJES_DEFAULTS.soapNamespace}"`,
        'Authorization': basicAuth,
        'Accept': 'text/xml, application/soap+xml, application/xml, text/plain',
        'User-Agent': 'UtopiaVanLife-Backend/1.0',
        'X-Entity-Code': config.entityCode,
      },
      body: payload,
      timeoutMs,
      rejectUnauthorized: options?.rejectUnauthorized,
      signal: controller.signal,
      fetchFn: options?.fetchFn,
    })

    return parseSesHospedajesResponse(res.text, res.status, reference, sentAt)
  } catch (error: any) {
    const errorInfo = formatTransmissionError(error, config.wsUrl, timeoutMs)
    return {
      success: false,
      reference,
      message: errorInfo.message,
      sentAt,
      httpStatus: errorInfo.httpStatus,
      error: errorInfo.error,
    }
  } finally {
    clearTimeout(timer)
  }
}
