-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Constancia de que EL TITULAR DECLARÓ haber informado al segundo conductor.
-- Decisión de Javier, 2026-11-14: «Sí, guardemos constancia para cumplir siempre con la ley y la
-- normativa» (recogida en docs/conservacion-de-datos.md).
-- =====================================================
-- Problema:
--   El segundo conductor no tiene cuenta, no guardamos ningún contacto suyo y sus documentos de
--   identidad los sube OTRA persona (el titular). La información del art. 14 del RGPD se la da el
--   titular, no nosotros, y /dashboard/datos se lo hace confirmar con una casilla antes de dejarle
--   elegir las fotos. Esa casilla no salía del navegador: no llegaba a /api/upload-driver-docs ni se
--   guardaba en ninguna parte, así que era un aviso y no un control. El art. 5.2 del RGPD exige
--   poder DEMOSTRAR el cumplimiento, no solo cumplirlo (lo señalaron `seguridad-auditor` y
--   `panel-cliente` por separado).
--
-- Qué hace:
--   Añade a public.bookings una columna:
--     second_driver_informed_declared_at  timestamptz
--       Cuándo el TITULAR declaró haber informado a la persona que esa reserva autoriza.
--
--   El nombre dice lo que es y lo que NO es:
--     - SÍ: «el titular declaró haber informado a esa persona» (es su declaración, nuestra
--       constancia de habérsela pedido). Es lo que dice la casilla: «He informado a [nombre] de que
--       sus documentos se envían a Utopia Van Life y de cómo se tratan sus datos».
--     - NO: «la persona consintió». No hay consentimiento del segundo conductor y la base jurídica
--       del tratamiento no es su consentimiento: no se puede escribir una columna que lo sugiera.
--
--   Fecha y hora, no un booleano, igual que el resto de la familia (second_driver_docs_uploaded_at,
--   second_driver_updated_at): un booleano no sirve para acreditar NADA frente a una reclamación
--   porque no dice cuándo se declaró ni permite situarlo antes de la subida de las fotos.
--
--   Es constancia de cumplimiento, así que la escribe solo el servidor: el cliente NO debe poder
--   ponerla ni quitarla a mano. No hace falta un trigger nuevo: el de
--   20261108_booking_second_driver_columns.sql ya bloquea al cliente CUALQUIER columna
--   `second_driver\_%` (`k LIKE 'second\_driver\_%'`), y esta entra por el nombre. Esta migración se
--   NIEGA a continuar si la función de la base real no trae ese patrón, porque sin él el dueño de la
--   reserva podría falsear su propia constancia con su sesión del navegador. Mismo criterio que
--   20261109_booking_second_driver_audit.sql.
--
--   Sin DEFAULT y sin NOT NULL: NULL significa «no consta», que es lo correcto para las reservas que
--   ya tenían fotos subidas antes de esto. No se inventa una constancia que nadie dio.
--
-- Depende de 20261108_booking_second_driver_columns.sql (aplicarla ANTES).
--
-- Por reserva y no por documento (decisión de Javier del 2026-11-09: el segundo conductor es de la
-- RESERVA). Dos fotos de la misma persona para la misma reserva son el mismo envío y la misma
-- declaración; el documento suelto no tiene a quién referirse.
--
-- Cambiar de persona INVALIDA la constancia anterior: si el backoffice reescribe el nombre o el
-- documento del segundo conductor de una reserva, el titular informó a OTRA persona y la marca
-- vuelve a NULL (lo hace /api/admin/bookings/second-driver, no un trigger: así queda en el mismo
-- sitio que decide quién es esa persona y funciona igual mientras esta columna no exista).
--
-- NO entra en la purga de retención: `BOOKING_LEGAL_DATA_COLUMNS`
-- (lib/booking/dataRetention.ts) enumera las columnas por su nombre y esta no está en la lista, así
-- que sobrevive al vaciado de los datos del 2º conductor a los 3 años. Es a propósito: una fecha y
-- hora no identifica a nadie, y la prueba del cumplimiento tiene que durar más que el dato que
-- acredita (si se borrara con él, volveríamos a no poder demostrar nada).
--
-- Mientras NO esté aplicada (LEÍDO, código de hoy):
--   - /api/upload-driver-docs EXIGE la confirmación igual: sin ella rechaza las fotos del segundo
--     conductor con un 400, antes de escribir en `bookings`, en `users` y en Storage. El control
--     funciona aunque la columna no exista; lo que falta es la constancia.
--   - La marca solo se escribe si la columna viene en la fila leída con `select('*')`, igual que el
--     resto de las columnas de 20261108/20261109. Si no viene, se registra en el log y se sigue.
--
-- Matriz esperada para public.bookings tras aplicar (igual que el resto de second_driver_*):
--                                              anon   dueño   otro cliente   admin   service role
--   SELECT second_driver_informed_declared_at  NO*    SÍ      NO*            SÍ      SÍ
--   INSERT (valor en el alta)                  NO*    NO**    NO*            SÍ      SÍ
--   UPDATE second_driver_informed_declared_at  NO     NO      NO             SÍ      SÍ
--   DELETE de la fila                          NO*    NO*     NO*            SÍ      SÍ
--   * lo decide la RLS de `bookings`, que esta migración no toca: SIN VERIFICAR (no hay volcado del
--     esquema real; falta la migración base que lo documente).
--   ** el trigger de 20261108 no mira columnas en el INSERT (solo status y payment_status), así que
--     un INSERT del cliente con esta columna rellenada NO lo frena el trigger. No es un agujero
--     nuevo: 20261107_block_client_bookings_insert.sql bloquea el alta de reservas por el cliente, y
--     el checkout nunca manda esta columna. Si esa RLS no estuviera, habría que mirarlo.
--
-- Idempotente y en un único bloque.

