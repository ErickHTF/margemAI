// Snapshot independente do formulário: apenas o resultado da última requisição aprovada.
export function buildPricingExplanation(result, { paymentFeePercent = 0, fixedFeeAmount = 0, useConfiguredFee = false } = {}) {
  const price = Number(result.minimumSellingPrice)
  const percentOfPrice = (value) => price > 0 ? Number(value) / price * 100 : 0
  const variableTotal = Number(result.totalVariableCosts)
  const paymentFee = useConfiguredFee ? Math.round(price * Number(paymentFeePercent)) / 100 : 0
  const rows = [
    { key: 'base', label: 'Custo base de aquisição ou produção', value: Number(result.baseCost) },
    { key: 'fixed', label: 'Despesas fixas alocadas', value: Number(result.allocatedFixedCosts) },
    { key: 'variable', label: 'Despesas variáveis', value: Math.round((variableTotal - paymentFee) * 100) / 100 },
    ...(useConfiguredFee ? [{ key: 'payment', label: 'Taxa de pagamento percentual (MDR)', value: paymentFee }] : []),
    { key: 'profit', label: Number(result.estimatedTaxes) > 0 ? 'Lucro estimado antes dos tributos' : 'Lucro estimado', value: Number(result.unitProfit) }
  ].map((row) => ({ ...row, percent: percentOfPrice(row.value) }))
  return { price, rows, estimatedTaxes: Number(result.estimatedTaxes || 0), useConfiguredFee, fixedFeeAmount: Number(fixedFeeAmount), paymentFeePercent: Number(paymentFeePercent) }
}
