-- =====================================================
-- MIGRATION: Add passengers column to bookings
-- Date: 2026-10-15
-- Author: @ENGINE (Backend & Booking Core Specialist)
-- =====================================================

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS passengers JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.bookings.passengers IS 'Lista de acompañantes/pasajeros registrados en el checkout, incluyendo datos del segundo conductor verificado.';
