'use client'

import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { useState } from 'react'

interface Props {
  bookings: any[]
  campers: any[]
}

export default function CalendarClient({ bookings, campers }: Props) {
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string; camper: string } | null>(null)

  // Transform DB campers to FullCalendar resources
  const resources = campers.length > 0
    ? campers.map(c => ({
        id: c.id,
        title: c.name,
      }))
    : [
        { id: 'demo-1', title: 'NEO' },
        { id: 'demo-2', title: 'SPACE' }
      ]

  // Transform DB bookings to FullCalendar events
  const events = bookings.map(b => {
    const bgColors: Record<string, string> = {
      pending: '#fef08a', // yellow-200
      confirmed: '#bbf7d0', // green-200
      active: '#22c55e', // green-500
      completed: '#e5e7eb', // gray-200
    }
    const textColors: Record<string, string> = {
      pending: '#854d0e',
      confirmed: '#166534',
      active: 'white',
      completed: '#374151',
    }

    const start = new Date(b.start_date)
    const end = new Date(b.end_date)
    // FullCalendar end date is exclusive for all-day events, so we add 1 day
    end.setDate(end.getDate() + 1)

    const clientName = b.customer_name || b.users?.full_name || b.customer_email || b.users?.email || 'Cliente'
    const camperName = b.campers?.name || 'Camper'

    // Match resourceId to database camper_id, fallback to demo id based on name/slug
    const resourceId = b.camper_id || (b.campers?.slug === 'space' ? 'demo-2' : 'demo-1')

    return {
      id: b.id,
      resourceId: resourceId,
      title: `${camperName} · ${clientName}`,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      allDay: true,
      backgroundColor: bgColors[b.status] || '#fcd34d',
      textColor: textColors[b.status] || '#92400e',
      borderColor: 'transparent',
      extendedProps: { ...b }
    }
  })

  const handleDateSelect = (selectInfo: any) => {
    const startStr = selectInfo.startStr
    const endDate = new Date(selectInfo.end)
    endDate.setDate(endDate.getDate() - 1)
    const endStr = endDate.toISOString().split('T')[0]
    const resourceName = selectInfo.resource ? selectInfo.resource.title : 'Camper'

    setSelectedRange({
      start: startStr,
      end: endStr,
      camper: resourceName
    })
  }

  const handleEventClick = (clickInfo: any) => {
    setSelectedBooking(clickInfo.event.extendedProps)
  }

  return (
    <div className="calendar-wrapper">
      <FullCalendar
        schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineMonth"
        locales={[esLocale]}
        locale="es"
        resources={resources}
        events={events}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        select={handleDateSelect}
        eventClick={handleEventClick}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimelineMonth,resourceTimelineWeek,resourceTimelineDay'
        }}
        resourceAreaHeaderContent="Campers"
        resourceAreaWidth="15%"
        height={520}
      />

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="calendar-modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="calendar-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--gray-200)', paddingBottom: 'var(--space-3)' }}>
              <div>
                <span className="text-xs" style={{ color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 600 }}>Detalle de Reserva</span>
                <h3 className="text-h4" style={{ margin: 0 }}>{selectedBooking.campers?.name || 'Camper'}</h3>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: '0.9rem' }}>
              <div>
                <strong style={{ color: 'var(--gray-600)' }}>Cliente: </strong>
                <span>{selectedBooking.customer_name || selectedBooking.users?.full_name || 'Viajero Utopia'}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--gray-600)' }}>Email: </strong>
                <span>{selectedBooking.customer_email || selectedBooking.users?.email || '-'}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--gray-600)' }}>Fechas: </strong>
                <span>{selectedBooking.start_date} → {selectedBooking.end_date}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--gray-600)' }}>Total Reserva: </strong>
                <span style={{ fontWeight: 700, color: 'var(--forest-green)' }}>{selectedBooking.total_price} €</span>
              </div>
              {selectedBooking.deposit_amount && (
                <div>
                  <strong style={{ color: 'var(--gray-600)' }}>Fianza: </strong>
                  <span>{selectedBooking.deposit_amount} €</span>
                </div>
              )}
              <div>
                <strong style={{ color: 'var(--gray-600)' }}>Estado: </strong>
                <span className={`status-badge status-${selectedBooking.status}`}>
                  {selectedBooking.status === 'confirmed' ? 'Confirmada' :
                   selectedBooking.status === 'active' ? 'En Curso' :
                   selectedBooking.status === 'pending' ? 'Pendiente' :
                   selectedBooking.status === 'completed' ? 'Completada' : 'Cancelada'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button onClick={() => setSelectedBooking(null)} className="btn btn-forest btn-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Block Modal */}
      {selectedRange && (
        <div className="calendar-modal-overlay" onClick={() => setSelectedRange(null)}>
          <div className="calendar-modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-h4" style={{ marginBottom: 'var(--space-3)' }}>Bloqueo de Fechas</h3>
            <p className="text-body" style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-4)' }}>
              ¿Deseas bloquear las fechas seleccionadas en la camper <strong>{selectedRange.camper}</strong>?
            </p>
            <div style={{ background: 'var(--cream)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-4)' }}>
              <div><strong>Inicio:</strong> {selectedRange.start}</div>
              <div><strong>Fin:</strong> {selectedRange.end}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button onClick={() => setSelectedRange(null)} className="btn btn-outline btn-sm">Cancelar</button>
              <button onClick={() => { alert('Bloqueo guardado correctamente'); setSelectedRange(null) }} className="btn btn-forest btn-sm">Guardar Bloqueo</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .calendar-wrapper {
          background: white;
          padding: var(--space-6);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
          max-width: 100%;
          overflow-x: auto;
          position: relative;
        }
        .fc {
          font-family: var(--font-sans);
        }
        .fc-toolbar-title {
          font-family: var(--font-display);
          font-size: 1.3rem !important;
          color: var(--black-matte);
        }
        .fc-button-primary {
          background-color: var(--forest-green) !important;
          border-color: var(--forest-green) !important;
          text-transform: capitalize;
        }
        .fc-button-primary:hover {
          background-color: var(--sand-dark) !important;
          border-color: var(--sand-dark) !important;
        }
        .fc-timeline-event {
          cursor: pointer;
          border-radius: 4px;
          padding: 2px 4px;
          font-weight: 500;
        }
        .fc-datagrid-cell {
          font-weight: 600;
          color: var(--black-matte);
          background: var(--cream);
        }
        .calendar-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }
        .calendar-modal-content {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          max-width: 480px;
          width: 100%;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--gray-200);
          animation: scaleIn 0.15s ease-out;
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
