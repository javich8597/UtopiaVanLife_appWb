import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST as purgePOST } from '../app/api/admin/retention/documents/route'
import {
    holderImagePurgeDecision,
    identityImagePurgeDay,
    legalDataPurgeDay,
    legalDataPurgePatch,
    selectIdentityFiles,
} from '../lib/booking/dataRetention'
import { documentsMatching, latestDocument, type StoredFile } from '../lib/admin/documents'
import { bookingReturnDay, uploadDeadlineDay, uploadWindowState } from '../lib/booking/secondDriver'

/**
 * VERIFICACIÓN INDEPENDIENTE de la política de conservación (qa-verificador).
 *
 * Decisión de Javier (2026-11-10): «Purgar imágenes de Storage a los 100 días tras la devolución;
 * retener datos legales 3 años por RD 933/2021».
 *
 * Estos tests NO repiten los del autor: atacan lo que su tanda no mide.
 *   1. Que la SIMULACIÓN no escriba nada POR LA RUTA REAL: ni una peticion que no sea GET a
 *      /rest/v1, ni un DELETE de Storage, ni una fila de registro. Storage no tiene papelera.
 *   2. Que `confirm: true` borre EXACTAMENTE el conjunto de rutas que la simulación anunció.
 *   3. Que la carpeta del TITULAR sobreviva a cualquier reserva viva por delante, estado por estado,
 *      y a una reserva viva sin fechas, comprobado POR LA RUTA y no solo por la función pura.
 *   4. Las dos fronteras medidas en la MEDIANOCHE DE MADRID por la ruta, en verano (CEST) y en
 *      invierno (CET): un `now` en UTC cae al otro lado del plazo y es la mutación que más veces ha
 *      sobrevivido en este repositorio.
 *   5. Que los dos plazos no se pisen y que la repetición no vuelva a contar ni a registrar nada.
 *   6. Que el renombrado de `returnDay` a `bookingReturnDay` no haya tocado el plazo de SUBIDA.
 *
 * Reloj SIEMPRE congelado (`mock.timers`): un test anclado al reloj de la máquina caduca solo.
 * Nada de esto prueba Supabase real, RLS, las políticas de storage.objects ni la migración aplicada.
 */

const ADMIN_ID = '00000000-0000-4000-8000-0000000000aa'
const CLIENTE = '00000000-0000-4000-8000-0000000000c1'
const OTRO = '00000000-0000-4000-8000-0000000000c2'
const B_VIEJA = '11111111-aaaa-4bbb-8ccc-111111111111'
const B_OTRA = '22222222-aaaa-4bbb-8ccc-222222222222'

/** Devolución el 10/06/2026: +100 días = 18/09/2026 (CEST); +3 años = 10/06/2029 */
const DEVOLUCION = '2026-06-10'
const DIA_100 = '2026-09-18'

/** Medianoche de Madrid del día 100, en verano (CEST = UTC+2): 2026-09-17T22:00Z */
const MADRID_DIA_100 = '2026-09-17T22:30:00Z'
const MADRID_DIA_99 = '2026-09-17T21:30:00Z'
/** Medianoche de Madrid del tercer aniversario (CEST): 2029-06-09T22:00Z */
const MADRID_3_ANOS = '2029-06-09T22:30:00Z'
const MADRID_3_ANOS_MENOS_1 = '2029-06-09T21:30:00Z'

const at = (iso: string) => new Date(iso)

const audit = { identity_images_purged_at: null, identity_images_purged_count: null, legal_data_purged_at: null }

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

