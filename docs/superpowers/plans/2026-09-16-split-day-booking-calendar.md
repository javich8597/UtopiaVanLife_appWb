# Split-Day Booking Calendar (Holo-Van Style) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement a half-day booking calendar with diagonal split cells, reactive pick-up and return time slot selectors, half-day (+0.5) proportional pricing, and season-based minimum night enforcement.

**Architecture:** Extend pricing engine and availability logic to support morning/afternoon slots, update `BookingCalendar.tsx` with CSS diagonal split rendering and slot selectors, connect `PriceCalculator.tsx` with min-night validation and query param passing to checkout, and add `min_nights` management in the admin settings page.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, date-fns, Framer Motion, Supabase, Node.js test runner (`tsx --test`).

---

### Task 1: Pricing Engine TDD & Implementation for Half-Days & Min Nights

**Files:**
- Modify: `tests/pricing.test.ts`
- Modify: `lib/pricing/engine.ts`

- [x] **Step 1: Write the failing tests for half-day pricing and minimum nights**

In `tests/pricing.test.ts`, add test cases for the 4 slot combinations and `getMinNightsForDate`:

```typescript
it('should calculate 3 days for afternoon pickup to morning dropoff (standard 3 nights)', () => {
  const start = new Date('2026-07-10')
  const end = new Date('2026-07-13')
  const breakdown = calculatePrice(start, 'afternoon', end, 'morning', sampleSeasons, [], 800)
  assert.equal(breakdown.totalDays, 3.0)
  assert.equal(breakdown.baseTotal, 3 * 165)
})

it('should calculate 3.5 days for afternoon pickup to afternoon dropoff (+0.5 day)', () => {
  const start = new Date('2026-07-10')
  const end = new Date('2026-07-13')
  const breakdown = calculatePrice(start, 'afternoon', end, 'afternoon', sampleSeasons, [], 800)
  assert.equal(breakdown.totalDays, 3.5)
  assert.equal(breakdown.baseTotal, 3.5 * 165)
})

it('should calculate 3.5 days for morning pickup to morning dropoff (+0.5 day)', () => {
  const start = new Date('2026-07-10')
  const end = new Date('2026-07-13')
  const breakdown = calculatePrice(start, 'morning', end, 'morning', sampleSeasons, [], 800)
  assert.equal(breakdown.totalDays, 3.5)
  assert.equal(breakdown.baseTotal, 3.5 * 165)
})

it('should calculate 4.0 days for morning pickup to afternoon dropoff (+1.0 day)', () => {
  const start = new Date('2026-07-10')
  const end = new Date('2026-07-13')
  const breakdown = calculatePrice(start, 'morning', end, 'afternoon', sampleSeasons, [], 800)
  assert.equal(breakdown.totalDays, 4.0)
  assert.equal(breakdown.baseTotal, 4.0 * 165)
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm.cmd test`  
Expected: FAIL because `calculatePrice` does not yet accept slot arguments or return `totalDays`.

- [x] **Step 3: Update `lib/pricing/engine.ts` to implement half-day logic**

