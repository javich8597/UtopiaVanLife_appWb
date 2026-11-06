-- Add birth_date column to public.users to persist customer driver birth date
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date DATE;
