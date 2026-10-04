'use client'

import { useState } from 'react'
import { Undo2, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RefundActionClient({ bookingId, status }: { bookingId: string, status: string }) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleRefund = async () => {
        if (!window.confirm('¿Estás seguro de que deseas cancelar la reserva y tramitar el reembolso en Redsys? Esta acción es irreversible.')) {
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
        <div className="refund-action">
            {error && <div className="refund-action__error"><AlertCircle size={12} /> {error}</div>}
            <button
                type="button"
                className="adm-btn adm-btn--sm adm-btn--danger"
                onClick={handleRefund}
                disabled={isProcessing}
                title="Cancelar y reembolsar"
            >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
                Reembolsar
            </button>

            <style jsx>{`
        .refund-action { display: inline-flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .refund-action__error { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; color: var(--adm-rose); }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    )
}
