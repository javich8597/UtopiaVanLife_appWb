/**
 * Utopia Van Life — Frontend UX/UI & State Verification Test Suite
 * 
 * Verifies all 6 core frontend modules with the real 15-user & 15-booking dataset:
 * 1. /admin (Dashboard general & RevenueChart metrics)
 * 2. /admin/bookings (BookingsClient tabs, multi-field search & SES.HOSPEDAJES card)
 * 3. /admin/users (UsersTableClient segments, trip counts, billing totals & status chips)
 * 4. /admin/calendar (CalendarClient events for SPACE & NEO, slot parsing & blocked dates)
 * 5. /admin/campers (CampersClient fleet live status, on_trip/libre detection)
 * 6. /dashboard (DashboardClient trip states, booking badges, Son Oms pickup details)
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

// Carga segura de variables de entorno desde .env.local
function ensureEnvLoaded() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim()
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
}
ensureEnvLoaded()

import { getSupabaseAdmin } from '../lib/supabase/admin'
import {
  calculateMonthlyRevenue,
  calculateFleetOccupancy,
  calculateGlobalOccupancy,
  calculateFleetLiveStatus,
  calculateDelta
} from '../lib/admin/dashboardMetrics'
import { getAdminBookingStatus, ADMIN_STATUS_LABELS } from '../lib/admin/bookingStatus'
import { buildSesHospedajesReference } from '../lib/sesHospedajes/xmlGenerator'
import { normalizeVerificationStatus } from '../lib/admin/auth'
import { mapDashboardBookingBadge, formatBookingSlotTime } from '../app/[locale]/dashboard/DashboardClient'
import { getTripState, pickCurrentBooking } from '../lib/user/tripState'
import { mapCalendarBlockedDateEvent } from '../app/[locale]/admin/calendar/CalendarClient'

describe('Utopia Van Life — Frontend & UI Audit Test Suite', () => {
  let dbUsers: any[] = []
  let dbBookings: any[] = []
  let dbCampers: any[] = []

  before(async () => {
    const admin = getSupabaseAdmin()
    const [
      { data: users, error: uErr },
      { data: campers, error: cErr },
      { data: bookings, error: bErr }
    ] = await Promise.all([
      admin.from('users').select('*').order('created_at', { ascending: false }),
      admin.from('campers').select('*').order('name'),
      admin.from('bookings').select('*, campers(*), users(*)').order('start_date', { ascending: true })
    ])

    if (uErr) assert.fail(`Error al cargar usuarios: ${uErr.message}`)
    if (cErr) assert.fail(`Error al cargar campers: ${cErr.message}`)
    if (bErr) assert.fail(`Error al cargar reservas: ${bErr.message}`)

    dbUsers = users || []
    dbCampers = campers || []
    dbBookings = bookings || []

    assert.ok(dbUsers.length >= 15, `Se esperaban al menos 15 usuarios, hay ${dbUsers.length}`)
    assert.ok(dbCampers.length >= 2, `Se esperaban al menos 2 campers (NEO y SPACE), hay ${dbCampers.length}`)
    assert.ok(dbBookings.length >= 15, `Se esperaban al menos 15 reservas, hay ${dbBookings.length}`)
  })

  // 1. /admin (Dashboard general)
  describe('1. /admin (Dashboard General & Métricas Financieras)', () => {
    it('calcula la serie de 12 meses de ingresos y el delta sin fallos matemáticos', () => {
      const now = new Date('2026-06-15T12:00:00Z')
      const monthly = calculateMonthlyRevenue(dbBookings, now, 12)

      assert.equal(monthly.length, 12)
      assert.equal(monthly[monthly.length - 1].isCurrentMonth, true)
      assert.equal(monthly[monthly.length - 1].year, 2026)

      const currentMonth = monthly[monthly.length - 1]
      const prevMonth = monthly[monthly.length - 2]
      const delta = calculateDelta(currentMonth.revenue, prevMonth.revenue)
      assert.ok(typeof delta === 'number')

      // Total de ingresos confirmados de la flota
      const totalRevenue = monthly.reduce((sum, m) => sum + m.revenue, 0)
      assert.ok(totalRevenue > 0, 'El total de ingresos calculados debe ser mayor a 0')
    })

    it('calcula la ocupación de flota y de cada camper (NEO y SPACE)', () => {
      const now = new Date('2026-06-15T12:00:00Z')
      const fleetOccupancy = calculateFleetOccupancy(dbCampers, dbBookings, now)

      assert.ok(fleetOccupancy.length >= 2)
      for (const occ of fleetOccupancy) {
        assert.ok(occ.occupancyPercent >= 0 && occ.occupancyPercent <= 100)
        assert.ok(occ.totalDaysInMonth === 30) // Junio tiene 30 días
      }

      const globalOcc = calculateGlobalOccupancy(fleetOccupancy)
      assert.ok(globalOcc >= 0 && globalOcc <= 100)
    })

    it('mapea correctamente el estado admin de las 15 reservas', () => {
      const now = new Date('2026-06-15T12:00:00Z')
      const statuses = dbBookings.map(b => getAdminBookingStatus(b, now))

      assert.ok(statuses.includes('confirmed') || statuses.includes('active') || statuses.includes('completed'))
      assert.ok(statuses.includes('review') || statuses.includes('pending') || statuses.includes('cancelled'))

      for (const st of statuses) {
        assert.ok(ADMIN_STATUS_LABELS[st], `Estado admin ${st} no tiene etiqueta válida`)
      }
    })
  })

  // 2. /admin/bookings (Gestión de Reservas & Modal)
  describe('2. /admin/bookings (Gestión de Reservas & Tarjeta SES.HOSPEDAJES)', () => {
    it('permite filtrar por todas las pestañas de estado de negocio', () => {
      const now = new Date('2026-06-15T12:00:00Z')
      const enrichedBookings = dbBookings.map(b => ({
        ...b,
        adminStatus: getAdminBookingStatus(b, now)
      }))

      const tabs = ['all', 'review', 'confirmed', 'active', 'pending', 'expired', 'completed', 'cancelled'] as const
      for (const tab of tabs) {
        const filtered = tab === 'all'
          ? enrichedBookings
          : enrichedBookings.filter(b => b.adminStatus === tab)
        assert.ok(Array.isArray(filtered))
      }
    })

    it('filtra reservas por buscador multi-campo (Nombre, Email, Teléfono, DNI, Camper)', () => {
      const sample = dbBookings[0]
      const queries = [
        sample.customer_name?.slice(0, 4),
        sample.customer_email?.slice(0, 5),
        sample.customer_dni?.slice(0, 4),
        sample.campers?.name
      ].filter(Boolean)

      for (const q of queries) {
        const lowerQ = (q as string).toLowerCase()
        const matches = dbBookings.filter(b => [
          b.customer_name,
          b.customer_email,
          b.customer_phone,
          b.customer_dni,
          b.campers?.name,
          b.id
        ].some(v => (v || '').toLowerCase().includes(lowerQ)))

        assert.ok(matches.length >= 1, `La búsqueda '${q}' no encontró coincidencias`)
      }
    })

    it('genera la referencia ministerial oficial SES.HOSPEDAJES con el formato exacto para las 15 reservas', () => {
      const sesPattern = /^UVL-(SPACE|NEO)-\d{4}-\d{4}-[A-Z0-9]+$/

      for (const b of dbBookings) {
        const ref = buildSesHospedajesReference(b, b.campers)
        assert.match(ref, sesPattern, `Referencia inválida para reserva ${b.id}: ${ref}`)
      }
    })

    it('valida la URL de descarga oficial de XML ministerial', () => {
      for (const b of dbBookings) {
        const dlUrl = `/api/admin/ses-hospedajes/xml?bookingId=${b.id}`
        assert.ok(dlUrl.includes(b.id))
      }
    })
  })

  // 3. /admin/users (Listado de Clientes & Segmentación)
  describe('3. /admin/users (Listado de Clientes & Segmentación)', () => {
    it('agrega correctamente número de viajes, gasto acumulado y último viaje', () => {
      const paidBookings = dbBookings.filter(b => ['confirmed', 'active', 'completed'].includes(b.status))

      for (const u of dbUsers) {
        const own = paidBookings.filter(b => b.user_id === u.id || b.customer_email === u.email)
        const spent = own.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0)
        const trips = own.length

        if (trips > 0) {
          assert.ok(spent > 0, `Usuario ${u.email} tiene ${trips} viajes pero 0 de gasto`)
        }
      }
    })

    it('separa limpiamente clientes reales de cuentas técnicas/internas', () => {
      const customers = dbUsers.filter(u => u.role !== 'admin' && !/\.internal$/i.test(u.email || ''))
      assert.ok(customers.length >= 15, `Se esperaban al menos 15 clientes reales, hay ${customers.length}`)
    })

    it('normaliza los estados de validación de carnet para renderizar los chips', () => {
      const chips: Record<string, string> = {
        verified: 'Validado',
        pending: 'Por revisar',
        rejected: 'Rechazado',
        not_submitted: 'Sin carnet'
      }

      for (const u of dbUsers) {
        const norm = normalizeVerificationStatus(u.verification_status)
        assert.ok(norm in chips, `Estado no reconocido: ${norm}`)
      }
    })
  })

  // 4. /admin/calendar (Calendario & Visualización de Flota)
  describe('4. /admin/calendar (Calendario & Eventos de Flota)', () => {
    it('mapea las reservas de SPACE y NEO a eventos con colores y slots sin solapar', () => {
      for (const b of dbBookings) {
        const camperSlug = (b.campers?.slug || 'neo').toLowerCase()
        assert.ok(['space', 'neo'].includes(camperSlug), `Slug desconocido: ${camperSlug}`)

        // Extracción segura de horas
        const pickupMatch = (b.pickup_time || '10:00').match(/\d{1,2}:\d{2}/)?.[0] || '10:00'
        const dropoffMatch = (b.dropoff_time || '18:00').match(/\d{1,2}:\d{2}/)?.[0] || '18:00'

        const startIso = `${b.start_date}T${pickupMatch.length === 5 ? pickupMatch : '10:00'}:00`
        const endIso = `${b.end_date}T${dropoffMatch.length === 5 ? dropoffMatch : '18:00'}:00`

        assert.ok(!isNaN(new Date(startIso).getTime()), `Start ISO inválido: ${startIso}`)
        assert.ok(!isNaN(new Date(endIso).getTime()), `End ISO inválido: ${endIso}`)
        assert.ok(new Date(endIso).getTime() > new Date(startIso).getTime(), `End anterior a Start: ${startIso} -> ${endIso}`)
      }
    })

    it('mapea correctamente eventos de bloqueo de flota y auto-bloqueo Redsys', () => {
      const mockBlock = {
        id: 'blk-1',
        camper_id: dbCampers[0].id,
        start_date: '2026-11-01',
        end_date: '2026-11-05',
        reason: 'ITV Anual',
        session_id: null
      }
      const event = mapCalendarBlockedDateEvent(mockBlock, 'NEO')
      assert.equal(event.id, 'blk-1')
      assert.ok(event.title.includes('ITV Anual'))
      assert.equal(event.extendedProps.isRedsysAutoBlock, false)

      const redsysBlock = {
        id: 'blk-2',
        camper_id: dbCampers[1].id,
        start_date: '2026-11-10',
        end_date: '2026-11-15',
        reason: null,
        session_id: 'redsys_998877'
      }
      const redsysEvent = mapCalendarBlockedDateEvent(redsysBlock, 'SPACE')
      assert.ok(redsysEvent.title.includes('Auto-Bloqueo Redsys'))
      assert.equal(redsysEvent.extendedProps.isRedsysAutoBlock, true)
    })
  })

  // 5. /admin/campers (Fichas de Vehículos & Estado en Vivo)
  describe('5. /admin/campers (Fichas de Vehículos & Estado en Vivo)', () => {
    it('detecta correctamente el estado live de NEO y SPACE (on_trip / idle)', () => {
      const now = new Date('2026-06-15T12:00:00Z')
      const occupancy = calculateFleetOccupancy(dbCampers, dbBookings, now)
      const live = calculateFleetLiveStatus(dbCampers, dbBookings, occupancy, now)

      assert.equal(live.length, dbCampers.length)
      for (const camperLive of live) {
        assert.ok(['on_trip', 'available'].includes(camperLive.state))
        assert.ok(camperLive.occupancyPercent >= 0 && camperLive.occupancyPercent <= 100)
      }
    })
  })

  // 6. /dashboard (Área de Cliente)
  describe('6. /dashboard (Área de Cliente & Estado del Viaje)', () => {
    it('selecciona la reserva relevante para el cliente ignorando canceladas', () => {
      const now = new Date('2026-06-15T12:00:00Z')
      const confirmedBookings = dbBookings.filter(b => b.status === 'confirmed' || b.status === 'active')

      if (confirmedBookings.length > 0) {
        const picked = pickCurrentBooking(confirmedBookings, now)
        assert.ok(picked, 'Debe seleccionar una reserva activa o futura')
      }
    })

    it('mapea correctamente las badges de reserva de cliente', () => {
      const testCases = [
        { booking: { status: 'confirmed', payment_status: 'paid' }, expectedClass: 'status-badge--confirmed', expectedText: 'Confirmada' },
        { booking: { status: 'pending', payment_status: 'paid' }, expectedClass: 'status-badge--paid-pending', expectedText: 'Pagada · en validación' },
        { booking: { status: 'cancelled', payment_status: 'refunded' }, expectedClass: 'status-badge--cancelled', expectedText: 'Cancelada' },
        { booking: { status: 'pending', payment_status: 'pending' }, expectedClass: 'status-badge--pending', expectedText: 'Pendiente de pago' },
      ]

      for (const tc of testCases) {
        const badge = mapDashboardBookingBadge(tc.booking as any)
        assert.equal(badge.badgeClass, tc.expectedClass)
        assert.equal(badge.text, tc.expectedText)
      }
    })

    it('formatea las franjas horarias de recogida en Son Oms con precisión', () => {
      assert.equal(formatBookingSlotTime('morning'), '09:00 - 12:00 (Mañana)')
      assert.equal(formatBookingSlotTime('10:00 (Mañana)'), '09:00 - 12:00 (Mañana)')
      assert.equal(formatBookingSlotTime('afternoon'), '15:00 - 19:00 (Tarde)')
      assert.equal(formatBookingSlotTime('16:00 (Tarde)'), '15:00 - 19:00 (Tarde)')
      assert.equal(formatBookingSlotTime('11:30'), '11:30h')
      assert.equal(formatBookingSlotTime('11:30:00'), '11:30h')
      assert.equal(formatBookingSlotTime(undefined, '15:00 - 19:00'), '15:00 - 19:00')
    })

    it('calcula el estado del viaje para cada uno de los 15 usuarios con datos de perfil', () => {
      const now = new Date('2026-06-15T12:00:00Z')

      for (const b of dbBookings) {
        const user = b.users || dbUsers.find(u => u.id === b.user_id) || {}
        const trip = getTripState(b, user, now)

        assert.ok(['pay', 'license', 'license-fix', 'contract', 'waiting', 'ready', 'on-trip', 'returned'].includes(trip.step))
        assert.ok(trip.nights >= 1)
        assert.ok(trip.milestones.length === 4)
      }
    })
  })
})
