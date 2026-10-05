import type { CSSProperties } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/pricing/engine'
import {
    ArrowUpRight,
    ArrowDownRight,
    Bell,
    CalendarDays,
    CalendarX2,
    ChevronRight,
    Clock,
    FileText,
    Globe,
    KeyRound,
    ListChecks,
    LogOut,
    MoreVertical,
    Navigation,
    Percent,
    ShieldCheck,
    Truck,
    Archive,
    BadgeCheck,
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
import { ADMIN_STATUS_LABELS, getAdminBookingStatus } from '@/lib/admin/bookingStatus'
import './dashboard.css'

const TZ = 'Europe/Madrid'
const DAY_MS = 24 * 60 * 60 * 1000

const STATUS_TONES: Record<string, string> = {
    review: 'sky',
    pending: 'amber',
    expired: 'neutral',
    confirmed: 'sage',
    active: 'gold',
    completed: 'neutral',
    cancelled: 'rose',
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
            .select('id, camper_id, start_date, end_date, total_price, status, payment_status, created_at, customer_name'),
        supabase
            .from('bookings')
            .select(`
                id, start_date, end_date, total_price, status, payment_status, created_at, customer_name, customer_email,
                campers (name, slug),
                users (id, full_name, email, verification_status)
            `)
            .order('created_at', { ascending: false })
            .limit(6),
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
    // Las pendientes abandonadas en Redsys no son cobros pendientes reales
    const pendingBookings = bookings.filter(b => getAdminBookingStatus(b, now) === 'pending')
    const expiredBookings = bookings.filter(b => getAdminBookingStatus(b, now) === 'expired')
    // Pagadas en Redsys a la espera de que el admin las confirme
    const reviewBookings = bookings.filter(b => getAdminBookingStatus(b, now) === 'review')
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

    // Tiles del resumen de hoy
    const tiles = [
        { key: 'out', value: departuresSoon.length, label: departuresSoon.length === 1 ? 'Salida' : 'Salidas', hint: 'hoy y mañana', href: '/admin/calendar', icon: Navigation, tone: 'sage' },
        { key: 'in', value: returnsSoon.length, label: returnsSoon.length === 1 ? 'Devolución' : 'Devoluciones', hint: 'hoy y mañana', href: '/admin/calendar', icon: KeyRound, tone: 'sky' },
        { key: 'pay', value: pendingBookings.length, label: 'Por cobrar', hint: pendingRevenue > 0 ? formatPrice(pendingRevenue) : 'al día', href: '/admin/bookings?status=pending', icon: Clock, tone: 'amber' },
        { key: 'docs', value: pendingVerificationsCount || 0, label: 'Carnets', hint: 'por validar', href: '/admin/verifications', icon: ShieldCheck, tone: 'rose' },
    ]
    const tasksCount = tiles.reduce((s, t) => s + t.value, 0) + reviewBookings.length

    // Avisos (lista con contador)
    const notices = [
        { key: 'review', label: 'Reservas pagadas por confirmar', count: reviewBookings.length, href: '/admin/bookings?status=review', icon: BadgeCheck },
        { key: 'pay', label: 'Cobros pendientes', count: pendingBookings.length, href: '/admin/bookings?status=pending', icon: Clock },
        { key: 'docs', label: 'Carnets por validar', count: pendingVerificationsCount || 0, href: '/admin/verifications', icon: ShieldCheck },
        { key: 'ret', label: 'Devoluciones hoy y mañana', count: returnsSoon.length, href: '/admin/calendar', icon: LogOut },
        { key: 'exp', label: 'Reservas caducadas por archivar', count: expiredBookings.length, href: '/admin/bookings?status=expired', icon: Archive },
    ].filter(n => n.count > 0)

    const quickLinks = [
        { label: 'Bloquear fechas', href: '/admin/calendar', icon: CalendarX2 },
        { label: 'Fichas de la flota', href: '/admin/campers', icon: Truck },
        { label: 'Temporadas y precios', href: '/admin/settings#temporadas', icon: Percent },
        { label: 'Plantilla de contrato', href: '/admin/contrato', icon: FileText },
        { label: 'Ver la web pública', href: '/', icon: Globe },
    ]

    // Medidor semicircular de ocupación
    const gaugeLength = Math.PI * 80
    const gaugeFill = (Math.min(globalOccupancy, 100) / 100) * gaugeLength

    const getCamperImage = (slugOrName: string) =>
        slugOrName.toLowerCase().includes('space') ? '/images/campers/space/space-ext.png' : '/images/campers/neo/neo-ext.png'

    return (
        <div className="dsh">
            {/* Cabecera */}
            <header className="dsh-head">
                <p className="dsh-head__date">{todayLabel}</p>
                <h1 className="dsh-head__title">{greeting}</h1>
            </header>

            <div className="dsh-layout">
                {/* ===== Columna principal ===== */}
                <div className="dsh-main">
                    {/* Resumen de hoy */}
                    <section className="dsh-card" aria-labelledby="dsh-today-title">
                        <div className="dsh-card__head">
                            <h2 id="dsh-today-title" className="adm-card-title">
                                <span className="adm-icon-square"><ListChecks size={22} /></span>
                                {tasksCount === 0 ? 'Todo al día' : `Tienes ${tasksCount} ${tasksCount === 1 ? 'tarea' : 'tareas'}`}
                            </h2>
                            <Link href="/admin/calendar" className="adm-btn">Ver calendario</Link>
                        </div>

                        <div className="dsh-today">
                            <div className="dsh-tiles">
                                {tiles.map(t => {
                                    const Icon = t.icon
                                    return (
                                        <Link key={t.key} href={t.href as any} className={`dsh-tile ${t.value === 0 ? 'dsh-tile--idle' : ''}`}>
                                            <span className={`adm-icon-dot adm-icon-dot--${t.value === 0 ? 'neutral' : t.tone}`}><Icon size={19} /></span>
                                            <span className="dsh-tile__value">{t.value}</span>
                                            <span className="dsh-tile__label">{t.label}</span>
                                            <span className="dsh-tile__hint">{t.hint}</span>
                                        </Link>
                                    )
                                })}
                            </div>

                            <Link href="/admin/calendar" className="dsh-gauge" aria-label={`Ocupación del mes: ${globalOccupancy}%`}>
                                <svg viewBox="0 0 200 112" className="dsh-gauge__svg" aria-hidden="true">
                                    <path d="M 20 100 A 80 80 0 0 1 180 100" className="dsh-gauge__track" />
                                    <path
                                        d="M 20 100 A 80 80 0 0 1 180 100"
                                        className="dsh-gauge__fill"
                                        style={{ '--gauge-fill': `${gaugeFill} ${gaugeLength}` } as CSSProperties}
                                    />
                                </svg>
                                <span className="dsh-gauge__text">
                                    <span className="dsh-gauge__label">Ocupación</span>
                                    <span className="dsh-gauge__value">{globalOccupancy}%</span>
                                    <span className="dsh-gauge__hint">{totalBookedDays} de {totalFleetDays} días</span>
                                </span>
                            </Link>
                        </div>
                    </section>

                    {/* Cifras del mes */}
                    <section className="dsh-kpis" aria-label="Cifras del mes">
                        <Link href="/admin/bookings?status=confirmed" className="dsh-card dsh-kpi dsh-kpi--hero">
                            <span className="dsh-kpi__label" title="Ingresos de las reservas que salen este mes">
                                Ingresos · salidas de {currentMonth.fullMonth.toLowerCase()}
                            </span>
                            <span className="dsh-kpi__value">{formatPrice(currentMonth.revenue)}</span>
                            <span className="dsh-kpi__meta">
                                {revenueDelta !== null && (
                                    <span className={`dsh-delta ${revenueDelta >= 0 ? 'dsh-delta--up' : 'dsh-delta--down'}`}>
                                        {revenueDelta >= 0 ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
                                        {Math.abs(revenueDelta)}%
                                    </span>
                                )}
                                <span>
                                    {revenueDelta !== null
                                        ? `vs ${previousMonth.fullMonth.toLowerCase()}`
                                        : `${previousMonth.fullMonth}: ${formatPrice(previousMonth.revenue)}`}
                                </span>
                            </span>
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

                    <RevenueChart monthlyData={monthly} />

                    {/* Últimas reservas */}
                    <section className="dsh-card dsh-card--flush" aria-labelledby="dsh-recent-title">
                        <div className="dsh-card__head dsh-card__head--pad">
                            <h2 id="dsh-recent-title" className="dsh-card__title-lg">Últimas reservas</h2>
                            <Link href="/admin/bookings" className="adm-btn">Ver todas</Link>
                        </div>
                        <ul className="dsh-rows">
                            {recentBookings?.map((b: any) => {
                                const clientName = b.customer_name || b.users?.full_name || 'Cliente'
                                const adminStatus = getAdminBookingStatus(b)
                                const nights = nightsBetween(b.start_date, b.end_date)
                                const docPending = b.users?.verification_status === 'pending_validation'
                                return (
                                    <li key={b.id} className="dsh-row">
                                        <span className="dsh-row__avatar" aria-hidden="true">
                                            {clientName.trim().split(/\s+/).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()}
                                        </span>
                                        <span className="dsh-row__main">
                                            <Link href={`/admin/bookings?search=${b.id}&open=true` as any} className="dsh-row__name">
                                                {clientName}
                                            </Link>
                                            <span className="dsh-row__sub">
                                                {b.campers?.name || 'Camper'} · {formatDay(b.start_date)} – {formatDay(b.end_date)} · {nights} {nights === 1 ? 'noche' : 'noches'}
                                            </span>
                                        </span>
                                        <span className="dsh-row__status">
                                            <span className={`dsh-dot dsh-dot--${STATUS_TONES[adminStatus]}`} aria-hidden="true" />
                                            <span>
                                                {ADMIN_STATUS_LABELS[adminStatus]}
                                                <span className="dsh-row__sub">
                                                    {docPending ? 'Carnet por validar' : formatPrice(Number(b.total_price) || 0)}
                                                </span>
                                            </span>
                                        </span>
                                        <Link
                                            href={`/admin/bookings?search=${b.id}&open=true` as any}
                                            className="dsh-row__more"
                                            aria-label={`Abrir la reserva de ${clientName}`}
                                        >
                                            <MoreVertical size={18} />
                                        </Link>
                                    </li>
                                )
                            })}
                            {(!recentBookings || recentBookings.length === 0) && (
                                <li className="adm-empty">Todavía no hay reservas.</li>
                            )}
                        </ul>
                    </section>
                </div>

                {/* ===== Columna lateral ===== */}
                <aside className="dsh-side">
                    {/* Avisos */}
                    <section className="dsh-card" aria-labelledby="dsh-notices-title">
                        <h2 id="dsh-notices-title" className="adm-card-title dsh-side__title">
                            <span className="adm-icon-square adm-icon-square--rose"><Bell size={22} /></span>
                            Avisos
                        </h2>
                        {notices.length > 0 ? (
                            <ul className="adm-linklist">
                                {notices.map(n => {
                                    const Icon = n.icon
                                    return (
                                        <li key={n.key}>
                                            <Link href={n.href as any} className="adm-linklist__item">
                                                <Icon size={20} className="adm-linklist__icon" />
                                                <span className="adm-linklist__label">{n.label}</span>
                                                <span className="adm-linklist__badge">{n.count}</span>
                                                <ChevronRight size={18} className="adm-linklist__chevron" />
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        ) : (
                            <p className="dsh-side__empty">Nada pendiente. Buen trabajo.</p>
                        )}
                    </section>

                    {/* Flota ahora */}
                    <section className="dsh-card" aria-labelledby="dsh-fleet-title">
                        <div className="dsh-card__head">
                            <h2 id="dsh-fleet-title" className="dsh-card__title-lg">Flota ahora</h2>
                            <Link href="/admin/campers" className="dsh-link">Gestionar</Link>
                        </div>
                        <ul className="dsh-fleet__list">
                            {fleetLive.map(c => (
                                <li key={c.id}>
                                    <Link href="/admin/calendar" className="dsh-vehicle">
                                        <span className="dsh-vehicle__img">
                                            <Image src={getCamperImage(c.slug || c.name)} alt="" width={88} height={52} className="dsh-vehicle__render" />
                                        </span>
                                        <span className="dsh-vehicle__body">
                                            <span className="dsh-vehicle__top">
                                                <span className="dsh-vehicle__name">{c.name}</span>
                                                <span className={`adm-chip ${c.state === 'on_trip' ? 'adm-chip--gold' : 'adm-chip--sage'}`}>
                                                    {c.state === 'on_trip' ? 'En viaje' : 'Libre'}
                                                </span>
                                            </span>
                                            <span className="dsh-vehicle__meta">
                                                {c.state === 'on_trip'
                                                    ? `Vuelve ${c.returnsOn ? formatDay(c.returnsOn) : '—'}`
                                                    : c.nextDepartureOn
                                                        ? `Sale ${formatDay(c.nextDepartureOn)}`
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
                            {fleetLive.length === 0 && <li className="adm-empty">No hay campers dados de alta.</li>}
                        </ul>
                    </section>

                    {/* Agenda */}
                    <section className="dsh-card" aria-labelledby="dsh-agenda-title">
                        <h2 id="dsh-agenda-title" className="adm-card-title dsh-side__title">
                            <span className="adm-icon-square adm-icon-square--soft"><CalendarDays size={22} /></span>
                            Próximos 7 días
                        </h2>
                        {agenda.length > 0 ? (
                            <ol className="dsh-agenda__list">
                                {agenda.slice(0, 6).map(ev => (
                                    <li key={`${ev.id}-${ev.type}`} className="dsh-agenda__item">
                                        <span className={`dsh-agenda__day ${ev.date === todayStr ? 'dsh-agenda__day--today' : ''}`}>{dayLabel(ev.date)}</span>
                                        <span className="dsh-agenda__text">
                                            <span className="dsh-agenda__what">{ev.type === 'out' ? 'Salida' : 'Devolución'} · {ev.camper}</span>
                                            <span className="dsh-agenda__who">{ev.customer || 'Cliente'}</span>
                                        </span>
                                        <span className={`dsh-dot dsh-dot--${ev.type === 'out' ? 'sage' : 'gold'}`} aria-hidden="true" />
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="dsh-side__empty">Sin salidas ni devoluciones esta semana.</p>
                        )}
                    </section>

                    {/* Accesos rápidos */}
                    <section className="dsh-card" aria-labelledby="dsh-quick-title">
                        <h2 id="dsh-quick-title" className="dsh-card__title-lg dsh-side__title">Accesos rápidos</h2>
                        <ul className="adm-linklist">
                            {quickLinks.map(q => {
                                const Icon = q.icon
                                return (
                                    <li key={q.label}>
                                        <Link href={q.href as any} className="adm-linklist__item" {...(q.href === '/' ? { target: '_blank' } : {})}>
                                            <Icon size={20} className="adm-linklist__icon" />
                                            <span className="adm-linklist__label">{q.label}</span>
                                            <ChevronRight size={18} className="adm-linklist__chevron" />
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </section>
                </aside>
            </div>
        </div>
    )
}