describe('QA conservación: la ruta real', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, info: console.info, warn: console.warn }

    const vieja = (extra: Row = {}): Row => ({
        id: B_VIEJA, user_id: CLIENTE, status: 'completed', payment_status: 'paid',
        start_date: '2026-06-03', end_date: DEVOLUCION,
        customer_name: 'Ana Pérez', customer_email: 'ana@example.com', customer_phone: '600000000',
        customer_dni: '12345678Z', customer_address: 'Calle Mayor 1, 07001 Palma',
        passengers: [{ fullName: 'Luis Pérez', dniNie: 'AB123456', isSecondDriver: true }],
        total_price: 1200, ...audit, ...extra,
    })

    const freeze = (instant: string) => mock.timers.enable({ apis: ['Date'], now: at(instant) })

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

    const send = async (body: Record<string, unknown> | null = {}) => {
        const res = await purgePOST(new Request('http://localhost/api/admin/retention/documents', {
            method: 'POST',
            ...(body === null ? {} : { body: JSON.stringify(body) }),
        }))
        return { status: res.status, json: await res.json() as any }
    }
    const row = (id = B_VIEJA) => fake.tables.bookings.find(b => b.id === id)!

    /** Toda escritura que haya salido: PostgREST distinto de GET, y cualquier DELETE de Storage */
    const escrituras = () => fake.requests.filter(r =>
        (r.path.startsWith('/rest/v1/') && r.method !== 'GET') ||
        (r.path.startsWith('/storage/v1/') && r.method === 'DELETE'))

    /* ------------------------------------------------------------------ */
    /* 1. La simulación no escribe NADA                                    */
    /* ------------------------------------------------------------------ */

    it('la simulación no manda NINGUNA escritura: ni PostgREST, ni DELETE de Storage, ni registro', async () => {
        freeze(MADRID_DIA_100)
        const res = await send()

        assert.equal(res.status, 200)
        assert.equal(res.json.mode, 'simulacion')
        assert.ok(res.json.summary.files > 0, 'y sí anuncia que borraría archivos')

        assert.deepEqual(
            escrituras().map(r => `${r.method} ${r.path}`),
            [],
            'la simulación no puede mandar ni una escritura'
        )
        assert.deepEqual(fake.storagePaths('documents'), [...TODAS].sort(), 'Storage intacto')
        assert.deepEqual(fake.tables.retention_purge_log, [], 'ni una fila de registro')
        assert.deepEqual(row(), vieja(), 'la fila de la reserva, carácter por carácter, igual')
    })

    it('solo `confirm: true` exacto purga: ni la cadena "true", ni 1, ni {} , ni un cuerpo ausente', async () => {
        for (const body of [{}, null, { confirm: 'true' }, { confirm: 1 }, { confirm: 'yes' }, { confirm: null }, { confirm: false }] as Array<Record<string, unknown> | null>) {
            fake.requests.length = 0
            freeze(MADRID_DIA_100)
            const res = await send(body)
            mock.timers.reset()
            const etiqueta = JSON.stringify(body)
            assert.equal(res.json.mode, 'simulacion', `cuerpo ${etiqueta} tiene que simular`)
            assert.deepEqual(escrituras().map(r => r.method), [], `cuerpo ${etiqueta} no puede escribir`)
            assert.deepEqual(fake.storagePaths('documents'), [...TODAS].sort(), `cuerpo ${etiqueta}: Storage intacto`)
        }
    })

    it('un cuerpo que no es JSON tampoco purga: se trata como simulación', async () => {
        freeze(MADRID_DIA_100)
        const res = await purgePOST(new Request('http://localhost/api/admin/retention/documents', {
            method: 'POST', body: 'confirm=true',
        }))
        const body = await res.json() as any
        assert.equal(body.mode, 'simulacion')
        assert.deepEqual(escrituras().map(r => r.method), [])
        assert.deepEqual(fake.storagePaths('documents'), [...TODAS].sort())
    })

    /* ------------------------------------------------------------------ */
    /* 2. confirm borra exactamente lo anunciado                           */
    /* ------------------------------------------------------------------ */

    it('`confirm: true` borra EXACTAMENTE las rutas que la simulación anunció, ni un archivo más', async () => {
        freeze(MADRID_DIA_100)
        const simulada = await send()
        const anunciadas: string[] = simulada.json.summary.files > 0
            ? simulada.json.folders.flatMap((f: any) => (f.unreadable ? [] : f.files.map((n: string) => `${f.folder}/${n}`)))
            : []
        assert.deepEqual([...anunciadas].sort(), [...FOTOS_RESERVA, ...FOTOS_TITULAR].sort())

        const antes = fake.storagePaths('documents')
        const purga = await send({ confirm: true })
        const despues = fake.storagePaths('documents')

        const borradas = antes.filter(p => !despues.includes(p))
        assert.deepEqual(borradas.sort(), [...anunciadas].sort(), 'borrado == anunciado')
        assert.deepEqual(despues, [...AJENA].sort(), 'y nada de otro cliente')
        assert.equal(purga.json.summary.files, anunciadas.length)
    })

    /* ------------------------------------------------------------------ */
    /* 3. La carpeta del titular y las reservas vivas por delante          */
    /* ------------------------------------------------------------------ */

    for (const status of ['pending', 'confirmed', 'active', 'completed']) {
        it(`una reserva \`${status}\` por delante conserva el DNI del titular (por la ruta, con confirm)`, async () => {
            freeze(MADRID_DIA_100)
            fake.tables.bookings.push({
                id: B_OTRA, user_id: CLIENTE, status, payment_status: 'paid',
                start_date: '2027-06-01', end_date: '2027-06-08', ...audit,
            })

            const res = await send({ confirm: true })
            assert.equal(res.status, 200)
            const [holder] = res.json.holders
            assert.equal(holder.due, false, `con una reserva ${status} por delante no vence`)
            assert.equal(holder.reason, 'retained')
            assert.deepEqual(
                fake.storagePaths('documents'),
                [...FOTOS_TITULAR, ...AJENA].sort(),
                'las del titular siguen ahí; las de la reserva vencida, no'
            )
        })
    }

    it('una reserva viva EN CURSO (hoy dentro de sus fechas) conserva el DNI del titular', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings.push({
            id: B_OTRA, user_id: CLIENTE, status: 'active', payment_status: 'paid',
            start_date: '2026-09-15', end_date: '2026-09-22', ...audit,
        })
        const res = await send({ confirm: true })
        assert.equal(res.json.holders[0].due, false)
        assert.deepEqual(fake.storagePaths('documents'), [...FOTOS_TITULAR, ...AJENA].sort())
    })

    it('una reserva viva SIN FECHAS bloquea la purga del titular en vez de borrar a ciegas', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings.push({
            id: B_OTRA, user_id: CLIENTE, status: 'confirmed', payment_status: 'paid',
            start_date: null, end_date: null, ...audit,
        })
        const res = await send({ confirm: true })
        const [holder] = res.json.holders
        assert.equal(holder.due, false)
        assert.equal(holder.reason, 'undatable_booking')
        assert.ok(FOTOS_TITULAR.every(p => fake.storagePaths('documents').includes(p)), 'el DNI del titular se queda')
    })

    it('una reserva CANCELADA por delante no alarga nada: el titular se purga igual', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings.push({
            id: B_OTRA, user_id: CLIENTE, status: 'cancelled', payment_status: 'refunded',
            start_date: '2027-06-01', end_date: '2027-06-08', ...audit,
        })
        const res = await send({ confirm: true })
        assert.equal(res.json.holders[0].due, true)
        assert.deepEqual(fake.storagePaths('documents'), [...AJENA].sort())
    })

    it('la carpeta de OTRO cliente no se toca aunque comparta el día de purga', async () => {
        freeze(MADRID_DIA_100)
        const res = await send({ confirm: true })
        assert.equal(res.status, 200)
        assert.ok(fake.storagePaths('documents').includes(AJENA[0]), 'la foto del otro cliente sigue ahí')
        assert.deepEqual(res.json.holders.map((h: any) => h.userId), [CLIENTE])
    })

    /* ------------------------------------------------------------------ */
    /* 4. Las dos fronteras, en la medianoche de MADRID                    */
    /* ------------------------------------------------------------------ */

    it('verano (CEST): a las 00:30 de Madrid del día 100 la purga vence; 23:30 del 99 todavía no', async () => {
        freeze(MADRID_DIA_99)
        const antes = await send()
        assert.equal(antes.json.policy.today, '2026-09-17', 'el día es el de Madrid, no el de UTC')
        assert.equal(antes.json.summary.files, 0, 'día 99: no se borra nada')
        assert.equal(antes.json.reviewed, 0, 'ni es candidata')
        mock.timers.reset()

        freeze(MADRID_DIA_100)
        const ahora = await send()
        assert.equal(ahora.json.policy.today, DIA_100)
        assert.equal(ahora.json.summary.files, 6, 'día 100: vence')
    })

    it('invierno (CET): la misma frontera con la devolución del 11/09 y el día 100 el 20/12', async () => {
        fake.tables.bookings = [vieja({ end_date: '2026-09-11', start_date: '2026-09-04' })]

        // 2026-12-19T22:30Z = 23:30 de Madrid del 19: día 99
        freeze('2026-12-19T22:30:00Z')
        const antes = await send()
        assert.equal(antes.json.policy.today, '2026-12-19')
        assert.equal(antes.json.summary.files, 0, 'día 99 en invierno: se conserva')
        mock.timers.reset()

        // 2026-12-19T23:30Z = 00:30 de Madrid del 20: día 100. En UTC seguiría siendo el 19
        freeze('2026-12-19T23:30:00Z')
        const ahora = await send()
        assert.equal(ahora.json.policy.today, '2026-12-20', 'en UTC sería el 19 y no habría vencido')
        assert.equal(ahora.json.summary.files, 6, 'día 100 en invierno: vence')
    })

    it('los 3 años también vencen en la medianoche de Madrid y no en la de UTC', async () => {
        freeze(MADRID_3_ANOS_MENOS_1)
        const antes = await send({ confirm: true })
        assert.equal(antes.json.policy.today, '2029-06-09')
        assert.equal(antes.json.summary.columns, 0, 'un día antes del aniversario no se borra ningún dato')
        assert.equal(row().customer_dni, '12345678Z')
        assert.equal(row().legal_data_purged_at, null)
        mock.timers.reset()

        freeze(MADRID_3_ANOS)
        const ahora = await send({ confirm: true })
        assert.equal(ahora.json.policy.today, '2029-06-10', 'en UTC sería el 9 y no habría vencido')
        assert.equal(ahora.json.summary.columns, 6)
        assert.equal(row().customer_dni, null)
    })

    it('el año 2 no purga datos legales: solo el 3', async () => {
        freeze('2028-06-10T10:00:00Z')
        const res = await send({ confirm: true })
        assert.equal(res.json.summary.columns, 0)
        assert.equal(res.json.legal.length, 0)
        assert.equal(row().customer_name, 'Ana Pérez')
    })

    it('un 29 de febrero vence el 1 de marzo (un día MÁS de conservación), por la ruta', async () => {
        fake.tables.bookings = [vieja({ start_date: '2024-02-22', end_date: '2024-02-29' })]

        // 2027-02-27T23:30Z = 00:30 de Madrid del 28 de febrero: todavía no
        freeze('2027-02-27T23:30:00Z')
        const antes = await send({ confirm: true })
        assert.equal(antes.json.policy.today, '2027-02-28')
        assert.equal(antes.json.summary.columns, 0, 'el 28 de febrero de 2027 aún se conserva')
        mock.timers.reset()

        freeze('2027-02-28T23:30:00Z')
        const ahora = await send({ confirm: true })
        assert.equal(ahora.json.policy.today, '2027-03-01')
        assert.equal(ahora.json.summary.columns, 6, 'el 1 de marzo de 2027 vence')
    })

    /* ------------------------------------------------------------------ */
    /* 5. Los dos plazos no se pisan, e idempotencia                       */
    /* ------------------------------------------------------------------ */

    it('a los 100 días se van las imágenes y se quedan los datos legales; a los 3 años, al revés', async () => {
        freeze(MADRID_DIA_100)
        const cien = await send({ confirm: true })
        assert.equal(cien.json.summary.files, 6, 'las imágenes se van')
        assert.equal(cien.json.summary.columns, 0, 'y ningún dato legal')
        const tras100 = row()
        assert.equal(tras100.customer_dni, '12345678Z')
        assert.equal(tras100.customer_name, 'Ana Pérez')
        assert.deepEqual(tras100.passengers, [{ fullName: 'Luis Pérez', dniNie: 'AB123456', isSecondDriver: true }])
        assert.equal(tras100.legal_data_purged_at, null)
        assert.equal(tras100.identity_images_purged_at, '2026-09-17T22:30:00.000Z')
        mock.timers.reset()

        freeze(MADRID_3_ANOS)
        const tresAnos = await send({ confirm: true })
        assert.equal(tresAnos.json.summary.files, 0, 'las imágenes ya no estaban')
        assert.equal(tresAnos.json.summary.columns, 6, 'ahora sí los datos legales')
        const tras3 = row()
        assert.equal(tras3.customer_dni, null)
        assert.deepEqual(tras3.passengers, [])
        assert.equal(tras3.total_price, 1200, 'el importe nunca se toca')
        assert.equal(tras3.start_date, '2026-06-03', 'ni las fechas')
        assert.equal(tras3.identity_images_purged_at, '2026-09-17T22:30:00.000Z', 'la constancia de las imágenes no se reescribe')
    })

    it('tres ejecuciones seguidas: una sola fila de registro y la constancia no se reescribe', async () => {
        freeze(MADRID_3_ANOS)
        await send({ confirm: true })
        const primera = { ...row() }
        assert.equal(fake.tables.retention_purge_log.length, 1)
        mock.timers.reset()

        // Un instante distinto: si volviera a escribir, el sello de hora cambiaría
        freeze('2029-07-01T10:00:00Z')
        const segunda = await send({ confirm: true })
        const tercera = await send({ confirm: true })

        assert.equal(segunda.json.summary.files, 0)
        assert.equal(segunda.json.summary.columns, 0)
        assert.equal(segunda.json.logged, false)
        assert.equal(tercera.json.summary.columns, 0)
        assert.equal(fake.tables.retention_purge_log.length, 1, 'el registro no se duplica')
        assert.equal(row().legal_data_purged_at, primera.legal_data_purged_at, 'no se reescribe el sello')
        assert.equal(row().identity_images_purged_at, primera.identity_images_purged_at)
        assert.equal(tercera.json.logged, false)
    })

    it('la segunda pasada no manda ningún UPDATE a bookings: lo ya purgado no se vuelve a escribir', async () => {
        freeze(MADRID_3_ANOS)
        await send({ confirm: true })
        fake.requests.length = 0
        const segunda = await send({ confirm: true })
        assert.equal(segunda.status, 200)
        assert.deepEqual(escrituras().map(r => `${r.method} ${r.path}`), [], 'ni una escritura en la repetición')
    })

    /* ------------------------------------------------------------------ */
    /* 6. Lo que no se reconoce no se borra                                */
    /* ------------------------------------------------------------------ */

    /**
     * ADAPTADO tras el hallazgo de `seguridad-auditor`: la respuesta ya no repite el nombre completo
     * de los archivos que no reconoce (un nombre puesto a mano puede llevar datos personales:
     * «dni-de-ana-perez.jpg»). Ahora devuelve el recuento y una muestra recortada. Lo que este test
     * mide sigue siendo lo mismo: que esos archivos NO se borran y que se informa de que están.
     */
    it('no borra lo que no reconoce ni las subcarpetas de reserva, e informa de cuántos hay sin repetir sus nombres', async () => {
        freeze(MADRID_DIA_100)
        const extraños = [
            `${CLIENTE}/notas.txt`,
            `${CLIENTE}/dni_front.jpg`,
            `${CLIENTE}/${B_VIEJA}/factura-de-ana-perez.pdf`,
        ]
        fake.seedStorage('documents', extraños)
        const res = await send({ confirm: true })

        const quedan = fake.storagePaths('documents')
        for (const p of extraños) assert.ok(quedan.includes(p), `no se puede borrar ${p}`)

        const informados = res.json.folders.reduce((total: number, f: any) => total + f.unknown, 0)
        assert.equal(informados, extraños.length, 'se informa de los tres')
        const titular = res.json.folders.find((f: any) => f.scope === 'holder_images')
        // `dni_front.jpg` pasa de 10 caracteres y se recorta; `notas.txt` no llega y va entero
        assert.deepEqual(titular.unknownSample.sort(), ['dni_front.…', 'notas.txt'].sort())
        assert.ok(!JSON.stringify(res.json).includes('ana-perez'), 'ningún nombre completo en la respuesta')

        // La subcarpeta de la reserva no se borra como si fuera un archivo
        assert.ok(!quedan.includes(`${CLIENTE}/${B_VIEJA}`))
    })

    /* ------------------------------------------------------------------ */
    /* 7. Lo que falla: borrado a medias y tope de candidatas              */
    /* ------------------------------------------------------------------ */

    /**
     * QA-RET-1, ARREGLADO. Este test medía el fallo: con `remove` en tandas de 100, si caía la
     * segunda, los ~100 archivos de la primera estaban borrados de verdad pero `folder.deleted` se
     * quedaba en 0, el resumen contaba de menos y esas rutas no entraban en el registro. Ahora cada
     * tanda que sale bien se cuenta y se registra antes de abandonar la carpeta, así que las
     * afirmaciones se invierten: lo borrado TIENE que constar.
     */
    it('QA-RET-1: si una tanda de `remove` falla, lo borrado en las tandas anteriores consta en el resumen y en el registro', async () => {
        freeze(MADRID_DIA_100)
        // 150 copias en la carpeta de la reserva: dos tandas de REMOVE_CHUNK = 100
        const muchas = Array.from({ length: 150 }, (_, i) =>
            `${CLIENTE}/${B_VIEJA}/second_dni_front_${String(i).padStart(8, '0')}-1111-4111-8111-111111111111.jpg`)
        fake.tables.bookings = [vieja()]
        fake.seedStorage('documents', muchas)

        const instalado = globalThis.fetch
        let borrados = 0
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const req = input instanceof Request ? input : new Request(input, init)
            if (req.method === 'DELETE' && new URL(req.url).pathname.startsWith('/storage/v1/object/')) {
                borrados++
                if (borrados === 2) {
                    return new Response(JSON.stringify({ statusCode: '500', error: 'fallo', message: 'tanda 2 cae' }),
                        { status: 500, headers: { 'content-type': 'application/json' } })
                }
            }
            return instalado(req)
        }) as typeof fetch

        const res = await send({ confirm: true })
        globalThis.fetch = instalado

        assert.equal(res.status, 200)
        const carpeta = res.json.folders.find((f: any) => f.scope === 'booking_images')
        assert.ok(carpeta.error, 'la respuesta dice que la carpeta falló')

        const quedan = fake.storagePaths('documents')
        const idas = TODAS.concat(muchas).filter(p => !quedan.includes(p))
        assert.ok(idas.length >= 100, `la primera tanda se borró de verdad: ${idas.length} archivos`)

        // Y todo lo borrado consta: en la respuesta, en el resumen y en el registro
        assert.equal(carpeta.deleted, 100, 'la respuesta cuenta la tanda que salió bien')
        const registradas = (fake.tables.retention_purge_log[0]?.detail as any[] || []).flatMap(e => e.items as string[])
        assert.deepEqual(registradas.sort(), [...idas].sort(), 'cada archivo borrado consta en retention_purge_log')
        assert.equal(res.json.summary.files, idas.length, 'y el resumen cuenta exactamente lo borrado')

        // La carpeta quedó a medias: la reserva NO se sella, para que el siguiente barrido la repita
        assert.equal(row().identity_images_purged_at, null, 'sin sello: queda pendiente')
    })

    /**
     * QA-RET-2, ARREGLADO. Medía dos fallos de `loadCandidates`: pedía `.limit(limit)` sin `.order()`
     * y sin excluir lo ya purgado, así que con más candidatas que el tope los datos legales de una
     * reserva de 3 años podían no purgarse nunca, y sin orden la lista que el administrador revisaba
     * en la simulación no era necesariamente la que se borraba. Ahora hay una consulta por plazo,
     * cada una ordenada por `end_date` ascendente y con su propio tope, así que el plazo de 3 años
     * tiene presupuesto propio y no lo puede agotar el de 100 días.
     */
    it('QA-RET-2: con más candidatas de 100 días que el tope, los datos legales se purgan igual', async () => {
        freeze(MADRID_3_ANOS)
        // 60 reservas pasadas de los 100 días, y la de 3 años insertada DESPUÉS
        fake.tables.bookings = Array.from({ length: 60 }, (_, i) => ({
            id: `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, '0')}`,
            user_id: OTRO, status: 'completed', payment_status: 'paid',
            start_date: '2029-01-10', end_date: '2029-01-17', ...audit,
        }))
        fake.tables.bookings.push(vieja())

        const res = await send({ confirm: true })
        assert.equal(res.status, 200)
        assert.equal(res.json.truncated, true, 'avisa de que se ha quedado corta en imágenes')
        assert.equal(res.json.summary.columns, 6, 'y aun así purga los datos legales de la de 3 años')
        assert.equal(row().customer_dni, null, 'que ya no están')

        // La simulación revisa lo mismo que se borra: las consultas van ordenadas
        const consultas = fake.requests.filter(r => r.path === '/rest/v1/bookings' && r.query.get('order'))
        assert.ok(consultas.length > 0)
        for (const c of consultas) assert.equal(c.query.get('order'), 'end_date.asc,id.asc')
    })

    /* ------------------------------------------------------------------ */
    /* 8. El atajo `bookingId` se salta el corte: lo único que frena es    */
    /*    la comprobación del plazo sobre esa reserva                      */
    /* ------------------------------------------------------------------ */

    it('pedir una reserva por `bookingId` NO se salta el plazo: dentro de los 100 días no se borra nada', async () => {
        freeze('2026-06-20T10:00:00Z') // 10 días después de la devolución
        const res = await send({ bookingId: B_VIEJA, confirm: true })

        assert.equal(res.status, 200)
        assert.equal(res.json.reviewed, 1, 'la reserva se lee aunque no haya pasado el corte')
        assert.deepEqual(res.json.folders, [], 'pero no se mira ninguna carpeta')
        assert.deepEqual(res.json.holders, [], 'ni se decide nada sobre el titular')
        assert.equal(res.json.summary.files, 0)
        assert.equal(res.json.summary.columns, 0)
        assert.deepEqual(fake.storagePaths('documents'), [...TODAS].sort(), 'nada borrado')
        assert.equal(row().customer_dni, '12345678Z')
    })

    /**
     * ADAPTADO tras el hallazgo de `seguridad-auditor`: pedir `bookingId` arrastraba la carpeta de
     * CUENTA del titular, así que una purga «dirigida a una reserva» se llevaba todas sus fotos de
     * identidad. Ahora el modo dirigido deja esa carpeta fuera (hay que pasar `userId` a propósito),
     * así que se borran 3 archivos (la subcarpeta de esa reserva) y no 6.
     */
    it('pedir por `bookingId` una reserva dentro de los 3 años borra las imágenes DE ESA RESERVA pero NO sus datos legales', async () => {
        freeze(MADRID_DIA_100)
        const res = await send({ bookingId: B_VIEJA, confirm: true })
        assert.equal(res.json.summary.files, 3, 'solo la subcarpeta de esa reserva')
        assert.equal(res.json.summary.columns, 0, 'los 3 años no han pasado')
        assert.equal(row().customer_dni, '12345678Z')
        assert.ok(FOTOS_TITULAR.every(p => fake.storagePaths('documents').includes(p)), 'el DNI del titular sigue ahí')
        assert.match(res.json.policy.holderFoldersExcluded, /userId/, 'y la respuesta lo dice')
    })

    it('con dos reservas, solo se purga la que ha vencido: la otra no se toca', async () => {
        freeze(MADRID_3_ANOS)
        // Vencida de 3 años (la de Ana) y otra del mismo día pero de hace 110 días
        fake.tables.bookings.push({
            id: B_OTRA, user_id: OTRO, status: 'completed', payment_status: 'paid',
            start_date: '2029-02-15', end_date: '2029-02-22',
            customer_name: 'Berta Ruiz', customer_email: 'berta@example.com', customer_dni: '87654321X',
            customer_phone: '611111111', customer_address: 'Calle Nueva 2', total_price: 800, ...audit,
        })

        const res = await send({ confirm: true })
        assert.equal(res.status, 200)
        assert.deepEqual(res.json.legal.map((l: any) => l.bookingId), [B_VIEJA], 'solo la de 3 años')

        assert.equal(row(B_VIEJA).customer_dni, null, 'la vencida se purga')
        assert.equal(row(B_VIEJA).legal_data_purged_at, '2029-06-09T22:30:00.000Z')

        const otra = row(B_OTRA)
        assert.equal(otra.customer_dni, '87654321X', 'la de 110 días conserva sus datos legales')
        assert.equal(otra.customer_name, 'Berta Ruiz')
        assert.equal(otra.legal_data_purged_at, null, 'y no se le pone sello de purga de DATOS')
        // ADAPTADO: su plazo de IMÁGENES sí había vencido (110 días) y su carpeta se revisó sin
        // encontrar nada, así que ahora se sella con 0. Antes no se sellaba nunca y la consulta la
        // devolvía en cada ejecución, sin que nadie pudiera distinguir «revisada» de «sin revisar»
        assert.ok(otra.identity_images_purged_at, 'su plazo de imágenes venció y queda revisada')
        assert.equal(otra.identity_images_purged_count, 0, 'sin ningún archivo que borrar')
    })

    /**
     * ADAPTADO tras el hallazgo de `qa-verificador`: la constancia se sella también cuando la
     * carpeta se revisó y no había nada. El recuento sigue siendo el de la carpeta de CADA reserva,
     * que es lo que este test protege: no se le atribuye a una reserva lo borrado en otra.
     */
    it('la constancia de imágenes cuenta solo los archivos de cada reserva', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings.push({
            id: B_OTRA, user_id: OTRO, status: 'completed', payment_status: 'paid',
            start_date: '2026-06-03', end_date: DEVOLUCION, ...audit,
        })
        const res = await send({ confirm: true })
        assert.equal(res.status, 200)
        assert.equal(row(B_VIEJA).identity_images_purged_count, 3, 'las tres de su carpeta')
        assert.equal(row(B_OTRA).identity_images_purged_count, 0, 'la otra no tiene carpeta: cero, no tres')
    })

    it('una reserva con un `user_id` que no es un segmento seguro no abre ninguna carpeta', async () => {
        freeze(MADRID_DIA_100)
        // Un `user_id` con una barra convertiría la carpeta en otra ruta del bucket
        fake.tables.bookings = [vieja({ user_id: `${OTRO}/${B_VIEJA}` })]
        const res = await send({ confirm: true })
        assert.equal(res.status, 200)
        assert.deepEqual(res.json.folders, [], 'ni la de la reserva ni la del titular')
        assert.equal(res.json.summary.files, 0)
        assert.deepEqual(fake.storagePaths('documents'), [...TODAS].sort())
    })

    /**
     * QA-RET-3, ARREGLADO. Una reserva vencida sin `user_id` se descartaba en silencio: contaba en
     * `reviewed` y no salía en `folders`, `skipped` ni `holders`, así que era invisible para quien
     * revisaba la simulación. Ahora se informa con motivo `no_user`, igual que `no_dates`.
     */
    it('QA-RET-3: una reserva sin `user_id` se informa como saltada con motivo `no_user`', async () => {
        freeze(MADRID_DIA_100)
        fake.tables.bookings = [vieja({ user_id: null })]
        fake.seedStorage('documents', [`sin-cuenta/dni_front_88888888-8888-4888-8888-888888888888.jpg`])

        const res = await send()
        assert.equal(res.status, 200)
        assert.equal(res.json.reviewed, 1, 'se lee la reserva')
        assert.deepEqual(res.json.folders, [], 'no se mira ninguna carpeta')
        assert.deepEqual(res.json.skipped.map((s: any) => s.reason), ['no_user'], 'y se ve en la simulación')
        assert.equal(res.json.skipped[0].bookingId, B_VIEJA, 'con la reserva que hay que revisar a mano')
    })
})

