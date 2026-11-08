import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

// Carga segura de variables de entorno desde .env.local
function ensureEnvLoaded() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim()
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
}
ensureEnvLoaded()

import {
  getSesHospedajesConfig,
  generateBasicAuthHeader,
  createZipBuffer,
  buildSesSoapEnvelope,
  parseSesHospedajesResponse,
  transmitToSesHospedajes,
  SES_HOSPEDAJES_DEFAULTS,
} from '../lib/sesHospedajes/client'
import { getSupabaseAdmin } from '../lib/supabase/admin'

describe('Pasarela M2M SES.HOSPEDAJES (RD 933/2021)', () => {
  describe('1. Credenciales y Autenticación Ministerial', () => {
    it('obtiene las credenciales oficiales de Utopia Van Life configuradas', () => {
      const config = getSesHospedajesConfig()
      assert.equal(config.entityCode, '0000266670')
      assert.equal(config.wsUser, 'B24902637WS')
      assert.equal(config.wsPassword, '0aRG7ta9')
      assert.equal(config.environment, 'production')
      assert.equal(
        config.wsUrl,
        'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion'
      )
    })

    it('genera la cabecera HTTP Authorization Basic con codificación Base64 exacta', () => {
      const user = 'B24902637WS'
      const pass = '0aRG7ta9'
      const expectedToken = Buffer.from(`${user}:${pass}`).toString('base64')
      assert.equal(expectedToken, 'QjI0OTAyNjM3V1M6MGFSRzd0YTk=')

      const header = generateBasicAuthHeader(user, pass)
      assert.equal(header, 'Basic QjI0OTAyNjM3V1M6MGFSRzd0YTk=')
    })

    it('soporta la URL de preproducción para entorno de homologación ministerial', () => {
      const preConfig = getSesHospedajesConfig({ environment: 'preproduction' })
      assert.equal(
        preConfig.wsUrl,
        'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion'
      )
    })
  })

  describe('2. Formación del Payload SOAP Envelope Ministerial (WSDL Oficial)', () => {
    it('empaqueta el XML en memoria como comunicacion.xml en formato PKZIP válido', () => {
      const sampleXml = '<ns2:peticion><contrato><referencia>UVL-SPACE-0111-0711-12</referencia></contrato></ns2:peticion>'
      const zipBuf = createZipBuffer('comunicacion.xml', sampleXml)

      // Verificar cabeceras PKZIP estándar
      assert.equal(zipBuf.readUInt32LE(0), 0x04034b50, 'Firma de Local File Header debe ser 0x04034b50')
      const nameLen = zipBuf.readUInt16LE(26)
      const fileName = zipBuf.subarray(30, 30 + nameLen).toString('utf8')
      assert.equal(fileName, 'comunicacion.xml')

      // Descomprimir y verificar contenido idéntico
      const compLen = zipBuf.readUInt32LE(18)
      const compressedData = zipBuf.subarray(30 + nameLen, 30 + nameLen + compLen)
      const decompressed = zlib.inflateRawSync(compressedData).toString('utf8')
      assert.equal(decompressed, sampleXml)
    })

    it('genera la estructura exacta de comunicacionRequest con peticion, cabecera y solicitud en Base64', () => {
      const innerXml = '<ns2:peticion><contrato><referencia>UVL-SPACE-0111-0711-12</referencia></contrato></ns2:peticion>'
      const envelope = buildSesSoapEnvelope(innerXml, '0000266670')

      assert.ok(envelope.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
      assert.ok(envelope.includes('<soapenv:Envelope'))
      assert.ok(
        envelope.includes(
          'xmlns:com="http://www.soap.servicios.hospedajes.mir.es/comunicacion"'
        )
      )
      assert.ok(envelope.includes('<com:comunicacionRequest>'))
      assert.ok(envelope.includes('<peticion>'))
      assert.ok(envelope.includes('<cabecera>'))
      assert.ok(envelope.includes('<codigoArrendador>0000266670</codigoArrendador>'))
      assert.ok(envelope.includes('<aplicacion>UtopiaVanLife</aplicacion>'))
      assert.ok(envelope.includes('<tipoOperacion>A</tipoOperacion>'))
      assert.ok(envelope.includes('<tipoComunicacion>AV</tipoComunicacion>'))
      assert.ok(envelope.includes('</cabecera>'))
      assert.ok(envelope.includes('<solicitud>'))
      assert.ok(envelope.includes('</solicitud>'))
      assert.ok(envelope.includes('</peticion>'))
      assert.ok(envelope.includes('</com:comunicacionRequest>'))

      // Extraer y validar el ZIP Base64 dentro de <solicitud>
      const match = envelope.match(/<solicitud>([^<]+)<\/solicitud>/)
      assert.ok(match && match[1], 'Debe existir el elemento <solicitud> con el zip en base64')
      const zipBase64 = match[1].trim()
      const zipBuffer = Buffer.from(zipBase64, 'base64')
      assert.equal(zipBuffer.readUInt32LE(0), 0x04034b50, 'El payload en base64 debe ser un ZIP válido')
    })

    it('respeta sobres SOAP que ya vengan formados', () => {
      const alreadySoap =
        '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><test/></soapenv:Body></soapenv:Envelope>'
      const result = buildSesSoapEnvelope(alreadySoap)
      assert.equal(result, alreadySoap)
    })

    it('lanza error si el XML de entrada está vacío', () => {
      assert.throws(() => buildSesSoapEnvelope(''), /no puede estar vacío/)
      assert.throws(() => buildSesSoapEnvelope('   '), /no puede estar vacío/)
    })
  })

  describe('3. Manejo de Respuestas Simuladas (Parser y Transmisión)', () => {
    it('procesa respuesta oficial ministerial con elemento <lote> y <codigo>0</codigo>', async () => {
      const officialResponse = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <comunicacionResponse xmlns="http://www.soap.servicios.hospedajes.mir.es/comunicacion">
      <respuesta>
        <codigo>0</codigo>
        <descripcion>OK - Lote AV validado conforme a esquema XSD oficial</descripcion>
        <lote>a1b2c3d4-e5f6-7890-abcd-ef0123456789</lote>
      </respuesta>
    </comunicacionResponse>
  </soapenv:Body>
</soapenv:Envelope>`

      const parsed = parseSesHospedajesResponse(
        officialResponse,
        200,
        'UVL-SPACE-0111-0711-12'
      )

      assert.equal(parsed.success, true)
      assert.equal(parsed.reference, 'UVL-SPACE-0111-0711-12')
      assert.equal(parsed.registryNumber, 'a1b2c3d4-e5f6-7890-abcd-ef0123456789')
      assert.equal(parsed.responseCode, '0')
      assert.equal(parsed.message, 'OK - Lote AV validado conforme a esquema XSD oficial')
      assert.equal(parsed.httpStatus, 200)

      // Transmisión con mock fetchFn
      const mockFetch: typeof fetch = async () =>
        new Response(officialResponse, {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        })

      const transmitResult = await transmitToSesHospedajes({
        xml: '<ns2:peticion><solicitud/></ns2:peticion>',
        reference: 'UVL-SPACE-0111-0711-12',
        options: { fetchFn: mockFetch },
      })

      assert.equal(transmitResult.success, true)
      assert.equal(transmitResult.registryNumber, 'a1b2c3d4-e5f6-7890-abcd-ef0123456789')
    })

    it('procesa correctamente una respuesta con <numeroRegistro> ministerial', async () => {
      const legacySoapResponse = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <com:comunicacionResponse xmlns:com="http://www.soap.servicios.hospedajes.mir.es/comunicacion">
      <respuesta>
        <codigo>0</codigo>
        <descripcion>Comunicacion procesada satisfactoriamente</descripcion>
        <numeroRegistro>REG-SES-2026-00049281</numeroRegistro>
        <fechaRegistro>2026-11-08T20:30:00+01:00</fechaRegistro>
      </respuesta>
    </com:comunicacionResponse>
  </soapenv:Body>
</soapenv:Envelope>`

      const parsed = parseSesHospedajesResponse(
        legacySoapResponse,
        200,
        'UVL-SPACE-0111-0711-12'
      )

      assert.equal(parsed.success, true)
      assert.equal(parsed.registryNumber, 'REG-SES-2026-00049281')
      assert.equal(parsed.responseCode, '0')
    })

    it('maneja el error HTTP 401 Unauthorized cuando las credenciales no son válidas', async () => {
      const parsed = parseSesHospedajesResponse(
        'HTTP 401 Unauthorized: Invalid credentials',
        401,
        'UVL-NEO-0210-0810-3'
      )

      assert.equal(parsed.success, false)
      assert.equal(parsed.httpStatus, 401)
      assert.ok(parsed.error?.includes('401 Unauthorized'))
      assert.ok(parsed.error?.includes('credenciales ministeriales'))

      const mockFetch401: typeof fetch = async () =>
        new Response('Unauthorized', { status: 401 })

      const transmitResult = await transmitToSesHospedajes({
        xml: '<ns2:peticion><solicitud/></ns2:peticion>',
        reference: 'UVL-NEO-0210-0810-3',
        options: { fetchFn: mockFetch401 },
      })

      assert.equal(transmitResult.success, false)
      assert.equal(transmitResult.httpStatus, 401)
      assert.ok(transmitResult.error?.includes('401'))
    })

    it('maneja errores de validación de datos (SOAP Fault)', async () => {
      const soapFault = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>soapenv:Client</faultcode>
      <faultstring>Error de validacion: El NIF del conductor no cumple el algoritmo ministerial</faultstring>
      <detail>
        <codigoError>ERR-012</codigoError>
        <mensaje>Documento no valido</mensaje>
      </detail>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`

      const parsed = parseSesHospedajesResponse(soapFault, 200, 'UVL-SPACE-0111-0711-12')

      assert.equal(parsed.success, false)
      assert.equal(parsed.responseCode, 'soapenv:Client')
      assert.ok(parsed.error?.includes('Error de validacion'))

      const mockFetchFault: typeof fetch = async () =>
        new Response(soapFault, { status: 500 })

      const transmitResult = await transmitToSesHospedajes({
        xml: '<ns2:peticion><solicitud/></ns2:peticion>',
        reference: 'UVL-SPACE-0111-0711-12',
        options: { fetchFn: mockFetchFault },
      })

      assert.equal(transmitResult.success, false)
      assert.ok(transmitResult.error?.includes('Error de validacion'))
    })

    it('maneja errores de validación ministerial con código de rechazo distinto de 0 en HTTP 200', async () => {
      const rejectXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <comunicacionResponse xmlns="http://www.soap.servicios.hospedajes.mir.es/comunicacion">
      <respuesta>
        <codigo>ERR-042</codigo>
        <descripcion>Vehiculo no matriculado en el censo oficial de la entidad</descripcion>
      </respuesta>
    </comunicacionResponse>
  </soapenv:Body>
</soapenv:Envelope>`

      const parsed = parseSesHospedajesResponse(rejectXml, 200, 'UVL-NEO-1507-2507-45')
      assert.equal(parsed.success, false)
      assert.equal(parsed.responseCode, 'ERR-042')
      assert.equal(parsed.error, 'Vehiculo no matriculado en el censo oficial de la entidad')
    })

    it('soporta simulación en modo sandbox sin llamada de red', async () => {
      const res = await transmitToSesHospedajes({
        xml: '<test/>',
        reference: 'UVL-SPACE-0111-0711-12',
        options: { mock: true },
      })

      assert.equal(res.success, true)
      assert.equal(res.reference, 'UVL-SPACE-0111-0711-12')
      assert.ok(res.registryNumber?.startsWith('REG-SES-MOCK-'))
      assert.ok(res.message.includes('Sandbox'))
    })

    it('maneja el timeout adecuadamente mediante AbortController', async () => {
      const hangingFetch: typeof fetch = async (_url, init) => {
        return new Promise((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted')
              err.name = 'AbortError'
              reject(err)
            })
          }
        })
      }

      const res = await transmitToSesHospedajes({
        xml: '<test/>',
        reference: 'UVL-NEO-TIMEOUT-1',
        options: {
          fetchFn: hangingFetch,
          timeoutMs: 50,
        },
      })

      assert.equal(res.success, false)
      assert.equal(res.httpStatus, 408)
      assert.ok(res.message.includes('Timeout'))
    })
  })

  describe('4. Integración con el Endpoint POST /api/admin/ses-hospedajes/transmit', () => {
    it('retorna 400 si falta el parámetro bookingId', async () => {
      const { POST } = await import('../app/api/admin/ses-hospedajes/transmit/route')
      const request = new Request('http://localhost/api/admin/ses-hospedajes/transmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const res = await POST(request)
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.ok(data.error.includes('bookingId'))
    })

    it('retorna 401 si no se aportan credenciales de administrador ni Bearer service role', async () => {
      const { POST } = await import('../app/api/admin/ses-hospedajes/transmit/route')
      const request = new Request('http://localhost/api/admin/ses-hospedajes/transmit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token_invalido',
        },
        body: JSON.stringify({ bookingId: 'b-no-auth' }),
      })

      const res = await POST(request)
      assert.equal(res.status, 401)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.equal(data.error, 'No autorizado')
    })

    it('retorna 404 si la reserva no existe en base de datos', async () => {
      const { POST } = await import('../app/api/admin/ses-hospedajes/transmit/route')
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const request = new Request('http://localhost/api/admin/ses-hospedajes/transmit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          bookingId: '00000000-0000-0000-0000-000000000000',
        }),
      })

      const res = await POST(request)
      assert.equal(res.status, 404)
      const data = await res.json()
      assert.equal(data.success, false)
      assert.equal(data.error, 'Reserva no encontrada')
    })

    it('transmite exitosamente una reserva real con sobre SOAP empaquetado en ZIP', async () => {
      const { POST } = await import('../app/api/admin/ses-hospedajes/transmit/route')
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const admin = getSupabaseAdmin()

      // Obtener una reserva existente en la base de datos
      const { data: booking } = await admin
        .from('bookings')
        .select('id, notes')
        .limit(1)
        .maybeSingle()

      if (!booking) {
        return
      }

      const request = new Request('http://localhost/api/admin/ses-hospedajes/transmit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          bookingId: booking.id,
          options: {
            mock: {
              success: true,
              registryNumber: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789',
              message: 'Lote AV validado conforme a esquema XSD oficial',
            },
          },
        }),
      })

      const res = await POST(request)
      assert.equal(res.status, 200)

      const json = await res.json()
      assert.equal(json.success, true)
      assert.ok(json.reference.startsWith('UVL-'))
      assert.equal(json.registryNumber, 'a1b2c3d4-e5f6-7890-abcd-ef0123456789')
      assert.equal(json.message, 'Lote AV validado conforme a esquema XSD oficial')
      assert.ok(json.sentAt)

      // Verificar que se actualizó la trazabilidad en notes
      const { data: updatedBooking } = await admin
        .from('bookings')
        .select('notes')
        .eq('id', booking.id)
        .single()

      assert.ok(
        updatedBooking?.notes?.includes('[SES.HOSPEDAJES ENVIADO:'),
        'Las notas de la reserva deben contener el registro de auditoría ministerial'
      )
      assert.ok(
        updatedBooking?.notes?.includes('Reg: a1b2c3d4-e5f6-7890-abcd-ef0123456789'),
        'Las notas deben contener el identificador de lote asignado'
      )
    })
  })
})
