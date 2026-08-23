import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { calculatePrice } from '@/lib/pricing/engine'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Debes iniciar sesión para reservar' }, { status: 401 })
        }

        const { camperSlug, from, to, extraIds } = await req.json()

        if (!camperSlug || !from || !to) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
        }

        // 1. Fetch camper
        const { data: camper, error: camperErr } = await supabase
            .from('campers')
            .select('*')
            .eq('slug', camperSlug)
            .single()

        if (camperErr || !camper) return NextResponse.json({ error: 'Camper no encontrado' }, { status: 404 })

        // 2. Comprobar disponibilidad real (evitar dobles reservas)
        const { data: activeBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('camper_id', camper.id)
            .in('status', ['confirmed', 'active'])
            .lte('start_date', to)
            .gte('end_date', from)

        if (activeBookings && activeBookings.length > 0) {
            return NextResponse.json({ error: 'La camper no está disponible en estas fechas' }, { status: 400 })
        }

        // 3. Fetch seasons & extras
        const { data: seasons } = await supabase.from('seasons').select('*')
        const { data: extras } = await supabase
            .from('extras')
            .select('*')
            .in('id', extraIds && extraIds.length > 0 ? extraIds : ['__empty__']) // Prevent empty array error

        // 4. Calcular precio en el servidor as source of truth
        const startDate = new Date(from)
        const endDate = new Date(to)
        const breakdown = calculatePrice(startDate, endDate, seasons || [], extras || [], camper.deposit_amount)

        if (breakdown.numNights <= 0) {
            return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 })
        }

        // 5. Crear la reserva en BD como 'pending'
        const { data: booking, error: bookingErr } = await supabase
            .from('bookings')
            .insert({
                camper_id: camper.id,
                user_id: user.id,
                start_date: from,
                end_date: to,
                total_price: breakdown.totalWithoutDeposit,
                deposit_amount: breakdown.deposit,
                status: 'pending',
            })
            .select('id')
            .single()

        if (bookingErr || !booking) {
            console.error('Booking Error:', bookingErr)
            return NextResponse.json({ error: 'Error al procesar reserva' }, { status: 500 })
        }

        // 6. Crear Stripe Payment Intent
        // NOTA: Stripe cobra en céntimos (x100). El total incluye la fianza? 
        // Depende del negocio. Asumiremos que se cobra el 100% por adelantado incluido fianza,
        // o solo el total sin fianza y la fianza se bloquea luego. 
        // Vamos a cobrar el grandTotal (Reserva + Extras + Fianza) para el MVP.
        const amountInCents = Math.round(breakdown.grandTotal * 100)

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'eur',
            metadata: {
                booking_id: booking.id,
                camper_slug: camperSlug,
                user_id: user.id,
            },
            automatic_payment_methods: { enabled: true },
        })

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            bookingId: booking.id,
            breakdown, // Devolvemos el breakdown oficial del servidor
        })

    } catch (error: any) {
        console.error('CreateIntent Error:', error.message)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
