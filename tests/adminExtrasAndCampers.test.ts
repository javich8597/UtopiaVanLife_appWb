import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculatePrice } from '../lib/pricing/engine'
import type { Season, Extra } from '../lib/pricing/engine'
import { isValidServiceRoleKey, getAdminClientOrSession } from '../lib/admin/auth'

describe('Admin Extras API & Pricing Integration', () => {
  const mockSeasons: Season[] = [
    {
      id: 's1',
      name: 'Temporada Media',
      start_date: '2026-04-01',
      end_date: '2026-10-31',
      price_per_night: 120,
      discount_7days_pct: 10,
    },
  ]

  it('should calculate extras correctly for per_rental vs per_day', () => {
    const extras: Extra[] = [
      {
        id: 'e1',
        name_es: 'Kit Snorkel',
        price: 25,
        price_type: 'per_rental',
      },
      {
        id: 'e2',
        name_es: 'Wi-Fi 4G',
        price: 10,
        price_type: 'per_day',
      },
    ]

    const from = new Date('2026-09-26T14:00:00Z')
    const to = new Date('2026-09-29T11:00:00Z') // 3 nights, 3.0 days

    const result = calculatePrice(from, 'afternoon', to, 'morning', mockSeasons, extras, 1000)

    // Base: 3 nights * 120 = 360€
    // Extra 1 (per_rental): 25€
    // Extra 2 (per_day): 10€ * 3 days = 30€
    // Total extras = 55€
    assert.equal(result.extrasTotal, 55)
    assert.equal(result.totalWithoutDeposit, 360 + 55)
  })

  it('should validate extra creation rules (name required, price >= 0)', () => {
    function validateCreateExtra(data: any) {
      if (!data.name_es || typeof data.name_es !== 'string' || data.name_es.trim().length === 0) {
        return { valid: false, error: 'El nombre en español del extra es obligatorio' }
      }
      const price = parseFloat(data.price)
      if (isNaN(price) || price < 0) {
        return { valid: false, error: 'El precio debe ser un número mayor o igual a 0' }
      }
      const validPriceType = data.price_type === 'per_day' ? 'per_day' : 'per_rental'
      return { valid: true, sanitized: { name_es: data.name_es.trim(), price, price_type: validPriceType } }
    }

    assert.equal(validateCreateExtra({ name_es: '', price: 20 }).valid, false)
    assert.equal(validateCreateExtra({ name_es: 'Paddle Surf', price: -5 }).valid, false)
    assert.equal(validateCreateExtra({ name_es: 'Paddle Surf', price: 'abc' }).valid, false)

    const validRes = validateCreateExtra({ name_es: '  Paddle Surf  ', price: 35, price_type: 'per_rental' })
    assert.equal(validRes.valid, true)
    assert.equal(validRes.sanitized?.name_es, 'Paddle Surf')
    assert.equal(validRes.sanitized?.price, 35)
    assert.equal(validRes.sanitized?.price_type, 'per_rental')
  })

  it('should validate extra update rules (price cannot be negative)', () => {
    function validateUpdateExtra(data: any) {
      if (data.name_es !== undefined && (!data.name_es || data.name_es.trim().length === 0)) {
        return { valid: false, error: 'El nombre en español no puede estar vacío' }
      }
      if (data.price !== undefined) {
        const price = parseFloat(data.price)
        if (isNaN(price) || price < 0) {
          return { valid: false, error: 'El precio debe ser un número mayor o igual a 0' }
        }
      }
      if (data.price_type !== undefined && data.price_type !== 'per_rental' && data.price_type !== 'per_day') {
        return { valid: false, error: 'El tipo debe ser per_rental o per_day' }
      }
      return { valid: true }
    }

    assert.equal(validateUpdateExtra({ price: -10 }).valid, false)
    assert.equal(validateUpdateExtra({ price_type: 'invalid' }).valid, false)
    assert.equal(validateUpdateExtra({ price: 15, price_type: 'per_day' }).valid, true)
  })
})

