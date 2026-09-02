import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/pricing/engine'
import { Calendar, Euro, Tent, Users } from 'lucide-react'
import { Link } from '@/i18n/routing'

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    // KPIs queries
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

    const { data: revenueData } = await supabase
        .from('bookings')
        .select('total_price')
        .in('status', ['confirmed', 'active', 'completed'])

    const totalRevenue = revenueData?.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0) || 0

    // Ultimas 5 reservas
    const { data: recentBookings } = await supabase
        .from('bookings')
        .select(`
      id, start_date, end_date, total_price, status, created_at, customer_name, customer_email,
      campers (name),
      users (full_name, email)
    `)
        .order('created_at', { ascending: false })
        .limit(5)

    const kpis = [
        { label: 'Facturación Confirmada', value: formatPrice(totalRevenue), icon: Euro, color: 'var(--forest-green)' },
        { label: 'Reservas Activas', value: activeCount || 0, icon: Calendar, color: 'var(--success)' },
        { label: 'Pendientes de Pago', value: pendingCount || 0, icon: Euro, color: 'var(--sand-dark)' },
        { label: 'Clientes Registrados', value: usersCount || 0, icon: Users, color: 'var(--gray-600)' },
    ]

    return (
        <div>
            <h1 className="text-h2" style={{ marginBottom: 'var(--space-2)' }}>Dashboard</h1>
            <p className="text-body" style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-8)' }}>
                Hola Administrador. Este es el estado actual del negocio y flota de Utopia Van Life.
            </p>

            {/* KPI Grid */}
            <div className="kpi-grid">
                {kpis.map((kpi, i) => (
                    <div key={i} className="kpi-card">
                        <div className="kpi-card__header">
                            <span className="text-small" style={{ color: 'var(--gray-600)', fontWeight: 500 }}>{kpi.label}</span>
                            <div className="kpi-card__icon" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                                <kpi.icon size={18} />
                            </div>
                        </div>
                        <div className="text-h2" style={{ marginTop: 'var(--space-2)', fontSize: typeof kpi.value === 'string' && kpi.value.length > 6 ? '1.5rem' : undefined }}>{kpi.value}</div>
                    </div>
                ))}
            </div>

            {/* Recent Bookings */}
            <div style={{ marginTop: 'var(--space-12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <h2 className="text-h3">Últimas Reservas</h2>
                    <Link href="/admin/bookings" className="text-small" style={{ color: 'var(--forest-green)', fontWeight: 500 }}>Ver todas →</Link>
                </div>

                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Cliente</th>
                                <th>Camper</th>
                                <th>Fechas</th>
                                <th>Total</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentBookings?.map((b: any) => {
                                const clientName = b.customer_name || b.users?.full_name || 'Viajero Utopia'
                                const clientEmail = b.customer_email || b.users?.email || '-'
                                const statusLabel = b.status === 'confirmed' ? 'Confirmada' :
                                    b.status === 'active' ? 'En Curso' :
                                    b.status === 'pending' ? 'Pendiente' :
                                    b.status === 'completed' ? 'Completada' : 'Cancelada'

                                return (
                                    <tr key={b.id}>
                                        <td className="text-xs" style={{ fontFamily: 'monospace', color: 'var(--gray-500)' }}>
                                            {b.id.split('-')[0]}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{clientName}</div>
                                            <div className="text-xs" style={{ color: 'var(--gray-500)' }}>{clientEmail}</div>
                                        </td>
                                        <td>{b.campers?.name}</td>
                                        <td className="text-small">
                                            {new Date(b.start_date).toLocaleDateString('es-ES')} → {new Date(b.end_date).toLocaleDateString('es-ES')}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{formatPrice(b.total_price)}</td>
                                        <td>
                                            <span className={`status-badge status-${b.status}`}>
                                                {statusLabel}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {(!recentBookings || recentBookings.length === 0) && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--gray-500)' }}>
                                        No hay reservas registradas todavía.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            
        </div>
    )
}
