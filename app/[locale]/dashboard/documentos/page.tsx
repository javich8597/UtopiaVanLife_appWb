import { redirect } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import DocumentsClient from './DocumentsClient'
import { validateContractRequirements } from '@/lib/contracts/contractEngine'

export const metadata = {
  title: 'Documentos & Facturas | Utopia Van Life',
  description: 'Consulta y descarga tus contratos de alquiler, facturas oficiales, pólizas de seguro e histórico de documentos de Utopia Van Life en Mallorca.'
}

export default async function DocumentsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect({ href: '/auth/login?redirect=/dashboard/documentos', locale })
    return null
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      camper:campers (slug, name, thumbnail_url, specs, plate_number)
    `)
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  // Comprobar si el usuario tiene reservas activas o confirmadas y le faltan datos clave para el contrato
  const relevantBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'active' || b.status === 'pending') || []
  if (relevantBookings.length > 0) {
    const validation = validateContractRequirements(profile)
    if (!validation.isValid) {
      redirect({ href: '/dashboard/profile?redirect=documentos&reason=missing_contract_data', locale })
      return null
    }
  }

  const { getContractTemplate } = await import('@/lib/contracts/templateService')
  const contractTemplate = await getContractTemplate()

  return <DocumentsClient bookings={bookings || []} profile={profile} user={user} contractTemplate={contractTemplate} />
}
