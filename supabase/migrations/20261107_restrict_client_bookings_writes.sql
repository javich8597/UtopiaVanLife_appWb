-- =====================================================
-- N3 (segunda auditoría): un cliente no modifica ni borra reservas con su sesión.
-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Problema: el trigger de bookings solo protege una lista de columnas. Si RLS lo permite, un
-- cliente puede cambiar base_price, pricing_breakdown o notes (donde van los avisos de cobro), o
-- borrar su reserva. Las políticas reales no constan en el repositorio.
--
-- Solución:
--   - DELETE: fuera para anon y authenticated. El código nunca borra reservas.
--   - UPDATE: fuera para anon. Para authenticated, política RESTRICTIVE que solo deja pasar al
--     admin, sea cual sea la política permisiva que exista hoy.
--
-- Por qué no REVOKE UPDATE a authenticated: cinco rutas de admin actualizan reservas con
-- getAdminClientOrSession (approve-booking, bookings/expire, bookings/resolve-payment-alert,
-- handovers y refund). Si la clave de service role no empieza por "eyJ", ese cliente es la sesión
-- del admin y el REVOKE rompería el panel. Si Javier confirma el formato de la clave, se puede
-- endurecer con: REVOKE UPDATE ON TABLE public.bookings FROM authenticated;
--
-- Escrituras en bookings por parte de clientes (LEÍDO):
--   - Pago, /api/bookings/[id]/pay: service role. Sigue funcionando.
--   - Webhook y verify-payment: service role. Siguen funcionando.
--   - Pasajeros: se guardan en el INSERT del checkout, con service role. No hay ruta que los edite.
--   - Cancelación: el cliente no tiene ruta propia; solo /api/admin/refund.
--   - Firma, /api/contracts/sign: service role. Sin clave válida usa la sesión del cliente, y eso
--     ya falla hoy porque el trigger bloquea contract_signature; seguirá respondiendo 500.
--
-- ANTES DE APLICAR, comprobar (supabase/consulta-solo-lectura.sql):
--   1. Que RLS está activa en bookings. Si no, esta migración aborta: activarla sin revisar las
--      políticas podría dejar sin datos al panel del cliente.
--   2. Que todo admin tiene users.role = 'admin'. Quien solo tenga app_metadata.role = 'admin' no
--      pasa is_admin(), y sin clave válida no podría actualizar reservas.
--   3. Aplicar después de 20261107_replace_user_metadata_admin_policies.sql.
--   4. Aplicar ANTES de desplegar el código nuevo. lib/redsysNotification.ts confía en las líneas
--      [PEDIDO ANTERIOR] de bookings.notes para saber qué pedidos son de una reserva. Si un cliente
--      puede editar notes, podría añadir ahí pedidos que no son suyos.
--
-- Matriz esperada para bookings tras aplicar:
--                  anon     dueño     otro cliente   admin con sesión   service role
--   UPDATE         NO       NO (*)    NO (*)         SÍ (**)            SÍ
--   DELETE         NO       NO        NO             NO                 SÍ
--   INSERT         NO       NO        NO             NO                 SÍ    (migración de A4)
--   SELECT         sin cambios: depende de RLS real, SIN VERIFICAR
-- (*)  Sin error: el update afecta a 0 filas.
-- (**) Si existe una política permisiva para el admin: SIN VERIFICAR. Esta migración no la crea.
--
-- Idempotente y en un único bloque.

DO $n3$
BEGIN
  IF to_regclass('public.bookings') IS NULL THEN
    RAISE EXCEPTION 'No existe public.bookings: esta no es la base esperada';
  END IF;

  IF NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = 'public.bookings'::regclass) THEN
    RAISE EXCEPTION 'RLS está desactivada en bookings: revisar sus políticas antes de aplicar esta migración';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.is_admin()')
      AND p.prosecdef
      AND p.prosrc !~* '(raw_)?user_meta(_)?data'
  ) THEN
    RAISE EXCEPTION 'public.is_admin() falta o no es segura: aplicar antes 20261107_replace_user_metadata_admin_policies.sql';
  END IF;

  REVOKE DELETE ON TABLE public.bookings FROM PUBLIC, anon, authenticated;
  REVOKE UPDATE ON TABLE public.bookings FROM PUBLIC, anon;
  GRANT UPDATE, DELETE ON TABLE public.bookings TO service_role;
  -- La sesión del admin lo necesita. Lo que limita a los clientes es la política de abajo.
  GRANT UPDATE ON TABLE public.bookings TO authenticated;

  DROP POLICY IF EXISTS "bookings_update_admin_only" ON public.bookings;
  CREATE POLICY "bookings_update_admin_only" ON public.bookings
    AS RESTRICTIVE
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

  -- Si el permiso lo concedió otro rol, el REVOKE no lo quita y solo avisa. Mejor abortar.
  IF has_any_column_privilege('anon', 'public.bookings', 'UPDATE')
     OR has_table_privilege('anon', 'public.bookings', 'DELETE')
     OR has_table_privilege('authenticated', 'public.bookings', 'DELETE') THEN
    RAISE EXCEPTION 'anon o authenticated conservan permisos en bookings: revisar quién los concedió';
  END IF;
END
$n3$;

-- COMPROBACIÓN (solo lectura). Esperado: anon false y false; authenticated true y false;
-- service_role true y true. Además, una política RESTRICTIVE para UPDATE.
--   SELECT r AS rol,
--          has_any_column_privilege(r, 'public.bookings', 'UPDATE') AS puede_actualizar,
--          has_table_privilege(r, 'public.bookings', 'DELETE') AS puede_borrar
--   FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r;
--   SELECT policyname, permissive, cmd, roles FROM pg_policies
--   WHERE tablename = 'bookings' AND policyname = 'bookings_update_admin_only';
--
-- COMPROBACIÓN FUNCIONAL, solo con permiso de Javier: firmar un contrato y aprobar una reserva de
-- prueba desde el panel. Ambas escriben en la base real.
--
-- REVERTIR (reabre N3 si las políticas reales lo permiten; apuntar antes los permisos actuales):
--   DROP POLICY IF EXISTS "bookings_update_admin_only" ON public.bookings;
--   GRANT UPDATE, DELETE ON TABLE public.bookings TO authenticated;
--   GRANT UPDATE, DELETE ON TABLE public.bookings TO anon;
