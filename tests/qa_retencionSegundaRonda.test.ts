import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST as purgePOST } from '../app/api/admin/retention/documents/route'
import { addDaysToDay, describeUnknownNames } from '../lib/booking/dataRetention'
import { madridDay } from '../lib/booking/secondDriver'

/**
 * SEGUNDA RONDA de verificación independiente (qa-verificador, 2026-11-12), sobre los arreglos de
 * `supabase-datos` a QA-RET-1/2/3 y a los hallazgos de `seguridad-auditor`.
 *
 * Lo que atacan estos tests, y que la tanda del autor no mide:
 *   1. TERMINACIÓN. `truncatedWarning` dice «vuelve a ejecutar hasta que truncated sea false». Hay
 *      reservas que NUNCA se sellan (sin `user_id`, o cuya cuenta tiene una reserva viva sin fechas)
 *      y que la consulta devuelve en cada pasada: ese bucle no termina.
 *   2. SELLADO. Que no se selle lo que no se purgó del todo, y que una reserva que NO ha vencido no
 *      se selle de rebote (es lo que distingue «sellada porque se revisó» de un UPDATE sin filtro).
 *   3. SIMULACIÓN == PURGA con el orden nuevo: la lista anunciada y la borrada, elemento a elemento.
 *   4. EL 409: que no borre nada y que no se cuele por el camino de «no hay nada que purgar».
 *   5. BORRADO A MEDIAS con TRES tandas, que es lo que distingue `break` de `continue`.
 *   6. Que el día civil de Madrid no dependa de la zona de la MÁQUINA (el fallo que ya ha morder
 *      dos veces en este repositorio).
 *
 * Reloj siempre congelado. Nada de esto prueba Supabase real, RLS, Storage real ni la migración.
 */

const ADMIN_ID = '00000000-0000-4000-8000-0000000000aa'
const CLIENTE = '00000000-0000-4000-8000-0000000000c1'
const OTRO = '00000000-0000-4000-8000-0000000000c2'
const B_VIEJA = '11111111-aaaa-4bbb-8ccc-111111111111'
const B_RECIENTE = '22222222-aaaa-4bbb-8ccc-222222222222'
const B_SIN_FECHAS = '33333333-aaaa-4bbb-8ccc-333333333333'

const DEVOLUCION = '2026-06-10'
/** Medianoche de Madrid del día 100, en verano (CEST): 2026-09-17T22:00Z */
const MADRID_DIA_100 = '2026-09-17T22:30:00Z'
/** Medianoche de Madrid del tercer aniversario (CEST) */
const MADRID_3_ANOS = '2029-06-09T22:30:00Z'

const at = (iso: string) => new Date(iso)
const audit = {
    identity_images_reviewed_at: null, identity_images_purged_at: null,
    identity_images_purged_count: null, legal_data_purged_at: null,
}

const FOTOS_RESERVA = [
    `${CLIENTE}/${B_VIEJA}/second_dni_front_11111111-1111-4111-8111-111111111111.jpg`,
    `${CLIENTE}/${B_VIEJA}/second_dni_front_22222222-2222-4222-8222-222222222222.jpg`,
    `${CLIENTE}/${B_VIEJA}/second_license_front_33333333-3333-4333-8333-333333333333.jpg`,
]
const FOTOS_TITULAR = [
    `${CLIENTE}/dni_front_44444444-4444-4444-8444-444444444444.jpg`,
    `${CLIENTE}/dni_back_55555555-5555-4555-8555-555555555555.jpg`,
    `${CLIENTE}/second_dni_back_66666666-6666-4666-8666-666666666666.jpg`,
]
const AJENA = [`${OTRO}/dni_front_77777777-7777-4777-8777-777777777777.jpg`]
const TODAS = [...FOTOS_RESERVA, ...FOTOS_TITULAR, ...AJENA]

