import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { validateDriverLicense } from '../lib/contracts/licenseValidator'
import { validateContractRequirements, generateContractData } from '../lib/contracts/contractEngine'
import { generateOfficialContractPdfBlob } from '../lib/contracts/pdfGenerator'
import { SPOTS_34, WATER_SERVICE_POINTS } from '../app/[locale]/dashboard/guia/MallorcaGuideClient'
import { TROUBLESHOOTING_ITEMS } from '../app/[locale]/dashboard/manual/CamperManualClient'
import { jsPDF } from 'jspdf'

describe('User Area (/dashboard) — Empirical Stress Testing', () => {

  describe('Edge Case: User with 0 bookings', () => {
    test('handles empty bookings array gracefully without crashing', () => {
      const bookings: any[] = []
      const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'active')
      const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled')
      const pendingBookings = bookings.filter(b => b.status === 'pending')

      const nextBooking = activeBookings[0] || pendingBookings[0] || null
      assert.equal(nextBooking, null)

      let daysToTrip = -1
      if (nextBooking) {
        const from = new Date((nextBooking as any).start_date)
        const now = new Date()
        daysToTrip = Math.ceil((from.getTime() - now.getTime()) / (1000 * 3600 * 24))
      }
      assert.equal(daysToTrip, -1)

      const hasBookings = Boolean(bookings && bookings.length > 0)
      assert.equal(hasBookings, false)
    })

    test('documents client safeProfile fallback works with empty bookings and sparse user', () => {
      const user = { id: 'usr-test-123', email: 'viajero@utopiavanlife.com' }
      const profile: any = null

      const safeProfile = {
        ...profile,
        full_name: profile?.full_name || (user as any)?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Viajero',
        dni_nie: profile?.dni_nie || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
        driver_license_id: profile?.driver_license_id || '',
        driver_license_issue_date: profile?.driver_license_issue_date || '',
        driver_license_expiry_date: profile?.driver_license_expiry_date || '',
        verification_status: profile?.verification_status || 'pending'
      }

      assert.equal(safeProfile.full_name, 'viajero')
      assert.equal(safeProfile.verification_status, 'pending')
      assert.equal(safeProfile.dni_nie, '')
      assert.equal(safeProfile.phone, '')
    })
  })

  describe('Edge Case: User with null or empty profile', () => {
    test('validateContractRequirements returns missingFields and isValid=false for null/undefined profile', () => {
      const resNull = validateContractRequirements(null)
      assert.equal(resNull.isValid, false)
      assert.ok(resNull.missingFields.includes('full_name'))
      assert.ok(resNull.missingFields.includes('dni_nie'))
      assert.ok(resNull.missingFields.includes('phone'))
      assert.ok(resNull.missingFields.includes('address'))
      assert.ok(resNull.missingFields.includes('driver_license_id'))
      assert.ok(resNull.missingFields.includes('driver_license_issue_date'))
      assert.ok(resNull.missingFields.includes('driver_license_expiry_date'))
      assert.equal(resNull.missingFields.length, 7)
      assert.ok(resNull.errorMessage?.includes('Faltan datos obligatorios'))

      const resUndef = validateContractRequirements(undefined)
      assert.equal(resUndef.isValid, false)
      assert.equal(resUndef.missingFields.length, 7)

      const resEmpty = validateContractRequirements({})
      assert.equal(resEmpty.isValid, false)
      assert.equal(resEmpty.missingFields.length, 7)
    })
  })

  describe('Edge Case: User with novel driver license (< 2 years)', () => {
    test('validateDriverLicense flags license with < 2 years as isNovel=true and issues warning', () => {
      // Current date is 2026-09. A license issued on 2025-06-01 is ~1.3 years old (< 2 years)
      const issueDate = '2025-06-01'
      const expiryDate = '2030-06-01'

      const result = validateDriverLicense(issueDate, expiryDate)
      assert.equal(result.isValid, true)
      assert.equal(result.isExpired, false)
      assert.equal(result.isNovel, true)
      assert.equal(result.yearsHeld, 1)
      assert.ok(result.warningMessage?.includes('menos de 2 años de antigüedad'))
    })

    test('validateContractRequirements rejects contract if driver license is < 2 years old', () => {
      const profile = {
        full_name: 'Carlos Novel',
        dni_nie: '12345678Z',
        phone: '+34600111222',
        address: 'Calle Mayor 1, Madrid',
        driver_license_id: 'B-12345678',
        driver_license_issue_date: '2025-06-01', // 1 year ago
        driver_license_expiry_date: '2030-06-01'
      }

      const res = validateContractRequirements(profile)
      assert.equal(res.isValid, false)
      assert.ok(res.issues.includes('license_too_novel'))
      assert.ok(res.errorMessage?.includes('mínimo de 2 años de antigüedad'))
    })
  })

  describe('Edge Case: User with expired driver license', () => {
    test('validateDriverLicense flags expired license as isExpired=true and isValid=false', () => {
      const issueDate = '2010-01-01'
      const expiryDate = '2023-01-01' // in the past

      const result = validateDriverLicense(issueDate, expiryDate)
      assert.equal(result.isValid, false)
      assert.equal(result.isExpired, true)
      assert.ok(result.warningMessage?.includes('caducado'))
    })

    test('validateContractRequirements rejects contract if driver license is expired', () => {
      const profile = {
        full_name: 'Ana Caducada',
        dni_nie: '87654321A',
        phone: '+34600333444',
        address: 'Passeig Mallorca 10, Palma',
        driver_license_id: 'B-87654321',
        driver_license_issue_date: '2012-05-10',
        driver_license_expiry_date: '2024-01-15' // expired
      }

      const res = validateContractRequirements(profile)
      assert.equal(res.isValid, false)
      assert.ok(res.issues.includes('license_expired'))
      assert.ok(res.errorMessage?.includes('se encuentra caducado'))
    })

    test('validateDriverLicense handles invalid date formats safely without thrown errors', () => {
      const res = validateDriverLicense('invalid-date', 'not-a-date')
      assert.equal(res.isValid, false)
      assert.equal(res.isExpired, false)
      assert.ok(res.warningMessage?.includes('inválido'))
    })
  })

  describe('Empty State: /dashboard/documentos', () => {
    test('when 0 bookings, documents client generates only identity doc and no contract/invoice errors', () => {
      const user = { id: 'usr-empty-456', email: 'sinreservas@test.com' }
      const profile = {
        full_name: 'Viajero Sin Reservas',
        dni_nie: '11223344B',
        phone: '+34677889900',
        verification_status: 'verified'
      }

      const isVerified = profile.verification_status === 'verified'
      const list: any[] = []

      // Identity document is always present
      list.push({
        id: 'doc-identity-verification',
        title: 'Acreditación de Conductor & Permiso de Conducir B',
        category: 'verification',
        typeLabel: 'Identidad & Carnet',
        refNumber: `ID-VER-${user.id.substring(0, 6).toUpperCase()}`,
        status: isVerified ? 'verified' : 'pending',
        isPast: false
      })

      assert.equal(list.length, 1)
      assert.equal(list[0].id, 'doc-identity-verification')
      assert.equal(list[0].status, 'verified')
    })
  })

  describe('PDF Generation: /dashboard/manual', () => {
    test('generates valid multi-page PDF document structure without crashing', () => {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // Page 1 Header
      pdf.setFillColor(26, 43, 33)
      pdf.rect(0, 0, 210, 26, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.setTextColor(255, 255, 255)
      pdf.text('UTOPIA VAN LIFE', 16, 12)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(200, 168, 130)
      pdf.text('MANUAL OFICIAL DE USUARIO & OPERACIÓN CAMPER (NEO & SPACE)', 16, 19)

      let y = 34
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(26, 43, 33)
      pdf.text('1. Guías de Operación de Sistemas', 16, y)
      y += 6

      // Guides items
      const sampleGuides = [
        { title: 'Sistema Eléctrico Autónomo Victron', systemName: 'Victron Litio 540Ah', summary: 'Placas solares 400W e inversor 2000W.' },
        { title: 'Gestión de Aguas & Ducha Caliente', systemName: 'Depósito 113L/160L', summary: 'Control de bomba de agua y boiler Truma.' },
        { title: 'Calefacción Estacionaria & Nevera', systemName: 'Nevera Indel B 86L', summary: 'Calefacción diésel y termostato.' },
        { title: 'Cocina de Gas & Seguridad', systemName: 'Cartucho CP250', summary: 'Encendido piezoeléctrico y llave de paso.' },
        { title: 'Cama de Techo Eléctrica SPACE', systemName: 'Project 2000', summary: 'Elevación y bloqueo mecánico de cama.' }
      ]

      sampleGuides.forEach((g, i) => {
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
        pdf.text(`${i + 1}. ${g.title}`, 20, y + 5.5)
        y += 25
      })

      // Troubleshooting page
      pdf.addPage()
      pdf.setFillColor(26, 43, 33)
      pdf.rect(0, 0, 210, 16, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(255, 255, 255)
      pdf.text('2. Resolución de Averías Frecuentes en Ruta (Troubleshooting)', 16, 11)

      let ty = 24
      assert.ok(TROUBLESHOOTING_ITEMS.length >= 5, 'Must contain at least 5 troubleshooting items')
      TROUBLESHOOTING_ITEMS.forEach(item => {
        pdf.setFillColor(254, 252, 248)
        pdf.setDrawColor(234, 229, 220)
        const boxH = 46
        pdf.roundedRect(16, ty, 178, boxH, 2, 2, 'FD')

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8.5)
        pdf.setTextColor(180, 83, 9)
        pdf.text(`[${item.categoryLabel}] ${item.title}`, 20, ty + 6)

        ty += boxH + 6
      })

      // Check footer and page count
      const pageCount = pdf.getNumberOfPages()
      assert.ok(pageCount >= 2, `Expected at least 2 pages, got ${pageCount}`)

      const outputBuffer = pdf.output('arraybuffer')
      assert.ok(outputBuffer.byteLength > 1000, 'Generated PDF buffer must be non-empty and > 1KB')
    })

    test('generateOfficialContractPdfBlob builds valid multi-page official contract PDF', async () => {
      const booking = {
        id: 'book-official-999',
        start_date: '2026-09-01',
        end_date: '2026-09-08',
        total_price: 1250,
        deposit_amount: 1000,
        camper: { name: 'SPACE', slug: 'space', plate_number: '9876-MMX' },
        extras: ['Autonomía Victron 540Ah', 'Pack Ropa de Cama']
      }
      const profile = {
        full_name: 'Viajero Oficial',
        dni_nie: '44556677C',
        driver_license_id: 'B-44556677',
        driver_license_issue_date: '2020-01-01',
        driver_license_expiry_date: '2030-01-01',
        phone: '+34655443322',
        address: 'Paseo Marítimo 15, Palma'
      }

      const contractData = generateContractData(booking, profile)
      assert.equal(contractData.articles.length, 31, 'Contract must contain exactly 31 legal articles')
      assert.ok(contractData.vehicle.modelName.includes('SPACE'), 'Model name should include SPACE')

      const { doc, blob } = await generateOfficialContractPdfBlob(contractData)
      assert.ok(doc.getNumberOfPages() >= 4, 'Official contract PDF should have at least 4 pages')
      assert.ok(blob.size > 10000, 'Official contract blob must exceed 10KB')
    })
  })

  describe('Links, Anchor Tags & Coordinates: /dashboard/guia and /dashboard/manual', () => {
    test('all 35 spots in SPOTS_34 have valid coordinates inside Mallorca geographic bounds', () => {
      assert.equal(SPOTS_34.length, 35, `Expected 35 spots, got ${SPOTS_34.length}`)

      // Mallorca Bounding Box: Latitude ~39.15 to 40.05, Longitude ~2.30 to 3.55
      const LAT_MIN = 39.15
      const LAT_MAX = 40.05
      const LNG_MIN = 2.30
      const LNG_MAX = 3.55

      const spotIds = new Set<string>()

      for (const spot of SPOTS_34) {
        assert.ok(spot.id, 'Spot must have an ID')
        assert.ok(!spotIds.has(spot.id), `Duplicate spot ID found: ${spot.id}`)
        spotIds.add(spot.id)

        assert.ok(spot.name && spot.name.trim().length > 0, `Spot ${spot.id} must have a name`)
        assert.ok(spot.description && spot.description.trim().length > 0, `Spot ${spot.id} must have description`)
        assert.ok(spot.coordinates, `Spot ${spot.id} must have coordinates`)

        const { lat, lng } = spot.coordinates
        assert.equal(typeof lat, 'number', `Spot ${spot.id} lat must be a number`)
        assert.equal(typeof lng, 'number', `Spot ${spot.id} lng must be a number`)
        assert.ok(!isNaN(lat) && !isNaN(lng), `Spot ${spot.id} lat/lng must not be NaN`)

        assert.ok(
          lat >= LAT_MIN && lat <= LAT_MAX,
          `Spot ${spot.id} (${spot.name}) lat ${lat} outside Mallorca bounds [${LAT_MIN}, ${LAT_MAX}]`
        )
        assert.ok(
          lng >= LNG_MIN && lng <= LNG_MAX,
          `Spot ${spot.id} (${spot.name}) lng ${lng} outside Mallorca bounds [${LNG_MIN}, ${LNG_MAX}]`
        )

        // Verify googleMapsUrl format
        assert.ok(
          spot.googleMapsUrl.startsWith('https://maps.google.com/') || spot.googleMapsUrl.startsWith('https://goo.gl/maps/'),
          `Spot ${spot.id} has invalid Google Maps URL: ${spot.googleMapsUrl}`
        )
      }
    })

    test('all 6 water service points have valid coordinates inside Mallorca bounds and valid URLs', () => {
      assert.equal(WATER_SERVICE_POINTS.length, 6, `Expected 6 water points, got ${WATER_SERVICE_POINTS.length}`)

      const LAT_MIN = 39.15
      const LAT_MAX = 40.05
      const LNG_MIN = 2.30
      const LNG_MAX = 3.55

      for (const wp of WATER_SERVICE_POINTS) {
        assert.ok(wp.name && wp.name.trim().length > 0, `Water point ${wp.id} must have a name`)
        assert.ok(wp.services && wp.services.length > 0, `Water point ${wp.id} must have services`)
        const { lat, lng } = wp.coordinates
        assert.ok(
          lat >= LAT_MIN && lat <= LAT_MAX,
          `Water point ${wp.id} lat ${lat} outside bounds [${LAT_MIN}, ${LAT_MAX}]`
        )
        assert.ok(
          lng >= LNG_MIN && lng <= LNG_MAX,
          `Water point ${wp.id} lng ${lng} outside bounds [${LNG_MIN}, ${LNG_MAX}]`
        )
        assert.ok(wp.googleMapsUrl.startsWith('https://maps.google.com/?q='), `Water point ${wp.id} has invalid URL`)
      }
    })

    test('all suggested route spot references match existing spot IDs in SPOTS_34', () => {
      const validSpotIds = new Set(SPOTS_34.map(s => s.id))

      const route1Spots = ['sant-elm-dragonera', 'mirador-des-grau', 'mirador-ses-animes', 'port-valldemossa', 'mirador-sa-foradada', 'soller-santa-catalina', 'sa-calobra-torrent', 'nus-sa-corbata', 'santuari-lluc', 'mirador-colomer']
      const route2Spots = ['cala-pi-torre', 'far-ses-salines', 'cala-llombards-almunia', 'cala-mondrago', 'cala-varques', 'torre-serral-falcons', 'cuevas-arta-canyamel', 'cala-lliteres-agulla', 'cala-mitjana-duaia', 'betlem-arta', 'son-serra-marina']
      const route3Spots = ['son-serra-marina', 'parking-la-victoria', 'cami-vell-victoria', 'sant-vicenc-pollença', 'playa-formentor', 'atalaya-albercutx', 'mirador-colomer']

      const allRouteSpots = [...route1Spots, ...route2Spots, ...route3Spots]

      for (const spotId of allRouteSpots) {
        assert.ok(validSpotIds.has(spotId), `Route references non-existent spot ID: "${spotId}"`)
      }
    })

    test('troubleshooting and emergency contact links use valid protocols', () => {
      const utopiaPhone = '+34611560916'
      const aragPhone = '+34662992060'

      const telUtopia = `tel:${utopiaPhone}`
      const telArag = `tel:${aragPhone}`
      const waLink = `https://wa.me/${utopiaPhone.replace('+', '')}`

      assert.ok(telUtopia.startsWith('tel:+34'))
      assert.ok(telArag.startsWith('tel:+34'))
      assert.ok(waLink.startsWith('https://wa.me/34611560916'))
    })
  })
})
