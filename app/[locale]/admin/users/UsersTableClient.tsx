'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Search,
  UserCheck
} from 'lucide-react'
import { normalizeVerificationStatus } from '@/lib/admin/auth'
import CustomerDetailModal from './CustomerDetailModal'

interface Props {
  initialUsers: any[]
}

export default function UsersTableClient({ initialUsers }: Props) {
  const [users, setUsers] = useState<any[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const handleStatusUpdated = (userId: string, newStatus: string) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, verification_status: newStatus } : u))
    )
  }

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    const name = (u.full_name || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    const dni = (u.dni_nie || '').toLowerCase()
    const phone = (u.phone || u.phone_number || '').toLowerCase()
    return name.includes(q) || email.includes(q) || dni.includes(q) || phone.includes(q)
  })

  return (
    <div>
      {/* Search Bar & Quick Counters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre, email o DNI..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: 38, width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
          <span>Total: <strong>{users.length}</strong> clientes</span>
          <span>·</span>
          <span style={{ color: 'var(--forest-green)' }}>
            Validados: <strong>{users.filter(u => u.verification_status === 'verified').length}</strong>
          </span>
          <span>·</span>
          <span style={{ color: 'var(--sand-dark)' }}>
            Pendientes: <strong>{users.filter(u => u.verification_status === 'pending' || u.verification_status === 'pending_validation').length}</strong>
          </span>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table" style={{ minWidth: 880 }}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>DNI / NIE</th>
              <th>Rol</th>
              <th>Estado Carnet</th>
              <th>Registro</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u: any) => {
              const status = normalizeVerificationStatus(u.verification_status)
              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.full_name || 'Sin nombre'}</td>
                  <td className="text-small">{u.email}</td>
                  <td className="text-small" style={{ color: 'var(--gray-600)' }}>
                    {u.phone || u.phone_number || '-'}
                  </td>
                  <td className="text-small" style={{ fontFamily: 'monospace' }}>
                    {u.dni_nie || '-'}
                  </td>
                  <td>
                    <span className="badge badge-sand" style={{ textTransform: 'capitalize' }}>
                      {u.role || 'customer'}
                    </span>
                  </td>
                  <td>
                    {status === 'verified' && (
                      <span className="flex-center-gap text-xs" style={{ color: 'var(--success)', fontWeight: 600 }}>
                        <ShieldCheck size={14} /> Validado
                      </span>
                    )}
                    {status === 'pending' && (
                      <span className="flex-center-gap text-xs" style={{ color: 'var(--sand-dark)', fontWeight: 600 }}>
                        <Clock size={14} /> Pendiente
                      </span>
                    )}
                    {status === 'rejected' && (
                      <span className="flex-center-gap text-xs" style={{ color: 'var(--error)', fontWeight: 600 }}>
                        <XCircle size={14} /> Rechazado
                      </span>
                    )}
                    {status === 'not_submitted' && (
                      <span className="flex-center-gap text-xs" style={{ color: 'var(--gray-400)' }}>
                        <AlertCircle size={14} /> Sin carnet
                      </span>
                    )}
                  </td>
                  <td className="text-xs" style={{ color: 'var(--gray-500)' }}>
                    {new Date(u.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedUserId(u.id)}
                      className="btn btn-outline btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 600
                      }}
                      title="Consultar expediente completo del cliente"
                    >
                      <Eye size={14} /> Ver Ficha
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--gray-500)' }}>
                  {search ? 'No se encontraron clientes que coincidan con la búsqueda.' : 'No hay usuarios registrados aún.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      {selectedUserId && (
        <CustomerDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  )
}