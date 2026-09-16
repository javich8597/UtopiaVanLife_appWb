import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseBlockedSlots, parseBlockedRanges } from '../lib/booking/availability'

describe('Availability blocked dates normalization', () => {
    it('normalizes bookings and blocked records into YYYY-MM-DD ranges', () => {
        const bookings = [{ start_date: '2026-06-10T00:00:00.000Z', end_date: '2026-06-15T00:00:00.000Z' }]
        const blocked = [{ start_date: '2026-07-01', end_date: '2026-07-05' }]
        const result = parseBlockedRanges(bookings, blocked)

        assert.equal(result.length, 2)
        assert.deepEqual(result[0], { start: '2026-06-10', end: '2026-06-15' })
        assert.deepEqual(result[1], { start: '2026-07-01', end: '2026-07-05' })
    })

    it('marks morning blocked when booking ends at 12:00', () => {
        const bookings = [{
            start_date: '2026-09-14',
            pickup_time: '15:00',
            end_date: '2026-09-17',
            dropoff_time: '12:00',
        }]
        const slots = parseBlockedSlots(bookings, [])

        const sep14 = slots.find(s => s.date === '2026-09-14')
        const sep15 = slots.find(s => s.date === '2026-09-15')
        const sep16 = slots.find(s => s.date === '2026-09-16')
        const sep17 = slots.find(s => s.date === '2026-09-17')

        assert.equal(sep14?.slot, 'afternoon')
        assert.equal(sep15?.slot, 'full')
        assert.equal(sep16?.slot, 'full')
        assert.equal(sep17?.slot, 'morning')
    })

    it('consolidates into full if a day has checkout in morning and checkin in afternoon', () => {
        const bookings = [
            { start_date: '2026-09-10', pickup_time: '15:00', end_date: '2026-09-17', dropoff_time: '12:00' },
            { start_date: '2026-09-17', pickup_time: '15:00', end_date: '2026-09-20', dropoff_time: '12:00' },
        ]
        const slots = parseBlockedSlots(bookings, [])
        const sep17 = slots.find(s => s.date === '2026-09-17')
        assert.equal(sep17?.slot, 'full')
    })
})
