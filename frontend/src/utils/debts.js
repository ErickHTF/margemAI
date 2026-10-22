import { toDecimal, add, subtract, multiply, roundHalfUp, toNumber, roundMoney } from './decimal'

/**
 * Calcula o custo total contratado, juros acumulados e custo efetivo de uma dívida.
 *
 * @param {Object} params
 * @param {number|string} params.principalAmount - Valor do empréstimo tomado
 * @param {number|string} params.installmentAmount - Valor nominal de cada parcela
 * @param {number} params.totalInstallments - Quantidade total de parcelas
 * @param {number|string} [params.fixedFeesAmount=0] - Tarifas e taxas contratuais fixas (TAC, IOF, etc.)
 * @returns {Object} { totalContractedCost, totalInterestAndFees, effectiveCostMultiple, effectiveCostPercent }
 */
export function calculateDebtCost({
  principalAmount = 0,
  installmentAmount = 0,
  totalInstallments = 0,
  fixedFeesAmount = 0
}) {
  const p = Number(principalAmount) || 0
  const inst = Number(installmentAmount) || 0
  const n = Number(totalInstallments) || 0
  const fees = Number(fixedFeesAmount) || 0

  if (p <= 0 || n <= 0) {
    return {
      totalContractedCost: 0,
      totalInterestAndFees: 0,
      effectiveCostMultiple: 1,
      effectiveCostPercent: 0
    }
  }

  const instDec = toDecimal(inst.toFixed(2)) || toDecimal('0.00')
  const nDec = toDecimal(n.toString()) || toDecimal('0')
  const installmentsSumDec = multiply(instDec, nDec)

  const feesDec = toDecimal(fees.toFixed(2)) || toDecimal('0.00')
  const totalCostDec = roundHalfUp(add(installmentsSumDec, feesDec), 2)
  const totalContractedCost = toNumber(totalCostDec)

  const pDec = toDecimal(p.toFixed(2)) || toDecimal('0.00')
  const interestAndFeesDec = roundHalfUp(subtract(totalCostDec, pDec), 2)
  const totalInterestAndFees = toNumber(interestAndFeesDec)

  const effectiveCostMultiple = Number((totalContractedCost / p).toFixed(4))
  const effectiveCostPercent = roundMoney((totalInterestAndFees / p) * 100)

  return {
    totalContractedCost,
    totalInterestAndFees,
    effectiveCostMultiple,
    effectiveCostPercent
  }
}

/**
 * Calcula a prestação fixa (Tabela Price / Amortização Francesa) dada uma taxa mensal.
 *
 * @param {Object} params
 * @param {number|string} params.principalAmount
 * @param {number|string} params.monthlyInterestRate - Taxa percentual mensal (ex: 2.5 para 2.5%)
 * @param {number} params.totalInstallments
 * @returns {number} Valor da parcela arredondado para 2 casas
 */
export function calculatePmt({
  principalAmount = 0,
  monthlyInterestRate = 0,
  totalInstallments = 0
}) {
  const p = Number(principalAmount) || 0
  const rate = Number(monthlyInterestRate) || 0
  const n = Number(totalInstallments) || 0

  if (p <= 0 || n <= 0) return 0
  if (rate <= 0) return roundMoney(p / n)

  const i = rate / 100
  const factor = Math.pow(1 + i, n)
  const pmt = p * ((i * factor) / (factor - 1))
  return roundMoney(pmt)
}

/**
 * Simula a quitação antecipada de parcelas vincendas conforme CDC Art. 52, § 2º
 * trazendo as parcelas futuras a valor presente (com abatimento proporcional de juros).
 *
 * @param {Object} params
 * @param {Array} params.installments - Lista de parcelas da dívida
 * @param {number} [params.installmentsToAnticipate] - Quantidade de parcelas a abater a partir do final
 * @param {number|string} [params.amortizeAmount] - Saldo financeiro disponível para amortizar
 * @param {number|string} params.monthlyDiscountRate - Taxa mensal de desconto (geralmente a do contrato)
 * @param {Date|string} [params.simulationDate] - Data da simulação
 * @returns {Object} { payoffAmount, originalTotalAmount, estimatedSavings, savingsPercent, simulatedInstallments, assumptions }
 */
