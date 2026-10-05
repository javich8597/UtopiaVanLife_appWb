'use client'

import { useMemo, useState } from 'react'
import { Link } from '@/i18n/routing'
import { Download, FileSignature, FileText, IdCard, Loader2, ChevronRight, Check, Clock } from 'lucide-react'
import { generateContractData } from '@/lib/contracts/contractEngine'
import { generateOfficialContractPdfBlob } from '@/lib/contracts/pdfGenerator'
import { getLicenseState, pickCurrentBooking } from '@/lib/user/tripState'
import { downloadReceiptPdf, receiptReference } from '@/lib/user/receiptPdf'
import ContractSignModal from './ContractSignModal'

interface Props {
  bookings: any[]
  profile: any
  user: any
  contractTemplate?: any
}

type Signed = Record<string, { signedAt: string; signature?: string }>

const fmtDay = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtRange = (a: string, b: string) =>
  `${new Date(a).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${fmtDay(b)}`

function extrasOf(booking: any): string[] {
  const raw = booking?.extras_selected || booking?.extras || booking?.booking_extras
  const list = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return raw.split(',') } })() : raw
  if (!Array.isArray(list)) return []
  return list
    .map((x: any) => (typeof x === 'string' ? x.trim() : `${x?.name_es || x?.name || x?.extra?.name_es || ''}${x?.quantity > 1 ? ` ×${x.quantity}` : ''}`))
    .filter(Boolean)
}

