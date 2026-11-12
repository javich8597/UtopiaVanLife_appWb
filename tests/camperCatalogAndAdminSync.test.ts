import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveCamperContent, resolveCamperRentalConfig } from '../lib/campers/camperCatalog'
import { calculatePriceV2 } from '../lib/pricing/engine'
import { installFlows, step5Payload, NEO } from './helpers/qaFlows'

describe('Enlace Admin -> Web Pública: Catálogo Camper, Cards, Extras y Fianza', () => {
  it('resolveCamperContent refleja descripción, tarjeta resumen, fotos, equipamiento y técnica editados desde admin', () => {
    const editedCamper = {
      id: 'camper-neo-1',
      slug: 'neo',
      name: 'NEO EDITION 2026',
      description_es: 'Primer párrafo editado desde admin.\n\nSegundo párrafo editado desde admin.',
      thumbnail_url: '/images/campers/uploads/custom-portada.webp',
      images: [
        '/images/campers/uploads/custom-portada.webp',
        '/images/campers/uploads/custom-salon.webp',
        '/images/campers/uploads/custom-bano.webp',
      ],
      base_price_per_night: 145,
      deposit_amount: 1800,
      specs: {
        seats: 4,
        beds: 4,
        length_m: 6.36,
        card: {
          tagline: 'Tagline editado desde Tarjeta resumen',
          summarySpecs: [
            { icon: 'bus', text: 'Plazas de viaje: 4', wide: false },
            { icon: 'battery', text: 'Batería Litio 600Ah', wide: true },
          ],
          pills: [{ icon: 'users', label: '4 Plazas viaje' }],
          wizardHighlights: ['Destacado admin 1', 'Destacado admin 2'],
        },
        gallery_items: [
          { src: '/images/campers/uploads/custom-portada.webp', tag: 'Portada Custom' },
          { src: '/images/campers/uploads/custom-salon.webp', tag: 'Salón Custom' },
          { src: '/images/campers/uploads/custom-bano.webp', tag: 'Baño Custom' },
        ],
        floorplan_day: '/images/campers/uploads/day-custom.webp',
        floorplan_night: '/images/campers/uploads/night-custom.webp',
        description_inline_image: { src: '/images/campers/uploads/inline.webp', alt: 'Inline custom' },
        description_paragraphs: ['Primer párrafo editado desde admin.', 'Segundo párrafo editado desde admin.'],
        features: [{ icon: 'utensils', label: 'Cocina Pro', value: 'Inducción + Nevera 100L' }],
        technical_features: [{ icon: 'gauge', label: 'Motor', value: '180 CV Automático' }],
        rental: {
          standard_deposit_amount: 1800,
          flex_deposit_amount: 900,
          flex_deposit_rate_per_day: 12,
          second_driver_rate_per_day: 6,
          included: ['Seguro Premium incluido', '200 km/día incluidos'],
        },
      },
    }

    const resolved = resolveCamperContent(editedCamper)
    assert.equal(resolved.name, 'NEO EDITION 2026')
    assert.equal(resolved.card.tagline, 'Tagline editado desde Tarjeta resumen')
    assert.deepEqual(resolved.card.summarySpecs, [
      { icon: 'bus', text: 'Plazas de viaje: 4', wide: false },
      { icon: 'battery', text: 'Batería Litio 600Ah', wide: true },
    ])
    assert.deepEqual(resolved.card.pills, [{ icon: 'users', label: '4 Plazas viaje' }])
    assert.deepEqual(resolved.card.wizardHighlights, ['Destacado admin 1', 'Destacado admin 2'])
    assert.equal(resolved.thumbnailUrl, '/images/campers/uploads/custom-portada.webp')
    assert.equal(resolved.galleryImages.length, 3)
    assert.equal(resolved.galleryImages[0].tag, 'Portada Custom')
    assert.equal(resolved.floorplanDay, '/images/campers/uploads/day-custom.webp')
    assert.equal(resolved.floorplanNight, '/images/campers/uploads/night-custom.webp')
    assert.deepEqual(resolved.descriptionParagraphs, [
      'Primer párrafo editado desde admin.',
      'Segundo párrafo editado desde admin.',
    ])
    assert.deepEqual(resolved.features, [{ icon: 'utensils', label: 'Cocina Pro', value: 'Inducción + Nevera 100L' }])
    assert.deepEqual(resolved.technicalFeatures, [{ icon: 'gauge', label: 'Motor', value: '180 CV Automático' }])
    assert.equal(resolved.rental.basePricePerNight, 145)
    assert.equal(resolved.rental.standardDepositAmount, 1800)
    assert.equal(resolved.rental.flexDepositAmount, 900)
    assert.equal(resolved.rental.flexDepositRatePerDay, 12)
    assert.equal(resolved.rental.secondDriverRatePerDay, 6)
    assert.deepEqual(resolved.included, ['Seguro Premium incluido', '200 km/día incluidos'])
  })

  it('mantiene 2.000 € estándar / 1.000 € flex (+10 €/día) para filas legacy sin specs.rental', () => {
    const legacyCamper = {
      slug: 'neo',
      name: 'NEO',
      deposit_amount: 1000,
      base_price_per_night: 110,
      specs: { seats: 3, beds: 3, length_m: 5.99 },
    }
    const rental = resolveCamperRentalConfig(legacyCamper)
    assert.equal(rental.standardDepositAmount, 2000)
    assert.equal(rental.flexDepositAmount, 1000)
    assert.equal(rental.flexDepositRatePerDay, 10)
    assert.equal(rental.secondDriverRatePerDay, 5)
  })

  it('calculatePriceV2 usa precios de fianza y suplemento Flex personalizados desde admin', () => {
    const flexBreakdown = calculatePriceV2({
      startDate: '2099-06-01',
      pickupSlot: 'afternoon',
      endDate: '2099-06-05', // 4 noches / 4 días
      dropoffSlot: 'morning',
      camperBasePrice: 120,
      depositOption: 'flex_1000',
      standardDepositAmount: 1800,
      flexDepositAmount: 900,
      flexDepositRatePerDay: 15,
      secondDriverRatePerDay: 7,
    })
    assert.equal(flexBreakdown.depositAmount, 900)
    assert.equal(flexBreakdown.flexDepositRatePerDay, 15)
    assert.equal(flexBreakdown.flexDepositSupplement, 60) // 4 * 15
    assert.equal(flexBreakdown.payableTotal, 4 * 120 + 60)

    const stdBreakdown = calculatePriceV2({
      startDate: '2099-06-01',
      pickupSlot: 'afternoon',
      endDate: '2099-06-05',
      dropoffSlot: 'morning',
      camperBasePrice: 120,
      depositOption: 'standard_2000',
      secondDriver: true,
      standardDepositAmount: 1800,
      flexDepositAmount: 900,
      flexDepositRatePerDay: 15,
      secondDriverRatePerDay: 7,
    })
    assert.equal(stdBreakdown.depositAmount, 1800)
    assert.equal(stdBreakdown.secondDriverRatePerDay, 7)
    assert.equal(stdBreakdown.secondDriverSupplement, 28) // 4 * 7
  })

  it('el panel de edición de campers tiene exactamente las 6 pestañas solicitadas', () => {
    const editorSrc = readFileSync('app/[locale]/admin/campers/CamperEditorModal.tsx', 'utf8')
    const expectedTabs = [
      'Tarjeta resumen',
      'Fotos',
      'Descripción',
      'Características/Equipamiento',
      'Características Técnicas',
      'Alquiler',
    ]
    for (const label of expectedTabs) {
      assert.ok(editorSrc.includes(`label: '${label}'`), `Falta la pestaña ${label}`)
    }
  })

  it('Step4Extras y BookingWizardClient usan los extras de la BD (availableExtras) en lugar de ignorarlos', () => {
    const step4Src = readFileSync('app/[locale]/reserva/[slug]/Step4Extras.tsx', 'utf8')
    const wizardSrc = readFileSync('app/[locale]/reserva/[slug]/BookingWizardClient.tsx', 'utf8')
    assert.match(step4Src, /availableExtras\.length > 0/)
    assert.match(wizardSrc, /effectiveAvailableExtras/)
  })
})

