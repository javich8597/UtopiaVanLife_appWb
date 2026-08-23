import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Euro, MapPin, Clock, BookOpen, ChevronRight } from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'

const FALLBACK_IMAGES: Record<string, string> = {
    aurora: 'https://nomade-nation.com/wp-content/uploads/2024/07/Comp-10-optimized.jpg',
    solara: 'https://nomade-nation.com/wp-content/uploads/2025/01/campero-neo-s-puerta-cerrada0-optimized.jpg'
}

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/auth/login?redirect=/dashboard')
    }

    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
      *,
      camper:campers (slug, name, thumbnail_url)
    `)
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })

    const activeBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'active') || []
    const pastBookings = bookings?.filter(b => b.status === 'completed' || b.status === 'cancelled') || []
    const pendingBookings = bookings?.filter(b => b.status === 'pending') || []

    return (
        <>
            <div className="dashboard-header">
                <h1 className="text-h2">Mis Reservas</h1>
                <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-2)' }}>
                    Gestiona tus aventuras y prepárate para explorar Mallorca.
                </p>
            </div>

            <div className="dashboard-content" style={{ marginTop: 'var(--space-8)' }}>
                {bookings && bookings.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state__icon text-h1">🚐</div>
                        <h2 className="text-h3" style={{ marginTop: 'var(--space-4)' }}>Aún no tienes aventuras</h2>
                        <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-2)' }}>
                            ¿A qué esperas para descubrir la isla?
                        </p>
                        <Link href="/campers" className="btn btn-forest" style={{ marginTop: 'var(--space-6)', display: 'inline-flex' }}>
                            Ver Flota
                        </Link>
                    </div>
                ) : (
                    <div className="bookings-layout">
                        <div className="bookings-section">
                            <h3 className="text-h4" style={{ marginBottom: 'var(--space-4)' }}>Reservas Activas</h3>
                            {activeBookings.length === 0 ? (
                                <p className="text-body" style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>No hay aventuras en curso.</p>
                            ) : (
                                <div className="bookings-grid">
                                    {activeBookings.map(b => (
                                        <BookingCard key={b.id} booking={b} isActive={true} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {pendingBookings.length > 0 && (
                            <div className="bookings-section" style={{ marginTop: 'var(--space-12)' }}>
                                <h3 className="text-h4" style={{ marginBottom: 'var(--space-4)' }}>Pendientes de Pago</h3>
                                <div className="bookings-grid">
                                    {pendingBookings.map(b => (
                                        <BookingCard key={b.id} booking={b} isPending={true} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {pastBookings.length > 0 && (
                            <div className="bookings-section" style={{ marginTop: 'var(--space-12)', opacity: 0.7 }}>
                                <h3 className="text-h4" style={{ marginBottom: 'var(--space-4)' }}>Aventuras Pasadas</h3>
                                <div className="bookings-grid">
                                    {pastBookings.map(b => (
                                        <BookingCard key={b.id} booking={b} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            
        </>
    )
}

function BookingCard({ booking, isActive = false, isPending = false }: { booking: any, isActive?: boolean, isPending?: boolean }) {
    const from = new Date(booking.start_date)
    const to = new Date(booking.end_date)
    const now = new Date()

    let daysToStart = -1
    if (isActive) {
        daysToStart = Math.ceil((from.getTime() - now.getTime()) / (1000 * 3600 * 24))
    }

    const statusLabels: Record<string, { label: string, color: string }> = {
        pending: { label: 'Pago Pendiente', color: 'var(--sand-dark)' },
        confirmed: { label: 'Confirmada', color: 'var(--success)' },
        active: { label: 'En progreso', color: 'var(--forest-green)' },
        completed: { label: 'Completada', color: 'var(--gray-500)' },
        cancelled: { label: 'Cancelada', color: 'var(--error)' }
    }

    const badge = statusLabels[booking.status] || { label: booking.status, color: 'var(--gray-500)' }
    const totalAmount = booking.total_price + booking.deposit_amount

    const imageUrl = booking.camper?.thumbnail_url || FALLBACK_IMAGES[booking.camper?.slug] || FALLBACK_IMAGES['aurora']

    return (
        <div className="booking-card">
            <div className="booking-card__image-container">
                <Image src={imageUrl} alt={booking.camper?.name || 'Camper'} fill style={{ objectFit: 'cover' }} />
                <div className="booking-card__badge" style={{ background: badge.color }}>
                    {badge.label}
                </div>
            </div>

            <div className="booking-card__content">
                <h4 className="text-h4" style={{ marginBottom: 'var(--space-2)' }}>{booking.camper?.name || 'Tu Camper'}</h4>

                <div className="booking-details">
                    <div className="detail-row">
                        <Calendar size={16} />
                        <span>{from.toLocaleDateString('es-ES')} → {to.toLocaleDateString('es-ES')}</span>
                    </div>
                    <div className="detail-row">
                        <Euro size={16} />
                        <span>{formatPrice(totalAmount)} (Total + Fianza)</span>
                    </div>
                    <div className="detail-row">
                        <MapPin size={16} />
                        <span className="text-xs">Palma de Mallorca (Recogida a convenir)</span>
                    </div>
                </div>

                <div className="booking-card__actions">
                    {isActive && daysToStart > 0 && (
                        <div className="countdown">
                            <Clock size={16} style={{ color: 'var(--sand-dark)' }} />
                            <span><strong style={{ color: 'var(--forest-green)' }}>{daysToStart} días</strong> para tu aventura</span>
                        </div>
                    )}

                    {isActive && (
                        <button className="btn btn-outline" style={{ width: '100%', marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'center', gap: 'var(--space-2)' }}>
                            <BookOpen size={18} /> Guía Digital (Próximamente)
                        </button>
                    )}

                    {isPending && (
                        <button className="btn btn-forest" style={{ width: '100%', marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'center', gap: 'var(--space-2)' }}>
                            Reanudar Pago <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>

            
        </div>
    )
}
