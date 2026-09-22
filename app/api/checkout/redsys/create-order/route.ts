import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePrice } from '@/lib/pricing/engine'
import { generateRedsysOrderId, createRedsysPaymentForm } from '@/lib/redsys'

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

        if (camperErr || !camper) {
            return NextResponse.json({ error: 'Camper no encontrada' }, { status: 404 })
        }

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
            .in('id', extraIds && extraIds.length > 0 ? extraIds : ['__empty__'])

        // 4. Calcular precio en el servidor como source of truth
        const startDate = new Date(from)
        const endDate = new Date(to)
        const breakdown = calculatePrice(startDate, endDate, seasons || [], extras || [], camper.deposit_amount)

        if (breakdown.numNights <= 0) {
            return NextResponse.json({ error: 'Fechas de reserva inválidas' }, { status: 400 })
        }

        // El importe a cobrar en Redsys es el 100% del viaje (alquiler + extras - descuentos)
        const amountToCharge = breakdown.totalWithoutDeposit

        // Fetch user profile name and phone from public.users
        const { data: userProfile } = await supabase
            .from('users')
            .select('full_name, phone')
            .eq('id', user.id)
            .maybeSingle()

        const customerName = userProfile?.full_name || user.user_metadata?.full_name || 'Cliente Utopia'
        const customerEmail = user.email || ''
        const customerPhone = userProfile?.phone || user.user_metadata?.phone || ''

        // 5. Generar identificador de pedido único de Redsys (12 caracteres)
        const redsysOrderId = generateRedsysOrderId()

        // 6. Crear la reserva en BD como 'pending' y 'unpaid'
        const { data: booking, error: bookingErr } = await supabase
            .from('bookings')
            .insert({
                camper_id: camper.id,
                user_id: user.id,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                start_date: from,
                end_date: to,
                num_nights: breakdown.numNights,
                base_price: breakdown.baseTotal,
                extras_total: breakdown.extrasTotal,
                discount_amount: breakdown.discountAmount,
                deposit_amount: breakdown.deposit,
                extras_selected: extras || [],
                total_price: breakdown.totalWithoutDeposit,
                status: 'pending',
                payment_status: 'unpaid',
                payment_intent_id: redsysOrderId, // Guardamos la referencia de pedido de Redsys
            })
            .select('id')
            .single()

        if (bookingErr || !booking) {
            console.error('Booking Error:', bookingErr)
            return NextResponse.json({ error: 'Error al registrar la reserva previa' }, { status: 500 })
        }

        // 7. Generar los parámetros y la firma criptográfica para Redsys
        const formData = createRedsysPaymentForm({
            amount: amountToCharge,
            orderId: redsysOrderId,
            description: `1x Camper ${camper.name || camperSlug.toUpperCase()} - Utopia Van Life`,
            customerName,
        })

        return NextResponse.json({
            bookingId: booking.id,
            orderId: redsysOrderId,
            formData,
            breakdown,
        })
    } catch (error: any) {
        console.error('Redsys CreateOrder Error:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
