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
--   1. Cuatro columnas de constancia en public.bookings:
--        identity_images_reviewed_at   timestamptz  cuándo se revisó y su subcarpeta quedó limpia
--        identity_images_purged_at     timestamptz  cuándo dejó de quedar NINGUNA imagen suya
--        identity_images_purged_count  integer      cuántos archivos se borraron de su subcarpeta
--        legal_data_purged_at          timestamptz  cuándo se borraron sus datos del RD 933/2021
--      `reviewed` y `purged` NO son lo mismo, y confundirlas era un hallazgo de seguridad: las
--      fotos del titular viven en una carpeta de CUENTA que se conserva mientras la cuenta tenga
--      otra reserva viva. En ese caso la reserva vencida queda `reviewed` (su subcarpeta está
--      limpia) pero NO `purged`, porque el dni_front del titular sigue en el bucket. Quien audite
--      debe leer `purged` como «no queda nada de esta reserva» y `reviewed` como «revisada, pero la
--      carpeta de cuenta aún se conserva». La purga de esa carpeta consta aparte en
--      retention_purge_log, con scope 'holder_images'.
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
--     phone, driver_license_id…) son de la cuenta y NO tienen plazo: se conservan mientras exista
--     la cuenta (decisión de Javier, 2026-11-11). Son suyos, no de una reserva, y vaciarlos sería
--     borrar la cuenta, que es otra cosa y la pide el cliente. La ruta no los toca ni los lista.
--     Consecuencia que hay que asumir: a los 3 años se vacía la identidad del viajero EN LA RESERVA
--     y la del perfil sigue ahí, así que el plazo del RD 933/2021 se cumple sobre el registro de
--     viajeros, no sobre la ficha del cliente. (Antes esta cabecera decía que la ruta los listaba,
--     y no era verdad: el ayudante que lo hacía solo lo usaban los tests y se ha retirado.
--     Hallazgo de `seguridad-auditor`.)
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
-- public.bookings, columnas identity_images_reviewed_at / identity_images_purged_at /
-- identity_images_purged_count / legal_data_purged_at:
--                  anon   cliente dueño   otro cliente   admin   postgres (SQL)   service role
--   SELECT         NO*    SÍ*             NO*            SÍ      SÍ               SÍ
--   INSERT         NO*    NO (trigger)    NO*            NO (trigger)   NO (trigger)   SÍ
--   UPDATE         NO*    NO (trigger)    NO*            NO (trigger)   NO (trigger)   SÍ
--   DELETE (fila)  NO*    NO*             NO*            SÍ*            SÍ             SÍ
--   * lo decide la RLS de bookings, que no consta en el repositorio: SIN VERIFICAR.
--     Este trigger solo añade la prohibición de escribir ESAS columnas; no relaja nada.
--   El sello SOLO lo puede poner el rol `service_role`, es decir la propia purga. Ni el
--   administrador desde el navegador (si no, podría declarar purgada una reserva cuyas fotos siguen
--   ahí, o declarar una purga que nunca hizo), ni una sesión SQL directa, ni una tarea de pg_cron:
--   es una LISTA POSITIVA, sin excepciones. Para corregir una fila a mano o desde pg_cron, en la
--   misma transacción y antes del UPDATE:  SET LOCAL ROLE service_role;
--   (La primera versión eximía a `current_user NOT IN ('authenticated','anon')` dentro de una
--   función SECURITY DEFINER, donde `current_user` es el dueño de la función: esa condición era
--   siempre verdadera y dejaba pasar cualquier escritura sin JWT. Hallazgo de `seguridad-auditor` y
--   `qa-verificador`, 2026-11-12.)
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
--   c) El perfil (public.users) NO caduca: decidido por Javier el 2026-11-11, se conserva mientras
--      exista la cuenta, y la cuenta SOLO se borra si el cliente lo pide (decisión de Javier,
--      2026-11-12). Aquí no queda nada que hacer, pero sí FUERA: hoy no existe ninguna forma de
--      borrar una cuenta en toda la aplicación (ni ruta, ni pantalla, ni procedimiento), así que
--      «solo si lo pide» equivale hoy a «nunca», y el derecho de supresión (art. 17 RGPD) tiene que
--      existir de verdad. Cuando se monte, no puede borrarlo todo: el registro de viajeros de una
--      reserva hay que conservarlo sus 3 años (RD 933/2021), que es lo que esta purga ya se lleva
--      después. Es decir, borrar una cuenta = se va la ficha del cliente y sus imágenes, y se queda
--      el registro de viajeros hasta que cumpla el plazo.
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
    ADD COLUMN IF NOT EXISTS identity_images_reviewed_at timestamptz,
    ADD COLUMN IF NOT EXISTS identity_images_purged_at timestamptz,
    ADD COLUMN IF NOT EXISTS identity_images_purged_count integer,
    ADD COLUMN IF NOT EXISTS legal_data_purged_at timestamptz;

  COMMENT ON COLUMN public.bookings.identity_images_reviewed_at IS
    'Cuándo la purga revisó esta reserva y dejó su subcarpeta de documents sin imágenes de identidad. Es la marca que hace avanzar el barrido; se pone también cuando no había nada que borrar.';
  COMMENT ON COLUMN public.bookings.identity_images_purged_at IS
    'Cuándo dejó de quedar NINGUNA imagen de identidad de esta reserva en el bucket documents, ni siquiera en la carpeta de cuenta del titular (100 días tras la devolución; decisión de Javier, 2026-11-10). Puede ser NULL con identity_images_reviewed_at puesto: ver el aviso de abajo.';
  COMMENT ON COLUMN public.bookings.identity_images_purged_count IS
    'Cuántos archivos se borraron de la subcarpeta de ESTA reserva, contando todas las copias que dejó cada reenvío del formulario.';
  COMMENT ON COLUMN public.bookings.legal_data_purged_at IS
    'Cuándo se borraron los datos de identidad del registro de viajeros (RD 933/2021) de esta reserva, a los 3 años de la devolución.';

  -- Índices parciales: la purga busca lo que AÚN no está resuelto, y son las filas que menos hay.
  -- El de imágenes va por `reviewed`, que es el filtro real de la consulta de candidatas
  CREATE INDEX IF NOT EXISTS bookings_identity_images_not_reviewed_idx
    ON public.bookings (end_date)
    WHERE identity_images_reviewed_at IS NULL;

  CREATE INDEX IF NOT EXISTS bookings_legal_data_not_purged_idx
    ON public.bookings (end_date)
    WHERE legal_data_purged_at IS NULL;

  -- El índice de la primera versión iba por `identity_images_purged_at`, que ya no es el filtro
  DROP INDEX IF EXISTS public.bookings_identity_images_not_purged_idx;

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
    -- Cuántas reservas quedaron marcadas, y cuántas de las revisadas no pueden avanzar y volverán
    -- en cada pasada (sin user_id, o con una reserva viva sin fechas en su cuenta)
    bookings_sealed integer NOT NULL DEFAULT 0,
    candidates_stalled integer NOT NULL DEFAULT 0,
    -- Rutas de Storage y nombres de columna. NUNCA valores de datos personales: ni el nombre de un
    -- archivo que la purga no reconoce, porque el nombre también puede serlo
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
  --    Storage.
  --
  --    LISTA POSITIVA, Y SECURITY INVOKER A PROPÓSITO. La primera versión era SECURITY DEFINER y
  --    comprobaba `current_user NOT IN ('authenticated','anon')`. Dentro de una función DEFINER,
  --    `current_user` es el DUEÑO de la función (postgres), no el rol de la sesión: esa condición
  --    era SIEMPRE verdadera, así que cualquier escritura sin claims de JWT quedaba exenta —una
  --    tarea de pg_cron entre ellas, que es justo por donde se va a disparar la purga (hallazgo de
  --    `seguridad-auditor` y `qa-verificador`, 2026-11-12).
  --
  --    Con SECURITY INVOKER, `current_user` SÍ es el rol efectivo: PostgREST hace
  --    `SET LOCAL ROLE authenticated | anon | service_role` según la clave, así que la comprobación
  --    vale tanto por el JWT como por el rol de la sesión. La función no necesita privilegios
  --    elevados: solo lee NEW/OLD y un ajuste, y nadie puede saltarse un trigger.
  --
  --    Para corregir una fila a mano (o para una tarea de pg_cron), antes del UPDATE:
  --      SET LOCAL ROLE service_role;
  --    No hay ninguna otra puerta: sin eso, ni postgres puede tocar estas columnas.
  CREATE OR REPLACE FUNCTION public.protect_bookings_retention_columns()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
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

    -- Lista positiva: solo la purga. `current_user` es el rol efectivo porque esta función es
    -- SECURITY INVOKER; `session_user` no serviría, porque PostgREST entra como `authenticator`
    IF v_role = 'service_role' OR current_user::text = 'service_role' THEN
      RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
      IF NEW.identity_images_reviewed_at IS NOT NULL
         OR NEW.identity_images_purged_at IS NOT NULL
         OR NEW.identity_images_purged_count IS NOT NULL
         OR NEW.legal_data_purged_at IS NOT NULL THEN
        RAISE EXCEPTION 'No autorizado a declarar una reserva revisada o purgada' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;

    SELECT string_agg(k, ', ' ORDER BY k) INTO v_changed
    FROM jsonb_object_keys(to_jsonb(NEW)) AS k
    WHERE k IN ('identity_images_reviewed_at', 'identity_images_purged_at',
                'identity_images_purged_count', 'legal_data_purged_at')
      AND to_jsonb(NEW) -> k IS DISTINCT FROM to_jsonb(OLD) -> k;

    IF v_changed IS NOT NULL THEN
      RAISE EXCEPTION 'No autorizado a modificar la constancia de purga: %. Solo la purga (service_role) puede.', v_changed USING ERRCODE = '42501';
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
-- Esperado: las cuatro columnas, la tabla con rowsecurity = true, UNA SOLA política (el SELECT del
-- administrador) y el trigger con tgenabled = 'O'. Y prosecdef = false: esta función es SECURITY
-- INVOKER a propósito (con DEFINER, current_user sería su dueño y la comprobación de rol mentiría).
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'bookings'
--     AND column_name IN ('identity_images_reviewed_at', 'identity_images_purged_at',
--                         'identity_images_purged_count', 'legal_data_purged_at');
--
--   SELECT prosecdef FROM pg_proc WHERE oid = to_regprocedure('public.protect_bookings_retention_columns()');
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
--   7. Sin tope: repetir { "confirm": true } hasta que la respuesta traiga truncated = false. Si
--      trae `stalled` con filas, esas NO se arreglan repitiendo: hay reservas sin `user_id` o
--      cuentas con una reserva viva sin fechas, y hay que resolverlas a mano. La respuesta lo dice
--      en `stalledWarning`, y el aviso de `truncated` cambia de texto cuando ninguna puede avanzar.
--   8. Si la respuesta trae `reviewedWarning`, alguna reserva quedó `reviewed` y no `purged`: su
--      cuenta conserva la carpeta del titular por otra reserva viva. Es correcto, pero quien audite
--      no puede leer esa reserva como «sin ninguna imagen».
--
-- REVERTIR (quita la constancia y la protección; NO devuelve nada de lo ya borrado, que es
-- irreversible). Antes del ALTER, en la misma transacción:  SET LOCAL ROLE service_role;
--   DROP TRIGGER IF EXISTS protect_bookings_retention_columns ON public.bookings;
--   DROP FUNCTION IF EXISTS public.protect_bookings_retention_columns();
--   DROP TABLE IF EXISTS public.retention_purge_log;
--   DROP INDEX IF EXISTS public.bookings_identity_images_not_reviewed_idx;
--   DROP INDEX IF EXISTS public.bookings_legal_data_not_purged_idx;
--   ALTER TABLE public.bookings
--     DROP COLUMN IF EXISTS identity_images_reviewed_at,
--     DROP COLUMN IF EXISTS identity_images_purged_at,
--     DROP COLUMN IF EXISTS identity_images_purged_count,
--     DROP COLUMN IF EXISTS legal_data_purged_at;
