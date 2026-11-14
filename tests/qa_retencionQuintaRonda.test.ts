import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import {
    CRON_MAX_DETAIL_ENTRIES,
    CRON_MAX_PASSES,
    CRON_MIN_SECRET_LENGTH,
    CRON_TIME_BUDGET_MS,
    isCronAuthorized,
    runCronRetention,
} from '../lib/admin/retentionCron'
import type { RetentionPassResult } from '../lib/admin/retentionPass'
import type { RetentionReport } from '../lib/admin/retentionView'
import RetentionClient from '../app/[locale]/admin/conservacion/RetentionClient'

/**
 * QUINTA RONDA (qa-verificador, 2026-11-14): la tarea semanal de purga y su pantalla.
 *
 * Esto NO repite lo que ya miden las cuatro rondas anteriores sobre el núcleo de la purga
 * (`tests/qa_retencion*.test.ts`, que siguen valiendo tras mover el cuerpo a
 * `lib/admin/retentionPass.ts`). Cubre lo que el barrido de mutaciones de esta ronda encontró sin
 * medir:
 *
 *   - los tres topes de la tarea (10 pasadas, 45 s, 16 caracteres de secreto) se recorrían desde la
 *     propia constante, así que subirlos no ponía rojo ningún test;
 *   - el tope de entradas de detalle y el aviso de «falta la migración» no tenían ningún test;
 *   - una atascada con DOS motivos en la misma reserva se contaba una sola vez sin que nada lo viera;
 *   - al mover el núcleo, la validación de `bookingId` y el acotado de `limit` se quedaron en la ruta
 *     del administrador y allí nadie los probaba;
 *   - la pantalla solo estaba comprobada por `grep` sobre su código: aquí se RENDERIZA en servidor
 *     con el estado sembrado, que es lo que distingue «el texto está en el archivo» de «la pantalla
 *     lo enseña».
 *
 * Lo que sigue SIN VERIFICAR, y ningún test de este archivo lo cubre: cómo se ve (no se abrió el
 * navegador), el bloqueo de scroll real, el foco del modal, 375 px y 1280 px, el tema claro y
 * oscuro, y la guarda de `executePurge` (solo se puede disparar con un clic de verdad).
 */

const B1 = '11111111-aaaa-4bbb-8ccc-111111111111'
const B2 = '22222222-aaaa-4bbb-8ccc-222222222222'
const CLIENTE_1 = '00000000-0000-4000-8000-0000000000c1'
const ADMIN = '00000000-0000-4000-8000-0000000000aa'

const silenced = { error: console.error, info: console.info, warn: console.warn }
const quiet = () => { console.error = () => {}; console.info = () => {}; console.warn = () => {} }
const loud = () => Object.assign(console, silenced)

/* -------------------------------------------------------------------------- */
/* 1. Los topes de la tarea, escritos aquí y no recorridos desde la constante   */
/* -------------------------------------------------------------------------- */

const passBody = (extra: Record<string, unknown> = {}): RetentionPassResult => ({
    status: 200,
    body: {
        mode: 'purga', reviewed: 50, truncated: true, advanceable: 50, sealed: 50,
        summary: { files: 100, columns: 0, bookings: 50, holders: 50 },
        folders: [], legal: [], stalled: [], closedByHolder: [],
        ...extra,
    },
})

