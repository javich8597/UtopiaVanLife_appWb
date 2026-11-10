-- =====================================================
-- El segundo conductor pertenece a la RESERVA, no al cliente (decisión de Javier, 2026-11-08).
-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Problema (auditoría del 2º conductor, hallazgos 1, 2 y 4):
--   - Los datos del 2º conductor se cobran en la reserva pero se guardan en el perfil
--     (users.has_second_driver, second_driver_name, second_driver_dni, second_driver_license). Con
--     varias reservas por cuenta, el contrato afirmaba cosas falsas y la subida de documentación
--     aceptaba a cualquier persona mientras "alguna" reserva llevara 2º conductor.
--   - bookings.passengers y bookings.pricing_breakdown no están protegidas: con sesión, un cliente
--     podría marcarse un 2º conductor en passengers (y el contrato lo autorizaría) o reescribir el
--     desglose con el que se cobró, que es lo que imprime el contrato y lista el panel.
--
-- Solución:
--   1. Columnas second_driver_* en bookings: la ficha de quien esa reserva autoriza.
--   2. passengers y pricing_breakdown añadidas a la lista de protect_bookings_privileged_columns,
--      junto con las columnas nuevas.
--
-- Mientras NO esté aplicada (LEÍDO, código de hoy):
--   - /api/upload-driver-docs identifica al 2º conductor con bookings.passengers y escribe las
--     columnas nuevas en modo "mejor esfuerzo": si no existen, lo registra en el log y sigue. Los
--     datos siguen guardándose en users.second_driver_*, que es de dónde se leen de respaldo.
--   - lib/contracts/contractEngine.ts ya decide el bloque del contrato con la reserva
--     (bookings.second_driver_* → passengers → pricing_breakdown) y usa el perfil solo para
--     completar datos que la reserva no guarda.
--
-- ANTES DE APLICAR, comprobar:
--   1. Que public.is_privileged_writer() existe y coincide con la del repositorio
--      (supabase/migrations/20261006_protect_privileged_columns.sql).
--   2. Que la función protect_bookings_privileged_columns de la base real coincide con la de
--      20261006: esta migración la reescribe con CREATE OR REPLACE añadiendo dos columnas. Si en la
--      base real tuviera algo distinto, se perdería. Para verlo, sin aplicar nada:
--        SELECT pg_get_functiondef(to_regprocedure('public.protect_bookings_privileged_columns()'));
--   3. Que SUPABASE_SERVICE_ROLE_KEY del despliegue empieza por "eyJ" (sin compartir el valor): si
--      no, upload-driver-docs usa la sesión del cliente y el trigger le bloqueará estas columnas.
--
-- Matriz esperada para public.bookings tras aplicar:
--                                        anon   dueño   admin   service role
--   UPDATE passengers                    NO     NO      SÍ      SÍ
--   UPDATE pricing_breakdown             NO     NO      SÍ      SÍ
--   UPDATE second_driver_*               NO     NO      SÍ      SÍ
--   INSERT con 2º conductor en passengers NO*   SÍ**    SÍ      SÍ
--   * según RLS (20261107_block_client_bookings_insert.sql): SIN VERIFICAR.
--   ** el INSERT no se restringe aquí: el checkout valida las fichas antes de insertarlas.
-- SELECT y DELETE no cambian.
--
-- Idempotente y en un único bloque.

DO $second_driver$
BEGIN
  IF to_regclass('public.bookings') IS NULL THEN
    RAISE EXCEPTION 'No existe public.bookings: esta no es la base esperada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.is_privileged_writer()') AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'Falta public.is_privileged_writer() o no es SECURITY DEFINER: aplicar antes 20261006_protect_privileged_columns.sql';
  END IF;

  -- 1. La ficha del 2º conductor de la reserva
  ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS has_second_driver boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS second_driver_name text,
    ADD COLUMN IF NOT EXISTS second_driver_dni text,
    ADD COLUMN IF NOT EXISTS second_driver_license text,
    ADD COLUMN IF NOT EXISTS second_driver_birth_date date,
    ADD COLUMN IF NOT EXISTS second_driver_license_date date,
    ADD COLUMN IF NOT EXISTS second_driver_docs_uploaded_at timestamptz;

  COMMENT ON COLUMN public.bookings.second_driver_dni IS
    'Documento del 2º conductor que ESTA reserva autoriza. Lo escribe /api/upload-driver-docs solo si coincide con la ficha de passengers.';

  -- 2. Columnas privilegiadas de bookings: las de 20261006 más passengers, pricing_breakdown y las
  --    second_driver_*. Se comparan por nombre con to_jsonb para que una columna que no exista en la
  --    base real no haga fallar el trigger.
  CREATE OR REPLACE FUNCTION public.protect_bookings_privileged_columns()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $fn$
  DECLARE
    v_new jsonb;
    v_old jsonb;
    v_changed text;
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

    v_new := to_jsonb(NEW);
    v_old := to_jsonb(OLD);

    SELECT string_agg(k, ', ' ORDER BY k) INTO v_changed
    FROM jsonb_object_keys(v_new) AS k
    WHERE (k IN (
             'status', 'payment_status', 'payment_intent_id', 'total_price', 'deposit_amount',
             'start_date', 'end_date', 'camper_id', 'user_id',
             'contract_signed_at', 'contract_signature', 'contract_pdf_url',
             -- Nuevas: el 2º conductor y el desglose con el que se cobró
             'passengers', 'pricing_breakdown', 'has_second_driver'
           )
           OR k LIKE 'second\_driver\_%')
      AND v_new -> k IS DISTINCT FROM v_old -> k;

    IF v_changed IS NOT NULL THEN
      RAISE EXCEPTION 'No autorizado a modificar esta reserva: %', v_changed USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END;
  $fn$;

  DROP TRIGGER IF EXISTS protect_bookings_privileged_columns ON public.bookings;
  CREATE TRIGGER protect_bookings_privileged_columns
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.protect_bookings_privileged_columns();
END
$second_driver$;

-- COMPROBACIÓN (solo lectura). Esperado: las 7 columnas nuevas y una fila con tgenabled = 'O'.
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name LIKE '%second_driver%';
--
--   SELECT tgname, tgenabled FROM pg_trigger
--   WHERE tgrelid = 'public.bookings'::regclass AND tgname = 'protect_bookings_privileged_columns';
--
-- COMPROBACIÓN FUNCIONAL, solo con permiso de Javier y una cuenta de prueba: con una reserva pagada
-- que lleve 2º conductor, subir su documentación desde /dashboard/datos debe dejar
-- bookings.second_driver_dni con el documento de la ficha de passengers.
--
-- REVERTIR (reabre los hallazgos 1, 2 y 4): volver a aplicar
-- supabase/migrations/20261006_protect_privileged_columns.sql (restaura la función anterior) y, si
-- se quieren quitar las columnas:
--   ALTER TABLE public.bookings
--     DROP COLUMN IF EXISTS has_second_driver,
--     DROP COLUMN IF EXISTS second_driver_name,
--     DROP COLUMN IF EXISTS second_driver_dni,
--     DROP COLUMN IF EXISTS second_driver_license,
--     DROP COLUMN IF EXISTS second_driver_birth_date,
--     DROP COLUMN IF EXISTS second_driver_license_date,
--     DROP COLUMN IF EXISTS second_driver_docs_uploaded_at;
