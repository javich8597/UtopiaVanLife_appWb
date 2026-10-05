'use client'

import { useState } from 'react'
import { Undo2, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RefundActionClient({ bookingId, status, paymentStatus }: { bookingId: string, status: string, paymentStatus?: string | null }) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleRefund = async () => {
        // El servidor solo cancela y marca como reembolsada: la devolución se hace a mano en el TPV
        if (!window.confirm('Se cancelará la reserva, se liberarán sus fechas y quedará marcada como reembolsada.\n\nRecuerda hacer la devolución del importe desde el panel del TPV (Redsys). ¿Continuar?')) {
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

    // Confirmadas, en viaje, o pagadas que aún esperan ser aceptadas
    const paidAwaiting = status === 'pending' && paymentStatus === 'paid'
    if (status !== 'confirmed' && status !== 'active' && !paidAwaiting) {
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
