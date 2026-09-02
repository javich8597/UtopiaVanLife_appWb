import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Plus, Edit3, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'

export default async function AdminCampersPage() {
    const supabase = await createClient()

    const { data: campers } = await supabase
        .from('campers')
        .select('*')
        .order('name', { ascending: true })

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-8)' }}>
                <div>
                    <h1 className="text-h2" style={{ marginBottom: 'var(--space-2)' }}>Flota (Campers)</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)' }}>Gestiona los vehículos disponibles, sus especificaciones y estado.</p>
                </div>
                <button className="btn btn-forest" style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Plus size={18} /> Nueva Camper
                </button>
            </div>

            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Vehículo</th>
                            <th>Plazas/Camas</th>
                            <th>Fianza</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campers?.map((camper: any) => (
                            <tr key={camper.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                        <div style={{ width: 64, height: 48, position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--gray-100)' }}>
                                            {camper.thumbnail_url && (
                                                <Image src={camper.thumbnail_url} alt={camper.name} fill unoptimized style={{ objectFit: 'cover' }} />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--black-matte)' }}>{camper.name}</div>
                                            <div className="text-xs" style={{ color: 'var(--gray-500)' }}>/{camper.slug}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-small" style={{ color: 'var(--gray-600)' }}>
                                    {camper.specs?.seats || '-'} plazas <br />
                                    {camper.specs?.beds || '-'} camas
                                </td>
                                <td style={{ fontWeight: 500 }}>
                                    {formatPrice(camper.deposit_amount)}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                        <span className="flex-center-gap text-xs" style={{ color: camper.is_active ? 'var(--success)' : 'var(--gray-400)' }}>
                                            {camper.is_active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                            {camper.is_active ? 'Publicada' : 'Oculta'}
                                        </span>
                                        <span className="flex-center-gap text-xs" style={{ color: camper.is_available ? 'var(--forest-green)' : 'var(--error)' }}>
                                            {camper.is_available ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                            {camper.is_available ? 'Disponible' : 'Mantenimiento'}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <button className="btn btn-outline btn-icon btn-sm" title="Editar">
                                            <Edit3 size={16} />
                                        </button>
                                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--error)' }} title="Eliminar">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {(!campers || campers.length === 0) && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--gray-500)' }}>
                                    No hay campers en la flota.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            
        </div>
    )
}
