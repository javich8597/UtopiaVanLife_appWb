import { redirect } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import DocumentsClient from './DocumentsClient'
import { validateContractRequirements } from '@/lib/contracts/contractEngine'
import { getAdminClientOrSession } from '@/lib/admin/auth'
import { pickCurrentBooking } from '@/lib/user/tripState'
import { isAbandonedPending } from '@/lib/admin/bookingStatus'

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

  // Comprobar si el usuario tiene reservas activas o confirmadas y le faltan datos clave para el contrato
  // Las pendientes abandonadas en Redsys no cuentan: no deben bloquear el acceso a esta pantalla
  const relevantBookings = bookings?.filter(b =>
    b.status === 'confirmed' || b.status === 'active' || (b.status === 'pending' && !isAbandonedPending(b))
  ) || []
  if (relevantBookings.length > 0) {
    const validation = validateContractRequirements(profile)
    if (!validation.isValid) {
      redirect({ href: '/dashboard/profile?redirect=documentos&reason=missing_contract_data', locale })
      return null
    }
  }

  const { getContractTemplate } = await import('@/lib/contracts/templateService')
  const contractTemplate = await getContractTemplate()

  // Ficha técnica y permiso de circulación de la camper reservada (solo con la reserva confirmada)
  const vehicleDocs: { kind: string; url: string }[] = []
  const current = pickCurrentBooking(bookings || [])
  if (current && ['confirmed', 'active'].includes(current.status) && current.camper_id) {
    const db = getAdminClientOrSession(supabase)
    const { data: docs } = await db.from('camper_documents').select('kind, file_path').eq('camper_id', current.camper_id)
    for (const d of docs || []) {
      const { data } = await db.storage.from('vehicle-docs').createSignedUrl(d.file_path, 3600)
      if (data?.signedUrl) vehicleDocs.push({ kind: d.kind, url: data.signedUrl })
    }
  }

  return <DocumentsClient bookings={bookings || []} profile={profile} user={user} contractTemplate={contractTemplate} vehicleDocs={vehicleDocs} />
}
