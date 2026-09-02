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
  ShieldCheck
} from 'lucide-react'
import { validateDriverLicense } from '@/lib/contracts/licenseValidator'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectStatus = searchParams.get('redirect_status') || 'succeeded'

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
    if (!res.isValid && res.isExpired) {
      setErrorMessage(res.warningMessage || 'El carnet de conducir no puede estar caducado.')
      return
    }

    setErrorMessage(null)
    setStep(2)
  }

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('fullName', fullName)
      formData.append('dniNie', dniNie)
      formData.append('driverLicenseId', driverLicenseId)
      formData.append('driverLicenseIssueDate', driverLicenseIssueDate)
      formData.append('driverLicenseExpiryDate', driverLicenseExpiryDate)
      formData.append('address', address)
      formData.append('phone', phone)

      if (dniFront) formData.append('dni_front', dniFront)
      if (dniBack) formData.append('dni_back', dniBack)
      if (licenseFront) formData.append('license_front', licenseFront)
      if (licenseBack) formData.append('license_back', licenseBack)

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
      <div style={{ textAlign: 'center', paddingBlock: 'var(--space-12)' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <XCircle size={48} style={{ color: 'var(--error)' }} />
        </div>
        <h1 className="text-h2" style={{ marginBottom: 12 }}>Pago no completado</h1>
        <p className="text-body" style={{ color: 'var(--gray-600)', maxWidth: 460, margin: '0 auto 28px' }}>
          Hubo un problema procesando tu pago mediante CaixaBank / TPV. La reserva no se ha formalizado.
        </p>
        <button className="btn btn-forest" onClick={() => router.push('/campers')}>
          Volver a intentarlo
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 76,
          height: 76,
          borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <CheckCircle2 size={44} style={{ color: '#16a34a' }} strokeWidth={2} />
        </div>
        <h1 className="text-h2" style={{ marginBottom: 8, fontSize: 'clamp(1.7rem, 2.5vw, 2.2rem)' }}>
          ¡Pago Recibido y Reserva Registrada!
        </h1>
        <p className="text-body" style={{ color: 'var(--gray-600)', maxWidth: 540, margin: '0 auto', fontSize: '1rem', lineHeight: 1.5 }}>
          Hemos registrado tu solicitud de reserva. Para que el administrador pueda revisarla, emitir y auto-rellenar tu <strong>contrato de alquiler</strong>, necesitamos tus datos de conductor.
        </p>
      </div>

      {step === 3 ? (
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 'var(--radius-lg)',
          padding: '36px 28px',
          textAlign: 'center'
        }}>
          <ShieldCheck size={52} style={{ color: '#16a34a', margin: '0 auto 14px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#14532D', marginBottom: 8 }}>
            ¡Documentación Guardada con Éxito!
          </h2>
          <p style={{ color: '#166534', maxWidth: 480, margin: '0 auto 24px', fontSize: '0.95rem', lineHeight: 1.5 }}>
            El administrador revisará tus datos para aprobar la reserva. En cuanto esté confirmada, tendrás acceso a tu contrato oficial auto-rellenado para firma y descarga.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/documentos" className="btn btn-forest">
              <FileText size={18} /> Ir a Mis Documentos
            </Link>
            <Link href="/dashboard" className="btn btn-outline">
              <Ticket size={18} /> Ver Mi Aventura
            </Link>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(20px, 4vw, 36px)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Step Progress Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: step === 1 ? 'var(--forest-green)' : '#16a34a',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>
                {step === 1 ? '1' : '✓'}
              </div>
              <span style={{ fontWeight: 600, color: step === 1 ? 'var(--forest-green)' : 'var(--gray-700)', fontSize: '0.92rem' }}>
                1. Datos del Conductor
              </span>
            </div>
            <div style={{ height: 2, flex: 1, background: step === 2 ? 'var(--forest-green)' : 'var(--gray-200)', margin: '0 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: step === 2 ? 'var(--forest-green)' : 'var(--gray-200)',
                color: step === 2 ? 'white' : 'var(--gray-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>
                2
              </div>
              <span style={{ fontWeight: 600, color: step === 2 ? 'var(--forest-green)' : 'var(--gray-400)', fontSize: '0.92rem' }}>
                2. Subir DNI y Carnet (4 caras)
              </span>
            </div>
          </div>

          {errorMessage && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px 16px', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {warningMessage && (
            <div style={{ background: '#FEFCE8', border: '1px solid #FDE047', color: '#854D0E', padding: '12px 16px', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              <span>{warningMessage}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleGoToStep2}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 18, color: 'var(--gray-900)' }}>
                Información para el Contrato de Arrendamiento
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
                    Nombre y Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez García"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: '0.92rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
                    DNI / Pasaporte / Doc. Europeo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 12345678Z o Pasaporte"
                    value={dniNie}
                    onChange={e => setDniNie(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: '0.92rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
                    Número / ID Carnet de Conducir *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. B-12345678"
                    value={driverLicenseId}
                    onChange={e => setDriverLicenseId(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: '0.92rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
                    Teléfono de Contacto *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+34 600 000 000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: '0.92rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
                    Fecha de Expedición del Carnet *
                  </label>
                  <input
                    type="date"
                    required
                    value={driverLicenseIssueDate}
                    onChange={e => setDriverLicenseIssueDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: '0.92rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
                    Fecha de Caducidad del Carnet *
                  </label>
                  <input
                    type="date"
                    required
                    value={driverLicenseExpiryDate}
                    onChange={e => setDriverLicenseExpiryDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: '0.92rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
                  Dirección Completa (Calle, Ciudad, Código Postal, País) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Calle Gran Vía 24, 3º B, 28013 Madrid, España"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: '0.92rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <Link href="/dashboard" style={{ color: 'var(--gray-500)', fontSize: '0.9rem', textDecoration: 'underline' }}>
                  Completar más tarde (Ir a mi panel)
                </Link>

                <button type="submit" className="btn btn-forest" style={{ padding: '12px 28px' }}>
                  <span>Continuar al Paso 2</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitAll}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: 'var(--gray-900)' }}>
                Subida de Documentos (Ambas Caras)
              </h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '0.88rem', marginBottom: 20 }}>
                Sube fotos claras o archivos en PDF/JPG de tu DNI/Pasaporte y Carnet de Conducir.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
                {/* DNI Front */}
                <div style={{ border: '2px dashed var(--gray-300)', borderRadius: 10, padding: 14, textAlign: 'center', background: '#FAFAFA' }}>
                  <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>
                    1. DNI / Pasaporte (Anverso)
                  </span>
                  {dniFrontPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dniFrontPreview} alt="DNI Front" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                  ) : (
                    <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                      <Upload size={32} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => handleFileChange(e, setDniFront, setDniFrontPreview)}
                    style={{ fontSize: '0.78rem', width: '100%' }}
                  />
                </div>

                {/* DNI Back */}
                <div style={{ border: '2px dashed var(--gray-300)', borderRadius: 10, padding: 14, textAlign: 'center', background: '#FAFAFA' }}>
                  <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>
                    2. DNI / Pasaporte (Reverso)
                  </span>
                  {dniBackPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dniBackPreview} alt="DNI Back" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                  ) : (
                    <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                      <Upload size={32} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => handleFileChange(e, setDniBack, setDniBackPreview)}
                    style={{ fontSize: '0.78rem', width: '100%' }}
                  />
                </div>

                {/* License Front */}
                <div style={{ border: '2px dashed var(--gray-300)', borderRadius: 10, padding: 14, textAlign: 'center', background: '#FAFAFA' }}>
                  <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>
                    3. Carnet Conducir (Anverso)
                  </span>
                  {licenseFrontPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={licenseFrontPreview} alt="Carnet Front" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                  ) : (
                    <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                      <Upload size={32} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => handleFileChange(e, setLicenseFront, setLicenseFrontPreview)}
                    style={{ fontSize: '0.78rem', width: '100%' }}
                  />
                </div>

                {/* License Back */}
                <div style={{ border: '2px dashed var(--gray-300)', borderRadius: 10, padding: 14, textAlign: 'center', background: '#FAFAFA' }}>
                  <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>
                    4. Carnet Conducir (Reverso)
                  </span>
                  {licenseBackPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={licenseBackPreview} alt="Carnet Back" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                  ) : (
                    <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
                      <Upload size={32} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => handleFileChange(e, setLicenseBack, setLicenseBackPreview)}
                    style={{ fontSize: '0.78rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.9rem' }}
                >
                  ← Volver a Datos
                </button>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Link href="/dashboard" style={{ color: 'var(--gray-500)', fontSize: '0.9rem', textDecoration: 'underline' }}>
                    Subir más tarde
                  </Link>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-forest"
                    style={{ padding: '12px 28px', opacity: isSubmitting ? 0.7 : 1 }}
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar y Enviar'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 100, paddingBottom: 80, minHeight: '80vh', background: 'var(--white-broken)' }}>
        <div className="container">
          <Suspense fallback={<div className="skeleton" style={{ height: 400 }} />}>
            <SuccessContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  )
}
