import { describe, it, expect } from 'vitest'
import { EMPTY_SALE_DRAFT, hasSaleDraft, similarSaleDraft } from './saleDraft'

describe('Rascunho e repetição de vendas', () => {
  it('reconhece preenchimento que precisa ser protegido, inclusive apenas observações ou taxa', () => {
    expect(hasSaleDraft(EMPTY_SALE_DRAFT)).toBe(false)
    const draft = { ...EMPTY_SALE_DRAFT, selectedProductId: 'produto-1', unitPrice: '20', notes: 'Entregar amanhã', customFee: '2', showCustomFee: true }
    expect(hasSaleDraft(draft)).toBe(true)
    expect(hasSaleDraft({ ...EMPTY_SALE_DRAFT, notes: 'Entregar amanhã' })).toBe(true)
    expect(hasSaleDraft({ ...EMPTY_SALE_DRAFT, customFee: '2', showCustomFee: true })).toBe(true)
  })
  it('protege o custo informado na venda e não o repete na próxima, pois vale só para aquela operação', () => {
    expect(hasSaleDraft({ ...EMPTY_SALE_DRAFT, unitCost: '12.50' })).toBe(true)
    const sale = { productId: 'produto-1', description: 'Bolo', quantity: 1, unitPrice: 20, unitCost: 12.5, paymentMethod: 'PIX', installments: 1 }
    expect(similarSaleDraft(sale).unitCost).toBe('')
  })
  it('prepara outra venda sem transportar observações, quantidade ou taxa avulsa', () => {
    const sale = { productId: 'produto-1', description: 'Bolo', quantity: 5, unitPrice: 20, paymentMethod: 'CREDITO_PARCELADO', installments: 3, notes: 'Entregar amanhã', customFeePercentage: 12 }
    expect(similarSaleDraft(sale)).toEqual({ ...EMPTY_SALE_DRAFT, selectedProductId: 'produto-1', customDescription: 'Bolo', unitPrice: '20', paymentMethod: 'CREDITO_PARCELADO', installments: 3 })
  })
  it('mantém a descrição avulsa para revisão sem selecionar um produto', () => {
    const draft = similarSaleDraft({ productId: null, description: 'Serviço', unitPrice: 50, paymentMethod: 'PIX', installments: 1 })
    expect(draft.isCustomItem).toBe(true)
    expect(draft.customDescription).toBe('Serviço')
    expect(draft.selectedProductId).toBe('')
  })
})
