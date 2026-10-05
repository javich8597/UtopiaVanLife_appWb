-- La firma del contrato (/api/contracts/sign) y el motivo de rechazo del carnet
-- (/api/admin/verify-doc) se escribían en columnas que no existían en producción.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_signature text,
  ADD COLUMN IF NOT EXISTS contract_pdf_url text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rejection_reason text;
