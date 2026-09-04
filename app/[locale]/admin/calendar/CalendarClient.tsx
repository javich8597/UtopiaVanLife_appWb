'use client'

import { useState, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  Truck,
  CheckCircle2,
  Clock,
  Euro,
  User,
  Phone,
  Mail,
  X,
  Plus
} from 'lucide-react'

interface Props {
  bookings: any[]
  campers: any[]
}

const CAMPER_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  neo: {
    bg: '#E8F5E9',
    border: '#2E7D32',
    text: '#1B5E20',
    dot: '#2E7D32'
  },
  space: {
    bg: '#E3F2FD',
    border: '#1976D2',
    text: '#0D47A1',
    dot: '#1976D2'
  },
  default: {
    bg: '#F3E8FF',
    border: '#7E22CE',
    text: '#581C87',
    dot: '#7E22CE'
  }
}

export default function CalendarClient({ bookings, campers }: Props) {
  const [calendarRef, setCalendarRef] = useState<any>(null)
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'year'>('dayGridMonth')
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear())
  const [currentTitle, setCurrentTitle] = useState('')
  const [selectedCamperFilter, setSelectedCamperFilter] = useState<string>('all')
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null)

  // Filter bookings by selected camper
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (selectedCamperFilter === 'all') return true
      const slug = b.campers?.slug?.toLowerCase() || ''
      const camperId = b.camper_id || ''
      return slug === selectedCamperFilter || camperId === selectedCamperFilter
    })
  }, [bookings, selectedCamperFilter])

  // Transform bookings into Google Calendar-style events
  const events = useMemo(() => {
    return filteredBookings.map(b => {
      const camperSlug = (b.campers?.slug || 'neo').toLowerCase()
      const colorScheme = CAMPER_COLORS[camperSlug] || CAMPER_COLORS.default
      const camperName = b.campers?.name || 'Camper'
      const clientName = b.customer_name || b.users?.full_name || 'Viajero Utopia'

      const pickupTime = b.pickup_time || '10:00'
      const dropoffTime = b.dropoff_time || '18:00'

      // Exact datetime strings for timeGrid & dayGrid
      const startIso = `${b.start_date}T${pickupTime.length === 5 ? pickupTime : '10:00'}:00`
      const endIso = `${b.end_date}T${dropoffTime.length === 5 ? dropoffTime : '18:00'}:00`

      const isConfirmed = b.status === 'confirmed' || b.status === 'active'

      return {
        id: b.id,
        title: `${camperName} · ${clientName}`,
        start: startIso,
        end: endIso,
        allDay: false,
        backgroundColor: colorScheme.bg,
        borderColor: colorScheme.border,
        textColor: colorScheme.text,
        extendedProps: {
          ...b,
          pickupTime,
          dropoffTime,
          camperSlug,
          colorScheme,
          camperName,
          clientName,
          isConfirmed
        }
      }
    })
  }, [filteredBookings])

  const handleDateSelect = (selectInfo: any) => {
    const startStr = selectInfo.startStr
    const endDate = new Date(selectInfo.end)
    if (selectInfo.allDay) {
      endDate.setDate(endDate.getDate() - 1)
    }
    const endStr = endDate.toISOString().split('T')[0]

    setSelectedRange({
      start: startStr,
      end: endStr
    })
  }

  const handleEventClick = (clickInfo: any) => {
    setSelectedBooking(clickInfo.event.extendedProps)
  }

  // Navigation handlers
  const handlePrev = () => {
    if (currentView === 'year') {
      setCurrentYear(y => y - 1)
      return
    }
    const api = calendarRef?.getApi()
    if (api) {
      api.prev()
      setCurrentTitle(api.view.title)
    }
  }

  const handleNext = () => {
    if (currentView === 'year') {
      setCurrentYear(y => y + 1)
      return
    }
    const api = calendarRef?.getApi()
    if (api) {
      api.next()
      setCurrentTitle(api.view.title)
    }
  }

  const handleToday = () => {
    if (currentView === 'year') {
      setCurrentYear(new Date().getFullYear())
      return
    }
    const api = calendarRef?.getApi()
    if (api) {
      api.today()
      setCurrentTitle(api.view.title)
    }
  }

  const handleViewChange = (viewName: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'year') => {
    setCurrentView(viewName)
    if (viewName !== 'year') {
      const api = calendarRef?.getApi()
      if (api) {
        api.changeView(viewName)
        setCurrentTitle(api.view.title)
      }
    }
  }

  // Generate 12 months for Google Calendar annual view
  const yearMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const firstDay = new Date(currentYear, m, 1)
      const lastDay = new Date(currentYear, m + 1, 0)
      const daysInMonth = lastDay.getDate()
      const startingDay = (firstDay.getDay() + 6) % 7 // Monday = 0

      const days: { dayNumber: number; dateStr: string; bookings: any[] }[] = []
      for (let d = 1; d <= daysInMonth; d++) {
        const monthStr = String(m + 1).padStart(2, '0')
        const dayStr = String(d).padStart(2, '0')
        const dateStr = `${currentYear}-${monthStr}-${dayStr}`

        const dayBookings = filteredBookings.filter(b => {
          const s = b.start_date
          const e = b.end_date
          return dateStr >= s && dateStr <= e
        })

        days.push({
          dayNumber: d,
          dateStr,
          bookings: dayBookings
        })
      }

      const monthName = firstDay.toLocaleDateString('es-ES', { month: 'long' })
      return {
        monthIndex: m,
        monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        startingDay,
        days
      }
    })
  }, [currentYear, filteredBookings])

  return (
    <div className="gcal-container">
      {/* Google Calendar Style Top App Bar */}
      <div className="gcal-header">
        <div className="gcal-header__left">
          <button onClick={handleToday} className="gcal-btn gcal-btn--today">
            Hoy
          </button>

          <div className="gcal-nav-arrows">
            <button onClick={handlePrev} className="gcal-icon-btn" title="Anterior">
              <ChevronLeft size={20} />
            </button>
            <button onClick={handleNext} className="gcal-icon-btn" title="Siguiente">
              <ChevronRight size={20} />
            </button>
          </div>

          <h2 className="gcal-title">
            {currentView === 'year' ? `Año ${currentYear}` : (currentTitle || 'Calendario de Ocupación')}
          </h2>
        </div>

        <div className="gcal-header__right">
          {/* Camper Filter Pills */}
          <div className="gcal-camper-pills">
            <button
              onClick={() => setSelectedCamperFilter('all')}
              className={`gcal-pill ${selectedCamperFilter === 'all' ? 'gcal-pill--active' : ''}`}
            >
              <span className="gcal-dot" style={{ background: '#4b5563' }} />
              Toda la Flota ({bookings.length})
            </button>

            {campers.map(c => {
              const slug = (c.slug || '').toLowerCase()
              const scheme = CAMPER_COLORS[slug] || CAMPER_COLORS.default
              const count = bookings.filter(b => (b.campers?.slug || '').toLowerCase() === slug).length
              const isActive = selectedCamperFilter === slug

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCamperFilter(isActive ? 'all' : slug)}
                  className={`gcal-pill ${isActive ? 'gcal-pill--active' : ''}`}
                >
                  <span className="gcal-dot" style={{ background: scheme.dot }} />
                  {c.name} ({count})
                </button>
              )
            })}
          </div>

          {/* View Mode Switcher (Year / Month / Week / Day) */}
          <div className="gcal-view-selector">
            <button
              onClick={() => handleViewChange('year')}
              className={`gcal-view-btn ${currentView === 'year' ? 'gcal-view-btn--active' : ''}`}
            >
              Año
            </button>
            <button
              onClick={() => handleViewChange('dayGridMonth')}
              className={`gcal-view-btn ${currentView === 'dayGridMonth' ? 'gcal-view-btn--active' : ''}`}
            >
              Mes
            </button>
            <button
              onClick={() => handleViewChange('timeGridWeek')}
              className={`gcal-view-btn ${currentView === 'timeGridWeek' ? 'gcal-view-btn--active' : ''}`}
            >
              Semana
            </button>
            <button
              onClick={() => handleViewChange('timeGridDay')}
              className={`gcal-view-btn ${currentView === 'timeGridDay' ? 'gcal-view-btn--active' : ''}`}
            >
              Día
            </button>
          </div>
        </div>
      </div>

      {/* Main View: Year Grid or FullCalendar */}
      <div className="gcal-body">
        {currentView === 'year' ? (
          <div className="gcal-year-grid">
            {yearMonths.map(m => (
              <div key={m.monthIndex} className="gcal-year-month-card">
                <div
                  className="gcal-year-month-title"
                  onClick={() => {
                    handleViewChange('dayGridMonth')
                    setTimeout(() => {
                      const api = calendarRef?.getApi()
                      if (api) {
                        api.gotoDate(new Date(currentYear, m.monthIndex, 1))
                        setCurrentTitle(api.view.title)
                      }
                    }, 50)
                  }}
                  title="Haz clic para ver el mes en grande"
                >
                  {m.monthName}
                </div>
                <div className="gcal-year-days-header">
                  <span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span>
                </div>
                <div className="gcal-year-days-grid">
                  {/* Empty cells before month start */}
                  {Array.from({ length: m.startingDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="gcal-year-day-cell gcal-year-day-cell--empty" />
                  ))}

                  {/* Day cells */}
                  {m.days.map(d => {
                    const hasBooking = d.bookings.length > 0
                    const firstBooking = d.bookings[0]
                    const slug = (firstBooking?.campers?.slug || 'neo').toLowerCase()
                    const scheme = CAMPER_COLORS[slug] || CAMPER_COLORS.default

                    return (
                      <div
                        key={d.dateStr}
                        className={`gcal-year-day-cell ${hasBooking ? 'gcal-year-day-cell--booked' : ''}`}
                        style={hasBooking ? {
                          backgroundColor: scheme.bg,
                          color: scheme.text,
                          borderColor: scheme.border
                        } : undefined}
                        onClick={() => {
                          if (hasBooking) {
                            setSelectedBooking({
                              ...firstBooking,
                              camperName: firstBooking.campers?.name || 'Camper',
                              clientName: firstBooking.customer_name || firstBooking.users?.full_name || 'Viajero Utopia',
                              colorScheme: scheme
                            })
                          }
                        }}
                        title={hasBooking ? `${firstBooking.campers?.name}: ${firstBooking.customer_name}` : d.dateStr}
                      >
                        <span>{d.dayNumber}</span>
                        {hasBooking && (
                          <span className="gcal-year-dot" style={{ backgroundColor: scheme.dot }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <FullCalendar
            ref={setCalendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            locales={[esLocale]}
            locale="es"
            events={events}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            headerToolbar={false}
            select={handleDateSelect}
            eventClick={handleEventClick}
            datesSet={(arg) => setCurrentTitle(arg.view.title)}
            height="auto"
            slotMinTime="07:00:00"
            slotMaxTime="23:00:00"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false,
              hour12: false
            }}
            eventContent={(eventInfo) => {
              const ext = eventInfo.event.extendedProps
              const pTime = ext.pickupTime || '10:00'
              const dTime = ext.dropoffTime || '18:00'
              return (
                <div
                  className="gcal-event-pill"
                  style={{
                    backgroundColor: eventInfo.event.backgroundColor,
                    borderColor: eventInfo.event.borderColor,
                    color: eventInfo.event.textColor
                  }}
                  title={`${eventInfo.event.title} (Recogida: ${pTime}h - Devolución: ${dTime}h)`}
                >
                  <span className="gcal-event-dot" style={{ backgroundColor: ext.colorScheme?.dot }} />
                  <span className="gcal-event-time">{pTime}h</span>
                  <span className="gcal-event-title">{eventInfo.event.title}</span>
                  <span className="gcal-event-time" style={{ opacity: 0.85 }}>→ {dTime}h</span>
                  <span className="gcal-event-status">
                    {ext.isConfirmed ? '✓' : '⌛'}
                  </span>
                </div>
              )
            }}
          />
        )}
      </div>

      {/* Booking Detail Modal (Google Calendar Event Card) */}
      {selectedBooking && (
        <div className="gcal-modal-backdrop" onClick={() => setSelectedBooking(null)}>
          <div className="gcal-modal-card" onClick={e => e.stopPropagation()}>
            <div className="gcal-modal-top" style={{ borderLeft: `6px solid ${selectedBooking.colorScheme?.dot || '#16a34a'}` }}>
              <div style={{ flex: 1 }}>
                <span className="gcal-modal-badge" style={{ backgroundColor: selectedBooking.colorScheme?.bg, color: selectedBooking.colorScheme?.text }}>
                  {selectedBooking.camperName}
                </span>
                <h3 className="gcal-modal-title">{selectedBooking.clientName}</h3>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="gcal-close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="gcal-modal-details">
              <div className="gcal-detail-row">
                <CalendarIcon size={18} className="gcal-detail-icon" />
                <div>
                  <span className="gcal-detail-label">Periodo y Horarios de Alquiler</span>
                  <div className="gcal-detail-value" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>
                      <strong>Recogida: </strong>
                      {new Date(selectedBooking.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      <span className="gcal-time-tag"> a las {selectedBooking.pickupTime || '10:00'}h</span>
                    </div>
                    <div>
                      <strong>Devolución: </strong>
                      {new Date(selectedBooking.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      <span className="gcal-time-tag"> a las {selectedBooking.dropoffTime || '18:00'}h</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gcal-detail-row">
                <User size={18} className="gcal-detail-icon" />
                <div>
                  <span className="gcal-detail-label">Cliente & Contacto</span>
                  <div className="gcal-detail-value">{selectedBooking.customer_name || selectedBooking.clientName}</div>
                  <div className="gcal-detail-sub">{selectedBooking.customer_email || selectedBooking.users?.email || '-'}</div>
                  {selectedBooking.customer_phone && (
                    <div className="gcal-detail-sub">{selectedBooking.customer_phone}</div>
                  )}
                </div>
              </div>

              <div className="gcal-detail-row">
                <Euro size={18} className="gcal-detail-icon" />
                <div>
                  <span className="gcal-detail-label">Importe Total</span>
                  <div className="gcal-detail-value" style={{ color: '#16a34a', fontWeight: 700 }}>
                    {selectedBooking.total_price} €
                    <span style={{ fontSize: '0.82rem', fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                      (+ {selectedBooking.deposit_amount || 500} € fianza)
                    </span>
                  </div>
                </div>
              </div>

              <div className="gcal-detail-row">
                <Clock size={18} className="gcal-detail-icon" />
                <div>
                  <span className="gcal-detail-label">Estado de la Reserva</span>
                  <span className={`gcal-status-pill gcal-status--${selectedBooking.status}`}>
                    {selectedBooking.status === 'confirmed' ? 'Confirmada' :
                     selectedBooking.status === 'active' ? 'En Curso' :
                     selectedBooking.status === 'pending' ? 'Pendiente' :
                     selectedBooking.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </span>
                </div>
              </div>
            </div>

            <div className="gcal-modal-footer">
              <a
                href={`/es/admin/bookings`}
                className="gcal-btn gcal-btn--secondary"
                style={{ textDecoration: 'none' }}
              >
                Ver en Reservas
              </a>
              <button onClick={() => setSelectedBooking(null)} className="gcal-btn gcal-btn--primary">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Selection / Block Modal */}
      {selectedRange && (
        <div className="gcal-modal-backdrop" onClick={() => setSelectedRange(null)}>
          <div className="gcal-modal-card" onClick={e => e.stopPropagation()}>
            <div className="gcal-modal-top">
              <h3 className="gcal-modal-title">Añadir Reserva o Bloqueo</h3>
              <button onClick={() => setSelectedRange(null)} className="gcal-close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="gcal-modal-details">
              <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: 16 }}>
                Has seleccionado el periodo comprendido entre:
              </p>
              <div style={{ background: '#F9FAFB', padding: '12px 16px', borderRadius: 8, border: '1px solid #E5E7EB', fontWeight: 600 }}>
                {selectedRange.start} → {selectedRange.end}
              </div>
            </div>
            <div className="gcal-modal-footer">
              <button onClick={() => setSelectedRange(null)} className="gcal-btn gcal-btn--secondary">
                Cancelar
              </button>
              <button
                onClick={() => {
                  alert(`Fechas ${selectedRange.start} a ${selectedRange.end} marcadas como disponibles.`)
                  setSelectedRange(null)
                }}
                className="gcal-btn gcal-btn--primary"
              >
                Guardar Bloqueo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar Custom Styles */}
      <style jsx global>{`
        .gcal-container {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.03);
          border: 1px solid #E5E7EB;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        /* Top Google Bar */
        .gcal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid #E5E7EB;
          flex-wrap: wrap;
          gap: 16px;
          background: #fafafa;
        }

        .gcal-header__left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .gcal-header__right {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .gcal-title {
          font-size: 1.35rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          min-width: 220px;
        }

        .gcal-btn {
          border: 1px solid #D1D5DB;
          background: #ffffff;
          border-radius: 6px;
          padding: 6px 16px;
          font-size: 0.88rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .gcal-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .gcal-btn--today {
          border-radius: 20px;
          padding: 6px 18px;
          font-weight: 600;
        }

        .gcal-btn--primary {
          background: #16a34a;
          color: white;
          border: none;
        }
        .gcal-btn--primary:hover {
          background: #15803d;
        }

        .gcal-btn--secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .gcal-nav-arrows {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .gcal-icon-btn {
          background: transparent;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4b5563;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .gcal-icon-btn:hover {
          background: #e5e7eb;
          color: #111827;
        }

        /* Filter Pills */
        .gcal-camper-pills {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gcal-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .gcal-pill:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }
        .gcal-pill--active {
          background: #1f2937;
          color: #ffffff;
          border-color: #1f2937;
        }

        .gcal-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        /* View Mode Switcher */
        .gcal-view-selector {
          display: flex;
          background: #E5E7EB;
          border-radius: 8px;
          padding: 3px;
        }

        .gcal-view-btn {
          border: none;
          background: transparent;
          padding: 5px 14px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #4b5563;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .gcal-view-btn--active {
          background: #ffffff;
          color: #111827;
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
        }

        /* FullCalendar Customizations for Google Look */
        .gcal-body {
          padding: 16px;
        }

        .fc-theme-standard th {
          border: 1px solid #F3F4F6 !important;
          padding: 10px 0 !important;
          font-size: 0.78rem !important;
          font-weight: 600 !important;
          color: #6B7280 !important;
          text-transform: uppercase !important;
          background: #FAFBFB;
        }

        .fc-theme-standard td {
          border: 1px solid #E5E7EB !important;
        }

        .fc-daygrid-day-number {
          font-size: 0.82rem !important;
          font-weight: 600 !important;
          color: #374151 !important;
          padding: 6px 8px !important;
        }

        .fc-day-today {
          background: #FEF3C7 !important;
        }
        .fc-day-today .fc-daygrid-day-number {
          background: #16A34A;
          color: white !important;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 4px;
        }

        /* Event Pills like Google Calendar */
        .gcal-event-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          transition: transform 0.1s ease, box-shadow 0.1s ease;
          margin-bottom: 2px;
        }
        .gcal-event-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .gcal-event-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .gcal-event-time {
          font-size: 0.72rem;
          font-weight: 700;
          opacity: 0.9;
          white-space: nowrap;
        }

        .gcal-event-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .gcal-event-status {
          font-size: 0.72rem;
          opacity: 0.8;
        }

        .gcal-time-tag {
          font-weight: 700;
          color: #16A34A;
          background: #DCFCE7;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.82rem;
          margin-left: 6px;
        }

        /* Modal Dialog */
        .gcal-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(4px);
          z-index: 1050;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .gcal-modal-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          animation: gcalPopIn 0.15s ease-out;
        }

        @keyframes gcalPopIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .gcal-modal-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 20px 24px;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
        }

        .gcal-modal-badge {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 12px;
          margin-bottom: 6px;
        }

        .gcal-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .gcal-close-btn {
          background: transparent;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
        }
        .gcal-close-btn:hover {
          color: #111827;
          background: #e5e7eb;
        }

        .gcal-modal-details {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .gcal-detail-row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .gcal-detail-icon {
          color: #6B7280;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .gcal-detail-label {
          display: block;
          font-size: 0.75rem;
          color: #6B7280;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .gcal-detail-value {
          font-size: 0.95rem;
          color: #111827;
          font-weight: 600;
        }

        .gcal-detail-sub {
          font-size: 0.85rem;
          color: #4B5563;
        }

        .gcal-status-pill {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          margin-top: 4px;
        }
        .gcal-status--confirmed {
          background: #DCFCE7;
          color: #166534;
        }
        .gcal-status--pending {
          background: #FEF9C3;
          color: #854D0E;
        }
        .gcal-status--active {
          background: #16A34A;
          color: #ffffff;
        }

        .gcal-modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          background: #F9FAFB;
          border-top: 1px solid #E5E7EB;
        }

        /* Annual (Year) 12-Month Grid Styles */
        .gcal-year-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
          padding: 8px 0;
        }

        .gcal-year-month-card {
          background: #ffffff;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 14px;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .gcal-year-month-card:hover {
          border-color: #D1D5DB;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .gcal-year-month-title {
          font-weight: 700;
          font-size: 0.95rem;
          color: #111827;
          margin-bottom: 10px;
          cursor: pointer;
          transition: color 0.15s ease;
          display: inline-block;
        }
        .gcal-year-month-title:hover {
          color: #16A34A;
          text-decoration: underline;
        }

        .gcal-year-days-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 0.68rem;
          font-weight: 700;
          color: #9CA3AF;
          margin-bottom: 6px;
        }

        .gcal-year-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 3px;
        }

        .gcal-year-day-cell {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 500;
          color: #374151;
          border-radius: 6px;
          position: relative;
          cursor: pointer;
          transition: background 0.12s ease;
        }
        .gcal-year-day-cell:hover {
          background: #F3F4F6;
        }

        .gcal-year-day-cell--empty {
          cursor: default;
          background: transparent !important;
        }

        .gcal-year-day-cell--booked {
          font-weight: 700;
          border: 1px solid;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        .gcal-year-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          margin-top: 1px;
        }
      `}</style>
    </div>
  )
}

