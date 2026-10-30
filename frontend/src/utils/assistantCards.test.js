import { describe, it, expect } from 'vitest'
import { getSuggestions, statusOf, scoreTone, formatPercent, priceComposition, maxAbs } from './assistantCards'
import { DEFAULT_SUGGESTIONS, SCREEN_SUGGESTIONS } from '../constants/assistant'

describe('getSuggestions', () => {
  it('mostra primeiro as perguntas da tela atual e completa com as gerais, sem repetir', () => {
    const suggestions = getSuggestions('pricing')

    expect(suggestions).toHaveLength(4)
    expect(suggestions.slice(0, 2)).toEqual(SCREEN_SUGGESTIONS.pricing)
    expect(new Set(suggestions).size).toBe(4)
  })

  it('usa as perguntas gerais em telas sem sugestões próprias', () => {
    expect(getSuggestions('tela-desconhecida')).toEqual(DEFAULT_SUGGESTIONS.slice(0, 4))
  })
})

describe('status e nota', () => {
  it.each([
    ['OK', 'emerald'], ['ATENCAO', 'amber'], ['CRITICO', 'rose'], ['QUALQUER', 'slate']
  ])('status %s usa o tom %s', (status, tone) => {
    expect(statusOf(status).tone).toBe(tone)
  })

  it.each([[92, 'emerald'], [63, 'amber'], [20, 'rose']])('nota %i usa o tom %s', (score, tone) => {
    expect(scoreTone(score)).toBe(tone)
  })
})

describe('formatPercent', () => {
  it('formata em pt-BR e trata valores ausentes', () => {
    expect(formatPercent(2.8)).toBe('2,8%')
    expect(formatPercent('41.60')).toBe('41,6%')
    expect(formatPercent(undefined)).toBe('—')
  })
})

describe('priceComposition', () => {
  it('divide o preço mínimo nas partes que o compõem, ignorando as zeradas', () => {
    const parts = priceComposition({ baseCost: 9, totalVariableCosts: 2.6, allocatedFixedCosts: 0, estimatedTaxes: 1.4, unitProfit: 7 })

    expect(parts.map((part) => part.key)).toEqual(['baseCost', 'totalVariableCosts', 'estimatedTaxes', 'unitProfit'])
    expect(parts[0].share).toBeCloseTo(45, 5)
    expect(parts.reduce((sum, part) => sum + part.share, 0)).toBeCloseTo(100, 5)
  })
})

describe('maxAbs', () => {
  it('usa o maior valor absoluto para a escala de gráficos com negativos', () => {
    expect(maxAbs([1200, -1850.5, 300])).toBe(1850.5)
    expect(maxAbs([])).toBe(0)
  })
})
