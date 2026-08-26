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

    // Match resourceId to database camper_id, fallback to demo id based on name/slug
    const resourceId = b.camper_id || (b.campers?.slug === 'space' ? 'demo-2' : 'demo-1')

    return {
      id: b.id,
      resourceId: resourceId,
      title: `${b.campers?.name || 'Camper'} - ${b.customer_name || b.users?.email || 'Cliente'}`,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      allDay: true,
      backgroundColor: bgColors[b.status] || '#fcd34d',
      textColor: textColors[b.status] || '#92400e',
      borderColor: 'transparent',
      extendedProps: { ...b }
    }
  })

  // Placeholder for manual blocking or new reservations
  const handleDateSelect = (selectInfo: any) => {
    const startStr = selectInfo.startStr
    // Timeline selection ends at the exclusive start of the next day, so we adjust for visual feedback
    const endDate = new Date(selectInfo.end)
    endDate.setDate(endDate.getDate() - 1)
    const endStr = endDate.toISOString().split('T')[0]
    
    const resourceName = selectInfo.resource ? selectInfo.resource.title : 'camper'

    if (confirm(`¿Bloquear fechas en ${resourceName} desde ${startStr} hasta ${endStr}?`)) {
      console.log('Block dates selected', selectInfo)
    }
  }

  const handleEventClick = (clickInfo: any) => {
    const props = clickInfo.event.extendedProps
    alert(`Reserva: ${clickInfo.event.title}\n` +
          `Fechas: ${props.start_date} a ${props.end_date}\n` +
          `Total: ${props.total_price}€\n` +
          `Fianza: ${props.deposit_amount}€\n` +
          `Estado: ${props.status}`)
  }

  return (
    <div className="calendar-wrapper">
      <FullCalendar
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
        height={500}
      />

      <style jsx global>{`
        .calendar-wrapper {
          background: white;
          padding: var(--space-6);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
          max-width: 100%;
          overflow-x: auto;
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
      `}</style>
    </div>
  )
}
