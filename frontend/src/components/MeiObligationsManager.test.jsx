import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MeiObligationsManager from './MeiObligationsManager'

vi.mock('../hooks/useApiResource', () => ({
  default: () => ({
    data: {
      year: 2026,
      reminderDaysBefore: 7,
      verificationSource: 'MANUAL_DECLARATION',
      regularityGuaranteed: false,
      regularityDisclaimer:
        'O registro neste painel é apenas um controle interno declaratório do MEI e não comprova nem atesta regularidade fiscal perante a Receita Federal.',
      totalCount: 13,
      paidDeclaredCount: 1,
      pendingCount: 11,
      overdueCount: 1,
      dueSoonCount: 2,
      officialLinks: [
        {
          id: 'pgmei',
          label: 'PGMEI — Emissão do DAS',
          description: 'Emissão oficial da guia mensal DAS.',
          url: 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao',
          verified: true
        },
        {
          id: 'dasn-simei',
          label: 'DASN-SIMEI — Declaração Anual',
          description: 'Declaração anual do MEI.',
          url: 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao',
          verified: true
        }
      ],
      obligations: [
        {
          id: 'ob-jan',
          obligationType: 'DAS_MENSAL',
          title: 'DAS Mensal — Janeiro/2026',
          referenceYear: 2026,
          competency: '2026-01',
          dueDate: '2026-02-20',
          status: 'PAID_DECLARED',
          manualReceiptCode: 'DAS-REC-001',
          paidAt: '2026-02-15',
          reminderDaysBefore: 7,
          notes: 'Pago via Pix PJ',
          dueSoon: false,
          overdue: false,
          daysUntilDue: -30,
          officialUrl:
            'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao',
          officialPortalLabel: 'PGMEI — Receita Federal',
          verificationSource: 'MANUAL_DECLARATION',
          regularityGuaranteed: false
        },
        {
          id: 'ob-dasn',
          obligationType: 'DASN_SIMEI_ANUAL',
          title: 'DASN-SIMEI — Ano-calendário 2025',
          referenceYear: 2026,
          competency: '2025',
          dueDate: '2026-05-31',
          status: 'PENDING',
          manualReceiptCode: null,
          paidAt: null,
          reminderDaysBefore: 7,
          notes: null,
          dueSoon: true,
          overdue: false,
          daysUntilDue: 3,
          officialUrl:
            'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao',
          officialPortalLabel: 'DASN-SIMEI — Receita Federal',
          verificationSource: 'MANUAL_DECLARATION',
          regularityGuaranteed: false
        }
      ]
    },
    loading: false,
    error: null,
    reload: vi.fn(),
    setData: vi.fn()
  })
}))

describe('MeiObligationsManager', () => {
  it('renderiza competências de DAS e DASN-SIMEI, comprovante manual identificado e aviso de não-regularidade automática', () => {
    const html = renderToStaticMarkup(<MeiObligationsManager />)

    expect(html).toContain('Obrigações MEI')
    expect(html).toContain('não comprova nem atesta regularidade fiscal perante a Receita Federal')
    expect(html).toContain('DAS Mensal — Janeiro/2026')
    expect(html).toContain('DASN-SIMEI — Ano-calendário 2025')
    expect(html).toContain('DAS-REC-001')
    expect(html).toContain('MANUAL_DECLARATION')
    expect(html).toContain(
      'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao'
    )
    expect(html).toContain(
      'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao'
    )
  })
})
