import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { GET as cronGET } from '../app/api/cron/retention/documents/route'
import * as cronRoute from '../app/api/cron/retention/documents/route'
import { getAdminClientOrSession } from '../lib/admin/auth'
import {
    CRON_MAX_PASSES,
    CRON_MIN_SECRET_LENGTH,
    cronConfirmEnabled,
    cronRunRow,
    entriesFromPass,
    isCronAuthorized,
    runCronRetention,
} from '../lib/admin/retentionCron'
import type { RetentionPassResult } from '../lib/admin/retentionPass'

/**
 * TAREA SEMANAL DE CONSERVACIÓN: su puerta (secreto), su modo (simulación por defecto) y su bucle.
 *
 * Reloj congelado donde importa la fecha. Nada de esto prueba Vercel Cron real, Supabase real, RLS ni
 * Storage real: la ruta corre contra el Supabase simulado de `tests/helpers/fakeSupabase.ts`.
 */

const SECRETO = 'secreto-de-prueba-largo-0123456789'
const CLIENTE_1 = '00000000-0000-4000-8000-0000000000c1'
const CLIENTE_2 = '00000000-0000-4000-8000-0000000000c2'
const CLIENTE_3 = '00000000-0000-4000-8000-0000000000c3'
const B1 = '11111111-aaaa-4bbb-8ccc-111111111111'
const B2 = '22222222-aaaa-4bbb-8ccc-222222222222'
const B3 = '33333333-aaaa-4bbb-8ccc-333333333333'
/** Devolución el 10 de junio de 2026: el día 100 es el 18 de septiembre */
const HOY_DIA_100 = '2026-09-18T10:00:00Z'

const audit = {
    identity_images_reviewed_at: null, identity_images_purged_at: null,
    identity_images_purged_count: null, legal_data_purged_at: null,
}
const vieja = (id: string, user: string, extra: Row = {}): Row => ({
    id, user_id: user, status: 'completed', payment_status: 'paid',
    start_date: '2026-06-03', end_date: '2026-06-10',
    customer_name: 'Ana Pérez', customer_email: 'ana@example.com', customer_dni: '12345678Z',
    customer_phone: '600000000', customer_address: 'Calle Mayor 1', total_price: 1200, ...audit, ...extra,
})
const fotosDe = (user: string, booking: string) => [
    `${user}/${booking}/second_dni_front_11111111-1111-4111-8111-111111111111.jpg`,
    `${user}/dni_front_44444444-4444-4444-8444-444444444444.jpg`,
]

const PASS_OK: RetentionPassResult = {
    status: 200,
    body: {
        mode: 'purga', reviewed: 50, truncated: true, advanceable: 50, sealed: 50,
        summary: { files: 100, columns: 0, bookings: 50, holders: 50 }, folders: [], legal: [], stalled: [], closedByHolder: [],
    },
}

const silenced = { error: console.error, info: console.info, warn: console.warn }
const quiet = () => { console.error = () => {}; console.info = () => {}; console.warn = () => {} }
const loud = () => Object.assign(console, silenced)