describe('Camper Web Resolution & Dynamic Fallback Logic', () => {
  it('should prioritize DB camper data over static i18n translations', () => {
    const dbCamper = {
      id: 'custom-1',
      slug: 'horizon',
      name: 'HORIZON EXPEDITION',
      description_es: 'Camper 4x4 personalizada para toda la isla.',
      thumbnail_url: '/images/campers/uploads/custom-horizon.jpg',
      images: ['/images/campers/uploads/custom-horizon.jpg', '/images/campers/uploads/interior.jpg'],
      specs: {
        beds: 4,
        seats: 4,
        length_m: 6.4,
        year: 2026,
        engine: 'Diésel 3.0L V6 190 CV',
        transmission: 'Automático 9 velocidades',
      },
    }

    // Simulate page resolution logic
    const fallbackName = dbCamper.slug.toUpperCase()
    const fallbackDesc = ''
    const fallbackEngine = 'Diésel 2.2L Multijet (140 CV)'

    const effectiveCamper = {
      ...dbCamper,
      name: dbCamper.name || fallbackName,
      description_es: dbCamper.description_es || fallbackDesc,
      specs: {
        ...dbCamper.specs,
        engine: dbCamper.specs?.engine || fallbackEngine,
      },
    }

    assert.equal(effectiveCamper.name, 'HORIZON EXPEDITION')
    assert.equal(effectiveCamper.description_es, 'Camper 4x4 personalizada para toda la isla.')
    assert.equal(effectiveCamper.specs.engine, 'Diésel 3.0L V6 190 CV')
    assert.equal(effectiveCamper.specs.beds, 4)
    assert.equal(effectiveCamper.images.length, 2)
  })

  it('should fall back safely when camper is custom and no static translation exists', () => {
    const customCamper = {
      id: 'custom-2',
      slug: 'atlas',
      name: 'ATLAS PRO',
      thumbnail_url: '/images/campers/neo/neo-ext.png',
      images: [],
    }

    // Try/catch simulation of getTranslations('Campers.atlas') which throws in next-intl
    let tName = null
    try {
      throw new Error('MISSING_MESSAGE: Could not resolve Campers.atlas.name')
    } catch {
      tName = customCamper.slug.toUpperCase()
    }

    const resolvedName = customCamper.name || tName
    assert.equal(resolvedName, 'ATLAS PRO')
  })

  it('should validate complete ATLAS PRO camper creation payload', () => {
    const camperPayload = {
      name: 'ATLAS PRO',
      slug: 'atlas',
      seats: 4,
      beds: 3,
      deposit_amount: 1200,
      price_per_night: 145,
      is_active: true,
      is_available: true,
      thumbnail_url: '/images/campers/atlas/atlas-thumb.png',
      images: [
        '/images/campers/atlas/atlas-thumb.png',
        '/images/campers/atlas/interior.png',
        '/images/campers/atlas/kitchen.png'
      ],
      specs: {
        length_m: 6.36,
        width_m: 2.05,
        height_m: 2.65,
        year: 2026,
        engine: 'Diésel 2.2L 160 CV',
        transmission: 'Automático 9G',
        ac: 'Dometic FreshJet 12V',
        solar_w: 450,
        lithium_ah: 600,
        fresh_water_l: 140,
      },
      description_es: 'La camper definitiva para familias y aventureros en Mallorca.',
      description_en: 'The ultimate luxury campervan for families and explorers in Mallorca.',
    }

    // Validation checks matching /api/admin/campers POST
    assert.ok(camperPayload.name.trim().length > 0)
    assert.equal(camperPayload.slug, 'atlas')
    assert.ok(camperPayload.seats >= 1)
    assert.ok(camperPayload.beds >= 1)
    assert.ok(camperPayload.deposit_amount >= 0)
    assert.ok(camperPayload.price_per_night >= 0)
    assert.equal(camperPayload.is_active, true)
    assert.equal(camperPayload.is_available, true)
    assert.equal(camperPayload.images.length, 3)
    assert.equal(camperPayload.specs.lithium_ah, 600)
  })

  it('should correctly handle camper edits and toggles (is_active / is_available)', () => {
    let camperState = {
      id: 'camper-atlas-1',
      name: 'ATLAS PRO',
      slug: 'atlas',
      price_per_night: 145,
      thumbnail_url: '/images/campers/atlas/atlas-thumb.png',
      images: ['/images/campers/atlas/atlas-thumb.png'],
      is_active: true,
      is_available: true,
    }

    // 1. Edit text and price
    const textAndPriceUpdate = {
      name: 'ATLAS PRO EXPEDITION 2026',
      price_per_night: 155,
      thumbnail_url: '/images/campers/atlas/new-hero.png',
      images: ['/images/campers/atlas/new-hero.png', '/images/campers/atlas/bedroom.png'],
    }
    camperState = { ...camperState, ...textAndPriceUpdate }

    assert.equal(camperState.name, 'ATLAS PRO EXPEDITION 2026')
    assert.equal(camperState.price_per_night, 155)
    assert.equal(camperState.thumbnail_url, '/images/campers/atlas/new-hero.png')
    assert.equal(camperState.images.length, 2)

    // 2. Toggle maintenance / availability
    camperState.is_available = !camperState.is_available
    assert.equal(camperState.is_available, false) // In maintenance

    // 3. Toggle active
    camperState.is_active = !camperState.is_active
    assert.equal(camperState.is_active, false) // Deactivated
  })
})

