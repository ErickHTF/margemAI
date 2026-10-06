import { describe, it, expect } from 'vitest'
import {
  SEBRAE_PILLS,
  getPillById,
  getPillsByCategory,
  selectContextualPill
} from './sebraePills'

describe('sebraePills', () => {
  it('deve conter as 5 pílulas educativas essenciais do SEBRAE com atributos obrigatórios', () => {
    expect(SEBRAE_PILLS.length).toBeGreaterThanOrEqual(5)
    SEBRAE_PILLS.forEach((pill) => {
      expect(pill).toHaveProperty('id')
      expect(pill).toHaveProperty('category')
      expect(pill).toHaveProperty('categoryLabel')
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

    const discountPill = getPillById('discount-danger')
    expect(discountPill).toBeDefined()
    expect(discountPill.category).toBe('discount')
  })

  it('deve filtrar pílulas por categoria', () => {
    const pricingPills = getPillsByCategory('pricing')
    expect(pricingPills.length).toBeGreaterThan(0)
    expect(pricingPills.every((p) => p.category === 'pricing')).toBe(true)
  })

  describe('selectContextualPill', () => {
    it('deve selecionar pílula de desconto ao simular ou alterar desconto', () => {
      const pillByAction = selectContextualPill({ action: 'discount' })
      expect(pillByAction.id).toBe('discount-danger')

      const pillByActiveDiscount = selectContextualPill({ discountActive: true })
      expect(pillByActiveDiscount.id).toBe('discount-danger')
    })

    it('deve selecionar pílula de taxas de maquininha ao escolher cartão/parcelamento ou custos variáveis elevados', () => {
      const pillByCard = selectContextualPill({ paymentMethod: 'CREDIT_CARD' })
      expect(pillByCard.id).toBe('card-fees')

      const pillByInstallments = selectContextualPill({ paymentMethod: 'INSTALLMENTS' })
      expect(pillByInstallments.id).toBe('card-fees')

      const pillByActionPayment = selectContextualPill({ action: 'payment' })
      expect(pillByActionPayment.id).toBe('card-fees')

      const pillByHighVarCost = selectContextualPill({ variableCostPercent: 18 })
      expect(pillByHighVarCost.id).toBe('card-fees')
    })

    it('deve selecionar pílula de capital de giro em vendas a prazo ou ação working_capital', () => {
      const pillByTerm = selectContextualPill({ isTermSale: true })
      expect(pillByTerm.id).toBe('working-capital')

      const pillByWorkingCapital = selectContextualPill({ action: 'working_capital' })
      expect(pillByWorkingCapital.id).toBe('working-capital')
    })

    it('deve selecionar pílula de pró-labore quando custos fixos forem altos ou ação fixed_costs', () => {
      const pillByHighFixed = selectContextualPill({ fixedCostPercent: 30 })
      expect(pillByHighFixed.id).toBe('pro-labore')

      const pillByFixedCostsAction = selectContextualPill({ action: 'fixed_costs' })
      expect(pillByFixedCostsAction.id).toBe('pro-labore')
    })

    it('deve selecionar pílula de markup divisor para alteração padrão de custos, margem ou markup', () => {
      const pillDefault = selectContextualPill()
      expect(pillDefault.id).toBe('markup-divisor')

      const pillPricing = selectContextualPill({ action: 'pricing', fixedCostPercent: 10, variableCostPercent: 5 })
      expect(pillPricing.id).toBe('markup-divisor')
    })
  })
})
