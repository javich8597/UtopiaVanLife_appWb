import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { isAdminUser, canRefundBooking } from '@/lib/admin/auth'

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

        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

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

        let targetPaymentIntentId = booking.payment_intent_id

        if (!targetPaymentIntentId) {
            // Buscamos el Payment Intent en Stripe usando search query 
            const searchResult = await stripe.paymentIntents.search({
                query: `metadata['booking_id']:'${bookingId}'`,
                limit: 1
            })

            const paymentIntent = searchResult.data[0]

            if (!paymentIntent) {
                // Intentamos con list() en caso de que el Search Index no haya actualizado
                const allIntents = await stripe.paymentIntents.list({ limit: 50 })
                const found = allIntents.data.find(pi => pi.metadata?.booking_id === bookingId)

                if (found) {
                    targetPaymentIntentId = found.id
                }
            } else {
                targetPaymentIntentId = paymentIntent.id
            }
        }

        if (targetPaymentIntentId) {
            try {
                await stripe.refunds.create({ payment_intent: targetPaymentIntentId })
            } catch (stripeErr: any) {
                console.warn('Stripe refund warning (proceeding with status update if already refunded):', stripeErr.message)
            }
        }

        // Update the booking status in DB
        const { error: updateErr } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'cancelled', payment_status: 'refunded' })
            .eq('id', bookingId)

        if (updateErr) throw new Error(updateErr.message)

        return NextResponse.json({ success: true, status: 'cancelled' })

    } catch (error: any) {
        console.error('Refund Error:', error)
        return NextResponse.json({ error: error.message || 'Error procesando el reembolso' }, { status: 500 })
    }
}
