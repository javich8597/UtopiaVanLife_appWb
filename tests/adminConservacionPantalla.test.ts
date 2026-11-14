import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { installFakeSupabase } from './helpers/fakeSupabase'
import { GET as historyGET } from '../app/api/admin/retention/history/route'
import { CRON_SCHEDULE_LABEL } from '../lib/admin/retentionCron'
import {
    CRON_OUTCOME,
    CRON_STOP_REASON,
    PURGE_CONFIRM_WORD,
    STALLED_REASON,
    canOfferPurge,
    isPurgeConfirmText,
    parseScopeField,
    plannedTotal,
    stalledReasonText,
    type RetentionReport,
} from '../lib/admin/retentionView'

/**
 * PANTALLA /admin/conservacion y su historial.
 *
 * Lo que se comprueba: las decisiones puras de la pantalla (cuándo se ofrece el borrado, qué hay que
 * escribir para confirmarlo, qué se dice de cada atascada), la ruta de historial con el Supabase
 * simulado, y propiedades del código fuente que las reglas del proyecto exigen (sin estilos en línea
 * de maquetación, sin colores sueltos, bloqueo de scroll en el modal, un único sitio que envía
 * `confirm: true`).
 *
 * Lo que NO prueba: cómo se ve. No se abrió el navegador (sin vista previa): tema claro y oscuro,
 * 375 px y 1280 px, la hoja inferior del modal y el foco están SIN VERIFICAR.
 */

const CLIENT = readFileSync('app/[locale]/admin/conservacion/RetentionClient.tsx', 'utf8')
const PAGE = readFileSync('app/[locale]/admin/conservacion/page.tsx', 'utf8')

const report = (extra: Partial<RetentionReport> = {}): RetentionReport => ({
    mode: 'simulacion',
    policy: { imageRetentionDays: 100, legalRetentionYears: 3, today: '2026-11-14' },
    scope: { bookingId: null, userId: null, limit: 50, truncated: false, reviewed: 2, holderFolders: true },
    schema: { ready: true, columnsReady: true, verified: true, missing: [] },
    reviewed: 2,
    truncated: false,
    advanceable: 2,
    summary: { files: 4, columns: 0, bookings: 2, holders: 2 },
    folders: [], legal: [], skipped: [], stalled: [], stalledReasons: {},
    ...extra,
})

describe('Pantalla de conservación: cuándo se ofrece el borrado', () => {
    it('solo desde una simulación con algo que borrar y con la constancia posible', () => {
        assert.deepEqual(canOfferPurge(report(), false), { ok: true, reason: null })
    })

    it('no se ofrece sin simulación, ocupada, ni sobre el resultado de una purga', () => {
        assert.equal(canOfferPurge(null, false).ok, false)
        assert.equal(canOfferPurge(report(), true).ok, false)
        assert.equal(canOfferPurge(report({ mode: 'purga' }), false).ok, false)
    })

    it('no se ofrece si no hay nada que borrar', () => {
        const empty = report({ summary: { files: 0, columns: 0, bookings: 0, holders: 0 } })
        const offer = canOfferPurge(empty, false)
        assert.equal(offer.ok, false)
        assert.match(offer.reason!, /nada que borrar/)
        assert.equal(plannedTotal(empty), 0)
        assert.equal(plannedTotal(null), 0)
    })

    it('no se ofrece sin la migración, y dice cuál es la carencia', () => {
        const offer = canOfferPurge(report({ schema: { ready: false, columnsReady: false, verified: true, missing: ['bookings.identity_images_reviewed_at', 'la tabla retention_purge_log'] } }), false)
        assert.equal(offer.ok, false)
        assert.match(offer.reason!, /retention_purge_log/)
        assert.match(offer.reason!, /Sin constancia no se borra/)
    })

    it('el borrado se confirma escribiendo una palabra, no con un interruptor', () => {
        assert.equal(PURGE_CONFIRM_WORD, 'BORRAR')
        assert.equal(isPurgeConfirmText('BORRAR'), true)
        assert.equal(isPurgeConfirmText('  BORRAR '), true)
        for (const bad of ['', 'borrar', 'Borrar', 'BORRA', 'BORRAR!', 'si', 'true']) assert.equal(isPurgeConfirmText(bad), false, bad)
    })
})

