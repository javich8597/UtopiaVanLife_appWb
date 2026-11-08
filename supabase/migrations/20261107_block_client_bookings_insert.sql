-- =====================================================
-- A4 (auditoría 2be2cc8): un cliente no puede crear reservas con importes propios.
-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Problema: el trigger protect_bookings_privileged_columns solo mira status y payment_status en
-- INSERT. Si RLS lo permite, un cliente inserta total_price = 1, paga por /api/bookings/[id]/pay
-- y el webhook lo da por bueno porque compara con esa misma columna.
--
-- Solución: quitar el permiso INSERT de la tabla a anon y authenticated.
--   - No depende de las políticas reales de bookings, que no constan en el repositorio.
--   - No depende del trigger ni de los claims del JWT: lo comprueba Postgres con el rol real.
--   - No reescribe ninguna función, así que no pisa una versión distinta en la base real.
--   - El trigger no sirve para esto: no puede recalcular un precio dentro de la base.
--
-- ANTES DE APLICAR, comprobar en la base real (supabase/consulta-solo-lectura.sql):
--   1. Que nada legítimo inserta en bookings con rol anon o authenticated. En el repositorio
--      solo inserta /api/bookings/checkout, con getSupabaseAdmin() (service role). Sigue funcionando.
--   2. Que no hay funciones SECURITY DEFINER, RPC ni vistas sobre bookings que permitan insertar
--      por otro camino: el REVOKE no las cubre.
--   3. Que el trigger protect_bookings_privileged_columns existe: protege total_price en UPDATE.
--
-- Matriz esperada para bookings tras aplicar (solo cambia INSERT):
--                  anon     dueño    otro cliente   admin con sesión   service role
--   INSERT         NO       NO       NO             NO                 SÍ
--   SELECT/UPDATE/DELETE: sin cambios. Dependen de RLS real: SIN VERIFICAR.
-- El admin con sesión tampoco inserta: el código no lo hace nunca y crear reservas pasa
-- siempre por el checkout con service role.
--
-- Idempotente: se puede ejecutar varias veces. Es un único bloque, así que falla entero o
-- se aplica entero.

DO $a4$
BEGIN
  IF to_regclass('public.bookings') IS NULL THEN
    RAISE EXCEPTION 'No existe public.bookings: esta no es la base esperada';
  END IF;

  -- PUBLIC incluido por si alguien concedió el permiso a todos los roles.
  -- Un REVOKE de tabla retira también los permisos por columna.
  REVOKE INSERT ON TABLE public.bookings FROM PUBLIC, anon, authenticated;

  -- El checkout depende de esto: se garantiza aunque el permiso llegase por PUBLIC.
  GRANT INSERT ON TABLE public.bookings TO service_role;

  -- Si el permiso lo concedió otro rol, el REVOKE no lo quita y solo avisa. Mejor abortar.
  IF has_any_column_privilege('anon', 'public.bookings', 'INSERT')
     OR has_any_column_privilege('authenticated', 'public.bookings', 'INSERT') THEN
    RAISE EXCEPTION 'anon o authenticated conservan INSERT en bookings: revisar quién concedió el permiso';
  END IF;
END
$a4$;

-- COMPROBACIÓN (solo lectura). Esperado: anon false, authenticated false, service_role true.
--   SELECT r AS rol, has_any_column_privilege(r, 'public.bookings', 'INSERT') AS puede_insertar
--   FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r;
--
-- COMPROBACIÓN FUNCIONAL: hacer una reserva de prueba por el checkout solo con permiso de Javier,
-- porque escribe en la base real.
--
-- REVERTIR (reabre A4 si RLS permite el INSERT; solo si algo legítimo dejó de funcionar):
--   GRANT INSERT ON TABLE public.bookings TO authenticated;
--   GRANT INSERT ON TABLE public.bookings TO anon;
-- Antes de revertir, apuntar qué roles tenían INSERT: los permisos actuales salen en la sección 4 de
-- supabase/consulta-solo-lectura.sql.