describe('5ª ronda: los topes de la tarea semanal están medidos', () => {
    beforeEach(quiet)
    afterEach(loud)

    it('el tope de vueltas es 10, y con los valores por defecto se dan exactamente 10 pasadas', async () => {
        assert.equal(CRON_MAX_PASSES, 10)
        let calls = 0
        const result = await runCronRetention({}, {
            confirm: true,
            pass: async () => { calls++; return passBody() },
        })
        assert.equal(calls, 10, 'ni una pasada más que el tope')
        assert.equal(result.passes, 10)
        assert.equal(result.stopReason, 'tope_vueltas')
    })

    it('el presupuesto de tiempo por defecto es 45 s y frena la segunda pasada de 20 s', async () => {
        assert.equal(CRON_TIME_BUDGET_MS, 45_000)
        let t = 0
        // Sin `budgetMs`: se usa el de producción. 20 s + 1,5 x 20 s = 50 s > 45 s
        const result = await runCronRetention({}, {
            confirm: true,
            now: () => t,
            pass: async () => { t += 20_000; return passBody() },
        })
        assert.equal(result.passes, 1)
        assert.equal(result.stopReason, 'tope_tiempo')
    })

    it('un secreto de 15 caracteres se deniega y uno de 16 se acepta', () => {
        assert.equal(CRON_MIN_SECRET_LENGTH, 16)
        const quince = '0123456789abcde'
        const dieciseis = '0123456789abcdef'
        assert.equal(quince.length, 15)
        assert.equal(dieciseis.length, 16)
        assert.equal(isCronAuthorized(`Bearer ${quince}`, { CRON_SECRET: quince }), false, '15 caracteres no bastan')
        assert.equal(isCronAuthorized(`Bearer ${dieciseis}`, { CRON_SECRET: dieciseis }), true)
    })

    it('el detalle guardado se corta en 300 entradas y lo dice', async () => {
        assert.equal(CRON_MAX_DETAIL_ENTRIES, 300)
        const folders = Array.from({ length: 200 }, (_, i) => ({
            scope: 'booking_images', bookingId: `${i}`, userId: CLIENTE_1,
            folder: `${CLIENTE_1}/${i}`, purgeDay: '2026-09-18',
            files: ['dni_front.jpg'], unreadable: false, deleted: 1,
        }))
        let call = 0
        const result = await runCronRetention({}, {
            confirm: true,
            pass: async () => {
                call++
                return passBody({ folders, truncated: call < 3 })
            },
        })
        assert.equal(result.passes, 3)
        assert.equal(result.entries.length, CRON_MAX_DETAIL_ENTRIES, 'no se guarda detalle sin tope')
        assert.equal(result.entriesTruncated, true, 'y consta que se ha recortado')
    })

    it('cuando la pasada se niega por falta de columnas, el aviso nombra la migración y la columna', async () => {
        const result = await runCronRetention({}, {
            confirm: true,
            pass: async () => ({
                status: 409,
                body: { error: 'falta constancia', missing: ['bookings.identity_images_reviewed_at'] },
            }),
        })
        assert.equal(result.outcome, 'blocked')
        const aviso = result.warnings.join(' | ')
        assert.match(aviso, /identity_images_reviewed_at/)
        assert.match(aviso, /20261110_document_retention_policy\.sql/)
        assert.deepEqual(result.schemaMissing, ['bookings.identity_images_reviewed_at'])
    })

    it('la MISMA reserva atascada por dos motivos distintos cuenta dos veces', async () => {
        const result = await runCronRetention({}, {
            confirm: true,
            pass: async () => passBody({
                truncated: true,
                advanceable: 0,
                stalled: [{ bookingId: B1, reason: 'no_user' }, { bookingId: B1, reason: 'no_dates' }],
            }),
        })
        assert.equal(result.stopReason, 'solo_atascadas')
        assert.equal(result.stalledTotal, 2, 'los dos motivos de la misma reserva hay que arreglarlos los dos')
        assert.deepEqual(result.stalled.map(s => s.reason).sort(), ['no_dates', 'no_user'])
    })
})

/* -------------------------------------------------------------------------- */
/* 1 bis. La cola, contra el Supabase simulado: una atascada antigua la bloquea  */
/* -------------------------------------------------------------------------- */

