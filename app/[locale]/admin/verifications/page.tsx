import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Image from 'next/image'
import { CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react'
import ValidationActionsClient from './ValidationActionsClient'

export default async function AdminVerificationsPage() {
    const supabase = await createClient()

    // We need admin client to bypass storage RLS and create signed URLs
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: pendingUsers } = await supabase
        .from('users')
        .select('*')
        .eq('verification_status', 'pending_validation')
        .order('created_at', { ascending: false })

    // Resolve document URLs for each pending user
    const usersWithDocs = await Promise.all(
        (pendingUsers || []).map(async (user: any) => {
            let frontUrl = null
            let backUrl = null

            try {
                const { data: files } = await supabaseAdmin.storage.from('documents').list(user.id)
                if (files && files.length > 0) {
                    // Find the most recent front and back files
                    const frontFile = files.filter(f => f.name.startsWith('front_')).sort((a, b) => b.name.localeCompare(a.name))[0]
                    const backFile = files.filter(f => f.name.startsWith('back_')).sort((a, b) => b.name.localeCompare(a.name))[0]

                    if (frontFile) {
                        const { data } = await supabaseAdmin.storage.from('documents').createSignedUrl(`${user.id}/${frontFile.name}`, 3600)
                        frontUrl = data?.signedUrl
                    }
                    if (backFile) {
                        const { data } = await supabaseAdmin.storage.from('documents').createSignedUrl(`${user.id}/${backFile.name}`, 3600)
                        backUrl = data?.signedUrl
                    }
                }
            } catch (e) {
                console.error('Error fetching docs for user', user.id, e)
            }

            return {
                ...user,
                frontUrl,
                backUrl
            }
        })
    )

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
                <div style={{ background: '#fef08a', color: '#854d0e', padding: '12px', borderRadius: '12px' }}>
                    <FileText size={24} />
                </div>
                <div>
                    <h1 className="text-h2" style={{ marginBottom: 'var(--space-1)' }}>Validación de Carnets</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)' }}>
                        Revisa y aprueba el carnet de conducir de los usuarios para que puedan realizar sus reservas.
                    </p>
                </div>
            </div>

            <div className="verifications-list">
                {usersWithDocs.map(user => (
                    <div key={user.id} className="validation-card">
                        <div className="user-info">
                            <h3 className="text-h4">{user.full_name || 'Sin Nombre'}</h3>
                            <p className="text-sm" style={{ color: 'var(--gray-500)' }}>{user.email}</p>
                            <p className="text-sm" style={{ color: 'var(--gray-500)' }}>Tel: {user.phone_number || 'No especificado'}</p>
                        </div>

                        <div className="documents-grid">
                            <div className="doc-preview">
                                <span className="doc-label">Frontal</span>
                                {user.frontUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <a href={user.frontUrl} target="_blank" rel="noreferrer">
                                        <img src={user.frontUrl} alt="Frontal Carnet" className="doc-img" />
                                    </a>
                                ) : (
                                    <div className="no-doc text-xs">No encontrado</div>
                                )}
                            </div>
                            <div className="doc-preview">
                                <span className="doc-label">Reverso</span>
                                {user.backUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <a href={user.backUrl} target="_blank" rel="noreferrer">
                                        <img src={user.backUrl} alt="Reverso Carnet" className="doc-img" />
                                    </a>
                                ) : (
                                    <div className="no-doc text-xs">No encontrado</div>
                                )}
                            </div>
                        </div>

                        <ValidationActionsClient userId={user.id} />
                    </div>
                ))}

                {usersWithDocs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-12)', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--gray-300)' }}>
                        <CheckCircle2 size={48} style={{ color: 'var(--success)', margin: '0 auto var(--space-4)' }} />
                        <h3 className="text-h4">Todo al día</h3>
                        <p className="text-body" style={{ color: 'var(--gray-600)' }}>No hay carnets pendientes de validación en este momento.</p>
                    </div>
                )}
            </div>

            
        </div>
    )
}