Add `DaySlot = 'morning' | 'afternoon'` and update `calculatePrice` signature and formula:
```typescript
export type DaySlot = 'morning' | 'afternoon'

export interface Season {
    id: string
    name: string
    start_date: string
    end_date: string
    price_per_night: number
    discount_7days_pct: number
    min_nights?: number
}

export interface PriceBreakdown {
    numNights: number
    totalDays: number
    nightsPerSeason: { season: string; nights: number; pricePerNight: number; subtotal: number }[]
    baseTotal: number
    discountPct: number
    discountAmount: number
    extrasTotal: number
    deposit: number
    totalWithoutDeposit: number
    grandTotal: number
}

export function getMinNightsForDate(date: Date, seasons: Season[]): number {
    const active = findSeason(date, seasons)
    return active?.min_nights ?? 3
}

export function calculatePrice(
    startDate: Date,
    startSlot: DaySlot = 'afternoon',
    endDate: Date,
    endSlot: DaySlot = 'morning',
    seasons: Season[],
    selectedExtras: Extra[],
    depositAmount: number
): PriceBreakdown {
    const msPerDay = 1000 * 60 * 60 * 24
    const baseNights = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay)

    if (baseNights <= 0) {
        return emptyBreakdown(depositAmount)
    }

    const startSeason = findSeason(startDate, seasons)
    const endSeason = findSeason(endDate, seasons)
    const startPrice = startSeason?.price_per_night ?? 120
    const endPrice = endSeason?.price_per_night ?? 120

    let extraDays = 0
    let extraSlotCost = 0

    if (startSlot === 'morning') {
        extraDays += 0.5
        extraSlotCost += startPrice * 0.5
    }
    if (endSlot === 'afternoon') {
        extraDays += 0.5
        extraSlotCost += endPrice * 0.5
    }

    const totalDays = baseNights + extraDays

    // Compute standard nights
    const nightsPerSeason: Record<string, { season: string; nights: number; pricePerNight: number; subtotal: number }> = {}
    let baseTotal = 0

    for (let i = 0; i < baseNights; i++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(currentDate.getDate() + i)

        const activeSeason = findSeason(currentDate, seasons)
        const pricePerNight = activeSeason?.price_per_night ?? 120
        const seasonName = activeSeason?.name ?? 'Temporada Estándar'

        if (!nightsPerSeason[seasonName]) {
            nightsPerSeason[seasonName] = { season: seasonName, nights: 0, pricePerNight, subtotal: 0 }
        }
        nightsPerSeason[seasonName].nights++
        nightsPerSeason[seasonName].subtotal += pricePerNight
        baseTotal += pricePerNight
    }

    baseTotal += extraSlotCost

    const maxDiscount = totalDays >= 7
        ? Math.max(...seasons.filter(s => Object.keys(nightsPerSeason).includes(s.name)).map(s => s.discount_7days_pct), 0)
        : 0

    const discountAmount = (baseTotal * maxDiscount) / 100
    const discountedBase = baseTotal - discountAmount
    const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price * (e.quantity ?? 1), 0)

    return {
        numNights: baseNights,
        totalDays,
        nightsPerSeason: Object.values(nightsPerSeason),
        baseTotal,
        discountPct: maxDiscount,
        discountAmount,
        extrasTotal,
        deposit: depositAmount,
        totalWithoutDeposit: discountedBase + extrasTotal,
        grandTotal: discountedBase + extrasTotal + depositAmount,
    }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm.cmd test`  
Expected: PASS (all tests green).

- [x] **Step 5: Commit**

```bash
git add tests/pricing.test.ts lib/pricing/engine.ts
git commit -m "feat(pricing): add half-day slot pricing calculation and min-nights support"
```

---

### Task 2: Availability Model & Slots Logic TDD

**Files:**
- Create: `lib/booking/availability.ts`
- Modify: `tests/availability.test.ts`
- Modify: `app/api/campers/[slug]/availability/route.ts`

- [x] **Step 1: Write failing tests for `parseBlockedSlots`**

In `tests/availability.test.ts`:
```typescript
import { parseBlockedSlots, BlockedSlot } from '../lib/booking/availability'

describe('parseBlockedSlots with morning/afternoon granularity', () => {
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
        const sep17 = slots.find(s => s.date === '2026-09-17')

        assert.equal(sep14?.slot, 'afternoon')
        assert.equal(sep15?.slot, 'full')
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
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm.cmd test`  
Expected: FAIL because `lib/booking/availability.ts` does not exist yet.

- [x] **Step 3: Implement `lib/booking/availability.ts`**

```typescript
export interface BlockedSlot {
    date: string // YYYY-MM-DD
    slot: 'morning' | 'afternoon' | 'full'
    reason?: 'booking' | 'blocked'
}

export function parseBlockedSlots(
    bookings: { start_date: string; pickup_time?: string; end_date: string; dropoff_time?: string }[],
    blockedDates: { start_date: string; end_date: string }[]
): BlockedSlot[] {
    const slotMap = new Map<string, 'morning' | 'afternoon' | 'full'>()

    // Process administrative full blocked dates
    for (const b of blockedDates) {
        const start = new Date(b.start_date.split('T')[0])
        const end = new Date(b.end_date.split('T')[0])
        const current = new Date(start)
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0]
            slotMap.set(dateStr, 'full')
            current.setDate(current.getDate() + 1)
        }
    }

    // Process bookings
    for (const b of bookings) {
        const startStr = b.start_date.split('T')[0]
        const endStr = b.end_date.split('T')[0]
        const pickupHour = parseInt((b.pickup_time || '15:00').split(':')[0], 10)
        const dropoffHour = parseInt((b.dropoff_time || '12:00').split(':')[0], 10)

        const startSlot: 'morning' | 'afternoon' | 'full' = pickupHour < 14 ? 'full' : 'afternoon'
        const endSlot: 'morning' | 'afternoon' | 'full' = dropoffHour > 14 ? 'full' : 'morning'

        if (startStr === endStr) {
            slotMap.set(startStr, 'full')
            continue
        }

        // Start day
        const existingStart = slotMap.get(startStr)
        if (existingStart === 'full' || (existingStart === 'morning' && startSlot === 'afternoon')) {
            slotMap.set(startStr, 'full')
        } else {
            slotMap.set(startStr, startSlot)
        }

        // Days in between
        const current = new Date(startStr)
        current.setDate(current.getDate() + 1)
        const endDate = new Date(endStr)
        while (current < endDate) {
            slotMap.set(current.toISOString().split('T')[0], 'full')
            current.setDate(current.getDate() + 1)
        }

        // End day
        const existingEnd = slotMap.get(endStr)
        if (existingEnd === 'full' || (existingEnd === 'afternoon' && endSlot === 'morning')) {
            slotMap.set(endStr, 'full')
        } else {
            slotMap.set(endStr, endSlot)
        }
    }

    return Array.from(slotMap.entries()).map(([date, slot]) => ({ date, slot }))
}
```

