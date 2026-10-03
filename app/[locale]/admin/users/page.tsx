import { createClient } from '@/lib/supabase/server'
import AdminPageHeader from '../AdminPageHeader'
import UsersTableClient, { CustomerStats } from './UsersTableClient'

export default async function AdminUsersPage() {
    const supabase = await createClient()

    const [{ data: users }, { data: paidBookings }] = await Promise.all([
        supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false }),
        supabase
            .from('bookings')
            .select('user_id, customer_email, total_price, start_date, status')
            .in('status', ['confirmed', 'active', 'completed']),
    ])

    // Valor de cada cliente: viajes pagados, gasto total y último viaje
    const stats: Record<string, CustomerStats> = {}
    for (const u of users || []) {
        const own = (paidBookings || []).filter(b =>
            b.user_id === u.id || (!b.user_id && u.email && b.customer_email === u.email)
        )
        stats[u.id] = {
            trips: own.length,
            spent: own.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0),
            lastTrip: own.map(b => b.start_date).sort().at(-1) || null,
        }
    }

    return (
        <div className="adm-page">
            <AdminPageHeader title="Clientes" description="Quién viaja con vosotros, cuánto y cuándo." />
            <UsersTableClient initialUsers={users || []} stats={stats} />
        </div>
    )
}