describe('QA 2ª ronda: termina el bucle de «vuelve a ejecutar hasta truncated: false»?', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: CLIENTE, role: 'customer' }, { id: OTRO, role: 'customer' }],
            bookings: [],
            retention_purge_log: [],
        })
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        console.error = () => {}
        console.info = () => {}
        console.warn = () => {}
    })
    afterEach(() => {
        mock.timers.reset()
        fake.restore()
        Object.assign(console, silenced)
    })

    const send = async (body: Record<string, unknown> = {}) => {
        const res = await purgePOST(new Request('http://localhost/api/admin/retention/documents', {
            method: 'POST', body: JSON.stringify(body),
        }))
        return { status: res.status, json: await res.json() as Record<string, any> }
    }
    const escrituras = () => fake.requests.filter(r =>
        (r.path.startsWith('/rest/v1/') && r.method !== 'GET') ||
        (r.path.startsWith('/storage/v1/') && r.method === 'DELETE'))

    /** 60 reservas vencidas de la misma forma, con lo que les falte para no poder sellarse */
    const sesenta = (extra: Row) => Array.from({ length: 60 }, (_, i) => ({
        id: `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, '0')}`,
        status: 'completed', payment_status: 'paid',
        start_date: '2026-06-03', end_date: DEVOLUCION, ...audit, ...extra,
    }))

    /**
     * QA-RET-5, ARREGLADO. El aviso de `truncated` mandaba «vuelve a ejecutar hasta que truncated sea
     * false», y con reservas que NUNCA se pueden marcar ese bucle no termina. Ahora la respuesta las
     * cuenta en `stalled`, el aviso dice que repetir no las arregla y el texto de `truncated` cambia
     * cuando ninguna de las revisadas puede avanzar. Las pasadas siguen sin escribir nada —eso es
     * correcto: no hay nada que se pueda hacer solo—, pero ya no se promete que terminen.
     */
    it('QA-RET-5: 60 reservas vencidas SIN `user_id` se declaran bloqueadas, y el aviso no manda repetir en bucle', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = sesenta({ user_id: null })

        const pasadas = []
        for (let i = 0; i < 3; i++) pasadas.push(await send({ confirm: true }))

        for (const [i, pasada] of pasadas.entries()) {
            assert.equal(pasada.status, 200, `pasada ${i + 1}`)
            assert.equal(pasada.json.truncated, true, `pasada ${i + 1}: sigue habiendo candidatas sin revisar`)
            assert.equal(pasada.json.reviewed, 50, `pasada ${i + 1}: las mismas 50 de siempre`)
            assert.equal(pasada.json.skipped.length, 50)
            assert.deepEqual([...new Set(pasada.json.skipped.map((s: any) => s.reason))], ['no_user'])

            // Y lo nuevo: se dice que esas 50 no avanzan y que repetir no sirve
            assert.equal(pasada.json.stalled.length, 50, `pasada ${i + 1}: las 50 declaradas bloqueadas`)
            assert.deepEqual(pasada.json.stalledReasons, { no_user: 50 })
            assert.match(pasada.json.stalledWarning, /repetir la purga NO las arregla/)
            assert.match(pasada.json.truncatedWarning, /NINGUNA de las revisadas puede avanzar/)
            assert.doesNotMatch(pasada.json.truncatedWarning, /hasta que "truncated" sea false/,
                `pasada ${i + 1}: ya no se manda repetir un bucle que no termina`)
            assert.equal(pasada.json.sealed, 0)
        }

        // Nada cambia entre pasadas, y ahora la respuesta lo dice en vez de prometer que terminará
        assert.deepEqual(escrituras().map(r => `${r.method} ${r.path}`), [], 'ni una escritura')
        assert.deepEqual(fake.tables.retention_purge_log, [])
    })

    it('QA-RET-6: una cuenta con una reserva viva SIN FECHAS deja sus 60 vencidas sin sellar para siempre', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = [
            ...sesenta({ user_id: OTRO }),
            // Una sola reserva viva sin fechas bloquea la carpeta de cuenta, y con ella el sello
            { id: B_SIN_FECHAS, user_id: OTRO, status: 'confirmed', start_date: null, end_date: null, ...audit },
        ]

        const primera = await send({ confirm: true })
        const segunda = await send({ confirm: true })

        assert.equal(primera.json.truncated, true)
        assert.equal(primera.json.holders.length, 1)
        assert.equal(primera.json.holders[0].reason, 'undatable_booking', 'la carpeta del titular se protege')

        const selladas = fake.tables.bookings.filter(b => b.identity_images_purged_at)
        assert.equal(selladas.length, 0, 'FALLA: ninguna de las 50 revisadas queda sellada')
        assert.equal(segunda.json.truncated, true, 'y la segunda pasada devuelve exactamente las mismas')
        assert.equal(segunda.json.reviewed, primera.json.reviewed)
        assert.deepEqual(escrituras().map(r => r.method), [], 'sin una sola escritura entre pasadas')
    })

    it('cuando las reservas SÍ se pueden sellar, el bucle avanza y acaba en `truncated: false`', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = sesenta({ user_id: OTRO })

        const pasadas: Array<Record<string, any>> = []
        for (let i = 0; i < 5; i++) {
            const res = await send({ confirm: true })
            pasadas.push(res.json)
            if (res.json.truncated === false) break
        }

        assert.equal(pasadas.at(-1)!.truncated, false, 'termina')
        assert.equal(pasadas.length, 2, 'en dos pasadas: 50 en la primera y las 10 que faltaban en la segunda')
        assert.equal(pasadas[0].reviewed, 50)
        assert.equal(pasadas[1].reviewed, 10, 'la segunda ya solo ve las que quedaban sin sellar')
        assert.equal(fake.tables.bookings.filter(b => b.identity_images_purged_at).length, 60,
            'las 60 quedan selladas, así que la consulta ya no las devuelve')

        // Y una tercera pasada no encuentra nada: el sello es lo que hace que el bucle avance
        const tercera = await send({ confirm: true })
        assert.equal(tercera.json.reviewed, 0)
        assert.equal(tercera.json.truncated, false)
    })
})

