'use client'

import React from 'react'
import { Link } from '@/i18n/routing'
import { ArrowUpRight, ShieldAlert, Clock, CheckCircle2, Navigation } from 'lucide-react'

interface Props {
  bookingId: string
  status: string
  verificationStatus?: string | null
  customerName?: string | null
}

export default function BookingStatusAction({
  bookingId,
  status,
  verificationStatus,
  customerName,
}: Props) {
  // Format labels & icons
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pendiente',
          icon: Clock,
          className: 'status-action--pending',
          href: `/admin/bookings?search=${bookingId}&status=pending`,
          title: 'Reserva pendiente de pago. Clic para ver y gestionar en Reservas',
          badgeSuffix: '⚡',
        }
      case 'confirmed':
        return {
          label: 'Confirmada',
          icon: CheckCircle2,
          className: 'status-action--confirmed',
          href: `/admin/bookings?search=${bookingId}`,
          title: 'Reserva confirmada. Clic para abrir ficha de reserva',
          badgeSuffix: '✓',
        }
      case 'active':
        return {
          label: 'En Curso',
          icon: Navigation,
          className: 'status-action--active',
          href: `/admin/bookings?search=${bookingId}`,
          title: 'Camper actualmente en viaje. Clic para ver detalles',
          badgeSuffix: '🚐',
        }
      case 'completed':
        return {
          label: 'Completada',
          icon: CheckCircle2,
          className: 'status-action--completed',
          href: `/admin/bookings?search=${bookingId}`,
          title: 'Viaje finalizado. Clic para ver historial',
          badgeSuffix: '',
        }
      case 'cancelled':
        return {
          label: 'Cancelada',
          icon: Clock,
          className: 'status-action--cancelled',
          href: `/admin/bookings?search=${bookingId}`,
          title: 'Reserva cancelada',
          badgeSuffix: '',
        }
      default:
        return {
          label: status,
          icon: Clock,
          className: 'status-action--neutral',
          href: `/admin/bookings?search=${bookingId}`,
          title: 'Clic para ver detalles',
          badgeSuffix: '',
        }
    }
  }

  const config = getStatusConfig()
  const isDocPending = verificationStatus === 'pending_validation'

  return (
    <div className="status-actions-cell">
      {/* Botón interactivo de Estado de la Reserva */}
      <Link
        href={config.href as any}
        className={`status-action-btn ${config.className}`}
        title={config.title}
        aria-label={`${config.label} para reserva ${bookingId}. Clic para gestionar.`}
      >
        <span className="status-action-text">{config.label} {config.badgeSuffix}</span>
        <ArrowUpRight size={13} className="status-action-arrow" />
      </Link>

      {/* Si la documentación del cliente está pendiente de validación */}
      {isDocPending && (
        <Link
          href="/admin/verifications"
          className="status-doc-warning-pill"
          title={`Documentación pendiente de ${customerName || 'cliente'}. Clic para validar DNI/Carnet`}
          aria-label="Documentación pendiente de validación. Clic para ir a Verificaciones."
        >
          <ShieldAlert size={12} />
          <span>Doc. pendiente</span>
        </Link>
      )}
    </div>
  )
}

