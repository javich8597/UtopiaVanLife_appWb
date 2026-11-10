import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import {
    MAX_BOOKING_FOLDERS,
    buildSecondDriverGroups,
    handoverSecondDriverDocs,
    resolveSecondDriverDocuments,
    secondDriverDocsNotices,
    secondDriverPhotoPresence,
    secondDriverViewerCaption,
} from '../lib/admin/secondDriverDocuments'
import { secondDriverAlerts } from '../lib/admin/secondDriverAlerts'
import { secondDriverStepInput } from '../lib/handover/secondDriverStep'
import { GET as secondDriverDocsGET } from '../app/api/admin/bookings/second-driver-docs/route'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { NextIntlClientProvider } from 'next-intl'
import HandoverClient from '../app/[locale]/admin/entregas/[bookingId]/HandoverClient'
import BookingDetailModal from '../app/[locale]/admin/bookings/BookingDetailModal'
import AdminVerificationsPage from '../app/[locale]/admin/verifications/page'
import VerificationsClient from '../app/[locale]/admin/verifications/VerificationsClient'

/**
 * Remate de la auditoría del segundo conductor en el backoffice: fotos antiguas en la entrega,
 * carpetas de Storage, nombre en el visor, lectura de reservas en verificaciones y avisos derivados
 * de lo que hay en Storage. Storage y Supabase simulados en memoria: ninguna petición real.
 */

const USER = '00000000-0000-4000-8000-000000000001'
const ADMIN_ID = '00000000-0000-4000-8000-0000000000aa'
const B1 = '11111111-1111-4111-8111-111111111111'
const OTHER = '99999999-9999-4999-8999-999999999999'
const U1 = '3f2b8c1e-5d4a-4e7b-9c10-0a1b2c3d4e5f'

// Las pantallas usan el router de Next: fuera de la app se les da un contexto vacío
const noop = () => {}
const ROUTER = { push: noop, replace: noop, refresh: noop, back: noop, forward: noop, prefetch: noop }
const render = (type: any, props: Record<string, unknown>) =>
    renderToStaticMarkup(
        React.createElement(NextIntlClientProvider, {
            locale: 'es',
            messages: {},
            children: React.createElement(
                AppRouterContext.Provider,
                { value: ROUTER as never },
                React.createElement(SearchParamsContext.Provider, { value: new URLSearchParams() }, React.createElement(type, props))
            ),
        })
    )

const file = (name: string, created_at = '2026-10-05T09:30:00.000Z') => ({ name, created_at })
const folder = (name: string) => ({ name, id: null })
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

type Tree = Record<string, Array<{ name: string; created_at?: string }>>

/** Storage en memoria; `failList` / `failSign` simulan una caída o un fallo al firmar */
function fakeStorage(tree: Tree, opts: { failList?: boolean; failSign?: boolean } = {}) {
    const listed: string[] = []
    const client = {
        storage: {
            from: () => ({
                list: async (path: string) => {
                    listed.push(path)
                    if (opts.failList) return { data: null, error: { message: 'caído' } }
                    return { data: tree[path] ?? [], error: null }
                },
                createSignedUrl: async (path: string) =>
                    opts.failSign
                        ? { data: null, error: { message: 'sin firma' } }
                        : { data: { signedUrl: `https://signed.test/${path}` }, error: null },
            }),
        },
    }
    return { client, listed }
}

const liveBooking = (id: string, extra: Record<string, unknown> = {}) => ({
    id, user_id: USER, status: 'confirmed', payment_status: 'paid',
    start_date: '2099-06-01', end_date: '2099-06-08',
    passengers: [{ fullName: 'Ana Ruiz', dniNie: '12345678Z', isSecondDriver: true, birthDate: '1990-01-01', licenseDate: '2012-01-01' }],
    ...extra,
})