describe('QA 2ª ronda: el criterio de sellado', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    const vieja = (extra: Row = {}): Row => ({
        id: B_VIEJA, user_id: CLIENTE, status: 'completed', payment_status: 'paid',
        start_date: '2026-06-03', end_date: DEVOLUCION,
        customer_name: 'Ana Pérez', customer_email: 'ana@example.com', customer_dni: '12345678Z',
        customer_phone: '600000000', customer_address: 'Calle Mayor 1', total_price: 1200, ...audit, ...extra,
    })

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: CLIENTE, role: 'customer' }, { id: OTRO, role: 'customer' }],
            bookings: [vieja()],
            retention_purge_log: [],
        })
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        fake.seedStorage('documents', TODAS)
        console.error = () => {}
        console.info = () => {}
        console.warn = () => {}
    })
    afterEach(() => {
        mock.timers.reset()
        fake.restore()
        Object.assign(console, silenced)
    })

    const send = async (body: Record<string, unknown> = {}) => {
        const res = await purgePOST(new Request('http://localhost/api/admin/retention/documents', {
            method: 'POST', body: JSON.stringify(body),
        }))
        return { status: res.status, json: await res.json() as Record<string, any> }
    }
    const row = (id = B_VIEJA) => fake.tables.bookings.find(b => b.id === id)!

    it('una reserva que NO ha vencido no se sella de rebote cuando otra sí se purga', async () => {
        freeze(MADRID_DIA_100)
        // Devuelta hace 17 días: dentro de los 100. Es del MISMO cliente, así que entra en la
        // decisión de la carpeta de cuenta, pero no puede quedar marcada como purgada
        fake.tables.bookings.push({
            id: B_RECIENTE, user_id: CLIENTE, status: 'completed', payment_status: 'paid',
            start_date: '2026-08-25', end_date: '2026-09-01',
            customer_name: 'Ana Pérez', customer_dni: '12345678Z', ...audit,
        })

        const res = await send({ confirm: true })
        assert.equal(res.status, 200)

        const reciente = row(B_RECIENTE)
        assert.equal(reciente.identity_images_purged_at, null, 'la reciente NO se sella')
        assert.equal(reciente.identity_images_purged_count, null, 'ni se le pone recuento')
        assert.equal(reciente.legal_data_purged_at, null)
        assert.equal(reciente.customer_dni, '12345678Z', 'ni se le toca ningún dato')

        // La vencida sí: su subcarpeta se purga y queda REVISADA con el recuento de SU carpeta.
        // ADAPTADO: ya no se sella como «purgada», porque la carpeta de cuenta se conserva y
        // todavía pueden quedar imágenes del titular de esa reserva
        assert.ok(row(B_VIEJA).identity_images_reviewed_at, 'revisada')
        assert.equal(row(B_VIEJA).identity_images_purged_at, null, 'pero no purgada del todo')
        assert.equal(row(B_VIEJA).identity_images_purged_count, 3)

        // Y la carpeta de cuenta se conserva, porque la reciente todavía la necesita
        const [holder] = res.json.holders
        assert.equal(holder.due, false)
        assert.equal(holder.reason, 'retained')
        assert.ok(FOTOS_TITULAR.every(p => fake.storagePaths('documents').includes(p)), 'el DNI del titular se queda')
    })

    /**
     * ARREGLADO. Este test medía el fallo: la reserva quedaba sellada como PURGADA aunque las fotos
     * de identidad del titular siguieran en el bucket, y lo único que lo desmentía era el `holders`
     * de la respuesta, que no se guarda en ninguna parte. Ahora hay dos marcas y la fila de la
     * reserva distingue «revisada» de «purgada» por sí sola, sin depender de la respuesta.
     */
    it('una reserva cuya cuenta conserva la carpeta del titular queda REVISADA, no purgada', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings.push({
            id: B_RECIENTE, user_id: CLIENTE, status: 'confirmed', payment_status: 'paid',
            start_date: '2027-06-01', end_date: '2027-06-08', ...audit,
        })
        const res = await send({ confirm: true })

        assert.ok(row(B_VIEJA).identity_images_reviewed_at, 'revisada: su subcarpeta está limpia')
        assert.equal(row(B_VIEJA).identity_images_purged_at, null,
            'y NO purgada: el DNI del titular sigue en el bucket, así que no se puede afirmar')
        assert.equal(res.json.holders[0].reason, 'retained')
        assert.equal(res.json.holders[0].due, false)
        assert.ok(FOTOS_TITULAR.every(p => fake.storagePaths('documents').includes(p)),
            'el DNI del titular sigue ahí, que es por lo que no se puede sellar como purgada')

        // Y la respuesta lo dice, además de la fila
        const carpeta = res.json.folders.find((f: any) => f.scope === 'booking_images')
        assert.equal(carpeta.sealed, 'reviewed')
        assert.match(res.json.reviewedWarning, /REVISADAS y no como purgadas/)
        // El aviso NOMBRA la reserva: antes era un texto fijo y no había lista por la que volver
        assert.match(res.json.reviewedWarning, new RegExp(B_VIEJA))
        assert.deepEqual(res.json.reviewedOnly, [B_VIEJA])

        // La reserva ya no vuelve a salir de candidata: `reviewed` es lo que hace avanzar el barrido
        const segunda = await send({ confirm: true })
        assert.equal(segunda.json.reviewed, 0)
        assert.equal(segunda.json.truncated, false)
    })

    it('cuando la carpeta del titular SÍ se purga, la reserva queda purgada del todo', async () => {
        freeze(MADRID_DIA_100)
        const res = await send({ confirm: true })
        assert.equal(res.json.holders[0].due, true)
        assert.ok(row(B_VIEJA).identity_images_reviewed_at)
        assert.ok(row(B_VIEJA).identity_images_purged_at, 'las dos marcas, porque no queda nada suyo')
        const carpeta = res.json.folders.find((f: any) => f.scope === 'booking_images')
        assert.equal(carpeta.sealed, 'purged')
        assert.equal(res.json.reviewedWarning, undefined, 'y sin aviso que matizar')
    })

    it('no se sella si la carpeta de la propia reserva es ilegible', async () => {
        freeze(MADRID_DIA_100)
        fake.failures.table = 'storage'
        const res = await send({ confirm: true })
        assert.equal(res.status, 200)
        assert.ok(res.json.folders.every((f: any) => f.unreadable))
        assert.equal(row().identity_images_purged_at, null, 'sin sello: queda pendiente')
        assert.equal(fake.storagePaths('documents').length, TODAS.length, 'y no se borró nada')
    })

    it('el modo dirigido por `bookingId` no sella, para que el barrido general la vuelva a mirar', async () => {
        freeze(MADRID_DIA_100)
        const res = await send({ bookingId: B_VIEJA, confirm: true })
        assert.equal(res.json.summary.files, 3)
        assert.equal(row().identity_images_purged_at, null, 'no se sella en modo dirigido')

        // Y el barrido general posterior la vuelve a coger, ahora sí con la carpeta de cuenta
        const general = await send({ confirm: true })
        assert.equal(general.json.reviewed, 1, 'sigue siendo candidata')
        assert.ok(row().identity_images_purged_at, 'y ahora sí se sella')
        assert.equal(row().identity_images_purged_count, 0, 'su subcarpeta ya estaba vacía')
        assert.deepEqual(fake.storagePaths('documents'), [...AJENA].sort(), 'las del titular se fueron en el barrido')
    })
})

