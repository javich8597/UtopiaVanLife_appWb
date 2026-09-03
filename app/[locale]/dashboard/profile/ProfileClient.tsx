'use client'

import { useState, ChangeEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  UploadCloud, 
  Trash2, 
  Lock, 
  User, 
  CreditCard, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  FileCheck2, 
  Check, 
  FolderOpen 
} from 'lucide-react'
import { validateDriverLicense } from '@/lib/contracts/licenseValidator'

interface Props {
  user: any
  profile: any
}

interface UploadedFilePreview {
  file: File | null
  previewUrl: string | null
}

export default function ProfileClient({ user, profile }: Props) {
  const searchParams = useSearchParams()
  const isMissingContractData = searchParams.get('reason') === 'missing_contract_data'

  // Datos personales y de conductor principal
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '')
  const [dniNie, setDniNie] = useState(profile?.dni_nie || '')
  const [driverLicenseId, setDriverLicenseId] = useState(profile?.driver_license_id || '')
  const [driverLicenseIssueDate, setDriverLicenseIssueDate] = useState(profile?.driver_license_issue_date || '')
  const [driverLicenseExpiryDate, setDriverLicenseExpiryDate] = useState(profile?.driver_license_expiry_date || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [address, setAddress] = useState(profile?.address || '')
  
  // Segundo conductor
  const [hasSecondDriver, setHasSecondDriver] = useState(profile?.has_second_driver || false)
  const [secondDriverFullName, setSecondDriverFullName] = useState(profile?.second_driver_name || '')
  const [secondDriverDni, setSecondDriverDni] = useState(profile?.second_driver_dni || '')
  const [secondDriverLicense, setSecondDriverLicense] = useState(profile?.second_driver_license || '')

  // Archivos del conductor principal
  const [dniFront, setDniFront] = useState<UploadedFilePreview>({ file: null, previewUrl: null })
  const [dniBack, setDniBack] = useState<UploadedFilePreview>({ file: null, previewUrl: null })
  const [licenseFront, setLicenseFront] = useState<UploadedFilePreview>({ file: null, previewUrl: null })
  const [licenseBack, setLicenseBack] = useState<UploadedFilePreview>({ file: null, previewUrl: null })

  // Archivos del segundo conductor
  const [secondLicenseFront, setSecondLicenseFront] = useState<UploadedFilePreview>({ file: null, previewUrl: null })
  const [secondLicenseBack, setSecondLicenseBack] = useState<UploadedFilePreview>({ file: null, previewUrl: null })

  // Estado del formulario
  const [status, setStatus] = useState<string>(profile?.verification_status || 'not_submitted')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleFileSelect = (
    e: ChangeEvent<HTMLInputElement>, 
    setter: React.Dispatch<React.SetStateAction<UploadedFilePreview>>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file)
      setter({ file, previewUrl })
    } else {
      setter({ file, previewUrl: null })
    }
  }

  const clearFile = (setter: React.Dispatch<React.SetStateAction<UploadedFilePreview>>) => {
    setter({ file: null, previewUrl: null })
  }

  const licenseValidation = validateDriverLicense(driverLicenseIssueDate, driverLicenseExpiryDate)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMessage('')
    setSaveSuccess(false)

    try {
      const formData = new FormData()
      formData.append('fullName', fullName)
      formData.append('dniNie', dniNie)
      formData.append('driverLicenseId', driverLicenseId)
      formData.append('driverLicenseIssueDate', driverLicenseIssueDate)
      formData.append('driverLicenseExpiryDate', driverLicenseExpiryDate)
      formData.append('address', address)
      formData.append('phone', phone)

      if (dniFront.file) formData.append('dni_front', dniFront.file)
      if (dniBack.file) formData.append('dni_back', dniBack.file)
      if (licenseFront.file) formData.append('license_front', licenseFront.file)
      if (licenseBack.file) formData.append('license_back', licenseBack.file)

      if (hasSecondDriver) {
        formData.append('hasSecondDriver', 'true')
        formData.append('secondDriverFullName', secondDriverFullName)
        formData.append('secondDriverDni', secondDriverDni)
        formData.append('secondDriverLicense', secondDriverLicense)

        if (secondLicenseFront.file) formData.append('second_license_front', secondLicenseFront.file)
        if (secondLicenseBack.file) formData.append('second_license_back', secondLicenseBack.file)
      }

      const res = await fetch('/api/upload-driver-docs', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar los datos.')
      }

      setStatus('pending_validation')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 5000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al guardar.')
    } finally {
      setIsSaving(false)
    }
  }

  const isVerified = status === 'verified'
  const isPending = status === 'pending' || status === 'pending_validation'

  const userInitial = fullName ? fullName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')

  return (
    <div className="profile-page-wrapper">
      
      {/* 1. Header & Status Banner */}
      <div className="profile-header">
        <div className="profile-header__text">
          <span className="profile-kicker">UTOPIA VAN LIFE • GESTIÓN DE VIAJERO</span>
          <h1 className="profile-title">Perfil & Documentación</h1>
          <p className="profile-subtitle">
            Rellena los campos con tus datos y adjunta tu carnet para formalizar el contrato y activar el seguro.
          </p>
        </div>

        <div className="profile-header__badge-wrap">
          {isVerified && (
            <div className="status-pill status-pill--verified">
              <ShieldCheck size={16} />
              <span>Conducción Autorizada ✓</span>
            </div>
          )}
          {isPending && (
            <div className="status-pill status-pill--pending">
              <Clock size={16} />
              <span>En Revisión por el Equipo</span>
            </div>
          )}
          {!isVerified && !isPending && (
            <div className="status-pill status-pill--unverified">
              <AlertTriangle size={16} />
              <span>Documentación Pendiente</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Driver Identity Card Header */}
      <div className="driver-hero-card">
        <div className="driver-avatar-medallion">
          <span>{userInitial}</span>
        </div>

        <div className="driver-hero-info">
          <div className="driver-hero-name-row">
            <h2 className="driver-hero-name">{fullName || 'Viajero Utopia'}</h2>
            <span className="driver-role-tag">Conductor Principal</span>
          </div>

          <div className="driver-hero-pills">
            <div className="hero-pill">
              <Mail size={13} style={{ color: 'var(--sand-dark)' }} />
              <span>{user.email}</span>
            </div>
            {phone && (
              <div className="hero-pill">
                <Phone size={13} style={{ color: 'var(--sand-dark)' }} />
                <span>{phone}</span>
              </div>
            )}
            {dniNie && (
              <div className="hero-pill">
                <CreditCard size={13} style={{ color: 'var(--sand-dark)' }} />
                <span>DNI: {dniNie}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aviso de datos requeridos para el contrato */}
      {isMissingContractData && (
        <div 
          className="alert-box alert-box--warning" 
          style={{ 
            background: '#FFFBEB', 
            borderColor: '#FDE68A', 
            color: '#92400E', 
            padding: '16px 20px', 
            borderRadius: '12px', 
            marginBottom: '24px', 
            display: 'flex', 
            gap: '14px', 
            alignItems: 'flex-start', 
            border: '1px solid #FCD34D' 
          }}
        >
          <AlertCircle size={24} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ fontSize: '1rem', color: '#78350F', display: 'block', marginBottom: '4px' }}>
              Datos obligatorios pendientes para tu contrato de alquiler
            </strong>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#92400E', lineHeight: 1.5 }}>
              Para poder generar y firmar el contrato oficial de tu reserva en la sección de Documentos, es imprescindible completar tu nombre completo, DNI/NIE, teléfono, dirección y las fechas de expedición y caducidad de tu carnet de conducir (en vigor y con al menos 2 años de antigüedad).
            </p>
          </div>
        </div>
      )}

      {/* Feedback Alerts */}
      {saveSuccess && (
        <div className="alert-box alert-box--success">
          <CheckCircle2 size={20} className="alert-icon" />
          <div>
            <strong>Documentación guardada con éxito</strong>
            <p>Hemos recibido tus datos y archivos. Nuestro equipo validará el carnet en breve.</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="alert-box alert-box--error">
          <AlertTriangle size={20} className="alert-icon" />
          <div>
            <strong>Atención</strong>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {licenseValidation.isExpired && (
        <div className="alert-box alert-box--error">
          <AlertTriangle size={20} className="alert-icon" />
          <div>
            <strong>Carnet de Conducir Caducado</strong>
            <p>{licenseValidation.warningMessage}</p>
          </div>
        </div>
      )}

      {/* 3. Form Sections */}
      <form onSubmit={handleSubmit} className="profile-form">
        
        {/* Bloque 1: Datos Personales */}
        <section className="form-card">
          <div className="form-card__header">
            <h2 className="form-card__title">Datos Personales</h2>
            <p className="form-card__subtitle">Información del titular según documento oficial de identidad</p>
          </div>

          <div className="form-grid-2">
            <div className="field-block">
              <label className="field-label" htmlFor="fullName">Nombre y Apellidos *</label>
              <div className="field-input-box">
                <User size={16} className="field-input-icon" />
                <input 
                  id="fullName"
                  type="text" 
                  required
                  placeholder="Escribe tu nombre completo..."
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="dniNie">DNI / Pasaporte / Documento UE *</label>
              <div className="field-input-box">
                <CreditCard size={16} className="field-input-icon" />
                <input 
                  id="dniNie"
                  type="text" 
                  required
                  placeholder="Ej. 12345678Z o Y1234567A"
                  value={dniNie}
                  onChange={e => setDniNie(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="phone">Teléfono Móvil (WhatsApp) *</label>
              <div className="field-input-box">
                <Phone size={16} className="field-input-icon" />
                <input 
                  id="phone"
                  type="tel" 
                  required
                  placeholder="Ej. +34 611 222 333"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="email">Correo Electrónico</label>
              <div className="field-input-box">
                <Mail size={16} className="field-input-icon" />
                <input 
                  id="email"
                  type="email" 
                  disabled
                  value={user?.email || ''}
                  className="field-input field-input--disabled"
                />
              </div>
            </div>

            <div className="field-block field-block--full">
              <label className="field-label" htmlFor="address">Dirección de Residencia Habitual *</label>
              <div className="field-input-box">
                <MapPin size={16} className="field-input-icon" />
                <input 
                  id="address"
                  type="text" 
                  required
                  placeholder="Escribe tu calle, número, código postal, ciudad y país..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Bloque 2: Permiso de Conducir */}
        <section className="form-card">
          <div className="form-card__header">
            <h2 className="form-card__title">Carnet de Conducir</h2>
            <p className="form-card__subtitle">Permiso de conducción tipo B con al menos 2 años de antigüedad</p>
          </div>

          <div className="form-grid-3">
            <div className="field-block">
              <label className="field-label" htmlFor="driverLicenseId">Nº de Carnet *</label>
              <div className="field-input-box">
                <CreditCard size={16} className="field-input-icon" />
                <input 
                  id="driverLicenseId"
                  type="text" 
                  required
                  placeholder="Ej. 12345678Z"
                  value={driverLicenseId}
                  onChange={e => setDriverLicenseId(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="issueDate">Fecha de Expedición *</label>
              <div className="field-input-box">
                <Calendar size={16} className="field-input-icon" />
                <input 
                  id="issueDate"
                  type="date" 
                  required
                  value={driverLicenseIssueDate}
                  onChange={e => setDriverLicenseIssueDate(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="expiryDate">Fecha de Caducidad *</label>
              <div className="field-input-box">
                <Calendar size={16} className="field-input-icon" />
                <input 
                  id="expiryDate"
                  type="date" 
                  required
                  value={driverLicenseExpiryDate}
                  onChange={e => setDriverLicenseExpiryDate(e.target.value)}
                  className={`field-input ${licenseValidation.isExpired ? 'field-input--error' : ''}`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Bloque 3: Subida de Documentos */}
        <section className="form-card">
          <div className="form-card__header">
            <h2 className="form-card__title">Documentación Oficial</h2>
            <p className="form-card__subtitle">Fotografías o PDF de tu DNI y carnet de conducir (anverso y reverso)</p>
          </div>

          <div className="dropzone-sections">
            {/* DNI Dropzones */}
            <div>
              <span className="dropzone-section-title">DNI / PASAPORTE / DOCUMENTO UE</span>
              <div className="dropzone-grid-2">
                {/* DNI Front */}
                <div className="dropzone-card">
                  <div className="dropzone-header-row">
                    <span className="dropzone-card-label">Anverso (Frontal con Fotografía)</span>
                    {dniFront.previewUrl && <span className="doc-ready-chip">✓ Adjuntado</span>}
                  </div>
                  {dniFront.previewUrl ? (
                    <div className="preview-container">
                      <Image src={dniFront.previewUrl} alt="DNI Frontal" fill style={{ objectFit: 'cover' }} />
                      <div className="preview-overlay">
                        <button type="button" onClick={() => clearFile(setDniFront)} className="preview-btn-clear">
                          <Trash2 size={13} /> Cambiar Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="dropzone-empty">
                      <UploadCloud size={24} className="dropzone-empty-icon" />
                      <span className="dropzone-empty-cta">
                        <FolderOpen size={14} /> Seleccionar archivo
                      </span>
                      <span className="dropzone-empty-hint">Haz clic o arrastra aquí (JPG, PNG, PDF)</span>
                      <input type="file" accept="image/*,application/pdf" onChange={e => handleFileSelect(e, setDniFront)} className="file-input-hidden" />
                    </label>
                  )}
                </div>

                {/* DNI Back */}
                <div className="dropzone-card">
                  <div className="dropzone-header-row">
                    <span className="dropzone-card-label">Reverso (Trasera con Domicilio)</span>
                    {dniBack.previewUrl && <span className="doc-ready-chip">✓ Adjuntado</span>}
                  </div>
                  {dniBack.previewUrl ? (
                    <div className="preview-container">
                      <Image src={dniBack.previewUrl} alt="DNI Reverso" fill style={{ objectFit: 'cover' }} />
                      <div className="preview-overlay">
                        <button type="button" onClick={() => clearFile(setDniBack)} className="preview-btn-clear">
                          <Trash2 size={13} /> Cambiar Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="dropzone-empty">
                      <UploadCloud size={24} className="dropzone-empty-icon" />
                      <span className="dropzone-empty-cta">
                        <FolderOpen size={14} /> Seleccionar archivo
                      </span>
                      <span className="dropzone-empty-hint">Haz clic o arrastra aquí (JPG, PNG, PDF)</span>
                      <input type="file" accept="image/*,application/pdf" onChange={e => handleFileSelect(e, setDniBack)} className="file-input-hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* License Dropzones */}
            <div>
              <span className="dropzone-section-title">CARNET DE CONDUCIR (PERMISO B)</span>
              <div className="dropzone-grid-2">
                {/* License Front */}
                <div className="dropzone-card">
                  <div className="dropzone-header-row">
                    <span className="dropzone-card-label">Anverso (Frontal con Fotografía)</span>
                    {licenseFront.previewUrl && <span className="doc-ready-chip">✓ Adjuntado</span>}
                  </div>
                  {licenseFront.previewUrl ? (
                    <div className="preview-container">
                      <Image src={licenseFront.previewUrl} alt="Carnet Frontal" fill style={{ objectFit: 'cover' }} />
                      <div className="preview-overlay">
                        <button type="button" onClick={() => clearFile(setLicenseFront)} className="preview-btn-clear">
                          <Trash2 size={13} /> Cambiar Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="dropzone-empty">
                      <UploadCloud size={24} className="dropzone-empty-icon" />
                      <span className="dropzone-empty-cta">
                        <FolderOpen size={14} /> Seleccionar archivo
                      </span>
                      <span className="dropzone-empty-hint">Haz clic o arrastra aquí (JPG, PNG, PDF)</span>
                      <input type="file" accept="image/*,application/pdf" onChange={e => handleFileSelect(e, setLicenseFront)} className="file-input-hidden" />
                    </label>
                  )}
                </div>

                {/* License Back */}
                <div className="dropzone-card">
                  <div className="dropzone-header-row">
                    <span className="dropzone-card-label">Reverso (Categorías & Vigencia)</span>
                    {licenseBack.previewUrl && <span className="doc-ready-chip">✓ Adjuntado</span>}
                  </div>
                  {licenseBack.previewUrl ? (
                    <div className="preview-container">
                      <Image src={licenseBack.previewUrl} alt="Carnet Reverso" fill style={{ objectFit: 'cover' }} />
                      <div className="preview-overlay">
                        <button type="button" onClick={() => clearFile(setLicenseBack)} className="preview-btn-clear">
                          <Trash2 size={13} /> Cambiar Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="dropzone-empty">
                      <UploadCloud size={24} className="dropzone-empty-icon" />
                      <span className="dropzone-empty-cta">
                        <FolderOpen size={14} /> Seleccionar archivo
                      </span>
                      <span className="dropzone-empty-hint">Haz clic o arrastra aquí (JPG, PNG, PDF)</span>
                      <input type="file" accept="image/*,application/pdf" onChange={e => handleFileSelect(e, setLicenseBack)} className="file-input-hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bloque 4: Segundo Conductor */}
        <section className="form-card">
          <div className="second-driver-header">
            <div>
              <h2 className="form-card__title">Segundo Conductor</h2>
              <p className="form-card__subtitle">Habilitar si otra persona va a compartir la conducción del vehículo</p>
            </div>

            <label className="custom-switch">
              <input 
                type="checkbox" 
                checked={hasSecondDriver}
                onChange={e => setHasSecondDriver(e.target.checked)}
              />
              <span className="custom-switch-slider" />
            </label>
          </div>

          {hasSecondDriver && (
            <div className="second-driver-body">
              <div className="form-grid-3">
                <div className="field-block">
                  <label className="field-label">Nombre y Apellidos</label>
                  <div className="field-input-box">
                    <input 
                      type="text" 
                      placeholder="Nombre del segundo conductor..."
                      value={secondDriverFullName}
                      onChange={e => setSecondDriverFullName(e.target.value)}
                      className="field-input"
                    />
                  </div>
                </div>

                <div className="field-block">
                  <label className="field-label">DNI / Pasaporte</label>
                  <div className="field-input-box">
                    <input 
                      type="text" 
                      placeholder="DNI o NIE..."
                      value={secondDriverDni}
                      onChange={e => setSecondDriverDni(e.target.value)}
                      className="field-input"
                    />
                  </div>
                </div>

                <div className="field-block">
                  <label className="field-label">Nº Carnet Conducir</label>
                  <div className="field-input-box">
                    <input 
                      type="text" 
                      placeholder="Nº de carnet..."
                      value={secondDriverLicense}
                      onChange={e => setSecondDriverLicense(e.target.value)}
                      className="field-input"
                    />
                  </div>
                </div>
              </div>

              {/* Subida carnet segundo conductor */}
              <div style={{ marginTop: 'var(--space-4)' }}>
                <span className="dropzone-section-title">CARNET DEL SEGUNDO CONDUCTOR</span>
                <div className="dropzone-grid-2">
                  <div className="dropzone-card">
                    <span className="dropzone-card-label">Anverso (Frontal)</span>
                    {secondLicenseFront.previewUrl ? (
                      <div className="preview-container">
                        <Image src={secondLicenseFront.previewUrl} alt="Carnet 2 Frontal" fill style={{ objectFit: 'cover' }} />
                        <div className="preview-overlay">
                          <button type="button" onClick={() => clearFile(setSecondLicenseFront)} className="preview-btn-clear">
                            <Trash2 size={13} /> Cambiar Foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="dropzone-empty">
                        <UploadCloud size={24} className="dropzone-empty-icon" />
                        <span className="dropzone-empty-cta"><FolderOpen size={14} /> Subir Frontal</span>
                        <input type="file" accept="image/*,application/pdf" onChange={e => handleFileSelect(e, setSecondLicenseFront)} className="file-input-hidden" />
                      </label>
                    )}
                  </div>

                  <div className="dropzone-card">
                    <span className="dropzone-card-label">Reverso (Trasera)</span>
                    {secondLicenseBack.previewUrl ? (
                      <div className="preview-container">
                        <Image src={secondLicenseBack.previewUrl} alt="Carnet 2 Reverso" fill style={{ objectFit: 'cover' }} />
                        <div className="preview-overlay">
                          <button type="button" onClick={() => clearFile(setSecondLicenseBack)} className="preview-btn-clear">
                            <Trash2 size={13} /> Cambiar Foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="dropzone-empty">
                        <UploadCloud size={24} className="dropzone-empty-icon" />
                        <span className="dropzone-empty-cta"><FolderOpen size={14} /> Subir Reverso</span>
                        <input type="file" accept="image/*,application/pdf" onChange={e => handleFileSelect(e, setSecondLicenseBack)} className="file-input-hidden" />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 4. Security & Privacy Card */}
        <div className="security-bar">
          <div className="security-icon-circle">
            <Lock size={16} />
          </div>
          <p className="security-text">
            <strong>Cifrado & Confidencialidad:</strong> Tus documentos oficiales se transmiten mediante conexión cifrada SSL de 256 bits y se almacenan en un servidor privado protegido conforme a la normativa europea RGPD, exclusivamente para la formalización del contrato oficial de alquiler y la cobertura de seguro ARAG.
          </p>
        </div>

        {/* 5. Action CTA */}
        <div className="action-bar">
          <button 
            type="submit" 
            disabled={isSaving || licenseValidation.isExpired}
            className="btn-save"
          >
            {isSaving ? (
              <>
                <span className="btn-spinner" />
                <span>Guardando y subiendo archivos...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Guardar y Validar Documentación</span>
              </>
            )}
          </button>
        </div>
      </form>

      <style jsx>{`
        .profile-page-wrapper {
          max-width: 880px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        /* Header */
        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: var(--space-4);
          flex-wrap: wrap;
          padding-bottom: var(--space-4);
          border-bottom: 1px solid var(--gray-200);
        }

        .profile-kicker {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--sand-dark);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .profile-title {
          font-family: var(--font-heading);
          font-size: clamp(1.65rem, 4vw, 2.25rem);
          font-weight: 700;
          color: var(--forest-green);
          line-height: 1.15;
        }

        .profile-subtitle {
          font-size: 0.88rem;
          color: var(--gray-600);
          max-width: 600px;
          margin-top: 4px;
          line-height: 1.45;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .status-pill--verified {
          background: #DCFCE7;
          color: #15803D;
          border: 1px solid #BBF7D0;
        }
        .status-pill--pending {
          background: #FEF3C7;
          color: #B45309;
          border: 1px solid #FDE68A;
        }
        .status-pill--unverified {
          background: #FEE2E2;
          color: #B91C1C;
          border: 1px solid #FECACA;
        }

        /* Driver Hero Card */
        .driver-hero-card {
          background: linear-gradient(135deg, #1A2B21 0%, #2D4A39 100%);
          border-radius: var(--radius-lg);
          padding: 20px 24px;
          color: white;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 4px 16px rgba(26, 43, 33, 0.12);
        }

        @media (max-width: 640px) {
          .driver-hero-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
          }
        }

        .driver-avatar-medallion {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #14231a;
          border: 2px solid var(--sand-dark);
          color: var(--sand-dark);
          font-family: var(--font-heading);
          font-size: 1.4rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }

        .driver-hero-info {
          flex: 1;
          min-width: 0;
        }

        .driver-hero-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .driver-hero-name {
          font-size: 1.15rem;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }

        .driver-role-tag {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: rgba(200, 168, 130, 0.25);
          color: #F3E8DC;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(200, 168, 130, 0.4);
        }

        .driver-hero-pills {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 6px;
          flex-wrap: wrap;
        }

        .hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          color: #E2E8F0;
        }

        /* Form Structure */
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .form-card {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: var(--radius-lg);
          padding: clamp(20px, 3vw, 28px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .form-card__header {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: var(--space-5);
          padding-bottom: var(--space-3);
          border-bottom: 1px solid #F1F5F9;
        }

        .form-card__title {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--forest-green);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .form-card__subtitle {
          font-size: 0.82rem;
          color: #64748B;
          margin: 0;
          line-height: 1.4;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-5);
        }

        .form-grid-3 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-5);
        }

        @media (max-width: 640px) {
          .form-grid-2 {
            grid-template-columns: 1fr;
          }
        }

        .field-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-block--full {
          grid-column: 1 / -1;
        }

        .field-label {
          font-size: 0.84rem;
          font-weight: 700;
          color: #1E293B;
          letter-spacing: 0.01em;
        }

        .field-input-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-input-icon {
          position: absolute;
          left: 14px;
          color: #64748B;
          pointer-events: none;
        }

        .field-input-box .field-input {
          padding-left: 40px;
        }

        .field-input {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #0F172A;
          background: #F8FAFC;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
          transition: all 0.2s ease;
        }

        .field-input:hover:not(:disabled) {
          border-color: #94A3B8;
          background: #F1F5F9;
        }

        .field-input:focus {
          outline: none;
          background: #FFFFFF;
          border-color: var(--forest-green);
          box-shadow: 0 0 0 4px rgba(26, 43, 33, 0.12), inset 0 1px 2px rgba(0, 0, 0, 0.02);
        }

        .field-input::placeholder {
          color: #94A3B8;
          font-weight: 400;
        }

        .field-input--disabled {
          background: #E2E8F0;
          color: #64748B;
          border-color: #CBD5E1;
          cursor: not-allowed;
          box-shadow: none;
        }

        .field-input--error {
          border-color: #EF4444 !important;
          background: #FEF2F2 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
        }

        /* Dropzones */
        .dropzone-sections {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .dropzone-section-title {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--sand-dark);
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .dropzone-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        @media (max-width: 640px) {
          .dropzone-grid-2 {
            grid-template-columns: 1fr;
          }
        }

        .dropzone-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .dropzone-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dropzone-card-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
        }

        .doc-ready-chip {
          font-size: 0.7rem;
          font-weight: 700;
          color: #15803D;
          background: #DCFCE7;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          border: 1px solid #BBF7D0;
        }

        .dropzone-empty {
          height: 125px;
          border: 2px dashed #94A3B8;
          border-radius: 10px;
          background: #F8FAF8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 12px;
          text-align: center;
        }

        .dropzone-empty:hover {
          border-color: var(--forest-green);
          background: #ECFDF5;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(26, 43, 33, 0.06);
        }

        .dropzone-empty-icon {
          color: var(--forest-green);
        }

        .dropzone-empty-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--forest-green);
          background: white;
          padding: 5px 14px;
          border-radius: var(--radius-full);
          border: 1px solid #CBD5E1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .dropzone-empty-hint {
          font-size: 0.7rem;
          color: #64748B;
        }

        .file-input-hidden {
          display: none;
        }

        .preview-container {
          position: relative;
          height: 125px;
          border-radius: 10px;
          overflow: hidden;
          border: 1.5px solid #CBD5E1;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        .preview-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .preview-container:hover .preview-overlay {
          opacity: 1;
        }

        .preview-btn-clear {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #DC2626;
          color: white;
          padding: 7px 14px;
          border-radius: var(--radius-md);
          border: none;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        /* Second Driver Header & Switch */
        .second-driver-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .custom-switch {
          position: relative;
          display: inline-block;
          width: 46px;
          height: 26px;
        }

        .custom-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .custom-switch-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: #CBD5E1;
          transition: 0.25s ease;
          border-radius: 26px;
        }

        .custom-switch-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.25s ease;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        input:checked + .custom-switch-slider {
          background-color: var(--forest-green);
        }

        input:checked + .custom-switch-slider:before {
          transform: translateX(20px);
        }

        .second-driver-body {
          padding-top: var(--space-4);
          border-top: 1px dashed #CBD5E1;
          margin-top: var(--space-4);
        }

        /* Security Bar */
        .security-bar {
          background: #F8FAF8;
          border: 1px solid rgba(45, 58, 45, 0.12);
          border-radius: var(--radius-lg);
          padding: 16px 20px;
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .security-icon-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(45, 58, 45, 0.08);
          color: var(--forest-green);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .security-text {
          font-size: 0.8rem;
          color: #475569;
          line-height: 1.5;
          margin: 0;
        }

        /* Action Bar */
        .action-bar {
          display: flex;
          justify-content: center;
          margin-top: var(--space-2);
        }

        .btn-save {
          width: 100%;
          max-width: 380px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 24px;
          background: var(--forest-green);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(26, 43, 33, 0.2);
        }

        .btn-save:hover:not(:disabled) {
          background: #14231a;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(26, 43, 33, 0.25);
        }

        .btn-save:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Alert Banners */
        .alert-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          border-radius: var(--radius-md);
          font-size: 0.86rem;
          line-height: 1.4;
        }

        .alert-box--success {
          background: #F0FDF4;
          color: #15803D;
          border: 1px solid #BBF7D0;
        }

        .alert-box--error {
          background: #FEF2F2;
          color: #B91C1C;
          border: 1px solid #FECACA;
        }

        .alert-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }
      `}</style>
    </div>
  )
}