export function simulateDebtPayoff({
  installments = [],
  installmentsToAnticipate,
  amortizeAmount,
  monthlyDiscountRate = 0,
  simulationDate = new Date()
}) {
  const simDate = typeof simulationDate === 'string' ? new Date(`${simulationDate}T00:00:00`) : new Date(simulationDate)
  const discountRate = Number(monthlyDiscountRate) || 0

  const pending = [...installments]
    .filter((inst) => inst.status === 'PENDING')
    .sort((a, b) => a.installmentNumber - b.installmentNumber)

  if (pending.length === 0) {
    return {
      payoffAmount: 0,
      originalTotalAmount: 0,
      estimatedSavings: 0,
      savingsPercent: 0,
      simulatedInstallments: [],
      assumptions: ['A dívida não possui parcelas pendentes para simulação de quitação.']
    }
  }

  const calcPv = (amount, dueDateStr) => {
    const due = new Date(`${dueDateStr}T00:00:00`)
    const diffMs = due.getTime() - simDate.getTime()
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    if (diffDays <= 0 || discountRate <= 0) return roundMoney(amount)

    const months = diffDays / 30
    const factor = Math.pow(1 + discountRate / 100, months)
    return roundMoney(amount / factor)
  }

  let selected = []

  if (installmentsToAnticipate && Number(installmentsToAnticipate) > 0) {
    const count = Math.min(Number(installmentsToAnticipate), pending.length)
    const startIndex = pending.length - count
    selected = pending.slice(startIndex)
  } else if (amortizeAmount && Number(amortizeAmount) > 0) {
    const budget = Number(amortizeAmount)
    let accumulated = 0
    const reversePending = [...pending].reverse()

    for (const inst of reversePending) {
      const pv = calcPv(inst.amount, inst.dueDate)
      if (accumulated + pv <= budget) {
        accumulated += pv
        selected.push(inst)
      } else {
        break
      }
    }
    selected.sort((a, b) => a.installmentNumber - b.installmentNumber)
  } else {
    selected = [...pending]
  }

  let originalTotal = 0
  let payoffTotal = 0

  for (const inst of selected) {
    const pv = calcPv(inst.amount, inst.dueDate)
    originalTotal += Number(inst.amount)
    payoffTotal += pv
  }

  originalTotal = roundMoney(originalTotal)
  payoffTotal = roundMoney(payoffTotal)
  const estimatedSavings = roundMoney(originalTotal - payoffTotal)
  const savingsPercent = originalTotal > 0 ? roundMoney((estimatedSavings / originalTotal) * 100) : 0

  const assumptions = [
    'Desconto proporcional de juros calculado conforme CDC Art. 52, § 2º e Resolução CMN.',
    `Taxa de desconto aplicada: ${discountRate}% ao mês sobre ${selected.length} parcela(s) vincenda(s).`,
    'Abatimento priorizando as parcelas finais do contrato (ordem inversa), onde a incidência de juros futuros é maior.',
    'Tarifas contratuais (TAC/IOF) já retidas na contratação não sofrem estorno.',
    'O valor real de quitação deve ser confirmado diretamente no boleto oficial emitido pelo credor.'
  ]

  return {
    payoffAmount: payoffTotal,
    originalTotalAmount: originalTotal,
    estimatedSavings,
    savingsPercent,
    simulatedInstallments: selected,
    assumptions
  }
}

/**
 * Ordena lista de dívidas pela metodologia SEBRAE de priorização financeira (Avalanche),
 * onde a dívida mais cara (maior taxa de juros e maior custo efetivo) fica no topo.
 *
 * @param {Array} debts - Lista de dívidas
 * @returns {Array} Dívidas com priorityRank atribuído
 */
export function sortDebtsBySebraePriority(debts = []) {
  const active = debts
    .filter((d) => d.status === 'ACTIVE')
    .sort((a, b) => {
      const rateA = Number(a.monthlyInterestRate) || 0
      const rateB = Number(b.monthlyInterestRate) || 0
      if (rateB !== rateA) return rateB - rateA
      const effA = Number(a.effectiveCostPercent) || 0
      const effB = Number(b.effectiveCostPercent) || 0
      return effB - effA
    })
    .map((d, index) => ({ ...d, priorityRank: index + 1 }))

  const paidOff = debts
    .filter((d) => d.status !== 'ACTIVE')
    .map((d) => ({ ...d, priorityRank: null }))

  return [...active, ...paidOff]
}
