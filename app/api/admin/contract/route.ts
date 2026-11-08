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

    // 1. Verificación de autenticación de usuario (sesión admin o Bearer service role)
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    let isAuthorized = false
    let clientToUse: any = null

    if (bearerToken && serviceKey && bearerToken === serviceKey) {
      isAuthorized = true
      clientToUse = getAdminClientOrSession(null)
    } else {
      let supabase: any = null
      try {
        supabase = await createServerClient()
      } catch {
        supabase = null
      }

      if (supabase) {
        const { data: { user }, error: authError } = bearerToken
          ? await supabase.auth.getUser(bearerToken)
          : await supabase.auth.getUser()

        if (!authError && user) {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

          isAuthorized = isAdminUser({
            id: user.id,
            email: user.email,
            role: profile?.role,
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata
          })

          if (isAuthorized) {
            clientToUse = getAdminClientOrSession(supabase)
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!clientToUse) {
      clientToUse = getAdminClientOrSession(null)
    }

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

    const userObj = Array.isArray(booking.users) ? booking.users[0] : (booking.users || {})
    const camperObj = Array.isArray(booking.campers) ? booking.campers[0] : (booking.campers || {})

    const contract = generateContractData(booking, userObj, camperObj)

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