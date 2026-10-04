import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Simple env loader
const envContent = fs.readFileSync('.env.local', 'utf-8')
const env: Record<string, string> = {}
for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx > -1) {
        env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
    }
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseAnonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
    const demoEmail = 'demo@utopiavanlife.com'
    const demoPassword = 'DemoUtopia2026!'
    const fullName = 'Carlos Mendoza (Demo)'
    const phone = '+34 600 123 456'
    const dni = '12345678Z'
    const address = 'Carrer de Sant Miquel 42, 07002 Palma, Illes Balears'

    console.log(`Signing in user ${demoEmail}...`)
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
    })

    if (!signInData?.session) {
        console.error('Sign in failed:', signInError)
        return
    }

    const userId = signInData.user.id
    console.log('User signed in. ID:', userId)

    // Authenticated client
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        global: {
            headers: {
                Authorization: `Bearer ${signInData.session.access_token}`
            }
        }
    })

    // 2. Upsert in public.users with role 'customer'
    console.log('Upserting user profile...')
    const { data: profile, error: profileErr } = await authClient
        .from('users')
        .upsert({
            id: userId,
            full_name: fullName,
            email: demoEmail,
            phone: phone,
            dni_nie: dni,
            address: address,
            role: 'customer',
            verification_status: 'verified',
        })
        .select()

    console.log('Profile upsert result:', profile, 'Error:', profileErr)

    // 3. Get camper Space
    const { data: campers } = await authClient.from('campers').select('*')
    const camper = campers?.find(c => c.slug === 'space') || campers?.[0]
    if (!camper) {
        console.error('No camper found!')
        return
    }
    console.log(`Using camper: ${camper.name} (${camper.slug})`)

    // 4. Create demo booking
    // Start date 10 days from today, for 5 nights
    const today = new Date()
    const startDate = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)
    const endDate = new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    console.log(`Creating demo booking from ${startDateStr} to ${endDateStr}...`)

    const extrasSelected = [
        { name_es: 'Limpieza y Desinfección', quantity: 1, price: 75 },
        { name_es: 'Kit Snorkel', quantity: 2, price: 25 },
        { name_es: 'Wi-Fi Portátil', quantity: 1, price: 5 }
    ]

    const breakdown = {
        numNights: 5,
        basePricePerNight: 135,
        baseRentalTotal: 675,
        discountPct: 0,
        discountAmount: 0,
        kmSupplement: 0,
        cancellationSupplement: 0,
        extrasTotal: 130,
        payableTotal: 805,
        depositAmount: 1000
    }

    const bookingPayload: any = {
        camper_id: camper.id,
        user_id: userId,
        start_date: startDateStr,
        end_date: endDateStr,
        pickup_time: '10:00 (Mañana)',
        dropoff_time: '18:00 (Tarde)',
        num_nights: 5,
        num_pax: 2,
        km_package: 'unlimited',
        km_price: 0,
        cancellation_policy: 'flexible',
        cancellation_price: 0,
        extras_selected: extrasSelected,
        extras_total: 130,
        base_price: 675,
        discount_amount: 0,
        deposit_amount: 1000,
        total_price: 805,
        pricing_breakdown: breakdown,
        customer_name: fullName,
        customer_email: demoEmail,
        customer_phone: phone,
        customer_dni: dni,
        customer_address: address,
        notes: 'Reserva Demo para demostración de la web en móvil y escritorio',
        status: 'confirmed',
        payment_status: 'paid',
    }

    const { data: newBooking, error: bookingErr } = await authClient
        .from('bookings')
        .insert(bookingPayload)
        .select(`
            *,
            camper:campers (slug, name, thumbnail_url)
        `)
        .single()

    console.log('Created booking:', newBooking?.id, 'Error:', bookingErr)

    // Check bookings for this user
    const { data: myBookings, error: myBookingsErr } = await authClient
        .from('bookings')
        .select(`
            *,
            camper:campers (slug, name, thumbnail_url, specs)
        `)
        .eq('user_id', userId)

    console.log('User bookings in DB now:', myBookings?.length, 'Error:', myBookingsErr)
}

run().catch(console.error)
