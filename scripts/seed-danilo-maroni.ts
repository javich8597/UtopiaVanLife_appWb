/**
 * Script de Inserción Oficial para Danilo Maroni & Gordana Maroni (Camper SPACE)
 * Utopia Van Life - Transmisión Oficial SES.HOSPEDAJES (RD 933/2021)
 */

import fs from 'fs'
import path from 'path'

// Carga segura de .env.local
function ensureEnvLoaded() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim()
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
}
ensureEnvLoaded()

import { getSupabaseAdmin } from '../lib/supabase/admin'
import { generateSesHospedajesXml } from '../lib/sesHospedajes/xmlGenerator'

async function run() {
  const admin = getSupabaseAdmin()
  console.log('--- ATLAS: Preparando persistencia de contrato Danilo Maroni ---')

  const CAMPER_SPACE_ID = '03530ca1-897a-4eb1-90c0-328d172acdcf'
  const TEST_OVERLAP_BOOKING_ID = '10000000-0000-4000-8000-000000000007'
  const USER_ID = '30000000-0000-4000-8000-000000000001'
  const BOOKING_ID = '20000000-0000-4000-8000-000000000016'
  const USER_EMAIL = 'danilo.maroni@utopiavanlife-customer.de'

  // 1. Resolver conflicto de sobreventa con la reserva sintética de test de Karin Lindberg
  console.log('1. Resolviendo conflicto de concurrencia con la reserva test solapada...')
  const { error: cancelErr } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      notes: '[ATLAS CONCURRENCY] Cancelada automáticamente por solapamiento con contrato real de Danilo Maroni (09-19 Nov 2026)',
    })
    .eq('id', TEST_OVERLAP_BOOKING_ID)

  if (cancelErr) {
    console.warn('Nota: No se pudo cancelar la reserva test o no existía:', cancelErr.message)
  } else {
    console.log('   Reserva test previa 10000000-0000-4000-8000-000000000007 marcada como cancelled.')
  }

  // 2. Crear o actualizar usuario en Supabase Auth
  console.log('2. Gestionando usuario en Supabase Auth...')
  let finalAuthId = USER_ID
  try {
    const { data: newAuth, error: authErr } = await admin.auth.admin.createUser({
      email: USER_EMAIL,
      password: 'UtopiaCustomer2026!Danilo',
      email_confirm: true,
      user_metadata: {
        full_name: 'DANILO MARONI',
        phone: '+49 15233522021',
        dni_nie: 'YB5936204',
        nationality: 'DEU',
        country_code: 'DEU',
      },
    })
    if (!authErr && newAuth?.user) {
      finalAuthId = newAuth.user.id
      console.log('   Usuario auth creado con id:', finalAuthId)
    } else {
      throw authErr
    }
  } catch (err: any) {
    console.log('   El usuario auth ya existía o se reutilizará id:', err?.message || err)
    const { data: userList } = await admin.auth.admin.listUsers()
    const match = userList?.users?.find(
      (u: any) => u.email?.toLowerCase() === USER_EMAIL.toLowerCase()
    )
    if (match) finalAuthId = match.id
  }

  // 3. Upsert en public.users
  console.log('3. Guardando perfil en public.users...')
  const { error: userErr } = await admin.from('users').upsert(
    {
      id: finalAuthId,
      full_name: 'DANILO MARONI',
      email: USER_EMAIL,
      phone: '+49 15233522021',
      dni_nie: 'YB5936204',
      driver_license_id: 'K01002LKD31',
      driver_license_issue_date: '1985-08-08',
      driver_license_expiry_date: '2031-01-26',
      birth_date: '1965-03-20',
      address: 'Blumenstraße 4 56070 Koblenz, Alemania',
      postal_code: '56070',
      municipality_name: 'Koblenz',
      country_code: 'DEU',
      nationality: 'DEU',
      sex: 'H',
      role: 'customer',
      verification_status: 'verified',
      is_verified: true,
      has_second_driver: true,
      second_driver_name: 'GORDANA MARONI',
      second_driver_dni: 'L2T8Z9ZNM',
      second_driver_license: 'K01003AS761',
      second_driver_birth_date: '1968-05-15',
      second_driver_license_expiry_date: '2040-05-27',
      second_driver_nationality: 'DEU',
      second_driver_sex: 'M',
    },
    { onConflict: 'id' }
  )

  if (userErr) {
    console.error('Error insertando usuario:', userErr)
    return
  }
  console.log('   Perfil de Danilo Maroni guardado y verificado.')

  // 4. Crear reserva en public.bookings
  console.log('4. Insertando reserva confirmada...')
  const bookingPayload = {
    id: BOOKING_ID,
    camper_id: CAMPER_SPACE_ID,
    user_id: finalAuthId,
    start_date: '2026-11-09',
    end_date: '2026-11-19',
    num_nights: 10,
    num_pax: 2,
    base_price: 1400.0,
    extras_total: 31.0,
    discount_amount: 0.0,
    deposit_amount: 1000.0,
    total_price: 1431.0,
    status: 'confirmed',
    payment_status: 'paid',
    payment_intent_id: 'redsys_real_contract_danilo_maroni_0911',
    customer_name: 'DANILO MARONI',
    customer_email: USER_EMAIL,
    customer_phone: '+49 15233522021',
    customer_dni: 'YB5936204',
    customer_address: 'Blumenstraße 4 56070 Koblenz, Alemania',
    pickup_time: '10:00',
    dropoff_time: '10:00',
    contract_signed_at: new Date('2026-11-08T18:00:00Z').toISOString(),
    passengers: [
      {
        fullName: 'GORDANA MARONI',
        dniNie: 'L2T8Z9ZNM',
        driverLicense: 'K01003AS761',
        isSecondDriver: true,
        birthDate: '1968-05-15',
        nationality: 'DEU',
        countryCode: 'DEU',
        sex: 'M',
        gender: 'M',
        driverLicenseExpiry: '2040-05-27',
        municipalityName: 'Koblenz',
        postalCode: '56070',
        address: 'Blumenstraße 4 56070 Koblenz, Alemania',
      },
    ],
    pricing_breakdown: {
      numNights: 10,
      basePrice: 140,
      baseRentalTotal: 1400,
      extrasTotal: 31,
      totalPrice: 1431,
      depositAmount: 1000,
      paymentMethod: 'TARJT',
    },
    notes: '[CONTRATO REAL VERIFICADO] Arrendatario Danilo Maroni + 2º Conductor Gordana Maroni. Preparado para SES.HOSPEDAJES.',
  }

  const { error: bErr } = await admin.from('bookings').upsert(bookingPayload, { onConflict: 'id' })
  if (bErr) {
    console.error('Error insertando reserva:', bErr)
    return
  }
  console.log('   Reserva confirmada insertada con ID:', BOOKING_ID)

  // 5. Validar generación de XML SES
  const { data: camper } = await admin.from('campers').select('*').eq('id', CAMPER_SPACE_ID).single()
  const { xml, reference, fileName } = generateSesHospedajesXml(bookingPayload, {
    ...bookingPayload,
    nationality: 'DEU',
    country_code: 'DEU',
    postal_code: '56070',
    municipality_name: 'Koblenz',
    municipality_code: '56070',
    driver_license_id: 'K01002LKD31',
    driver_license_expiry_date: '2031-01-26',
    birth_date: '1965-03-20',
    sex: 'H',
  }, camper, { includeSecondDriver: true, includeXmlDeclaration: true })

  console.log('\n--- VERIFICACIÓN XML SES.HOSPEDAJES ---')
  console.log('Referencia oficial:', reference)
  console.log('Archivo:', fileName)
  console.log('Primeras 20 líneas del XML:\n', xml.split('\n').slice(0, 20).join('\n'))
  console.log('\n¡Listo para transmitir vía POST /api/admin/ses-hospedajes/transmit!')
}

run().catch(console.error)
