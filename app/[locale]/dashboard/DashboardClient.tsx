'use client'

import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Calendar, Euro, MapPin, Clock, BookOpen, ChevronRight, Sparkles, ShieldCheck, Compass, Users, AlertCircle, CheckCircle, Navigation } from 'lucide-react'
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

export default function DashboardClient({ bookings, profile, user }: Props) {
    const activeBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'active') || []
    const pastBookings = bookings?.filter(b => b.status === 'completed' || b.status === 'cancelled') || []
    const pendingBookings = bookings?.filter(b => b.status === 'pending') || []

    const nextBooking = activeBookings[0] || pendingBookings[0]
    const userName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Viajero'
    const isVerified = profile?.verification_status === 'verified'
    const isPendingDoc = profile?.verification_status === 'pending'

    let daysToTrip = -1
    if (nextBooking) {
        const from = new Date(nextBooking.start_date)
        const now = new Date()
        daysToTrip = Math.ceil((from.getTime() - now.getTime()) / (1000 * 3600 * 24))
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Header Greeting */}
            <div className="dashboard-header">
                <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span className="text-xs" style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sand-dark)' }}>
                            Área de Cliente
                        </span>
                    </div>
                    <h1 className="text-h2" style={{ textWrap: 'balance' }}>
                        ¡Hola, {userName}! Tu aventura en Mallorca te espera
                    </h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 4 }}>
                        Consulta los detalles de tu viaje, completa tu check-in y accede a las guías exclusivas de la isla.
                    </p>
                </div>

                {daysToTrip > 0 && (
                    <div className="trip-countdown-badge">
                        <Clock size={16} style={{ color: 'var(--sand-dark)' }} />
                        <span>Faltan <strong>{daysToTrip} días</strong> para la recogida</span>
                    </div>
                )}
                {daysToTrip === 0 && (
                    <div className="trip-countdown-badge trip-countdown-badge--today">
                        <Sparkles size={16} style={{ color: 'var(--sand)' }} />
                        <span>¡Hoy comienza tu aventura!</span>
                    </div>
                )}
            </div>

            {/* If has an active or pending booking */}
            {nextBooking && (
                <div className="adventure-grid">
                    {/* Main Booking Hero Card */}
                    <div className="active-trip-card">
                        <div className="active-trip-card__img-wrap">
                            <Image 
                                src={nextBooking.camper?.thumbnail_url || FALLBACK_IMAGES[nextBooking.camper?.slug] || FALLBACK_IMAGES['neo']}
                                alt={nextBooking.camper?.name || 'Camper'}
                                fill
                                style={{ objectFit: 'cover' }}
                                priority
                            />
                            <div className="active-trip-card__overlay-badge">
                                <span className={`status-pill status-pill--${nextBooking.status}`}>
                                    {nextBooking.status === 'confirmed' ? 'Reserva Confirmada ✅' : 'Pendiente de Pago ⏳'}
                                </span>
                            </div>
                        </div>

                        <div className="active-trip-card__body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                    <span className="text-xs" style={{ color: 'var(--sand-dark)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                        Vehículo Asignado
                                    </span>
                                    <h2 className="text-h3" style={{ marginTop: 2 }}>
                                        Camper {nextBooking.camper?.name || 'NEO'} — Nomade Nation
                                    </h2>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span className="text-h4" style={{ color: 'var(--forest-green)' }}>
                                        {formatPrice(Number(nextBooking.total_price || 0))}
                                    </span>
                                    <span className="text-xs" style={{ color: 'var(--gray-500)', display: 'block' }}>
                                        +{formatPrice(Number(nextBooking.deposit_amount || 0))} fianza
                                    </span>
                                </div>
                            </div>

                            {/* Trip Metadata Specs */}
                            <div className="trip-meta-grid">
                                <div className="meta-cell">
                                    <Calendar size={16} style={{ color: 'var(--forest-green)' }} />
                                    <div>
                                        <span className="meta-label">Fechas del viaje</span>
                                        <span className="meta-val">
                                            {new Date(nextBooking.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} → {new Date(nextBooking.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>

                                <div className="meta-cell">
                                    <Users size={16} style={{ color: 'var(--forest-green)' }} />
                                    <div>
                                        <span className="meta-label">Viajeros</span>
                                        <span className="meta-val">{nextBooking.guests_count || 2} personas</span>
                                    </div>
                                </div>

                                <div className="meta-cell">
                                    <MapPin size={16} style={{ color: 'var(--forest-green)' }} />
                                    <div>
                                        <span className="meta-label">Punto de Entrega</span>
                                        <span className="meta-val">Carrer Son Oms, Palma</span>
                                    </div>
                                </div>
                            </div>

                            {/* Location & GPS pickup */}
                            <div className="pickup-box">
                                <div>
                                    <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--black-matte)' }}>
                                        Punto de recogida & Devolución
                                    </strong>
                                    <p className="text-xs" style={{ color: 'var(--gray-600)', marginTop: 2 }}>
                                        Carrer Son Oms, Palma de Mallorca (a 5 min del aeropuerto con transfer rápido)
                                    </p>
                                </div>
                                <a 
                                    href="https://maps.google.com/?q=Carrer+Son+Oms+Palma+de+Mallorca" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-outline btn-sm"
                                    style={{ gap: 6, flexShrink: 0 }}
                                >
                                    <Navigation size={14} />
                                    <span>Abrir en GPS</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Driver Verification Checklist Card */}
                    <div className="checklist-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
                            <ShieldCheck size={20} style={{ color: isVerified ? 'var(--success)' : 'var(--sand-dark)' }} />
                            <h3 className="text-h4">Check-in & Carnet de Conducir</h3>
                        </div>
                        <p className="text-small" style={{ color: 'var(--gray-600)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
                            Requisito obligatorio antes de la recogida: tener al menos 25 años y más de 3 años de carnet de conducir en vigor.
                        </p>

                        <div className="driver-status-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--black-matte)', display: 'block' }}>
                                        Conductor Principal
                                    </span>
                                    <span className="text-xs" style={{ color: 'var(--gray-500)' }}>
                                        {profile?.full_name || user.email}
                                    </span>
                                </div>

                                {isVerified && (
                                    <span className="doc-pill doc-pill--verified">
                                        <CheckCircle size={14} /> Verificado
                                    </span>
                                )}
                                {isPendingDoc && (
                                    <span className="doc-pill doc-pill--pending">
                                        <Clock size={14} /> En revisión
                                    </span>
                                )}
                                {!isVerified && !isPendingDoc && (
                                    <span className="doc-pill doc-pill--unsubmitted">
                                        <AlertCircle size={14} /> Pendiente
                                    </span>
                                )}
                            </div>

                            {!isVerified && (
                                <Link 
                                    href="/dashboard/profile"
                                    className="btn btn-forest btn-sm"
                                    style={{ marginTop: 'var(--space-3)', width: '100%', justifyContent: 'center' }}
                                >
                                    {isPendingDoc ? 'Ver estado de validación' : 'Subir Carnet de Conducir'}
                                </Link>
                            )}
                        </div>

                        {/* Quick Navigation Cards */}
                        <div className="quick-nav-boxes" style={{ marginTop: 'var(--space-4)' }}>
                            <Link href="/dashboard/guia" className="quick-box">
                                <Compass size={18} style={{ color: 'var(--forest-green)' }} />
                                <div>
                                    <strong style={{ fontSize: '0.85rem', display: 'block' }}>Guía de Mallorca</strong>
                                    <span className="text-xs" style={{ color: 'var(--gray-500)' }}>+45 calas y pernoctas</span>
                                </div>
                                <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--gray-400)' }} />
                            </Link>

                            <Link href="/dashboard/manual" className="quick-box">
                                <BookOpen size={18} style={{ color: 'var(--forest-green)' }} />
                                <div>
                                    <strong style={{ fontSize: '0.85rem', display: 'block' }}>Manual de la Camper</strong>
                                    <span className="text-xs" style={{ color: 'var(--gray-500)' }}>Batería Victron, aguas, cama</span>
                                </div>
                                <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--gray-400)' }} />
                            </Link>
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
                    <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
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
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: var(--space-6);
                    flex-wrap: wrap;
                    padding-bottom: var(--space-4);
                    border-bottom: 1px solid var(--gray-200);
                }
                .trip-countdown-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(200, 168, 130, 0.15);
                    border: 1px solid rgba(200, 168, 130, 0.35);
                    color: var(--black-matte);
                    padding: 8px 16px;
                    border-radius: var(--radius-full);
                    font-size: 0.85rem;
                }
                .trip-countdown-badge--today {
                    background: var(--forest-green);
                    color: var(--sand);
                    border-color: var(--forest-green);
                }

                .adventure-grid {
                    display: grid;
                    grid-template-columns: 1.4fr 1fr;
                    gap: var(--space-6);
                }

                .active-trip-card {
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    flex-direction: column;
                }
                .active-trip-card__img-wrap {
                    position: relative;
                    aspect-ratio: 16/9;
                    background: var(--gray-100);
                }
                .active-trip-card__overlay-badge {
                    position: absolute;
                    top: var(--space-3);
                    left: var(--space-3);
                    z-index: 1;
                }
                .active-trip-card__body {
                    padding: var(--space-6);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                .trip-meta-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: var(--space-3);
                    background: var(--gray-50);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md);
                    padding: var(--space-4);
                }
                .meta-cell {
                    display: flex;
                    gap: 8px;
                    align-items: flex-start;
                }
                .meta-label {
                    display: block;
                    font-size: 0.7rem;
                    color: var(--gray-500);
                    font-weight: 500;
                    text-transform: uppercase;
                }
                .meta-val {
                    display: block;
                    font-size: 0.85rem;
                    color: var(--black-matte);
                    font-weight: 600;
                }

                .pickup-box {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: var(--space-3);
                    background: rgba(45, 58, 45, 0.04);
                    border: 1px solid rgba(45, 58, 45, 0.1);
                    border-radius: var(--radius-md);
                    padding: var(--space-3) var(--space-4);
                }

                .checklist-card {
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    padding: var(--space-6);
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    flex-direction: column;
                }
                .driver-status-box {
                    background: var(--gray-50);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md);
                    padding: var(--space-4);
                }
                .doc-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 4px 10px;
                    border-radius: var(--radius-full);
                }
                .doc-pill--verified {
                    background: rgba(39, 174, 96, 0.15);
                    color: var(--success);
                }
                .doc-pill--pending {
                    background: rgba(52, 152, 219, 0.15);
                    color: #2980b9;
                }
                .doc-pill--unsubmitted {
                    background: rgba(230, 126, 34, 0.15);
                    color: var(--warning);
                }

                .quick-nav-boxes {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }
                .quick-box {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    padding: var(--space-3) var(--space-4);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-md);
                    text-decoration: none;
                    color: var(--black-matte);
                    transition: all var(--transition-fast);
                }
                .quick-box:hover {
                    border-color: var(--forest-green);
                    background: rgba(45, 58, 45, 0.03);
                }

                .status-pill {
                    padding: 4px 12px;
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .status-pill--confirmed {
                    background: rgba(39, 174, 96, 0.95);
                    color: white;
                }
                .status-pill--pending {
                    background: rgba(230, 126, 34, 0.95);
                    color: white;
                }
                .status-pill--completed {
                    background: var(--gray-200);
                    color: var(--gray-700);
                }

                .empty-state-card {
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg);
                    padding: var(--space-16) var(--space-8);
                    text-align: center;
                    box-shadow: var(--shadow-sm);
                }
                .empty-state__graphic {
                    font-size: 3.5rem;
                    line-height: 1;
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

                @media (max-width: 900px) {
                    .adventure-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}
