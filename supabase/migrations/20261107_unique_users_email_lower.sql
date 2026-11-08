-- =====================================================
-- Índice único sobre lower(email) en public.users (segunda auditoría, N1).
-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Problema: nada impide dos perfiles con el mismo email en distinta capitalización. El checkout
-- busca un único perfil por email con maybeSingle, que da error si hay dos.
--
-- Solución: índice único. Si hay duplicados, la migración aborta sin borrar ni cambiar nada.
-- El mensaje solo da el recuento, para no volcar emails en logs: cómo resolverlos lo decide Javier.
-- Los emails vacíos o nulos no cuentan: no identifican a nadie.
--
-- ANTES DE APLICAR, comprobar:
--   1. La sección 14 de supabase/consulta-solo-lectura.sql: debe dar grupos=0. Si no, resolver los
--      duplicados a mano, comprobando qué cuenta de auth.users y qué reservas cuelgan de cada fila.
--   2. Que el código desplegado ya no toma users.email como identidad. Un alta con un email ya
--      presente en otra fila dará 23505: insertProfileRow lanza error, el checkout falla y, si la
--      cuenta de Auth era nueva, se retira.
--   3. Mayúsculas: el índice no normaliza. El checkout busca con .eq('email', ...) en minúsculas,
--      así que una fila con mayúsculas no se encuentra. La sección 14 también da ese recuento.
--
-- Bloquea escrituras en users mientras se crea el índice: en una tabla pequeña es un instante.
-- Matriz: no cambia permisos; afecta a toda escritura, también a la service role.
--
-- Idempotente y en un único bloque.

DO $email$
DECLARE
  v_groups bigint;
  v_definition text;
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'No existe public.users: esta no es la base esperada';
  END IF;

  SELECT count(*) INTO v_groups
  FROM (
    SELECT 1
    FROM public.users
    WHERE email IS NOT NULL AND email <> ''
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) AS duplicates;

  IF v_groups > 0 THEN
    RAISE EXCEPTION 'Emails repetidos en public.users, sin distinguir mayúsculas: %. No se ha creado el índice ni se ha borrado nada. Resolverlos antes de repetir esta migración', v_groups;
  END IF;

  CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
    ON public.users (lower(email))
    WHERE email IS NOT NULL AND email <> '';

  -- IF NOT EXISTS solo mira el nombre: confirmar que el índice con ese nombre es el correcto
  SELECT indexdef INTO v_definition
  FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = 'users_email_lower_unique';

  -- Según el tipo de la columna, Postgres escribe lower(email) o lower((email)::text)
  IF v_definition !~* '^CREATE UNIQUE INDEX '
     OR v_definition !~* '\(lower\((email|\(email\)::text)\)\)' THEN
    RAISE EXCEPTION 'users_email_lower_unique ya existe con otra definición: %', v_definition;
  END IF;
END
$email$;

-- COMPROBACIÓN (solo lectura). Esperado: una fila con UNIQUE y lower(email).
--   SELECT indexdef FROM pg_indexes
--   WHERE schemaname = 'public' AND indexname = 'users_email_lower_unique';
--
-- REVERTIR:
--   DROP INDEX IF EXISTS public.users_email_lower_unique;
