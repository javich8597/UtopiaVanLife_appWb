'use client'

import { useState } from 'react'
import { FileText, Upload, Loader2, Check, ExternalLink } from 'lucide-react'
import { compressImage, uploadWithSignedUrl } from '@/lib/handover/media'

interface Doc { kind: string; file_name?: string | null; uploaded_at?: string; url?: string | null }
interface Props {
  campers: { id: string; name: string }[]
  initialDocs: Record<string, Doc[]>
}

const KINDS = [
  { kind: 'ficha_tecnica', label: 'Ficha técnica' },
  { kind: 'permiso_circulacion', label: 'Permiso de circulación' },
] as const

/** Ficha técnica y permiso de circulación de cada camper: el cliente los ve en Documentos durante su reserva */
export default function VehicleDocsClient({ campers, initialDocs }: Props) {
  const [docs, setDocs] = useState(initialDocs)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = (camperId: string, kind: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(`${camperId}-${kind}`)
    setError(null)
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      if (isPdf && file.size > 10 * 1024 * 1024) throw new Error('El PDF pesa más de 10 MB.')
      const body = isPdf ? file : await compressImage(file, 2200, 0.8)
      const ext = isPdf ? 'pdf' : 'jpg'
      const path = await uploadWithSignedUrl('/api/admin/camper-docs', { action: 'upload-url', camperId, kind, ext }, body, 'vehicle-docs')
      const res = await fetch('/api/admin/camper-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', camperId, kind, path, fileName: file.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el documento')
      setDocs(prev => ({
        ...prev,
        [camperId]: [...(prev[camperId] || []).filter(d => d.kind !== kind), { kind, file_name: file.name, uploaded_at: new Date().toISOString(), url: URL.createObjectURL(body) }],
      }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="adm-card vd" aria-labelledby="vd-title">
      <h2 id="vd-title" className="adm-card-title">
        <span className="adm-icon-square"><FileText size={22} /></span>
        Documentación de los vehículos
      </h2>
      <p className="vd-desc">El cliente la ve en su sección Documentos mientras tiene la reserva confirmada o en curso.</p>
      {error && <p className="vd-error" role="alert">{error}</p>}

      <div className="vd-grid">
        {campers.map(c => (
          <div key={c.id} className="vd-camper">
            <strong>{c.name}</strong>
            {KINDS.map(k => {
              const doc = (docs[c.id] || []).find(d => d.kind === k.kind)
              const key = `${c.id}-${k.kind}`
              return (
                <div key={k.kind} className="vd-row">
                  <span className="vd-row__text">
                    {doc ? <Check size={14} className="vd-ok" /> : null}
                    {k.label}
                    {doc?.file_name && <small>{doc.file_name}</small>}
                  </span>
                  <span className="vd-row__actions">
                    {doc?.url && (
                      <a href={doc.url} target="_blank" rel="noopener" className="adm-btn adm-btn--sm" aria-label={`Ver ${k.label} de ${c.name}`}>
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <label className="adm-btn adm-btn--sm">
                      {busy === key ? <Loader2 size={14} className="vd-spin" /> : <Upload size={14} />}
                      {doc ? 'Cambiar' : 'Subir'}
                      <input type="file" accept="application/pdf,image/*" className="vd-file" onChange={upload(c.id, k.kind)} disabled={busy !== null} />
                    </label>
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <style jsx>{`
        .vd { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
        .vd-desc { margin: 0; color: var(--adm-text-3); font-size: 0.9rem; }
        .vd-error { margin: 0; color: var(--adm-rose); font-size: 0.9rem; }
        .vd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 14px; }
        .vd-camper { display: flex; flex-direction: column; gap: 10px; padding: 16px; border: 1px solid var(--adm-border); border-radius: 14px; }
        .vd-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .vd-row__text { display: flex; flex-direction: column; gap: 2px; font-size: 0.92rem; }
        .vd-row__text small { color: var(--adm-text-3); font-size: 0.78rem; word-break: break-all; }
        .vd-row__actions { display: flex; gap: 6px; flex-shrink: 0; }
        .vd :global(.vd-ok) { color: var(--adm-sage); }
        .vd-file { display: none; }
        .vd :global(.vd-row__actions .adm-btn) { cursor: pointer; }
        :global(.vd-spin) { animation: vdspin 1s linear infinite; }
        @keyframes vdspin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) { .vd { padding: 16px; } }
      `}</style>
    </section>
  )
}
