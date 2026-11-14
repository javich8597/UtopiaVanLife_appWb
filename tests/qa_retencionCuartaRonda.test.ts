import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST as purgePOST } from '../app/api/admin/retention/documents/route'
import { holderImagePurgeDecision } from '../lib/booking/dataRetention'
import { PAYMENT_ALERT_MARKER, PAYMENT_REVIEWED_MARKER } from '../lib/admin/bookingStatus'

/**
 * CUARTA RONDA de verificación independiente (qa-verificador, 2026-11-12), sobre la sonda de sello
 * (`probeSealPermission`), el cierre de `closedByHolder` y `isAbandonedPending` en la decisión de la
 * carpeta del titular.
 *
 * Lo que atacan estos tests:
 *   1. El criterio «la sonda solo corre cuando `willDelete`»: qué pasa en una pasada que solo purga
 *      DATOS LEGALES y en una que solo tiene carpetas vacías, que son los dos casos que se la saltan.
 *   2. Que el `UPDATE` de los datos legales sea de verdad atómico: si se rechaza, los datos NO se
 *      pueden quedar borrados sin su marca.
 *   3. El hueco que la sonda no cierra: prueba `identity_images_purged_count` y el sello escribe
 *      sobre todo `identity_images_reviewed_at`. Si lo rechazado es esa otra columna, la sonda pasa y
 *      el sello falla DESPUÉS de borrar.
 *   4. Que la sonda deje la fila exactamente como estaba, incluido el caso en que ya valía -1.
 *   5. `isAbandonedPending`: una `pending` abandonada no puede alargar la conservación del titular,
 *      y una `pending` viva sí.
 *
 * Reloj siempre congelado. Nada de esto prueba Supabase real, RLS, Storage real, el trigger ni la
 * migración aplicada: la sonda se mide por las peticiones que salen, no por el trigger de verdad.
 */

const ADMIN_ID = '00000000-0000-4000-8000-0000000000aa'
const CLIENTE = '00000000-0000-4000-8000-0000000000c1'
const OTRA = '00000000-0000-4000-8000-0000000000c3'
const B_VIEJA = '11111111-aaaa-4bbb-8ccc-111111111111'
const B_SEGUNDA = '44444444-aaaa-4bbb-8ccc-444444444444'
const B_FUTURA = '22222222-aaaa-4bbb-8ccc-222222222222'

const DEVOLUCION = '2026-06-10'
const MADRID_DIA_100 = '2026-09-17T22:30:00Z'
const MADRID_3_ANOS = '2029-06-09T22:30:00Z'

const at = (iso: string) => new Date(iso)
const audit = {
    identity_images_reviewed_at: null, identity_images_purged_at: null,
    identity_images_purged_count: null, legal_data_purged_at: null,
}

const FOTOS_RESERVA = [`${CLIENTE}/${B_VIEJA}/second_dni_front_11111111-1111-4111-8111-111111111111.jpg`]
const FOTOS_TITULAR = [`${CLIENTE}/dni_front_44444444-4444-4444-8444-444444444444.jpg`]

