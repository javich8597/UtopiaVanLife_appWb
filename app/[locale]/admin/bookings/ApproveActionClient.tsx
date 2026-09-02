'use client'

import { useState } from 'react'
import { Check, Loader2, AlertCircle } from 'lucide-react'

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
      onClick={handleApprove}
      disabled={isLoading}
      style={{
        background: '#16a34a',
        color: 'white',
        border: 'none',
        borderRadius: 6,
        padding: '5px 10px',
        fontSize: '0.78rem',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(22,163,74,0.3)',
        transition: 'all 0.2s ease',
        marginRight: 6
      }}
      title="Aceptar reserva y emitir contrato"
    >
      {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      <span>Aceptar</span>
    </button>
  )
}
