'use client'

import { useState } from 'react'
import { UploadCloud, CheckCircle2, AlertTriangle, AlertCircle, Clock } from 'lucide-react'

export default function ProfileFormClient({ initialStatus }: { initialStatus: string }) {
    const [status, setStatus] = useState(initialStatus)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState('')

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsUploading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        // Check if files are selected
        const front = formData.get('front') as File
        const back = formData.get('back') as File

        if (!front?.size || !back?.size) {
            setError('Por favor, adjunta la parte frontal y trasera de tu carnet.')
            setIsUploading(false)
            return
        }

        try {
            const res = await fetch('/api/upload-document', {
                method: 'POST',
                body: formData,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al subir los archivos')

            setStatus('pending_validation')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsUploading(false)
        }
    }

    if (status === 'verified') {
        return (
            <div className="status-banner success">
                <CheckCircle2 size={24} />
                <div>
                    <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Carnet Validado</h3>
                    <p className="text-sm">Tu documentación ha sido revisada y aprobada. ¡Todo listo para tu reserva!</p>
                </div>
            </div>
        )
    }

    if (status === 'pending_validation') {
        return (
            <div className="status-banner warning">
                <Clock size={24} />
                <div>
                    <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Pendiente de Validación</h3>
                    <p className="text-sm">Hemos recibido tu carnet. Nuestro equipo lo revisará en breve. Te avisaremos cuando esté validado.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="upload-container">
            {status === 'rejected' && (
                <div className="status-banner error" style={{ marginBottom: 'var(--space-6)' }}>
                    <AlertTriangle size={24} />
                    <div>
                        <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Documentación Rechazada</h3>
                        <p className="text-sm">Hubo un problema con la validación de tu carnet. Por favor, asegúrate de que la imagen sea clara, sin brillos y vigente.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="status-banner error" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)' }}>
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            <form onSubmit={handleUpload}>
                <div className="file-inputs">
                    <div className="file-input-group">
                        <label className="text-sm" style={{ fontWeight: 500, color: 'var(--gray-700)' }}>Frontal del Carnet</label>
                        <input
                            type="file"
                            name="front"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            className="file-input"
                        />
                    </div>
                    <div className="file-input-group">
                        <label className="text-sm" style={{ fontWeight: 500, color: 'var(--gray-700)' }}>Reverso del Carnet</label>
                        <input
                            type="file"
                            name="back"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            className="file-input"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn btn-forest"
                    disabled={isUploading}
                    style={{ width: '100%', marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-2)' }}
                >
                    {isUploading ? (
                        <>Subiendo...</>
                    ) : (
                        <>
                            <UploadCloud size={18} />
                            Enviar Documentos para Validación
                        </>
                    )}
                </button>
            </form>

            <style jsx>{`
        .status-banner {
          display: flex; gap: var(--space-4); align-items: flex-start;
          padding: var(--space-4); border-radius: var(--radius-md);
        }
        .status-banner.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .status-banner.warning { background: #fefce8; color: #854d0e; border: 1px solid #fef08a; }
        .status-banner.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        
        .file-inputs { display: flex; flex-direction: column; gap: var(--space-4); }
        .file-input-group { display: flex; flex-direction: column; gap: var(--space-2); }
        .file-input {
          padding: var(--space-3); border: 1px dashed var(--gray-300); border-radius: var(--radius-md);
          background: var(--gray-50); cursor: pointer; transition: all var(--transition-fast);
        }
        .file-input:hover { border-color: var(--forest-green); background: #f0fdf4; }
      `}</style>
        </div>
    )
}