DO $second_driver_informed$
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

  -- Sin esta protección, el dueño de la reserva podría escribirse la constancia desde el navegador:
  -- una constancia que el propio interesado puede teclear no acredita nada (art. 5.2 RGPD).
  IF to_regprocedure('public.protect_bookings_privileged_columns()') IS NULL
     OR position('second\_driver\_%' IN pg_get_functiondef(to_regprocedure('public.protect_bookings_privileged_columns()'))) = 0 THEN
    RAISE EXCEPTION 'protect_bookings_privileged_columns no protege las columnas second_driver_%%: aplicar antes 20261108_booking_second_driver_columns.sql';
  END IF;

  ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS second_driver_informed_declared_at timestamptz;

  COMMENT ON COLUMN public.bookings.second_driver_informed_declared_at IS
    'Cuándo el TITULAR declaró haber informado al segundo conductor de esta reserva de que sus documentos se envían a Utopia Van Life y de cómo se tratan sus datos (art. 14 RGPD, lo informa el titular porque esa persona no tiene cuenta ni contacto nuestro). NO es el consentimiento del segundo conductor. La escribe /api/upload-driver-docs al aceptar su documentación; vuelve a NULL si el backoffice cambia a quién autoriza la reserva.';
END
$second_driver_informed$;

-- COMPROBACIÓN (solo lectura). Esperado: una fila, timestamp with time zone, is_nullable = YES.
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'bookings'
--     AND column_name = 'second_driver_informed_declared_at';
--
-- COMPROBACIÓN del comentario (es lo que explica la columna a quien la lea dentro de dos años):
--   SELECT col_description('public.bookings'::regclass, ordinal_position)
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'bookings'
--     AND column_name = 'second_driver_informed_declared_at';
--
-- COMPROBACIÓN FUNCIONAL, solo con permiso de Javier y una cuenta de prueba, sobre una reserva
-- pagada que lleve segundo conductor:
--   1. En /dashboard/datos, SIN marcar la casilla, no se pueden ni elegir sus fotos (la pantalla las
--      bloquea). Con la casilla marcada, enviarlas deja la columna con la fecha y la hora.
--   2. Repetir el envío NO cambia esa fecha: la constancia es la de la primera declaración.
--   3. Una petición a mano a /api/upload-driver-docs con las fotos del segundo conductor y sin
--      `secondDriverInformed=true` debe responder 400 y no dejar NADA: ni la columna, ni archivos
--      nuevos en `documents/<cliente>/<reserva>/second_*`, ni `verification_status` cambiado.
--   4. Con la sesión del cliente, un UPDATE de esta columna debe fallar con «No autorizado a
--      modificar esta reserva» (trigger de 20261108).
--   5. Cambiar el nombre o el documento del segundo conductor desde el detalle de la reserva, en el
--      panel, debe dejar la columna en NULL: el titular informó a otra persona.
--
-- REVERTIR (vuelve a no haber constancia; la ruta sigue exigiendo la confirmación y lo registra en
-- el log, así que nada se rompe):
--   ALTER TABLE public.bookings DROP COLUMN IF EXISTS second_driver_informed_declared_at;
