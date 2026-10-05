-- Comprobado en producción (2026-10-06): un cliente con sesión podía hacer
--   update users set role = 'admin', verification_status = 'verified' where id = auth.uid()
-- desde el navegador y entrar al panel de administración.
--
-- Toda escritura legítima de estas columnas pasa por las API del servidor con la service role,
-- así que se bloquea cualquier cambio hecho con la sesión de un cliente que no sea admin.

CREATE OR REPLACE FUNCTION public.is_privileged_writer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce(auth.role(), '') = 'service_role'
    -- Triggers internos (alta de usuario en auth) y SQL Editor
    OR auth.uid() IS NULL AND coalesce(auth.role(), '') <> 'anon' AND coalesce(auth.role(), '') <> 'authenticated'
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
$$;

-- users: rol y estado de verificación solo los cambia el servidor o un admin
CREATE OR REPLACE FUNCTION public.protect_users_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.role, 'customer') <> 'customer'
       OR coalesce(NEW.verification_status, 'not_submitted') NOT IN ('not_submitted') THEN
      RAISE EXCEPTION 'No autorizado a fijar rol o verificación' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'No autorizado a cambiar rol o verificación' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_users_privileged_columns ON public.users;
CREATE TRIGGER protect_users_privileged_columns
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_users_privileged_columns();

-- bookings: estado, pago, importes, fechas y firma solo los cambia el servidor o un admin
CREATE OR REPLACE FUNCTION public.protect_bookings_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending'
       OR coalesce(NEW.payment_status, 'pending') NOT IN ('pending', 'unpaid') THEN
      RAISE EXCEPTION 'No autorizado a crear reservas confirmadas o pagadas' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.payment_intent_id IS DISTINCT FROM OLD.payment_intent_id
     OR NEW.total_price IS DISTINCT FROM OLD.total_price
     OR NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.camper_id IS DISTINCT FROM OLD.camper_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.contract_signed_at IS DISTINCT FROM OLD.contract_signed_at
     OR NEW.contract_signature IS DISTINCT FROM OLD.contract_signature
     OR NEW.contract_pdf_url IS DISTINCT FROM OLD.contract_pdf_url THEN
    RAISE EXCEPTION 'No autorizado a modificar esta reserva' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_bookings_privileged_columns ON public.bookings;
CREATE TRIGGER protect_bookings_privileged_columns
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_bookings_privileged_columns();