/* ====================================================================== */
/* El plazo de SUBIDA no se ha movido con el renombrado                    */
/* ====================================================================== */

describe('QA conservación: el plazo de SUBIDA sigue siendo otro plazo', () => {
    afterEach(() => mock.timers.reset())

    it('`bookingReturnDay` es el mismo día que usa el plazo de subida: `end_date`, o la recogida si no consta', () => {
        assert.equal(bookingReturnDay({ start_date: '2026-06-03', end_date: DEVOLUCION }), DEVOLUCION)
        assert.equal(uploadDeadlineDay({ start_date: '2026-06-03', end_date: DEVOLUCION }), DEVOLUCION)
        assert.equal(bookingReturnDay({ start_date: '2026-06-03', end_date: null }), '2026-06-03')
        assert.equal(uploadDeadlineDay({ start_date: '2026-06-03', end_date: null }), '2026-06-03')
        assert.equal(bookingReturnDay({ start_date: null, end_date: null }), '')
        assert.equal(uploadDeadlineDay({ start_date: null, end_date: null }), '')
        assert.equal(bookingReturnDay(null), '')
    })

    it('el plazo de subida se cierra el día DESPUÉS de la devolución, no a los 100 días', () => {
        const reserva = { id: B_VIEJA, status: 'active', payment_status: 'paid', start_date: '2026-06-03', end_date: DEVOLUCION }

        // El propio día de la devolución sigue abierto
        mock.timers.enable({ apis: ['Date'], now: at('2026-06-10T12:00:00Z') })
        assert.equal(uploadWindowState(reserva), 'open', 'el día de la devolución la subida está abierta')
        mock.timers.reset()

        // El día siguiente ya está cerrado: los 100 días de conservación NO abren nada
        mock.timers.enable({ apis: ['Date'], now: at('2026-06-11T12:00:00Z') })
        assert.equal(uploadWindowState(reserva), 'returned', 'al día siguiente ya no se puede subir')
        mock.timers.reset()

        // Y a los 100 días, cuando vence la conservación, sigue cerrado
        mock.timers.enable({ apis: ['Date'], now: at(MADRID_DIA_100) })
        assert.equal(uploadWindowState(reserva), 'returned')
        assert.equal(identityImagePurgeDay(reserva), DIA_100, 'ese es el otro plazo, el de borrar')
    })

    it('los dos plazos son distintos y no se confunden: 1 día para subir, 100 para borrar, 3 años para los datos', () => {
        const reserva = { id: B_VIEJA, start_date: '2026-06-03', end_date: DEVOLUCION }
        assert.equal(uploadDeadlineDay(reserva), '2026-06-10')
        assert.equal(identityImagePurgeDay(reserva), '2026-09-18')
        assert.equal(legalDataPurgeDay(reserva), '2029-06-10')
        assert.notEqual(uploadDeadlineDay(reserva), identityImagePurgeDay(reserva))
    })
})

