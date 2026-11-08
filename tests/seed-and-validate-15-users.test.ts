/**
 * Utopia Van Life - Dataset Seeder & Comprehensive Backend Validator
 * 
 * 15 Usuarios Realistas (Españoles e Internacionales)
 * 15 Reservas Asociadas (8 SPACE, 7 NEO) en 2026
 * Validaciones: SES.HOSPEDAJES XML, Contrato Legal (31 artículos), Cálculo Precios, Endpoints Admin.
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

// Carga segura de variables de entorno desde .env.local
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
import { generateSesReference, generateSesHospedajesXml } from '../lib/sesHospedajes/xmlGenerator'
import { generateContractData } from '../lib/contracts/contractEngine'
import { calculatePriceV2 } from '../lib/pricing/engine'
import {
  calculateMonthlyRevenue,
  calculateFleetOccupancy,
  calculateFleetLiveStatus,
  calculateAverageTicket,
  calculateGlobalOccupancy,
} from '../lib/admin/dashboardMetrics'
import { getAdminBookingStatus } from '../lib/admin/bookingStatus'

// UUIDs oficiales de la flota Utopia Van Life
const CAMPER_SPACE_ID = '03530ca1-897a-4eb1-90c0-328d172acdcf'
const CAMPER_NEO_ID = 'f5a66b8c-dd80-47b8-9994-25eb7baec699'

interface SeedUser {
  id: string
  email: string
  full_name: string
  phone: string
  dni_nie: string
  driver_license_id: string
  driver_license_issue_date: string
  driver_license_expiry_date: string
  birth_date: string
  address: string
  postal_code: string
  municipality_code: string
  country_code: string
  role: 'customer'
  verification_status: 'verified' | 'pending_validation'
  is_verified: boolean
  has_second_driver: boolean
  second_driver_name?: string
  second_driver_dni?: string
  second_driver_license?: string
}

interface SeedBooking {
  id: string
  booking_number: string
  camper_id: string
  user_idx: number // Índice del usuario en el array
  start_date: string
  end_date: string
  pickup_time: string
  dropoff_time: string
  status: 'confirmed' | 'review' | 'active' | 'completed' | 'pending' | 'cancelled'
  payment_status: 'paid' | 'pending' | 'refunded' | 'unpaid'
  payment_method: 'TARJT' | 'TRANS'
  payment_intent_id?: string
  km_package: 'included_150' | 'unlimited'
  cancellation_policy: 'standard' | 'flexible'
  num_pax: number
  extras_selected: Array<{
    id: string
    name: string
    name_es: string
    price: number
    quantity: number
    price_type?: string
  }>
  contract_signed_at?: string
  passengers?: any[]
}

const SEED_USERS: SeedUser[] = [
  // 1. Español - DNI, con 2º conductor, verificado
  {
    id: '20000000-0000-4000-8000-000000000001',
    email: 'alejandro.gomez@ibiza-adventures.es',
    full_name: 'Alejandro Gómez Serrano',
    phone: '+34 620 11 22 33',
    dni_nie: '48392019K',
    driver_license_id: '48392019K',
    driver_license_issue_date: '2010-05-20',
    driver_license_expiry_date: '2030-05-20',
    birth_date: '1988-04-12',
    address: 'Calle Mayor 14, 2ºB, Madrid',
    postal_code: '28013',
    municipality_code: '28079',
    country_code: 'ESP',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: true,
    second_driver_name: 'Laura Sánchez Ruiz',
    second_driver_dni: '50493821M',
    second_driver_license: '50493821M',
  },
  // 2. Francesa - Pasaporte extranjero, sin 2º conductor, verificada
  {
    id: '20000000-0000-4000-8000-000000000002',
    email: 'sophie.dubois@voyage-nature.fr',
    full_name: 'Sophie Claire Dubois',
    phone: '+33 6 12 34 56 78',
    dni_nie: '18AB12345',
    driver_license_id: 'FR-92082531',
    driver_license_issue_date: '2014-09-10',
    driver_license_expiry_date: '2029-09-10',
    birth_date: '1992-08-25',
    address: '12 Rue de la République, Paris',
    postal_code: '75003',
    municipality_code: '75056',
    country_code: 'FRA',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: false,
  },
  // 3. Alemán - Pasaporte extranjero, con 2º conductor, verificado
  {
    id: '20000000-0000-4000-8000-000000000003',
    email: 'maximilian.weber@alpen-travel.de',
    full_name: 'Maximilian Markus Weber',
    phone: '+49 171 9876543',
    dni_nie: 'C3K89P210',
    driver_license_id: 'DE-B-8502149',
    driver_license_issue_date: '2006-03-15',
    driver_license_expiry_date: '2031-03-15',
    birth_date: '1985-02-14',
    address: 'Leopoldstraße 45, München',
    postal_code: '80802',
    municipality_code: '09162',
    country_code: 'DEU',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: true,
    second_driver_name: 'Hannah Weber',
    second_driver_dni: 'C3K89P211',
    second_driver_license: 'DE-B-8706221',
  },
  // 4. Británico - Pasaporte UK, verificado
  {
    id: '20000000-0000-4000-8000-000000000004',
    email: 'james.campbell@highland-escape.co.uk',
    full_name: 'James Alexander Campbell',
    phone: '+44 7700 900123',
    dni_nie: '540982314',
    driver_license_id: 'CAMP901130JA99',
    driver_license_issue_date: '2012-01-18',
    driver_license_expiry_date: '2032-01-18',
    birth_date: '1990-11-30',
    address: '24 Princes Street, Edinburgh',
    postal_code: 'EH2 2AN',
    municipality_code: 'S12000036',
    country_code: 'GBR',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: false,
  },
  // 5. Italiana - Pasaporte Italia, con 2º conductor, verificada
  {
    id: '20000000-0000-4000-8000-000000000005',
    email: 'giulia.rossi@dolomiti-camper.it',
    full_name: 'Giulia Francesca Rossi',
    phone: '+39 340 5566778',
    dni_nie: 'YA1234567',
    driver_license_id: 'U12345678X',
    driver_license_issue_date: '2015-08-20',
    driver_license_expiry_date: '2030-08-20',
    birth_date: '1994-07-03',
    address: 'Via Dante Alighieri 18, Milano',
    postal_code: '20121',
    municipality_code: '015146',
    country_code: 'ITA',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: true,
    second_driver_name: 'Marco Bianchi',
    second_driver_dni: 'YA7654321',
    second_driver_license: 'U87654321Y',
  },
  // 6. Español - DNI, pendiente de validación
  {
    id: '20000000-0000-4000-8000-000000000006',
    email: 'ignacio.morales@valencia-tech.es',
    full_name: 'Ignacio Javier Morales Cruz',
    phone: '+34 670 99 88 77',
    dni_nie: '73829104P',
    driver_license_id: '73829104P',
    driver_license_issue_date: '2011-10-05',
    driver_license_expiry_date: '2031-10-05',
    birth_date: '1989-09-17',
    address: 'Avinguda del Port 88, Valencia',
    postal_code: '46023',
    municipality_code: '46250',
    country_code: 'ESP',
    role: 'customer',
    verification_status: 'pending_validation',
    is_verified: false,
    has_second_driver: false,
  },
  // 7. Sueca residente - NIE España, con 2º conductor, verificada
  {
    id: '20000000-0000-4000-8000-000000000007',
    email: 'karin.lindberg@nordic-nomad.se',
    full_name: 'Karin Elisabeth Lindberg',
    phone: '+34 655 44 33 22',
    dni_nie: 'Y3829104R',
    driver_license_id: 'Y3829104R',
    driver_license_issue_date: '2008-04-12',
    driver_license_expiry_date: '2028-04-12',
    birth_date: '1987-03-29',
    address: 'Carrer Sant Miquel 40, Palma de Mallorca',
    postal_code: '07002',
    municipality_code: '07040',
    country_code: 'ESP',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: true,
    second_driver_name: 'Erik Lindberg',
    second_driver_dni: 'Y3829105T',
    second_driver_license: 'Y3829105T',
  },
  // 8. Estadounidense - Pasaporte USA, verificado
  {
    id: '20000000-0000-4000-8000-000000000008',
    email: 'david.miller@california-vans.com',
    full_name: 'David Arthur Miller',
    phone: '+34 699 12 34 56',
    dni_nie: '582910471',
    driver_license_id: 'DL-CA-9283719',
    driver_license_issue_date: '2004-06-20',
    driver_license_expiry_date: '2029-06-20',
    birth_date: '1983-12-10',
    address: '742 Evergreen Terrace, Springfield',
    postal_code: '97477',
    municipality_code: '00000',
    country_code: 'USA',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: false,
  },
  // 9. Española - DNI, con 2º conductor, verificada
  {
    id: '20000000-0000-4000-8000-000000000009',
    email: 'elena.ramos@andalucia-camper.es',
    full_name: 'Elena Patricia Ramos Delgado',
    phone: '+34 612 88 77 66',
    dni_nie: '28940182T',
    driver_license_id: '28940182T',
    driver_license_issue_date: '2017-02-15',
    driver_license_expiry_date: '2027-02-15',
    birth_date: '1996-01-22',
    address: 'Calle Sierpes 12, Sevilla',
    postal_code: '41004',
    municipality_code: '41091',
    country_code: 'ESP',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: true,
    second_driver_name: 'Javier Ruiz Ramos',
    second_driver_dni: '31829104W',
    second_driver_license: '31829104W',
  },
  // 10. Alemán residente - NIE España, pendiente de validación
  {
    id: '20000000-0000-4000-8000-000000000010',
    email: 'lukas.schneider@bavaria-van.de',
    full_name: 'Lukas Stefan Schneider',
    phone: '+49 152 34567890',
    dni_nie: 'X8291047F',
    driver_license_id: 'X8291047F',
    driver_license_issue_date: '2013-06-10',
    driver_license_expiry_date: '2033-06-10',
    birth_date: '1991-05-18',
    address: 'Carrer Constitució 15, Sóller',
    postal_code: '07100',
    municipality_code: '07061',
    country_code: 'ESP',
    role: 'customer',
    verification_status: 'pending_validation',
    is_verified: false,
    has_second_driver: false,
  },
  // 11. Italiano - Pasaporte Italia, con 2º conductor, verificado
  {
    id: '20000000-0000-4000-8000-000000000011',
    email: 'matteo.conti@toscana-routes.it',
    full_name: 'Matteo Giovanni Conti',
    phone: '+39 333 8901234',
    dni_nie: 'CA9821034',
    driver_license_id: 'IT-B-8610081',
    driver_license_issue_date: '2007-11-20',
    driver_license_expiry_date: '2027-11-20',
    birth_date: '1986-10-08',
    address: 'Via dei Calzaiuoli 7, Firenze',
    postal_code: '50122',
    municipality_code: '048017',
    country_code: 'ITA',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: true,
    second_driver_name: 'Chiara Conti',
    second_driver_dni: 'CA9821035',
    second_driver_license: 'IT-B-8902145',
  },
  // 12. Española - DNI, verificada
  {
    id: '20000000-0000-4000-8000-000000000012',
    email: 'mireia.fontanals@costabrava-nomad.cat',
    full_name: 'Mireia Fontanals Puig',
    phone: '+34 644 11 22 99',
    dni_nie: '47281903X',
    driver_license_id: '47281903X',
    driver_license_issue_date: '2014-07-22',
    driver_license_expiry_date: '2029-07-22',
    birth_date: '1993-06-14',
    address: 'Rambla de Catalunya 65, Barcelona',
    postal_code: '08007',
    municipality_code: '08019',
    country_code: 'ESP',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: false,
  },
  // 13. Francesa - Pasaporte Francia, con 2º conductor, pendiente de validación
  {
    id: '20000000-0000-4000-8000-000000000013',
    email: 'charlotte.lefebvre@provence-life.fr',
    full_name: 'Charlotte Marie Lefebvre',
    phone: '+33 7 89 01 23 45',
    dni_nie: '21EF89012',
    driver_license_id: 'FR-95120512',
    driver_license_issue_date: '2016-01-14',
    driver_license_expiry_date: '2031-01-14',
    birth_date: '1995-12-05',
    address: '5 Place de la Comédie, Montpellier',
    postal_code: '34000',
    municipality_code: '34172',
    country_code: 'FRA',
    role: 'customer',
    verification_status: 'pending_validation',
    is_verified: false,
    has_second_driver: true,
    second_driver_name: 'Julien Lefebvre',
    second_driver_dni: '21EF89013',
    second_driver_license: 'FR-93041120',
  },
  // 14. Británico - Pasaporte UK, verificado
  {
    id: '20000000-0000-4000-8000-000000000014',
    email: 'oliver.davies@cornwall-van.co.uk',
    full_name: 'Oliver Thomas Davies',
    phone: '+44 7911 123456',
    dni_nie: '782910482',
    driver_license_id: 'DAVI840830OT88',
    driver_license_issue_date: '2005-09-12',
    driver_license_expiry_date: '2030-09-12',
    birth_date: '1984-08-30',
    address: '10 Fore Street, Falmouth',
    postal_code: 'TR11 3AA',
    municipality_code: 'E07000032',
    country_code: 'GBR',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: false,
  },
  // 15. Española - DNI, con 2º conductor, verificada
  {
    id: '20000000-0000-4000-8000-000000000015',
    email: 'beatriz.soler@baleares-travel.es',
    full_name: 'Beatriz Soler Menéndez',
    phone: '+34 688 33 44 55',
    dni_nie: '53920194Z',
    driver_license_id: '53920194Z',
    driver_license_issue_date: '2018-03-25',
    driver_license_expiry_date: '2028-03-25',
    birth_date: '1997-02-18',
    address: "Passeig d'es Born 18, Palma de Mallorca",
    postal_code: '07012',
    municipality_code: '07040',
    country_code: 'ESP',
    role: 'customer',
    verification_status: 'verified',
    is_verified: true,
    has_second_driver: true,
    second_driver_name: 'Marc Vidal Soler',
    second_driver_dni: '43219082B',
    second_driver_license: '43219082B',
  },
]

const SEED_BOOKINGS: SeedBooking[] = [
  // ==========================================
  // CAMPER SPACE (8 Reservas)
  // ==========================================
  // 1. SPACE - Feb 2026, completada, Redsys
  {
    id: '10000000-0000-4000-8000-000000000001',
    booking_number: '01',
    camper_id: CAMPER_SPACE_ID,
    user_idx: 0,
    start_date: '2026-02-10',
    end_date: '2026-02-15',
    pickup_time: '10:00',
    dropoff_time: '10:00',
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'TARJT',
    payment_intent_id: 'redsys_ord_260210001',
    km_package: 'included_150',
    cancellation_policy: 'standard',
    num_pax: 2,
    contract_signed_at: '2026-02-09T18:30:00Z',
    extras_selected: [
      { id: 'cea57964-5c2a-4cbb-bae5-b6b2850873da', name: 'Toldo Lateral', name_es: 'Toldo Lateral', price: 45, quantity: 1 }
    ],
  },
  // 2. SPACE - Mar 2026, completada, Transferencia
  {
    id: '10000000-0000-4000-8000-000000000002',
    booking_number: '02',
    camper_id: CAMPER_SPACE_ID,
    user_idx: 1,
    start_date: '2026-03-05',
    end_date: '2026-03-12',
    pickup_time: '14:00',
    dropoff_time: '14:00',
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'TRANS',
    payment_intent_id: 'trans_es_260305002',
    km_package: 'included_150',
    cancellation_policy: 'standard',
    num_pax: 2,
    contract_signed_at: '2026-03-04T12:00:00Z',
    extras_selected: [
      { id: '87a93ef9-9473-49d3-afec-80ae203ff9af', name: 'Mesa Plegable', name_es: 'Mesa Plegable', price: 18, quantity: 1 },
      { id: 'fdc35615-709a-49c4-a065-afe65ac59b38', name: 'Silla de Camping', name_es: 'Silla de Camping', price: 15, quantity: 2 }
    ],
  },
  // 3. SPACE - Abr 2026, completada, Redsys
  {
    id: '10000000-0000-4000-8000-000000000003',
    booking_number: '03',
    camper_id: CAMPER_SPACE_ID,
    user_idx: 2,
    start_date: '2026-04-10',
    end_date: '2026-04-17',
    pickup_time: '18:00',
    dropoff_time: '14:00',
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'TARJT',
    payment_intent_id: 'redsys_ord_260410003',
    km_package: 'unlimited',
    cancellation_policy: 'flexible',
    num_pax: 2,
    contract_signed_at: '2026-04-08T15:20:00Z',
    extras_selected: [
      { id: 'f6f63953-5c88-4b91-a89c-f8ba7354bb37', name: 'Kit Snorkel', name_es: 'Kit Snorkel', price: 25, quantity: 2 }
    ],
  },
  // 4. SPACE - May 2026, completada, Redsys
  {
    id: '10000000-0000-4000-8000-000000000004',
    booking_number: '04',
    camper_id: CAMPER_SPACE_ID,
    user_idx: 3,
    start_date: '2026-05-15',
    end_date: '2026-05-22',
    pickup_time: '10:00',
    dropoff_time: '18:00',
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'TARJT',
    payment_intent_id: 'redsys_ord_260515004',
    km_package: 'included_150',
    cancellation_policy: 'standard',
    num_pax: 2,
    contract_signed_at: '2026-05-14T09:15:00Z',
    extras_selected: [
      { id: 'aff58332-b531-49b7-bf4a-a6f8923156cc', name: 'Kit de Limpieza', name_es: 'Kit de Limpieza', price: 75, quantity: 1 }
    ],
  },
  // 5. SPACE - Jul 2026, completada, Redsys (Temporada Alta)
  {
    id: '10000000-0000-4000-8000-000000000005',
    booking_number: '05',
    camper_id: CAMPER_SPACE_ID,
    user_idx: 4,
    start_date: '2026-07-02',
    end_date: '2026-07-10',
    pickup_time: '14:00',
    dropoff_time: '14:00',
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'TARJT',
    payment_intent_id: 'redsys_ord_260702005',
    km_package: 'unlimited',
    cancellation_policy: 'standard',
    num_pax: 2,
    contract_signed_at: '2026-06-30T17:45:00Z',
    extras_selected: [
      { id: 'cea57964-5c2a-4cbb-bae5-b6b2850873da', name: 'Toldo Lateral', name_es: 'Toldo Lateral', price: 45, quantity: 1 },
      { id: 'f6f63953-5c88-4b91-a89c-f8ba7354bb37', name: 'Kit Snorkel', name_es: 'Kit Snorkel', price: 25, quantity: 2 }
    ],
  },
  // 6. SPACE - Ago 2026, cancelada con reembolso, Transferencia
  {
    id: '10000000-0000-4000-8000-000000000006',
    booking_number: '06',
    camper_id: CAMPER_SPACE_ID,
    user_idx: 5,
    start_date: '2026-08-01',
    end_date: '2026-08-08',
    pickup_time: '10:00',
    dropoff_time: '10:00',
    status: 'cancelled',
    payment_status: 'refunded',
    payment_method: 'TRANS',
    payment_intent_id: 'trans_es_260801006',
    km_package: 'included_150',
    cancellation_policy: 'flexible',
    num_pax: 2,
    extras_selected: [],
  },
  // 7. SPACE - Nov 2026, activa (en viaje hoy!), Redsys
  {
    id: '10000000-0000-4000-8000-000000000007',
    booking_number: '07',
    camper_id: CAMPER_SPACE_ID,
    user_idx: 6,
    start_date: '2026-11-05',
    end_date: '2026-11-12',
    pickup_time: '14:00',
    dropoff_time: '14:00',
    status: 'active',
    payment_status: 'paid',
    payment_method: 'TARJT',
    payment_intent_id: 'redsys_ord_261105007',
    km_package: 'included_150',
    cancellation_policy: 'standard',
    num_pax: 2,
    contract_signed_at: '2026-11-04T16:00:00Z',
    extras_selected: [
      { id: 'cea57964-5c2a-4cbb-bae5-b6b2850873da', name: 'Toldo Lateral', name_es: 'Toldo Lateral', price: 45, quantity: 1 },
      { id: '87a93ef9-9473-49d3-afec-80ae203ff9af', name: 'Mesa Plegable', name_es: 'Mesa Plegable', price: 18, quantity: 1 }
    ],
  },
  // 8. SPACE - Dic 2026, confirmada (futura pagada), Redsys
  {
    id: '10000000-0000-4000-8000-000000000008',
    booking_number: '08',
    camper_id: CAMPER_SPACE_ID,
    user_idx: 7,
    start_date: '2026-12-15',
    end_date: '2026-12-22',
    pickup_time: '10:00',
    dropoff_time: '14:00',
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: 'TARJT',
    payment_intent_id: 'redsys_ord_261215008',
    km_package: 'included_150',
    cancellation_policy: 'standard',
    num_pax: 2,
    contract_signed_at: '2026-11-01T10:00:00Z',
    extras_selected: [
      { id: 'aff58332-b531-49b7-bf4a-a6f8923156cc', name: 'Kit de Limpieza', name_es: 'Kit de Limpieza', price: 75, quantity: 1 }
    ],
  },

  // ==========================================
  // CAMPER NEO (7 Reservas)
  // ==========================================
  // 9. NEO - Feb 2026, completada, Redsys
  {
    id: '10000000-0000-4000-8000-000000000009',
    booking_number: '09',
    camper_id: CAMPER_NEO_ID,
    user_idx: 8,
    start_date: '2026-02-18',
    end_date: '2026-02-25',
    pickup_time: '14:00',
    dropoff_time: '10:00',
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'TARJT',
    payment_intent_id: 'redsys_ord_260218009',
    km_package: 'included_150',
    cancellation_policy: 'standard',
    num_pax: 2,
    contract_signed_at: '2026-02-17T11:00:00Z',
    extras_selected: [
      { id: 'cea57964-5c2a-4cbb-bae5-b6b2850873da', name: 'Toldo Lateral', name_es: 'Toldo Lateral', price: 45, quantity: 1 }
    ],
  },
  // 10. NEO - Abr 2026, completada, Transferencia
  {
    id: '10000000-0000-4000-8000-000000000010',
    booking_number: '10',
    camper_id: CAMPER_NEO_ID,
    user_idx: 9,
    start_date: '2026-04-20',
    end_date: '2026-04-27',
    pickup_time: '10:00',
    dropoff_time: '14:00',
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'TRANS',
    payment_intent_id: 'trans_es_260420010',
    km_package: 'included_150',
    cancellation_policy: 'standard',
    num_pax: 2,
    contract_signed_at: '2026-04-18T14:30:00Z',
    extras_selected: [
      { id: '87a93ef9-9473-49d3-afec-80ae203ff9af', name: 'Mesa Plegable', name_es: 'Mesa Plegable', price: 18, quantity: 1 }
    ],
  },
  // 11. NEO - Jun 2026, completada, Redsys
  {
    id: '10000000-0000-4000-8000-000000000011',
    booking_number: '11',
    camper_id: CAMPER_NEO_ID,
    user_idx: 10,
    start_date: '2026-06-18',
    end_date: '2026-06-25',
    pickup_time: '18:00',
    dropoff_time: '18:00',
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'TARJT',
    payment_intent_id: 'redsys_ord_260618011',
    km_package: 'unlimited',
    cancellation_policy: 'flexible',
    num_pax: 2,
    contract_signed_at: '2026-06-16T19:00:00Z',
    extras_selected: [
      { id: '6d839c10-d8d6-424d-93c4-a64acb06cf5f', name: 'Bicicleta', name_es: 'Bicicleta', price: 30, quantity: 2 }
    ],
  },
  // 12. NEO - Jul 2026, completada, Redsys (Temporada Alta)
  {
    id: '10000000-0000-4000-8000-000000000012',
    booking_number: '12',
    camper_id: CAMPER_NEO_ID,
    user_idx: 11,
    start_date: '2026-07-15',
    end_date: '2026-07-22',
    pickup_time: '14:00',
    dropoff_time: '10:00',
    status: 'completed',
    payment_status: 'paid',
    payment_method: 'TARJT',
    payment_intent_id: 'redsys_ord_260715012',
    km_package: 'included_150',
    cancellation_policy: 'standard',
    num_pax: 2,
    contract_signed_at: '2026-07-14T08:30:00Z',
    extras_selected: [
      { id: 'f6f63953-5c88-4b91-a89c-f8ba7354bb37', name: 'Kit Snorkel', name_es: 'Kit Snorkel', price: 25, quantity: 2 }
    ],
  },
  // 13. NEO - Nov 2026, activa (en viaje hoy!), Redsys
  {
    id: '10000000-0000-4000-8000-000000000013',
    booking_number: '13',
    camper_id: CAMPER_NEO_ID,
    user_idx: 12,
    start_date: '2026-11-04',
    end_date: '2026-11-10',
    pickup_time: '10:00',
    dropoff_time: '14:00',
    status: 'active',
    payment_status: 'paid',
    payment_method: 'TARJT',
    payment_intent_id: 'redsys_ord_261104013',
    km_package: 'unlimited',
    cancellation_policy: 'standard',
    num_pax: 2,
    contract_signed_at: '2026-11-03T15:00:00Z',
    extras_selected: [
      { id: 'ecb28ed4-3d9c-42f9-b391-c2908e78eb33', name: 'Wi-Fi Portátil', name_es: 'Wi-Fi Portátil', price: 20, quantity: 1, price_type: 'per_day' }
    ],
  },
  // 14. NEO - Nov 2026, review (pagada pendiente de confirmar en admin: status pending + payment_status paid), Redsys
  {
    id: '10000000-0000-4000-8000-000000000014',
    booking_number: '14',
    camper_id: CAMPER_NEO_ID,
    user_idx: 13,
    start_date: '2026-11-20',
    end_date: '2026-11-26',
    pickup_time: '14:00',
    dropoff_time: '18:00',
    status: 'pending',
    payment_status: 'paid',
    payment_method: 'TARJT',
    payment_intent_id: 'redsys_ord_261120014',
    km_package: 'included_150',
    cancellation_policy: 'standard',
    num_pax: 2,
    extras_selected: [
      { id: 'cea57964-5c2a-4cbb-bae5-b6b2850873da', name: 'Toldo Lateral', name_es: 'Toldo Lateral', price: 45, quantity: 1 }
    ],
  },
  // 15. NEO - Dic 2026, pending (pendiente de pago), Transferencia
  {
    id: '10000000-0000-4000-8000-000000000015',
    booking_number: '15',
    camper_id: CAMPER_NEO_ID,
    user_idx: 14,
    start_date: '2026-12-01',
    end_date: '2026-12-07',
    pickup_time: '18:00',
    dropoff_time: '10:00',
    status: 'pending',
    payment_status: 'pending',
    payment_method: 'TRANS',
    km_package: 'included_150',
    cancellation_policy: 'standard',
    num_pax: 2,
    extras_selected: [],
  },
]

describe('Utopia Van Life - Seeder & Validator de 15 Usuarios y 15 Reservas', () => {
  let admin: any
  let campersDb: Record<string, any> = {}
  let seasonsDb: any[] = []
  let periodsDb: any[] = []
  let discountsDb: any[] = []
  const insertedBookings: any[] = []

  before(async () => {
    admin = getSupabaseAdmin()

    // Cargar campers
    const { data: campers, error: cErr } = await admin.from('campers').select('*')
    assert.ifError(cErr)
    assert.ok(campers && campers.length >= 2, 'Debe haber al menos 2 campers en la BD')
    for (const c of campers) {
      campersDb[c.id] = c
    }
    assert.ok(campersDb[CAMPER_SPACE_ID], 'Camper SPACE no encontrada')
    assert.ok(campersDb[CAMPER_NEO_ID], 'Camper NEO no encontrada')

    // Cargar temporadas y periodos si existen
    const { data: seasons } = await admin.from('seasons').select('*')
    seasonsDb = seasons || []

    const { data: periods } = await admin.from('season_periods').select('*')
    periodsDb = periods || []

    const { data: discounts } = await admin.from('duration_discounts').select('*')
    discountsDb = discounts || []
  })

  it('1. Inserta o actualiza los 15 usuarios realistas en Supabase Auth y public.users', async () => {
    for (const u of SEED_USERS) {
      // 1. Crear en Supabase Auth si no existe
      try {
        await admin.auth.admin.createUser({
          email: u.email,
          password: 'UtopiaSecureUser2026!',
          email_confirm: true,
          user_metadata: {
            full_name: u.full_name,
            phone: u.phone,
            dni_nie: u.dni_nie,
          },
        })
      } catch {
        // Ignorar si ya existe en auth
      }

      // 2. Obtener el id de Auth si ya existía con otro id
      let finalUserId = u.id
      const { data: userList } = await admin.auth.admin.listUsers()
      const matchAuth = userList?.users?.find(
        (au: any) => au.email?.toLowerCase() === u.email.toLowerCase()
      )
      if (matchAuth) {
        finalUserId = matchAuth.id
      }
      u.id = finalUserId

      // 3. Upsert en public.users con service_role
      const { data: upserted, error: uErr } = await admin
        .from('users')
        .upsert(
          {
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            phone: u.phone,
            dni_nie: u.dni_nie,
            driver_license_id: u.driver_license_id,
            driver_license_issue_date: u.driver_license_issue_date,
            driver_license_expiry_date: u.driver_license_expiry_date,
            address: u.address,
            birth_date: u.birth_date,
            role: u.role,
            verification_status: u.verification_status,
            is_verified: u.is_verified,
            has_second_driver: u.has_second_driver,
            second_driver_name: u.second_driver_name || null,
            second_driver_dni: u.second_driver_dni || null,
            second_driver_license: u.second_driver_license || null,
          },
          { onConflict: 'id' }
        )
        .select()
        .single()

      assert.ifError(uErr)
      assert.equal(upserted.id, u.id)
      assert.equal(upserted.full_name, u.full_name)
      assert.equal(upserted.verification_status, u.verification_status)
    }
  })

  it('2. Calcula precios exactos con el motor v2 e inserta las 15 reservas en public.bookings', async () => {
    for (let i = 0; i < SEED_BOOKINGS.length; i++) {
      const b = SEED_BOOKINGS[i]
      const user = SEED_USERS[b.user_idx]
      const camper = campersDb[b.camper_id]

      const start = new Date(b.start_date)
      const end = new Date(b.end_date)
      const numNights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      // Cálculo a través del motor oficial de precios
      const pricing = calculatePriceV2({
        startDate: b.start_date,
        endDate: b.end_date,
        camperBasePrice: camper.base_price_per_night || 140,
        camperId: camper.id,
        seasons: seasonsDb,
        periods: periodsDb,
        discounts: discountsDb,
        kmPackage: b.km_package,
        cancellationPolicy: b.cancellation_policy,
        extrasSelected: b.extras_selected as any,
        depositAmount: 1000,
      })

      const basePrice = pricing.baseTotal || pricing.totalPrice
      const extrasTotal = pricing.extrasTotal || 0
      const discountAmount = pricing.discountAmount || 0
      const kmPrice = pricing.kmPrice || 0
      const cancellationPrice = pricing.cancellationPrice || 0
      const totalPrice = pricing.totalPrice

      const passengers: any[] = []
      if (user.has_second_driver && user.second_driver_name) {
        passengers.push({
          fullName: user.second_driver_name,
          dniNie: user.second_driver_dni,
          birthDate: '1992-06-15',
          isSecondDriver: true,
          licenseDate: '2016-06-15',
        })
      }

      const bookingPayload: any = {
        id: b.id,
        camper_id: b.camper_id,
        user_id: user.id,
        start_date: b.start_date,
        end_date: b.end_date,
        num_nights: numNights,
        num_pax: b.num_pax,
        pickup_time: b.pickup_time,
        dropoff_time: b.dropoff_time,
        status: b.status,
        payment_status: b.payment_status,
        payment_intent_id: b.payment_intent_id || null,
        customer_name: user.full_name,
        customer_email: user.email,
        customer_phone: user.phone,
        customer_dni: user.dni_nie,
        customer_address: user.address,
        km_package: b.km_package,
        km_price: kmPrice,
        cancellation_policy: b.cancellation_policy,
        cancellation_price: cancellationPrice,
        base_price: basePrice,
        extras_total: extrasTotal,
        discount_amount: discountAmount,
        deposit_amount: 1000,
        total_price: totalPrice,
        extras_selected: b.extras_selected,
        passengers,
        contract_signed_at: b.contract_signed_at || null,
        pricing_breakdown: pricing,
      }

      const { data: upsertedBooking, error: bErr } = await admin
        .from('bookings')
        .upsert(bookingPayload, { onConflict: 'id' })
        .select()
        .single()

      if (bErr) {
        assert.fail(`Error al insertar reserva ${b.id}: ${bErr?.message}`)
      }
      assert.equal(upsertedBooking.id, b.id)
      assert.equal(Number(upsertedBooking.deposit_amount), 1000)
      assert.equal(Number(upsertedBooking.total_price), totalPrice)

      insertedBookings.push({
        ...upsertedBooking,
        users: user,
        campers: camper,
      })
    }

    assert.equal(insertedBookings.length, 15)
    // Booking 14 está pagada pero en status pending, por lo que su estado de admin es 'review'
    assert.equal(getAdminBookingStatus(insertedBookings[13]), 'review')
  })

  it('3. Valida la referencia exacta SES.HOSPEDAJES: UVL-[SPACE|NEO]-[DDMM_INI]-[DDMM_FIN]-[NUM]', () => {
    for (const b of insertedBookings) {
      const camper = b.campers
      const ref = generateSesReference(b, camper)

      const model = camper.name.toUpperCase().includes('SPACE') ? 'SPACE' : 'NEO'
      const startMatch = b.start_date.match(/(\d{4})-(\d{2})-(\d{2})/)
      const endMatch = b.end_date.match(/(\d{4})-(\d{2})-(\d{2})/)
      const expectedDdmmIni = `${startMatch[3]}${startMatch[2]}`
      const expectedDdmmFin = `${endMatch[3]}${endMatch[2]}`
      const expectedNum = b.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()

      const expectedRef = `UVL-${model}-${expectedDdmmIni}-${expectedDdmmFin}-${expectedNum}`
      assert.equal(ref, expectedRef)
      assert.match(ref, /^UVL-(SPACE|NEO)-\d{4}-\d{4}-[A-Z0-9]{2,6}$/)
    }
  })

  it('4. Valida la generación del XML ministerial SES.HOSPEDAJES para las 15 reservas', () => {
    for (const b of insertedBookings) {
      const user = b.users
      const camper = b.campers

      const { reference, xml, fileName } = generateSesHospedajesXml(b, user, camper, {
        includeSecondDriver: true,
      })

      assert.equal(fileName, `${reference}.xml`)

      // Validar namespaces y estructura general
      assert.ok(xml.includes('<ns2:peticion xmlns:ns2="http://www.neg.hospedajes.mir.es/altaAlquilerVehiculo">'))
      assert.ok(xml.includes(`<referencia>${reference}</referencia>`))
      assert.ok(xml.includes('<fechaRecogida>'))
      assert.ok(xml.includes('<fechaDevolucion>'))

      // Validar ubicación inmutable Son Oms
      assert.ok(xml.includes('<direccion>Carrer del Camp Franc, 8</direccion>'))
      assert.ok(xml.includes('<codigoMunicipio>07040</codigoMunicipio>'))
      assert.ok(xml.includes('<codigoPostal>07199</codigoPostal>'))

      // Validar datos inmutables de flota oficial
      const isSpace = camper.name.toUpperCase().includes('SPACE')
      const expectedMatricula = isSpace ? '4618NHX' : '4630NHX'
      const expectedBastidor = isSpace ? 'ZFA250006SG060635' : 'ZFA250003SMC13122'

      assert.ok(xml.includes(`<matricula>${expectedMatricula}</matricula>`))
      assert.ok(xml.includes(`<numeroBastidor>${expectedBastidor}</numeroBastidor>`))
      assert.ok(xml.includes('<tipo>CAMPER</tipo>'))
      assert.ok(xml.includes('<color>GRIS</color>'))

      // Validar titular (TI) y conductor principal (CP)
      assert.ok(xml.includes('<rol>TI</rol>'))
      assert.ok(xml.includes('<rol>CP</rol>'))
      assert.ok(xml.includes('<permisoConducir>'))
      assert.ok(xml.includes('<tipo>B</tipo>'))

      // Si tiene segundo conductor, validar rol CS
      if (user.has_second_driver && user.second_driver_name) {
        assert.ok(xml.includes('<rol>CS</rol>'), `Reserva ${b.id} debe incluir rol CS`)
        assert.ok(xml.includes(user.second_driver_name.split(' ')[0]))
      }
    }
  })

  it('5. Valida la generación del Contrato Legal de 31 artículos para las 15 reservas', () => {
    for (const b of insertedBookings) {
      const user = b.users
      const camper = b.campers

      const contract = generateContractData(b, user, camper)

      assert.ok(contract.contractNumber.startsWith('CTR-BOOK-'))
      assert.equal(contract.lessor.companyName, 'UTOPIA VAN LIFE SL')
      assert.equal(contract.lessor.cif, 'B24902637')
      assert.equal(contract.pricing.depositAmount, 1000)
      assert.equal(contract.articles.length, 31, 'El contrato debe contener exactamente 31 artículos')
      assert.equal(contract.clauses.length, 31)

      const isSpace = camper.name.toUpperCase().includes('SPACE')
      const expectedMatricula = isSpace ? '4618NHX' : '4630NHX'
      assert.equal(contract.vehicle.plateNumber, expectedMatricula)

      if (user.has_second_driver && user.second_driver_name) {
        assert.ok(contract.secondDriver)
        assert.equal(contract.secondDriver?.fullName, user.second_driver_name)
      }
    }
  })

  it('6. Comprueba que los Endpoints API Admin responden código 200 para las reservas', async () => {
    const { GET: getSesXml } = await import('../app/api/admin/ses-hospedajes/xml/route')
    const { GET: getContract } = await import('../app/api/admin/contract/route')
    const { GET: getCustomerDetail } = await import('../app/api/admin/customer-detail/route')

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const headers = { Authorization: `Bearer ${serviceKey}` }

    // Probar las 15 reservas en el endpoint de SES.HOSPEDAJES
    for (const b of insertedBookings) {
      const reqXml = new Request(`http://localhost:3000/api/admin/ses-hospedajes/xml?bookingId=${b.id}`, { headers })
      const resXml = await getSesXml(reqXml)
      assert.equal(resXml.status, 200, `Endpoint XML falló con status ${resXml.status} para booking ${b.id}`)
      assert.equal(resXml.headers.get('Content-Type'), 'application/xml; charset=utf-8')
      const xmlBody = await resXml.text()
      assert.ok(xmlBody.includes('<ns2:peticion'))
      assert.ok(xmlBody.includes(resXml.headers.get('X-Ses-Reference')!))

      // Probar en endpoint de Contrato
      const reqCtr = new Request(`http://localhost:3000/api/admin/contract?bookingId=${b.id}`, { headers })
      const resCtr = await getContract(reqCtr)
      assert.equal(resCtr.status, 200, `Endpoint Contrato falló con status ${resCtr.status} para booking ${b.id}`)
      assert.equal(resCtr.headers.get('Content-Type'), 'text/html; charset=utf-8')
      const htmlBody = await resCtr.text()
      assert.ok(htmlBody.includes('CTR-BOOK-'))
      assert.ok(htmlBody.includes('Cláusulas del Contrato de Alquiler'))

      // Probar endpoint de detalle de cliente
      const reqCust = new Request(`http://localhost:3000/api/admin/customer-detail?userId=${b.user_id}`, { headers })
      const resCust = await getCustomerDetail(reqCust)
      assert.equal(resCust.status, 200)
      const custData = await resCust.json()
      assert.equal(custData.user.id, b.user_id)
      assert.ok(Array.isArray(custData.bookings))
      assert.ok(custData.bookings.some((bk: any) => bk.id === b.id))
    }
  })

  it('7. Valida que las Métricas de Dashboard Admin procesan el dataset correctamente', () => {
    const campersList = [campersDb[CAMPER_SPACE_ID], campersDb[CAMPER_NEO_ID]]
    const referenceDate = new Date('2026-11-07T12:00:00Z')

    // 1. Ingresos mensuales
    const monthlyRev = calculateMonthlyRevenue(insertedBookings, referenceDate, 6)
    assert.equal(monthlyRev.length, 6)
    assert.ok(monthlyRev.every(m => !isNaN(m.revenue) && !isNaN(m.bookingsCount)))

    // 2. Ocupación de flota
    const occupancy = calculateFleetOccupancy(campersList, insertedBookings, referenceDate)
    assert.equal(occupancy.length, 2)
    assert.ok(occupancy.every(o => o.occupancyPercent >= 0 && o.occupancyPercent <= 100))

    // 3. Ticket medio y ocupación global
    const totalRev = monthlyRev.reduce((acc, m) => acc + m.revenue, 0)
    const confirmedCount = monthlyRev.reduce((acc, m) => acc + m.bookingsCount, 0)
    const avgTicket = calculateAverageTicket(totalRev, confirmedCount)
    assert.ok(avgTicket > 0)

    const globalOcc = calculateGlobalOccupancy(occupancy)
    assert.ok(globalOcc >= 0 && globalOcc <= 100)

    // 4. Estado en tiempo real (Live status)
    const liveStatus = calculateFleetLiveStatus(campersList, insertedBookings, occupancy, referenceDate)
    assert.equal(liveStatus.length, 2)

    // Al haber reservas activas para el 07 de Noviembre de 2026 en SPACE y NEO:
    const spaceLive = liveStatus.find(s => s.id === CAMPER_SPACE_ID)
    const neoLive = liveStatus.find(s => s.id === CAMPER_NEO_ID)

    assert.ok(spaceLive)
    assert.ok(neoLive)
    assert.equal(spaceLive?.state, 'on_trip', 'Camper SPACE debe estar en viaje (on_trip) hoy 07/11/2026')
    assert.equal(neoLive?.state, 'on_trip', 'Camper NEO debe estar en viaje (on_trip) hoy 07/11/2026')
    assert.ok(spaceLive?.currentCustomer)
    assert.ok(neoLive?.currentCustomer)
  })
})
