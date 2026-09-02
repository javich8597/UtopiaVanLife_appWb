import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculatePrice, formatPrice, Season, Extra } from '../lib/pricing/engine'

describe('Pricing Engine & Season Rates (TDD)', () => {
  const sampleSeasons: Season[] = [
    {
      id: 's1',
      name: 'Temporada Baja',
      start_date: '2026-01-01',
      end_date: '2026-04-30',
      price_per_night: 110,
      discount_7days_pct: 10,
    },
    {
      id: 's2',
      name: 'Temporada Alta',
      start_date: '2026-06-01',
      end_date: '2026-08-31',
      price_per_night: 165,
      discount_7days_pct: 15,
    },
  ]

  it('should calculate price for 3 nights in high season', () => {
    const start = new Date('2026-07-10')
    const end = new Date('2026-07-13')
    const breakdown = calculatePrice(start, end, sampleSeasons, [], 800)

    assert.equal(breakdown.numNights, 3)
    assert.equal(breakdown.baseTotal, 3 * 165) // 495
    assert.equal(breakdown.discountPct, 0) // < 7 nights
    assert.equal(breakdown.discountAmount, 0)
    assert.equal(breakdown.deposit, 800)
    assert.equal(breakdown.totalWithoutDeposit, 495)
    assert.equal(breakdown.grandTotal, 495 + 800)
  })

  it('should apply 7+ days discount in high season (15%)', () => {
    const start = new Date('2026-07-01')
    const end = new Date('2026-07-08') // 7 nights
    const breakdown = calculatePrice(start, end, sampleSeasons, [], 800)

    assert.equal(breakdown.numNights, 7)
    assert.equal(breakdown.baseTotal, 7 * 165) // 1155
    assert.equal(breakdown.discountPct, 15)
    assert.equal(breakdown.discountAmount, (1155 * 15) / 100) // 173.25
    assert.equal(breakdown.totalWithoutDeposit, 1155 - 173.25)
  })

  it('should sum selected extras accurately', () => {
    const start = new Date('2026-07-10')
    const end = new Date('2026-07-12') // 2 nights
    const extras: Extra[] = [
      { id: 'e1', name_es: 'Paddle Surf', price: 45, quantity: 1 },
      { id: 'e2', name_es: 'Barbacoa Portátil', price: 25, quantity: 1 },
    ]
    const breakdown = calculatePrice(start, end, sampleSeasons, extras, 800)

    assert.equal(breakdown.extrasTotal, 70)
    assert.equal(breakdown.totalWithoutDeposit, 2 * 165 + 70) // 330 + 70 = 400
  })

  it('should format EUR prices correctly', () => {
    assert.match(formatPrice(120), /120,00\s*€/)
    assert.match(formatPrice(1250.5), /1250,50\s*€/)
  })
})
