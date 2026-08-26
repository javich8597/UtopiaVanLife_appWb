import { createClient } from '@/lib/supabase/server'
import { Users as UsersIcon, ShieldCheck, Clock, AlertCircle } from 'lucide-react'

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
                    <h1 className="text-h2" style={{ marginBottom: 'var(--space-1)' }}>Clientes & Usuarios</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)' }}>
                        Listado de todos los clientes registrados y el estado de sus carnets de conducir.
                    </p>
                </div>
            </div>

            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Teléfono</th>
                            <th>Rol</th>
                            <th>Carnet</th>
                            <th>Registro</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users?.map((u: any) => (
                            <tr key={u.id}>
                                <td style={{ fontWeight: 600 }}>{u.full_name || 'Sin nombre'}</td>
                                <td className="text-small">{u.email}</td>
                                <td className="text-small" style={{ color: 'var(--gray-600)' }}>{u.phone || '-'}</td>
                                <td>
                                    <span className="badge badge-sand" style={{ textTransform: 'capitalize' }}>
                                        {u.role || 'customer'}
                                    </span>
                                </td>
                                <td>
                                    {u.verification_status === 'approved' ? (
                                        <span className="flex-center-gap text-xs" style={{ color: 'var(--success)' }}>
                                            <ShieldCheck size={14} /> Validado
                                        </span>
                                    ) : u.verification_status === 'pending_validation' ? (
                                        <span className="flex-center-gap text-xs" style={{ color: 'var(--sand-dark)' }}>
                                            <Clock size={14} /> Pendiente
                                        </span>
                                    ) : (
                                        <span className="flex-center-gap text-xs" style={{ color: 'var(--gray-400)' }}>
                                            <AlertCircle size={14} /> Sin enviar
                                        </span>
                                    )}
                                </td>
                                <td className="text-xs" style={{ color: 'var(--gray-500)' }}>
                                    {new Date(u.created_at).toLocaleDateString('es-ES')}
                                </td>
                            </tr>
                        ))}
                        {(!users || users.length === 0) && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--gray-500)' }}>
                                    No hay usuarios registrados aún.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