describe('QA 2ª ronda: la simulación anuncia exactamente lo que se borra', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: CLIENTE, role: 'customer' }, { id: OTRO, role: 'customer' }],
            bookings: [],
            retention_purge_log: [],
        })
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        console.error = () => {}
        console.info = () => {}
        console.warn = () => {}
    })
    afterEach(() => {
        mock.timers.reset()
        fake.restore()
        Object.assign(console, silenced)
    })

    const send = async (body: Record<string, unknown> = {}) => {
        const res = await purgePOST(new Request('http://localhost/api/admin/retention/documents', {
            method: 'POST', body: JSON.stringify(body),
        }))
        return { status: res.status, json: await res.json() as Record<string, any> }
    }

    /** Lo que la respuesta dice que borraría (o ha borrado), como lista de rutas y columnas */
    const anunciado = (json: Record<string, any>) => [
        ...json.folders
            .filter((f: any) => !f.unreadable)
            .flatMap((f: any) => f.files.map((n: string) => `${f.folder}/${n}`)),
        ...json.legal.flatMap((l: any) => l.columns.map((c: string) => `${l.bookingId}.${c}`)),
    ].sort()

    it('con 60 candidatas de 100 días y una de 3 años, lo anunciado y lo registrado coinciden', async () => {
        freeze(MADRID_3_ANOS)
        // 60 reservas con fotos cada una, más la de 3 años con datos legales
        const muchas = Array.from({ length: 60 }, (_, i) => ({
            id: `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, '0')}`,
            user_id: OTRO, status: 'completed', payment_status: 'paid',
            start_date: '2029-01-10', end_date: '2029-01-17', ...audit,
        }))
        fake.tables.bookings = [
            ...muchas,
            {
                id: B_VIEJA, user_id: CLIENTE, status: 'completed', payment_status: 'paid',
                start_date: '2026-06-03', end_date: DEVOLUCION,
                customer_name: 'Ana Pérez', customer_email: 'ana@example.com', customer_dni: '12345678Z',
                customer_phone: '600000000', customer_address: 'Calle Mayor 1', total_price: 1200, ...audit,
            },
        ]
        fake.seedStorage('documents', [
            ...TODAS,
            ...muchas.slice(0, 5).map(b => `${OTRO}/${b.id}/second_dni_front_99999999-9999-4999-8999-999999999999.jpg`),
        ])

        const simulada = await send()
        const previsto = anunciado(simulada.json)
        assert.ok(previsto.length > 0)

        const purga = await send({ confirm: true })
        const hecho = anunciado(purga.json)
        assert.deepEqual(hecho, previsto, 'la lista anunciada y la de la purga son la misma')

        // Y lo que consta en el registro es exactamente eso
        const registrado = (fake.tables.retention_purge_log[0]?.detail as any[] || [])
            .flatMap(e => e.scope === 'booking_legal_data'
                ? (e.items as string[]).map(c => `${e.bookingId}.${c}`)
                : (e.items as string[]))
            .sort()
        assert.deepEqual(registrado, previsto, 'y el registro guarda la misma lista, sin sobras ni faltas')

        // Los datos de 3 años se purgan aunque haya 60 candidatas de 100 días por delante
        assert.deepEqual(purga.json.legal.map((l: any) => l.bookingId), [B_VIEJA])
        assert.deepEqual(purga.json.legal[0].columns, [
            'customer_address', 'customer_dni', 'customer_email', 'customer_name', 'customer_phone',
        ], 'las cinco que trae esta fila')
        assert.equal(purga.json.summary.columns, 5)
        assert.equal(fake.tables.bookings.find(b => b.id === B_VIEJA)!.customer_dni, null)
    })
})

