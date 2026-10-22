import { toDecimal, add, subtract, roundMoney, toNumber } from './decimal'

export const PAYABLE_CATEGORIES = [
  { value: 'ALUGUEL', label: 'Aluguel' },
  { value: 'DAS_MEI', label: 'DAS-MEI' },
  { value: 'ENERGIA', label: 'Energia Elétrica' },
  { value: 'AGUA', label: 'Água e Saneamento' },
  { value: 'INTERNET', label: 'Internet / Telefonia' },
  { value: 'FORNECEDORES', label: 'Fornecedores e Insumos' },
  { value: 'SALARIOS', label: 'Salários / Encargos' },
  { value: 'PRO_LABORE', label: 'Pró-Labore' },
  { value: 'IMPOSTOS', label: 'Impostos e Taxas' },
  { value: 'CONTABILIDADE', label: 'Contabilidade' },
  { value: 'MARKETING', label: 'Marketing e Anúncios' },
  { value: 'SOFTWARE', label: 'Software e Sistemas' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
  { value: 'SEGUROS', label: 'Seguros' },
  { value: 'OUTRO', label: 'Outras Despesas' }
]

export const calculateRemainingBalance = (totalAmount, paidAmount) => {
  const decTotal = toDecimal(totalAmount ?? 0) || { digits: 0n, scale: 2 }
  const decPaid = toDecimal(paidAmount ?? 0) || { digits: 0n, scale: 2 }
  const diff = subtract(decTotal, decPaid)
  const remaining = toNumber(diff)
  return remaining > 0 ? roundMoney(remaining) : 0
}

const toISODate = (date) => {
  if (!date) return ''
  if (typeof date === 'string') return date.slice(0, 10)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const isPayableOverdue = (payable, referenceDate = new Date()) => {
  if (!payable) return false
  if (payable.status === 'PAID' || payable.status === 'REVERSED') return false
  const due = toISODate(payable.dueDate)
  const today = toISODate(referenceDate)
  if (!due || !today) return false
  const remaining = calculateRemainingBalance(payable.totalAmount, payable.paidAmount)
  return due < today && remaining > 0
}

export const getPayableStatusConfig = (status, isOverdue = false) => {
  switch (status) {
    case 'PAID':
      return { label: 'Pago', tone: 'emerald' }
    case 'PARTIAL':
      return { label: isOverdue ? 'Parcial (Vencido)' : 'Parcial', tone: isOverdue ? 'rose' : 'indigo' }
    case 'REVERSED':
      return { label: 'Estornado', tone: 'slate' }
    case 'PENDING':
    default:
      return isOverdue ? { label: 'Vencido', tone: 'rose' } : { label: 'Pendente', tone: 'amber' }
  }
}

export const computePayablesSummary = (items = [], referenceDate = new Date()) => {
  let committed = { digits: 0n, scale: 2 }
  let disbursed = { digits: 0n, scale: 2 }
  let open = { digits: 0n, scale: 2 }
  let overdue = { digits: 0n, scale: 2 }

  for (const item of items) {
    const totalDec = toDecimal(item.totalAmount ?? 0) || { digits: 0n, scale: 2 }
    const paidDec = toDecimal(item.paidAmount ?? 0) || { digits: 0n, scale: 2 }

    if (item.status !== 'REVERSED') {
      committed = add(committed, totalDec)
    }

    disbursed = add(disbursed, paidDec)

    if (item.status !== 'PAID' && item.status !== 'REVERSED') {
      const diff = subtract(totalDec, paidDec)
      if (toNumber(diff) > 0) {
        open = add(open, diff)
        if (isPayableOverdue(item, referenceDate)) {
          overdue = add(overdue, diff)
        }
      }
    }
  }

  return {
    totalCommittedExpense: roundMoney(toNumber(committed)),
    totalEffectiveDisbursement: roundMoney(toNumber(disbursed)),
    totalOpenPayable: roundMoney(toNumber(open)),
    totalOverduePayable: roundMoney(toNumber(overdue))
  }
}
