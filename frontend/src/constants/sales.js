export const PAYMENT_METHODS = [
  {
    key: 'DINHEIRO',
    label: 'Dinheiro',
    defaultFee: 0.0,
    color: 'emerald'
  },
  {
    key: 'PIX',
    label: 'Pix',
    defaultFee: 0.0,
    color: 'teal'
  },
  {
    key: 'DEBITO',
    label: 'Débito',
    defaultFee: 1.5,
    color: 'blue'
  },
  {
    key: 'CREDITO_A_VISTA',
    label: 'Crédito à Vista',
    defaultFee: 3.2,
    color: 'indigo'
  },
  {
    key: 'CREDITO_PARCELADO',
    label: 'Crédito Parcelado',
    defaultFee: 4.5,
    color: 'purple'
  }
]

export const getPaymentMethodLabel = (key) => {
  const method = PAYMENT_METHODS.find((m) => m.key === key)
  return method ? method.label : key
}