describe('QA 2ª ronda: el 409 cuando no se puede dejar constancia', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    const vieja = (extra: Row = {}): Row => ({
        id: B_VIEJA, user_id: CLIENTE, status: 'completed', payment_status: 'paid',
        start_date: '2026-06-03', end_date: DEVOLUCION,
        customer_name: 'Ana Pérez', customer_dni: '12345678Z', total_price: 1200, ...audit, ...extra,
    })

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: CLIENTE, role: 'customer' }],
            bookings: [vieja()],
            retention_purge_log: [],
        })
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        fake.seedStorage('documents', TODAS)
        console.error = () => {}
        console.info = () => {}
        console.warn = () => {}
    })
    afterEach(() => {
        mock.timers.reset()
        fake.restore()
        Object.assign(console, silenced)
    })

    const send = async (body: Record<string, unknown> = {}) => {
        const res = await purgePOST(new Request('http://localhost/api/admin/retention/documents', {
            method: 'POST', body: JSON.stringify(body),
        }))
        return { status: res.status, json: await res.json() as Record<string, any> }
    }
    const escrituras = () => fake.requests.filter(r =>
        (r.path.startsWith('/rest/v1/') && r.method !== 'GET') ||
        (r.path.startsWith('/storage/v1/') && r.method === 'DELETE'))

    it('sin la tabla del registro, `confirm` responde 409 y no borra ni un archivo', async () => {
        freeze(MADRID_DIA_100)
        fake.failures.table = 'retention_purge_log'
        fake.failures.method = 'GET'

        const res = await send({ confirm: true })
        assert.equal(res.status, 409)
        assert.deepEqual(res.json.missing, ['la tabla retention_purge_log'])
        assert.match(res.json.migration, /20261110_document_retention_policy\.sql/)
        assert.deepEqual(res.json.summary, { files: 0, columns: 0, bookings: 0, holders: 0 })

        assert.deepEqual(escrituras().map(r => `${r.method} ${r.path}`), [], 'ni una escritura')
        assert.deepEqual(fake.storagePaths('documents'), [...TODAS].sort(), 'Storage intacto')
        assert.equal(fake.tables.bookings.find(b => b.id === B_VIEJA)!.identity_images_purged_at, null)
    })

    it('la simulación avisa del 409 antes de que nadie escriba `confirm`', async () => {
        freeze(MADRID_DIA_100)
        fake.failures.table = 'retention_purge_log'
        fake.failures.method = 'GET'

        const res = await send()
        assert.equal(res.status, 200)
        assert.equal(res.json.mode, 'simulacion')
        assert.equal(res.json.schema.ready, false)
        assert.deepEqual(res.json.schema.missing, ['la tabla retention_purge_log'])
        assert.match(res.json.hint, /409/)
        assert.deepEqual(escrituras().map(r => r.method), [])
    })

    it('el 409 NO se cuela por el camino de «no hay nada que purgar»: sin candidatas responde 200 sin escribir', async () => {
        freeze('2026-06-20T10:00:00Z') // dentro de los 100 días
        fake.failures.table = 'retention_purge_log'
        fake.failures.method = 'GET'

        const res = await send({ confirm: true })
        assert.equal(res.status, 200, 'sin nada que purgar no hace falta constancia')
        assert.equal(res.json.summary.files, 0)
        assert.equal(res.json.summary.columns, 0)
        assert.equal(res.json.logged, false)
        assert.deepEqual(escrituras().map(r => `${r.method} ${r.path}`), [],
            'y por ese camino tampoco se escribe nada: no se puede sellar ni registrar sin purgar')
        assert.deepEqual(fake.storagePaths('documents'), [...TODAS].sort())
    })

    /**
     * QA-RET-7, ARREGLADO en lo que era el fallo. Medía que el 409 quedaba detrás de un 500: la
     * comprobación del esquema iba después de las consultas de candidatas, que filtraban por
     * `identity_images_purged_at`, y filtrar por una columna que no existe es un 42703. Ahora el
     * esquema se comprueba ANTES, con una lectura sin filtros, y las consultas no filtran por esas
     * columnas hasta saber que existen; el caso de la base sin migrar está en
     * `tests/retencionDocumentacion.test.ts` («el 409 es alcanzable»).
     *
     * Lo que este test conserva es el otro caso, que sigue siendo correcto: si la base falla DE
     * VERDAD (no es que falten columnas), un 500 genérico es la respuesta, y no se borra nada.
     */
    it('QA-RET-7: si `bookings` falla de verdad, responde 500 y no borra nada', async () => {
        freeze(MADRID_DIA_100)
        fake.failures.table = 'bookings'
        fake.failures.method = 'GET'

        const res = await send({ confirm: true })
        assert.equal(res.status, 500)
        assert.equal(res.json.missing, undefined, 'un fallo de la base no es «faltan columnas»')
        assert.equal(res.json.migration, undefined)
        assert.deepEqual(escrituras().map(r => r.method), [], 'y no borra nada')
    })
})

