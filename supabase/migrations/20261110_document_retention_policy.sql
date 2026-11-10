-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Política de conservación de la documentación de identidad de las reservas.
-- Decisión de Javier (2026-11-10), literal:
--   «Purgar imágenes de Storage a los 100 días tras la devolución; retener datos legales 3 años
--    por RD 933/2021».
-- =====================================================
-- Problema: no había ninguna política. Las fotos de DNI y de carnet se quedaban en el bucket
-- `documents` para siempre y cada reenvío del formulario de /dashboard/datos dejaba OTRA copia
-- (`<prefijo>_<uuid>.<ext>`, nunca se sobrescribe). Nada en la base dice cuándo caduca ese dato ni
-- deja constancia de que se haya borrado.
--
-- Qué hace esta migración (nada se borra aquí: solo prepara dónde consta lo purgado):
--   1. Tres columnas de constancia en public.bookings:
--        identity_images_purged_at     timestamptz  cuándo se borraron sus imágenes de identidad
--        identity_images_purged_count  integer      cuántos archivos se borraron
--        legal_data_purged_at          timestamptz  cuándo se borraron sus datos del RD 933/2021
--   2. public.retention_purge_log: una fila por ejecución de la purga, con quién, cuándo, los dos
--      plazos vigentes y el detalle (rutas de Storage y nombres de columna, NUNCA valores). Es la
--      prueba de que la política se cumple.
--   3. Un trigger que impide al cliente escribir esas tres columnas. RLS filtra filas, no columnas:
--      sin el trigger, el dueño de la reserva podría poner `identity_images_purged_at` a mano y
--      hacer creer que sus fotos ya se borraron (o que no hay nada que borrar).
--
-- Quién ejecuta la purga: POST /api/admin/retention/documents (admin + clave de servicio; 503 sin
-- ella). Por defecto SIMULA y no borra; solo borra con { "confirm": true }. Los plazos y el reparto
-- de qué es imagen y qué es dato legal están en lib/booking/dataRetention.ts.
--
-- QUÉ ES «DATO LEGAL» (leído en lib/sesHospedajes/xmlGenerator.ts, el XML que se transmite al
-- Ministerio). La purga de 3 años vacía en public.bookings:
--   customer_name, customer_email, customer_phone, customer_dni, customer_address, passengers,
--   second_driver_name, second_driver_dni, second_driver_license,
--   second_driver_birth_date, second_driver_license_date
--   y quita `passengers` de dentro de pricing_breakdown, sin tocar ningún importe.
--   Además, si la base las tuviera (el generador del XML las lee de la reserva pero ninguna ruta
--   las escribe): customer_birth_date, customer_city, customer_gender, nationality, country_code,
--   postal_code, municipality_code, municipality_name, driver_license_expiry_date. La purga solo
--   vacía columnas que existen de verdad en la fila, así que no falla si no están.
-- NO vacía: fechas, horas, camper, importes, medio de pago ni notes (datos de la operación, hacen
-- falta para la contabilidad), ni contract_signature / el PDF del contrato (ver «PENDIENTE»).
--
-- IMPORTANTE, y es la razón de que esta migración no incluya ningún borrado automático:
--   - Las fotos del TITULAR viven en `documents/<cliente>/`, UNA carpeta para TODAS sus reservas:
--     no se pueden borrar reserva a reserva. La ruta las borra cuando ha vencido el plazo de la
--     última reserva viva de esa cuenta.
--   - Los datos de identidad del PERFIL (public.users: full_name, dni_nie, birth_date, address,
--     phone, driver_license_id…) también son de la cuenta y su plazo NO está decidido. La ruta no
--     los toca Y TAMPOCO LOS LISTA: vaciar el perfil es borrar la cuenta y eso lo decide Javier
--     aparte. (Antes esta cabecera decía que la ruta los listaba, y no era verdad: el ayudante que
--     lo hacía solo lo usaban los tests y se ha retirado. Hallazgo de `seguridad-auditor`.)
--
-- ANTES DE APLICAR, comprobar:
--   1. Que la purga puede escribir con la clave de servicio: las tres columnas de constancia solo
--      las admite el rol `service_role` (ver el punto 3), así que un administrador con su sesión del
--      navegador NO puede sellar una reserva como purgada. Si el despliegue no tiene una
--      SUPABASE_SERVICE_ROLE_KEY válida, la ruta responde 503 y no intenta nada.
--      Esta migración NO usa public.is_privileged_writer() a propósito: eximir a todo escritor
--      privilegiado dejaría que cualquier admin fabricara el sello a mano (hallazgo de
--      `seguridad-auditor`, 2026-11-10).
--   2. Que el bucket `documents` es privado. Si fuera público, una URL pública antigua seguiría
--      abriendo las fotos que aún no se han purgado (ver 20261107_documents_bucket_limits.sql,
--      también PREPARADA, SIN APLICAR).
--   3. Las políticas de storage.objects del bucket `documents` NO constan en el repositorio:
--      SIN VERIFICAR. La purga borra con la clave de servicio, que salta RLS, así que no necesita
--      ninguna política nueva; pero si algún día se quisiera purgar con la sesión del admin haría
--      falta una política DELETE para is_admin() sobre bucket_id = 'documents'.
--   4. Que no hay un trigger previo con el mismo nombre en public.bookings
--      (protect_bookings_retention_columns): esta migración lo recrea.
--
-- MATRIZ DE PERMISOS ESPERADA TRAS APLICAR
--
-- public.bookings, columnas identity_images_purged_at / identity_images_purged_count /
-- legal_data_purged_at:
--                  anon   cliente dueño   otro cliente   admin   service role
--   SELECT         NO*    SÍ*             NO*            SÍ      SÍ
--   INSERT         NO*    NO (trigger)    NO*            NO (trigger)   SÍ
--   UPDATE         NO*    NO (trigger)    NO*            NO (trigger)   SÍ
--   DELETE (fila)  NO*    NO*             NO*            SÍ*            SÍ
--   * lo decide la RLS de bookings, que no consta en el repositorio: SIN VERIFICAR.
--     Este trigger solo añade la prohibición de escribir ESAS columnas; no relaja nada.
--   El sello de purga SOLO lo puede poner el rol `service_role`, es decir la propia purga. Ni el
--   administrador desde el navegador: si no, podría declarar purgada una reserva cuyas fotos siguen
--   ahí, o declarar una purga que nunca hizo (hallazgo de `seguridad-auditor`, 2026-11-10).
--   Una sesión SQL directa (psql o el editor de Supabase, donde no hay JWT) sí puede: ahí está
--   Javier, no un navegador, y tiene que poder corregir una fila a mano.
--
-- public.retention_purge_log (tabla nueva, RLS activada aquí):
--                  anon   cliente dueño   otro cliente   admin   service role
--   SELECT         NO     NO              NO             SÍ      SÍ
--   INSERT         NO     NO              NO             NO      SÍ
--   UPDATE         NO     NO              NO             NO      SÍ
--   DELETE         NO     NO              NO             NO      SÍ
--   Es un registro de cumplimiento: solo escribe la purga, que va con la clave de service role (y
--   esa salta RLS por definición, así que no necesita ninguna política). El administrador solo lee.
--   No hay política de INSERT a propósito: con una, un admin podría inventar desde el navegador una
--   fila con files_deleted = 9999 o atribuir una purga a otra persona, porque `ran_by` no está atado
--   a auth.uid() (hallazgo de `seguridad-auditor`, 2026-11-10). Con RLS activada, lo que no tiene
--   política está prohibido para todo rol que no salte RLS.
--
-- PENDIENTE DE JAVIER (esta migración no lo decide):
--   a) La firma del contrato (bookings.contract_signature) y el PDF archivado en
--      `documents/contracts/<reserva>_contrato_firmado.pdf` NO se purgan. No son datos del registro
--      de viajeros y el contrato es la prueba de la relación contractual, con plazos civiles y
--      fiscales más largos que 3 años. Si se quiere un plazo para el contrato, es otra decisión.
--   b) El plazo de 100 días vence EL PROPIO día 100 contado desde la devolución (devolución el día
--      D -> se borra el día D+100), que es lo que Javier pidió.
--   c) Los datos de identidad del perfil (public.users) a los 3 años: sin decidir y sin tocar.
--   d) Quién dispara la purga: hoy nadie. No hay botón en el panel ni tarea programada.
--
-- Idempotente: IF NOT EXISTS, DROP POLICY IF EXISTS y un único bloque.

