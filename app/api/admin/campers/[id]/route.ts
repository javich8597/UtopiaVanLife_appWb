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

    const { data: camper, error } = await auth.clientToUse
      .from('campers')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !camper) {
      return NextResponse.json({ error: 'Camper no encontrada' }, { status: 404 })
    }

    const { data: pricing } = await auth.clientToUse
      .from('camper_pricing')
      .select('*')
      .eq('camper_id', id)

    return NextResponse.json({
      success: true,
      camper: {
        ...camper,
        pricing: pricing || [],
        price_per_night: pricing?.[0]?.price_per_night || 120,
      }
    })
  } catch (error: any) {
    console.error('Admin Camper GET [id] Error:', error)
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
      name,
      slug,
      seats,
      beds,
      deposit_amount,
      is_active,
      is_available,
      price_per_night,
      base_price,
      description_es,
      description_en,
      thumbnail_url,
      images,
      specs: customSpecs,
    } = body

    // Fetch existing camper first to merge specs safely
    const { data: existingCamper, error: fetchErr } = await auth.clientToUse
      .from('campers')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !existingCamper) {
      return NextResponse.json({ error: 'Camper no encontrada' }, { status: 404 })
    }

    const updatePayload: Record<string, any> = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
      }
      updatePayload.name = name.trim()
    }

    if (slug !== undefined) {
      if (typeof slug !== 'string' || slug.trim().length === 0) {
        return NextResponse.json({ error: 'El slug no puede estar vacío' }, { status: 400 })
      }
      updatePayload.slug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    }

    if (deposit_amount !== undefined) {
      const parsedDeposit = parseFloat(deposit_amount)
      if (isNaN(parsedDeposit) || parsedDeposit < 0) {
        return NextResponse.json({ error: 'La fianza debe ser un número positivo' }, { status: 400 })
      }
      updatePayload.deposit_amount = parsedDeposit
    }

    if (is_active !== undefined) {
      updatePayload.is_active = Boolean(is_active)
    }

    if (is_available !== undefined) {
      updatePayload.is_available = Boolean(is_available)
    }

    if (description_es !== undefined) {
      updatePayload.description_es = description_es
    }

    if (description_en !== undefined) {
      updatePayload.description_en = description_en
    }

    if (thumbnail_url !== undefined) {
      updatePayload.thumbnail_url = thumbnail_url
    }

    if (images !== undefined) {
      updatePayload.images = Array.isArray(images) ? images : [images]
    }

    // Merge specs
    const currentSpecs = existingCamper.specs || {}
    const newSpecs = { ...currentSpecs, ...(customSpecs || {}) }
    let specsChanged = Boolean(customSpecs)

    if (seats !== undefined) {
      const parsedSeats = parseInt(seats, 10)
      if (isNaN(parsedSeats) || parsedSeats < 1) {
        return NextResponse.json({ error: 'Las plazas deben ser un número mayor a 0' }, { status: 400 })
      }
      newSpecs.seats = parsedSeats
      specsChanged = true
    }

    if (beds !== undefined) {
      const parsedBeds = parseInt(beds, 10)
      if (isNaN(parsedBeds) || parsedBeds < 1) {
        return NextResponse.json({ error: 'Las camas deben ser un número mayor a 0' }, { status: 400 })
      }
      newSpecs.beds = parsedBeds
      specsChanged = true
    }

    if (specsChanged) {
      updatePayload.specs = newSpecs
    }

    if (Object.keys(updatePayload).length > 0) {
      const { data: updated, error: updateErr } = await auth.clientToUse
        .from('campers')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (updateErr) {
        if (updateErr.code === '23505' || updateErr.message.includes('unique') || updateErr.message.includes('duplicate')) {
          return NextResponse.json({ error: `El slug '${updatePayload.slug}' ya está en uso.` }, { status: 409 })
        }
        throw new Error(`Error al actualizar camper: ${updateErr.message}`)
      }
    }

    // Update pricing if requested
    const targetPrice = price_per_night ?? base_price
    if (targetPrice !== undefined) {
      const parsedPrice = parseFloat(targetPrice)
      if (!isNaN(parsedPrice) && parsedPrice >= 0) {
        try {
          const { data: seasons } = await auth.clientToUse.from('seasons').select('id, name')
          if (seasons && seasons.length > 0) {
            const pricingRows = seasons.map((s: any) => ({
              camper_id: id,
              season_id: s.id,
              price_per_night: s.name.toLowerCase().includes('alta') ? Math.round(parsedPrice * 1.35) : (s.name.toLowerCase().includes('baja') ? Math.round(parsedPrice * 0.8) : parsedPrice),
              discount_7days_pct: s.name.toLowerCase().includes('alta') ? 10 : 5,
            }))

            await auth.clientToUse
              .from('camper_pricing')
              .upsert(pricingRows, { onConflict: 'camper_id,season_id' })
          }
        } catch (priceErr) {
          console.warn('Could not update camper_pricing for camper:', priceErr)
        }
      }
    }

    // Fetch the final updated camper state
    const { data: finalCamper } = await auth.clientToUse
      .from('campers')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({
      success: true,
      camper: {
        ...finalCamper,
        price_per_night: targetPrice ? parseFloat(targetPrice) : undefined,
      },
      message: 'Camper actualizada correctamente',
    })
  } catch (error: any) {
    console.error('Admin Camper PATCH [id] Error:', error)
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

    // Check if camper exists
    const { data: camper, error: findError } = await auth.clientToUse
      .from('campers')
      .select('id, name')
      .eq('id', id)
      .single()

    if (findError || !camper) {
      return NextResponse.json({ error: 'Camper no encontrada' }, { status: 404 })
    }

    // Attempt hard delete first
    const { error: deleteError } = await auth.clientToUse
      .from('campers')
      .delete()
      .eq('id', id)

    if (deleteError) {
      // If foreign key constraint prevents deletion (e.g. historical bookings), archive instead
      console.warn(`Could not hard delete camper ${id}, archiving instead:`, deleteError.message)

      const { error: archiveError } = await auth.clientToUse
        .from('campers')
        .update({
          is_active: false,
          is_available: false,
        })
        .eq('id', id)

      if (archiveError) {
        throw new Error(`Error al archivar la camper: ${archiveError.message}`)
      }

      return NextResponse.json({
        success: true,
        archived: true,
        message: `La camper '${camper.name}' tiene reservas asociadas y ha sido archivada (desactivada) en lugar de eliminada.`,
      })
    }

    return NextResponse.json({
      success: true,
      archived: false,
      message: `Camper '${camper.name}' eliminada correctamente de la flota.`,
    })
  } catch (error: any) {
    console.error('Admin Camper DELETE [id] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
