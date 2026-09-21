import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  SeasonV2,
  SeasonPeriod,
  DurationDiscount,
  resolveSeasonForDate,
  hasOverlappingPeriods,
  resolveDurationDiscount,
  calculatePriceV2,
  getMinNightsForDateV2
} from '../lib/pricing/engine'

describe('Seasons & Discounts Engine (V2)', () => {
  const sampleSeasons: SeasonV2[] = [
    {
      id: 'sec-baja',
      code: 'baja',
      name: 'Temporada Baja',
      supplement_per_night: 0,
      min_nights: 3,
      is_default: true,
      color_badge: '#64748b'
    },
    {
      id: 'sec-media',
      code: 'media',
      name: 'Temporada Media',
      supplement_per_night: 15,
      min_nights: 4,
      is_default: false,
      color_badge: '#2563eb'
    },
    {
      id: 'sec-alta',
      code: 'alta',
      name: 'Temporada Alta',
      supplement_per_night: 40,
      min_nights: 5,
      is_default: false,
      color_badge: '#dc2626'
    }
  ]

  const samplePeriods: SeasonPeriod[] = [
    {
      id: 'p-semana-santa',
      season_id: 'sec-alta',
      start_date: '2026-03-28',
      end_date: '2026-04-06',
      label: 'Semana Santa'
    },
    {
      id: 'p-verano',
      season_id: 'sec-alta',
      start_date: '2026-06-15',
      end_date: '2026-09-15',
      label: 'Verano'
    },
    {
      id: 'p-primavera',
      season_id: 'sec-media',
      start_date: '2026-05-01',
      end_date: '2026-06-14',
      label: 'Primavera'
    }
  ]

  const sampleDiscounts: DurationDiscount[] = [
    { id: 'd1', min_days: 7, discount_pct: 10, is_active: true },
    { id: 'd2', min_days: 14, discount_pct: 15, is_active: true },
    { id: 'd3', min_days: 21, discount_pct: 20, is_active: true },
    { id: 'd4', min_days: 30, discount_pct: 25, is_active: false } // inactive
  ]

  describe('resolveSeasonForDate', () => {
    it('should resolve Alta during Semana Santa', () => {
      const season = resolveSeasonForDate(new Date('2026-04-01'), sampleSeasons, samplePeriods)
      assert.equal(season.code, 'alta')
      assert.equal(season.supplement_per_night, 40)
    })

    it('should resolve Media in May', () => {
      const season = resolveSeasonForDate('2026-05-15', sampleSeasons, samplePeriods)
      assert.equal(season.code, 'media')
      assert.equal(season.supplement_per_night, 15)
    })

    it('should fallback to default Baja for unmapped dates', () => {
      const season = resolveSeasonForDate('2026-01-15', sampleSeasons, samplePeriods)
      assert.equal(season.code, 'baja')
      assert.equal(season.supplement_per_night, 0)
    })
  })

  describe('hasOverlappingPeriods', () => {
    it('should detect overlap when new period intersects existing period', () => {
      const isOverlap = hasOverlappingPeriods(
        { start_date: '2026-06-10', end_date: '2026-06-20' },
        samplePeriods
      )
      assert.equal(isOverlap, true) // overlaps with p-verano (2026-06-15..) and p-primavera (..2026-06-14)
    })

    it('should allow adjacent non-overlapping periods', () => {
      const isOverlap = hasOverlappingPeriods(
        { start_date: '2026-04-07', end_date: '2026-04-30' },
        samplePeriods
      )
      assert.equal(isOverlap, false)
    })

    it('should ignore period itself when editing (matching id)', () => {
      const isOverlap = hasOverlappingPeriods(
        { id: 'p-semana-santa', start_date: '2026-03-27', end_date: '2026-04-06' },
        samplePeriods
      )
      assert.equal(isOverlap, false)
    })
  })

  describe('resolveDurationDiscount', () => {
    it('should give 0% discount for < 7 days', () => {
      const res = resolveDurationDiscount(5, sampleDiscounts)
      assert.equal(res.discountPct, 0)
      assert.equal(res.matchedTier, undefined)
    })

    it('should give 10% discount for 7 to 13 days', () => {
      const res = resolveDurationDiscount(7, sampleDiscounts)
      assert.equal(res.discountPct, 10)
      assert.equal(res.matchedTier?.min_days, 7)

      const res10 = resolveDurationDiscount(10.5, sampleDiscounts)
      assert.equal(res10.discountPct, 10)
    })

    it('should give 15% discount for 14 to 20 days', () => {
      const res = resolveDurationDiscount(14, sampleDiscounts)
      assert.equal(res.discountPct, 15)
      assert.equal(res.matchedTier?.min_days, 14)
    })

    it('should give 20% discount for 21+ days and ignore inactive 30d tier', () => {
      const res = resolveDurationDiscount(35, sampleDiscounts)
      assert.equal(res.discountPct, 20)
      assert.equal(res.matchedTier?.min_days, 21)
    })
  })

  describe('calculatePriceV2 with Base Camper + Season Supplement', () => {
    it('should calculate NEO (base 110) in Baja (sup +0) for 3 nights', () => {
      const breakdown = calculatePriceV2({
        startDate: new Date('2026-01-10'),
        endDate: new Date('2026-01-13'),
        camperBasePrice: 110,
        seasons: sampleSeasons,
        periods: samplePeriods,
        discounts: sampleDiscounts,
        depositAmount: 800
      })

      assert.equal(breakdown.numNights, 3)
      assert.equal(breakdown.baseTotal, 3 * 110) // 330
      assert.equal(breakdown.discountPct, 0)
      assert.equal(breakdown.deposit, 800)
      assert.equal(breakdown.grandTotal, 330 + 800)
    })

    it('should calculate SPACE (base 135) in Alta (sup +40 => 175) for 7 nights with 10% discount', () => {
      const breakdown = calculatePriceV2({
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-08'),
        camperBasePrice: 135,
        seasons: sampleSeasons,
        periods: samplePeriods,
        discounts: sampleDiscounts,
        depositAmount: 900
      })

      const expectedNightPrice = 135 + 40 // 175
      const expectedBase = 7 * expectedNightPrice // 1225
      const expectedDiscount = Math.round((expectedBase * 0.10) * 100) / 100 // 122.50

      assert.equal(breakdown.numNights, 7)
      assert.equal(breakdown.baseTotal, expectedBase)
      assert.equal(breakdown.discountPct, 10)
      assert.equal(breakdown.discountAmount, expectedDiscount)
      assert.equal(breakdown.totalWithoutDeposit, expectedBase - expectedDiscount)
      assert.equal(breakdown.grandTotal, expectedBase - expectedDiscount + 900)
    })

    it('should handle cross-season dates correctly (e.g. 2 nights Media + 2 nights Alta)', () => {
      // Primavera ends 2026-06-14 (Media), Verano starts 2026-06-15 (Alta)
      // Booking from 2026-06-13 to 2026-06-17:
      // Night 0 (June 13): Media (110 + 15 = 125)
      // Night 1 (June 14): Media (110 + 15 = 125)
      // Night 2 (June 15): Alta (110 + 40 = 150)
      // Night 3 (June 16): Alta (110 + 40 = 150)
      const breakdown = calculatePriceV2({
        startDate: new Date('2026-06-13'),
        endDate: new Date('2026-06-17'),
        camperBasePrice: 110,
        seasons: sampleSeasons,
        periods: samplePeriods,
        discounts: sampleDiscounts,
        depositAmount: 800
      })

      assert.equal(breakdown.numNights, 4)
      assert.equal(breakdown.baseTotal, 125 + 125 + 150 + 150) // 550
      assert.equal(breakdown.nightsPerSeason.length, 2)
    })

    it('should return correct minimum nights for season with getMinNightsForDateV2', () => {
      const minAlta = getMinNightsForDateV2(new Date('2026-07-10'), sampleSeasons, samplePeriods)
      assert.equal(minAlta, 5)

      const minMedia = getMinNightsForDateV2(new Date('2026-05-10'), sampleSeasons, samplePeriods)
      assert.equal(minMedia, 4)

      const minBaja = getMinNightsForDateV2(new Date('2026-02-10'), sampleSeasons, samplePeriods)
      assert.equal(minBaja, 3)
    })
  })

  describe('Admin API Payloads Validation', () => {
    function validatePeriodPayload(body: any, existingPeriods: SeasonPeriod[]) {
      const { season_id, start_date, end_date, id } = body || {}
      if (!season_id) return { status: 400, error: 'El ID de la temporada es obligatorio' }
      const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
      if (!start_date || !end_date || !DATE_REGEX.test(start_date) || !DATE_REGEX.test(end_date)) {
        return { status: 400, error: 'Formato de fecha inválido' }
      }
      if (end_date < start_date) {
        return { status: 400, error: 'La fecha de fin no puede ser anterior a la fecha de inicio' }
      }
      if (hasOverlappingPeriods({ id, start_date, end_date }, existingPeriods)) {
        return { status: 409, error: 'El periodo seleccionado se solapa con otro periodo' }
      }
      return { status: 200, valid: true }
    }

    function validateDiscountPayload(body: any) {
      const { min_days, discount_pct } = body || {}
      const parsedDays = parseInt(min_days, 10)
      if (isNaN(parsedDays) || parsedDays < 2) {
        return { status: 400, error: 'min_days debe ser >= 2' }
      }
      const parsedPct = parseFloat(discount_pct)
      if (isNaN(parsedPct) || parsedPct < 0 || parsedPct > 100) {
        return { status: 400, error: 'discount_pct debe estar entre 0 y 100' }
      }
      return { status: 200, valid: true }
    }

    it('should reject invalid period date formats or inverted ranges', () => {
      assert.equal(validatePeriodPayload({ season_id: 'sec-alta', start_date: 'invalid', end_date: '2026-07-10' }, samplePeriods).status, 400)
      assert.equal(validatePeriodPayload({ season_id: 'sec-alta', start_date: '2026-08-10', end_date: '2026-08-01' }, samplePeriods).status, 400)
    })

    it('should reject period that collides with an existing period with 409', () => {
      const res = validatePeriodPayload(
        { season_id: 'sec-media', start_date: '2026-07-01', end_date: '2026-07-10' },
        samplePeriods
      )
      assert.equal(res.status, 409)
    })

    it('should accept non-overlapping valid period with 200', () => {
      const res = validatePeriodPayload(
        { season_id: 'sec-media', start_date: '2026-10-01', end_date: '2026-10-15' },
        samplePeriods
      )
      assert.equal(res.status, 200)
    })

    it('should reject discount tiers with min_days < 2 or discount_pct > 100', () => {
      assert.equal(validateDiscountPayload({ min_days: 1, discount_pct: 10 }).status, 400)
      assert.equal(validateDiscountPayload({ min_days: 7, discount_pct: -5 }).status, 400)
      assert.equal(validateDiscountPayload({ min_days: 7, discount_pct: 105 }).status, 400)
      assert.equal(validateDiscountPayload({ min_days: 14, discount_pct: 15 }).status, 200)
    })
  })
})