export default function DocumentsClient({ bookings, profile, user, contractTemplate }: Props) {
  const [signingBooking, setSigningBooking] = useState<any | null>(null)
  const [signed, setSigned] = useState<Signed>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const safeProfile = useMemo(() => ({
    ...profile,
    full_name: profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    email: profile?.email || user?.email || '',
  }), [profile, user])

  const current = pickCurrentBooking(bookings || [])
  const past = (bookings || []).filter(b => b.status === 'completed')
  const license = getLicenseState(profile)

  const signedAt = (b: any) => signed[b.id]?.signedAt || b.contract_signed_at || null

  const downloadContract = async (b: any) => {
    setBusy(`ctr-${b.id}`)
    setError(null)
    try {
      // El PDF archivado está en un bucket privado: lo regeneramos con la firma guardada.
      const signature = signed[b.id]?.signature || b.contract_signature
      const data = generateContractData(b, safeProfile, undefined, contractTemplate)
      const { doc } = await generateOfficialContractPdfBlob(data, signature)
      doc.save(`${data.contractNumber}_contrato.pdf`)
    } catch {
      setError('No hemos podido generar el PDF. Inténtalo de nuevo o escríbenos.')
    } finally {
      setBusy(null)
    }
  }

  const downloadReceipt = async (b: any) => {
    setBusy(`rcp-${b.id}`)
    setError(null)
    try {
      const contract = generateContractData(b, safeProfile, undefined, contractTemplate)
      await downloadReceiptPdf({ contract, booking: b, extras: extrasOf(b) })
    } catch {
      setError('No hemos podido generar el justificante. Inténtalo de nuevo o escríbenos.')
    } finally {
      setBusy(null)
    }
  }

  const isPaid = (b: any) => b.payment_status === 'paid' || b.status === 'confirmed' || b.status === 'active' || b.status === 'completed'

  return (
    <div className="docs">
      <header className="usr-page-head">
        <div>
          <span className="usr-page-head__eyebrow">Documentos</span>
          <h1 className="usr-page-head__title">Tu documentación</h1>
          <p className="usr-page-head__desc">Lo que necesitas para recoger la camper y los justificantes de tus viajes.</p>
        </div>
      </header>

      {error && <p className="docs-error" role="alert">{error}</p>}

      {current ? (
        <section className="docs-group" aria-labelledby="docs-current">
          <h2 id="docs-current" className="docs-group__title">
            Viaje del {fmtRange(current.start_date, current.end_date)}
          </h2>
          <ul className="usr-card docs-list">
            {/* Contrato */}
            <li className="docs-row">
              <span className="docs-row__icon"><FileSignature size={20} aria-hidden="true" /></span>
              <span className="docs-row__text">
                <strong>Contrato de alquiler</strong>
                <span>
                  {signedAt(current)
                    ? `Firmado el ${fmtDay(signedAt(current))}`
                    : 'Revísalo y fírmalo antes de la recogida'}
                </span>
              </span>
              {signedAt(current)
                ? <span className="usr-chip usr-chip--sage"><Check size={12} aria-hidden="true" /> Firmado</span>
                : <span className="usr-chip usr-chip--amber">Pendiente</span>}
              <span className="docs-row__actions">
                {!signedAt(current) && (
                  <button type="button" className="usr-btn usr-btn--primary" onClick={() => setSigningBooking(current)}>
                    Leer y firmar
                  </button>
                )}
                <button
                  type="button"
                  className="usr-btn"
                  onClick={() => downloadContract(current)}
                  disabled={busy === `ctr-${current.id}`}
                  aria-label="Descargar contrato en PDF"
                >
                  {busy === `ctr-${current.id}` ? <Loader2 size={16} className="docs-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                  PDF
                </button>
              </span>
            </li>

            {/* Justificante */}
            <li className="docs-row">
              <span className="docs-row__icon"><FileText size={20} aria-hidden="true" /></span>
              <span className="docs-row__text">
                <strong>Justificante de reserva y pago</strong>
                <span>{isPaid(current) ? `Referencia ${receiptReference(current.id)}` : 'Disponible cuando se complete el pago'}</span>
              </span>
              {isPaid(current)
                ? <span className="usr-chip usr-chip--sage"><Check size={12} aria-hidden="true" /> Pagado</span>
                : <span className="usr-chip usr-chip--amber">Sin pagar</span>}
              <span className="docs-row__actions">
                <button
                  type="button"
                  className="usr-btn"
                  onClick={() => downloadReceipt(current)}
                  disabled={!isPaid(current) || busy === `rcp-${current.id}`}
                  aria-label="Descargar justificante en PDF"
                >
                  {busy === `rcp-${current.id}` ? <Loader2 size={16} className="docs-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                  PDF
                </button>
              </span>
            </li>

            {/* Carnet */}
            <li className="docs-row">
              <span className="docs-row__icon"><IdCard size={20} aria-hidden="true" /></span>
              <span className="docs-row__text">
                <strong>Carnet de conducir</strong>
                <span>
                  {license === 'verified' && 'Validado por nuestro equipo'}
                  {license === 'review' && 'Lo estamos revisando'}
                  {license === 'missing' && 'Súbelo desde tu perfil'}
                  {license === 'rejected' && 'No se pudo validar, vuelve a subirlo'}
                </span>
              </span>
              {license === 'verified' && <span className="usr-chip usr-chip--sage"><Check size={12} aria-hidden="true" /> Validado</span>}
              {license === 'review' && <span className="usr-chip usr-chip--sky"><Clock size={12} aria-hidden="true" /> En revisión</span>}
              {(license === 'missing' || license === 'rejected') && <span className="usr-chip usr-chip--amber">Pendiente</span>}
              <span className="docs-row__actions">
                <Link href="/dashboard/profile" className="usr-btn">
                  {license === 'verified' || license === 'review' ? 'Ver' : 'Subir'}
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </span>
            </li>
          </ul>
        </section>
      ) : (
        <section className="usr-card docs-empty">
          <h2>No tienes ningún viaje en curso</h2>
          <p>Cuando reserves, aquí tendrás el contrato y el justificante de pago.</p>
          <Link href="/campers" className="usr-btn usr-btn--primary">Ver las campers</Link>
        </section>
      )}

      {past.length > 0 && (
        <section className="docs-group" aria-labelledby="docs-past">
          <h2 id="docs-past" className="docs-group__title">Viajes anteriores</h2>
          <ul className="usr-card docs-list">
            {past.map(b => (
              <li key={b.id} className="docs-row">
                <span className="docs-row__icon docs-row__icon--soft"><FileText size={20} aria-hidden="true" /></span>
                <span className="docs-row__text">
                  <strong>Camper {b.camper?.name || 'NEO'}</strong>
                  <span>{fmtRange(b.start_date, b.end_date)}</span>
                </span>
                <span className="docs-row__actions">
                  {(b.contract_signed_at || b.contract_pdf_url) && (
                    <button type="button" className="usr-btn" onClick={() => downloadContract(b)} disabled={busy === `ctr-${b.id}`}>
                      <Download size={16} aria-hidden="true" /> Contrato
                    </button>
                  )}
                  <button type="button" className="usr-btn" onClick={() => downloadReceipt(b)} disabled={busy === `rcp-${b.id}`}>
                    <Download size={16} aria-hidden="true" /> Justificante
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="docs-foot">
        ¿Necesitas una factura a nombre de una empresa u otro documento? Escríbenos a WhatsApp y te lo enviamos.
      </p>

      {signingBooking && (
        <ContractSignModal
          booking={signingBooking}
          profile={safeProfile}
          contractTemplate={contractTemplate}
          onClose={() => setSigningBooking(null)}
          onSigned={(at, signature) => setSigned(prev => ({ ...prev, [signingBooking.id]: { signedAt: at, signature } }))}
        />
      )}

      <style jsx global>{`
        .docs {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
        }
        .docs-error {
          margin: 0;
          padding: 12px 16px;
          border-radius: 12px;
          background: var(--usr-rose-soft);
          color: var(--usr-rose);
          font-size: 0.88rem;
        }
        .docs-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .docs-group__title {
          margin: 0;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--usr-text-3);
        }
        .docs-list {
          margin: 0;
          padding: 4px 24px;
          list-style: none;
        }
        .docs-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 16px;
          min-height: 76px;
          padding: 14px 0;
        }
        .docs-row + .docs-row {
          border-top: 1px solid var(--usr-border);
        }
        .docs-row__icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--usr-primary-bg);
          color: var(--usr-primary-text);
        }
        .docs-row__icon--soft {
          background: var(--usr-surface-2);
          color: var(--usr-text-2);
        }
        .docs-row__text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .docs-row__text strong {
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--usr-text);
        }
        .docs-row__text span {
          font-size: 0.82rem;
          color: var(--usr-text-3);
        }
        .docs-row__actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .docs-row__actions .usr-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .docs-spin {
          animation: docsSpin 0.9s linear infinite;
        }
        @keyframes docsSpin {
          to { transform: rotate(360deg); }
        }
        .docs-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 44px 24px;
          text-align: center;
        }
        .docs-empty h2 {
          margin: 0;
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--usr-text);
        }
        .docs-empty p {
          margin: 0 0 10px;
          color: var(--usr-text-2);
        }
        .docs-foot {
          margin: 0;
          font-size: 0.84rem;
          color: var(--usr-text-3);
        }

        @media (max-width: 640px) {
          .docs-list {
            padding: 4px 16px;
          }
          .docs-row {
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 12px;
          }
          .docs-row__actions {
            grid-column: 1 / -1;
            justify-content: stretch;
          }
          .docs-row__actions .usr-btn {
            flex: 1;
          }
          .docs-row__icon {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </div>
  )
}
