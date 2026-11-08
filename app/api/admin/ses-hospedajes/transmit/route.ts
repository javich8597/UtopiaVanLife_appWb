import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'
import { generateSesHospedajesXml } from '@/lib/sesHospedajes/xmlGenerator'
import {
  transmitToSesHospedajes,
  SesHospedajesTransmissionOptions,
} from '@/lib/sesHospedajes/client'

/**
 * Endpoint de transmisión telemática M2M directa con SES.HOSPEDAJES (RD 933/2021)
 *
 * Método: POST /api/admin/ses-hospedajes/transmit
 * Autenticación: Sesión de Administrador o Bearer token Service Role
 * Parámetros JSON: { bookingId: string, options?: SesHospedajesTransmissionOptions }
 */
export async function POST(request: Request) {
  try {
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const { searchParams } = new URL(request.url)
    const bookingId =
      body?.bookingId || searchParams.get('bookingId') || searchParams.get('id')
    const options: SesHospedajesTransmissionOptions | undefined = body?.options

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Falta el parámetro obligatorio bookingId',
        },
        { status: 400 }
      )
    }

    // 1. Verificación de autenticación de usuario (sesión admin o Bearer service role)
    const authHeader =
      request.headers.get('authorization') || request.headers.get('Authorization')
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
        const {
          data: { user },
          error: authError,
        } = bearerToken
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
            app_metadata: user.app_metadata,
          })

          if (isAuthorized) {
            clientToUse = getAdminClientOrSession(supabase)
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    if (!clientToUse) {
      clientToUse = getAdminClientOrSession(null)
    }

    // 2. Obtención de la reserva completa junto a camper y usuario
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
      return NextResponse.json(
        { success: false, error: 'Reserva no encontrada' },
        { status: 404 }
      )
    }

    // 3. Generación del XML oficial de comunicación ministerial
    const userObj = Array.isArray(booking.users) ? booking.users[0] : (booking.users || {})
    const camperObj = Array.isArray(booking.campers)
      ? booking.campers[0]
      : (booking.campers || {})

    const { xml, reference } = generateSesHospedajesXml(
      booking,
      userObj,
      camperObj
    )

    // 4. Envío directo a SES.HOSPEDAJES
    const result = await transmitToSesHospedajes({
      xml,
      reference,
      bookingId: String(booking.id),
      options,
    })

    // 5. Registro de trazabilidad y auditoría ministerial en la reserva
    const timestamp = result.sentAt || new Date().toISOString()
    let logEntry = ''

    if (result.success) {
      if (result.registryNumber) {
        logEntry = `[SES.HOSPEDAJES ENVIADO: ${result.reference} - Reg: ${result.registryNumber} a las ${timestamp}]`
      } else {
        logEntry = `[SES.HOSPEDAJES ENVIADO: ${result.reference} - ${result.message} a las ${timestamp}]`
      }
    } else {
      const errDetail = result.error || result.message || 'Error de transmisión'
      logEntry = `[SES.HOSPEDAJES ERROR: ${result.reference} - ${errDetail} a las ${timestamp}]`
    }

    const currentNotes = typeof booking.notes === 'string' ? booking.notes : ''
    const updatedNotes = currentNotes ? `${currentNotes}\n${logEntry}` : logEntry

    try {
      await clientToUse
        .from('bookings')
        .update({
          notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id)
    } catch (dbErr) {
      console.warn('Advertencia al registrar auditoría de SES.HOSPEDAJES:', dbErr)
    }

    // 6. Respuesta JSON estructurada
    return NextResponse.json({
      success: result.success,
      reference: result.reference,
      ...(result.registryNumber ? { registryNumber: result.registryNumber } : {}),
      message: result.message,
      sentAt: result.sentAt,
      ...(result.error ? { error: result.error } : {}),
    })
  } catch (error: any) {
    console.error('Error en SES Hospedajes Transmit API:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'Error interno del servidor al transmitir la reserva a SES.HOSPEDAJES',
      },
      { status: 500 }
    )
  }
}
