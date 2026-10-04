import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'

async function checkAdminAuth() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAuthorized = isAdminUser({
    id: user.id,
    email: user.email,
    role: profile?.role,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
  })

  if (!isAuthorized) {
    return { authorized: false, response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }

  return { authorized: true, clientToUse: getAdminClientOrSession(supabase) }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Búsqueda rápida del backoffice: reservas y clientes (máx. 5 de cada) */
export async function GET(request: Request) {
  try {
    const auth = await checkAdminAuth()
    if (!auth.authorized) return auth.response!
    const db = auth.clientToUse!

    const q = (new URL(request.url).searchParams.get('q') || '').trim()
    if (q.length < 2) return NextResponse.json({ bookings: [], customers: [] })

    // Evitar que comas o paréntesis rompan el filtro .or() de PostgREST
    const safe = q.replace(/[,()%*]/g, ' ').trim()
    const like = `%${safe}%`

    const [{ data: bookings }, { data: customers }] = await Promise.all([
      db
        .from('bookings')
        .select('id, customer_name, customer_email, start_date, end_date, status, campers (name)')
        .or(`customer_name.ilike.${like},customer_email.ilike.${like},payment_intent_id.ilike.${like}`)
        .order('created_at', { ascending: false })
        .limit(5),
      db
        .from('users')
        .select('id, full_name, email, dni_nie')
        .or(`full_name.ilike.${like},email.ilike.${like},dni_nie.ilike.${like}`)
        .limit(5),
    ])

    return NextResponse.json({ bookings: bookings || [], customers: customers || [] })
  } catch (error: any) {
    console.error('Admin search error:', error)
    return NextResponse.json({ error: 'No se pudo buscar' }, { status: 500 })
  }
}