/* ====================================================================== */
/* documentsMatching no ha cambiado latestDocument                         */
/* ====================================================================== */

describe('QA conservación: `documentsMatching` frente a `latestDocument`', () => {
    const f = (name: string, created_at?: string | null): StoredFile => ({ name, created_at: created_at ?? null })

    const archivos = [
        f('dni_front_11111111-1111-4111-8111-111111111111.jpg', '2026-01-01T10:00:00Z'),
        f('dni_front_22222222-2222-4222-8222-222222222222.jpg', '2026-05-01T10:00:00Z'),
        f('dni_front_1699999999.jpeg', null),
        f('second_dni_front_33333333-3333-4333-8333-333333333333.jpg', '2026-06-01T10:00:00Z'),
        f('dni_front.jpg'),
        f('otro.pdf'),
    ]

    it('`latestDocument` sigue devolviendo la copia más reciente y solo una', () => {
        assert.equal(latestDocument(archivos, ['dni_front']), 'dni_front_22222222-2222-4222-8222-222222222222.jpg')
        assert.equal(latestDocument(archivos, ['second_dni_front']), 'second_dni_front_33333333-3333-4333-8333-333333333333.jpg')
        assert.equal(latestDocument(archivos, ['license_front', 'front']), null, 'ningún carnet subido')
    })

    it('`documentsMatching` devuelve TODAS las copias, y exactamente las mismas que reconoce `latestDocument`', () => {
        assert.deepEqual(documentsMatching(archivos, ['dni_front']), [
            'dni_front_11111111-1111-4111-8111-111111111111.jpg',
            'dni_front_22222222-2222-4222-8222-222222222222.jpg',
            'dni_front_1699999999.jpeg',
        ])
        // Lo que no reconoce ninguno de los dos
        assert.equal(latestDocument([f('dni_front.jpg')], ['dni_front']), null)
        assert.deepEqual(documentsMatching([f('dni_front.jpg')], ['dni_front']), [])
    })

    it('el prefijo `front` del carnet no se come `dni_front` ni `second_dni_front`', () => {
        assert.deepEqual(documentsMatching(archivos, ['front']), [], 'ninguno empieza por `front_`')
        assert.deepEqual(documentsMatching(archivos, ['second_dni_front']),
            ['second_dni_front_33333333-3333-4333-8333-333333333333.jpg'])
    })

    it('`selectIdentityFiles` reparte en purgar / subcarpetas / desconocidos sin solaparse', () => {
        const conCarpeta = [...archivos, f('44444444-4444-4444-8444-444444444444')]
        const s = selectIdentityFiles(conCarpeta, ['dni_front'])
        assert.deepEqual(s.purge.sort(), [
            'dni_front_11111111-1111-4111-8111-111111111111.jpg',
            'dni_front_1699999999.jpeg',
            'dni_front_22222222-2222-4222-8222-222222222222.jpg',
        ].sort())
        assert.deepEqual(s.folders, ['44444444-4444-4444-8444-444444444444'])
        assert.deepEqual(s.unknown.sort(), ['dni_front.jpg', 'otro.pdf', 'second_dni_front_33333333-3333-4333-8333-333333333333.jpg'].sort())
        const todos = [...s.purge, ...s.folders, ...s.unknown]
        assert.equal(new Set(todos).size, todos.length, 'ningún nombre en dos cestas')
        assert.equal(todos.length, conCarpeta.length, 'y ninguno perdido')
    })
})

