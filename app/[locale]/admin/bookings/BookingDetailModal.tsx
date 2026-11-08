'use client'

import { useState } from 'react'
import { useBodyScrollLock } from '@/lib/ui/useBodyScrollLock'
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
  Waves,
  Check,
  Copy,
  Download,
  AlertTriangle,
  Loader2,
  Send
} from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'
import { activePaymentAlerts } from '@/lib/admin/bookingStatus'
import { adminBookingSecondDriver, bookingFlexDeposit, buildBreakdownLines, resolveBasePrice } from '@/lib/admin/bookingBreakdown'
import { buildSesHospedajesReference } from '@/lib/sesHospedajes/xmlGenerator'
import ApproveActionClient from './ApproveActionClient'
import RefundActionClient from './RefundActionClient'

interface Props {
  booking: any
  onClose: () => void
  /** Se llama con las notas nuevas cuando el admin marca los avisos de pago como revisados */
  onAlertsReviewed?: (notes: string) => void
}

export interface SesSentInfo {
  isSent: boolean
  registryNumber?: string
  sentAt?: string
}

export function parseSesSentInfo(notes?: string | null): SesSentInfo | null {
  if (!notes || typeof notes !== 'string') return null
  const regex = /\[SES\.HOSPEDAJES ENVIADO:\s*([^\]]+)\]/gi
  let lastMatch: RegExpExecArray | null = null
  let match: RegExpExecArray | null
  while ((match = regex.exec(notes)) !== null) {
    lastMatch = match
  }
  if (!lastMatch) return null

  const content = lastMatch[1].trim()
  const regMatch = content.match(/Reg(?:istro)?:\s*([A-Za-z0-9\-_./]+)/i)
  const registryNumber = regMatch ? regMatch[1].trim() : undefined

  const dateMatch = content.match(/a las\s*([^\s\]]+(?:\s+[^\s\]]+)*)/i)
  let sentAt: string | undefined
  if (dateMatch) {
    const rawDate = dateMatch[1].trim()
    const d = new Date(rawDate)
    if (!isNaN(d.getTime())) {
      sentAt = d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } else {
      sentAt = rawDate
    }
  }

  return {
    isSent: true,
    registryNumber,
    sentAt,
  }
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