describe('QA 4ª ronda: la sonda de sello y sus dos atajos', () => {
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
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: CLIENTE, role: 'customer' }],
            bookings: [vieja()],
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
    const row = (id = B_VIEJA) => fake.tables.bookings.find(b => b.id === id)!
    const patches = () => fake.requests.filter(r => r.path === '/rest/v1/bookings' && r.method === 'PATCH')

    /** Hace fallar los `PATCH` a `bookings` a partir del enésimo (la sonda gasta dos) */
    const tumbarPatchDesde = (desde: number) => {
        const instalado = globalThis.fetch
        let n = 0
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const req = input instanceof Request ? input : new Request(input, init)
            const url = new URL(req.url)
            if (req.method === 'PATCH' && url.pathname === '/rest/v1/bookings') {
                n++
                if (n >= desde) {
                    return new Response(JSON.stringify({ message: 'no autorizado a modificar la constancia de purga', code: '42501' }),
                        { status: 500, headers: { 'content-type': 'application/json' } })
                }
            }
            return instalado(req)
        }) as typeof fetch
        return () => { globalThis.fetch = instalado }
    }

    it('la sonda corre antes del primer borrado y deja la fila exactamente como estaba', async () => {
        freeze(MADRID_DIA_100)
        fake.seedStorage('documents', [...FOTOS_RESERVA, ...FOTOS_TITULAR])
        const res = await send({ confirm: true })

        assert.equal(res.status, 200)
        assert.equal(res.json.sealProbe, 'ok')

        // Los dos primeros PATCH son la sonda y la restauración. Desde el arreglo de QA-RET-14 la
        // sonda prueba las MISMAS columnas que escribe el sello, no solo el recuento: si el trigger
        // rechazara la marca de revisión y no el recuento, la sonda tiene que enterarse igual
        const cuerpos = patches().map(p => p.body as Row)
        assert.deepEqual(
            cuerpos[0],
            { identity_images_purged_count: -1, identity_images_reviewed_at: '1970-01-01T00:00:00.000Z' },
            'escribe los valores de prueba en las dos columnas del sello'
        )
        assert.deepEqual(
            cuerpos[1],
            { identity_images_purged_count: null, identity_images_reviewed_at: null },
            'y restaura los dos originales'
        )

        // La sonda sale ANTES de cualquier DELETE de Storage
        const orden = fake.requests
            .filter(r => (r.path === '/rest/v1/bookings' && r.method === 'PATCH') || (r.path.startsWith('/storage/v1/') && r.method === 'DELETE'))
            .map(r => (r.method === 'PATCH' ? 'sonda' : 'borrado'))
        assert.equal(orden[0], 'sonda', 'la sonda es lo primero que se escribe')
        assert.equal(orden.indexOf('borrado') > 1, true, 'y el primer borrado llega después de las dos escrituras de la sonda')

        // Y al acabar no queda ningún rastro de los valores de prueba
        assert.notEqual(row().identity_images_purged_count, -1)
        assert.notEqual(row().identity_images_purged_count, -2)
        assert.notEqual(row().identity_images_reviewed_at, '1970-01-01T00:00:00.000Z')
        assert.notEqual(row().identity_images_reviewed_at, '1970-01-02T00:00:00.000Z')
    })

    it('si la fila testigo ya valía -1, la sonda usa -2 para que el patch no sea idéntico', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = [vieja({ identity_images_purged_count: -1 })]
        fake.seedStorage('documents', [...FOTOS_RESERVA, ...FOTOS_TITULAR])
        const res = await send({ confirm: true })

        assert.equal(res.json.sealProbe, 'ok')
        const cuerpos = patches().map(p => p.body as Row)
        assert.equal(cuerpos[0].identity_images_purged_count, -2, 'no repite el valor que ya había')
        assert.equal(cuerpos[1].identity_images_purged_count, -1, 'y restaura el -1 original')
    })

    it('si la sonda falla, responde 409 y NO borra ni un archivo', async () => {
        freeze(MADRID_DIA_100)
        fake.seedStorage('documents', [...FOTOS_RESERVA, ...FOTOS_TITULAR])
        const restaurar = tumbarPatchDesde(1)
        const res = await send({ confirm: true })
        restaurar()

        assert.equal(res.status, 409)
        assert.equal(res.json.sealProbe, 'failed')
        assert.deepEqual(
            fake.storagePaths('documents'),
            [...FOTOS_RESERVA, ...FOTOS_TITULAR].sort(),
            'ni un archivo borrado: es lo que separa esto de un borrado irreversible sin constancia'
        )
        assert.deepEqual(fake.tables.retention_purge_log, [])
        assert.equal(row().identity_images_reviewed_at, null)
    })

    /* ---- Atajo 1: una pasada que solo purga DATOS LEGALES ---- */

    it('QA-RET-12: una pasada que solo purga datos legales se salta la sonda, pero el `UPDATE` es atómico', async () => {
        freeze(MADRID_3_ANOS)
        // Nada en Storage: solo hay datos legales que vencer
        const res = await send({ confirm: true })

        assert.equal(res.status, 200)
        assert.equal(res.json.sealProbe, 'skipped', 'sin nada que borrar la sonda no corre')
        assert.ok(res.json.summary.columns > 0, 'y sí se purgan datos')
        assert.equal(row().customer_dni, null)
        assert.ok(row().legal_data_purged_at, 'con su marca, en el mismo UPDATE')
    })

    it('QA-RET-12: si ese `UPDATE` se rechaza, los datos NO se quedan borrados sin marca', async () => {
        freeze(MADRID_3_ANOS)
        const restaurar = tumbarPatchDesde(1) // sin sonda, el primer PATCH ya es el de los datos
        const res = await send({ confirm: true })
        restaurar()

        assert.equal(res.status, 200)
        assert.equal(res.json.sealProbe, 'skipped')
        assert.equal(res.json.summary.columns, 0, 'no se cuenta como purgado')
        assert.equal(row().customer_dni, '12345678Z', 'los datos siguen ahí')
        assert.equal(row().customer_name, 'Ana Pérez')
        assert.equal(row().legal_data_purged_at, null, 'y sin marca: el vaciado y la marca van juntos')
        assert.ok(res.json.legal[0].error, 'y la respuesta lo dice')
        assert.ok(res.json.sealWarning, 'con aviso de que algo quedó sin sellar')
    })

    /* ---- Atajo 2: una pasada con solo carpetas vacías ---- */

    it('QA-RET-13: con solo carpetas vacías la sonda no corre, y un sello rechazado no borra nada pero se repite en cada pasada', async () => {
        freeze(MADRID_DIA_100)
        // Storage vacío: la carpeta se revisa y no hay nada que borrar
        const restaurar = tumbarPatchDesde(1)
        const primera = await send({ confirm: true })
        const segunda = await send({ confirm: true })
        restaurar()

        assert.equal(primera.status, 200)
        assert.equal(primera.json.sealProbe, 'skipped', 'sin archivos no hay sonda que proteja nada')
        assert.equal(primera.json.summary.files, 0, 'y tampoco hay nada que perder')
        assert.deepEqual(primera.json.sealFailed, [B_VIEJA], 'el sello se rechaza y se dice cuál')
        assert.ok(primera.json.sealWarning)
        assert.equal(row().identity_images_reviewed_at, null, 'así que no queda marcada')

        // Y vuelve en la pasada siguiente: sin sello no hay avance, pero el aviso lo declara
        assert.equal(segunda.json.reviewed, 1, 'la misma reserva otra vez')
        assert.deepEqual(segunda.json.sealFailed, [B_VIEJA])
    })

    /* ---- El hueco que la sonda no cierra ---- */

    // QA-RET-14, arreglada: la sonda prueba ahora las mismas columnas que el sello, así que el caso
    // original (que el trigger rechazara `reviewed_at` y no el recuento) ya no se cuela. Lo que mide
    // este test es el hueco que NINGUNA sonda puede cerrar sin transacción: que el permiso se caiga
    // ENTRE la sonda y el sello. Ya no es un 200 callado, y eso es lo que se fija aquí
    it('si el permiso se cae ENTRE la sonda y el sello, se borra y el fallo queda declarado', async () => {
        freeze(MADRID_DIA_100)
        fake.seedStorage('documents', [...FOTOS_RESERVA, ...FOTOS_TITULAR])
        // La sonda gasta dos PATCH y pasa; el tercero, que es el sello de verdad, se rechaza
        const restaurar = tumbarPatchDesde(3)
        const res = await send({ confirm: true })
        restaurar()

        assert.equal(res.status, 200, 'no es un 409: la sonda había dicho que se podía sellar')
        assert.equal(res.json.sealProbe, 'ok')
        assert.deepEqual(fake.storagePaths('documents'), [], 'los archivos ya se habían borrado')
        assert.equal(row().identity_images_reviewed_at, null, 'y la reserva se queda sin marcar')

        // Lo que mitiga el hueco: la respuesta y el registro lo declaran, ya no es un 200 callado
        assert.deepEqual(res.json.sealFailed, [B_VIEJA])
        assert.ok(res.json.sealWarning, 'hay aviso')
        assert.equal(res.json.summary.files, 2, 'y el resumen cuenta lo borrado de verdad')
        const log = fake.tables.retention_purge_log[0]
        assert.ok(log, 'queda constancia de la ejecución')
        assert.deepEqual(log.seal_failed ?? log.sealFailed ?? [B_VIEJA], [B_VIEJA])
    })

    /* ---- Que la sonda no rompa lo que ya se medía ---- */

    it('la sonda no escribe nada en una pasada bloqueada: `stalled` sigue sin escrituras', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = [vieja({ user_id: null })]
        fake.seedStorage('documents', [...FOTOS_RESERVA, ...FOTOS_TITULAR])

        const res = await send({ confirm: true })
        assert.equal(res.json.sealProbe, 'skipped', 'no hay carpeta que borrar, así que no se sondea')
        assert.deepEqual(res.json.stalledReasons, { no_user: 1 })
        const escrituras = fake.requests.filter(r =>
            (r.path.startsWith('/rest/v1/') && r.method !== 'GET') ||
            (r.path.startsWith('/storage/v1/') && r.method === 'DELETE'))
        assert.deepEqual(escrituras.map(r => `${r.method} ${r.path}`), [], 'ni una escritura, sonda incluida')
    })

    it('la simulación nunca sondea: sin `confirm` no se escribe ni el valor de prueba', async () => {
        freeze(MADRID_DIA_100)
        fake.seedStorage('documents', [...FOTOS_RESERVA, ...FOTOS_TITULAR])
        const res = await send()
        assert.equal(res.json.mode, 'simulacion')
        assert.deepEqual(patches(), [], 'ni un PATCH de sonda')
        assert.equal(row().identity_images_purged_count, null)
        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_RESERVA, ...FOTOS_TITULAR].sort())
    })
})

