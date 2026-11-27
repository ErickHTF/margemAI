import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SalesManager from './SalesManager'

vi.mock('../hooks/useSales', () => ({
  default: () => ({
    salesData: {
      sales: {
        content: [{
          id: 'venda-antiga', description: 'Serviço avulso', quantity: 2,
          grossAmount: 100, netAmount: 100, feeAmount: 0, feePercentage: 0,
          operationCost: 30, costEstimated: true, paymentMethod: 'PIX'
        }]
      }
    },
    loading: false
  })
}))

vi.mock('../hooks/usePaymentFees', () => ({
  default: () => ({ getFee: () => ({ mdrFeePercent: 0, fixedFeeAmount: 0 }) })
}))

describe('Histórico de custos de vendas', () => {
  it('apresenta o custo da operação e identifica a estimativa das vendas antigas', () => {
    const markup = renderToStaticMarkup(<SalesManager />)
    expect(markup).toContain('Custo da operação')
    expect(markup).toMatch(/30,00/)
    expect(markup).toContain('Estimado')
    expect(markup).toContain('custo estimado a partir do cadastro disponível')
  })

  it('oferece custo unitário não negativo e explica o fallback manual sem duplicação', () => {
    const markup = renderToStaticMarkup(<SalesManager />)
    expect(markup).toContain('for="sale-unit-cost"')
    const unitCostInput = markup.match(/<input id="sale-unit-cost"[^>]*>/)?.[0]
    expect(unitCostInput).toContain('type="number"')
    expect(unitCostInput).toContain('min="0"')
    expect(unitCostInput).toContain('step="0.01"')
    expect(markup).toContain('usa os custos vinculados ao produto; sem valor vinculado, usa o custo base manual')
    expect(markup).toContain('substitui o custo do catálogo')
  })
})
