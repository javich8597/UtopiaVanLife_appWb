import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { GET as contractGET } from '../app/api/admin/contract/route'
import { GET as customerDetailGET } from '../app/api/admin/customer-detail/route'
import { generateContractData } from '../lib/contracts/contractEngine'
import { renderContractHtml, secondDriverSupplementText } from '../lib/admin/contractHtml'
import { secondDriverSupplementText as pdfSecondDriverSupplementText } from '../lib/contracts/pdfGenerator'

/**
 * Contrato imprimible del backoffice (`/api/admin/contract`).
 *
 * El HTML se abre en la sesión del administrador y lleva datos que escribe el cliente (nombre,
 * dirección, el nombre del segundo conductor...). Una interpolación sin escapar es un XSS contra
 * el admin: ya estuvo abierto una vez y una fusión pudo haberlo devuelto. Estos tests ejecutan la
 * ruta real con un Supabase en memoria y datos hostiles, y miran además el código fuente.
 * Sin Supabase real, producción ni Redsys.
 */

const BOOKING_ID = '11111111-aaaa-bbbb-cccc-222222222222'
const ADMIN_ID = '00000000-0000-4000-8000-0000000000aa'
const HOSTILE = '<img src=x onerror=alert(document.domain)>'
const HOSTILE_SCRIPT = '<script>alert(1)</script>'

function hostileBooking(): Row {
    return {
        id: BOOKING_ID,
        user_id: 'cliente-1',
        start_date: '2099-06-01',
        end_date: '2099-06-08',
        total_price: 735,
        deposit_amount: 2000,
        passengers: [{ fullName: HOSTILE_SCRIPT, dniNie: `${HOSTILE}12345678Z`, isSecondDriver: true }],
        pricing_breakdown: { secondDriver: true, secondDriverSupplement: 35, secondDriverRatePerDay: 5 },
        // El Supabase simulado no resuelve joins: las relaciones viajan dentro de la fila
        campers: { slug: 'neo', name: `NEO ${HOSTILE}`, plate_number: `8291-${HOSTILE}` },
        users: {
            id: 'cliente-1',
            full_name: HOSTILE,
            dni_nie: HOSTILE,
            driver_license_id: HOSTILE,
            email: `${HOSTILE}@example.com`,
            phone: HOSTILE,
            address: HOSTILE,
        },
    }
}

