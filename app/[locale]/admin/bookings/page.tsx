import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import BookingsClient from './BookingsClient'

export default async function AdminBookingsPage() {
    const supabase = await createClient()

    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
      *,
      campers (name, slug),
      users (full_name, email, phone)
    `)
        .order('created_at', { ascending: false })

    return (
        <Suspense fallback={<div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--gray-500)' }}>Cargando reservas...</div>}>
            <BookingsClient initialBookings={bookings || []} />
        </Suspense>
    )
}

