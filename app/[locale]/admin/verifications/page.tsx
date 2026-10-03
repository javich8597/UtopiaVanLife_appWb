import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import AdminPageHeader from '../AdminPageHeader'
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

            <VerificationsClient initialUsers={usersWithDocs} />

            <VerificationHistory users={reviewedUsers || []} />
        </div>
    )
}
