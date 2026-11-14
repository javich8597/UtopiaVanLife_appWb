import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST as purgePOST } from '../app/api/admin/retention/documents/route'

/**
 * TERCERA RONDA de verificación independiente (qa-verificador, 2026-11-12), sobre las dos marcas
 * nuevas (`identity_images_reviewed_at` / `identity_images_purged_at`), el camino nuevo del 409 y los
 * avisos de `stalled`.
 *
 * Lo que atacan estos tests:
 *   1. El final que el propio autor reconoce: una reserva que queda solo REVISADA no vuelve al
 *      barrido general. ¿Llega alguna vez a «purgada», o se queda así para siempre?
 *   2. Que el fixture `audit` compartido (al que se añadió `identity_images_reviewed_at`) no esté
 *      tapando el camino de la base sin migrar.
 *   3. Que los dos bucles que no terminaban ahora se cierren DE VERDAD y que el aviso diga la verdad.
 *   4. Que el 409 siga siendo infranqueable con la comprobación de esquema movida al principio.
 *
 * Reloj siempre congelado. Nada de esto prueba Supabase real, RLS, Storage real ni la migración.
 */

const ADMIN_ID = '00000000-0000-4000-8000-0000000000aa'
const CLIENTE = '00000000-0000-4000-8000-0000000000c1'
const OTRO = '00000000-0000-4000-8000-0000000000c2'
const B_VIEJA = '11111111-aaaa-4bbb-8ccc-111111111111'
const B_FUTURA = '22222222-aaaa-4bbb-8ccc-222222222222'

const DEVOLUCION = '2026-06-10'
/** Medianoche de Madrid del día 100 de `DEVOLUCION`, en verano (CEST) */
const MADRID_DIA_100 = '2026-09-17T22:30:00Z'

const at = (iso: string) => new Date(iso)
const audit = {
    identity_images_reviewed_at: null, identity_images_purged_at: null,
    identity_images_purged_count: null, legal_data_purged_at: null,
}

const FOTOS_RESERVA = [
    `${CLIENTE}/${B_VIEJA}/second_dni_front_11111111-1111-4111-8111-111111111111.jpg`,
    `${CLIENTE}/${B_VIEJA}/second_license_front_33333333-3333-4333-8333-333333333333.jpg`,
]
const FOTOS_TITULAR = [
    `${CLIENTE}/dni_front_44444444-4444-4444-8444-444444444444.jpg`,
    `${CLIENTE}/dni_back_55555555-5555-4555-8555-555555555555.jpg`,
]