DO $retention$
BEGIN
  IF to_regclass('public.bookings') IS NULL THEN
    RAISE EXCEPTION 'No existe public.bookings: esta no es la base esperada';
  END IF;

  -- 1. Constancia por reserva
  ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS identity_images_purged_at timestamptz,
    ADD COLUMN IF NOT EXISTS identity_images_purged_count integer,
    ADD COLUMN IF NOT EXISTS legal_data_purged_at timestamptz;

  COMMENT ON COLUMN public.bookings.identity_images_purged_at IS
    'Cuándo se borraron del bucket documents las imágenes de identidad de esta reserva (100 días tras la devolución; decisión de Javier, 2026-11-10).';
  COMMENT ON COLUMN public.bookings.identity_images_purged_count IS
    'Cuántos archivos se borraron en esa purga, contando todas las copias que dejó cada reenvío del formulario.';
  COMMENT ON COLUMN public.bookings.legal_data_purged_at IS
    'Cuándo se borraron los datos de identidad del registro de viajeros (RD 933/2021) de esta reserva, a los 3 años de la devolución.';

  -- Índices parciales: la purga busca lo que AÚN no se ha purgado, y son las filas que menos hay
  CREATE INDEX IF NOT EXISTS bookings_identity_images_not_purged_idx
    ON public.bookings (end_date)
    WHERE identity_images_purged_at IS NULL;

  CREATE INDEX IF NOT EXISTS bookings_legal_data_not_purged_idx
    ON public.bookings (end_date)
    WHERE legal_data_purged_at IS NULL;

  -- 2. Registro de cumplimiento, una fila por ejecución
  CREATE TABLE IF NOT EXISTS public.retention_purge_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ran_at timestamptz NOT NULL DEFAULT now(),
    -- Sin clave foránea a propósito: un administrador por app_metadata puede no tener fila en
    -- public.users, y la constancia no debe desaparecer si se borra esa fila
    ran_by uuid,
    policy_day date,
    image_retention_days integer NOT NULL DEFAULT 100,
    legal_retention_years integer NOT NULL DEFAULT 3,
    -- Alcance con el que se lanzó. Sin esto una auditoría no puede concluir «todas las reservas de
    -- más de 100 días están purgadas»: una fila con 3 archivos borrados no dice si se revisó la base
    -- entera o una sola reserva, ni si el tope dejó candidatas fuera
    scope_booking_id uuid,
    scope_user_id uuid,
    scope_limit integer,
    scope_truncated boolean NOT NULL DEFAULT false,
    candidates_reviewed integer NOT NULL DEFAULT 0,
    holder_folders_included boolean NOT NULL DEFAULT true,
    files_deleted integer NOT NULL DEFAULT 0,
    columns_cleared integer NOT NULL DEFAULT 0,
    bookings_affected integer NOT NULL DEFAULT 0,
    holders_affected integer NOT NULL DEFAULT 0,
    -- Rutas de Storage y nombres de columna. NUNCA valores de datos personales
    detail jsonb NOT NULL DEFAULT '[]'::jsonb
  );

  COMMENT ON TABLE public.retention_purge_log IS
    'Una fila por ejecución de la purga de conservación (POST /api/admin/retention/documents). Prueba de que la política se cumple. detail guarda rutas y nombres de columna, nunca valores.';

  CREATE INDEX IF NOT EXISTS retention_purge_log_ran_at_idx ON public.retention_purge_log (ran_at DESC);

  ALTER TABLE public.retention_purge_log ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS retention_purge_log_admin_select ON public.retention_purge_log;
  CREATE POLICY retention_purge_log_admin_select ON public.retention_purge_log
    FOR SELECT TO authenticated
    USING (public.is_admin());

  -- Si una versión anterior de esta migración creó la política de INSERT, se retira: permitía a un
  -- admin fabricar el cumplimiento desde el navegador (hallazgo de `seguridad-auditor`, 2026-11-10)
  DROP POLICY IF EXISTS retention_purge_log_admin_insert ON public.retention_purge_log;

  -- Sin políticas de INSERT, UPDATE ni DELETE: con RLS activada, lo que no tiene política está
  -- prohibido para todo rol que no salte RLS. Solo escribe la purga, con la clave de service role.

  -- 3. Las columnas de constancia solo las escribe la PURGA (rol service_role).
  --    Trigger propio y no la lista de protect_bookings_privileged_columns: esa función la
  --    reescribe la migración 20261108, que está PREPARADA, SIN APLICAR, y este trigger tiene que
  --    funcionar con la base de hoy y con la de después, sin pisar aquella.
  --
  --    Y NO exime a public.is_privileged_writer(): eso incluiría a cualquier administrador con su
  --    sesión del navegador, que podría sellar como purgada una reserva cuyas fotos siguen en
  --    Storage. El rol se lee del JWT sin depender de que exista auth.role(); una sesión SQL directa
  --    (sin JWT, donde está Javier y no un navegador) sí puede corregir una fila a mano.
  CREATE OR REPLACE FUNCTION public.protect_bookings_retention_columns()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $fn$
  DECLARE
    v_changed text;
    v_role text;
  BEGIN
    v_role := nullif(current_setting('request.jwt.claim.role', true), '');
    IF v_role IS NULL THEN
      BEGIN
        v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
      EXCEPTION WHEN others THEN
        v_role := NULL;
      END;
    END IF;

    -- La purga: clave de service role
    IF coalesce(v_role, current_user::text) = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Sesión SQL directa: no hay JWT y el rol de conexión no es uno de navegador
    IF v_role IS NULL AND current_user::text NOT IN ('authenticated', 'anon') THEN
      RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
      IF NEW.identity_images_purged_at IS NOT NULL
         OR NEW.identity_images_purged_count IS NOT NULL
         OR NEW.legal_data_purged_at IS NOT NULL THEN
        RAISE EXCEPTION 'No autorizado a declarar una reserva purgada' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;

    SELECT string_agg(k, ', ' ORDER BY k) INTO v_changed
    FROM jsonb_object_keys(to_jsonb(NEW)) AS k
    WHERE k IN ('identity_images_purged_at', 'identity_images_purged_count', 'legal_data_purged_at')
      AND to_jsonb(NEW) -> k IS DISTINCT FROM to_jsonb(OLD) -> k;

    IF v_changed IS NOT NULL THEN
      RAISE EXCEPTION 'No autorizado a modificar la constancia de purga: %', v_changed USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END;
  $fn$;

  DROP TRIGGER IF EXISTS protect_bookings_retention_columns ON public.bookings;
  CREATE TRIGGER protect_bookings_retention_columns
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.protect_bookings_retention_columns();
END
$retention$;

