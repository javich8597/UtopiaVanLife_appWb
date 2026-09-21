'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  X,
  User,
  FileText,
  Calendar,
  ShieldCheck,
  Clock,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Car,
  Eye,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react'
import { validateDriverLicenseExpiration } from '@/lib/admin/auth'

interface CustomerDetailModalProps {
  userId: string | null
  onClose: () => void
  onStatusUpdated?: (userId: string, newStatus: string) => void
}

export default function CustomerDetailModal({
  userId,
  onClose,
  onStatusUpdated
}: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'docs' | 'bookings'>('info')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ user: any; bookings: any[]; documents: any } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [zoomImage, setZoomImage] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    setLoading(true)
    fetch(`/api/admin/customer-detail?userId=${userId}`)
      .then(res => res.json())
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching customer detail:', err)
        setLoading(false)
      })
  }, [userId])

  if (!userId) return null

  const handleVerify = async (action: 'approve' | 'reject') => {
    if (!confirm(`¿Estás seguro de que deseas ${action === 'approve' ? 'VALIDAR' : 'RECHAZAR'} la documentación de este cliente?`)) {
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/verify-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      })
      const result = await res.json()
      if (result.success) {
        if (data) {
          setData({
            ...data,
            user: { ...data.user, verification_status: result.status }
          })
        }
        if (onStatusUpdated) {
          onStatusUpdated(userId, result.status)
        }
      } else {
        alert(result.error || 'Error al actualizar estado')
      }
    } catch (e: any) {
      alert(e.message || 'Error en la petición')
    } finally {
      setActionLoading(false)
    }
  }

  const user = data?.user
  const bookings = data?.bookings || []
  const docs = data?.documents || {}

  const licenseValidation = user?.driver_license_expiry_date
    ? validateDriverLicenseExpiration(user.driver_license_expiry_date, user.driver_license_issue_date)
    : null

  return (
    <div className="cd-backdrop" onClick={onClose}>
      <div className="cd-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="cd-header">
          <div className="cd-header-left">
            <div className="cd-avatar">
              <User size={24} />
            </div>
            <div>
              <div className="cd-header-title-row">
                <h3 className="cd-title">{user?.full_name || 'Cargando cliente...'}</h3>
                {user?.verification_status === 'verified' && (
                  <span className="cd-badge cd-badge--verified">
                    <ShieldCheck size={13} /> Validado
                  </span>
                )}
                {(user?.verification_status === 'pending' || user?.verification_status === 'pending_validation') && (
                  <span className="cd-badge cd-badge--pending">
                    <Clock size={13} /> Pendiente
                  </span>
                )}
                {user?.verification_status === 'rejected' && (
                  <span className="cd-badge cd-badge--rejected">
                    <XCircle size={13} /> Rechazado
                  </span>
                )}
                {(!user?.verification_status || user?.verification_status === 'not_submitted') && (
                  <span className="cd-badge cd-badge--neutral">
                    <AlertCircle size={13} /> Sin carnet
                  </span>
                )}
              </div>
              <p className="cd-subtitle">{user?.email || ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="cd-close-btn" title="Cerrar ventana">
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="cd-tabs">
          <button
            onClick={() => setActiveTab('info')}
            className={`cd-tab ${activeTab === 'info' ? 'cd-tab--active' : ''}`}
          >
            <User size={16} /> Datos Personales
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`cd-tab ${activeTab === 'docs' ? 'cd-tab--active' : ''}`}
          >
            <FileText size={16} /> Documentación & Carnet
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`cd-tab ${activeTab === 'bookings' ? 'cd-tab--active' : ''}`}
          >
            <Calendar size={16} /> Historial de Reservas ({bookings.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="cd-body">
          {loading ? (
            <div className="cd-loading">
              <div className="cd-spinner" />
              <span>Cargando expediente del cliente...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: DATOS PERSONALES */}
              {activeTab === 'info' && (
                <div className="cd-tab-content">
                  <div className="cd-grid">
                    <div className="cd-card">
                      <h4 className="cd-card-title">Información de Contacto</h4>
                      <div className="cd-field-list">
                        <div className="cd-field">
                          <span className="cd-field-label">Nombre Completo</span>
                          <strong className="cd-field-value">{user?.full_name || '-'}</strong>
                        </div>
                        <div className="cd-field">
                          <span className="cd-field-label">Email</span>
                          <strong className="cd-field-value flex-align">
                            <Mail size={14} className="cd-icon-muted" /> {user?.email || '-'}
                          </strong>
                        </div>
                        <div className="cd-field">
                          <span className="cd-field-label">Teléfono de Contacto</span>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <strong className="cd-field-value flex-align">
                              <Phone size={14} className="cd-icon-muted" /> {user?.phone || user?.phone_number || '-'}
                            </strong>
                            {(user?.phone || user?.phone_number) && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <a
                                  href={`tel:${user.phone || user.phone_number}`}
                                  className="cd-phone-action cd-phone-action--call"
                                  title="Llamar al cliente"
                                >
                                  Llamar
                                </a>
                                <a
                                  href={`https://wa.me/${(user.phone || user.phone_number).replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cd-phone-action cd-phone-action--wa"
                                  title="Abrir chat WhatsApp"
                                >
                                  WhatsApp
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="cd-field">
                          <span className="cd-field-label">DNI / NIE / Pasaporte</span>
                          <strong className="cd-field-value">{user?.dni_nie || '-'}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="cd-card">
                      <h4 className="cd-card-title">Dirección & Registro</h4>
                      <div className="cd-field-list">
                        <div className="cd-field">
                          <span className="cd-field-label">Dirección de Residencia</span>
                          <strong className="cd-field-value flex-align">
                            <MapPin size={14} className="cd-icon-muted" /> {user?.address || 'No especificada'}
                          </strong>
                        </div>
                        <div className="cd-field">
                          <span className="cd-field-label">Rol en Plataforma</span>
                          <span className="cd-role-tag">{user?.role || 'customer'}</span>
                        </div>
                        <div className="cd-field">
                          <span className="cd-field-label">Fecha de Registro</span>
                          <span className="cd-field-value">
                            {user?.created_at ? new Date(user.created_at).toLocaleString('es-ES') : '-'}
                          </span>
                        </div>
                        <div className="cd-field">
                          <span className="cd-field-label">ID de Usuario Supabase</span>
                          <code className="cd-code">{user?.id}</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Segundo Conductor */}
                  {user?.has_second_driver && (
                    <div className="cd-card cd-card--second-driver">
                      <h4 className="cd-card-title" style={{ color: '#0369a1' }}>
                        Segundo Conductor Autorizado
                      </h4>
                      <div className="cd-grid cd-grid--3">
                        <div className="cd-field">
                          <span className="cd-field-label">Nombre Segundo Conductor</span>
                          <strong>{user?.second_driver_name || '-'}</strong>
                        </div>
                        <div className="cd-field">
                          <span className="cd-field-label">DNI / Pasaporte</span>
                          <strong>{user?.second_driver_dni || '-'}</strong>
                        </div>
                        <div className="cd-field">
                          <span className="cd-field-label">Nº Permiso de Conducir</span>
                          <strong>{user?.second_driver_license_id || '-'}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DOCUMENTACIÓN Y CARNET */}
              {activeTab === 'docs' && (
                <div className="cd-tab-content">
                  {/* Resumen del carnet y fechas */}
                  <div className="cd-card cd-card--license-check">
                    <div className="cd-license-header">
                      <div>
                        <h4 className="cd-card-title" style={{ margin: 0 }}>Datos del Permiso de Conducir (B)</h4>
                        <p className="cd-subtitle" style={{ margin: '2px 0 0' }}>
                          Nº Carnet: <strong>{user?.driver_license_id || user?.dni_nie || 'No registrado'}</strong>
                        </p>
                      </div>
                      {licenseValidation && (
                        <div>
                          {licenseValidation.isValid ? (
                            <span className="cd-badge cd-badge--verified">
                              <ShieldCheck size={14} /> Requisitos Cumplidos (+2 años de antigüedad)
                            </span>
                          ) : (
                            <span className="cd-badge cd-badge--rejected">
                              <ShieldAlert size={14} /> {licenseValidation.isExpired ? 'Carnet Caducado' : 'Conductor Novel (< 2 años)'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="cd-grid cd-grid--3" style={{ marginTop: 12 }}>
                      <div className="cd-field">
                        <span className="cd-field-label">Fecha de Expedición</span>
                        <strong>{user?.driver_license_issue_date || '-'}</strong>
                      </div>
                      <div className="cd-field">
                        <span className="cd-field-label">Fecha de Caducidad</span>
                        <strong>{user?.driver_license_expiry_date || '-'}</strong>
                      </div>
                      <div className="cd-field">
                        <span className="cd-field-label">Estado de Validación</span>
                        <strong style={{ textTransform: 'capitalize' }}>{user?.verification_status || 'not_submitted'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Galería de Documentos Subidos */}
                  <h4 className="cd-section-title">Archivos y Fotografías Subidas</h4>
                  <div className="cd-doc-grid">
                    {/* DNI Frontal */}
                    <div className="cd-doc-box">
                      <span className="cd-doc-label">DNI / NIE / Pasaporte (Anverso)</span>
                      {docs.dniFrontUrl ? (
                        <div className="cd-img-wrap" onClick={() => setZoomImage(docs.dniFrontUrl)}>
                          <img src={docs.dniFrontUrl} alt="DNI Frontal" className="cd-img-preview" />
                          <div className="cd-img-hover"><Eye size={18} /> Ampliar</div>
                        </div>
                      ) : (
                        <div className="cd-doc-empty">Sin archivo subido</div>
                      )}
                    </div>

                    {/* DNI Trasero */}
                    <div className="cd-doc-box">
                      <span className="cd-doc-label">DNI / NIE / Pasaporte (Reverso)</span>
                      {docs.dniBackUrl ? (
                        <div className="cd-img-wrap" onClick={() => setZoomImage(docs.dniBackUrl)}>
                          <img src={docs.dniBackUrl} alt="DNI Trasero" className="cd-img-preview" />
                          <div className="cd-img-hover"><Eye size={18} /> Ampliar</div>
                        </div>
                      ) : (
                        <div className="cd-doc-empty">Sin archivo subido</div>
                      )}
                    </div>

                    {/* Carnet Frontal */}
                    <div className="cd-doc-box">
                      <span className="cd-doc-label">Carnet de Conducir (Anverso)</span>
                      {docs.licenseFrontUrl ? (
                        <div className="cd-img-wrap" onClick={() => setZoomImage(docs.licenseFrontUrl)}>
                          <img src={docs.licenseFrontUrl} alt="Carnet Frontal" className="cd-img-preview" />
                          <div className="cd-img-hover"><Eye size={18} /> Ampliar</div>
                        </div>
                      ) : (
                        <div className="cd-doc-empty">Sin archivo subido</div>
                      )}
                    </div>

                    {/* Carnet Trasero */}
                    <div className="cd-doc-box">
                      <span className="cd-doc-label">Carnet de Conducir (Reverso)</span>
                      {docs.licenseBackUrl ? (
                        <div className="cd-img-wrap" onClick={() => setZoomImage(docs.licenseBackUrl)}>
                          <img src={docs.licenseBackUrl} alt="Carnet Trasero" className="cd-img-preview" />
                          <div className="cd-img-hover"><Eye size={18} /> Ampliar</div>
                        </div>
                      ) : (
                        <div className="cd-doc-empty">Sin archivo subido</div>
                      )}
                    </div>
                  </div>

                  {/* Acciones de Validación Rápida */}
                  <div className="cd-action-bar">
                    <span style={{ fontSize: '0.88rem', color: '#4b5563', fontWeight: 500 }}>
                      Acción Administrativa sobre la Documentación:
                    </span>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => handleVerify('reject')}
                        disabled={actionLoading}
                        className="cd-btn cd-btn--danger"
                      >
                        <XCircle size={16} /> Rechazar Documentación
                      </button>
                      <button
                        onClick={() => handleVerify('approve')}
                        disabled={actionLoading}
                        className="cd-btn cd-btn--success"
                      >
                        <ShieldCheck size={16} /> Validar y Aprobar Carnet
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: HISTORIAL DE RESERVAS */}
              {activeTab === 'bookings' && (
                <div className="cd-tab-content">
                  {bookings.length === 0 ? (
                    <div className="cd-empty-bookings">
                      <Car size={36} className="cd-icon-muted" />
                      <p>Este cliente todavía no ha realizado ninguna reserva.</p>
                    </div>
                  ) : (
                    <div className="cd-booking-list">
                      {bookings.map((b: any) => (
                        <div key={b.id} className="cd-booking-item">
                          <div className="cd-booking-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="cd-camper-tag">
                                {b.campers?.name || 'Camper Utopia'}
                              </span>
                              <span className={`cd-booking-status cd-booking-status--${b.status}`}>
                                {b.status === 'confirmed' ? 'Confirmada' :
                                 b.status === 'active' ? 'En Curso' :
                                 b.status === 'pending' ? 'Pendiente' :
                                 b.status === 'completed' ? 'Completada' : 'Cancelada'}
                              </span>
                            </div>
                            <div className="cd-booking-dates">
                              <Calendar size={14} />
                              <strong>
                                {new Date(b.start_date).toLocaleDateString('es-ES')} ({b.pickup_time || '10:00'}h)
                                {' → '}
                                {new Date(b.end_date).toLocaleDateString('es-ES')} ({b.dropoff_time || '18:00'}h)
                              </strong>
                            </div>
                          </div>

                          <div className="cd-booking-right">
                            <div className="cd-booking-price">
                              {b.total_price} €
                              <span className="cd-booking-deposit">(+{b.deposit_amount || 500}€ fianza)</span>
                            </div>
                            <a
                              href={`/es/admin/bookings`}
                              className="cd-booking-link"
                              title="Gestionar en Reservas"
                            >
                              Ver en Reservas <ChevronRight size={14} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="cd-footer">
          <button onClick={onClose} className="cd-btn cd-btn--secondary">
            Cerrar Ficha
          </button>
        </div>
      </div>

      {/* Visor de Imagen Ampliada (Zoom Modal) */}
      {zoomImage && (
        <div className="cd-zoom-backdrop" onClick={() => setZoomImage(null)}>
          <div className="cd-zoom-card" onClick={e => e.stopPropagation()}>
            <div className="cd-zoom-header">
              <span>Visualización de Documento</span>
              <button onClick={() => setZoomImage(null)} className="cd-close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="cd-zoom-img-container">
              <img src={zoomImage} alt="Documento Ampliado" className="cd-zoom-img" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Styles */}
      <style jsx>{`
        .cd-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(5px);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .cd-modal {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 820px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: cdPop 0.15s ease-out;
          overflow: hidden;
        }

        @keyframes cdPop {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        .cd-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #E5E7EB;
          background: #FAFAFA;
        }

        .cd-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .cd-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #DCFCE7;
          color: #166534;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cd-header-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .cd-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .cd-subtitle {
          font-size: 0.88rem;
          color: #6B7280;
          margin: 2px 0 0;
        }

        .cd-close-btn {
          background: transparent;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          transition: background 0.12s ease;
        }
        .cd-close-btn:hover {
          background: #E5E7EB;
          color: #111827;
        }

        /* Tabs */
        .cd-tabs {
          display: flex;
          border-bottom: 1px solid #E5E7EB;
          background: #F9FAFB;
          padding: 0 24px;
          gap: 8px;
        }

        .cd-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border: none;
          background: transparent;
          font-size: 0.88rem;
          font-weight: 600;
          color: #6B7280;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
        }
        .cd-tab:hover {
          color: #111827;
        }
        .cd-tab--active {
          color: #16A34A;
          border-bottom-color: #16A34A;
          background: #FFFFFF;
        }

        /* Body */
        .cd-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .cd-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 48px;
          color: #6B7280;
          font-size: 0.95rem;
        }

        .cd-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #E5E7EB;
          border-top-color: #16A34A;
          border-radius: 50%;
          animation: cdSpin 0.7s linear infinite;
        }
        @keyframes cdSpin {
          to { transform: rotate(360deg); }
        }

        .cd-tab-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .cd-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
        }
        .cd-grid--3 {
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }

        .cd-card {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 18px;
        }

        .cd-card--second-driver {
          background: #F0F9FF;
          border-color: #BAE6FD;
        }

        .cd-card--license-check {
          background: #FAF5FF;
          border-color: #E9D5FF;
        }

        .cd-card-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1F2937;
          margin: 0 0 14px;
        }

        .cd-license-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .cd-field-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cd-field {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cd-field-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #6B7280;
        }

        .cd-field-value {
          font-size: 0.92rem;
          color: #111827;
        }

        .flex-align {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cd-icon-muted {
          color: #9CA3AF;
        }

        .cd-role-tag {
          display: inline-block;
          background: #E5E7EB;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          text-transform: capitalize;
          align-self: flex-start;
        }

        .cd-code {
          font-family: monospace;
          background: #E5E7EB;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.78rem;
          color: #374151;
        }

        /* Badges */
        .cd-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .cd-badge--verified {
          background: #DCFCE7;
          color: #166534;
        }
        .cd-badge--pending {
          background: #FEF9C3;
          color: #854D0E;
        }
        .cd-badge--rejected {
          background: #FEE2E2;
          color: #991B1B;
        }
        .cd-badge--neutral {
          background: #F3F4F6;
          color: #6B7280;
        }

        /* Docs Grid */
        .cd-section-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1F2937;
          margin: 8px 0 0;
        }

        .cd-doc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 14px;
        }

        .cd-doc-box {
          background: #FAFAFA;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cd-doc-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #4B5563;
          text-align: center;
        }

        .cd-img-wrap {
          position: relative;
          aspect-ratio: 4/3;
          border-radius: 8px;
          overflow: hidden;
          background: #E5E7EB;
          cursor: pointer;
        }

        .cd-img-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.15s ease;
        }
        .cd-img-wrap:hover .cd-img-preview {
          transform: scale(1.05);
        }

        .cd-img-hover {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .cd-img-wrap:hover .cd-img-hover {
          opacity: 1;
        }

        .cd-doc-empty {
          aspect-ratio: 4/3;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F3F4F6;
          border: 1px dashed #D1D5DB;
          border-radius: 8px;
          font-size: 0.75rem;
          color: #9CA3AF;
        }

        .cd-action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 14px 18px;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
        }

        /* Bookings List */
        .cd-empty-bookings {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          background: #F9FAFB;
          border-radius: 12px;
          border: 1px dashed #D1D5DB;
          color: #6B7280;
          gap: 8px;
        }

        .cd-booking-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cd-booking-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: #FAFAFA;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          flex-wrap: wrap;
          gap: 14px;
        }

        .cd-booking-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cd-camper-tag {
          font-weight: 700;
          font-size: 0.95rem;
          color: #111827;
        }

        .cd-booking-status {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .cd-booking-status--confirmed { background: #DCFCE7; color: #166534; }
        .cd-booking-status--pending { background: #FEF9C3; color: #854D0E; }
        .cd-booking-status--active { background: #16A34A; color: #ffffff; }

        .cd-booking-dates {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: #4B5563;
        }

        .cd-booking-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .cd-booking-price {
          font-size: 1.1rem;
          font-weight: 700;
          color: #16A34A;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .cd-booking-deposit {
          font-size: 0.72rem;
          color: #6B7280;
          font-weight: 400;
        }

        .cd-booking-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: #ffffff;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #374151;
          text-decoration: none;
          transition: all 0.12s ease;
        }
        .cd-booking-link:hover {
          background: #F3F4F6;
          border-color: #9CA3AF;
        }

        /* Buttons */
        .cd-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }
        .cd-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cd-btn--secondary {
          background: #F3F4F6;
          color: #374151;
          border: 1px solid #D1D5DB;
        }
        .cd-btn--secondary:hover {
          background: #E5E7EB;
        }

        .cd-btn--danger {
          background: #FEE2E2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }
        .cd-btn--danger:hover {
          background: #FCA5A5;
        }

        .cd-btn--success {
          background: #16A34A;
          color: white;
        }
        .cd-btn--success:hover {
          background: #15803d;
        }

        .cd-footer {
          display: flex;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #E5E7EB;
          background: #FAFAFA;
        }

        /* Zoom View */
        .cd-zoom-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .cd-zoom-card {
          background: #ffffff;
          border-radius: 12px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .cd-zoom-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid #E5E7EB;
          font-weight: 600;
          color: #111827;
        }

        .cd-zoom-img-container {
          padding: 16px;
          background: #18181B;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
        }

        .cd-phone-action {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
          text-decoration: none;
          transition: opacity 0.15s ease;
        }
        .cd-phone-action:hover {
          opacity: 0.85;
        }
        .cd-phone-action--call {
          background: #E0E7FF;
          color: #3730A3;
        }
        .cd-phone-action--wa {
          background: #DCFCE7;
          color: #15803D;
        }

        @media (max-width: 640px) {
          .cd-backdrop {
            align-items: flex-end;
            padding: 0;
          }

          .cd-modal {
            max-width: 100%;
            max-height: 94vh;
            border-radius: 20px 20px 0 0;
            animation: cdSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes cdSlideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }

          .cd-header {
            padding: 16px;
          }

          .cd-tabs {
            padding: 0 12px;
            overflow-x: auto;
            white-space: nowrap;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .cd-tabs::-webkit-scrollbar {
            display: none;
          }

          .cd-tab {
            padding: 10px 12px;
            font-size: 0.8rem;
          }

          .cd-body {
            padding: 16px;
          }

          .cd-grid {
            grid-template-columns: 1fr;
          }

          .cd-doc-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .cd-action-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .cd-action-bar > div {
            flex-direction: column;
            width: 100%;
          }

          .cd-btn {
            width: 100%;
            justify-content: center;
          }

          .cd-zoom-backdrop {
            padding: 0;
          }

          .cd-zoom-card {
            max-height: 100vh;
            height: 100vh;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  )
}