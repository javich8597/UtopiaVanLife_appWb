import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ShieldAlert, ShieldCheck, ShieldX, PlaneTakeoff } from 'lucide-react'
import AdminPageHeader from '../AdminPageHeader'
import AdminStatTiles from '../AdminStatTiles'
import { normalizeVerificationStatus, getAdminClientOrSession } from '@/lib/admin/auth'
import VerificationsClient from './VerificationsClient'
import VerificationHistory from './VerificationHistory'

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

    // Historial: documentación ya revisada (validada o rechazada)
    const { data: reviewedUsers } = await supabase
        .from('users')
        .select('*')
        .in('verification_status', ['verified', 'approved', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(100)

    // El motivo del rechazo vive en document_validations (users puede no tener rejection_reason)
    const rejectedIds = (reviewedUsers || [])
        .filter((u: any) => normalizeVerificationStatus(u.verification_status) === 'rejected' && !u.rejection_reason)
        .map((u: any) => u.id)
    const { data: rejections, error: rejectionsErr } = rejectedIds.length > 0
        ? await getAdminClientOrSession(supabase)
            .from('document_validations')
            .select('user_id, rejected_reason, validated_at')
            .in('user_id', rejectedIds)
            .eq('status', 'rejected')
            .order('validated_at', { ascending: false })
        : { data: [] as any[], error: null }
    if (rejectionsErr) console.warn('No se pudieron leer los motivos de rechazo:', rejectionsErr.message)
    const historyUsers = (reviewedUsers || []).map((u: any) => ({
        ...u,
        rejection_reason: u.rejection_reason || (rejections || []).find((r: any) => r.user_id === u.id)?.rejected_reason || null,
    }))

    // Próxima salida de cada cliente pendiente, para validar primero a quien sale antes
    const todayStr = new Date().toISOString().split('T')[0]
    const pendingIds = (pendingUsers || []).map((u: any) => u.id)
    const { data: upcoming } = pendingIds.length > 0
        ? await supabase
            .from('bookings')
            .select('user_id, start_date, status')
            .in('user_id', pendingIds)
            .in('status', ['pending', 'confirmed', 'active'])
            .gte('start_date', todayStr)
            .order('start_date', { ascending: true })
        : { data: [] as any[] }

    const nextDepartureOf = (userId: string) =>
        (upcoming || []).find((b: any) => b.user_id === userId)?.start_date || null

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
                nextDepartureOn: nextDepartureOf(user.id),
                dniFrontUrl,
                dniBackUrl,
                licenseFrontUrl,
                licenseBackUrl
            }
        })
    )

    const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const soonCount = usersWithDocs.filter((u: any) => u.nextDepartureOn && u.nextDepartureOn <= in7).length
    const verifiedCount = (reviewedUsers || []).filter((u: any) => normalizeVerificationStatus(u.verification_status) === 'verified').length
    const rejectedCount = (reviewedUsers || []).filter((u: any) => normalizeVerificationStatus(u.verification_status) === 'rejected').length

    // Primero quien sale antes; sin salida prevista, al final
    usersWithDocs.sort((a: any, b: any) => {
        if (a.nextDepartureOn && b.nextDepartureOn) return a.nextDepartureOn.localeCompare(b.nextDepartureOn)
        if (a.nextDepartureOn) return -1
        if (b.nextDepartureOn) return 1
        return 0
    })

    return (
        <div className="adm-page">
            <AdminPageHeader
                title="Verificación de carnets"
                description="Revisa el DNI y el carnet de cada cliente antes de su salida."
            />

            <AdminStatTiles
                label="Resumen de verificaciones"
                tiles={[
                    { key: 'pending', label: 'Por revisar', value: usersWithDocs.length, tone: usersWithDocs.length ? 'amber' : 'neutral', icon: ShieldAlert, hint: usersWithDocs.length ? 'Antes de su salida' : 'Cola vacía' },
                    { key: 'soon', label: 'Salen esta semana', value: soonCount, tone: soonCount ? 'rose' : 'neutral', icon: PlaneTakeoff, hint: soonCount ? 'Prioridad alta' : 'Ninguno' },
                    { key: 'ok', label: 'Validados', value: verifiedCount, tone: 'sage', icon: ShieldCheck, hint: 'Documentación correcta' },
                    { key: 'ko', label: 'Rechazados', value: rejectedCount, tone: rejectedCount ? 'rose' : 'neutral', icon: ShieldX, hint: 'Pendientes de reenviar' },
                ]}
            />

            <VerificationsClient initialUsers={usersWithDocs} />

            <VerificationHistory users={historyUsers} />
        </div>
    )
}