describe('Tarea semanal: la comparación del secreto', () => {
    const env = (extra: Record<string, string | undefined> = {}) => ({ CRON_SECRET: SECRETO, ...extra })

    it('acepta el secreto correcto', () => {
        assert.equal(isCronAuthorized(`Bearer ${SECRETO}`, env()), true)
        assert.equal(isCronAuthorized(`bearer ${SECRETO}`, env()), true, 'el esquema no distingue mayúsculas')
    })

    it('NUNCA acepta por ausencia: sin CRON_SECRET niega todo', () => {
        for (const header of [`Bearer ${SECRETO}`, 'Bearer undefined', 'Bearer ', 'Bearer', '', 'undefined', 'Bearer null', null, undefined]) {
            assert.equal(isCronAuthorized(header, {}), false, `cabecera ${JSON.stringify(header)} sin secreto configurado`)
            assert.equal(isCronAuthorized(header, { CRON_SECRET: '' }), false)
            assert.equal(isCronAuthorized(header, { CRON_SECRET: '   ' }), false)
        }
    })

    it('un secreto demasiado corto se trata como no configurado, aunque coincida', () => {
        const corto = 'x'.repeat(CRON_MIN_SECRET_LENGTH - 1)
        assert.equal(isCronAuthorized(`Bearer ${corto}`, { CRON_SECRET: corto }), false)
        const justo = 'x'.repeat(CRON_MIN_SECRET_LENGTH)
        assert.equal(isCronAuthorized(`Bearer ${justo}`, { CRON_SECRET: justo }), true)
    })

    it('niega un secreto equivocado, de otra longitud, sin esquema Bearer o con restos', () => {
        assert.equal(isCronAuthorized(`Bearer ${SECRETO}x`, env()), false)
        assert.equal(isCronAuthorized(`Bearer ${SECRETO.slice(0, -1)}`, env()), false)
        assert.equal(isCronAuthorized(`Bearer ${SECRETO.toUpperCase()}`, env()), false, 'el secreto sí distingue mayúsculas')
        assert.equal(isCronAuthorized(SECRETO, env()), false, 'sin «Bearer»')
        assert.equal(isCronAuthorized(`Basic ${SECRETO}`, env()), false)
        assert.equal(isCronAuthorized(`Bearer ${SECRETO} ${SECRETO}`, env()), false)
        assert.equal(isCronAuthorized('Bearer a', env()), false)
    })

    it('compara con timingSafeEqual sobre resúmenes, no con ===', async () => {
        const { readFileSync } = await import('node:fs')
        const source = readFileSync('lib/admin/retentionCron.ts', 'utf8')
        assert.match(source, /timingSafeEqual\(/)
        assert.match(source, /createHash\('sha256'\)/)
        assert.doesNotMatch(source, /===\s*secret|secret\s*===|authorization\s*===|=== `Bearer/, 'ninguna comparación directa del secreto')
    })
})

describe('Tarea semanal: el modo se decide solo con RETENTION_CRON_CONFIRM', () => {
    it('solo «true» exacto borra; cualquier otra cosa simula', () => {
        assert.equal(cronConfirmEnabled({ RETENTION_CRON_CONFIRM: 'true' }), true)
        assert.equal(cronConfirmEnabled({ RETENTION_CRON_CONFIRM: ' true ' }), true, 'los espacios de pegar la variable no cuentan')
        for (const value of [undefined, '', 'false', 'TRUE', 'True', '1', 'yes', 'si', 'on', 'true!', 'truee']) {
            assert.equal(cronConfirmEnabled({ RETENTION_CRON_CONFIRM: value }), false, `valor ${JSON.stringify(value)}`)
        }
        assert.equal(cronConfirmEnabled({}), false, 'ausente = simulación')
    })
})

describe('Tarea semanal: la ruta GET /api/cron/retention/documents', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const previous = { secret: process.env.CRON_SECRET, confirm: process.env.RETENTION_CRON_CONFIRM }

    const request = (headers: Record<string, string> = {}, query = '') =>
        new Request(`http://localhost/api/cron/retention/documents${query}`, { method: 'GET', headers })
    const authed = (query = '') => request({ authorization: `Bearer ${SECRETO}` }, query)
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: new Date(instant) })

    const ALL_FILES = [...fotosDe(CLIENTE_1, B1), ...fotosDe(CLIENTE_2, B2)]

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: CLIENTE_1, role: 'customer' }, { id: CLIENTE_2, role: 'customer' }],
            bookings: [vieja(B1, CLIENTE_1), vieja(B2, CLIENTE_2)],
            retention_purge_log: [],
            retention_cron_runs: [],
        })
        fake.seedStorage('documents', ALL_FILES)
        fake.setSession(null)
        process.env.CRON_SECRET = SECRETO
        delete process.env.RETENTION_CRON_CONFIRM
        quiet()
    })
    afterEach(() => {
        mock.timers.reset()
        fake.restore()
        if (previous.secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous.secret
        if (previous.confirm === undefined) delete process.env.RETENTION_CRON_CONFIRM; else process.env.RETENTION_CRON_CONFIRM = previous.confirm
        loud()
    })

    it('solo exporta GET: ni POST ni otro método abren una segunda puerta', () => {
        assert.equal(typeof cronRoute.GET, 'function')
        for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
            assert.equal((cronRoute as Record<string, unknown>)[method], undefined, method)
        }
    })

    it('sin cabecera responde 401 y no toca la base ni Storage', async () => {
        freeze(HOY_DIA_100)
        const res = await cronGET(request())
        assert.equal(res.status, 401)
        assert.equal(fake.requests.length, 0, 'ni una petición a Supabase')
        assert.equal(fake.storagePaths('documents').length, ALL_FILES.length)
    })

    it('con un secreto equivocado responde 401 y no toca nada', async () => {
        freeze(HOY_DIA_100)
        for (const authorization of ['Bearer otro-secreto-que-no-es-el-bueno', `Bearer ${SECRETO}x`, SECRETO, 'Bearer ']) {
            const res = await cronGET(request({ authorization }))
            assert.equal(res.status, 401, authorization)
        }
        assert.equal(fake.requests.length, 0)
    })

    it('SIN CRON_SECRET definido deniega aunque la cabecera diga «Bearer undefined»', async () => {
        freeze(HOY_DIA_100)
        delete process.env.CRON_SECRET
        for (const authorization of ['Bearer undefined', 'Bearer ', `Bearer ${SECRETO}`, 'Bearer null']) {
            const res = await cronGET(request({ authorization }))
            assert.equal(res.status, 401, authorization)
        }
        assert.equal(fake.requests.length, 0)
    })

    it('una sesión de administrador NO sustituye al secreto', async () => {
        freeze(HOY_DIA_100)
        fake.setSession({ id: CLIENTE_1, email: 'admin@example.com', app_metadata: { role: 'admin' }, user_metadata: {} })
        const res = await cronGET(request())
        assert.equal(res.status, 401)
        assert.equal(fake.requests.length, 0)
    })

    it('sin clave de servicio válida responde 503 y no borra nada', async () => {
        freeze(HOY_DIA_100)
        process.env.SUPABASE_SERVICE_ROLE_KEY = ''
        const res = await cronGET(authed())
        assert.equal(res.status, 503)
        assert.equal(fake.requests.length, 0)
        assert.equal(fake.storagePaths('documents').length, ALL_FILES.length)
    })

    it('POR DEFECTO SIMULA: no borra ni una foto, no escribe en reservas y deja el resultado registrado', async () => {
        freeze(HOY_DIA_100)
        const res = await cronGET(authed())
        const json = await res.json()
        assert.equal(res.status, 200)
        assert.equal(json.mode, 'simulacion')
        assert.equal(json.recorded, true)
        assert.equal(json.totals.files, 4, 'dos reservas: la carpeta de la reserva y la del titular')

        assert.deepEqual(fake.storagePaths('documents'), [...ALL_FILES].sort(), 'Storage intacto')
        assert.equal(fake.requests.filter(r => r.method === 'DELETE').length, 0)
        assert.deepEqual(fake.writesTo('bookings'), [])
        assert.equal(fake.tables.retention_purge_log.length, 0, 'simular no es una purga: no hay fila de purga')

        const [run] = fake.tables.retention_cron_runs
        assert.ok(run, 'el resultado queda en una tabla, no solo en el log')
        assert.equal(run.mode, 'simulacion')
        assert.equal(run.files_count, 4)
        assert.equal(run.stop_reason, 'completa')
        assert.ok(JSON.stringify(run.detail).includes('second_dni_front_11111111'), 'consta QUÉ se habría borrado')
        assert.ok(!JSON.stringify(run).includes('12345678Z'), 'nunca un dato personal')
        assert.ok(!JSON.stringify(run).includes('ana@example.com'))
    })

    it('cualquier valor de RETENTION_CRON_CONFIRM que no sea «true» sigue simulando', async () => {
        freeze(HOY_DIA_100)
        for (const value of ['', 'false', 'TRUE', '1', 'yes']) {
            process.env.RETENTION_CRON_CONFIRM = value
            const res = await cronGET(authed())
            assert.equal((await res.json()).mode, 'simulacion', JSON.stringify(value))
        }
        assert.equal(fake.storagePaths('documents').length, ALL_FILES.length)
    })

    it('la URL no puede dar permiso de borrar ni ampliar el alcance', async () => {
        freeze(HOY_DIA_100)
        const res = await cronGET(authed(`?confirm=true&bookingId=${B1}&userId=${CLIENTE_1}&limit=500&mode=purga`))
        const json = await res.json()
        assert.equal(json.mode, 'simulacion')
        assert.equal(fake.storagePaths('documents').length, ALL_FILES.length)
    })

    it('con RETENTION_CRON_CONFIRM=true BORRA, y el registro de purgas dice que lo lanzó la tarea (ran_by NULL)', async () => {
        freeze(HOY_DIA_100)
        process.env.RETENTION_CRON_CONFIRM = 'true'
        const res = await cronGET(authed())
        const json = await res.json()
        assert.equal(res.status, 200)
        assert.equal(json.mode, 'purga')
        assert.equal(json.totals.files, 4)
        assert.deepEqual(fake.storagePaths('documents'), [])

        assert.equal(fake.tables.retention_purge_log.length, 1)
        const [log] = fake.tables.retention_purge_log
        assert.equal(log.ran_by, null, 'ninguna persona: la lanzó la tarea')
        assert.equal(log.files_deleted, 4)

        const [run] = fake.tables.retention_cron_runs
        assert.equal(run.mode, 'purga')
        assert.equal(run.files_count, 4)
    })

    it('un administrador a mano sigue dejando su id (la ruta de admin no se ha tocado)', async () => {
        freeze(HOY_DIA_100)
        const { POST } = await import('../app/api/admin/retention/documents/route')
        fake.tables.users.push({ id: '00000000-0000-4000-8000-0000000000aa', role: 'admin' })
        fake.setSession({ id: '00000000-0000-4000-8000-0000000000aa', email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        const res = await POST(new Request('http://localhost/api/admin/retention/documents', { method: 'POST', body: JSON.stringify({ confirm: true }) }))
        assert.equal(res.status, 200)
        assert.equal(fake.tables.retention_purge_log[0].ran_by, '00000000-0000-4000-8000-0000000000aa')
    })

    it('la ruta de admin sigue negando sin sesión, aunque se envíe el secreto de la tarea', async () => {
        freeze(HOY_DIA_100)
        const { POST } = await import('../app/api/admin/retention/documents/route')
        const res = await POST(new Request('http://localhost/api/admin/retention/documents', {
            method: 'POST', headers: { authorization: `Bearer ${SECRETO}` }, body: JSON.stringify({ confirm: true }),
        }))
        assert.equal(res.status, 401)
        assert.equal(fake.storagePaths('documents').length, ALL_FILES.length)
    })

    it('un fallo de la base responde con un mensaje genérico, nunca con error.message', async () => {
        freeze(HOY_DIA_100)
        fake.failures.table = 'bookings'
        fake.failures.method = 'GET'
        const res = await cronGET(authed())
        const text = await res.text()
        assert.equal(res.status, 500)
        assert.ok(!text.includes('fallo simulado'), text)
        assert.ok(!text.includes('XX000'), text)
        assert.match(text, /No se pudo ejecutar la tarea/)
    })

    it('si no se puede guardar el resultado, la tarea no falla y lo dice', async () => {
        freeze(HOY_DIA_100)
        fake.failures.table = 'retention_cron_runs'
        fake.failures.method = 'POST'
        const res = await cronGET(authed())
        const json = await res.json()
        assert.equal(res.status, 200)
        assert.equal(json.recorded, false)
        assert.match(json.recordWarning, /20261115/)
    })

    it('si la purga se niega (falta constancia) responde 409 y no borra nada', async () => {
        freeze(HOY_DIA_100)
        process.env.RETENTION_CRON_CONFIRM = 'true'
        // La base sin la migración 20261110: las reservas no traen las columnas de constancia
        fake.tables.bookings = [
            { id: B1, user_id: CLIENTE_1, status: 'completed', payment_status: 'paid', start_date: '2026-06-03', end_date: '2026-06-10' },
        ]
        const res = await cronGET(authed())
        const json = await res.json()
        assert.equal(res.status, 409)
        assert.equal(json.ok, false)
        assert.equal(json.blocked.code, 'schema_missing')
        assert.ok(json.blocked.missing.length > 0)
        assert.equal(fake.storagePaths('documents').length, ALL_FILES.length)
        assert.equal(fake.tables.retention_cron_runs[0].outcome, 'blocked')
    })
})

