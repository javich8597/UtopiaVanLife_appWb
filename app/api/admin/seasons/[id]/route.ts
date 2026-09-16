import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isAdminUser } from '@/lib/admin/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verify admin privileges
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
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { min_nights, discount_7days_pct } = body

    const updatePayload: Record<string, any> = {}

    if (min_nights !== undefined) {
      const parsedMinNights = parseInt(min_nights, 10)
      if (isNaN(parsedMinNights) || parsedMinNights < 1 || parsedMinNights > 30) {
        return NextResponse.json(
          { error: 'El valor de noches mínimas debe ser un número entero entre 1 y 30' },
          { status: 400 }
        )
      }
      updatePayload.min_nights = parsedMinNights
    }

    if (discount_7days_pct !== undefined) {
      const parsedDiscount = parseFloat(discount_7days_pct)
      if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
        return NextResponse.json(
          { error: 'El descuento debe ser un porcentaje válido entre 0 y 100' },
          { status: 400 }
        )
      }
      updatePayload.discount_7days_pct = parsedDiscount
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos válidos para actualizar' }, { status: 400 })
    }

    const clientToUse = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : supabase

    const { data, error: updateError } = await clientToUse
      .from('seasons')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Error al actualizar la temporada: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Temporada actualizada correctamente',
    })
  } catch (error: any) {
    console.error('Admin Season Update Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
