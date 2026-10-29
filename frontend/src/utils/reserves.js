import { toDecimal, multiply, subtract, roundHalfUp, toNumber, roundMoney } from './decimal'

export const GOAL_MODES = {
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  MONTHS_OF_COSTS: 'MONTHS_OF_COSTS'
}

export const MOVEMENT_TYPES = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL'
}

export const calculateEffectiveTarget = ({
  goalMode = GOAL_MODES.FIXED_AMOUNT,
  targetAmount = 0,
  targetMonths = 0,
  monthlyFixedCosts = 0
} = {}) => {
  if (goalMode === GOAL_MODES.MONTHS_OF_COSTS) {
    const months = Math.max(0, Math.trunc(Number(targetMonths) || 0))
    const costsDec = toDecimal(monthlyFixedCosts) || { digits: 0n, scale: 0 }
    const monthsDec = toDecimal(months) || { digits: 0n, scale: 0 }
    return Math.max(0, toNumber(roundHalfUp(multiply(costsDec, monthsDec))))
  }
  return Math.max(0, roundMoney(targetAmount))
}

export const calculateReserveProgress = (reservedBalance, effectiveTargetAmount) => {
  const reserved = Math.max(0, roundMoney(reservedBalance))
  const target = Math.max(0, roundMoney(effectiveTargetAmount))
  if (target <= 0 || reserved <= 0) return 0

  const reservedDec = roundHalfUp(toDecimal(reserved) || { digits: 0n, scale: 0 }, 2)
  const targetDec = roundHalfUp(toDecimal(target) || { digits: 0n, scale: 0 }, 2)
  if (targetDec.digits <= 0n) return 0

  const numerator = reservedDec.digits * 10000n
  const quotient = numerator / targetDec.digits
  const remainder = numerator % targetDec.digits
  const roundedBps = quotient + (remainder * 2n >= targetDec.digits ? 1n : 0n)

  return toNumber({ digits: roundedBps, scale: 2 })
}

export const calculateFreeBalance = (totalBusinessAccountsBalance, reservedBalance) => {
  const totalDec = toDecimal(totalBusinessAccountsBalance) || { digits: 0n, scale: 0 }
  const reservedDec = toDecimal(reservedBalance) || { digits: 0n, scale: 0 }
  const diff = toNumber(roundHalfUp(subtract(totalDec, reservedDec)))
  return Math.max(0, diff)
}

export const computeReserveSnapshot = ({
  goalMode = GOAL_MODES.FIXED_AMOUNT,
  targetAmount = 0,
  targetMonths = 0,
  monthlyFixedCosts = 0,
  reservedBalance = 0,
  totalBusinessAccountsBalance = 0
} = {}) => {
  const normalizedCosts = Math.max(0, roundMoney(monthlyFixedCosts))
  const normalizedReserved = Math.max(0, roundMoney(reservedBalance))
  const normalizedTotalAccounts = roundMoney(totalBusinessAccountsBalance)
  const missingFixedCostsForMonthsGoal =
    goalMode === GOAL_MODES.MONTHS_OF_COSTS && normalizedCosts <= 0

  const effectiveTargetAmount = calculateEffectiveTarget({
    goalMode,
    targetAmount,
    targetMonths,
    monthlyFixedCosts: normalizedCosts
  })
  const freeBalance = calculateFreeBalance(normalizedTotalAccounts, normalizedReserved)
  const progressPercent = calculateReserveProgress(normalizedReserved, effectiveTargetAmount)
  const remainingDec = subtract(
    toDecimal(effectiveTargetAmount) || { digits: 0n, scale: 0 },
    toDecimal(normalizedReserved) || { digits: 0n, scale: 0 }
  )
  const remainingAmount = Math.max(0, toNumber(roundHalfUp(remainingDec)))

  return {
    effectiveTargetAmount,
    reservedBalance: normalizedReserved,
    totalBusinessAccountsBalance: normalizedTotalAccounts,
    freeBalance,
    progressPercent,
    progressBarPercent: Math.min(100, Math.max(0, progressPercent)),
    remainingAmount,
    missingFixedCostsForMonthsGoal
  }
}

export const validateReserveMovement = ({ type, amount, description, occurredAt, reservedBalance }) => {
  const value = roundMoney(amount)
  if (value <= 0) {
    return 'Informe um valor maior que zero para a movimentação.'
  }
  if (!description || !String(description).trim()) {
    return 'Informe uma descrição para identificar a movimentação.'
  }
  if (!occurredAt) {
    return 'Informe a data da movimentação.'
  }
  if (type === MOVEMENT_TYPES.WITHDRAWAL && value > roundMoney(reservedBalance)) {
    return 'Saldo insuficiente na reserva financeira para realizar este resgate.'
  }
  return ''
}
