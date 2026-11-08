import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ContractSignModal, { formatDepositEur } from '../app/[locale]/dashboard/documentos/ContractSignModal'
import { generateContractData } from '../lib/contracts/contractEngine'

const profile = {
  full_name: 'Carlos Ruiz',
  dni_nie: '12345678Z',
  phone: '+34600112233',
  address: 'Calle Mayor 1, Madrid',
  driver_license_id: 'B-12345678',
  driver_license_issue_date: '2015-01-01',
  driver_license_expiry_date: '2030-01-01',
}

function bookingWithDeposit(deposit: number) {
  return {
    id: 'book-test-123',
    start_date: '2026-10-03',
    end_date: '2026-10-05',
    total_price: 450,
    deposit_amount: deposit,
    camper: { slug: 'neo', name: 'Camper NEO', plate_number: '8291-LKN' },
  }
}

function render(booking: any) {
  return renderToStaticMarkup(
    React.createElement(ContractSignModal, {
      booking,
      profile,
      onClose: () => {},
      onSigned: () => {},
    })
  )
}

// Quita comentarios de React y etiquetas para comparar el texto visible
function visibleText(html: string) {
  return html.replace(/<!-- -->/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

describe('ContractSignModal: resumen del contrato', () => {
  it('formatea la fianza con separador de miles y dos decimales', () => {
    assert.equal(formatDepositEur(2000).replace(/ /g, ' '), '2.000,00 €')
    assert.equal(formatDepositEur(1000).replace(/ /g, ' '), '1.000,00 €')
  })

  it('muestra la fianza Estándar (2.000 €) de la reserva, no un importe fijo', () => {
    const text = visibleText(render(bookingWithDeposit(2000)))
    assert.match(text, /Fianza: 2\.000,00 €/)
    assert.doesNotMatch(text, /Fianza: 1\.000,00 €/)
  })

  it('muestra la fianza Flex (1.000 €) de la reserva', () => {
    const text = visibleText(render(bookingWithDeposit(1000)))
    assert.match(text, /Fianza: 1\.000,00 €/)
  })

  it('el número de artículos del encabezado es el real, no 17', () => {
    const total = generateContractData(bookingWithDeposit(2000), profile).articles.length
    assert.notEqual(total, 17)
    const text = visibleText(render(bookingWithDeposit(2000)))
    assert.match(text, new RegExp(`Condiciones Generales del Contrato \\(${total} Artículos\\)`))
    assert.doesNotMatch(text, /\(17 Artículos\)/)
  })
})
