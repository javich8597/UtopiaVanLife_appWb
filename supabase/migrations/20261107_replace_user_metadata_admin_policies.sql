-- =====================================================
-- Políticas con metadatos editables (auditoría 2be2cc8, fuera de alcance original).
-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Problema: 20260826000000_create_camper_schema.sql (líneas 73 y 83) decide quién es admin con
-- raw_user_meta_data->>'is_admin'. Cualquier usuario puede editar ese dato con auth.updateUser().
-- Con eso leería los extras de todas las reservas y todas las validaciones de documentos.
--
-- Solución: sustituir las dos políticas por public.is_admin(), que mira users.role.
--   - Sin recursión de RLS: is_admin() es SECURITY DEFINER, lee public.users sin aplicar sus
--     políticas y estas dos políticas no están en public.users.
--   - Tampoco se consulta auth.users, para la que authenticated no suele tener permiso.
--
-- ANTES DE APLICAR, comprobar en la base real (supabase/consulta-solo-lectura.sql):
--   1. Que el trigger protect_users_privileged_columns existe. is_admin() se fía de users.role,
--      y ese trigger es lo que impide a un cliente cambiárselo.
--   2. Que public.users no tiene FORCE ROW LEVEL SECURITY y que el dueño de is_admin() es dueño
--      de public.users o tiene BYPASSRLS. Si no, is_admin() sí aplicaría las políticas de users.
--   3. Que todo admin real tiene users.role = 'admin'. Quien solo tenga app_metadata.role = 'admin'
--      entra al panel (isAdminUser), pero estas políticas no le dan acceso. Solo importa si
--      falta la service role, porque las lecturas pasan por getAdminClientOrSession.
--   4. Que no hay más políticas con metadatos: este bloque avisa con WARNING si encuentra alguna,
--      pero no las toca.
--
-- CAMBIO DE COMPORTAMIENTO POSIBLE: si authenticated no tiene SELECT sobre auth.users, las políticas
-- antiguas dan "permission denied" al leer estas tablas con sesión. Tras la migración, el dueño
-- empezará a ver sus filas. Ninguna lectura del código con sesión lo necesita hoy.
--
-- Matriz esperada para SELECT tras aplicar (INSERT, UPDATE y DELETE no cambian aquí):
--                          anon   dueño   otro cliente   admin (users.role)   service role
--   booking_extras         NO     SÍ      NO             SÍ                   SÍ
--   document_validations   NO     SÍ      NO             SÍ                   SÍ
-- Cliente con is_admin = 'true' en user_metadata: se le trata como cualquier otro cliente.
--
-- Fuera de esta migración: "Public insert booking_extras" y "Public insert document_validations"
-- siguen con WITH CHECK (true). Ver el informe.
--
-- Idempotente y en un único bloque. Si una tabla no existe, la salta. Si is_admin() no existe, la
-- crea; si existe, no la reescribe, pero aborta si no es segura.

DO $meta$
DECLARE
  v_admin_fn regprocedure;
  v_definition text;
  v_is_definer boolean;
  v_config text[];
  v_remaining text;
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'No existe public.users: esta no es la base esperada';
  END IF;

  v_admin_fn := to_regprocedure('public.is_admin()');

  IF v_admin_fn IS NULL THEN
    CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
      SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    $fn$;
    v_admin_fn := to_regprocedure('public.is_admin()');
  END IF;

  SELECT pg_get_functiondef(p.oid), p.prosecdef, p.proconfig
    INTO v_definition, v_is_definer, v_config
  FROM pg_proc p
  WHERE p.oid = v_admin_fn;

  IF NOT v_is_definer THEN
    RAISE EXCEPTION 'public.is_admin() no es SECURITY DEFINER: habría riesgo de recursión de RLS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM unnest(coalesce(v_config, '{}'::text[])) AS c WHERE c LIKE 'search_path=%') THEN
    RAISE EXCEPTION 'public.is_admin() no fija search_path';
  END IF;
  IF v_definition ~* '(raw_)?user_meta(_)?data' THEN
    RAISE EXCEPTION 'public.is_admin() usa metadatos editables por el usuario';
  END IF;

  IF to_regclass('public.booking_extras') IS NOT NULL THEN
    ALTER TABLE public.booking_extras ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Owner read booking_extras" ON public.booking_extras;
    CREATE POLICY "Owner read booking_extras" ON public.booking_extras
      FOR SELECT TO authenticated
      USING (
        public.is_admin() OR EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.id = booking_extras.booking_id AND b.user_id = auth.uid()
        )
      );
  ELSE
    RAISE NOTICE 'public.booking_extras no existe: se omite';
  END IF;

  IF to_regclass('public.document_validations') IS NOT NULL THEN
    ALTER TABLE public.document_validations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Owner or admin read document_validations" ON public.document_validations;
    CREATE POLICY "Owner or admin read document_validations" ON public.document_validations
      FOR SELECT TO authenticated
      USING (public.is_admin() OR user_id = auth.uid());
  ELSE
    RAISE NOTICE 'public.document_validations no existe: se omite';
  END IF;

  -- Las políticas no constan en el repositorio: puede haber más con el mismo fallo.
  SELECT string_agg(format('%I.%I: %s', schemaname, tablename, policyname), ', ')
    INTO v_remaining
  FROM pg_policies
  WHERE coalesce(qual, '') || ' ' || coalesce(with_check, '') ~* '(raw_)?user_meta(_)?data';

  IF v_remaining IS NOT NULL THEN
    RAISE WARNING 'Siguen usando metadatos editables: %', v_remaining;
  END IF;
END
$meta$;

-- COMPROBACIÓN (solo lectura). Esperado: 0 filas.
--   SELECT schemaname, tablename, policyname FROM pg_policies
--   WHERE coalesce(qual, '') || ' ' || coalesce(with_check, '') ~* '(raw_)?user_meta(_)?data';
--
-- REVERTIR: no se recomienda, porque reabre el fallo. Si hiciera falta, ejecutar el DROP POLICY
-- de ambas y volver a crearlas con el texto de 20260826000000_create_camper_schema.sql (apartados
-- 9 y 10, solo las de SELECT). is_admin() se conserva: la usan handovers y camper_documents.