/* ====================================================================== */
/* Funciones puras: lo que el autor no midió                               */
/* ====================================================================== */

describe('QA conservación: huecos de las funciones puras', () => {
    it('la cuenta con una reserva viva por delante retiene, estado por estado', () => {
        const vencida = { id: B_VIEJA, status: 'completed', start_date: '2026-06-03', end_date: DEVOLUCION }
        const ahora = at(MADRID_DIA_100)
        for (const status of ['pending', 'confirmed', 'active', 'completed']) {
            const futura = { id: B_OTRA, status, start_date: '2027-06-01', end_date: '2027-06-08' }
            const d = holderImagePurgeDecision([vencida, futura], ahora)
            assert.equal(d.due, false, `con una ${status} por delante no debe vencer`)
            assert.equal(d.purgeDay, '2027-09-16', `y el día es el de la ${status}`)
        }
        for (const status of ['cancelled', 'rejected', 'expired']) {
            const futura = { id: B_OTRA, status, start_date: '2027-06-01', end_date: '2027-06-08' }
            assert.equal(holderImagePurgeDecision([vencida, futura], ahora).due, true, `una ${status} no alarga`)
        }
    })

    it('el orden de las reservas en la lista no cambia la decisión del titular', () => {
        const vencida = { id: B_VIEJA, status: 'completed', start_date: '2026-06-03', end_date: DEVOLUCION }
        const futura = { id: B_OTRA, status: 'confirmed', start_date: '2027-06-01', end_date: '2027-06-08' }
        const ahora = at(MADRID_DIA_100)
        assert.deepEqual(holderImagePurgeDecision([vencida, futura], ahora), holderImagePurgeDecision([futura, vencida], ahora))
    })

    it('una reserva viva sin fechas bloquea aunque vaya acompañada de otra con fechas de sobra', () => {
        const vencida = { id: B_VIEJA, status: 'completed', start_date: '2020-01-01', end_date: '2020-01-08' }
        const sinFechas = { id: B_OTRA, status: 'pending', start_date: null, end_date: null }
        const d = holderImagePurgeDecision([vencida, sinFechas], at(MADRID_DIA_100))
        assert.equal(d.reason, 'undatable_booking')
        assert.equal(d.due, false)
        assert.equal(d.purgeDay, '')
    })

    it('`legalDataPurgePatch` no inventa columnas ni toca los importes del desglose', () => {
        const patch = legalDataPurgePatch({
            customer_name: 'Ana', customer_dni: '', passengers: [],
            total_price: 1200, start_date: '2026-06-03', notes: 'cliente de confianza',
            pricing_breakdown: { total: 1200, deposit: 500, passengers: [{ fullName: 'Luis' }] },
        })
        assert.deepEqual(Object.keys(patch).sort(), ['customer_name', 'pricing_breakdown'])
        assert.equal(patch.customer_name, null)
        assert.deepEqual(patch.pricing_breakdown, { total: 1200, deposit: 500 })
        assert.ok(!('customer_dni' in patch), 'una columna vacía no se vuelve a vaciar')
        assert.ok(!('passengers' in patch), 'una lista vacía tampoco')
        assert.ok(!('total_price' in patch) && !('notes' in patch), 'ni los datos de la operación')
    })

    it('`legalDataPurgePatch` deja `[]` en passengers y null en el resto, nunca la cadena "null"', () => {
        const patch = legalDataPurgePatch({ customer_name: 'Ana', passengers: [{ fullName: 'Luis' }] })
        assert.deepEqual(patch, { customer_name: null, passengers: [] })
    })
})
