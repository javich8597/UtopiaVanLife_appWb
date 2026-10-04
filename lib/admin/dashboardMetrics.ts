export interface BookingItem {
  id: string
  camper_id?: string | null
  start_date: string
  end_date: string
  total_price: number | string
  status: string
  created_at?: string
}

export interface CamperItem {
  id: string
  name: string
  slug: string
  thumbnail_url?: string | null
  is_active?: boolean
}

export interface MonthlyData {
  key: string // e.g. "2026-09"
  month: string // e.g. "Sep"
  fullMonth: string // e.g. "Septiembre"
  year: number
  revenue: number
  bookingsCount: number
  isCurrentMonth: boolean
}

export interface CamperOccupancy {
  id: string
  name: string
  slug: string
  thumbnailUrl: string | null
  totalDaysInMonth: number
  bookedDays: number
  occupancyPercent: number
  availableDays: number
}

const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTH_NAMES_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

/**
 * Calculates monthly revenue and booking counts for the last `months` months up to referenceDate.
 */
export function calculateMonthlyRevenue(
  bookings: BookingItem[],
  referenceDate: Date = new Date(),
  months: number = 6
): MonthlyData[] {
  const result: MonthlyData[] = []
  const refYear = referenceDate.getFullYear()
  const refMonth = referenceDate.getMonth()

  // Generate the consecutive months leading up to and including the current month
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(refYear, refMonth - i, 1)
    const year = d.getFullYear()
    const monthIdx = d.getMonth()
    const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`

    result.push({
      key,
      month: MONTH_NAMES_SHORT[monthIdx],
      fullMonth: MONTH_NAMES_FULL[monthIdx],
      year,
      revenue: 0,
      bookingsCount: 0,
      isCurrentMonth: i === 0,
    })
  }

  // Aggregate confirmed / active / completed bookings
  const validBookings = bookings.filter(b =>
    ['confirmed', 'active', 'completed'].includes(b.status)
  )

  for (const b of validBookings) {
    if (!b.start_date) continue
    const startDate = new Date(b.start_date)
    if (isNaN(startDate.getTime())) continue

    const year = startDate.getFullYear()
    const monthIdx = startDate.getMonth()
    const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`

    const monthEntry = result.find(m => m.key === key)
    if (monthEntry) {
      const price = Number(b.total_price) || 0
      monthEntry.revenue = Math.round((monthEntry.revenue + price) * 100) / 100
      monthEntry.bookingsCount += 1
    }
  }

  return result
}

/**
 * Calculates current month occupancy percentage for each camper in the fleet.
 */
export function calculateFleetOccupancy(
  campers: CamperItem[],
  bookings: BookingItem[],
  referenceDate: Date = new Date()
): CamperOccupancy[] {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()

  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0)
  const totalDaysInMonth = endOfMonth.getDate()

  const validBookings = bookings.filter(b =>
    ['confirmed', 'active', 'completed'].includes(b.status)
  )

  return campers.map(camper => {
    const bookedDaysSet = new Set<number>()

    const camperBookings = validBookings.filter(b => b.camper_id === camper.id)

    for (const b of camperBookings) {
      const bStart = new Date(b.start_date)
      const bEnd = new Date(b.end_date)
      if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) continue

      // Clamp between start and end of month
      const effectiveStart = bStart < startOfMonth ? startOfMonth : bStart
      const effectiveEnd = bEnd > endOfMonth ? endOfMonth : bEnd

      // Count each booked day in this month
      const cur = new Date(effectiveStart)
      while (cur <= effectiveEnd) {
        if (cur.getMonth() === month && cur.getFullYear() === year) {
          bookedDaysSet.add(cur.getDate())
        }
        cur.setDate(cur.getDate() + 1)
      }
    }

    const bookedDays = bookedDaysSet.size
    const occupancyPercent = totalDaysInMonth > 0
      ? Math.min(100, Math.round((bookedDays / totalDaysInMonth) * 100))
      : 0
    const availableDays = Math.max(0, totalDaysInMonth - bookedDays)

    return {
      id: camper.id,
      name: camper.name,
      slug: camper.slug,
      thumbnailUrl: camper.thumbnail_url || null,
      totalDaysInMonth,
      bookedDays,
      occupancyPercent,
      availableDays,
    }
  })
}

/**
 * Calculates average ticket per confirmed booking safely.
 */
export function calculateAverageTicket(totalRevenue: number, confirmedCount: number): number {
  if (confirmedCount <= 0 || isNaN(totalRevenue) || isNaN(confirmedCount)) return 0
  return Math.round(totalRevenue / confirmedCount)
}

/**
 * Calculates global fleet occupancy average percentage across all active campers.
 */
export function calculateGlobalOccupancy(fleetOccupancy: CamperOccupancy[]): number {
  if (!fleetOccupancy || fleetOccupancy.length === 0) return 0
  const total = fleetOccupancy.reduce((acc, c) => acc + c.occupancyPercent, 0)
  return Math.round(total / fleetOccupancy.length)
}


/**
 * Percentage change between two values, rounded. Returns null when there is no baseline.
 */
export function calculateDelta(current: number, previous: number): number | null {
  if (!previous || isNaN(previous) || isNaN(current)) return null
  return Math.round(((current - previous) / previous) * 100)
}

export type CamperLiveState = 'on_trip' | 'available'

export interface CamperLiveStatus {
  id: string
  name: string
  slug: string
  state: CamperLiveState
  /** Customer currently travelling, when on a trip */
  currentCustomer: string | null
  /** Return date of the current trip (YYYY-MM-DD) */
  returnsOn: string | null
  /** Start date of the next confirmed departure (YYYY-MM-DD) */
  nextDepartureOn: string | null
  occupancyPercent: number
}

export interface LiveBookingItem extends BookingItem {
  customer_name?: string | null
}

const toDay = (value: string | Date) => {
  const d = typeof value === 'string' ? new Date(value) : value
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * Real-time state of each camper: on a trip today or available, plus its next departure.
 */
export function calculateFleetLiveStatus(
  campers: CamperItem[],
  bookings: LiveBookingItem[],
  occupancy: CamperOccupancy[],
  referenceDate: Date = new Date()
): CamperLiveStatus[] {
  const today = toDay(referenceDate)
  const live = bookings.filter(b => ['confirmed', 'active'].includes(b.status))

  return campers.map(camper => {
    const own = live
      .filter(b => b.camper_id === camper.id && b.start_date && b.end_date)
      .sort((a, b) => toDay(a.start_date) - toDay(b.start_date))

    const current = own.find(b => toDay(b.start_date) <= today && toDay(b.end_date) >= today)
    const next = own.find(b => toDay(b.start_date) > today)

    return {
      id: camper.id,
      name: camper.name,
      slug: camper.slug,
      state: current ? 'on_trip' : 'available',
      currentCustomer: current?.customer_name || null,
      returnsOn: current?.end_date || null,
      nextDepartureOn: next?.start_date || null,
      occupancyPercent: occupancy.find(o => o.id === camper.id)?.occupancyPercent ?? 0,
    }
  })
}
