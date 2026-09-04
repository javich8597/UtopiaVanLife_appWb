import { createClient } from '@/lib/supabase/server'
import { Users as UsersIcon } from 'lucide-react'
import UsersTableClient from './UsersTableClient'

export default async function AdminUsersPage() {
    const supabase = await createClient()

    const { data: users } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
                <div style={{ background: 'var(--forest-green)', color: 'white', padding: '12px', borderRadius: '12px' }}>
                    <UsersIcon size={24} />
                </div>
                <div>
                    <h1 className="text-h2" style={{ marginBottom: 'var(--space-1)' }}>Clientes & Expedientes</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)' }}>
                        Listado de todos los clientes registrados, carnets y consulta de expedientes.
                    </p>
                </div>
            </div>

            <UsersTableClient initialUsers={users || []} />
        </div>
    )
}