describe('QA 2ª ronda: borrado a medias con TRES tandas (`break` frente a `continue`)', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: CLIENTE, role: 'customer' }],
            bookings: [{
                id: B_VIEJA, user_id: CLIENTE, status: 'completed', payment_status: 'paid',
                start_date: '2026-06-03', end_date: DEVOLUCION, ...audit,
            }],
            retention_purge_log: [],
        })
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        console.error = () => {}
        console.info = () => {}
        console.warn = () => {}
    })
    afterEach(() => {
        mock.timers.reset()
        fake.restore()
        Object.assign(console, silenced)
    })

    const send = async (body: Record<string, unknown> = {}) => {
        const res = await purgePOST(new Request('http://localhost/api/admin/retention/documents', {
            method: 'POST', body: JSON.stringify(body),
        }))
        return { status: res.status, json: await res.json() as Record<string, any> }
    }
    const row = () => fake.tables.bookings.find(b => b.id === B_VIEJA)!

    /** 250 copias en la carpeta de la reserva: TRES tandas de 100, 100 y 50 */
    const doscientasCincuenta = Array.from({ length: 250 }, (_, i) =>
        `${CLIENTE}/${B_VIEJA}/second_dni_front_${String(i).padStart(8, '0')}-1111-4111-8111-111111111111.jpg`)

    /** Tumba la enésima petición de borrado de Storage y deja pasar el resto */
    const tumbarBorrado = (cual: number) => {
        const instalado = globalThis.fetch
        let n = 0
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const req = input instanceof Request ? input : new Request(input, init)
            if (req.method === 'DELETE' && new URL(req.url).pathname.startsWith('/storage/v1/object/')) {
                n++
                if (n === cual) {
                    return new Response(JSON.stringify({ statusCode: '500', error: 'fallo', message: `tanda ${cual} cae` }),
                        { status: 500, headers: { 'content-type': 'application/json' } })
                }
            }
            return instalado(req)
        }) as typeof fetch
        return () => { globalThis.fetch = instalado }
    }

    it('con la SEGUNDA tanda caída se para ahí: 100 borrados, no 150', async () => {
        freeze(MADRID_DIA_100)
        fake.seedStorage('documents', doscientasCincuenta)
        const restaurar = tumbarBorrado(2)
        const res = await send({ confirm: true })
        restaurar()

        const carpeta = res.json.folders.find((f: any) => f.scope === 'booking_images')
        assert.ok(carpeta.error, 'la respuesta dice que la carpeta falló')
        assert.equal(carpeta.deleted, 100, 'se para en la tanda que falló y no sigue con la tercera')
        assert.equal(res.json.summary.files, 100)

        const quedan = fake.storagePaths('documents')
        assert.equal(quedan.length, 150, 'quedan las 150 de las tandas 2 y 3')

        const registradas = (fake.tables.retention_purge_log[0]?.detail as any[] || []).flatMap(e => e.items as string[])
        assert.equal(registradas.length, 100, 'y las 100 borradas constan en el registro')
        assert.ok(registradas.every(p => !quedan.includes(p)), 'cada ruta registrada está de verdad borrada')
        assert.equal(row().identity_images_purged_at, null, 'la reserva NO queda sellada: falta trabajo')
    })

    it('si falla la PRIMERA tanda no se borra nada: ni sello, ni fila de registro, ni recuento', async () => {
        freeze(MADRID_DIA_100)
        fake.seedStorage('documents', doscientasCincuenta)
        const restaurar = tumbarBorrado(1)
        const res = await send({ confirm: true })
        restaurar()

        assert.equal(res.status, 200)
        const carpeta = res.json.folders.find((f: any) => f.scope === 'booking_images')
        assert.ok(carpeta.error, 'la respuesta dice que falló')
        assert.equal(carpeta.deleted, 0)
        assert.equal(res.json.summary.files, 0)
        assert.equal(fake.storagePaths('documents').length, 250, 'las 250 siguen ahí')

        // Una ejecución que no llegó a borrar nada NO puede dejar constancia de cumplimiento
        assert.equal(res.json.logged, false, 'sin nada borrado no hay nada que registrar')
        assert.deepEqual(fake.tables.retention_purge_log, [], 'ni una fila de registro vacía')
        assert.equal(res.json.logWarning, undefined, 'y eso no es un aviso de fallo de registro')
        assert.equal(row().identity_images_purged_at, null, 'ni sello')
        assert.equal(row().identity_images_purged_count, null)
    })

    it('repetir después de un borrado a medias lo termina y entonces sí sella', async () => {
        freeze(MADRID_DIA_100)
        fake.seedStorage('documents', doscientasCincuenta)
        const restaurar = tumbarBorrado(2)
        await send({ confirm: true })
        restaurar()
        assert.equal(fake.storagePaths('documents').length, 150)
        assert.equal(row().identity_images_purged_at, null)

        const segunda = await send({ confirm: true })
        assert.equal(segunda.status, 200)
        assert.equal(segunda.json.summary.files, 150, 'la segunda pasada termina lo que faltaba')
        assert.deepEqual(fake.storagePaths('documents'), [], 'la carpeta queda vacía')
        assert.ok(row().identity_images_purged_at, 'y ahora sí se sella')
        assert.equal(row().identity_images_purged_count, 150)
        assert.equal(fake.tables.retention_purge_log.length, 2, 'dos ejecuciones, dos filas de constancia')
    })
})

