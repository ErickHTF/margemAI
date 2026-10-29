import { describe, it, expect } from 'vitest'
import {
  splitIntoInstallments,
  isInstallmentOverdue,
  getEffectiveInstallmentStatus,
  computeReceivableMetrics
} from './receivables'

describe('Regras de negócio de Contas a Receber (frontend)', () => {
  describe('splitIntoInstallments — divisão exata de centavos', () => {
    it('divide R$ 100,00 em 3x gerando 33,33 + 33,33 + 33,34', () => {
      const installments = splitIntoInstallments({
        grossAmount: 100,
        feeAmount: 0,
        netAmount: 100,
        installmentsCount: 3,
        baseDate: '2026-03-01',
        settlementDays: 30
      })

      expect(installments).toHaveLength(3)
      expect(installments[0].grossAmount).toBe(33.33)
      expect(installments[1].grossAmount).toBe(33.33)
      expect(installments[2].grossAmount).toBe(33.34)

      const sumGross = installments.reduce((acc, i) => acc + i.grossAmount, 0)
      const sumNet = installments.reduce((acc, i) => acc + i.netAmount, 0)

      expect(Number(sumGross.toFixed(2))).toBe(100)
      expect(Number(sumNet.toFixed(2))).toBe(100)

      // Vencimentos escalonados a cada 30 dias a partir do settlementDays (30)
      expect(installments[0].dueDate).toBe('2026-03-31')
      expect(installments[1].dueDate).toBe('2026-04-30')
      expect(installments[2].dueDate).toBe('2026-05-30')
    })

    it('divide R$ 0,06 em 12x sem parcela negativa e sem ultrapassar o total', () => {
      const installments = splitIntoInstallments({
        grossAmount: 0.06,
        feeAmount: 0,
        netAmount: 0.06,
        installmentsCount: 12,
        baseDate: '2026-03-01'
      })

      const netAmounts = installments.map((i) => i.netAmount)
      expect(netAmounts.every((amount) => amount >= 0)).toBe(true)
      expect(netAmounts.slice(0, 6)).toEqual([0, 0, 0, 0, 0, 0])
      expect(netAmounts.slice(6)).toEqual([0.01, 0.01, 0.01, 0.01, 0.01, 0.01])
    })

    it('aplica prazos imediatos para Pix (0 dias)', () => {
      const installments = splitIntoInstallments({
        grossAmount: 50,
        feeAmount: 0,
        installmentsCount: 1,
        baseDate: '2026-03-15',
        settlementDays: 0
      })

      expect(installments).toHaveLength(1)
      expect(installments[0].dueDate).toBe('2026-03-15')
    })

    it('aplica 1 dia útil/corrido para Débito (1 dia)', () => {
      const installments = splitIntoInstallments({
        grossAmount: 50,
        feeAmount: 0.75,
        installmentsCount: 1,
        baseDate: '2026-03-15',
        settlementDays: 1
      })

      expect(installments).toHaveLength(1)
      expect(installments[0].dueDate).toBe('2026-03-16')
    })
  })

  describe('Identificação de atraso e status efetivo', () => {
    it('detecta parcela atrasada se vencimento anterior à data de referência e status não RECEIVED', () => {
      const pastInstallment = { dueDate: '2026-03-10', status: 'PENDING' }
      expect(isInstallmentOverdue(pastInstallment, '2026-03-15')).toBe(true)
      expect(getEffectiveInstallmentStatus(pastInstallment, '2026-03-15')).toBe('OVERDUE')
    })

    it('não considera atrasada parcela já liquidada (RECEIVED)', () => {
      const settledPast = { dueDate: '2026-03-10', status: 'RECEIVED' }
      expect(isInstallmentOverdue(settledPast, '2026-03-15')).toBe(false)
      expect(getEffectiveInstallmentStatus(settledPast, '2026-03-15')).toBe('RECEIVED')
    })

    it('considera em dia parcela com vencimento futuro', () => {
      const futureInstallment = { dueDate: '2026-03-20', status: 'PENDING' }
      expect(isInstallmentOverdue(futureInstallment, '2026-03-15')).toBe(false)
      expect(getEffectiveInstallmentStatus(futureInstallment, '2026-03-15')).toBe('PENDING')
    })
  })

  describe('computeReceivableMetrics — totalizadores financeiros', () => {
    it('calcula faturamento por competência vs. recebimento efetivo de caixa vs. atrasos', () => {
      const receivables = [
        {
          grossAmount: 100,
          netAmount: 95,
          installments: [
            { netAmount: 95, receivedAmount: 40, status: 'PARTIAL', dueDate: '2026-04-10' }
          ]
        },
        {
          grossAmount: 50,
          netAmount: 50,
          installments: [
            { netAmount: 50, receivedAmount: 0, status: 'PENDING', dueDate: '2026-03-01' }
          ]
        }
      ]

      const metrics = computeReceivableMetrics(receivables, '2026-03-15')

      // totalSoldGross = 100 + 50 = 150
      expect(metrics.totalSoldGross).toBe(150)
      // totalSoldNet = 95 + 50 = 145
      expect(metrics.totalSoldNet).toBe(145)
      // totalReceivedEffectively = 40 (caixa recebido da parcela 1)
      expect(metrics.totalReceivedEffectively).toBe(40)
      // totalPending = 95 - 40 = 55 (em dia, vence em 10/04)
      expect(metrics.totalPending).toBe(55)
      // totalOverdue = 50 (venceu em 01/03)
      expect(metrics.totalOverdue).toBe(50)

      // Equação fundamental: recebido + a receber + atrasado == netAmount total
      expect(metrics.totalReceivedEffectively + metrics.totalPending + metrics.totalOverdue)
        .toBe(metrics.totalSoldNet)
    })
  })
})
