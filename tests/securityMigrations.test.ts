import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { MAX_REQUEST_BYTES } from '../lib/documentUploadBudget'

// Estos tests solo leen texto: comprueban que migraciones y código no se contradicen.
// No prueban nada de RLS, Storage ni la base real.

const root = path.resolve(__dirname, '..')
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')
const migration = (name: string) => read(`supabase/migrations/${name}`)
const withoutComments = (sql: string) => sql.replace(/^\s*--.*$/gm, '')

const BOOKINGS = '20261107_block_client_bookings_insert.sql'
const BUCKET = '20261107_documents_bucket_limits.sql'
const POLICIES = '20261107_replace_user_metadata_admin_policies.sql'

const sourceFiles = (dir: string): string[] =>
  readdirSync(path.join(root, dir)).flatMap(entry => {
    const relative = path.join(dir, entry)
    if (statSync(path.join(root, relative)).isDirectory()) return sourceFiles(relative)
    return /\.tsx?$/.test(entry) ? [relative] : []
  })

describe('Migraciones de la auditoría: formato común', () => {
  for (const name of [BOOKINGS, BUCKET, POLICIES]) {
    it(`${name} explica qué comprobar, cómo validar y cómo revertir`, () => {
      const sql = migration(name)
      assert.match(sql, /ANTES DE APLICAR/)
      assert.match(sql, /COMPROBACIÓN/)
      assert.match(sql, /REVERTIR/)
    })
  }
})

