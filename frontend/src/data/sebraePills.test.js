import { describe, it, expect } from 'vitest'
import { SEBRAE_PILLS, getPillById, getPillsByCategory } from './sebraePills'

describe('sebraePills', () => {
  it('deve conter as 4 pílulas educativas essenciais do SEBRAE', () => {
    expect(SEBRAE_PILLS.length).toBeGreaterThanOrEqual(4)
    SEBRAE_PILLS.forEach((pill) => {
      expect(pill).toHaveProperty('id')
      expect(pill).toHaveProperty('category')
      expect(pill).toHaveProperty('title')
      expect(pill).toHaveProperty('summary')
      expect(pill).toHaveProperty('content')
      expect(pill).toHaveProperty('tip')
    })
  })

  it('deve encontrar pílula por ID', () => {
    const pill = getPillById('markup-divisor')
    expect(pill).toBeDefined()
    expect(pill.title).toContain('Markup Divisor')
  })

  it('deve filtrar pílulas por categoria', () => {
    const pricingPills = getPillsByCategory('pricing')
    expect(pricingPills.length).toBeGreaterThan(0)
    expect(pricingPills.every((p) => p.category === 'pricing')).toBe(true)
  })
})
