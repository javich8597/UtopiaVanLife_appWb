'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import {
    Check, ChevronDown, CreditCard, FileSignature, IdCard, Hourglass, KeyRound, Navigation,
    CalendarPlus, Phone, Compass, MapPin, Sparkles, RotateCcw, type LucideIcon,
} from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'
import { getTripState, pickCurrentBooking, type NextStep } from '@/lib/user/tripState'

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


const PICKUP = {
    address: 'Carrer Son Oms, Palma de Mallorca',
    hint: 'A 5 minutos del aeropuerto',
    maps: 'https://maps.google.com/?q=Carrer+Son+Oms+Palma+de+Mallorca',
}
const UTOPIA_TEL = 'tel:+34611560916'

const fmtLong = (d: string) => new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

/** Descarga un .ics con la recogida y la devolución para añadirlas al calendario */
function downloadIcs(booking: any, camperName: string) {
    const day = (d: string) => new Date(d).toISOString().slice(0, 10).replace(/-/g, '')
    const nextDay = (d: string) => {
        const x = new Date(d)
        x.setDate(x.getDate() + 1)
        return x.toISOString().slice(0, 10).replace(/-/g, '')
    }
    const event = (uid: string, date: string, title: string, desc: string) => [
        'BEGIN:VEVENT',
        `UID:${uid}@utopiavanlife`,
        `DTSTART;VALUE=DATE:${day(date)}`,
        `DTEND;VALUE=DATE:${nextDay(date)}`,
        `SUMMARY:${title}`,
        `LOCATION:${PICKUP.address}`,
        `DESCRIPTION:${desc}`,
        'END:VEVENT',
    ].join('\r\n')
    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Utopia Van Life//Mi reserva//ES',
        event(`pick-${booking.id}`, booking.start_date, `Recogida camper ${camperName}`, `Franja: ${formatBookingSlotTime(booking.pickup_time, '14:00 - 18:00')}`),
        event(`drop-${booking.id}`, booking.end_date, `Devolución camper ${camperName}`, `Franja: ${formatBookingSlotTime(booking.dropoff_time, '10:00 - 12:00')}`),
        'END:VCALENDAR',
    ].join('\r\n')
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'utopia-van-life-viaje.ics'
    a.click()
    URL.revokeObjectURL(url)
}

interface StepCopy {
    icon: LucideIcon
    eyebrow: string
    title: string
    text: string
    tone: 'action' | 'calm' | 'done'
}

const STEP_COPY: Record<NextStep, StepCopy> = {
    pay: {
        icon: CreditCard,
        eyebrow: 'Siguiente paso',
        title: 'Completa el pago',
        text: 'Tu reserva está creada pero aún no hemos recibido el pago. Las fechas se guardan durante unos minutos.',
        tone: 'action',
    },
    license: {
        icon: IdCard,
        eyebrow: 'Siguiente paso',
        title: 'Sube tu carnet de conducir',
        text: 'Necesitamos validar el carnet del conductor principal antes de entregarte la camper. Son dos fotos: anverso y reverso.',
        tone: 'action',
    },
    'license-fix': {
        icon: IdCard,
        eyebrow: 'Revisa tu carnet',
        title: 'No hemos podido validar tu carnet',
        text: 'Vuelve a subir las fotos del carnet, bien enfocadas y sin reflejos. Si tienes dudas, escríbenos.',
        tone: 'action',
    },
    contract: {
        icon: FileSignature,
        eyebrow: 'Siguiente paso',
        title: 'Firma el contrato de alquiler',
        text: 'Revisa las condiciones y fírmalo desde el móvil o el ordenador. Tardas un par de minutos.',
        tone: 'action',
    },
    waiting: {
        icon: Hourglass,
        eyebrow: 'En revisión',
        title: 'Lo estamos revisando',
        text: 'Ya tenemos todo lo que necesitamos. Te avisaremos por email en cuanto esté validado.',
        tone: 'calm',
    },
    ready: {
        icon: KeyRound,
        eyebrow: 'Todo listo',
        title: 'Te esperamos en la recogida',
        text: 'Tu reserva está confirmada y la documentación en regla. Solo queda venir a por la camper.',
        tone: 'done',
    },
    'on-trip': {
        icon: Compass,
        eyebrow: 'En ruta',
        title: '¡Buen viaje!',
        text: 'Si necesitas algo durante el viaje, estamos a una llamada. El manual y la guía están siempre a mano.',
        tone: 'done',
    },
    returned: {
        icon: RotateCcw,
        eyebrow: 'Viaje terminado',
        title: 'Gracias por viajar con nosotros',
        text: 'Revisamos la camper tras la devolución y, si todo está bien, te devolvemos la fianza al mismo medio de pago.',
        tone: 'calm',
    },
}

