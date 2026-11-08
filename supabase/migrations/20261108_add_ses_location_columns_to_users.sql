-- Añadir columnas de localización, nacionalidad y segundo conductor a public.users para SES.HOSPEDAJES (RD 933/2021)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'ESP';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'ESP';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS municipality_code text DEFAULT '07040';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS municipality_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sex text DEFAULT 'H';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS second_driver_birth_date date;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS second_driver_license_expiry_date date;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS second_driver_nationality text DEFAULT 'ESP';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS second_driver_sex text DEFAULT 'H';
