import { describe, it, expect } from 'vitest'
import { multiply, roundHalfUp, roundMoney, subtract, toDecimal, toNumber } from './decimal'

describe('decimal', () => {
  it.each([
    ['513.045', 513.05],
    ['1950.585', 1950.59],
    ['8.155', 8.16],
    ['-2.345', -2.35],
    ['2.344', 2.34],
    [1.005, 1.01],
    ['7', 7]
  ])('arredonda %s em HALF_UP como o BigDecimal', (value, expected) => {
    expect(roundMoney(value)).toBe(expected)
  })

  it('multiplica sem erro de ponto flutuante', () => {
    expect(toNumber(roundHalfUp(multiply(toDecimal('7.145'), toDecimal('273.00')), 3))).toBe(1950.585)
  })

  it('subtrai valores com escalas diferentes', () => {
    expect(toNumber(subtract(toDecimal('100'), toDecimal('0.015')))).toBe(99.985)
  })

  it.each([['abc'], [''], ['1,5'], [null], [undefined], [Number.NaN]])('rejeita %s como número', (value) => {
    expect(toDecimal(value)).toBeNull()
  })

  it('aceita notação científica', () => {
    expect(roundMoney(1e-7)).toBe(0)
    expect(roundMoney('1.5e2')).toBe(150)
  })
})
