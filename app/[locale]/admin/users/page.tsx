import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Users, Repeat, Euro, ShieldCheck } from 'lucide-react'
import AdminPageHeader from '../AdminPageHeader'
import AdminStatTiles from '../AdminStatTiles'
import { formatPrice } from '@/lib/pricing/engine'
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

    // Resumen solo de clientes (sin equipo ni cuentas internas)
    const customers = (users || []).filter(u => u.role !== 'admin' && !/\.internal$/i.test(u.email || ''))
    const repeatCount = customers.filter(u => (stats[u.id]?.trips || 0) >= 2).length
    const totalSpent = customers.reduce((s, u) => s + (stats[u.id]?.spent || 0), 0)
    const verifiedCount = customers.filter(u => ['verified', 'approved'].includes(u.verification_status)).length

    return (
        <div className="adm-page">
            <AdminPageHeader title="Clientes" description="Quién viaja con vosotros, cuánto y cuándo." />

            <AdminStatTiles
                label="Resumen de clientes"
                tiles={[
                    { key: 'total', label: 'Clientes', value: customers.length, tone: 'gold', icon: Users, hint: 'Cuentas de clientes' },
                    { key: 'repeat', label: 'Repiten', value: repeatCount, tone: repeatCount ? 'sage' : 'neutral', icon: Repeat, hint: 'Dos viajes o más' },
                    { key: 'spent', label: 'Facturado', value: formatPrice(totalSpent), tone: 'sky', icon: Euro, hint: 'Reservas pagadas' },
                    { key: 'docs', label: 'Carnet validado', value: verifiedCount, tone: 'sage', icon: ShieldCheck, hint: `de ${customers.length} clientes` },
                ]}
            />
            <Suspense fallback={<div className="adm-empty">Cargando clientes…</div>}>
                <UsersTableClient initialUsers={users || []} stats={stats} />
            </Suspense>
        </div>
    )
}
