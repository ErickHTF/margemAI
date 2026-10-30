import { DEFAULT_SUGGESTIONS, SCREEN_SUGGESTIONS } from '../constants/assistant'

export const getSuggestions = (screen) => {
  const specific = SCREEN_SUGGESTIONS[screen] || []
  return [...specific, ...DEFAULT_SUGGESTIONS.filter((item) => !specific.includes(item))].slice(0, 4)
}

export const STATUS = {
  OK: { tone: 'emerald', label: 'Tudo certo' },
  ATENCAO: { tone: 'amber', label: 'Atenção' },
  CRITICO: { tone: 'rose', label: 'Crítico' },
  SEM_DADOS: { tone: 'slate', label: 'Sem dados' }
}

export const statusOf = (status) => STATUS[status] || STATUS.SEM_DADOS

export const scoreTone = (score) => (score >= 80 ? 'emerald' : score >= 50 ? 'amber' : 'rose')

export const MEI_SEVERITY_TONE = { NORMAL: 'emerald', INFO: 'sky', WARNING: 'amber', CRITICAL: 'rose' }

export const formatPercent = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return `${number.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
}

export const clampPercent = (value) => Math.min(Math.max(Number(value) || 0, 0), 100)

// Partes do preço mínimo que somam o valor final, na ordem em que aparecem na barra.
export const priceComposition = (pricing) => {
  const parts = [
    { key: 'baseCost', label: 'Custo', value: Number(pricing?.baseCost) || 0 },
    { key: 'totalVariableCosts', label: 'Custos variáveis', value: Number(pricing?.totalVariableCosts) || 0 },
    { key: 'allocatedFixedCosts', label: 'Custos fixos', value: Number(pricing?.allocatedFixedCosts) || 0 },
    { key: 'estimatedTaxes', label: 'Impostos', value: Number(pricing?.estimatedTaxes) || 0 },
    { key: 'unitProfit', label: 'Lucro', value: Number(pricing?.unitProfit) || 0 }
  ].filter((part) => part.value > 0)
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  return parts.map((part) => ({ ...part, share: total > 0 ? (part.value / total) * 100 : 0 }))
}

export const maxAbs = (values = []) => values.reduce((max, value) => Math.max(max, Math.abs(Number(value) || 0)), 0)
