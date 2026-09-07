import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin/auth'
import { getContractTemplate, saveContractTemplate } from '@/lib/contracts/templateService'

async function verifyAdminAuth() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: 'No autorizado', status: 401 }
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
    user_metadata: user.user_metadata
  })

  if (!isAuthorized) {
    return { authorized: false, error: 'Acceso denegado. Se requieren permisos de administrador.', status: 403 }
  }

  return { authorized: true, user }
}

export async function GET() {
  try {
    const auth = await verifyAdminAuth()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const template = await getContractTemplate()
    return NextResponse.json({ success: true, data: template })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error al obtener la plantilla de contrato' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminAuth()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
    }

    const result = await saveContractTemplate(body, auth.user?.email)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error al guardar la plantilla de contrato' },
      { status: 500 }
    )
  }
}