describe('Ruta /api/admin/contract', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    const silenced = { error: console.error, warn: console.warn }

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [
                { id: ADMIN_ID, role: 'admin' },
                { id: 'cliente-1', role: 'customer' },
            ],
            bookings: [hostileBooking()],
        })
        console.error = () => {}
        console.warn = () => {}
    })

    afterEach(() => {
        fake.restore()
        Object.assign(console, silenced)
    })

    const call = (headers: Record<string, string> = {}) =>
        contractGET(new Request(`http://localhost/api/admin/contract?bookingId=${BOOKING_ID}`, { headers }))

    it('un visitante anónimo recibe 401 y ningún dato', async () => {
        const res = await call()
        assert.equal(res.status, 401)
        assert.deepEqual(await res.json(), { error: 'No autorizado' })
    })

    it('user_metadata.role = admin no abre el contrato: el rol sale de public.users o app_metadata', async () => {
        fake.setSession({ id: 'cliente-1', email: 'c@example.com', app_metadata: {}, user_metadata: { role: 'admin' } })
        const res = await call()
        assert.equal(res.status, 401)
        assert.equal(fake.requests.some(r => r.path === '/rest/v1/bookings'), false, 'no debe haber leído la reserva')
    })

    it('el administrador recibe el contrato con los datos del cliente escapados', async () => {
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        const res = await call()
        assert.equal(res.status, 200)
        assert.match(res.headers.get('content-type') || '', /text\/html/)
        const html = await res.text()

        assert.match(html, /Segundo conductor autorizado/)
        assert.doesNotMatch(html, /<img/i, 'el nombre, la dirección o el DNI del cliente llegaron como HTML sin escapar')
        assert.doesNotMatch(html, /<script>alert/i, 'el nombre del segundo conductor llegó como HTML sin escapar')
        assert.match(html, /&lt;img src=x onerror=alert\(document\.domain\)&gt;/)
        assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
    })

    it('un fallo interno responde con un mensaje genérico, nunca con el texto del error', async () => {
        // Con una URL de Supabase malformada, la creación del cliente lanza dentro del try de la ruta
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'esto no es una url'
        const res = await call({ authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` })
        assert.equal(res.status, 500)
        const body = await res.json()
        assert.deepEqual(body, { error: 'Error interno' })
    })

    it('la ficha de cliente tampoco filtra el texto del error en su 500', async () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'esto no es una url'
        const res = await customerDetailGET(new Request(
            'http://localhost/api/admin/customer-detail?userId=cliente-1',
            { headers: { authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
        ))
        assert.equal(res.status, 500)
        assert.deepEqual(await res.json(), { error: 'Error interno' })
    })
})

describe('Contrato imprimible: escapado de todo valor interpolado', () => {
    const CAMPER = { slug: 'neo', name: 'NEO', plate_number: '8291-LKN' }

    function contract() {
        const booking = {
            id: BOOKING_ID, start_date: '2099-06-01', end_date: '2099-06-08', total_price: 735, deposit_amount: 2000,
            passengers: [{ fullName: 'Ana Ruiz', dniNie: '12345678Z', isSecondDriver: true }],
            pricing_breakdown: { secondDriver: true, secondDriverSupplement: 35, secondDriverRatePerDay: 5 },
        }
        const profile = { full_name: 'Titular', dni_nie: '11111111H', driver_license_id: 'B-1', email: 't@example.com' }
        return generateContractData(booking, profile, CAMPER)
    }

    /** Sustituye cada cadena del contrato por una carga con una marca única de su ruta */
    function poison(value: unknown, path: string): unknown {
        if (typeof value === 'string') return `<i data-xss="${path}">&"'`
        if (Array.isArray(value)) return value.map((v, i) => poison(v, `${path}[${i}]`))
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, poison(v, `${path}.${k}`)]))
        }
        return value
    }

    it('ninguna cadena del contrato (cláusulas incluidas) sale del HTML sin escapar', () => {
        const hostile = poison(contract(), 'c') as ReturnType<typeof contract>
        const html = renderContractHtml(hostile)
        const raw = [...html.matchAll(/<i data-xss="([^"]*)"/g)].map(m => m[1])
        assert.deepEqual(raw, [], `valores interpolados sin escapar: ${raw.join(', ')}`)
        // y el HTML sí lleva los valores, escapados
        assert.match(html, /&lt;i data-xss=&quot;c\.lessee\.fullName&quot;&gt;/)
        assert.match(html, /&lt;i data-xss=&quot;c\.secondDriver\.fullName&quot;&gt;/)
    })

    it('el código de la plantilla solo interpola con e()/escapeHtml() o con bloques ya escapados', () => {
        const src = readFileSync(new URL('../lib/admin/contractHtml.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
        const body = src.slice(src.indexOf('export function renderContractHtml'))
        const expressions = [...body.matchAll(/\$\{([^}]*(?:\([^)]*\)[^}]*)*)\}/g)].map(m => m[1].trim())
        assert.ok(expressions.length > 20, 'no se encontró la plantilla')
        const allowed = (expr: string) =>
            /^e\(/.test(expr) || /^escapeHtml\(/.test(expr) || expr === 'secondDriverBlock' ||
            // las cláusulas se mapean con e() dentro de una plantilla anidada
            expr.startsWith('contract.clauses.map(c => `<li>${e(c)')
        const unsafe = expressions.filter(expr => !allowed(expr))
        assert.deepEqual(unsafe, [], `interpolaciones sin escapar en la plantilla: ${unsafe.join(' | ')}`)
    })

    it('la ruta no arma HTML por su cuenta: delega en renderContractHtml', () => {
        const route = readFileSync(new URL('../app/api/admin/contract/route.ts', import.meta.url), 'utf8')
        assert.match(route, /renderContractHtml\(contract\)/)
        assert.doesNotMatch(route, /<!DOCTYPE html>|<html|\$\{[^}]*(?:fullName|address|phone|email)/i)
    })

    it('la ruta no acepta user_metadata como fuente de rol ni devuelve error.message', () => {
        for (const file of ['../app/api/admin/contract/route.ts', '../app/api/admin/customer-detail/route.ts']) {
            const route = readFileSync(new URL(file, import.meta.url), 'utf8')
            assert.doesNotMatch(route, /user_metadata/, `${file} sigue pasando user_metadata a isAdminUser`)
            assert.doesNotMatch(route, /error:\s*error\.message/, `${file} devuelve error.message al navegador`)
        }
    })
})

describe('Frase del suplemento del segundo conductor: una sola función', () => {
    it('el contrato imprimible usa la del PDF del cliente, no una copia', () => {
        assert.equal(secondDriverSupplementText, pdfSecondDriverSupplementText)
        const src = readFileSync(new URL('../lib/admin/contractHtml.ts', import.meta.url), 'utf8')
        assert.doesNotMatch(src, /Suplemento de segundo conductor contratado/, 'hay una copia de la frase en contractHtml.ts')
        assert.doesNotMatch(src, /No consta suplemento/, 'hay una copia de la frase en contractHtml.ts')
    })
})
