export const EMPTY_SALE_DRAFT = {
  selectedProductId: '', customDescription: '', isCustomItem: false,
  quantity: 1, unitPrice: '', paymentMethod: 'PIX', installments: 1,
  customFee: '', showCustomFee: false, notes: ''
}
export function hasSaleDraft(draft) {
  return Object.keys(EMPTY_SALE_DRAFT).some((key) => draft[key] !== EMPTY_SALE_DRAFT[key])
}
export function similarSaleDraft(sale) {
  return { ...EMPTY_SALE_DRAFT, selectedProductId: sale.productId || '', customDescription: sale.description,
    isCustomItem: !sale.productId, unitPrice: String(sale.unitPrice), paymentMethod: sale.paymentMethod, installments: sale.installments }
}
