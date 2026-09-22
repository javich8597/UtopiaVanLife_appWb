import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, canRefundBooking, getAdminClientOrSession } from '@/lib/admin/auth'

export async function POST(request: Request) {
    try {
        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Checking if user is admin
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        const isAuthorized = isAdminUser({
            id: user.id,
            email: user.email,
            role: profile?.role,
            user_metadata: user.user_metadata
        })

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
        }

        const { bookingId } = await request.json()

        if (!bookingId) {
            return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 })
        }

        const supabaseAdmin = getAdminClientOrSession(supabase)

        // Verify booking status
        const { data: booking, error: bookingErr } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single()

        if (bookingErr || !booking) {
            return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
        }

        const refundCheck = canRefundBooking(booking.status)
        if (!refundCheck.allowed) {
            return NextResponse.json({ error: refundCheck.reason || 'No se puede reembolsar esta reserva' }, { status: 400 })
        }

        // Si la reserva fue pagada por Redsys (código de 12 caracteres o referencia Redsys),
        // el reembolso se registra en BD y se gestiona desde el panel de Comercia Global Payments / CaixaBank
        const paymentReference = booking.payment_intent_id

        // Update the booking status in DB
        const { error: updateErr } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'cancelled', payment_status: 'refunded' })
            .eq('id', bookingId)

        if (updateErr) throw new Error(updateErr.message)

        // Si había bloqueo en blocked_dates con session_id de esta reserva, liberarlo
        if (paymentReference) {
            await supabaseAdmin
                .from('blocked_dates')
                .delete()
                .eq('session_id', `redsys_${paymentReference}`)
        }

        return NextResponse.json({
            success: true,
            status: 'cancelled',
            paymentStatus: 'refunded',
            message: 'Reserva cancelada y marcada como reembolsada con éxito.',
        })

    } catch (error: any) {
        console.error('Refund Error:', error)
        return NextResponse.json({ error: error.message || 'Error procesando el reembolso' }, { status: 500 })
    }
}
