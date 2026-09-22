import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    parseBlockedSlots,
    RawBookingAvailability,
    RawBlockedDate,
    BlockedSlot,
} from '../lib/booking/availability'
import {
    validateBookingRange,
    getSlotAvailability,
    isSlotSelectableAsPickup,
    isSlotSelectableAsReturn,
} from '../lib/booking/calendarLogic'
import { isRedsysSuccess } from '../lib/redsys'

// =========================================================================
// SIMULATED IN-MEMORY DATABASE & REDSYS WEBHOOK LOGIC FOR E2E TESTING
// =========================================================================

export interface BookingRecord {
    id: string
    camper_id: string
    start_date: string // YYYY-MM-DD
    pickup_time?: string
    end_date: string   // YYYY-MM-DD
    dropoff_time?: string
    payment_status: 'pending' | 'paid' | 'failed'
    status: 'pending' | 'confirmed' | 'cancelled'
    payment_intent_id?: string // Redsys orderId
    created_at: string
}

export interface BlockedDateRecord {
    id: string
    camper_id: string
    start_date: string
    end_date: string
    session_id?: string
    reason?: string
    created_at: string
}

export class MockDatabase {
    bookings: BookingRecord[] = []
    blockedDates: BlockedDateRecord[] = []

    insertBooking(booking: BookingRecord) {
        this.bookings.push({ ...booking })
    }

    findBookingByOrderId(orderId: string): BookingRecord | undefined {
        return this.bookings.find(b => b.payment_intent_id === orderId)
    }

    findBlockedDateBySessionId(camperId: string, sessionId: string): BlockedDateRecord | undefined {
        return this.blockedDates.find(b => b.camper_id === camperId && b.session_id === sessionId)
    }

    insertBlockedDate(blockedDate: BlockedDateRecord) {
        this.blockedDates.push({ ...blockedDate })
    }

    updateBooking(id: string, updates: Partial<BookingRecord>) {
        const index = this.bookings.findIndex(b => b.id === id)
        if (index !== -1) {
            this.bookings[index] = { ...this.bookings[index], ...updates }
        }
    }
}

/**
 * Authoritative implementation of Redsys Webhook business logic
 * as implemented in app/api/webhooks/redsys/route.ts
 */
export async function processRedsysWebhookNotification(
    db: MockDatabase,
    notification: {
        orderId: string
        responseCode: string
    }
): Promise<{ status: number; message: string }> {
    const { orderId, responseCode } = notification
    const isSuccess = isRedsysSuccess(responseCode)

    const booking = db.findBookingByOrderId(orderId)
    if (!booking) {
        return { status: 200, message: 'Booking not found' }
    }

    if (isSuccess) {
        // 1. Mark booking as paid, keeping status 'pending' (awaiting manual admin confirmation)
        db.updateBooking(booking.id, {
            payment_status: 'paid',
            status: 'pending',
        })

        // 2. Auto-block calendar in blocked_dates to guarantee immediate occupancy reservation
        const sessionId = `redsys_${orderId}`
        const existingHold = db.findBlockedDateBySessionId(booking.camper_id, sessionId)

        // Idempotency check: only insert if not already present
        if (!existingHold) {
            db.insertBlockedDate({
                id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                camper_id: booking.camper_id,
                start_date: booking.start_date,
                end_date: booking.end_date,
                session_id: sessionId,
                reason: 'Auto-Bloqueo Redsys',
                created_at: new Date().toISOString(),
            })
        }

        return { status: 200, message: 'OK' }
    } else {
        // Payment failed or cancelled
        db.updateBooking(booking.id, {
            payment_status: 'failed',
        })
        return { status: 200, message: 'Payment Failed' }
    }
}

// =========================================================================
// TEST SUITE: R4 CALENDAR SYNC & WEBHOOK AUTO-BLOCKING
// =========================================================================

