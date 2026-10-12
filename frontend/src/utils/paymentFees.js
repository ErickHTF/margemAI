import { PAYMENT_METHODS } from '../constants/sales'
import { add, divideByPowerOfTen, multiply, roundHalfUp, roundMoney, subtract, toDecimal, toNumber } from './decimal'

// Fonte única para taxas de pagamento no frontend.
// Os valores vêm da matriz configurada em Configurações › Taxas de Pagamento
// (GET /settings/financial/payment-methods). Os padrões abaixo são apenas fallback,
// espelhando PaymentFeeCalculator no backend, para quando a matriz não puder ser carregada.

const INSTALLMENT_BASE_FEE = 4.5
const INSTALLMENT_STEP_FEE = 1.0

const ZERO = { digits: 0n, scale: 2 }
const money = (value) => roundHalfUp(toDecimal(value) || ZERO)

const normalizeInstallments = (paymentMethod, installments) => {
  if (paymentMethod !== 'CREDITO_PARCELADO') return 1
  const parsed = parseInt(installments, 10)
  return Number.isNaN(parsed) || parsed < 2 ? 2 : parsed
}

export const getDefaultFeePercent = (paymentMethod, installments = 1) => {
  if (paymentMethod === 'CREDITO_PARCELADO') {
    const inst = normalizeInstallments(paymentMethod, installments)
    return roundMoney(INSTALLMENT_BASE_FEE + (inst - 1) * INSTALLMENT_STEP_FEE)
  }
  const found = PAYMENT_METHODS.find((m) => m.key === paymentMethod)
  return found ? found.defaultFee : 0
}

/**
 * Resolve a taxa efetiva de uma forma de pagamento.
 * Mesma regra do backend: configuração ativa da matriz → senão, padrão recomendado.
 * @returns {{ mdrFeePercent: number, fixedFeeAmount: number, settlementDays: number|null, source: 'configured'|'default' }}
 */
export const resolvePaymentFee = (matrix, paymentMethod, installments = 1) => {
  const inst = normalizeInstallments(paymentMethod, installments)
  const config = (matrix || []).find(
    (c) => c.paymentMethod === paymentMethod && (c.installments || 1) === inst
  )

  if (config && config.isActive === true) {
    return {
      mdrFeePercent: roundMoney(config.mdrFeePercent || 0),
      fixedFeeAmount: roundMoney(config.fixedFeeAmount || 0),
      settlementDays: config.settlementDays ?? null,
      source: 'configured'
    }
  }

  return {
    mdrFeePercent: getDefaultFeePercent(paymentMethod, inst),
    fixedFeeAmount: 0,
    settlementDays: null,
    source: 'default'
  }
}

/**
 * Prévia do valor líquido de uma venda, com o mesmo arredondamento do backend.
 * Taxa personalizada (avulsa) substitui o percentual e não aplica tarifa fixa.
 */
export const calculateSaleFee = ({ quantity, unitPrice, fee, customFeePercent = null }) => {
  const qty = toDecimal(quantity) || ZERO
  const price = toDecimal(unitPrice) || ZERO
  const gross = roundHalfUp(multiply(qty, price))

  if (gross.digits <= 0n) {
    return { gross: 0, feePercent: 0, fixedFee: 0, feeAmount: 0, netAmount: 0 }
  }

  const hasCustomFee = customFeePercent !== null && customFeePercent !== '' && toDecimal(customFeePercent) !== null
  const feePercent = money(hasCustomFee ? customFeePercent : fee?.mdrFeePercent)
  const fixedFee = hasCustomFee ? ZERO : money(fee?.fixedFeeAmount)

  const percentageFee = roundHalfUp(divideByPowerOfTen(multiply(gross, feePercent), 2))
  const feeAmount = roundHalfUp(add(percentageFee, fixedFee))
  const netAmount = roundHalfUp(subtract(gross, feeAmount))

  return {
    gross: toNumber(gross),
    feePercent: toNumber(feePercent),
    fixedFee: toNumber(fixedFee),
    feeAmount: toNumber(feeAmount),
    netAmount: toNumber(netAmount)
  }
}

export const formatFeePercent = (value) =>
  `${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`
