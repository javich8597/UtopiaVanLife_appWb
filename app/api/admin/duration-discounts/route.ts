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

    const { data: discounts, error } = await auth.clientToUse
      .from('duration_discounts')
      .select('*')
      .order('min_days', { ascending: true })

    if (error) {
      throw new Error(`Error al obtener descuentos de duración: ${error.message}`)
    }

    return NextResponse.json({ success: true, discounts: discounts || [] })
  } catch (error: any) {
    console.error('Admin Duration Discounts GET Error:', error)
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
    const { min_days, discount_pct, is_active } = body

    const parsedMinDays = parseInt(min_days, 10)
    if (isNaN(parsedMinDays) || parsedMinDays < 2) {
      return NextResponse.json(
        { error: 'El número mínimo de días debe ser un número entero mayor o igual a 2' },
        { status: 400 }
      )
    }

    const parsedDiscount = parseFloat(discount_pct)
    if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
      return NextResponse.json(
        { error: 'El porcentaje de descuento debe ser un número entre 0 y 100' },
        { status: 400 }
      )
    }

    const newDiscountData = {
      min_days: parsedMinDays,
      discount_pct: parsedDiscount,
      is_active: is_active !== undefined ? Boolean(is_active) : true
    }

    const { data: createdDiscount, error: insertError } = await auth.clientToUse
      .from('duration_discounts')
      .insert(newDiscountData)
      .select()
      .single()

    if (insertError) {
      throw new Error(`Error al insertar tramo de descuento: ${insertError.message}`)
    }

    return NextResponse.json({
      success: true,
      discount: createdDiscount,
      message: 'Tramo de descuento creado correctamente'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Admin Duration Discounts POST Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
