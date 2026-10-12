import { describe, expect, it } from 'vitest'
import { buildPricingExplanation } from './pricingExplanation'
const result = { minimumSellingPrice: 100, baseCost: 50, allocatedFixedCosts: 10, totalVariableCosts: 15, unitProfit: 25 }
describe('explicação da última precificação', () => {
  it('recompõe o preço sem duplicar a taxa nem incluir tarifa fixa omitida pelo motor', () => {
    const explanation = buildPricingExplanation(result, { useConfiguredFee: true, paymentFeePercent: 3, fixedFeeAmount: 1 })
    expect(explanation.rows.map((row) => row.value)).toEqual([50, 10, 12, 3, 25])
    expect(explanation.rows.reduce((sum, row) => sum + row.value, 0)).toBe(100)
    expect(explanation.rows.reduce((sum, row) => sum + row.percent, 0)).toBe(100)
    expect(explanation.fixedFeeAmount).toBe(1)
  })
  it('preserva os valores da simulação após alterar as entradas', () => {
    const inputs = { useConfiguredFee: true, paymentFeePercent: 3, fixedFeeAmount: 1 }
    const response = { ...result }
    const explanation = buildPricingExplanation(response, inputs)
    inputs.paymentFeePercent = 5
    response.baseCost = 75
    expect(explanation.paymentFeePercent).toBe(3)
    expect(explanation.rows[0].value).toBe(50)
  })
  it('identifica lucro anterior aos tributos sem somar impostos duas vezes', () => {
    const explanation = buildPricingExplanation({ ...result, estimatedTaxes: 5 })
    expect(explanation.rows.at(-1).label).toBe('Lucro estimado antes dos tributos')
    expect(explanation.estimatedTaxes).toBe(5)
    expect(explanation.rows.reduce((sum, row) => sum + row.value, 0)).toBe(100)
  })
  it('usa percentuais sobre o preço de venda', () => {
    const explanation = buildPricingExplanation({ ...result, minimumSellingPrice: 200 })
    expect(explanation.rows[0].percent).toBe(25)
    expect(explanation.rows.some((row) => row.key === 'payment')).toBe(false)
  })
})