describe('5ª ronda: atascadas en la cabeza de la cola (límite conocido)', () => {
    const audit = {
        identity_images_reviewed_at: null, identity_images_purged_at: null,
        identity_images_purged_count: null, legal_data_purged_at: null,
    }
    const vencida = (id: string, user: string | null, endDate: string): Row => ({
        id, user_id: user, status: 'completed', payment_status: 'paid',
        start_date: '2026-06-01', end_date: endDate,
        customer_name: 'Ana Pérez', customer_email: 'ana@example.com', customer_dni: '12345678Z',
        customer_phone: '600000000', customer_address: 'Calle Mayor 1', total_price: 1200, ...audit,
    })
    const ATASCADA_1 = 'aaaaaaaa-aaaa-4bbb-8ccc-aaaaaaaaaaaa'
    const ATASCADA_2 = 'bbbbbbbb-aaaa-4bbb-8ccc-bbbbbbbbbbbb'
    const PURGABLE = 'cccccccc-aaaa-4bbb-8ccc-cccccccccccc'
    const FOTOS = [
        `${CLIENTE_1}/${PURGABLE}/second_dni_front_1.jpg`,
        `${CLIENTE_1}/dni_front_2.jpg`,
    ]

    /**
     * Las reservas que NUNCA se pueden marcar (aquí, sin `user_id`) ocupan la cabeza de la cola de
     * candidatas en todas las pasadas: `advanceable` vale 0 y la tarea para, así que lo que viene
     * detrás NO se purga esta semana ni ninguna otra hasta que alguien arregle las de delante.
     *
     * En la base real la cabeza de la cola la deciden `end_date.asc,id.asc` (el orden de la consulta,
     * fijado en `qa_retencionDocumentacion.test.ts`), así que las atascadas más ANTIGUAS son
     * precisamente las que se ponen delante. El Supabase simulado no ordena: aquí la cabeza es el
     * orden en que se siembran las filas, que es el que reproduce ese caso.
     *
     * Falla cerrado (no borra de más), pero el plazo de 100 días deja de cumplirse para lo que queda
     * detrás, y el único rastro es el aviso de la ejecución. Si algún día se pagina o se saltan las
     * atascadas, este test se pondrá rojo: entonces hay que cambiarlo a propósito.
     */
    it('dos reservas sin cliente, las más antiguas, dejan sin purgar a las de detrás', async () => {
        const fake = installFakeSupabase({
            users: [{ id: CLIENTE_1, role: 'customer' }],
            bookings: [
                vencida(ATASCADA_1, null, '2026-06-01'),
                vencida(ATASCADA_2, null, '2026-06-02'),
                vencida(PURGABLE, CLIENTE_1, '2026-06-05'),
            ],
            retention_purge_log: [],
        })
        mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-18T10:00:00Z') })
        quiet()
        try {
            fake.seedStorage('documents', FOTOS)
            const { getAdminClientOrSession } = await import('../lib/admin/auth')
            const db = getAdminClientOrSession(null)
            const result = await runCronRetention(db, { confirm: true, limit: 2 })

            assert.equal(result.passes, 1, 'no gira en vacío')
            assert.equal(result.stopReason, 'solo_atascadas')
            assert.equal(result.truncated, true, 'queda cola por ver')
            assert.equal(result.advanceable, 0)
            assert.equal(result.stalledTotal, 2)
            assert.equal(result.totals.files, 0)
            assert.equal(fake.tables.retention_purge_log.length, 0, 'no hay nada que registrar')
            assert.deepEqual(fake.storagePaths('documents'), [...FOTOS].sort(),
                'LÍMITE CONOCIDO: la reserva purgable de detrás conserva sus fotos pasados los 100 días')
            assert.match(result.warnings.join(' | '), /hay que resolver a mano las atascadas/i)
        } finally {
            mock.timers.reset()
            fake.restore()
            loud()
        }
    })

    it('sin atascadas delante, la misma cola se vacía en pasadas sucesivas', async () => {
        const fake = installFakeSupabase({
            users: [{ id: CLIENTE_1, role: 'customer' }],
            bookings: [
                vencida(PURGABLE, CLIENTE_1, '2026-06-05'),
                vencida(ATASCADA_1, CLIENTE_1, '2026-06-01'),
                vencida(ATASCADA_2, CLIENTE_1, '2026-06-02'),
            ],
            retention_purge_log: [],
        })
        mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-18T10:00:00Z') })
        quiet()
        try {
            fake.seedStorage('documents', FOTOS)
            const { getAdminClientOrSession } = await import('../lib/admin/auth')
            const db = getAdminClientOrSession(null)
            const result = await runCronRetention(db, { confirm: true, limit: 1 })
            assert.equal(result.stopReason, 'completa')
            assert.ok(result.passes >= 2, `pasadas: ${result.passes}`)
            assert.equal(result.stalledTotal, 0)
            assert.deepEqual(fake.storagePaths('documents'), [], 'la cola se vacía de verdad')
        } finally {
            mock.timers.reset()
            fake.restore()
            loud()
        }
    })
})