describe('Checkout server-side con fianza y extras configurados desde admin', () => {
  let flows: ReturnType<typeof installFlows>
  const silenced = { error: console.error, warn: console.warn }

  beforeEach(() => {
    flows = installFlows({
      campers: [
        {
          ...NEO,
          deposit_amount: 1600,
          specs: {
            seats: 3,
            rental: {
              standard_deposit_amount: 1600,
              flex_deposit_amount: 750,
              flex_deposit_rate_per_day: 12,
              second_driver_rate_per_day: 6,
            },
          },
        },
      ],
      extras: [
        {
          id: 'db-extra-sup',
          name_es: 'Paddle Surf Admin',
          category: 'Deporte',
          price: 55,
          price_type: 'per_rental',
          is_active: true,
        },
      ],
    })
    console.error = () => {}
    console.warn = () => {}
  })
  afterEach(() => {
    flows.fake.restore()
    Object.assign(console, silenced)
  })

  it('aplica la fianza estándar, fianza flex, tasa flex y precio de extra de la BD al reservar', async () => {
    const { status, json } = await flows.checkout(
      step5Payload(
        {
          depositOption: 'flex_1000',
          extrasSelected: [{ id: 'db-extra-sup', quantity: 2 }],
        },
        { depositOption: 'flex_1000' }
      )
    )
    assert.equal(status, 200, json.error)
    assert.equal(json.breakdown.depositAmount, 750)
    assert.equal(json.breakdown.flexDepositRatePerDay, 12)
    assert.equal(json.breakdown.flexDepositSupplement, 12 * 7)
    assert.equal(json.breakdown.extrasTotal, 55 * 2)
    assert.equal(flows.fake.tables.bookings[0].deposit_amount, 750)
  })
})

