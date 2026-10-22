import { describe, it, expect } from 'vitest'
import {
  OFFICIAL_MEI_LINKS,
  PGMEI_OFFICIAL_URL,
  DASN_SIMEI_OFFICIAL_URL,
  PORTAL_EMPREENDEDOR_OFFICIAL_URL,
  REGULARITY_DISCLAIMER,
  formatCompetencyLabel,
  getObligationBadgeMeta,
  formatDueCountdown,
  filterObligations,
  validateManualReceipt
} from './meiObligations'

describe('meiObligations — regras da agenda de obrigações MEI', () => {
  it('expõe os links oficiais verificados da Receita Federal e Portal do Empreendedor e aviso declaratório', () => {
    const urls = OFFICIAL_MEI_LINKS.map((link) => link.url)
    expect(urls).toEqual([
      PGMEI_OFFICIAL_URL,
      DASN_SIMEI_OFFICIAL_URL,
      PORTAL_EMPREENDEDOR_OFFICIAL_URL
    ])
    expect(OFFICIAL_MEI_LINKS.every((link) => link.verified)).toBe(true)
    expect(REGULARITY_DISCLAIMER).toContain('não comprova nem atesta regularidade fiscal')
  })

  it.each([
    ['2026-01', 'DAS_MENSAL', 'Janeiro/2026'],
    ['2026-12', 'DAS_MENSAL', 'Dezembro/2026'],
    ['2025', 'DASN_SIMEI_ANUAL', 'Ano-calendário 2025']
  ])('formata competência %s (%s) como %s', (competency, type, expected) => {
    expect(formatCompetencyLabel(competency, type)).toBe(expected)
  })

  it.each([
    [{ status: 'PAID_DECLARED', overdue: false, dueSoon: false }, { label: 'Comprovante manual', tone: 'emerald' }],
    [{ status: 'OVERDUE', overdue: true, dueSoon: false }, { label: 'Em atraso no controle', tone: 'rose' }],
    [{ status: 'PENDING', overdue: false, dueSoon: true }, { label: 'Vence em breve', tone: 'amber' }],
    [{ status: 'PENDING', overdue: false, dueSoon: false }, { label: 'Pendente', tone: 'slate' }]
  ])('classifica o selo de status corretamente para %o', (obligation, expected) => {
    expect(getObligationBadgeMeta(obligation)).toEqual(expected)
  })

  it.each([
    [{ status: 'PAID_DECLARED', daysUntilDue: 5 }, 'Comprovante informado manualmente pelo MEI'],
    [{ status: 'OVERDUE', daysUntilDue: -4 }, 'Vencida há 4 dias'],
    [{ status: 'OVERDUE', daysUntilDue: -1 }, 'Vencida há 1 dia'],
    [{ status: 'PENDING', daysUntilDue: 0 }, 'Vence hoje'],
    [{ status: 'PENDING', daysUntilDue: 1 }, 'Vence em 1 dia'],
    [{ status: 'PENDING', daysUntilDue: 6 }, 'Vence em 6 dias']
  ])('formata contagem regressiva de vencimento para %o', (obligation, expected) => {
    expect(formatDueCountdown(obligation)).toBe(expected)
  })

  it('filtra obrigações por tipo e situação de vencimento', () => {
    const obligations = [
      { id: '1', obligationType: 'DAS_MENSAL', status: 'PAID_DECLARED', dueSoon: false, overdue: false },
      { id: '2', obligationType: 'DAS_MENSAL', status: 'PENDING', dueSoon: true, overdue: false },
      { id: '3', obligationType: 'DAS_MENSAL', status: 'OVERDUE', dueSoon: false, overdue: true },
      { id: '4', obligationType: 'DASN_SIMEI_ANUAL', status: 'PENDING', dueSoon: false, overdue: false }
    ]

    expect(filterObligations(obligations, { typeFilter: 'DASN_SIMEI_ANUAL' }).map((i) => i.id)).toEqual(['4'])
    expect(filterObligations(obligations, { statusFilter: 'PAID_DECLARED' }).map((i) => i.id)).toEqual(['1'])
    expect(filterObligations(obligations, { statusFilter: 'DUE_SOON' }).map((i) => i.id)).toEqual(['2'])
    expect(filterObligations(obligations, { statusFilter: 'OVERDUE' }).map((i) => i.id)).toEqual(['3'])
    expect(filterObligations(obligations, { statusFilter: 'PENDING' }).map((i) => i.id)).toEqual(['2', '3', '4'])
  })

  it('valida obrigatoriedade do código do comprovante manual e impede data futura', () => {
    const missingReceipt = validateManualReceipt({
      manualReceiptCode: '   ',
      paidAt: '2026-05-10',
      today: '2026-05-10'
    })
    expect(missingReceipt.valid).toBe(false)
    expect(missingReceipt.errors.manualReceiptCode).toBeTruthy()

    const futureDate = validateManualReceipt({
      manualReceiptCode: 'DAS-2026-04-991',
      paidAt: '2026-05-15',
      today: '2026-05-10'
    })
    expect(futureDate.valid).toBe(false)
    expect(futureDate.errors.paidAt).toBeTruthy()

    const validResult = validateManualReceipt({
      manualReceiptCode: 'DAS-2026-04-991',
      paidAt: '2026-05-10',
      today: '2026-05-10'
    })
    expect(validResult.valid).toBe(true)
    expect(validResult.errors).toEqual({})
  })
})
