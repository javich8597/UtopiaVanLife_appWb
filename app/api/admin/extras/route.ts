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
  })

  if (!isAuthorized) {
    return { authorized: false, response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }

  const clientToUse = getAdminClientOrSession(supabase)

  return { authorized: true, user, clientToUse }
}

export async function GET() {
  try {
    const auth = await checkAdminAuth()
    if (!auth.authorized || !auth.clientToUse) return auth.response!

    const { data: extras, error } = await auth.clientToUse
      .from('extras')
      .select('*')
      .order('name_es', { ascending: true })

    if (error) {
      throw new Error(`Error al obtener extras: ${error.message}`)
    }

    return NextResponse.json({ success: true, extras: extras || [] })
  } catch (error: any) {
    console.error('Admin Extras GET Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await checkAdminAuth()
    if (!auth.authorized || !auth.clientToUse) return auth.response!

    const body = await request.json()
    const {
      name_es,
      name_en,
      description_es,
      description_en,
      price,
      price_type,
      icon,
      is_active,
    } = body

    if (!name_es || typeof name_es !== 'string' || name_es.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre en español del extra es obligatorio' }, { status: 400 })
    }

    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'El precio debe ser un número mayor o igual a 0' }, { status: 400 })
    }

    const validPriceType = price_type === 'per_day' ? 'per_day' : 'per_rental'

    const newExtraData = {
      name_es: name_es.trim(),
      name_en: name_en?.trim() || name_es.trim(),
      description_es: description_es?.trim() || null,
      description_en: description_en?.trim() || null,
      price: parsedPrice,
      price_type: validPriceType,
      icon: icon?.trim() || 'sparkles',
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    }

    const { data: createdExtra, error: insertError } = await auth.clientToUse
      .from('extras')
      .insert(newExtraData)
      .select()
      .single()

    if (insertError) {
      throw new Error(`Error al crear el extra: ${insertError.message}`)
    }

    return NextResponse.json({
      success: true,
      extra: createdExtra,
      message: 'Extra creado correctamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('Admin Extras POST Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
