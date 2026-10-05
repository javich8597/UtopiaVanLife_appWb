import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'

export async function POST(request: Request) {
  try {
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
            app_metadata: user.app_metadata
    })

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { bookingId, action } = await request.json()

    if (!bookingId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Parámetros de reserva inválidos' }, { status: 400 })
    }

    // Use the authenticated supabase client or admin client with SUPABASE_SERVICE_ROLE_KEY
    const clientToUse = getAdminClientOrSession(supabase)

    const targetStatus = action === 'approve' ? 'confirmed' : 'cancelled'

    // Solo se aprueban o rechazan reservas pendientes (nunca reabrir una cancelada o reembolsada)
    const { data: updated, error: updateErr } = await clientToUse
      .from('bookings')
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .eq('status', 'pending')
      .select('id')

    if (updateErr) {
      throw new Error(`Error al actualizar la reserva: ${updateErr.message}`)
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'La reserva ya no está pendiente. Recarga la página.' }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status: targetStatus,
      message: action === 'approve'
        ? 'Reserva aprobada y confirmada con éxito. El contrato dinámico ha sido emitido.'
        : 'Reserva rechazada.'
    })
  } catch (error: any) {
    console.error('Approve Booking API Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
