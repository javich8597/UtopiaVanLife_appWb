'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { useState } from 'react'

export default function CalendarClient({ bookings }: { bookings: any[] }) {
    const [showModal, setShowModal] = useState(false)

    // Transform DB bookings to FullCalendar events
    const events = bookings.map(b => {
        // Colors based on camper or status
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
        // FullCalendar end date is exclusive for all-day events, so we add 1 day
        const end = new Date(b.end_date)
        end.setDate(end.getDate() + 1)

        return {
            id: b.id,
            title: `${b.campers?.name} - ${b.users?.full_name}`,
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
            allDay: true,
            backgroundColor: bgColors[b.status] || '#fcd34d',
            textColor: textColors[b.status] || '#92400e',
            borderColor: 'transparent',
            extendedProps: { ...b }
        }
    })

    // Placeholder for manual blocking
    const handleDateSelect = (selectInfo: any) => {
        if (confirm(`¿Bloquear fechas desde ${selectInfo.startStr} hasta ${selectInfo.endStr}? (MVP: Implementación en próxima fase)`)) {
            // API call to create blocked_date
            console.log('Block dates', selectInfo)
        }
    }

    const handleEventClick = (clickInfo: any) => {
        alert(`Reserva: ${clickInfo.event.title}\nEstado: ${clickInfo.event.extendedProps.status}`)
    }

    return (
        <div className="calendar-wrapper">
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locales={[esLocale]}
                locale="es"
                events={events}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                select={handleDateSelect}
                eventClick={handleEventClick}
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth'
                }}
                height={700}
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
          font-size: 1.5rem !important;
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
        .fc-event {
          cursor: pointer;
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        .fc-day-today {
          background-color: var(--cream) !important;
        }
      `}</style>
        </div>
    )
}
