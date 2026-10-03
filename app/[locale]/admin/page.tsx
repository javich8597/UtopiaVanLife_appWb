import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/pricing/engine'
import {
    Calendar,
    Euro,
    Users,
    Truck,
    ArrowRight,
    ShieldCheck,
    ShieldAlert,
    AlertCircle,
    SlidersHorizontal,
    Navigation,
    CheckCircle2,
    Clock,
    Sparkles,
    KeyRound
} from 'lucide-react'
import { Link } from '@/i18n/routing'
import DashboardCharts from './DashboardCharts'
import BookingStatusAction from './BookingStatusAction'
import {
    calculateMonthlyRevenue,
    calculateFleetOccupancy,
    calculateAverageTicket,
    calculateGlobalOccupancy
} from '@/lib/admin/dashboardMetrics'

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    // 1. KPIs queries
    const { count: pendingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    const { count: activeCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .in('status', ['confirmed', 'active'])

    const { count: campersCount } = await supabase
        .from('campers')
        .select('*', { count: 'exact', head: true })

    const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

    const { count: pendingVerificationsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending_validation')

    const { data: revenueData } = await supabase
        .from('bookings')
        .select('total_price')
        .in('status', ['confirmed', 'active', 'completed'])

    const totalRevenue = revenueData?.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0) || 0

    // Pendientes de cobro en €
    const { data: pendingRevenueData } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('status', 'pending')

    const pendingRevenue = pendingRevenueData?.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0) || 0

    // 2. Campers & All Bookings for visual analytics (Last 6 months + Fleet Occupancy)
    const { data: campersData } = await supabase
        .from('campers')
        .select('id, name, slug, thumbnail_url, is_active')
        .order('name')

    const { data: allBookingsData } = await supabase
        .from('bookings')
        .select('id, camper_id, start_date, end_date, total_price, status, created_at')

    const now = new Date()
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    const currentMonthName = `${monthNames[now.getMonth()]} ${now.getFullYear()}`

    const monthlyMetrics = calculateMonthlyRevenue(allBookingsData || [], now)
    const fleetOccupancy = calculateFleetOccupancy(campersData || [], allBookingsData || [], now)

    // Métricas ejecutivas derivadas
    const confirmedCount = activeCount || 0
    const averageTicket = calculateAverageTicket(totalRevenue, confirmedCount)
    const globalOccupancy = calculateGlobalOccupancy(fleetOccupancy)
    const totalBookedDays = fleetOccupancy.reduce((acc, c) => acc + c.bookedDays, 0)
    const totalAvailableDays = fleetOccupancy.reduce((acc, c) => acc + c.availableDays, 0)

    // 3. Próximos check-ins y check-outs (próximos 7 días)
    const todayStr = now.toISOString().split('T')[0]
    const nextWeekDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const nextWeekStr = nextWeekDate.toISOString().split('T')[0]

    const { data: upcomingCheckins } = await supabase
        .from('bookings')
        .select(`
            id, start_date, end_date, customer_name,
            campers (name, slug)
        `)
        .in('status', ['confirmed', 'active'])
        .gte('start_date', todayStr)
        .lte('start_date', nextWeekStr)
        .order('start_date', { ascending: true })
        .limit(3)

    const { data: upcomingCheckouts } = await supabase
        .from('bookings')
        .select(`
            id, start_date, end_date, customer_name,
            campers (name, slug)
        `)
        .in('status', ['confirmed', 'active'])
        .gte('end_date', todayStr)
        .lte('end_date', nextWeekStr)
        .order('end_date', { ascending: true })
        .limit(3)

    // 4. Últimas 8 reservas con relación de usuario y estado de verificación
    const { data: recentBookings } = await supabase
        .from('bookings')
        .select(`
            id, start_date, end_date, total_price, status, created_at, customer_name, customer_email,
            campers (name, slug),
            users (id, full_name, email, verification_status)
        `)
        .order('created_at', { ascending: false })
        .limit(8)

    // Función auxiliar para iniciales de viajero
    const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/)
        if (parts.length >= 2 && parts[0] && parts[1]) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        }
        return name.slice(0, 2).toUpperCase() || 'VI'
    }

    return (
        <div className="admin-cockpit-root">
            {/* 1. Executive Cockpit Header */}
            <header className="cockpit-header">
                <div className="cockpit-header__left">
                    <div className="cockpit-eyebrow">
                        <span className="cockpit-eyebrow__pulse"></span>
                        <span className="cockpit-eyebrow__text">UTOPIA EXECUTIVE BACKOFFICE · MALLORCA FLEET</span>
                    </div>
                    <h1 className="cockpit-header__title">Panel de Control</h1>
                    <p className="cockpit-header__subtitle">
                        Métricas financieras, monitorización de flota en tiempo real y flujo de reservas.
                    </p>
                </div>

                <div className="cockpit-header__actions">
                    <div className="cockpit-period-chip">
                        <span className="period-dot"></span>
                        <span>Temporada {now.getFullYear()} · {monthNames[now.getMonth()]}</span>
                    </div>
                    <Link href="/admin/calendar" className="cockpit-header-btn cockpit-header-btn--primary">
                        <Calendar size={15} />
                        <span>Calendario Maestro</span>
                    </Link>
                </div>
            </header>

            {/* 2. Executive Barometer Cards (4 Tarjetas de Alto Rendimiento) */}
            <section className="executive-barometer-grid" aria-label="Métricas Principales">
                {/* Card 1: Facturación Confirmada */}
                <Link
                    href="/admin/bookings?status=confirmed"
                    className="barometer-card barometer-card--finance"
                    title="Ver reservas confirmadas y facturación"
                >
                    <div className="barometer-card__top">
                        <span className="barometer-card__eyebrow">Facturación Confirmada</span>
                        <div className="barometer-card__icon-box barometer-card__icon-box--green">
                            <Euro size={18} />
                        </div>
                    </div>
                    <div className="barometer-card__middle">
                        <div className="barometer-card__value">{formatPrice(totalRevenue)}</div>
                        <div className="barometer-card__context">
                            <span>{confirmedCount} reservas activas</span>
                            {averageTicket > 0 && (
                                <>
                                    <span className="barometer-card__dot">·</span>
                                    <span>Ticket medio {formatPrice(averageTicket)}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="barometer-card__footer">
                        <span className="barometer-card__action-label">Ver historial de cobros</span>
                        <ArrowRight size={13} className="barometer-card__arrow" />
                    </div>
                </Link>

                {/* Card 2: Ocupación de Flota */}
                <Link
                    href="/admin/calendar"
                    className="barometer-card barometer-card--occupancy"
                    title="Abrir calendario de ocupación de flota"
                >
                    <div className="barometer-card__top">
                        <span className="barometer-card__eyebrow">Ocupación de Flota</span>
                        <div className="barometer-card__icon-box barometer-card__icon-box--emerald">
                            <Truck size={18} />
                        </div>
                    </div>
                    <div className="barometer-card__middle">
                        <div className="barometer-card__value-row">
                            <span className="barometer-card__value">{globalOccupancy}%</span>
                            <span className={`barometer-badge ${globalOccupancy >= 60 ? 'barometer-badge--high' : 'barometer-badge--med'}`}>
                                {globalOccupancy >= 60 ? 'Alta Demanda' : 'Ocupación Estable'}
                            </span>
                        </div>
                        <div className="barometer-card__context">
                            <span>{totalBookedDays} días reservados este mes</span>
                            <span className="barometer-card__dot">·</span>
                            <span>{totalAvailableDays} días libres</span>
                        </div>
                    </div>
                    <div className="barometer-card__footer">
                        <span className="barometer-card__action-label">Ver calendario de salidas</span>
                        <ArrowRight size={13} className="barometer-card__arrow" />
                    </div>
                </Link>

                {/* Card 3: Pendientes de Pago */}
                <Link
                    href="/admin/bookings?status=pending"
                    className="barometer-card barometer-card--pending"
                    title="Ver reservas pendientes de cobro"
                >
                    <div className="barometer-card__top">
                        <span className="barometer-card__eyebrow">Cobros Pendientes</span>
                        <div className="barometer-card__icon-box barometer-card__icon-box--amber">
                            <Clock size={18} />
                        </div>
                    </div>
                    <div className="barometer-card__middle">
                        <div className="barometer-card__value-row">
                            <span className="barometer-card__value">
                                {pendingRevenue > 0 ? formatPrice(pendingRevenue) : `${pendingCount || 0} reservas`}
                            </span>
                            {(pendingCount || 0) > 0 && (
                                <span className="barometer-badge barometer-badge--warning">
                                    {pendingCount} por cobrar
                                </span>
                            )}
                        </div>
                        <div className="barometer-card__context">
                            {(pendingCount || 0) > 0
                                ? 'Requiere confirmación de pago para bloquear fechas'
                                : 'Todos los pagos y reservas confirmados al día'}
                        </div>
                    </div>
                    <div className="barometer-card__footer">
                        <span className="barometer-card__action-label">
                            {(pendingCount || 0) > 0 ? 'Gestionar cobros pendientes' : 'Sin cobros pendientes'}
                        </span>
                        <ArrowRight size={13} className="barometer-card__arrow" />
                    </div>
                </Link>

                {/* Card 4: Seguridad y Documentación */}
                <Link
                    href="/admin/verifications"
                    className="barometer-card barometer-card--security"
                    title="Ver documentación y permisos pendientes de validar"
                >
                    <div className="barometer-card__top">
                        <span className="barometer-card__eyebrow">Documentación Viajeros</span>
                        <div className="barometer-card__icon-box barometer-card__icon-box--blue">
                            <ShieldCheck size={18} />
                        </div>
                    </div>
                    <div className="barometer-card__middle">
                        <div className="barometer-card__value-row">
                            <span className="barometer-card__value">
                                {pendingVerificationsCount || 0} {pendingVerificationsCount === 1 ? 'carnet' : 'carnets'}
                            </span>
                            {(pendingVerificationsCount || 0) > 0 ? (
                                <span className="barometer-badge barometer-badge--info">
                                    Por Revisar
                                </span>
                            ) : (
                                <span className="barometer-badge barometer-badge--success">
                                    100% Validado
                                </span>
                            )}
                        </div>
                        <div className="barometer-card__context">
                            {(pendingVerificationsCount || 0) > 0
                                ? 'Permisos de conducir y DNIs pendientes de validación'
                                : 'Todos los conductores con documentación al día'}
                        </div>
                    </div>
                    <div className="barometer-card__footer">
                        <span className="barometer-card__action-label">
                            {(pendingVerificationsCount || 0) > 0 ? 'Revisar carnets y DNIs' : 'Ver directorio verificado'}
                        </span>
                        <ArrowRight size={13} className="barometer-card__arrow" />
                    </div>
                </Link>
            </section>

            {/* 3. Analytics & Fleet Cockpit (Gráfico Semestral + Monitor de Flota Neo & Space) */}
            <DashboardCharts
                monthlyData={monthlyMetrics}
                fleetOccupancy={fleetOccupancy}
                currentMonthName={currentMonthName}
                averageTicket={averageTicket}
                globalOccupancy={globalOccupancy}
                totalBookedDays={totalBookedDays}
                totalAvailableDays={totalAvailableDays}
            />

            {/* 4. Operational Horizon Strip (Próximos Movimientos & Alertas de Salida) */}
            <section className="horizon-strip" aria-label="Avisos Operativos Inmediatos">
                <div className="horizon-strip__header">
                    <div className="horizon-strip__title-row">
                        <Navigation size={15} className="horizon-strip__icon" />
                        <h3 className="horizon-strip__title">Pulso Operativo Inmediato</h3>
                    </div>
                    <Link href="/admin/calendar" className="horizon-strip__link">
                        <span>Ver calendario completo</span>
                        <ArrowRight size={13} />
                    </Link>
                </div>

                <div className="horizon-grid">
                    {/* Item 1: Próxima Salida / Check-in */}
                    <Link href="/admin/calendar" className="horizon-card horizon-card--checkin">
                        <div className="horizon-card__icon horizon-card__icon--green">
                            <Navigation size={16} />
                        </div>
                        <div className="horizon-card__info">
                            <div className="horizon-card__tag">Próxima Salida (Check-in)</div>
                            <div className="horizon-card__title">
                                {upcomingCheckins && upcomingCheckins.length > 0 ? (
                                    <>
                                        <strong>{upcomingCheckins[0].customer_name}</strong> · {upcomingCheckins[0].campers?.name}
                                    </>
                                ) : (
                                    'Sin salidas programadas hoy'
                                )}
                            </div>
                            <div className="horizon-card__meta">
                                {upcomingCheckins && upcomingCheckins.length > 0 ? (
                                    `Salida: ${new Date(upcomingCheckins[0].start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`
                                ) : (
                                    'Consultar calendario maestro'
                                )}
                            </div>
                        </div>
                        <ArrowRight size={14} className="horizon-card__arrow" />
                    </Link>

                    {/* Item 2: Próxima Devolución / Check-out */}
                    <Link href="/admin/calendar" className="horizon-card horizon-card--checkout">
                        <div className="horizon-card__icon horizon-card__icon--blue">
                            <KeyRound size={16} />
                        </div>
                        <div className="horizon-card__info">
                            <div className="horizon-card__tag">Próxima Devolución (Check-out)</div>
                            <div className="horizon-card__title">
                                {upcomingCheckouts && upcomingCheckouts.length > 0 ? (
                                    <>
                                        <strong>{upcomingCheckouts[0].customer_name}</strong> · {upcomingCheckouts[0].campers?.name}
                                    </>
                                ) : (
                                    'Sin devoluciones inmediatas'
                                )}
                            </div>
                            <div className="horizon-card__meta">
                                {upcomingCheckouts && upcomingCheckouts.length > 0 ? (
                                    `Regreso: ${new Date(upcomingCheckouts[0].end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`
                                ) : (
                                    'Revisar turnos de limpieza'
                                )}
                            </div>
                        </div>
                        <ArrowRight size={14} className="horizon-card__arrow" />
                    </Link>

                    {/* Item 3: Alerta de Documentación o Cobro */}
                    {(pendingCount || 0) > 0 ? (
                        <Link href="/admin/bookings?status=pending" className="horizon-card horizon-card--alert">
                            <div className="horizon-card__icon horizon-card__icon--amber">
                                <AlertCircle size={16} />
                            </div>
                            <div className="horizon-card__info">
                                <div className="horizon-card__tag horizon-card__tag--warning">Atención Requerida</div>
                                <div className="horizon-card__title">
                                    <strong>{pendingCount} {pendingCount === 1 ? 'reserva por cobrar' : 'reservas por cobrar'}</strong>
                                </div>
                                <div className="horizon-card__meta">Confirmar justificante bancario o tarjeta</div>
                            </div>
                            <ArrowRight size={14} className="horizon-card__arrow" />
                        </Link>
                    ) : (pendingVerificationsCount || 0) > 0 ? (
                        <Link href="/admin/verifications" className="horizon-card horizon-card--alert">
                            <div className="horizon-card__icon horizon-card__icon--blue">
                                <ShieldAlert size={16} />
                            </div>
                            <div className="horizon-card__info">
                                <div className="horizon-card__tag horizon-card__tag--info">Seguridad Pre-Entrega</div>
                                <div className="horizon-card__title">
                                    <strong>{pendingVerificationsCount} {pendingVerificationsCount === 1 ? 'carnet por validar' : 'carnets por validar'}</strong>
                                </div>
                                <div className="horizon-card__meta">Verificar antes de la entrega del camper</div>
                            </div>
                            <ArrowRight size={14} className="horizon-card__arrow" />
                        </Link>
                    ) : (
                        <div className="horizon-card horizon-card--clean">
                            <div className="horizon-card__icon horizon-card__icon--green">
                                <CheckCircle2 size={16} />
                            </div>
                            <div className="horizon-card__info">
                                <div className="horizon-card__tag horizon-card__tag--success">Operaciones al día</div>
                                <div className="horizon-card__title">Flujo de reservas y cobros sin incidencias</div>
                                <div className="horizon-card__meta">Todas las salidas y pagos validados</div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* 5. Master Bookings Table (Full-Width, Espaciosa y Cómoda) */}
            <section className="master-table-section">
                <div className="master-table-card">
                    <div className="master-table-card__header">
                        <div className="master-table-card__title-group">
                            <h2 className="master-table-card__title">Registro de Reservas Recientes</h2>
                            <p className="master-table-card__subtitle">
                                Consulta expandida de clientes, vehículos, periodos de viaje y estado operativo.
                            </p>
                        </div>

                        <div className="master-table-card__actions">
                            <Link href="/admin/bookings" className="master-table-view-all-link">
                                <span>Ver todas las reservas</span>
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>

                    <div className="table-responsive-wrapper">
                        <table className="master-table">
                            <thead>
                                <tr>
                                    <th className="th-id">Localizador</th>
                                    <th className="th-traveler">Viajero / Cliente</th>
                                    <th className="th-camper">Camper</th>
                                    <th className="th-dates">Periodo de Viaje</th>
                                    <th className="th-total">Total</th>
                                    <th className="th-status">Estado Operativo</th>
                                    <th className="th-action">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentBookings?.map((b: any) => {
                                    const clientName = b.customer_name || b.users?.full_name || 'Viajero Utopia'
                                    const clientEmail = b.customer_email || b.users?.email || '-'
                                    const userVerificationStatus = b.users?.verification_status
                                    const initials = getInitials(clientName)

                                    // Cálculo de noches
                                    const startT = new Date(b.start_date).getTime()
                                    const endT = new Date(b.end_date).getTime()
                                    const nights = !isNaN(startT) && !isNaN(endT)
                                        ? Math.max(1, Math.round((endT - startT) / (1000 * 60 * 60 * 24)))
                                        : 1

                                    return (
                                        <tr key={b.id} className="master-row">
                                            {/* Localizador ID */}
                                            <td className="cell-id">
                                                <Link
                                                    href={`/admin/bookings?search=${b.id}` as any}
                                                    className="localizer-pill"
                                                    title={`Ver detalles de la reserva #${b.id.split('-')[0]}`}
                                                >
                                                    <span className="localizer-hash">#</span>
                                                    <span>{b.id.split('-')[0].toUpperCase()}</span>
                                                </Link>
                                            </td>

                                            {/* Viajero con Avatar de Iniciales */}
                                            <td className="cell-traveler">
                                                <Link
                                                    href={`/admin/users?search=${encodeURIComponent(clientEmail)}` as any}
                                                    className="traveler-box"
                                                    title={`Ver ficha del viajero ${clientName}`}
                                                >
                                                    <div className="traveler-avatar" aria-hidden="true">
                                                        {initials}
                                                    </div>
                                                    <div className="traveler-info">
                                                        <span className="traveler-name">{clientName}</span>
                                                        <span className="traveler-email">{clientEmail}</span>
                                                    </div>
                                                </Link>
                                            </td>

                                            {/* Camper */}
                                            <td className="cell-camper">
                                                <Link
                                                    href="/admin/campers"
                                                    className="camper-pill"
                                                    title="Ver disponibilidad del camper"
                                                >
                                                    <Truck size={13} className="camper-pill__icon" />
                                                    <span className="camper-pill__name">{b.campers?.name || 'Camper'}</span>
                                                </Link>
                                            </td>

                                            {/* Periodo de Viaje */}
                                            <td className="cell-dates">
                                                <div className="dates-block">
                                                    <span className="dates-range-text">
                                                        {new Date(b.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                        <span className="dates-separator">→</span>
                                                        {new Date(b.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                    <span className="nights-chip">
                                                        {nights} {nights === 1 ? 'noche' : 'noches'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Total */}
                                            <td className="cell-total">
                                                <span className="total-figure">{formatPrice(b.total_price)}</span>
                                            </td>

                                            {/* Estado / Acción Rápida */}
                                            <td className="cell-status">
                                                <BookingStatusAction
                                                    bookingId={b.id}
                                                    status={b.status}
                                                    verificationStatus={userVerificationStatus}
                                                    customerName={clientName}
                                                />
                                            </td>

                                            {/* Detalle */}
                                            <td className="cell-action">
                                                <Link
                                                    href={`/admin/bookings?search=${b.id}` as any}
                                                    className="row-open-btn"
                                                    title="Abrir reserva en panel completo"
                                                >
                                                    <span>Gestionar</span>
                                                    <ArrowRight size={13} />
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}

                                {(!recentBookings || recentBookings.length === 0) && (
                                    <tr>
                                        <td colSpan={7} className="master-table-empty">
                                            No hay reservas registradas en el sistema.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    )
}
