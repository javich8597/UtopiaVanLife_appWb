import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'
import { hasOverlappingPeriods } from '@/lib/pricing/engine'

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

export async function GET() {
  try {
    const auth = await checkAdminAuth()
    if (!auth.authorized || !auth.clientToUse) return auth.response!

    const { data: periods, error } = await auth.clientToUse
      .from('season_periods')
      .select('*, season:seasons_v2(id, code, name, color_badge)')
      .order('start_date', { ascending: true })

    if (error) {
      throw new Error(`Error al obtener periodos: ${error.message}`)
    }

    return NextResponse.json({ success: true, periods: periods || [] })
  } catch (error: any) {
    console.error('Admin Season Periods GET Error:', error)
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
    const { season_id, start_date, end_date, label } = body

    if (!season_id || typeof season_id !== 'string') {
      return NextResponse.json({ error: 'El ID de la temporada es obligatorio' }, { status: 400 })
    }

    if (!start_date || !end_date || !DATE_REGEX.test(start_date) || !DATE_REGEX.test(end_date)) {
      return NextResponse.json({ error: 'Las fechas deben tener el formato válido YYYY-MM-DD' }, { status: 400 })
    }

    if (end_date < start_date) {
      return NextResponse.json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' }, { status: 400 })
    }

    // Verificar que la temporada existe en seasons_v2
    const { data: seasonExists, error: seasonCheckError } = await auth.clientToUse
      .from('seasons_v2')
      .select('id, name')
      .eq('id', season_id)
      .maybeSingle()

    if (seasonCheckError || !seasonExists) {
      return NextResponse.json({ error: 'La temporada especificada no existe' }, { status: 404 })
    }

    // Obtener todos los periodos existentes para validación de solapamiento
    const { data: existingPeriods, error: fetchPeriodsError } = await auth.clientToUse
      .from('season_periods')
      .select('id, start_date, end_date, season_id')

    if (fetchPeriodsError) {
      throw new Error(`Error al verificar solapamientos: ${fetchPeriodsError.message}`)
    }

    const isOverlap = hasOverlappingPeriods(
      { start_date, end_date },
      existingPeriods || []
    )

    if (isOverlap) {
      return NextResponse.json(
        { error: 'El periodo seleccionado se solapa con otro periodo de temporada existente' },
        { status: 409 }
      )
    }

    const newPeriodData = {
      season_id,
      start_date,
      end_date,
      label: label?.trim() || null
    }

    const { data: createdPeriod, error: insertError } = await auth.clientToUse
      .from('season_periods')
      .insert(newPeriodData)
      .select('*, season:seasons_v2(id, code, name, color_badge)')
      .single()

    if (insertError) {
      throw new Error(`Error al insertar periodo: ${insertError.message}`)
    }

    return NextResponse.json({
      success: true,
      period: createdPeriod,
      message: 'Periodo añadido correctamente'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Admin Season Periods POST Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