- [x] **Step 4: Update `/api/campers/[slug]/availability/route.ts`**

Update the route to return `blockedSlots: BlockedSlot[]` along with backward-compatible `blockedRanges`.

- [x] **Step 5: Run tests to verify they pass**

Run: `npm.cmd test`  
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add lib/booking/availability.ts tests/availability.test.ts app/api/campers/[slug]/availability/route.ts
git commit -m "feat(availability): add parseBlockedSlots supporting morning and afternoon slots"
```

---

### Task 3: Calendar Date Logic & Range Validity TDD

**Files:**
- Create: `lib/booking/calendarLogic.ts`
- Modify: `tests/bookingCalendar.test.ts`

- [x] **Step 1: Write failing tests for `calendarLogic.ts`**

In `tests/bookingCalendar.test.ts`:
```typescript
import {
    getSlotAvailability,
    isSlotSelectableAsPickup,
    isSlotSelectableAsReturn,
    validateBookingRange
} from '../lib/booking/calendarLogic'

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
    })

    it('allows return in morning if only afternoon is blocked', () => {
        assert.equal(isSlotSelectableAsReturn('2026-09-20', 'morning', slots), true)
        assert.equal(isSlotSelectableAsReturn('2026-09-20', 'afternoon', slots), false)
    })

    it('enforces minNights in validateBookingRange', () => {
        const valid = validateBookingRange('2026-09-21', 'afternoon', '2026-09-24', 'morning', slots, 3)
        assert.equal(valid.isValid, true)

        const invalidShort = validateBookingRange('2026-09-21', 'afternoon', '2026-09-23', 'morning', slots, 3)
        assert.equal(invalidShort.isValid, false)
        assert.equal(invalidShort.reason, 'min_nights')
    })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm.cmd test`  
Expected: FAIL because `calendarLogic.ts` does not exist.

- [x] **Step 3: Implement `lib/booking/calendarLogic.ts`**

Implement `getSlotAvailability`, `isSlotSelectableAsPickup`, `isSlotSelectableAsReturn`, and `validateBookingRange`.

- [x] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test`  
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add lib/booking/calendarLogic.ts tests/bookingCalendar.test.ts
git commit -m "feat(calendar): implement calendarLogic for slot validation and min-nights"
```

---

### Task 4: Update `BookingCalendar.tsx` UI with Diagonal Splits & Slot Controls

**Files:**
- Modify: `components/booking/BookingCalendar.tsx`

- [x] **Step 1: Update component Props and State**

Replace flat string dates with:
```typescript
export interface BookingCalendarProps {
    startDate: string // YYYY-MM-DD
    startSlot: 'morning' | 'afternoon'
    endDate: string   // YYYY-MM-DD
    endSlot: 'morning' | 'afternoon'
    onChange: (start: string, startSlot: 'morning' | 'afternoon', end: string, endSlot: 'morning' | 'afternoon') => void
    blockedSlots?: BlockedSlot[]
    minNights?: number
    minDate?: Date
    onClose?: () => void
}
```

- [x] **Step 2: Render diagonal gradients for half-day occupied days**

In the day render function:
```tsx
const slotStatus = getSlotAvailability(dateStr, blockedSlots)
// Render day button with appropriate background:
// - morning_blocked: bg-gradient diagonal from-sand-dark (top-left) to transparent
// - afternoon_blocked: bg-gradient diagonal from transparent to sand-dark (bottom-right)
// - full_blocked: disabled, strikethrough
```

- [x] **Step 3: Add `PICK-UP TIME` and `RETURN TIME` selectors below calendar**

```tsx
<div className="booking-cal__slots">
    <div className="booking-cal__slot-group">
        <label className="booking-cal__slot-label">HORA DE RECOGIDA</label>
        <div className="booking-cal__slot-buttons">
            <button
                type="button"
                disabled={!canPickupMorning}
                onClick={() => handlePickupSlotChange('morning')}
                className={`booking-cal__slot-btn ${startSlot === 'morning' ? 'active' : ''}`}
            >
                Mañana 09–12h
            </button>
            <button
                type="button"
                disabled={!canPickupAfternoon}
                onClick={() => handlePickupSlotChange('afternoon')}
                className={`booking-cal__slot-btn ${startSlot === 'afternoon' ? 'active' : ''}`}
            >
                Tarde 15–19h
            </button>
        </div>
    </div>
    {/* Return time group */}
