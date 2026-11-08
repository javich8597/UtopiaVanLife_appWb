-- Revisión del estado real antes de aplicar las migraciones 20261107_*.
-- Solo lectura. No devuelve datos de clientes: solo definiciones y recuentos.
-- Es una sola consulta porque el SQL Editor de Supabase muestra únicamente el último resultado.
WITH tablas(nombre) AS (
  VALUES ('bookings'), ('users'), ('booking_extras'), ('document_validations'), ('blocked_dates')
)
SELECT seccion, objeto, detalle FROM (
  SELECT '1. RLS y dueño' AS seccion, c.relname::text AS objeto,
         format('rls=%s force=%s dueño=%s', c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner)) AS detalle
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN (SELECT nombre FROM tablas)
  UNION ALL
  SELECT '2. Políticas', format('%s.%s / %s', schemaname, tablename, policyname),
         format('%s %s roles=%s USING: %s CHECK: %s', permissive, cmd, roles, qual, with_check)
  FROM pg_policies
  WHERE (schemaname = 'public' AND tablename IN (SELECT nombre FROM tablas))
     OR (schemaname = 'storage' AND tablename = 'objects')
  UNION ALL
  SELECT '3. Políticas con metadatos editables', format('%s.%s / %s', schemaname, tablename, policyname),
         format('USING: %s CHECK: %s', qual, with_check)
  FROM pg_policies
  WHERE coalesce(qual, '') || ' ' || coalesce(with_check, '') ~* '(raw_)?user_meta(_)?data'
  UNION ALL
  SELECT '4. Permisos', format('%s / %s', table_name, grantee),
         format('%s (concedido por %s)', string_agg(privilege_type, ', ' ORDER BY privilege_type), grantor)
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND table_name IN (SELECT nombre FROM tablas)
    AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
  GROUP BY table_name, grantee, grantor
  UNION ALL
  SELECT '5. Triggers', format('%s / %s', t.tgrelid::regclass, t.tgname),
         format('activo=%s función=%s', t.tgenabled, t.tgfoid::regprocedure)
  FROM pg_trigger t
  WHERE NOT t.tgisinternal
    AND t.tgrelid IN ('public.bookings'::regclass, 'public.users'::regclass, 'auth.users'::regclass)
  UNION ALL
  SELECT '6. Funciones de permisos y alta', p.oid::regprocedure::text,
         format('dueño=%s bypassrls=%s definer=%s config=%s %s', r.rolname, r.rolbypassrls, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_roles r ON r.oid = p.proowner
  WHERE n.nspname = 'public' AND p.prokind = 'f'
    AND (p.proname IN ('is_admin', 'is_privileged_writer')
         OR p.oid IN (SELECT t.tgfoid FROM pg_trigger t WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal))
  UNION ALL
  SELECT '7. Funciones que escriben en bookings o users', p.oid::regprocedure::text,
         format('definer=%s invocable_por_authenticated=%s', p.prosecdef, has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f'
    AND p.prosrc ~* '(insert\s+into|update|delete\s+from)\s+(public\.)?(bookings|users)\M'
  UNION ALL
  SELECT '8. Vistas sobre bookings o users', v.oid::regclass::text,
         format('dueño=%s opciones=%s', pg_get_userbyid(v.relowner), v.reloptions)
  FROM pg_depend d
  JOIN pg_rewrite w ON w.oid = d.objid
  JOIN pg_class v ON v.oid = w.ev_class
  WHERE d.classid = 'pg_rewrite'::regclass
    AND d.refobjid IN ('public.bookings'::regclass, 'public.users'::regclass)
    AND v.oid NOT IN ('public.bookings'::regclass, 'public.users'::regclass)
  GROUP BY v.oid, v.relowner, v.reloptions
  UNION ALL
  SELECT '9. Bucket', id,
         format('public=%s limite=%s tipos=%s', public, file_size_limit, allowed_mime_types)
  FROM storage.buckets
  WHERE id IN ('documents', 'handovers', 'vehicle-docs')
  UNION ALL
  SELECT '10. Archivos en documents', coalesce(metadata->>'mimetype', '(sin tipo)'),
         format('archivos=%s mayor_en_bytes=%s', count(*), max((metadata->>'size')::bigint))
  FROM storage.objects
  WHERE bucket_id = 'documents'
  GROUP BY metadata->>'mimetype'
  UNION ALL
  SELECT '11. Índices de users', indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'users'
  UNION ALL
  SELECT '12. Columnas de users', column_name::text,
         format('tipo=%s (%s) admite_null=%s defecto=%s', data_type, udt_name, is_nullable, column_default)
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users'
    AND (column_name IN ('role', 'verification_status', 'email', 'full_name', 'dni_nie', 'birth_date')
         OR column_name LIKE 'driver\_license\_%')
  UNION ALL
  SELECT '13. Perfiles sin rol o sin estado', 'public.users',
         format('role_null=%s verification_status_null=%s', count(*) FILTER (WHERE role IS NULL), count(*) FILTER (WHERE verification_status IS NULL))
  FROM public.users
  UNION ALL
  SELECT '14. Emails en users', 'public.users',
         format('grupos=%s filas_con_mayusculas=%s',
                (SELECT count(*) FROM (
                   SELECT 1 FROM public.users
                   WHERE email IS NOT NULL AND email <> ''
                   GROUP BY lower(email) HAVING count(*) > 1
                 ) AS repetidos),
                (SELECT count(*) FROM public.users WHERE email <> lower(email)))
  UNION ALL
  SELECT '15. Acceso de authenticated a auth.users', 'auth.users',
         format('select=%s', has_table_privilege('authenticated', 'auth.users', 'SELECT'))
  UNION ALL
  SELECT '16. Claves foráneas de users y bookings.user_id', format('%s / %s', con.conrelid::regclass, con.conname),
         format('referencia=%s confdeltype=%s (%s) %s', con.confrelid::regclass, con.confdeltype,
                CASE con.confdeltype
                  WHEN 'a' THEN 'sin acción'
                  WHEN 'r' THEN 'restrict'
                  WHEN 'c' THEN 'cascade'
                  WHEN 'n' THEN 'set null'
                  WHEN 'd' THEN 'set default'
                END,
                pg_get_constraintdef(con.oid))
  FROM pg_constraint con
  WHERE con.contype = 'f'
    AND (con.conrelid = 'public.users'::regclass
         OR con.confrelid = 'public.users'::regclass
         OR (con.conrelid = 'public.bookings'::regclass
             AND EXISTS (
               SELECT 1 FROM pg_attribute a
               WHERE a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey) AND a.attname = 'user_id'
             )))
  UNION ALL
  SELECT '17. users.email frente a auth.users.email', 'public.users',
         format('no_coinciden=%s sin_cuenta_en_auth=%s',
                count(*) FILTER (WHERE a.id IS NOT NULL AND lower(u.email::text) IS DISTINCT FROM lower(a.email::text)),
                count(*) FILTER (WHERE a.id IS NULL))
  FROM public.users u
  LEFT JOIN auth.users a ON a.id = u.id
) AS informe
ORDER BY split_part(seccion, '.', 1)::int, objeto;
