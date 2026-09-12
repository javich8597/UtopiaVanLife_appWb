import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

export function isDateBlocked(dateStr: string, blockedRanges: { start: string; end: string }[]): boolean {
    return blockedRanges.some(range => dateStr >= range.start && dateStr <= range.end)
}

export function isRangeValid(start: string, end: string, blockedRanges: { start: string; end: string }[]): boolean {
    if (end <= start) return false
    return !blockedRanges.some(range => {
        return (start <= range.end && end >= range.start)
    })
}

describe('Booking calendar date logic', () => {
    const blocked = [{ start: '2026-06-15', end: '2026-06-20' }]

    it('identifies blocked dates accurately', () => {
        assert.equal(isDateBlocked('2026-06-16', blocked), true)
        assert.equal(isDateBlocked('2026-06-14', blocked), false)
        assert.equal(isDateBlocked('2026-06-21', blocked), false)
    })

    it('rejects selection ranges that overlap blocked dates', () => {
        assert.equal(isRangeValid('2026-06-10', '2026-06-22', blocked), false)
        assert.equal(isRangeValid('2026-06-10', '2026-06-14', blocked), true)
        assert.equal(isRangeValid('2026-06-21', '2026-06-25', blocked), true)
    })
})