export default function DashboardClient({ bookings, profile, user }: Props) {
    const [showDetails, setShowDetails] = useState(false)
    const now = new Date()
    const booking = pickCurrentBooking(bookings || [], now)
    const pastBookings = (bookings || []).filter(b => b.status === 'completed' || b.status === 'cancelled')
    const firstName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'viajero'

    const extras = useMemo(() => {
        if (!booking) return []
        return parseExtras(booking.extras_selected || booking.extras || booking.booking_extras)
    }, [booking])

    if (!booking) {
        return (
            <div className="dash">
                <header className="usr-page-head">
                    <div>
                        <span className="usr-page-head__eyebrow">Mi reserva</span>
                        <h1 className="usr-page-head__title">Hola, {firstName}</h1>
                    </div>
                </header>
                <section className="usr-card dash-empty">
                    <span className="usr-icon-square dash-empty__icon"><Compass size={22} aria-hidden="true" /></span>
                    <h2 className="dash-empty__title">{pastBookings.length > 0 ? '¿Volvemos a Mallorca?' : 'Aún no tienes ningún viaje'}</h2>
                    <p className="dash-empty__text">
                        Elige camper y fechas y aquí verás todo lo que necesitas para tu viaje, paso a paso.
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
                {pastBookings.length > 0 && <PastTrips bookings={pastBookings} />}
                <DashStyles />
            </div>
        )
    }

    const trip = getTripState(booking, profile, now)
    const copy = STEP_COPY[trip.step]
    const StepIcon = copy.icon
    const camperSlug = booking.camper?.slug || 'neo'
    const camperName = booking.camper?.name || (camperSlug === 'space' ? 'SPACE' : 'NEO')
    const camperImg = booking.camper?.thumbnail_url || FALLBACK_IMAGES[camperSlug] || FALLBACK_IMAGES['neo']
    const travelers = booking.guests_count || booking.travelers_count
    const badge = mapDashboardBookingBadge(booking)
    const pickupSlot = formatBookingSlotTime(booking.pickup_time, '14:00 - 18:00')
    const dropoffSlot = formatBookingSlotTime(booking.dropoff_time, '10:00 - 12:00')
    const showCountdown = trip.daysToStart > 0 && trip.isPaid

    return (
        <div className="dash">
            <header className="usr-page-head">
                <div>
                    <span className="usr-page-head__eyebrow">Mi reserva</span>
                    <h1 className="usr-page-head__title">Hola, {firstName}</h1>
                </div>
            </header>

            {/* 1. El viaje */}
            <article className="usr-card dash-hero">
                <div className="dash-hero__info">
                    <span className={`usr-chip ${BADGE_TONE[badge.status]}`}>{badge.text}</span>
                    <h2 className="dash-hero__name">Camper {camperName}</h2>
                    <p className="dash-hero__dates">
                        <span>{fmtDate(booking.start_date)}</span>
                        <span className="dash-hero__arrow" aria-hidden="true">→</span>
                        <span>{fmtDate(booking.end_date)}</span>
                    </p>
                    <p className="dash-hero__meta">
                        {trip.nights} {trip.nights === 1 ? 'noche' : 'noches'}
                        {travelers ? ` · ${travelers} viajeros` : ''}
                    </p>
                    {showCountdown && (
                        <div className="dash-hero__count">
                            <strong>{trip.daysToStart}</strong>
                            <span>{trip.daysToStart === 1 ? 'día para tu viaje' : 'días para tu viaje'}</span>
                        </div>
                    )}
                </div>
                <div className="dash-hero__media">
                    <Image src={camperImg} alt={`Camper ${camperName}`} fill sizes="(max-width: 860px) 90vw, 420px" className="dash-hero__img" priority />
                </div>

                {/* Progreso */}
                <ol className="dash-progress" aria-label="Progreso de tu reserva">
                    {trip.milestones.map(m => (
                        <li
                            key={m.key}
                            className={`dash-progress__item ${m.done ? 'is-done' : ''} ${m.current ? 'is-current' : ''}`}
                            aria-current={m.current ? 'step' : undefined}
                        >
                            <span className="dash-progress__dot">{m.done ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}</span>
                            <span className="dash-progress__label">{m.label}</span>
                        </li>
                    ))}
                </ol>
            </article>

            {/* 2. Lo único que tiene que hacer ahora */}
            <section className={`usr-card dash-next dash-next--${copy.tone}`} aria-labelledby="dash-next-title">
                <span className="dash-next__icon"><StepIcon size={22} aria-hidden="true" /></span>
                <div className="dash-next__body">
                    <span className="dash-next__eyebrow">{copy.eyebrow}</span>
                    <h2 id="dash-next-title" className="dash-next__title">{copy.title}</h2>
                    <p className="dash-next__text">{copy.text}</p>

                    {(trip.step === 'ready' || trip.step === 'waiting') && (
                        <dl className="dash-pickup">
                            <div>
                                <dt>Recogida</dt>
                                <dd>{fmtLong(booking.start_date)}<span>{pickupSlot}</span></dd>
                            </div>
                            <div>
                                <dt>Dónde</dt>
                                <dd>{PICKUP.address}<span>{PICKUP.hint}</span></dd>
                            </div>
                        </dl>
                    )}

                    {trip.step === 'on-trip' && (
                        <dl className="dash-pickup">
                            <div>
                                <dt>Devolución</dt>
                                <dd>{fmtLong(booking.end_date)}<span>{dropoffSlot}</span></dd>
                            </div>
                            <div>
                                <dt>Dónde</dt>
                                <dd>{PICKUP.address}<span>Mismo punto de la recogida</span></dd>
                            </div>
                        </dl>
                    )}

                    <div className="dash-next__actions">
                        {trip.step === 'pay' && (
                            <Link
                                href={`/checkout?camper=${camperSlug}&from=${booking.start_date.slice(0, 10)}&to=${booking.end_date.slice(0, 10)}&pax=${travelers || 2}`}
                                className="usr-btn usr-btn--primary"
                            >
                                <CreditCard size={16} aria-hidden="true" /> Volver al pago
                            </Link>
                        )}
                        {(trip.step === 'license' || trip.step === 'license-fix') && (
                            <Link href="/dashboard/profile" className="usr-btn usr-btn--primary">
                                <IdCard size={16} aria-hidden="true" /> Subir carnet
                            </Link>
                        )}
                        {trip.step === 'contract' && (
                            <Link href="/dashboard/documentos" className="usr-btn usr-btn--primary">
                                <FileSignature size={16} aria-hidden="true" /> Firmar contrato
                            </Link>
                        )}
                        {(trip.step === 'ready' || trip.step === 'waiting') && (
                            <>
                                <a href={PICKUP.maps} target="_blank" rel="noopener noreferrer" className="usr-btn usr-btn--primary">
                                    <Navigation size={16} aria-hidden="true" /> Cómo llegar
                                </a>
                                <button type="button" className="usr-btn" onClick={() => downloadIcs(booking, camperName)}>
                                    <CalendarPlus size={16} aria-hidden="true" /> Añadir al calendario
                                </button>
                            </>
                        )}
                        {trip.step === 'on-trip' && (
                            <>
                                <a href={UTOPIA_TEL} className="usr-btn usr-btn--primary">
                                    <Phone size={16} aria-hidden="true" /> Llamar a Utopia
                                </a>
                                <Link href="/dashboard/manual" className="usr-btn">
                                    <Compass size={16} aria-hidden="true" /> Manual de la camper
                                </Link>
                            </>
                        )}
                        {trip.step === 'returned' && (
                            <Link href={`/campers/${camperSlug}`} className="usr-btn usr-btn--primary">
                                <Sparkles size={16} aria-hidden="true" /> Reservar de nuevo
                            </Link>
                        )}
                        {trip.step === 'license-fix' && (
                            <a href="https://wa.me/34611560916" target="_blank" rel="noopener noreferrer" className="usr-btn">
                                Escribirnos por WhatsApp
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* 3. Detalles, plegados */}
            <section className="usr-card dash-details">
                <button
                    type="button"
                    className="dash-details__toggle"
                    aria-expanded={showDetails}
                    aria-controls="dash-details-panel"
                    onClick={() => setShowDetails(v => !v)}
                >
                    <span>
                        <strong>Detalles de la reserva</strong>
                        <span className="dash-details__summary">
                            Total {formatPrice(Number(booking.total_price || 0))}
                            {extras.length > 0 ? ` · ${extras.length} ${extras.length === 1 ? 'extra' : 'extras'}` : ''}
                        </span>
                    </span>
                    <ChevronDown size={18} className={`dash-details__chev ${showDetails ? 'is-open' : ''}`} aria-hidden="true" />
                </button>
                {showDetails && (
                    <div id="dash-details-panel" className="dash-details__panel">
                        <dl className="dash-rows">
                            <div><dt>Recogida</dt><dd>{fmtLong(booking.start_date)} · {pickupSlot}</dd></div>
                            <div><dt>Devolución</dt><dd>{fmtLong(booking.end_date)} · {dropoffSlot}</dd></div>
                            <div><dt>Punto de entrega</dt><dd>{PICKUP.address}</dd></div>
                            {booking.km_package && (
                                <div><dt>Kilometraje</dt><dd>{booking.km_package === 'unlimited' ? 'Ilimitado' : '150 km/día'}</dd></div>
                            )}
                            {booking.cancellation_policy && (
                                <div><dt>Cancelación</dt><dd>{booking.cancellation_policy === 'flexible' ? 'Flexible' : 'Estándar'}</dd></div>
                            )}
                            <div><dt>Extras</dt><dd>{extras.length > 0 ? extras.join(', ') : 'Sin extras'}</dd></div>
                            <div><dt>Fianza reembolsable</dt><dd>{formatPrice(Number(booking.deposit_amount || 0))}</dd></div>
                            <div className="dash-rows__total"><dt>Total del alquiler</dt><dd>{formatPrice(Number(booking.total_price || 0))}</dd></div>
                        </dl>
                        <Link href="/dashboard/documentos" className="dash-link">Ver contrato y justificantes</Link>
                    </div>
                )}
            </section>

            {pastBookings.length > 0 && <PastTrips bookings={pastBookings} />}
            <DashStyles />
        </div>
    )
}

function PastTrips({ bookings }: { bookings: any[] }) {
    return (
        <section className="dash-history">
            <h3 className="dash-history__title">Viajes anteriores</h3>
            <ul className="usr-card dash-history__list">
                {bookings.map(b => (
                    <li key={b.id} className="dash-history__row">
                        <span className="dash-history__main">
                            <strong>Camper {b.camper?.name || 'NEO'}</strong>
                            <span>{fmtDate(b.start_date)} – {fmtDate(b.end_date)} {fmtYear(b.end_date)}</span>
                        </span>
                        {b.status === 'cancelled'
                            ? <span className="usr-chip usr-chip--rose">Cancelado</span>
                            : <span className="dash-history__price">{formatPrice(Number(b.total_price || 0))}</span>}
                    </li>
                ))}
            </ul>
        </section>
    )
}

function DashStyles() {
    return (
        <style jsx global>{`
            .dash {
                display: flex;
                flex-direction: column;
                gap: 20px;
                width: 100%;
                max-width: 880px;
                min-width: 0;
                margin: 0 auto;
            }

            /* ── El viaje ── */
            .dash-hero {
                display: grid;
                grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                overflow: hidden;
            }
            .dash-hero__info {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 6px;
                padding: 28px 0 24px 30px;
            }
            .dash-hero__name {
                margin: 8px 0 0;
                font-family: var(--font-heading);
                font-size: 2rem;
                font-weight: 700;
                line-height: 1.05;
                letter-spacing: -0.03em;
                color: var(--usr-text);
            }
            .dash-hero__dates {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 4px 0 0;
                font-size: 1rem;
                font-weight: 600;
                color: var(--usr-text);
                text-transform: capitalize;
            }
            .dash-hero__arrow {
                color: var(--usr-text-3);
            }
            .dash-hero__meta {
                margin: 0;
                font-size: 0.86rem;
                color: var(--usr-text-2);
            }
            .dash-hero__count {
                display: flex;
                align-items: baseline;
                gap: 8px;
                margin-top: 14px;
            }
            .dash-hero__count strong {
                font-family: var(--font-heading);
                font-size: 2.4rem;
                font-weight: 700;
                line-height: 1;
                color: var(--usr-gold-text);
                font-variant-numeric: tabular-nums;
            }
            .dash-hero__count span {
                font-size: 0.86rem;
                color: var(--usr-text-2);
            }
            .dash-hero__media {
                position: relative;
                min-height: 220px;
                margin: 16px 16px 0 0;
                border-radius: 16px;
                /* Panel claro siempre: las fotos de las campers vienen con fondo blanco */
                background: #FFFFFF;
            }
            .user-layout[data-theme='dark'] .dash-hero__media {
                background: #F4F1EC;
            }
            .dash-hero__img {
                object-fit: contain;
                padding: 12px;
            }
            .user-layout[data-theme='dark'] .dash-hero__img {
                mix-blend-mode: multiply;
            }

            .dash-progress {
                grid-column: 1 / -1;
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                margin: 0;
                padding: 18px 30px 22px;
                list-style: none;
                border-top: 1px solid var(--usr-border);
                margin-top: 16px;
            }
            .dash-progress__item {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                text-align: center;
            }
            .dash-progress__item + .dash-progress__item::before {
                content: '';
                position: absolute;
                top: 11px;
                right: 50%;
                width: 100%;
                height: 2px;
                background: var(--usr-border);
                margin-right: 14px;
                width: calc(100% - 28px);
            }
            .dash-progress__item.is-done + .dash-progress__item::before,
            .dash-progress__item.is-done + .dash-progress__item.is-done::before {
                background: var(--usr-sage);
            }
            .dash-progress__dot {
                position: relative;
                z-index: 1;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--usr-surface);
                border: 2px solid var(--usr-border-strong);
                color: var(--usr-surface);
            }
            .dash-progress__item.is-done .dash-progress__dot {
                background: var(--usr-sage);
                border-color: var(--usr-sage);
            }
            .dash-progress__item.is-current .dash-progress__dot {
                border-color: var(--usr-gold);
                box-shadow: 0 0 0 4px var(--usr-gold-soft);
            }
            .dash-progress__label {
                font-size: 0.78rem;
                font-weight: 600;
                color: var(--usr-text-3);
            }
            .dash-progress__item.is-done .dash-progress__label,
            .dash-progress__item.is-current .dash-progress__label {
                color: var(--usr-text);
            }

            /* ── Siguiente paso ── */
            .dash-next {
                display: flex;
                gap: 18px;
                padding: 26px 28px;
                border-left: 4px solid var(--usr-gold);
            }
            .dash-next--calm {
                border-left-color: var(--usr-sky);
            }
            .dash-next--done {
                border-left-color: var(--usr-sage);
            }
            .dash-next__icon {
                width: 48px;
                height: 48px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                background: var(--usr-gold-soft);
                color: var(--usr-gold-text);
            }
            .dash-next--calm .dash-next__icon {
                background: var(--usr-sky-soft);
                color: var(--usr-sky);
            }
            .dash-next--done .dash-next__icon {
                background: var(--usr-sage-soft);
                color: var(--usr-sage);
            }
            .dash-next__body {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .dash-next__eyebrow {
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: var(--usr-text-3);
            }
            .dash-next__title {
                margin: 0;
                font-family: var(--font-heading);
                font-size: 1.35rem;
                font-weight: 600;
                letter-spacing: -0.02em;
                color: var(--usr-text);
            }
            .dash-next__text {
                margin: 0;
                max-width: 560px;
                font-size: 0.92rem;
                line-height: 1.55;
                color: var(--usr-text-2);
            }
            .dash-next__actions {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 10px;
            }
            .dash-pickup {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
                margin: 10px 0 0;
                padding: 14px 16px;
                border-radius: 14px;
                background: var(--usr-surface-2);
            }
            .dash-pickup dt {
                font-size: 0.68rem;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--usr-text-3);
            }
            .dash-pickup dd {
                margin: 4px 0 0;
                font-weight: 600;
                font-size: 0.92rem;
                color: var(--usr-text);
            }
            .dash-pickup dd:first-letter {
                text-transform: uppercase;
            }
            .dash-pickup dd span {
                display: block;
                font-weight: 400;
                font-size: 0.8rem;
                color: var(--usr-text-2);
            }

            /* ── Detalles ── */
            .dash-details {
                overflow: hidden;
            }
            .dash-details__toggle {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                width: 100%;
                min-height: 64px;
                padding: 16px 24px;
                border: 0;
                background: transparent;
                font: inherit;
                text-align: left;
                color: var(--usr-text);
                cursor: pointer;
            }
            .dash-details__toggle strong {
                display: block;
                font-weight: 600;
            }
            .dash-details__summary {
                font-size: 0.82rem;
                color: var(--usr-text-3);
            }
            .dash-details__chev {
                color: var(--usr-text-3);
                transition: transform 200ms var(--ease-out);
                flex-shrink: 0;
            }
            .dash-details__chev.is-open {
                transform: rotate(180deg);
            }
            .dash-details__panel {
                padding: 0 24px 22px;
                display: flex;
                flex-direction: column;
                gap: 14px;
                animation: dashReveal 200ms var(--ease-out);
            }
            @keyframes dashReveal {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: none; }
            }
            .dash-rows {
                margin: 0;
                border-top: 1px solid var(--usr-border);
            }
            .dash-rows > div {
                display: flex;
                justify-content: space-between;
                gap: 16px;
                padding: 11px 0;
                border-bottom: 1px solid var(--usr-border);
                font-size: 0.88rem;
            }
            .dash-rows dt {
                color: var(--usr-text-2);
                flex-shrink: 0;
            }
            .dash-rows dd {
                margin: 0;
                text-align: right;
                color: var(--usr-text);
                font-weight: 500;
            }
            .dash-rows dd:first-letter {
                text-transform: uppercase;
            }
            .dash-rows__total {
                border-bottom: 0 !important;
            }
            .dash-rows__total dt,
            .dash-rows__total dd {
                font-weight: 700;
                color: var(--usr-text);
                font-size: 1rem;
            }
            .dash-link {
                align-self: flex-start;
                font-size: 0.86rem;
                font-weight: 600;
                color: var(--usr-text);
                text-decoration: underline;
                text-decoration-color: var(--usr-gold-line);
                text-underline-offset: 3px;
            }

            /* ── Sin viaje ── */
            .dash-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                gap: 10px;
                padding: 56px 24px;
            }
            .dash-empty__icon {
                width: 56px !important;
                height: 56px !important;
                border-radius: 16px !important;
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

            /* ── Historial ── */
            .dash-history {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 8px;
            }
            .dash-history__title {
                margin: 0;
                font-size: 0.72rem;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--usr-text-3);
            }
            .dash-history__list {
                margin: 0;
                padding: 4px 22px;
                list-style: none;
            }
            .dash-history__row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                min-height: 60px;
                padding: 10px 0;
            }
            .dash-history__row + .dash-history__row {
                border-top: 1px solid var(--usr-border);
            }
            .dash-history__main {
                display: flex;
                flex-direction: column;
                min-width: 0;
            }
            .dash-history__main strong {
                font-weight: 600;
                font-size: 0.92rem;
                color: var(--usr-text);
            }
            .dash-history__main span {
                font-size: 0.8rem;
                color: var(--usr-text-3);
            }
            .dash-history__price {
                font-weight: 600;
                font-size: 0.9rem;
                color: var(--usr-text-2);
                font-variant-numeric: tabular-nums;
            }

            /* ── Móvil ── */
            @media (max-width: 640px) {
                .dash-hero {
                    grid-template-columns: minmax(0, 1fr);
                }
                .dash-hero__media {
                    grid-row: 1;
                    min-height: 170px;
                    margin: 12px 12px 0;
                }
                .dash-hero__info {
                    padding: 18px 18px 0;
                }
                .dash-hero__name {
                    font-size: 1.6rem;
                }
                .dash-progress {
                    padding: 16px 8px 18px;
                }
                .dash-progress__label {
                    font-size: 0.72rem;
                }
                .dash-next {
                    flex-direction: column;
                    gap: 12px;
                    padding: 20px 18px;
                    border-left-width: 0;
                    border-top: 4px solid var(--usr-gold);
                }
                .dash-next--calm { border-top-color: var(--usr-sky); }
                .dash-next--done { border-top-color: var(--usr-sage); }
                .dash-next__actions {
                    flex-direction: column;
                }
                .dash-next__actions .usr-btn {
                    width: 100%;
                }
                .dash-pickup {
                    grid-template-columns: minmax(0, 1fr);
                }
                .dash-details__toggle {
                    padding: 14px 18px;
                }
                .dash-details__panel {
                    padding: 0 18px 18px;
                }
                .dash-rows > div {
                    flex-direction: column;
                    gap: 2px;
                }
                .dash-rows dd {
                    text-align: left;
                }
                .dash-empty {
                    padding: 40px 18px;
                }
                .dash-empty__ctas {
                    flex-direction: column;
                    align-self: stretch;
                }
                .dash-history__list {
                    padding: 4px 16px;
                }
            }
        `}</style>
    )
}
