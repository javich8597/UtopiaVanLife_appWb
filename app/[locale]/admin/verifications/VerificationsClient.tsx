'use client'

import React, { useState } from 'react'
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
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

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

export default function VerificationsClient({ initialUsers }: Props) {
  const router = useRouter()
  const [users, setUsers] = useState<UserWithDocs[]>(initialUsers || [])

  // Lightbox Zoom state
  const [zoomDoc, setZoomDoc] = useState<{ url: string; title: string; userName: string } | null>(null)

  // Rejection Dialog state
  const [rejectingUser, setRejectingUser] = useState<UserWithDocs | null>(null)
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
      setTimeout(() => setActionSuccessMessage(null), 3000)
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
        <div className="toast-success">
          <CheckCircle2 size={18} />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* List of Pending Verifications */}
      <div className="verifications-list">
        {users.map(user => {
          const issueDate = user.driver_license_issue_date
          const expiryDate = user.driver_license_expiry_date
          let isNovel = false
          let isExpired = false
          if (issueDate && expiryDate) {
            const today = new Date()
            const exp = new Date(expiryDate)
            const iss = new Date(issueDate)
            isExpired = exp.getTime() < today.getTime()
            const diffYears = (today.getTime() - iss.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
            isNovel = diffYears < 2
          }

          const isApproving = approvingId === user.id

          return (
            <div key={user.id} className="validation-card card">
              {/* User Info Header */}
              <div className="user-info-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 className="text-h4" style={{ marginBottom: 4 }}>
                      {user.full_name || 'Sin Nombre'}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                      DNI / Pasaporte: <strong>{user.dni_nie || 'No indicado'}</strong> · Email: <strong>{user.email}</strong>
                    </p>
                    <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                      Tel: <strong>{user.phone || user.phone_number || 'No especificado'}</strong> · Dirección: <strong>{user.address || 'No especificada'}</strong>
                    </p>
                  </div>

                  {/* Warning Badges */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {user.driver_license_id && (
                      <span className="badge-pill badge-neutral">
                        Carnet: {user.driver_license_id}
                      </span>
                    )}
                    {isNovel && (
                      <span className="badge-pill badge-warning">
                        ⚠️ Conductor novel (&lt; 2 años)
                      </span>
                    )}
                    {isExpired && (
                      <span className="badge-pill badge-danger">
                        ⛔ Carnet Caducado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Thumbnails Grid */}
              <div className="documents-grid">
                {/* DNI Frontal */}
                <div className="doc-tile">
                  <span className="doc-tile-title">DNI Frontal</span>
                  {user.dniFrontUrl ? (
                    <div
                      className="doc-img-wrap"
                      onClick={() => setZoomDoc({ url: user.dniFrontUrl!, title: 'DNI Frontal (Anverso)', userName: user.full_name || user.email })}
                    >
                      <img src={user.dniFrontUrl} alt="DNI Frontal" className="doc-thumbnail-img" />
                      <div className="doc-hover-overlay">
                        <Eye size={18} />
                        <span>Ampliar</span>
                      </div>
                    </div>
                  ) : (
                    <div className="doc-empty">No adjuntado</div>
                  )}
                </div>

                {/* DNI Reverso */}
                <div className="doc-tile">
                  <span className="doc-tile-title">DNI Reverso</span>
                  {user.dniBackUrl ? (
                    <div
                      className="doc-img-wrap"
                      onClick={() => setZoomDoc({ url: user.dniBackUrl!, title: 'DNI Reverso (Posterior)', userName: user.full_name || user.email })}
                    >
                      <img src={user.dniBackUrl} alt="DNI Reverso" className="doc-thumbnail-img" />
                      <div className="doc-hover-overlay">
                        <Eye size={18} />
                        <span>Ampliar</span>
                      </div>
                    </div>
                  ) : (
                    <div className="doc-empty">No adjuntado</div>
                  )}
                </div>

                {/* Carnet Frontal */}
                <div className="doc-tile">
                  <span className="doc-tile-title">Carnet Frontal</span>
                  {user.licenseFrontUrl ? (
                    <div
                      className="doc-img-wrap"
                      onClick={() => setZoomDoc({ url: user.licenseFrontUrl!, title: 'Carnet de Conducir (Frontal)', userName: user.full_name || user.email })}
                    >
                      <img src={user.licenseFrontUrl} alt="Carnet Frontal" className="doc-thumbnail-img" />
                      <div className="doc-hover-overlay">
                        <Eye size={18} />
                        <span>Ampliar</span>
                      </div>
                    </div>
                  ) : (
                    <div className="doc-empty">No adjuntado</div>
                  )}
                </div>

                {/* Carnet Reverso */}
                <div className="doc-tile">
                  <span className="doc-tile-title">Carnet Reverso</span>
                  {user.licenseBackUrl ? (
                    <div
                      className="doc-img-wrap"
                      onClick={() => setZoomDoc({ url: user.licenseBackUrl!, title: 'Carnet de Conducir (Reverso)', userName: user.full_name || user.email })}
                    >
                      <img src={user.licenseBackUrl} alt="Carnet Reverso" className="doc-thumbnail-img" />
                      <div className="doc-hover-overlay">
                        <Eye size={18} />
                        <span>Ampliar</span>
                      </div>
                    </div>
                  ) : (
                    <div className="doc-empty">No adjuntado</div>
                  )}
                </div>
              </div>

              {/* Actions Bar */}
              <div className="card-actions-row">
                <span className="actions-hint">
                  Acción sobre la documentación de este cliente:
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleApprove(user)}
                    disabled={isApproving}
                    className="btn btn-forest"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    {isApproving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Aprobar Documentación
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenReject(user)}
                    disabled={isApproving}
                    className="btn btn-outline"
                    style={{ color: 'var(--error)', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <X size={16} />
                    Rechazar
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {users.length === 0 && (
          <div className="empty-state card">
            <CheckCircle2 size={48} style={{ color: 'var(--success)', margin: '0 auto 16px' }} />
            <h3 className="text-h4" style={{ marginBottom: '8px' }}>Todo al día</h3>
            <p className="text-body" style={{ color: 'var(--gray-600)' }}>
              No hay carnets ni documentos pendientes de validación en este momento.
            </p>
          </div>
        )}
      </div>

      {/* LIGHTBOX ZOOM MODAL */}
      {zoomDoc && (
        <div className="lightbox-backdrop" onClick={() => setZoomDoc(null)}>
          <div className="lightbox-card" onClick={e => e.stopPropagation()}>
            <div className="lightbox-header">
              <div>
                <span className="lightbox-title">{zoomDoc.title}</span>
                <span className="lightbox-subtitle"> · {zoomDoc.userName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={zoomDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="lightbox-ext-btn"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setZoomDoc(null)}
                  className="lightbox-close-btn"
                  title="Cerrar visor"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="lightbox-image-container">
              <img src={zoomDoc.url} alt={zoomDoc.title} className="lightbox-image" />
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingUser && (
        <div className="modal-backdrop" onClick={() => !isRejecting && setRejectingUser(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="modal-header-icon">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-h4" style={{ margin: 0, color: '#991b1b' }}>
                    Rechazar Documentación
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--gray-500)', margin: 0 }}>
                    Cliente: <strong>{rejectingUser.full_name || rejectingUser.email}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isRejecting && setRejectingUser(null)}
                className="modal-close-btn"
                disabled={isRejecting}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="modal-body">
              {rejectError && (
                <div className="modal-alert-error">
                  <AlertTriangle size={16} />
                  <span>{rejectError}</span>
                </div>
              )}

              <p style={{ fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.5, margin: 0 }}>
                Selecciona el motivo principal del rechazo. Este motivo quedará registrado en el expediente del cliente para que pueda subsanarlo:
              </p>

              {/* Predefined Reasons Radio Group */}
              <div className="reasons-radio-list">
                {PREDEFINED_REASONS.map(reason => (
                  <label
                    key={reason}
                    className={`reason-radio-item ${selectedReason === reason ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="rejection_reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                    />
                    <span className="reason-text">{reason}</span>
                  </label>
                ))}
              </div>

              {/* Custom Reason Textarea */}
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">
                  {selectedReason === 'Otro' ? 'Motivo específico / Explicación personalizada *' : 'Detalles adicionales o instrucciones para el cliente (opcional)'}
                </label>
                <textarea
                  rows={3}
                  required={selectedReason === 'Otro'}
                  placeholder={
                    selectedReason === 'Otro'
                      ? 'Explica con detalle el motivo por el cual no se valida la documentación...'
                      : 'Puedes añadir notas adicionales para el cliente...'
                  }
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setRejectingUser(null)}
                  disabled={isRejecting}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="btn btn-danger-action"
                >
                  {isRejecting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Confirmar Rechazo
                </button>
              </div>
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

        .toast-success {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .validation-card {
          margin-bottom: 24px;
          padding: 24px;
          background: white;
          border-radius: 16px;
          border: 1px solid var(--gray-200);
        }

        .user-info-section {
          margin-bottom: 20px;
        }

        .badge-pill {
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: 8px;
          font-weight: 600;
        }

        .badge-neutral {
          background: var(--gray-100);
          color: var(--gray-800);
        }

        .badge-warning {
          background: #fef08a;
          color: #854d0e;
        }

        .badge-danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .doc-tile {
          text-align: center;
          background: #fafafa;
          border: 1px solid var(--gray-200);
          border-radius: 10px;
          padding: 10px;
        }

        .doc-tile-title {
          font-size: 0.78rem;
          font-weight: 700;
          display: block;
          margin-bottom: 8px;
          color: var(--gray-700);
        }

        .doc-img-wrap {
          position: relative;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          height: 105px;
          border: 1px solid var(--gray-300);
          background: white;
        }

        .doc-thumbnail-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }

        .doc-hover-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: white;
          font-size: 0.78rem;
          font-weight: 600;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .doc-img-wrap:hover .doc-hover-overlay {
          opacity: 1;
        }

        .doc-img-wrap:hover .doc-thumbnail-img {
          transform: scale(1.03);
        }

        .doc-empty {
          height: 105px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-400);
          font-size: 0.78rem;
          background: #f3f4f6;
          border-radius: 6px;
        }

        .card-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid var(--gray-100);
        }

        .actions-hint {
          font-size: 0.88rem;
          color: var(--gray-600);
          font-weight: 500;
        }

        .empty-state {
          text-align: center;
          padding: 48px;
          border: 1px dashed var(--gray-300);
          border-radius: 16px;
          background: white;
        }

        /* Lightbox Styles */
        .lightbox-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(6px);
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .lightbox-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 900px;
          max-height: 92vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
        }

        .lightbox-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--gray-200);
          background: #fafafa;
        }

        .lightbox-title {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--gray-900);
        }

        .lightbox-subtitle {
          font-size: 0.85rem;
          color: var(--gray-500);
        }

        .lightbox-close-btn, .lightbox-ext-btn {
          background: transparent;
          border: none;
          color: var(--gray-500);
          cursor: pointer;
          border-radius: 6px;
          padding: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-close-btn:hover, .lightbox-ext-btn:hover {
          color: var(--gray-800);
          background: var(--gray-200);
        }

        .lightbox-image-container {
          padding: 20px;
          background: #18181b;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          min-height: 380px;
          max-height: calc(92vh - 65px);
        }

        .lightbox-image {
          max-width: 100%;
          max-height: 75vh;
          object-fit: contain;
          border-radius: 4px;
        }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-card {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--gray-200);
        }

        .modal-header-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #fee2e2;
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--gray-400);
          cursor: pointer;
          border-radius: 6px;
          padding: 4px;
        }

        .modal-close-btn:hover {
          color: var(--gray-700);
          background: var(--gray-100);
        }

        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-alert-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          border-radius: 8px;
          font-size: 0.85rem;
        }

        .reasons-radio-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .reason-radio-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid var(--gray-200);
          border-radius: 8px;
          background: #fafafa;
          cursor: pointer;
          font-size: 0.88rem;
          transition: all 0.15s ease;
        }

        .reason-radio-item:hover {
          background: #f3f4f6;
          border-color: var(--gray-300);
        }

        .reason-radio-item.selected {
          border-color: #fca5a5;
          background: #fff5f5;
          color: #991b1b;
          font-weight: 600;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--gray-700);
        }

        .form-input {
          padding: 8px 12px;
          border: 1px solid var(--gray-300);
          border-radius: 8px;
          font-size: 0.9rem;
          outline: none;
        }

        .form-input:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.15);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 14px;
          border-top: 1px solid var(--gray-200);
        }

        .btn-danger-action {
          background: #dc2626;
          color: white;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-danger-action:hover {
          background: #b91c1c;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .validation-card {
            padding: 16px;
            margin-bottom: 16px;
          }
          .documents-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .doc-img-wrap {
            height: 120px;
          }
          .card-actions-row {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .card-actions-row > div {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 8px;
          }
          .card-actions-row button {
            width: 100%;
            justify-content: center;
            padding: 12px 16px;
          }
          .lightbox-backdrop {
            padding: 0;
          }
          .lightbox-card {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
            border-radius: 0;
          }
          .modal-backdrop {
            padding: 0;
            align-items: flex-end;
          }
          .modal-card {
            border-radius: 20px 20px 0 0;
            max-height: 90vh;
          }
          .modal-body {
            padding: 16px;
          }
          .modal-footer {
            flex-direction: column-reverse;
          }
          .modal-footer button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
