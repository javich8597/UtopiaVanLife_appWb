import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getContractTemplate, getDefaultFactoryTemplate } from '../../lib/contracts/templateService'

describe('templateService', () => {
  it('returns default factory template when no custom template exists in db', async () => {
    const template = await getContractTemplate()
    assert.ok(template)
    assert.equal(template.terms.depositAmount, 1000)
    assert.equal(template.terms.includedKmPerDay, 150)
    assert.equal(template.terms.extraKmPrice, 0.25)
    assert.equal(template.terms.smokePenalty, 300)
    assert.equal(template.articles.length, 31)
    assert.equal(template.lessor.legalName, 'UTOPIA VAN LIFE S.L.')
  })

  it('provides a pure default factory template via getDefaultFactoryTemplate', () => {
    const factory = getDefaultFactoryTemplate()
    assert.equal(factory.version, 1)
    assert.equal(factory.articles.length, 31)
    assert.equal(factory.terms.cleaningWc, 200)
    assert.equal(factory.terms.waterFuelContaminationPenalty, 2000)
  })
})
