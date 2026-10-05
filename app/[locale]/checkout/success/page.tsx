'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import {
  CheckCircle2,
  Ticket,
  ArrowRight,
  XCircle,
  FileText,
  Upload,
  AlertCircle,
  ShieldCheck,
  Clock,
  MessageCircle
} from 'lucide-react'
import { validateDriverLicense } from '@/lib/contracts/licenseValidator'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order') || searchParams.get('orderId') || searchParams.get('payment_intent') || ''
  const redirectStatus = searchParams.get('redirect_status') || 'succeeded'

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '34611560916'
  const whatsappText = encodeURIComponent(
    `Hola Utopia Van Life, acabo de abonar mi reserva${orderId ? ` con referencia #${orderId}` : ''}. ¿Podríais confirmarme cuando esté aprobada? ¡Muchas gracias!`
  )
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappText}`

  // Steps: 1 (Personal & License Data), 2 (Upload 4 Document Photos), 3 (Completed)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)

  // Step 1: Form Fields
  const [fullName, setFullName] = useState('')
  const [dniNie, setDniNie] = useState('')
  const [driverLicenseId, setDriverLicenseId] = useState('')
  const [driverLicenseIssueDate, setDriverLicenseIssueDate] = useState('')
  const [driverLicenseExpiryDate, setDriverLicenseExpiryDate] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  // Step 2: Files
  const [dniFront, setDniFront] = useState<File | null>(null)
  const [dniBack, setDniBack] = useState<File | null>(null)
  const [licenseFront, setLicenseFront] = useState<File | null>(null)
  const [licenseBack, setLicenseBack] = useState<File | null>(null)

  // Previews
  const [dniFrontPreview, setDniFrontPreview] = useState<string | null>(null)
  const [dniBackPreview, setDniBackPreview] = useState<string | null>(null)
  const [licenseFrontPreview, setLicenseFrontPreview] = useState<string | null>(null)
  const [licenseBackPreview, setLicenseBackPreview] = useState<string | null>(null)

  // Live validation on date changes
  useEffect(() => {
    if (driverLicenseIssueDate && driverLicenseExpiryDate) {
      const res = validateDriverLicense(driverLicenseIssueDate, driverLicenseExpiryDate)
      if (!res.isValid) {
        setErrorMessage(res.warningMessage || 'Revisa las fechas del carnet.')
        setWarningMessage(null)
      } else {
        setErrorMessage(null)
        setWarningMessage(res.warningMessage || null)
      }
    } else {
      setErrorMessage(null)
      setWarningMessage(null)
    }
  }, [driverLicenseIssueDate, driverLicenseExpiryDate])

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0] || null
    setFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  const handleGoToStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !dniNie || !driverLicenseId || !driverLicenseIssueDate || !driverLicenseExpiryDate || !address || !phone) {
      setErrorMessage('Por favor completa todos los campos requeridos.')
      return
    }

    const res = validateDriverLicense(driverLicenseIssueDate, driverLicenseExpiryDate)
    if (!res.isValid) {
      setErrorMessage(res.warningMessage || 'El carnet de conducir no cumple con los requisitos del seguro.')
      return
    }

    setErrorMessage(null)
    setStep(2)
  }

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dniFront || !dniBack || !licenseFront || !licenseBack) {
      setErrorMessage('Por favor sube las fotos de ambas caras del DNI y Carnet de Conducir.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('orderId', orderId)
      formData.append('fullName', fullName)
      formData.append('dniNie', dniNie)
      formData.append('driverLicenseId', driverLicenseId)
      formData.append('driverLicenseIssueDate', driverLicenseIssueDate)
      formData.append('driverLicenseExpiryDate', driverLicenseExpiryDate)
      formData.append('address', address)
      formData.append('phone', phone)

      // Mismos nombres que espera /api/upload-driver-docs (antes 'dniFront'… y las fotos se perdían)
      formData.append('dni_front', dniFront)
      formData.append('dni_back', dniBack)
      formData.append('license_front', licenseFront)
      formData.append('license_back', licenseBack)

      const response = await fetch('/api/upload-driver-docs', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Error al guardar la documentación.')
      }

      setStep(3)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión al enviar la documentación.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFailed = redirectStatus === 'failed' || redirectStatus === 'canceled'

  if (isFailed) {
    return (
      <div className="success-failed-wrap">
        <div className="success-failed-icon">
          <XCircle size={48} className="text-error" />
        </div>
        <h1 className="success-failed-title">Pago no completado</h1>
        <p className="success-failed-desc">
          Hubo un problema procesando tu pago mediante CaixaBank / TPV. La reserva no se ha formalizado.
        </p>
        <button className="btn-gold" onClick={() => router.push('/campers')}>
          Volver a intentarlo
        </button>

        <style jsx>{`
          .success-failed-wrap {
            text-align: center;
            padding: 80px 20px;
            max-width: 520px;
            margin: 0 auto;
          }
          .success-failed-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: #EF4444;
          }
          .success-failed-title {
            color: #FFFFFF;
            font-size: 1.8rem;
            font-weight: 800;
            margin-bottom: 12px;
          }
          .success-failed-desc {
            color: #94A3B8;
            margin-bottom: 28px;
            line-height: 1.6;
          }
          .btn-gold {
            background: linear-gradient(135deg, #CCA053 0%, #B2883B 100%);
            color: #0B0C0E;
            border: none;
            padding: 12px 28px;
            border-radius: 999px;
            font-weight: 700;
            cursor: pointer;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="success-container">
      {/* Top Banner */}
      <div className="success-banner">
        <div className="success-icon-wrap">
          <CheckCircle2 size={40} className="success-check-icon" strokeWidth={2.2} />
        </div>
        <h1 className="success-title">
          ¡Pago Recibido con Éxito!
        </h1>

        {/* Status Badge */}
        <div className="success-badge">
          <Clock size={16} />
          <span>Estado: Pendiente de confirmación por Utopia Van Life</span>
        </div>

        {orderId && (
          <p className="success-ref">
            Referencia de Pago Redsys: <strong>#{orderId}</strong>
          </p>
        )}

        <p className="success-desc">
          Hemos recibido tu abono a través de la pasarela segura Redsys y tus fechas están <strong>bloqueadas en el calendario</strong>. El equipo de Utopia Van Life confirmará formalmente tu reserva en breve.
        </p>

        {/* WhatsApp direct contact */}
        <div className="success-whatsapp-wrap">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="success-whatsapp-btn"
          >
            <MessageCircle size={18} />
            <span>Consultar por WhatsApp</span>
          </a>
        </div>
      </div>

      {step === 3 ? (
        <div className="success-completed-card">
          <ShieldCheck size={52} className="success-completed-icon" />
          <h2 className="success-completed-title">
            ¡Documentación Guardada con Éxito!
          </h2>
          <p className="success-completed-desc">
            El administrador revisará tus datos para aprobar la reserva. En cuanto esté confirmada, tendrás acceso a tu contrato oficial auto-rellenado para firma y descarga.
          </p>
          <p className="success-completed-desc">
            ¿Es tu primera reserva? Tu cuenta se ha creado con el email de la reserva:{' '}
            <Link href="/auth/recuperar">crea tu contraseña aquí</Link> para entrar en tu área.
          </p>
          <div className="success-completed-actions">
            <Link href="/dashboard/documentos" className="btn-gold">
              <FileText size={18} /> Ir a Mis Documentos
            </Link>
            <Link href="/dashboard" className="btn-dark-outline">
              <Ticket size={18} /> Ver Mi Aventura
            </Link>
          </div>
        </div>
      ) : (
        <div className="success-card">
          {/* Step Progress Indicators */}
          <div className="step-indicators">
            <div className="step-item">
              <div className={`step-disc ${step === 1 ? 'step-disc--active' : 'step-disc--done'}`}>
                {step === 1 ? '1' : '✓'}
              </div>
              <span className={`step-label ${step === 1 ? 'step-label--active' : ''}`}>
                1. Datos del Conductor
              </span>
            </div>
            <div className={`step-line ${step === 2 ? 'step-line--active' : ''}`} />
            <div className="step-item">
              <div className={`step-disc ${step === 2 ? 'step-disc--active' : ''}`}>
                2
              </div>
              <span className={`step-label ${step === 2 ? 'step-label--active' : ''}`}>
                2. Subir DNI y Carnet (4 caras)
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="alert-box alert-box--error">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {warningMessage && (
            <div className="alert-box alert-box--warn">
              <AlertCircle size={18} />
              <span>{warningMessage}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleGoToStep2} className="docs-form">
              <h3 className="docs-form-heading">
                Datos del Arrendatario Principal
              </h3>
              <p className="docs-form-sub">
                Requeridos por normativa de tráfico y el seguro a todo riesgo.
              </p>

              <div className="docs-form-grid">
                <div>
                  <label className="docs-label">Nombre y Apellidos Completos *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez García"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="docs-input"
                  />
                </div>

                <div>
                  <label className="docs-label">DNI / Pasaporte / Doc. Europeo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 12345678Z o Pasaporte"
                    value={dniNie}
                    onChange={e => setDniNie(e.target.value)}
                    className="docs-input"
                  />
                </div>

                <div>
                  <label className="docs-label">Número / ID Carnet de Conducir *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. B-12345678"
                    value={driverLicenseId}
                    onChange={e => setDriverLicenseId(e.target.value)}
                    className="docs-input"
                  />
                </div>

                <div>
                  <label className="docs-label">Teléfono de Contacto *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+34 600 000 000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="docs-input"
                  />
                </div>
              </div>

              <div className="docs-form-grid">
                <div>
                  <label className="docs-label">Fecha de Expedición del Carnet *</label>
                  <input
                    type="date"
                    required
                    value={driverLicenseIssueDate}
                    onChange={e => setDriverLicenseIssueDate(e.target.value)}
                    className="docs-input"
                  />
                </div>

                <div>
                  <label className="docs-label">Fecha de Caducidad del Carnet *</label>
                  <input
                    type="date"
                    required
                    value={driverLicenseExpiryDate}
                    onChange={e => setDriverLicenseExpiryDate(e.target.value)}
                    className="docs-input"
                  />
                </div>
              </div>

              <div className="docs-form-field">
                <label className="docs-label">Dirección Completa (Calle, Ciudad, Código Postal, País) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Calle Gran Vía 24, 3º B, 28013 Madrid, España"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="docs-input"
                />
              </div>

              <div className="docs-form-footer">
                <Link href="/dashboard" className="docs-skip-link">
                  Completar más tarde (Ir a mi panel)
                </Link>

                <button type="submit" className="btn-gold">
                  <span>Continuar al Paso 2</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitAll} className="docs-form">
              <h3 className="docs-form-heading">
                Subida de Documentos (Ambas Caras)
              </h3>
              <p className="docs-form-sub">
                Sube fotos claras o archivos en PDF/JPG de tu DNI/Pasaporte y Carnet de Conducir.
              </p>

              <div className="upload-grid">
                {/* DNI Front */}
                <div className="upload-box">
                  <span className="upload-box__title">1. DNI / Pasaporte (Anverso)</span>
                  {dniFrontPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dniFrontPreview} alt="DNI Front" className="upload-box__preview" />
                  ) : (
                    <div className="upload-box__placeholder">
                      <Upload size={32} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => handleFileChange(e, setDniFront, setDniFrontPreview)}
                    className="upload-box__input"
                  />
                </div>

                {/* DNI Back */}
                <div className="upload-box">
                  <span className="upload-box__title">2. DNI / Pasaporte (Reverso)</span>
                  {dniBackPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dniBackPreview} alt="DNI Back" className="upload-box__preview" />
                  ) : (
                    <div className="upload-box__placeholder">
                      <Upload size={32} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => handleFileChange(e, setDniBack, setDniBackPreview)}
                    className="upload-box__input"
                  />
                </div>

                {/* License Front */}
                <div className="upload-box">
                  <span className="upload-box__title">3. Carnet Conducir (Anverso)</span>
                  {licenseFrontPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={licenseFrontPreview} alt="Carnet Front" className="upload-box__preview" />
                  ) : (
                    <div className="upload-box__placeholder">
                      <Upload size={32} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => handleFileChange(e, setLicenseFront, setLicenseFrontPreview)}
                    className="upload-box__input"
                  />
                </div>

                {/* License Back */}
                <div className="upload-box">
                  <span className="upload-box__title">4. Carnet Conducir (Reverso)</span>
                  {licenseBackPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={licenseBackPreview} alt="Carnet Back" className="upload-box__preview" />
                  ) : (
                    <div className="upload-box__placeholder">
                      <Upload size={32} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => handleFileChange(e, setLicenseBack, setLicenseBackPreview)}
                    className="upload-box__input"
                  />
                </div>
              </div>

              <div className="docs-form-footer">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-dark-outline"
                >
                  ← Volver a Datos
                </button>

                <div className="docs-form-footer-right">
                  <Link href="/dashboard" className="docs-skip-link">
                    Subir más tarde
                  </Link>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-gold"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar y Enviar'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      <style jsx>{`
        .success-container {
          max-width: 780px;
          margin: 0 auto;
          color: #F8FAFC;
        }

        .success-banner {
          text-align: center;
          margin-bottom: 36px;
        }

        .success-icon-wrap {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        :global(.success-check-icon) {
          color: #22C55E;
        }

        .success-title {
          font-size: clamp(1.8rem, 2.8vw, 2.4rem);
          font-weight: 800;
          color: #FFFFFF;
          margin: 0 0 12px;
          letter-spacing: -0.02em;
        }

        .success-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 18px;
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.35);
          color: #E8CA7C;
          border-radius: 999px;
          font-size: 0.86rem;
          font-weight: 600;
          margin-bottom: 14px;
        }

        .success-ref {
          font-size: 0.88rem;
          color: #94A3B8;
          margin: 0 0 12px;
        }

        .success-ref strong {
          color: #FFFFFF;
        }

        .success-desc {
          color: #94A3B8;
          max-width: 580px;
          margin: 0 auto 20px;
          font-size: 0.96rem;
          line-height: 1.6;
        }

        .success-desc strong {
          color: #FFFFFF;
        }

        .success-whatsapp-wrap {
          margin-bottom: 28px;
        }

        .success-whatsapp-btn {
          background: rgba(37, 211, 102, 0.15);
          border: 1px solid rgba(37, 211, 102, 0.4);
          color: #25D366;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .success-whatsapp-btn:hover {
          background: rgba(37, 211, 102, 0.25);
          transform: translateY(-2px);
        }

        .success-completed-card {
          background: #131518;
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 24px;
          padding: 40px 32px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }

        :global(.success-completed-icon) {
          color: #22C55E;
          margin: 0 auto 16px;
        }

        .success-completed-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0 0 10px;
        }

        .success-completed-desc {
          color: #94A3B8;
          max-width: 500px;
          margin: 0 auto 28px;
          font-size: 0.96rem;
          line-height: 1.6;
        }

        .success-completed-actions {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .success-card {
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: clamp(24px, 4vw, 40px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }

        .step-indicators {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .step-disc {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          color: #94A3B8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .step-disc--active {
          background: linear-gradient(135deg, #CCA053 0%, #B2883B 100%);
          color: #0B0C0E;
          box-shadow: 0 2px 8px rgba(204, 160, 83, 0.4);
        }

        .step-disc--done {
          background: #22C55E;
          color: #FFFFFF;
        }

        .step-label {
          font-weight: 600;
          color: #64748B;
          font-size: 0.9rem;
        }

        .step-label--active {
          color: #FFFFFF;
        }

        .step-line {
          height: 2px;
          flex: 1;
          background: rgba(255, 255, 255, 0.08);
          margin: 0 16px;
        }

        .step-line--active {
          background: #CCA053;
        }

        .alert-box {
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
        }

        .alert-box--error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #FCA5A5;
        }

        .alert-box--warn {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #FCD34D;
        }

        .docs-form {
          display: flex;
          flex-direction: column;
        }

        .docs-form-heading {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 6px;
          color: #FFFFFF;
        }

        .docs-form-sub {
          color: #94A3B8;
          font-size: 0.88rem;
          margin: 0 0 24px;
        }

        .docs-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 18px;
        }

        .docs-form-field {
          margin-bottom: 24px;
        }

        .docs-label {
          display: block;
          font-size: 0.86rem;
          font-weight: 600;
          color: #E2E8F0;
          margin-bottom: 6px;
        }

        .docs-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: #0B0C0E;
          color: #FFFFFF;
          font-size: 0.92rem;
          outline: none;
          transition: all 0.2s ease;
        }

        .docs-input:focus {
          border-color: #CCA053;
          box-shadow: 0 0 0 3px rgba(204, 160, 83, 0.18);
        }

        .docs-form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 24px;
          margin-top: 12px;
        }

        .docs-form-footer-right {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .docs-skip-link {
          color: #94A3B8;
          font-size: 0.9rem;
          text-decoration: underline;
          transition: color 0.2s ease;
        }

        .docs-skip-link:hover {
          color: #CCA053;
        }

        .btn-gold {
          background: linear-gradient(135deg, #CCA053 0%, #B2883B 100%);
          color: #0B0C0E;
          border: none;
          padding: 12px 28px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(204, 160, 83, 0.35);
        }

        .btn-dark-outline {
          background: rgba(255, 255, 255, 0.05);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 12px 24px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.92rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-dark-outline:hover {
          border-color: #CCA053;
          color: #CCA053;
        }

        /* UPLOAD GRID */
        .upload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }

        .upload-box {
          border: 2px dashed rgba(204, 160, 83, 0.3);
          border-radius: 14px;
          padding: 16px;
          text-align: center;
          background: #0B0C0E;
          transition: border-color 0.2s ease;
        }

        .upload-box:hover {
          border-color: #CCA053;
        }

        .upload-box__title {
          display: block;
          font-size: 0.84rem;
          font-weight: 700;
          color: #E2E8F0;
          margin-bottom: 10px;
        }

        .upload-box__preview {
          width: 100%;
          height: 110px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 10px;
        }

        .upload-box__placeholder {
          height: 110px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748B;
        }

        .upload-box__input {
          font-size: 0.78rem;
          width: 100%;
          color: #94A3B8;
        }

        @media (max-width: 640px) {
          .success-card,
          .success-completed-card {
            padding: 24px 18px;
            border-radius: 20px;
          }

          .step-indicators {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .step-line {
            display: none;
          }

          .docs-form-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .btn-gold,
          .btn-dark-outline {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 110, paddingBottom: 80, minHeight: '85vh', background: '#0B0C0E' }}>
        <div className="container">
          <Suspense fallback={<div className="skeleton" style={{ height: 400, background: '#131518', borderRadius: 24 }} />}>
            <SuccessContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  )
}
