'use client'

import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ValidationActionsClient({ userId }: { userId: string }) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleAction = async (action: 'approve' | 'reject') => {
        setIsProcessing(true)
        setError('')

        try {
            const res = await fetch('/api/admin/verify-doc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error procesando la validación')

            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setIsProcessing(false)
        }
    }

    return (
        <div className="actions-container">
            {error && <div className="text-xs error-msg">{error}</div>}
            <button
                className="btn btn-forest"
                onClick={() => handleAction('approve')}
                disabled={isProcessing}
                style={{ display: 'flex', gap: 'var(--space-2)' }}
            >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Aprobar
            </button>
            <button
                className="btn btn-outline"
                onClick={() => handleAction('reject')}
                disabled={isProcessing}
                style={{ color: 'var(--error)', borderColor: '#fca5a5', display: 'flex', gap: 'var(--space-2)' }}
            >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                Rechazar
            </button>

            <style jsx>{`
        .actions-container { display: flex; flex-direction: column; gap: var(--space-3); }
        .error-msg { color: var(--error); margin-bottom: var(--space-2); }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    )
}