describe('N4: la entrega no presenta fotos de una subida anterior como de esta reserva', () => {
    const legacyFolders = [{ bookingId: null, urls: { dniFrontUrl: null, dniBackUrl: null, licenseFrontUrl: 'https://s/viejo-1', licenseBackUrl: 'https://s/viejo-2' } }]

    it('las fotos sueltas salen aparte y fuera de los bloques de esta reserva', () => {
        const { thisBooking, earlierUpload } = handoverSecondDriverDocs(legacyFolders, liveBooking(B1))
        assert.ok(earlierUpload, 'la subida anterior se avisa, no se esconde')
        assert.equal(earlierUpload!.urls.licenseFrontUrl, 'https://s/viejo-1')
        assert.equal(thisBooking.some(g => g.legacy), false)
        assert.equal(thisBooking.some(g => Object.values(g.urls).includes('https://s/viejo-1')), false)
        // la reserva lleva segundo conductor y no ha subido nada propio: sigue saliendo su bloque vacío
        assert.deepEqual(thisBooking.map(g => g.bookingId), [B1])
        assert.deepEqual(Object.values(thisBooking[0].urls), [null, null, null, null])
    })

    it('si la reserva no lleva segundo conductor, no se enseña nada antiguo', () => {
        const { thisBooking, earlierUpload } = handoverSecondDriverDocs(legacyFolders, liveBooking(B1, { passengers: [] }))
        assert.equal(earlierUpload, null)
        assert.deepEqual(thisBooking, [])
    })

    it('las fotos de la carpeta de esta reserva sí son de esta reserva', () => {
        const own = [{ bookingId: B1, urls: { dniFrontUrl: null, dniBackUrl: null, licenseFrontUrl: 'https://s/propio', licenseBackUrl: null } }, ...legacyFolders]
        const { thisBooking, earlierUpload } = handoverSecondDriverDocs(own, liveBooking(B1))
        assert.equal(thisBooking.length, 1)
        assert.equal(thisBooking[0].urls.licenseFrontUrl, 'https://s/propio')
        assert.equal(earlierUpload!.urls.licenseFrontUrl, 'https://s/viejo-1')
    })

    const handoverProps = (extra: Record<string, unknown>) => ({
        kind: 'pickup' as const,
        booking: { id: B1, start_date: '2099-06-01', end_date: '2099-06-08', customer_name: 'Titular', campers: { name: 'NEO' } },
        customer: { full_name: 'Titular', verification_status: 'verified' },
        licensePhotos: [],
        initial: null,
        pickupKm: null,
        ...extra,
    })

    it('la hoja rotula la subida anterior como ajena y no la mezcla con «Carnet del segundo conductor»', () => {
        const { thisBooking, earlierUpload } = handoverSecondDriverDocs(legacyFolders, liveBooking(B1))
        const secondDriverStep = secondDriverStepInput(liveBooking(B1), { dniFrontUrl: false, dniBackUrl: false, licenseFrontUrl: false, licenseBackUrl: false })
        const html = render(HandoverClient, handoverProps({ secondDriverGroups: thisBooking, earlierSecondDriverUpload: earlierUpload, secondDriverStep }))
        const earlierAt = html.indexOf('https://s/viejo-1')
        assert.ok(earlierAt > 0, 'la foto antigua se ve')
        assert.match(html, /No son de esta reserva/)
        assert.match(html, /Pueden ser de otra persona/)
        // ninguna imagen antigua lleva el rótulo de documentación del segundo conductor de la reserva
        for (const img of html.match(/<img[^>]*>/g) || []) {
            if (img.includes('viejo-')) assert.doesNotMatch(img, /Carnet del segundo conductor/)
        }
        // la casilla del titular habla solo del titular; el segundo conductor tiene su propio paso
        assert.match(html, /He visto el carnet físico del titular/)
        assert.match(html, /Comprobar al segundo conductor/)
        // y que no haya fotos propias sigue diciéndose: lo antiguo no lo sustituye
        assert.match(html, /Sin foto/)
        assert.match(html, /Faltan fotos: DNI\/NIE \(anverso\)/)
    })

    it('sin segundo conductor en la reserva no hay paso del segundo conductor ni nada antiguo', () => {
        const html = render(HandoverClient, handoverProps({}))
        assert.match(html, /He visto el carnet físico del titular/)
        assert.doesNotMatch(html, /segundo conductor/i)
        assert.doesNotMatch(html, /No son de esta reserva/)
    })
})

