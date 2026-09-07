import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ContractTemplateData, defaultContractTerms } from '../../lib/contracts/templateTypes'

describe('templateTypes', () => {
  it('defines defaultContractTerms matching official contract values', () => {
    assert.equal(defaultContractTerms.depositAmount, 1000)
    assert.equal(defaultContractTerms.includedKmPerDay, 150)
    assert.equal(defaultContractTerms.extraKmPrice, 0.25)
    assert.equal(defaultContractTerms.smokePenalty, 300)
    assert.equal(defaultContractTerms.keyPenalty, 400)
    assert.equal(defaultContractTerms.documentPenalty, 200)
    assert.equal(defaultContractTerms.fuelServiceCharge, 40)
    assert.equal(defaultContractTerms.cleaningBasic, 50)
    assert.equal(defaultContractTerms.cleaningIntensive, 150)
    assert.equal(defaultContractTerms.cleaningWc, 200)
    assert.equal(defaultContractTerms.waterFuelContaminationPenalty, 2000)
    assert.equal(defaultContractTerms.heightLimitMeters, 2.80)
  })
})
