import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatPrice } from '../lib/pricing/engine'
import { generateContractData } from '../lib/contracts/contractEngine'

// =========================================================================
// PORTAL SYNC DATA MAPPERS & VIEW-MODELS
// =========================================================================

export interface BookingDataModel {
    id: string
    camper_id: string
    start_date: string
    pickup_time?: string
    end_date: string
    dropoff_time?: string
    total_price: number
    base_price?: number
    km_package?: 'included_150' | 'unlimited'
    km_supplement?: number
    cancellation_policy?: 'standard' | 'flexible'
    cancellation_supplement?: number
    deposit_amount?: number
    discount_amount?: number
    payment_status: 'pending' | 'paid' | 'failed'
    status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
    payment_intent_id?: string // Redsys orderId
    created_at: string
    customer_name?: string
    customer_email?: string
    customer_phone?: string
    customer_dni?: string
    customer_address?: string
    customer_city?: string
    customer_postal_code?: string
    customer_country?: string
    travelers_count?: number
    special_notes?: string
    extras_selected?: Array<{
        id: string
        name: string
        category: 'Equipamiento' | 'Deporte' | 'Confort' | string
        quantity: number
        unit_price: number
        price_type: 'per_rental' | 'per_day'
        total: number
    }>
    campers?: {
        name: string
        slug: string
        specs?: any
    }
    users?: {
        full_name?: string
        email?: string
        phone?: string
        dni_nie?: string
    }
}

/**
 * Mapper for Admin Booking Detail Modal (BookingDetailModal.tsx)
 */
export function mapBookingDetailViewModel(booking: BookingDataModel) {
    const startDate = new Date(booking.start_date)
    const endDate = new Date(booking.end_date)
    const nights = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))

    // 1. KM Package display mapping
    const isUnlimitedKm = booking.km_package === 'unlimited'
    const kmLabel = isUnlimitedKm ? 'Kilometraje Ilimitado (+15 €/día)' : '150 km/día (Incluido de serie)'
    const kmBadgeClass = isUnlimitedKm ? 'badge-km--unlimited' : 'badge-km--included'
    const kmSupplement = booking.km_supplement ?? (isUnlimitedKm ? nights * 15 : 0)

    // 2. Cancellation Policy display mapping
    const isFlexibleCancel = booking.cancellation_policy === 'flexible'
    const cancellationLabel = isFlexibleCancel ? 'Flexible (+8 €/día)' : 'Estándar (Incluida)'
    const cancellationBadgeClass = isFlexibleCancel ? 'badge-cancel--flexible' : 'badge-cancel--standard'
    const cancellationSupplement = booking.cancellation_supplement ?? (isFlexibleCancel ? nights * 8 : 0)

    // 3. Categorized Extras grouped by category
    const categorizedExtras: Record<string, typeof booking.extras_selected> = {
        Equipamiento: [],
        Deporte: [],
        Confort: [],
        Otros: [],
    }

    if (booking.extras_selected && Array.isArray(booking.extras_selected)) {
        for (const extra of booking.extras_selected) {
            const cat = extra.category in categorizedExtras ? extra.category : 'Otros'
            categorizedExtras[cat]!.push(extra)
        }
    }

    // 4. Contact & Billing presentation
    const clientName = booking.customer_name || booking.users?.full_name || 'Viajero Utopia'
    const clientEmail = booking.customer_email || booking.users?.email || '-'
    const clientPhone = booking.customer_phone || booking.users?.phone || '-'
    const clientDni = booking.customer_dni || booking.users?.dni_nie || 'No registrado'

    const cleanPhone = clientPhone.replace(/\D/g, '')
    const telLink = cleanPhone ? `tel:${clientPhone}` : null
    const whatsAppLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null

    const billingAddress = [
        booking.customer_address,
        booking.customer_postal_code,
        booking.customer_city,
        booking.customer_country,
    ].filter(Boolean).join(', ') || 'No especificada'

    // 5. Financial breakdown
    const basePrice = booking.base_price ?? (booking.total_price - kmSupplement - cancellationSupplement)
    const deposit = booking.deposit_amount || 1000

    return {
        bookingShortId: `#${booking.id.split('-')[0].toUpperCase()}`,
        clientName,
        clientEmail,
        clientPhone,
        clientDni,
        telLink,
        whatsAppLink,
        billingAddress,
        travelersCount: booking.travelers_count || 2,
        specialNotes: booking.special_notes || 'Ninguna',
        nights,
        km: {
            package: booking.km_package || 'included_150',
            label: kmLabel,
            badgeClass: kmBadgeClass,
            supplement: kmSupplement,
        },
        cancellation: {
            policy: booking.cancellation_policy || 'standard',
            label: cancellationLabel,
            badgeClass: cancellationBadgeClass,
            supplement: cancellationSupplement,
        },
        categorizedExtras,
        pricing: {
            basePrice,
            kmSupplement,
            cancellationSupplement,
            discountAmount: booking.discount_amount || 0,
            totalAbonado: booking.total_price,
            refundableDeposit: deposit,
            redsysOrderId: booking.payment_intent_id || 'N/A',
        },
    }
}

