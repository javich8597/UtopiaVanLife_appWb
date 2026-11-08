-- ==============================================================================
-- INSERCIÓN Y ALTA OFICIAL DE CONTRATO: DANILO MARONI & GORDANA MARONI
-- Vehículo: Camper SPACE (Fiat Ducato, Matrícula 4618-NHX)
-- Plataforma: SES.HOSPEDAJES / Ministerio del Interior (Real Decreto 933/2021)
-- ==============================================================================

BEGIN;

-- 1. Resolver conflicto de concurrencia y sobreventa: cancelar reserva sintética solapada
UPDATE public.bookings
SET 
  status = 'cancelled',
  notes = coalesce(notes || E'\n', '') || '[ATLAS CONCURRENCY] Cancelada automáticamente por solapamiento con contrato real de Danilo Maroni (09-19 Nov 2026)'
WHERE id = '10000000-0000-4000-8000-000000000007';

-- 2. Asegurar columnas de SES.HOSPEDAJES en public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'ESP';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'ESP';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS municipality_code text DEFAULT '07040';

-- 3. Crear usuario en auth.users si no existe (o recuperar su ID)
DO $$
DECLARE
  v_user_id uuid := '9e29232b-d79d-4e39-bf79-492ecce338d7';
  v_email text := 'danilo.maroni@utopiavanlife-customer.de';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-4000-8000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      '$2a$10$w8.1U..fakePasswordHashForMockOrDirectAdminUsage...',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"DANILO MARONI","phone":"+49 15233522021","dni_nie":"YB5936204"}',
      now(),
      now()
    );
  END IF;
END $$;

-- 4. Upsert en public.users con los datos exactos del contrato y permiso de conducir
INSERT INTO public.users (
  id,
  full_name,
  email,
  phone,
  dni_nie,
  driver_license_id,
  driver_license_issue_date,
  driver_license_expiry_date,
  birth_date,
  address,
  postal_code,
  municipality_name,
  municipality_code,
  country_code,
  nationality,
  sex,
  role,
  verification_status,
  is_verified,
  has_second_driver,
  second_driver_name,
  second_driver_dni,
  second_driver_license,
  second_driver_birth_date,
  second_driver_license_expiry_date,
  second_driver_nationality,
  second_driver_sex
) VALUES (
  '9e29232b-d79d-4e39-bf79-492ecce338d7',
  'DANILO MARONI',
  'danilo.maroni@utopiavanlife-customer.de',
  '+49 15233522021',
  'YB5936204',
  'K01002LKD31',
  '1985-08-08',
  '2031-01-26',
  '1965-03-20',
  'Blumenstraße 4 56070 Koblenz, Alemania',
  '56070',
  'Koblenz',
  '56070',
  'DEU',
  'DEU',
  'H',
  'customer',
  'verified',
  true,
  true,
  'GORDANA MARONI',
  'L2T8Z9ZNM',
  'K01003AS761',
  '1968-05-15',
  '2040-05-27',
  'DEU',
  'M'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  dni_nie = EXCLUDED.dni_nie,
  driver_license_id = EXCLUDED.driver_license_id,
  driver_license_issue_date = EXCLUDED.driver_license_issue_date,
  driver_license_expiry_date = EXCLUDED.driver_license_expiry_date,
  birth_date = EXCLUDED.birth_date,
  address = EXCLUDED.address,
  postal_code = EXCLUDED.postal_code,
  municipality_name = EXCLUDED.municipality_name,
  municipality_code = EXCLUDED.municipality_code,
  country_code = EXCLUDED.country_code,
  nationality = EXCLUDED.nationality,
  sex = EXCLUDED.sex,
  verification_status = 'verified',
  is_verified = true,
  has_second_driver = true,
  second_driver_name = EXCLUDED.second_driver_name,
  second_driver_dni = EXCLUDED.second_driver_dni,
  second_driver_license = EXCLUDED.second_driver_license,
  second_driver_birth_date = EXCLUDED.second_driver_birth_date,
  second_driver_license_expiry_date = EXCLUDED.second_driver_license_expiry_date,
  second_driver_nationality = EXCLUDED.second_driver_nationality,
  second_driver_sex = EXCLUDED.second_driver_sex;

-- 5. Crear la reserva confirmada en public.bookings
INSERT INTO public.bookings (
  id,
  camper_id,
  user_id,
  start_date,
  end_date,
  num_nights,
  num_pax,
  base_price,
  extras_total,
  discount_amount,
  deposit_amount,
  total_price,
  status,
  payment_status,
  payment_intent_id,
  customer_name,
  customer_email,
  customer_phone,
  customer_dni,
  customer_address,
  pickup_time,
  dropoff_time,
  contract_signed_at,
  passengers,
  pricing_breakdown,
  notes
) VALUES (
  '20000000-0000-4000-8000-000000000016',
  '03530ca1-897a-4eb1-90c0-328d172acdcf', -- Camper SPACE
  '9e29232b-d79d-4e39-bf79-492ecce338d7',
  '2026-11-09',
  '2026-11-19',
  10,
  2,
  1400.00,
  31.00,
  0.00,
  1000.00,
  1431.00,
  'confirmed',
  'paid',
  'redsys_real_contract_danilo_maroni_0911',
  'DANILO MARONI',
  'danilo.maroni@utopiavanlife-customer.de',
  '+49 15233522021',
  'YB5936204',
  'Blumenstraße 4 56070 Koblenz, Alemania',
  '10:00',
  '10:00',
  '2026-11-08T18:00:00Z',
  '[{"dniNie": "L2T8Z9ZNM", "fullName": "GORDANA MARONI", "birthDate": "1968-05-15", "driverLicense": "K01003AS761", "isSecondDriver": true, "nationality": "DEU", "countryCode": "DEU", "sex": "M", "gender": "M", "driverLicenseExpiry": "2040-05-27", "municipalityName": "Koblenz", "postalCode": "56070", "address": "Blumenstraße 4 56070 Koblenz, Alemania"}]'::jsonb,
  '{"basePrice": 140, "numNights": 10, "totalPrice": 1431, "extrasTotal": 31, "depositAmount": 1000, "paymentMethod": "TARJT", "baseRentalTotal": 1400}'::jsonb,
  '[CONTRATO REAL VERIFICADO] Arrendatario Danilo Maroni + 2º Conductor Gordana Maroni. Preparado para transmisión a SES.HOSPEDAJES.'
)
ON CONFLICT (id) DO UPDATE SET
  status = 'confirmed',
  payment_status = 'paid',
  total_price = 1431.00,
  deposit_amount = 1000.00,
  customer_name = EXCLUDED.customer_name,
  customer_phone = EXCLUDED.customer_phone,
  customer_dni = EXCLUDED.customer_dni,
  customer_address = EXCLUDED.customer_address,
  passengers = EXCLUDED.passengers,
  pricing_breakdown = EXCLUDED.pricing_breakdown,
  updated_at = now();

COMMIT;
