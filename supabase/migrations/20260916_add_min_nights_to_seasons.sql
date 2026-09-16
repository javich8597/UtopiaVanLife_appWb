-- =====================================================
-- MIGRATION: Add min_nights to seasons table
-- Applied on 2026-09-16
-- =====================================================

-- 1. Add min_nights column with default 3
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS min_nights INTEGER NOT NULL DEFAULT 3;

-- 2. Update existing high seasons to 5 nights default
UPDATE public.seasons
SET min_nights = 5
WHERE name ILIKE '%alta%' 
   OR name ILIKE '%high%' 
   OR name ILIKE '%verano%' 
   OR name ILIKE '%summer%';
