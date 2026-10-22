import { toDecimal, roundHalfUp, toNumber, roundMoney } from './decimal'

const pow10 = (exponent) => 10n ** BigInt(exponent)

export const divideByIntegerHalfUp = (value, n, scale = 2) => {
  const dec = toDecimal(value)
  if (!dec || n <= 0) return 0
  const extra = pow10(scale + 6)
  const factor = pow10(dec.scale)
  const bigNumerator = (dec.digits * extra) / factor
  const bigQuotient = bigNumerator / BigInt(n)
  const intermediate = { digits: bigQuotient, scale: scale + 6 }
  return toNumber(roundHalfUp(intermediate, scale))
}

export const formatDateISO = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const addDays = (baseDateStr, days) => {
  const [y, m, d] = (baseDateStr || formatDateISO(new Date())).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + Number(days))
  return formatDateISO(date)
}

export const isInstallmentOverdue = (installment, referenceDate = new Date()) => {
  if (!installment) return false
  if (installment.status === 'RECEIVED') return false
  const refStr = typeof referenceDate === 'string' ? referenceDate : formatDateISO(referenceDate)
  return Boolean(installment.dueDate && installment.dueDate < refStr)
}

export const getEffectiveInstallmentStatus = (installment, referenceDate = new Date()) => {
  if (!installment) return 'PENDING'
  if (installment.status === 'RECEIVED') return 'RECEIVED'
  if (isInstallmentOverdue(installment, referenceDate)) return 'OVERDUE'
  return installment.status || 'PENDING'
}

export const splitIntoInstallments = ({
  grossAmount,
  feeAmount = 0,
  netAmount,
  installmentsCount = 1,
  baseDate = formatDateISO(new Date()),
  settlementDays = 0
}) => {
  const count = Math.max(1, Number(installmentsCount) || 1)
  const totalGross = roundMoney(grossAmount)
  const totalFee = roundMoney(feeAmount)
  const totalNet = roundMoney(netAmount !== undefined ? netAmount : totalGross - totalFee)

  const installments = []
  let grossAcc = 0
  let feeAcc = 0
  let netAcc = 0

  for (let i = 1; i <= count; i++) {
    let gross, fee, net
    if (i < count) {
      gross = divideByIntegerHalfUp(totalGross, count)
      fee = divideByIntegerHalfUp(totalFee, count)
      net = divideByIntegerHalfUp(totalNet, count)
      grossAcc = roundMoney(grossAcc + gross)
      feeAcc = roundMoney(feeAcc + fee)
      netAcc = roundMoney(netAcc + net)
    } else {
      gross = roundMoney(totalGross - grossAcc)
      fee = roundMoney(totalFee - feeAcc)
      net = roundMoney(totalNet - netAcc)
    }

    const daysToAdd = Number(settlementDays) + (i - 1) * 30
    const dueDate = addDays(baseDate, daysToAdd)

    installments.push({
      installmentNumber: i,
      totalInstallments: count,
      dueDate,
      grossAmount: gross,
      feeAmount: fee,
      netAmount: net,
      receivedAmount: 0,
      remainingAmount: net,
      status: 'PENDING',
      overdue: isInstallmentOverdue({ dueDate, status: 'PENDING' })
    })
  }

  return installments
}

export const computeReceivableMetrics = (receivables = [], referenceDate = new Date()) => {
  const list = Array.isArray(receivables) ? receivables : []
  let totalSoldGross = 0
  let totalSoldNet = 0
  let totalReceivedEffectively = 0
  let totalPending = 0
  let totalOverdue = 0

  for (const item of list) {
    totalSoldGross = roundMoney(totalSoldGross + (Number(item.grossAmount) || 0))
    totalSoldNet = roundMoney(totalSoldNet + (Number(item.netAmount) || 0))

    const installments = item.installments || []
    if (installments.length) {
      for (const inst of installments) {
        const received = Number(inst.receivedAmount) || 0
        const net = Number(inst.netAmount) || 0
        const remaining = roundMoney(Math.max(0, net - received))

        totalReceivedEffectively = roundMoney(totalReceivedEffectively + received)
        if (inst.status === 'RECEIVED' || remaining <= 0) {
          // Já liquidado integralmente
        } else if (isInstallmentOverdue(inst, referenceDate)) {
          totalOverdue = roundMoney(totalOverdue + remaining)
        } else {
          totalPending = roundMoney(totalPending + remaining)
        }
      }
    } else {
      const received = Number(item.receivedAmount) || 0
      const remaining = roundMoney(Math.max(0, (Number(item.netAmount) || 0) - received))
      totalReceivedEffectively = roundMoney(totalReceivedEffectively + received)
      if (item.status === 'RECEIVED' || remaining <= 0) {
        // Liquidado
      } else if (item.status === 'OVERDUE' || (item.issuedAt && item.issuedAt < formatDateISO(referenceDate))) {
        totalOverdue = roundMoney(totalOverdue + remaining)
      } else {
        totalPending = roundMoney(totalPending + remaining)
      }
    }
  }

  return {
    totalSoldGross,
    totalSoldNet,
    totalReceivedEffectively,
    totalPending,
    totalOverdue
  }
}

export const RECEIVABLE_STATUS_LABELS = {
  PENDING: 'Pendente',
  PARTIALLY_RECEIVED: 'Parcial',
  PARTIAL: 'Parcial',
  RECEIVED: 'Recebido',
  OVERDUE: 'Atrasado'
}

export const RECEIVABLE_STATUS_TONES = {
  PENDING: 'amber',
  PARTIALLY_RECEIVED: 'sky',
  PARTIAL: 'sky',
  RECEIVED: 'emerald',
  OVERDUE: 'rose'
}
