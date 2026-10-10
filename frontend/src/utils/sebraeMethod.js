const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100

export const SEBRAE_GOLDEN_RULE =
  'A soma dos percentuais (custos fixos + variáveis + tributos + margem) nunca pode ser igual ou superior a 100%.'

export const SEBRAE_FORMULA =
  'Preço de venda = Custo base ÷ (1 − soma dos percentuais ÷ 100)'

export const SEBRAE_MARKUP_FORMULA =
  'Markup = 100 ÷ (100 − soma dos percentuais)'

export const SEBRAE_PERCENT_BASIS =
  'Todos os percentuais incidem sobre o preço de venda, e não sobre o custo de aquisição.'

export const buildSebraeExplanation = ({
  baseCost = 0,
  fixedPercent = 0,
  variablePercent = 0,
  desiredMargin = 0,
  taxPercent = 0
} = {}) => {
  const cost = Number(baseCost) || 0
  const fixed = Number(fixedPercent) || 0
  const variable = Number(variablePercent) || 0
  const margin = Number(desiredMargin) || 0
  const tax = Number(taxPercent) || 0

  const sumPercentages = round2(fixed + variable + margin + tax)
  const goldenRuleRespected = sumPercentages < 100
  const markup = goldenRuleRespected ? round2(100 / (100 - sumPercentages)) : null
  const sellingPrice = goldenRuleRespected
    ? round2((cost * 100) / (100 - sumPercentages))
    : null

  const breakdown = goldenRuleRespected
    ? [
        { key: 'baseCost', label: 'Custo base', percent: null, value: round2(cost) },
        { key: 'fixed', label: 'Custos fixos', percent: fixed, value: round2((sellingPrice * fixed) / 100) },
        { key: 'variable', label: 'Custos variáveis e taxas', percent: variable, value: round2((sellingPrice * variable) / 100) },
        { key: 'tax', label: 'Tributos', percent: tax, value: round2((sellingPrice * tax) / 100) },
        { key: 'margin', label: 'Margem de lucro', percent: margin, value: round2((sellingPrice * margin) / 100) }
      ]
    : []

  return {
    baseCost: cost,
    fixedPercent: fixed,
    variablePercent: variable,
    desiredMargin: margin,
    taxPercent: tax,
    sumPercentages,
    goldenRuleRespected,
    markup,
    sellingPrice,
    breakdown,
    formula: SEBRAE_FORMULA,
    markupFormula: SEBRAE_MARKUP_FORMULA
  }
}

// Custo variável unitário do ponto de equilíbrio (SEBRAE): tudo que acompanha cada venda —
// custo base + despesas variáveis/taxas + tributos sobre a venda. Custos fixos ficam de fora.
export const breakEvenUnitVariableCost = (pricingResult) => {
  if (!pricingResult) return 0
  const cents =
    Math.round(Number(pricingResult.baseCost || 0) * 100) +
    Math.round(Number(pricingResult.totalVariableCosts || 0) * 100) +
    Math.round(Number(pricingResult.estimatedTaxes || 0) * 100)
  return cents / 100
}
