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

    const [seasonsRes, periodsRes, campersRes] = await Promise.all([
      auth.clientToUse
        .from('seasons_v2')
        .select('*')
        .order('created_at', { ascending: true }),
      auth.clientToUse
        .from('season_periods')
        .select('*')
        .order('start_date', { ascending: true }),
      auth.clientToUse
        .from('campers')
        .select('id, name, slug, base_price_per_night, is_active')
        .order('name', { ascending: true })
    ])

    if (seasonsRes.error) {
      throw new Error(`Error al obtener temporadas: ${seasonsRes.error.message}`)
    }
    if (periodsRes.error) {
      throw new Error(`Error al obtener periodos: ${periodsRes.error.message}`)
    }
    if (campersRes.error) {
      throw new Error(`Error al obtener campers: ${campersRes.error.message}`)
    }

    return NextResponse.json({
      success: true,
      seasons: seasonsRes.data || [],
      periods: periodsRes.data || [],
      campers: campersRes.data || []
    })
  } catch (error: any) {
    console.error('Admin Seasons GET Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await checkAdminAuth()
    if (!auth.authorized || !auth.clientToUse) return auth.response!

    const body = await request.json()
    const { id, code, supplement_per_night, min_nights, name, color_badge } = body

    if (!id && !code) {
      return NextResponse.json({ error: 'Se requiere id o code de temporada' }, { status: 400 })
    }

    const updatePayload: Record<string, any> = {}

    if (supplement_per_night !== undefined) {
      const parsedSupplement = parseFloat(supplement_per_night)
      if (isNaN(parsedSupplement) || parsedSupplement < 0) {
        return NextResponse.json({ error: 'El suplemento por noche debe ser un número mayor o igual a 0' }, { status: 400 })
      }
      updatePayload.supplement_per_night = parsedSupplement
    }

    if (min_nights !== undefined) {
      const parsedMinNights = parseInt(min_nights, 10)
      if (isNaN(parsedMinNights) || parsedMinNights < 1 || parsedMinNights > 30) {
        return NextResponse.json({ error: 'Las noches mínimas deben ser un entero entre 1 y 30' }, { status: 400 })
      }
      updatePayload.min_nights = parsedMinNights
    }

    if (name !== undefined && typeof name === 'string' && name.trim().length > 0) {
      updatePayload.name = name.trim()
    }

    if (color_badge !== undefined && typeof color_badge === 'string') {
      updatePayload.color_badge = color_badge.trim()
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No se indicaron campos válidos para actualizar' }, { status: 400 })
    }

    let query = auth.clientToUse.from('seasons_v2').update(updatePayload)
    if (id) {
      query = query.eq('id', id)
    } else {
      query = query.eq('code', code)
    }

    const { data: updatedSeason, error: updateError } = await query.select().single()

    if (updateError) {
      throw new Error(`Error al actualizar temporada: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      season: updatedSeason,
      message: 'Temporada actualizada correctamente'
    })
  } catch (error: any) {
    console.error('Admin Seasons PATCH Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
