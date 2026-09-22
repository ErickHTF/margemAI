import { describe, it, expect } from 'vitest'
import {
  buildSebraeExplanation,
  SEBRAE_GOLDEN_RULE,
  SEBRAE_PERCENT_BASIS
} from './sebraeMethod'

describe('sebraeMethod', () => {
  it('should reproduce the canonical SEBRAE example (50 / 10% / 15% / 25% -> 100)', () => {
    const explanation = buildSebraeExplanation({
      baseCost: 50,
      fixedPercent: 10,
      variablePercent: 15,
      desiredMargin: 25
    })

    expect(explanation.sumPercentages).toBe(50)
    expect(explanation.markup).toBe(2)
    expect(explanation.sellingPrice).toBe(100)
    expect(explanation.goldenRuleRespected).toBe(true)
  })

  it('should explain that percentages are applied over the selling price', () => {
    expect(SEBRAE_PERCENT_BASIS).toContain('sobre o preço de venda')
    expect(SEBRAE_PERCENT_BASIS).toContain('não sobre o custo')
  })

  it('should expose the simplified formula and the golden rule', () => {
    const explanation = buildSebraeExplanation({ baseCost: 50, desiredMargin: 25 })

    expect(explanation.formula).toContain('Preço de venda')
    expect(explanation.formula).toContain('100')
    expect(SEBRAE_GOLDEN_RULE).toContain('nunca pode ser igual ou superior a 100%')
  })

  it('should include taxes in the percentage sum', () => {
    const explanation = buildSebraeExplanation({
      baseCost: 50,
      fixedPercent: 10,
      variablePercent: 15,
      desiredMargin: 25,
      taxPercent: 5
    })

    expect(explanation.sumPercentages).toBe(55)
    expect(explanation.sellingPrice).toBe(111.11)
    expect(explanation.markup).toBe(2.22)
  })

  it('should break the price down proportionally to the percentages', () => {
    const explanation = buildSebraeExplanation({
      baseCost: 50,
      fixedPercent: 10,
      variablePercent: 15,
      desiredMargin: 25
    })

    const fixed = explanation.breakdown.find((item) => item.key === 'fixed')
    const margin = explanation.breakdown.find((item) => item.key === 'margin')

    expect(fixed.value).toBe(10)
    expect(margin.value).toBe(25)

    const total = explanation.breakdown.reduce((sum, item) => sum + item.value, 0)
    expect(total).toBe(100)
  })

  it('should flag when the golden rule is violated (sum >= 100%)', () => {
    const explanation = buildSebraeExplanation({
      baseCost: 50,
      fixedPercent: 40,
      variablePercent: 30,
      desiredMargin: 30
    })

    expect(explanation.sumPercentages).toBe(100)
    expect(explanation.goldenRuleRespected).toBe(false)
    expect(explanation.sellingPrice).toBeNull()
    expect(explanation.markup).toBeNull()
    expect(explanation.breakdown).toEqual([])
  })

  it('should tolerate missing or invalid inputs', () => {
    const explanation = buildSebraeExplanation()

    expect(explanation.sumPercentages).toBe(0)
    expect(explanation.goldenRuleRespected).toBe(true)
    expect(explanation.sellingPrice).toBe(0)
  })
})
