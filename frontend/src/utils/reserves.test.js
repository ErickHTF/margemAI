import { describe, it, expect } from 'vitest'
import {
  GOAL_MODES,
  MOVEMENT_TYPES,
  calculateEffectiveTarget,
  calculateReserveProgress,
  calculateFreeBalance,
  computeReserveSnapshot,
  validateReserveMovement
} from './reserves'

describe('Regras de reserva financeira (reserves.js)', () => {
  it.each([
    {
      label: 'meta fixa em reais arredonda com HALF_UP',
      input: { goalMode: GOAL_MODES.FIXED_AMOUNT, targetAmount: '4500.555', targetMonths: 3, monthlyFixedCosts: '1200.00' },
      expected: 4500.56
    },
    {
      label: 'meta em meses multiplica meses pelos custos fixos mensais ativos',
      input: { goalMode: GOAL_MODES.MONTHS_OF_COSTS, targetAmount: '9000.00', targetMonths: 4, monthlyFixedCosts: '1325.40' },
      expected: 5301.6
    },
    {
      label: 'meta em meses sem custos fixos retorna zero',
      input: { goalMode: GOAL_MODES.MONTHS_OF_COSTS, targetAmount: '3000.00', targetMonths: 6, monthlyFixedCosts: '0.00' },
      expected: 0
    }
  ])('calcula a meta efetiva: $label', ({ input, expected }) => {
    expect(calculateEffectiveTarget(input)).toBe(expected)
  })

  it.each([
    { reserved: '1500.00', target: '4000.00', expected: 37.5 },
    { reserved: '200.00', target: '300.00', expected: 66.67 },
    { reserved: '500.00', target: '0.00', expected: 0 },
    { reserved: '4800.00', target: '4000.00', expected: 120 }
  ])('calcula percentual de progresso HALF_UP ($reserved / $target = $expected%)', ({ reserved, target, expected }) => {
    expect(calculateReserveProgress(reserved, target)).toBe(expected)
  })

  it.each([
    { totalAccounts: '5200.00', reserved: '1500.00', expected: 3700 },
    { totalAccounts: '1200.00', reserved: '1800.00', expected: 0 },
    { totalAccounts: '0.00', reserved: '0.00', expected: 0 }
  ])('separa saldo livre do reservado ($totalAccounts - $reserved = $expected)', ({ totalAccounts, reserved, expected }) => {
    expect(calculateFreeBalance(totalAccounts, reserved)).toBe(expected)
  })

  it('consolida snapshot com alerta de custos fixos ausentes no modo meses e trava barra visual em 100%', () => {
    const missingCosts = computeReserveSnapshot({
      goalMode: GOAL_MODES.MONTHS_OF_COSTS,
      targetMonths: 3,
      monthlyFixedCosts: 0,
      reservedBalance: 800,
      totalBusinessAccountsBalance: 2000
    })
    expect(missingCosts.missingFixedCostsForMonthsGoal).toBe(true)
    expect(missingCosts.effectiveTargetAmount).toBe(0)
    expect(missingCosts.freeBalance).toBe(1200)

    const exceeded = computeReserveSnapshot({
      goalMode: GOAL_MODES.FIXED_AMOUNT,
      targetAmount: 2000,
      reservedBalance: 2500,
      totalBusinessAccountsBalance: 4000
    })
    expect(exceeded.progressPercent).toBe(125)
    expect(exceeded.progressBarPercent).toBe(100)
    expect(exceeded.remainingAmount).toBe(0)
  })

  it('valida resgate acima do saldo reservado e dados obrigatórios da movimentação', () => {
    expect(
      validateReserveMovement({
        type: MOVEMENT_TYPES.WITHDRAWAL,
        amount: '600.01',
        description: 'Emergência',
        occurredAt: '2026-03-10',
        reservedBalance: '600.00'
      })
    ).toContain('Saldo insuficiente')

    expect(
      validateReserveMovement({
        type: MOVEMENT_TYPES.DEPOSIT,
        amount: '250.00',
        description: 'Aporte mensal',
        occurredAt: '2026-03-10',
        reservedBalance: '600.00'
      })
    ).toBe('')
  })
})