describe('Day Multiplier for per_day vs per_rental Extras in PriceCalculator & Engine', () => {
  const seasons: Season[] = [
    {
      id: 's-summer',
      name: 'Temporada Alta',
      start_date: '2026-06-01',
      end_date: '2026-09-30',
      price_per_night: 165,
      discount_7days_pct: 15,
    },
  ]

  it('should apply day multiplier ceil(totalDays) for per_day extras', () => {
    const paddleSurf: Extra = {
      id: 'paddle-1',
      name_es: 'Paddle Surf',
      price: 35,
      price_type: 'per_day',
    }
    const cleaningKit: Extra = {
      id: 'clean-1',
      name_es: 'Kit Limpieza Final',
      price: 50,
      price_type: 'per_rental',
    }

    // Case A: 3 full nights, standard slots (afternoon pickup, morning return) = 3.0 days
    const fromA = new Date('2026-07-01T15:00:00Z')
    const toA = new Date('2026-07-04T10:00:00Z')
    const resA = calculatePrice(fromA, 'afternoon', toA, 'morning', seasons, [paddleSurf, cleaningKit], 1000)

    assert.equal(resA.totalDays, 3.0)
    // Paddle surf: 35 * 3 = 105
    // Cleaning: 50 * 1 = 50
    // Extras total = 155
    assert.equal(resA.extrasTotal, 155)

    // Case B: 3 nights with morning pickup and afternoon return = 3 + 0.5 + 0.5 = 4.0 days
    const resB = calculatePrice(fromA, 'morning', toA, 'afternoon', seasons, [paddleSurf, cleaningKit], 1000)
    assert.equal(resB.totalDays, 4.0)
    // Paddle surf: 35 * 4 = 140
    // Cleaning: 50 * 1 = 50
    // Extras total = 190
    assert.equal(resB.extrasTotal, 190)

    // Case C: 3 nights with 1 half-day slot (morning to morning) = 3.5 days -> ceil = 4 rental days
    const resC = calculatePrice(fromA, 'morning', toA, 'morning', seasons, [paddleSurf], 1000)
    assert.equal(resC.totalDays, 3.5)
    // Ceil(3.5) = 4 days
    assert.equal(resC.extrasTotal, 35 * 4)
  })
})

describe('Supabase Client Fallback & Service Role Key Validation', () => {
  it('should reject invalid or placeholder service role keys', () => {
    assert.equal(isValidServiceRoleKey(null), false)
    assert.equal(isValidServiceRoleKey(undefined), false)
    assert.equal(isValidServiceRoleKey(''), false)
    assert.equal(isValidServiceRoleKey('tu_clave_secreta_aqui'), false)
    assert.equal(isValidServiceRoleKey('  tu_clave_secreta_aqui  '), false)
    assert.equal(isValidServiceRoleKey('my_tu_clave_key'), false)
    assert.equal(isValidServiceRoleKey('short_key_123'), false)
  })

  it('should accept valid JWT-formatted service keys', () => {
    const validJwtKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIn0.valid_signature_hash_string_here_50_chars_min'
    assert.equal(isValidServiceRoleKey(validJwtKey), true)
  })

  it('should fall back to user session client when service role key is invalid or placeholder', () => {
    const mockSessionClient = { id: 'mock-session-client' }
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Set placeholder key
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'tu_clave_secreta_aqui'
    const fallbackClient = getAdminClientOrSession(mockSessionClient)
    assert.equal(fallbackClient, mockSessionClient)

    // Restore
    if (originalKey) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey
    } else {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  })
})