/**
 * Mapper for Admin Calendar Events (CalendarClient.tsx)
 */
export interface BlockedDateDataModel {
    id: string
    camper_id: string
    start_date: string
    end_date: string
    session_id?: string
    reason?: string
}

export function mapCalendarBlockedDateEvent(b: BlockedDateDataModel, camperName: string = 'Camper') {
    const isRedsysAutoBlock = Boolean(b.session_id && b.session_id.startsWith('redsys_'))
    const orderId = isRedsysAutoBlock ? b.session_id!.replace('redsys_', '') : ''

    const title = isRedsysAutoBlock
        ? `🔒 Auto-Bloqueo Redsys (#${orderId}) · ${camperName}`
        : `⛔ Bloqueo Flota (${b.reason || 'Mantenimiento'}) · ${camperName}`

    const backgroundColor = isRedsysAutoBlock ? '#FEF3C7' : '#F1F5F9'
    const borderColor = isRedsysAutoBlock ? '#D97706' : '#94A3B8'
    const textColor = isRedsysAutoBlock ? '#92400E' : '#334155'

    return {
        id: b.id,
        title,
        start: b.start_date,
        end: b.end_date,
        allDay: true,
        backgroundColor,
        borderColor,
        textColor,
        extendedProps: {
            ...b,
            isRedsysAutoBlock,
            orderId,
            camperName,
            blockType: isRedsysAutoBlock ? 'redsys_hold' : 'maintenance',
        },
    }
}

/**
 * Mapper for User Dashboard Status Badge & Details (DashboardClient.tsx)
 */
export function mapDashboardBookingBadge(booking: {
    status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
    payment_status?: 'pending' | 'paid' | 'failed'
}) {
    const isConfirmed = booking.status === 'confirmed' || booking.status === 'active'
    const isPaidPending = booking.payment_status === 'paid' && booking.status === 'pending'

    if (isConfirmed) {
        return {
            text: 'Reserva Confirmada',
            badgeClass: 'status-badge--confirmed',
            status: 'confirmed',
        }
    }

    if (isPaidPending) {
        return {
            text: 'Pagada · En Aprobación Admin',
            badgeClass: 'status-badge--paid-pending',
            status: 'paid-pending',
        }
    }

    if (booking.status === 'cancelled') {
        return {
            text: 'Cancelada',
            badgeClass: 'status-badge--cancelled',
            status: 'cancelled',
        }
    }

    return {
        text: 'Pendiente de Pago',
        badgeClass: 'status-badge--pending',
        status: 'pending',
    }
}

// =========================================================================
// TEST SUITE: R4 PORTALS SYNCHRONIZATION
// =========================================================================

