-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Registro de cada ejecución de la TAREA SEMANAL de conservación (Vercel Cron).
-- =====================================================
-- Problema:
--   La purga de documentación (POST /api/admin/retention/documents) solo deja constancia en
--   public.retention_purge_log cuando BORRA algo. La tarea semanal arranca en SIMULACIÓN
--   (RETENTION_CRON_CONFIRM sin definir) y durante las primeras semanas no borrará nada: sin otra
--   tabla, el resultado de cada simulación solo existiría en los logs de Vercel, que caducan, y
--   Javier no podría revisar qué se habría borrado antes de darle permiso de hacerlo.
--
-- Qué hace:
--   Crea public.retention_cron_runs: UNA FILA POR EJECUCIÓN de la tarea, simule o borre, con el
--   modo, cuántas pasadas encadenó, por qué paró, los totales, las reservas atascadas, los avisos y
--   el detalle (rutas de Storage y nombres de columna, NUNCA valores de datos personales; mismo
--   criterio que retention_purge_log.detail).
--
--   NO sustituye a retention_purge_log: esa sigue siendo la prueba de cumplimiento de lo que se ha
--   BORRADO de verdad (la escribe la propia purga). Esta es el cuaderno de la tarea: lo que miró,
--   lo que habría borrado y lo que encontró atascado.
--
--   QUIÉN LA LANZÓ. La tarea escribe retention_purge_log.ran_by = NULL (ninguna persona); un
--   administrador a mano escribe siempre su id. Esta tabla no necesita columna de «quién»: solo
--   la escribe la tarea. No se añade ninguna columna a retention_purge_log a propósito: esa tabla la
--   crea 20261110, que está PREPARADA, SIN APLICAR, y un cambio aquí obligaría a que la purga
--   comprobara una columna más antes de borrar.
--
-- Permisos (mismo reparto que retention_purge_log):
--                  anon   cliente   admin   service role
--   SELECT         NO     NO        SÍ      SÍ
--   INSERT         NO     NO        NO      SÍ
--   UPDATE/DELETE  NO     NO        NO      SÍ
--   Solo escribe la tarea, con la clave de service_role (que salta RLS). No hay política de INSERT a
--   propósito: con una, un administrador podría fabricar desde el navegador el historial de la tarea.
--
-- No depende de 20261110: se puede aplicar antes o después. La ruta de la tarea NO falla si esta
-- tabla no existe: avisa en su respuesta y en el log del servidor, y la purga sigue su curso.
--
-- Idempotente: IF NOT EXISTS, DROP POLICY IF EXISTS y un único bloque.

DO $cron_runs$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'No existe public.is_admin(): esta no es la base esperada (la crea 20261006_handovers_and_vehicle_docs.sql)';
  END IF;

  CREATE TABLE IF NOT EXISTS public.retention_cron_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ran_at timestamptz NOT NULL DEFAULT now(),
    -- 'simulacion': no se borró nada. 'purga': la tarea tenía permiso (RETENTION_CRON_CONFIRM=true)
    mode text NOT NULL CHECK (mode IN ('simulacion', 'purga')),
    -- ok: sin nada que mirar · attention: hay avisos o atascadas · blocked: la purga se negó (409,
    -- no se borró nada) · error: falló una pasada
    outcome text NOT NULL CHECK (outcome IN ('ok', 'attention', 'blocked', 'error')),
    -- completa, simulacion_acotada, solo_atascadas, tope_vueltas, tope_tiempo, sin_avance,
    -- bloqueada, error
    stop_reason text NOT NULL,
    passes integer NOT NULL DEFAULT 0,
    duration_ms integer NOT NULL DEFAULT 0,
    candidates_reviewed integer NOT NULL DEFAULT 0,
    -- De la última pasada: ¿quedaban candidatas sin revisar y alguna podía avanzar?
    truncated boolean NOT NULL DEFAULT false,
    advanceable integer NOT NULL DEFAULT 0,
    -- En simulación: lo que SE BORRARÍA. En purga: lo que se borró
    files_count integer NOT NULL DEFAULT 0,
    columns_count integer NOT NULL DEFAULT 0,
    bookings_count integer NOT NULL DEFAULT 0,
    holders_count integer NOT NULL DEFAULT 0,
    bookings_sealed integer NOT NULL DEFAULT 0,
    -- Reservas que ninguna pasada puede arreglar (sin cliente, o con una reserva viva sin fechas):
    -- necesitan mano humana. `stalled` lleva [{bookingId, reason}], con tope
    stalled_count integer NOT NULL DEFAULT 0,
    stalled jsonb NOT NULL DEFAULT '[]'::jsonb,
    reviewed_only jsonb NOT NULL DEFAULT '[]'::jsonb,
    warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- {code, status, missing?, bookingId?} cuando la purga se negó; NULL si no
    blocked jsonb,
    -- Rutas de Storage y nombres de columna. NUNCA valores de datos personales
    detail jsonb NOT NULL DEFAULT '[]'::jsonb,
    detail_truncated boolean NOT NULL DEFAULT false
  );

  COMMENT ON TABLE public.retention_cron_runs IS
    'Una fila por ejecución de la tarea semanal de conservación (GET /api/cron/retention/documents), simule o borre. detail guarda rutas y nombres de columna, nunca valores. La prueba de lo borrado es retention_purge_log.';

  CREATE INDEX IF NOT EXISTS retention_cron_runs_ran_at_idx ON public.retention_cron_runs (ran_at DESC);

  ALTER TABLE public.retention_cron_runs ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS retention_cron_runs_admin_select ON public.retention_cron_runs;
  CREATE POLICY retention_cron_runs_admin_select ON public.retention_cron_runs
    FOR SELECT TO authenticated
    USING (public.is_admin());

  -- Sin políticas de INSERT, UPDATE ni DELETE: con RLS activada, lo que no tiene política está
  -- prohibido para todo rol que no salte RLS. Solo escribe la tarea, con la clave de service_role.
END
$cron_runs$;

-- COMPROBACIÓN (solo lectura). Esperado: rowsecurity = true y UNA SOLA política (el SELECT del admin).
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.retention_cron_runs'::regclass;
--
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'retention_cron_runs' ORDER BY policyname;
--
-- COMPROBACIÓN FUNCIONAL, solo con permiso de Javier y tras definir CRON_SECRET en Vercel:
--   1. Desplegar con RETENTION_CRON_CONFIRM sin definir. Esperar al lunes, o lanzar la tarea a mano:
--        curl -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/retention/documents
--      Tiene que responder mode = 'simulacion' y recorded = true, y /admin/conservacion tiene que
--      mostrar la ejecución. Comprobar después en Storage que no ha desaparecido ningún archivo.
--   2. Sin el encabezado, o con uno equivocado, tiene que responder 401 y NO escribir ninguna fila.
