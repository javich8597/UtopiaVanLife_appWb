import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { NextIntlClientProvider } from 'next-intl'
import DriverDataClient from '../app/[locale]/dashboard/datos/DriverDataClient'
import type { SecondDriverBooking } from '../lib/user/secondDriverBookings'

/**
 * La ficha de la reserva manda sobre el 2º conductor. Si la ficha identifica a la persona por
 * documento pero no guarda su nombre, el formulario no podía rellenarlo con el del perfil: ese nombre
 * puede ser el 2º conductor de OTRA reserva del mismo cliente, y al pulsar Guardar acababa en el
 * contrato de esta (el contrato nombró a "Marta Otra"). Estos tests renderizan la pantalla de
 * verdad: miran lo que ve el cliente, no el texto del fuente.
 */

const PROFILE = {
    full_name: 'Titular Uno',
    dni_nie: '11111111A',
    phone: '+34600112233',
    address: 'Calle Mayor 1, Madrid',
    driver_license_id: 'B-1',
    driver_license_issue_date: '2015-01-01',
    driver_license_expiry_date: '2035-01-01',
    verification_status: 'verified',
    has_second_driver: true,
    // Segundo conductor de OTRA reserva del mismo cliente
    second_driver_name: 'Marta Otra',
    second_driver_dni: '99999999Z',
    second_driver_license: 'B-OTRA-999',
}

const SIN_NOMBRE: SecondDriverBooking = {
    bookingId: 'b-sin-nombre',
    startDate: '2026-12-01',
    endDate: '2026-12-08',
    fullName: '',
    dniNie: '22222222B',
    licenseId: '',
}

const CON_NOMBRE: SecondDriverBooking = {
    bookingId: 'b-con-nombre',
    startDate: '2026-12-01',
    endDate: '2026-12-08',
    fullName: 'Luis Pérez',
    dniNie: '22222222B',
    licenseId: 'B-LUIS-22',
}

// La pantalla usa el router y los parámetros de Next: fuera de la app se les da un contexto vacío
const noop = () => {}
const ROUTER = { push: noop, replace: noop, refresh: noop, back: noop, forward: noop, prefetch: noop }

function render(secondDriverBookings: SecondDriverBooking[]) {
    const screen = React.createElement(DriverDataClient, {
        user: { id: 'u1', email: 'titular@example.com', user_metadata: {} },
        profile: PROFILE,
        secondDriverBookings,
    })
    const inRouter = React.createElement(
        AppRouterContext.Provider,
        { value: ROUTER as never },
        React.createElement(SearchParamsContext.Provider, { value: new URLSearchParams() }, screen)
    )
    return renderToStaticMarkup(
        React.createElement(NextIntlClientProvider, { locale: 'es', messages: {}, children: inRouter })
    )
}

/** Atributos de un <input> concreto, por su id */
function inputById(html: string, id: string): { tag: string; value: string; readOnly: boolean } {
    const tag = html.match(new RegExp(`<input[^>]*\\bid="${id}"[^>]*>`))?.[0]
    assert.ok(tag, `no se pinta el campo ${id}`)
    return {
        tag,
        value: (tag.match(/\bvalue="([^"]*)"/)?.[1] ?? '').replace(/&#x27;/g, "'"),
        readOnly: /\breadonly(=|\s|\/|>)/i.test(tag),
    }
}

const visibleText = (html: string) =>
    html.replace(/<!-- -->/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('/dashboard/datos: 2º conductor con ficha sin nombre y perfil con otro', () => {
    const html = render([SIN_NOMBRE])

    it('el formulario no ofrece el nombre del perfil', () => {
        assert.ok(!html.includes('Marta Otra'), 'el nombre del perfil aparece en la pantalla')
        assert.notEqual(inputById(html, 'secondDriverFullName').value, 'Marta Otra')
    })

    it('tampoco ofrece el documento ni el carnet del perfil', () => {
        assert.ok(!html.includes('99999999Z'), 'el documento del perfil aparece en la pantalla')
        assert.ok(!html.includes('B-OTRA-999'), 'el carnet del perfil aparece en la pantalla')
    })

    it('el documento sale de la ficha de la reserva', () => {
        assert.equal(inputById(html, 'secondDriverDni').value, '22222222B')
    })

    it('nombre, documento y carnet son de solo lectura aunque la ficha no los traiga', () => {
        assert.equal(inputById(html, 'secondDriverFullName').readOnly, true)
        assert.equal(inputById(html, 'secondDriverDni').readOnly, true)
        assert.equal(inputById(html, 'secondDriverLicense').readOnly, true)
    })

    it('en vez de un campo vacío editable dice "Pendiente de verificación" y que hay que escribirnos', () => {
        assert.equal(inputById(html, 'secondDriverFullName').value, 'Pendiente de verificación')
        const text = visibleText(html)
        assert.match(text, /nombre[^.]*pendiente de verificación/i)
        assert.match(text, /escríbenos/i)
    })

    it('un carnet que la ficha no trae tampoco se rellena con el del perfil: queda pendiente', () => {
        assert.equal(inputById(html, 'secondDriverLicense').value, 'Pendiente de verificación')
        assert.match(visibleText(html), /número de carnet[^.]*pendiente de verificación/i)
    })
})

describe('/dashboard/datos: 2º conductor con ficha completa', () => {
    const html = render([CON_NOMBRE])

    it('muestra el nombre y el documento de la ficha, de solo lectura', () => {
        const name = inputById(html, 'secondDriverFullName')
        assert.equal(name.value, 'Luis Pérez')
        assert.equal(name.readOnly, true)
        assert.equal(inputById(html, 'secondDriverDni').value, '22222222B')
        assert.equal(inputById(html, 'secondDriverDni').readOnly, true)
    })

    it('no aparece nada del perfil ni el aviso de nombre pendiente', () => {
        assert.ok(!html.includes('Marta Otra'))
        assert.ok(!html.includes('Pendiente de verificación'))
    })

    it('el nº de carnet sale de la ficha y también es de solo lectura', () => {
        const license = inputById(html, 'secondDriverLicense')
        assert.equal(license.value, 'B-LUIS-22')
        assert.equal(license.readOnly, true)
    })

    it('el texto explica que los tres datos salen de la reserva', () => {
        assert.match(visibleText(html), /nombre, el documento y el número de carnet de esta persona salen de tu reserva/i)
    })
})

describe('/dashboard/datos: sin reserva que autorice a un 2º conductor', () => {
    it('no pinta los campos del 2º conductor ni nada del perfil', () => {
        const html = render([])
        assert.ok(!html.includes('secondDriverFullName'))
        assert.ok(!html.includes('Marta Otra'))
        assert.ok(!html.includes('99999999Z'))
    })
})