export default function BookingDetailModal({ booking, onClose, onAlertsReviewed }: Props) {
  useBodyScrollLock()
  const [showContractPreview, setShowContractPreview] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // SES.HOSPEDAJES Estados reactivos
  const [sesSentState, setSesSentState] = useState<SesSentInfo | null>(() =>
    parseSesSentInfo(booking?.notes)
  )
  const [transmittingSes, setTransmittingSes] = useState(false)
  const [sesError, setSesError] = useState<string | null>(null)
  const [sesSuccessMsg, setSesSuccessMsg] = useState<string | null>(null)

  const handleCopyReference = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref)
      setCopiedRef(true)
      setTimeout(() => setCopiedRef(false), 2000)
    } catch (err) {
      console.error('Error al copiar la referencia ministerial:', err)
    }
  }

  const handleTransmitSes = async () => {
    setTransmittingSes(true)
    setSesError(null)
    setSesSuccessMsg(null)

    try {
      const res = await fetch('/api/admin/ses-hospedajes/transmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        const errorMsg =
          data.error ||
          data.message ||
          'Error ministerial en la transmisión telemática con SES.HOSPEDAJES.'
        throw new Error(errorMsg)
      }

      const formattedDate = data.sentAt
        ? new Date(data.sentAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })

      const newSentInfo: SesSentInfo = {
        isSent: true,
        registryNumber: data.registryNumber,
        sentAt: formattedDate,
      }
      setSesSentState(newSentInfo)

      setSesSuccessMsg(
        data.registryNumber
          ? `Registro ministerial completado. Código oficial: ${data.registryNumber}`
          : (data.message || 'Parte telemático transmitido correctamente al Ministerio del Interior.')
      )

      if (onAlertsReviewed) {
        const logEntry = data.registryNumber
          ? `[SES.HOSPEDAJES ENVIADO: ${data.reference || sesReference} - Reg: ${data.registryNumber} a las ${data.sentAt || new Date().toISOString()}]`
          : `[SES.HOSPEDAJES ENVIADO: ${data.reference || sesReference} - ${data.message || 'OK'} a las ${data.sentAt || new Date().toISOString()}]`
        const currentNotes = typeof booking.notes === 'string' ? booking.notes : ''
        const updatedNotes = currentNotes ? `${currentNotes}\n${logEntry}` : logEntry
        onAlertsReviewed(updatedNotes)
      }
    } catch (err: any) {
      setSesError(err.message || 'No se pudo completar la transmisión con SES.HOSPEDAJES.')
    } finally {
      setTransmittingSes(false)
    }
  }

  if (!booking) return null

  const paymentAlerts = activePaymentAlerts(booking.notes)

  const markAlertsReviewed = async () => {
    const ok = window.confirm(
      'Confirma que ya has revisado este cobro en el panel del banco (y devuelto el dinero si hacía falta).\n\n' +
      'La reserva dejará de señalarse como "Pago a revisar". No cambia el estado de la reserva ni mueve dinero. ¿Continuar?'
    )
    if (!ok) return
    setReviewing(true)
    setReviewError(null)
    try {
      const res = await fetch('/api/admin/bookings/resolve-payment-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo marcar como revisado')
      onAlertsReviewed?.(data.notes)
    } catch (err: any) {
      setReviewError(err.message || 'No se pudo marcar como revisado')
    } finally {
      setReviewing(false)
    }
  }

  const sesReference = buildSesHospedajesReference(booking, booking.campers)
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
  const basePrice = resolveBasePrice(booking, { kmSupplement, cancellationSupplement, extrasSubtotal, discountAmount })
  const flexDeposit = bookingFlexDeposit(booking)
  const secondDriver = adminBookingSecondDriver(booking)
  const breakdownLines = buildBreakdownLines(booking, {
    basePrice,
    nights,
    kmLabel,
    cancellationLabel,
    kmSupplement,
    cancellationSupplement,
    extrasSubtotal,
    discountAmount,
    extrasCount: parsedExtrasList.length,
  })
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
              <div className="bm-title-row">
                <h3 className="bm-title">Reserva {sesReference}</h3>
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
          {paymentAlerts.length > 0 && (
            <div className="adm-note adm-note--alert bm-alert" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <div className="adm-note__text">
                <strong>Pago a revisar</strong>
                <ul className="bm-alert__list">
                  {paymentAlerts.map(text => <li key={text}>{text}</li>)}
                </ul>
                <p className="bm-alert__hint">
                  Este panel no devuelve dinero: si hay que devolver el cobro, hazlo a mano en el panel del banco.
                </p>
                {reviewError && <p className="bm-alert__error">{reviewError}</p>}
              </div>
              <button type="button" className="adm-btn adm-btn--sm" onClick={markAlertsReviewed} disabled={reviewing}>
                {reviewing ? <Loader2 size={14} className="bm-alert__spin" /> : <Check size={14} />}
                Marcar como revisado
              </button>
            </div>
          )}

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
                  <strong className="bm-nights-val">
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
                    <MapPin size={13} className="bm-icon-muted" /> {pickupLocation}
                  </div>
                </div>

                {/* KM Package */}
                <div className="bm-field bm-field--divider">
                  <span className="bm-label">Paquete de Kilometraje</span>
                  <div className="bm-opt-wrap">
                    <span className={`bm-opt-badge ${kmBadgeClass}`}>
                      <Gauge size={13} /> {kmLabel}
                    </span>
                  </div>
                  <p className="bm-field-hint">
                    {isUnlimitedKm
                      ? `Kilometraje ilimitado sin recargos (+15 €/día × ${nights} días = +${formatPrice(kmSupplement)})`
                      : '150 km/día incluidos en tarifa de alquiler sin coste adicional.'}
                  </p>
                </div>

                {/* Cancellation Policy */}
                <div className="bm-field bm-field--divider">
                  <span className="bm-label">Política de Cancelación</span>
                  <div className="bm-opt-wrap">
                    <span className={`bm-opt-badge ${cancellationBadgeClass}`}>
                      <Shield size={13} /> {cancellationLabel}
                    </span>
                  </div>
                  <p className="bm-field-hint">
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
                  <div className="bm-val bm-val--mono">
                    {clientDni}
                  </div>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Email</span>
                  <div className="bm-val flex-align">
                    <Mail size={13} className="bm-icon-muted" />
                    <a href={`mailto:${clientEmail}`} className="bm-link-sage">
                      {clientEmail}
                    </a>
                  </div>
                </div>
                <div className="bm-field">
                  <span className="bm-label">Teléfono de Contacto</span>
                  <div className="bm-val flex-align bm-phone-row">
                    <div className="bm-contact-item">
                      <Phone size={13} className="bm-icon-muted" /> {clientPhone}
                    </div>
                    {telLink && (
                      <div className="bm-action-pills">
                        <a href={telLink} className="bm-pill-tel">
                          Llamar
                        </a>
                        {whatsAppLink && (
                          <a
                            href={whatsAppLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bm-pill-wa"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bm-field bm-field--divider">
                  <span className="bm-label">Dirección de Facturación</span>
                  <div className="bm-val-sub bm-text-dark">
                    {billingAddress}
                  </div>
                </div>

                <div className="bm-field">
                  <span className="bm-label">Número de Viajeros</span>
                  <div className="bm-val">
                    {travelersCount} {travelersCount === 1 ? 'persona' : 'personas'}
                  </div>
                </div>

                {secondDriver && (
                  <div className="bm-field">
                    <span className="bm-label">Segundo conductor</span>
                    <strong className="bm-val">
                      {secondDriver.fullName || 'Consta segundo conductor, pero faltan sus datos'}
                    </strong>
                    {secondDriver.document && <div className="bm-val bm-val--mono">{secondDriver.document}</div>}
                    <div className="bm-val-sub">
                      {secondDriver.included
                        ? (flexDeposit.isFlex ? 'Incluido sin coste con la fianza Flex.' : 'Sin suplemento registrado en esta reserva.')
                        : `Suplemento de ${formatPrice(secondDriver.supplement)}${secondDriver.ratePerDay > 0 ? ` (${formatPrice(secondDriver.ratePerDay)}/día)` : ''}, ya dentro del total.`}
                    </div>
                  </div>
                )}

                <div className="bm-field">
                  <span className="bm-label">Peticiones o Notas Especiales</span>
                  <div className={`bm-val-sub ${specialNotes !== 'Ninguna' ? '' : 'bm-italic'}`}>
                    {specialNotes}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Categorized Extras */}
          <div className="bm-card bm-card--extras">
            <h4 className="bm-card-title bm-title-extras">
              <Package size={16} className="bm-icon-green" /> Extras y Experiencias Contratadas
            </h4>

            {parsedExtrasList.length === 0 ? (
              <div className="bm-extras-default-note">
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
            <h4 className="bm-card-title bm-title-sage">
              <Euro size={16} /> Desglose Económico Pormenorizado
            </h4>
            <div className="bm-pricing-grid">
              {breakdownLines.map(line => (
                <div key={line.kind} className={`bm-price-row${line.kind === 'discount' ? ' bm-price-row--discount' : ''}`}>
                  <span>{line.label}</span>
                  <strong>
                    {line.included
                      ? 'Incluido'
                      : line.kind === 'base'
                        ? formatPrice(line.amount)
                        : line.amount < 0
                          ? `- ${formatPrice(-line.amount)}`
                          : line.amount > 0
                            ? `+ ${formatPrice(line.amount)}`
                            : formatPrice(0)}
                  </strong>
                </div>
              ))}

              <div className="bm-price-total">
                <div>
                  <div className="bm-paid-tag-wrap">
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
                    <div className="bm-tx-ref">
                      Ref. Transacción: <code className="bm-tx-code">{redsysOrderId}</code>
                    </div>
                  )}
                </div>
                <span className="bm-total-amount">{formatPrice(booking.total_price)}</span>
              </div>

              <div className="bm-deposit-box">
                <div className="bm-deposit-header">
                  <span className="bm-deposit-label">Fianza Informativa Reembolsable (bloqueo)</span>
                  <strong className="bm-deposit-amount">{formatPrice(depositAmount)}</strong>
                </div>
                <p className="bm-deposit-note">
                  Bloqueo preventivo en tarjeta de crédito al momento del check-in. No se cobra por adelantado y se libera íntegramente tras la devolución de la camper.
                </p>
              </div>
            </div>
          </div>

          {/* Official Contract Box */}
          <div className="bm-card bm-card--contract">
            <div className="bm-contract-box-content">
              <div>
                <h4 className="bm-card-title bm-contract-title">
                  <FileText size={16} /> Contrato de Alquiler Oficial
                </h4>
                <p className="bm-contract-desc">
                  Contrato legal de 31 artículos generado automáticamente con cláusulas, datos de la camper y firmas.
                </p>
              </div>

              <div className="bm-contract-actions">
                <a
                  href={`/api/admin/contract?bookingId=${booking.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bm-btn bm-btn--primary bm-contract-link"
                >
                  <ExternalLink size={14} /> Abrir / Imprimir PDF
                </a>
              </div>
            </div>
          </div>

          {/* Official SES.HOSPEDAJES / RD 933/2021 Box */}
          <div className="bm-card bm-card--ses">
            <div className="bm-ses-header">
              <div className="bm-ses-title-wrap">
                <div className="bm-ses-title-left">
                  <h4 className="bm-card-title bm-ses-title">
                    <ShieldCheck size={18} className="bm-ses-icon" />
                    <span>Comunicación Oficial SES.HOSPEDAJES (RD 933/2021)</span>
                  </h4>
                </div>
                <div className="bm-ses-badges">
                  {sesSentState?.isSent && (
                    <span className="bm-ses-badge-sent">
                      <Check size={12} strokeWidth={3} />
                      <span>
                        Registrado en Ministerio
                        {sesSentState.registryNumber ? ` · Nº: ${sesSentState.registryNumber}` : ''}
                        {sesSentState.sentAt ? ` (${sesSentState.sentAt})` : ''}
                      </span>
                    </span>
                  )}
                  <span className="bm-ses-badge">Ministerio del Interior</span>
                </div>
              </div>
            </div>

            <div className="bm-ses-body">
              {sesSuccessMsg && (
                <div className="bm-ses-feedback bm-ses-feedback--success" role="status">
                  <CheckCircle2 size={16} className="bm-ses-feedback-icon" />
                  <div className="bm-ses-feedback-body">
                    <strong className="bm-ses-feedback-title">Transmisión Ministerial Confirmada</strong>
                    <p className="bm-ses-feedback-text">{sesSuccessMsg}</p>
                  </div>
                </div>
              )}

              {sesError && (
                <div className="bm-ses-feedback bm-ses-feedback--error" role="alert">
                  <AlertCircle size={16} className="bm-ses-feedback-icon" />
                  <div className="bm-ses-feedback-body">
                    <strong className="bm-ses-feedback-title">Aviso de Servicio Web SES.HOSPEDAJES</strong>
                    <p className="bm-ses-feedback-text">{sesError}</p>
                  </div>
                </div>
              )}

              <div className="bm-ses-ref-box">
                <div className="bm-ses-ref-info">
                  <span className="bm-label">Referencia Ministerial Oficial</span>
                  <code className="bm-ses-ref-code">{sesReference}</code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyReference(sesReference)}
                  className={`bm-btn-copy ${copiedRef ? 'bm-btn-copy--copied' : ''}`}
                  title="Copiar referencia ministerial para SES.HOSPEDAJES"
                  aria-label="Copiar referencia ministerial"
                >
                  {copiedRef ? (
                    <>
                      <Check size={13} />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copiar Referencia</span>
                    </>
                  )}
                </button>
              </div>

              <p className="bm-ses-note">
                Transmisión telemática directa mediante Web Service SOAP oficial con el Ministerio del Interior. Puedes transmitir directamente con un clic o descargar el XML para importación manual en la Sede.
              </p>

              <div className="bm-ses-actions">
                <button
                  type="button"
                  onClick={handleTransmitSes}
                  disabled={transmittingSes}
                  className="bm-btn bm-btn--primary bm-ses-btn-transmit"
                  title="Transmitir parte de alquiler telemáticamente al Ministerio del Interior"
                >
                  {transmittingSes ? (
                    <>
                      <Loader2 size={14} className="bm-spin" />
                      <span>Transmitiendo a SES.HOSPEDAJES...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>
                        {sesSentState?.isSent
                          ? 'Re-transmitir a SES.HOSPEDAJES'
                          : 'Transmitir a SES.HOSPEDAJES'}
                      </span>
                    </>
                  )}
                </button>

                <a
                  href={`/api/admin/ses-hospedajes/xml?bookingId=${booking.id}`}
                  download
                  className="bm-btn bm-btn--secondary bm-ses-btn-dl"
                  title="Descargar XML oficial para importación manual"
                >
                  <Download size={14} />
                  <span>Descargar XML Oficial</span>
                </a>

                <a
                  href="https://hospedajes.ses.mir.es/hospedajes-sede/#/comunicacion/alta-masiva"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bm-btn bm-btn--secondary bm-ses-btn-ext"
                  title="Abrir sección de Alta Masiva en la Sede Electrónica del Ministerio"
                >
                  <ExternalLink size={14} />
                  <span>Abrir Sede Alta Masiva</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="bm-footer">
          <div className="bm-footer-actions">
            <ApproveActionClient bookingId={booking.id} status={booking.status} />
            <RefundActionClient bookingId={booking.id} status={booking.status} paymentStatus={booking.payment_status} />
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
          flex-shrink: 0;
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


        .bm-alert__list {
          margin: 6px 0 0;
          padding-left: 18px;
          color: var(--adm-text);
        }
        .bm-alert__hint {
          margin: 6px 0 0;
          color: var(--adm-text-2);
        }
        .bm-alert__error {
          margin: 6px 0 0;
          font-weight: 600;
          color: var(--adm-rose);
        }
        :global(.bm-alert__spin) {
          animation: bm-alert-spin 1s linear infinite;
        }
        @keyframes bm-alert-spin {
          to { transform: rotate(360deg); }
        }

        .bm-body {
          padding: 24px;
          padding-bottom: 36px;
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          display: flex;
          flex-direction: column;
          gap: 18px;
          scrollbar-width: thin;
          scrollbar-color: var(--adm-border-strong) transparent;
        }

        .bm-body::-webkit-scrollbar {
          width: 6px;
        }

        .bm-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .bm-body::-webkit-scrollbar-thumb {
          background: var(--adm-border-strong);
          border-radius: 9999px;
        }

        .bm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
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

        .bm-card--ses {
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          border-radius: 12px;
          position: relative;
          padding: 20px 22px;
        }

        .bm-card--ses::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          border-radius: 12px 12px 0 0;
          background: linear-gradient(90deg, var(--adm-sage) 0%, #D97706 100%);
        }

        .bm-ses-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .bm-ses-title-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          flex-wrap: wrap;
          gap: 10px;
        }

        .bm-ses-title-left {
          display: flex;
          align-items: center;
        }

        .bm-ses-title {
          margin: 0;
          color: var(--adm-text);
          font-size: 0.92rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bm-ses-icon {
          color: var(--adm-sage);
          flex-shrink: 0;
        }

        .bm-ses-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .bm-ses-badge {
          display: inline-flex;
          align-items: center;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 3px 9px;
          border-radius: 9999px;
          background: var(--adm-gold-soft);
          color: var(--adm-gold-text);
          border: 1px solid rgba(217, 119, 6, 0.25);
        }

        .bm-ses-badge-sent {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 9999px;
          background: var(--adm-sage-soft);
          color: var(--adm-sage);
          border: 1px solid var(--adm-sage);
          letter-spacing: 0.01em;
        }

        .bm-ses-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bm-ses-feedback {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          line-height: 1.4;
          animation: bmFadeIn 0.2s ease-out;
        }

        @keyframes bmFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .bm-ses-feedback--success {
          background: var(--adm-sage-soft);
          border: 1px solid var(--adm-sage);
          color: var(--adm-text);
        }

        .bm-ses-feedback--success .bm-ses-feedback-icon {
          color: var(--adm-sage);
          margin-top: 2px;
          flex-shrink: 0;
        }

        .bm-ses-feedback--error {
          background: var(--adm-amber-soft, #fef3c7);
          border: 1px solid var(--adm-amber, #d97706);
          color: var(--adm-text);
        }

        .bm-ses-feedback--error .bm-ses-feedback-icon {
          color: var(--adm-amber, #d97706);
          margin-top: 2px;
          flex-shrink: 0;
        }

        .bm-ses-feedback-body {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .bm-ses-feedback-title {
          font-weight: 700;
          font-size: 0.84rem;
        }

        .bm-ses-feedback-text {
          margin: 0;
          color: var(--adm-text-2);
          word-break: break-word;
        }

        .bm-ses-ref-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: var(--adm-surface);
          border: 1px solid var(--adm-border);
          border-radius: 8px;
          padding: 10px 14px;
        }

        .bm-ses-ref-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .bm-ses-ref-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--adm-sage);
          word-break: break-all;
        }

        .bm-btn-copy {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--adm-surface-2);
          color: var(--adm-text);
          border: 1px solid var(--adm-border-strong);
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .bm-btn-copy:hover {
          background: var(--adm-border);
          color: var(--adm-text);
        }

        .bm-btn-copy--copied {
          background: var(--adm-sage-soft);
          color: var(--adm-sage);
          border-color: var(--adm-sage);
        }

        .bm-ses-note {
          font-size: 0.82rem;
          line-height: 1.45;
          color: var(--adm-text-2);
          margin: 0;
        }

        .bm-ses-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding-top: 4px;
        }

        .bm-ses-btn-transmit,
        .bm-btn--ses-transmit {
          background: var(--adm-sage);
          color: #ffffff;
          font-weight: 700;
        }

        .bm-ses-btn-transmit:hover:not(:disabled),
        .bm-btn--ses-transmit:hover:not(:disabled) {
          opacity: 0.92;
        }

        .bm-ses-btn-transmit:disabled,
        .bm-btn--ses-transmit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .bm-spin {
          animation: bmSpin 1s linear infinite;
        }

        @keyframes bmSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .bm-ses-btn-dl {
          text-decoration: none;
        }

        .bm-ses-btn-ext {
          text-decoration: none;
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
          gap: 12px;
          font-size: 0.88rem;
          color: var(--adm-text);
        }

        .bm-price-row--discount {
          color: var(--adm-sage);
        }

        .bm-val--mono {
          font-family: monospace;
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
          flex-shrink: 0;
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

        .bm-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .bm-nights-val {
          font-size: 1.05rem;
          color: var(--adm-sage);
        }

        .bm-icon-muted {
          color: var(--adm-text-2);
          flex-shrink: 0;
        }

        .bm-field--divider {
          padding-top: 8px;
          border-top: 1px dashed var(--adm-border);
        }

        .bm-opt-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }

        .bm-field-hint {
          font-size: 0.78rem;
          color: var(--adm-text-2);
          margin: 3px 0 0;
        }

        .bm-val--mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .bm-link-sage {
          color: var(--adm-sage);
          text-decoration: none;
        }
        .bm-link-sage:hover {
          text-decoration: underline;
        }

        .bm-phone-row {
          flex-wrap: wrap;
          gap: 8px;
        }

        .bm-contact-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bm-action-pills {
          display: inline-flex;
          gap: 6px;
        }

        .bm-pill-tel {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--adm-sage);
          background: var(--adm-sage-soft);
          padding: 2px 8px;
          border-radius: 9999px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }

        .bm-pill-wa {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--adm-text-2);
          background: var(--adm-surface-2);
          padding: 2px 8px;
          border-radius: 9999px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }

        .bm-text-dark {
          color: var(--adm-text);
        }

        .bm-italic {
          font-style: italic;
          color: var(--adm-text-2);
        }

        .bm-title-extras {
          color: var(--adm-text);
          margin-bottom: 12px;
        }

        .bm-extras-default-note {
          padding: 8px 12px;
          background: var(--adm-surface-2);
          border-radius: 8px;
          font-size: 0.85rem;
          color: var(--adm-text-2);
        }

        .bm-title-sage {
          color: var(--adm-sage);
        }

        .bm-price-row--discount {
          color: var(--adm-sage);
        }

        .bm-paid-tag-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .bm-tx-ref {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--adm-text-2);
          margin-top: 2px;
        }

        .bm-tx-code {
          color: var(--adm-sage);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .bm-deposit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bm-deposit-label {
          font-weight: 600;
          color: var(--adm-text);
        }

        .bm-deposit-amount {
          color: var(--adm-text);
        }

        .bm-deposit-note {
          font-size: 0.78rem;
          color: var(--adm-text-2);
          margin: 4px 0 0;
        }

        .bm-contract-box-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .bm-contract-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bm-contract-desc {
          font-size: 0.82rem;
          color: var(--adm-text-2);
          margin: 4px 0 0;
        }

        .bm-contract-actions {
          display: flex;
          gap: 8px;
        }

        .bm-contract-link {
          text-decoration: none;
        }

        .bm-btn--primary {
          background: var(--adm-sage);
          color: #ffffff;
        }
        .bm-btn--primary:hover {
          background: var(--adm-sage);
          opacity: 0.92;
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

          .bm-alert {
            flex-wrap: wrap;
          }
          .bm-alert :global(.adm-btn) {
            width: 100%;
            min-height: 44px;
            justify-content: center;
          }
          .bm-close-btn {
            min-width: 44px;
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .bm-body {
            padding: 16px 16px 36px 16px;
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
            min-height: 44px;
            justify-content: center;
          }
          .bm-ses-title-wrap {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .bm-ses-badges {
            width: 100%;
            flex-wrap: wrap;
            gap: 6px;
          }
          .bm-ses-badge-sent {
            width: 100%;
            justify-content: flex-start;
            padding: 4px 10px;
            font-size: 0.72rem;
            white-space: normal;
            word-break: break-word;
          }
          .bm-ses-feedback {
            padding: 10px 12px;
          }
          .bm-ses-ref-box {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .bm-ses-actions {
            flex-direction: column;
            width: 100%;
            gap: 8px;
          }
          .bm-ses-actions .bm-btn {
            width: 100%;
            min-height: 44px;
            justify-content: center;
          }
          .bm-btn-copy {
            width: 100%;
            justify-content: center;
            min-height: 44px;
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