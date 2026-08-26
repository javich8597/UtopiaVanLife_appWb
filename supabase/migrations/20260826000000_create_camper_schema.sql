-- =====================================================
-- MIGRATION: Upgrade existing schema to V2
-- Applied on 2026-08-26
-- =====================================================
-- Existing tables: campers, seasons, bookings, extras, blocked_dates, checkins, faqs, payment_settings, pois, reviews, users

-- 1. Add missing columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- 2. Add missing columns to extras
ALTER TABLE public.extras ADD COLUMN IF NOT EXISTS description_es TEXT;
ALTER TABLE public.extras ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE public.extras ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'per_rental';

-- 3. Add missing columns to blocked_dates for checkout holds
ALTER TABLE public.blocked_dates ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.blocked_dates ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes');

-- 4. Create camper_pricing junction table
CREATE TABLE IF NOT EXISTS public.camper_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camper_id UUID REFERENCES public.campers(id) ON DELETE CASCADE,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    price_per_night NUMERIC NOT NULL,
    discount_7days_pct NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(camper_id, season_id)
);

-- 5. Create booking_extras junction table
CREATE TABLE IF NOT EXISTS public.booking_extras (
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    extra_id UUID REFERENCES public.extras(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_booking NUMERIC NOT NULL,
    PRIMARY KEY (booking_id, extra_id)
);

-- 6. Create document_validations table
CREATE TABLE IF NOT EXISTS public.document_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL,
    document_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    rejected_reason TEXT,
    validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Enable RLS on new tables
ALTER TABLE public.camper_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_validations ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies for camper_pricing
CREATE POLICY "Public read camper_pricing" ON public.camper_pricing
    FOR SELECT USING (true);

-- 9. RLS policies for booking_extras
CREATE POLICY "Public insert booking_extras" ON public.booking_extras
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner read booking_extras" ON public.booking_extras
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.bookings WHERE public.bookings.id = booking_id AND (
            public.bookings.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
            )
        )
    ));

-- 10. RLS policies for document_validations
CREATE POLICY "Public insert document_validations" ON public.document_validations
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner or admin read document_validations" ON public.document_validations
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
    ));