describe('QA 3ª ronda: ¿llega una reserva «revisada» a estar «purgada»?', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })
    const refreeze = (instant: string) => { mock.timers.reset(); freeze(instant) }

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: CLIENTE, role: 'customer' }, { id: OTRO, role: 'customer' }],
            bookings: [
                {
                    id: B_VIEJA, user_id: CLIENTE, status: 'completed', payment_status: 'paid',
                    start_date: '2026-06-03', end_date: DEVOLUCION, ...audit,
                },
                // Una reserva viva por delante: por ella se conserva la carpeta de cuenta
                {
                    id: B_FUTURA, user_id: CLIENTE, status: 'confirmed', payment_status: 'paid',
                    start_date: '2026-10-01', end_date: '2026-10-08', ...audit,
                },
            ],
            retention_purge_log: [],
        })
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        fake.seedStorage('documents', [...FOTOS_RESERVA, ...FOTOS_TITULAR])
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
    const row = (id: string) => fake.tables.bookings.find(b => b.id === id)!

    /**
     * QA-RET-10, ARREGLADO. Este test medía el final: la reserva quedaba REVISADA, el barrido general
     * ya no la veía y su marca de «purgada» se quedaba en null para siempre, aunque del bucket no
     * quedara nada suyo. Una auditoría por `identity_images_purged_at IS NOT NULL` nunca llegaba al
     * sí, que es para lo que existe esa columna. Ahora, cuando se purga la carpeta de cuenta, la
     * misma pasada cierra la marca de las reservas de esa cuenta que ya estaban revisadas, y lo
     * declara en `closedByHolder`. Las afirmaciones se invierten.
     */
    it('QA-RET-10: queda REVISADA, y su marca de purgada se cierra sola cuando se purga la carpeta de cuenta', async () => {
        // Pasada 1: vence la vieja; la futura retiene la carpeta de cuenta
        freeze(MADRID_DIA_100)
        const primera = await send({ confirm: true })
        assert.equal(primera.status, 200)
        assert.equal(primera.json.holders[0].reason, 'retained')
        assert.ok(row(B_VIEJA).identity_images_reviewed_at, 'revisada')
        assert.equal(row(B_VIEJA).identity_images_purged_at, null, 'y no purgada: correcto, queda el DNI del titular')
        // Y el aviso la NOMBRA, así que hay lista por la que volver
        assert.deepEqual(primera.json.reviewedOnly, [B_VIEJA])
        assert.match(primera.json.reviewedWarning, new RegExp(B_VIEJA))

        // Pasada 2, mucho después: también vence la futura y la carpeta de cuenta SÍ se purga
        refreeze('2027-02-01T10:00:00Z')
        const segunda = await send({ confirm: true })
        assert.equal(segunda.status, 200)
        assert.equal(segunda.json.reviewed, 1, 'solo la futura es candidata: la vieja ya está revisada')
        assert.equal(segunda.json.holders[0].due, true, 'ahora sí vence la carpeta de cuenta')
        assert.ok(row(B_FUTURA).identity_images_purged_at, 'la futura queda purgada del todo')

        // Del bucket no queda NADA de la reserva vieja, ni suyo ni del titular
        assert.deepEqual(fake.storagePaths('documents'), [], 'el bucket queda vacío')

        // Y su marca se cierra en esa misma pasada, sin que nadie tenga que acordarse
        assert.ok(row(B_VIEJA).identity_images_purged_at, 'la vieja queda purgada del todo')
        assert.deepEqual(segunda.json.closedByHolder, [B_VIEJA], 'y la respuesta dice cuál se ha cerrado')

        const tercera = await send({ confirm: true })
        assert.equal(tercera.json.reviewed, 0, 'el barrido general ya no tiene nada que hacer')
        assert.deepEqual(tercera.json.closedByHolder, [], 'y no vuelve a reescribir la marca')

        // Una auditoría por `identity_images_purged_at IS NOT NULL` llega ahora a las dos reservas
        assert.equal(fake.tables.bookings.filter(b => b.identity_images_purged_at).length, 2)
    })

    it('pedirla a mano con `bookingId` + `userId` sigue sirviendo, pero ya no es la única salida', async () => {
        freeze(MADRID_DIA_100)
        await send({ confirm: true })
        assert.equal(row(B_VIEJA).identity_images_purged_at, null, 'revisada y no purgada')

        // Sin esperar a la pasada general: con las dos claves se mira la carpeta de cuenta
        refreeze('2027-02-01T10:00:00Z')
        const dirigida = await send({ bookingId: B_VIEJA, userId: CLIENTE, confirm: true })
        assert.equal(dirigida.status, 200)
        assert.ok(row(B_VIEJA).identity_images_purged_at, 'cerrada a mano')

        // Y solo con `bookingId`, sin `userId`, no se cierra: la carpeta de cuenta no se mira
        fake.tables.bookings.find(b => b.id === B_VIEJA)!.identity_images_purged_at = null
        const soloReserva = await send({ bookingId: B_VIEJA, confirm: true })
        assert.equal(soloReserva.status, 200)
        assert.equal(row(B_VIEJA).identity_images_purged_at, null,
            'sin `userId` sigue sin poder afirmarse, y hay que saber que hacen falta las dos claves')
    })
})

