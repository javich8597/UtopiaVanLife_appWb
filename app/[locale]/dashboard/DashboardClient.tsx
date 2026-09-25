'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Calendar, Euro, MapPin, Clock, BookOpen, ChevronRight, Sparkles, ShieldCheck, Compass, Users, AlertCircle, CheckCircle, Navigation, Zap, FileDown, Phone, PhoneCall, LifeBuoy, MessageCircle } from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'

const FALLBACK_IMAGES: Record<string, string> = {
    neo: '/images/campers/neo/neo-ext.png',
    space: '/images/campers/space/space-ext.png',
}

interface Props {
    bookings: any[]
    profile: any
    user: any
}

export function mapDashboardBookingBadge(booking: {
    status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | string
    payment_status?: 'pending' | 'paid' | 'failed' | string
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

export function formatBookingSlotTime(time?: string, fallback: string = '14:00 - 18:00') {
    if (!time || !time.trim()) return fallback
    const t = time.trim()
    if (t.toLowerCase() === 'morning' || t.toLowerCase().includes('mañana')) return '09:00 - 12:00 (Mañana)'
    if (t.toLowerCase() === 'afternoon' || t.toLowerCase().includes('tarde')) return '15:00 - 19:00 (Tarde)'
    if (t.length === 5 && t.includes(':')) return `${t}h`
    if (t.length === 8 && t.includes(':')) return `${t.slice(0, 5)}h`
    return t
}

export default function DashboardClient({ bookings, profile, user }: Props) {
    const activeBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'active') || []
    const pastBookings = bookings?.filter(b => b.status === 'completed' || b.status === 'cancelled') || []
    const pendingBookings = bookings?.filter(b => b.status === 'pending') || []

    const nextBooking = activeBookings[0] || pendingBookings[0]
    const userName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Viajero'
    const isVerified = profile?.verification_status === 'verified'
    const isPendingDoc = profile?.verification_status === 'pending'

    const parsedExtras: string[] = useMemo(() => {
        if (!nextBooking) return []
        const raw = nextBooking.extras_selected || nextBooking.extras || nextBooking.booking_extras
        if (!raw) return []

        if (Array.isArray(raw)) {
            return raw.map((item: any) => {
                if (typeof item === 'string') return item
                const name = item?.name_es || item?.name || item?.extra?.name_es || item?.extra?.name || item?.description
                const qty = item?.quantity ? ` (x${item.quantity})` : ''
                if (name) return `${name}${qty}`
                return String(item)
            }).filter(Boolean)
        }

        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed)) {
                    return parsed.map((item: any) => {
                        if (typeof item === 'string') return item
                        const name = item?.name_es || item?.name || item?.extra?.name_es || item?.extra?.name || item?.description
                        const qty = item?.quantity ? ` (x${item.quantity})` : ''
                        return name ? `${name}${qty}` : String(item)
                    }).filter(Boolean)
                }
            } catch {
                return raw.split(',').map(s => s.trim()).filter(Boolean)
            }
        }

        return []
    }, [nextBooking])

    const defaultExtrasFallback = [
        '🛏️ Pack Ropa de Cama Premium',
        '🤿 Kit Snorkel Utopia (x2)',
        '⚡ Autonomía Solar Victron 540Ah',
        '🧼 Kit Limpieza & Ducha Eco'
    ]

    const getExtraEmoji = (extraName: string) => {
        const lower = extraName.toLowerCase()
        if (lower.includes('cama') || lower.includes('ropa') || lower.includes('sábana') || lower.includes('almohada')) return '🛏️'
        if (lower.includes('snorkel') || lower.includes('buceo')) return '🤿'
        if (lower.includes('solar') || lower.includes('victron') || lower.includes('electricidad') || lower.includes('batería')) return '⚡'
        if (lower.includes('surf') || lower.includes('paddle') || lower.includes('tabla')) return '🏄'
        if (lower.includes('wifi') || lower.includes('starlink') || lower.includes('internet')) return '📡'
        if (lower.includes('café') || lower.includes('cafetera') || lower.includes('coffee')) return '☕'
        if (lower.includes('barbacoa') || lower.includes('bbq') || lower.includes('parrilla')) return '🍳'
        if (lower.includes('bici') || lower.includes('bike')) return '🚲'
        if (lower.includes('silla') || lower.includes('mesa') || lower.includes('camping') || lower.includes('exterior')) return '🪑'
        if (lower.includes('nevera') || lower.includes('hielo')) return '🧊'
        if (lower.includes('ducha') || lower.includes('toalla')) return '🚿'
        if (lower.includes('wc') || lower.includes('químico')) return '🚽'
        return '✨'
    }


    let daysToTrip = -1
    let nightsCount = 7
    if (nextBooking) {
        const from = new Date(nextBooking.start_date)
        const to = new Date(nextBooking.end_date)
        const now = new Date()
        daysToTrip = Math.ceil((from.getTime() - now.getTime()) / (1000 * 3600 * 24))
        nightsCount = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 3600 * 24)))
    }

    const camperSlug = nextBooking?.camper?.slug || 'neo'
    const camperName = nextBooking?.camper?.name || (camperSlug === 'space' ? 'SPACE' : 'NEO')
    const camperImg = nextBooking?.camper?.thumbnail_url || FALLBACK_IMAGES[camperSlug] || FALLBACK_IMAGES['neo']

    return (
        <div className="dash-page-wrapper">
            {/* Page Header Section */}
            <div className="dash-header">
                <div>
                    <h1 className="dash-title">
                        ¡Hola, {userName}!<br />
                        <span className="dash-title-sub">Tu aventura en Mallorca te espera</span>
                    </h1>
                </div>

                {daysToTrip > 0 && (
                    <div className="countdown-pill">
                        <Clock size={16} style={{ color: 'var(--sand-dark)' }} />
                        <span>Faltan <strong>{daysToTrip} días</strong> para la recogida</span>
                    </div>
                )}
                {daysToTrip === 0 && (
                    <div className="countdown-pill countdown-pill--today">
                        <Sparkles size={16} />
                        <span>¡Hoy comienza tu aventura!</span>
                    </div>
                )}
            </div>

            {/* If has an active or pending booking */}
            {nextBooking && (
                <div className="bento-layout">
                    {/* Hero Booking Card */}
                    <div className="booking-hero-card">
                        <div className="booking-hero-card__img-wrap">
                            <Image 
                                src={camperImg}
                                alt={camperName}
                                fill
                                style={{ objectFit: 'cover' }}
                                priority
                            />
                            <div className="booking-hero-card__img-overlay" />
                            <div className="booking-hero-card__img-content">
                                <span className="tier-tag">PREMIUM TIER</span>
                                <h2 className="camper-overlay-title">Camper {camperName}</h2>
                                <p className="camper-overlay-sub">Utopia Van Life</p>
                            </div>
                        </div>

                        <div className="booking-hero-card__body">
                            <div>
                                <div className="trip-header-row">
                                    <div>
                                        <h3 className="text-h3" style={{ color: 'var(--forest-green)' }}>Detalles del Viaje</h3>
                                        <div className="trip-meta-pills">
                                            <p className="text-small" style={{ color: 'var(--gray-600)', margin: 0 }}>
                                                {nightsCount} Noches • {nextBooking.guests_count || nextBooking.travelers_count || 2} Viajeros
                                            </p>
                                            {nextBooking.km_package && (
                                                <span className="text-xs trip-pill">
                                                    {nextBooking.km_package === 'unlimited' ? 'KM Ilimitado' : '150 km/día'}
                                                </span>
                                            )}
                                            {nextBooking.cancellation_policy && (
                                                <span className="text-xs trip-pill">
                                                    {nextBooking.cancellation_policy === 'flexible' ? 'Cancelación Flexible' : 'Cancelación Estándar'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {(() => {
                                        const badge = mapDashboardBookingBadge(nextBooking)
                                        return (
                                            <span className={`status-badge ${badge.badgeClass}`}>
                                                {badge.text}
                                            </span>
                                        )
                                    })()}
                                </div>

                                {nextBooking.payment_status === 'paid' && nextBooking.status === 'pending' && (
                                    <div className="paid-pending-banner">
                                        <Sparkles size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                                        <div>
                                            <strong>Pago confirmado vía Redsys.</strong> Tu viaje está pagado al 100% y en proceso de validación final por administración. Puedes subir ya tu carnet de conducir y firmar el contrato de alquiler oficial.
                                        </div>
                                    </div>
                                )}

                                <div className="trip-dates-grid">
                                    <div className="date-block">
                                        <span className="date-label">Recogida</span>
                                        <p className="date-val">
                                            {new Date(nextBooking.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                        <span className="date-time">{formatBookingSlotTime(nextBooking.pickup_time, '14:00 - 18:00')}</span>
                                    </div>
                                    <div className="date-block">
                                        <span className="date-label">Devolución</span>
                                        <p className="date-val">
                                            {new Date(nextBooking.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                        <span className="date-time">{formatBookingSlotTime(nextBooking.dropoff_time, '10:00 - 12:00')}</span>
                                    </div>
                                </div>

                                {/* Extras */}
                                <div className="extras-section">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span className="date-label" style={{ margin: 0, display: 'block' }}>
                                            {parsedExtras.length > 0 ? 'Extras de tu Reserva' : 'Extras Incluidos de Serie'}
                                        </span>
                                        {parsedExtras.length > 0 && (
                                            <span className="text-xs" style={{ color: 'var(--forest-green)', fontWeight: 600 }}>
                                                {parsedExtras.length} personalizados
                                            </span>
                                        )}
                                    </div>
                                    <div className="extras-chips">
                                        {parsedExtras.length > 0 ? (
                                            parsedExtras.map((extra, idx) => {
                                                const hasEmoji = /\p{Extended_Pictographic}/u.test(extra)
                                                const displayLabel = hasEmoji ? extra : `${getExtraEmoji(extra)} ${extra}`
                                                return (
                                                    <span key={idx} className="extra-chip">
                                                        {displayLabel}
                                                    </span>
                                                )
                                            })
                                        ) : (
                                            defaultExtrasFallback.map((extra, idx) => (
                                                <span key={idx} className="extra-chip">
                                                    {extra}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="price-summary-bar">
                                <div className="price-summary-row">
                                    <span className="price-label">Total Alquiler</span>
                                    <span className="price-value price-value--total">
                                        {formatPrice(Number(nextBooking.total_price || 0))}
                                    </span>
                                </div>
                                <div className="price-summary-row price-summary-row--deposit">
                                    <span className="price-label">Fianza Reembolsable</span>
                                    <span className="price-value price-value--deposit">
                                        {formatPrice(Number(nextBooking.deposit_amount || 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Pick-up Location & Driver Validation */}
                    <div className="bento-side-col">
                        {/* Pick-up Location Card */}
                        <div className="side-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
                                <div className="side-card__icon-wrap">
                                    <MapPin size={18} style={{ color: 'var(--forest-green)' }} />
                                </div>
                                <h3 className="text-h4">Punto de Recogida</h3>
                            </div>

                            <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 110, background: 'var(--gray-100)', marginBottom: 'var(--space-3)' }}>
                                <Image 
                                    src="/images/experiences/exp2.png" 
                                    alt="Palma de Mallorca" 
                                    fill 
                                    style={{ objectFit: 'cover' }} 
                                />
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(45,58,45,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: 'white', fontWeight: 600, fontSize: '0.8rem', background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                                        Palma de Mallorca
                                    </span>
                                </div>
                            </div>

                            <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--black-matte)' }}>
                                Carrer Son Oms, Palma de Mallorca
                            </p>
                            <p className="text-xs" style={{ color: 'var(--gray-600)', marginTop: 2, marginBottom: 'var(--space-4)' }}>
                                (a 5 min del aeropuerto con transfer rápido)
                            </p>

                            <a 
                                href="https://maps.google.com/?q=Carrer+Son+Oms+Palma+de+Mallorca" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-outline btn-sm"
                                style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                            >
                                <Navigation size={14} />
                                <span>Abrir en GPS</span>
                            </a>
                        </div>

                        {/* Driver Validation Card */}
                        <div className="side-card side-card--accent">
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 'var(--space-3)' }}>
                                <div className="side-card__icon-wrap side-card__icon-wrap--sand">
                                    <ShieldCheck size={18} style={{ color: 'var(--sand-dark)' }} />
                                </div>
                                <div>
                                    <h3 className="text-h4" style={{ lineHeight: 1.2 }}>Validación de Carnet</h3>
                                    <p className="text-xs" style={{ color: 'var(--gray-500)', marginTop: 2 }}>
                                        Paso obligatorio antes de la recogida
                                    </p>
                                </div>
                            </div>

                            <div className="driver-rows">
                                {/* Main Driver */}
                                <div className="driver-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className="driver-avatar-mini">
                                            {userName.charAt(0)}
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: '0.82rem', display: 'block', color: 'var(--black-matte)' }}>
                                                Conductor Principal
                                            </span>
                                            <span className="text-xs" style={{ color: 'var(--gray-500)' }}>
                                                {profile?.full_name || user.email}
                                            </span>
                                        </div>
                                    </div>

                                    {isVerified && (
                                        <span className="doc-chip doc-chip--verified">
                                            <CheckCircle size={12} /> Verificado
                                        </span>
                                    )}
                                    {isPendingDoc && (
                                        <span className="doc-chip doc-chip--pending">
                                            <Clock size={12} /> En revisión
                                        </span>
                                    )}
                                    {!isVerified && !isPendingDoc && (
                                        <Link href="/dashboard/documentos" className="btn btn-forest btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                                            Subir Carnet
                                        </Link>
                                    )}
                                </div>

                                {/* Second Driver */}
                                {profile?.has_second_driver && profile?.second_driver_name ? (
                                    <div className="driver-row">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div className="driver-avatar-mini" style={{ background: 'var(--sand-light)', color: 'var(--forest-green)' }}>
                                                {profile.second_driver_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span style={{ fontWeight: 600, fontSize: '0.82rem', display: 'block', color: 'var(--black-matte)' }}>
                                                    Segundo Conductor
                                                </span>
                                                <span className="text-xs" style={{ color: 'var(--gray-600)' }}>
                                                    {profile.second_driver_name}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="doc-chip doc-chip--verified" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                                                <CheckCircle size={10} /> Añadido
                                            </span>
                                            <Link href="/dashboard/profile" className="text-xs font-semibold" style={{ color: 'var(--forest-green)' }}>
                                                Editar
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="driver-row driver-row--dashed">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div className="driver-avatar-mini driver-avatar-mini--dashed">
                                                <ShieldCheck size={14} style={{ color: 'var(--gray-400)' }} />
                                            </div>
                                            <div>
                                                <span style={{ fontWeight: 500, fontSize: '0.82rem', display: 'block', color: 'var(--gray-700)' }}>
                                                    Segundo Conductor
                                                </span>
                                                <span className="text-xs" style={{ color: 'var(--gray-400)' }}>Opcional</span>
                                            </div>
                                        </div>
                                        <Link href="/dashboard/profile" className="text-xs font-semibold" style={{ color: 'var(--sand-dark)' }}>
                                            Añadir
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px dashed var(--gray-200)' }}>
                                <Link 
                                    href="/dashboard/documentos" 
                                    className="btn btn-forest btn-sm" 
                                    style={{ width: '100%', justifyContent: 'center', gap: 6, fontSize: '0.8rem', padding: '8px 12px' }}
                                >
                                    <FileDown size={14} />
                                    <span>Subir Carnet & Firmar Contrato →</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {/* Empty State if NO bookings */}
            {(!bookings || bookings.length === 0) && (
                <div className="empty-state-card">
                    <div className="empty-state__graphic">🚐</div>
                    <h2 className="text-h2" style={{ marginTop: 'var(--space-2)' }}>
                        Aún no tienes ninguna aventura planificada
                    </h2>
                    <p className="text-body" style={{ color: 'var(--gray-600)', maxWidth: 520, margin: 'var(--space-2) auto var(--space-6)' }}>
                        Descubre Mallorca a tu propio ritmo con nuestras furgonetas camper premium 100% autónomas.
                    </p>
                    <div className="empty-state-ctas">
                        <Link href="/campers" className="btn btn-forest btn-lg">
                            <Sparkles size={18} />
                            <span>Explorar Nuestras Campers</span>
                        </Link>
                        <Link href="/dashboard/guia" className="btn btn-outline btn-lg">
                            <Compass size={18} />
                            <span>Ver Guía de Mallorca</span>
                        </Link>
                    </div>
                </div>
            )}

            {/* Past Bookings Section */}
            {pastBookings.length > 0 && (
                <div style={{ marginTop: 'var(--space-6)' }}>
                    <h3 className="text-h4" style={{ marginBottom: 'var(--space-4)', color: 'var(--gray-600)' }}>
                        Historial de Viajes Pasados
                    </h3>
                    <div className="past-grid">
                        {pastBookings.map(b => (
                            <div key={b.id} className="past-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 className="text-h4">Camper {b.camper?.name || 'NEO'}</h4>
                                    <span className="status-pill status-pill--completed">Finalizado</span>
                                </div>
                                <div className="text-small" style={{ color: 'var(--gray-600)', marginTop: 4 }}>
                                    {new Date(b.start_date).toLocaleDateString('es-ES')} → {new Date(b.end_date).toLocaleDateString('es-ES')}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--gray-100)' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--forest-green)' }}>{formatPrice(Number(b.total_price || 0))}</span>
                                    <Link href={`/campers/${b.camper?.slug || 'neo'}`} className="btn btn-ghost btn-sm">
                                        Reservar de nuevo →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style jsx>{`
                .dash-page-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-6);
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                }
                .dash-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: var(--space-6);
                    flex-wrap: wrap;
                    padding-bottom: var(--space-4);
                    border-bottom: 1px solid var(--gray-200);
                    width: 100%;
                    box-sizing: border-box;
                }
                .dash-title {
                    font-family: var(--font-heading);
                    font-size: clamp(1.75rem, 4vw, 2.5rem);
                    font-weight: 700;
                    line-height: 1.15;
                    color: var(--forest-green);
                }
                .dash-title-sub {
                    color: var(--black-matte);
                    font-weight: 600;
                    font-size: 0.85em;
                }
                .countdown-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(200, 168, 130, 0.15);
                    border: 1px solid rgba(200, 168, 130, 0.4);
                    color: var(--black-matte);
                    padding: 8px 16px;
                    border-radius: var(--radius-full);
                    font-size: 0.85rem;
                }
                .countdown-pill--today {
                    background: var(--forest-green);
                    color: var(--sand);
                    border-color: var(--forest-green);
                }

                .bento-layout {
                    display: grid;
                    grid-template-columns: 1.45fr minmax(0, 1fr);
                    gap: var(--space-6);
                    width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                }

                .booking-hero-card {
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    flex-direction: column;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                }
                .booking-hero-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 30px rgba(45, 58, 45, 0.08);
                }
                .booking-hero-card__img-wrap {
                    position: relative;
                    aspect-ratio: 16/9;
                    background: var(--gray-100);
                    width: 100%;
                }
                .booking-hero-card__img-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, transparent 60%);
                }
                .booking-hero-card__img-content {
                    position: absolute;
                    bottom: var(--space-4);
                    left: var(--space-4);
                    right: var(--space-4);
                    color: white;
                }
                .tier-tag {
                    display: inline-block;
                    background: rgba(255, 255, 255, 0.9);
                    color: var(--forest-green);
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    padding: 2px 8px;
                    border-radius: var(--radius-sm);
                    margin-bottom: 4px;
                }
                .camper-overlay-title {
                    font-family: var(--font-heading);
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: white;
                    margin: 0;
                }
                .camper-overlay-sub {
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.85);
                    margin: 0;
                }

                .booking-hero-card__body {
                    padding: var(--space-6);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    flex: 1;
                    gap: var(--space-5);
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                }

                .trip-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: var(--space-4);
                    gap: 12px;
                    width: 100%;
                    box-sizing: border-box;
                }
                .trip-meta-pills {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-wrap: wrap;
                    margin-top: 4px;
                    width: 100%;
                }
                .trip-pill {
                    background: #f3f4f6;
                    padding: 2px 8px;
                    border-radius: 6px;
                    color: #374151;
                    font-weight: 600;
                    font-size: 0.72rem;
                }

                .status-badge {
                    padding: 4px 12px;
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    font-weight: 600;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .status-badge--confirmed {
                    background: var(--forest-green);
                    color: var(--sand);
                }
                .status-badge--pending {
                    background: rgba(230, 126, 34, 0.15);
                    color: var(--warning);
                }
                .status-badge--paid-pending {
                    background: #FEF3C7;
                    color: #92400E;
                    border: 1px solid #F59E0B;
                }
                .status-badge--completed {
                    background: var(--gray-200);
                    color: var(--gray-700);
                }
                .status-badge--cancelled {
                    background: #FEE2E2;
                    color: #991B1B;
                }

                .paid-pending-banner {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    background: #FFFBEB;
                    border: 1px solid #FDE68A;
                    border-radius: var(--radius-md);
                    padding: 10px 14px;
                    margin-bottom: var(--space-4);
                    font-size: 0.82rem;
                    color: #92400E;
                    line-height: 1.4;
                }

                .trip-dates-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4);
                    background: var(--gray-50);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md);
                    padding: var(--space-4);
                    margin-bottom: var(--space-4);
                    width: 100%;
                    box-sizing: border-box;
                }
                .date-block {
                    display: flex;
                    flex-direction: column;
                }
                .date-label {
                    font-size: 0.7rem;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: var(--gray-500);
                }
                .date-val {
                    font-weight: 700;
                    font-size: 0.95rem;
                    color: var(--forest-green);
                    margin: 2px 0;
                }
                .date-time {
                    font-size: 0.75rem;
                    color: var(--gray-600);
                }

                .extras-section {
                    border-top: 1px solid var(--gray-100);
                    padding-top: var(--space-3);
                    width: 100%;
                    box-sizing: border-box;
                }
                .extras-chips {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                    width: 100%;
                }
                .extra-chip {
                    font-size: 0.75rem;
                    font-weight: 500;
                    padding: 3px 10px;
                    border-radius: var(--radius-sm);
                    background: var(--gray-100);
                    color: var(--gray-800);
                }

                .price-summary-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid var(--gray-200);
                    padding-top: var(--space-4);
                    width: 100%;
                    box-sizing: border-box;
                    gap: 12px;
                }
                .price-summary-row {
                    display: flex;
                    flex-direction: column;
                }
                .price-summary-row--deposit {
                    text-align: right;
                    align-items: flex-end;
                }
                .price-label {
                    font-size: 0.7rem;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: var(--gray-500);
                }
                .price-value--total {
                    font-weight: 700;
                    font-size: 1.25rem;
                    color: var(--forest-green);
                }
                .price-value--deposit {
                    font-weight: 600;
                    font-size: 1rem;
                    color: var(--black-matte);
                }

                .bento-side-col {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-6);
                    width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                }
                .side-card {
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    padding: var(--space-6);
                    box-shadow: var(--shadow-sm);
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                }
                .side-card--accent {
                    border-color: rgba(200, 168, 130, 0.4);
                }
                .side-card__icon-wrap {
                    width: 36px;
                    height: 36px;
                    border-radius: var(--radius-md);
                    background: rgba(45, 58, 45, 0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .side-card__icon-wrap--sand {
                    background: rgba(200, 168, 130, 0.2);
                }

                .driver-rows {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }
                .driver-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    background: var(--gray-50);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md);
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .driver-row--dashed {
                    background: transparent;
                    border-style: dashed;
                }
                .driver-avatar-mini {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: var(--forest-green);
                    color: var(--sand);
                    font-size: 0.75rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .driver-avatar-mini--dashed {
                    background: var(--gray-100);
                }
                .doc-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.72rem;
                    font-weight: 600;
                    padding: 3px 8px;
                    border-radius: var(--radius-full);
                }
                .doc-chip--verified {
                    background: rgba(39, 174, 96, 0.15);
                    color: var(--success);
                }
                .doc-chip--pending {
                    background: rgba(52, 152, 219, 0.15);
                    color: #2980b9;
                }



                .empty-adventure-card {
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    padding: var(--space-16) var(--space-8);
                    text-align: center;
                    box-shadow: var(--shadow-sm);
                }
                .empty-icon {
                    font-size: 3.5rem;
                    line-height: 1;
                }
                .empty-state-ctas {
                    display: flex;
                    gap: var(--space-3);
                    justify-content: center;
                    flex-wrap: wrap;
                }

                .past-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: var(--space-4);
                }
                .past-card {
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    padding: var(--space-5);
                    box-shadow: var(--shadow-sm);
                }



                /* ── TABLET ── */
                @media (max-width: 992px) {
                    .bento-layout {
                        grid-template-columns: minmax(0, 1fr);
                        width: 100%;
                        min-width: 0;
                    }
                }

                /* ── MOBILE ── */
                @media (max-width: 640px) {
                    .dash-page-wrapper {
                        gap: var(--space-4);
                        width: 100%;
                        max-width: 100%;
                        overflow-x: hidden;
                    }
                    .dash-header {
                        gap: var(--space-3);
                        padding-bottom: var(--space-3);
                    }
                    .dash-title {
                        font-size: 1.4rem;
                    }
                    .countdown-pill {
                        width: 100%;
                        justify-content: center;
                        font-size: 0.8rem;
                        padding: 7px 12px;
                    }
                    .booking-hero-card__body {
                        padding: 14px 16px;
                        gap: 12px;
                    }
                    .trip-header-row {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 10px;
                    }
                    .booking-hero-card__img-content {
                        bottom: 12px;
                        left: 12px;
                        right: 12px;
                    }
                    .camper-overlay-title {
                        font-size: 1.35rem;
                    }
                    .trip-dates-grid {
                        grid-template-columns: 1fr;
                        gap: 10px;
                        padding: 12px 14px;
                    }
                    .date-block:first-child {
                        border-bottom: 1px dashed var(--gray-200);
                        padding-bottom: 8px;
                    }
                    .date-val {
                        font-size: 0.88rem;
                    }
                    .date-time {
                        font-size: 0.72rem;
                    }
                    .extras-chips {
                        gap: 4px;
                    }
                    .extra-chip {
                        font-size: 0.7rem;
                        padding: 2px 8px;
                    }
                    .price-summary-bar {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 8px;
                    }
                    .price-summary-row {
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                        width: 100%;
                    }
                    .price-summary-row--deposit {
                        border-top: 1px dashed var(--gray-200);
                        padding-top: 8px;
                        text-align: left;
                        align-items: center;
                    }

                    .side-card {
                        padding: 14px 16px;
                    }
                    .past-grid {
                        grid-template-columns: 1fr;
                    }
                    .past-card {
                        padding: var(--space-4);
                    }
                    .paid-pending-banner {
                        font-size: 0.78rem;
                        padding: 10px 12px;
                    }
                    .empty-state-ctas {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .empty-state-ctas :global(.btn) {
                        justify-content: center;
                    }
                    .driver-row {
                        padding: 8px 10px;
                    }
                    .status-badge {
                        font-size: 0.7rem;
                        padding: 3px 8px;
                    }
                }
            `}</style>
        </div>
    )
}
