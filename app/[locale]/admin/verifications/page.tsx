import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { FileText } from 'lucide-react'
import VerificationsClient from './VerificationsClient'

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
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
                <div style={{ background: '#fef08a', color: '#854d0e', padding: '12px', borderRadius: '12px' }}>
                    <FileText size={24} />
                </div>
                <div>
                    <h1 className="text-h2" style={{ marginBottom: 'var(--space-1)' }}>Validación de Documentación & Carnets</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)' }}>
                        Revisa y valida el DNI y carnet de conducir (anverso y reverso) con visor de ampliación y control de motivos de rechazo.
                    </p>
                </div>
            </div>

            <VerificationsClient initialUsers={usersWithDocs} />
        </div>
    )
}
