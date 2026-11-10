'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Loader2, Pencil } from 'lucide-react'
import { bookingSecondDriver } from '@/lib/booking/secondDriver'
import {
  secondDriverRecordBlock,
  secondDriverRecordChanges,
  validateSecondDriverRecord,
  type SecondDriverRecord,
} from '@/lib/admin/secondDriverRecord'

interface Props {
  booking: any
  /** Columnas de la reserva ya guardadas (las que devuelve la ruta), para que el detalle se actualice */
  onSaved: (patch: Record<string, unknown>) => void
}

const FIELD_LABELS: Array<[keyof SecondDriverRecord, string]> = [
  ['fullName', 'Nombre y apellidos'],
  ['document', 'DNI, NIE o pasaporte'],
  ['licenseId', 'Número del carnet'],
  ['birthDate', 'Fecha de nacimiento'],
  ['licenseDate', 'Carnet expedido el'],
]

const fmtDay = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '')

/**
 * Ficha del segundo conductor de la reserva, editable por el administrador. Sirve para completar lo
 * que el checkout no guardó (documento, nº de carnet, fechas) o corregir un dato erróneo: mientras
 * falte, el cliente no puede subir su documentación y el contrato dice «Pendiente».
 */
export default function SecondDriverRecordEditor({ booking, onSaved }: Props) {
  const driver = bookingSecondDriver(booking)
  const blocked = secondDriverRecordBlock(booking)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<keyof SecondDriverRecord, string>>({
    fullName: '', document: '', licenseId: '', birthDate: '', licenseDate: '',
  })
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<{ message: string; field?: keyof SecondDriverRecord } | null>(null)
  const [done, setDone] = useState<{ message: string; warning?: string } | null>(null)

  if (!driver) return null

  const incomplete = !driver.fullName || !driver.document || !driver.licenseId || !driver.birthDate || !driver.licenseDate

  const startEditing = () => {
    setForm({
      fullName: driver.fullName,
      document: driver.document,
      licenseId: driver.licenseId,
      birthDate: driver.birthDate ?? '',
      licenseDate: driver.licenseDate ?? '',
    })
    setError(null)
    setDone(null)
    setConfirming(false)
    setOpen(true)
  }

  const send = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/bookings/second-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, ...form }),
      })
      const data = await res.json().catch(() => ({}))
      // Si la ruta no confirma, no se confirma nada: se enseña su mensaje y la ficha queda como estaba
      if (!res.ok || !data?.success) {
        setError({ message: data?.error || 'No se pudo guardar la ficha. No se ha cambiado nada.', field: data?.field })
        return
      }
      onSaved(data.booking || {})
      const changed: string[] = Array.isArray(data.changed) ? data.changed : []
      setDone({
        message: changed.length > 0 ? `Ficha guardada. Cambiado: ${changed.join(', ')}. Consta que lo has hecho tú.` : 'La ficha ya estaba así: no se ha cambiado nada.',
        warning: data.warning,
      })
      setOpen(false)
      setConfirming(false)
    } catch {
      setError({ message: 'No se pudo conectar con el servidor. No se ha cambiado nada: inténtalo de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // Las mismas reglas que aplica el servidor: así el fallo sale antes de pedir confirmación
    const checked = validateSecondDriverRecord(form, booking.start_date)
    if (!checked.ok) {
      setError({ message: checked.error, field: checked.field })
      return
    }
    // Cambiar a la persona que el contrato autoriza a conducir pide confirmación explícita
    const identityChanges = secondDriverRecordChanges(booking, checked.record).filter(c => c === 'nombre' || c === 'documento')
    const hadIdentity = Boolean(driver.fullName || driver.document)
    if (hadIdentity && identityChanges.length > 0 && !confirming) {
      setConfirming(true)
      return
    }
    void send()
  }

  return (
    <div className="sdr">
      {!open && (
        <>
          <dl className="sdr__facts">
            {FIELD_LABELS.map(([key, label]) => {
              const value = key === 'fullName' ? driver.fullName
                : key === 'document' ? driver.document
                : key === 'licenseId' ? driver.licenseId
                : key === 'birthDate' ? fmtDay(driver.birthDate)
                : fmtDay(driver.licenseDate)
              return (
                <div key={key} className="sdr__fact">
                  <dt>{label}</dt>
                  <dd>{value || <span className="adm-chip adm-chip--rose">Falta</span>}</dd>
                </div>
              )
            })}
          </dl>
          {blocked ? (
            <p className="sdr__muted">{blocked}</p>
          ) : (
            <button type="button" className="adm-btn adm-btn--sm sdr__edit" onClick={startEditing}>
              <Pencil size={14} /> {incomplete ? 'Completar la ficha' : 'Corregir la ficha'}
            </button>
          )}
        </>
      )}

      {done && (
        <div className="adm-note sdr__note" role="status">
          <Check size={16} aria-hidden="true" />
          <span>{done.message}{done.warning ? ` ${done.warning}` : ''}</span>
        </div>
      )}

      {open && (
        <form className="sdr__form" onSubmit={submit} noValidate>
          <div className="sdr__grid">
            {FIELD_LABELS.map(([key, label]) => (
              <label key={key} className="sdr__field">
                <span>{label}{key === 'licenseId' ? ' (opcional)' : ''}</span>
                <input
                  className="adm-input"
                  type={key === 'birthDate' || key === 'licenseDate' ? 'date' : 'text'}
                  value={form[key]}
                  maxLength={key === 'fullName' ? 120 : 40}
                  autoComplete="off"
                  disabled={saving}
                  aria-invalid={error?.field === key}
                  onChange={e => { setConfirming(false); setForm(prev => ({ ...prev, [key]: e.target.value })) }}
                />
              </label>
            ))}
          </div>
          <p className="sdr__muted">
            Se valida como en la reserva: nombre y documento reales, 25 años cumplidos y 2 de carnet en la fecha de recogida. Si dejas vacío el número del carnet, se conserva el que ya conste.
          </p>

          {error && (
            <div className="adm-note adm-note--alert sdr__note" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>{error.message}</span>
            </div>
          )}

          {confirming && (
            <div className="adm-note adm-note--alert sdr__note" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                Vas a cambiar la persona que el contrato autoriza a conducir. El contrato y los avisos pasarán a mostrar estos datos, y
                constará que lo has cambiado tú. Confirma solo si has comprobado el documento.
              </span>
            </div>
          )}

          <div className="sdr__actions">
            <button type="submit" className="adm-btn adm-btn--primary adm-btn--sm" disabled={saving}>
              {saving ? <Loader2 size={14} className="sdr__spin" /> : <Check size={14} />}
              {confirming ? 'Confirmar el cambio' : 'Guardar la ficha'}
            </button>
            <button type="button" className="adm-btn adm-btn--sm" disabled={saving} onClick={() => { setOpen(false); setConfirming(false); setError(null) }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <style jsx>{`
        .sdr { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
        .sdr__facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(180px, 100%), 1fr)); gap: 8px 14px; margin: 0; }
        .sdr__fact { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .sdr__fact dt { font-size: 0.75rem; color: var(--adm-text-3); text-transform: uppercase; letter-spacing: 0.04em; }
        .sdr__fact dd { margin: 0; font-weight: 600; color: var(--adm-text); overflow-wrap: anywhere; }
        .sdr__muted { margin: 0; font-size: 0.85rem; line-height: 1.5; color: var(--adm-text-3); }
        .sdr :global(.sdr__edit) { align-self: flex-start; }
        .sdr__form { display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px solid var(--adm-border); border-radius: 12px; background: var(--adm-surface-2); }
        .sdr__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .sdr__field { display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: var(--adm-text-2); min-width: 0; }
        .sdr__field input[aria-invalid='true'] { border-color: var(--adm-rose); }
        .sdr__note { display: flex; gap: 8px; align-items: flex-start; }
        .sdr__note :global(svg) { flex-shrink: 0; margin-top: 2px; }
        .sdr__actions { display: flex; flex-wrap: wrap; gap: 8px; }
        :global(.sdr__spin) { animation: sdrspin 1s linear infinite; }
        @keyframes sdrspin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .sdr__grid { grid-template-columns: 1fr; }
          .sdr__actions { flex-direction: column; }
          .sdr :global(.sdr__edit), .sdr__actions :global(.adm-btn) { align-self: stretch; justify-content: center; min-height: 44px; }
        }
      `}</style>
    </div>
  )
}