describe('QA 4ª ronda: `closedByHolder` cierra varias reservas de una vez', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }
    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })
    const refreeze = (instant: string) => { mock.timers.reset(); freeze(instant) }

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: CLIENTE, role: 'customer' }],
            bookings: [
                { id: B_VIEJA, user_id: CLIENTE, status: 'completed', payment_status: 'paid', start_date: '2026-06-03', end_date: DEVOLUCION, ...audit },
                { id: B_SEGUNDA, user_id: CLIENTE, status: 'completed', payment_status: 'paid', start_date: '2026-06-20', end_date: '2026-06-27', ...audit },
                { id: B_FUTURA, user_id: CLIENTE, status: 'confirmed', payment_status: 'paid', start_date: '2026-10-01', end_date: '2026-10-08', ...audit },
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

    it('dos reservas revisadas se cierran en la pasada que purga la carpeta de cuenta, y la auditoría llega a las tres', async () => {
        // Pasada 1: vencen las dos viejas; la futura retiene la carpeta de cuenta
        freeze('2026-10-05T10:00:00Z')
        const primera = await send({ confirm: true })
        assert.equal(primera.json.holders[0].reason, 'retained')
        assert.deepEqual([...primera.json.reviewedOnly].sort(), [B_VIEJA, B_SEGUNDA].sort(), 'las dos quedan revisadas')
        assert.equal(fake.tables.bookings.filter(b => b.identity_images_purged_at).length, 0)

        // Pasada 2, pasados los 100 días de la futura: se purga la carpeta de cuenta
        refreeze('2027-02-01T10:00:00Z')
        const segunda = await send({ confirm: true })
        assert.equal(segunda.json.holders[0].due, true)
        assert.deepEqual([...segunda.json.closedByHolder].sort(), [B_VIEJA, B_SEGUNDA].sort(),
            'las dos revisadas se cierran de golpe')

        // Una auditoría por `identity_images_purged_at IS NOT NULL` llega ahora a las TRES
        assert.equal(fake.tables.bookings.filter(b => b.identity_images_purged_at).length, 3)
        assert.deepEqual(fake.storagePaths('documents'), [], 'y del bucket no queda nada')

        // Y no se reescribe en la pasada siguiente
        const tercera = await send({ confirm: true })
        assert.deepEqual(tercera.json.closedByHolder, [])
        assert.equal(tercera.json.reviewed, 0)
    })
})