-- COMPROBACIÓN (solo lectura).
-- Esperado: las tres columnas, la tabla con rowsecurity = true, UNA SOLA política (el SELECT del
-- administrador) y el trigger con tgenabled = 'O'.
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'bookings'
--     AND column_name IN ('identity_images_purged_at', 'identity_images_purged_count', 'legal_data_purged_at');
--
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.retention_purge_log'::regclass;
--
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'retention_purge_log' ORDER BY policyname;
--
--   SELECT tgname, tgenabled FROM pg_trigger
--   WHERE tgrelid = 'public.bookings'::regclass AND tgname = 'protect_bookings_retention_columns';
--
-- COMPROBACIÓN FUNCIONAL, en este orden y solo con permiso de Javier:
--   0. ANTES de aplicar esta migración: POST /api/admin/retention/documents con
--      { "confirm": true }. Tiene que responder 409 enumerando lo que falta y NO borrar nada. Es la
--      garantía de que la purga no borra fotos de DNI sin poder dejar rastro.
--   1. Con sesión de administrador, POST /api/admin/retention/documents con el cuerpo {} (o sin
--      cuerpo): tiene que responder mode = 'simulacion', listar carpetas y columnas y NO borrar
--      nada. Comprobar después que los archivos siguen en Storage.
--   2. Repetir con { "bookingId": "<una reserva antigua concreta>" } y revisar a mano la lista.
--      Ojo: en ese modo dirigido NO se toca la carpeta de cuenta del titular, y la respuesta lo dice
--      en policy.holderFoldersExcluded. Para incluirla hace falta pasar también "userId".
--   3. Solo entonces, { "bookingId": "<esa reserva>", "confirm": true }. Escribe en Storage real y
--      en la base: es irreversible.
--   4. Repetir el paso 3 tal cual: tiene que responder summary.files = 0 y summary.columns = 0 sin
--      ningún error (idempotencia).
--   5. Con la sesión de un cliente dueño de una reserva, un UPDATE sobre
--      identity_images_purged_at debe fallar con 42501.
--   6. Con la sesión de un ADMINISTRADOR (clave anon, desde el navegador), un UPDATE sobre
--      identity_images_purged_at también debe fallar con 42501, y un INSERT en
--      public.retention_purge_log debe fallar: solo la purga puede sellar y registrar.
--   7. Sin tope: repetir { "confirm": true } hasta que la respuesta traiga truncated = false. Ese es
--      el momento en que se puede afirmar que no queda nada por purgar.
--
-- REVERTIR (quita la constancia y la protección; NO devuelve nada de lo ya borrado, que es
-- irreversible):
--   DROP TRIGGER IF EXISTS protect_bookings_retention_columns ON public.bookings;
--   DROP FUNCTION IF EXISTS public.protect_bookings_retention_columns();
--   DROP TABLE IF EXISTS public.retention_purge_log;
--   DROP INDEX IF EXISTS public.bookings_identity_images_not_purged_idx;
--   DROP INDEX IF EXISTS public.bookings_legal_data_not_purged_idx;
--   ALTER TABLE public.bookings
--     DROP COLUMN IF EXISTS identity_images_purged_at,
--     DROP COLUMN IF EXISTS identity_images_purged_count,
--     DROP COLUMN IF EXISTS legal_data_purged_at;