describe('QA 3ª ronda: los dos bucles que no terminaban', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: OTRO, role: 'customer' }],
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
    const sesenta = (extra: Row) => Array.from({ length: 60 }, (_, i) => ({
        id: `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, '0')}`,
        status: 'completed', payment_status: 'paid',
        start_date: '2026-06-03', end_date: DEVOLUCION, ...audit, ...extra,
    }))

    it('60 sin `user_id`: el aviso dice que repetir no las arregla y no manda seguir repitiendo', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = sesenta({ user_id: null })
        const res = await send({ confirm: true })

        assert.equal(res.json.truncated, true)
        assert.equal(res.json.stalled.length, 50)
        assert.deepEqual(res.json.stalledReasons, { no_user: 50 })
        assert.equal(res.json.sealed, 0)
        assert.match(res.json.stalledWarning, /repetir la purga NO las arregla/)
        assert.match(res.json.stalledWarning, /revisarlas a mano/)
        assert.match(res.json.truncatedWarning, /NINGUNA de las revisadas puede avanzar/)
        assert.doesNotMatch(res.json.truncatedWarning, /hasta que "truncated" sea false/)
    })

    it('cuenta con una reserva viva sin fechas: las 50 salen como `holder_undatable`, no como «vuelve a intentarlo»', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = [
            ...sesenta({ user_id: OTRO }),
            { id: B_FUTURA, user_id: OTRO, status: 'confirmed', start_date: null, end_date: null, ...audit },
        ]
        const res = await send({ confirm: true })

        assert.equal(res.json.holders[0].reason, 'undatable_booking')
        assert.equal(res.json.stalled.length, 50, 'las 50 revisadas se declaran bloqueadas')
        assert.deepEqual(res.json.stalledReasons, { holder_undatable: 50 })
        assert.equal(res.json.sealed, 0, 'ninguna se marca')
        assert.match(res.json.stalledWarning, /holder_undatable: 50/)
        assert.match(res.json.truncatedWarning, /NINGUNA de las revisadas puede avanzar/)
        assert.equal(fake.tables.bookings.filter(b => b.identity_images_reviewed_at).length, 0)
    })

    it('y cuando sí se pueden marcar, el aviso vuelve a mandar repetir y el barrido acaba', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = sesenta({ user_id: OTRO })

        const primera = await send({ confirm: true })
        assert.equal(primera.json.truncated, true)
        assert.deepEqual(primera.json.stalled, [], 'ninguna bloqueada')
        assert.equal(primera.json.sealed, 50, 'las 50 quedan marcadas')
        assert.match(primera.json.truncatedWarning, /hasta que "truncated" sea false/)
        assert.equal(primera.json.stalledWarning, undefined)

        const segunda = await send({ confirm: true })
        assert.equal(segunda.json.reviewed, 10)
        assert.equal(segunda.json.truncated, false, 'y con exactamente 10 ya no pide otra pasada')
        assert.equal(segunda.json.truncatedWarning, undefined)

        const tercera = await send({ confirm: true })
        assert.equal(tercera.json.reviewed, 0)
        assert.equal(fake.tables.bookings.filter(b => b.identity_images_reviewed_at).length, 60)
    })

    it('con exactamente el tope de candidatas, `truncated` es false: no pide una pasada de más', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = sesenta({ user_id: OTRO }).slice(0, 50)
        const res = await send({ confirm: true })
        assert.equal(res.json.reviewed, 50)
        assert.equal(res.json.truncated, false, 'exactamente 50 con tope 50 no es «quedan más»')
        assert.equal(res.json.truncatedWarning, undefined)
    })
})

