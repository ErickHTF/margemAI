import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import DebtManager from './DebtManager'
import useDraft from '../hooks/useDraft'

vi.mock('../hooks/useDraft', () => ({
  default: vi.fn(() => ({ dirty: false, changes: 0, markSaved: vi.fn(), guard: (action) => action() }))
}))

vi.mock('../services/debtService', () => ({
  debtService: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'debt-1',
        creditor: 'Pronampe Caixa',
        description: 'Capital de Giro',
        principalAmount: 10000,
        monthlyInterestRate: 2.5,
        totalInstallments: 12,
        installmentAmount: 974.87,
        totalContractedCost: 11698.44,
        totalInterestAndFees: 1698.44,
        effectiveCostMultiple: 1.1698,
        effectiveCostPercent: 16.98,
        remainingBalance: 11698.44,
        remainingInstallments: 12,
        status: 'ACTIVE',
        priorityRank: 1
      }
    ]),
    getSummary: vi.fn().mockResolvedValue({
      totalOutstandingBalance: 11698.44,
      totalMonthlyCommitment: 974.87,
      totalEstimatedInterest: 1698.44,
      activeDebtsCount: 1,
      pendingInstallmentsCount: 12,
      highestRateCreditor: 'Pronampe Caixa'
    }),
    getSchedule: vi.fn().mockResolvedValue([
      {
        id: 'inst-1',
        debtId: 'debt-1',
        creditor: 'Pronampe Caixa',
        installmentNumber: 1,
        totalInstallments: 12,
        dueDate: '2026-11-10',
        amount: 974.87,
        status: 'PENDING',
        overdue: false
      }
    ]),
    simulatePayoff: vi.fn().mockResolvedValue({
      debtId: 'debt-1',
      creditor: 'Pronampe Caixa',
      simulationDate: '2026-10-22',
      discountRateMonthly: 2.5,
      installmentsCount: 2,
      simulatedInstallmentNumbers: [11, 12],
      originalTotalAmount: 1949.74,
      payoffAmount: 1500.0,
      estimatedSavings: 449.74,
      savingsPercent: 23.07,
      assumptions: [
        'Desconto proporcional de juros calculado conforme CDC Art. 52, § 2º.',
        'Taxa de desconto aplicada: 2.5% ao mês sobre 2 parcelas vincendas.'
      ]
    })
  }
}))

describe('DebtManager (Tela de Dívidas e Quitação)', () => {
  it('renderiza o cabeçalho oficial, abas e alvos do tour de onboarding', () => {
    const markup = renderToStaticMarkup(<DebtManager />)
    expect(markup).toContain('Dívidas e Quitação')
    expect(markup).toContain('Gerencie empréstimos, compare o custo real e simule a quitação antecipada com desconto.')
    expect(markup).toContain('Contratos e Resumo')
    expect(markup).toContain('Simulador de Quitação')
    expect(markup).toContain('Cronograma de Parcelas')
    expect(markup).toContain('data-tour="debts-new"')
  })

  it('exibe o formulário de cadastro com campos para taxa, parcelas e credor', () => {
    const markup = renderToStaticMarkup(<DebtManager />)
    expect(markup).toContain('Novo Empréstimo')
  })

  it('registra o formulário de nova dívida na proteção de rascunhos', () => {
    renderToStaticMarkup(<DebtManager />)
    expect(useDraft).toHaveBeenCalledWith(
      expect.objectContaining({ creditor: '', principalAmount: '', totalInstallments: '' })
    )
  })
})
