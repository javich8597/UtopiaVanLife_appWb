import { createClient } from '@/lib/supabase/server'
import CalendarClient from './CalendarClient'
import { Calendar as CalendarIcon } from 'lucide-react'

export default async function AdminCalendarPage() {
    const supabase = await createClient()

    const { data: campers } = await supabase
        .from('campers')
        .select('id, name, slug')
        .eq('is_active', true)

    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          campers (id, name, slug),
          users (id, email)
        `)
        // Filtramos solo reservas que no estén canceladas para el master calendar
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true })

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                <div style={{ background: 'var(--forest-green)', color: 'white', padding: '12px', borderRadius: '12px' }}>
                    <CalendarIcon size={24} />
                </div>
                <div>
                    <h1 className="text-h2" style={{ marginBottom: 'var(--space-1)' }}>Calendario Maestro</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)' }}>
                        Vista estilo Google Calendar. Gestiona la disponibilidad de la flota en modo mes, semana o día.
                    </p>
                </div>
            </div>

            <CalendarClient bookings={bookings || []} campers={campers || []} />
        </div>
    )
}
