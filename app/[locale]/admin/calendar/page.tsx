import { createClient } from '@/lib/supabase/server'
import CalendarClient from './CalendarClient'
import { Calendar as CalendarIcon } from 'lucide-react'

export default async function AdminCalendarPage() {
    const supabase = await createClient()

    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
      *,
      campers (name),
      users (full_name, email)
    `)
        // Filtramos solo reservas que no estén canceladas para el master calendar
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true })

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
                <div style={{ background: 'var(--forest-green)', color: 'white', padding: '12px', borderRadius: '12px' }}>
                    <CalendarIcon size={24} />
                </div>
                <div>
                    <h1 className="text-h2" style={{ marginBottom: 'var(--space-1)' }}>Calendario Maestro</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)' }}>
                        Línea temporal de la flota. Haz clic y arrastra para añadir bloqueos manuales.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: '#fef08a' }} /> Pendiente de Pago
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: '#bbf7d0' }} /> Confirmada
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: '#22c55e' }} /> En Curso
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: '#e5e7eb' }} /> Completada
                </div>
            </div>

            <CalendarClient bookings={bookings || []} />
        </div>
    )
}
