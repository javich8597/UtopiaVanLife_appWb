'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Eye, Archive, Loader2, X, BookOpen, CheckCircle2, Navigation, Clock, Calendar, BadgeCheck, KeyRound } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { formatPrice } from '@/lib/pricing/engine'
import { ADMIN_STATUS_LABELS, AdminBookingStatus, getAdminBookingStatus } from '@/lib/admin/bookingStatus'
import AdminPageHeader from '../AdminPageHeader'
import RefundActionClient from './RefundActionClient'
import ApproveActionClient from './ApproveActionClient'
import BookingDetailModal from './BookingDetailModal'

interface Props {
  initialBookings: any[]
}

type Filter = 'all' | AdminBookingStatus

const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'review', label: 'Por confirmar' },
  { id: 'confirmed', label: 'Confirmadas' },
  { id: 'active', label: 'En viaje' },
  { id: 'pending', label: 'Pendientes de pago' },
  { id: 'expired', label: 'Caducadas' },
  { id: 'completed', label: 'Completadas' },
  { id: 'cancelled', label: 'Canceladas' },
]

const STAT_TILES: { id: AdminBookingStatus; label: string; tone: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'review', label: 'Pagadas por confirmar', tone: 'sky', icon: BadgeCheck },
  { id: 'confirmed', label: 'Confirmadas', tone: 'sage', icon: CheckCircle2 },
  { id: 'active', label: 'En viaje', tone: 'gold', icon: Navigation },
  { id: 'pending', label: 'Pendientes de pago', tone: 'amber', icon: Clock },
]

const STATUS_TONE: Record<AdminBookingStatus, string> = {
  review: 'sky',
  pending: 'amber',
  expired: 'neutral',
  confirmed: 'sage',
  active: 'gold',
  completed: 'neutral',
  cancelled: 'rose',
}