/* -------------------------------------------------------------------------- */
/* 2. Lo que se quedó en la ruta del administrador al mover el núcleo           */
/* -------------------------------------------------------------------------- */

describe('5ª ronda: la ruta de admin sigue validando lo que el núcleo ya no valida', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const booking = (id: string): Row => ({
        id, user_id: CLIENTE_1, status: 'completed', payment_status: 'paid',
        start_date: '2026-06-03', end_date: '2026-06-10',
        identity_images_reviewed_at: null, identity_images_purged_at: null,
        identity_images_purged_count: null, legal_data_purged_at: null,
    })

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN, role: 'admin' }, { id: CLIENTE_1, role: 'customer' }],
            bookings: [booking(B1), booking(B2)],
            retention_purge_log: [],
        })
        fake.setSession({ id: ADMIN, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        quiet()
    })
    afterEach(() => { fake.restore(); loud() })

    const post = async (body: unknown) => {
        const { POST } = await import('../app/api/admin/retention/documents/route')
        const res = await POST(new Request('http://localhost/api/admin/retention/documents', {
            method: 'POST', body: JSON.stringify(body),
        }))
        const text = await res.text()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { status: res.status, json: JSON.parse(text) as any }
    }
    const bookingReads = () => fake.requests.filter(r => r.path === '/rest/v1/bookings')

    it('un bookingId que no es UUID se rechaza con 400 y no se consulta ninguna reserva', async () => {
        for (const bad of ['no-es-uuid', '11111111', `${B1} or 1=1`, '../../etc', '11111111-aaaa-4bbb-8ccc-11111111111']) {
            const { status, json } = await post({ bookingId: bad })
            assert.equal(status, 400, bad)
            assert.match(json.error, /Reserva no válida/)
        }
        assert.deepEqual(bookingReads(), [], 'ni una lectura de bookings con un id inventado')
    })

    it('el tope de reservas por plazo se acota entre 1 y 500', async () => {
        assert.equal((await post({})).json.scope.limit, 50, 'sin limit, el de por defecto')
        assert.equal((await post({ limit: 9999 })).json.scope.limit, 500, 'no se puede pedir media base')
        assert.equal((await post({ limit: -3 })).json.scope.limit, 1)
        assert.equal((await post({ limit: 0 })).json.scope.limit, 50, '0 no es un tope: vale el de por defecto')
        assert.equal((await post({ limit: 'muchas' })).json.scope.limit, 50)
        assert.equal((await post({ limit: 120 })).json.scope.limit, 120)
    })
})

/* -------------------------------------------------------------------------- */
/* 3. La pantalla, renderizada en servidor con el estado sembrado               */
/* -------------------------------------------------------------------------- */

/**
 * `RetentionClient` no recibe props: su estado sale de `fetch` dentro de `useEffect`, que en el
 * render de servidor no corre. Para ver la pantalla CON datos se siembra el estado interceptando
 * `useState` por orden de declaración. Si alguien añade, quita o reordena un `useState` del
 * componente, el primer test de este bloque se pone rojo y dice qué revisar: no se queda en verde
 * midiendo otra cosa.
 */
const STATE_ORDER = [
    'bookingField', 'userField', 'scopeError',
    'sim', 'simAt', 'simError', 'simLoading',
    'purging', 'purgeResult', 'purgeError', 'modalStep', 'confirmText',
    'history', 'historyError', 'historyLoading', 'tab', 'details',
] as const

type StateName = (typeof STATE_ORDER)[number]

type UseStateFn = (initial: unknown) => [unknown, unknown]
/** El módulo de React, para poder sustituir `useState` mientras dura un render */
const reactModule = React as unknown as { useState: UseStateFn }

