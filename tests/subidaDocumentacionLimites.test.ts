import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST } from '../app/api/upload-driver-docs/route'
import { POST as uploadDocumentPost } from '../app/api/upload-document/route'
import {
    DOCUMENT_UPLOAD_IP_WINDOW_MS,
    documentUploadBucketKey,
    MAX_DOCUMENT_UPLOADS_PER_IP,
    registerDocumentUploadAttempt,
} from '../lib/booking/checkoutRateLimit'

/**
 * Cupo de envíos de documentación y marca de «documentación del 2º conductor subida»
 * (correcciones QA-SD-12, N1 y N7 del 2026-11-09).
 *
 * Lo que NO prueba este archivo: Supabase real, RLS, Storage real, las columnas de la migración
 * 20261108 ni el navegador. La base está simulada, y el contador vive en la memoria del módulo: cada
 * prueba usa su propia IP para no gastarle el cupo a otra.
 */

const B1 = 'cccccccc-3333-4333-8333-cccccccccccc'
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])

const AUTHORIZED = {
    fullName: 'Luis Pérez',
    dniNie: 'AB123456',
    driverLicenseId: 'B-99',
    isSecondDriver: true,
    birthDate: '1985-01-01',
    licenseDate: '2010-01-01',
}

describe('Cupo de envíos: la clave lleva al titular, no solo la IP', () => {
    it('sin cabecera x-forwarded-for no hay clave y no se limita nada', () => {
        assert.equal(documentUploadBucketKey(null, 'u1'), null)
        assert.equal(registerDocumentUploadAttempt(null), true)
    })

    it('dos clientes de la misma IP no comparten contador', () => {
        const ip = '198.51.100.90'
        const now = Date.now()
        const ana = documentUploadBucketKey(ip, 'u-ana')!
        const luis = documentUploadBucketKey(ip, 'u-luis')!

        assert.notEqual(ana, luis)
        for (let i = 0; i < MAX_DOCUMENT_UPLOADS_PER_IP; i++) {
            assert.equal(registerDocumentUploadAttempt(ana, now), true, `envío ${i + 1} de Ana`)
        }
        assert.equal(registerDocumentUploadAttempt(ana, now), false, 'Ana sí gasta su propio cupo')
        assert.equal(registerDocumentUploadAttempt(luis, now), true, 'Luis no paga los envíos de Ana')
    })

    it('el mismo cliente desde dos redes cuenta por separado, y el cupo vuelve al cerrarse la ventana', () => {
        const now = Date.now()
        const casa = documentUploadBucketKey('198.51.100.91', 'u-ana')!
        const camping = documentUploadBucketKey('198.51.100.92', 'u-ana')!

        for (let i = 0; i < MAX_DOCUMENT_UPLOADS_PER_IP; i++) registerDocumentUploadAttempt(casa, now)
        assert.equal(registerDocumentUploadAttempt(casa, now), false)
        assert.equal(registerDocumentUploadAttempt(camping, now), true)
        assert.equal(
            registerDocumentUploadAttempt(casa, now + DOCUMENT_UPLOAD_IP_WINDOW_MS + 1),
            true,
            'pasada la ventana se vuelve a poder enviar'
        )
    })
})

describe('/api/upload-document: el mismo cupo que la otra ruta (N7)', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({ users: [{ id: 'u-doc', verification_status: 'not_submitted' }] })
        fake.setSession({ id: 'u-doc', email: 'ana@example.com', aud: 'authenticated' })
        console.error = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        fake.restore()
        Object.assign(console, silenced)
    })

    async function send(ip?: string) {
        const data = new FormData()
        data.append('front', new File([JPEG], 'dni_front.jpg', { type: 'image/jpeg' }))
        data.append('back', new File([JPEG], 'dni_back.jpg', { type: 'image/jpeg' }))
        const encoded = new Request('http://localhost/', { method: 'POST', body: data })
        const body = await encoded.arrayBuffer()
        const headers = new Headers({
            'content-type': encoded.headers.get('content-type')!,
            'content-length': String(body.byteLength),
        })
        if (ip) headers.set('x-forwarded-for', ip)
        const res = await uploadDocumentPost(new Request('http://localhost/api/upload-document', { method: 'POST', headers, body }))
        return { status: res.status, json: await res.json().catch(() => ({})) }
    }

    // La ruta admite 21 MB por envío y sube con la clave de service role: sin contador, una sola
    // conexión podía repetirla sin freno (hallazgo N7)
    it(`responde 429 al pasar de los ${MAX_DOCUMENT_UPLOADS_PER_IP} envíos`, async () => {
        const ip = '198.51.100.93'
        const codes: number[] = []
        for (let i = 0; i < MAX_DOCUMENT_UPLOADS_PER_IP; i++) codes.push((await send(ip)).status)
        assert.ok(codes.every(code => code === 200), `antes del tope: ${codes.join(',')}`)

        const extra = await send(ip)
        assert.equal(extra.status, 429)
        assert.match(extra.json.error, /demasiados env/i)
    })

    it('un visitante sin sesión no gasta el cupo del cliente que comparte IP', async () => {
        const ip = '198.51.100.94'
        fake.setSession(null)
        const anonimos: number[] = []
        for (let i = 0; i < MAX_DOCUMENT_UPLOADS_PER_IP; i++) anonimos.push((await send(ip)).status)
        assert.ok(anonimos.every(code => code === 401), `los anónimos no entran: ${anonimos.join(',')}`)

        fake.setSession({ id: 'u-doc', email: 'ana@example.com', aud: 'authenticated' })
        const legitimo = await send(ip)

        assert.notEqual(legitimo.status, 429)
    })
})

