import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
    bookingFolderNames,
    bookingLabel,
    buildSecondDriverGroups,
    resolveSecondDriverDocuments,
    SECOND_DRIVER_DOCUMENT_PREFIXES,
} from '../lib/admin/secondDriverDocuments'
import { latestDocument, resolveCustomerDocumentUrls } from '../lib/admin/documents'

/**
 * Las fotos del segundo conductor viven en `documents/<cliente>/<reserva>/second_*`, un nivel por
 * debajo de las del titular. El panel solo listaba `documents/<cliente>` sin recursión, así que el
 * admin validaba una verificación (y entregaba la camper) sin haber visto el documento de la persona
 * que el contrato autoriza a conducir. Storage simulado en memoria: ninguna petición real.
 */

const USER = '00000000-0000-4000-8000-000000000001'
const B1 = '11111111-1111-4111-8111-111111111111'
const B2 = '22222222-2222-4222-8222-222222222222'
const U1 = '3f2b8c1e-5d4a-4e7b-9c10-0a1b2c3d4e5f'
const U2 = '9a8b7c6d-1e2f-4a3b-8c4d-5e6f7a8b9c0d'

/** Reservas del cliente cuyas carpetas se recorren: solo esas son documentación de alguien */
const BOOKINGS = [B1, B2].map(id => ({ id, user_id: USER, status: 'confirmed', start_date: '2099-06-01', end_date: '2099-06-08' }))
const resolve = async (client: any, bookings: any[] = BOOKINGS, options: { onlyBookingId?: string | null } = {}) =>
    (await resolveSecondDriverDocuments(client, USER, bookings, options)).folders

const file = (name: string, created_at = '2026-10-05T09:30:00.000Z') => ({ name, created_at })
/** Storage lista una subcarpeta como una entrada sin extensión y sin fecha */
const folder = (name: string) => ({ name, id: null })

/** Cliente de Storage en memoria: `tree` asocia cada carpeta con lo que devuelve list() */
function fakeStorage(tree: Record<string, Array<{ name: string; created_at?: string }>>) {
    const listed: string[] = []
    const signed: string[] = []
    const client = {
        storage: {
            from: (bucket: string) => {
                assert.equal(bucket, 'documents')
                return {
                    list: async (path: string) => {
                        listed.push(path)
                        if (!(path in tree)) return { data: [], error: null }
                        return { data: tree[path], error: null }
                    },
                    createSignedUrl: async (path: string) => {
                        signed.push(path)
                        return { data: { signedUrl: `https://signed.test/${path}` } }
                    },
                }
            },
        },
    }
    return { client, listed, signed }
}

