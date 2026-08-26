import { createClient } from '@/lib/supabase/server'
import { Settings as SettingsIcon, Calendar, Sparkles } from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'

export default async function AdminSettingsPage() {
    const supabase = await createClient()

    const { data: seasons } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: true })

    const { data: extras } = await supabase
        .from('extras')
        .select('*')
        .order('name_es', { ascending: true })

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
                <div style={{ background: 'var(--forest-green)', color: 'white', padding: '12px', borderRadius: '12px' }}>
                    <SettingsIcon size={24} />
                </div>
                <div>
                    <h1 className="text-h2" style={{ marginBottom: 'var(--space-1)' }}>Ajustes & Temporadas</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)' }}>
                        Configuración de temporadas, tarifas base y catálogo de extras.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-8)' }}>
                {/* Temporadas */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                        <Calendar size={18} style={{ color: 'var(--forest-green)' }} />
                        <h2 className="text-h4">Temporadas Activas</h2>
                    </div>

                    <div className="table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Fechas</th>
                                    <th>Desc. 7+ días</th>
                                </tr>
                            </thead>
                            <tbody>
                                {seasons?.map((s: any) => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                                        <td className="text-small">
                                            {new Date(s.start_date).toLocaleDateString('es-ES')} → {new Date(s.end_date).toLocaleDateString('es-ES')}
                                        </td>
                                        <td style={{ color: 'var(--success)', fontWeight: 500 }}>
                                            {s.discount_7days_pct || 0}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Extras */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                        <Sparkles size={18} style={{ color: 'var(--sand-dark)' }} />
                        <h2 className="text-h4">Extras de Alquiler</h2>
                    </div>

                    <div className="table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Extra</th>
                                    <th>Precio</th>
                                    <th>Tipo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {extras?.map((e: any) => (
                                    <tr key={e.id}>
                                        <td style={{ fontWeight: 600 }}>{e.name_es}</td>
                                        <td style={{ fontWeight: 500 }}>{formatPrice(e.price)}</td>
                                        <td className="text-xs" style={{ color: 'var(--gray-500)' }}>
                                            {e.price_type === 'per_day' ? 'Por día' : 'Por alquiler'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
