import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST } from '../app/api/upload-driver-docs/route'
import { CHECKOUT_ACCESS_COOKIE, createCheckoutAccessCookie } from '../lib/checkoutAccess'
import { detectDocumentType } from '../lib/driverDocuments'
import { FILES_BUDGET_BYTES, MAX_REQUEST_BYTES } from '../lib/documentUploadBudget'

const ORDER = '1234abcd5678'
const MB = 1024 * 1024

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
const PDF = new TextEncoder().encode('%PDF-1.7\n')

function heic(brand = 'heic') {
    const bytes = new Uint8Array(32)
    bytes[3] = 24 // tamaño de la caja ftyp
    bytes.set(new TextEncoder().encode(`ftyp${brand}`), 4)
    return bytes
}

describe('Tipo real de los documentos', () => {
    it('reconoce los formatos admitidos por su contenido', () => {
        assert.deepEqual(detectDocumentType(JPEG), { extension: 'jpg', contentType: 'image/jpeg' })
        assert.deepEqual(detectDocumentType(PNG), { extension: 'png', contentType: 'image/png' })
        assert.deepEqual(detectDocumentType(PDF), { extension: 'pdf', contentType: 'application/pdf' })
        for (const brand of ['heic', 'heix', 'mif1', 'msf1']) {
            assert.deepEqual(detectDocumentType(heic(brand)), { extension: 'heic', contentType: 'image/heic' })
        }
    })

    it('exige la caja ftyp en HEIC: la marca en los bytes 8 a 11 no basta', () => {
        const html = new TextEncoder().encode('AAAAAAAAheic<html><script>alert(1)</script>')
        const validSizeWithoutFtyp = heic()
        validSizeWithoutFtyp.set(new TextEncoder().encode('xxxx'), 4)

        assert.equal(detectDocumentType(html), null)
        assert.equal(detectDocumentType(validSizeWithoutFtyp), null)
    })

    it('rechaza una caja ftyp con un tamaño imposible y marcas desconocidas', () => {
        const oversized = heic()
        oversized[3] = 200

        assert.equal(detectDocumentType(oversized), null)
        assert.equal(detectDocumentType(heic('qt  ')), null)
    })

    it('rechaza contenido que solo se parece al principio', () => {
        for (const bytes of ['<svg xmlns="http://www.w3.org/2000/svg"/>', '<html>', '%PDF', '']) {
            assert.equal(detectDocumentType(new TextEncoder().encode(bytes)), null)
        }
        assert.equal(detectDocumentType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])), null)
    })
})

