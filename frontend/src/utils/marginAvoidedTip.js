import { subtract, toDecimal, toNumber, roundHalfUp } from './decimal'
import { getPillById } from '../data/sebraePills'

export const SEBRAE_AVOIDED_MARGIN_CONCEPT = {
  title: 'Decisão de Margem Evitada',
  summary: 'Você ajustou sua precificação a tempo e preservou a margem de contribuição do produto.',
  explanation: 'Conceder descontos sem cálculo prévio consome diretamente seu lucro líquido. Ao recuar de um desconto prejudicial ou preço inviável, você evitou pagar para trabalhar e manteve o caixa protegido para cobrir custos fixos.',
  tip: 'Dica SEBRAE: Antes de conceder descontos no balcão, ofereça opções à vista ou pequenos brindes em vez de reduzir o preço nominal.'
}

/**
 * Agrupa o desconto em faixas para compor a assinatura de contexto.
 *
 * @param {number|string} discount
 * @returns {string} Faixa de desconto
 */
export function getDiscountTier(discount) {
  const d = Math.max(0, Number(discount) || 0)
  if (d === 0) return '0'
  if (d <= 5) return '1-5'
  if (d <= 10) return '6-10'
  if (d <= 20) return '11-20'
  return '21+'
}

/**
 * Gera uma assinatura de contexto única baseada no produto/custo base e faixa de desconto.
 *
 * @param {Object} scenario
 * @returns {string}
 */
export function generateContextKey(scenario) {
  if (!scenario) return ''
  const entity = scenario.productId ? `product:${scenario.productId}` : `base:${scenario.baseCost ?? '0'}`
  const discount = scenario.discountPercentage ?? scenario.discountPercent ?? scenario.discount ?? 0
  const tier = getDiscountTier(discount)
  return `${entity}:tier:${tier}`
}

/**
 * Identifica se um cenário de precificação ou simulação de desconto é prejudicial à margem.
 * Critérios:
 *  - prejuízo líquido por unidade (discountedProfit < 0 ou unitProfit <= 0)
 *  - desconto acima do teto máximo permitido pela categoria (maxDiscountPercentage ou maxDiscountAllowed)
 *  - margem efetiva abaixo de um piso crítico (<= 0% ou erosão total do lucro)
 *  - viabilidade explicitamente falsa (viable === false)
 *
 * @param {Object} scenario
 * @returns {boolean}
 */
export function detectHarmfulMarginScenario(scenario) {
  if (!scenario || typeof scenario !== 'object') return false

  // Viabilidade marcada como falsa
  if (scenario.viable === false) {
    return true
  }

  // 1. Prejuízo líquido por unidade
  if (scenario.discountedProfit !== undefined && scenario.discountedProfit !== null) {
    const profitDec = toDecimal(scenario.discountedProfit)
    if (profitDec && profitDec.digits < 0n) {
      return true
    }
  } else if (scenario.unitProfit !== undefined && scenario.unitProfit !== null) {
    const unitProfitDec = toDecimal(scenario.unitProfit)
    if (unitProfitDec && unitProfitDec.digits <= 0n) {
      return true
    }
  }

  // 2. Desconto acima do teto máximo da categoria
  const discountVal = scenario.discountPercentage ?? scenario.discountPercent ?? scenario.discount
  const maxDiscountVal = scenario.maxDiscountPercentage ?? scenario.maxDiscountAllowed
  if (discountVal !== undefined && discountVal !== null && maxDiscountVal !== undefined && maxDiscountVal !== null) {
    const discountDec = toDecimal(discountVal)
    const maxDiscountDec = toDecimal(maxDiscountVal)
    if (discountDec && maxDiscountDec && subtract(discountDec, maxDiscountDec).digits > 0n) {
      return true
    }
  }

  // 3. Margem efetiva abaixo de um piso crítico (<= 0%)
  const marginVal = scenario.discountedMargin ?? scenario.effectiveMargin ?? scenario.grossMargin ?? scenario.margin
  if (marginVal !== undefined && marginVal !== null) {
    const marginDec = toDecimal(marginVal)
    if (marginDec && marginDec.digits <= 0n) {
      return true
    }
  }

  return false
}