describe('R4 Calendar Sync & Webhook Auto-Blocking Test Suite', () => {

    // ---------------------------------------------------------------------
    // TIER 2: Availability Reflection & Conflict Prevention
    // ---------------------------------------------------------------------

    describe('Tier 2: Calendar Availability & Blocked Dates Reflection', () => {
        it('marks dates as fully blocked in availability when auto-block exists in blocked_dates', () => {
            const blockedDates: RawBlockedDate[] = [
                {
                    start_date: '2026-06-10',
                    end_date: '2026-06-15',
                },
            ]

            const slots = parseBlockedSlots([], blockedDates)
            assert.equal(slots.length, 6) // June 10, 11, 12, 13, 14, 15

            for (const s of slots) {
                assert.equal(s.slot, 'full')
            }

            // Verify specific dates return 'full_blocked'
            assert.equal(getSlotAvailability('2026-06-10', slots), 'full_blocked')
            assert.equal(getSlotAvailability('2026-06-12', slots), 'full_blocked')
            assert.equal(getSlotAvailability('2026-06-15', slots), 'full_blocked')
            // Outside date returns 'free'
            assert.equal(getSlotAvailability('2026-06-16', slots), 'free')
        })

        it('rejects booking attempts intersecting an auto-blocked date range', () => {
            const blockedSlots: BlockedSlot[] = parseBlockedSlots([], [
                { start_date: '2026-07-01', end_date: '2026-07-07' },
            ])

            // Attempt to book overlapping interval: July 04 to July 10
            const validation = validateBookingRange(
                '2026-07-04',
                'afternoon',
                '2026-07-10',
                'morning',
                blockedSlots,
                3
            )

            assert.equal(validation.isValid, false)
            assert.equal(validation.reason, 'blocked_dates')
        })

        it('allows booking in an available window strictly adjacent to blocked dates', () => {
            // Blocked July 01 to July 07
            const blockedSlots: BlockedSlot[] = parseBlockedSlots([], [
                { start_date: '2026-07-01', end_date: '2026-07-07' },
            ])

            // Booking immediately after: July 08 to July 12
            const validation = validateBookingRange(
                '2026-07-08',
                'afternoon',
                '2026-07-12',
                'morning',
                blockedSlots,
                3
            )

            assert.equal(validation.isValid, true)
            assert.equal(validation.reason, undefined)
        })

        it('allows morning dropoff and afternoon pickup turnover on same day for non-conflicting slots', () => {
            // Existing booking A: June 01 to June 05 with dropoff at 10:00 (morning)
            const existingBookings: RawBookingAvailability[] = [
                {
                    start_date: '2026-06-01',
                    pickup_time: '15:00',
                    end_date: '2026-06-05',
                    dropoff_time: '10:00', // Morning dropoff
                },
            ]

            const slots = parseBlockedSlots(existingBookings, [])

            // On June 05: morning is occupied by previous dropoff, afternoon is free for next pickup
            const slotJune5 = slots.find(s => s.date === '2026-06-05')
            assert.ok(slotJune5)
            assert.equal(slotJune5.slot, 'morning')

            // Pickup in afternoon on June 05 is valid
            assert.equal(isSlotSelectableAsPickup('2026-06-05', 'afternoon', slots), true)
            // Pickup in morning on June 05 is rejected
            assert.equal(isSlotSelectableAsPickup('2026-06-05', 'morning', slots), false)

            // New booking starting June 05 afternoon to June 09 morning is valid!
            const validation = validateBookingRange(
                '2026-06-05',
                'afternoon',
                '2026-06-09',
                'morning',
                slots,
                3
            )
            assert.equal(validation.isValid, true)
        })

        it('guarantees fleet camper isolation: auto-block on Camper A does not affect Camper B', () => {
            const camperA = 'camper-neo-id'
            const camperB = 'camper-space-id'

            const db = new MockDatabase()
            // Auto-block camper A
            db.insertBlockedDate({
                id: 'b1',
                camper_id: camperA,
                start_date: '2026-06-10',
                end_date: '2026-06-15',
                session_id: 'redsys_0001test',
                reason: 'Auto-Bloqueo Redsys',
                created_at: new Date().toISOString(),
            })

            // Filter blocked dates for Camper B
            const camperBBlocked = db.blockedDates.filter(b => b.camper_id === camperB)
            assert.equal(camperBBlocked.length, 0)

            // Availability for Camper B is completely free
            const camperBSlots = parseBlockedSlots([], camperBBlocked)
            const validationB = validateBookingRange(
                '2026-06-10',
                'afternoon',
                '2026-06-14',
                'morning',
                camperBSlots,
                3
            )
            assert.equal(validationB.isValid, true)
        })
    })

    // ---------------------------------------------------------------------
    // TIER 3: Webhook Auto-Blocking Processing & Idempotency
    // ---------------------------------------------------------------------

    describe('Tier 3: Webhook Execution, Auto-Blocking Insertion & Idempotency', () => {
        it('inserts auto-block in blocked_dates and sets booking to paid and pending approval on Redsys success', async () => {
            const db = new MockDatabase()
            const bookingId = 'booking-uuid-1'
            const orderId = '0001test2026'

            db.insertBooking({
                id: bookingId,
                camper_id: 'camper-neo',
                start_date: '2026-08-01',
                pickup_time: '15:00',
                end_date: '2026-08-08',
                dropoff_time: '11:00',
                payment_status: 'pending',
                status: 'pending',
                payment_intent_id: orderId,
                created_at: new Date().toISOString(),
            })

            // Webhook delivers authorization success '0000'
            const res = await processRedsysWebhookNotification(db, {
                orderId,
                responseCode: '0000',
            })

            assert.equal(res.status, 200)

            // Verify booking state
            const updatedBooking = db.findBookingByOrderId(orderId)!
            assert.equal(updatedBooking.payment_status, 'paid')
            assert.equal(updatedBooking.status, 'pending') // Kept pending for admin review

            // Verify auto-block insertion in blocked_dates
            assert.equal(db.blockedDates.length, 1)
            const hold = db.blockedDates[0]
            assert.equal(hold.camper_id, 'camper-neo')
            assert.equal(hold.start_date, '2026-08-01')
            assert.equal(hold.end_date, '2026-08-08')
            assert.equal(hold.session_id, `redsys_${orderId}`)
        })

        it('guarantees idempotency when Redsys delivers duplicate webhook notifications', async () => {
            const db = new MockDatabase()
            const orderId = '0002idempotent'

            db.insertBooking({
                id: 'booking-uuid-2',
                camper_id: 'camper-space',
                start_date: '2026-09-01',
                end_date: '2026-09-07',
                payment_status: 'pending',
                status: 'pending',
                payment_intent_id: orderId,
                created_at: new Date().toISOString(),
            })

            // 1st Webhook delivery
            await processRedsysWebhookNotification(db, { orderId, responseCode: '0000' })
            assert.equal(db.blockedDates.length, 1)

            // 2nd Webhook delivery (duplicate retry from Redsys)
            await processRedsysWebhookNotification(db, { orderId, responseCode: '0000' })
            assert.equal(db.blockedDates.length, 1, 'Duplicate webhook MUST NOT create duplicate blocked_dates records')

            // 3rd Webhook delivery (another network retry)
            await processRedsysWebhookNotification(db, { orderId, responseCode: '0000' })
            assert.equal(db.blockedDates.length, 1, 'Idempotency must hold across multiple duplicate deliveries')
        })

        it('handles concurrent duplicate webhook processing without data duplication', async () => {
            const db = new MockDatabase()
            const orderId = '0003concurrent'

            db.insertBooking({
                id: 'booking-uuid-3',
                camper_id: 'camper-neo',
                start_date: '2026-09-10',
                end_date: '2026-09-15',
                payment_status: 'pending',
                status: 'pending',
                payment_intent_id: orderId,
                created_at: new Date().toISOString(),
            })

            // Fire 5 duplicate notifications in parallel
            await Promise.all([
                processRedsysWebhookNotification(db, { orderId, responseCode: '0000' }),
                processRedsysWebhookNotification(db, { orderId, responseCode: '0000' }),
                processRedsysWebhookNotification(db, { orderId, responseCode: '0000' }),
                processRedsysWebhookNotification(db, { orderId, responseCode: '0000' }),
                processRedsysWebhookNotification(db, { orderId, responseCode: '0000' }),
            ])

            assert.equal(db.blockedDates.length, 1)
            const updated = db.findBookingByOrderId(orderId)!
            assert.equal(updated.payment_status, 'paid')
        })

        it('marks booking as failed and DOES NOT insert auto-block when Redsys returns decline code', async () => {
            const db = new MockDatabase()
            const orderId = '0004declined'

            db.insertBooking({
                id: 'booking-uuid-4',
                camper_id: 'camper-neo',
                start_date: '2026-09-20',
                end_date: '2026-09-25',
                payment_status: 'pending',
                status: 'pending',
                payment_intent_id: orderId,
                created_at: new Date().toISOString(),
            })

            // Webhook returns 9915 (User cancelled)
            const res = await processRedsysWebhookNotification(db, {
                orderId,
                responseCode: '9915',
            })

            assert.equal(res.status, 200)

            const updatedBooking = db.findBookingByOrderId(orderId)!
            assert.equal(updatedBooking.payment_status, 'failed')
            assert.equal(updatedBooking.status, 'pending') // Not approved

            // Verify NO auto-block was created in blocked_dates
            assert.equal(db.blockedDates.length, 0)

            // The dates remain 100% available for other travelers
            const slots = parseBlockedSlots([], db.blockedDates)
            const check = validateBookingRange('2026-09-20', 'afternoon', '2026-09-25', 'morning', slots, 3)
            assert.equal(check.isValid, true)
        })
    })
})
