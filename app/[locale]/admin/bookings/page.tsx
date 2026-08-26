import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/pricing/engine'
import { Search, Filter, MoreVertical } from 'lucide-react'
import RefundActionClient from './RefundActionClient'

export default async function AdminBookingsPage() {
    const supabase = await createClient()

    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
      *,
      campers (name, slug),
      users (full_name, email, phone)
    `)
        .order('created_at', { ascending: false })

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-8)' }}>
                <div>
                    <h1 className="text-h2" style={{ marginBottom: 'var(--space-2)' }}>Reservas</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)' }}>Gestiona y revisa todas las reservas del sistema.</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <div className="search-bar">
                        <Search size={16} style={{ color: 'var(--gray-400)' }} />
                        <input type="text" placeholder="Buscar por email o ID..." className="search-input" />
                    </div>
                    <button className="btn btn-outline btn-icon" title="Filtrar">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Camper</th>
                            <th>Cliente</th>
                            <th>Fechas</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings?.map((b: any) => (
                            <tr key={b.id}>
                                <td className="text-xs" style={{ fontFamily: 'monospace', color: 'var(--gray-500)' }}>
                                    {b.id.split('-')[0]}
                                    <div style={{ marginTop: '2px', fontSize: '0.65rem' }}>
                                        {new Date(b.created_at).toLocaleDateString()}
                                    </div>
                                </td>
                                <td style={{ fontWeight: 500 }}>{b.campers?.name}</td>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{b.users?.full_name || 'Cliente'}</div>
                                    <div className="text-xs" style={{ color: 'var(--gray-500)' }}>{b.users?.email}</div>
                                    <div className="text-xs" style={{ color: 'var(--gray-500)' }}>{b.users?.phone || '-'}</div>
                                </td>
                                <td className="text-small">
                                    {new Date(b.start_date).toLocaleDateString('es-ES')} <br />
                                    <span style={{ color: 'var(--gray-400)' }}>→</span> {new Date(b.end_date).toLocaleDateString('es-ES')}
                                </td>
                                <td style={{ fontWeight: 500 }}>
                                    {formatPrice(b.total_price)}
                                    <div className="text-xs" style={{ color: 'var(--gray-500)', fontWeight: 400 }}>+ {formatPrice(b.deposit_amount)} fianza</div>
                                </td>
                                <td>
                                    <span className={`status-badge status-${b.status}`}>
                                        {b.status === 'pending' ? 'Pendiente' :
                                            b.status === 'confirmed' ? 'Confirmada' :
                                                b.status === 'active' ? 'En Curso' :
                                                    b.status === 'completed' ? 'Completada' : 'Cancelada'}
                                    </span>
                                </td>
                                <td>
                                    <RefundActionClient bookingId={b.id} status={b.status} />
                                </td>
                            </tr>
                        ))}
                        {(!bookings || bookings.length === 0) && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--gray-500)' }}>
                                    Aún no hay reservas registradas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            
        </div>
    )
}
