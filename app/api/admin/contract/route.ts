import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'
import { generateContractData } from '@/lib/contracts/contractEngine'
import { renderContractHtml } from '@/lib/admin/contractHtml'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'Falta bookingId' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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
            app_metadata: user.app_metadata
    })

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const clientToUse = getAdminClientOrSession(supabase)

    const { data: booking, error: bookingErr } = await clientToUse
      .from('bookings')
      .select(`
        *,
        campers (*),
        users (*)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    const contract = generateContractData(booking, booking.users, booking.campers)

    // HTML imprimible: mismo contenido que el PDF del cliente (incluido el segundo conductor)
    const html = renderContractHtml(contract)

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    })

  } catch (error: any) {
    console.error('Contract API Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}