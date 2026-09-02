import { redirect } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import DocumentsClient from './DocumentsClient'

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
      camper:campers (slug, name, thumbnail_url, specs)
    `)
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  return <DocumentsClient bookings={bookings || []} profile={profile} user={user} />
}
