'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  FileText,
  PenTool,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  Calendar,
  Lock,
  Download,
  Loader2,
  ChevronRight
} from 'lucide-react'
import { generateContractData, ContractData } from '@/lib/contracts/contractEngine'
import { generateOfficialContractPdfBlob } from '@/lib/contracts/pdfGenerator'

interface Props {
  booking: any
  profile: any
  onClose: () => void
  onSigned: (signedAt: string, pdfUrl: string) => void
  contractTemplate?: any
}

export default function ContractSignModal({ booking, profile, onClose, onSigned, contractTemplate }: Props) {
  const [activeTab, setActiveTab] = useState<'read' | 'sign'>('read')
  const [hasDrawn, setHasDrawn] = useState(false)
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const contractData: ContractData = React.useMemo(() => {
    return generateContractData(booking, profile, undefined, contractTemplate)
  }, [booking, profile, contractTemplate])

  // Inicializar canvas con escalado Retina / Hi-DPI
  useEffect(() => {
    if (activeTab !== 'sign') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#1A2B21'
  }, [activeTab])

  // Manejo de eventos de dibujo (soporta Mouse, Touch y Stylus)
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Ignorar si el puntero no es capturable
    }
    isDrawingRef.current = true
    const { x, y } = getCoordinates(e)
    lastPointRef.current = { x, y }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.arc(x, y, 1.2, 0, Math.PI * 2)
      ctx.fillStyle = '#1A2B21'
      ctx.fill()
    }
    setHasDrawn(true)
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !lastPointRef.current) return

    const { x, y } = getCoordinates(e)

    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(x, y)
    ctx.stroke()

    lastPointRef.current = { x, y }
    setHasDrawn(true)
  }

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Ignorar si ya fue liberado
      }
      isDrawingRef.current = false
      lastPointRef.current = null
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleSubmitSignature = async () => {
    if (!hasDrawn) {
      setErrorMsg('Por favor, dibuja tu firma en el recuadro antes de confirmar.')
      return
    }
    if (!legalAccepted) {
      setErrorMsg('Debes aceptar expresamente los términos y condiciones del contrato.')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const signatureDataUrl = canvas.toDataURL('image/png')
      let signedAt = new Date().toISOString()
      let pdfUrl = ''

      try {
        const res = await fetch('/api/contracts/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: booking.id,
            signatureDataUrl
          })
        })

        const data = await res.json()
        if (res.ok) {
          signedAt = data.signedAt || signedAt
          pdfUrl = data.pdfUrl || ''
        } else if (!booking.id?.startsWith('bk-')) {
          throw new Error(data.error || 'Error al registrar la firma del contrato.')
        }
      } catch (apiErr: any) {
        if (!booking.id?.startsWith('bk-')) {
          throw apiErr
        }
      }

      // Descarga automática en cliente del PDF firmado
      try {
        const { doc } = await generateOfficialContractPdfBlob(contractData, signatureDataUrl)
        doc.save(`${contractData.contractNumber}_Contrato_Firmado.pdf`)
      } catch (pdfErr) {
        console.warn('Auto download error:', pdfErr)
      }

      onSigned(signedAt, pdfUrl)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión al firmar el contrato.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="csm-backdrop" onClick={onClose}>
      <div className="csm-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="csm-header">
          <div className="csm-header-info">
            <div className="csm-icon-wrap">
              <ShieldCheck size={22} className="csm-icon" />
            </div>
            <div>
              <div className="csm-badge-row">
                <h3 className="csm-title">Contrato Oficial de Alquiler</h3>
                <span className="csm-ref-badge">{contractData.contractNumber}</span>
              </div>
              <p className="csm-sub">
                Vehículo: <strong>{contractData.vehicle.modelName}</strong> ({contractData.vehicle.plateNumber}) · Base Mallorca
              </p>
            </div>
          </div>

          <button onClick={onClose} className="csm-close-btn" title="Cerrar ventana">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="csm-tabs">
          <button
            onClick={() => setActiveTab('read')}
            className={`csm-tab-btn ${activeTab === 'read' ? 'csm-tab-btn--active' : ''}`}
          >
            <FileText size={16} />
            <span>1. Lectura del Contrato</span>
          </button>
          <button
            onClick={() => setActiveTab('sign')}
            className={`csm-tab-btn ${activeTab === 'sign' ? 'csm-tab-btn--active' : ''}`}
          >
            <PenTool size={16} />
            <span>2. Firma Digital</span>
            {hasDrawn && <span className="csm-tab-dot" />}
          </button>
        </div>

        {/* Content Body */}
        <div className="csm-body">
          {errorMsg && (
            <div className="csm-error-banner">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'read' ? (
            <div className="csm-contract-viewer">
              {/* Resumen Oficial */}
              <div className="csm-summary-card">
                <div className="csm-card-header">
                  <span className="csm-card-kicker">UTOPIA VAN LIFE S.L. · CIF B24902637</span>
                  <h4 className="csm-card-title">Resumen de las Partes y Condiciones Particulares</h4>
                </div>

                <div className="csm-parties-grid">
                  <div className="csm-party-box">
                    <span className="csm-party-label">Arrendador</span>
                    <strong className="csm-party-name">{contractData.lessor.companyName}</strong>
                    <div className="csm-party-detail">CIF: {contractData.lessor.cif}</div>
                    <div className="csm-party-detail">Representante: {contractData.lessor.representative}</div>
                    <div className="csm-party-detail">{contractData.lessor.city}</div>
                  </div>

                  <div className="csm-party-box">
                    <span className="csm-party-label">Arrendatario (Titular)</span>
                    <strong className="csm-party-name">{contractData.lessee.fullName}</strong>
                    <div className="csm-party-detail">DNI / NIE: {contractData.lessee.dniNie}</div>
                    <div className="csm-party-detail">Carné: {contractData.lessee.driverLicenseId} ({contractData.lessee.yearsHeld} años)</div>
                    <div className="csm-party-detail">{contractData.lessee.phone}</div>
                  </div>
                </div>

                <div className="csm-vehicle-strip">
                  <div className="csm-v-item">
                    <Truck size={16} />
                    <span><strong>Vehículo:</strong> {contractData.vehicle.modelName}</span>
                  </div>
                  <div className="csm-v-item">
                    <span><strong>Matrícula:</strong> {contractData.vehicle.plateNumber}</span>
                  </div>
                  <div className="csm-v-item">
                    <Calendar size={16} />
                    <span><strong>Periodo:</strong> {contractData.booking.startDate} al {contractData.booking.endDate}</span>
                  </div>
                  <div className="csm-v-item">
                    <span><strong>Fianza:</strong> 1.000,00 €</span>
                  </div>
                </div>
              </div>

              {/* Lista Completa de Artículos Legales */}
              <div className="csm-articles-list">
                <h4 className="csm-articles-heading">Condiciones Generales del Contrato (17 Artículos)</h4>

                {contractData.articles.map(art => (
                  <div key={art.number} className="csm-article-item">
                    <div className="csm-art-title">
                      <span className="csm-art-num">Art. {art.number}</span>
                      <strong>{art.title}</strong>
                    </div>
                    <div className="csm-art-body">
                      {art.content.map((p, idx) => (
                        <p key={idx} className={p.startsWith('•') ? 'csm-bullet' : ''}>{p}</p>
                      ))}
                    </div>
                  </div>
                ))}

                {/* RGPD */}
                <div className="csm-article-item csm-rgpd-item">
                  <div className="csm-art-title">
                    <span className="csm-art-num">RGPD</span>
                    <strong>Protección de Datos de Carácter Personal</strong>
                  </div>
                  <div className="csm-art-body">
                    <p><strong>Responsable:</strong> {contractData.rgpdText.responsable}</p>
                    <p><strong>Finalidad:</strong> {contractData.rgpdText.finalidad}</p>
                    <p><strong>Legitimación:</strong> {contractData.rgpdText.legitimacion}</p>
                    <p><strong>Derechos:</strong> {contractData.rgpdText.derechos}</p>
                  </div>
                </div>
              </div>

              <div className="csm-read-footer">
                <button onClick={() => setActiveTab('sign')} className="csm-btn-primary">
                  <span>Continuar a la Firma Digital</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="csm-signature-view">
              <div className="csm-sign-prompt">
                <PenTool size={20} className="csm-pen-icon" />
                <div>
                  <h4 className="csm-sign-title">Dibuja tu firma digital</h4>
                  <p className="csm-sign-desc">
                    Utiliza tu dedo en la pantalla de tu móvil/tablet o el ratón de tu ordenador para rubricar el contrato oficial.
                  </p>
                </div>
              </div>

              {/* Canvas Card */}
              <div className="csm-canvas-wrap">
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                  className="csm-canvas"
                />
                {!hasDrawn && (
                  <div className="csm-canvas-placeholder">
                    <span>Firma aquí con tu trazo</span>
                  </div>
                )}
              </div>

              <div className="csm-canvas-actions">
                <button onClick={clearCanvas} className="csm-clear-btn" type="button">
                  <RotateCcw size={14} />
                  <span>Borrar trazo</span>
                </button>
                <span className="csm-secure-notice">
                  <Lock size={12} /> Cifrado y sellado digital eIDAS
                </span>
              </div>

              {/* Legal Checkbox */}
              <label className="csm-legal-check">
                <input
                  type="checkbox"
                  checked={legalAccepted}
                  onChange={e => setLegalAccepted(e.target.checked)}
                />
                <span>
                  He leído íntegramente y acepto expresamente todas las cláusulas, condiciones generales y la política de privacidad de Utopia Van Life S.L.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="csm-actions-row">
                <button onClick={() => setActiveTab('read')} className="csm-btn-secondary" type="button">
                  Revisar Contrato
                </button>
                <button
                  onClick={handleSubmitSignature}
                  disabled={!hasDrawn || !legalAccepted || isSubmitting}
                  className="csm-btn-submit"
                  type="button"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="csm-spin" />
                      <span>Sellando y Guardando Contrato...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Confirmar y Firmar Contrato</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .csm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(6px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .csm-modal {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 820px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: csmFadeIn 0.2s ease-out;
        }

        @keyframes csmFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }

        .csm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid #E2E8F0;
          background: #F8FAFC;
        }

        .csm-header-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .csm-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #1A2B21;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }

        .csm-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .csm-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1A2B21;
          margin: 0;
        }

        .csm-ref-badge {
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 8px;
          background: #E2E8F0;
          color: #475569;
          border-radius: 4px;
        }

        .csm-sub {
          font-size: 0.82rem;
          color: #64748B;
          margin: 2px 0 0 0;
        }

        .csm-close-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          background: transparent;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .csm-close-btn:hover {
          background: #E2E8F0;
          color: #0F172A;
        }

        .csm-tabs {
          display: flex;
          background: #F1F5F9;
          padding: 6px 12px 0;
          border-bottom: 1px solid #E2E8F0;
          gap: 8px;
        }

        .csm-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border: none;
          background: transparent;
          font-size: 0.88rem;
          font-weight: 600;
          color: #64748B;
          cursor: pointer;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          position: relative;
          transition: all 0.15s ease;
        }

        .csm-tab-btn--active {
          background: #ffffff;
          color: #1A2B21;
          box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.04);
        }

        .csm-tab-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
        }

        .csm-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .csm-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #B91C1C;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          margin-bottom: 16px;
        }

        /* Contract Viewer Styles */
        .csm-summary-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 18px;
          margin-bottom: 24px;
        }

        .csm-card-kicker {
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748B;
          letter-spacing: 0.5px;
        }

        .csm-card-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1A2B21;
          margin: 4px 0 14px 0;
        }

        .csm-parties-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }

        .csm-party-box {
          background: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 12px;
        }

        .csm-party-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          display: block;
        }

        .csm-party-name {
          font-size: 0.92rem;
          color: #1A2B21;
          display: block;
          margin-bottom: 4px;
        }

        .csm-party-detail {
          font-size: 0.78rem;
          color: #475569;
          line-height: 1.4;
        }

        .csm-vehicle-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          background: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.82rem;
          color: #334155;
        }

        .csm-v-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .csm-articles-list {
          margin-bottom: 24px;
        }

        .csm-articles-heading {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1A2B21;
          margin-bottom: 12px;
        }

        .csm-article-item {
          padding: 12px 14px;
          border-bottom: 1px solid #F1F5F9;
        }

        .csm-art-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.88rem;
          color: #1A2B21;
          margin-bottom: 4px;
        }

        .csm-art-num {
          background: #E2E8F0;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .csm-art-body p {
          font-size: 0.82rem;
          color: #475569;
          line-height: 1.5;
          margin: 3px 0;
        }

        .csm-art-body .csm-bullet {
          padding-left: 12px;
        }

        .csm-rgpd-item {
          background: #F8FAFC;
          border-radius: 8px;
          margin-top: 14px;
          border: 1px solid #E2E8F0;
        }

        .csm-read-footer {
          display: flex;
          justify-content: flex-end;
          padding-top: 14px;
        }

        /* Signature View Styles */
        .csm-signature-view {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .csm-sign-prompt {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 14px 16px;
        }

        .csm-pen-icon {
          color: #1A2B21;
          margin-top: 2px;
        }

        .csm-sign-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1A2B21;
          margin: 0 0 2px 0;
        }

        .csm-sign-desc {
          font-size: 0.82rem;
          color: #64748B;
          margin: 0;
        }

        .csm-canvas-wrap {
          position: relative;
          width: 100%;
          height: 180px;
          background: #ffffff;
          border: 2px dashed #94A3B8;
          border-radius: 12px;
          overflow: hidden;
          cursor: crosshair;
          touch-action: none;
        }

        .csm-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .csm-canvas-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          color: #94A3B8;
          font-size: 0.95rem;
          font-style: italic;
        }

        .csm-canvas-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .csm-clear-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          background: #ffffff;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .csm-clear-btn:hover {
          background: #F1F5F9;
          color: #0F172A;
        }

        .csm-secure-notice {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          color: #64748B;
        }

        .csm-legal-check {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.84rem;
          color: #334155;
          line-height: 1.4;
          cursor: pointer;
          padding: 10px 14px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
        }

        .csm-legal-check input {
          margin-top: 3px;
          accent-color: #1A2B21;
          width: 16px;
          height: 16px;
        }

        .csm-actions-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
        }

        .csm-btn-secondary {
          padding: 10px 18px;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          background: #ffffff;
          color: #334155;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
        }
        .csm-btn-secondary:hover {
          background: #F1F5F9;
        }

        .csm-btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          border: none;
          border-radius: 8px;
          background: #1A2B21;
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }
        .csm-btn-primary:hover {
          opacity: 0.92;
        }

        .csm-btn-submit {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          background: #1A2B21;
          color: #ffffff;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .csm-btn-submit:disabled {
          background: #CBD5E1;
          cursor: not-allowed;
        }
        .csm-btn-submit:not(:disabled):hover {
          background: #14221a;
          box-shadow: 0 4px 12px rgba(26, 43, 33, 0.2);
        }

        .csm-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .csm-parties-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