describe('Fotos del segundo conductor: bajan a la carpeta de la reserva', () => {
    it('lo que hacía antes el panel no veía nada: list(<cliente>) solo trae la carpeta de la reserva', async () => {
        const { client } = fakeStorage({
            [USER]: [file(`dni_front_${U1}.jpg`), folder(B1)],
            [`${USER}/${B1}`]: [file(`second_license_front_${U2}.jpg`)],
        })
        const urls = await resolveCustomerDocumentUrls(client, USER)
        assert.equal(urls.licenseFrontUrl, null, 'las fotos del segundo conductor no son del titular')
        assert.equal(urls.dniFrontUrl, `https://signed.test/${USER}/dni_front_${U1}.jpg`)
    })

    it('lista las carpetas de reserva y firma second_* de cada una, indicando la reserva', async () => {
        const { client, listed, signed } = fakeStorage({
            [USER]: [file(`dni_front_${U1}.jpg`), folder(B1), folder(B2)],
            [`${USER}/${B1}`]: [
                file(`second_dni_front_${U1}.jpg`),
                file(`second_dni_back_${U1}.jpg`),
                file(`second_license_front_${U1}.jpg`),
                file(`second_license_back_${U1}.png`),
            ],
            [`${USER}/${B2}`]: [file(`second_license_front_${U2}.heic`)],
        })
        const sets = await resolve(client)

        assert.deepEqual(listed, [USER, `${USER}/${B1}`, `${USER}/${B2}`])
        assert.equal(sets.length, 2)
        const first = sets.find(s => s.bookingId === B1)!
        assert.equal(first.urls.dniFrontUrl, `https://signed.test/${USER}/${B1}/second_dni_front_${U1}.jpg`)
        assert.equal(first.urls.dniBackUrl, `https://signed.test/${USER}/${B1}/second_dni_back_${U1}.jpg`)
        assert.equal(first.urls.licenseFrontUrl, `https://signed.test/${USER}/${B1}/second_license_front_${U1}.jpg`)
        assert.equal(first.urls.licenseBackUrl, `https://signed.test/${USER}/${B1}/second_license_back_${U1}.png`)
        const second = sets.find(s => s.bookingId === B2)!
        assert.equal(second.urls.licenseFrontUrl, `https://signed.test/${USER}/${B2}/second_license_front_${U2}.heic`)
        assert.equal(second.urls.dniFrontUrl, null)
        // el titular no se firma aquí
        assert.equal(signed.some(p => p.includes('/dni_front_')), false)
    })

    it('con onlyBookingId (la hoja de entrega) solo recorre esa reserva', async () => {
        const { client, listed } = fakeStorage({
            [USER]: [folder(B1), folder(B2)],
            [`${USER}/${B1}`]: [file(`second_license_front_${U1}.jpg`)],
            [`${USER}/${B2}`]: [file(`second_license_front_${U2}.jpg`)],
        })
        const sets = await resolve(client, BOOKINGS, { onlyBookingId: B2.toUpperCase() })
        assert.deepEqual(sets.map(s => s.bookingId), [B2])
        assert.deepEqual(listed, [USER, `${USER}/${B2}`])
    })

    it('las subidas antiguas, sueltas en la carpeta del cliente, salen aparte y sin reserva', async () => {
        const { client } = fakeStorage({
            [USER]: [file(`second_license_front_${U1}.jpg`), file(`front_${U2}.jpg`)],
        })
        const sets = await resolve(client)
        assert.equal(sets.length, 1)
        assert.equal(sets[0].bookingId, null)
        assert.equal(sets[0].urls.licenseFrontUrl, `https://signed.test/${USER}/second_license_front_${U1}.jpg`)
        assert.equal(sets[0].urls.licenseBackUrl, null, 'el carnet del titular (front_) no es del segundo conductor')
    })

    it('una carpeta de reserva sin fotos del segundo conductor no genera bloque', async () => {
        const { client } = fakeStorage({
            [USER]: [folder(B1)],
            [`${USER}/${B1}`]: [file('notas.txt')],
        })
        assert.deepEqual(await resolve(client), [])
    })

    it('los prefijos second_* no se confunden con los del titular', () => {
        const names = [file(`second_dni_front_${U1}.jpg`), file(`dni_front_${U2}.jpg`), file(`second_license_front_${U1}.jpg`), file(`front_${U2}.jpg`)]
        assert.equal(latestDocument(names, SECOND_DRIVER_DOCUMENT_PREFIXES.dniFrontUrl), `second_dni_front_${U1}.jpg`)
        assert.equal(latestDocument(names, SECOND_DRIVER_DOCUMENT_PREFIXES.licenseFrontUrl), `second_license_front_${U1}.jpg`)
        assert.equal(latestDocument(names, ['dni_front']), `dni_front_${U2}.jpg`)
        assert.equal(latestDocument(names, ['front']), `front_${U2}.jpg`)
    })

    it('un fallo de Storage no tumba la pantalla: se devuelve vacío y marcado como fallo', async () => {
        const failing = { storage: { from: () => ({ list: async () => { throw new Error('storage caído') } }) } }
        const original = console.error
        console.error = () => {}
        try {
            const result = await resolveSecondDriverDocuments(failing, USER, BOOKINGS)
            assert.deepEqual(result.folders, [])
            assert.equal(result.failed, true, 'sin la marca, «No adjuntado» se leería como «no ha subido nada»')
        } finally {
            console.error = original
        }
    })

    it('un id de cliente con / o .. nunca llega a una ruta de Storage', async () => {
        const { client, listed } = fakeStorage({})
        assert.deepEqual((await resolveSecondDriverDocuments(client, '../otro-cliente', BOOKINGS)).folders, [])
        assert.deepEqual((await resolveSecondDriverDocuments(client, `${USER}/${B1}`, BOOKINGS)).folders, [])
        assert.deepEqual((await resolveSecondDriverDocuments(client, '', BOOKINGS)).folders, [])
        assert.deepEqual(listed, [])
    })

    it('bookingFolderNames solo toma los UUID sin extensión', () => {
        assert.deepEqual(
            bookingFolderNames([file(`dni_front_${U1}.jpg`), folder(B1), file('notas'), file(B2.toUpperCase()), file(B1)]),
            [B1, B2]
        )
    })
})

