import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

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

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await checkAdminAuth()
    if (!auth.authorized || !auth.clientToUse) return auth.response!

    const body = await request.json()
    const { min_days, discount_pct, is_active } = body

    const updatePayload: Record<string, any> = {}

    if (min_days !== undefined) {
      const parsedMinDays = parseInt(min_days, 10)
      if (isNaN(parsedMinDays) || parsedMinDays < 2) {
        return NextResponse.json(
          { error: 'El número mínimo de días debe ser un entero mayor o igual a 2' },
          { status: 400 }
        )
      }
      updatePayload.min_days = parsedMinDays
    }

    if (discount_pct !== undefined) {
      const parsedDiscount = parseFloat(discount_pct)
      if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
        return NextResponse.json(
          { error: 'El porcentaje de descuento debe ser un número entre 0 y 100' },
          { status: 400 }
        )
      }
      updatePayload.discount_pct = parsedDiscount
    }

    if (is_active !== undefined) {
      updatePayload.is_active = Boolean(is_active)
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: 'No se enviaron campos válidos para actualizar' },
        { status: 400 }
      )
    }

    const { data: updatedDiscount, error: updateError } = await auth.clientToUse
      .from('duration_discounts')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Error al actualizar tramo de descuento: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      discount: updatedDiscount,
      message: 'Tramo de descuento actualizado correctamente'
    })
  } catch (error: any) {
    console.error('Admin Duration Discount PATCH Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await checkAdminAuth()
    if (!auth.authorized || !auth.clientToUse) return auth.response!

    const { error: deleteError } = await auth.clientToUse
      .from('duration_discounts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw new Error(`Error al eliminar tramo de descuento: ${deleteError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Tramo de descuento eliminado correctamente'
    })
  } catch (error: any) {
    console.error('Admin Duration Discount DELETE Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