// Las fechas llegan como 'YYYY-MM-DD' (medianoche UTC)
const formatDay = (value: string) =>
  new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export default function BookingsClient({ initialBookings }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<Filter>('all')
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [archiving, setArchiving] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)

  // Estado "de negocio": las pendientes abandonadas pasan a 'expired'
  const bookings = useMemo(() => {
    const now = new Date()
    return initialBookings.map(b => ({ ...b, adminStatus: getAdminBookingStatus(b, now) }))
  }, [initialBookings])

  // Sincroniza con los parámetros de la URL (?search=...&status=...)
  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('id')
    const s = searchParams.get('status')

    if (q) {
      setSearchTerm(q)
      const found = bookings.find(b =>
        b.id.toLowerCase() === q.toLowerCase() ||
        b.id.toLowerCase().startsWith(q.toLowerCase())
      )
      if (found && (searchParams.get('open') === 'true' || searchParams.get('id'))) {
        setSelectedBooking(found)
      }
    }

    if (s && TABS.some(t => t.id === s)) {
      setStatusFilter(s as Filter)
    }
  }, [searchParams, bookings])

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter !== 'all' && b.adminStatus !== statusFilter) return false

      if (!searchTerm.trim()) return true
      const query = searchTerm.toLowerCase().trim()

      return [
        b.customer_name || b.users?.full_name,
        b.customer_email || b.users?.email,
        b.customer_phone || b.users?.phone,
        b.customer_dni || b.users?.dni_nie,
        b.campers?.name,
        b.id,
        b.payment_intent_id,
        b.customer_city,
      ].some(v => (v || '').toLowerCase().includes(query))
    })
  }, [bookings, searchTerm, statusFilter])

  const expiredVisible = filteredBookings.filter(b => b.adminStatus === 'expired')
  const selectedExpired = expiredVisible.filter(b => selectedIds.has(b.id))
  const allExpiredSelected = expiredVisible.length > 0 && selectedExpired.length === expiredVisible.length

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllExpired = () => {
    setSelectedIds(allExpiredSelected ? new Set() : new Set(expiredVisible.map(b => b.id)))
  }

  const archiveSelected = async () => {
    if (selectedExpired.length === 0) return
    if (!window.confirm(`Se archivarán ${selectedExpired.length} reservas caducadas como canceladas. Ninguna tiene pago. ¿Continuar?`)) return

    setArchiving(true)
    setBulkMessage(null)
    try {
      const res = await fetch('/api/admin/bookings/expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedExpired.map(b => b.id) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudieron archivar')
      setSelectedIds(new Set())
      setBulkMessage(`${data.archived} reservas archivadas.`)
      router.refresh()
    } catch (err: any) {
      setBulkMessage(err.message)
    } finally {
      setArchiving(false)
    }
  }

  const showSelection = statusFilter === 'expired' || (statusFilter === 'all' && expiredVisible.length > 0)

  return (
    <div className="adm-page">
      <AdminPageHeader
        title="Reservas"
        description="Busca, filtra y gestiona cada reserva."
        actions={
          <Link href="/admin/calendar" className="adm-btn">
            <Calendar size={16} /> Ver calendario
          </Link>
        }
      />

      {/* Resumen por estado: cada tile filtra la lista */}
      <section className="adm-stats" aria-label="Resumen de reservas">
        {STAT_TILES.map(t => {
          const Icon = t.icon
          const list = bookings.filter(b => b.adminStatus === t.id)
          const amount = list.reduce((s, b) => s + (Number(b.total_price) || 0), 0)
          return (
            <button
              key={t.id}
              type="button"
              className={`adm-stat ${statusFilter === t.id ? 'adm-stat--on' : ''}`}
              onClick={() => { setStatusFilter(statusFilter === t.id ? 'all' : t.id); setSelectedIds(new Set()) }}
              aria-pressed={statusFilter === t.id}
            >
              <span className={`adm-icon-dot adm-icon-dot--${list.length ? t.tone : 'neutral'}`}><Icon size={19} /></span>
              <span className="adm-stat__value">{list.length}</span>
              <span className="adm-stat__label">{t.label}</span>
              <span className="adm-stat__hint">{list.length ? formatPrice(amount) : 'Ninguna'}</span>
            </button>
          )
        })}
      </section>

      <section className="adm-card bk-card" aria-labelledby="bk-list-title">
        <div className="bk-card__head">
          <h2 id="bk-list-title" className="adm-card-title">
            <span className="adm-icon-square"><BookOpen size={22} /></span>
            {TABS.find(t => t.id === statusFilter)?.label || 'Todas'}
            <span className="bk-card__count">{filteredBookings.length}</span>
          </h2>
        <div className="adm-search">
          <Search size={16} className="adm-search__icon" aria-hidden="true" />
          <input
            id="admin-bookings-search"
            name="admin_bookings_search"
            aria-label="Buscar por cliente, email, camper o ID"
            type="search"
            placeholder="Cliente, email, camper o ID"
            className="adm-search__input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button type="button" className="adm-search__clear" onClick={() => setSearchTerm('')} aria-label="Borrar búsqueda">
              <X size={14} />
            </button>
          )}
        </div>
        </div>

      <div className="bk-card__tabs">
      <div className="adm-tabs" role="tablist" aria-label="Filtrar por estado">
        {TABS.map(tab => {
          const count = tab.id === 'all' ? bookings.length : bookings.filter(b => b.adminStatus === tab.id).length
          const isActive = statusFilter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => { setStatusFilter(tab.id); setSelectedIds(new Set()) }}
              className={`adm-tab ${isActive ? 'adm-tab--on' : ''}`}
            >
              <span>{tab.label}</span>
              <span className="adm-tab__count">{count}</span>
            </button>
          )
        })}
      </div>
      </div>

      {statusFilter === 'expired' && expiredVisible.length > 0 && (
        <div className="adm-note bk-card__note">
          Son reservas que se quedaron a medio pagar en Redsys. No bloquean fechas ni cuentan como cobros pendientes. Puedes archivarlas para limpiar la lista.
        </div>
      )}

      {(selectedExpired.length > 0 || bulkMessage) && (
        <div className="adm-bulkbar bk-card__note" role="status">
          <span>{selectedExpired.length > 0 ? `${selectedExpired.length} caducadas seleccionadas` : bulkMessage}</span>
          {selectedExpired.length > 0 && (
            <div className="adm-bulkbar__actions">
              <button type="button" className="adm-btn adm-btn--sm" onClick={() => setSelectedIds(new Set())}>Quitar selección</button>
              <button type="button" className="adm-btn adm-btn--sm adm-btn--primary" onClick={archiveSelected} disabled={archiving}>
                {archiving ? <Loader2 size={14} className="bk-spin" /> : <Archive size={14} />}
                Archivar
              </button>
            </div>
          )}
        </div>
      )}

        <div className="adm-table-wrap">
          <table className="adm-table adm-table--cards">
            <thead>
              <tr>
                {showSelection && (
                  <th className="adm-table__check">
                    <input
                      type="checkbox"
                      className="adm-check"
                      checked={allExpiredSelected}
                      onChange={toggleAllExpired}
                      aria-label="Seleccionar todas las caducadas"
                      disabled={expiredVisible.length === 0}
                    />
                  </th>
                )}
                <th>Cliente</th>
                <th>Camper</th>
                <th>Fechas</th>
                <th className="adm-table__num">Total</th>
                <th>Estado</th>
                <th className="adm-table__actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b: any) => {
                const clientName = b.customer_name || b.users?.full_name || 'Cliente'
                const clientEmail = b.customer_email || b.users?.email || ''
                const diffMs = Math.abs(new Date(b.end_date).getTime() - new Date(b.start_date).getTime())
                const nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))
                const status = b.adminStatus as AdminBookingStatus

                return (
                  <tr key={b.id}>
                    {showSelection && (
                      <td className="adm-table__check">
                        {status === 'expired' && (
                          <input
                            type="checkbox"
                            className="adm-check"
                            checked={selectedIds.has(b.id)}
                            onChange={() => toggleOne(b.id)}
                            aria-label={`Seleccionar reserva de ${clientName}`}
                          />
                        )}
                      </td>
                    )}
                    <td data-label="Cliente">
                      <span className="bk-client">
                        <span className="bk-avatar" aria-hidden="true">
                          {clientName.trim().split(/\s+/).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()}
                        </span>
                        <span className="bk-client__text">
                          <span className="adm-table__strong">{clientName}</span>
                          <span className="adm-table__muted">
                            {clientEmail}
                            {clientEmail && ' · '}#{b.id.split('-')[0].toUpperCase()}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td data-label="Camper" className="adm-table__strong">{b.campers?.name || 'Camper'}</td>
                    <td data-label="Fechas">
                      <span className="bk-dates">{formatDay(b.start_date)} – {formatDay(b.end_date)}</span>
                      <span className="adm-table__muted">
                        {nights} {nights === 1 ? 'noche' : 'noches'}
                        {b.km_package === 'unlimited' && ' · km ilimitados'}
                      </span>
                    </td>
                    <td data-label="Total" className="adm-table__num">
                      <span
                        className="adm-table__strong"
                        title={b.deposit_amount ? `Fianza aparte: ${formatPrice(b.deposit_amount)}` : undefined}
                      >
                        {formatPrice(b.total_price)}
                      </span>
                      {b.payment_status === 'paid' && <span className="adm-table__muted">Pagado con Redsys</span>}
                    </td>
                    <td data-label="Estado">
                      <span className={`adm-chip adm-chip--${STATUS_TONE[status]}`}>{ADMIN_STATUS_LABELS[status]}</span>
                    </td>
                    <td className="adm-table__actions">
                      <div className="bk-actions">
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(b)}
                          className="adm-btn adm-btn--sm"
                          title="Ver desglose completo de la reserva y contrato"
                        >
                          <Eye size={14} /> Ver
                        </button>
                        {(status === 'review' || status === 'pending') && <ApproveActionClient bookingId={b.id} status={b.status} />}
                        {status === 'confirmed' && (
                          <Link href={`/admin/entregas/${b.id}` as any} className="adm-btn adm-btn--sm adm-btn--primary">
                            <KeyRound size={14} /> Entrega
                          </Link>
                        )}
                        {status === 'active' && (
                          <Link href={`/admin/entregas/${b.id}?tipo=devolucion` as any} className="adm-btn adm-btn--sm adm-btn--primary">
                            <KeyRound size={14} /> Devolución
                          </Link>
                        )}
                        <RefundActionClient bookingId={b.id} status={b.status} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={showSelection ? 7 : 6} className="adm-empty">
                    {searchTerm ? 'Ninguna reserva coincide con la búsqueda.' : 'No hay reservas en esta categoría.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}

      <style jsx>{`
        .bk-card {
          overflow: hidden;
        }
        .bk-card__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          padding: 26px 30px 18px;
        }
        .bk-card__count {
          min-width: 30px;
          height: 26px;
          padding: 0 9px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--adm-surface-2);
          color: var(--adm-text-2);
          font-family: var(--font-sans);
          font-size: 0.8rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .bk-card__tabs {
          padding: 0 30px 18px;
          border-bottom: 1px solid var(--adm-border);
        }
        .bk-card :global(.bk-card__note) {
          margin: 16px 30px 0;
        }
        .bk-client {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .bk-client__text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .bk-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--adm-surface-2);
          color: var(--adm-text-2);
          font-weight: 700;
          font-size: 0.78rem;
        }
        .bk-dates {
          white-space: nowrap;
        }
        @media (max-width: 640px) {
          .bk-card__head {
            padding: 20px 16px 14px;
          }
          .bk-card__tabs {
            padding: 0 16px 14px;
          }
          .bk-card :global(.bk-card__note) {
            margin: 12px 16px 0;
          }
        }
        .bk-actions {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        :global(.bk-spin) {
          animation: bk-spin 1s linear infinite;
        }
        @keyframes bk-spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 860px) {
          .bk-actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  )
}
