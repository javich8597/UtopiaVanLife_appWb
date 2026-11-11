import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { calculatePrice, calculatePriceV2 } from '../lib/pricing/engine'

/**
 * Calculadora de la ficha de la camper: el total y el botón muestran lo que se cobra al reservar
 * (payableTotal, lo mismo que guarda el checkout en total_price). La fianza va aparte y no se suma.
 * El componente no se renderiza: se comprueba su código y el cálculo que usa.
 */

const source = readFileSync('components/booking/PriceCalculator.tsx', 'utf8')

describe('Calculadora de precio: fianza aparte', () => {
    it('no muestra ningún total con la fianza sumada', () => {
        assert.doesNotMatch(source, /grandTotal/)
        assert.doesNotMatch(source, /Total reserva/)
    })

    it('muestra "Total a pagar" y el botón con el importe sin fianza', () => {
        assert.match(source, /Total a pagar/)
        assert.match(source, /formatPrice\(breakdown\.payableTotal\)/)
        assert.match(source, /`Reservar — \$\{formatPrice\(breakdown\.payableTotal\)\}`/)
    })

    it('explica que la fianza no se cobra, con sus dos importes', () => {
        assert.match(source, /Fianza aparte, no se cobra: retención de \{formatDepositEuros\(safeDeposit\)\} en tarjeta al recoger la camper\. \{formatDepositEuros\(flexDepositAmount\)\} con la opción Flex \(\+\{flexDepositRatePerDay\} €\/día\)\./)
        assert.doesNotMatch(source, /Incluye \{formatPrice\(breakdown\.deposit\)\}/)
    })

    it('sin fianza recibida usa la estándar de 2.000 €', () => {
        assert.match(source, /Number\(depositAmount\) \|\| 2000/)
    })

    it('el importe que muestra es el que cobra el checkout, sin la fianza', () => {
        const v2 = calculatePriceV2({
            startDate: new Date('2099-06-01'), startSlot: 'afternoon', endDate: new Date('2099-06-08'), endSlot: 'morning',
            camperBasePrice: 100, seasons: [], periods: [], discounts: [], selectedExtras: [], depositAmount: 2000,
        })
        assert.equal(v2.payableTotal, v2.grandTotal - 2000)
        assert.ok(v2.payableTotal > 0)

        const v1 = calculatePrice(new Date('2099-06-01'), 'afternoon', new Date('2099-06-08'), 'morning', [], [], 2000)
        assert.equal(v1.payableTotal, v1.grandTotal - 2000)
    })
})
