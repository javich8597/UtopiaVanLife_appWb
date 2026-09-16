import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    isDateBlocked,
    isRangeValid,
    getSlotAvailability,
    isSlotSelectableAsPickup,
    isSlotSelectableAsReturn,
    validateBookingRange,
    SlotAvailabilityStatus
} from '../lib/booking/calendarLogic'

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

describe('Calendar slot logic', () => {
    const slots = [
        { date: '2026-09-17', slot: 'morning' as const },
        { date: '2026-09-18', slot: 'full' as const },
        { date: '2026-09-20', slot: 'afternoon' as const },
    ]

    it('identifies slot availability status correctly', () => {
        assert.equal(getSlotAvailability('2026-09-16', slots), 'free')
        assert.equal(getSlotAvailability('2026-09-17', slots), 'morning_blocked')
        assert.equal(getSlotAvailability('2026-09-18', slots), 'full_blocked')
        assert.equal(getSlotAvailability('2026-09-20', slots), 'afternoon_blocked')
    })

    it('allows pickup in afternoon if only morning is blocked', () => {
        assert.equal(isSlotSelectableAsPickup('2026-09-17', 'morning', slots), false)
        assert.equal(isSlotSelectableAsPickup('2026-09-17', 'afternoon', slots), true)
        assert.equal(isSlotSelectableAsPickup('2026-09-18', 'afternoon', slots), false)
        assert.equal(isSlotSelectableAsPickup('2026-09-16', 'morning', slots), true)
    })

    it('allows return in morning if only afternoon is blocked', () => {
        assert.equal(isSlotSelectableAsReturn('2026-09-20', 'morning', slots), true)
        assert.equal(isSlotSelectableAsReturn('2026-09-20', 'afternoon', slots), false)
        assert.equal(isSlotSelectableAsReturn('2026-09-18', 'morning', slots), false)
        assert.equal(isSlotSelectableAsReturn('2026-09-16', 'afternoon', slots), true)
    })

    it('enforces minNights in validateBookingRange', () => {
        const valid = validateBookingRange('2026-09-21', 'afternoon', '2026-09-24', 'morning', slots, 3)
        assert.equal(valid.isValid, true)

        const invalidShort = validateBookingRange('2026-09-21', 'afternoon', '2026-09-23', 'morning', slots, 3)
        assert.equal(invalidShort.isValid, false)
        assert.equal(invalidShort.reason, 'min_nights')
    })

    it('rejects range that intersects blocked dates', () => {
        // Range 2026-09-17 to 2026-09-22 intersects 2026-09-18 which is full_blocked
        const invalidIntersect = validateBookingRange('2026-09-17', 'afternoon', '2026-09-22', 'morning', slots, 3)
        assert.equal(invalidIntersect.isValid, false)
        assert.equal(invalidIntersect.reason, 'blocked_dates')
    })
})
