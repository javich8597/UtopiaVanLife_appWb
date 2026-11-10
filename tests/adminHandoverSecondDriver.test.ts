import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { NextIntlClientProvider } from 'next-intl'
import { installFakeSupabase, Row } from './helpers/fakeSupabase'
import { POST as handoverPOST } from '../app/api/admin/handovers/route'
import {
    CHECKLIST,
    SECOND_DRIVER_CHECK_IDS,
    handoverSteps,
    missingSteps,
} from '../lib/handover/checklist'
import { secondDriverStepInput } from '../lib/handover/secondDriverStep'
import HandoverClient from '../app/[locale]/admin/entregas/[bookingId]/HandoverClient'

/**
 * Comprobación del segundo conductor en la entrega de recogida. Se ejecuta la ruta real que cierra
 * la entrega con Supabase y Storage simulados en memoria (ninguna petición real): lo que importa es
 * que el SERVIDOR no cierre la entrega a ciegas, no lo que pinte la pantalla.
 */

const ADMIN_ID = '00000000-0000-4000-8000-0000000000aa'
const USER = 'cliente-1'
const BOOKING = '11111111-aaaa-4bbb-8ccc-222222222222'
const NO_SECOND = '33333333-aaaa-4bbb-8ccc-444444444444'
const UUID = '3f2b8c1e-5d4a-4e7b-9c10-0a1b2c3d4e5f'
const FULL_PHOTOS = ['second_dni_front', 'second_dni_back', 'second_license_front', 'second_license_back'].map(p => `${p}_${UUID}.jpg`)

const allChecked = Object.fromEntries(CHECKLIST.pickup.map(i => [i.id, true]))

const secondDriver = (extra: Record<string, unknown> = {}) => ({
    fullName: 'Ana Ruiz', dniNie: '12345678Z', isSecondDriver: true, birthDate: '1990-01-01', licenseDate: '2012-01-01', driverLicenseId: '12345678', ...extra,
})

function booking(id: string, extra: Row = {}): Row {
    return {
        id, user_id: USER, status: 'confirmed', payment_status: 'paid',
        start_date: '2099-06-01', end_date: '2099-06-08',
        passengers: [secondDriver()],
        ...extra,
    }
}

/** Todo lo demás de la entrega hecho: solo queda lo que cada test deja pendiente */
function handoverRow(bookingId: string, extra: Row = {}): Row {
    return {
        id: `handover-${bookingId}`, booking_id: bookingId, kind: 'pickup',
        license_checked: true, km: 100, fuel_level: 'Lleno', dashboard_photo_path: 'a.jpg',
        exterior_video_path: 'e.webm', interior_video_path: 'i.webm',
        checklist: { ...allChecked }, customer_signature: 'data:image/png;base64,x',
        ...extra,
    }
}

describe('Entrega de recogida: paso del segundo conductor (lógica)', () => {
    const input = (extra: Record<string, unknown> = {}) => secondDriverStepInput(
        booking(BOOKING, extra),
        { dniFrontUrl: true, dniBackUrl: true, licenseFrontUrl: true, licenseBackUrl: true }
    )!
    const ticked = { [SECOND_DRIVER_CHECK_IDS.license]: true, [SECOND_DRIVER_CHECK_IDS.document]: true }
    const pickup = (checklist: Record<string, boolean>) => ({
        kind: 'pickup' as const, license_checked: true, km: 1, fuel_level: 'Lleno', dashboard_photo_path: 'a',
        exterior_video_path: 'e', interior_video_path: 'i', customer_signature: 'x', checklist,
    })

    it('sin la opción, los pasos son los de siempre: lo que usa quien decide si una entrega está cerrada', () => {
        assert.deepEqual(missingSteps(pickup({ ...allChecked })), [])
        assert.equal(handoverSteps(pickup({})).some(s => s.id === 'second_driver'), false)
    })

    it('con segundo conductor aparece detrás del carnet del titular y es obligatorio', () => {
        const steps = handoverSteps(pickup({ ...allChecked }), { secondDriver: input() })
        assert.deepEqual(steps.slice(0, 2).map(s => s.id), ['license', 'second_driver'])
        assert.deepEqual(missingSteps(pickup({ ...allChecked }), { secondDriver: input() }), ['Segundo conductor comprobado'])
        assert.deepEqual(missingSteps(pickup({ ...allChecked, ...ticked }), { secondDriver: input() }), [])
    })

    it('el paso del titular y el del segundo conductor se llaman distinto', () => {
        const [first, second] = handoverSteps(pickup({}), { secondDriver: input() })
        assert.match(first.label, /titular/i)
        assert.match(second.label, /segundo conductor/i)
    })

    it('la devolución nunca lo pide', () => {
        const steps = handoverSteps({ kind: 'return' }, { secondDriver: input() })
        assert.equal(steps.some(s => s.id === 'second_driver'), false)
    })

    it('si falta un dato de la ficha no se puede dar por comprobado, aunque se marquen las casillas', () => {
        const steps = handoverSteps(pickup({ ...allChecked, ...ticked }), { secondDriver: input({ passengers: [secondDriver({ driverLicenseId: '' })] }) })
        const step = steps.find(s => s.id === 'second_driver')!
        assert.equal(step.done, false)
        assert.match(step.detail || '', /número de carnet/)
    })

    it('sin alguna foto exige confirmar que se comprueba en persona; con Storage ilegible, también', () => {
        const noBack = secondDriverStepInput(booking(BOOKING), { dniFrontUrl: true, dniBackUrl: false, licenseFrontUrl: true, licenseBackUrl: true })!
        const unreadable = secondDriverStepInput(booking(BOOKING), null)!
        for (const info of [noBack, unreadable]) {
            const without = handoverSteps(pickup({ ...allChecked, ...ticked }), { secondDriver: info }).find(s => s.id === 'second_driver')!
            assert.equal(without.done, false)
            const withAck = handoverSteps(pickup({ ...allChecked, ...ticked, [SECOND_DRIVER_CHECK_IDS.noPhotos]: true }), { secondDriver: info }).find(s => s.id === 'second_driver')!
            assert.equal(withAck.done, true)
        }
    })

    it('una reserva sin segundo conductor no genera paso', () => {
        assert.equal(secondDriverStepInput(booking(NO_SECOND, { passengers: [] }), null), null)
    })
})

