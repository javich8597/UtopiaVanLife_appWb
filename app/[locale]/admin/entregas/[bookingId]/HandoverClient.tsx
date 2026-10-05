'use client'

import { useMemo, useState } from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { ArrowLeft, Check, Camera, IdCard, Gauge, Video, ListChecks, PenLine, Loader2, AlertTriangle, Plus } from 'lucide-react'
import AdminPageHeader from '../../AdminPageHeader'
import VideoRecorder from './VideoRecorder'
import SignaturePad from './SignaturePad'
import { CHECKLIST, FUEL_LEVELS, handoverSteps, kmSummary, type HandoverKind } from '@/lib/handover/checklist'
import { compressImage, uploadWithSignedUrl } from '@/lib/handover/media'

interface Props {
  kind: HandoverKind
  booking: any
  customer: any
  licensePhotos: string[]
  initial: any | null
  pickupKm: number | null
}

const fmtDay = (d: string) => new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

export default function HandoverClient({ kind, booking, customer, licensePhotos, initial, pickupKm }: Props) {
  const router = useRouter()
  const [h, setH] = useState<any>(initial || { kind, checklist: {}, damage_photo_paths: [], damagePhotoUrls: [] })
  const [kmInput, setKmInput] = useState<string>(initial?.km != null ? String(initial.km) : '')
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const isDone = Boolean(h.completed_at)
  const steps = useMemo(() => handoverSteps({ ...h, customer_signature: h.customer_signature || signature }), [h, signature])
  const doneCount = steps.filter(s => s.done).length
  const camper = Array.isArray(booking.campers) ? booking.campers[0] : booking.campers
  const title = kind === 'pickup' ? 'Entrega de la camper' : 'Devolución de la camper'

  const save = async (patch: Record<string, any>, key: string, complete = false) => {
    setSaving(key)
    setError(null)
    try {
      const res = await fetch('/api/admin/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, kind, patch, complete }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar')
      setH((prev: any) => ({ ...prev, ...data.handover }))
      return data.handover
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setSaving(null)
    }
  }

  const uploadMedia = async (field: 'dashboard' | 'exterior' | 'interior' | 'damage', file: Blob, ext: string) => {
    const path = await uploadWithSignedUrl('/api/admin/handovers/upload-url', { bookingId: booking.id, kind, field, ext }, file, 'handovers')
    const localUrl = URL.createObjectURL(file)
    if (field === 'damage') {
      const paths = [...(h.damage_photo_paths || []), path]
      await save({ damage_photo_paths: paths }, field)
      setH((prev: any) => ({ ...prev, damagePhotoUrls: [...(prev.damagePhotoUrls || []), localUrl] }))
    } else {
      const column = `${field === 'dashboard' ? 'dashboard_photo' : `${field}_video`}_path`
      await save({ [column]: path }, field)
      const urlKey = field === 'dashboard' ? 'dashboardPhotoUrl' : `${field}VideoUrl`
      setH((prev: any) => ({ ...prev, [urlKey]: localUrl }))
    }
  }

  const onPhoto = (field: 'dashboard' | 'damage') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSaving(field)
    try {
      const small = await compressImage(file)
      await uploadMedia(field, small, 'jpg')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const toggleCheck = (id: string) => {
    const checklist = { ...(h.checklist || {}), [id]: !(h.checklist || {})[id] }
    setH((prev: any) => ({ ...prev, checklist }))
    save({ checklist }, 'checklist').catch(() => {})
  }

  const finish = async () => {
    try {
      await save({ customer_signature: signature || h.customer_signature }, 'finish', true)
      router.refresh()
    } catch {}
  }

  const km = kmSummary(pickupKm, h.km, booking.num_nights, booking.km_package)
  const stepDone = (id: string) => steps.find(s => s.id === id)?.done

  return (
    <div className="adm-page ho">
      <Link href="/admin/bookings" className="ho-back"><ArrowLeft size={16} /> Reservas</Link>
      <AdminPageHeader
        title={title}
        description={`${booking.customer_name || 'Cliente'} · ${camper?.name || 'Camper'} · ${fmtDay(booking.start_date)} – ${fmtDay(booking.end_date)}`}
      />

      <div className="adm-card ho-progress" role="status">
        {isDone ? (
          <span className="ho-progress__done"><Check size={18} /> {kind === 'pickup' ? 'Entrega completada' : 'Devolución completada'} el {new Date(h.completed_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        ) : (
          <>
            <strong>{doneCount} de {steps.length} pasos</strong>
            <div className="ho-bar"><span className="ho-bar__fill" style={{ '--ho-fill': `${(doneCount / steps.length) * 100}%` } as React.CSSProperties} /></div>
          </>
        )}
      </div>

      {error && <div className="adm-note ho-error" role="alert"><AlertTriangle size={16} /> {error}</div>}

      {kind === 'pickup' && (
        <section className={`adm-card ho-step ${stepDone('license') ? 'ho-step--done' : ''}`}>
          <h2 className="ho-step__title"><IdCard size={18} /> 1. Comprobar el carnet de conducir</h2>
          <p className="ho-muted">
            {customer?.full_name || booking.customer_name} · Carnet {customer?.driver_license_id || 'sin número'}
            {customer?.driver_license_expiry_date ? ` · Caduca ${fmtDay(customer.driver_license_expiry_date)}` : ''}
            {customer?.verification_status !== 'verified' && <span className="adm-chip adm-chip--amber ho-chip">Documentación sin validar</span>}
          </p>
          {licensePhotos.length > 0 ? (
            <div className="ho-photos">
              {licensePhotos.map(url => <img key={url} src={url} alt="Carnet subido por el cliente" className="ho-photo" />)}
            </div>
          ) : (
            <p className="ho-muted">El cliente no ha subido fotos del carnet: compruébalo y pídele que las suba desde su perfil.</p>
          )}
          <label className="ho-check">
            <input
              type="checkbox"
              checked={Boolean(h.license_checked)}
              disabled={isDone || saving === 'license'}
              onChange={e => { const v = e.target.checked; setH((p: any) => ({ ...p, license_checked: v })); save({ license_checked: v }, 'license').catch(() => {}) }}
            />
            <span>He visto el carnet físico: coincide con la persona, está en vigor y tiene más de 2 años</span>
          </label>
        </section>
      )}

      <section className={`adm-card ho-step ${stepDone('km') ? 'ho-step--done' : ''}`}>
        <h2 className="ho-step__title"><Gauge size={18} /> {kind === 'pickup' ? '2' : '1'}. Kilómetros y cuadro de mando</h2>
        <div className="ho-row">
          <label className="ho-field">
            <span>Kilómetros</span>
            <input
              type="number" inputMode="numeric" min={0} className="adm-input" value={kmInput} disabled={isDone}
              onChange={e => setKmInput(e.target.value)}
              onBlur={() => kmInput !== '' && Number(kmInput) !== h.km && save({ km: Number(kmInput) }, 'km').catch(() => {})}
            />
          </label>
          <label className="ho-field">
            <span>Combustible</span>
            <select className="adm-input" value={h.fuel_level || ''} disabled={isDone} onChange={e => save({ fuel_level: e.target.value }, 'fuel').catch(() => {})}>
              <option value="">Elige…</option>
              {FUEL_LEVELS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        </div>
        {kind === 'return' && km && (
          <p className="ho-muted">
            Recorridos: <strong>{km.driven.toLocaleString('es-ES')} km</strong>
            {km.allowance !== null && ` de ${km.allowance.toLocaleString('es-ES')} incluidos`}
            {km.extra > 0 && <span className="adm-chip adm-chip--amber ho-chip">{km.extra.toLocaleString('es-ES')} km de más</span>}
          </p>
        )}
        {h.dashboardPhotoUrl && <img src={h.dashboardPhotoUrl} alt="Cuadro de mando" className="ho-photo ho-photo--wide" />}
        {!isDone && (
          <label className="adm-btn ho-upload">
            {saving === 'dashboard' ? <Loader2 size={16} className="ho-spin" /> : <Camera size={16} />}
            {h.dashboardPhotoUrl ? 'Repetir foto del cuadro' : 'Foto del cuadro (km y combustible)'}
            <input type="file" accept="image/*" capture="environment" className="ho-file" onChange={onPhoto('dashboard')} />
          </label>
        )}
      </section>

      {(['exterior', 'interior'] as const).map((side, i) => (
        <section key={side} className={`adm-card ho-step ${stepDone(side) ? 'ho-step--done' : ''}`}>
          <h2 className="ho-step__title"><Video size={18} /> {(kind === 'pickup' ? 3 : 2) + i}. Vídeo {side}</h2>
          {isDone ? (
            h[`${side}VideoUrl`] && <video src={h[`${side}VideoUrl`]} controls playsInline preload="metadata" className="ho-video" />
          ) : (
            <VideoRecorder
              label={side === 'exterior' ? 'Da una vuelta completa a la camper' : 'Recorre el interior despacio'}
              hint={side === 'exterior' ? 'Carrocería, ruedas, cristales y techo. Máximo 3 minutos.' : 'Tapicería, cocina, baño, cama y equipamiento. Máximo 3 minutos.'}
              uploadedUrl={h[`${side}VideoUrl`]}
              onUpload={(file, ext) => uploadMedia(side, file, ext)}
            />
          )}
        </section>
      ))}

      <section className={`adm-card ho-step ${stepDone('checklist') ? 'ho-step--done' : ''}`}>
        <h2 className="ho-step__title"><ListChecks size={18} /> {kind === 'pickup' ? '5' : '4'}. Revisión</h2>
        <div className="ho-list">
          {CHECKLIST[kind].map(item => (
            <label key={item.id} className="ho-check">
              <input type="checkbox" checked={Boolean((h.checklist || {})[item.id])} disabled={isDone} onChange={() => toggleCheck(item.id)} />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        <div className="ho-photos">
          {(h.damagePhotoUrls || []).map((url: string) => <img key={url} src={url} alt="Daño registrado" className="ho-photo" />)}
        </div>
        {!isDone && (
          <label className="adm-btn ho-upload">
            {saving === 'damage' ? <Loader2 size={16} className="ho-spin" /> : <Plus size={16} />}
            Añadir foto de un daño (opcional)
            <input type="file" accept="image/*" capture="environment" className="ho-file" onChange={onPhoto('damage')} />
          </label>
        )}
        <label className="ho-field">
          <span>Notas (opcional)</span>
          <textarea
            className="adm-input ho-notes" rows={3} defaultValue={h.notes || ''} disabled={isDone}
            onBlur={e => e.target.value !== (h.notes || '') && save({ notes: e.target.value }, 'notes').catch(() => {})}
          />
        </label>
      </section>

      <section className={`adm-card ho-step ${stepDone('signature') ? 'ho-step--done' : ''}`}>
        <h2 className="ho-step__title"><PenLine size={18} /> {kind === 'pickup' ? '6' : '5'}. Firma del cliente</h2>
        {h.customer_signature ? (
          <img src={h.customer_signature} alt="Firma del cliente" className="ho-signature" />
        ) : (
          <>
            <p className="ho-muted">
              El cliente confirma que ha visto el estado de la camper{kind === 'pickup' ? ' y la recibe así' : ' y la devuelve así'}, con los vídeos y fotos de esta {kind === 'pickup' ? 'entrega' : 'devolución'}.
            </p>
            <SignaturePad onChange={setSignature} />
          </>
        )}
      </section>

      {!isDone && (
        <div className="ho-finish">
          <button type="button" className="adm-btn adm-btn--primary ho-finish__btn" disabled={doneCount < steps.length || saving === 'finish'} onClick={finish}>
            {saving === 'finish' ? <Loader2 size={16} className="ho-spin" /> : <Check size={16} />}
            {kind === 'pickup' ? 'Entrega completada' : 'Devolución completada'}
          </button>
          {doneCount < steps.length && (
            <span className="ho-muted">Falta: {steps.filter(s => !s.done).map(s => s.label).join(', ')}</span>
          )}
        </div>
      )}

      <style jsx>{`
        .ho { display: flex; flex-direction: column; gap: 16px; padding-bottom: 40px; }
        .ho :global(.ho-back) { display: inline-flex; align-items: center; gap: 6px; color: var(--adm-text-3); font-size: 0.9rem; text-decoration: none; }
        .ho-progress { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
        .ho-progress__done { display: inline-flex; align-items: center; gap: 8px; color: var(--adm-sage); font-weight: 700; }
        .ho-bar { height: 8px; border-radius: 999px; background: var(--adm-surface-2); overflow: hidden; }
        .ho-bar__fill { display: block; height: 100%; width: var(--ho-fill); background: var(--adm-gold-fill); transition: width 0.3s; }
        .ho-error { display: flex; gap: 8px; align-items: center; color: var(--adm-rose); }
        .ho-step { padding: 20px; display: flex; flex-direction: column; gap: 14px; border-left: 4px solid var(--adm-border); }
        .ho-step--done { border-left-color: var(--adm-sage); }
        .ho-step__title { display: flex; align-items: center; gap: 8px; font-size: 1.05rem; margin: 0; }
        .ho-muted { color: var(--adm-text-3); font-size: 0.9rem; margin: 0; line-height: 1.5; }
        .ho :global(.ho-chip) { margin-left: 8px; }
        .ho-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ho-field { display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: var(--adm-text-2); }
        .ho-notes { resize: vertical; }
        .ho-photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(140px, 100%), 1fr)); gap: 10px; }
        .ho-photo { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 12px; border: 1px solid var(--adm-border); }
        .ho-photo--wide { aspect-ratio: auto; max-height: 280px; object-fit: contain; background: #000; }
        .ho-video { width: 100%; max-height: 60vh; border-radius: 14px; background: #000; }
        .ho-signature { max-width: 320px; width: 100%; background: #fbf8f2; border-radius: 12px; border: 1px solid var(--adm-border); }
        .ho-check { display: flex; align-items: flex-start; gap: 10px; font-size: 0.95rem; line-height: 1.4; cursor: pointer; min-height: 32px; }
        .ho-check input { width: 20px; height: 20px; margin-top: 1px; accent-color: var(--adm-gold-fill); flex-shrink: 0; }
        .ho-list { display: flex; flex-direction: column; gap: 10px; }
        .ho :global(.ho-upload) { align-self: flex-start; cursor: pointer; }
        .ho-file { display: none; }
        .ho-finish { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
        .ho :global(.ho-finish__btn) { min-height: 48px; padding: 0 24px; font-size: 1rem; }
        :global(.ho-spin) { animation: hospin 1s linear infinite; }
        @keyframes hospin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .ho-step { padding: 16px; }
          .ho-row { grid-template-columns: 1fr; }
          .ho :global(.ho-upload), .ho :global(.ho-finish__btn) { align-self: stretch; justify-content: center; min-height: 44px; }
          .ho-finish { align-items: stretch; }
        }
      `}</style>
    </div>
  )
}
