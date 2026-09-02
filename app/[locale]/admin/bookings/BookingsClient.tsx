'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, Calendar, User, Phone, Mail, Truck, Euro, ShieldCheck } from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'
import RefundActionClient from './RefundActionClient'
import ApproveActionClient from './ApproveActionClient'

interface Props {
  initialBookings: any[]
}

export default function BookingsClient({ initialBookings }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'active' | 'pending' | 'completed' | 'cancelled'>('all')

  const filteredBookings = useMemo(() => {
    return initialBookings.filter(b => {
      // Status filter
      if (statusFilter !== 'all' && b.status !== statusFilter) return false

      // Search filter
      if (!searchTerm.trim()) return true
      const query = searchTerm.toLowerCase().trim()

      const clientName = (b.customer_name || b.users?.full_name || '').toLowerCase()
      const clientEmail = (b.customer_email || b.users?.email || '').toLowerCase()
      const clientPhone = (b.customer_phone || b.users?.phone || '').toLowerCase()
      const camperName = (b.campers?.name || '').toLowerCase()
      const bookingId = (b.id || '').toLowerCase()

      return (
        clientName.includes(query) ||
        clientEmail.includes(query) ||
        clientPhone.includes(query) ||
        camperName.includes(query) ||
        bookingId.includes(query)
      )
    })
  }, [initialBookings, searchTerm, statusFilter])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="text-h2" style={{ marginBottom: 'var(--space-2)' }}>Reservas</h1>
          <p className="text-body" style={{ color: 'var(--gray-600)' }}>
            Gestiona, busca y revisa todas las reservas del sistema en tiempo real.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ background: 'white', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', padding: '6px 12px', gap: 8, minWidth: 260 }}>
            <Search size={16} style={{ color: 'var(--gray-400)' }} />
            <input
              type="text"
              placeholder="Buscar por cliente, email, camper o ID..."
              className="search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.875rem' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'all', label: 'Todas' },
          { id: 'confirmed', label: 'Confirmadas' },
          { id: 'active', label: 'En Curso' },
          { id: 'pending', label: 'Pendientes' },
          { id: 'completed', label: 'Completadas' },
          { id: 'cancelled', label: 'Canceladas' },
        ].map(tab => {
          const count = tab.id === 'all'
            ? initialBookings.length
            : initialBookings.filter(b => b.status === tab.id).length
          const isActive = statusFilter === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className="btn btn-sm"
              style={{
                borderRadius: '9999px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 500,
                backgroundColor: isActive ? 'var(--forest-green)' : 'white',
                color: isActive ? 'white' : 'var(--gray-700)',
                border: isActive ? '1px solid var(--forest-green)' : '1px solid var(--gray-200)',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '9999px',
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--gray-100)',
                color: isActive ? 'white' : 'var(--gray-600)'
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
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
            {filteredBookings.map((b: any) => {
              const clientName = b.customer_name || b.users?.full_name || 'Viajero Utopia'
              const clientEmail = b.customer_email || b.users?.email || '-'
              const clientPhone = b.customer_phone || b.users?.phone || ''

              return (
                <tr key={b.id}>
                  <td className="text-xs" style={{ fontFamily: 'monospace', color: 'var(--gray-500)' }}>
                    {b.id.split('-')[0]}
                    <div style={{ marginTop: '2px', fontSize: '0.65rem' }}>
                      {new Date(b.created_at).toLocaleDateString('es-ES')}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{b.campers?.name || 'Camper'}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{clientName}</div>
                    <div className="text-xs" style={{ color: 'var(--gray-500)' }}>{clientEmail}</div>
                    {clientPhone && <div className="text-xs" style={{ color: 'var(--gray-400)' }}>{clientPhone}</div>}
                  </td>
                  <td className="text-small">
                    {new Date(b.start_date).toLocaleDateString('es-ES')} <br />
                    <span style={{ color: 'var(--gray-400)' }}>→</span> {new Date(b.end_date).toLocaleDateString('es-ES')}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {formatPrice(b.total_price)}
                    {b.deposit_amount ? (
                      <div className="text-xs" style={{ color: 'var(--gray-500)', fontWeight: 400 }}>
                        + {formatPrice(b.deposit_amount)} fianza
                      </div>
                    ) : null}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ApproveActionClient bookingId={b.id} status={b.status} />
                      <RefundActionClient bookingId={b.id} status={b.status} />
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredBookings.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--gray-500)' }}>
                  {searchTerm ? 'No se encontraron reservas con ese criterio de búsqueda.' : 'No hay reservas registradas en esta categoría.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