describe('Fotos del segundo conductor: bloques por reserva', () => {
    const live = {
        id: B1, user_id: USER, status: 'confirmed', payment_status: 'paid',
        start_date: '2099-06-01', end_date: '2099-06-08',
        passengers: [{ fullName: 'Ana Ruiz', dniNie: '12345678Z', isSecondDriver: true }],
    }
    const urls = (licenseFrontUrl: string | null) => ({ dniFrontUrl: null, dniBackUrl: null, licenseFrontUrl, licenseBackUrl: null })

    it('cada bloque dice a qué reserva pertenece y quién es la persona', () => {
        const [group] = buildSecondDriverGroups([{ bookingId: B1, urls: urls('https://s/1') }], [live])
        assert.equal(group.bookingId, B1)
        assert.equal(group.fullName, 'Ana Ruiz')
        assert.equal(group.document, '12345678Z')
        assert.equal(group.legacy, false)
        assert.match(group.bookingLabel, /01\/06\/2099 al 08\/06\/2099/)
        assert.match(group.bookingLabel, /confirmada/)
        assert.match(group.bookingLabel, /\(11111111\)/)
    })

    it('una reserva viva con segundo conductor sin fotos aparece igualmente, para que se vea «No adjuntado»', () => {
        const groups = buildSecondDriverGroups([], [live])
        assert.equal(groups.length, 1)
        assert.equal(groups[0].bookingId, B1)
        assert.deepEqual(Object.values(groups[0].urls), [null, null, null, null])
    })

    it('una reserva cancelada sin fotos no aparece, pero con fotos sí (se ve a qué reserva pertenecen)', () => {
        const cancelled = { ...live, status: 'cancelled' }
        assert.deepEqual(buildSecondDriverGroups([], [cancelled]), [])
        const [group] = buildSecondDriverGroups([{ bookingId: B1, urls: urls('https://s/1') }], [cancelled])
        assert.match(group.bookingLabel, /cancelada/)
    })

    it('una reserva viva sin segundo conductor no genera bloque', () => {
        assert.deepEqual(buildSecondDriverGroups([], [{ ...live, passengers: [] }]), [])
    })

    it('una carpeta que no es de ninguna reserva del cliente nunca se presenta como documentación válida', () => {
        const group = buildSecondDriverGroups([{ bookingId: B2, urls: urls('https://s/2') }], [live]).find(g => g.bookingId === B2)!
        assert.equal(group.legacy, true, 'se marca como no comprobable, igual que las subidas antiguas')
        assert.match(group.bookingLabel, /no corresponde a ninguna reserva de este cliente/)
        assert.equal(group.fullName, '')
        assert.equal(group.document, '')
    })

    it('el dato de la persona sale de la reserva con la misma regla que el contrato (columnas)', () => {
        const columns = { ...live, passengers: [], second_driver_name: 'Marta Peña', second_driver_dni: '99999999R' }
        const [group] = buildSecondDriverGroups([{ bookingId: B1, urls: urls('https://s/1') }], [columns])
        assert.equal(group.fullName, 'Marta Peña')
        assert.equal(group.document, '99999999R')
    })

    it('las fotos sueltas de subidas antiguas se marcan como tales', () => {
        const [group] = buildSecondDriverGroups([{ bookingId: null, urls: urls('https://s/legacy') }], [])
        assert.equal(group.legacy, true)
        assert.equal(group.bookingId, null)
        assert.match(group.bookingLabel, /sin reserva asociada/)
    })

    it('bookingLabel no desplaza fechas por la zona horaria', () => {
        assert.match(bookingLabel({ start_date: '2026-01-01', end_date: '2026-01-02', status: 'pending' }, B1), /01\/01\/2026 al 02\/01\/2026 · pendiente/)
    })
})

describe('Fotos del segundo conductor: cableado en el panel', () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

    it('la verificación de carnets pinta las fotos del segundo conductor', () => {
        const page = read('../app/[locale]/admin/verifications/page.tsx')
        const client = read('../app/[locale]/admin/verifications/VerificationsClient.tsx')
        assert.match(page, /secondDriverGroups/)
        assert.match(client, /secondDriverGroups/)
        assert.match(client, /bookingLabel/)
        assert.match(client, /No adjuntado/)
        // la aprobación avisa si falta su documentación
        assert.match(client, /no hay fotos del segundo conductor/)
    })

    it('la ficha de cliente recibe las fotos del segundo conductor desde la API y las pinta', () => {
        const api = read('../app/api/admin/customer-detail/route.ts')
        const modal = read('../app/[locale]/admin/users/CustomerDetailModal.tsx')
        assert.match(api, /resolveSecondDriverDocuments\(/)
        assert.match(api, /secondDriverGroups/)
        assert.match(modal, /secondDriverGroups/)
        assert.match(modal, /del segundo conductor/)
    })
})

describe('Ficha de cliente: segundo conductor', () => {
    const modal = readFileSync(new URL('../app/[locale]/admin/users/CustomerDetailModal.tsx', import.meta.url), 'utf8')

    it('no lee second_driver_license_id: esa columna no existe (es second_driver_license)', () => {
        assert.doesNotMatch(modal, /second_driver_license_id/)
        assert.match(modal, /second_driver_license/)
    })

    it('el segundo conductor sale de la reserva con bookingSecondDriver y no solo del perfil', () => {
        assert.match(modal, /bookingSecondDriver\(/)
        assert.doesNotMatch(modal, /\{user\?\.has_second_driver && \(/, 'el bloque ya no depende solo del interruptor del perfil')
    })

    it('el bloque del segundo conductor no usa colores fijos que rompen el tema oscuro', () => {
        const rule = /\.cd-card--second-driver\s*\{[^}]*\}/.exec(modal)?.[0] || ''
        assert.ok(rule, 'falta la regla .cd-card--second-driver')
        assert.doesNotMatch(rule, /#[0-9a-f]{3,8}\b/i)
    })
})
