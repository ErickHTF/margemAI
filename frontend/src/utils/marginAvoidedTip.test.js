import { describe, it, expect } from 'vitest'
import {
  detectHarmfulMarginScenario,
  evaluateMarginDecisionTransition,
  generateContextKey,
  getDiscountTier,
  SEBRAE_AVOIDED_MARGIN_CONCEPT
} from './marginAvoidedTip'

describe('marginAvoidedTip', () => {
  describe('detectHarmfulMarginScenario', () => {
    it('retorna false para cenários nulos, indefinidos ou vazios', () => {
      expect(detectHarmfulMarginScenario(null)).toBe(false)
      expect(detectHarmfulMarginScenario(undefined)).toBe(false)
      expect(detectHarmfulMarginScenario({})).toBe(false)
    })

    it('identifica prejuízo líquido quando discountedProfit é negativo', () => {
      expect(detectHarmfulMarginScenario({ discountedProfit: -0.01 })).toBe(true)
      expect(detectHarmfulMarginScenario({ discountedProfit: '-5.50' })).toBe(true)
      expect(detectHarmfulMarginScenario({ discountedProfit: 12.00 })).toBe(false)
    })

    it('identifica prejuízo unitário quando unitProfit é menor ou igual a zero', () => {
      expect(detectHarmfulMarginScenario({ unitProfit: 0 })).toBe(true)
      expect(detectHarmfulMarginScenario({ unitProfit: -2.30 })).toBe(true)
      expect(detectHarmfulMarginScenario({ unitProfit: '0.00' })).toBe(true)
      expect(detectHarmfulMarginScenario({ unitProfit: 1.50 })).toBe(false)
    })

    it('identifica inviabilidade explícita quando viable é false', () => {
      expect(detectHarmfulMarginScenario({ viable: false, discountedProfit: 5 })).toBe(true)
      expect(detectHarmfulMarginScenario({ viable: true, discountedProfit: 5 })).toBe(false)
    })

    it('identifica desconto acima do teto permitido pela categoria', () => {
      // Usando maxDiscountPercentage
      expect(
        detectHarmfulMarginScenario({
          discountPercentage: 25,
          maxDiscountPercentage: 20
        })
      ).toBe(true)

      // Usando maxDiscountAllowed
      expect(
        detectHarmfulMarginScenario({
          discountPercent: '30.00',
          maxDiscountAllowed: '15.00'
        })
      ).toBe(true)

      // Desconto dentro do teto
      expect(
        detectHarmfulMarginScenario({
          discountPercentage: 15,
          maxDiscountPercentage: 20
        })
      ).toBe(false)
    })

    it('identifica margem efetiva abaixo do piso crítico (menor ou igual a zero)', () => {
      expect(detectHarmfulMarginScenario({ discountedMargin: 0 })).toBe(true)
      expect(detectHarmfulMarginScenario({ discountedMargin: -4.5 })).toBe(true)
      expect(detectHarmfulMarginScenario({ effectiveMargin: -1.2 })).toBe(true)
      expect(detectHarmfulMarginScenario({ discountedMargin: 12.5 })).toBe(false)
    })
  })

  describe('getDiscountTier e generateContextKey', () => {
    it('classifica corretamente as faixas de desconto', () => {
      expect(getDiscountTier(0)).toBe('0')
      expect(getDiscountTier(3)).toBe('1-5')
      expect(getDiscountTier(8)).toBe('6-10')
      expect(getDiscountTier(15)).toBe('11-20')
      expect(getDiscountTier(30)).toBe('21+')
    })

    it('gera assinatura de contexto baseada em produto e faixa de desconto', () => {
      const keyProduct = generateContextKey({ productId: 'prod-123', discountPercentage: 10 })
      expect(keyProduct).toBe('product:prod-123:tier:6-10')

      const keyBaseCost = generateContextKey({ baseCost: '75.00', discountPercentage: 25 })
      expect(keyBaseCost).toBe('base:75.00:tier:21+')

      expect(generateContextKey(null)).toBe('')
    })
  })

  describe('evaluateMarginDecisionTransition', () => {
    const harmfulScenario = {
      productId: 'prod-abc',
      baseCost: '50.00',
      discountPercentage: 30,
      discountedProfit: -5.00,
      discountedMargin: -8.00,
      viable: false
    }

    const healthyScenario = {
      productId: 'prod-abc',
      baseCost: '50.00',
      discountPercentage: 5,
      discountedProfit: 12.50,
      discountedMargin: 16.50,
      viable: true
    }

    it('dispara dica educativa quando transita de cenário prejudicial para saudável e viável', () => {
      const result = evaluateMarginDecisionTransition(harmfulScenario, healthyScenario)

      expect(result).not.toBeNull()
      expect(result.triggered).toBe(true)
      expect(result.contextKey).toBe('product:prod-abc:tier:1-5')
      expect(result.concept).toEqual(SEBRAE_AVOIDED_MARGIN_CONCEPT)
      expect(result.pill).toBeDefined()
      expect(result.pill.id).toMatch(/margin-avoided|discount-danger/)
    })

    it('calcula com precisão centesimal a perda evitada em R$ e a margem recuperada em pontos percentuais', () => {
      // Cenário prejudicial: lucro -5.25, margem -7.50%
      const harmful = {
        baseCost: '60.00',
        discountedProfit: '-5.25',
        discountedMargin: '-7.50',
        viable: false
      }
      // Cenário corrigido: lucro +14.70, margem +18.25%
      const healthy = {
        baseCost: '60.00',
        discountPercentage: 5,
        discountedProfit: '14.70',
        discountedMargin: '18.25',
        viable: true
      }

      const result = evaluateMarginDecisionTransition(harmful, healthy)

      expect(result).not.toBeNull()
      // 14.70 - (-5.25) = 19.95
      expect(result.avoidedLossPerUnit).toBe(19.95)
      // 18.25 - (-7.50) = 25.75 p.p.
      expect(result.marginRecoveredPoints).toBe(25.75)
    })

    it('NÃO dispara quando o cenário inicial já era saudável', () => {
      const initialHealthy = {
        productId: 'prod-abc',
        discountPercentage: 10,
        discountedProfit: 8.00,
        discountedMargin: 10.00,
        viable: true
      }

      const result = evaluateMarginDecisionTransition(initialHealthy, healthyScenario)
      expect(result).toBeNull()
    })

    it('NÃO dispara quando transita de prejudicial para outro prejudicial', () => {
      const worseHarmful = {
        ...harmfulScenario,
        discountPercentage: 40,
        discountedProfit: -12.00,
        discountedMargin: -20.00
      }

      const result = evaluateMarginDecisionTransition(harmfulScenario, worseHarmful)
      expect(result).toBeNull()
    })

    it('NÃO dispara quando transita de saudável para prejudicial', () => {
      const result = evaluateMarginDecisionTransition(healthyScenario, harmfulScenario)
      expect(result).toBeNull()
    })

    it('NÃO dispara quando o cenário atual tem lucro zero ou negativo', () => {
      const zeroProfitScenario = {
        ...healthyScenario,
        discountedProfit: 0,
        viable: true
      }

      const result = evaluateMarginDecisionTransition(harmfulScenario, zeroProfitScenario)
      expect(result).toBeNull()
    })

    it('NÃO dispara quando o cenário atual é inviável', () => {
      const inviableScenario = {
        ...healthyScenario,
        viable: false
      }

      const result = evaluateMarginDecisionTransition(harmfulScenario, inviableScenario)
      expect(result).toBeNull()
    })

    it('bloqueia repetição no mesmo contexto após dispensa e reativa ao mudar de produto ou custo base', () => {
      const initialResult = evaluateMarginDecisionTransition(harmfulScenario, healthyScenario)
      expect(initialResult).not.toBeNull()

      // Usuário dispensou a dica educativa
      const dismissedSignatures = new Set([initialResult.contextKey])

      // Repetição no mesmo contexto (mesmo produto e mesma faixa)
      const repeatedResult = evaluateMarginDecisionTransition(
        harmfulScenario,
        healthyScenario,
        dismissedSignatures
      )
      expect(repeatedResult).toBeNull()

      // Reativação ao mudar de produto
      const otherProductHarmful = {
        ...harmfulScenario,
        productId: 'prod-xyz'
      }
      const otherProductHealthy = {
        ...healthyScenario,
        productId: 'prod-xyz'
      }

      const otherProductResult = evaluateMarginDecisionTransition(
        otherProductHarmful,
        otherProductHealthy,
        dismissedSignatures
      )
      expect(otherProductResult).not.toBeNull()
      expect(otherProductResult.triggered).toBe(true)
      expect(otherProductResult.contextKey).toBe('product:prod-xyz:tier:1-5')

      // Reativação ao mudar de custo base manual
      const manualCostHarmful = {
        productId: null,
        baseCost: '120.00',
        discountPercentage: 35,
        discountedProfit: -15.00,
        discountedMargin: -12.00,
        viable: false
      }
      const manualCostHealthy = {
        productId: null,
        baseCost: '120.00',
        discountPercentage: 5,
        discountedProfit: 25.00,
        discountedMargin: 18.00,
        viable: true
      }

      const manualCostResult = evaluateMarginDecisionTransition(
        manualCostHarmful,
        manualCostHealthy,
        dismissedSignatures
      )
      expect(manualCostResult).not.toBeNull()
      expect(manualCostResult.triggered).toBe(true)
      expect(manualCostResult.contextKey).toBe('base:120.00:tier:1-5')
    })
  })
})
