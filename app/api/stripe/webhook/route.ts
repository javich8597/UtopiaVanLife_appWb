import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') as string

    let event

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message)
        return NextResponse.json({ error: err.message }, { status: 400 })
    }

    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as any
                const bookingId = paymentIntent.metadata?.booking_id

                if (bookingId) {
                    const { error } = await supabaseAdmin
                        .from('bookings')
                        .update({ status: 'confirmed' })
                        .eq('id', bookingId)

                    if (error) {
                        console.error('Error updating booking status:', error)
                        return NextResponse.json({ error: 'DB Update Failed' }, { status: 500 })
                    }
                }
                break
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as any
                const bookingId = paymentIntent.metadata?.booking_id

                if (bookingId) {
                    await supabaseAdmin
                        .from('bookings')
                        .update({ status: 'cancelled' })
                        .eq('id', bookingId)
                }
                break
            }

            default:
                console.log(`Unhandled event type ${event.type}`)
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('Webhook handling error:', error)
        return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 })
    }
}
