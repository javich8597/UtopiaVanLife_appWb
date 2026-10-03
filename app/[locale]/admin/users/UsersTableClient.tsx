'use client'

import { useMemo, useState } from 'react'
import { Eye, Search, X, UserMinus } from 'lucide-react'
import { normalizeVerificationStatus } from '@/lib/admin/auth'
import { formatPrice } from '@/lib/pricing/engine'
import CustomerDetailModal from './CustomerDetailModal'

export interface CustomerStats {
  trips: number
  spent: number
  lastTrip: string | null
}

interface Props {
  initialUsers: any[]
  stats?: Record<string, CustomerStats>
}

type Segment = 'customers' | 'team' | 'internal'

// Cuentas técnicas creadas por scripts o comprobaciones, no son clientes reales
const isInternalAccount = (u: any) => /\.internal$/i.test(u.email || '')

const segmentOf = (u: any): Segment =>
  isInternalAccount(u) ? 'internal' : u.role === 'admin' ? 'team' : 'customers'

const VERIFICATION_CHIP: Record<string, { label: string; tone: string }> = {
  verified: { label: 'Validado', tone: 'sage' },
  pending: { label: 'Por revisar', tone: 'amber' },
  rejected: { label: 'Rechazado', tone: 'rose' },
  not_submitted: { label: 'Sin carnet', tone: 'neutral' },
}

export default function UsersTableClient({ initialUsers, stats = {} }: Props) {
  const [users, setUsers] = useState<any[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<Segment>('customers')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)

  const removeAdmin = async (u: any) => {
    if (!window.confirm(`¿Quitar el acceso de administrador a ${u.email}? Pasará a ser una cuenta de cliente.`)) return
    setRoleError(null)
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, role: 'customer' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo cambiar el rol')
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, role: 'customer' } : x)))
    } catch (err: any) {
      setRoleError(err.message)
    }
  }

  const handleStatusUpdated = (userId: string, newStatus: string) => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, verification_status: newStatus } : u)))
  }

  const counts = useMemo(() => ({
    customers: users.filter(u => segmentOf(u) === 'customers').length,
    team: users.filter(u => segmentOf(u) === 'team').length,
    internal: users.filter(u => segmentOf(u) === 'internal').length,
  }), [users])

  const filteredUsers = users
    .filter(u => segmentOf(u) === segment)
    .filter(u => {
      const q = search.toLowerCase().trim()
      if (!q) return true
      return [u.full_name, u.email, u.dni_nie, u.phone || u.phone_number].some(v => (v || '').toLowerCase().includes(q))
    })
    // Los mejores clientes primero
    .sort((a, b) => (stats[b.id]?.spent || 0) - (stats[a.id]?.spent || 0))

  return (
    <>
      <div className="adm-toolbar">
        <div className="adm-search">
          <Search size={16} className="adm-search__icon" aria-hidden="true" />
          <input
            id="admin-users-search"
            name="admin_users_search"
            aria-label="Buscar clientes por nombre, email, DNI o teléfono"
            type="search"
            placeholder="Nombre, email, DNI o teléfono"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="adm-search__input"
          />
          {search && (
            <button type="button" className="adm-search__clear" onClick={() => setSearch('')} aria-label="Borrar búsqueda">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="adm-tabs" role="tablist" aria-label="Tipo de cuenta">
          {([
            ['customers', 'Clientes'],
            ['team', 'Equipo'],
            ['internal', 'Cuentas internas'],
          ] as [Segment, string][]).filter(([id]) => id !== 'internal' || counts.internal > 0).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={segment === id}
              className={`adm-tab ${segment === id ? 'adm-tab--on' : ''}`}
              onClick={() => setSegment(id)}
            >
              {label}
              <span className="adm-tab__count">{counts[id]}</span>
            </button>
          ))}
        </div>
      </div>

      {roleError && <div className="adm-note" role="alert">{roleError}</div>}

      <div className="adm-card">
        <div className="adm-table-wrap">
          <table className="adm-table adm-table--cards">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th className="adm-table__num">Viajes</th>
                <th className="adm-table__num">Total gastado</th>
                <th>Último viaje</th>
                <th>Carnet</th>
                <th className="adm-table__actions"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u: any) => {
                const status = normalizeVerificationStatus(u.verification_status)
                const chip = VERIFICATION_CHIP[status]
                const s = stats[u.id]
                return (
                  <tr key={u.id}>
                    <td data-label="Cliente">
                      <span className="adm-table__strong">{u.full_name || 'Sin nombre'}</span>
                      <span className="adm-table__muted">
                        {u.dni_nie || 'Sin DNI'} · desde {new Date(u.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td data-label="Contacto">
                      {u.email}
                      <span className="adm-table__muted">{u.phone || u.phone_number || 'Sin teléfono'}</span>
                    </td>
                    <td data-label="Viajes" className="adm-table__num">
                      {s?.trips || 0}
                      {(s?.trips || 0) >= 2 && <span className="adm-table__muted">Repite</span>}
                    </td>
                    <td data-label="Total gastado" className="adm-table__num adm-table__strong">{formatPrice(s?.spent || 0)}</td>
                    <td data-label="Último viaje">
                      {s?.lastTrip
                        ? new Date(s.lastTrip).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
                        : '—'}
                    </td>
                    <td data-label="Carnet">
                      <span className={`adm-chip adm-chip--${chip.tone}`}>{chip.label}</span>
                    </td>
                    <td className="adm-table__actions">
                      {segment === 'team' && (
                        <button
                          type="button"
                          onClick={() => removeAdmin(u)}
                          className="adm-btn adm-btn--sm adm-btn--danger users-role-btn"
                          title="Quitar el acceso de administrador"
                        >
                          <UserMinus size={14} /> Quitar admin
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className="adm-btn adm-btn--sm"
                        title="Consultar el expediente completo del cliente"
                      >
                        <Eye size={14} /> Ficha
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="adm-empty">
                    {search ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay cuentas en este grupo.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUserId && (
        <CustomerDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </>
  )
}