describe('Ruta /api/admin/handovers: cierre de la entrega con segundo conductor', () => {
    let fake: ReturnType<typeof installFakeSupabase>
    let storage: Record<string, string[]>
    let realFetch: typeof fetch
    const silenced = { error: console.error, warn: console.warn, info: console.info }

    beforeEach(() => {
        fake = installFakeSupabase({
            users: [{ id: ADMIN_ID, role: 'admin' }, { id: USER, role: 'customer' }],
            bookings: [booking(BOOKING), booking(NO_SECOND, { passengers: [] })],
            handovers: [handoverRow(BOOKING), handoverRow(NO_SECOND)],
        })
        storage = { [`${USER}/${BOOKING}`]: FULL_PHOTOS }
        // El Supabase simulado no lista carpetas de Storage: se intercepta solo ese listado
        realFetch = globalThis.fetch
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : new Request(input, init)
            const url = new URL(request.url)
            if (url.pathname === '/storage/v1/object/list/documents') {
                const { prefix } = JSON.parse(String(init?.body ?? (await request.clone().text())))
                return new Response(JSON.stringify((storage[prefix] || []).map(name => ({ name, created_at: '2026-10-05T09:30:00.000Z' }))), {
                    status: 200, headers: { 'content-type': 'application/json' },
                })
            }
            return realFetch(input, init)
        }) as typeof fetch
        fake.setSession({ id: ADMIN_ID, email: 'admin@example.com', app_metadata: {}, user_metadata: {} })
        console.error = () => {}
        console.warn = () => {}
        console.info = () => {}
    })

    afterEach(() => {
        globalThis.fetch = realFetch
        fake.restore()
        Object.assign(console, silenced)
    })

    const finish = (bookingId: string, checklist: Record<string, boolean>, kind = 'pickup') =>
        handoverPOST(new Request('http://localhost/api/admin/handovers', {
            method: 'POST',
            body: JSON.stringify({ bookingId, kind, patch: { checklist }, complete: true }),
        }))
    const ticked = { ...allChecked, [SECOND_DRIVER_CHECK_IDS.license]: true, [SECOND_DRIVER_CHECK_IDS.document]: true }
    const statusOf = (id: string) => fake.tables.bookings.find(b => b.id === id)!.status

    it('sin las comprobaciones del segundo conductor NO cierra la entrega ni toca la reserva', async () => {
        const res = await finish(BOOKING, { ...allChecked })
        assert.equal(res.status, 400)
        assert.match((await res.json()).error, /Segundo conductor comprobado/)
        assert.equal(statusOf(BOOKING), 'confirmed')
        assert.equal(fake.writesTo('handovers').length, 0, 'no debe haber guardado nada')
    })

    it('con la ficha completa, las fotos y las dos comprobaciones, cierra y la reserva pasa a «en curso»', async () => {
        const res = await finish(BOOKING, ticked)
        assert.equal(res.status, 200)
        assert.equal(statusOf(BOOKING), 'active')
    })

    it('si el servidor ve que falta una foto, pide confirmar que se comprueba en persona', async () => {
        storage[`${USER}/${BOOKING}`] = FULL_PHOTOS.filter(n => !n.startsWith('second_license_back'))
        const blocked = await finish(BOOKING, ticked)
        assert.equal(blocked.status, 400)
        assert.match((await blocked.json()).error, /carnet \(reverso\)/)
        assert.equal(statusOf(BOOKING), 'confirmed')

        const ok = await finish(BOOKING, { ...ticked, [SECOND_DRIVER_CHECK_IDS.noPhotos]: true })
        assert.equal(ok.status, 200)
    })

    it('no vale lo que diga la pantalla: con las fotos de otra reserva no hay fotos para esta', async () => {
        storage = { [`${USER}/${NO_SECOND}`]: FULL_PHOTOS }
        const res = await finish(BOOKING, ticked)
        assert.equal(res.status, 400)
        assert.equal(statusOf(BOOKING), 'confirmed')
    })

    it('con la ficha sin nº de carnet no se cierra a ciegas, ni confirmando la falta de fotos', async () => {
        fake.tables.bookings.find(b => b.id === BOOKING)!.passengers = [secondDriver({ driverLicenseId: '' })]
        const res = await finish(BOOKING, { ...ticked, [SECOND_DRIVER_CHECK_IDS.noPhotos]: true })
        assert.equal(res.status, 400)
        assert.match((await res.json()).error, /número de carnet/)
        assert.equal(statusOf(BOOKING), 'confirmed')
    })

    it('una reserva sin segundo conductor se cierra como siempre y descarta casillas que no le tocan', async () => {
        const res = await finish(NO_SECOND, ticked)
        assert.equal(res.status, 200)
        const saved = (await res.json()).handover
        assert.equal(SECOND_DRIVER_CHECK_IDS.license in (saved.checklist || {}), false)
        assert.equal(statusOf(NO_SECOND), 'active')
    })

    it('la devolución de una reserva con segundo conductor no pide su comprobación', async () => {
        fake.tables.handovers.push(handoverRow(BOOKING, { id: 'return-1', kind: 'return', license_checked: undefined, checklist: Object.fromEntries(CHECKLIST.return.map(i => [i.id, true])) }))
        const res = await finish(BOOKING, Object.fromEntries(CHECKLIST.return.map(i => [i.id, true])), 'return')
        assert.equal(res.status, 200)
        assert.equal(statusOf(BOOKING), 'completed')
    })

    it('un cliente (no admin) no puede cerrar la entrega', async () => {
        fake.setSession({ id: USER, email: 'c@example.com', app_metadata: {}, user_metadata: { role: 'admin' } })
        const res = await finish(BOOKING, ticked)
        assert.ok(res.status === 401 || res.status === 403)
        assert.equal(statusOf(BOOKING), 'confirmed')
    })
})

