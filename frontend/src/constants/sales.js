export const PAYMENT_METHODS = [
  {
    key: 'DINHEIRO',
    label: 'Dinheiro',
    defaultFee: 0.0,
    color: 'emerald',
    badge: 'Taxa 0%'
  },
  {
    key: 'PIX',
    label: 'Pix',
    defaultFee: 0.0,
    color: 'teal',
    badge: 'Taxa 0%'
  },
  {
    key: 'DEBITO',
    label: 'Débito',
    defaultFee: 1.5,
    color: 'blue',
    badge: 'Taxa 1.5%'
  },
  {
    key: 'CREDITO_A_VISTA',
    label: 'Crédito à Vista',
    defaultFee: 3.2,
    color: 'indigo',
    badge: 'Taxa 3.2%'
  },
  {
    key: 'CREDITO_PARCELADO',
    label: 'Crédito Parcelado',
    defaultFee: 4.5,
    color: 'purple',
    badge: 'A partir de 4.5%'
  }
]

export const getPaymentMethodLabel = (key) => {
  const method = PAYMENT_METHODS.find((m) => m.key === key)
  return method ? method.label : key
}

export const calculateEstimatedFee = (quantity, unitPrice, paymentMethod, installments = 1, customFee = null) => {
  const qty = parseFloat(quantity) || 0
  const price = parseFloat(unitPrice) || 0
  const gross = qty * price

  if (gross <= 0) {
    return { gross: 0, feePercent: 0, feeAmount: 0, netAmount: 0 }
  }

  let feePercent
  if (customFee !== null && customFee !== '' && !isNaN(customFee)) {
    feePercent = parseFloat(customFee)
  } else if (paymentMethod === 'CREDITO_PARCELADO') {
    const inst = parseInt(installments, 10) || 1
    feePercent = 4.5 + Math.max(0, inst - 1) * 1.0
  } else {
    const found = PAYMENT_METHODS.find((m) => m.key === paymentMethod)
    feePercent = found ? found.defaultFee : 0
  }

  const feeAmount = (gross * feePercent) / 100
  const netAmount = gross - feeAmount

  return {
    gross,
    feePercent,
    feeAmount,
    netAmount
  }
}
