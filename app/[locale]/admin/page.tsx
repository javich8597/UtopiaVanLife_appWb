import type { CSSProperties } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/pricing/engine'
import {
    ArrowRight,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    CircleCheck,
    Clock,
    KeyRound,
    LogOut,
    Navigation,
    ShieldCheck
} from 'lucide-react'
import { Link } from '@/i18n/routing'
import RevenueChart from './RevenueChart'
import {
    calculateMonthlyRevenue,
    calculateFleetOccupancy,
    calculateGlobalOccupancy,
    calculateFleetLiveStatus,
    calculateDelta
} from '@/lib/admin/dashboardMetrics'
import './dashboard.css'

const TZ = 'Europe/Madrid'
const DAY_MS = 24 * 60 * 60 * 1000

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
    pending: { label: 'Pendiente de pago', tone: 'amber' },
    confirmed: { label: 'Confirmada', tone: 'sage' },
    active: { label: 'En viaje', tone: 'gold' },
    completed: { label: 'Completada', tone: 'neutral' },
    cancelled: { label: 'Cancelada', tone: 'rose' },
}

// Las fechas de reserva llegan como 'YYYY-MM-DD' (medianoche UTC): se formatean en UTC para no desplazar el día
const formatDay = (value: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
    new Date(value).toLocaleDateString('es-ES', { ...opts, timeZone: 'UTC' })

const nightsBetween = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime()
    return isNaN(diff) ? 1 : Math.max(1, Math.round(diff / DAY_MS))
}

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    const [
        { count: pendingVerificationsCount },
        { data: campersData },
        { data: allBookingsData },
        { data: recentBookings },
    ] = await Promise.all([
        supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('verification_status', 'pending_validation'),
        supabase
            .from('campers')
            .select('id, name, slug, thumbnail_url, is_active')
            .order('name'),
        supabase
            .from('bookings')
            .select('id, camper_id, start_date, end_date, total_price, status, created_at, customer_name'),
        supabase
            .from('bookings')
            .select(`
                id, start_date, end_date, total_price, status, created_at, customer_name, customer_email,
                campers (name, slug),
                users (id, full_name, email, verification_status)
            `)
            .order('created_at', { ascending: false })
            .limit(8),
    ])

    const bookings = allBookingsData || []
    const campers = campersData || []
    const camperName = (id?: string | null) => campers.find(c => c.id === id)?.name || 'Camper'

    // Fechas de referencia en hora de Mallorca
    const now = new Date()
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: TZ })
    const tomorrowStr = new Date(now.getTime() + DAY_MS).toLocaleDateString('en-CA', { timeZone: TZ })
    const in7DaysStr = new Date(now.getTime() + 7 * DAY_MS).toLocaleDateString('en-CA', { timeZone: TZ })
    const hour = Number(now.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }))
    const greeting = hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches'
    const todayLabel = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })

    // Finanzas
    const paidStatuses = ['confirmed', 'active', 'completed']
    const paidBookings = bookings.filter(b => paidStatuses.includes(b.status))
    const pendingBookings = bookings.filter(b => b.status === 'pending')
    const pendingRevenue = pendingBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0)
    const paidRevenue = paidBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0)
    const averageTicket = paidBookings.length > 0 ? Math.round(paidRevenue / paidBookings.length) : 0
    const averageNights = paidBookings.length > 0
        ? Math.round((paidBookings.reduce((s, b) => s + nightsBetween(b.start_date, b.end_date), 0) / paidBookings.length) * 10) / 10
        : 0

    const monthly = calculateMonthlyRevenue(bookings, now, 12)
    const currentMonth = monthly[monthly.length - 1]
    const previousMonth = monthly[monthly.length - 2]
    // Sin ingresos todavía este mes, un -100% solo alarma: se muestra la referencia del mes anterior
    const revenueDelta = currentMonth.revenue > 0 ? calculateDelta(currentMonth.revenue, previousMonth.revenue) : null

    // Flota
    const fleetOccupancy = calculateFleetOccupancy(campers, bookings, now)
    const globalOccupancy = calculateGlobalOccupancy(fleetOccupancy)
    const totalBookedDays = fleetOccupancy.reduce((acc, c) => acc + c.bookedDays, 0)
    const totalFleetDays = fleetOccupancy.reduce((acc, c) => acc + c.totalDaysInMonth, 0)
    const fleetLive = calculateFleetLiveStatus(campers, bookings, fleetOccupancy, now)

    // Movimientos operativos
    const liveBookings = bookings.filter(b => ['confirmed', 'active'].includes(b.status))
    const departuresSoon = liveBookings.filter(b => b.start_date === todayStr || b.start_date === tomorrowStr)
    const returnsSoon = liveBookings.filter(b => b.end_date === todayStr || b.end_date === tomorrowStr)

    const agenda = [
        ...liveBookings
            .filter(b => b.start_date >= todayStr && b.start_date <= in7DaysStr)
            .map(b => ({ id: b.id, type: 'out' as const, date: b.start_date, customer: b.customer_name, camper: camperName(b.camper_id) })),
        ...liveBookings
            .filter(b => b.end_date >= todayStr && b.end_date <= in7DaysStr)
            .map(b => ({ id: b.id, type: 'in' as const, date: b.end_date, customer: b.customer_name, camper: camperName(b.camper_id) })),
    ].sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'in' ? -1 : 1))

    const dayLabel = (date: string) =>
        date === todayStr ? 'Hoy' : date === tomorrowStr ? 'Mañana' : formatDay(date, { weekday: 'short', day: 'numeric' })

    const attention = [
        {
            key: 'out',
            value: departuresSoon.length,
            label: departuresSoon.length === 1 ? 'Salida hoy o mañana' : 'Salidas hoy o mañana',
            href: '/admin/calendar',
            icon: Navigation,
            urgent: false,
        },
        {
            key: 'in',
            value: returnsSoon.length,
            label: returnsSoon.length === 1 ? 'Devolución hoy o mañana' : 'Devoluciones hoy o mañana',
            href: '/admin/calendar',
            icon: KeyRound,
            urgent: false,
        },
        {
            key: 'pay',
            value: pendingBookings.length,
            label: pendingBookings.length === 1 ? 'Cobro pendiente' : 'Cobros pendientes',
            href: '/admin/bookings?status=pending',
            icon: Clock,
            urgent: pendingBookings.length > 0,
        },
        {
            key: 'docs',
            value: pendingVerificationsCount || 0,
            label: pendingVerificationsCount === 1 ? 'Carnet por validar' : 'Carnets por validar',
            href: '/admin/verifications',
            icon: ShieldCheck,
            urgent: (pendingVerificationsCount || 0) > 0,
        },
    ]
    const allClear = attention.every(a => a.value === 0)

    const getCamperImage = (slugOrName: string) =>
        slugOrName.toLowerCase().includes('space') ? '/images/campers/space/space-ext.png' : '/images/campers/neo/neo-ext.png'

    return (
        <div className="dsh">
            {/* 1. Cabecera */}
            <header className="dsh-head">
                <div>
                    <p className="dsh-head__date">{todayLabel}</p>
                    <h1 className="dsh-head__title">{greeting}</h1>
                </div>
                <div className="dsh-head__actions">
                    <Link href="/admin/bookings" className="dsh-btn dsh-btn--ghost">
                        <span>Reservas</span>
                    </Link>
                    <Link href="/admin/calendar" className="dsh-btn dsh-btn--primary">
                        <Calendar size={15} aria-hidden="true" />
                        <span>Calendario</span>
                    </Link>
                </div>
            </header>

            {/* 2. Requiere tu atención */}
            <section className="dsh-card dsh-attention" aria-labelledby="dsh-attention-title">
                <div className="dsh-card__head">
                    <h2 id="dsh-attention-title" className="dsh-card__title">Requiere tu atención</h2>
                    {allClear && (
                        <span className="dsh-chip dsh-chip--sage">
                            <CircleCheck size={13} aria-hidden="true" /> Todo al día
                        </span>
                    )}
                </div>
                <div className="dsh-attention__grid">
                    {attention.map(item => {
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.key}
                                href={item.href as any}
                                className={`dsh-task ${item.urgent ? 'dsh-task--urgent' : ''} ${item.value === 0 ? 'dsh-task--idle' : ''}`}
                            >
                                <span className="dsh-task__icon"><Icon size={16} aria-hidden="true" /></span>
                                <span className="dsh-task__value">{item.value}</span>
                                <span className="dsh-task__label">{item.label}</span>
                                <ArrowRight size={14} className="dsh-task__arrow" aria-hidden="true" />
                            </Link>
                        )
                    })}
                </div>
            </section>

            {/* 3. KPIs */}
            <section className="dsh-kpis" aria-label="Indicadores principales">
                <Link href="/admin/bookings?status=confirmed" className="dsh-card dsh-kpi dsh-kpi--hero">
                    <span className="dsh-kpi__label">Ingresos de {currentMonth.fullMonth.toLowerCase()}</span>
                    <span className="dsh-kpi__value">{formatPrice(currentMonth.revenue)}</span>
                    <span className="dsh-kpi__meta">
                        {revenueDelta !== null ? (
                            <span className={`dsh-delta ${revenueDelta >= 0 ? 'dsh-delta--up' : 'dsh-delta--down'}`}>
                                {revenueDelta >= 0 ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
                                {Math.abs(revenueDelta)}%
                            </span>
                        ) : null}
                        <span>
                            {revenueDelta !== null
                                ? `vs ${previousMonth.fullMonth.toLowerCase()}`
                                : `${previousMonth.fullMonth}: ${formatPrice(previousMonth.revenue)}`}
                        </span>
                    </span>
                </Link>

                <Link href="/admin/calendar" className="dsh-card dsh-kpi">
                    <span className="dsh-kpi__label">Ocupación del mes</span>
                    <span className="dsh-kpi__value">{globalOccupancy}%</span>
                    <span className="dsh-kpi__meta">{totalBookedDays} de {totalFleetDays} días reservados</span>
                </Link>

                <Link href="/admin/bookings?status=pending" className="dsh-card dsh-kpi">
                    <span className="dsh-kpi__label">Pendiente de cobro</span>
                    <span className="dsh-kpi__value">{formatPrice(pendingRevenue)}</span>
                    <span className="dsh-kpi__meta">
                        {pendingBookings.length} {pendingBookings.length === 1 ? 'reserva' : 'reservas'} sin pagar
                    </span>
                </Link>

                <Link href="/admin/bookings" className="dsh-card dsh-kpi">
                    <span className="dsh-kpi__label">Ticket medio</span>
                    <span className="dsh-kpi__value">{formatPrice(averageTicket)}</span>
                    <span className="dsh-kpi__meta">{String(averageNights).replace('.', ',')} noches de media</span>
                </Link>
            </section>

            {/* 4. Ingresos + Flota ahora */}
            <div className="dsh-row dsh-row--chart">
                <RevenueChart monthlyData={monthly} />

                <section className="dsh-card dsh-fleet" aria-labelledby="dsh-fleet-title">
                    <div className="dsh-card__head">
                        <h2 id="dsh-fleet-title" className="dsh-card__title">Flota ahora</h2>
                        <Link href="/admin/campers" className="dsh-link">Gestionar</Link>
                    </div>
                    <ul className="dsh-fleet__list">
                        {fleetLive.map(c => (
                            <li key={c.id}>
                                <Link href="/admin/calendar" className="dsh-vehicle">
                                    <span className="dsh-vehicle__img">
                                        <Image
                                            src={getCamperImage(c.slug || c.name)}
                                            alt=""
                                            width={88}
                                            height={52}
                                            className="dsh-vehicle__render"
                                        />
                                    </span>
                                    <span className="dsh-vehicle__body">
                                        <span className="dsh-vehicle__top">
                                            <span className="dsh-vehicle__name">{c.name}</span>
                                            <span className={`dsh-chip ${c.state === 'on_trip' ? 'dsh-chip--gold' : 'dsh-chip--sage'}`}>
                                                {c.state === 'on_trip' ? 'En viaje' : 'Disponible'}
                                            </span>
                                        </span>
                                        <span className="dsh-vehicle__meta">
                                            {c.state === 'on_trip'
                                                ? `${c.currentCustomer ? `${c.currentCustomer} · ` : ''}vuelve ${c.returnsOn ? formatDay(c.returnsOn) : '—'}`
                                                : c.nextDepartureOn
                                                    ? `Próxima salida ${formatDay(c.nextDepartureOn)}`
                                                    : 'Sin salidas programadas'}
                                        </span>
                                        <span className="dsh-meter" aria-label={`Ocupación del mes ${c.occupancyPercent}%`}>
                                            <span className="dsh-meter__track">
                                                <span className="dsh-meter__fill" style={{ '--pct': `${c.occupancyPercent}%` } as CSSProperties} />
                                            </span>
                                            <span className="dsh-meter__value">{c.occupancyPercent}%</span>
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                        {fleetLive.length === 0 && <li className="dsh-empty">No hay campers dados de alta.</li>}
                    </ul>
                </section>
            </div>

            {/* 5. Agenda + Reservas recientes */}
            <div className="dsh-row dsh-row--bottom">
                <section className="dsh-card dsh-agenda" aria-labelledby="dsh-agenda-title">
                    <div className="dsh-card__head">
                        <h2 id="dsh-agenda-title" className="dsh-card__title">Próximos 7 días</h2>
                        <Link href="/admin/calendar" className="dsh-link">Calendario</Link>
                    </div>
                    {agenda.length > 0 ? (
                        <ol className="dsh-agenda__list">
                            {agenda.slice(0, 8).map(ev => (
                                <li key={`${ev.id}-${ev.type}`} className="dsh-agenda__item">
                                    <span className={`dsh-agenda__day ${ev.date === todayStr ? 'dsh-agenda__day--today' : ''}`}>
                                        {dayLabel(ev.date)}
                                    </span>
                                    <span className={`dsh-agenda__icon dsh-agenda__icon--${ev.type}`}>
                                        {ev.type === 'out' ? <Navigation size={13} aria-hidden="true" /> : <LogOut size={13} aria-hidden="true" />}
                                    </span>
                                    <span className="dsh-agenda__text">
                                        <span className="dsh-agenda__what">{ev.type === 'out' ? 'Salida' : 'Devolución'} · {ev.camper}</span>
                                        <span className="dsh-agenda__who">{ev.customer || 'Cliente'}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="dsh-empty">Sin salidas ni devoluciones esta semana.</p>
                    )}
                </section>

                <section className="dsh-card dsh-recent" aria-labelledby="dsh-recent-title">
                    <div className="dsh-card__head">
                        <h2 id="dsh-recent-title" className="dsh-card__title">Reservas recientes</h2>
                        <Link href="/admin/bookings" className="dsh-link">Ver todas</Link>
                    </div>
                    <div className="dsh-table-wrap">
                        <table className="dsh-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Camper</th>
                                    <th>Fechas</th>
                                    <th className="dsh-table__num">Total</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentBookings?.map((b: any) => {
                                    const clientName = b.customer_name || b.users?.full_name || 'Cliente'
                                    const status = STATUS_LABELS[b.status] || { label: b.status, tone: 'neutral' }
                                    const docPending = b.users?.verification_status === 'pending_validation'
                                    const nights = nightsBetween(b.start_date, b.end_date)
                                    return (
                                        <tr key={b.id}>
                                            <td className="dsh-table__client">
                                                <Link href={`/admin/bookings?search=${b.id}` as any} className="dsh-table__client-link">
                                                    <span className="dsh-table__name">{clientName}</span>
                                                    <span className="dsh-table__ref">#{b.id.split('-')[0].toUpperCase()}</span>
                                                </Link>
                                            </td>
                                            <td className="dsh-table__camper">{b.campers?.name || 'Camper'}</td>
                                            <td className="dsh-table__dates">
                                                {formatDay(b.start_date)} – {formatDay(b.end_date)}
                                                <span className="dsh-table__nights">{nights} {nights === 1 ? 'noche' : 'noches'}</span>
                                            </td>
                                            <td className="dsh-table__num dsh-table__total">{formatPrice(Number(b.total_price) || 0)}</td>
                                            <td className="dsh-table__status">
                                                <span className={`dsh-chip dsh-chip--${status.tone}`}>{status.label}</span>
                                                {docPending && (
                                                    <Link href="/admin/verifications" className="dsh-doc-flag" title="Documentación pendiente de validar">
                                                        <ShieldCheck size={12} aria-hidden="true" /> Doc.
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {(!recentBookings || recentBookings.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="dsh-empty">Todavía no hay reservas.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    )
}
