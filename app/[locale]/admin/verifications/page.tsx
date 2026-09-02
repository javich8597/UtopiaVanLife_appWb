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
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: pendingUsers } = await supabase
        .from('users')
        .select('*')
        .in('verification_status', ['pending_validation', 'pending'])
        .order('created_at', { ascending: false })

    // Resolve document URLs for each pending user
    const usersWithDocs = await Promise.all(
        (pendingUsers || []).map(async (user: any) => {
            let dniFrontUrl = null
            let dniBackUrl = null
            let licenseFrontUrl = null
            let licenseBackUrl = null

            try {
                const { data: files } = await supabaseAdmin.storage.from('documents').list(user.id)
                if (files && files.length > 0) {
                    const findSignedUrl = async (pattern: string) => {
                        const file = files.filter(f => f.name.includes(pattern)).sort((a, b) => b.name.localeCompare(a.name))[0]
                        if (file) {
                            const { data } = await supabaseAdmin.storage.from('documents').createSignedUrl(`${user.id}/${file.name}`, 3600)
                            return data?.signedUrl || null
                        }
                        return null
                    }

                    dniFrontUrl = await findSignedUrl('dni_front')
                    dniBackUrl = await findSignedUrl('dni_back')
                    licenseFrontUrl = await findSignedUrl('license_front') || await findSignedUrl('front_')
                    licenseBackUrl = await findSignedUrl('license_back') || await findSignedUrl('back_')
                }
            } catch (e) {
                console.error('Error fetching docs for user', user.id, e)
            }

            return {
                ...user,
                dniFrontUrl,
                dniBackUrl,
                licenseFrontUrl,
                licenseBackUrl
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
                    <h1 className="text-h2" style={{ marginBottom: 'var(--space-1)' }}>Validación de Documentación & Carnets</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)' }}>
                        Revisa y valida el DNI y carnet de conducir (anverso y reverso) para la emisión del contrato oficial de alquiler.
                    </p>
                </div>
            </div>

            <div className="verifications-list">
                {usersWithDocs.map(user => {
                    const issueDate = user.driver_license_issue_date
                    const expiryDate = user.driver_license_expiry_date
                    let isNovel = false
                    let isExpired = false
                    if (issueDate && expiryDate) {
                        const today = new Date()
                        const exp = new Date(expiryDate)
                        const iss = new Date(issueDate)
                        isExpired = exp.getTime() < today.getTime()
                        const diffYears = (today.getTime() - iss.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
                        isNovel = diffYears < 2
                    }

                    return (
                        <div key={user.id} className="validation-card" style={{ marginBottom: 24, padding: 24, background: 'white', borderRadius: 16, border: '1px solid var(--gray-200)' }}>
                            <div className="user-info" style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                        <h3 className="text-h4" style={{ marginBottom: 4 }}>{user.full_name || 'Sin Nombre'}</h3>
                                        <p className="text-sm" style={{ color: 'var(--gray-600)' }}>DNI/Pasaporte: <strong>{user.dni_nie || 'No indicado'}</strong> · Email: <strong>{user.email}</strong></p>
                                        <p className="text-sm" style={{ color: 'var(--gray-600)' }}>Tel: <strong>{user.phone || user.phone_number || 'No especificado'}</strong> · Dirección: <strong>{user.address || 'No especificada'}</strong></p>
                                    </div>

                                    {/* Badges */}
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {user.driver_license_id && (
                                            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6, background: 'var(--gray-100)', color: 'var(--gray-800)', fontWeight: 600 }}>
                                                Carnet: {user.driver_license_id}
                                            </span>
                                        )}
                                        {isNovel && (
                                            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6, background: '#FEF08A', color: '#854D0E', fontWeight: 600 }}>
                                                ⚠️ Conductor novel (&lt; 2 años)
                                            </span>
                                        )}
                                        {isExpired && (
                                            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6, background: '#FEE2E2', color: '#991B1B', fontWeight: 600 }}>
                                                ⛔ Carnet Caducado
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="documents-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                                <div className="doc-preview" style={{ textAlign: 'center', background: '#FAFAFA', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 8 }}>
                                    <span className="doc-label" style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>DNI Frontal</span>
                                    {user.dniFrontUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <a href={user.dniFrontUrl} target="_blank" rel="noreferrer">
                                            <img src={user.dniFrontUrl} alt="DNI Frontal" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 4 }} />
                                        </a>
                                    ) : (
                                        <div className="no-doc text-xs" style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>No adjuntado</div>
                                    )}
                                </div>

                                <div className="doc-preview" style={{ textAlign: 'center', background: '#FAFAFA', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 8 }}>
                                    <span className="doc-label" style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>DNI Reverso</span>
                                    {user.dniBackUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <a href={user.dniBackUrl} target="_blank" rel="noreferrer">
                                            <img src={user.dniBackUrl} alt="DNI Reverso" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 4 }} />
                                        </a>
                                    ) : (
                                        <div className="no-doc text-xs" style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>No adjuntado</div>
                                    )}
                                </div>

                                <div className="doc-preview" style={{ textAlign: 'center', background: '#FAFAFA', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 8 }}>
                                    <span className="doc-label" style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>Carnet Frontal</span>
                                    {user.licenseFrontUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <a href={user.licenseFrontUrl} target="_blank" rel="noreferrer">
                                            <img src={user.licenseFrontUrl} alt="Carnet Frontal" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 4 }} />
                                        </a>
                                    ) : (
                                        <div className="no-doc text-xs" style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>No adjuntado</div>
                                    )}
                                </div>

                                <div className="doc-preview" style={{ textAlign: 'center', background: '#FAFAFA', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 8 }}>
                                    <span className="doc-label" style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>Carnet Reverso</span>
                                    {user.licenseBackUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <a href={user.licenseBackUrl} target="_blank" rel="noreferrer">
                                            <img src={user.licenseBackUrl} alt="Carnet Reverso" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 4 }} />
                                        </a>
                                    ) : (
                                        <div className="no-doc text-xs" style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>No adjuntado</div>
                                    )}
                                </div>
                            </div>

                            <ValidationActionsClient userId={user.id} />
                        </div>
                    )
                })}

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
