'use client'

import { useMemo, useState } from 'react'
import { normalizeVerificationStatus } from '@/lib/admin/auth'

interface Props {
  users: any[]
}

type Filter = 'all' | 'verified' | 'rejected'

/** Historial de documentación revisada: quién se validó o rechazó y por qué */
export default function VerificationHistory({ users }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const rows = useMemo(
    () => users.map(u => ({ ...u, normalized: normalizeVerificationStatus(u.verification_status) })),
    [users]
  )
  const visible = rows.filter(u => filter === 'all' || u.normalized === filter)
  const count = (f: Filter) => (f === 'all' ? rows.length : rows.filter(u => u.normalized === f).length)

  return (
    <section className="adm-card" aria-labelledby="verif-history-title">
      <div className="vh-head">
        <h2 id="verif-history-title" className="vh-title">Historial</h2>
        <div className="adm-tabs" role="tablist" aria-label="Filtrar historial">
          {([
            ['all', 'Todo'],
            ['verified', 'Validados'],
            ['rejected', 'Rechazados'],
          ] as [Filter, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={`adm-tab ${filter === id ? 'adm-tab--on' : ''}`}
              onClick={() => setFilter(id)}
            >
              {label}
              <span className="adm-tab__count">{count(id)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table adm-table--cards">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Documento</th>
              <th>Resultado</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(u => (
              <tr key={u.id}>
                <td data-label="Cliente">
                  <span className="adm-table__strong">{u.full_name || 'Sin nombre'}</span>
                  <span className="adm-table__muted">{u.email}</span>
                </td>
                <td data-label="Documento">
                  {u.dni_nie || '—'}
                  {u.driver_license_expiry_date && (
                    <span className="adm-table__muted">
                      Carnet hasta {new Date(u.driver_license_expiry_date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </td>
                <td data-label="Resultado">
                  <span className={`adm-chip ${u.normalized === 'verified' ? 'adm-chip--sage' : 'adm-chip--rose'}`}>
                    {u.normalized === 'verified' ? 'Validado' : 'Rechazado'}
                  </span>
                </td>
                <td data-label="Motivo" className="vh-reason">{u.normalized === 'rejected' ? (u.rejection_reason || 'Sin motivo indicado') : '—'}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="adm-empty">Todavía no hay documentación revisada en esta categoría.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .vh-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 18px 20px 14px;
        }
        .vh-title {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--adm-text);
        }
        .vh-reason {
          max-width: 320px;
          color: var(--adm-text-2);
        }
        @media (max-width: 640px) {
          .vh-head {
            padding: 16px;
          }
        }
      `}</style>
    </section>
  )
}
