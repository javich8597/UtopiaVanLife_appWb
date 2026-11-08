import { installFakeSupabase, Row } from './fakeSupabase'
import { NextRequest } from 'next/server'
import { POST as checkoutRoute } from '../../app/api/bookings/checkout/route'
import { GET as verifyRoute } from '../../app/api/bookings/verify-payment/route'
import { POST as webhookRoute } from '../../app/api/webhooks/redsys/route'
import { POST as payRoute } from '../../app/api/bookings/[id]/pay/route'
import { POST as uploadRoute } from '../../app/api/upload-driver-docs/route'
import { calculateSignature, decodeMerchantParameters, encodeMerchantParameters, getRedsysConfig } from '../../lib/redsys'

/**
 * Harness del verificador: encadena las rutas reales (checkout, webhook, verify-payment, pay,
 * upload) como lo haría el navegador, con un tarro de cookies y Supabase simulado.
 * No prueba RLS, triggers, columnas reales, Auth real ni Redsys real.
 */

export const NEO = { id: 'c1', slug: 'neo', name: 'NEO', base_price_per_night: 100 }

export const JPEG = () => new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])], { type: 'image/jpeg' })

/** Mismo cuerpo que construye Step5Checkout.tsx (handleSubmitPayment) */
export function step5Payload(overrides: Row = {}, customer: Row = {}): Row {
    return {
        locale: 'es',
        camperSlug: 'neo',
        startDate: '2099-06-01',
        startSlot: 'afternoon',
        endDate: '2099-06-08',
        endSlot: 'morning',
        pickupSlot: 'afternoon',
        dropoffSlot: 'morning',
        kmPackage: 'included_150',
        cancellationPolicy: 'standard',
        depositOption: 'standard_2000',
        extrasSelected: [],
        customer: {
            fullName: 'Ana Pérez',
            email: 'ana@example.com',
            phone: '+34 600000000',
            dniNie: '12345678Z',
            birthDate: '1990-01-01',
            licenseDate: '2015-01-01',
            depositOption: 'standard_2000',
            address: 'Calle Mayor 1',
            city: 'Palma',
            postalCode: '07001',
            country: 'España',
            travelersCount: 2,
            passengers: [],
            secondDriverSoloEnabled: false,
            notes: '',
            ...customer,
        },
        ...overrides,
    }
}

/** Tarro de cookies: guarda lo que el navegador guardaría y borra lo que caduca */
export class CookieJar {
    private store = new Map<string, string>()

    absorb(res: Response) {
        for (const header of res.headers.getSetCookie()) {
            const [pair, ...attributes] = header.split(';')
            const name = pair.slice(0, pair.indexOf('='))
            const value = pair.slice(pair.indexOf('=') + 1)
            const expired = attributes.some(a => /max-age=0\b/i.test(a.trim())) || value === ''
            if (expired) this.store.delete(name)
            else this.store.set(name, value)
        }
    }

    header(): string {
        return [...this.store].map(([k, v]) => `${k}=${v}`).join('; ')
    }
}