describe('QA 3ª ronda: el 409 con la comprobación de esquema al principio', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

    /** Una reserva vencida en una base SIN la migración: ninguna columna de constancia */
    const sinMigrar = (): Row => ({
        id: B_VIEJA, user_id: CLIENTE, status: 'completed', payment_status: 'paid',
        start_date: '2026-06-03', end_date: DEVOLUCION,
        customer_name: 'Ana Pérez', customer_dni: '12345678Z', total_price: 1200,
    })

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: CLIENTE, role: 'customer' }],
            bookings: [sinMigrar()],
            retention_purge_log: [],
        })
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        fake.seedStorage('documents', [...FOTOS_RESERVA, ...FOTOS_TITULAR])
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

    it('base sin migrar: 409, ni una escritura, y NINGUNA consulta filtra por las columnas que no existen', async () => {
        freeze(MADRID_DIA_100)
        const res = await send({ confirm: true })

        assert.equal(res.status, 409)
        assert.deepEqual(res.json.missing, [
            'bookings.identity_images_reviewed_at',
            'bookings.identity_images_purged_at',
            'bookings.identity_images_purged_count',
            'bookings.legal_data_purged_at',
        ])
        assert.match(res.json.migration, /20261110_document_retention_policy\.sql/)
        assert.deepEqual(escrituras().map(r => r.method), [], 'ni una escritura')
        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_RESERVA, ...FOTOS_TITULAR].sort())

        // Y lo que de verdad arregla QA-RET-7: ninguna consulta nombra una columna inexistente
        const consultas = fake.requests.filter(r => r.path === '/rest/v1/bookings' && r.method === 'GET')
        assert.ok(consultas.length > 0)
        for (const c of consultas) {
            const query = c.query.toString()
            for (const columna of ['identity_images_reviewed_at', 'identity_images_purged_at', 'legal_data_purged_at']) {
                assert.ok(!query.includes(columna), `una consulta filtra por ${columna}, que no existe: sería un 42703`)
            }
        }
        // El testigo del esquema es una lectura sin filtros de fecha
        assert.ok(
            consultas.some(c => !c.query.get('end_date') && !c.query.get('start_date') && c.query.get('limit') === '1'),
            'hay una lectura de testigo sin filtros'
        )
    })

    it('la simulación sobre una base sin migrar sigue sirviendo y avisa del 409', async () => {
        freeze(MADRID_DIA_100)
        const res = await send()
        assert.equal(res.status, 200)
        assert.equal(res.json.mode, 'simulacion')
        assert.equal(res.json.schema.ready, false)
        assert.ok(res.json.summary.files > 0, 'y aun así dice qué habría que borrar')
        assert.match(res.json.hint, /409/)
        assert.deepEqual(escrituras().map(r => r.method), [])
        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_RESERVA, ...FOTOS_TITULAR].sort())
    })

    it('el fixture compartido no tapa nada: con las columnas puestas la misma llamada purga', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = [{ ...sinMigrar(), ...audit }]
        const res = await send({ confirm: true })
        assert.equal(res.status, 200, 'la única diferencia con el test anterior son las cuatro columnas')
        assert.equal(res.json.schema.ready, true)
        assert.ok(res.json.summary.files > 0)
        assert.deepEqual(fake.storagePaths('documents'), [], 'y aquí sí borra')
    })

    it('a la mitad: con la migración vieja aplicada y sin la columna nueva, también 409', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = [{
            ...sinMigrar(),
            identity_images_purged_at: null, identity_images_purged_count: null, legal_data_purged_at: null,
        }]
        const res = await send({ confirm: true })
        assert.equal(res.status, 409)
        assert.deepEqual(res.json.missing, ['bookings.identity_images_reviewed_at'])
        assert.deepEqual(escrituras().map(r => r.method), [], 'ni una escritura')
        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_RESERVA, ...FOTOS_TITULAR].sort())
    })

    it('`userId` que no es un UUID se rechaza con 400 antes de tocar nada', async () => {
        freeze(MADRID_DIA_100)
        for (const userId of ['pepe', '../otro', 'null', `${CLIENTE}/x`, '12345678Z']) {
            const res = await send({ userId, confirm: true })
            assert.equal(res.status, 400, `userId «${userId}» tiene que ser 400`)
        }
        assert.deepEqual(escrituras().map(r => r.method), [], 'y ninguno llega a escribir')

        // QA-RET-11, ARREGLADO: `userId: ''` también es 400. Antes la cadena vacía era falsa y se
        // trataba como «sin filtro de cliente», así que ampliaba el alcance a toda la base en
        // silencio y lo registraba en blanco en vez de en el cliente pedido
        const vacio = await send({ userId: '', confirm: true })
        assert.equal(vacio.status, 400, 'una cadena vacía no puede pasar por «sin cliente»')
        assert.equal(vacio.json.error, 'Cliente no válido')

        // No pasar `userId` sigue siendo el barrido general, que es otra cosa
        const sinClave = await send({ confirm: true })
        assert.equal(sinClave.status, 409, 'la base de este bloque no está migrada')
        assert.equal(sinClave.json.scope?.userId, null, 'y el alcance consta como «sin cliente»')
    })
})