describe('Hoja de entrega: el paso del segundo conductor en pantalla', () => {
    const noop = () => {}
    const ROUTER = { push: noop, replace: noop, refresh: noop, back: noop, forward: noop, prefetch: noop }
    const render = (props: Record<string, unknown>) =>
        renderToStaticMarkup(
            React.createElement(NextIntlClientProvider, {
                locale: 'es', messages: {},
                children: React.createElement(AppRouterContext.Provider, { value: ROUTER as never },
                    React.createElement(SearchParamsContext.Provider, { value: new URLSearchParams() },
                        React.createElement(HandoverClient as never, props as never))),
            })
        )
    const props = (extra: Record<string, unknown> = {}) => ({
        kind: 'pickup',
        booking: { id: BOOKING, start_date: '2099-06-01', end_date: '2099-06-08', customer_name: 'Titular', campers: { name: 'NEO' } },
        customer: { full_name: 'Titular', verification_status: 'verified' },
        licensePhotos: [], initial: null, pickupKm: null,
        ...extra,
    })
    const photos = { dniFrontUrl: true, dniBackUrl: true, licenseFrontUrl: true, licenseBackUrl: true }

    it('enseña nombre, documento y nº de carnet de la reserva y numera el resto desplazado', () => {
        const html = render(props({ secondDriverStep: secondDriverStepInput(booking(BOOKING), photos) }))
        assert.match(html, /Comprobar al segundo conductor/)
        assert.match(html, /Ana Ruiz/)
        assert.match(html, /12345678Z/)
        assert.match(html, /12345678</)
        assert.match(html, /3\. Kilómetros y cuadro de mando/)
        assert.match(html, /7\. Firma del cliente/)
        assert.match(html, /0 de 7 pasos/)
    })

    it('si falta un dato lo dice, enlaza a la reserva y deja las casillas bloqueadas', () => {
        const html = render(props({ secondDriverStep: secondDriverStepInput(booking(BOOKING, { passengers: [secondDriver({ driverLicenseId: '' })] }), photos) }))
        assert.match(html, /La reserva no trae: número de carnet/)
        assert.match(html, /\/admin\/bookings\?id=11111111-aaaa-4bbb-8ccc-222222222222&amp;open=true/)
        const section = html.slice(html.indexOf('Comprobar al segundo conductor'), html.indexOf('Kilómetros y cuadro'))
        const boxes = section.match(/<input type="checkbox"[^>]*>/g) || []
        assert.equal(boxes.length, 2)
        assert.ok(boxes.every(b => /disabled/.test(b)), 'las casillas deben estar bloqueadas sin datos')
    })

    it('sin segundo conductor la hoja es la de siempre', () => {
        const html = render(props())
        assert.doesNotMatch(html, /segundo conductor/i)
        assert.match(html, /2\. Kilómetros y cuadro de mando/)
        assert.match(html, /0 de 6 pasos/)
    })

    it('la devolución no enseña el paso aunque llegue el dato', () => {
        const html = render(props({ kind: 'return', secondDriverStep: secondDriverStepInput(booking(BOOKING), photos) }))
        assert.doesNotMatch(html, /Comprobar al segundo conductor/)
    })
})
