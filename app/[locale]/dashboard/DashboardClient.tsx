'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Clock, ChevronRight, Sparkles, ShieldCheck, Compass, Users, CheckCircle, Navigation, MapPin, FileText } from 'lucide-react'
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
            text: 'Confirmada',
            badgeClass: 'status-badge--confirmed',
            status: 'confirmed',
        }
    }

    if (isPaidPending) {
        return {
            text: 'Pagada · en validación',
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
        text: 'Pendiente de pago',
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

const BADGE_TONE: Record<string, string> = {
    confirmed: 'usr-chip--sage',
    'paid-pending': 'usr-chip--sky',
    cancelled: 'usr-chip--rose',
    pending: 'usr-chip--amber',
}

function parseExtras(raw: any): string[] {
    const toLabel = (item: any) => {
        if (typeof item === 'string') return item
        const name = item?.name_es || item?.name || item?.extra?.name_es || item?.extra?.name || item?.description
        const qty = item?.quantity && item.quantity > 1 ? ` ×${item.quantity}` : ''
        return name ? `${name}${qty}` : ''
    }
    if (!raw) return []
    if (Array.isArray(raw)) return raw.map(toLabel).filter(Boolean)
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed.map(toLabel).filter(Boolean) : []
        } catch {
            return raw.split(',').map(s => s.trim()).filter(Boolean)
        }
    }
    return []
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
const fmtYear = (d: string) => new Date(d).getFullYear()

export default function DashboardClient({ bookings, profile, user }: Props) {
    const now = Date.now()
    // La próxima reserva es la más cercana en el tiempo (la consulta llega ordenada de más nueva a más antigua)
    const upcoming = (bookings || [])
        .filter(b => b.status === 'confirmed' || b.status === 'active' || b.status === 'pending')
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    const nextBooking = upcoming.find(b => b.status !== 'pending' && new Date(b.end_date).getTime() >= now)
        || upcoming.find(b => new Date(b.end_date).getTime() >= now)
        || upcoming[0]
    const pastBookings = (bookings || []).filter(b => b.status === 'completed' || b.status === 'cancelled')

    const firstName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'viajero'
    const isVerified = profile?.verification_status === 'verified'
    const isPendingDoc = profile?.verification_status === 'pending'

    const extras = useMemo(() => {
        if (!nextBooking) return []
        return parseExtras(nextBooking.extras_selected || nextBooking.extras || nextBooking.booking_extras)
    }, [nextBooking])

    let daysToTrip = -1
    let nightsCount = 0
    if (nextBooking) {
        const from = new Date(nextBooking.start_date)
        const to = new Date(nextBooking.end_date)
        daysToTrip = Math.ceil((from.getTime() - now) / (1000 * 3600 * 24))
        nightsCount = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 3600 * 24)))
    }

    const camperSlug = nextBooking?.camper?.slug || 'neo'
    const camperName = nextBooking?.camper?.name || (camperSlug === 'space' ? 'SPACE' : 'NEO')
    const camperImg = nextBooking?.camper?.thumbnail_url || FALLBACK_IMAGES[camperSlug] || FALLBACK_IMAGES['neo']
    const travelers = nextBooking?.guests_count || nextBooking?.travelers_count

    return (
        <div className="dash">
            {/* Cabecera */}
            <header className="usr-page-head">
                <div>
                    <span className="usr-page-head__eyebrow">Mi reserva</span>
                    <h1 className="usr-page-head__title">Hola, {firstName}</h1>
                    <p className="usr-page-head__desc">
                        {nextBooking ? 'Todo lo de tu próximo viaje en Mallorca, en un solo sitio.' : 'Aquí verás tu viaje en cuanto reserves una camper.'}
                    </p>
                </div>
                {daysToTrip > 0 && (
                    <div className="dash-countdown">
                        <span className="dash-countdown__num">{daysToTrip}</span>
                        <span className="dash-countdown__label">{daysToTrip === 1 ? 'día para' : 'días para'}<br />la recogida</span>
                    </div>
                )}
                {daysToTrip === 0 && (
                    <span className="usr-chip usr-chip--gold dash-today">
                        <Sparkles size={14} aria-hidden="true" /> Hoy empieza tu viaje
                    </span>
                )}
            </header>

            {nextBooking && (
                <div className="dash-grid">
                    {/* Tarjeta principal del viaje */}
                    <article className="usr-card dash-trip">
                        <div className="dash-trip__media">
                            <Image
                                src={camperImg}
                                alt={`Camper ${camperName}`}
                                fill
                                sizes="(max-width: 860px) 100vw, 640px"
                                className="dash-trip__img"
                                priority
                            />
                            <div className="dash-trip__caption">
                                <span className="dash-trip__brand">Utopia Van Life</span>
                                <h2 className="dash-trip__name">Camper {camperName}</h2>
                            </div>
                        </div>

                        <div className="dash-trip__body">
                            <div className="dash-trip__head">
                                <div className="dash-trip__meta">
                                    <span>{nightsCount} {nightsCount === 1 ? 'noche' : 'noches'}</span>
                                    {travelers && <span>{travelers} viajeros</span>}
                                    {nextBooking.km_package && (
                                        <span>{nextBooking.km_package === 'unlimited' ? 'Km ilimitados' : '150 km/día'}</span>
                                    )}
                                    {nextBooking.cancellation_policy && (
                                        <span>{nextBooking.cancellation_policy === 'flexible' ? 'Cancelación flexible' : 'Cancelación estándar'}</span>
                                    )}
                                </div>
                                {(() => {
                                    const badge = mapDashboardBookingBadge(nextBooking)
                                    return <span className={`usr-chip ${BADGE_TONE[badge.status]}`}>{badge.text}</span>
                                })()}
                            </div>

                            {nextBooking.payment_status === 'paid' && nextBooking.status === 'pending' && (
                                <div className="dash-note">
                                    <CheckCircle size={16} aria-hidden="true" className="dash-note__icon" />
                                    <p>
                                        <strong>Pago recibido.</strong> Estamos haciendo la validación final de tu reserva. Mientras tanto ya puedes subir tu carnet y firmar el contrato.
                                    </p>
                                </div>
                            )}

                            <div className="dash-dates">
                                <div className="dash-date">
                                    <span className="dash-label">Recogida</span>
                                    <strong className="dash-date__day">{fmtDate(nextBooking.start_date)}</strong>
                                    <span className="dash-date__time">
                                        <Clock size={13} aria-hidden="true" />
                                        {formatBookingSlotTime(nextBooking.pickup_time, '14:00 - 18:00')}
                                    </span>
                                </div>
                                <ChevronRight size={18} className="dash-dates__arrow" aria-hidden="true" />
                                <div className="dash-date">
                                    <span className="dash-label">Devolución</span>
                                    <strong className="dash-date__day">{fmtDate(nextBooking.end_date)}</strong>
                                    <span className="dash-date__time">
                                        <Clock size={13} aria-hidden="true" />
                                        {formatBookingSlotTime(nextBooking.dropoff_time, '10:00 - 12:00')}
                                    </span>
                                </div>
                            </div>

                            <div className="dash-extras">
                                <span className="dash-label">Extras</span>
                                {extras.length > 0 ? (
                                    <div className="dash-extras__list">
                                        {extras.map((extra, idx) => (
                                            <span key={idx} className="usr-chip">{extra}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="dash-muted">No has añadido extras a esta reserva.</p>
                                )}
                            </div>

                            <div className="dash-totals">
                                <div className="dash-total">
                                    <span className="dash-label">Total del alquiler</span>
                                    <strong className="dash-total__value">{formatPrice(Number(nextBooking.total_price || 0))}</strong>
                                </div>
                                <div className="dash-total dash-total--right">
                                    <span className="dash-label">Fianza reembolsable</span>
                                    <strong className="dash-total__deposit">{formatPrice(Number(nextBooking.deposit_amount || 0))}</strong>
                                </div>
                            </div>
                        </div>
                    </article>

                    <div className="dash-side">
                        {/* Pasos antes de la recogida */}
                        <section className="usr-card dash-panel">
                            <h3 className="usr-card-title">
                                <span className="usr-icon-square"><ShieldCheck size={18} aria-hidden="true" /></span>
                                <span>
                                    Antes de la recogida
                                    <span className="usr-card-title__sub">Paso obligatorio para entregarte la camper</span>
                                </span>
                            </h3>

                            <ul className="dash-steps">
                                <li className="dash-step">
                                    <span className="dash-step__avatar">{firstName.charAt(0)}</span>
                                    <span className="dash-step__text">
                                        <strong>Conductor principal</strong>
                                        <span>{profile?.full_name || user.email}</span>
                                    </span>
                                    {isVerified && <span className="usr-chip usr-chip--sage"><CheckCircle size={12} aria-hidden="true" /> Validado</span>}
                                    {isPendingDoc && <span className="usr-chip usr-chip--sky"><Clock size={12} aria-hidden="true" /> En revisión</span>}
                                    {!isVerified && !isPendingDoc && <span className="usr-chip usr-chip--amber">Falta el carnet</span>}
                                </li>
                                <li className="dash-step">
                                    <span className="dash-step__avatar dash-step__avatar--soft">
                                        {profile?.has_second_driver && profile?.second_driver_name
                                            ? profile.second_driver_name.charAt(0).toUpperCase()
                                            : <Users size={14} aria-hidden="true" />}
                                    </span>
                                    <span className="dash-step__text">
                                        <strong>Segundo conductor</strong>
                                        <span>{profile?.has_second_driver && profile?.second_driver_name ? profile.second_driver_name : 'Opcional'}</span>
                                    </span>
                                    <Link href="/dashboard/profile" className="dash-link">
                                        {profile?.has_second_driver && profile?.second_driver_name ? 'Editar' : 'Añadir'}
                                    </Link>
                                </li>
                            </ul>

                            <Link href="/dashboard/documentos" className="usr-btn usr-btn--primary usr-btn--block">
                                <FileText size={16} aria-hidden="true" />
                                {isVerified ? 'Ver documentos y contrato' : 'Subir carnet y firmar contrato'}
                            </Link>
                        </section>

                        {/* Punto de recogida */}
                        <section className="usr-card dash-panel">
                            <h3 className="usr-card-title">
                                <span className="usr-icon-square usr-icon-square--soft"><MapPin size={18} aria-hidden="true" /></span>
                                <span>
                                    Punto de recogida
                                    <span className="usr-card-title__sub">A 5 minutos del aeropuerto</span>
                                </span>
                            </h3>
                            <div className="dash-place">
                                <Image
                                    src="/images/experiences/exp2.png"
                                    alt="Palma de Mallorca"
                                    fill
                                    sizes="(max-width: 860px) 100vw, 360px"
                                    className="dash-trip__img"
                                />
                            </div>
                            <p className="dash-address">Carrer Son Oms, Palma de Mallorca</p>
                            <a
                                href="https://maps.google.com/?q=Carrer+Son+Oms+Palma+de+Mallorca"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="usr-btn usr-btn--block"
                            >
                                <Navigation size={15} aria-hidden="true" />
                                Cómo llegar
                            </a>
                        </section>
                    </div>
                </div>
            )}

            {/* Sin reservas */}
            {(!bookings || bookings.length === 0) && (
                <section className="usr-card dash-empty">
                    <span className="usr-icon-square dash-empty__icon"><Compass size={22} aria-hidden="true" /></span>
                    <h2 className="dash-empty__title">Aún no tienes ningún viaje</h2>
                    <p className="dash-empty__text">
                        Descubre Mallorca a tu ritmo con nuestras campers 100 % autónomas.
                    </p>
                    <div className="dash-empty__ctas">
                        <Link href="/campers" className="usr-btn usr-btn--primary">
                            <Sparkles size={16} aria-hidden="true" />
                            Ver las campers
                        </Link>
                        <Link href="/dashboard/guia" className="usr-btn">
                            <MapPin size={16} aria-hidden="true" />
                            Guía de Mallorca
                        </Link>
                    </div>
                </section>
            )}

            {/* Historial */}
            {pastBookings.length > 0 && (
                <section className="dash-history">
                    <h3 className="dash-history__title">Viajes anteriores</h3>
                    <div className="dash-history__grid">
                        {pastBookings.map(b => (
                            <article key={b.id} className="usr-card dash-past">
                                <div className="dash-past__head">
                                    <strong>Camper {b.camper?.name || 'NEO'}</strong>
                                    {b.status === 'cancelled'
                                        ? <span className="usr-chip usr-chip--rose">Cancelado</span>
                                        : <span className="usr-chip">Finalizado</span>}
                                </div>
                                <span className="dash-muted">
                                    {fmtDate(b.start_date)} – {fmtDate(b.end_date)} {fmtYear(b.end_date)}
                                </span>
                                <div className="dash-past__foot">
                                    <strong>{formatPrice(Number(b.total_price || 0))}</strong>
                                    <Link href={`/campers/${b.camper?.slug || 'neo'}`} className="dash-link">
                                        Reservar de nuevo
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <style jsx>{`
                .dash {
                    display: flex;
                    flex-direction: column;
                    gap: 28px;
                    width: 100%;
                    min-width: 0;
                }
                .dash-countdown {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 18px 10px 14px;
                    border-radius: 16px;
                    background: var(--usr-surface);
                    box-shadow: var(--usr-card-shadow);
                    border: 1px solid var(--usr-card-border);
                }
                .dash-countdown__num {
                    font-family: var(--font-heading);
                    font-size: 2rem;
                    font-weight: 700;
                    line-height: 1;
                    color: var(--usr-gold-text);
                    font-variant-numeric: tabular-nums;
                }
                .dash-countdown__label {
                    font-size: 0.78rem;
                    line-height: 1.25;
                    color: var(--usr-text-2);
                }

                .dash-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr);
                    gap: 24px;
                    align-items: start;
                }
                .dash-side {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    min-width: 0;
                }

                /* Tarjeta del viaje */
                .dash-trip {
                    overflow: hidden;
                }
                .dash-trip__media {
                    position: relative;
                    aspect-ratio: 16 / 8;
                    /* Panel de estudio siempre claro: las fotos de las campers vienen con fondo blanco */
                    background: #FFFFFF;
                    border-bottom: 1px solid var(--usr-border);
                }
                :global(.user-layout[data-theme='dark']) .dash-trip__media {
                    margin: 10px 10px 0;
                    border-radius: 14px;
                    border-bottom: 0;
                    background: #F4F1EC;
                }
                :global(.user-layout[data-theme='dark']) .dash-trip__media :global(.dash-trip__img) {
                    mix-blend-mode: multiply;
                }
                .dash-trip__media :global(.dash-trip__img) {
                    object-fit: contain;
                    object-position: 75% 85%;
                    padding: 36px 20px 8px 34%;
                }
                .dash-place :global(.dash-trip__img) {
                    object-fit: cover;
                }
                .dash-trip__caption {
                    position: absolute;
                    left: 28px;
                    top: 26px;
                    max-width: 40%;
                    z-index: 1;
                }
                .dash-trip__brand {
                    font-size: 0.7rem;
                    font-weight: 700;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                    color: #8A6626;
                }
                .dash-trip__name {
                    margin: 6px 0 0;
                    font-family: var(--font-heading);
                    font-size: 2rem;
                    font-weight: 700;
                    line-height: 1.05;
                    letter-spacing: -0.03em;
                    color: #1F1B17;
                }
                .dash-trip__body {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    padding: 24px 28px 28px;
                }
                .dash-trip__head {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .dash-trip__meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px 14px;
                    font-size: 0.86rem;
                    font-weight: 500;
                    color: var(--usr-text-2);
                }
                .dash-trip__meta span + span::before {
                    content: '·';
                    margin-right: 14px;
                    color: var(--usr-text-3);
                }

                .dash-note {
                    display: flex;
                    gap: 10px;
                    padding: 12px 14px;
                    border-radius: 14px;
                    background: var(--usr-sky-soft);
                    color: var(--usr-text);
                    font-size: 0.84rem;
                    line-height: 1.45;
                }
                .dash-note p {
                    margin: 0;
                }
                .dash-note :global(.dash-note__icon) {
                    color: var(--usr-sky);
                    flex-shrink: 0;
                    margin-top: 2px;
                }

                .dash-label {
                    display: block;
                    font-size: 0.68rem;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: var(--usr-text-3);
                }
                .dash-muted {
                    margin: 0;
                    font-size: 0.84rem;
                    color: var(--usr-text-3);
                }
                .dash :global(.dash-link) {
                    font-size: 0.84rem;
                    font-weight: 600;
                    color: var(--usr-text);
                    text-decoration: underline;
                    text-decoration-color: var(--usr-gold-line);
                    text-underline-offset: 3px;
                    white-space: nowrap;
                }
                .dash :global(.dash-link:hover) {
                    text-decoration-color: var(--usr-gold);
                }

                .dash-dates {
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 18px;
                    border-radius: 16px;
                    background: var(--usr-surface-2);
                }
                .dash-dates :global(.dash-dates__arrow) {
                    color: var(--usr-text-3);
                }
                .dash-date {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    min-width: 0;
                }
                .dash-date__day {
                    font-family: var(--font-heading);
                    font-size: 1.05rem;
                    font-weight: 600;
                    color: var(--usr-text);
                    text-transform: capitalize;
                }
                .dash-date__time {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.78rem;
                    color: var(--usr-text-2);
                }

                .dash-extras {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .dash-extras__list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .dash-totals {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: 16px;
                    padding-top: 18px;
                    border-top: 1px solid var(--usr-border);
                }
                .dash-total {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .dash-total--right {
                    align-items: flex-end;
                    text-align: right;
                }
                .dash-total__value {
                    font-family: var(--font-heading);
                    font-size: 1.6rem;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                    color: var(--usr-text);
                    font-variant-numeric: tabular-nums;
                }
                .dash-total__deposit {
                    font-size: 1.05rem;
                    font-weight: 600;
                    color: var(--usr-text-2);
                    font-variant-numeric: tabular-nums;
                }

                /* Tarjetas laterales */
                .dash-panel {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 22px 22px 24px;
                }
                .dash-steps {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }
                .dash-step {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 14px;
                    background: var(--usr-surface-2);
                }
                .dash-step__avatar {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background: var(--usr-primary-bg);
                    color: var(--usr-primary-text);
                    font-weight: 700;
                    font-size: 0.82rem;
                    text-transform: uppercase;
                }
                .dash-step__avatar--soft {
                    background: var(--usr-surface);
                    color: var(--usr-text-2);
                    border: 1px dashed var(--usr-border-strong);
                }
                .dash-step__text {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    flex: 1;
                }
                .dash-step__text strong {
                    font-size: 0.86rem;
                    font-weight: 600;
                    color: var(--usr-text);
                }
                .dash-step__text span {
                    font-size: 0.78rem;
                    color: var(--usr-text-3);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .dash-place {
                    position: relative;
                    height: 120px;
                    border-radius: 14px;
                    overflow: hidden;
                    background: var(--usr-surface-2);
                }
                .dash-address {
                    margin: -4px 0 0;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--usr-text);
                }

                /* Vacío */
                .dash-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 10px;
                    padding: 56px 24px;
                }
                .dash-empty :global(.dash-empty__icon) {
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    margin-bottom: 6px;
                }
                .dash-empty__title {
                    margin: 0;
                    font-family: var(--font-heading);
                    font-size: 1.5rem;
                    font-weight: 600;
                    letter-spacing: -0.02em;
                    color: var(--usr-text);
                }
                .dash-empty__text {
                    margin: 0 0 12px;
                    max-width: 440px;
                    color: var(--usr-text-2);
                }
                .dash-empty__ctas {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    justify-content: center;
                }

                /* Historial */
                .dash-history {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .dash-history__title {
                    margin: 0;
                    font-family: var(--font-heading);
                    font-size: 1.08rem;
                    font-weight: 600;
                    color: var(--usr-text);
                }
                .dash-history__grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 16px;
                }
                .dash-past {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    padding: 18px 20px;
                }
                .dash-past__head,
                .dash-past__foot {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                }
                .dash-past__head strong {
                    font-weight: 600;
                    color: var(--usr-text);
                }
                .dash-past__foot {
                    margin-top: 8px;
                    padding-top: 12px;
                    border-top: 1px solid var(--usr-border);
                    color: var(--usr-text);
                }

                /* ── Tablet ── */
                @media (max-width: 1100px) {
                    .dash-grid {
                        grid-template-columns: minmax(0, 1fr);
                    }
                    .dash-side {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                @media (max-width: 860px) {
                    .dash {
                        gap: 20px;
                    }
                    .dash-side {
                        display: flex;
                    }
                }

                /* ── Móvil ── */
                @media (max-width: 640px) {
                    .dash-countdown {
                        width: 100%;
                    }
                    .dash-trip__media {
                        aspect-ratio: 16 / 11;
                    }
                    .dash-trip__media :global(.dash-trip__img) {
                        padding: 64px 12px 6px 12px;
                        object-position: 50% 100%;
                    }
                    .dash-trip__caption {
                        left: 16px;
                        top: 16px;
                        max-width: none;
                    }
                    .dash-trip__name {
                        font-size: 1.45rem;
                    }
                    .dash-trip__body {
                        padding: 18px 16px 20px;
                        gap: 16px;
                    }
                    .dash-dates {
                        grid-template-columns: minmax(0, 1fr);
                        padding: 14px;
                    }
                    .dash-dates :global(.dash-dates__arrow) {
                        display: none;
                    }
                    .dash-date:last-child {
                        padding-top: 10px;
                        border-top: 1px solid var(--usr-border);
                    }
                    .dash-totals {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 10px;
                    }
                    .dash-total,
                    .dash-total--right {
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: baseline;
                        text-align: left;
                    }
                    .dash-total__value {
                        font-size: 1.35rem;
                    }
                    .dash-panel {
                        padding: 18px 16px 20px;
                    }
                    .dash-empty {
                        padding: 40px 18px;
                    }
                    .dash-empty__ctas {
                        flex-direction: column;
                        align-self: stretch;
                    }
                    .dash-history__grid {
                        grid-template-columns: minmax(0, 1fr);
                    }
                }
            `}</style>
        </div>
    )
}