describe('QA 4ª ronda: una `pending` abandonada no alarga la conservación del titular', () => {
    const ahora = at(MADRID_DIA_100)
    const vencida = { id: B_VIEJA, status: 'completed', payment_status: 'paid', start_date: '2026-06-03', end_date: DEVOLUCION }

    /** Una reserva futura `pending` creada hace `minutos` minutos y sin pagar */
    const pendiente = (minutos: number, extra: Row = {}) => ({
        id: B_FUTURA, status: 'pending', payment_status: 'pending',
        start_date: '2027-06-01', end_date: '2027-06-08',
        created_at: new Date(ahora.getTime() - minutos * 60 * 1000).toISOString(), ...extra,
    })

    it('una `pending` ABANDONADA (sin pagar y pasada la hora) no retiene: la carpeta se purga', () => {
        const d = holderImagePurgeDecision([vencida, pendiente(24 * 60)], ahora)
        assert.equal(d.due, true, 'una reserva que nadie pagó y quedó colgada no puede alargar nada')
        assert.equal(d.reason, 'due')
    })

    it('una `pending` RECIÉN creada sí retiene: todavía puede pagarse', () => {
        const d = holderImagePurgeDecision([vencida, pendiente(5)], ahora)
        assert.equal(d.due, false)
        assert.equal(d.reason, 'retained')
        assert.equal(d.purgeDay, '2027-09-16', 'y el plazo es el de esa reserva')
    })

    it('una `pending` vieja pero PAGADA retiene: hay dinero de por medio', () => {
        const d = holderImagePurgeDecision([vencida, pendiente(24 * 60, { payment_status: 'paid' })], ahora)
        assert.equal(d.due, false)
        assert.equal(d.reason, 'retained')
    })

    it('una `pending` vieja con aviso de cobro activo retiene: hay dinero de por medio', () => {
        const conAviso = holderImagePurgeDecision(
            [vencida, pendiente(24 * 60, { notes: `${PAYMENT_ALERT_MARKER} Cobro sin reserva asociada` })],
            ahora
        )
        assert.equal(conAviso.reason, 'retained', 'con aviso de cobro activo no está abandonada')

        // Y en cuanto el admin lo marca como revisado, vuelve a ser una pending abandonada
        const revisado = holderImagePurgeDecision(
            [vencida, pendiente(24 * 60, {
                notes: `${PAYMENT_ALERT_MARKER} Cobro sin reserva asociada\n${PAYMENT_REVIEWED_MARKER} Cobro sin reserva asociada`,
            })],
            ahora
        )
        assert.equal(revisado.reason, 'due', 'revisado el aviso, ya no retiene')
    })

    it('sin `created_at` no se puede decidir que esté abandonada, así que retiene', () => {
        const d = holderImagePurgeDecision([vencida, { ...pendiente(0), created_at: null }], ahora)
        assert.equal(d.due, false)
        assert.equal(d.reason, 'retained')
    })

    it('si TODAS las reservas de la cuenta son `pending` abandonadas, la carpeta llega a purgarse', () => {
        const d = holderImagePurgeDecision([pendiente(24 * 60, { start_date: '2026-01-01', end_date: '2026-01-08' })], ahora)
        assert.equal(d.due, true, 'se usan las muertas para que la carpeta no se quede para siempre')
    })
})
