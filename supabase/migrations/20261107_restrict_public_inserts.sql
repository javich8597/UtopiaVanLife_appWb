-- =====================================================
-- N10 (segunda auditoría): sin INSERT públicos en booking_extras ni document_validations.
-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Problema: 20260826000000_create_camper_schema.sql permite INSERT a cualquiera con
-- WITH CHECK (true). Un anónimo podría crear una fila falsa en document_validations y mostrar a
-- un cliente rechazado un motivo inventado en /dashboard/datos.
--
-- Solución:
--   - booking_extras: se quita la política. Nada del código inserta en esa tabla.
--   - document_validations: INSERT solo para admin.
--
-- verify-doc sigue igual (LEÍDO en app/api/admin/verify-doc/route.ts): inserta con
-- getAdminClientOrSession. Con service role salta RLS; con sesión, el admin pasa is_admin().
-- Si la inserción fallase, la ruta solo lo avisa en el log y la verificación sigue adelante.
--
-- ANTES DE APLICAR, comprobar:
--   1. Que nada externo al repositorio inserta en estas tablas. La sección 2 de
--      supabase/consulta-solo-lectura.sql muestra las políticas reales. Si queda otra política
--      permisiva de INSERT o ALL, esta migración aborta sin cambiar nada: no la borra a ciegas.
--   2. Que todo admin tiene users.role = 'admin'. Quien solo tenga app_metadata.role = 'admin' y
--      use la sesión (sin clave válida) perdería el registro de la verificación, no la verificación.
--   3. Aplicar después de 20261107_replace_user_metadata_admin_policies.sql.
--
-- Matriz esperada para INSERT tras aplicar:
--                          anon   dueño   otro cliente   admin con sesión   service role
--   booking_extras         NO     NO      NO             NO                 SÍ
--   document_validations   NO     NO      NO             SÍ                 SÍ
--
-- Idempotente y en un único bloque. Si una tabla no existe, la salta.

DO $n10$
DECLARE
  v_remaining text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.is_admin()')
      AND p.prosecdef
      AND p.prosrc !~* '(raw_)?user_meta(_)?data'
  ) THEN
    RAISE EXCEPTION 'public.is_admin() falta o no es segura: aplicar antes 20261107_replace_user_metadata_admin_policies.sql';
  END IF;

  IF to_regclass('public.booking_extras') IS NOT NULL THEN
    ALTER TABLE public.booking_extras ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public insert booking_extras" ON public.booking_extras;
  ELSE
    RAISE NOTICE 'public.booking_extras no existe: se omite';
  END IF;

  IF to_regclass('public.document_validations') IS NOT NULL THEN
    ALTER TABLE public.document_validations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public insert document_validations" ON public.document_validations;
    DROP POLICY IF EXISTS "Admin insert document_validations" ON public.document_validations;
    CREATE POLICY "Admin insert document_validations" ON public.document_validations
      FOR INSERT TO authenticated
      WITH CHECK (public.is_admin());
  ELSE
    RAISE NOTICE 'public.document_validations no existe: se omite';
  END IF;

  -- Las políticas permisivas se suman: otra con distinto nombre mantendría el INSERT abierto.
  -- FOR ALL también cubre INSERT. Una limitada a service_role no abre nada.
  SELECT string_agg(format('%s: %s', tablename, policyname), ', ' ORDER BY tablename, policyname)
    INTO v_remaining
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('booking_extras', 'document_validations')
    AND permissive = 'PERMISSIVE'
    AND cmd IN ('INSERT', 'ALL')
    AND policyname <> 'Admin insert document_validations'
    AND NOT roles <@ ARRAY['service_role']::name[];

  IF v_remaining IS NOT NULL THEN
    RAISE EXCEPTION 'Siguen abiertas otras políticas de INSERT, revisarlas antes de repetir: %', v_remaining;
  END IF;
END
$n10$;

-- COMPROBACIÓN (solo lectura). Esperado: una fila, "Admin insert document_validations".
--   SELECT tablename, policyname, roles, with_check FROM pg_policies
--   WHERE tablename IN ('booking_extras', 'document_validations') AND cmd = 'INSERT';
--
-- COMPROBACIÓN FUNCIONAL, solo con permiso de Javier: validar o rechazar una cuenta de prueba en
-- /admin/verifications y comprobar que aparece su fila en document_validations.
--
-- REVERTIR (reabre N10):
--   DROP POLICY IF EXISTS "Admin insert document_validations" ON public.document_validations;
--   CREATE POLICY "Public insert document_validations" ON public.document_validations
--     FOR INSERT WITH CHECK (true);
--   CREATE POLICY "Public insert booking_extras" ON public.booking_extras
--     FOR INSERT WITH CHECK (true);