describe('Tarea semanal: repetir hasta vaciar la cola, sin girar en vacío', () => {
    beforeEach(quiet)
    afterEach(loud)

    const scripted = (results: RetentionPassResult[]) => {
        const calls: unknown[] = []
        return {
            calls,
            pass: async (_db: unknown, input: unknown) => {
                calls.push(input)
                return results[Math.min(calls.length - 1, results.length - 1)]
            },
        }
    }
    const withBody = (extra: Record<string, unknown>): RetentionPassResult => ({ status: 200, body: { ...PASS_OK.body, ...extra } })

    it('encadena pasadas mientras truncated sea true y puedan avanzar, y para al vaciarse', async () => {
        const s = scripted([PASS_OK, PASS_OK, PASS_OK, withBody({ truncated: false, advanceable: 4, sealed: 4, summary: { files: 8, columns: 0, bookings: 4, holders: 4 } })])
        const result = await runCronRetention({}, { confirm: true, pass: s.pass })
        assert.equal(result.passes, 4)
        assert.equal(result.stopReason, 'completa')
        assert.equal(result.totals.files, 3 * 100 + 8, 'suma de todas las pasadas')
        assert.equal(result.truncated, false)
    })

    it('ATASCADAS: si queda cola pero ninguna puede avanzar, PARA (repetir devolvería siempre las mismas)', async () => {
        const stalled = [{ bookingId: B1, reason: 'no_user' }, { bookingId: B2, reason: 'holder_undatable' }]
        const s = scripted([withBody({ reviewed: 2, truncated: true, advanceable: 0, sealed: 0, summary: { files: 0, columns: 0, bookings: 0, holders: 0 }, stalled, stalledWarning: 'hay atascadas' })])
        const result = await runCronRetention({}, { confirm: true, pass: s.pass })
        assert.equal(result.passes, 1, 'una sola vuelta')
        assert.equal(result.stopReason, 'solo_atascadas')
        assert.equal(result.outcome, 'attention')
        assert.deepEqual(result.stalled, stalled)
        assert.ok(result.warnings.includes('hay atascadas'))
    })

    it('distingue «quedan y avanzarán» de «quedan y están bloqueadas» con la misma respuesta de la ruta', async () => {
        const avanzan = scripted([withBody({ truncated: true, advanceable: 3 }), withBody({ truncated: false, advanceable: 3 })])
        assert.equal((await runCronRetention({}, { confirm: true, pass: avanzan.pass })).passes, 2)
        const bloqueadas = scripted([withBody({ truncated: true, advanceable: 0, stalled: [{ bookingId: B1, reason: 'no_dates' }] })])
        assert.equal((await runCronRetention({}, { confirm: true, pass: bloqueadas.pass })).passes, 1)
    })

    it('para por el TOPE DE VUELTAS aunque siempre diga que puede avanzar', async () => {
        const s = scripted([PASS_OK])
        const result = await runCronRetention({}, { confirm: true, pass: s.pass })
        assert.equal(result.passes, CRON_MAX_PASSES)
        assert.equal(result.stopReason, 'tope_vueltas')
        assert.equal(result.outcome, 'attention')
        const corto = scripted([PASS_OK])
        assert.equal((await runCronRetention({}, { confirm: true, maxPasses: 3, pass: corto.pass })).passes, 3)
    })

    it('para por el TOPE DE TIEMPO antes de empezar una pasada que no cabría', async () => {
        let t = 0
        const result = await runCronRetention({}, {
            confirm: true,
            now: () => t,
            budgetMs: 45_000,
            pass: async () => { t += 20_000; return PASS_OK },
        })
        assert.equal(result.passes, 1, '20 s + 1,5 x 20 s ya pasa de 45 s')
        assert.equal(result.stopReason, 'tope_tiempo')
        assert.equal(result.durationMs, 20_000)
    })

    it('para si una pasada completa no marca ni borra nada (sin_avance), aunque diga poder avanzar', async () => {
        const s = scripted([withBody({ truncated: true, advanceable: 5, sealed: 0, summary: { files: 0, columns: 0, bookings: 0, holders: 0 }, closedByHolder: [] })])
        const result = await runCronRetention({}, { confirm: true, pass: s.pass })
        assert.equal(result.passes, 1)
        assert.equal(result.stopReason, 'sin_avance')
    })

    it('SIMULACIÓN: una sola pasada, porque simular no marca nada y repetir daría siempre las mismas', async () => {
        const s = scripted([withBody({ mode: 'simulacion', sealed: undefined })])
        const result = await runCronRetention({}, { confirm: false, pass: s.pass })
        assert.equal(result.passes, 1)
        assert.equal(result.mode, 'simulacion')
        assert.equal(result.stopReason, 'simulacion_acotada')
        assert.equal((s.calls[0] as { confirm: boolean }).confirm, false, 'la pasada se pide SIN confirm')
        assert.ok(result.warnings.some(w => /Simulación acotada/.test(w)))
    })

    it('una pasada rechazada (409) para el bucle, no cuenta como pasada y explica por qué', async () => {
        const s = scripted([{ status: 409, body: { error: 'No se puede purgar: falta x', missing: ['bookings.legal_data_purged_at'] } }])
        const result = await runCronRetention({}, { confirm: true, pass: s.pass })
        assert.equal(result.passes, 0)
        assert.equal(result.stopReason, 'bloqueada')
        assert.equal(result.outcome, 'blocked')
        assert.deepEqual(result.blocked, { code: 'schema_missing', status: 409, missing: ['bookings.legal_data_purged_at'] })
        const sonda = scripted([{ status: 409, body: { error: 'x', sealProbe: 'failed', sealProbeBookingId: B1 } }])
        const r2 = await runCronRetention({}, { confirm: true, pass: sonda.pass })
        assert.equal(r2.blocked?.code, 'seal_probe_failed')
        assert.equal(r2.blocked?.bookingId, B1)
    })

    it('una excepción para el bucle y NO se filtra su mensaje al resultado', async () => {
        let call = 0
        const result = await runCronRetention({}, {
            confirm: true,
            pass: async () => {
                call++
                if (call === 1) return PASS_OK
                throw new Error('contraseña-de-la-base-en-el-mensaje')
            },
        })
        assert.equal(result.stopReason, 'error')
        assert.equal(result.outcome, 'error')
        assert.equal(result.passes, 1, 'conserva lo que sí se hizo antes de fallar')
        assert.ok(!JSON.stringify(result).includes('contraseña-de-la-base'))
        assert.ok(!JSON.stringify(cronRunRow(result, new Date())).includes('contraseña-de-la-base'))
    })

    it('las atascadas que se repiten pasada tras pasada se cuentan una sola vez', async () => {
        const stalled = [{ bookingId: B1, reason: 'no_user' }]
        const s = scripted([
            withBody({ truncated: true, advanceable: 4, stalled }),
            withBody({ truncated: false, advanceable: 4, stalled }),
        ])
        const result = await runCronRetention({}, { confirm: true, pass: s.pass })
        assert.equal(result.stalledTotal, 1)
        assert.equal(result.outcome, 'attention', 'hay atascadas: alguien tiene que mirarlas')
    })

    it('contra el Supabase simulado: con más candidatas que el tope de pasada, vacía la cola entera', async () => {
        const fake = installFakeSupabase({
            users: [{ id: CLIENTE_1, role: 'customer' }, { id: CLIENTE_2, role: 'customer' }, { id: CLIENTE_3, role: 'customer' }],
            bookings: [vieja(B1, CLIENTE_1), vieja(B2, CLIENTE_2), vieja(B3, CLIENTE_3)],
            retention_purge_log: [],
        })
        mock.timers.enable({ apis: ['Date'], now: new Date(HOY_DIA_100) })
        try {
            fake.seedStorage('documents', [...fotosDe(CLIENTE_1, B1), ...fotosDe(CLIENTE_2, B2), ...fotosDe(CLIENTE_3, B3)])
            const db = getAdminClientOrSession(null)
            // limit 1: cada pasada mira UNA reserva por plazo y dice truncated mientras queden más
            const result = await runCronRetention(db, { confirm: true, limit: 1 })
            assert.equal(result.stopReason, 'completa')
            assert.equal(result.passes, 3, 'una pasada por reserva')
            assert.equal(result.totals.files, 6)
            assert.deepEqual(fake.storagePaths('documents'), [])
            assert.equal(fake.tables.retention_purge_log.length, 3)
            assert.ok(fake.tables.retention_purge_log.every(r => r.ran_by === null), 'las lanzó la tarea')
        } finally {
            mock.timers.reset()
            fake.restore()
        }
    })

    it('contra el Supabase simulado: una reserva sin cliente queda atascada y el bucle TERMINA', async () => {
        const fake = installFakeSupabase({
            users: [{ id: CLIENTE_1, role: 'customer' }],
            bookings: [vieja(B1, CLIENTE_1), vieja(B2, null as unknown as string), vieja(B3, null as unknown as string)],
            retention_purge_log: [],
        })
        mock.timers.enable({ apis: ['Date'], now: new Date(HOY_DIA_100) })
        try {
            fake.seedStorage('documents', fotosDe(CLIENTE_1, B1))
            const db = getAdminClientOrSession(null)
            // limit 2 con 3 candidatas: truncated, y de las 2 revisadas una puede avanzar y otra no
            const result = await runCronRetention(db, { confirm: true, limit: 2 })
            assert.ok(result.passes <= CRON_MAX_PASSES)
            assert.notEqual(result.stopReason, 'tope_vueltas', 'no tiene que agotar las vueltas girando en vacío')
            assert.ok(result.stalledTotal >= 1)
            assert.ok(result.stalled.every(s => s.reason === 'no_user'))
            assert.equal(result.outcome, 'attention')
        } finally {
            mock.timers.reset()
            fake.restore()
        }
    })
})