describe('R4 Portals Synchronization Test Suite', () => {

    // ---------------------------------------------------------------------
    // TIER 3 & 4: Admin Bookings Detail Modal Mapping
    // ---------------------------------------------------------------------

    describe('Tier 3: Admin Detail Modal Data Mapping', () => {
        it('maps KM package "unlimited" and supplement to detail view-model', () => {
            const booking: BookingDataModel = {
                id: 'b-uuid-1234',
                camper_id: 'camper-neo',
                start_date: '2026-06-10',
                end_date: '2026-06-14', // 4 nights
                km_package: 'unlimited',
                km_supplement: 60.00,
                total_price: 500.00,
                payment_status: 'paid',
                status: 'pending',
                created_at: '2026-05-01T10:00:00Z',
            }

            const vm = mapBookingDetailViewModel(booking)
            assert.equal(vm.km.package, 'unlimited')
            assert.equal(vm.km.label, 'Kilometraje Ilimitado (+15 €/día)')
            assert.equal(vm.km.badgeClass, 'badge-km--unlimited')
            assert.equal(vm.km.supplement, 60.00)
        })

        it('maps KM package "included_150" with 0.00 € supplement to detail view-model', () => {
            const booking: BookingDataModel = {
                id: 'b-uuid-1235',
                camper_id: 'camper-neo',
                start_date: '2026-06-10',
                end_date: '2026-06-14',
                km_package: 'included_150',
                total_price: 440.00,
                payment_status: 'paid',
                status: 'pending',
                created_at: '2026-05-01T10:00:00Z',
            }

            const vm = mapBookingDetailViewModel(booking)
            assert.equal(vm.km.package, 'included_150')
            assert.equal(vm.km.label, '150 km/día (Incluido de serie)')
            assert.equal(vm.km.supplement, 0)
        })

        it('maps Flexible Cancellation (+8 €/day) to detail view-model', () => {
            const booking: BookingDataModel = {
                id: 'b-uuid-1236',
                camper_id: 'camper-space',
                start_date: '2026-07-01',
                end_date: '2026-07-06', // 5 nights
                cancellation_policy: 'flexible',
                cancellation_supplement: 40.00,
                total_price: 790.00,
                payment_status: 'paid',
                status: 'pending',
                created_at: '2026-05-01T10:00:00Z',
            }

            const vm = mapBookingDetailViewModel(booking)
            assert.equal(vm.cancellation.policy, 'flexible')
            assert.equal(vm.cancellation.label, 'Flexible (+8 €/día)')
            assert.equal(vm.cancellation.supplement, 40.00)
        })

        it('groups categorized extras by Equipamiento, Deporte, and Confort', () => {
            const booking: BookingDataModel = {
                id: 'b-uuid-1237',
                camper_id: 'camper-neo',
                start_date: '2026-06-10',
                end_date: '2026-06-14',
                total_price: 600.00,
                payment_status: 'paid',
                status: 'pending',
                created_at: '2026-05-01T10:00:00Z',
                extras_selected: [
                    { id: '1', name: 'Kit Camping', category: 'Equipamiento', quantity: 1, unit_price: 35, price_type: 'per_rental', total: 35 },
                    { id: '2', name: 'Paddle Surf', category: 'Deporte', quantity: 1, unit_price: 20, price_type: 'per_day', total: 80 },
                    { id: '3', name: 'Ropa de Cama', category: 'Confort', quantity: 2, unit_price: 15, price_type: 'per_rental', total: 30 },
                ],
            }

            const vm = mapBookingDetailViewModel(booking)
            assert.equal(vm.categorizedExtras.Equipamiento?.length, 1)
            assert.equal(vm.categorizedExtras.Equipamiento?.[0].name, 'Kit Camping')
            assert.equal(vm.categorizedExtras.Deporte?.length, 1)
            assert.equal(vm.categorizedExtras.Deporte?.[0].name, 'Paddle Surf')
            assert.equal(vm.categorizedExtras.Confort?.length, 1)
            assert.equal(vm.categorizedExtras.Confort?.[0].name, 'Ropa de Cama')
        })

        it('maps full client billing address and direct phone/WhatsApp links', () => {
            const booking: BookingDataModel = {
                id: 'b-uuid-1238',
                camper_id: 'camper-neo',
                start_date: '2026-06-10',
                end_date: '2026-06-14',
                total_price: 500.00,
                payment_status: 'paid',
                status: 'pending',
                payment_intent_id: '0001redsysorder',
                customer_name: 'Alejandro Morales',
                customer_email: 'amorales@example.com',
                customer_phone: '+34 654 321 098',
                customer_dni: '87654321X',
                customer_address: 'Av. Jaume III, 12, 4º',
                customer_city: 'Palma',
                customer_postal_code: '07012',
                customer_country: 'España',
                travelers_count: 3,
                special_notes: 'Llegada en ferri desde Barcelona',
                created_at: '2026-05-01T10:00:00Z',
            }

            const vm = mapBookingDetailViewModel(booking)
            assert.equal(vm.clientName, 'Alejandro Morales')
            assert.equal(vm.clientEmail, 'amorales@example.com')
            assert.equal(vm.clientDni, '87654321X')
            assert.equal(vm.telLink, 'tel:+34 654 321 098')
            assert.equal(vm.whatsAppLink, 'https://wa.me/34654321098')
            assert.equal(vm.billingAddress, 'Av. Jaume III, 12, 4º, 07012, Palma, España')
            assert.equal(vm.travelersCount, 3)
            assert.equal(vm.specialNotes, 'Llegada en ferri desde Barcelona')
            assert.equal(vm.pricing.redsysOrderId, '0001redsysorder')
            assert.equal(vm.pricing.refundableDeposit, 1000)
        })
    })

    // ---------------------------------------------------------------------
    // TIER 4: Admin Calendar & User Dashboard Synchronization
    // ---------------------------------------------------------------------

    describe('Tier 4: Admin Calendar Event Mapping for Blocked Dates', () => {
        it('maps Redsys auto-block to amber/warning calendar event with lock icon', () => {
            const autoBlock: BlockedDateDataModel = {
                id: 'block-001',
                camper_id: 'camper-neo',
                start_date: '2026-08-01',
                end_date: '2026-08-07',
                session_id: 'redsys_0009order',
            }

            const event = mapCalendarBlockedDateEvent(autoBlock, 'NEO')

            assert.equal(event.id, 'block-001')
            assert.match(event.title, /🔒 Auto-Bloqueo Redsys \(#0009order\)/)
            assert.match(event.title, /NEO/)
            assert.equal(event.backgroundColor, '#FEF3C7')
            assert.equal(event.borderColor, '#D97706')
            assert.equal(event.textColor, '#92400E')
            assert.equal(event.extendedProps.isRedsysAutoBlock, true)
            assert.equal(event.extendedProps.orderId, '0009order')
        })

        it('maps maintenance hold to neutral slate calendar event with stop icon', () => {
            const maintenanceHold: BlockedDateDataModel = {
                id: 'block-002',
                camper_id: 'camper-space',
                start_date: '2026-08-10',
                end_date: '2026-08-12',
                reason: 'Revisión ITV',
            }

            const event = mapCalendarBlockedDateEvent(maintenanceHold, 'SPACE')

            assert.equal(event.id, 'block-002')
            assert.match(event.title, /⛔ Bloqueo Flota \(Revisión ITV\)/)
            assert.equal(event.backgroundColor, '#F1F5F9')
            assert.equal(event.borderColor, '#94A3B8')
            assert.equal(event.textColor, '#334155')
            assert.equal(event.extendedProps.isRedsysAutoBlock, false)
        })
    })

    describe('Tier 4: User Dashboard Status Badge & Slot Presentation', () => {
        it('renders "Pagada · En Aprobación Admin" when payment_status is paid and status is pending', () => {
            // Crucial fix verified: customer has paid 100% via Redsys, but admin hasn't confirmed yet
            const badge = mapDashboardBookingBadge({
                status: 'pending',
                payment_status: 'paid',
            })

            assert.equal(badge.text, 'Pagada · En Aprobación Admin')
            assert.equal(badge.badgeClass, 'status-badge--paid-pending')
            // MUST NOT be "Pendiente de Pago"
            assert.notEqual(badge.text, 'Pendiente de Pago')
        })

        it('renders "Pendiente de Pago" when payment has not been completed yet', () => {
            const badge = mapDashboardBookingBadge({
                status: 'pending',
                payment_status: 'pending',
            })

            assert.equal(badge.text, 'Pendiente de Pago')
            assert.equal(badge.badgeClass, 'status-badge--pending')
        })

        it('renders "Reserva Confirmada" when booking is confirmed by admin', () => {
            const badge = mapDashboardBookingBadge({
                status: 'confirmed',
                payment_status: 'paid',
            })

            assert.equal(badge.text, 'Reserva Confirmada')
            assert.equal(badge.badgeClass, 'status-badge--confirmed')
        })
    })

    describe('Tier 4: Digital Contract Linking with Booking Data', () => {
        it('correctly populates contract legal data from booking and user profile', () => {
            const mockBooking = {
                id: 'booking-contrato-1',
                camper_id: 'camper-neo',
                start_date: '2026-07-01',
                end_date: '2026-07-08',
                pickup_time: '15:00',
                dropoff_time: '11:00',
                total_price: 1100,
                deposit_amount: 1000,
                km_package: 'unlimited',
                cancellation_policy: 'flexible',
                campers: {
                    name: 'NEO',
                    license_plate: '1234-XYZ',
                    chassis_number: 'VF123456789012345',
                },
            }

            const mockProfile = {
                id: 'user-001',
                full_name: 'Laura Gomila Pons',
                dni_nie: '43218765P',
                phone: '+34 600 111 222',
                address: 'Passeig Marítim 45, Palma',
                driver_license_id: 'B-12345678',
                driver_license_issue_date: '2018-05-15',
                driver_license_expiry_date: '2028-05-15',
            }

            const contractData = generateContractData(mockBooking, mockProfile)

            assert.ok(contractData.contractNumber)
            assert.equal(contractData.lessee.fullName, 'Laura Gomila Pons')
            assert.equal(contractData.lessee.dniNie, '43218765P')
            assert.equal(contractData.lessee.driverLicenseId, 'B-12345678')
            assert.equal(contractData.booking.startDate, '2026-07-01')
            assert.equal(contractData.booking.endDate, '2026-07-08')
            assert.equal(contractData.pricing.totalPrice, 1100)
            assert.equal(contractData.pricing.depositAmount, 1000)
            assert.equal(contractData.articles.length, 31) // Full 31 legal articles
        })
    })
})
