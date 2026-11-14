import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { NextIntlClientProvider } from 'next-intl'
import DriverDataClient from '../app/[locale]/dashboard/datos/DriverDataClient'
import { mayUploadSecondDriverPhotos, type SecondDriverBooking } from '../lib/user/secondDriverBookings'

/**
 * Art. 14 RGPD: el 2º conductor no tiene cuenta y no le escribimos nosotros, así que el aviso de que
 * sus documentos se envían a Utopia Van Life lo da el titular. La pantalla debe decírselo ANTES de
 * elegir las fotos y no dejar elegirlas hasta que lo confirme. Se renderiza la pantalla real.
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
}

const CON_NOMBRE: SecondDriverBooking = {
    bookingId: 'b-con-nombre',
    startDate: '2026-12-01',
    endDate: '2026-12-08',
    fullName: 'Luis Pérez',
    dniNie: '22222222B',
    licenseId: 'B-LUIS-22',
}

const SIN_NOMBRE: SecondDriverBooking = { ...CON_NOMBRE, bookingId: 'b-sin-nombre', fullName: '' }

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
        // eslint-disable-next-line react/no-children-prop -- el tipo de NextIntlClientProvider exige children en las props
        React.createElement(NextIntlClientProvider, { locale: 'es', messages: {}, children: inRouter })
    )
}

const visibleText = (html: string) =>
    html.replace(/<!-- -->/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

const tagById = (html: string, id: string) => html.match(new RegExp(`<input[^>]*\\bid="${id}"[^>]*>`))?.[0]

describe('/dashboard/datos: aviso de privacidad del 2º conductor (art. 14 RGPD)', () => {
    const html = render([CON_NOMBRE])
    const text = visibleText(html)

    it('dice que el titular debe haber informado a esa persona de que sus documentos van a Utopia Van Life', () => {
        assert.match(text, /Luis Pérez no tiene cuenta con nosotros/)
        assert.match(text, /tienes que haberle informado tú de que sus documentos se envían a Utopia Van Life/)
    })

    it('enlaza a la política de privacidad y se abre en otra pestaña', () => {
        const link = html.match(/<a[^>]*href="[^"]*\/legal\/privacidad"[^>]*>/)?.[0]
        assert.ok(link, 'no hay enlace a /legal/privacidad')
        assert.match(link, /target="_blank"/)
        assert.match(link, /rel="noopener noreferrer"/)
    })

    it('da los dos plazos reales: 100 días tras la devolución y 3 años (RD 933/2021)', () => {
        // Esta pantalla solo sube las fotos del CARNET: su documento de identidad sale de la ficha
        // de la reserva, así que el aviso no puede prometer un plazo sobre fotos que no envía
        assert.match(text, /las fotos de su carnet se borran 100 días después de la devolución/)
        assert.doesNotMatch(text, /fotos de DNI/)
        assert.match(text, /registro de viajeros \(Real Decreto 933\/2021\) se conservan 3 años/)
    })

    it('el aviso sale ANTES de los selectores de archivo del 2º conductor', () => {
        const notice = html.indexOf('secondDriverNoticeTitle')
        const front = html.indexOf('secondLicenseFrontInput')
        const back = html.indexOf('secondLicenseBackInput')
        assert.ok(notice > -1 && front > -1 && back > -1)
        assert.ok(notice < front && notice < back, 'el aviso aparece después de los selectores')
    })

    it('la casilla de conformidad empieza sin marcar', () => {
        const box = tagById(html, 'secondDriverInformed')
        assert.ok(box, 'no hay casilla de conformidad')
        assert.match(box, /type="checkbox"/)
        assert.doesNotMatch(box, /\bchecked(=|\s|\/|>)/)
    })

    it('hasta confirmarlo, los dos selectores de archivo están bloqueados y se explica por qué', () => {
        for (const id of ['secondLicenseFrontInput', 'secondLicenseBackInput']) {
            const input = tagById(html, id)
            assert.ok(input, `no se pinta ${id}`)
            assert.match(input, /\bdisabled(=|\s|\/|>)/, `${id} no está bloqueado`)
        }
        assert.match(text, /Marca la casilla de arriba para poder elegir las fotos/)
    })

    it('sin nombre en la ficha no inventa uno: habla de "la persona autorizada"', () => {
        const sinNombre = visibleText(render([SIN_NOMBRE]))
        assert.match(sinNombre, /La persona autorizada no tiene cuenta con nosotros/)
        assert.match(sinNombre, /He informado a esa persona/)
    })

    it('el aviso no usa estilos en línea para maquetar (anularían las @media del móvil)', () => {
        const start = html.indexOf('second-driver-notice"')
        const end = html.indexOf('second-driver-upload-section')
        assert.ok(start > -1 && end > start)
        assert.doesNotMatch(html.slice(start, end), /\sstyle="/)
    })

    it('sin reserva que autorice a un 2º conductor no se pinta ningún aviso ni selector', () => {
        const none = render([])
        assert.ok(!none.includes('secondDriverInformed'))
        assert.ok(!none.includes('secondLicenseFrontInput'))
    })
})

describe('mayUploadSecondDriverPhotos: las fotos solo viajan con la confirmación', () => {
    it('con el interruptor activo y la confirmación, viajan', () => {
        assert.equal(mayUploadSecondDriverPhotos(true, true), true)
    })

    it('sin confirmación no viajan, aunque el interruptor esté activo', () => {
        assert.equal(mayUploadSecondDriverPhotos(true, false), false)
    })

    it('con el interruptor apagado no viajan, aunque quedara la confirmación', () => {
        assert.equal(mayUploadSecondDriverPhotos(false, true), false)
        assert.equal(mayUploadSecondDriverPhotos(false, false), false)
    })
})
