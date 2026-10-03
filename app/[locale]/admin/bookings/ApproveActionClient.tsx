'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

interface Props {
  bookingId: string
  status: string
}

export default function ApproveActionClient({ bookingId, status }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(status)

  if (currentStatus !== 'pending' && currentStatus !== 'pending_approval') {
    return null
  }

  const handleApprove = async () => {
    if (!confirm('¿Estás seguro de que deseas ACEPTAR y CONFIRMAR esta reserva? Se emitirá el contrato de alquiler oficial.')) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/approve-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, action: 'approve' })
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        alert(`Error al aprobar reserva: ${data.error || 'Error desconocido'}`)
      } else {
        setCurrentStatus('confirmed')
        window.location.reload()
      }
    } catch (e: any) {
      alert(`Error de conexión: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleApprove}
      disabled={isLoading}
      className="adm-btn adm-btn--sm adm-btn--primary"
      title="Aceptar reserva y emitir contrato"
    >
      {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      <span>Aceptar</span>
    </button>
  )
}