describe('A4: los clientes no insertan en bookings', () => {
  it('retira INSERT a anon y authenticated y lo conserva para service role', () => {
    const sql = withoutComments(migration(BOOKINGS))
    assert.match(sql, /REVOKE INSERT ON TABLE public\.bookings FROM PUBLIC, anon, authenticated/)
    assert.match(sql, /GRANT INSERT ON TABLE public\.bookings TO service_role/)
  })

  it('no reescribe funciones que pueden ser distintas en la base real', () => {
    assert.doesNotMatch(withoutComments(migration(BOOKINGS)), /CREATE (OR REPLACE )?FUNCTION/i)
  })

  it('el checkout inserta con service role, que es lo que la migración conserva', () => {
    const checkout = read('app/api/bookings/checkout/route.ts')
    assert.match(checkout, /const supabase = getSupabaseAdmin\(\)/)
  })

  it('ninguna ruta nueva inserta en bookings: una con sesión dejaría de funcionar', () => {
    const known = [
      path.join('app', 'api', 'bookings', 'checkout', 'route.ts'),
    ]
    const inserts = ['app', 'lib', 'components']
      .flatMap(sourceFiles)
      .filter(file => /\.from\(['"]bookings['"]\)\s*\.(insert|upsert)\(/.test(read(file)))
    assert.deepEqual(inserts.filter(file => !known.includes(file)), [])
  })
})

describe('M4: límites del bucket documents', () => {
  it('fija un tamaño máximo que cubre cualquier archivo que acepte la ruta de subida', () => {
    assert.equal(10 * 1024 * 1024, 10485760)
    assert.match(withoutComments(migration(BUCKET)), /10485760/)
    // La ruta no admite peticiones de más de MAX_REQUEST_BYTES (límite de Vercel): ningún archivo supera el del bucket
    assert.match(read('app/api/upload-driver-docs/route.ts'), /MAX_REQUEST_BYTES/)
    assert.ok(MAX_REQUEST_BYTES <= 10485760)
  })

  it('admite solo JPEG, PNG, PDF y HEIC/HEIF', () => {
    const sql = withoutComments(migration(BUCKET))
    const list = sql.match(/ARRAY\[([^\]]+)\]/)?.[1].match(/'[^']+'/g)?.map(type => type.slice(1, -1)).sort()
    assert.deepEqual(list, ['application/pdf', 'image/heic', 'image/heif', 'image/jpeg', 'image/png'])
  })

  it('actualiza el bucket si ya existe, porque el código lo crea sin límites', () => {
    const sql = withoutComments(migration(BUCKET))
    assert.match(sql, /ON CONFLICT \(id\) DO UPDATE SET/)
    assert.match(sql, /allowed_mime_types = EXCLUDED\.allowed_mime_types/)
    assert.match(sql, /file_size_limit = EXCLUDED\.file_size_limit/)
  })
})

describe('Políticas: el admin no se decide con metadatos editables', () => {
  it('sustituye las dos políticas sin consultar auth.users ni raw_user_meta_data', () => {
    const sql = withoutComments(migration(POLICIES))
    assert.match(sql, /DROP POLICY IF EXISTS "Owner read booking_extras"/)
    assert.match(sql, /DROP POLICY IF EXISTS "Owner or admin read document_validations"/)
    assert.equal(sql.match(/USING \(\s*public\.is_admin\(\) OR/g)?.length, 2)
    assert.doesNotMatch(sql, /auth\.users/)
    assert.doesNotMatch(sql, /raw_user_meta_data/)
  })

  it('no edita la migración antigua', () => {
    assert.match(migration('20260826000000_create_camper_schema.sql'), /CREATE POLICY "Owner read booking_extras"/)
  })
})

const IDENTITY = '20261107_protect_users_identity_columns.sql'
const BOOKING_WRITES = '20261107_restrict_client_bookings_writes.sql'
const PUBLIC_INSERTS = '20261107_restrict_public_inserts.sql'
const EMAIL_INDEX = '20261107_unique_users_email_lower.sql'

const writers = (table: string, methods: string) => {
  const write = new RegExp(`\\.from\\(['"]${table}['"]\\)\\s*\\.(${methods})\\(`)
  return ['app', 'lib', 'components'].flatMap(sourceFiles).filter(file => write.test(read(file)))
}
const unknown = (found: string[], known: string[]) => found.filter(file => !known.map(f => path.normalize(f)).includes(file))

describe('Segunda auditoría: formato común', () => {
  for (const name of [IDENTITY, BOOKING_WRITES, PUBLIC_INSERTS, EMAIL_INDEX]) {
    it(`${name} explica qué comprobar, cómo validar y cómo revertir`, () => {
      const sql = migration(name)
      assert.match(sql, /ANTES DE APLICAR/)
      assert.match(sql, /COMPROBACIÓN/)
      assert.match(sql, /REVERTIR/)
    })
  }
})

describe('N1 y N2: identidad en public.users', () => {
  it('usa un trigger aparte y no reescribe el existente', () => {
    const sql = withoutComments(migration(IDENTITY))
    assert.match(sql, /CREATE TRIGGER protect_users_identity_columns/)
    assert.doesNotMatch(sql, /FUNCTION public\.protect_users_privileged_columns/)
    assert.doesNotMatch(sql, /FUNCTION public\.is_privileged_writer/)
  })

  it('protege las columnas de identidad y deja fuera las editables', () => {
    const sql = withoutComments(migration(IDENTITY))
    assert.match(sql, /k IN \('email', 'full_name', 'dni_nie', 'birth_date', 'has_second_driver'\)/)
    assert.match(sql, /k LIKE 'driver\\_license\\_%'/)
    assert.match(sql, /k LIKE 'second\\_driver\\_%'/)
    assert.doesNotMatch(sql, /'(phone|address)'/)
  })

  it('ninguna ruta nueva escribe en users: con sesión daría 42501', () => {
    assert.deepEqual(unknown(writers('users', 'insert|update|upsert'), [
      'app/api/admin/users/role/route.ts',
      'app/api/admin/verify-doc/route.ts',
      'app/api/upload-document/route.ts',
      'app/api/upload-driver-docs/route.ts',
      'lib/booking/checkoutCustomer.ts',
    ]), [])
  })
})

describe('N3: UPDATE y DELETE en bookings', () => {
  it('retira DELETE a clientes y limita UPDATE sin romper al admin con sesión', () => {
    const sql = withoutComments(migration(BOOKING_WRITES))
    assert.match(sql, /REVOKE DELETE ON TABLE public\.bookings FROM PUBLIC, anon, authenticated/)
    assert.match(sql, /REVOKE UPDATE ON TABLE public\.bookings FROM PUBLIC, anon;/)
    assert.match(sql, /AS RESTRICTIVE\s+FOR UPDATE TO authenticated\s+USING \(public\.is_admin\(\)\)\s+WITH CHECK \(public\.is_admin\(\)\)/)
  })

  it('no activa RLS a ciegas: aborta si está desactivada', () => {
    const sql = withoutComments(migration(BOOKING_WRITES))
    assert.match(sql, /relrowsecurity/)
    assert.doesNotMatch(sql, /ENABLE ROW LEVEL SECURITY/)
  })

  it('avisa de aplicarse antes del código que confía en [PEDIDO ANTERIOR]', () => {
    const sql = migration(BOOKING_WRITES)
    assert.match(sql, /ANTES de desplegar el código nuevo/)
    assert.match(sql, /\[PEDIDO ANTERIOR\]/)
    assert.match(read('lib/redsysNotification.ts'), /\[PEDIDO ANTERIOR\]/)
  })

  it('el código nunca borra reservas', () => {
    assert.deepEqual(writers('bookings', 'delete'), [])
  })

  it('ninguna ruta nueva actualiza bookings: un cliente con sesión afectaría a 0 filas', () => {
    assert.deepEqual(unknown(writers('bookings', 'update'), [
      'app/api/admin/approve-booking/route.ts',
      'app/api/admin/bookings/expire/route.ts',
      'app/api/admin/bookings/resolve-payment-alert/route.ts',
      // Completa la ficha del segundo conductor de UNA reserva: requireAdmin(), exige la clave de servicio válida y filtra por `id`
      'app/api/admin/bookings/second-driver/route.ts',
      'app/api/admin/handovers/route.ts',
      'app/api/admin/refund/route.ts',
      'app/api/admin/ses-hospedajes/transmit/route.ts',
      'app/api/bookings/[id]/pay/route.ts',
      'app/api/contracts/sign/route.ts',
      // El 2º conductor pertenece a la reserva: su ficha se guarda en bookings.second_driver_*
      // (migración 20261108). El update va con el cliente privilegiado de la ruta y filtrado por
      // `id` de la reserva y `user_id`; con la sesión de un cliente el trigger
      // protect_bookings_privileged_columns lo rechaza y la ruta lo registra sin romper el guardado
      'app/api/upload-driver-docs/route.ts',
      'lib/redsysNotification.ts',
    ]), [])
  })

  it('el pago escribe con service role, no con la sesión del cliente', () => {
    assert.match(read('app/api/bookings/[id]/pay/route.ts'), /const db = getSupabaseAdmin\(\)/)
  })
})

describe('N10: sin INSERT públicos', () => {
  it('quita los dos INSERT públicos y deja document_validations solo para admin', () => {
    const sql = withoutComments(migration(PUBLIC_INSERTS))
    assert.match(sql, /DROP POLICY IF EXISTS "Public insert booking_extras"/)
    assert.match(sql, /DROP POLICY IF EXISTS "Public insert document_validations"/)
    assert.match(sql, /FOR INSERT TO authenticated\s+WITH CHECK \(public\.is_admin\(\)\)/)
    assert.doesNotMatch(sql, /WITH CHECK \(true\)/)
  })

  it('aborta si queda otra política permisiva de INSERT o ALL', () => {
    const sql = withoutComments(migration(PUBLIC_INSERTS))
    assert.match(sql, /permissive = 'PERMISSIVE'/)
    assert.match(sql, /cmd IN \('INSERT', 'ALL'\)/)
    assert.match(sql, /RAISE EXCEPTION 'Siguen abiertas otras políticas/)
  })

  it('nada del código inserta en booking_extras y solo verify-doc en document_validations', () => {
    assert.deepEqual(writers('booking_extras', 'insert|upsert'), [])
    assert.deepEqual(unknown(writers('document_validations', 'insert|upsert'), ['app/api/admin/verify-doc/route.ts']), [])
  })
})

describe('Índice único de email', () => {
  it('aborta con duplicados y no borra ni cambia filas', () => {
    const sql = withoutComments(migration(EMAIL_INDEX))
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique/)
    assert.match(sql, /RAISE EXCEPTION 'Emails repetidos/)
    assert.doesNotMatch(sql, /\b(DELETE FROM|UPDATE public|TRUNCATE)\b/i)
  })

  it('comprueba la definición sin confundirse con el nombre del índice', () => {
    const sql = withoutComments(migration(EMAIL_INDEX))
    assert.match(sql, /\^CREATE UNIQUE INDEX /)
    const expected = sql.match(/v_definition !~\* '(\\\(lower[^']+)'/)?.[1]
    assert.ok(expected)
    assert.match('USING btree (lower(email))', new RegExp(expected, 'i'))
    assert.match('USING btree (lower((email)::text))', new RegExp(expected, 'i'))
    assert.doesNotMatch('USING btree (email)', new RegExp(expected, 'i'))
  })

  it('no dice que insertProfileRow solo avisa en el log', () => {
    assert.doesNotMatch(migration(EMAIL_INDEX), /solo lo registra en el log/)
    assert.match(read('lib/booking/checkoutCustomer.ts'), /if \(error\) throw new Error\(`No se pudo crear el perfil/)
  })
})

describe('Consulta de revisión', () => {
  const query = read('supabase/consulta-solo-lectura.sql')
  const statement = withoutComments(query).replace(/'[^']*'/g, "''")

  it('es una sola sentencia de lectura', () => {
    assert.match(statement.trim(), /^WITH\b/)
    assert.equal(statement.match(/;/g)?.length, 1)
    assert.doesNotMatch(statement, /\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|GRANT|REVOKE|TRUNCATE)\b/i)
  })

  it('incluye índices de users y defecto y NULL de role y verification_status', () => {
    assert.match(query, /FROM pg_indexes/)
    assert.match(query, /FROM information_schema\.columns/)
    assert.match(query, /column_default/)
    assert.match(query, /is_nullable/)
    assert.match(query, /'role', 'verification_status'/)
  })

  it('incluye claves foráneas y el recuento de emails distintos entre users y auth.users', () => {
    assert.match(query, /FROM pg_constraint con/)
    assert.match(query, /con\.confdeltype/)
    assert.match(query, /LEFT JOIN auth\.users a ON a\.id = u\.id/)
    assert.doesNotMatch(query, /SELECT\s+(u|a)\.email/i)
  })
})

describe('Comentarios del bucket al día', () => {
  it('ya no describen la versión antigua de la ruta', () => {
    const sql = migration(BUCKET)
    assert.doesNotMatch(sql, /validateMagicBytes/)
    assert.match(sql, /detectDocumentType/)
  })
})
