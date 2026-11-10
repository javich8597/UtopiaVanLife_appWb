import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { generateContractData } from '../lib/contracts/contractEngine'
import { escapeHtml, renderContractHtml, secondDriverSupplementText } from '../lib/admin/contractHtml'

/**
 * El contrato imprimible del admin (`/api/admin/contract`) tiene que decir lo mismo que el PDF del
 * cliente. Hasta ahora no incluía el bloque del segundo conductor. Sin Supabase: se genera el
 * contrato con datos en memoria, como hace la ruta tras leer la reserva.
 */

const CAMPER = { slug: 'neo', name: 'NEO', plate_number: '8291-LKN' }
const ANA_FICHA = { fullName: 'Ana Ruiz', dniNie: '12345678Z', isSecondDriver: true }

function contractFor(opts: { supplement: number; rate: number; withSecondDriver?: boolean }) {
    const withSecond = opts.withSecondDriver ?? true
    const passengers = withSecond ? [ANA_FICHA] : []
    const booking = {
        id: '11111111-aaaa-bbbb-cccc-222222222222',
        start_date: '2099-06-01',
        end_date: '2099-06-08',
        total_price: 735,
        deposit_amount: 2000,
        passengers,
        pricing_breakdown: {
            secondDriver: withSecond,
            includesSecondDriver: withSecond && opts.supplement === 0,
            secondDriverRatePerDay: opts.rate,
            secondDriverSupplement: opts.supplement,
            passengers,
        },
    }
    // El perfil lleva los mismos datos: el contrato los toma de la reserva o del perfil según la
    // versión del motor, y el HTML debe pintar lo que el motor entregue en `secondDriver`
    const profile = {
        full_name: 'Titular Prueba',
        dni_nie: '11111111H',
        driver_license_id: 'B-1',
        email: 'titular@example.com',
        has_second_driver: withSecond,
        second_driver_name: withSecond ? 'Ana Ruiz' : null,
        second_driver_dni: withSecond ? '12345678Z' : null,
        second_driver_license: withSecond ? 'B-99' : null,
    }
    return generateContractData(booking, profile, CAMPER)
}

describe('Contrato imprimible del admin: segundo conductor', () => {
    it('incluye el bloque del segundo conductor con sus datos y el suplemento cobrado (Estándar)', () => {
        const html = renderContractHtml(contractFor({ supplement: 35, rate: 5 }))
        assert.match(html, /Segundo conductor autorizado/)
        assert.match(html, /Ana Ruiz/)
        assert.match(html, /12345678Z/)
        assert.match(html, /Suplemento de segundo conductor contratado: 35\.00 € \(5\.00 €\/día\)/)
    })

    it('con fianza Flex dice que va incluido sin coste', () => {
        const html = renderContractHtml(contractFor({ supplement: 0, rate: 0 }))
        assert.match(html, /Segundo conductor autorizado/)
        assert.match(html, /incluido sin coste adicional/)
        assert.doesNotMatch(html, /Suplemento de segundo conductor contratado/)
    })

    it('un suplemento de 0 € sin «incluido» en el desglose no se presenta como gratuito', () => {
        assert.match(secondDriverSupplementText({ supplement: 0, ratePerDay: 0, included: false }), /No consta suplemento/)
        assert.match(secondDriverSupplementText({ supplement: 0, ratePerDay: 0, included: true }), /incluido sin coste adicional/)
    })

    it('sin segundo conductor no pinta el bloque', () => {
        const html = renderContractHtml(contractFor({ supplement: 0, rate: 0, withSecondDriver: false }))
        assert.doesNotMatch(html, /Segundo conductor autorizado/)
    })

    it('usa las mismas frases que el PDF del cliente', () => {
        const pdf = readFileSync(new URL('../lib/contracts/pdfGenerator.ts', import.meta.url), 'utf8')
        const withCost = secondDriverSupplementText({ supplement: 35, ratePerDay: 5, included: false })
        const included = secondDriverSupplementText({ supplement: 0, ratePerDay: 0, included: true })
        assert.ok(pdf.includes('Suplemento de segundo conductor contratado:'), 'el PDF cambió la frase del suplemento')
        assert.ok(pdf.includes(included), 'el PDF cambió la frase del segundo conductor incluido')
        assert.ok(withCost.startsWith('Suplemento de segundo conductor contratado:'))
    })

    it('escapa los datos del cliente: un nombre con HTML no se ejecuta en la sesión del admin', () => {
        const contract = contractFor({ supplement: 35, rate: 5 })
        contract.lessee.fullName = '<img src=x onerror=alert(1)>'
        contract.secondDriver!.fullName = '<script>alert(2)</script>'
        const html = renderContractHtml(contract)
        assert.doesNotMatch(html, /<img src=x/)
        assert.doesNotMatch(html, /<script>alert\(2\)/)
        assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
        assert.equal(escapeHtml(`a&b<c>"d"'e'`), 'a&amp;b&lt;c&gt;&quot;d&quot;&#39;e&#39;')
    })

    it('la ruta usa renderContractHtml y no una plantilla propia sin segundo conductor', () => {
        const route = readFileSync(new URL('../app/api/admin/contract/route.ts', import.meta.url), 'utf8')
        assert.match(route, /renderContractHtml\(contract\)/)
        assert.doesNotMatch(route, /<!DOCTYPE html>/)
    })
})
