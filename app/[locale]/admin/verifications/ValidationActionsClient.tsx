'use client'

import { useState } from 'react'
import { Check, X, Loader2, AlertTriangle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  userName?: string
  onStatusUpdated?: (newStatus: string) => void
}

const PREDEFINED_REASONS = [
  'Foto borrosa o ilegible',
  'Carnet de conducir caducado',
  'Conductor novel (< 2 años)',
  'Documento incompleto o cortado',
  'Otro',
]

export default function ValidationActionsClient({ userId, userName, onStatusUpdated }: Props) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState(PREDEFINED_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const router = useRouter()

  const handleApprove = async () => {
    if (!confirm(`¿Confirmar aprobación de la documentación?`)) return

    setIsProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/admin/verify-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'approve' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error procesando la validación')

      if (onStatusUpdated) onStatusUpdated('verified')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setIsProcessing(false)
    }
  }

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError('')

    let finalReason = selectedReason
    if (selectedReason === 'Otro') {
      if (!customReason.trim()) {
        setError('Debes especificar un motivo')
        setIsProcessing(false)
        return
      }
      finalReason = customReason.trim()
    } else if (customReason.trim()) {
      finalReason = `${selectedReason} - ${customReason.trim()}`
    }

    try {
      const res = await fetch('/api/admin/verify-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'reject', reason: finalReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error procesando el rechazo')

      setIsRejectModalOpen(false)
      if (onStatusUpdated) onStatusUpdated('rejected')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setIsProcessing(false)
    }
  }

  return (
    <div className="actions-container">
      {error && <div className="text-xs error-msg">{error}</div>}

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button
          type="button"
          className="btn btn-forest"
          onClick={handleApprove}
          disabled={isProcessing}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Aprobar
        </button>

        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setIsRejectModalOpen(true)}
          disabled={isProcessing}
          style={{ color: 'var(--error)', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <X size={16} />
          Rechazar
        </button>
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="modal-backdrop" onClick={() => !isProcessing && setIsRejectModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="modal-header-icon">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, color: '#991b1b', fontSize: '1.05rem', fontWeight: 700 }}>
                    Rechazar Documentación
                  </h4>
                  {userName && (
                    <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Cliente: {userName}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="modal-close-btn"
                disabled={isProcessing}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="modal-body">
              <p style={{ fontSize: '0.85rem', color: '#374151', margin: 0 }}>
                Selecciona la causa del rechazo de los documentos:
              </p>

              <div className="radio-group">
                {PREDEFINED_REASONS.map(reason => (
                  <label key={reason} className={`radio-label ${selectedReason === reason ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="rejectionReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}>
                  {selectedReason === 'Otro' ? 'Motivo específico *' : 'Notas adicionales (opcional)'}
                </label>
                <textarea
                  rows={3}
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder={
                    selectedReason === 'Otro'
                      ? 'Escribe el motivo detallado...'
                      : 'Observaciones para el cliente...'
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  disabled={isProcessing}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn"
                  style={{ background: '#dc2626', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .actions-container { display: flex; flex-direction: column; gap: var(--space-3); }
        .error-msg { color: var(--error); margin-bottom: var(--space-2); }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-card {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header-icon {
          width: 34px;
          height: 34px;
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
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
        }

        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .radio-label.selected {
          border-color: #fca5a5;
          background: #fef2f2;
          color: #991b1b;
          font-weight: 600;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </div>
  )
}