describe('Ruta de subida de documentación', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({
            // La reserva, viva, pagada y con el viaje por delante, lleva a esa persona como 2º
            // conductor: es lo que permite subir su documentación (y solo la suya: se comparan el
            // documento y el nombre). La ficha trae sus dos fechas, como la guarda el checkout
            bookings: [{
                id: 'b1', user_id: 'u1', payment_intent_id: ORDER, payment_status: 'paid',
                status: 'confirmed', start_date: '2099-06-01', end_date: '2099-06-08',
                passengers: [{
                    fullName: 'Luis Gómez', dniNie: '87654321X', isSecondDriver: true,
                    driverLicenseId: 'B-99', birthDate: '1985-01-01', licenseDate: '2010-01-01',
                }],
            }],
            users: [{ id: 'u1', verification_status: 'not_submitted', full_name: 'Ana' }],
        })
        console.error = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        fake.restore()
        Object.assign(console, silenced)
    })

    const accessCookie = () => {
        const { name, value } = createCheckoutAccessCookie(ORDER)!
        return `${name}=${value}`
    }

    function form(fields: Row = {}) {
        const data = new FormData()
        data.append('driverLicenseIssueDate', '2015-01-01')
        data.append('driverLicenseExpiryDate', '2035-01-01')
        for (const [key, value] of Object.entries(fields)) data.append(key, value)
        return data
    }

    async function upload(data: FormData, { cookie, order = ORDER, length }: { cookie?: string; order?: string; length?: number } = {}) {
        const encoded = new Request('http://localhost/', { method: 'POST', body: data })
        const body = await encoded.arrayBuffer()
        const headers = new Headers({ 'content-type': encoded.headers.get('content-type')! })
        if (cookie) headers.set('cookie', cookie)
        headers.set('content-length', String(length ?? body.byteLength))
        const res = await POST(new NextRequest(`http://localhost/api/upload-driver-docs?order=${order}`, { method: 'POST', headers, body }))
        return { status: res.status, json: await res.json(), setCookie: res.headers.get('set-cookie') || '' }
    }

    const storageUploads = () => fake.requests.filter(r => r.path.startsWith('/storage/v1/object/documents/'))

    it('no lee el cuerpo sin content-length ni con uno excesivo', async () => {
        const unreadable = (headers: Record<string, string>) => {
            const request = new NextRequest('http://localhost/api/upload-driver-docs', { method: 'POST', headers, body: 'x' })
            request.formData = () => { throw new Error('No debe leer el cuerpo') }
            request.headers.delete('content-length')
            if (headers['content-length']) request.headers.set('content-length', headers['content-length'])
            return request
        }

        assert.equal((await POST(unreadable({}))).status, 411)
        assert.equal((await POST(unreadable({ 'content-length': String(82 * MB) }))).status, 413)
        assert.deepEqual(fake.requests, [])
    })

    it('sin acceso responde 401 sin leer el cuerpo', async () => {
        const request = new NextRequest(`http://localhost/api/upload-driver-docs?order=${ORDER}`, {
            method: 'POST', headers: { 'content-length': '10' }, body: 'x',
        })
        request.formData = () => { throw new Error('No debe leer el cuerpo') }

        assert.equal((await POST(request)).status, 401)
    })

    it('el número de pedido en el formulario no sustituye al de la URL', async () => {
        const { status } = await upload(form({ orderId: ORDER }), { cookie: accessCookie(), order: '' })

        assert.equal(status, 401)
    })

    it('sin pagar responde 401 aunque la cookie sea válida', async () => {
        fake.tables.bookings[0].payment_status = 'pending'

        const { status } = await upload(form({ fullName: 'Nombre Falso' }), { cookie: accessCookie() })

        assert.equal(status, 401)
        assert.equal(fake.tables.users[0].full_name, 'Ana')
    })

    it('no sobrescribe a un cliente aprobado sin sesión', async () => {
        fake.tables.users[0].verification_status = 'approved'

        const { status } = await upload(form({ fullName: 'Nombre Falso' }), { cookie: accessCookie() })

        assert.equal(status, 401)
        assert.equal(fake.tables.users[0].full_name, 'Ana')
    })

    it('extensión y tipo salen del contenido, no del nombre ni del tipo declarados', async () => {
        const file = new File([JPEG], 'x.b/sub/evil.html', { type: 'text/html' })

        const { status } = await upload(form({ dni_front: file }), { cookie: accessCookie() })

        assert.equal(status, 200)
        const [sent] = storageUploads()
        assert.match(sent.path, /^\/storage\/v1\/object\/documents\/u1\/dni_front_[0-9a-f-]{36}\.jpg$/)
        assert.equal(sent.headers.get('content-type'), 'image/jpeg')
    })

    it('un HEIC llega a Storage como image/heic, que es lo que admite el bucket', async () => {
        const file = new File([heic()], 'IMG_0001.HEIC', { type: 'application/octet-stream' })

        const { status } = await upload(form({ dni_front: file }), { cookie: accessCookie() })

        assert.equal(status, 200)
        const [sent] = storageUploads()
        assert.match(sent.path, /\.heic$/)
        assert.equal(sent.headers.get('content-type'), 'image/heic')
    })

    it('rechaza un archivo que no es lo que dice ser, sin subir nada', async () => {
        const fakePhoto = new File(['AAAAAAAAheic<html><script>alert(1)</script>'], 'foto.heic', { type: 'image/heic' })

        const { status } = await upload(form({ dni_front: new File([PDF], 'ok.pdf'), dni_back: fakePhoto }), { cookie: accessCookie() })

        assert.equal(status, 400)
        assert.deepEqual(storageUploads(), [])
    })

    it('rechaza sin leer el cuerpo lo que Vercel no dejaría pasar (más de 4,5 MB)', async () => {
        const big = new Uint8Array(4_600_000)
        big.set(JPEG)

        const { status, json } = await upload(form({ dni_front: new File([big], 'grande.jpg') }), { cookie: accessCookie() })

        assert.equal(status, 413)
        assert.match(json.error, /JPG/)
        assert.deepEqual(storageUploads(), [])
        assert.deepEqual(fake.writesTo('users'), [])
    })

    it('el límite de la petición no supera el de Vercel y cabe el presupuesto de las fotos con su multipart', () => {
        assert.ok(MAX_REQUEST_BYTES <= 4.5 * 1000 * 1000)
        assert.ok(FILES_BUDGET_BYTES + 500_000 <= MAX_REQUEST_BYTES)
    })

    it('admite el resultado de reducir las fotos en el navegador: JPEG con nombre del navegador, 4 archivos en 3,8 MB', async () => {
        const perFile = Math.floor(FILES_BUDGET_BYTES / 4)
        const reduced = (name: string) => {
            const bytes = new Uint8Array(perFile)
            bytes.set(JPEG)
            return new File([bytes], name, { type: 'image/jpeg' })
        }

        const { status, setCookie } = await upload(form({
            fullName: 'Ana Pérez',
            dni_front: reduced('IMG_0001.jpg'),
            dni_back: reduced('IMG_0002.jpg'),
            license_front: reduced('IMG_0003.jpg'),
            license_back: reduced('IMG_0004.jpg'),
        }), { cookie: accessCookie() })

        assert.equal(status, 200)
        assert.equal(storageUploads().length, 4)
        for (const sent of storageUploads()) {
            assert.match(sent.path, /.jpg$/)
            assert.equal(sent.headers.get('content-type'), 'image/jpeg')
        }
        assert.equal(fake.tables.users[0].verification_status, 'pending_validation')
        assert.match(setCookie, /Max-Age=0/i)
    })

    it('tras enviar la documentación revoca la cookie, en el navegador y en el servidor', async () => {
        const cookie = accessCookie()

        const first = await upload(form({ dni_front: new File([PNG], 'dni.png') }), { cookie })
        const second = await upload(form({ fullName: 'Otro Nombre' }), { cookie })

        assert.equal(first.status, 200)
        assert.match(first.setCookie, new RegExp(`^${CHECKOUT_ACCESS_COOKIE}=;`))
        assert.match(first.setCookie, /Max-Age=0/i)
        assert.equal(second.status, 401)
        assert.equal(fake.tables.users[0].full_name, 'Ana')
    })

    describe('cliente verificado con sesión', () => {
        const verified: Row = {
            id: 'u1',
            verification_status: 'verified',
            full_name: 'Ana Pérez',
            phone: '600000000',
            driver_license_issue_date: '2015-01-01',
            driver_license_expiry_date: '2035-01-01',
            has_second_driver: true,
            second_driver_name: 'Luis Gómez',
            second_driver_dni: '87654321X',
            second_driver_license: 'B-99',
        }
        const secondDriver = { hasSecondDriver: 'true', secondDriverFullName: 'Luis Gómez', secondDriverDni: '87654321X', secondDriverLicense: 'B-99' }

        beforeEach(() => {
            Object.assign(fake.tables.users[0], verified)
            fake.setSession({ id: 'u1', email: 'ana@example.com', aud: 'authenticated' })
        })

        const status = () => fake.tables.users[0].verification_status

        it('cambiar el teléfono o la dirección no le quita la validación', async () => {
            await upload(form({ ...secondDriver, fullName: 'Ana Pérez', phone: '611111111', address: 'Calle Nueva 2' }))

            assert.equal(status(), 'verified')
            assert.equal(fake.tables.users[0].phone, '611111111')
        })

        it('cambiar el nombre vuelve a revisión', async () => {
            await upload(form({ ...secondDriver, fullName: 'Otro Nombre' }))

            assert.equal(status(), 'pending_validation')
        })

        // Ningún dato del 2º conductor se puede cambiar desde aquí: los tres identifican a la
        // persona que autoriza la reserva (ver los tres tests de abajo). Lo que vuelve a revisión es
        // que la ficha de la reserva diga algo distinto de lo que guardaba el perfil
        it('un nº de carnet distinto en la ficha de la reserva vuelve a revisión', async () => {
            fake.tables.bookings[0].passengers[0].driverLicenseId = 'B-FICHA'

            const { status: http, json } = await upload(form({ ...secondDriver, secondDriverLicense: '' }))

            assert.equal(http, 200, json.error)
            assert.equal(fake.tables.users[0].second_driver_license, 'B-FICHA')
            assert.equal(status(), 'pending_validation')
        })

        it('cambiar el nº de carnet del 2º conductor no se acepta: sale de la ficha de la reserva', async () => {
            const { status: http, json } = await upload(form({ ...secondDriver, secondDriverLicense: 'B-1' }))

            assert.equal(http, 400)
            assert.match(json.error, /carnet del segundo conductor/i)
            assert.equal(status(), 'verified')
            assert.equal(fake.tables.users[0].second_driver_license, 'B-99')
        })

        it('cambiar el documento del 2º conductor no se acepta: es el que autoriza la reserva', async () => {
            const { status: http, json } = await upload(form({ ...secondDriver, secondDriverDni: '11111111H' }))

            assert.equal(http, 400)
            assert.match(json.error, /segundo conductor/i)
            assert.equal(status(), 'verified')
        })

        // Acertando el documento, el nombre del formulario se guardaba tal cual y el contrato
        // facultaba a quien el titular hubiera teclado (QA-SD-11)
        it('cambiar el nombre del 2º conductor tampoco: lo validó el checkout', async () => {
            const { status: http, json } = await upload(form({ ...secondDriver, secondDriverFullName: 'Otro' }))

            assert.equal(http, 400)
            assert.match(json.error, /no coincide/i)
            assert.equal(status(), 'verified')
            assert.equal(fake.tables.users[0].second_driver_name, 'Luis Gómez')
        })

        it('añadir un segundo conductor vuelve a revisión', async () => {
            Object.assign(fake.tables.users[0], { has_second_driver: false, second_driver_name: null, second_driver_dni: null, second_driver_license: null })

            await upload(form(secondDriver))

            assert.equal(status(), 'pending_validation')
        })

        it('quitar el segundo conductor vuelve a revisión', async () => {
            await upload(form({ hasSecondDriver: 'false' }))

            assert.equal(status(), 'pending_validation')
        })

        it('sin ese dato en el perfil, un 2º conductor que ninguna reserva autoriza se rechaza sin subir nada', async () => {
            Object.assign(fake.tables.users[0], { has_second_driver: false, second_driver_name: null, second_driver_dni: null, second_driver_license: null })
            fake.tables.bookings[0].passengers = [{ fullName: 'Luis Gómez', dniNie: '87654321X', isSecondDriver: false }]

            const { status: http, json } = await upload(form({ ...secondDriver, dni_front: new File([PNG], 'dni.png') }))

            assert.equal(http, 400)
            assert.match(json.error, /segundo conductor/i)
            assert.deepEqual(storageUploads(), [])
            assert.deepEqual(fake.writesTo('users'), [])
        })

        it('un 2º conductor que el perfil ya traía y ninguna reserva autoriza se ignora, sin bloquear al titular', async () => {
            // /dashboard/datos reenviaba `users.has_second_driver`: ese cliente no puede quedarse
            // sin poder guardar su propio DNI, carnet ni fotos
            fake.tables.bookings[0].passengers = [{ fullName: 'Luis Gómez', dniNie: '87654321X', isSecondDriver: false }]

            const { status: http, json } = await upload(form({ ...secondDriver, dni_front: new File([PNG], 'dni.png') }))

            assert.equal(http, 200, json.error)
            assert.equal(storageUploads().length, 1)
            assert.deepEqual(fake.writesTo('bookings'), [], 'no se guarda en una reserva que no lo lleva')
        })

        it('acepta el 2º conductor si su ficha está en el desglose con el que se cobró la reserva', async () => {
            fake.tables.bookings[0].passengers = []
            fake.tables.bookings[0].pricing_breakdown = {
                secondDriver: true, secondDriverRatePerDay: 5, secondDriverSupplement: 35,
                passengers: [{
                    fullName: 'Luis Gómez', dniNie: '87654321X', isSecondDriver: true,
                    driverLicenseId: 'B-99', birthDate: '1985-01-01', licenseDate: '2010-01-01',
                }],
            }

            const { status: http, json } = await upload(form({ ...secondDriver, fullName: 'Ana Pérez' }))

            assert.equal(http, 200, json.error)
            assert.notDeepEqual(fake.writesTo('bookings'), [], 'la ficha se guarda en esa reserva')
        })

        it('una foto nueva pasa a revisión antes de subirse', async () => {
            const { status: http } = await upload(form({ ...secondDriver, fullName: 'Ana Pérez', dni_front: new File([PNG], 'dni.png') }))

            assert.equal(http, 200)
            const firstWrite = fake.requests.findIndex(r => r.path === '/rest/v1/users' && r.method === 'PATCH')
            const firstUpload = fake.requests.findIndex(r => r.path.startsWith('/storage/v1/object/documents/'))
            assert.ok(firstWrite !== -1 && firstWrite < firstUpload)
            assert.deepEqual(fake.requests[firstWrite].body, { verification_status: 'pending_validation' })
        })

        it('si la subida falla, el perfil no vuelve a constar como verificado', async () => {
            fake.failures.table = 'storage'

            const { status: http } = await upload(form({ ...secondDriver, fullName: 'Ana Pérez', dni_front: new File([PNG], 'dni.png') }))

            assert.equal(http, 500)
            assert.equal(status(), 'pending_validation')
        })

        it('si no puede pasar a revisión, no sube la foto', async () => {
            fake.failures.table = 'users'
            fake.failures.method = 'PATCH'

            const { status: http } = await upload(form({ ...secondDriver, fullName: 'Ana Pérez', dni_front: new File([PNG], 'dni.png') }))

            assert.equal(http, 500)
            assert.deepEqual(storageUploads(), [])
        })

        it('si no puede leer el perfil actual, no guarda nada', async () => {
            fake.failures.table = 'users'
            fake.failures.method = 'GET'

            const { status: http } = await upload(form({ fullName: 'Otro Nombre' }))

            assert.equal(http, 500)
            assert.equal(fake.tables.users[0].full_name, 'Ana Pérez')
        })
    })

    describe('formato de los campos', () => {
        const invalid: Array<[string, string]> = [
            ['fullName', 'a'.repeat(121)],
            ['fullName', '<script>alert(1)</script>'],
            ['dniNie', "1234'; drop"],
            ['dniNie', 'x'.repeat(21)],
            ['driverLicenseId', '<b>'],
            ['driverLicenseIssueDate', '01/01/2015'],
            ['driverLicenseExpiryDate', '2035-02-30'],
            ['address', 'x'.repeat(301)],
            ['address', 'línea\nsegunda'],
            ['phone', 'llámame'],
            ['secondDriverFullName', '<img>'],
            ['secondDriverDni', '$$$$$'],
            ['secondDriverLicense', 'x'.repeat(31)],
        ]

        for (const [field, value] of invalid) {
            it(`rechaza ${field} = ${value.slice(0, 24).replace(/\n/g, ' ')} sin subir ni guardar nada`, async () => {
                const data = form({ dni_front: new File([JPEG], 'dni.jpg') })
                data.set(field, value)

                const { status } = await upload(data, { cookie: accessCookie() })

                assert.equal(status, 400)
                assert.deepEqual(storageUploads(), [])
                assert.deepEqual(fake.writesTo('users'), [])
            })
        }

        it('rechaza un archivo enviado en lugar de un campo de texto', async () => {
            const { status } = await upload(form({ fullName: new File(['x'], 'nombre.txt') }), { cookie: accessCookie() })

            assert.equal(status, 400)
        })

        it('admite los datos reales de un cliente', async () => {
            const { status } = await upload(form({
                fullName: "María-José O'Neil Núñez",
                dniNie: 'X1234567L',
                driverLicenseId: 'B-12345678',
                address: 'Calle Gran Vía 24, 3º B, 28013 Madrid',
                phone: '+34 (600) 000-000',
            }), { cookie: accessCookie() })

            assert.equal(status, 200)
        })
    })

    it('si no puede leer el estado de verificación, no concede acceso', async () => {
        fake.failures.table = 'users'
        fake.failures.method = 'GET'

        const { status } = await upload(form({ fullName: 'Nombre Falso' }), { cookie: accessCookie() })

        assert.equal(status, 401)
        assert.equal(fake.tables.users[0].full_name, 'Ana')
    })

    it('no devuelve al cliente los errores internos', async () => {
        const res = await POST(new NextRequest(`http://localhost/api/upload-driver-docs?order=${ORDER}`, {
            method: 'POST',
            headers: { cookie: accessCookie(), 'content-type': 'multipart/form-data; boundary=x', 'content-length': '6' },
            body: 'basura',
        }))

        assert.equal(res.status, 500)
        assert.deepEqual(await res.json(), { error: 'Error interno del servidor' })
    })
})