export function installFlows(initial: Record<string, Row[]> = {}) {
    const fake = installFakeSupabase({ campers: [NEO], ...initial })
    const otpRequests: Row[] = []
    let otpError: string | null = null

    // El simulador no contesta a /otp: lo que se pide a Auth se registra aquí
    const inner = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(input instanceof Request ? input.url : String(input))
        if (url.pathname === '/auth/v1/otp') {
            otpRequests.push({ ...JSON.parse(String(init?.body)), query: url.search })
            return otpError
                ? new Response(JSON.stringify({ msg: otpError }), { status: 429, headers: { 'content-type': 'application/json' } })
                : new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
        }
        return inner(input, init)
    }) as typeof fetch

    async function checkout(body: Row, jar = new CookieJar(), headers: Record<string, string> = {}) {
        const res = await checkoutRoute(new Request('http://localhost/api/bookings/checkout', { method: 'POST', headers, body: JSON.stringify(body) }))
        jar.absorb(res)
        return { status: res.status, json: await res.json(), jar }
    }

    function signed(order: string, amountCents: number, options: { response?: string; authorisation?: string; type?: string } = {}) {
        const config = getRedsysConfig()
        const params = encodeMerchantParameters({
            Ds_Order: order,
            Ds_Amount: String(amountCents),
            Ds_Currency: '978',
            Ds_MerchantCode: config.merchantCode,
            Ds_Terminal: '1',
            Ds_Response: options.response ?? '0000',
            Ds_AuthorisationCode: options.authorisation ?? '123456',
            Ds_TransactionType: options.type ?? '0',
        })
        return {
            Ds_SignatureVersion: 'HMAC_SHA256_V1',
            Ds_MerchantParameters: params,
            Ds_Signature: calculateSignature(params, order, config.secretKey),
        }
    }

    async function webhook(order: string, amountCents: number, options: Parameters<typeof signed>[2] = {}) {
        const res = await webhookRoute(new Request('http://localhost/api/webhooks/redsys', {
            method: 'POST',
            body: new URLSearchParams(signed(order, amountCents, options)),
        }))
        return { status: res.status, body: await res.text() }
    }

    async function verify(order: string, jar: CookieJar, redsysParams?: Record<string, string>) {
        const query = new URLSearchParams({ order, ...redsysParams })
        const res = await verifyRoute(new NextRequest(`http://localhost/api/bookings/verify-payment?${query}`, {
            headers: { cookie: jar.header() },
        }))
        return { status: res.status, json: await res.json() }
    }

    async function pay(id: string) {
        const res = await payRoute(new Request(`http://localhost/api/bookings/${id}/pay`, { method: 'POST' }), {
            params: Promise.resolve({ id }),
        })
        return { status: res.status, json: await res.json() }
    }

    async function upload(data: FormData, jar: CookieJar, order?: string) {
        const encoded = new Request('http://localhost/', { method: 'POST', body: data })
        const body = await encoded.arrayBuffer()
        const headers = new Headers({
            'content-type': encoded.headers.get('content-type')!,
            'content-length': String(body.byteLength),
        })
        if (jar.header()) headers.set('cookie', jar.header())
        const url = `http://localhost/api/upload-driver-docs${order ? `?order=${encodeURIComponent(order)}` : ''}`
        const res = await uploadRoute(new NextRequest(url, { method: 'POST', headers, body }))
        jar.absorb(res)
        return { status: res.status, json: await res.json() }
    }

    return {
        fake,
        otpRequests,
        failOtp(message: string | null) { otpError = message },
        checkout,
        signed,
        webhook,
        verify,
        pay,
        upload,
    }
}

/** Formulario que envía /checkout/success (handleSubmitAll) */
export function successPageForm(): FormData {
    const data = new FormData()
    data.append('fullName', 'Ana Pérez')
    data.append('dniNie', '12345678Z')
    data.append('driverLicenseId', 'B-1234')
    data.append('driverLicenseIssueDate', '2015-01-01')
    data.append('driverLicenseExpiryDate', '2035-01-01')
    data.append('address', 'Calle Mayor 1')
    data.append('phone', '+34 600000000')
    data.append('dni_front', JPEG(), 'dni_front.jpg')
    data.append('dni_back', JPEG(), 'dni_back.jpg')
    data.append('license_front', JPEG(), 'license_front.jpg')
    data.append('license_back', JPEG(), 'license_back.jpg')
    return data
}

/** Formulario que envía /dashboard/datos (DriverDataClient) */
export function dashboardForm(): FormData {
    const data = new FormData()
    data.append('fullName', 'Ana Pérez')
    data.append('dniNie', '12345678Z')
    data.append('driverLicenseId', 'B-1234')
    data.append('driverLicenseIssueDate', '2015-01-01')
    data.append('driverLicenseExpiryDate', '2035-01-01')
    data.append('address', 'Calle Mayor 1')
    data.append('phone', '+34 600000000')
    data.append('dni_front', JPEG(), 'dni_front.jpg')
    data.append('hasSecondDriver', 'false')
    return data
}

export const redsysForm = (merchantParameters: string) =>
    decodeMerchantParameters<Record<string, string>>(merchantParameters)

export const cents = (euros: number) => Math.round(euros * 100)
