import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'

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
    const { min_nights, discount_7days_pct, price_per_night, supplement_per_night } = body

    const updatePayload: Record<string, any> = {}
    let parsedPrice: number | undefined
    let parsedSupplement: number | undefined

    if (supplement_per_night !== undefined) {
      parsedSupplement = parseFloat(supplement_per_night)
      if (isNaN(parsedSupplement) || parsedSupplement < 0) {
        return NextResponse.json(
          { error: 'El suplemento por noche debe ser un número válido mayor o igual a 0' },
          { status: 400 }
        )
      }
      updatePayload.supplement_per_night = parsedSupplement
    }

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

    if (price_per_night !== undefined) {
      parsedPrice = parseFloat(price_per_night)
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { error: 'El precio por noche debe ser un número válido mayor o igual a 0' },
          { status: 400 }
        )
      }
      updatePayload.price_per_night = parsedPrice
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos válidos para actualizar' }, { status: 400 })
    }

    const clientToUse = getAdminClientOrSession(supabase)

    let data: any = null
    let updateError: any = null

    // Attempt to update seasons table
    const firstAttempt = await clientToUse
      .from('seasons')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (firstAttempt.error) {
      // If error is caused by missing price_per_night column in seasons table, update other fields
      if (
        (firstAttempt.error.message?.includes('price_per_night') || firstAttempt.error.code === '42703') &&
        updatePayload.price_per_night !== undefined
      ) {
        const { price_per_night: _, ...rest } = updatePayload
        if (Object.keys(rest).length > 0) {
          const secondAttempt = await clientToUse
            .from('seasons')
            .update(rest)
            .eq('id', id)
            .select()
            .maybeSingle()
          data = secondAttempt.data
          updateError = secondAttempt.error
        } else {
          // If only price_per_night was sent, retrieve the season row
          const getSeason = await clientToUse.from('seasons').select('*').eq('id', id).maybeSingle()
          data = getSeason.data
        }
      } else {
        updateError = firstAttempt.error
      }
    } else {
      data = firstAttempt.data
    }

    if (updateError) {
      throw new Error(`Error al actualizar la temporada: ${updateError.message}`)
    }

    // Persist to seasons_v2 if matching id or code exists
    try {
      const { data: v2Season } = await clientToUse
        .from('seasons_v2')
        .select('id')
        .or(`id.eq.${id},code.eq.${id}`)
        .maybeSingle()

      if (v2Season) {
        const v2Payload: Record<string, any> = {}
        if (parsedSupplement !== undefined) v2Payload.supplement_per_night = parsedSupplement
        if (updatePayload.min_nights !== undefined) v2Payload.min_nights = updatePayload.min_nights
        if (Object.keys(v2Payload).length > 0) {
          await clientToUse
            .from('seasons_v2')
            .update(v2Payload)
            .eq('id', v2Season.id)
        }
      }
    } catch (v2Err) {
      console.warn('Could not sync with seasons_v2:', v2Err)
    }

    // Persist price_per_night to camper_pricing table if provided
    if (parsedPrice !== undefined) {
      try {
        const { data: campers } = await clientToUse.from('campers').select('id')
        if (campers && campers.length > 0) {
          const pricingRows = campers.map((c: any) => ({
            camper_id: c.id,
            season_id: id,
            price_per_night: parsedPrice!,
          }))
          await clientToUse
            .from('camper_pricing')
            .upsert(pricingRows, { onConflict: 'camper_id,season_id' })
        } else {
          await clientToUse
            .from('camper_pricing')
            .update({ price_per_night: parsedPrice })
            .eq('season_id', id)
        }
      } catch (cpErr) {
        console.warn('Could not persist to camper_pricing table:', cpErr)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        price_per_night: parsedPrice ?? data?.price_per_night,
      },
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