describe('Pantalla de conservación: alcance y atascadas', () => {
    it('el alcance vacío es «sin filtro» y lo que no es un UUID se rechaza', () => {
        assert.deepEqual(parseScopeField(''), { ok: true, value: null })
        assert.deepEqual(parseScopeField('   '), { ok: true, value: null })
        assert.deepEqual(parseScopeField(' 3F2A9C1E-5B7D-4E2A-9C61-0A1B2C3D4E5F '), { ok: true, value: '3f2a9c1e-5b7d-4e2a-9c61-0a1b2c3d4e5f' })
        for (const bad of ['abc', '12345', '3f2a9c1e', '../etc/passwd', "' or 1=1 --"]) assert.deepEqual(parseScopeField(bad), { ok: false }, bad)
    })

    it('cada motivo de «atascada» que produce la purga tiene su texto y qué hacer', () => {
        const source = readFileSync('lib/admin/retentionPass.ts', 'utf8')
        const emitted = new Set<string>()
        for (const match of source.matchAll(/note\(row, plan, '([a-z_]+)'/g)) emitted.add(match[1])
        for (const match of source.matchAll(/reason: '(holder_undatable)'/g)) emitted.add(match[1])
        assert.ok(emitted.size >= 4, [...emitted].join(','))
        for (const reason of emitted) {
            assert.ok(STALLED_REASON[reason], `falta el texto de «${reason}»`)
            assert.ok(STALLED_REASON[reason].fix.length > 20)
        }
        assert.match(stalledReasonText('motivo_nuevo').fix, /revísala a mano/)
    })

    it('cada motivo de parada de la tarea y cada resultado tienen texto', () => {
        const source = readFileSync('lib/admin/retentionCron.ts', 'utf8')
        const union = /export type CronStopReason =([\s\S]*?)\nexport interface/.exec(source)![1]
        for (const match of union.matchAll(/'([a-z_]+)'/g)) assert.ok(CRON_STOP_REASON[match[1]], `falta el texto de «${match[1]}»`)
        for (const outcome of ['ok', 'attention', 'blocked', 'error']) assert.ok(CRON_OUTCOME[outcome])
    })
})

describe('Pantalla de conservación: reglas del proyecto sobre el código', () => {
    it('ningún estilo en línea de maquetación (AGENTS.md, regla 1)', () => {
        assert.doesNotMatch(CLIENT, /style=\{\{/, 'ni un style={{ }}')
        assert.doesNotMatch(CLIENT, /style="/)
        assert.doesNotMatch(PAGE, /style=\{\{/)
    })

    it('colores solo con tokens --adm-*: ningún hexadecimal ni rgb() suelto', () => {
        assert.doesNotMatch(CLIENT, /#[0-9a-fA-F]{3,8}\b/)
        assert.doesNotMatch(CLIENT, /\brgba?\(/)
        assert.ok((CLIENT.match(/var\(--adm-/g) || []).length > 20)
    })

    it('el modal bloquea el scroll del fondo y se cierra con Escape', () => {
        assert.match(CLIENT, /useBodyScrollLock\(modalStep !== 0\)/)
        assert.match(CLIENT, /e\.key === 'Escape'/)
        assert.match(CLIENT, /role="dialog"/)
        assert.match(CLIENT, /aria-modal="true"/)
    })

    it('breakpoints 860 y 640, hoja inferior y botones de 44 px en móvil', () => {
        assert.match(CLIENT, /@media \(max-width: 860px\)/)
        assert.match(CLIENT, /@media \(max-width: 640px\)/)
        assert.match(CLIENT, /align-items: flex-end/, 'hoja inferior')
        assert.match(CLIENT, /min-height: 44px/)
        assert.match(CLIENT, /env\(safe-area-inset-bottom/)
        assert.match(CLIENT, /adm-table--cards/, 'tablas convertidas en tarjetas en móvil')
    })

    it('usa AdminPageHeader y las clases compartidas adm-*', () => {
        assert.match(PAGE, /AdminPageHeader/)
        for (const cls of ['adm-page', 'adm-card', 'adm-btn', 'adm-tabs', 'adm-chip', 'adm-table--cards']) {
            assert.ok(CLIENT.includes(cls) || PAGE.includes(cls), cls)
        }
    })

    it('la simulación es la vista por defecto: la llamada inicial NO lleva confirm', () => {
        // `confirm: true` aparece en UN solo sitio (el segundo paso del modal) y la simulación que se
        // lanza al entrar construye su cuerpo sin él
        assert.equal((CLIENT.match(/confirm: true/g) || []).length, 1)
        const simulation = CLIENT.slice(CLIENT.indexOf('const runSimulation'), CLIENT.indexOf('const loadHistory'))
        assert.doesNotMatch(simulation, /confirm/)
        const purge = CLIENT.slice(CLIENT.indexOf('const executePurge'), CLIENT.indexOf('const loadDetail'))
        assert.match(purge, /isPurgeConfirmText\(confirmText\)/)
        assert.match(purge, /offer\.ok/)
        assert.match(CLIENT, /void runSimulation\(\)\n\s+void loadHistory\(\)/, 'al montar: simular y cargar historial')
    })

    it('un fallo del borrado se enseña y nunca se da por hecho', () => {
        const purge = CLIENT.slice(CLIENT.indexOf('const executePurge'), CLIENT.indexOf('const loadDetail'))
        assert.match(purge, /result\.ok && result\.data\?\.mode === 'purga'/)
        assert.match(purge, /setPurgeError\(apiErrorMessage\(result\)\)/)
        assert.match(CLIENT, /El borrado no se ha completado/)
    })

    it('enseña todos los avisos de la respuesta, y el mensaje de falta de migración tal cual', () => {
        for (const key of ['sealProbe', 'sealFailed', 'sealWarning', 'truncatedWarning', 'stalledWarning', 'reviewedWarning', 'reviewedOnly', 'logWarning', 'closedByHolder']) {
            assert.ok(CLIENT.includes(`.${key}`) || CLIENT.includes(`${key}`), key)
        }
        assert.match(CLIENT, /sim\.hint/, 'el hint con la migración que falta, sin reescribir')
        assert.match(CLIENT, /sim\.schema\.missing/)
        assert.match(CLIENT, /body\.error/, 'el error de la API (el 409 incluido) se muestra tal cual')
    })

    it('lista las atascadas con su motivo y las revisadas sin purgar', () => {
        assert.match(CLIENT, /sim\.stalled/)
        assert.match(CLIENT, /stalledReasonText\(/)
        assert.match(CLIENT, /purgeResult\.reviewedOnly/)
        assert.match(CLIENT, /Atascadas: hay que arreglarlas a mano/)
    })

    it('tiene estados de carga, vacío y error', () => {
        assert.match(CLIENT, /Simulando: leyendo/)
        assert.match(CLIENT, /No hay nada que borrar ahora mismo/)
        assert.match(CLIENT, /No se ha podido simular/)
        assert.match(CLIENT, /Cargando el historial/)
        assert.match(CLIENT, /Todavía no se ha purgado nada/)
        assert.match(CLIENT, /No se ha podido cargar el historial/)
    })

    it('el panel enlaza la pantalla y la ruta de historial exige administrador', () => {
        assert.match(readFileSync('app/[locale]/admin/AdminNavClient.tsx', 'utf8'), /href: '\/admin\/conservacion'/)
        const route = readFileSync('app/api/admin/retention/history/route.ts', 'utf8')
        assert.match(route, /requireAdmin\(\)/)
        assert.doesNotMatch(route, /NextResponse\.json\([^)]*error\.message/)
    })

    it('la ruta de administrador de la purga sigue exigiendo requireAdmin() y no conoce el secreto de la tarea', () => {
        const route = readFileSync('app/api/admin/retention/documents/route.ts', 'utf8')
        assert.match(route, /await requireAdmin\(\)/)
        assert.doesNotMatch(route, /CRON_SECRET|retentionCron|isCronAuthorized/)
    })
})

describe('Tarea semanal: vercel.json y la migración del registro', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'))

    it('hay UN cron, semanal, sobre una ruta que existe', () => {
        assert.equal(vercel.crons.length, 1)
        const [cron] = vercel.crons
        assert.equal(cron.path, '/api/cron/retention/documents')
        assert.ok(existsSync(`app${cron.path}/route.ts`), 'la ruta existe')
        const [minute, hour, dayOfMonth, month, dayOfWeek] = cron.schedule.split(' ')
        assert.equal(dayOfMonth, '*')
        assert.equal(month, '*')
        assert.match(dayOfWeek, /^[0-6]$/, 'un día concreto de la semana: una vez por semana')
        assert.equal(minute, '0')
        // Vercel Cron va en UTC: de 02:00 a 04:00 UTC es madrugada en España en invierno y en verano
        assert.ok(Number(hour) >= 2 && Number(hour) <= 4, `hora UTC ${hour}`)
    })

    it('el texto que enseña el panel dice lo mismo que vercel.json', () => {
        const [, hour, , , dayOfWeek] = vercel.crons[0].schedule.split(' ')
        assert.match(CRON_SCHEDULE_LABEL, new RegExp(`${hour.padStart(2, '0')}:00 UTC`))
        const day = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][Number(dayOfWeek)]
        assert.match(CRON_SCHEDULE_LABEL, new RegExp(day))
    })

    it('vercel.json no pone ninguna variable ni secreto', () => {
        assert.deepEqual(Object.keys(vercel).sort(), ['$schema', 'crons'])
    })

    it('la migración del registro: RLS, solo lectura para el admin y sin política de escritura', () => {
        const sql = readFileSync('supabase/migrations/20261115_retention_cron_runs.sql', 'utf8')
        assert.match(sql, /Estado: PREPARADA, SIN APLICAR/)
        assert.match(sql, /ENABLE ROW LEVEL SECURITY/)
        assert.match(sql, /FOR SELECT TO authenticated\s+USING \(public\.is_admin\(\)\)/)
        assert.doesNotMatch(sql, /CREATE POLICY[^;]*FOR (INSERT|UPDATE|DELETE|ALL)/i, 'solo escribe la tarea, con service_role')
        assert.match(sql, /CHECK \(mode IN \('simulacion', 'purga'\)\)/)
        assert.doesNotMatch(sql, /\bcustomer_(name|email|dni|phone)\b/, 'ninguna columna de dato personal')
    })

    it('las columnas que escribe la tarea existen en la migración', () => {
        const sql = readFileSync('supabase/migrations/20261115_retention_cron_runs.sql', 'utf8')
        const code = readFileSync('lib/admin/retentionCron.ts', 'utf8')
        const row = /export function cronRunRow[\s\S]*?return \{([\s\S]*?)\n  \}\n\}/.exec(code)![1]
        const columns = [...row.matchAll(/^\s+([a-z_]+):/gm)].map(m => m[1])
        assert.ok(columns.length >= 20)
        for (const column of columns) assert.match(sql, new RegExp(`\\b${column}\\b`), `la migración no tiene «${column}»`)
    })

    it('la migración 20261110 no se ha tocado: la tarea no le exige ninguna columna nueva', () => {
        const sql = readFileSync('supabase/migrations/20261110_document_retention_policy.sql', 'utf8')
        assert.doesNotMatch(sql, /retention_cron_runs|ran_via|CRON_SECRET/)
    })
})

describe('Historial de conservación: GET /api/admin/retention/history', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const ADMIN = '00000000-0000-4000-8000-0000000000aa'
    const CLIENTE = '00000000-0000-4000-8000-0000000000c1'
    const silenced = { error: console.error, info: console.info, warn: console.warn }
    const previous = { secret: process.env.CRON_SECRET, confirm: process.env.RETENTION_CRON_CONFIRM }

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN, role: 'admin', full_name: 'Javier Admin' }, { id: CLIENTE, role: 'customer' }],
            retention_purge_log: [
                { id: 'p1', ran_at: '2026-11-10T10:00:00Z', ran_by: ADMIN, files_deleted: 3, detail: [{ scope: 'booking_images', items: ['a/b.jpg'] }] },
                { id: 'p2', ran_at: '2026-11-17T03:00:00Z', ran_by: null, files_deleted: 1, detail: [] },
            ],
            retention_cron_runs: [{ id: 'c1', ran_at: '2026-11-17T03:00:00Z', mode: 'simulacion', outcome: 'ok', detail: [{ scope: 'booking_images', items: ['x/y.jpg'] }] }],
        })
        fake.setSession({ id: ADMIN, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        console.error = () => {}
        console.info = () => {}
        delete process.env.CRON_SECRET
        delete process.env.RETENTION_CRON_CONFIRM
    })
    afterEach(() => {
        fake.restore()
        Object.assign(console, silenced)
        if (previous.secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous.secret
        if (previous.confirm === undefined) delete process.env.RETENTION_CRON_CONFIRM; else process.env.RETENTION_CRON_CONFIRM = previous.confirm
    })

    const get = async (query = '') => {
        const res = await historyGET(new Request(`http://localhost/api/admin/retention/history${query}`))
        const text = await res.text()
        return { status: res.status, json: JSON.parse(text) as any, text }
    }

    it('sin sesión 401 y con sesión de cliente 403', async () => {
        fake.setSession(null)
        assert.equal((await get()).status, 401)
        fake.setSession({ id: CLIENTE, email: 'ana@example.com', app_metadata: {}, user_metadata: {} })
        assert.equal((await get()).status, 403)
    })

    it('devuelve el estado de la tarea, las purgas, las ejecuciones y el nombre de quien lanzó cada purga a mano', async () => {
        const { status, json } = await get()
        assert.equal(status, 200)
        assert.equal(json.task.mode, 'simulacion', 'sin RETENTION_CRON_CONFIRM la tarea solo simula')
        assert.equal(json.task.secretConfigured, false, 'sin CRON_SECRET se avisa de que la tarea no correrá')
        assert.equal(json.purges.status, 'ok')
        assert.equal(json.purges.rows.length, 2)
        assert.equal(json.admins[ADMIN], 'Javier Admin')
        assert.equal(json.purges.rows.find((r: any) => r.id === 'p2').ran_by, null, 'la tarea programada = ran_by NULL')
        assert.equal(json.cronRuns.rows.length, 1)
        // El fake de PostgREST devuelve la fila entera, así que esto se comprueba sobre la consulta
        const route = readFileSync('app/api/admin/retention/history/route.ts', 'utf8')
        for (const constant of ['PURGE_COLUMNS', 'CRON_COLUMNS']) {
            const start = route.indexOf(`const ${constant} =`)
            const columns = /'([^']+)'/.exec(route.slice(start))![1]
            assert.ok(columns.includes('ran_at'), `${constant} se ha localizado`)
            assert.ok(!/\bdetail\b/.test(columns), `${constant} no trae el detalle: se pide aparte`)
        }
    })

    it('refleja el modo y el secreto configurados, sin devolver ningún valor', async () => {
        process.env.CRON_SECRET = 'un-secreto-largo-de-prueba-123'
        process.env.RETENTION_CRON_CONFIRM = 'true'
        const { json, text } = await get()
        assert.equal(json.task.mode, 'purga')
        assert.equal(json.task.secretConfigured, true)
        assert.ok(!text.includes('un-secreto-largo'))
    })

    it('el detalle se pide por tipo e id y valida el UUID', async () => {
        assert.equal((await get('?kind=cron&id=no-es-uuid')).status, 400)
        assert.equal((await get('?kind=otra&id=11111111-aaaa-4bbb-8ccc-111111111111')).status, 400)
    })

    it('un fallo de lectura se marca como error y no filtra el mensaje de la base', async () => {
        fake.failures.table = 'retention_cron_runs'
        fake.failures.method = 'GET'
        const { status, json, text } = await get()
        assert.equal(status, 200)
        assert.equal(json.cronRuns.status, 'error')
        assert.equal(json.purges.status, 'ok', 'lo demás sigue funcionando')
        assert.ok(!text.includes('fallo simulado'))
    })
})