</div>
```

- [x] **Step 4: Implement auto-selection logic on day click**

When the user clicks a day:
- If morning is blocked $\to$ auto-set `startSlot = 'afternoon'`.
- If clicking return day and afternoon is blocked $\to$ auto-set `endSlot = 'morning'`.

- [x] **Step 5: Add visual legend and min-night indicator message**

Render compact legend:
- ◺ Mañana ocupada (Recogida a partir de 15:00)
- ◿ Tarde ocupada (Devolución antes de 12:00)
- Aviso de estancia mínima si `days < minNights`.

- [x] **Step 6: Run tests and verify compile**

Run: `npm.cmd test`  
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add components/booking/BookingCalendar.tsx
git commit -m "feat(ui): add diagonal split-day cells and time slot selectors to BookingCalendar"
```

---

### Task 5: Integrate `PriceCalculator.tsx` & Checkout Query Parameters

**Files:**
- Modify: `components/booking/PriceCalculator.tsx`

- [x] **Step 1: Update State in `PriceCalculator.tsx`**

Add `startSlot` (default `'afternoon'`) and `endSlot` (default `'morning'`), and `blockedSlots` from API.

- [x] **Step 2: Update `calculatePrice` integration**

Pass `startSlot` and `endSlot` to `calculatePrice`.  
Calculate active `minNights` using `getMinNightsForDate(new Date(startDate), seasons)`.

- [x] **Step 3: Update trip summary card**

Show:
`{breakdown.totalDays} días`  
`Recogida: {formatDate(startDate)} ({startSlot === 'morning' ? '09:00h' : '15:00h'})`  
`Devolución: {formatDate(endDate)} ({endSlot === 'morning' ? '12:00h' : '19:00h'})`

- [x] **Step 4: Disable Reserve button if `breakdown.numNights < minNights`**

Display helper text: `Estancia mínima de ${minNights} noches para estas fechas`.

- [x] **Step 5: Pass parameters to Checkout URL**

Include `pickup_time: startSlot === 'morning' ? '09:00' : '15:00'` and `dropoff_time: endSlot === 'morning' ? '12:00' : '19:00'` in the URL search params for `/checkout`.

- [x] **Step 6: Run tests and build**

Run: `npm.cmd test`  
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add components/booking/PriceCalculator.tsx
git commit -m "feat(booking): connect PriceCalculator with half-day slots and checkout params"
```

---

### Task 6: Admin Settings: Seasons `min_nights` Configuration

**Files:**
- Create: `supabase/migrations/20260916_add_min_nights_to_seasons.sql`
- Create: `app/api/admin/seasons/[id]/route.ts`
- Modify: `app/[locale]/admin/settings/page.tsx`
- Create: `app/[locale]/admin/settings/SeasonMinNightsEditorClient.tsx`

- [x] **Step 1: Write SQL migration file**

```sql
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS min_nights INTEGER NOT NULL DEFAULT 3;
UPDATE seasons SET min_nights = 5 WHERE LOWER(name) LIKE '%alta%';
UPDATE seasons SET min_nights = 3 WHERE min_nights IS NULL;
```

- [x] **Step 2: Create API route to update season `min_nights`**

`app/api/admin/seasons/[id]/route.ts`:
PATCH endpoint verifying admin authentication and updating `min_nights`.

- [x] **Step 3: Create `SeasonMinNightsEditorClient.tsx`**

Interactive number input/stepper for each season in the admin table with instant optimistic update and toast feedback.

- [x] **Step 4: Update `app/[locale]/admin/settings/page.tsx`**

Integrate the `min_nights` column in the seasons table.

- [x] **Step 5: Run tests**

Run: `npm.cmd test`  
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add supabase/migrations/20260916_add_min_nights_to_seasons.sql app/api/admin/seasons/[id]/route.ts app/[locale]/admin/settings/
git commit -m "feat(admin): add min_nights configuration to seasons in admin settings"
```

---

### Task 7: End-to-End Verification & Quality Assurance

- [x] **Step 1: Run full test suite**

Run: `npm.cmd test`  
Expected: All tests pass.

- [x] **Step 2: Run Next.js build**

Run: `npm.cmd run build`  
Expected: Build succeeds without TypeScript or ESLint errors.

- [x] **Step 3: Visual and functional review**

Verify calendar display, diagonal cutoffs, responsive behavior, and price breakdowns.

- [x] **Step 4: Final commit**

```bash
git commit --allow-empty -m "chore: complete split-day booking calendar implementation"
```