describe('N6 y N9: carpetas de Storage', () => {
    it('solo se recorren las carpetas de reservas del cliente; una carpeta ajena no se lee ni se enseña', async () => {
        const { client, listed } = fakeStorage({
            [USER]: [folder(B1), folder(OTHER)],
            [`${USER}/${B1}`]: [file(`second_license_front_${U1}.jpg`)],
            [`${USER}/${OTHER}`]: [file(`second_license_front_${U1}.jpg`)],
        })
        const result = await resolveSecondDriverDocuments(client, USER, [liveBooking(B1)])
        assert.deepEqual(result.folders.map(f => f.bookingId), [B1])
        assert.equal(listed.includes(`${USER}/${OTHER}`), false, 'no debe listar la carpeta de una reserva que no es del cliente')
        assert.equal(result.unlinkedFolders, 1)
        assert.match(secondDriverDocsNotices(result).join(' '), /no corresponde a ninguna reserva de este cliente/)
    })

    it('una reserva con otro user_id no abre su carpeta aunque se cuele en la lista', async () => {
        const { client, listed } = fakeStorage({
            [USER]: [folder(OTHER)],
            [`${USER}/${OTHER}`]: [file(`second_license_front_${U1}.jpg`)],
        })
        const result = await resolveSecondDriverDocuments(client, USER, [liveBooking(OTHER, { user_id: 'otro-cliente' })])
        assert.deepEqual(result.folders, [])
        assert.equal(listed.includes(`${USER}/${OTHER}`), false)
    })

    it('si hay más carpetas que el tope se recorren primero las reservas vivas y se avisa de las que quedan fuera', async () => {
        const tree: Tree = { [USER]: [] }
        const bookings: any[] = []
        // 20 reservas vivas antiguas y 10 canceladas más recientes: con el tope, las vivas no pueden quedarse fuera
        for (let n = 1; n <= 20; n++) bookings.push(liveBooking(uuid(n), { status: 'completed', start_date: `2024-01-${String(n).padStart(2, '0')}`, end_date: '2024-02-01' }))
        for (let n = 21; n <= 30; n++) bookings.push(liveBooking(uuid(n), { status: 'cancelled', start_date: '2030-01-01', end_date: '2030-01-08' }))
        for (const b of bookings) {
            tree[USER].push(folder(b.id))
            tree[`${USER}/${b.id}`] = [file(`second_license_front_${U1}.jpg`)]
        }
        const { client, listed } = fakeStorage(tree)
        const result = await resolveSecondDriverDocuments(client, USER, bookings)

        assert.equal(result.folders.length, MAX_BOOKING_FOLDERS)
        assert.equal(result.skippedFolders, 5)
        for (let n = 1; n <= 20; n++) assert.ok(listed.includes(`${USER}/${uuid(n)}`), `la reserva viva ${n} se recorre`)
        const notice = secondDriverDocsNotices(result).join(' ')
        assert.match(notice, /25 reservas más recientes/)
        assert.match(notice, /5 más no se muestran/)
    })

    it('sin recorte ni incidencias no hay avisos', async () => {
        const { client } = fakeStorage({ [USER]: [folder(B1)], [`${USER}/${B1}`]: [file(`second_license_front_${U1}.jpg`)] })
        const result = await resolveSecondDriverDocuments(client, USER, [liveBooking(B1)])
        assert.deepEqual(secondDriverDocsNotices(result), [])
    })

    it('un fallo al listar o al firmar se dice: «No adjuntado» no puede ser un silencio', async () => {
        const tree: Tree = { [USER]: [folder(B1)], [`${USER}/${B1}`]: [file(`second_license_front_${U1}.jpg`)] }
        for (const opts of [{ failList: true }, { failSign: true }]) {
            const result = await resolveSecondDriverDocuments(fakeStorage(tree, opts).client, USER, [liveBooking(B1)])
            assert.equal(result.failed, true, JSON.stringify(opts))
            assert.match(secondDriverDocsNotices(result).join(' '), /No se pudo leer del todo/)
        }
    })

    it('el aviso de recorte y el de carpetas ajenas no aparecen con onlyBookingId (la hoja de entrega)', async () => {
        const { client } = fakeStorage({
            [USER]: [folder(B1), folder(OTHER)],
            [`${USER}/${B1}`]: [file(`second_license_front_${U1}.jpg`)],
        })
        const result = await resolveSecondDriverDocuments(client, USER, [liveBooking(B1)], { onlyBookingId: B1 })
        assert.equal(result.unlinkedFolders, 0)
        assert.deepEqual(secondDriverDocsNotices(result), [])
    })
})

describe('N10: el visor de la foto del segundo conductor enseña a esa persona', () => {
    it('el pie lleva el nombre del segundo conductor y deja al titular como tal', () => {
        const caption = secondDriverViewerCaption(
            { fullName: 'Ana Ruiz', document: '12345678Z', legacy: false },
            { full_name: 'Luis Titular', email: 'luis@example.com' }
        )
        assert.match(caption, /Segundo conductor: Ana Ruiz/)
        assert.match(caption, /12345678Z/)
        assert.match(caption, /Titular: Luis Titular/)
        assert.doesNotMatch(caption, /^Cliente/)
    })

    it('sin nombre en la ficha no se pone el del titular como si fuera suyo', () => {
        const caption = secondDriverViewerCaption({ fullName: '', document: '', legacy: false }, { full_name: 'Luis Titular', email: 'l@e.com' })
        assert.match(caption, /sin nombre en la ficha/)
        assert.doesNotMatch(caption, /Segundo conductor: Luis/)
    })

    it('una subida anterior avisa de que puede no ser esa persona', () => {
        assert.match(secondDriverViewerCaption({ fullName: '', document: '', legacy: true }, { email: 'l@e.com' }), /puede no ser la persona/)
    })
})

