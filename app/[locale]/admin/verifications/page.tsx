import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ShieldAlert, ShieldCheck, ShieldX, PlaneTakeoff } from 'lucide-react'
import AdminPageHeader from '../AdminPageHeader'
import AdminStatTiles from '../AdminStatTiles'
import { normalizeVerificationStatus } from '@/lib/admin/auth'
import VerificationsClient from './VerificationsClient'
import VerificationHistory from './VerificationHistory'
import { resolveCustomerDocumentUrls } from '@/lib/admin/documents'

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
        (pendingUsers || []).map(async (user: any) => ({
            ...user,
            nextDepartureOn: nextDepartureOf(user.id),
            ...(await resolveCustomerDocumentUrls(supabaseAdmin, user.id)),
        }))
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

            <VerificationHistory users={reviewedUsers || []} />
        </div>
    )
}