describe('QA 2ª ronda: los nombres que no se reconocen no se repiten', () => {
    /**
     * ADAPTADO: el recorte a 10 caracteres seguía entregando un DNI entero (`12345678Z.jpg` tiene 9
     * caracteres antes del punto) y los nombres cortos viajaban completos. Ahora no se devuelve
     * ningún trozo del nombre: recuento, extensiones y longitudes.
     */
    it('`describeUnknownNames` cuenta, clasifica por extensión y mide, sin devolver ningún nombre', () => {
        const nombres = [
            'dni-de-ana-perez-07001.jpg',
            'pasaporte-luis-perez.png',
            'contrato-firmado-ana.pdf',
            'cuarto-archivo-que-no-sale.txt',
            '12345678Z.jpg',
            'sinextension',
        ]
        const informe = describeUnknownNames(nombres)
        assert.equal(informe.count, 6, 'cuenta los seis')
        assert.deepEqual(informe.extensions, ['', '.jpg', '.pdf', '.png', '.txt'])
        assert.deepEqual(informe.lengths, [12, 13, 24, 24, 26, 30].filter((n, i, a) => a.indexOf(n) === i))

        const serializado = JSON.stringify(informe)
        for (const nombre of nombres) {
            assert.ok(!serializado.includes(nombre), `«${nombre}» no puede aparecer`)
        }
        assert.ok(!serializado.includes('ana'), 'ni un trozo de un apellido')
        assert.ok(!serializado.includes('12345678'), 'ni un DNI')
        assert.ok(!serializado.includes('dni-de'), 'ni el principio de un nombre')

        assert.deepEqual(describeUnknownNames(null), { count: 0, extensions: [], lengths: [] })
        assert.deepEqual(describeUnknownNames(['a.txt']), { count: 1, extensions: ['.txt'], lengths: [5] },
            'un nombre corto tampoco se devuelve')
    })
})

