import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/routing'
import ProfileFormClient from './ProfileFormClient'

export default async function ProfilePage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect({ href: '/auth/login?redirect=/dashboard/profile', locale })
        return null
    }

    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div className="dashboard-header" style={{ paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--gray-200)' }}>
                <h1 className="text-h2" style={{ marginBottom: 'var(--space-1)' }}>Perfil & Documentación</h1>
                <p className="text-body" style={{ color: 'var(--gray-600)' }}>
                    Para poder disfrutar de nuestras campers necesitamos validar tu carnet de conducir.
                </p>
            </div>

            <div className="profile-grid">
                <div className="card">
                    <h2 className="text-h4" style={{ marginBottom: 'var(--space-4)' }}>Datos Personales</h2>
                    <div className="form-group info-row">
                        <span className="info-label">Nombre Completo</span>
                        <span className="info-value">{profile?.full_name || 'No especificado'}</span>
                    </div>
                    <div className="form-group info-row">
                        <span className="info-label">Email</span>
                        <span className="info-value">{user.email}</span>
                    </div>
                    <div className="form-group info-row">
                        <span className="info-label">Teléfono</span>
                        <span className="info-value">{profile?.phone || 'No especificado'}</span>
                    </div>
                </div>

                <div className="card">
                    <h2 className="text-h4" style={{ marginBottom: 'var(--space-4)' }}>Validación de Conductor</h2>
                    <ProfileFormClient initialStatus={profile?.verification_status || 'not_submitted'} />
                </div>
            </div>
        </div>
    )
}
