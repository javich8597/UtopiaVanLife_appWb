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

    const { data: campers, error } = await auth.clientToUse
      .from('campers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Error al obtener campers: ${error.message}`)
    }

    // Attach pricing with season names if camper_pricing exists
    const { data: pricing } = await auth.clientToUse
      .from('camper_pricing')
      .select('camper_id, price_per_night, season_id, seasons(name)')

    const campersWithPricing = (campers || []).map((c: any) => {
      const prices = pricing?.filter((p: any) => p.camper_id === c.id) || []
      const mediaPrice = prices.find((p: any) => p.seasons?.name?.toLowerCase().includes('media'))?.price_per_night
      const basePrice = mediaPrice || prices[0]?.price_per_night || (c.slug === 'neo' ? 120 : (c.slug === 'space' ? 140 : 120))
      return {
        ...c,
        price_per_night: Number(basePrice),
        pricing: prices
      }
    })

    return NextResponse.json({ success: true, campers: campersWithPricing })
  } catch (error: any) {
    console.error('Admin Campers GET Error:', error)
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

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre de la camper es obligatorio' }, { status: 400 })
    }

    const generatedSlug = (slug && typeof slug === 'string' && slug.trim().length > 0)
      ? slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      : name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')

    const parsedSeats = parseInt(seats ?? customSpecs?.seats ?? 2, 10)
    const parsedBeds = parseInt(beds ?? customSpecs?.beds ?? 2, 10)
    const parsedDeposit = parseFloat(deposit_amount ?? 1000)
    const parsedPrice = parseFloat(price_per_night ?? base_price ?? 120)

    if (isNaN(parsedSeats) || parsedSeats < 1) {
      return NextResponse.json({ error: 'Las plazas deben ser un número mayor a 0' }, { status: 400 })
    }
    if (isNaN(parsedBeds) || parsedBeds < 1) {
      return NextResponse.json({ error: 'Las camas deben ser un número mayor a 0' }, { status: 400 })
    }
    if (isNaN(parsedDeposit) || parsedDeposit < 0) {
      return NextResponse.json({ error: 'La fianza debe ser un número mayor o igual a 0' }, { status: 400 })
    }

    const specs = {
      seats: parsedSeats,
      beds: parsedBeds,
      length_m: customSpecs?.length_m ?? 5.99,
      width_m: customSpecs?.width_m ?? 2.05,
      height_m: customSpecs?.height_m ?? 2.58,
      year: customSpecs?.year ?? 2025,
      ac: customSpecs?.ac ?? 'Dometic 12V',
      solar_w: customSpecs?.solar_w ?? 400,
      lithium_ah: customSpecs?.lithium_ah ?? 540,
      fresh_water_l: customSpecs?.fresh_water_l ?? 120,
      ...customSpecs,
    }

    const defaultThumbnail = thumbnail_url || (generatedSlug.includes('space')
      ? '/images/campers/space/space-ext.png'
      : '/images/campers/neo/neo-ext.png')

    const newCamperData = {
      name: name.trim(),
      slug: generatedSlug,
      description_es: description_es || `${name.trim()} - Equipamiento completo de lujo para explorar Mallorca.`,
      description_en: description_en || `${name.trim()} - Fully equipped luxury campervan to explore Mallorca.`,
      thumbnail_url: defaultThumbnail,
      images: Array.isArray(images) && images.length > 0 ? images : [defaultThumbnail],
      specs,
      deposit_amount: parsedDeposit,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      is_available: is_available !== undefined ? Boolean(is_available) : true,
    }

    const { data: createdCamper, error: insertError } = await auth.clientToUse
      .from('campers')
      .insert(newCamperData)
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505' || insertError.message.includes('unique') || insertError.message.includes('duplicate')) {
        return NextResponse.json({ error: `El slug '${generatedSlug}' ya está en uso. Elige otro identificador.` }, { status: 409 })
      }
      throw new Error(`Error al crear la camper: ${insertError.message}`)
    }

    // Associate pricing with existing seasons if pricing table is active
    if (!isNaN(parsedPrice) && createdCamper?.id) {
      try {
        const { data: seasons } = await auth.clientToUse.from('seasons').select('id, name')
        if (seasons && seasons.length > 0) {
          const pricingRows = seasons.map((s: any) => ({
            camper_id: createdCamper.id,
            season_id: s.id,
            price_per_night: s.name.toLowerCase().includes('alta') ? Math.round(parsedPrice * 1.35) : (s.name.toLowerCase().includes('baja') ? Math.round(parsedPrice * 0.8) : parsedPrice),
            discount_7days_pct: s.name.toLowerCase().includes('alta') ? 10 : 5,
          }))

          await auth.clientToUse
            .from('camper_pricing')
            .upsert(pricingRows, { onConflict: 'camper_id,season_id' })
        }
      } catch (pricingErr) {
        console.warn('Could not insert camper_pricing for new camper:', pricingErr)
      }
    }

    return NextResponse.json({
      success: true,
      camper: {
        ...createdCamper,
        price_per_night: parsedPrice,
      },
      message: 'Camper creada correctamente',
    }, { status: 201 })
  } catch (error: any) {
    console.error('Admin Campers POST Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
