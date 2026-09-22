import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { calculatePriceV2 } from '@/lib/pricing/engine'
import { CategorizedExtra, DaySlot, KmPackage, CancellationPolicy } from '@/lib/pricing/types'
import { generateRedsysOrderId, createRedsysPaymentForm } from '@/lib/redsys'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        const camperSlug = body.camperSlug || body.camper_slug || body.camper || body.camperId
        const startDateStr = body.startDate || body.from
        const endDateStr = body.endDate || body.to

        const pickupSlot: DaySlot = body.pickupSlot || body.startSlot || (body.pickupTime === '09:00' ? 'morning' : 'afternoon')
        const dropoffSlot: DaySlot = body.dropoffSlot || body.endSlot || (body.dropoffTime === '19:00' || body.dropoffTime === '18:00' ? 'afternoon' : 'morning')

        const pickupTime = body.pickupTime || body.pickup_time || (pickupSlot === 'morning' ? '09:00' : '15:00')
        const dropoffTime = body.dropoffTime || body.dropoff_time || (dropoffSlot === 'afternoon' ? '19:00' : '12:00')

        const kmPackage: KmPackage = body.kmPackage === 'unlimited' ? 'unlimited' : 'included_150'
        const cancellationPolicy: CancellationPolicy = body.cancellationPolicy === 'flexible' ? 'flexible' : 'standard'

        const rawExtras = body.extrasSelected || body.extras || body.selectedExtras || []

        const cust = body.customer || {}
        const customerName = (cust.fullName || cust.name || body.customerName || body.fullName || body.name || '').trim()
        const customerEmail = (cust.email || body.customerEmail || body.email || '').trim().toLowerCase()
        const customerPhone = (cust.phone || body.customerPhone || body.phone || '').trim()
        const customerDni = (cust.dniNie || cust.dni || body.customerDni || body.dniNie || body.dni || '').trim()

        const addressParts = [
            cust.address || body.customerAddress || body.address,
            cust.city || body.city,
            cust.postalCode || body.postalCode,
            cust.country || body.country
        ].filter(Boolean)
        const customerAddress = addressParts.length > 0 ? addressParts.join(', ') : (cust.address || body.customerAddress || '')

        const travelersCount = Number(cust.travelersCount || cust.pax || body.travelersCount || body.pax || body.num_pax || 2)
        const notes = cust.notes || body.notes || ''

        // 1. Validaciones básicas de entrada
        if (!camperSlug || !startDateStr || !endDateStr) {
            return NextResponse.json(
                { error: 'Faltan parámetros requeridos (camper, fecha inicio y fecha fin)' },
                { status: 400 }
            )
        }

        if (!customerEmail) {
            return NextResponse.json(
                { error: 'El correo electrónico del cliente es obligatorio' },
                { status: 400 }
            )
        }

        const startDate = new Date(startDateStr)
        const endDate = new Date(endDateStr)

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
            return NextResponse.json(
                { error: 'Rango de fechas de reserva inválido' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // 2. Comprobar existencia de la camper
        const { data: camper, error: camperErr } = await supabase
            .from('campers')
            .select('*')
            .or(`slug.eq.${camperSlug},id.eq.${camperSlug}`)
            .single()

        if (camperErr || !camper) {
            return NextResponse.json({ error: 'Camper no encontrada' }, { status: 404 })
        }

        // 3. Comprobar disponibilidad frente a reservas activas y bloqueos de calendario
        const { data: activeBookings } = await supabase
            .from('bookings')
            .select('id, start_date, end_date')
            .eq('camper_id', camper.id)
            .in('status', ['confirmed', 'active'])
            .lte('start_date', endDateStr)
            .gte('end_date', startDateStr)

        if (activeBookings && activeBookings.length > 0) {
            return NextResponse.json(
                { error: 'La camper no está disponible en las fechas seleccionadas (reserva confirmada existente)' },
                { status: 409 }
            )
        }

        const { data: blockedDates } = await supabase
            .from('blocked_dates')
            .select('id, start_date, end_date, expires_at')
            .eq('camper_id', camper.id)
            .lte('start_date', endDateStr)
            .gte('end_date', startDateStr)

        const now = new Date()
        const effectiveHolds = (blockedDates || []).filter(b => {
            if (!b.expires_at) return true
            return new Date(b.expires_at) > now
        })

        if (effectiveHolds.length > 0) {
            return NextResponse.json(
                { error: 'La camper no está disponible en las fechas seleccionadas (fechas bloqueadas)' },
                { status: 409 }
            )
        }

        // 4. Obtener tarifas de temporadas, periodos, tramos de descuento y extras de la base de datos
        const [{ data: seasonsV2 }, { data: seasonPeriods }, { data: discounts }, { data: dbExtras }] = await Promise.all([
            supabase.from('seasons_v2').select('*'),
            supabase.from('season_periods').select('*'),
            supabase.from('duration_discounts').select('*'),
            supabase.from('extras').select('*'),
        ])

        // Normalizar y verificar extras seleccionados con la base de datos (seguridad server-side)
        const verifiedExtras: CategorizedExtra[] = []
        if (Array.isArray(rawExtras)) {
            for (const item of rawExtras) {
                const extraId = typeof item === 'string' ? item : (item.id || item.extraId)
                const dbExtra = (dbExtras || []).find((e: any) => e.id === extraId)
                if (dbExtra) {
                    const quantity = typeof item === 'object' && item.quantity ? Math.max(1, Math.floor(Number(item.quantity))) : 1
                    verifiedExtras.push({
                        id: dbExtra.id,
                        extraId: dbExtra.id,
                        name: dbExtra.name_es || dbExtra.name || 'Extra',
                        category: dbExtra.category || 'Equipamiento',
                        price: Number(dbExtra.price) || 0,
                        pricingType: dbExtra.price_type === 'per_day' ? 'per_day' : 'per_rental',
                        pricing_type: dbExtra.price_type === 'per_day' ? 'per_day' : 'per_rental',
                        quantity,
                    })
                }
            }
        }

        // 5. Cálculo verificado de precios en el servidor (Source of Truth)
        const breakdown = calculatePriceV2({
            startDate,
            pickupSlot,
            endDate,
            dropoffSlot,
            camperBasePrice: Number(camper.price_per_night || camper.price_per_day || 110),
            camperId: camper.id,
            seasons: seasonsV2 || [],
            periods: seasonPeriods || [],
            discounts: discounts || [],
            kmPackage,
            cancellationPolicy,
            extrasSelected: verifiedExtras,
            depositAmount: Number(camper.deposit_amount) || 1000,
        })

        if (breakdown.numNights <= 0) {
            return NextResponse.json({ error: 'Rango de fechas de reserva inválido' }, { status: 400 })
        }

        // 6. Gestión de Usuario (Creación transparente o vinculación por email)
        let userId: string | null = null

        // Comprobar si el usuario ya existe en public.users
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, phone, dni_nie, address, full_name')
            .ilike('email', customerEmail)
            .maybeSingle()

        if (existingUser) {
            userId = existingUser.id
            const updates: Record<string, any> = {}
            if (customerPhone && !existingUser.phone) updates.phone = customerPhone
            if (customerDni && !existingUser.dni_nie) updates.dni_nie = customerDni
            if (customerAddress && !existingUser.address) updates.address = customerAddress
            if (customerName && !existingUser.full_name) updates.full_name = customerName
            if (Object.keys(updates).length > 0) {
                await supabase.from('users').update(updates).eq('id', userId)
            }
        } else {
            // Usuario nuevo: crear en Supabase Auth
            const secureRandomPassword = `Utopia_${Math.random().toString(36).substring(2, 10)}_2026!`
            try {
                const { data: authCreated } = await supabase.auth.admin.createUser({
                    email: customerEmail,
                    password: secureRandomPassword,
                    email_confirm: true,
                    user_metadata: {
                        full_name: customerName,
                        phone: customerPhone,
                        dni_nie: customerDni,
                        address: customerAddress,
                    },
                })
                if (authCreated?.user) {
                    userId = authCreated.user.id
                }
            } catch (authErr) {
                console.warn('createUser admin error, attempting fallback signUp:', authErr)
            }

            if (!userId) {
                const { data: signUpData } = await supabase.auth.signUp({
                    email: customerEmail,
                    password: secureRandomPassword,
                    options: {
                        data: {
                            full_name: customerName,
                            phone: customerPhone,
                            dni_nie: customerDni,
                            address: customerAddress,
                        },
                    },
                })
                userId = signUpData?.user?.id || null
            }

            // Si los triggers no insertaron en public.users o si se necesita asegurar sincronización
            if (userId) {
                const { data: checkPublic } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', userId)
                    .maybeSingle()

                if (!checkPublic) {
                    await supabase.from('users').upsert({
                        id: userId,
                        full_name: customerName || 'Cliente Utopia',
                        email: customerEmail,
                        phone: customerPhone || null,
                        dni_nie: customerDni || null,
                        address: customerAddress || null,
                        role: 'client',
                    })
                }
            }
        }

        if (!userId) {
            console.error('No se pudo resolver o crear el usuario para email:', customerEmail)
            return NextResponse.json({ error: 'Error al asociar cuenta de usuario' }, { status: 500 })
        }

        // 7. Generar identificador de pedido único de Redsys (12 caracteres)
        const orderId = generateRedsysOrderId()

        // 8. Persistir reserva con estado 'pending' y payment_status 'pending'
        const { data: booking, error: bookingErr } = await supabase
            .from('bookings')
            .insert({
                camper_id: camper.id,
                user_id: userId,
                start_date: startDateStr,
                end_date: endDateStr,
                pickup_time: pickupTime,
                dropoff_time: dropoffTime,
                num_nights: breakdown.numNights,
                num_pax: travelersCount,
                km_package: kmPackage,
                km_price: breakdown.kmSupplement,
                cancellation_policy: cancellationPolicy,
                cancellation_price: breakdown.cancellationSupplement,
                extras_selected: verifiedExtras,
                extras_total: breakdown.extrasTotal,
                base_price: breakdown.baseRentalTotal,
                discount_amount: breakdown.discountAmount,
                deposit_amount: breakdown.depositAmount,
                total_price: breakdown.payableTotal,
                pricing_breakdown: breakdown,
                customer_name: customerName || 'Cliente Utopia',
                customer_email: customerEmail,
                customer_phone: customerPhone || null,
                customer_dni: customerDni || null,
                customer_address: customerAddress || null,
                notes: notes || null,
                status: 'pending',
                payment_status: 'pending',
                payment_intent_id: orderId,
            })
            .select('id')
            .single()

        if (bookingErr || !booking) {
            console.error('Error insertando reserva en bookings:', bookingErr)
            return NextResponse.json({ error: 'Error al registrar la reserva' }, { status: 500 })
        }

        // 9. Generar parámetros firmados de Redsys
        const redsysFormData = createRedsysPaymentForm({
            amount: breakdown.payableTotal,
            orderId,
            description: `1x Camper ${camper.name || camperSlug.toUpperCase()} - Utopia Van Life`,
            customerName: customerName || 'Cliente Utopia',
        })

        return NextResponse.json({
            success: true,
            bookingId: booking.id,
            orderId,
            redsys: {
                url: redsysFormData.url,
                params: redsysFormData.merchantParameters,
                signature: redsysFormData.signature,
                version: redsysFormData.signatureVersion,
                orderId,
            },
            formData: redsysFormData,
            breakdown,
        })
    } catch (error: any) {
        console.error('Checkout API error:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
