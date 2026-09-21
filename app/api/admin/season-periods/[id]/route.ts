import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'
import { hasOverlappingPeriods } from '@/lib/pricing/engine'

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

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await checkAdminAuth()
    if (!auth.authorized || !auth.clientToUse) return auth.response!

    const body = await request.json()
    const { season_id, start_date, end_date, label } = body

    const { data: currentPeriod, error: fetchCurrentError } = await auth.clientToUse
      .from('season_periods')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchCurrentError || !currentPeriod) {
      return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 })
    }

    const nextStartDate = start_date ?? currentPeriod.start_date
    const nextEndDate = end_date ?? currentPeriod.end_date

    if (!DATE_REGEX.test(nextStartDate) || !DATE_REGEX.test(nextEndDate)) {
      return NextResponse.json({ error: 'Las fechas deben tener el formato válido YYYY-MM-DD' }, { status: 400 })
    }

    if (nextEndDate < nextStartDate) {
      return NextResponse.json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' }, { status: 400 })
    }

    // Verificar solapamientos excluyendo el id actual
    const { data: allPeriods, error: allPeriodsError } = await auth.clientToUse
      .from('season_periods')
      .select('id, start_date, end_date')

    if (allPeriodsError) {
      throw new Error(`Error al verificar solapamientos: ${allPeriodsError.message}`)
    }

    const isOverlap = hasOverlappingPeriods(
      { id, start_date: nextStartDate, end_date: nextEndDate },
      allPeriods || []
    )

    if (isOverlap) {
      return NextResponse.json(
        { error: 'El periodo actualizado se solapa con otro periodo existente' },
        { status: 409 }
      )
    }

    const updatePayload: Record<string, any> = {
      start_date: nextStartDate,
      end_date: nextEndDate,
    }

    if (season_id !== undefined) updatePayload.season_id = season_id
    if (label !== undefined) updatePayload.label = label ? label.trim() : null

    const { data: updatedPeriod, error: updateError } = await auth.clientToUse
      .from('season_periods')
      .update(updatePayload)
      .eq('id', id)
      .select('*, season:seasons_v2(id, code, name, color_badge)')
      .single()

    if (updateError) {
      throw new Error(`Error al actualizar periodo: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      period: updatedPeriod,
      message: 'Periodo actualizado correctamente'
    })
  } catch (error: any) {
    console.error('Admin Season Period PATCH Error:', error)
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
      .from('season_periods')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw new Error(`Error al eliminar periodo: ${deleteError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Periodo eliminado correctamente'
    })
  } catch (error: any) {
    console.error('Admin Season Period DELETE Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
