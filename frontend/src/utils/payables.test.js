import { describe, it, expect } from 'vitest'
import {
  calculateRemainingBalance,
  isPayableOverdue,
  getPayableStatusConfig,
  computePayablesSummary
} from './payables'

describe('payables utility', () => {
  describe('calculateRemainingBalance', () => {
    it('calcula saldo restante corretamente para pagamento parcial', () => {
      expect(calculateRemainingBalance('1250.50', '250.25')).toBe(1000.25)
      expect(calculateRemainingBalance(100, 30)).toBe(70)
    })

    it('retorna zero quando valor pago for igual ou maior ao total', () => {
      expect(calculateRemainingBalance('500.00', '500.00')).toBe(0)
      expect(calculateRemainingBalance('500.00', '550.00')).toBe(0)
    })

    it('trata valores nulos ou vazios como zero', () => {
      expect(calculateRemainingBalance(null, null)).toBe(0)
      expect(calculateRemainingBalance(200, null)).toBe(200)
    })
  })

  describe('isPayableOverdue', () => {
    const today = new Date(2026, 9, 22) // 2026-10-22

    it('identifica conta vencida antes de hoje quando pendente', () => {
      const payable = {
        dueDate: '2026-10-20',
        totalAmount: 100,
        paidAmount: 0,
        status: 'PENDING'
      }
      expect(isPayableOverdue(payable, today)).toBe(true)
    })

    it('não considera vencida conta com vencimento hoje ou futuro', () => {
      const payableToday = {
        dueDate: '2026-10-22',
        totalAmount: 100,
        paidAmount: 0,
        status: 'PENDING'
      }
      const payableFuture = {
        dueDate: '2026-10-25',
        totalAmount: 100,
        paidAmount: 0,
        status: 'PENDING'
      }
      expect(isPayableOverdue(payableToday, today)).toBe(false)
      expect(isPayableOverdue(payableFuture, today)).toBe(false)
    })

    it('não considera vencida conta quitada mesmo com vencimento passado', () => {
      const payablePaid = {
        dueDate: '2026-10-10',
        totalAmount: 100,
        paidAmount: 100,
        status: 'PAID'
      }
      expect(isPayableOverdue(payablePaid, today)).toBe(false)
    })

    it('não considera vencida conta estornada/cancelada', () => {
      const payableReversed = {
        dueDate: '2026-10-10',
        totalAmount: 100,
        paidAmount: 0,
        status: 'REVERSED'
      }
      expect(isPayableOverdue(payableReversed, today)).toBe(false)
    })
  })

  describe('getPayableStatusConfig', () => {
    it('retorna rótulo e tom corretos para cada status', () => {
      expect(getPayableStatusConfig('PAID')).toEqual({ label: 'Pago', tone: 'emerald' })
      expect(getPayableStatusConfig('PARTIAL')).toEqual({ label: 'Parcial', tone: 'indigo' })
      expect(getPayableStatusConfig('PARTIAL', true)).toEqual({ label: 'Parcial (Vencido)', tone: 'rose' })
      expect(getPayableStatusConfig('PENDING', false)).toEqual({ label: 'Pendente', tone: 'amber' })
      expect(getPayableStatusConfig('PENDING', true)).toEqual({ label: 'Vencido', tone: 'rose' })
      expect(getPayableStatusConfig('REVERSED')).toEqual({ label: 'Estornado', tone: 'slate' })
    })
  })

  describe('computePayablesSummary', () => {
    const today = new Date(2026, 9, 22) // 2026-10-22

    it('separa regime de competência (compromisso) de regime de caixa (desembolso efetivo)', () => {
      const items = [
        // 1. Aluguel pago integralmente: compromisso 1200, desembolso 1200, aberto 0
        { totalAmount: '1200.00', paidAmount: '1200.00', status: 'PAID', dueDate: '2026-10-10' },
        // 2. DAS-MEI pago parcial no prazo: compromisso 75, desembolso 25, aberto 50, não vencido
        { totalAmount: '75.00', paidAmount: '25.00', status: 'PARTIAL', dueDate: '2026-10-25' },
        // 3. Fornecedor vencido e pendente: compromisso 500, desembolso 0, aberto 500, vencido 500
        { totalAmount: '500.00', paidAmount: '0.00', status: 'PENDING', dueDate: '2026-10-15' },
        // 4. Parcial vencido: compromisso 300, desembolso 100, aberto 200, vencido 200
        { totalAmount: '300.00', paidAmount: '100.00', status: 'PARTIAL', dueDate: '2026-10-18' },
        // 5. Estornado/Cancelado: não entra no compromisso nem no aberto
        { totalAmount: '400.00', paidAmount: '0.00', status: 'REVERSED', dueDate: '2026-10-12' }
      ]

      const summary = computePayablesSummary(items, today)

      // Total compromissado (regime de competência): 1200 + 75 + 500 + 300 = 2075.00
      expect(summary.totalCommittedExpense).toBe(2075.00)

      // Desembolso efetivo pago (regime de caixa): 1200 + 25 + 0 + 100 = 1325.00
      expect(summary.totalEffectiveDisbursement).toBe(1325.00)

      // Saldo em aberto: 0 + 50 + 500 + 200 = 750.00
      expect(summary.totalOpenPayable).toBe(750.00)

      // Saldo vencido: 500 + 200 = 700.00
      expect(summary.totalOverduePayable).toBe(700.00)
    })

    it('retorna zeros para lista vazia', () => {
      const summary = computePayablesSummary([])
      expect(summary).toEqual({
        totalCommittedExpense: 0,
        totalEffectiveDisbursement: 0,
        totalOpenPayable: 0,
        totalOverduePayable: 0
      })
    })
  })
})