function renderClient(seed: Partial<Record<StateName, unknown>> = {}): { html: string; states: number } {
    const original = reactModule.useState
    let i = 0
    reactModule.useState = (initial: unknown) => {
        const name: StateName | undefined = STATE_ORDER[i]
        i++
        return original(name && name in seed ? seed[name] : initial)
    }
    try {
        const html = renderToStaticMarkup(React.createElement(RetentionClient))
        return { html, states: i }
    } finally {
        reactModule.useState = original
    }
}

/** La etiqueta `<button …>` que contiene ese texto, para poder mirar si está deshabilitada */
function buttonWith(html: string, label: string): string {
    const at = html.indexOf(label)
    assert.notEqual(at, -1, `la pantalla no enseña «${label}»`)
    const open = html.lastIndexOf('<button', at)
    assert.notEqual(open, -1, `«${label}» no está dentro de un botón`)
    return html.slice(open, html.indexOf('>', open) + 1)
}

const report = (extra: Partial<RetentionReport> = {}): RetentionReport => ({
    mode: 'simulacion',
    policy: { imageRetentionDays: 100, legalRetentionYears: 3, today: '2026-11-14' },
    scope: { bookingId: null, userId: null, limit: 50, truncated: false, reviewed: 2, holderFolders: true },
    schema: { ready: true, columnsReady: true, verified: true, missing: [] },
    reviewed: 2,
    truncated: false,
    advanceable: 2,
    summary: { files: 4, columns: 2, bookings: 2, holders: 1 },
    folders: [{
        scope: 'booking_images', bookingId: B1, userId: CLIENTE_1, folder: `${CLIENTE_1}/${B1}`,
        purgeDay: '2026-09-18', files: [`${CLIENTE_1}/${B1}/second_dni_front_abc.jpg`],
        unknown: 0, unknownExtensions: [], unknownLengths: [], unreadable: false, deleted: 0,
    }],
    legal: [], skipped: [], stalled: [], stalledReasons: {},
    ...extra,
})

const history = (extra: Record<string, unknown> = {}) => ({
    task: { schedule: 'Lunes de madrugada', secretConfigured: true, mode: 'simulacion' as const },
    purges: { status: 'ok' as const, rows: [] },
    cronRuns: { status: 'ok' as const, rows: [] },
    admins: {},
    ...extra,
})

