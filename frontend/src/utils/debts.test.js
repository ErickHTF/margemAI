import { describe, it, expect } from 'vitest'
import {
  calculateDebtCost,
  calculatePmt,
  filterScheduleByStatus,
  scheduleParamsFor,
  simulateDebtPayoff,
  sortDebtsBySebraePriority
} from './debts'

describe('Utilitários de Dívidas e Quitação (debts.js)', () => {
  it('calcula o custo total contratado, juros e custo efetivo múltiplo', () => {
    const cost = calculateDebtCost({
      principalAmount: 10000,
      installmentAmount: 974.87,
      totalInstallments: 12,
      fixedFeesAmount: 200
    })

    // (974.87 * 12) + 200 = 11698.44 + 200 = 11898.44
    expect(cost.totalContractedCost).toBe(11898.44)
    // 11898.44 - 10000 = 1898.44
    expect(cost.totalInterestAndFees).toBe(1898.44)
    expect(cost.effectiveCostMultiple).toBe(1.1898)
    expect(cost.effectiveCostPercent).toBe(18.98)
  })

  it('calcula prestação fixa no método Price', () => {
    const pmt = calculatePmt({
      principalAmount: 1000,
      monthlyInterestRate: 2,
      totalInstallments: 10
    })
    expect(pmt).toBe(111.33)
  })

  it('calcula parcela sem juros se a taxa for zero', () => {
    const pmt = calculatePmt({
      principalAmount: 1200,
      monthlyInterestRate: 0,
      totalInstallments: 12
    })
    expect(pmt).toBe(100.0)
  })

  it('simula quitação antecipada trazendo parcelas finais a valor presente com hipóteses explícitas', () => {
    const installments = [
      { installmentNumber: 1, amount: 500, dueDate: '2026-11-01', status: 'PENDING' },
      { installmentNumber: 2, amount: 500, dueDate: '2026-12-01', status: 'PENDING' },
      { installmentNumber: 3, amount: 500, dueDate: '2027-01-01', status: 'PENDING' },
      { installmentNumber: 4, amount: 500, dueDate: '2027-02-01', status: 'PENDING' }
    ]

    const sim = simulateDebtPayoff({
      installments,
      installmentsToAnticipate: 2,
      monthlyDiscountRate: 2.5,
      simulationDate: '2026-10-15'
    })

    expect(sim.simulatedInstallments.length).toBe(2)
    expect(sim.simulatedInstallments[0].installmentNumber).toBe(3)
    expect(sim.simulatedInstallments[1].installmentNumber).toBe(4)
    expect(sim.originalTotalAmount).toBe(1000)
    expect(sim.payoffAmount).toBeLessThan(1000)
    expect(sim.estimatedSavings).toBeGreaterThan(0)
    expect(sim.assumptions.length).toBeGreaterThanOrEqual(4)
    expect(sim.assumptions[0]).toContain('CDC Art. 52, § 2º')
  })

  it('simula quitação antecipada baseada em valor de amortização disponível', () => {
    const installments = [
      { installmentNumber: 1, amount: 1000, dueDate: '2026-11-01', status: 'PENDING' },
      { installmentNumber: 2, amount: 1000, dueDate: '2026-12-01', status: 'PENDING' },
      { installmentNumber: 3, amount: 1000, dueDate: '2027-01-01', status: 'PENDING' }
    ]

    // Com R$ 1500, só cabe a última parcela (VP ~930), a penúltima ultrapassaria 1500
    const sim = simulateDebtPayoff({
      installments,
      amortizeAmount: 1500,
      monthlyDiscountRate: 2.5,
      simulationDate: '2026-10-01'
    })

    expect(sim.simulatedInstallments.length).toBe(1)
    expect(sim.simulatedInstallments[0].installmentNumber).toBe(3)
    expect(sim.payoffAmount).toBeLessThanOrEqual(1500)
  })

  it('ordena dívidas pela metodologia SEBRAE priorizando a maior taxa de juros', () => {
    const debts = [
      { id: '1', creditor: 'Banco A', monthlyInterestRate: 2.0, effectiveCostPercent: 15, status: 'ACTIVE' },
      { id: '2', creditor: 'Cartão B', monthlyInterestRate: 12.0, effectiveCostPercent: 40, status: 'ACTIVE' },
      { id: '3', creditor: 'Pronampe C', monthlyInterestRate: 1.5, effectiveCostPercent: 10, status: 'ACTIVE' },
      { id: '4', creditor: 'Quitada D', monthlyInterestRate: 15.0, status: 'PAID_OFF' }
    ]

    const sorted = sortDebtsBySebraePriority(debts)
    expect(sorted[0].creditor).toBe('Cartão B')
    expect(sorted[0].priorityRank).toBe(1)
    expect(sorted[1].creditor).toBe('Banco A')
    expect(sorted[1].priorityRank).toBe(2)
    expect(sorted[2].creditor).toBe('Pronampe C')
    expect(sorted[2].priorityRank).toBe(3)
    expect(sorted[3].creditor).toBe('Quitada D')
    expect(sorted[3].priorityRank).toBeNull()
  })

  describe('filtro do cronograma de parcelas', () => {
    const schedule = [
      { id: 'a', status: 'PENDING' },
      { id: 'b', status: 'PAID' },
      { id: 'c', status: 'PAID_EARLY' }
    ]

    it.each([
      ['ALL', {}, ['a', 'b', 'c']],
      ['PENDING', { status: 'PENDING' }, ['a']],
      ['PAID', {}, ['b', 'c']]
    ])('filtro %s consulta %o e exibe %o', (filter, params, ids) => {
      expect(scheduleParamsFor(filter)).toEqual(params)
      expect(filterScheduleByStatus(schedule, filter).map((inst) => inst.id)).toEqual(ids)
    })
  })
})
