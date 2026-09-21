'use client'

import { useState } from 'react'
import {
  X,
  Calendar,
  User,
  Truck,
  Euro,
  Clock,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Printer,
  Phone,
  Mail
} from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'
import ApproveActionClient from './ApproveActionClient'
import RefundActionClient from './RefundActionClient'

interface Props {
  booking: any
  onClose: () => void
}

export default function BookingDetailModal({ booking, onClose }: Props) {
  const [showContractPreview, setShowContractPreview] = useState(false)

  if (!booking) return null

  const clientName = booking.customer_name || booking.users?.full_name || 'Viajero Utopia'
  const clientEmail = booking.customer_email || booking.users?.email || '-'
  const clientPhone = booking.customer_phone || booking.users?.phone || '-'
  const camperName = booking.campers?.name || 'Camper'

  const startDate = new Date(booking.start_date)
  const endDate = new Date(booking.end_date)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)))

  const pickupTime = booking.pickup_time || '10:00'
  const dropoffTime = booking.dropoff_time || '18:00'
  const pickupLocation = booking.pickup_location || 'Palma de Mallorca (Aeropuerto PMI / Base Utopia Son Oms)'
  const dropoffLocation = booking.dropoff_location || 'Palma de Mallorca (Aeropuerto PMI / Base Utopia Son Oms)'

  const basePricePerNight = nights > 0 ? Math.round((booking.total_price / nights) * 100) / 100 : booking.total_price

  return (
    <div className="bm-backdrop" onClick={onClose}>
      <div className="bm-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bm-header">
          <div className="bm-header-left">
            <div className="bm-icon-wrap">
              <Truck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 className="bm-title">Reserva #{booking.id.split('-')[0].toUpperCase()}</h3>
                <span className={`status-badge status-${booking.status}`}>
                  {booking.status === 'confirmed' ? 'Confirmada' :
                   booking.status === 'active' ? 'En Curso' :
                   booking.status === 'pending' ? 'Pendiente' :
                   booking.status === 'completed' ? 'Completada' : 'Cancelada'}
                </span>
              </div>
              <p className="bm-subtitle">
                Camper: <strong>{camperName}</strong> · Creada el {new Date(booking.created_at).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="bm-close-btn" title="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="bm-body">
          {/* Main Grid: Dates & Locations */}
          <div className="bm-grid">
            <div className="bm-card">
              <h4 className="bm-card-title">
                <Calendar size={16} className="bm-icon-green" /> Periodo & Horarios
              </h4>
              <div className="bm-field-list">
                <div className="bm-field">
                  <span className="bm-label">Duración del Viaje</span>
                  <strong style={{ fontSize: '1.05rem', color: '#16a34a' }}>
                    {nights} {nights === 1 ? 'noche' : 'noches'}
                  </strong>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Recogida (Check-in)</span>
                  <div className="bm-val">
                    {startDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    <span className="bm-time-tag"> a las {pickupTime}h</span>
                  </div>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Devolución (Check-out)</span>
                  <div className="bm-val">
                    {endDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    <span className="bm-time-tag"> a las {dropoffTime}h</span>
                  </div>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Punto de Entrega / Recogida</span>
                  <div className="bm-val-sub flex-align">
                    <MapPin size={13} style={{ color: '#6b7280', flexShrink: 0 }} /> {pickupLocation}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bm-card">
              <h4 className="bm-card-title">
                <User size={16} className="bm-icon-green" /> Datos del Cliente
              </h4>
              <div className="bm-field-list">
                <div className="bm-field">
                  <span className="bm-label">Nombre del Conductor</span>
                  <strong className="bm-val">{clientName}</strong>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Email</span>
                  <div className="bm-val flex-align">
                    <Mail size={13} style={{ color: '#6b7280' }} /> {clientEmail}
                  </div>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Teléfono</span>
                  <div className="bm-val flex-align" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} style={{ color: '#6b7280' }} /> {clientPhone}
                    </div>
                    {clientPhone && clientPhone !== '-' && (
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <a
                          href={`tel:${clientPhone}`}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#15803d',
                            background: '#dcfce7',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            textDecoration: 'none',
                          }}
                        >
                          Llamar
                        </a>
                        <a
                          href={`https://wa.me/${clientPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#0369a1',
                            background: '#e0f2fe',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            textDecoration: 'none',
                          }}
                        >
                          WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bm-field">
                  <span className="bm-label">DNI / NIE / Carnet</span>
                  <div className="bm-val" style={{ fontFamily: 'monospace' }}>
                    {booking.users?.dni_nie || booking.users?.driver_license_id || 'No registrado'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Financial Breakdown */}
          <div className="bm-card bm-card--pricing">
            <h4 className="bm-card-title" style={{ color: '#166534' }}>
              <Euro size={16} /> Desglose Económico de la Reserva
            </h4>
            <div className="bm-pricing-grid">
              <div className="bm-price-row">
                <span>Alquiler camper ({nights} noches)</span>
                <strong>{formatPrice(booking.total_price)}</strong>
              </div>
              <div className="bm-price-row">
                <span>Fianza reembolsable (bloqueo)</span>
                <strong>{formatPrice(booking.deposit_amount || 1000)}</strong>
              </div>
              {booking.extras && (
                <div className="bm-price-row">
                  <span>Extras incluidos</span>
                  <span style={{ fontSize: '0.82rem', color: '#4b5563' }}>
                    {Array.isArray(booking.extras) ? booking.extras.join(', ') : booking.extras}
                  </span>
                </div>
              )}
              <div className="bm-price-total">
                <span>Total Abonado</span>
                <span className="bm-total-amount">{formatPrice(booking.total_price)}</span>
              </div>
            </div>
          </div>

          {/* Official Contract Box */}
          <div className="bm-card bm-card--contract">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h4 className="bm-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={16} /> Contrato de Alquiler Oficial
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '4px 0 0' }}>
                  Contrato legal generado automáticamente con cláusulas, datos de la camper y firmas.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`/api/admin/contract?bookingId=${booking.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bm-btn bm-btn--primary"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Abrir / Imprimir PDF
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="bm-footer">
          <div className="bm-footer-actions">
            <ApproveActionClient bookingId={booking.id} status={booking.status} />
            <RefundActionClient bookingId={booking.id} status={booking.status} />
          </div>

          <button onClick={onClose} className="bm-btn bm-btn--secondary">
            Cerrar Detalle
          </button>
        </div>
      </div>

      {/* Modal Styles */}
      <style jsx>{`
        .bm-backdrop {
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

        .bm-modal {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 780px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: bmPop 0.15s ease-out;
          overflow: hidden;
        }

        @keyframes bmPop {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        .bm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #E5E7EB;
          background: #FAFAFA;
        }

        .bm-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .bm-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #DCFCE7;
          color: #166534;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .bm-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .bm-subtitle {
          font-size: 0.85rem;
          color: #6B7280;
          margin: 2px 0 0;
        }

        .bm-close-btn {
          background: transparent;
          border: none;
          color: #9CA3AF;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          transition: background 0.12s ease;
        }
        .bm-close-btn:hover {
          background: #E5E7EB;
          color: #111827;
        }

        .bm-body {
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .bm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
        }

        .bm-card {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px 18px;
        }

        .bm-card--pricing {
          background: #F0FDF4;
          border-color: #BBF7D0;
        }

        .bm-card--contract {
          background: #F8FAFC;
          border-color: #E2E8F0;
        }

        .bm-card-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #1F2937;
          margin: 0 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bm-icon-green {
          color: #16A34A;
        }

        .bm-field-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bm-field {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .bm-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          font-weight: 700;
          color: #6B7280;
        }

        .bm-val {
          font-size: 0.92rem;
          color: #111827;
          font-weight: 600;
        }

        .bm-val-sub {
          font-size: 0.85rem;
          color: #4B5563;
        }

        .bm-time-tag {
          font-weight: 700;
          color: #16A34A;
          background: #DCFCE7;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
          margin-left: 6px;
        }

        .flex-align {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bm-pricing-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bm-price-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.88rem;
          color: #374151;
        }

        .bm-price-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px dashed #86EFAC;
          padding-top: 10px;
          margin-top: 4px;
          font-weight: 700;
          color: #166534;
        }

        .bm-total-amount {
          font-size: 1.25rem;
          color: #16A34A;
        }

        .bm-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-top: 1px solid #E5E7EB;
          background: #FAFAFA;
          flex-wrap: wrap;
          gap: 12px;
        }

        .bm-footer-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bm-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }

        .bm-btn--secondary {
          background: #F3F4F6;
          color: #374151;
          border: 1px solid #D1D5DB;
        }
        .bm-btn--secondary:hover {
          background: #E5E7EB;
        }

        .bm-btn--primary {
          background: #16A34A;
          color: white;
        }
        .bm-btn--primary:hover {
          background: #15803d;
        }

        @media (max-width: 640px) {
          .bm-backdrop {
            padding: 0;
            align-items: flex-end;
          }
          .bm-modal {
            border-radius: 20px 20px 0 0;
            max-height: 92vh;
            animation: bmSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .bm-header {
            padding: 14px 16px;
          }
          .bm-body {
            padding: 16px;
            gap: 14px;
          }
          .bm-grid {
            grid-template-columns: 1fr;
          }
          .bm-footer {
            padding: 14px 16px;
            flex-direction: column;
            gap: 10px;
          }
          .bm-footer-actions {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .bm-btn {
            width: 100%;
            justify-content: center;
          }
        }

        @keyframes bmSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}