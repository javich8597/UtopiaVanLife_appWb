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

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await checkAdminAuth()
    if (!auth.authorized || !auth.clientToUse) return auth.response!

    const { data: extra, error } = await auth.clientToUse
      .from('extras')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !extra) {
      return NextResponse.json({ error: 'Extra no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, extra })
  } catch (error: any) {
    console.error('Admin Extra GET [id] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
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

    const updatePayload: Record<string, any> = {}

    if (name_es !== undefined) {
      if (typeof name_es !== 'string' || name_es.trim().length === 0) {
        return NextResponse.json({ error: 'El nombre en español no puede estar vacío' }, { status: 400 })
      }
      updatePayload.name_es = name_es.trim()
    }

    if (name_en !== undefined) {
      updatePayload.name_en = typeof name_en === 'string' ? name_en.trim() : null
    }

    if (description_es !== undefined) {
      updatePayload.description_es = description_es
    }

    if (description_en !== undefined) {
      updatePayload.description_en = description_en
    }

    if (price !== undefined) {
      const parsedPrice = parseFloat(price)
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ error: 'El precio debe ser un número mayor o igual a 0' }, { status: 400 })
      }
      updatePayload.price = parsedPrice
    }

    if (price_type !== undefined) {
      if (price_type !== 'per_rental' && price_type !== 'per_day') {
        return NextResponse.json({ error: 'El tipo debe ser per_rental o per_day' }, { status: 400 })
      }
      updatePayload.price_type = price_type
    }

    if (icon !== undefined) {
      updatePayload.icon = icon
    }

    if (is_active !== undefined) {
      updatePayload.is_active = Boolean(is_active)
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No hay datos para actualizar' }, { status: 400 })
    }

    const { data: updatedExtra, error: updateError } = await auth.clientToUse
      .from('extras')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Error al actualizar el extra: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      extra: updatedExtra,
      message: 'Extra actualizado correctamente',
    })
  } catch (error: any) {
    console.error('Admin Extra PATCH Error:', error)
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

    // Check if extra is linked to any booking
    const { count: linkedBookings, error: checkErr } = await auth.clientToUse
      .from('booking_extras')
      .select('*', { count: 'exact', head: true })
      .eq('extra_id', id)

    if (checkErr && !checkErr.message.includes('relation "public.booking_extras" does not exist')) {
      console.warn('Error checking booking_extras:', checkErr)
    }

    if (linkedBookings && linkedBookings > 0) {
      // Soft-delete to protect historical records
      const { data: archivedExtra, error: archiveError } = await auth.clientToUse
        .from('extras')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()

      if (archiveError) {
        throw new Error(`Error al desactivar el extra: ${archiveError.message}`)
      }

      return NextResponse.json({
        success: true,
        archived: true,
        extra: archivedExtra,
        message: 'El extra está vinculado a reservas existentes, se ha desactivado para proteger el historial.',
      })
    }

    const { error: deleteError } = await auth.clientToUse
      .from('extras')
      .delete()
      .eq('id', id)

    if (deleteError) {
      // If foreign key constraint blocks deletion, fallback to soft delete
      if (deleteError.code === '23503' || deleteError.message.includes('foreign key')) {
        await auth.clientToUse
          .from('extras')
          .update({ is_active: false })
          .eq('id', id)

        return NextResponse.json({
          success: true,
          archived: true,
          message: 'El extra se ha desactivado.',
        })
      }
      throw new Error(`Error al eliminar el extra: ${deleteError.message}`)
    }

    return NextResponse.json({
      success: true,
      deleted: true,
      message: 'Extra eliminado definitivamente.',
    })
  } catch (error: any) {
    console.error('Admin Extra DELETE Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
