'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBodyScrollLock } from '@/lib/ui/useBodyScrollLock'
import {
  Check,
  X,
  Loader2,
  AlertTriangle,
  Eye,
  ExternalLink,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  CreditCard,
  XCircle,
} from 'lucide-react'

export interface UserWithDocs {
  id: string
  full_name?: string
  dni_nie?: string
  email: string
  phone?: string
  phone_number?: string
  address?: string
  driver_license_id?: string
  driver_license_issue_date?: string
  driver_license_expiry_date?: string
  verification_status: string
  rejection_reason?: string
  nextDepartureOn?: string | null
  dniFrontUrl?: string | null
  dniBackUrl?: string | null
  licenseFrontUrl?: string | null
  licenseBackUrl?: string | null
  [key: string]: any
}

interface Props {
  initialUsers: UserWithDocs[]
}

const PREDEFINED_REASONS = [
  'Foto borrosa o ilegible',
  'Carnet de conducir caducado',
  'Conductor novel (< 2 años)',
  'Documento incompleto o cortado',
  'Otro',
]

function formatLicenseDate(dateStr?: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function VerificationsClient({ initialUsers }: Props) {
  const router = useRouter()
  const [users, setUsers] = useState<UserWithDocs[]>(initialUsers || [])

  // Lightbox Zoom state
  const [zoomDoc, setZoomDoc] = useState<{ url: string; title: string; userName: string } | null>(null)

  // Rejection Dialog state
  const [rejectingUser, setRejectingUser] = useState<UserWithDocs | null>(null)
  useBodyScrollLock(Boolean(zoomDoc || rejectingUser))
  const [selectedReason, setSelectedReason] = useState<string>(PREDEFINED_REASONS[0])
  const [customReason, setCustomReason] = useState<string>('')
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectError, setRejectError] = useState<string>('')

  // Approval state
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null)

  // Handle Approve
  const handleApprove = async (user: UserWithDocs) => {
    if (!confirm(`¿Estás seguro de que deseas VALIDAR la documentación de ${user.full_name || user.email}?`)) {
      return
    }

    setApprovingId(user.id)
    try {
      const res = await fetch('/api/admin/verify-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'approve' }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al aprobar la documentación')

      setUsers(prev => prev.filter(u => u.id !== user.id))
      setActionSuccessMessage(`Documentación de ${user.full_name || user.email} aprobada correctamente.`)
      setTimeout(() => setActionSuccessMessage(null), 3500)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error en la aprobación')
    } finally {
      setApprovingId(null)
    }
  }

  // Open Reject Modal
  const handleOpenReject = (user: UserWithDocs) => {
    setRejectingUser(user)
    setSelectedReason(PREDEFINED_REASONS[0])
    setCustomReason('')
    setRejectError('')
  }

  // Submit Rejection
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingUser) return

    setRejectError('')
    let finalReason = selectedReason

    if (selectedReason === 'Otro') {
      if (!customReason.trim()) {
        setRejectError('Por favor, escribe el motivo específico del rechazo.')
        return
      }
      finalReason = customReason.trim()
    } else if (customReason.trim()) {
      finalReason = `${selectedReason} - ${customReason.trim()}`
    }

    setIsRejecting(true)

    try {
      const res = await fetch('/api/admin/verify-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: rejectingUser.id,
          action: 'reject',
          reason: finalReason,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al rechazar documentación')

      setUsers(prev => prev.filter(u => u.id !== rejectingUser.id))
      setActionSuccessMessage(`Documentación de ${rejectingUser.full_name || rejectingUser.email} rechazada. Motivo: ${finalReason}`)
      setTimeout(() => setActionSuccessMessage(null), 4000)

      setRejectingUser(null)
      router.refresh()
    } catch (err: any) {
      setRejectError(err.message || 'Error al procesar el rechazo')
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <div className="verifications-container">
      {/* Toast Notification */}
      {actionSuccessMessage && (
        <div className="verif-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} className="verif-toast__icon" aria-hidden="true" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* List of Pending Verifications */}
      <div className="verifications-list">
        {users.map(user => {
          const issueDate = user.driver_license_issue_date
          const expiryDate = user.driver_license_expiry_date
          const today = new Date()

          let isExpired = false
          if (expiryDate) {
            const exp = new Date(expiryDate)
            isExpired = !isNaN(exp.getTime()) && exp.getTime() < today.getTime()
          }

          let isNovel = false
          if (issueDate) {
            const iss = new Date(issueDate)
            if (!isNaN(iss.getTime())) {
              const diffYears = (today.getTime() - iss.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
              isNovel = diffYears < 2
            }
          }

          const isApproving = approvingId === user.id
          const initials = (user.full_name || user.email || 'U')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((p: string) => p[0])
            .join('')
            .toUpperCase()

          return (
            <article key={user.id} className="verif-card adm-card">
              {/* Header: User Profile & Badges */}
              <header className="verif-card__head">
                <div className="verif-profile">
                  <div className="verif-avatar" aria-hidden="true">
                    {initials}
                  </div>
                  <div className="verif-profile__info">
                    <div className="verif-title-row">
                      <h3 className="verif-client-name">{user.full_name || 'Sin Nombre'}</h3>
                      {user.nextDepartureOn && (
                        <span className="adm-chip adm-chip--gold">
                          <Clock size={12} aria-hidden="true" />
                          Sale el {new Date(user.nextDepartureOn).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
                        </span>
                      )}
                    </div>

                    <div className="verif-meta-list">
                      <span className="verif-meta-item">
                        <span className="verif-meta-label">DNI/NIE:</span>
                        <strong className="verif-meta-val">{user.dni_nie || 'No indicado'}</strong>
                      </span>
                      <span className="verif-meta-item">
                        <span className="verif-meta-label">Email:</span>
                        <strong className="verif-meta-val">{user.email}</strong>
                      </span>
                      {(user.phone || user.phone_number) && (
                        <span className="verif-meta-item">
                          <span className="verif-meta-label">Tel:</span>
                          <strong className="verif-meta-val">{user.phone || user.phone_number}</strong>
                        </span>
                      )}
                      {user.address && (
                        <span className="verif-meta-item">
                          <span className="verif-meta-label">Dir:</span>
                          <span className="verif-meta-val">{user.address}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & Warning Badges */}
                <div className="verif-badges">
                  {user.driver_license_id && (
                    <span className="adm-chip adm-chip--neutral" title="Número de carnet de conducir">
                      <CreditCard size={12} aria-hidden="true" />
                      Carnet: {user.driver_license_id}
                    </span>
                  )}
                  {isNovel && (
                    <span className="adm-chip adm-chip--amber">
                      <AlertTriangle size={12} aria-hidden="true" />
                      Conductor novel (&lt; 2 años)
                    </span>
                  )}
                  {isExpired && (
                    <span className="adm-chip adm-chip--rose">
                      <AlertTriangle size={12} aria-hidden="true" />
                      Carnet caducado
                    </span>
                  )}
                  {issueDate && (
                    <span className="adm-chip adm-chip--neutral" title="Fecha de expedición">
                      Exp: {formatLicenseDate(issueDate)}
                    </span>
                  )}
                  {expiryDate && (
                    <span className={`adm-chip ${isExpired ? 'adm-chip--rose' : 'adm-chip--neutral'}`} title="Fecha de caducidad">
                      Validez: {formatLicenseDate(expiryDate)}
                    </span>
                  )}
                </div>
              </header>

              {/* Document Thumbnails Grid */}
              <div className="verif-docs-grid">
                {/* 1. DNI Frontal */}
                <div className="verif-doc-tile">
                  <div className="verif-doc-tile__head">
                    <span className="verif-doc-type">DNI / NIE</span>
                    <span className="verif-doc-tag">Anverso</span>
                  </div>
                  {user.dniFrontUrl ? (
                    <div
                      role="button"
                      tabIndex={0}
                      className="verif-doc-preview"
                      onClick={() => setZoomDoc({ url: user.dniFrontUrl!, title: 'DNI / Pasaporte (Anverso)', userName: user.full_name || user.email })}
                      onKeyDown={e => e.key === 'Enter' && setZoomDoc({ url: user.dniFrontUrl!, title: 'DNI / Pasaporte (Anverso)', userName: user.full_name || user.email })}
                      aria-label="Ampliar DNI Frontal"
                    >
                      <img src={user.dniFrontUrl} alt="DNI Frontal" className="verif-doc-img" />
                      <div className="verif-doc-overlay">
                        <Eye size={20} aria-hidden="true" />
                        <span>Ampliar</span>
                      </div>
                    </div>
                  ) : (
                    <div className="verif-doc-empty">
                      <FileText size={24} className="verif-doc-empty__icon" aria-hidden="true" />
                      <span>No adjuntado</span>
                    </div>
                  )}
                </div>

                {/* 2. DNI Reverso */}
                <div className="verif-doc-tile">
                  <div className="verif-doc-tile__head">
                    <span className="verif-doc-type">DNI / NIE</span>
                    <span className="verif-doc-tag">Reverso</span>
                  </div>
                  {user.dniBackUrl ? (
                    <div
                      role="button"
                      tabIndex={0}
                      className="verif-doc-preview"
                      onClick={() => setZoomDoc({ url: user.dniBackUrl!, title: 'DNI / Pasaporte (Reverso)', userName: user.full_name || user.email })}
                      onKeyDown={e => e.key === 'Enter' && setZoomDoc({ url: user.dniBackUrl!, title: 'DNI / Pasaporte (Reverso)', userName: user.full_name || user.email })}
                      aria-label="Ampliar DNI Reverso"
                    >
                      <img src={user.dniBackUrl} alt="DNI Reverso" className="verif-doc-img" />
                      <div className="verif-doc-overlay">
                        <Eye size={20} aria-hidden="true" />
                        <span>Ampliar</span>
                      </div>
                    </div>
                  ) : (
                    <div className="verif-doc-empty">
                      <FileText size={24} className="verif-doc-empty__icon" aria-hidden="true" />
                      <span>No adjuntado</span>
                    </div>
                  )}
                </div>

                {/* 3. Carnet Frontal */}
                <div className="verif-doc-tile">
                  <div className="verif-doc-tile__head">
                    <span className="verif-doc-type">Carnet Conducir</span>
                    <span className="verif-doc-tag">Anverso</span>
                  </div>
                  {user.licenseFrontUrl ? (
                    <div
                      role="button"
                      tabIndex={0}
                      className="verif-doc-preview"
                      onClick={() => setZoomDoc({ url: user.licenseFrontUrl!, title: 'Carnet de Conducir (Anverso)', userName: user.full_name || user.email })}
                      onKeyDown={e => e.key === 'Enter' && setZoomDoc({ url: user.licenseFrontUrl!, title: 'Carnet de Conducir (Anverso)', userName: user.full_name || user.email })}
                      aria-label="Ampliar Carnet Frontal"
                    >
                      <img src={user.licenseFrontUrl} alt="Carnet Frontal" className="verif-doc-img" />
                      <div className="verif-doc-overlay">
                        <Eye size={20} aria-hidden="true" />
                        <span>Ampliar</span>
                      </div>
                    </div>
                  ) : (
                    <div className="verif-doc-empty">
                      <FileText size={24} className="verif-doc-empty__icon" aria-hidden="true" />
                      <span>No adjuntado</span>
                    </div>
                  )}
                </div>

                {/* 4. Carnet Reverso */}
                <div className="verif-doc-tile">
                  <div className="verif-doc-tile__head">
                    <span className="verif-doc-type">Carnet Conducir</span>
                    <span className="verif-doc-tag">Reverso</span>
                  </div>
                  {user.licenseBackUrl ? (
                    <div
                      role="button"
                      tabIndex={0}
                      className="verif-doc-preview"
                      onClick={() => setZoomDoc({ url: user.licenseBackUrl!, title: 'Carnet de Conducir (Reverso)', userName: user.full_name || user.email })}
                      onKeyDown={e => e.key === 'Enter' && setZoomDoc({ url: user.licenseBackUrl!, title: 'Carnet de Conducir (Reverso)', userName: user.full_name || user.email })}
                      aria-label="Ampliar Carnet Reverso"
                    >
                      <img src={user.licenseBackUrl} alt="Carnet Reverso" className="verif-doc-img" />
                      <div className="verif-doc-overlay">
                        <Eye size={20} aria-hidden="true" />
                        <span>Ampliar</span>
                      </div>
                    </div>
                  ) : (
                    <div className="verif-doc-empty">
                      <FileText size={24} className="verif-doc-empty__icon" aria-hidden="true" />
                      <span>No adjuntado</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Bar */}
              <footer className="verif-card__foot">
                <div className="verif-foot-hint">
                  <ShieldCheck size={16} className="verif-foot-hint__icon" aria-hidden="true" />
                  <span>Revisa legibilidad, fechas de validez y coincidencia de datos antes de validar.</span>
                </div>

                <div className="verif-foot-actions">
                  <button
                    type="button"
                    onClick={() => handleOpenReject(user)}
                    disabled={isApproving}
                    className="adm-btn adm-btn--reject"
                  >
                    <X size={16} aria-hidden="true" />
                    <span>Rechazar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(user)}
                    disabled={isApproving}
                    className="adm-btn adm-btn--approve"
                  >
                    {isApproving ? <Loader2 size={16} className="verif-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                    <span>Aprobar Documentación</span>
                  </button>
                </div>
              </footer>
            </article>
          )
        })}

        {/* Empty State */}
        {users.length === 0 && (
          <div className="verif-empty-card adm-card">
            <div className="verif-empty-icon-wrap" aria-hidden="true">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="verif-empty-title">Todo al día</h3>
            <p className="verif-empty-desc">
              No hay carnets ni documentos pendientes de validación en este momento. Los nuevos registros o actualizaciones de clientes aparecerán aquí.
            </p>
          </div>
        )}
      </div>

      {/* LIGHTBOX ZOOM MODAL */}
      {zoomDoc && (
        <div className="verif-lightbox-backdrop" onClick={() => setZoomDoc(null)}>
          <div
            className="verif-lightbox-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={zoomDoc.title}
          >
            <header className="verif-lightbox-head">
              <div className="verif-lightbox-title-wrap">
                <span className="verif-lightbox-icon" aria-hidden="true">
                  <Eye size={18} />
                </span>
                <div>
                  <h4 className="verif-lightbox-title">{zoomDoc.title}</h4>
                  <p className="verif-lightbox-sub">Cliente: {zoomDoc.userName}</p>
                </div>
              </div>
              <div className="verif-lightbox-actions">
                <a
                  href={zoomDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="verif-lightbox-btn"
                  title="Abrir imagen original en nueva pestaña"
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  <span className="verif-lightbox-btn__label">Original</span>
                </a>
                <button
                  type="button"
                  onClick={() => setZoomDoc(null)}
                  className="verif-lightbox-btn verif-lightbox-btn--close"
                  title="Cerrar visor"
                  aria-label="Cerrar visor"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="verif-lightbox-canvas">
              <img src={zoomDoc.url} alt={zoomDoc.title} className="verif-lightbox-img" />
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingUser && (
        <div className="verif-modal-backdrop" onClick={() => !isRejecting && setRejectingUser(null)}>
          <div
            className="verif-modal-card"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-dialog-title"
          >
            <header className="verif-modal-head">
              <div className="verif-modal-head-info">
                <div className="verif-modal-icon-square" aria-hidden="true">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 id="reject-dialog-title" className="verif-modal-title">
                    Rechazar Documentación
                  </h3>
                  <p className="verif-modal-sub">
                    Cliente: <strong>{rejectingUser.full_name || rejectingUser.email}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isRejecting && setRejectingUser(null)}
                className="verif-modal-close"
                disabled={isRejecting}
                aria-label="Cerrar modal"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={handleConfirmReject} className="verif-modal-body">
              {rejectError && (
                <div className="verif-modal-alert">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span>{rejectError}</span>
                </div>
              )}

              <p className="verif-modal-instruction">
                Selecciona el motivo principal del rechazo. Este motivo quedará registrado en el expediente del cliente para que pueda subsanarlo:
              </p>

              {/* Predefined Reasons Radio Group */}
              <div className="verif-radio-list" role="radiogroup" aria-label="Motivo del rechazo">
                {PREDEFINED_REASONS.map(reason => {
                  const isSelected = selectedReason === reason
                  return (
                    <label
                      key={reason}
                      className={`verif-radio-item ${isSelected ? 'verif-radio-item--active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="rejection_reason"
                        value={reason}
                        checked={isSelected}
                        onChange={() => setSelectedReason(reason)}
                        className="verif-radio-input"
                      />
                      <span className="verif-radio-label">{reason}</span>
                    </label>
                  )
                })}
              </div>

              {/* Custom Reason Textarea */}
              <div className="verif-form-group">
                <label htmlFor="custom-reason-textarea" className="verif-form-label">
                  {selectedReason === 'Otro' ? 'Motivo específico / Explicación detallada *' : 'Detalles adicionales o notas para el cliente (opcional)'}
                </label>
                <textarea
                  id="custom-reason-textarea"
                  rows={3}
                  required={selectedReason === 'Otro'}
                  placeholder={
                    selectedReason === 'Otro'
                      ? 'Explica con detalle el motivo por el cual no se valida la documentación...'
                      : 'Puedes añadir notas adicionales para el cliente...'
                  }
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="verif-textarea"
                />
              </div>

              {/* Modal Footer */}
              <footer className="verif-modal-foot">
                <button
                  type="button"
                  onClick={() => setRejectingUser(null)}
                  disabled={isRejecting}
                  className="adm-btn adm-btn--cancel"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="adm-btn adm-btn--confirm-reject"
                >
                  {isRejecting ? <Loader2 size={16} className="verif-spin" aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
                  <span>Confirmar Rechazo</span>
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Styled JSX */}
      <style jsx>{`
        .verifications-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .verif-toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          background: var(--adm-sage-soft);
          border: 1px solid var(--adm-sage);
          color: var(--adm-sage);
          border-radius: 12px;
          font-size: 0.88rem;
          font-weight: 600;
          animation: verifFadeIn 0.2s ease-out;
        }
        :global(.verif-toast__icon) {
          flex-shrink: 0;
        }

        .verifications-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .verif-card {
          padding: 24px 28px;
          background: var(--adm-surface);
          border: 1px solid var(--adm-card-border);
          border-radius: 20px;
          box-shadow: var(--adm-card-shadow);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Card Header */
        .verif-card__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }

        .verif-profile {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
          flex: 1;
        }

        .verif-avatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          color: var(--adm-text);
          font-weight: 700;
          font-size: 0.88rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .verif-profile__info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .verif-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .verif-client-name {
          margin: 0;
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.015em;
          color: var(--adm-text);
        }

        .verif-meta-list {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          font-size: 0.82rem;
          color: var(--adm-text-2);
        }

        .verif-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .verif-meta-label {
          color: var(--adm-text-3);
          font-weight: 500;
        }

        .verif-meta-val {
          color: var(--adm-text);
          font-weight: 600;
        }

        .verif-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        /* Document Grid */
        .verif-docs-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .verif-doc-tile {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .verif-doc-tile__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2px;
        }

        .verif-doc-type {
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--adm-text);
          letter-spacing: -0.01em;
        }

        .verif-doc-tag {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 7px;
          border-radius: 6px;
          background: var(--adm-surface-2);
          color: var(--adm-text-2);
          border: 1px solid var(--adm-border);
        }

        .verif-doc-preview {
          position: relative;
          aspect-ratio: 16 / 10;
          min-height: 135px;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          background: #121316;
          border: 1px solid var(--adm-border);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .verif-doc-preview:hover {
          border-color: var(--adm-gold);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
        }

        .verif-doc-preview:focus-visible {
          outline: 2px solid var(--adm-gold);
          outline-offset: 2px;
        }

        .verif-doc-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .verif-doc-preview:hover .verif-doc-img {
          transform: scale(1.04);
        }

        .verif-doc-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(2px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #ffffff;
          font-size: 0.78rem;
          font-weight: 600;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .verif-doc-preview:hover .verif-doc-overlay {
          opacity: 1;
        }

        .verif-doc-empty {
          aspect-ratio: 16 / 10;
          min-height: 135px;
          border-radius: 12px;
          background: var(--adm-surface-2);
          border: 1px dashed var(--adm-border-strong);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: var(--adm-text-3);
          font-size: 0.78rem;
          font-weight: 500;
        }

        :global(.verif-doc-empty__icon) {
          opacity: 0.5;
        }

        /* Actions Bar */
        .verif-card__foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          padding-top: 18px;
          border-top: 1px solid var(--adm-border);
        }

        .verif-foot-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: var(--adm-text-2);
          font-weight: 500;
        }

        :global(.verif-foot-hint__icon) {
          color: var(--adm-sage);
          flex-shrink: 0;
        }

        .verif-foot-actions {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .adm-btn--approve {
          background: var(--adm-sage);
          border-color: var(--adm-sage);
          color: #ffffff;
          font-weight: 600;
        }

        .adm-btn--approve:hover:not(:disabled) {
          background: #244b38;
          border-color: #244b38;
        }

        .adm-btn--reject {
          background: transparent;
          border-color: var(--adm-rose-soft);
          color: var(--adm-rose);
          font-weight: 600;
        }

        .adm-btn--reject:hover:not(:disabled) {
          background: var(--adm-rose-soft);
          border-color: var(--adm-rose);
        }

        /* Empty State */
        .verif-empty-card {
          text-align: center;
          padding: 56px 24px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .verif-empty-icon-wrap {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--adm-sage-soft);
          color: var(--adm-sage);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .verif-empty-title {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--adm-text);
          margin: 0 0 8px;
        }

        .verif-empty-desc {
          font-size: 0.9rem;
          color: var(--adm-text-2);
          max-width: 480px;
          margin: 0 auto;
          line-height: 1.5;
        }

        /* Lightbox Modal */
        .verif-lightbox-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          backdrop-filter: blur(8px);
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: verifFadeIn 0.15s ease-out;
        }

        .verif-lightbox-modal {
          background: var(--adm-surface);
          border-radius: 18px;
          border: 1px solid var(--adm-border);
          width: 100%;
          max-width: 960px;
          max-height: 94vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          animation: verifPop 0.15s ease-out;
        }

        .verif-lightbox-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--adm-border);
          background: var(--adm-surface-2);
        }

        .verif-lightbox-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .verif-lightbox-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--adm-surface);
          border: 1px solid var(--adm-border);
          color: var(--adm-text-2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .verif-lightbox-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--adm-text);
          margin: 0;
        }

        .verif-lightbox-sub {
          font-size: 0.8rem;
          color: var(--adm-text-2);
          margin: 2px 0 0;
        }

        .verif-lightbox-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .verif-lightbox-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          background: var(--adm-surface);
          border: 1px solid var(--adm-border);
          color: var(--adm-text-2);
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .verif-lightbox-btn:hover {
          background: var(--adm-border);
          color: var(--adm-text);
        }

        .verif-lightbox-btn--close {
          padding: 6px;
          border-radius: 8px;
        }

        .verif-lightbox-canvas {
          padding: 24px;
          background: #0b0d10;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          min-height: 360px;
          max-height: calc(94vh - 68px);
        }

        .verif-lightbox-img {
          max-width: 100%;
          max-height: 76vh;
          object-fit: contain;
          border-radius: 6px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        /* Reject Modal */
        .verif-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: verifFadeIn 0.15s ease-out;
        }

        .verif-modal-card {
          background: var(--adm-surface);
          border: 1px solid var(--adm-border);
          border-radius: 18px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.25);
          animation: verifPop 0.15s ease-out;
        }

        .verif-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--adm-border);
        }

        .verif-modal-head-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .verif-modal-icon-square {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--adm-rose-soft);
          color: var(--adm-rose);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .verif-modal-title {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--adm-rose);
          margin: 0;
        }

        .verif-modal-sub {
          font-size: 0.8rem;
          color: var(--adm-text-2);
          margin: 2px 0 0;
        }

        .verif-modal-close {
          background: transparent;
          border: none;
          color: var(--adm-text-3);
          cursor: pointer;
          border-radius: 8px;
          padding: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.12s ease;
        }

        .verif-modal-close:hover:not(:disabled) {
          color: var(--adm-text);
          background: var(--adm-surface-2);
        }

        .verif-modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .verif-modal-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--adm-rose-soft);
          border: 1px solid var(--adm-rose);
          color: var(--adm-rose);
          border-radius: 10px;
          font-size: 0.84rem;
          font-weight: 600;
        }

        .verif-modal-instruction {
          font-size: 0.86rem;
          color: var(--adm-text);
          line-height: 1.5;
          margin: 0;
        }

        .verif-radio-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .verif-radio-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--adm-border);
          background: var(--adm-surface-2);
          cursor: pointer;
          font-size: 0.86rem;
          font-weight: 500;
          color: var(--adm-text);
          transition: all 0.15s ease;
        }

        .verif-radio-item:hover {
          border-color: var(--adm-border-strong);
        }

        .verif-radio-item--active {
          border-color: var(--adm-rose);
          background: var(--adm-rose-soft);
          color: var(--adm-rose);
          font-weight: 600;
        }

        .verif-radio-input {
          accent-color: var(--adm-rose);
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .verif-radio-label {
          flex: 1;
        }

        .verif-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .verif-form-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--adm-text);
        }

        .verif-textarea {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--adm-border);
          background: var(--adm-surface);
          color: var(--adm-text);
          font-size: 0.88rem;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          box-sizing: border-box;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .verif-textarea:focus {
          outline: none;
          border-color: var(--adm-rose);
          box-shadow: 0 0 0 3px var(--adm-rose-soft);
        }

        .verif-modal-foot {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 14px;
          border-top: 1px solid var(--adm-border);
        }

        .adm-btn--cancel {
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          color: var(--adm-text);
        }

        .adm-btn--cancel:hover {
          background: var(--adm-border);
        }

        .adm-btn--confirm-reject {
          background: var(--adm-rose);
          border-color: var(--adm-rose);
          color: #ffffff;
          font-weight: 600;
        }

        .adm-btn--confirm-reject:hover:not(:disabled) {
          opacity: 0.92;
        }

        /* Animations */
        :global(.verif-spin) {
          animation: verif-spin 0.9s linear infinite;
        }
        @keyframes verif-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes verifFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes verifPop {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Responsive Breakpoints */
        @media (max-width: 860px) {
          .verif-card {
            padding: 20px;
          }
          .verif-card__head {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
          }
          .verif-badges {
            justify-content: flex-start;
            width: 100%;
          }
          .verif-docs-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
        }

        @media (max-width: 640px) {
          .verif-card {
            padding: 16px;
            border-radius: 16px;
            gap: 16px;
          }
          .verif-docs-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .verif-doc-preview,
          .verif-doc-empty {
            min-height: 110px;
            border-radius: 10px;
          }
          .verif-card__foot {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .verif-foot-hint {
            font-size: 0.78rem;
          }
          .verif-foot-actions {
            flex-direction: column;
            width: 100%;
            gap: 8px;
          }
          .verif-foot-actions button {
            width: 100%;
            min-height: 44px;
            justify-content: center;
            font-size: 0.88rem;
          }

          /* Lightbox mobile */
          .verif-lightbox-backdrop {
            padding: 0;
          }
          .verif-lightbox-modal {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
            border-radius: 0;
          }
          .verif-lightbox-btn__label {
            display: none;
          }

          /* Reject modal mobile (bottom sheet) */
          .verif-modal-backdrop {
            padding: 0;
            align-items: flex-end;
          }
          .verif-modal-card {
            border-radius: 20px 20px 0 0;
            max-height: 90vh;
            overflow-y: auto;
          }
          .verif-modal-body {
            padding: 16px;
          }
          .verif-modal-foot {
            flex-direction: column-reverse;
            gap: 8px;
          }
          .verif-modal-foot button {
            width: 100%;
            min-height: 44px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
