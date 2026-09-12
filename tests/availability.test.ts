import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

export function parseBlockedRanges(
    bookings: { start_date: string; end_date: string }[],
    blocked: { start_date: string; end_date: string }[]
) {
    const allRanges = [...bookings, ...blocked]
    return allRanges.map(r => ({
        start: r.start_date.split('T')[0],
        end: r.end_date.split('T')[0],
    }))
}

describe('Availability blocked dates normalization', () => {
    it('normalizes bookings and blocked records into YYYY-MM-DD ranges', () => {
        const bookings = [{ start_date: '2026-06-10T00:00:00.000Z', end_date: '2026-06-15T00:00:00.000Z' }]
        const blocked = [{ start_date: '2026-07-01', end_date: '2026-07-05' }]
        const result = parseBlockedRanges(bookings, blocked)

        assert.equal(result.length, 2)
        assert.deepEqual(result[0], { start: '2026-06-10', end: '2026-06-15' })
        assert.deepEqual(result[1], { start: '2026-07-01', end: '2026-07-05' })
    })
})