describe('Verificaciones: lectura de reservas con el mismo acceso que Storage', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [
                { id: ADMIN_ID, role: 'admin' },
                { id: USER, role: 'customer', email: 'luis@example.com', full_name: 'Luis Titular', verification_status: 'pending' },
            ],
            bookings: [liveBooking(B1)],
        })
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        console.error = () => {}
        console.warn = () => {}
    })
    afterEach(() => {
        fake.restore()
        Object.assign(console, silenced)
    })

    /** Props que la página entrega al cliente de verificaciones */
    async function pageUsers(): Promise<any[]> {
        const tree: any = await AdminVerificationsPage()
        const find = (node: any): any => {
            if (!node || typeof node !== 'object') return null
            if (node.type === VerificationsClient) return node
            const children = React.Children.toArray(node.props?.children)
            for (const child of children) { const hit = find(child); if (hit) return hit }
            return null
        }
        return find(tree).props.initialUsers
    }

    it('lee las reservas con la clave privilegiada, no con la sesión del admin', async () => {
        await pageUsers()
        const reads = fake.requests.filter(r => r.path === '/rest/v1/bookings' && r.method === 'GET')
        assert.ok(reads.length > 0, 'debe leer las reservas de los clientes pendientes')
        for (const read of reads) {
            assert.equal(
                read.headers.get('authorization'),
                `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'con la sesión, una política RLS que no deje al admin ver reservas ajenas lo dejaría todo «sin nombre»'
            )
        }
    })

    it('el segundo conductor sale con su nombre a partir de la reserva leída', async () => {
        const [user] = await pageUsers()
        assert.equal(user.id, USER)
        assert.equal(user.secondDriverGroups.length, 1)
        assert.equal(user.secondDriverGroups[0].fullName, 'Ana Ruiz')
    })

    it('si la lectura de reservas falla, el aviso llega a la pantalla y no se inventan bloques', async () => {
        fake.failures.table = 'bookings'
        fake.failures.method = 'GET'
        const [user] = await pageUsers()
        assert.deepEqual(user.secondDriverGroups, [])
        assert.match((user.secondDriverNotices || []).join(' '), /No se pudieron leer las reservas/)

        const html = render(VerificationsClient, { initialUsers: [user] })
        assert.match(html, /No se pudieron leer las reservas/, 'el aviso debe verse en la tarjeta, no solo en el registro')
    })
})

describe('Avisos del detalle: lo que hay en Storage manda sobre la columna', () => {
    const NOW = new Date('2026-12-01T10:00:00Z')
    const all = { dniFrontUrl: true, dniBackUrl: true, licenseFrontUrl: true, licenseBackUrl: true }
    const none = { dniFrontUrl: false, dniBackUrl: false, licenseFrontUrl: false, licenseBackUrl: false }
    const booking = (extra: Record<string, unknown> = {}) => liveBooking(B1, { start_date: '2027-06-01', end_date: '2027-06-08', ...extra })
    const codes = (b: unknown, photos: any) => secondDriverAlerts(b, NOW, photos).map(a => a.code)

    it('columna rellena pero sin ninguna foto en Storage (subida vacía): sigue avisando', () => {
        assert.deepEqual(codes(booking({ second_driver_docs_uploaded_at: '2026-11-20T10:00:00Z' }), none), ['docs_pending'])
    })

    it('columna vacía pero fotos en Storage: no avisa de que falte nada', () => {
        assert.deepEqual(codes(booking({ second_driver_docs_uploaded_at: null }), all), [])
    })

    it('subida parcial: dice qué fotos faltan, no «no ha subido nada»', () => {
        const [alert] = secondDriverAlerts(
            booking({ second_driver_docs_uploaded_at: '2026-11-20T10:00:00Z' }),
            NOW,
            { ...none, licenseFrontUrl: true }
        )
        assert.equal(alert.code, 'docs_incomplete')
        assert.equal(alert.severity, 'warn')
        assert.match(alert.text, /DNI\/NIE \(anverso\)/)
        assert.match(alert.text, /carnet \(reverso\)/)
        assert.doesNotMatch(alert.text, /carnet \(anverso\)/)
    })

    it('subida parcial pasado el plazo: aviso grave', () => {
        const closed = booking({ status: 'completed', start_date: '2026-10-01', end_date: '2026-10-08' })
        const [alert] = secondDriverAlerts(closed, NOW, { ...all, dniBackUrl: false })
        assert.equal(alert.severity, 'danger')
        assert.match(alert.text, /Ya pasó el plazo/)
    })

    it('si Storage no se pudo leer (null) se vuelve a la columna y no se afirma que falte nada más', () => {
        assert.deepEqual(codes(booking({ second_driver_docs_uploaded_at: null }), null), ['docs_pending'])
        assert.deepEqual(codes(booking({ second_driver_docs_uploaded_at: '2026-11-20T10:00:00Z' }), null), [])
        assert.deepEqual(codes(booking(), null), [])
    })

    it('el detalle de la reserva enseña el aviso (render con la columna vacía)', () => {
        const html = render(BookingDetailModal, { booking: { ...booking({ second_driver_docs_uploaded_at: null }), campers: { name: 'NEO' } }, onClose: () => {} })
        assert.match(html, /Segundo conductor a revisar/)
        assert.match(html, /aún no ha subido su documentación/)
    })
})

describe('Presencia de fotos en Storage', () => {
    it('detecta qué fotos de la carpeta de la reserva existen, y solo las second_*', async () => {
        const { client, listed } = fakeStorage({
            [`${USER}/${B1}`]: [file(`second_dni_front_${U1}.jpg`), file(`second_license_back_${U1}.png`), file(`dni_back_${U1}.jpg`)],
        })
        const presence = await secondDriverPhotoPresence(client, USER, B1)
        assert.deepEqual(presence, { dniFrontUrl: true, dniBackUrl: false, licenseFrontUrl: false, licenseBackUrl: true })
        assert.deepEqual(listed, [`${USER}/${B1}`], 'solo mira la carpeta de esa reserva')
    })

    it('devuelve null si Storage falla o si el id no es seguro', async () => {
        assert.equal(await secondDriverPhotoPresence(fakeStorage({}, { failList: true }).client, USER, B1), null)
        assert.equal(await secondDriverPhotoPresence(fakeStorage({}).client, '../x', B1), null)
        assert.equal(await secondDriverPhotoPresence(fakeStorage({}).client, USER, '../x'), null)
    })

    it('grupos: una carpeta ajena que llegue al montaje nunca queda como reserva válida', () => {
        const groups = buildSecondDriverGroups([{ bookingId: OTHER, urls: { dniFrontUrl: 'https://s/x', dniBackUrl: null, licenseFrontUrl: null, licenseBackUrl: null } }], [liveBooking(B1)])
        assert.equal(groups.find(g => g.bookingId === OTHER)?.legacy, true)
    })
})

describe('Ruta /api/admin/bookings/second-driver-docs', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }
    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: USER, role: 'customer' }],
            bookings: [liveBooking(B1)],
        })
        console.error = () => {}
        console.warn = () => {}
    })
    afterEach(() => {
        fake.restore()
        Object.assign(console, silenced)
    })
    const call = (id: string) => secondDriverDocsGET(new Request(`http://localhost/api/admin/bookings/second-driver-docs?bookingId=${id}`))

    it('un anónimo recibe 401 y no se lee ninguna reserva', async () => {
        const res = await call(B1)
        assert.equal(res.status, 401)
        assert.equal(fake.requests.some(r => r.path === '/rest/v1/bookings'), false)
    })

    it('un cliente (no admin) recibe 403', async () => {
        fake.setSession({ id: USER, email: 'c@example.com', app_metadata: {}, user_metadata: { role: 'admin' } })
        const res = await call(B1)
        assert.equal(res.status, 403)
        assert.equal(fake.requests.some(r => r.path === '/rest/v1/bookings'), false)
    })

    it('un id que no es un uuid se rechaza con 400', async () => {
        fake.setSession({ id: ADMIN_ID, email: 'a@example.com', app_metadata: {}, user_metadata: {} })
        assert.equal((await call('../../etc')).status, 400)
        assert.equal((await call('no-es-un-uuid')).status, 400)
    })

    it('una reserva inexistente responde 404', async () => {
        fake.setSession({ id: ADMIN_ID, email: 'a@example.com', app_metadata: {}, user_metadata: {} })
        assert.equal((await call(OTHER)).status, 404)
    })
})
