-- =====================================================
-- Quién completó o corrigió la ficha del segundo conductor de una reserva.
-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Contexto:
--   El administrador puede completar, desde el detalle de la reserva, el nombre, el documento, el
--   nº de carnet y las dos fechas del segundo conductor (/api/admin/bookings/second-driver). Esa
--   edición cambia a quién autoriza el contrato, así que tiene que quedar constancia de quién la
--   hizo y cuándo.
--
-- Qué hace:
--   Añade a public.bookings dos columnas:
--     second_driver_updated_by  uuid         id del usuario (auth.users.id) que hizo el último cambio
--     second_driver_updated_at  timestamptz  cuándo
--   Sin clave foránea a propósito: un administrador por app_metadata puede no tener fila en
--   public.users, y la constancia no debe impedir guardar ni desaparecer si se borra esa fila.
--
-- Depende de 20261108_booking_second_driver_columns.sql (aplicarla ANTES): esa migración crea las
-- columnas second_driver_* y reescribe protect_bookings_privileged_columns para que cualquier
-- columna `second_driver_%` solo la escriba un administrador o la clave de servicio. Estas dos
-- columnas nuevas entran en esa protección por el nombre; esta migración se niega a continuar si la
-- función de la base real no la tiene, porque sin ella el dueño de la reserva podría falsear la
-- constancia con su propia sesión.
--
-- Mientras NO esté aplicada (LEÍDO, código de hoy):
--   /api/admin/bookings/second-driver responde 409 diciendo qué columnas faltan y no escribe nada.
--   El resto del panel (avisos, entrega, contrato) funciona igual con lo que ya consta en la reserva.
--
-- Matriz esperada para public.bookings tras aplicar (igual que el resto de second_driver_*):
--                                        anon   dueño   admin   service role
--   UPDATE second_driver_updated_by/at   NO     NO      SÍ      SÍ
-- SELECT y DELETE no cambian.
--
-- Idempotente y en un único bloque.

DO $second_driver_audit$
BEGIN
  IF to_regclass('public.bookings') IS NULL THEN
    RAISE EXCEPTION 'No existe public.bookings: esta no es la base esperada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'second_driver_name'
  ) THEN
    RAISE EXCEPTION 'Faltan las columnas second_driver_*: aplicar antes 20261108_booking_second_driver_columns.sql';
  END IF;

  IF to_regprocedure('public.protect_bookings_privileged_columns()') IS NULL
     OR position('second\_driver\_%' IN pg_get_functiondef(to_regprocedure('public.protect_bookings_privileged_columns()'))) = 0 THEN
    RAISE EXCEPTION 'protect_bookings_privileged_columns no protege las columnas second_driver_%%: aplicar antes 20261108_booking_second_driver_columns.sql';
  END IF;

  ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS second_driver_updated_by uuid,
    ADD COLUMN IF NOT EXISTS second_driver_updated_at timestamptz;

  COMMENT ON COLUMN public.bookings.second_driver_updated_by IS
    'Usuario (auth.users.id) que completó o corrigió la ficha del segundo conductor desde el backoffice.';
  COMMENT ON COLUMN public.bookings.second_driver_updated_at IS
    'Cuándo se completó o corrigió por última vez la ficha del segundo conductor desde el backoffice.';
END
$second_driver_audit$;

-- COMPROBACIÓN (solo lectura). Esperado: dos filas.
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'bookings'
--     AND column_name IN ('second_driver_updated_by', 'second_driver_updated_at');
--
-- COMPROBACIÓN FUNCIONAL, solo con permiso de Javier y una reserva de prueba que lleve segundo
-- conductor: completar su ficha desde el detalle de la reserva debe dejar esas dos columnas con el
-- id del administrador y la hora; y con la sesión del cliente, un UPDATE de cualquiera de ellas
-- debe fallar con «No autorizado a modificar esta reserva».
--
-- REVERTIR (el panel vuelve a responder 409 al editar la ficha):
--   ALTER TABLE public.bookings
--     DROP COLUMN IF EXISTS second_driver_updated_by,
--     DROP COLUMN IF EXISTS second_driver_updated_at;
