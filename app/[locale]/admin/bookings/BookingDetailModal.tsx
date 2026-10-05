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
  Mail,
  Gauge,
  Shield,
  CreditCard,
  Package,
  Sparkles,
  Waves,
  Check
} from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'
import ApproveActionClient from './ApproveActionClient'
import RefundActionClient from './RefundActionClient'

interface Props {
  booking: any
  onClose: () => void
}

interface NormalizedExtra {
  id: string
  name: string
  category: 'Equipamiento' | 'Deporte' | 'Confort' | 'Otros'
  quantity: number
  unit_price: number
  total: number
  price_type?: string
}

export default function BookingDetailModal({ booking, onClose }: Props) {
  const [showContractPreview, setShowContractPreview] = useState(false)

  if (!booking) return null

  const clientName = booking.customer_name || booking.users?.full_name || 'Viajero Utopia'
  const clientEmail = booking.customer_email || booking.users?.email || '-'
  const clientPhone = booking.customer_phone || booking.users?.phone || '-'
  const clientDni = booking.customer_dni || booking.users?.dni_nie || booking.users?.driver_license_id || 'No registrado'
  const camperName = booking.campers?.name || 'Camper'

  const startDate = new Date(booking.start_date)
  const endDate = new Date(booking.end_date)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)))

  // Puede venir como '10:00' o '10:00 (Mañana)': se muestra '10:00 h · mañana'
  const formatSlotTime = (value: string) => {
    const m = value.match(/^(\d{1,2}:\d{2})\s*(?:\((.+)\))?/)
    if (!m) return value
    return m[2] ? `${m[1]} h · ${m[2].toLowerCase()}` : `${m[1]} h`
  }
  const pickupTime = formatSlotTime(booking.pickup_time || '10:00')
  const dropoffTime = formatSlotTime(booking.dropoff_time || '18:00')
  const pickupLocation = booking.pickup_location || 'Palma de Mallorca (Aeropuerto PMI / Base Utopia Son Oms)'
  const dropoffLocation = booking.dropoff_location || 'Palma de Mallorca (Aeropuerto PMI / Base Utopia Son Oms)'

  // 1. KM Package
  const isUnlimitedKm = booking.km_package === 'unlimited'
  const kmLabel = isUnlimitedKm ? 'Kilometraje Ilimitado (+15 €/día)' : '150 km/día (Incluido)'
  const kmBadgeClass = isUnlimitedKm ? 'badge-km--unlimited' : 'badge-km--included'
  const kmSupplement = Number(booking.km_supplement ?? booking.km_price ?? (isUnlimitedKm ? nights * 15 : 0))

  // 2. Cancellation Policy
  const isFlexibleCancel = booking.cancellation_policy === 'flexible'
  const cancellationLabel = isFlexibleCancel ? 'Flexible (+8 €/día)' : 'Estándar (Incluida)'
  const cancellationBadgeClass = isFlexibleCancel ? 'badge-cancel--flexible' : 'badge-cancel--standard'
  const cancellationSupplement = Number(booking.cancellation_supplement ?? booking.cancellation_price ?? (isFlexibleCancel ? nights * 8 : 0))

  // 3. Customer Contact & Billing
  const cleanPhone = clientPhone.replace(/\D/g, '')
  const telLink = cleanPhone ? `tel:${clientPhone}` : null
  const whatsAppLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null

  const billingAddress = [
    booking.customer_address,
    booking.customer_postal_code,
    booking.customer_city,
    booking.customer_country
  ].filter(Boolean).join(', ') || booking.customer_address || booking.billing_address || 'No especificada'

  const travelersCount = booking.travelers_count || booking.guests_count || 2
  const specialNotes = booking.special_notes || booking.notes || 'Ninguna'

  // 4. Categorized Extras
  const rawExtras = booking.extras_selected || booking.pricing_breakdown?.itemizedExtras || booking.extras
  let parsedExtrasList: NormalizedExtra[] = []

  function categorizeName(name: string): 'Equipamiento' | 'Deporte' | 'Confort' | 'Otros' {
    const lower = name.toLowerCase()
    if (lower.includes('surf') || lower.includes('paddle') || lower.includes('snorkel') || lower.includes('bici') || lower.includes('bike') || lower.includes('kayak') || lower.includes('buceo')) return 'Deporte'
    if (lower.includes('cama') || lower.includes('ropa') || lower.includes('sábana') || lower.includes('almohada') || lower.includes('wifi') || lower.includes('café') || lower.includes('cafetera') || lower.includes('toalla')) return 'Confort'
    if (lower.includes('camping') || lower.includes('mesa') || lower.includes('silla') || lower.includes('cocina') || lower.includes('solar') || lower.includes('ducha') || lower.includes('químico') || lower.includes('wc') || lower.includes('gas') || lower.includes('kit')) return 'Equipamiento'
    return 'Otros'
  }

  if (Array.isArray(rawExtras)) {
    parsedExtrasList = rawExtras.map((item: any, idx: number) => {
      if (typeof item === 'string') {
        return {
          id: String(idx),
          name: item,
          category: categorizeName(item),
          quantity: 1,
          unit_price: 0,
          total: 0
        }
      }
      const name = item.name_es || item.name || item.extra?.name_es || item.extra?.name || item.title || 'Extra'
      const cat = (item.category && ['Equipamiento', 'Deporte', 'Confort'].includes(item.category))
        ? item.category
        : categorizeName(name)
      const qty = Number(item.quantity || 1)
      const unit = Number(item.unit_price || item.price || 0)
      const tot = Number(item.total || (qty * unit))
      return {
        id: item.id || String(idx),
        name,
        category: cat,
        quantity: qty,
        unit_price: unit,
        total: tot,
        price_type: item.price_type || item.pricingType
      }
    })
  } else if (typeof rawExtras === 'string' && rawExtras.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(rawExtras)
      if (Array.isArray(parsed)) {
        parsedExtrasList = parsed.map((item: any, idx: number) => {
          if (typeof item === 'string') {
            return {
              id: String(idx),
              name: item,
              category: categorizeName(item),
              quantity: 1,
              unit_price: 0,
              total: 0
            }
          }
          const name = item.name_es || item.name || item.title || 'Extra'
          const cat = (item.category && ['Equipamiento', 'Deporte', 'Confort'].includes(item.category))
            ? item.category
            : categorizeName(name)
          const qty = Number(item.quantity || 1)
          const unit = Number(item.unit_price || item.price || 0)
          const tot = Number(item.total || (qty * unit))
          return {
            id: item.id || String(idx),
            name,
            category: cat,
            quantity: qty,
            unit_price: unit,
            total: tot
          }
        })
      }
    } catch {
      parsedExtrasList = rawExtras.split(',').map((s, idx) => ({
        id: String(idx),
        name: s.trim(),
        category: categorizeName(s.trim()),
        quantity: 1,
        unit_price: 0,
        total: 0
      }))
    }
  } else if (typeof rawExtras === 'string' && rawExtras.trim()) {
    parsedExtrasList = rawExtras.split(',').map((s, idx) => ({
      id: String(idx),
      name: s.trim(),
      category: categorizeName(s.trim()),
      quantity: 1,
      unit_price: 0,
      total: 0
    }))
  }

  const categorizedExtras: Record<string, NormalizedExtra[]> = {
    Equipamiento: [],
    Deporte: [],
    Confort: [],
    Otros: []
  }
  for (const item of parsedExtrasList) {
    if (item.category in categorizedExtras) {
      categorizedExtras[item.category].push(item)
    } else {
      categorizedExtras.Otros.push(item)
    }
  }
  const extrasSubtotal = parsedExtrasList.reduce((acc, curr) => acc + curr.total, 0)

  // 5. Itemized Financial Breakdown
  const discountAmount = Number(booking.discount_amount || 0)
  const basePrice = Number(
    booking.base_price ??
    booking.pricing_breakdown?.basePrice ??
    Math.max(0, booking.total_price - kmSupplement - cancellationSupplement - extrasSubtotal + discountAmount)
  )
  const depositAmount = Number(booking.deposit_amount || 1000)
  const redsysOrderId = booking.payment_intent_id || booking.payment_intent || booking.order_id || null
  const isPaid = booking.payment_status === 'paid'

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 className="bm-title">Reserva #{booking.id.split('-')[0].toUpperCase()}</h3>
                <span className={`status-badge status-${booking.status}`}>
                  {booking.status === 'confirmed' ? 'Confirmada' :
                   booking.status === 'active' ? 'En Curso' :
                   booking.status === 'pending' ? 'Pendiente' :
                   booking.status === 'completed' ? 'Completada' : 'Cancelada'}
                </span>
                {isPaid && (
                  <span className="badge-paid">
                    <Check size={11} /> Pagado Redsys
                  </span>
                )}
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
          {/* Main Grid: Dates & Locations + Options */}
          <div className="bm-grid">
            {/* Periodo & Horarios + Packages */}
            <div className="bm-card">
              <h4 className="bm-card-title">
                <Calendar size={16} className="bm-icon-green" /> Periodo & Opciones de Viaje
              </h4>
              <div className="bm-field-list">
                <div className="bm-field">
                  <span className="bm-label">Duración del Viaje</span>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--adm-sage)' }}>
                    {nights} {nights === 1 ? 'noche' : 'noches'}
                  </strong>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Recogida (Check-in)</span>
                  <div className="bm-val">
                    {startDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    <span className="bm-time-tag"> a las {pickupTime}</span>
                  </div>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Devolución (Check-out)</span>
                  <div className="bm-val">
                    {endDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    <span className="bm-time-tag"> a las {dropoffTime}</span>
                  </div>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Punto de Entrega / Recogida</span>
                  <div className="bm-val-sub flex-align">
                    <MapPin size={13} style={{ color: 'var(--adm-text-2)', flexShrink: 0 }} /> {pickupLocation}
                  </div>
                </div>

                {/* KM Package */}
                <div className="bm-field" style={{ paddingTop: 8, borderTop: '1px dashed var(--adm-border)' }}>
                  <span className="bm-label">Paquete de Kilometraje</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span className={`bm-opt-badge ${kmBadgeClass}`}>
                      <Gauge size={13} /> {kmLabel}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-2)', margin: '3px 0 0' }}>
                    {isUnlimitedKm
                      ? `Kilometraje ilimitado sin recargos (+15 €/día × ${nights} días = +${formatPrice(kmSupplement)})`
                      : '150 km/día incluidos en tarifa de alquiler sin coste adicional.'}
                  </p>
                </div>

                {/* Cancellation Policy */}
                <div className="bm-field" style={{ paddingTop: 8, borderTop: '1px dashed var(--adm-border)' }}>
                  <span className="bm-label">Política de Cancelación</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span className={`bm-opt-badge ${cancellationBadgeClass}`}>
                      <Shield size={13} /> {cancellationLabel}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-2)', margin: '3px 0 0' }}>
                    {isFlexibleCancel
                      ? `Reembolso 100% >30d, 50% 29-15d, 1 cambio gratis >15d (+8 €/día × ${nights} días = +${formatPrice(cancellationSupplement)})`
                      : 'Modificación de fechas gratuita hasta 60 días antes de la recogida.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Details & Billing Info */}
            <div className="bm-card">
              <h4 className="bm-card-title">
                <User size={16} className="bm-icon-green" /> Cliente & Datos de Facturación
              </h4>
              <div className="bm-field-list">
                <div className="bm-field">
                  <span className="bm-label">Nombre del Conductor</span>
                  <strong className="bm-val">{clientName}</strong>
                </div>
                <div className="bm-field">
                  <span className="bm-label">DNI / NIE / Pasaporte</span>
                  <div className="bm-val" style={{ fontFamily: 'monospace' }}>
                    {clientDni}
                  </div>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Email</span>
                  <div className="bm-val flex-align">
                    <Mail size={13} style={{ color: 'var(--adm-text-2)' }} />
                    <a href={`mailto:${clientEmail}`} style={{ color: 'var(--adm-sage)', textDecoration: 'none' }}>
                      {clientEmail}
                    </a>
                  </div>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Teléfono de Contacto</span>
                  <div className="bm-val flex-align" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} style={{ color: 'var(--adm-text-2)' }} /> {clientPhone}
                    </div>
                    {telLink && (
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <a
                          href={telLink}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'var(--adm-sage)',
                            background: 'var(--adm-sage-soft)',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            textDecoration: 'none',
                          }}
                        >
                          Llamar
                        </a>
                        {whatsAppLink && (
                          <a
                            href={whatsAppLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: 'var(--adm-text-2)',
                              background: 'var(--adm-surface-2)',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              textDecoration: 'none',
                            }}
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bm-field" style={{ paddingTop: 8, borderTop: '1px dashed var(--adm-border)' }}>
                  <span className="bm-label">Dirección de Facturación</span>
                  <div className="bm-val-sub" style={{ color: 'var(--adm-text)' }}>
                    {billingAddress}
                  </div>
                </div>

                <div className="bm-field">
                  <span className="bm-label">Número de Viajeros</span>
                  <div className="bm-val">
                    {travelersCount} {travelersCount === 1 ? 'persona' : 'personas'}
                  </div>
                </div>

                <div className="bm-field">
                  <span className="bm-label">Peticiones o Notas Especiales</span>
                  <div className="bm-val-sub" style={{ fontStyle: specialNotes !== 'Ninguna' ? 'normal' : 'italic', color: 'var(--adm-text-2)' }}>
                    {specialNotes}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Categorized Extras */}
          <div className="bm-card bm-card--extras">
            <h4 className="bm-card-title" style={{ color: 'var(--adm-text)', marginBottom: 12 }}>
              <Package size={16} className="bm-icon-green" /> Extras y Experiencias Contratadas
            </h4>

            {parsedExtrasList.length === 0 ? (
              <div style={{ padding: '8px 12px', background: 'var(--adm-surface-2)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--adm-text-2)' }}>
                ✨ <strong>Equipamiento de Serie Utopia incluido:</strong> Vajilla y menaje completo, kit de limpieza eco, cable eléctrico 220V, manguera y cuñas de nivelación. Sin extras de pago adicionales.
              </div>
            ) : (
              <div className="bm-categories-grid">
                {(['Equipamiento', 'Deporte', 'Confort', 'Otros'] as const).map(cat => {
                  const items = categorizedExtras[cat]
                  if (!items || items.length === 0) return null

                  const icon = cat === 'Equipamiento' ? '🎒' : cat === 'Deporte' ? '🏄' : cat === 'Confort' ? '✨' : '📦'
                  return (
                    <div key={cat} className="bm-category-group">
                      <div className="bm-category-header">
                        <span>{icon} {cat}</span>
                        <span className="bm-category-count">{items.length}</span>
                      </div>
                      <div className="bm-category-items">
                        {items.map(item => (
                          <div key={item.id} className="bm-extra-row">
                            <div className="bm-extra-name">
                              <span>{item.name}</span>
                              {item.quantity > 1 && (
                                <span className="bm-extra-qty">x{item.quantity}</span>
                              )}
                            </div>
                            <div className="bm-extra-price">
                              {item.unit_price > 0 && (
                                <span className="bm-extra-unit">({formatPrice(item.unit_price)}{item.price_type === 'per_day' ? '/día' : ''})</span>
                              )}
                              <strong>{item.total > 0 ? formatPrice(item.total) : 'Incluido'}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pricing & Financial Breakdown */}
          <div className="bm-card bm-card--pricing">
            <h4 className="bm-card-title" style={{ color: 'var(--adm-sage)' }}>
              <Euro size={16} /> Desglose Económico Pormenorizado
            </h4>
            <div className="bm-pricing-grid">
              <div className="bm-price-row">
                <span>Alquiler base camper ({nights} noches)</span>
                <strong>{formatPrice(basePrice)}</strong>
              </div>

              {discountAmount > 0 && (
                <div className="bm-price-row" style={{ color: 'var(--adm-sage)' }}>
                  <span>Descuento aplicado por estancia prolongada</span>
                  <strong>- {formatPrice(discountAmount)}</strong>
                </div>
              )}

              <div className="bm-price-row">
                <span>Paquete de KM: {kmLabel}</span>
                <strong>{kmSupplement > 0 ? `+ ${formatPrice(kmSupplement)}` : '0,00 €'}</strong>
              </div>

              <div className="bm-price-row">
                <span>Política de Cancelación: {cancellationLabel}</span>
                <strong>{cancellationSupplement > 0 ? `+ ${formatPrice(cancellationSupplement)}` : '0,00 €'}</strong>
              </div>

              {extrasSubtotal > 0 && (
                <div className="bm-price-row">
                  <span>Extras y experiencias ({parsedExtrasList.length} seleccionados)</span>
                  <strong>+ {formatPrice(extrasSubtotal)}</strong>
                </div>
              )}

              <div className="bm-price-total">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>Total Abonado</span>
                    {isPaid ? (
                      <span className="badge-paid-pill">
                        <Check size={11} /> Abonado 100% vía Redsys
                      </span>
                    ) : (
                      <span className="badge-pending-pill">
                        Pendiente de Pago
                      </span>
                    )}
                  </div>
                  {redsysOrderId && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--adm-text-2)', marginTop: 2 }}>
                      Ref. Transacción: <code style={{ color: 'var(--adm-sage)' }}>{redsysOrderId}</code>
                    </div>
                  )}
                </div>
                <span className="bm-total-amount">{formatPrice(booking.total_price)}</span>
              </div>

              <div className="bm-deposit-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--adm-text)' }}>Fianza Informativa Reembolsable (bloqueo)</span>
                  <strong style={{ color: 'var(--adm-text)' }}>{formatPrice(depositAmount)}</strong>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-2)', margin: '4px 0 0' }}>
                  Bloqueo preventivo en tarjeta de crédito al momento del check-in. No se cobra por adelantado y se libera íntegramente tras la devolución de la camper.
                </p>
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
                <p style={{ fontSize: '0.82rem', color: 'var(--adm-text-2)', margin: '4px 0 0' }}>
                  Contrato legal de 31 artículos generado automáticamente con cláusulas, datos de la camper y firmas.
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
          background: var(--adm-surface);
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
          border-bottom: 1px solid var(--adm-border);
          background: var(--adm-surface-2);
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
          background: var(--adm-sage-soft);
          color: var(--adm-sage);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .bm-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--adm-text);
          margin: 0;
        }

        .bm-subtitle {
          font-size: 0.85rem;
          color: var(--adm-text-2);
          margin: 2px 0 0;
        }

        .bm-close-btn {
          background: transparent;
          border: none;
          color: var(--adm-text-3);
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          transition: background 0.12s ease;
        }
        .bm-close-btn:hover {
          background: var(--adm-border);
          color: var(--adm-text);
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
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          border-radius: 12px;
          padding: 16px 18px;
        }

        .bm-card--pricing {
          background: var(--adm-sage-soft);
          border-color: var(--adm-sage-soft);
        }

        .bm-card--contract {
          background: var(--adm-surface-2);
          border-color: var(--adm-border);
        }

        .bm-card-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--adm-text);
          margin: 0 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bm-icon-green {
          color: var(--adm-sage);
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
          color: var(--adm-text-2);
        }

        .bm-val {
          font-size: 0.92rem;
          color: var(--adm-text);
          font-weight: 600;
        }

        .bm-val-sub {
          font-size: 0.85rem;
          color: var(--adm-text-2);
        }

        .bm-time-tag {
          font-weight: 700;
          color: var(--adm-sage);
          background: var(--adm-sage-soft);
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
          color: var(--adm-text);
        }

        .bm-opt-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 9999px;
        }
        .badge-km--unlimited {
          background: var(--adm-gold-soft);
          color: var(--adm-gold-text);
          border: 1px solid #C4B5FD;
        }
        .badge-km--included {
          background: var(--adm-sage-soft);
          color: var(--adm-sage);
          border: 1px solid var(--adm-sage-soft);
        }
        .badge-cancel--flexible {
          background: var(--adm-surface-2);
          color: var(--adm-text-2);
          border: 1px solid #7DD3FC;
        }
        .badge-cancel--standard {
          background: var(--adm-sage-soft);
          color: var(--adm-sage);
          border: 1px solid var(--adm-sage-soft);
        }

        .badge-paid {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--adm-sage-soft);
          color: var(--adm-sage);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          border: 1px solid var(--adm-sage-soft);
        }
        .badge-paid-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--adm-sage-soft);
          color: var(--adm-sage);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
        }
        .badge-pending-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--adm-amber-soft);
          color: var(--adm-amber);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .bm-card--extras {
          background: var(--adm-surface);
          border: 1px solid var(--adm-border);
        }
        .bm-categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        .bm-category-group {
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          border-radius: 8px;
          padding: 10px 12px;
        }
        .bm-category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--adm-text);
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--adm-border);
        }
        .bm-category-count {
          background: var(--adm-border);
          color: var(--adm-text-2);
          font-size: 0.68rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 9999px;
        }
        .bm-category-items {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .bm-extra-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--adm-text);
        }
        .bm-extra-name {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bm-extra-qty {
          background: var(--adm-surface-2);
          color: var(--adm-text-2);
          font-size: 0.68rem;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
        }
        .bm-extra-price {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bm-extra-unit {
          font-size: 0.72rem;
          color: var(--adm-text-2);
        }

        .bm-deposit-box {
          margin-top: 10px;
          padding: 10px 12px;
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          border-radius: 8px;
        }

        .bm-price-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px dashed var(--adm-sage-soft);
          padding-top: 10px;
          margin-top: 4px;
          font-weight: 700;
          color: var(--adm-sage);
        }

        .bm-total-amount {
          font-size: 1.25rem;
          color: var(--adm-sage);
        }

        .bm-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-top: 1px solid var(--adm-border);
          background: var(--adm-surface-2);
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
          background: var(--adm-surface-2);
          color: var(--adm-text);
          border: 1px solid var(--adm-border-strong);
        }
        .bm-btn--secondary:hover {
          background: var(--adm-border);
        }

        .bm-btn--primary {
          background: var(--adm-sage);
          color: var(--adm-surface);
        }
        .bm-btn--primary:hover {
          background: var(--adm-sage);
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