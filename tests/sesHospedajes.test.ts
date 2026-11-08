import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateSesReference,
  generateSesHospedajesXml,
  escapeXml,
  splitSpanishName,
  detectTipoDocumento,
  formatDateWithOffset,
  formatDateTimeWithOffset,
  FLEET_VEHICLES,
  SON_OMS_LOCATION,
} from '../lib/sesHospedajes/xmlGenerator'

describe('Motor SES.HOSPEDAJES / Real Decreto 933/2021', () => {
  describe('1. Generador de Referencia Oficial', () => {
    it('genera la referencia exacta requerida en el ejemplo del pliego técnico', () => {
      const booking = {
        id: '12',
        start_date: '2026-11-01',
        end_date: '2026-11-07',
      }
      const camper = {
        name: 'SPACE',
        slug: 'space',
      }

      const ref = generateSesReference(booking, camper)
      assert.equal(ref, 'UVL-SPACE-0111-0711-12')
    })

    it('genera referencia correcta para NEO con fechas de verano y número secuencial', () => {
      const booking = {
        id: 'b456',
        booking_number: 45,
        start_date: '2026-07-15',
        end_date: '2026-07-25',
      }
      const camper = {
        name: 'NEO',
        slug: 'neo',
      }

      const ref = generateSesReference(booking, camper)
      assert.equal(ref, 'UVL-NEO-1507-2507-45')
    })

    it('deriva un identificador limpio de 4 caracteres cuando la reserva tiene UUID', () => {
      const booking = {
        id: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
        start_date: '2026-04-03',
        end_date: '2026-04-10',
      }
      const camper = {
        slug: 'space',
      }

      const ref = generateSesReference(booking, camper)
      assert.equal(ref, 'UVL-SPACE-0304-1004-6BF6')
    })

    it('detecta modelo SPACE si el nombre de camper contiene SPACE en mayúsculas o minúsculas', () => {
      const booking = { id: '7', start_date: '2026-09-01', end_date: '2026-09-05' }
      assert.equal(generateSesReference(booking, { name: 'Camper SPACE Lujo' }), 'UVL-SPACE-0109-0509-7')
      assert.equal(generateSesReference(booking, { slug: 'space' }), 'UVL-SPACE-0109-0509-7')
    })

    it('asume modelo NEO como estándar en caso contrario', () => {
      const booking = { id: '3', start_date: '2026-10-02', end_date: '2026-10-08' }
      assert.equal(generateSesReference(booking, { name: 'Camper NEO Compact' }), 'UVL-NEO-0210-0810-3')
      assert.equal(generateSesReference(booking, {}), 'UVL-NEO-0210-0810-3')
    })
  })

  describe('2. Flota de Vehículos Oficial y Ubicación Son Oms', () => {
    it('registra los datos exactos e inmutables de la camper SPACE', () => {
      const space = FLEET_VEHICLES.SPACE
      assert.equal(space.matricula, '4618NHX')
      assert.equal(space.numeroBastidor, 'ZFA250006SG060635')
      assert.equal(space.marca, 'Fiat')
      assert.equal(space.modelo, 'Ducato')
      assert.equal(space.tipo, 'CAMPER')
      assert.equal(space.categoria, 'Vehículo vivienda')
      assert.equal(space.color, 'GRIS')
    })

    it('registra los datos exactos e inmutables de la camper NEO', () => {
      const neo = FLEET_VEHICLES.NEO
      assert.equal(neo.matricula, '4630NHX')
      assert.equal(neo.numeroBastidor, 'ZFA250003SMC13122')
      assert.equal(neo.marca, 'Fiat')
      assert.equal(neo.modelo, 'Ducato')
      assert.equal(neo.tipo, 'CAMPER')
      assert.equal(neo.categoria, 'Vehículo vivienda')
      assert.equal(neo.color, 'GRIS')
    })

    it('mantiene la dirección oficial de Son Oms para recogida y devolución', () => {
      assert.equal(SON_OMS_LOCATION.direccion, 'Carrer del Camp Franc, 8')
      assert.equal(SON_OMS_LOCATION.direccionComplementaria, 'Poligono Son Oms')
      assert.equal(SON_OMS_LOCATION.codigoMunicipio, '07040')
      assert.equal(SON_OMS_LOCATION.codigoPostal, '07199')
      assert.equal(SON_OMS_LOCATION.pais, 'ESP')
    })
  })

  describe('3. Funciones Auxiliares: Sanitización, Nombres y Tipos', () => {
    it('escapa rigurosamente caracteres especiales XML (&, <, >, ", \')', () => {
      const unsafe = `Tom & Jerry <test> "quoted" 'single'`
      const escaped = escapeXml(unsafe)
      assert.equal(escaped, 'Tom &amp; Jerry &lt;test&gt; &quot;quoted&quot; &apos;single&apos;')
    })

    it('divide nombres españoles en nombre de pila y dos apellidos', () => {
      const res3 = splitSpanishName('Roberto Estébanez Blanco')
      assert.equal(res3.nombre, 'Roberto')
      assert.equal(res3.apellido1, 'Estébanez')
      assert.equal(res3.apellido2, 'Blanco')

      const res4 = splitSpanishName('María del Carmen López Vega')
      assert.equal(res4.nombre, 'María del Carmen')
      assert.equal(res4.apellido1, 'López')
      assert.equal(res4.apellido2, 'Vega')

      const res2 = splitSpanishName('John Smith')
      assert.equal(res2.nombre, 'John')
      assert.equal(res2.apellido1, 'Smith')
      assert.equal(res2.apellido2, undefined)
    })

    it('detecta correctamente NIF, NIE y Pasaporte', () => {
      assert.equal(detectTipoDocumento('46180000T'), 'NIF')
      assert.equal(detectTipoDocumento('X1234567L'), 'NIE')
      assert.equal(detectTipoDocumento('Y9876543A'), 'NIE')
      assert.equal(detectTipoDocumento('PAS123456'), 'PAS')
    })

    it('formatea fechas y horas con el huso horario oficial de Madrid', () => {
      const formattedDate = formatDateWithOffset('2026-11-04')
      assert.equal(formattedDate, '2026-11-04+01:00')

      const formattedPickup = formatDateTimeWithOffset('2026-11-04', '12:00:00')
      assert.equal(formattedPickup, '2026-11-04T12:00:00+01:00')

      const formattedDropoff = formatDateTimeWithOffset('2026-11-07', '11:00')
      assert.equal(formattedDropoff, '2026-11-07T11:00:00+01:00')
    })
  })

  describe('4. Generación Completa de XML Oficial', () => {
    it('produce el XML idéntico a la plantilla del Ministerio para la reserva de ejemplo', () => {
      const booking = {
        id: '12',
        start_date: '2026-11-04',
        end_date: '2026-11-07',
        pickup_time: '12:00:00',
        dropoff_time: '11:00:00',
        customer_name: 'Nombre Cliente',
        created_at: '2026-11-04T10:00:00Z',
      }
      const user = {
        full_name: 'Nombre Apellido1 Apellido2',
        dni_nie: '00000000T',
        birth_date: '1990-01-01',
        driver_license_id: '00000000T',
        driver_license_expiry_date: '2030-01-01',
        phone: '600000000',
        email: 'email@example.com',
        address: 'Direccion',
      }
      const camper = {
        name: 'SPACE',
        slug: 'space',
      }

      const { reference, xml, fileName } = generateSesHospedajesXml(booking, user, camper)

      assert.equal(reference, 'UVL-SPACE-0411-0711-12')
      assert.equal(fileName, 'UVL-SPACE-0411-0711-12.xml')

      // Verificar elementos clave del XML
      assert.ok(xml.includes('<ns2:peticion xmlns:ns2="http://www.neg.hospedajes.mir.es/altaAlquilerVehiculo">'))
      assert.ok(xml.includes('<referencia>UVL-SPACE-0411-0711-12</referencia>'))
      assert.ok(xml.includes('<fechaContrato>2026-11-04+01:00</fechaContrato>'))
      assert.ok(xml.includes('<fechaRecogida>2026-11-04T12:00:00+01:00</fechaRecogida>'))
      assert.ok(xml.includes('<fechaDevolucion>2026-11-07T11:00:00+01:00</fechaDevolucion>'))

      // Ubicación Son Oms
      assert.ok(xml.includes('<direccion>Carrer del Camp Franc, 8</direccion>'))
      assert.ok(xml.includes('<direccionComplementaria>Poligono Son Oms</direccionComplementaria>'))
      assert.ok(xml.includes('<codigoMunicipio>07040</codigoMunicipio>'))
      assert.ok(xml.includes('<codigoPostal>07199</codigoPostal>'))

      // Pago Redsys
      assert.ok(xml.includes('<tipoPago>TARJT</tipoPago>'))
      assert.ok(xml.includes('<medioPago>Redsys TPV</medioPago>'))
      assert.ok(xml.includes('<titular>Nombre Cliente</titular>'))

      // Vehículo SPACE
      assert.ok(xml.includes('<categoria>Vehículo vivienda</categoria>'))
      assert.ok(xml.includes('<tipo>CAMPER</tipo>'))
      assert.ok(xml.includes('<matricula>4618NHX</matricula>'))
      assert.ok(xml.includes('<numeroBastidor>ZFA250006SG060635</numeroBastidor>'))
      assert.ok(xml.includes('<color>GRIS</color>'))

      // Persona Titular (rol TI) y Conductor Principal (rol CP)
      assert.ok(xml.includes('<rol>TI</rol>'))
      assert.ok(xml.includes('<rol>CP</rol>'))
      assert.ok(xml.includes('<numeroDocumento>00000000T</numeroDocumento>'))
      assert.ok(xml.includes('<fechaNacimiento>1990-01-01+01:00</fechaNacimiento>'))
      assert.ok(xml.includes('<permisoConducir>'))
      assert.ok(xml.includes('<tipo>B</tipo>'))
      assert.ok(xml.includes('<validez>2030-01-01+01:00</validez>'))
      assert.ok(xml.includes('<numero>00000000T</numero>'))
    })

    it('incluye segundo conductor (rol CS) si está registrado en la reserva', () => {
      const booking = {
        id: '99',
        start_date: '2026-08-10',
        end_date: '2026-08-20',
        passengers: [
          {
            fullName: 'Marta Gómez Ortiz',
            dniNie: '87654321A',
            birthDate: '1995-05-20',
            isSecondDriver: true,
            licenseDate: '2016-06-15',
          },
        ],
      }
      const user = {
        full_name: 'Carlos Ruiz Sanz',
        dni_nie: '12345678Z',
      }
      const camper = {
        name: 'NEO',
      }

      const { xml } = generateSesHospedajesXml(booking, user, camper, { includeSecondDriver: true })

      assert.ok(xml.includes('<rol>CS</rol>'))
      assert.ok(xml.includes('<nombre>Marta</nombre>'))
      assert.ok(xml.includes('<apellido1>Gómez</apellido1>'))
      assert.ok(xml.includes('<apellido2>Ortiz</apellido2>'))
      assert.ok(xml.includes('<numeroDocumento>87654321A</numeroDocumento>'))
    })
  })

  describe('5. Endpoint API Admin: /api/admin/ses-hospedajes/xml', () => {
    it('retorna 400 si falta el parámetro bookingId', async () => {
      const { GET } = await import('../app/api/admin/ses-hospedajes/xml/route')
      const request = new Request('http://localhost/api/admin/ses-hospedajes/xml')
      const res = await GET(request)

      assert.equal(res.status, 400)
      const data = await res.json()
      assert.ok(data.error.includes('bookingId'))
    })
  })
})
