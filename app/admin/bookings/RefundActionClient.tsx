'use client'

import { useState } from 'react'
import { Undo2, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RefundActionClient({ bookingId, status }: { bookingId: string, status: string }) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleRefund = async () => {
        if (!window.confirm('¿Estás seguro de que deseas cancelar la reserva y emitir el reembolso completo a través de Stripe? Esta acción es irreversible.')) {
            return
        }

        setIsProcessing(true)
        setError('')

        try {
            const res = await fetch('/api/admin/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId })
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Error procesando el reembolso')

            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setIsProcessing(false)
        }
    }

    // Only allow refunding if it's confirmed or active
    if (status !== 'confirmed' && status !== 'active') {
        return null
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
            {error && <div className="text-xs" style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> {error}</div>}
            <button
                className="btn btn-outline btn-sm"
                onClick={handleRefund}
                disabled={isProcessing}
                style={{ color: 'var(--error)', borderColor: '#fca5a5', display: 'flex', gap: 'var(--space-2)' }}
                title="Cancelar y Reembolsar"
            >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
                Reembolsar
            </button>

            <style jsx>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    )
}