/**
 * Avalia a transição entre um cenário anterior e o cenário atual.
 * Dispara a dica educativa de "Decisão de Margem Evitada" quando o usuário estava em um
 * cenário prejudicial e ajusta para um cenário saudável/viável com lucro positivo.
 *
 * @param {Object} previousScenario
 * @param {Object} currentScenario
 * @param {Set|Array|Object} [dismissedSignatures=new Set()]
 * @returns {Object|null}
 */
export function evaluateMarginDecisionTransition(previousScenario, currentScenario, dismissedSignatures = new Set()) {
  if (!previousScenario || !currentScenario) return null

  const wasHarmful = detectHarmfulMarginScenario(previousScenario)
  const isHarmful = detectHarmfulMarginScenario(currentScenario)

  // Deve haver transição de um cenário prejudicial para um saudável
  if (!wasHarmful || isHarmful) {
    return null
  }

  // O cenário atual não pode ser inviável
  if (currentScenario.viable === false) {
    return null
  }

  // O lucro atual deve ser estritamente positivo
  const currentProfitVal = currentScenario.discountedProfit ?? currentScenario.unitProfit
  if (currentProfitVal !== undefined && currentProfitVal !== null) {
    const currentProfitDec = toDecimal(currentProfitVal)
    if (!currentProfitDec || currentProfitDec.digits <= 0n) {
      return null
    }
  }

  const contextKey = generateContextKey(currentScenario)
  const entityKey = currentScenario.productId ? `product:${currentScenario.productId}` : `base:${currentScenario.baseCost ?? '0'}`

  const isDismissed = (key, entity, dismissed) => {
    if (!dismissed) return false
    if (dismissed instanceof Set) return dismissed.has(key) || dismissed.has(entity)
    if (Array.isArray(dismissed)) return dismissed.includes(key) || dismissed.includes(entity)
    if (typeof dismissed === 'object') return Boolean(dismissed[key] || dismissed[entity])
    return false
  }

  if (isDismissed(contextKey, entityKey, dismissedSignatures)) {
    return null
  }

  // Cálculos centesimais com decimal.js
  const prevProfitVal = previousScenario.discountedProfit ?? previousScenario.unitProfit ?? 0
  const currProfitValOrZero = currentProfitVal ?? 0
  const prevProfitDec = toDecimal(prevProfitVal) || { digits: 0n, scale: 2 }
  const currProfitDec = toDecimal(currProfitValOrZero) || { digits: 0n, scale: 2 }
  const profitDiffDec = subtract(currProfitDec, prevProfitDec)
  const avoidedLossPerUnit = toNumber(roundHalfUp(profitDiffDec, 2))

  const prevMarginVal = previousScenario.discountedMargin ?? previousScenario.effectiveMargin ?? previousScenario.grossMargin ?? previousScenario.margin ?? 0
  const currMarginVal = currentScenario.discountedMargin ?? currentScenario.effectiveMargin ?? currentScenario.grossMargin ?? currentScenario.margin ?? 0
  const prevMarginDec = toDecimal(prevMarginVal) || { digits: 0n, scale: 2 }
  const currMarginDec = toDecimal(currMarginVal) || { digits: 0n, scale: 2 }
  const marginDiffDec = subtract(currMarginDec, prevMarginDec)
  const marginRecoveredPoints = toNumber(roundHalfUp(marginDiffDec, 2))

  const pill = getPillById('margin-avoided') || getPillById('discount-danger')

  return {
    triggered: true,
    contextKey,
    avoidedLossPerUnit,
    marginRecoveredPoints,
    concept: SEBRAE_AVOIDED_MARGIN_CONCEPT,
    pill
  }
}