describe('La marca de documentación subida del 2º conductor es de sus fotos (N1)', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    const paidBooking = (overrides: Row = {}): Row => ({
        id: B1,
        user_id: 'u1',
        payment_intent_id: '1234abcd5678',
        payment_status: 'paid',
        status: 'confirmed',
        start_date: '2099-12-01',
        end_date: '2099-12-08',
        passengers: [{ ...AUTHORIZED }],
        ...overrides,
    })

    beforeEach(() => {
        fake = installFakeSupabase({
            bookings: [paidBooking()],
            users: [{ id: 'u1', verification_status: 'not_submitted', full_name: 'Ana Pérez' }],
        })
        fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
        console.error = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        fake.restore()
        Object.assign(console, silenced)
    })

    function form(fields: Row = {}) {
        const data = new FormData()
        data.append('fullName', 'Ana Pérez')
        data.append('driverLicenseIssueDate', '2015-01-01')
        data.append('driverLicenseExpiryDate', '2035-01-01')
        data.append('hasSecondDriver', 'true')
        data.append('secondDriverFullName', 'Luis Pérez')
        data.append('secondDriverDni', 'AB123456')
        data.append('secondDriverLicense', 'B-99')
        for (const [key, value] of Object.entries(fields)) data.set(key, value)
        return data
    }

    async function upload(data: FormData) {
        const encoded = new Request('http://localhost/', { method: 'POST', body: data })
        const body = await encoded.arrayBuffer()
        const headers = new Headers({
            'content-type': encoded.headers.get('content-type')!,
            'content-length': String(body.byteLength),
        })
        const res = await POST(new NextRequest('http://localhost/api/upload-driver-docs', { method: 'POST', headers, body }))
        return { status: res.status, json: await res.json().catch(() => ({})) }
    }

    // La marca es la que apaga el aviso del panel: guardar el formulario sin ninguna foto suya la
    // ponía igual y el admin se quedaba sin saber que faltaba la documentación de esa persona
    it('guardar la ficha sin fotos suyas no marca su documentación como subida', async () => {
        const { status, json } = await upload(form())

        assert.equal(status, 200, json.error)
        assert.equal(fake.tables.bookings[0].second_driver_name, 'Luis Pérez', 'la ficha sí se guarda')
        assert.equal(fake.tables.bookings[0].second_driver_docs_uploaded_at, undefined)
    })

    it('las fotos del titular tampoco marcan la del 2º conductor', async () => {
        const { status, json } = await upload(form({ dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 200, json.error)
        assert.equal(fake.tables.bookings[0].second_driver_docs_uploaded_at, undefined)
    })

    it('una foto second_* sí la marca', async () => {
        const { status, json } = await upload(form({ second_dni_front: new File([JPEG], 'dni.jpg') }))

        assert.equal(status, 200, json.error)
        assert.match(String(fake.tables.bookings[0].second_driver_docs_uploaded_at), /^\d{4}-\d{2}-\d{2}T/)
    })

    it('una segunda petición sin fotos no borra la marca de la primera', async () => {
        await upload(form({ second_license_front: new File([JPEG], 'carnet.jpg') }))
        const marca = fake.tables.bookings[0].second_driver_docs_uploaded_at

        await upload(form())

        assert.equal(fake.tables.bookings[0].second_driver_docs_uploaded_at, marca)
    })
})