describe('5ª ronda: la pantalla de conservación renderizada con datos', () => {
    beforeEach(quiet)
    afterEach(loud)

    it('el orden de los estados del cliente es el que este test siembra', () => {
        const { states } = renderClient()
        assert.equal(states, STATE_ORDER.length,
            `RetentionClient declara ${states} estados y este test conoce ${STATE_ORDER.length}: revisa el orden de los useState`)
    })

    it('al entrar: simulación en marcha, ningún diálogo y el borrado no se puede pedir', () => {
        const { html } = renderClient()
        assert.match(html, /Simulando: leyendo/)
        assert.doesNotMatch(html, /role="dialog"/, 'no hay modal abierto al entrar')
        assert.ok(!html.includes('Borrar ahora'), 'el botón del segundo paso no existe todavía')
        assert.match(buttonWith(html, 'Borrar definitivamente'), /disabled/, 'sin simulación no se ofrece borrar')
        assert.match(html, /Hay una operación en curso/, 'mientras simula tampoco se puede borrar')
    })

    it('sin simulación y sin nada en marcha, el motivo es que falta simular', () => {
        const { html } = renderClient({ sim: null, simLoading: false })
        assert.match(buttonWith(html, 'Borrar definitivamente'), /disabled/)
        assert.match(html, /Primero hace falta una simulación/)
    })

    it('si se cambia el alcance después de simular, hay que volver a simular antes de borrar', () => {
        const { html } = renderClient({ sim: report(), simLoading: false, bookingField: B1 })
        assert.match(buttonWith(html, 'Borrar definitivamente'), /disabled/)
        assert.match(html, /Has cambiado el alcance: vuelve a simular antes de borrar/)
        const basura = renderClient({ sim: report(), simLoading: false, userField: 'no-es-uuid' }).html
        assert.match(buttonWith(basura, 'Borrar definitivamente'), /disabled/)
    })

    it('con una simulación con algo que borrar: resumen, carpeta y el borrado ya se puede pedir', () => {
        const { html } = renderClient({ sim: report(), simLoading: false, simAt: new Date('2026-11-14T10:20:00Z') })
        assert.doesNotMatch(buttonWith(html, 'Borrar definitivamente'), /disabled/)
        assert.ok(html.includes('second_dni_front_abc.jpg'), 'enseña el archivo que se borraría')
        assert.doesNotMatch(html, /role="dialog"/, 'el borrado no se abre solo')
    })

    it('una simulación sin nada que borrar no ofrece el borrado y lo explica', () => {
        const { html } = renderClient({
            sim: report({ summary: { files: 0, columns: 0, bookings: 0, holders: 0 }, folders: [] }),
            simLoading: false,
        })
        assert.match(buttonWith(html, 'Borrar definitivamente'), /disabled/)
        assert.match(html, /No hay nada que borrar ahora mismo/)
    })

    it('una simulación sin la migración no ofrece el borrado y nombra la carencia', () => {
        const { html } = renderClient({
            sim: report({ schema: { ready: false, columnsReady: false, verified: true, missing: ['la tabla retention_purge_log'] } }),
            simLoading: false,
        })
        assert.match(buttonWith(html, 'Borrar definitivamente'), /disabled/)
        assert.match(html, /retention_purge_log/)
        assert.match(html, /Sin constancia no se borra/)
    })

    it('las atascadas se enseñan con su motivo, su arreglo y su id', () => {
        const { html } = renderClient({
            sim: report({
                stalled: [{ bookingId: B1, reason: 'no_user' }, { bookingId: null, reason: 'no_id' }, { bookingId: B2, reason: 'inventado' }],
                stalledReasons: { no_user: 1, no_id: 1, inventado: 1 },
            }),
            simLoading: false,
        })
        assert.match(html, /Atascadas: hay que arreglarlas a mano/)
        assert.ok(html.includes(B1), 'el id de la atascada')
        assert.ok(html.includes(B2))
        assert.match(html, /Reserva sin cliente asignado/)
        assert.match(html, /Asigna el cliente a la reserva/, 'y qué hacer con ella')
        assert.match(html, /Fila sin identificador/)
        assert.match(html, /\(sin identificador\)/, 'una atascada sin id no se cuela como una fila vacía')
        assert.match(html, /Motivo no reconocido: revísala a mano/, 'un motivo nuevo no deja la fila muda')
    })

    it('el segundo paso solo deja borrar con la palabra exacta', () => {
        for (const text of ['', 'borrar', 'Borrar', 'BORRA', 'BORRAR!', 'si']) {
            const { html } = renderClient({ sim: report(), simLoading: false, modalStep: 2, confirmText: text })
            assert.match(html, /role="dialog"/)
            assert.match(html, /Paso 2 de 2/)
            assert.match(buttonWith(html, 'Borrar ahora'), /disabled/, `con «${text}» no se puede borrar`)
        }
        const { html } = renderClient({ sim: report(), simLoading: false, modalStep: 2, confirmText: 'BORRAR' })
        assert.doesNotMatch(buttonWith(html, 'Borrar ahora'), /disabled/)
    })

    it('el primer paso avisa de que no se puede deshacer y no enseña el botón final', () => {
        const { html } = renderClient({ sim: report(), simLoading: false, modalStep: 1 })
        assert.match(html, /Paso 1 de 2/)
        assert.match(html, /No se puede deshacer/)
        assert.match(html, /Storage no tiene papelera/)
        assert.ok(!html.includes('Borrar ahora'), 'desde el paso 1 no se llega al borrado sin pasar por el 2')
    })

    it('sin simulación no hay diálogo que confirmar, aunque el paso esté abierto', () => {
        const { html } = renderClient({ sim: null, simLoading: false, modalStep: 2, confirmText: 'BORRAR' })
        assert.doesNotMatch(html, /role="dialog"/)
        assert.ok(!html.includes('Borrar ahora'))
    })

    it('mientras borra, el botón final queda bloqueado', () => {
        const { html } = renderClient({ sim: report(), simLoading: false, modalStep: 2, confirmText: 'BORRAR', purging: true })
        assert.match(buttonWith(html, 'Borrando'), /disabled/)
    })

    it('el resultado de un borrado enseña las revisadas sin purgar y las que no se pudieron sellar', () => {
        const { html } = renderClient({
            simLoading: false,
            sim: report(),
            purgeResult: report({
                mode: 'purga',
                summary: { files: 3, columns: 1, bookings: 2, holders: 1 },
                sealed: 2, sealProbe: 'ok', logged: true,
                sealFailed: [B2],
                reviewedOnly: [B1],
                reviewedWarning: 'Quedan reservas revisadas sin purgar.',
                closedByHolder: [B2],
            }),
        })
        assert.match(html, /Resultado del borrado/)
        assert.match(html, /Revisadas sin purgar \(1\)/)
        assert.ok(html.includes(B1))
        assert.match(html, /Sin constancia en su fila/)
        assert.match(html, /Quedan reservas revisadas sin purgar/)
    })

    it('un borrado fallido se enseña como fallido y nunca como hecho', () => {
        const { html } = renderClient({
            simLoading: false, sim: report(),
            purgeError: 'No se puede purgar sin poder dejar constancia: falta la tabla retention_purge_log.',
        })
        assert.match(html, /El borrado no se ha completado/)
        assert.match(html, /No des por hecho que se haya borrado algo/)
        assert.match(html, /retention_purge_log/)
        assert.ok(!html.includes('Resultado del borrado'), 'sin resultado no se dibuja el resumen de un borrado')
    })

    it('el historial de ejecuciones se renderiza con datos: modo, resultado, parada y atascadas', () => {
        const { html } = renderClient({
            historyLoading: false,
            history: history({
                cronRuns: {
                    status: 'ok',
                    rows: [{
                        id: 'c1', ran_at: '2026-11-16T03:00:00Z', mode: 'purga', outcome: 'attention',
                        stop_reason: 'solo_atascadas', passes: 2, duration_ms: 1200, candidates_reviewed: 7,
                        truncated: true, advanceable: 0, files_count: 9, columns_count: 1, bookings_count: 3,
                        holders_count: 1, bookings_sealed: 3, stalled_count: 1,
                        stalled: [{ bookingId: B1, reason: 'no_user' }],
                        reviewed_only: [B2], warnings: ['Quedan candidatas pero ninguna puede avanzar sola.'],
                        blocked: null, detail_truncated: false,
                    }],
                },
            }),
        })
        assert.match(html, /Ejecuciones de la tarea semanal/)
        assert.match(html, /16\/11\/2026/, 'la fecha en hora de Madrid')
        assert.match(html, /Purga<\/span>/)
        assert.match(html, /Revisar<\/span>/, 'el resultado «attention» se enseña traducido')
        assert.match(html, /Paró: lo que queda está atascado/)
        assert.match(html, /1 atascada/)
        assert.ok(html.includes(B1))
        assert.match(html, /1 revisada sin purgar/)
        assert.match(html, /ninguna puede avanzar sola/)
    })

    it('el historial vacío lo dice, y una tabla que falta dice qué migración aplicar', () => {
        const vacio = renderClient({ historyLoading: false, history: history() }).html
        assert.match(vacio, /La tarea todavía no se ha ejecutado/)
        const falta = renderClient({
            historyLoading: false,
            history: history({ cronRuns: { status: 'missing', rows: [] } }),
        }).html
        assert.match(falta, /20261115_retention_cron_runs\.sql/)
    })

    it('la tarjeta de la tarea avisa cuando no hay secreto y cuando tiene permiso de borrar', () => {
        const sinSecreto = renderClient({
            historyLoading: false,
            history: history({ task: { schedule: 'Lunes de madrugada', secretConfigured: false, mode: 'simulacion' } }),
        }).html
        assert.match(sinSecreto, /La tarea no se ejecutará/)
        assert.match(sinSecreto, /Solo simula/)

        const borrando = renderClient({
            historyLoading: false,
            history: history({ task: { schedule: 'Lunes de madrugada', secretConfigured: true, mode: 'purga' } }),
        }).html
        assert.match(borrando, /Borra al ejecutarse/)
        assert.ok(!borrando.includes('La tarea no se ejecutará'))
    })
})
