-- =====================================================
-- N1 y N2 (segunda auditoría): un cliente no cambia su identidad escribiendo en public.users.
-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Problema: protect_users_privileged_columns solo protege role, verification_status y
-- rejection_reason. Con sesión, un cliente podría poner en users.email el email de un tercero, o
-- cambiar DNI, carnet, fecha de nacimiento o nombre después de estar verificado, sin revisión.
--
-- Solución: un trigger NUEVO, aparte del existente.
--   - No reescribe protect_users_privileged_columns, que puede ser distinta en la base real.
--   - Compara por nombre con to_jsonb: si falta alguna columna en la base real, no falla.
--   - Da error 42501 explícito. Con RLS restrictiva el update afectaría a 0 filas sin error, y
--     upload-driver-docs lo daría por guardado porque solo mira `error`.
--   - El segundo conductor también va protegido: has_second_driver y second_driver_*.
--   - phone y address siguen siendo editables.
--
-- Escrituras en users (LEÍDO; ningún componente del navegador escribe en esta tabla):
--   - lib/booking/checkoutCustomer.ts: service role. Sigue funcionando.
--   - /api/upload-document: service role. Sigue funcionando.
--   - /api/admin/users/role y /api/admin/verify-doc: service role o sesión de admin. Siguen
--     funcionando, porque is_privileged_writer() acepta al admin.
--   - /api/upload-driver-docs: service role, y sesión del cliente si no hay clave válida (ver 1).
--
-- ANTES DE APLICAR, comprobar:
--   1. Que SUPABASE_SERVICE_ROLE_KEY del despliegue empieza por "eyJ", sin compartir el valor.
--      Si no, isValidServiceRoleKey la descarta, upload-driver-docs usa la sesión del cliente y
--      guardar DNI, carnet o segundo conductor dará 500. Subir fotos ya falla hoy en ese modo: cambia
--      verification_status, que el trigger existente bloquea.
--   2. Que public.is_privileged_writer() existe y coincide con la del repositorio.
--   3. Que el alta en Auth no escribe en users con la sesión del cliente. Las secciones 5 y 6 de
--      supabase/consulta-solo-lectura.sql muestran los triggers de auth.users. Sin claims de JWT
--      (trigger de alta, Auth, SQL Editor), is_privileged_writer() da true.
--
-- Matriz esperada para public.users tras aplicar (columnas de identidad):
--                              anon*   dueño        otro cliente*   admin   service role
--   UPDATE identidad           NO      NO           NO              SÍ      SÍ
--   UPDATE phone, address      NO*     Según RLS    NO*             SÍ      SÍ
--   INSERT con email ajeno     NO      NO           NO              SÍ      SÍ
--   INSERT con email propio    NO*     Según RLS    no aplica       SÍ      SÍ
-- * Depende de RLS real: SIN VERIFICAR. SELECT y DELETE no cambian.
-- Admin con sesión: el trigger le deja pasar, pero necesita políticas de SELECT y UPDATE sobre
-- filas ajenas. Si existen: SIN VERIFICAR. Esta migración no las crea.
--
-- Idempotente y en un único bloque.

DO $identity$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'No existe public.users: esta no es la base esperada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.is_privileged_writer()') AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'Falta public.is_privileged_writer() o no es SECURITY DEFINER: aplicar antes 20261006_protect_privileged_columns.sql';
  END IF;

  CREATE OR REPLACE FUNCTION public.protect_users_identity_columns()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $fn$
  DECLARE
    v_new jsonb := to_jsonb(NEW);
    v_old jsonb;
    v_changed text;
  BEGIN
    IF public.is_privileged_writer() THEN
      RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
      IF lower(coalesce(v_new ->> 'email', '')) <> lower(coalesce(auth.jwt() ->> 'email', '')) THEN
        RAISE EXCEPTION 'No autorizado a crear un perfil con otro email' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;

    v_old := to_jsonb(OLD);

    SELECT string_agg(k, ', ' ORDER BY k) INTO v_changed
    FROM jsonb_object_keys(v_new) AS k
    WHERE (k IN ('email', 'full_name', 'dni_nie', 'birth_date', 'has_second_driver')
           OR k LIKE 'driver\_license\_%'
           OR k LIKE 'second\_driver\_%')
      AND v_new -> k IS DISTINCT FROM v_old -> k;

    IF v_changed IS NOT NULL THEN
      RAISE EXCEPTION 'No autorizado a cambiar datos de identidad: %', v_changed USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END;
  $fn$;

  DROP TRIGGER IF EXISTS protect_users_identity_columns ON public.users;
  CREATE TRIGGER protect_users_identity_columns
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.protect_users_identity_columns();
END
$identity$;

-- COMPROBACIÓN (solo lectura). Esperado: una fila con tgenabled = 'O'.
--   SELECT tgname, tgenabled FROM pg_trigger
--   WHERE tgrelid = 'public.users'::regclass AND tgname = 'protect_users_identity_columns';
--
-- COMPROBACIÓN FUNCIONAL, solo con permiso de Javier y una cuenta de prueba: desde /dashboard/datos,
-- guardar un DNI nuevo debe funcionar y dejar la cuenta en pending_validation.
--
-- REVERTIR (reabre N1 y N2):
--   DROP TRIGGER IF EXISTS protect_users_identity_columns ON public.users;
--   DROP FUNCTION IF EXISTS public.protect_users_identity_columns();
