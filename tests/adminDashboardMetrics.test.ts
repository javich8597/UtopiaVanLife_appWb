import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateMonthlyRevenue,
  calculateFleetOccupancy,
  calculateAverageTicket,
  calculateGlobalOccupancy
} from '../lib/admin/dashboardMetrics'

describe('Admin Dashboard Metrics (TDD)', () => {
  const mockCampers = [
    { id: 'c1', name: 'NEO', slug: 'neo', thumbnail_url: '/neo.jpg' },
    { id: 'c2', name: 'SPACE', slug: 'space', thumbnail_url: '/space.jpg' }
  ]

  const mockBookings = [
    {
      id: 'b1',
      camper_id: 'c1',
      start_date: '2026-10-01',
      end_date: '2026-10-07',
      total_price: 700,
      status: 'confirmed'
    },
    {
      id: 'b2',
      camper_id: 'c2',
      start_date: '2026-09-15',
      end_date: '2026-09-20',
      total_price: 600,
      status: 'completed'
    },
    {
      id: 'b3',
      camper_id: 'c1',
      start_date: '2026-10-10',
      end_date: '2026-10-12',
      total_price: 300,
      status: 'pending' // Should NOT count in confirmed revenue or occupancy
    }
  ]

  it('should calculate 6 consecutive months leading up to referenceDate', () => {
    const refDate = new Date(2026, 9, 15) // October 2026
    const monthly = calculateMonthlyRevenue(mockBookings, refDate)

    assert.equal(monthly.length, 6)
    assert.equal(monthly[5].month, 'Oct')
    assert.equal(monthly[5].year, 2026)
    assert.equal(monthly[5].isCurrentMonth, true)
    assert.equal(monthly[4].month, 'Sep')
    assert.equal(monthly[0].month, 'May')
  })

  it('should accurately aggregate revenue and booking counts by month', () => {
    const refDate = new Date(2026, 9, 15) // October 2026
    const monthly = calculateMonthlyRevenue(mockBookings, refDate)

    const sep = monthly.find(m => m.month === 'Sep')!
    const oct = monthly.find(m => m.month === 'Oct')!

    assert.equal(sep.revenue, 600)
    assert.equal(sep.bookingsCount, 1)

    // b1 is 700 confirmed, b3 is pending so only 700
    assert.equal(oct.revenue, 700)
    assert.equal(oct.bookingsCount, 1)
  })

  it('should calculate fleet occupancy for the current month', () => {
    const refDate = new Date(2026, 9, 15) // October has 31 days
    const occupancy = calculateFleetOccupancy(mockCampers, mockBookings, refDate)

    assert.equal(occupancy.length, 2)

    const neo = occupancy.find(c => c.name === 'NEO')!
    const space = occupancy.find(c => c.name === 'SPACE')!

    // NEO has 1 booking: Oct 1 to Oct 7 (7 days: 1, 2, 3, 4, 5, 6, 7)
    assert.equal(neo.totalDaysInMonth, 31)
    assert.equal(neo.bookedDays, 7)
    // 7 / 31 = 22.58% -> 23%
    assert.equal(neo.occupancyPercent, 23)
    assert.equal(neo.availableDays, 24)

    // SPACE has no October bookings in mock
    assert.equal(space.bookedDays, 0)
    assert.equal(space.occupancyPercent, 0)
    assert.equal(space.availableDays, 31)
  })

  it('should calculate average ticket and global fleet occupancy safely', () => {
    assert.equal(calculateAverageTicket(1400, 2), 700)
    assert.equal(calculateAverageTicket(0, 0), 0)
    assert.equal(calculateAverageTicket(1000, 0), 0)

    const sampleOccupancy = [
      { id: '1', name: 'NEO', slug: 'neo', thumbnailUrl: null, totalDaysInMonth: 30, bookedDays: 15, occupancyPercent: 50, availableDays: 15 },
      { id: '2', name: 'SPACE', slug: 'space', thumbnailUrl: null, totalDaysInMonth: 30, bookedDays: 21, occupancyPercent: 70, availableDays: 9 },
    ]
    assert.equal(calculateGlobalOccupancy(sampleOccupancy), 60)
    assert.equal(calculateGlobalOccupancy([]), 0)
  })
})