describe('Tarea semanal: lo que se guarda de cada ejecución', () => {
    it('entriesFromPass: simulación = lo que se borraría; purga = solo lo que se borró', () => {
        const folder = { scope: 'booking_images', bookingId: B1, userId: CLIENTE_1, folder: `${CLIENTE_1}/${B1}`, purgeDay: '2026-09-18', files: ['a.jpg', 'b.jpg', 'c.jpg'], unreadable: false, deleted: 2 }
        const legal = { bookingId: B2, purgeDay: '2029-06-10', columns: ['customer_dni', 'customer_name'], updated: false }
        const unreadable = { ...folder, folder: 'x', unreadable: true }
        const sim = entriesFromPass({ mode: 'simulacion', folders: [folder, unreadable], legal: [legal] })
        assert.equal(sim.length, 2)
        assert.deepEqual(sim[0].items, [`${CLIENTE_1}/${B1}/a.jpg`, `${CLIENTE_1}/${B1}/b.jpg`, `${CLIENTE_1}/${B1}/c.jpg`])
        const purga = entriesFromPass({ mode: 'purga', folders: [folder], legal: [legal] })
        assert.equal(purga.length, 1, 'el dato legal no se actualizó: no se borró')
        assert.equal(purga[0].items.length, 2, 'solo las dos primeras tandas que se borraron')
    })

    it('la fila de registro lleva el modo, los totales y el motivo de parada, sin valores personales', async () => {
        const result = await runCronRetention({}, { confirm: false, pass: async () => ({ status: 200, body: { ...PASS_OK.body, mode: 'simulacion', truncated: false } }) })
        const row = cronRunRow(result, new Date('2026-11-16T03:00:00Z'))
        assert.equal(row.mode, 'simulacion')
        assert.equal(row.ran_at, '2026-11-16T03:00:00.000Z')
        assert.equal(row.stop_reason, 'completa')
        assert.equal(row.files_count, 100)
        assert.equal(row.blocked, null)
    })
})