describe('QA 2ª ronda: el día civil de Madrid no depende de la zona de la MÁQUINA', () => {
    /**
     * El fallo que ya ha morder dos veces: calcular «hoy» o «hace N días» con el reloj y la zona de
     * la máquina en vez de con los días civiles de Europe/Madrid. `madridDay` + `addDaysToDay` son
     * las dos piezas correctas, y lo que este test fija es que su resultado es el MISMO en cualquier
     * zona: se ejecutan en procesos hijos con `TZ` distinto y se comparan las salidas.
     */
    const script = path.join(__dirname, 'helpers', 'madridDayProbe.mts')
    const tsx = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs')

    const correr = (tz: string) => {
        const r = spawnSync(process.execPath, [tsx, script], {
            cwd: process.cwd(),
            env: { ...process.env, TZ: tz },
            encoding: 'utf8',
            timeout: 120000,
        })
        assert.equal(r.status, 0, `TZ=${tz}: ${r.stderr}`)
        return r.stdout.trim()
    }

    it('`madridDay` y `addDaysToDay` dan lo mismo en Madrid, en UTC, en Tokio y en Nueva York', () => {
        const madrid = correr('Europe/Madrid')
        assert.ok(madrid.length > 0)
        for (const tz of ['UTC', 'Asia/Tokyo', 'America/New_York']) {
            assert.equal(correr(tz), madrid, `TZ=${tz} tiene que dar el mismo día civil de Madrid`)
        }
    })

    it('y en el proceso de los tests cuadran con los instantes de riesgo de los cambios de hora', () => {
        // 2026-03-30 00:30 de Madrid (CEST), el día siguiente al cambio de primavera
        assert.equal(madridDay(at('2026-03-29T22:30:00Z')), '2026-03-30')
        assert.equal(addDaysToDay(madridDay(at('2026-03-29T22:30:00Z')), -1), '2026-03-29')
        assert.equal(addDaysToDay(madridDay(at('2026-03-29T22:30:00Z')), -2), '2026-03-28')
        // 2026-10-26 00:30 de Madrid (CET), el día siguiente al cambio de otoño
        assert.equal(madridDay(at('2026-10-25T23:30:00Z')), '2026-10-26')
        assert.equal(addDaysToDay(madridDay(at('2026-10-25T23:30:00Z')), -1), '2026-10-25')
        // Una noche de invierno: en UTC ya es el día siguiente
        assert.equal(madridDay(at('2026-11-12T23:30:00Z')), '2026-11-13')
        assert.equal(addDaysToDay(madridDay(at('2026-11-12T23:30:00Z')), -1), '2026-11-12')
    })
})
